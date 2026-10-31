---
title: "Platform Services"
section: "Core Concepts"
order: 4
path: "/docs/core-concepts/platform-services"
---

# Platform Services

Adhar ships a curated catalogue of **100+ open-source packages**. Each is wired as an entry in the platform's ApplicationSets (a few packages have more than one entry, such as an audit and an enforce variant). **A package is the platform's unit of capability.** It is a directory of pre-rendered manifests plus a contract that a machine can check. ArgoCD delivers it, and one line in Git switches it on.

This page explains:

- how the catalogue is organised
- what "enabled" really means
- how packages relate to each other
- how to discover, enable and inspect a package

It is for anyone deciding what a platform should run. By the end, you will be able to find a package and judge whether it is safe to turn on. You will also be able to enable it the GitOps way and check that it converged.

> **Explore the ecosystem visually.** The [interactive Integrations explorer](/integrations) lets you search and filter every tool Adhar builds on, with logos and a description of how each one is used.

## At a glance

| | |
|---|---|
| **What a package is** | A directory under `platform/stack/packages/<category>/<name>/` |
| **What delivers it** | One ArgoCD ApplicationSet, one Application per enabled package |
| **Where it installs** | `adhar-system`, for every package |
| **How you enable one** | `adhar stack enable <pkg>` → review the diff → `adhar upgrade` |
| **How you inspect one** | `adhar stack describe <pkg>` |
| **Categories** | Nine in the contract enum; seven carry ApplicationSet entries today |
| **Profiles** | `local` (Kind, curated core) and `production` (cloud/on-prem) — `adhar stack list` prints what each enables |

## What a package is

Packages hold **pre-rendered manifests**, not charts. Nothing is templated at apply time, so the Git diff *is* the cluster diff. What you review in a pull request is exactly what runs:

```text
platform/stack/packages/security/cert-manager/
├── adhar-package.yaml        # marketplace contract (name, category, provenance…)
├── values.yaml               # your configuration surface
├── generate-manifests.sh     # helm template … -f values.yaml > manifests/install.yaml
└── manifests/
    └── install.yaml          # what ArgoCD syncs (generated — never hand-edit)
```

`adhar-package.yaml` is the contract. CI validates every contract it finds against `marketplace.schema.json`, so a malformed contract fails the build. Beyond identity and licence, it declares what you need to know when deciding whether to turn a package on:

| Field | Why you care |
|---|---|
| `dependencies` | Packages that must be enabled first — `agentgateway` serves `adhar-ai`'s endpoints, so one without the other is a gateway with nothing behind it |
| `planeAffinity` | `control-plane`, `data-plane`, or `any` — where it belongs in a fleet |
| `stability` | `alpha`, `beta`, `stable`, or `community` — how mature it is *meant* to be |
| `verification` | What was actually *observed*: `verified`, `known-broken`, or `unverified`, with the profile and date it was last seen `Healthy` |
| `resources` | Footprint hints, including `localSafe` — whether one Kind node can carry it |

> **`stability` and `verification` are different claims.** `stability` is intent. `verification` is evidence: `adhar stack verify` reports it from live ArgoCD health, and `adhar stack verify --write` records it in the contract. Editing it by hand defeats its only purpose.

## How packages are delivered

An ArgoCD **ApplicationSet** is a resource that generates one ArgoCD Application per entry in a list. The platform's ApplicationSet turns every enabled entry into an Application. It keeps each Application reconciled from Git. Each entry is a list element, and the generator's selector filters on the `enabled` label:

```yaml
- name: "harbor"
  enabled: "true"         # ← the on/off gate: a STRING, matched by the generator's selector
  namespace: "adhar-system"   # every platform package installs here
  category: "application"     # also stamped on the Application as adhar.io/category
  manifestPath: "application/harbor/manifests"   # path inside the adhar/packages repo
```

```diagram
gd-applicationset-flow
```

Understand two consequences before you change anything:

- **There is no live switch.** The ApplicationSet is re-applied from the stack whenever `adhar up` or `adhar upgrade` runs. So a `kubectl edit` of the live object is lost at the next run. To enable a package, change the *source*, then run `adhar upgrade`.
- **Disabling deletes running things.** Prune is on by default, so ArgoCD uninstalls the package's workloads. PersistentVolumes then follow their reclaim policy, and data can go with them.

## Enabled by default, and opt-in

The ApplicationSet is **selected by provider**. Kind gets the *local* profile. Any cloud or on-prem target gets the *production* profile.

