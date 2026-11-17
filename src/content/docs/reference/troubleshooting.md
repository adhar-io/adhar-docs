---
title: "Troubleshooting"
section: "Reference"
order: 4
path: "/docs/reference/troubleshooting"
---

# Troubleshooting

Find out which layer of the platform is failing, then look up the symptom. This page is for whoever is on call when the platform misbehaves, on a laptop or in production. Each section is a table of symptom, cause and fix, followed by the commands that confirm the cause.

Examples assume the namespace `adhar-system` and local Kind (`*.adhar.localtest.me`). On a cloud, substitute your `globalSettings.defaultHost`.

## Triage

The platform is built in layers, and a failure in a lower layer explains every symptom above it. Work down this flow and stop at the first "no".

```diagram
do-triage
```

The same checks as commands. The first one whose output disagrees with its comment names the failing layer:

```bash
kubectl config current-context                      # 1. the cluster you think you are on
adhar get status                                    # 2. platform conditions + package health
kubectl -n adhar-system get pods | grep -v Running  # 3. what is not up
adhar stack list --problems                         # 4. packages not Synced + Healthy
kubectl get gateway -n adhar-system adhar-gateway \
  -o custom-columns=PROGRAMMED:'.status.conditions[?(@.type=="Programmed")].status'
                                                    # 5. is the data path live
```

`adhar get status` shows the conditions `ArgoCDReady`, `GatewayReady`, `GiteaReady`, `CrossplaneReady`, `GitOpsReady` and the aggregate `Ready`, plus package health. The raw resource holds the phase gates:

```bash
kubectl get adharplatform -n adhar-system -o yaml
# key gates: .status.gateway.available, .status.gitea.repositoriesCreated,
#            .status.crossplane.controlPlaneApplied, .status.autoscaling
```

