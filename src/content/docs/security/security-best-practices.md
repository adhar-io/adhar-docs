---
title: "Security Best Practices"
section: "Security"
order: 1
path: "/docs/security/security-best-practices"
---

# Security Best Practices

Adhar wires identity, secrets, supply-chain integrity and policy into the platform's own operation before offering them to workloads. But **"ships with" is not the same as "switched on"** — several controls are deliberately staged, and a few of the most important ones are yours to enable. This page explains what each control defends against, what the defaults actually are, and how to verify rather than assume.

## At a glance

| Domain | What ships and runs | What you must turn on |
|---|---|---|
| **Identity** | Keycloak OIDC across every platform UI | Apiserver OIDC (day-2); rotation outside production |
| **Secrets** | OpenBao + External Secrets, never in Git | Cloud-KMS auto-unseal; etcd encryption at rest |
| **Network** | Cilium CNI, Hubble, per-tenant default-deny ingress | Cluster-wide network policy; WireGuard |
| **Supply chain** | Audit pack everywhere; Enforce live in production | Enforce on your profile, after the drill passes |
| **Runtime** | Falco + Tetragon (production profile) | Triage — findings are visibility, not blocking |
| **Workload identity** | Not deployed — SPIFFE/SPIRE is deliberately absent | Nothing; see the note below |

## Threat model

Each control exists against a specific attacker move. Knowing which one tells you what a gap costs.

| Control | What it stops |
|---|---|
| Keycloak OIDC + group RBAC | A stolen day-0 password becoming durable cluster access |
| Credential rotation | Well-known defaults surviving into production |
| Per-team RBAC scoping | One tenant reading another tenant's Secrets |
| OpenBao + External Secrets | Credentials in Git, replicated to every clone |
| KMS auto-unseal | Unseal key and root token in a Secret the attacker already reached |
| etcd encryption at rest | Disk or snapshot theft yielding Secrets in plaintext |
| Default-deny ingress | Lateral movement after one pod is compromised |
| WireGuard | Passive capture of pod traffic on a shared network |
| Registry allowlist, no-`:latest` | A typosquatted or mutated image reaching the scheduler |
| Cosign verification | An image that never came out of your pipeline |
| Pod Security (restricted) | Escape via privileged mode, hostPath or host namespaces |
| Falco / Tetragon | Post-exploitation behaviour you had no policy for |

## Identity and access

**Keycloak is the single identity provider.** ArgoCD, Gitea, Grafana, the Console, Kargo and every other UI authenticate against the `adhar` realm; a package gets SSO by shipping one ConfigMap labelled `adhar.io/keycloak-client`.

**Rotate the bootstrap credentials the moment SSO works.** The day-0 `gitea_admin` and ArgoCD `admin` passwords are well known. `security/adhar-credential-rotation` (on in the production profile) replaces both with random values and writes break-glass copies to `secret/adhar/bootstrap-credentials`. It is idempotent — it creates a marker Secret `bootstrap-credentials-rotated` and exits early if that exists.

**Kubernetes API OIDC is off by default, deliberately.** Enabling it makes Keycloak group membership a grant of Kubernetes authority, so it is the operator's call. It is also a **day-2 step, not a provisioning option** — wiring `--oidc-issuer-url` at `kubeadm init` points the apiserver at a Keycloak that does not exist yet, and against a stale cloud hostname that discovery *hangs* rather than failing fast. `oidcAuth: "true"` in `clusterConfig` is therefore rejected outright. The day-2 flags:

```text
--oidc-issuer-url=https://keycloak.<host>/realms/adhar
--oidc-client-id=kubernetes          # the token AUDIENCE, not adhar-cli
--oidc-username-claim=preferred_username
--oidc-username-prefix=oidc:
--oidc-groups-claim=groups
--oidc-groups-prefix=oidc:
```

Managed control planes cannot take apiserver flags this way and must use the cloud's own OIDC settings with the same claims and prefixes.

| Keycloak group | Kubernetes binding |
|---|---|
| `platform-admin`, `platform-engineer` | `cluster-admin`, cluster-wide |
| `platform-developer` | `edit`, cluster-wide |
| `platform-viewer` | `view`, cluster-wide |
| `ws-team-<team>`, `org-<org>-admin` | `admin`, **that team's namespace only** |
| `base-user` | Nothing — the default group for self-registration |

> **Read this twice.** On current Kubernetes the built-in `edit` role **grants get/list/watch on Secrets**. Only `view` excludes them, so `platform-developer` can read Secrets in any namespace. If that is not what you intend, bind a custom role instead of `edit`.

Application-team authority comes from `CompositeProject`, per namespace, never cluster-wide. Verify a tenant boundary by impersonation, not by reading manifests:

```bash
kubectl auth can-i get secrets -n team-payments \
  --as=alice@example.com --as-group=oidc:ws-team-payments   # yes
kubectl auth can-i get secrets -n team-search \
  --as=alice@example.com --as-group=oidc:ws-team-payments   # no
```

Give Crossplane cloud access via IRSA / Workload Identity / Managed Identity — never long-lived keys.

## Secrets

**OpenBao is the production backend** (`security/openbao`); the `vault` package is the alternative and ships disabled. Exactly one may be enabled — both claim the `ClusterSecretStore` named `vault` and a `Service/vault`. Switching backends changes nothing downstream: a compatibility `Service/vault` in `adhar-system` selects the OpenBao pods, so anything addressing `vault.adhar-system.svc.cluster.local:8200` keeps working.

**Nothing secret goes in Git.** Manifests reference an `ExternalSecret`; External Secrets fetches the value at runtime:

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata: { name: myapp-config, namespace: my-team }
spec:
  secretStoreRef: { name: vault, kind: ClusterSecretStore }
  target: { name: myapp-config }
  data:
    - secretKey: password
      remoteRef: { key: myapp/config, property: password }
```

Two hardening steps the shipped config does **not** do for you:

1. **Auto-unseal.** The bootstrap Job runs `operator init` with one key share and stores the unseal key *and* root token in the `openbao-keys` Secret — fine on a laptop, unacceptable in production. Add a `seal "awskms"` / `"azurekeyvault"` / `"gcpckms"` stanza to the package `values.yaml` so no unseal material stays in-cluster.
2. **etcd encryption at rest.** Without it, a disk or snapshot yields every Secret in plaintext. On managed offerings, verify the provider default rather than assuming it.

> **Ordering trap.** An `ExternalSecret` whose backend path does not exist reports `Degraded`, and ArgoCD will not advance past its sync wave — so one missing path can leave a whole package uninstalled. Seed the path (even empty) or move the resource to a later wave.

## Network

Be precise about the default, because the gap is real: **Cilium runs with `enable-policy: default`, so a pod that no policy selects is unrestricted.** No cluster-wide default-deny `CiliumNetworkPolicy` ships with the bootstrap. Microsegmentation is opt-in, and authoring it is genuine work.

What you get by default:

- **Per-tenant ingress isolation.** `CompositeProject` emits a `<project>-tenant-isolation` NetworkPolicy in every team namespace: ingress only from the team's own pods and from `adhar-system`. **Egress is left open on purpose** — a default-deny egress that forgets kube-DNS reads as a total DNS outage, not as a policy.
- **The Cilium Gateway as the only public entry point**, with `external-dns` scoped to the platform DNS zone.
- **Hubble** for observing flows and policy verdicts — which is how you author allow-rules that actually work.

What you must add: cluster-wide default-deny for workload namespaces, scoped allow-rules for platform namespaces, WireGuard node-to-node encryption, and API-server access restricted to a VPN or allowlist.

> **SPIFFE/SPIRE is deliberately not deployed.** It starved the Cilium operator's Gateway controller, and upstream deprecated that path in Cilium 1.20 — the version the platform runs — for removal in 1.21. Workload-to-workload mutual authentication is therefore **not available and is not claimed**. "Mesh-ready identity" here means a unique cluster name and id plus one shared CA, nothing more.

## Workloads and supply chain

Three policies do the real gating, and they ship **twice** — identical rules in `manifests/audit/` and `manifests/enforce/`, differing only in `failureAction` and digest pinning. That is the point: **audit findings predict exactly what enforce would block.**

| Policy (enforce name) | What it denies | Message |
|---|---|---|
| `disallow-latest-tag-enforce` | `:latest` or untagged images | `An explicit image tag is required` |
| `restrict-image-registries-enforce` | Registries outside the allowlist | `Image registry is not in the platform allowlist` |
| `verify-image-signatures-enforce` | Images with no valid Cosign signature | Kyverno's own verification text |

The allowlist is **not Harbor-only**: it admits the platform Harbor plus `cgr.dev`, `registry.k8s.io`, `gcr.io`, `ghcr.io`, `quay.io`, `docker.io`, `index.docker.io` and `public.ecr.aws`. A docker.io image being admitted is correct, not a gap — tighten the list if your threat model needs it.

Signature verification accepts either attestor: the platform's own key (`keys.secret: cosign-key`, with `rekor.ignoreTlog: true`, matching what the Tekton `cosign-sign` Task produces) or the GitHub Actions keyless identity for `ghcr.io/adhar-io/*`. Every rule excludes platform namespaces twice over — by name and by the `adhar.io/plane: control` label — so an Enforce flip cannot brick the platform.

**Pod Security policies are `Audit`, not `Enforce`.** `security/adhar-kyverno-policies` ships the restricted-profile set — `disallow-privileged-containers`, `disallow-host-namespaces`, `disallow-host-path`, `disallow-capabilities`, `restrict-seccomp`, `restrict-sysctls` and more — in audit mode, with `PolicyException` objects where a component needs one. Promote them one at a time.

**Prove enforcement before flipping it.** `hack/verify-supply-chain.sh` generates a throwaway keypair, copies two tiny public images into a disposable `adhar-drill` Harbor project, signs one exactly as the pipeline does (`--key`, `--tlog-upload=false`), applies an Enforce policy in a scratch namespace with `failurePolicy: Fail`, and asserts unsigned → DENIED / signed → ADMITTED before cleaning up. Success prints `SUPPLY-CHAIN ENFORCEMENT DRILL PASSED`.

```bash
KUBE_CONTEXT=kind-adhar hack/verify-supply-chain.sh
```

## Runtime and compliance

`security/falco` and `security/tetragon` give eBPF runtime threat detection in the production profile. `security/trivy` (the operator) is disabled in the curated profiles — pipeline scanning is a Tekton `trivy-scan` Task instead, so the gate does not depend on the operator. `security/kubescape` ships disabled everywhere.

Aggregate what the policy engines found:

```bash
adhar compliance                       # posture from PolicyReports
adhar compliance --failures-only
adhar compliance export -o posture.md  # or .json — the auditor artifact
```

## TLS

Local platforms use a self-signed certificate. Production uses cert-manager with Let's Encrypt; the platform **wildcard** (`*.<defaultHost>`) requires a DNS-01-capable provider. See [Accessing the Platform](/docs/operations/accessing-the-platform).

## Production hardening checklist

Work through this in order — later steps assume earlier ones.

1. **Verify SSO** for a non-admin user in ArgoCD. If group mapping is broken you will lock yourself out at step 2.
2. **Rotate bootstrap credentials.** Confirm with `kubectl -n adhar-system get secret bootstrap-credentials-rotated`.
3. **Enable KMS auto-unseal**, re-init the backend, and confirm no unseal material remains in `openbao-keys`.
4. **Enable etcd encryption at rest** (or verify the managed provider's default).
5. **Enable apiserver OIDC** as a day-2 change, then test with a token-only kubeconfig — a check that passes with your normal kubeconfig proves nothing.
6. **Replace the cluster-wide `edit` binding** if developers should not read Secrets.
7. **Run the supply-chain drill.** Only once it passes, enable the Enforce pack on your profile.
8. **Author network policy** from Hubble flow data, starting with your highest-value tenant.
9. **Enable WireGuard** and restrict API-server access to a VPN or allowlist.
10. **Promote Pod Security policies** from Audit to Enforce, reading PolicyReports between each.
11. **Schedule the drills**: quarterly supply-chain and DR restore; monthly Keycloak access review; weekly scan triage.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| A developer reads another team's Secrets | `edit` grants Secrets read, bound cluster-wide | Bind a custom role without `secrets` |
| OIDC login works, `kubectl` says `Unauthorized` | The apiserver carries no `--oidc-*` flags | Apply them as a day-2 change |
| An OIDC check passes that should not | `kubectl --token` did not displace the context's client certificate | Re-test with a token-only kubeconfig |
| Provisioning dies at `kubeadm token create` | OIDC flags wired at creation, pointing at a Keycloak that does not exist | Never set `oidcAuth` in `clusterConfig` |
| A package never installs, one `ExternalSecret` Degraded | A missing backend path blocks its whole sync wave | Seed the path, or move it to a later wave |
| Enforce flip denies a platform pod | The policy's namespace exclusions were edited away | Restore both the name and `adhar.io/plane: control` exclusions |
| Signature policy denies your first deploy | Nothing has published and signed that tag yet | Let CI build and sign once; the writeback pins the signed `:<sha>` |
| "Default-deny is on" but pods reach everything | `enable-policy: default` — an unselected pod is unrestricted | Author explicit policies; Cilium's presence is not policy |
| Rotation job appears to do nothing | The `bootstrap-credentials-rotated` marker exists | Delete the marker to rotate again |

## Verify

```bash
kubectl get clusterpolicy                 # which policies exist, and their action
kubectl get policyreport -A               # what they found
hack/verify-supply-chain.sh               # signature enforcement, end to end
cilium status && cilium connectivity test # network layer
hubble observe --namespace <ns>           # flows and policy verdicts
adhar compliance                          # aggregated posture
```

## See also

- [Production](/docs/operations/production) — HA, backups, the day-2 routine
- [Observability](/docs/operations/observability) — Hubble, Falco dashboards, alert routing
- [Control Plane](/docs/core-concepts/control-plane) — how `CompositeProject` grants tenant authority
