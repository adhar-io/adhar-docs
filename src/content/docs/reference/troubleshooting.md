---
title: "Troubleshooting"
section: "Reference"
order: 2
path: "/docs/reference/troubleshooting"
---

# Troubleshooting

A diagnostic guide, not a list of tips: **run the triage block, work out which phase or layer is failing, then read the matching symptom**. Every entry has one shape — symptom, cause, confirm, fix. Examples assume `adhar-system` and local Kind.

## The first five commands

Run these before forming a theory; the first that disagrees with its comment names the layer.

```bash
kubectl config current-context                      # 1. the cluster you think you are on
adhar get status                                    # 2. platform conditions + package health
kubectl -n adhar-system get pods | grep -v Running  # 3. what is not up
adhar get apps                                      # 4. GitOps convergence
kubectl get gateway -n adhar-system adhar-gateway \
  -o custom-columns=PROGRAMMED:'.status.conditions[?(@.type=="Programmed")].status'
                                                    # 5. is the data path live
```

`adhar get status` renders `ArgoCDReady`, `GatewayReady`, `GiteaReady`, `CrossplaneReady`, `GitOpsReady` and package health. **It does not verify that Crossplane can provision** — check that below.

## How the platform comes up

Phase order makes a partial failure readable: an early failure blocks everything after it.

```text
  phase 1  bootstrap (imperative, server-side apply, ordered)
     Gateway API CRDs → Cilium → Gateway → [CNPG if HA]
       → ArgoCD → Gitea → Crossplane
  phase 2  GitOps (declarative)
     seed Gitea packages/environments repos → apply ArgoCD repo auth
       → apply the platform ApplicationSet → ArgoCD owns everything after
```

Locally the controller runs in-process and exits after phase 2, so **nothing retries on its own**. Re-running `adhar up` without `--recreate` is safe: manifests are server-side applied with `ForceOwnership`, and each phase keys on a status flag, so satisfied gates short-circuit.

```bash
adhar up               # safe resume
adhar up --recreate    # DESTRUCTIVE: delete the node and rebuild
```

On cloud, roll changes out with `adhar upgrade --yes` (preview with `--diff-only`); always pass `--env <name>`.

## Install and provisioning

### Bootstrap stopped part-way

**Symptom** — Ctrl-C, a sleep or a timeout interrupted `adhar up`.
**Cause** — the local controller is ephemeral; nothing retries.
**Diagnose** — `kubectl get adharplatform -n adhar-system -o yaml`.
**Fix** — `adhar up` again; it resumes from the pending gate.

### A core installer errored

**Symptom** — `failed installing <component>: …`; Gateway, ArgoCD, Gitea or Crossplane never becomes `Available`.
**Cause** — an image pull, admission webhook or resource-pressure failure in the ordered slice.
**Diagnose** — `kubectl -n adhar-system describe pod <pod>`.
**Fix** — usually self-heals on requeue. If not, `adhar up`; if the node is starved, `--recreate`.

### `CrossplaneReady` never clears

**Symptom** — the foundation is up and apps exist, but `adhar up` keeps requeuing.
**Cause** — Crossplane reports `Available` when its deployment is up, but the `ClusterProviderConfig`s apply only once their provider CRDs register.
**Diagnose** — `kubectl get pkg -A`.
**Fix** — wait; the loop requeues every 15 seconds. Then check the next entry.

### Zero ProviderConfigs

**Symptom** — the platform reports healthy but nothing can be provisioned.
**Cause** — they were applied before their CRDs registered, and dropped.
**Diagnose** — the check `adhar get status` does not make:

```bash
kubectl get clusterproviderconfigs.kubernetes.m.crossplane.io
kubectl get clusterproviderconfigs.helm.m.crossplane.io
kubectl get clusterproviderconfigs.aws.m.upbound.io   # per cloud in use
```

"No resources found" for every group is the failure.
**Fix** — re-apply the control-plane configuration, or apply the ProviderConfigs from `platform/controlplane/configuration/providers/`.

### `adhar cluster list` says "No clusters found"

**Symptom** — an empty list for a cluster you know is running.
**Cause** — without `--file` it loads the default config, which declares no cloud provider, and queries nothing.
**Fix** — `adhar cluster list --file config.yaml`. Same for `status`, `scale`, `upgrade`; on `cluster delete`, `-f` is `--force`, so spell out `--file`.

## ArgoCD and GitOps

### No applications at all

