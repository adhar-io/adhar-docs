---
title: "Platform Services"
section: "Core Concepts"
order: 4
path: "/docs/core-concepts/platform-services"
---

# Platform Services

Adhar ships a curated catalogue of **100+ open-source packages** (a matching number of ApplicationSet entries). **A package is the platform's unit of capability** — a directory of pre-rendered manifests plus a machine-checkable contract, delivered by ArgoCD and switched on by one line in Git. This page explains how that catalogue is organised, what "enabled" really means, how packages relate to each other, and how to discover, enable, and inspect one.

> **Explore the ecosystem visually.** The [interactive Integrations explorer](/integrations) lets you search and filter every tool Adhar builds on, with logos and a description of how each one is used.

## At a glance

| | |
|---|---|
| **What a package is** | A directory under `platform/stack/packages/<category>/<name>/` |
| **What delivers it** | One ArgoCD ApplicationSet, one Application per enabled package |
| **Where it installs** | `adhar-system` (one documented exception: `buildpack` in `kpack-system`) |
| **How you enable one** | `adhar stack enable <pkg>` → review the diff → `adhar upgrade` |
| **How you inspect one** | `adhar stack describe <pkg>` |
| **Categories** | Nine in the contract enum; seven carry ApplicationSet entries today |
| **Profiles** | `local` (Kind, curated core) and `production` (cloud/on-prem) — `adhar stack list` prints what each enables |

## What a package is

Packages hold **pre-rendered manifests**, not charts. Nothing is templated at apply time, so the Git diff *is* the cluster diff — what you review in a pull request is exactly what runs:

```text
platform/stack/packages/security/cert-manager/
├── adhar-package.yaml        # marketplace contract (name, category, provenance…)
├── values.yaml               # your configuration surface
├── generate-manifests.sh     # helm template … -f values.yaml > manifests/install.yaml
└── manifests/
    └── install.yaml          # what ArgoCD syncs (generated — never hand-edit)
```

`adhar-package.yaml` is the contract, validated in CI against `marketplace.schema.json`; a directory without one fails the build. Beyond identity and licence it declares what you need when deciding whether to turn something on:

| Field | Why you care |
|---|---|
| `dependencies` | Packages that must be enabled first — `agentgateway` serves `adhar-ai`'s endpoints, so one without the other is a gateway with nothing behind it |
| `planeAffinity` | `control-plane`, `data-plane`, or `any` — where it belongs in a fleet |
| `stability` | `alpha`, `beta`, `stable`, or `community` — how mature it is *meant* to be |
| `verification` | What was actually *observed*: `verified`, `known-broken`, or `unverified`, with the profile and date it was last seen `Healthy` |
| `resources` | Footprint hints, including `localSafe` — whether one Kind node can carry it |

> **`stability` and `verification` are different claims.** `stability` is intent; `verification` is evidence, written by `adhar stack verify` from live ArgoCD health. Editing it by hand defeats its only purpose.

## How packages are delivered

A single ArgoCD **ApplicationSet** turns every enabled entry into an Application and keeps it reconciled from Git. Each entry is a list element, and the generator's selector filters on the `enabled` label:

```yaml
- name: "harbor"
  enabled: "false"        # ← the on/off gate
  namespace: "adhar-system"
  category: "application"
  manifestPath: "application/harbor/manifests"
```

```diagram
gd-applicationset-flow
```

Two consequences are worth internalising before you change anything:

- **There is no live switch.** The controller re-applies the ApplicationSet from the stack on every reconcile, so `kubectl edit` of it is undone within the minute. Enabling a package is a change to the *source*, followed by `adhar upgrade`.
- **Disabling deletes running things.** Prune is on by default, so ArgoCD uninstalls the package's workloads. PersistentVolumes then follow their reclaim policy — data can go with them.

## Enabled by default, and opt-in

The ApplicationSet is **selected by provider**. Kind gets the *local* profile; any cloud or on-prem target gets the *production* profile.

| Profile | Applied to | Enables | Why |
|---|---|---|---|
| **local** | Kind | A curated core (32) | A single Kind node cannot run the full catalogue — the complete set OOM-kills it |
| **production** | AWS, Azure, GCP, DigitalOcean, Civo, custom | 76 | Everything except the documented mutual exclusions and alternatives, each disabled entry carrying its reason inline |

