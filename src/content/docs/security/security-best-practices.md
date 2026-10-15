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

## Defence in depth

Read the platform from the outside in. An attacker who wants a Secret has to get through every layer below, and each layer is designed on the assumption that the one outside it can fail. The diagram marks which layers are switched on in the production profile and which ship but are yours to enable.

```diagram
do-defence-layers
```

Three trust boundaries matter more than the rest:

- **The edge.** The Cilium Gateway is the only public entry point. Every platform UI sits behind Keycloak SSO (an oauth2-proxy where the application has no native OIDC), and the Kubernetes API is not exposed through the Gateway at all — restricting where it *is* reachable is your job (step 9 of the checklist).
- **The platform plane.** `adhar-system` is where the control plane lives. Every supply-chain policy excludes it twice — by namespace name and by the `adhar.io/plane: control` label — so an Enforce flip cannot brick the platform. The flip side is that admission policy does not protect that namespace; RBAC and network policy have to.
- **The tenant namespace.** A team's authority comes from `Project`, scoped to its own namespace, with ingress limited to its own pods and `adhar-system`. That boundary is the one to test by impersonation, below.

What is deliberately **not** a boundary: workload-to-workload identity. There is no SPIFFE/SPIRE and no platform-provided mutual TLS between pods, so two pods that can reach each other cannot prove who they are to each other. Use network policy for reachability and application-level mTLS where you need peer identity.

## Threat model

Each control exists against a specific attacker move. Knowing which one tells you what a gap costs.

| Control | What it stops |
|---|---|
| Keycloak OIDC + group RBAC | A stolen day-0 password becoming durable cluster access |
| Credential rotation | Well-known defaults surviving into production |
| Per-team RBAC scoping | One tenant reading another tenant's Secrets |
| Platform-only ClusterSecretStores + per-namespace `tenant` role | A tenant reading another namespace's or the platform's secrets through an `ExternalSecret` |
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

Application-team authority comes from `Project`, per namespace, never cluster-wide. Verify a tenant boundary by impersonation, not by reading manifests:

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
  secretStoreRef: { name: openbao, kind: SecretStore }   # the namespace's own store
  target: { name: myapp-config }
  data:
    - secretKey: password
      remoteRef: { key: tenants/my-team/myapp/config, property: password }