**Symptom** — ArgoCD is healthy and the UI is empty.
**Cause** — the GitOps phase never completed; the Gitea `adhar` org was never seeded.
**Diagnose** — `kubectl get applicationset,applications -n adhar-system` is empty; `svc/gitea-argocd` is missing.
**Fix** — re-run `adhar up` without `--recreate`.

### Every app goes OutOfSync after a push (expected)

**Symptom** — one commit to `adhar/packages` flips every application to `OutOfSync`.
**Cause** — each Application tracks the monorepo at `HEAD`, so one commit invalidates every target revision.
**Fix** — wait 5–15 minutes for the wave to drain; investigate only an app still `Degraded` afterwards.

### A sync is wedged

**Symptom** — an operation sits at `waiting for healthy state of <resource>`; pushing a fix changes nothing and `kubectl` edits revert within a minute.
**Cause** — the in-flight operation is pinned to the revision it started with and keeps re-applying stale manifests. Not self-heal, not Git.
**Fix** — terminate it through the ArgoCD API (the `content-type: application/json` header is mandatory, or you get `415 Unsupported Media Type`), then force a recompute:

```bash
kubectl -n adhar-system annotate application <app> \
  argocd.argoproj.io/refresh=hard --overwrite
```

### SSO works but the app list is empty

**Symptom** — on HA, a Keycloak user sees nothing while local `admin` sees everything.
**Cause** — an empty `argocd-rbac-cm.policy.csv`: no group maps to a role.
**Diagnose** — `kubectl -n adhar-system get cm argocd-rbac-cm -o jsonpath='{.data.policy\.csv}'` prints nothing.
**Fix**

```bash
kubectl -n adhar-system patch cm argocd-rbac-cm --type merge -p '{"data":{"policy.csv":
"g, platform-admin, role:admin\ng, platform-developer, role:readonly\ng, platform-viewer, role:readonly\n"}}'
kubectl -n adhar-system rollout restart deploy/argo-cd-argocd-server
```

A sibling HA defect is `Invalid redirect URL` on login — a wrong `argocd-cm.url`. Patch it to `https://argocd.<defaultHost>` and restart the same deployment.

## DNS, TLS and reachability

### `HTTP 000` on every URL

**Symptom** — the TCP socket connects but nothing answers.
**Cause** — the Gateway is not `Programmed`, usually because its `CiliumGatewayClassConfig` was applied before the CRD registered, so Cilium defaulted the Service to `LoadBalancer` — which on Kind stays pending.
**Diagnose**

```bash
kubectl get gateway -n adhar-system adhar-gateway \
  -o custom-columns=PROGRAMMED:'.status.conditions[?(@.type=="Programmed")].status'
kubectl get svc -n adhar-system cilium-gateway-adhar-gateway   # want NodePort locally
kubectl get ciliumgatewayclassconfig                           # empty = the root cause
```

**Fix** — re-run `adhar up`; the Gateway reconciler runs again because `Gateway.Available` was never set.

### The URL resolves but TLS fails

**Symptom** — DNS, the load balancer and the Gateway look healthy, yet HTTPS fails.
**Cause** — the ACME DNS-01 challenge never completed, so `Secret/adhar-cert` still holds the self-signed certificate. On AWS the usual reason is a missing Route 53 region; elsewhere a missing or expired DNS credential.
**Diagnose** — `kubectl -n adhar-system get certificate`, the cert-manager log, and whether `Secret/adhar-dns-provider` exists.
**Fix** — correct the credential or region, then `adhar upgrade`. Temporary cloud credentials expire and stop renewals silently.

### A service has no URL

**Symptom** — the pod is `Running` but the hostname 404s or does not resolve.
**Cause** — the package ships no `HTTPRoute`, or external-dns has not published the record yet.
**Diagnose** — `kubectl get httproute -A | grep <service>` and `dig +short <service>.<defaultHost>`.
**Fix** — add an `HTTPRoute` whose `parentRefs` point at `adhar-gateway` ([Customization](/docs/operations/customization)). While DNS propagates, reach the backend directly:

```bash
kubectl port-forward -n adhar-system svc/argo-cd-argocd-server 8443:443
kubectl port-forward -n adhar-system svc/adhar-console        3000:3000
```

## Resource exhaustion

### Pods Pending on Kind