Every package is *wired* in both profiles; the `enabled` flag is the only difference. "Opt-in" therefore means "flip one line", not "go find and integrate a tool".

Two rules govern edits. First, each profile's ApplicationSet (`platform/stack/adhar-appset-<profile>.yaml`) has a **mirrored environment config** (`platform/stack/environments/<profile>/config.yaml`) that must agree with it — a parity test enforces the match. Second, **the local core must stay a subset of production**: enabling a package locally also enables it in production, and disabling one in production also disables it locally. `adhar stack enable` and `adhar stack disable` handle both, which is the main reason to prefer them over hand-editing.

## How services relate to each other

Every platform package installs into the one shared **`adhar-system`** namespace. That keeps the platform legible and makes cross-service wiring trivial, but it removes the boundary upstream charts assume — which produces the catalogue's two relationship rules.

**Dependencies.** Some packages are only useful with another: `agentgateway` fronts `adhar-ai`; `adhar-supply-chain` pushes to `harbor` and signs with `cosign`; `adhar-cost-governance` reads OpenCost's metrics.

**Mutual exclusions.** Some pairs claim the same cluster-scoped object, and two Applications fighting over one object both report Degraded without saying why. The register lives in `platform/stack/packages/CONFLICTS.md`; `adhar stack conflicts` checks your profile against it.

| Pair | Why they collide |
|---|---|
| `vault` ↔ `openbao` | Both define `ClusterSecretStore/vault` and `Service/vault`. Exactly one may be enabled — production runs OpenBao (MPL-2.0) rather than Vault (BUSL-1.1), and keeps every downstream name identical so consumers never have to know which is running |
| `cosign` ↔ `buildpack` | Both knative-framework webhooks hardcode `Secret/webhook-certs`, so `buildpack` keeps its own `kpack-system` namespace — the one documented exception to the shared-namespace rule |
| `vllm` ↔ `vllm-cpu` / `vllm-gpu` | Variants of the same serving stack |

> **A name a package hardcodes in its binary cannot be fixed by renaming the manifest** — a renamed object is never read. That is why some pairs are resolved by renaming, and others are exclusive by design.

## The catalogue, by category

The contract enum recognises nine categories, matching the directory layout on disk. Seven of them carry ApplicationSet entries today; `backup` and `plugins` exist as directories (Velero is wired under `core`).

| Category | What it covers | Packages |
|---|---|---|
| **core** | Portal and fleet components | `adhar-console`, `vcluster`, `karmada`, `kamaji`, `sveltos`, `velero` |
| **infrastructure** | Provisioning engines | `crossplane`, `terraform` |
| **security** | Identity, secrets, policy, runtime and supply-chain security | `keycloak`, `openbao`, `vault`, `external-secrets`, `cert-manager`, `kyverno`, `adhar-kyverno-policies`, `adhar-policy-packs`, `adhar-policy-reporter`, `adhar-supply-chain-policies`, `adhar-supply-chain-policies-enforce`, `adhar-tenant-quotas`, `adhar-credential-rotation`, `falco`, `tetragon`, `trivy`, `kubescape`, `cosign` |
| **observability** | Metrics, logs, traces, profiles, flows, cost, alerting | `kube-prometheus`, `mimir`, `loki`, `tempo`, `alloy`, `faro`, `beyla`, `pyroscope`, `pixie`, `hubble`, `metrics-server`, `victoria-metrics`, `fluent-bit`, `opencost`, `adhar-cost-governance`, `oncall`, `headlamp` |
| **application** | Delivery, supply chain, runtimes and developer tooling | `tekton`, `buildpack`, `harbor`, `nexus`, `adhar-supply-chain`, `adhar-supply-chain-kyverno`, `adhar-libraries`, `adhar-scorecards`, `adhar-preview-environments`, `adhar-preview-environments-kyverno`, `argo-events`, `argo-rollout`, `argo-workflows`, `kargo`, `keda`, `knative`, `open-function`, `dapr`, `external-dns`, `coder`, `k6`, `litmus`, `chaos-mesh`, `n8n`, `posthog`, `plane`, `penpot`, `baserow`, `strapi`, `tooljet` |
| **data** | Databases, streaming, object storage, lakehouse, ML and BI | `cnpg`, `mongodb`, `mysql-operator`, `valkey`, `redis`, `rabbitmq`, `kafka-operator`, `kafka-ui`, `opensearch`, `rustfs`, `minio`, `trino`, `airbyte`, `dagster`, `prefect`, `spark-operator`, `kubeflow`, `jupyterhub`, `mlflow`, `metabase`, `open-metadata`, `libredb-studio` |
| **ai** | Model serving and the agentic layer | `adhar-ai`, `agentgateway`, `llm-d`, `vllm`, `vllm-cpu`, `vllm-gpu` |

