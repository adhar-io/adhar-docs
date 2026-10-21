---
title: "Troubleshooting"
section: "Reference"
order: 2
path: "/docs/reference/troubleshooting"
---

# Troubleshooting

This is a diagnostic guide, not a list of tips. **Run the triage checks, work out which phase or layer is failing, then read the matching symptom.**

It is for whoever is on the hook when the platform misbehaves, on a laptop or in production. Every entry has the same shape: symptom, cause, confirm, fix. Examples assume namespace `adhar-system` and local Kind (`*.adhar.localtest.me`). On cloud, substitute your `globalSettings.defaultHost`. Some sections apply only to the production profile, because the packages they cover (OpenBao, the policy packs) are off locally. Those sections say so.

## Triage: where to start

The platform is built in layers. A failure in a lower layer explains every symptom above it, so the order of your checks matters more than any single command. Work down this flow and stop at the first "no".

```diagram
do-triage
```

## The first five commands

These are the same checks as commands. Run them before you form a theory. The first one whose output disagrees with its comment names the failing layer.

```bash
kubectl config current-context                      # 1. the cluster you think you are on
adhar get status                                    # 2. platform conditions + package health
kubectl -n adhar-system get pods | grep -v Running  # 3. what is not up
adhar stack list --problems                         # 4. GitOps convergence: packages not Synced + Healthy
kubectl get gateway -n adhar-system adhar-gateway \
  -o custom-columns=PROGRAMMED:'.status.conditions[?(@.type=="Programmed")].status'
                                                    # 5. is the data path live
```

`adhar get status` shows `ArgoCDReady`, `GatewayReady`, `GiteaReady`, `CrossplaneReady`, `GitOpsReady`, the aggregate `Ready`, and package health. `CrossplaneReady` means the control-plane configuration (including ProviderConfigs) was applied. **It does not prove that Crossplane can provision now**: the ProviderConfigs may have been deleted since, or the provider credentials may be wrong. Check that separately, as described below. The raw resource holds the phase gates themselves:

```bash
kubectl get adharplatform -n adhar-system -o yaml
# key gates: .status.gateway.available, .status.gitea.repositoriesCreated,
#            .status.crossplane.controlPlaneApplied, .status.autoscaling
```

## Find your symptom