```diagram
ds-profiles
```

| Profile | File | Applied to | Enables | Why |
|---|---|---|---|---|
| **local** | `adhar-appset-local.yaml` | Kind, or no provider set | A small curated core | A single Kind node cannot run the full catalogue — the complete set OOM-kills it |
| **production** | `adhar-appset-production.yaml` | Any other provider: AWS, Azure, GCP, DigitalOcean, Civo, custom | Most of the catalogue | All but the documented mutual exclusions and alternatives; each disabled entry carries its reason inline |

The counts change as packages are added and verified, so this page does not quote them. `adhar stack list --enabled` prints the live set for your profile.

Every package is *wired* in both profiles; the `enabled` flag is the only difference. So "opt-in" means "flip one line", not "go find and integrate a tool".

Two rules govern edits:

1. **Each profile's ApplicationSet has a mirrored environment config that must agree with it.** For `local`, that is `platform/stack/adhar-appset-local.yaml` and `platform/stack/environments/local/config.yaml`. For `production`, it is `platform/stack/adhar-appset-production.yaml` and `platform/stack/environments/prod/config.yaml`. A parity test enforces the match.
2. **The local core must stay a subset of production.** Enabling a package locally also enables it in production. Disabling one in production also disables it locally. (The one deliberate exception is `adhar-local-budget`, a Kyverno policy enabled only in the local profile, which caps CPU requests so the platform fits on one Kind node.)

`adhar stack enable` and `adhar stack disable` handle both rules. That is the main reason to use them instead of editing files by hand.

## How services relate to each other

Every platform package installs into the one shared **`adhar-system`** namespace. That keeps the platform easy to read and makes wiring services together simple. But it removes the namespace boundary that upstream charts assume. That leads to the catalogue's two relationship rules.

**Dependencies.** Some packages are only useful with another:

- `agentgateway` fronts `adhar-ai`.
- `adhar-supply-chain` builds images, pushes them to `harbor` and signs them with the cosign tool (from its own pipeline Tasks, not from the retired `cosign` package).
- `adhar-cost-governance` reads OpenCost's metrics.

**Mutual exclusions.** Some pairs claim the same object. When two Applications fight over one object, both report Degraded without saying why. The conflicts are documented in `platform/stack/packages/CONFLICTS.md`. `adhar stack conflicts` checks your profile against the exclusion rules built into the CLI, and `adhar stack enable` refuses to turn on the second member of an exclusive pair.

| Pair | Why they collide |
|---|---|
| `vault` ↔ `openbao` | Both define `ClusterSecretStore/vault` and `Service/vault`. Exactly one may be enabled. Production runs OpenBao (MPL-2.0), not Vault (BUSL-1.1), and keeps every downstream name identical, so consumers never need to know which one runs |
| `vllm-cpu` ↔ `vllm-gpu` | Both Deployments are named `vllm` and share one Service. Each depends on the shared `vllm` entry, so enable `vllm` plus exactly one variant |
| `cosign` ↔ `buildpack` | Both knative-framework webhooks hardcode `Secret/webhook-certs`. Today this cannot bite: the `cosign` package is retired and disabled in both profiles, and image signatures are enforced by Kyverno instead |

> **Renaming the manifest cannot fix a name that a package hardcodes in its binary.** The binary never reads the renamed object. That is why some pairs are resolved by renaming, and others are exclusive by design.

## The catalogue, by category

The contract enum recognises nine categories, which match the directory layout on disk. Seven of them carry ApplicationSet entries today. `backup` and `plugins` exist as directories but hold no wired package (Velero is wired under `core`).