The full searchable list with logos and per-tool usage is on the [Integrations explorer](/integrations).

## Discover, enable, and inspect a service

`adhar stack` is the platform half of the CLI — `adhar application` manages what *you* deploy; `adhar stack` manages what the platform is *made of*.

### 1. Discover what is there

```bash
adhar stack list                     # the catalogue: declared vs live state
adhar stack list --category data     # ai, application, core, data,
                                     # infrastructure, observability, security
adhar stack list --enabled           # only what this profile turns on
adhar stack list --problems          # only what is not Synced and Healthy
```

Each row pairs what the profile **declares** with what the cluster is **doing**, because the interesting cases are the disagreements: enabled but `Missing` has not synced yet; disabled but still present has not been pruned. This, not a documentation page, is the authoritative answer to "what is running here?"

### 2. Inspect one package

```bash
adhar stack describe keycloak        # contract, live state, conflicts, deps
adhar stack describe keycloak --json # the same, for scripting
adhar stack status                   # how converged the platform is overall
```

`describe` answers "should I trust this?" — version, stability, verification evidence, licence, maintainer, upstream chart, dependencies, what ArgoCD currently says, and which packages it must not run alongside.

### 3. Enable it

```bash
adhar stack conflicts                # check the exclusion rules first
adhar stack enable harbor            # edits the appset + mirrored env config
git diff                             # the change is yours to review
adhar upgrade --diff-only            # exactly what will change in the cluster
adhar upgrade                        # converge
adhar stack sync harbor              # hard refresh if it parks at Unknown
```

`enable` and `disable` edit files and stop: nothing is committed, pushed, or applied until `adhar upgrade`. Changing a package's *configuration* instead means editing `values.yaml`, re-running `generate-manifests.sh`, and committing the regenerated manifests — that workflow, and adding your own package, is in [Customization](/docs/operations/customization).

## Accessing services

Every UI is a subdomain of the platform host on the shared Cilium Gateway — locally `https://<name>.adhar.localtest.me:8443`, in the cloud `https://<name>.<your-domain>` on 443 — and every one trusts the same Keycloak realm (`adhar`), so you sign in once.

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

The authoritative list for your own platform comes from the routes, and credentials from the CLI rather than from pods:

```bash
kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]
adhar get secrets                 # everything the CLI knows about
adhar get secrets -p <service>    # argocd | gitea | keycloak | harbor | vault | postgres | ...
```

Keycloak groups map to platform roles: `platform-admin` (Gitea Owners, cluster-admin), `platform-developer` (Gitea developers, `edit`), and `platform-viewer` (Gitea viewers, `view`). Full detail in [Accessing the Platform](/docs/operations/accessing-the-platform).

## How your workloads use these services

Platform services are not only dashboards — they are the runtime your applications build on:

- **Secrets** — reference an `ExternalSecret`; External Secrets fetches the value from OpenBao at runtime. Nothing sensitive lives in Git.
- **Registry** — images push to Harbor and are signed by Cosign; Kyverno admits only signed images.
- **Observability** — telemetry is collected automatically; enabling a package means Grafana already sees it.
- **Policy** — Kyverno admits or rejects workloads, and the denial names the policy.
- **Self-service infrastructure** — request databases, caches, and buckets as [Control Plane](/docs/core-concepts/control-plane) resources.
- **Readiness** — `adhar-scorecards` grades every service 0–100 from in-cluster signals every 30 minutes and publishes the `adhar-scorecards` ConfigMap the Console reads:

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
- [Integrations explorer](/integrations) — the full searchable catalogue
