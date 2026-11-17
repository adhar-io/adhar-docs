---
title: "Roadmap"
section: "Reference"
order: 5
path: "/docs/reference/roadmap"
---

```status-summary
Roadmap
```

Adhar is in active development (v0.1.x) and grows in phases. This page lists every capability under its phase with its current status, so you can tell whether a feature is ready for you and how to try the ones that are not finished.

**This page shows direction, not commitment.** The order of work follows community needs.

> **Note:** The repository keeps the direction in [`docs/ROADMAP.md`](https://github.com/adhar-io/adhar/blob/main/docs/ROADMAP.md) and the work in flight in `docs/OPEN-ITEMS.md`. When this page and the repository disagree, the repository is correct.

## How to read a status

| Status | What it means |
|---|---|
| `status:complete` | Built and exercised end to end on a real cluster |
| `status:in-progress` | The code exists and is tested where it can be. It has not been exercised on a real cluster yet, or it still needs hardening |
| `status:blocked` | Built, but waiting on a decision or an external dependency |
| `status:planned` | Designed, not built yet |

Two rules decide when an item becomes complete:

- **It has run on a real cluster.** Merging the code is not enough. One run on any supported provider is enough; it does not have to be repeated on every cloud.
- **The capability itself was exercised**: a pipeline that publishes, a query that returns data. A `Healthy` or `Synced` Argo CD Application does not count.

A phase is marked complete when its core scope is complete. Later additions to a finished phase appear in its table with their own status.

## Phases

Each phase builds on the topology the previous one set up. Every capability lands scaled-down on a laptop before it scales up.

```diagram
do-roadmap-phases
```

| Phase | Topology | Focus | Status |
|---|---|---|---|
| [**0 — Local excellence**](#phase-0--local-excellence) | T1: laptop | One-command local platform on Kind, the GitOps package model, the Crossplane control plane | `status:complete` |
| [**1 — Single-cluster production**](#phase-1--single-cluster-production) | T2: one production cluster | Self-managed clusters, HA mode, the production edge, SSO, backup and restore, upgrades, node autoscaling | `status:complete` |
| [**2 — Multi-cluster platform**](#phase-2--multi-cluster-platform) | T3: management cluster with workload clusters | Control-plane / data-plane separation, workload clusters through GitOps, hub-and-spoke observability, Cluster Mesh | `status:complete` |
| [**3 — Developer experience & ecosystem**](#phase-3--developer-experience--ecosystem) | T3 | Paved-road CI, previews, supply-chain enforcement, golden paths, Functions, scorecards, the marketplace, Adhar AI | `status:complete` |
| [**4 — Data & intelligence**](#phase-4--data--intelligence) | T3 | Lakehouse on RustFS S3 Tables, Trino and PyIceberg, table maintenance, MLflow, OpenMetadata | `status:complete` |
| [**5 — Enterprise readiness & scale**](#phase-5--enterprise-readiness--scale) | T3 | Fleet upgrades, quotas and vcluster self-service, cost governance, compliance export, IdP federation, isolation, air-gap | `status:in-progress` |

> **Warning:** Two things are deliberately absent. Know them before you plan.
>
> - **SPIFFE/SPIRE workload identity is not delivered.** It is deprecated upstream.
> - **HA control planes** (multi-master) come after Phase 1, not in it. See [Production](/docs/operations/production) for what HA mode covers.

### Phase 0 — Local excellence

`status:complete` The foundation everyone evaluates first: `adhar up` on a laptop.

| Capability | Status | What it covers |
|---|---|---|
| Deterministic bootstrap | `status:complete` | Kind cluster → Gateway API → Cilium → Gateway → Argo CD → Gitea, always in that order |
| GitOps package model | `status:complete` | The full catalogue wired as packages, with a curated local core enabled |
| Crossplane control plane | `status:complete` | XRDs and Compositions packaged and installed with the platform |
| Automated releases | `status:complete` | GoReleaser and GitHub Actions publish binaries, GHCR images and the Homebrew formula |
| Status conditions | `status:complete` | `AdharPlatform` reports ArgoCDReady, GatewayReady, GiteaReady, CrossplaneReady, GitOpsReady and Ready |
| Package health view | `status:complete` | `adhar get status` shows every package's Argo CD health and sync, with a summary |
| End-to-end bootstrap test | `status:complete` | `make e2e` runs `adhar up` → checks → `adhar down` on every push |

### Phase 1 — Single-cluster production

`status:complete` One cluster becomes a defensible production platform (T2).

| Capability | Status | What it covers |
|---|---|---|
| Self-managed clusters (kubeadm) | `status:complete` | Plain Ubuntu machines bootstrapped with kubeadm over SSH, through one shared lifecycle for every raw-compute provider |
| Managed Kubernetes | `status:complete` | `clusterMode: managed` hands the control plane to the cloud's own service |
| In-cluster controllers | `status:complete` | `adhar controller` runs as a Deployment with leader election and health probes |
| HA mode | `status:complete` | `enableHAMode` runs Argo CD, Redis, Gitea's and Keycloak's databases and Crossplane replicated, with PDBs |
| Production edge | `status:complete` | A LoadBalancer Gateway, a wildcard certificate over DNS-01, and external-dns publishing every route |
| SSO by default | `status:complete` | Keycloak OIDC in front of Argo CD, Gitea, Grafana, the Console, Kargo and every other platform UI |
| Shared platform services | `status:complete` | Applications use one Kafka, RustFS, CNPG, Valkey and OpenSearch instead of bundling their own |
| Backup and restore | `status:complete` | Velero schedules and CNPG WAL archiving into the platform object store, with a restore drill |
| Node autoscaling | `status:complete` | A platform-native controller adds and removes workers within a range, honouring PDBs |
| `adhar upgrade` | `status:complete` | Converges the foundation, diffs the package stack against Git, and pushes on confirm |
| HA control planes (multi-master) | `status:planned` | A load-balanced control plane with stacked etcd |

### Phase 2 — Multi-cluster platform

`status:complete` The management cluster runs a fleet (T3).

| Capability | Status | What it covers |
|---|---|---|
| Control-plane / data-plane separation | `status:complete` | The `DataPlane` API in `vcluster` and `adopt` modes; `adhar get dataplanes` lists the fleet |
| Workload clusters through GitOps | `status:complete` | A `Cluster` XR provisions a managed cluster and registers it with Argo CD automatically |
| Thin workload profile | `status:complete` | Kyverno, its policies, Alloy, External Secrets and metrics-server land on every registered plane |
| Hub-and-spoke observability | `status:complete` | Every plane ships cluster-labelled metrics, logs and traces to the hub's Mimir, Loki and Tempo |
| Cilium Cluster Mesh | `status:complete` | Meshed Adhar clusters with global services; meshed clusters must share a VPC |
| Environment promotion | `status:complete` | Kargo promotes staging automatically and production on approval; every promotion is a Git commit |
| Cluster reconstructability SLO | `status:complete` | A monthly drill measures time-to-Ready against a one-hour SLO |
| `DataPlane` in `composite` mode | `status:in-progress` | The `Cluster` XR it authors works; the controller driving it end to end is not exercised yet |
| Karmada placement | `status:in-progress` | Every plane registers as a Karmada member; placement rules in the environments repo are still to come |

### Phase 3 — Developer experience & ecosystem

`status:complete` From platform to product.

| Capability | Status | What it covers |
|---|---|---|
| Paved-road CI | `status:complete` | Tekton `app-ci`: webhook → build → scan → cosign sign → Harbor → GitOps write-back |
| Preview environments | `status:complete` | Every pull request labelled `preview` gets its own namespace, image and hostname, pruned on close |
| Supply-chain policies | `status:complete` | Signature verification, no `:latest` and a registry allowlist, as identical Audit and Enforce packs |
| Platform auth CLI | `status:complete` | `adhar auth login/logout/token/whoami`; Keycloak groups map to Kubernetes RBAC |
| Both bring-up profiles | `status:complete` | Kind gets the local development core; cloud and on-prem get the full catalogue |
| Golden paths | `status:complete` | Service, frontend, data-pipeline and ML skeletons, scaffolded from the Console to a signed, running workload |
| Functions | `status:complete` | The `Function` API on Knative: HTTP, cron, CloudEvent and Dapr topic triggers, five templates, Kargo delivery |
| [Batch jobs](/docs/core-concepts/batch) | `status:in-progress` | The `BatchJob` API for Spring Batch: scheduled and on-demand runs, holds, the Console page, alerts and policies. The batch template and an `adhar batch` command are still to come |
| Volcano batch scheduling | `status:planned` | Queues, gang scheduling and partitioned jobs with workers. Volcano ships as an opt-in package, but BatchJobs do not use it yet |
| Team workflows | `status:planned` | Argo Workflows runs the platform's own maintenance tasks today. Workflows that teams write and run themselves come later |
| Scorecards | `status:complete` | Every service graded 0–100 from live signals, shown in the Console |
| Package marketplace | `status:complete` | Every package carries a validated contract; the Console switches packages on and off |
| Tenant isolation | `status:complete` | Each team gets its own namespace, RBAC and default-deny ingress |
| Policy packs | `status:complete` | Opt-in CIS- and SOC2-oriented Kyverno profiles, in Audit mode |
| Adhar AI | `status:complete` | MCP tools across seven domains, staged autonomy, and writes that only open Gitea pull requests |
| AI gateway | `status:complete` | agentgateway: one OpenAI-compatible endpoint and one MCP endpoint, with identity, guardrails and budgets |
| Grounding | `status:complete` | A pgvector knowledge base over the docs, the package catalogue and live cluster state |
| Self-hosted inference | `status:complete` | `llm-d` routing to vLLM, so `local/*` models are served from inside the cluster |
| Kubernetes API server OIDC | `status:in-progress` | Works on Kind; on cloud clusters it is a day-2 step you apply once Keycloak is serving |
| API server OIDC at provisioning (`oidcAuth`) | `status:blocked` | The API server cannot trust a Keycloak that is not serving yet, so `oidcAuth: "true"` in `clusterConfig` is rejected. Use the day-2 step |
| GPU inference (`vllm-gpu`) | `status:in-progress` | Needs a run on real GPU nodes |
| Function `bucket` triggers | `status:planned` | The API accepts them today but reports them as unsupported |
| Durable CloudEvent delivery for Functions | `status:planned` | Today's broker is in-memory, so events in flight are lost on a restart |

### Phase 4 — Data & intelligence

`status:complete` The lakehouse and ML layer on top of the platform. RustFS is the primary S3 store; MinIO is disabled in every profile and lakeFS is removed.

| Capability | Status | What it covers |
|---|---|---|
| RustFS with S3 Tables | `status:complete` | An Iceberg REST catalog inside the object store, so there is no separate catalog service to run |
| One catalog, two engines | `status:complete` | Trino and PyIceberg read and write the **same** Iceberg tables |
| Data golden path | `status:complete` | The Dagster skeleton writes to the lakehouse with dbt-trino models |
| Table maintenance | `status:complete` | A nightly operation runs maintenance on every table |
| ML workflow | `status:complete` | MLflow tracks runs and registers models, with artifacts in RustFS |
| Governance | `status:complete` | OpenMetadata ingests the lakehouse through Trino every day |
| GPU node pools in `Cluster` | `status:in-progress` | Built, but not run on accelerator capacity yet |

### Phase 5 — Enterprise readiness & scale

`status:in-progress` Use cases that turn adopters into references. Most of the unfinished work is here.

| Capability | Status | What is still missing |
|---|---|---|
| Chaos engineering (LitmusChaos) | `status:complete` | — |
| Delivery chain (CI → canary → promotion) | `status:complete` | — |
| Fleet upgrades (`adhar fleet`) | `status:in-progress` | A run against a real multi-cluster fleet |
| Multi-tenancy hardening (quotas + vcluster) | `status:in-progress` | A vcluster provisioned through the composition, and the quota webhook exercised against a real over-allocation |
| Cost governance | `status:in-progress` | Per-team showback reports in the Console and a budgets UI. The cost rules themselves work |
| Compliance evidence (`adhar compliance export`) | `status:in-progress` | A scheduled export to object storage, and mapping findings to CIS/SOC2 control ids |
| Identity federation | `status:in-progress` | SCIM-style group sync, and federation against a real IdP |
| Hostile-tenant isolation (Kamaji) | `status:planned` | The Kamaji operator ships as a package; hosted tenant control planes with dedicated node pools are not built |
| Air-gapped installation | `status:planned` | An image bundle, a private Sigstore and an offline chart pipeline as an install mode |

## Providers

Every raw-compute provider uses one shared kubeadm lifecycle: node prep, join, drain, scale plan, cloud-controller-manager and CSI. A provider is complete only after a real bring-up on that cloud.

| Provider | Status | Notes |
|---|---|---|
| Kind (local) | `status:complete` | `make e2e` runs a full `adhar up` → checks → `adhar down` cycle on every push |
| DigitalOcean | `status:complete` | Droplets with kubeadm, and DOKS through a `Cluster` |
| GCP | `status:complete` | GCE with kubeadm, a real load balancer, node autoscaling and clean teardown |
| AWS | `status:in-progress` | Built; config validation and `--dry-run` pass. Not yet brought up on this cloud |
| Azure | `status:in-progress` | Built; config validation and `--dry-run` pass. Not yet brought up on this cloud |
| Civo | `status:in-progress` | Built; config validation and `--dry-run` pass. Not yet brought up on this cloud |
| Custom / on-prem | `status:in-progress` | The same kubeadm flow over SSH against machines you own. Not yet brought up end to end |

An in-progress provider runs the same code path as the complete ones. Still, treat your first run on that cloud as a bring-up. Check the configuration and plan first; this provisions nothing:

```bash
adhar config create --provider aws --region us-east-1 --name aws.yaml
adhar config validate aws.yaml
adhar up -f aws.yaml --env dev --dry-run      # validates and prints the plan
```

See [Providers Overview](/docs/providers/overview) for what each provider needs.

## Try the in-progress pieces

Most in-progress items are usable today. Each has a safe first step.

```bash
# Fleet upgrades: plan the canary waves without touching anything
adhar fleet list
adhar fleet drift
adhar fleet upgrade --to-version v1.37.2 --canary 1 --dry-run

# Compliance evidence: the auditor artifact, from PolicyReports
adhar compliance --failures-only
adhar compliance export -o posture.md

# Cost governance: spend per namespace, from the recording rules
adhar cost
adhar cost breakdown
```

> **Note:** `--rollback-on-failure` is off by default. Add it to a real `adhar fleet upgrade` run.

**Identity federation** is driven by a labelled ConfigMap. The Keycloak config Job turns any ConfigMap labelled `adhar.io/keycloak-idp=true` into a realm identity provider. The shipped examples (Okta, Entra, SAML) are disabled.

## Check what your build has

The roadmap describes the project. Your platform is one build of it. These commands show what is installed and healthy on yours:

```bash
adhar version                       # the release you are running
adhar stack list                    # every package, declared versus live
adhar stack status                  # how converged the platform is
adhar get dataplanes                # Phase 2: registered workload clusters
adhar ai status                     # Phase 3: what of the AI layer is installed and keyed
```

## Commitments that constrain the roadmap

The project holds itself to these rules.

- **No breaking changes without an ADR** and a documented migration path.
- **Local–production parity.** Nothing lands in a larger topology that cannot be exercised, scaled down, on a laptop.
- **Every feature ships with docs.** The docs set is part of the definition of done.
- **APIs graduate deliberately.** An API moves from `v1alpha1` to `v1beta1` only once the controllers run in-cluster and are covered by end-to-end tests.
- **Provider parity is measured, not assumed.** A provider is complete only after a bring-up on that cloud.
- **Local engines are a CI matrix.** The e2e bootstrap runs on Docker *and* Podman on every push. Only the Docker run gates the build; the Podman run is reported but allowed to fail.
- **A green Application is not a working feature.** An item is checked where its data is read, with a query that must return the data.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| A feature from this page is missing on your cluster | It ships disabled in your profile, or your build predates it | `adhar stack list`, then `adhar stack enable <pkg>` and `adhar upgrade` |
| A cloud provider fails on first use | It is still in progress | Treat it as a bring-up; start with `--dry-run` and read the provider page |
| You planned around HA control planes | HA mode covers platform components, not multi-master control planes | Use `clusterMode: managed` if you need a provider-run HA control plane |
| You expected pod-to-pod mutual authentication | SPIFFE/SPIRE is deliberately absent | Network policy plus application-level mTLS |
| This page and the repository disagree | This page is a summary | Trust the repository |

## Get involved

Adhar is open source (Apache 2.0). The roadmap responds to real adoption stories faster than to feature requests, so the most useful thing you can bring is a use case.

- **[GitHub Issues](https://github.com/adhar-io/adhar/issues)** — bugs and feature requests. Thumbs-up an existing issue, or open one with the `roadmap` label.
- **[GitHub Discussions](https://github.com/adhar-io/adhar/discussions)** — ideas and design conversations.
- **Architecture Decision Records** — propose a design as an ADR in `docs/adr/` in the repository.
- **[Slack](https://join.slack.com/t/adhar-io/shared_invite/zt-4e93jrspf-HpEo6FRHwi1LA05TEJUCVg)** — real-time community.

## Next steps

- [Providers Overview](/docs/providers/overview) — what each provider needs and supports.
- [Architecture](/docs/core-concepts/architecture) — the target design the roadmap converges on.
- [Production](/docs/operations/production) — what is ready to run today.