> **Note:** `CrossplaneReady` means the control-plane configuration was applied. It does not prove Crossplane can provision now: the ProviderConfigs may have been deleted since, or the provider credentials may be wrong. See [Health is green but nothing provisions](#install-and-provisioning).

## Find your symptom

| What you see | Section |
|---|---|
| `adhar up` was interrupted, or `failed installing <component>` | [Install and provisioning](#install-and-provisioning) |
| `Gitea not ready`, `CrossplaneReady` stays false, nothing provisions | [Install and provisioning](#install-and-provisioning) |
| `adhar cluster list` prints `No clusters found` | [Install and provisioning](#install-and-provisioning) |
| ArgoCD is empty, every app is `OutOfSync`, a sync is stuck | [ArgoCD and GitOps](#argocd-and-gitops) |
| SSO login works but the ArgoCD application list is empty | [ArgoCD and GitOps](#argocd-and-gitops) |
| `HTTP 000` on every URL, HTTPS fails, a service has no URL | [DNS, TLS and reachability](#dns-tls-and-reachability) |
| Pods `Pending`, `exceed max volume count`, a node flaps `NotReady` | [Capacity](#capacity) |
| The autoscaler does nothing | [The autoscaler is not scaling](#the-autoscaler-is-not-scaling) |
| Every SSO login returns 503 | [Storage saturation](#storage-saturation) |
| `ExternalSecret` in `SecretSyncedError` | [Secrets and OpenBao](#secrets-and-openbao) |
| A deploy is rejected by an admission webhook | [Policy denials](#policy-denials) |

## How the platform comes up

Bootstrap has two phases. An early failure blocks every later step, so the order tells you how to read a partial failure.

| Phase | What happens |
|---|---|
| **1. Foundation** (imperative) | The controller server-side-applies, in order: Gateway API CRDs, Cilium, the Gateway, the CNPG operator (HA mode only), ArgoCD, Gitea. It starts installing Crossplane core early so the images pull in the meantime. |
| **2. GitOps** (declarative) | It seeds the `packages` and `environments` repositories in the Gitea `adhar` org, applies ArgoCD's repository credentials and the platform ApplicationSet, and only then applies Crossplane's control-plane configuration. After that, ArgoCD owns everything. |

```diagram
do-bootstrap-failures
```

Locally, the controller runs inside the `adhar up` process. It exits once phase 2 is done, the Gateway is available and the GitOps sync has converged, or `--apps-timeout` (default 15m) has passed. **Nothing retries on its own after that.** Re-running `adhar up` without `--recreate` is safe: each phase keys on a status flag, so satisfied gates are skipped.

```bash
adhar up               # safe resume
adhar up --recreate    # DESTRUCTIVE: delete the cluster and rebuild
```

On a cloud, roll changes out with `adhar upgrade --yes` (preview with `--diff-only`). When you re-run `adhar up -f`, always pass `--env <name>`.

## Install and provisioning

| Symptom | Cause | Fix |
|---|---|---|
| Ctrl-C, a sleep or a timeout interrupted `adhar up` | The local controller is ephemeral; nothing retries | Run `adhar up` again. It resumes from the pending gate |
| `failed installing <component>: …` for `gateway-api-crds`, `cilium`, `gateway`, `cnpg`, `argocd` or `gitea`; the component never becomes `Available` | An image pull, admission webhook or resource-pressure failure in the ordered install | Usually self-heals on requeue. If not, run `adhar up`; if the node is starved, `adhar up --recreate` |
| Bootstrap sits at "Setting up GitOps repositories…" and logs `Gitea not ready` or `Gitea API not responding after 5 minutes` | Gitea took longer than the seeding step allows: a slow disk, an image pull, or (HA mode) a CNPG database still initialising | `kubectl rollout status deploy/gitea -n adhar-system --timeout=10m`, then `adhar up` to resume seeding |
| The foundation is up and apps exist, but `CrossplaneReady` stays false and `adhar up` keeps requeuing | The control-plane configuration applies only after the provider CRDs register, and `CrossplaneReady` waits for that | Wait; the loop requeues every 15 seconds. Then check the next row |
| Health is green but nothing can be provisioned | The ProviderConfigs are missing: deleted later, or dropped by an older binary that applied them before their CRDs registered | Re-run `adhar up` with a current binary, or apply them by hand from the Adhar repository (see below) |
| `adhar cluster list` prints `No clusters found` for a cluster that is running | Without `--file`, the command loads the default config, which declares no cloud provider | `adhar cluster list --file config.yaml`. The same applies to `status`, `scale`, `upgrade` and `delete` |
| ArgoCD Applications hang `Terminating` after you delete a `Cluster` | Deleting the XR removes ArgoCD's cluster-registration Secret with the cluster, so the prune finalizer can never reach an API server | Clear the finalizers (see below). Next time, prune the Applications **before** you delete the XR |

Crossplane failures show up as `failed reconciling Crossplane`, not as `failed installing`.

**Diagnose a stuck install:**

```bash
kubectl get adharplatform -n adhar-system -o yaml           # which gate is pending
kubectl -n adhar-system describe pod <pod>                  # why a component is not Available
kubectl get deploy,pods -n adhar-system -l app=gitea
kubectl get clusters.postgresql.cnpg.io -n adhar-system     # HA: is gitea-db healthy?
kubectl get pkg -A                                          # Crossplane packages
```

**Check that the ProviderConfigs exist.** `adhar get status` does not make this check:

```bash
kubectl get clusterproviderconfigs.kubernetes.m.crossplane.io
kubectl get clusterproviderconfigs.helm.m.crossplane.io
kubectl get clusterproviderconfigs.aws.m.upbound.io   # per cloud in use (Civo: providerconfigs.civo.crossplane.io)
```

If every group returns "No resources found", they are missing. The manifests are in `platform/controlplane/configuration/providers/config/` (Kubernetes and Helm) and `platform/controlplane/configuration/providers/cloud/` (one file per cloud).

**Clear a stuck Application finalizer:**

```bash
kubectl -n adhar-system patch application <app> --type merge \
  -p '{"metadata":{"finalizers":[]}}'
```

## ArgoCD and GitOps

| Symptom | Cause | Fix |
|---|---|---|
| ArgoCD is healthy and the UI is empty | The GitOps phase never completed; the Gitea `adhar` org was never seeded | Re-run `adhar up` without `--recreate` |
| One commit to `adhar/packages` flips every application to `OutOfSync` | Expected. Every Application tracks `main` of the same repository, so one commit changes every target revision | Wait for the wave to drain. Investigate only an app that is still `Degraded` afterwards |
| An operation sits at `waiting for healthy state of <resource>`; a pushed fix changes nothing | The in-flight operation is pinned to the revision it started with and keeps re-applying stale manifests | Terminate the operation, then hard-refresh the Application (see below) |
| `kubectl edit` changes revert | ArgoCD self-heal | Change the stack and run `adhar upgrade`. See [Customization](/docs/operations/customization) |
| On HA, a Keycloak user sees no applications while local `admin` sees everything | `argocd-rbac-cm.policy.csv` is empty, so no group maps to a role | Restore the shipped policy, then restart the ArgoCD server (see below) |
| `Invalid redirect URL` on ArgoCD login (HA) | A wrong `argocd-cm.url` | Patch it to `https://argocd.<defaultHost>` and restart the ArgoCD server |
| Two packages flap `Degraded` forever | A mutual exclusion (for example `vault` and `openbao`) is violated | `adhar stack conflicts`, disable one, `adhar upgrade` |

**Diagnose an empty ArgoCD:**

```bash
kubectl get applicationset,applications -n adhar-system    # empty = never seeded
kubectl get svc -n adhar-system gitea-argocd               # missing = never seeded
```

**Unstick a sync.** Terminate the operation through the ArgoCD UI or API. An API call needs the `content-type: application/json` header; without it you get `415 Unsupported Media Type`. Then force a recompute:

```bash
kubectl -n adhar-system annotate application <app> \
  argocd.argoproj.io/refresh=hard --overwrite
```

**Restore the RBAC policy.** Confirm it is empty, copy the full `policy.csv` back, and restart the server:

```bash
kubectl -n adhar-system get cm argocd-rbac-cm -o jsonpath='{.data.policy\.csv}'   # prints nothing
kubectl -n adhar-system rollout restart deploy/argo-cd-argocd-server
```

The shipped policy maps `platform-admin` to `role:admin`, `platform-viewer` to `role:readonly`, and `platform-developer` to a custom `role:platform-developer` (get and sync applications; read logs, repositories, projects and clusters). Copy it from the `argocd-rbac-cm` ConfigMap in the ArgoCD manifests of your Adhar version: `platform/controllers/adharplatform/resources/argocd/install.yaml`, or `install-ha.yaml` in HA mode. Do not write a shorter one: mapping developers to `role:readonly` takes away their sync rights.

## DNS, TLS and reachability

| Symptom | Cause | Fix |
|---|---|---|
| `curl` returns `HTTP 000` on every URL: the socket connects but nothing answers | The Gateway is not `Programmed`. Usually its `CiliumGatewayClassConfig` was applied before the CRD registered, so Cilium defaulted the Service to `LoadBalancer`, which stays pending on Kind | Re-run `adhar up`. The Gateway reconciler runs again because `Gateway.Available` was never set |
| DNS, the load balancer and the Gateway look healthy, yet HTTPS fails | The ACME DNS-01 challenge never completed, so `Secret/adhar-cert` still holds the self-signed certificate. On AWS the usual reason is a missing Route 53 region; elsewhere, a missing or expired DNS credential | Correct the credential or region, then run `adhar upgrade`. Temporary cloud credentials expire and silently stop renewals |
| A pod is `Running` but its hostname returns 404 or does not resolve | The package ships no `HTTPRoute`, or external-dns has not published the record yet | Add an `HTTPRoute` whose `parentRefs` point at `adhar-gateway` ([Customization](/docs/operations/customization)). Meanwhile, port-forward to the backend |

**Diagnose the Gateway:**

```bash
kubectl get gateway -n adhar-system adhar-gateway \
  -o custom-columns=PROGRAMMED:'.status.conditions[?(@.type=="Programmed")].status'
kubectl get svc -n adhar-system cilium-gateway-adhar-gateway   # want NodePort locally
kubectl get ciliumgatewayclassconfig                           # empty = the root cause
```

**Diagnose TLS and routes:**

```bash
kubectl -n adhar-system get certificate
kubectl -n adhar-system get secret adhar-dns-provider
kubectl get httproute -A | grep <service>
dig +short <service>.<defaultHost>
```

**Reach a backend directly** while DNS propagates:

```bash
kubectl port-forward -n adhar-system svc/argo-cd-argocd-server 8443:443
kubectl port-forward -n adhar-system svc/console              3000:80
```

## Capacity

| Symptom | Cause | Fix |
|---|---|---|
| Pods stay `Pending` on Kind; the node is under memory pressure | One Kind node cannot run the whole catalogue | `adhar stack disable <package>`, then `adhar upgrade`. Or give the container engine more resources: 8 GB of RAM is the minimum, and 8 CPU with 16 GiB free is comfortable for the local core. If everything is wedged, `adhar up --recreate` |
| `0/3 nodes are available: 3 node(s) exceed max volume count` on a cloud, while CPU and memory look fine | Every cloud caps block volumes per VM: 7 per DigitalOcean droplet, 4–16 on Azure depending on size. Claims on `adhar-block` hit that cap | Add workers; each brings its own volume slots. Keep `adhar-local` as the default StorageClass |
| Pods `Pending` with `volume node affinity conflict` | **Not** a capacity problem. The volume is pinned to a zone or node the pod cannot use, so more workers do not help | Check the PV's `nodeAffinity` and the StorageClass `volumeBindingMode` |
| A worker drops to `NotReady`; `SystemOOM` events; containerd died | The node is saturated. eBPF agents usually fail first, and a starved kubelet takes its pods down | `sudo systemctl restart containerd kubelet` on the node. Then add workers and set limits on memory-hungry agents |

**Diagnose:**

```bash
kubectl top nodes
kubectl get events -n adhar-system --sort-by=.lastTimestamp | tail -30
kubectl get sc                                   # adhar-local must be the default
kubectl get csinodes -o yaml | grep -A3 allocatable
kubectl get volumeattachments
```

**Add workers:**

```bash
adhar cluster scale <cluster> --workers 10 -p digitalocean -f config.yaml
```

`spec.storageClassName` is immutable. To move a PVC that has the wrong class, you must delete it.

### The autoscaler is not scaling

Pods are `Pending`, or the cluster is idle, and the worker count does not move. This is usually a deliberate guard, and the platform resource records the reason:

```bash
kubectl get adharplatform -n adhar-system \
  -o jsonpath='{.items[0].status.autoscaling}{"\n"}'
# workers, lastScaleUp, lastScaleDown, underutilizedSince, lastReason
```

| `lastReason` says | Cause | Fix |
|---|---|---|
| `N pod(s) pending for capacity but maxWorkers=N reached` | The spend ceiling | Raise `autoscaling.maxWorkers` |
| `… waiting out the 3m0s scale-up cooldown` | `scaleUpCooldown` since the last addition (default 3m0s) | Wait, or lower the cooldown |
| `cluster idle for Xs of the required 10m0s` | `scaleDownDelay` has not elapsed (default 10m0s) | Wait, or lower the delay |
| `cluster idle … but minWorkers=N reached` | The floor | Lower `autoscaling.minWorkers` |
| `cluster idle but a worker was added recently; holding` (or `removed recently`) | One move per delay window, so the cluster settles | Wait |
| `… no worker is safe to drain: pod <ns>/<name> holds ReadWriteOnce volume <claim>` | A node hosting a ReadWriteOnce volume is never retired | Move or remove the volume if you need the node gone |

Pods pending on taints, node affinity or a volume affinity conflict do not trigger a scale-up. A new worker is a clone of the existing ones, so it would not satisfy them either.

### Storage saturation

| Symptom | Cause | Fix |
|---|---|---|
| Every SSO login returns 503, and `barman-cloud-wal-archive: … no space left on device` appears on every database at once | The in-cluster object store (RustFS) is the default backup target for every platform database. When its volume fills, WAL archiving fails everywhere, no database can retire WAL, and the Postgres volumes fill. Keycloak usually runs out first | Grow the object store's claim, set a CNPG `retentionPolicy` on every database, then expand any Postgres claim that already filled |

**Diagnose:**

```bash
kubectl -n adhar-system get pvc rustfs-data
kubectl -n adhar-system get clusters.postgresql.cnpg.io \
  -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,LASTFAILED:.status.lastFailedBackup
```

**Expand a filled Postgres claim:**

```bash
kubectl -n adhar-system patch pvc keycloak-db-1 --type merge \
  -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

In production, point the backup location at off-cluster object storage, and alert when the object store's PVC usage goes above 80%. See [Backup and Restore](/docs/guides/backup-and-restore).

## Secrets and OpenBao

*Production profile.* OpenBao is off locally.

| Symptom | Cause | Fix |
|---|---|---|
| `ExternalSecret`s sit in `SecretSyncedError` and their Secrets never appear | OpenBao is sealed or uninitialised | Sync the `openbao` Application: `adhar gitops sync openbao`. The `openbao-bootstrap` Job is an idempotent sync hook that re-runs init, unseal and configuration |
| Same | `ClusterSecretStore/vault` is missing | Same sync; the bootstrap Job recreates the configuration |
| Same, and `vault` and `openbao` both flap | Both secret backends are enabled. Both claim `ClusterSecretStore/vault` and `Service/vault` | Disable one, then `adhar upgrade` |
| Same, for an ExternalSecret in an application namespace | It names `ClusterSecretStore/vault`, which serves `adhar-system` only | Use the namespace's own `SecretStore`, with OpenBao role `tenant` and ServiceAccount `adhar-secrets`. See [Manage Secrets End to End](/docs/guides/manage-secrets) |

**Diagnose:**

```bash
kubectl -n adhar-system get pods -l app.kubernetes.io/name=openbao
kubectl -n adhar-system logs job/openbao-bootstrap
kubectl get clustersecretstore vault -o yaml
adhar stack conflicts
```

> **Note:** `adhar stack sync openbao` is not enough. It only asks ArgoCD to re-compare, and re-comparing an app that is already in sync starts no sync, so the hook does not run. Use `adhar gitops sync openbao` or **Sync** in the ArgoCD UI.

The unseal key and root token live in `Secret/openbao-keys`. In production, prefer KMS auto-unseal.

## Policy denials

*Mostly production profile.* Locally, only `verify-supply-chain-images` (unsigned Harbor `library/*` images) enforces; the audit and enforce policy packs are off.

| Symptom | Cause | Fix |
|---|---|---|
| A deploy is rejected by an admission webhook, or an app is `Degraded` with a Kyverno message | A `ClusterPolicy` with `failureAction: Enforce` matched the resource. The usual triggers are an unsigned image, a `:latest` tag, or a registry outside the allow-list | Correct the resource |
| You added a `PolicyException` and the deploy is still rejected | Kyverno `PolicyException`s are switched off in the shipped install (`--enablePolicyException=false`) | Correct the resource, or change the policy in the stack |
| A policy reports failures but blocks nothing | It is an Audit policy. Everything in `adhar-kyverno-policies` is Audit, so it reports but never blocks | Expected. Fix the finding in the resource |

The supply-chain pack ships twice with identical rules: `adhar-supply-chain-policies` (Audit) reports and `adhar-supply-chain-policies-enforce` (Enforce) blocks. So audit findings predict what enforce rejects. The enforce policies exempt platform namespaces by name and by the `adhar.io/plane: control` label. Moving a rule from enforce to audit, or exempting a namespace, is a policy decision: make it in the stack, not with `kubectl`.

**Diagnose:**

```bash
adhar policy status                 # pass/fail/warn per PolicyReport
adhar compliance --failures-only    # the same data as a control posture
kubectl get clusterpolicy
```

## Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| You are diagnosing the wrong cluster | Another kube-context is current | `kubectl config current-context` before anything else |
| `adhar up --recreate` "fixed" it but the data is gone | `--recreate` deletes the cluster | Re-run `adhar up` without it first; it resumes |
| `adhar up -f config.yaml` touched every environment | No `--env` | Always pass `--env <name>` |
| `adhar get apps` is empty | It lists your own applications, not platform packages | `adhar stack list --problems` |

## Debugging toolbox

```bash
adhar ai diagnose <package>          # agentic triage, if the AI layer is on
kubectl -n adhar-system logs deploy/argo-cd-argocd-server
kubectl get events -n adhar-system --sort-by=.lastTimestamp | tail -30
cilium status && hubble observe --since 5m --namespace <ns>   # needs the cilium and hubble CLIs; run `cilium hubble port-forward` first
```

Still stuck? Ask on [Slack](https://join.slack.com/t/adhar-io/shared_invite/zt-4e93jrspf-HpEo6FRHwi1LA05TEJUCVg) or open a [GitHub issue](https://github.com/adhar-io/adhar/issues).

## Next steps

- [Accessing the Platform](/docs/operations/accessing-the-platform) — the request path
- [CLI Reference](/docs/reference/cli) — every diagnostic command
- [Customization](/docs/operations/customization) — making a fix stick