**Symptom** — pods stay `Pending`; the node is under memory pressure.
**Cause** — one Kind node cannot run the whole catalogue; the full set OOM-kills it.
**Diagnose** — `kubectl top nodes` and recent `adhar-system` events.
**Fix** — `adhar stack disable <pkg>` then `adhar upgrade`, or give the container engine more RAM (8 CPU and 16 GiB free is the floor for the local core). If everything is wedged, `adhar up --recreate`.

### `exceed max volume count` on cloud

**Symptom** — `0/3 nodes are available: 3 node(s) exceed max volume count`, while CPU and memory look fine.
**Cause** — every cloud caps block volumes per VM (7 per DigitalOcean droplet; 4–16 on Azure by size) and the catalogue asks for far more. This is the first capacity wall on every cloud.
**Diagnose** — `kubectl get sc` (`adhar-local` must be the default), then compare `csinodes` allocatable counts with `volumeattachments` per node.
**Fix** — add workers; each brings its own slots.

```bash
adhar cluster scale <cluster> --workers 10 -p digitalocean -f config.yaml
```

`spec.storageClassName` is immutable, so a wrongly-classed PVC must be deleted to move it.

### A node flaps NotReady

**Symptom** — a worker drops out; `SystemOOM` events; containerd died.
**Cause** — eBPF agents are the usual casualties on saturated nodes, and a starved kubelet takes its pods with it.
**Fix** — `sudo systemctl restart containerd kubelet`, then add workers and give memory-hungry agents limits.

### Storage saturation takes SSO down

**Symptom** — every SSO login returns 503, and `barman-cloud-wal-archive: … no space left on device` appears on every database at once.
**Cause** — the shared MinIO (the default backup target) filled, so no database can retire WAL and Postgres volumes fill. Keycloak usually hits zero first.
**Fix** — expand MinIO, set a CNPG `retentionPolicy` on every database, then expand the claim:

```bash
kubectl -n adhar-system patch pvc keycloak-db-1 --type merge \
  -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

In production, point the backup location at real object storage and alert on MinIO PVC usage above 80%.

## Secrets and OpenBao

**Symptom** — `ExternalSecret`s sit in `SecretSyncedError` and their Secrets never appear.
**Causes, in order** — OpenBao is sealed or uninitialised; `ClusterSecretStore/vault` is missing; both backends are enabled and fighting.
**Diagnose**

```bash
kubectl -n adhar-system get pods -l app.kubernetes.io/name=openbao
kubectl -n adhar-system logs job/openbao-bootstrap
kubectl get clustersecretstore vault -o yaml
adhar stack conflicts
```

**Fix** — the `openbao-bootstrap` Job is idempotent and runs as an ArgoCD sync hook, so `adhar stack sync openbao` re-runs init, unseal and configuration. If both backends are on, disable one and `adhar upgrade`: both claim `ClusterSecretStore/vault` and `Service/vault`, and two owners flap forever. The unseal key and root token live in `Secret/openbao-keys`; in production prefer KMS auto-unseal.

## Policy denials

**Symptom** — a deploy is rejected by an admission webhook, or an app is `Degraded` with a Kyverno message.
**Cause** — a `ClusterPolicy` with `failureAction: Enforce` matched the resource. The supply-chain pack ships twice — `audit` reports, `enforce` blocks — with identical rules, so audit findings predict what enforce rejects.
**Diagnose**

```bash
adhar policy status                 # pass/fail/warn per PolicyReport
adhar compliance --failures-only    # the same data as a control posture
kubectl get clusterpolicy
```

**Fix** — correct the resource (an unsigned image, a `:latest` tag, or a registry outside the allow-list are the common three), or add a `PolicyException` under `adhar-kyverno-policies/manifests/exceptions/` and `adhar upgrade`. Moving a rule from enforce to audit is a policy decision — make it in the stack, not with `kubectl`.

## Debugging toolbox

```bash
adhar ai diagnose <package>          # agentic triage, if the AI layer is on
kubectl -n adhar-system logs deploy/argo-cd-argocd-server
kubectl get events -n adhar-system --sort-by=.lastTimestamp | tail -30
cilium status && hubble observe --since 5m --namespace <ns>
```

Still stuck? Ask on [Slack](https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww) or open a [GitHub issue](https://github.com/adhar-io/adhar/issues).

## See also

- [Accessing the Platform](/docs/operations/accessing-the-platform) — the request path.
- [CLI Reference](/docs/reference/cli) — every diagnostic command.
- [Customization](/docs/operations/customization) — making a fix stick.