| Category | What it covers | Packages |
|---|---|---|
| **core** | Portal, fleet and backup | `adhar-console`, `vcluster`, `karmada`, `kamaji`, `velero` |
| **infrastructure** | Provisioning engines and node runtimes | `crossplane`, `terraform`, `kata-containers`, `gpu-operator` |
| **security** | Identity, secrets, policy, runtime and supply-chain security | `keycloak`, `adhar-local-budget` (enabled locally only), `openbao`, `vault`, `external-secrets`, `cert-manager`, `kyverno`, `adhar-kyverno-policies`, `adhar-policy-packs`, `adhar-policy-reporter`, `adhar-supply-chain-policies`, `adhar-supply-chain-policies-enforce`, `adhar-tenant-quotas`, `adhar-credential-rotation`, `falco`, `tetragon`, `trivy`, `cosign` |
| **observability** | Metrics, logs, traces, profiles, flows, cost, alerting | `kube-prometheus`, `mimir`, `loki`, `tempo`, `alloy`, `faro`, `beyla`, `pyroscope`, `pixie`, `hubble`, `metrics-server`, `victoria-metrics`, `fluent-bit`, `opencost`, `adhar-cost-governance`, `oncall`, `headlamp` |
| **application** | Delivery, supply chain, runtimes and developer tooling | `tekton`, `buildpack`, `harbor`, `nexus`, `adhar-supply-chain`, `adhar-supply-chain-kyverno`, `adhar-libraries`, `adhar-scorecards`, `adhar-preview-environments`, `adhar-preview-environments-kyverno`, `argo-events`, `argo-rollout`, `argo-workflows`, `kargo`, `keda`, `knative`, `dapr`, `external-dns`, `coder`, `k6`, `litmus`, `n8n`, `posthog`, `plane`, `penpot`, `baserow`, `strapi`, `tooljet` |
| **data** | Databases, streaming, object storage, lakehouse, ML and BI | `cnpg`, `mongodb`, `mysql-operator`, `mariadb-operator`, `neo4j`, `valkey`, `valkey-admin`, `redis`, `rabbitmq`, `kafka-operator`, `kafka-ui`, `opensearch`, `rustfs`, `minio`, `trino`, `airbyte`, `dagster`, `prefect`, `spark-operator`, `kubeflow`, `jupyterhub`, `mlflow`, `metabase`, `open-metadata`, `libredb-studio` |
| **ai** | Model serving and the agentic layer | `adhar-ai`, `agentgateway`, `k8sgpt`, `llm-d`, `llm-d-cpu`, `llm-d-gpu`, `vllm`, `vllm-cpu`, `vllm-gpu` |

The full searchable list with logos and per-tool usage is on the [Integrations explorer](/integrations).

## Discover, enable, and inspect a service

`adhar stack` is the platform half of the CLI. `adhar application` manages what *you* deploy. `adhar stack` manages what the platform is *made of*.

### 1. Discover what is there

```bash
adhar stack list                     # the catalogue: declared vs live state
adhar stack list --category data     # ai, application, core, data,
                                     # infrastructure, observability, security
adhar stack list --enabled           # only what this profile turns on
adhar stack list --problems          # only what is not Synced and Healthy
```

Each row pairs what the profile **declares** with what the cluster is **doing**. The interesting cases are where they disagree:

- Enabled but `Missing` means it has not synced yet.
- Disabled but still present means it has not been pruned.

This output, not a documentation page, is the authoritative answer to "what is running here?"

### 2. Inspect one package

```bash
adhar stack describe keycloak        # contract, live state, conflicts, deps
adhar stack describe keycloak --json # the same, for scripting
adhar stack status                   # how converged the platform is overall
```

`describe` answers "should I trust this?" It shows the version, stability, verification evidence, licence, maintainer, upstream chart and dependencies. It also shows what ArgoCD currently says, and which packages it must not run alongside.

### 3. Enable it

```bash
adhar stack conflicts                # check the exclusion rules first
adhar stack enable harbor            # edits the appset + mirrored env config
git diff                             # the change is yours to review
adhar upgrade --diff-only            # exactly what will change in the cluster
adhar upgrade                        # converge
adhar stack sync harbor              # hard refresh if it parks at Unknown
```

`enable` and `disable` edit files and stop there. Nothing is committed, pushed or applied until you run `adhar upgrade`.

### 4. Verify it converged

```bash
adhar stack list --enabled --category application   # harbor now declared enabled
adhar stack status harbor                           # declared vs live, one package
kubectl -n adhar-system get applications.argoproj.io harbor   # SYNC Synced, HEALTH Healthy
kubectl get httproute -A | grep harbor              # the route that makes its UI reachable
```

Success means the Application is at `Synced` and `Healthy`. For a package with a UI, it also means an `HTTPRoute` exists for its host.

- A package that sits at `Progressing` for a few minutes is usually pulling images or waiting on a database.
- A package that sits at `Unknown` needs `adhar stack sync <pkg>`.

To change a package's *configuration*, rather than whether it is on:

1. Edit `values.yaml`.
2. Re-run `generate-manifests.sh`.
3. Commit the regenerated manifests.

That workflow, and how to add your own package, is in [Customization](/docs/operations/customization).

## Accessing services

Every UI is a subdomain of the platform host on the shared Cilium Gateway:

- Locally: `https://<name>.adhar.localtest.me:8443`
- In the cloud: `https://<name>.<your-domain>` on 443

Every UI trusts the same Keycloak realm (`adhar`), so you sign in once. A URL works only if its package is enabled in your profile; Hubble, for example, is off in the local profile.

| Service | Local URL | What it is |
|---|---|---|
| Adhar Console | `https://console.adhar.localtest.me:8443` | Developer portal: catalog, golden paths, scorecards, cloud shell |
| ArgoCD | `https://argocd.adhar.localtest.me:8443` | GitOps applications |
| Gitea | `https://gitea.adhar.localtest.me:8443` | Platform source of truth |
| Keycloak | `https://keycloak.adhar.localtest.me:8443` | Identity provider |
| Grafana | `https://grafana.adhar.localtest.me:8443` | Metrics, logs, traces, cost |
| Harbor | `https://harbor.adhar.localtest.me:8443` | Container registry (signed images) |
| Headlamp | `https://headlamp.adhar.localtest.me:8443` | Kubernetes UI |
| Hubble | `https://hubble.adhar.localtest.me:8443` | Live network flows |

For the authoritative list on your own platform, read the routes. Get credentials from the CLI, not from pods:

```bash
kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]
adhar get secrets                 # everything the CLI knows about
adhar get secrets -p <service>    # argocd | gitea | keycloak | adhar-console | openbao | vault | postgres | redis | harbor | rustfs
```

Keycloak groups map to platform roles:

- `platform-admin`: Gitea Owners, cluster-admin
- `platform-developer`: Gitea developers, `edit`
- `platform-viewer`: Gitea viewers, `view`

Full detail is in [Accessing the Platform](/docs/operations/accessing-the-platform).

## How your workloads use these services

Platform services are not only dashboards. They are the runtime your applications build on:

- **Secrets**: reference an `ExternalSecret`. External Secrets fetches the value from OpenBao at runtime. Nothing sensitive lives in Git. OpenBao is on in the production profile and off locally.
- **Registry**: the supply chain pushes images to Harbor and signs them with cosign. Kyverno checks signatures in two layers:
  - In **every profile**, the `verify-supply-chain-images` policy (from `adhar-supply-chain`) enforces a valid signature on Harbor `library/*` images in workload namespaces. Images from anywhere else are not checked by it, and `adhar-system` is excluded.
  - In the **production profile only**, the `adhar-supply-chain-policies` pack adds `verify-image-signatures`, `restrict-image-registries` and `disallow-latest-tag`, each in an Audit and an Enforce variant. It is off locally.
- **Observability**: telemetry is collected automatically. Once a package is enabled, Grafana already sees it.
- **Policy**: Kyverno admits or rejects workloads. When an Enforce-mode policy rejects one, the denial names the policy.
- **Self-service infrastructure**: request databases, caches and buckets as [Control Plane](/docs/core-concepts/control-plane) resources.
- **Readiness**: every 30 minutes, `adhar-scorecards` grades every service 0–100 from in-cluster signals. It publishes the `adhar-scorecards` ConfigMap, which the Console reads:


```bash
kubectl -n adhar-system create job --from=cronjob/adhar-scorecard-scorer scorecard-now
kubectl -n adhar-system get configmap adhar-scorecards -o jsonpath='{.data.summary\.json}' | jq .
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Two Applications flapping Degraded with no clear error | Both claim the same object in `adhar-system` | `adhar stack conflicts`, then disable one |
| A package enabled in Git never appears | The mirrored environment config was not updated | Use `adhar stack enable`, or edit both files; the parity test catches it |
| An edit to a manifest keeps disappearing | ArgoCD self-heal reverted it | Edit `values.yaml`, re-run `generate-manifests.sh`, commit |
| Kind node OOM-kills after enabling several packages | The local profile is curated for one node | Check `kubectl top nodes`; enable in small waves, or move to a cloud profile |
| `adhar stack list` errors about the ApplicationSet | Run from outside the repository root | Run from the repo root, or pass `--stack-dir` |

## Keep reading

- [Architecture](/docs/core-concepts/architecture) — how packages fit the four-layer design
- [Customization](/docs/operations/customization) — enable, configure, and add packages
- [Control Plane](/docs/core-concepts/control-plane) — the self-service infrastructure APIs
- [Upgrade the Platform](/docs/guides/upgrade-the-platform) — converging a live platform onto a newer stack
- [Integrations explorer](/integrations) — the full searchable catalogue