| What you see | Read |
|---|---|
| `curl` returns `HTTP 000`; every URL hangs | [`HTTP 000` on every URL](#http-000-on-every-url) |
| ArgoCD is up but shows no applications | [No applications at all](#no-applications-at-all) |
| `failed installing <component>: …` | [A core installer errored](#a-core-installer-errored) |
| `Gitea not ready` / `Gitea API not responding after 5 minutes` | [Gitea slow to serve](#gitea-slow-to-serve) |
| `CrossplaneReady` stays false; `adhar up` keeps requeuing | [`CrossplaneReady` never clears](#crossplaneready-never-clears) |
| Platform healthy, but nothing can be provisioned | [Zero ProviderConfigs](#zero-providerconfigs) |
| App stuck at `waiting for healthy state of <resource>` | [A sync is wedged](#a-sync-is-wedged) |
| Every application flips `OutOfSync` after a push | [Every app goes OutOfSync after a push](#every-app-goes-outofsync-after-a-push-expected) |
| SSO login works, ArgoCD application list is empty | [SSO works but the app list is empty](#sso-works-but-the-app-list-is-empty) |
| DNS resolves, HTTPS fails | [The URL resolves but TLS fails](#the-url-resolves-but-tls-fails) |
| `exceed max volume count` | [`exceed max volume count` on cloud](#exceed-max-volume-count-on-cloud) |
| Pods `Pending`, autoscaler does nothing | [The autoscaler is not scaling](#the-autoscaler-is-not-scaling) |
| Every SSO login returns 503 | [Storage saturation takes SSO down](#storage-saturation-takes-sso-down) |
| `ExternalSecret` in `SecretSyncedError` | [Secrets and OpenBao](#secrets-and-openbao) |
| A deploy is rejected by an admission webhook | [Policy denials](#policy-denials) |
| `adhar cluster list` prints `No clusters found` | [`adhar cluster list` says "No clusters found"](#adhar-cluster-list-says-no-clusters-found) |

## How the platform comes up

Knowing the phase order makes a partial failure easy to read, because an early failure blocks everything after it. Bootstrap has two phases.

**Phase 1** is imperative. The controller server-side-applies the foundation in a fixed order: Gateway API CRDs, Cilium, the Gateway, the CNPG operator (HA mode only), ArgoCD, Gitea. It starts installing Crossplane core early, so the images pull while seeding runs.

**Phase 2** is declarative. It seeds the `packages` and `environments` repositories in the Gitea `adhar` org. It applies ArgoCD's repository credentials and the platform ApplicationSet. Only *then* does it apply Crossplane's control-plane configuration, so that slow, retry-prone step can never block GitOps. After that, ArgoCD owns everything.

The ladder below shows the same order, and what each step's failure looks like from the outside.

```diagram
do-bootstrap-failures
```

Locally, the controller runs inside the `adhar up` process. It exits once phase 2 is done, the Gateway is available and the GitOps sync has converged (or `--apps-timeout` has passed), so **nothing retries on its own** after that. You can safely re-run `adhar up` without `--recreate`. Manifests are server-side applied with `ForceOwnership`, and each phase keys on a status flag, so gates that are already satisfied are skipped.

```bash
adhar up               # safe resume
adhar up --recreate    # DESTRUCTIVE: delete the node and rebuild
```

On cloud, roll changes out with `adhar upgrade --yes` (preview with `--diff-only`), run from the root of your Adhar clone. When you re-run `adhar up -f`, always pass `--env <name>`.

## Install and provisioning

### Bootstrap stopped part-way

**Symptom** — Ctrl-C, a sleep or a timeout interrupted `adhar up`.
**Cause** — the local controller is ephemeral; nothing retries.
**Diagnose** — `kubectl get adharplatform -n adhar-system -o yaml`.
**Fix** — `adhar up` again; it resumes from the pending gate.

### A core installer errored

**Symptom** — `failed installing <component>: …`, where the component is one of `gateway-api-crds`, `cilium`, `gateway`, `cnpg`, `argocd` or `gitea`; that component never becomes `Available`. (Crossplane failures show up differently, as `failed reconciling Crossplane`.)
**Cause** — an image pull, admission webhook or resource-pressure failure in the ordered install sequence.
**Diagnose** — `kubectl -n adhar-system describe pod <pod>`.
**Fix** — usually self-heals on requeue. If not, `adhar up`; if the node is starved, `--recreate`.

### Gitea slow to serve

**Symptom** — bootstrap sits at "Setting up GitOps repositories…" and logs `Gitea not ready` / `Gitea API not responding after 5 minutes`.
**Cause** — Gitea took longer than the seeding step allows. Typical reasons: a slow disk, an image pull, or (in HA mode) a CNPG database still initialising. Seeding never races an unready API. It waits for the deployment, the pods and an in-pod `GET /api/v1/version`.
**Diagnose**

```bash
kubectl get deploy,pods -n adhar-system -l app=gitea
kubectl get clusters.postgresql.cnpg.io -n adhar-system     # HA: is gitea-db healthy?
```

**Fix** — `kubectl rollout status deploy/gitea -n adhar-system --timeout=10m`, then `adhar up` to resume seeding.

### `CrossplaneReady` never clears

**Symptom** — the foundation is up and apps exist, but `adhar up` keeps requeuing.
**Cause** — Crossplane core is marked `Available` once its deployment is up (or after a five-minute wait). But the control-plane configuration, including the `ClusterProviderConfig`s, applies only after the provider CRDs register, and `CrossplaneReady` waits for that.
**Diagnose** — `kubectl get pkg -A`.
**Fix** — wait; the loop requeues every 15 seconds. Then check the next entry.

### Zero ProviderConfigs

**Symptom** — the platform reports healthy but nothing can be provisioned.
**Cause** — the ProviderConfigs are missing. Current controllers will not mark `CrossplaneReady` until they are applied, so this now happens mainly on platforms bootstrapped by an older binary (which applied them before their CRDs registered and dropped them), or when someone deleted them later.
**Diagnose** — the check `adhar get status` does not make:

```bash
kubectl get clusterproviderconfigs.kubernetes.m.crossplane.io
kubectl get clusterproviderconfigs.helm.m.crossplane.io
kubectl get clusterproviderconfigs.aws.m.upbound.io   # per cloud in use (Civo uses providerconfigs.civo.crossplane.io)
```

If every group returns "No resources found", this is the failure.
**Fix** — re-apply the control-plane configuration (re-run `adhar up` with a current binary), or apply the ProviderConfigs by hand from the Adhar repository: `platform/controlplane/configuration/providers/config/` (Kubernetes and Helm) and `platform/controlplane/configuration/providers/cloud/` (one file per cloud).

### `adhar cluster list` says "No clusters found"

**Symptom** — an empty list for a cluster you know is running.
**Cause** — without `--file`, the command loads the default config, which declares no cloud provider. Only Kind is queried. The message says so: `No clusters found. No cloud provider is configured — pass --file <config.yaml> to query one.`
**Fix** — `adhar cluster list --file config.yaml`. Same for `status`, `scale`, `upgrade` and `delete`.

### Applications hang `Terminating` after a cluster is deleted

**Symptom** — you deleted a `Cluster`, and the ArgoCD Applications that targeted it hang in `Terminating`.
**Cause** — deleting the XR removes ArgoCD's cluster-registration Secret at the same moment as the cluster. The Applications' prune finalizer can then never reach an API server.
**Fix** — clear the finalizers. Next time, prune the Applications **before** you delete the XR:

```bash
kubectl -n adhar-system patch application <app> --type merge \
  -p '{"metadata":{"finalizers":[]}}'
```

## ArgoCD and GitOps

### No applications at all

**Symptom** — ArgoCD is healthy and the UI is empty.
**Cause** — the GitOps phase never completed; the Gitea `adhar` org was never seeded.
**Diagnose** — `kubectl get applicationset,applications -n adhar-system` is empty; `svc/gitea-argocd` is missing.
**Fix** — re-run `adhar up` without `--recreate`.

### Every app goes OutOfSync after a push (expected)

**Symptom** — one commit to `adhar/packages` flips every application to `OutOfSync`.
**Cause** — every Application tracks the `main` branch of the same repository, so one commit changes every Application's target revision.
**Fix** — wait 5–15 minutes for the wave to drain; investigate only an app still `Degraded` afterwards.

### A sync is wedged

**Symptom** — an operation sits at `waiting for healthy state of <resource>`; pushing a fix changes nothing and `kubectl` edits revert within a minute.
**Cause** — the in-flight operation is pinned to the revision it started with, and keeps re-applying stale manifests. It is not self-heal, and not Git.
**Fix** — terminate the operation through the ArgoCD API. The `content-type: application/json` header is mandatory; without it you get `415 Unsupported Media Type`. Then force a recompute:

```bash
kubectl -n adhar-system annotate application <app> \
  argocd.argoproj.io/refresh=hard --overwrite
```

### SSO works but the app list is empty

**Symptom** — on HA, a Keycloak user sees nothing while local `admin` sees everything.
**Cause** — an empty `argocd-rbac-cm.policy.csv`: no group maps to a role.
**Diagnose** — `kubectl -n adhar-system get cm argocd-rbac-cm -o jsonpath='{.data.policy\.csv}'` prints nothing.
**Fix** — restore the shipped policy, then restart the ArgoCD server. The shipped policy maps `platform-admin` to `role:admin`, `platform-viewer` to `role:readonly`, and `platform-developer` to a custom `role:platform-developer` (get and sync applications, read logs, read repositories, projects and clusters). Copy the full `policy.csv` from the `argocd-rbac-cm` ConfigMap in the ArgoCD manifests of your Adhar version (`platform/controllers/adharplatform/resources/argocd/install.yaml`, or `install-ha.yaml` in HA mode) rather than writing a shorter one: mapping developers to `role:readonly` silently takes away their sync rights.

```bash
kubectl -n adhar-system rollout restart deploy/argo-cd-argocd-server
```

A related HA defect is `Invalid redirect URL` on login, caused by a wrong `argocd-cm.url`. Patch it to `https://argocd.<defaultHost>` and restart the same deployment.

## DNS, TLS and reachability

### `HTTP 000` on every URL

**Symptom** — the TCP socket connects but nothing answers.
**Cause** — the Gateway is not `Programmed`. Usually its `CiliumGatewayClassConfig` was applied before the CRD registered. Cilium then defaulted the Service to `LoadBalancer`, which stays pending on Kind.
**Diagnose**

```bash
kubectl get gateway -n adhar-system adhar-gateway \
  -o custom-columns=PROGRAMMED:'.status.conditions[?(@.type=="Programmed")].status'
kubectl get svc -n adhar-system cilium-gateway-adhar-gateway   # want NodePort locally
kubectl get ciliumgatewayclassconfig                           # empty = the root cause
```

**Fix** — re-run `adhar up`. The Gateway reconciler runs again because `Gateway.Available` was never set.

### The URL resolves but TLS fails

**Symptom** — DNS, the load balancer and the Gateway look healthy, yet HTTPS fails.
**Cause** — the ACME DNS-01 challenge never completed, so `Secret/adhar-cert` still holds the self-signed certificate. On AWS the usual reason is a missing Route 53 region. Elsewhere it is a missing or expired DNS credential.
**Diagnose** — `kubectl -n adhar-system get certificate`, the cert-manager log, and whether `Secret/adhar-dns-provider` exists.
**Fix** — correct the credential or region, then run `adhar upgrade`. Temporary cloud credentials expire and silently stop renewals.

### A service has no URL

**Symptom** — the pod is `Running` but the hostname 404s or does not resolve.
**Cause** — the package ships no `HTTPRoute`, or external-dns has not published the record yet.
**Diagnose** — `kubectl get httproute -A | grep <service>` and `dig +short <service>.<defaultHost>`.
**Fix** — add an `HTTPRoute` whose `parentRefs` point at `adhar-gateway` ([Customization](/docs/operations/customization)). While DNS propagates, reach the backend directly:

```bash
kubectl port-forward -n adhar-system svc/argo-cd-argocd-server 8443:443
kubectl port-forward -n adhar-system svc/console              3000:80
```

## Resource exhaustion

### Pods Pending on Kind

**Symptom** — pods stay `Pending`; the node is under memory pressure.
**Cause** — one Kind node cannot run the whole catalogue. The full set OOM-kills it.
**Diagnose** — `kubectl top nodes` and recent `adhar-system` events.
**Fix** — run `adhar stack disable <pkg>` then `adhar upgrade`. Or give the container engine more resources: 8 GB of RAM is the minimum and 16 GB is comfortable for the local core (roughly 8 CPU and 16 GiB free is what the Kind provider guide recommends). If everything is wedged, run `adhar up --recreate`.

### `exceed max volume count` on cloud

**Symptom** — `0/3 nodes are available: 3 node(s) exceed max volume count`, while CPU and memory look fine.
**Cause** — every cloud caps block volumes per VM: 7 per DigitalOcean droplet, and 4–16 on Azure depending on size. The catalogue asks for far more. This is the first capacity wall on every cloud.
**Diagnose** — run `kubectl get sc` (`adhar-local` must be the default). Then compare `csinodes` allocatable counts with `volumeattachments` per node.
**Fix** — add workers. Each one brings its own volume slots.

```bash
adhar cluster scale <cluster> --workers 10 -p digitalocean -f config.yaml
```

`spec.storageClassName` is immutable. To move a PVC with the wrong class, you must delete it.

A different message, `volume node affinity conflict`, is **not** a capacity problem. The volume is pinned to a zone or node the pod cannot use, so more identical workers will not help. Check the PV's `nodeAffinity` and the StorageClass `volumeBindingMode` instead.

### The autoscaler is not scaling

**Symptom** — pods are `Pending`, or the cluster is idle, and the worker count does not move.
**Cause** — usually a deliberate guard. The platform resource records the reason.
**Diagnose**

```bash
kubectl get adharplatform -n adhar-system \
  -o jsonpath='{.items[0].status.autoscaling}{"\n"}'
# workers, lastScaleUp, lastScaleDown, underutilizedSince, lastReason
```

| `lastReason` says | Meaning |
|---|---|
| `N pod(s) pending for capacity but maxWorkers=N reached` | The spend ceiling — raise `autoscaling.maxWorkers` |
| `… waiting out the 3m0s scale-up cooldown` | `scaleUpCooldown` since the last addition (3m0s is the default) |
| `cluster idle for Xs of the required 10m0s` | `scaleDownDelay` has not elapsed (10m0s is the default) |
| `cluster idle … but minWorkers=N reached` | The floor |
| `cluster idle but a worker was added recently; holding` (or `removed recently`) | One move per delay window, so the cluster settles |
| `… no worker is safe to drain: pod <ns>/<name> holds ReadWriteOnce volume <claim>` | A node hosting a ReadWriteOnce volume is never retired |

**Fix** — act on the reason. Pods pending on taints, node affinity or a volume affinity conflict deliberately do not trigger a scale-up. A new worker is a clone of the existing ones, so it would not satisfy them either.

### A node flaps NotReady

**Symptom** — a worker drops out; `SystemOOM` events; containerd died.
**Cause** — eBPF agents are usually the first to fail on saturated nodes. A starved kubelet takes its pods down with it.
**Fix** — run `sudo systemctl restart containerd kubelet`. Then add workers and set limits on memory-hungry agents.

### Storage saturation takes SSO down

**Symptom** — every SSO login returns 503, and `barman-cloud-wal-archive: … no space left on device` appears on every database at once.
**Cause** — the in-cluster object store is the default backup target for every platform database. (This is RustFS, which replaced MinIO as the platform's primary S3 store.) When its volume fills, WAL archiving fails everywhere. No database can retire WAL, so the Postgres volumes fill. Keycloak usually runs out of space first.
**Diagnose**

```bash
kubectl -n adhar-system get pvc rustfs-data
kubectl -n adhar-system get clusters.postgresql.cnpg.io \
  -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,LASTFAILED:.status.lastFailedBackup
```

**Fix** — grow the object store's claim. Set a CNPG `retentionPolicy` on every database. Then expand any Postgres claim that already filled:

```bash
kubectl -n adhar-system patch pvc keycloak-db-1 --type merge \
  -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

In production, point the backup location at off-cluster object storage. Alert when the object store's PVC usage goes above 80%. See [Backup and Restore](/docs/guides/backup-and-restore).

## Secrets and OpenBao

*Production profile.* OpenBao is off locally.

**Symptom** — `ExternalSecret`s sit in `SecretSyncedError` and their Secrets never appear.
**Causes, in order:**

1. OpenBao is sealed or uninitialised.
2. `ClusterSecretStore/vault` is missing.
3. Both backends are enabled and fighting.
4. The ExternalSecret is in an application namespace and names `ClusterSecretStore/vault`, which serves `adhar-system` only.

**Diagnose**

```bash
kubectl -n adhar-system get pods -l app.kubernetes.io/name=openbao
kubectl -n adhar-system logs job/openbao-bootstrap
kubectl get clustersecretstore vault -o yaml
adhar stack conflicts
```

**Fix** — the `openbao-bootstrap` Job is idempotent and runs as an ArgoCD sync hook, so it re-runs init, unseal and configuration whenever the `openbao` Application is synced. Trigger a real sync with `adhar gitops sync openbao` (or **Sync** in the ArgoCD UI). `adhar stack sync openbao` is not enough: it only asks ArgoCD to re-compare, and a re-compare of an app that is already in sync starts no sync.

An application namespace uses its own `SecretStore` instead, with OpenBao role `tenant` and ServiceAccount `adhar-secrets`. See [Manage Secrets End to End](/docs/guides/manage-secrets).

If both backends are on, disable one and run `adhar upgrade`. Both claim `ClusterSecretStore/vault` and `Service/vault`, and two owners flap forever.

The unseal key and root token live in `Secret/openbao-keys`. In production, prefer KMS auto-unseal.

## Policy denials

*Mostly production profile.* Locally, only `verify-supply-chain-images` (unsigned Harbor `library/*` images) enforces; the audit and enforce policy packs are off.

**Symptom** — a deploy is rejected by an admission webhook, or an app is `Degraded` with a Kyverno message.
**Cause** — a `ClusterPolicy` with `failureAction: Enforce` matched the resource. The supply-chain pack ships twice with identical rules: `adhar-supply-chain-policies` (Audit) reports and `adhar-supply-chain-policies-enforce` (Enforce) blocks. So audit findings predict what enforce rejects. The policies in `adhar-kyverno-policies` are all Audit, so they report but never block.
**Diagnose**

```bash
adhar policy status                 # pass/fail/warn per PolicyReport
adhar compliance --failures-only    # the same data as a control posture
kubectl get clusterpolicy
```

**Fix** — correct the resource. The three common problems are an unsigned image, a `:latest` tag, and a registry outside the allow-list. Kyverno `PolicyException`s are switched off in the shipped Kyverno install (`--enablePolicyException=false`), so an exception will not help. The enforce policies exempt platform namespaces by name and by the `adhar.io/plane: control` label. Moving a rule from enforce to audit, or exempting a namespace, is a policy decision. Make it in the stack, not with `kubectl`.

## Debugging toolbox

```bash
adhar ai diagnose <package>          # agentic triage, if the AI layer is on
kubectl -n adhar-system logs deploy/argo-cd-argocd-server
kubectl get events -n adhar-system --sort-by=.lastTimestamp | tail -30
cilium status && hubble observe --since 5m --namespace <ns>   # needs the cilium and hubble CLIs; run `cilium hubble port-forward` first
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| A fix pushed to Gitea changes nothing | The in-flight sync is pinned to its starting revision | Terminate the operation, then hard-refresh the Application |
| `kubectl edit` reverts within a minute | ArgoCD self-heal | Change the stack and `adhar upgrade` ([Customization](/docs/operations/customization)) |
| `adhar up --recreate` "fixed" it but data is gone | `--recreate` deletes the cluster | Re-run `adhar up` without it first; it resumes |
| `adhar up -f config.yaml` touched every environment | No `--env` | Always pass `--env <name>` |
| Diagnosing the wrong cluster | Another kube-context is current | `kubectl config current-context` before anything else |
| Health looks green, nothing provisions | `adhar get status` does not re-check that ProviderConfigs still exist | `kubectl get clusterproviderconfigs.<group>` |
| `adhar get apps` is empty | It lists your own applications, not platform packages | `adhar stack list --problems` |
| Two packages flap `Degraded` forever | A mutual exclusion (for example `vault` and `openbao`) is violated | `adhar stack conflicts`, disable one, `adhar upgrade` |

Still stuck? Ask on [Slack](https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww) or open a [GitHub issue](https://github.com/adhar-io/adhar/issues).

## See also

- [Accessing the Platform](/docs/operations/accessing-the-platform) — the request path.
- [CLI Reference](/docs/reference/cli) — every diagnostic command.
- [Customization](/docs/operations/customization) — making a fix stick.