```

The `SecretStore` lives in the tenant's namespace and logs in to OpenBao as the ServiceAccount `adhar-secrets` with the kubernetes-auth role `tenant`. That role's templated policy, `tenant-secrets`, grants read on `secret/data/tenants/<namespace>/*` and read/list on `secret/metadata/tenants/<namespace>/*`, where the namespace comes from the verified ServiceAccount token — so a namespace can only ever read its own path. [Manage Secrets End to End](/docs/guides/manage-secrets) has the full YAML.

Two hardening steps the shipped config does **not** do for you:

1. **Auto-unseal.** The bootstrap Job runs `operator init` with one key share and stores the unseal key *and* root token in the `openbao-keys` Secret — fine on a laptop, unacceptable in production. Add a `seal "awskms"` / `"azurekeyvault"` / `"gcpckms"` stanza to the package `values.yaml` so no unseal material stays in-cluster.
2. **etcd encryption at rest.** Without it, a disk or snapshot yields every Secret in plaintext. On managed offerings, verify the provider default rather than assuming it.

**The platform's stores serve the platform only — treat the boundary as namespace names and labels.** External Secrets' RBAC aggregates `create` on `ExternalSecret` and `SecretStore` into the built-in `edit` and `admin` roles, so every `ws-team-<team>` admin can write one in their own namespace. A `ClusterSecretStore` with no `conditions` would serve that ExternalSecret whatever it pointed at. The shipped stores are therefore restricted:

| ClusterSecretStore | Can reach | Serves |
|---|---|---|
| `vault` | Every OpenBao path, including `secret/adhar/bootstrap-credentials` | `adhar-system` |
| `platform`, `keycloak`, `argocd` | Secrets in `adhar-system` | `adhar-system` |
| `gitea` | Secrets in `adhar-system` | `adhar-system`, `adhar-environments` |
| `platform-object-storage` | `root-creds` only (RBAC `resourceNames`) | Namespaces labelled `adhar.io/plane` `workload` or `preview` |
| `platform-delivery` | `gitea-ci-creds` and `harbor-push` only | Namespaces labelled `adhar.io/plane` `workload` or `preview` |

`vault`, `platform`, `keycloak`, `argocd` and `gitea` match by namespace **name**, which a tenant cannot create or rename; an ExternalSecret elsewhere that names them is refused. The two narrow stores exist for what the platform itself puts in tenant namespaces — database and pipeline backups to RustFS (the neo4j, MongoDB and OpenSearch compositions and the data-pipeline template), and Kargo's Git and registry credentials in a Project namespace. The `adhar.io/plane` label is set by the platform's compositions; tenant roles are namespace-scoped and cannot change it.

**OpenBao's people-policies deny the platform's paths.** `platform-developer` (create, read, update, delete, list) and `platform-viewer` (read, list) keep their grants on `secret/*`, but both carry an explicit `deny` on the platform-owned paths `secret/data/…` and `secret/metadata/…` under `adhar/*`, `adhar-ai/*` and `vllm/*`, which overrides the broad grant. This was checked against a real OpenBao 2.6.2 server: both groups read team secrets and can no longer read or overwrite the break-glass credentials. `platform-admin` is unchanged.

These controls take effect once the updated packages are synced with `adhar upgrade`; a platform built from an earlier version serves `vault` to every namespace until then.

**How the boundary was verified.** On a disposable cluster running External Secrets v2.10.0 and OpenBao 2.6.2, configured by the platform's own bootstrap commands and store manifests, every attempt below was made from a team namespace:

| Attempt | Result | Why |
|---|---|---|
| Read the team's own `secret/tenants/<ns>/` path | Synced | `tenant-secrets` policy |
| Read another team's tenant path | Blocked | OpenBao: permission denied |
| Read the break-glass credentials (own store or `vault`) | Blocked | Store refuses the namespace / policy denies |
| Read an `adhar-system` Secret through `platform` | Blocked | Store refuses the namespace |
| Read a non-allowed key through a narrow store | Blocked | Kubernetes RBAC `resourceNames` |
| Use a narrow store from an unlabelled namespace | Blocked | Store's namespace selector |
| `root-creds` / `gitea-ci-creds` through the right narrow store | Synced | Intended platform use |

As a control, removing the `vault` store's `conditions` (the old configuration) let the same team namespace read the break-glass password; restoring them blocked it again. The platform's own reads in `adhar-system` kept working throughout.

> **Residual risk — what the boundary does not cover.**
> - **The narrow stores are readable by every `workload` and `preview` namespace**, including PR previews. `root-creds` is the RustFS **root** credential. Per-database, scoped object-storage users are the recommended follow-up.
> - **`platform-developer` and `platform-viewer` still read every team's secrets** under `secret/`, `tenants/…` included.
> - **Cluster-wide `edit` is outside it.** `platform-developer` holds `edit` cluster-wide, which already reads Secrets in `adhar-system` directly.
> - **The namespace is the trust unit.** Whoever administers a namespace can read everything under `secret/tenants/<that namespace>/`.

Check what a tenant can do in its namespace, and that the platform store refuses it:

```bash
kubectl auth can-i create externalsecrets.external-secrets.io -n team-payments \
  --as=alice@example.com --as-group=oidc:ws-team-payments     # yes
kubectl get clustersecretstore vault -o jsonpath='{.spec.conditions}{"\n"}'
# [{"namespaces":["adhar-system"]}]
```

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
| A tenant reads a platform credential from OpenBao | The platform runs packages from before the store restrictions: `ClusterSecretStore/vault` has no `conditions` | `adhar upgrade`; confirm `kubectl get clustersecretstore vault -o jsonpath='{.spec.conditions}'` lists `adhar-system` |
| A tenant ExternalSecret against `vault` is refused | The `vault` store serves `adhar-system` only, by design | Use a namespaced `SecretStore` with role `tenant` and paths under `secret/tenants/<namespace>/` |
| A preview namespace can read `root-creds` | `platform-object-storage` serves every `workload` and `preview` namespace | Known residual risk; move backups to scoped object-storage users |
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
- [Control Plane](/docs/core-concepts/control-plane) — how `Project` grants tenant authority
