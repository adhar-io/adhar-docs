---
title: "Roadmap"
section: "Reference"
order: 3
path: "/docs/reference/roadmap"
---

# Roadmap

Adhar is in active development (v0.1.x) and grows in phases. This page shows what is proven, what is built but still being verified, and what is only designed. Use it to plan against the platform as it is, not as it will be.

It is for anyone deciding whether a capability is ready for them. By the end you should know which phase a feature belongs to, what its status really means, and how to try the in-progress pieces yourself.

**This page is a summary of direction, not a commitment.** The order of work follows community needs, and nothing here is a dated promise.

> The authoritative roadmap lives in the repository at [`docs/ROADMAP.md`](https://github.com/adhar-io/adhar/blob/main/docs/ROADMAP.md) and is updated continuously. `docs/OPEN-ITEMS.md` tracks work in flight and what each open item is blocked on. When this page and the repository disagree, the repository is correct.

## How to read a status

Adhar uses a deliberately strict definition of "done", because a green ArgoCD Application is not a working feature. The project's own record is blunt. Again and again, something was reported `Healthy` or `Synced` while the capability behind it was dead. So a status here means what was *exercised*, not what was written. The repository uses four:

| Status | What it means |
|---|---|
| **Implemented and exercised** | Driven end to end against a real cluster — a real completion, a real tool call, a pipeline that actually publishes |
| **Implemented, needs live verification** | The code exists and is tested where it is pure, but has not yet been exercised live, or needs hardening |
| **Built but blocked** | Waiting on a decision or an external dependency |
| **Designed, not yet built** | No code yet, and no date attached |

Two rules decide when an item moves up a status:

- **A status only advances after a live run.** Phase 1 and 2 items graduate only once a real cloud provisioning *and* a multi-cluster exercise have happened, not when the code merges.
- **Verification means exercising the capability.** Reading a status field does not count.

## Phases

Each phase builds on the topology set up by the one before it:

- Phase 0 is the laptop (T1).
- Phase 1 is a single production cluster (T2).
- Phase 2 is a management cluster with workload clusters (T3).

Everything after that runs on the T3 substrate. Because of local–production parity, each capability lands scaled-down on a laptop before it scales up.

```diagram
do-roadmap-phases
```

| Phase | Focus | Status in `docs/ROADMAP.md` |
|---|---|---|
| **0 — Local excellence** | One-command local platform on Kind; deterministic bootstrap; the GitOps package model; the Crossplane v2 control plane; standard status conditions; the `make e2e` bootstrap test | Complete |
| **1 — Single-cluster production (T2)** | Self-managed kubeadm clusters, HA mode, the production edge with real TLS, SSO everywhere, backup/restore drilled, `adhar upgrade`, node autoscaling in both directions | Verified on DigitalOcean |
| **2 — Multi-cluster platform (T3)** | Control-plane / data-plane separation, workload clusters provisioned by a `Cluster` and auto-registered with ArgoCD, the thin workload profile, hub-and-spoke observability, Cilium Cluster Mesh | Live-verified |
| **3 — Developer experience & ecosystem** | Paved-road CI, preview environments, supply-chain enforcement, both bring-up profiles, scorecards, the auth CLI, policy packs, tenant isolation, golden paths, the package marketplace, the agentic AI layer | 11 of 11 verified on DigitalOcean (2026-09-15) |
| **4 — Data & intelligence** | Lakehouse on RustFS S3 Tables (an Iceberg REST catalog inside the object store), Trino and PyIceberg on the same tables, nightly table maintenance, MLflow model registry, OpenMetadata governance | 5 of 5 verified on DigitalOcean (2026-09-15) |
| **5 — Enterprise readiness & scale** | Fleet upgrades, hierarchical quotas + vcluster self-service, cost governance, compliance export, IdP federation; Kamaji isolation and air-gapped install | Built, verifying — Kamaji isolation and air-gapped install remain designed |

Two things are deliberately missing, and you should know about them before you plan:

- **SPIFFE/SPIRE workload identity is not delivered** in Phase 2. It starved the Cilium operator and is deprecated upstream.
- **HA control planes** (multi-master) are the next step after Phase 1, not part of it. See [Production](/docs/operations/production) for what HA mode does cover.

## Themes

The phases show the order of work. The themes show what you are actually waiting for.

### Infrastructure and providers

Every raw-compute provider uses one shared kubeadm lifecycle implementation (node prep, join, drain, scale plan, cloud-controller-manager, CSI). Provider parity is therefore *measured*, not assumed. A row turns green only after a real bring-up on that cloud.

| Provider | Status |
|---|---|
| Kind (local) | Exercised continuously — `make e2e` runs a full `adhar up` → verify → `adhar down` cycle |
| DigitalOcean | Live-verified end to end (droplets + kubeadm), and DOKS via a `Cluster` |
| GCP | Live-verified — GCE + kubeadm, a real load balancer, node autoscaling, the production profile, clean teardown |
| AWS | Built, render-verified only — no live run yet |
| Azure | Built, render-verified only — no live run yet |
| Civo | Built, render-verified only — no live run yet |
| Custom / on-prem | Render-verified — the same kubeadm flow over SSH against machines you own |

"Render-verified" means provider registration, config-schema validation and `--dry-run` pass, and the code path is shared with DigitalOcean. Still, treat a first run on that cloud as a bring-up exercise. You can check the render side yourself without spending anything:

```bash
adhar config create --provider aws --region us-east-1 --name aws.yaml
adhar config validate aws.yaml
adhar up -f aws.yaml --env dev --dry-run      # validates and prints the plan; provisions nothing
```

See [Providers Overview](/docs/providers/overview) for what each status means in practice.

### Developer experience

Paved-road CI, per-PR preview environments, the golden-path skeletons, production-readiness scorecards and the package marketplace contract are all verified.

The follow-ups recorded in the repository are not platform gaps:

- the Console registering the CI webhook, so the *signed* tag lands
- a containerd restart on nodes provisioned before a node-prep change
- the next tagged release exercising the Cosign/SBOM path

**Functions** are designed, not yet built. The five function templates (Node.js, Go, Python, Java, Deno) and the `Function` manifest they generate exist. The `functions.platform.adhar.io` XRD and its composition, the Knative Serving and Eventing install, and the trigger wiring do not. The `knative` package must also stop conflicting with `tekton` before it can be enabled. See [Functions](/docs/core-concepts/functions).

Self-hosted inference is verified through the in-cluster `llm-d` → vLLM path. For the `vllm-gpu` profile, what remains is a run on real GPU nodes. The other open Phase 3 item is enabling Kubernetes API server OIDC as a day-2 step (the `oidcAuth` provisioning option was removed and is now rejected).

### Security and supply chain

Signature verification, no-`:latest` and the registry allowlist ship as two identical policy packs: `adhar-supply-chain-policies` (Audit) and `adhar-supply-chain-policies-enforce` (Enforce). Both are on in the production profile and off locally. Because the rules are identical, audit findings predict exactly what enforcement would block. In every profile, including local, the `adhar-supply-chain` package's `verify-supply-chain-images` policy rejects unsigned Harbor `library/*` images. See [Security Best Practices](/docs/security/security-best-practices).

### Data and intelligence

Object storage was rebuilt first, because everything else sits on it. RustFS is the platform's primary S3 store, MinIO is disabled in every profile, and lakeFS is removed.

On that base:

- Trino and PyIceberg read and write the **same** Iceberg tables through the RustFS REST catalog.
- Nightly maintenance runs on every table.
- MLflow registers models.
- OpenMetadata ingests the lakehouse through Trino.

### Enterprise scale — the current frontier

Most of the unfinished work is here. The table spells out what "unfinished" means for each item.

| Item | Status | What is still missing |
|---|---|---|
| Chaos engineering (LitmusChaos) | Implemented and exercised (2026-09-24) | — |
| Delivery chain end to end (CI → canary → promotion) | Implemented and exercised (2026-09-24) | — |
| Fleet upgrades (`adhar fleet list/drift/upgrade`) | Implemented, needs live verification | A live multi-cluster run |
| Multi-tenancy hardening (hierarchical quotas + vcluster) | Implemented, partly live-verified | A vcluster provisioned through the composition, and the quota webhook exercised against a live over-allocation |
| Cost governance | Implemented, rules live | Per-team showback reports in the Console and a budgets UI |
| Compliance evidence (`adhar compliance export`) | Implemented, needs live verification | A scheduled export to object storage, and mapping findings to CIS/SOC2 control ids |
| Identity federation (Keycloak IdP reconciliation) | Implemented, needs live verification | SCIM-style group sync, and a live federation against a real IdP |
| Hostile-tenant isolation (Kamaji hosted control planes) | Designed, not yet built | — |
| Air-gapped installation | Designed, not yet built | — |

Most of the in-progress items are usable today. "Needs live verification" means *you* may be the first to exercise them at scale. Each has a safe first step:

```bash
# Fleet upgrades: plan the canary waves without touching anything
adhar fleet list
adhar fleet drift
adhar fleet upgrade --to-version v1.37.2 --canary 1 --dry-run   # add --rollback-on-failure for a real run; it is off by default

# Compliance evidence: the auditor artifact, from live PolicyReports
adhar compliance --failures-only
adhar compliance export -o posture.md

# Cost governance: spend per namespace, from the recording rules
adhar cost
adhar cost breakdown
```

Identity federation is driven by a labelled ConfigMap. The Keycloak config Job turns any ConfigMap labelled `adhar.io/keycloak-idp=true` into a realm identity provider. The shipped examples (Okta, Entra, SAML) are disabled.

## Commitments that constrain the roadmap

The project holds itself to these rules. They explain why some things take longer than they might.

- **No breaking changes without an ADR** and a documented migration path.
- **Local–production parity is sacred.** Nothing lands in a larger topology that cannot be exercised, scaled down, on a laptop.
- **Every feature ships with docs.** The docs set is part of the definition of done.
- **APIs graduate deliberately.** An API moves from `v1alpha1` to `v1beta1` only once the controllers run in-cluster and are covered by end-to-end tests.
- **Provider parity is measured, not assumed.** A provider row only turns green after a bring-up on that cloud.
- **Local engines are a CI matrix.** The e2e bootstrap runs on Docker *and* Podman on every push. Today only the Docker run gates the build; the Podman run is reported but allowed to fail.
- **A green Application is not a working feature.** Verification happens at the reader, with a query that must return the data. Reading a status field does not count.

## Check what your build has

The roadmap describes the project. Your platform is one specific build of it. These commands show what is actually installed and healthy on yours:

```bash
adhar version                       # the release you are running
adhar stack list                    # every package, declared versus live
adhar stack status                  # how converged the platform is
adhar get dataplanes                # Phase 2: registered workload clusters
adhar ai status                     # Phase 3: what of the AI layer is installed and keyed
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| A feature from this page is missing on your cluster | It ships disabled in your profile, or your build predates it | `adhar stack list`, then `adhar stack enable <pkg>` and `adhar upgrade` |
| A cloud provider fails on first use | It is render-verified only, with no live run yet | Treat it as a bring-up; start with `--dry-run` and read the provider page |
| Planning around HA control planes | HA mode covers platform components, not multi-master control planes | Use `clusterMode: managed` if you need a provider-run HA control plane |
| Expecting pod-to-pod mutual authentication | SPIFFE/SPIRE is deliberately absent | Network policy plus application-level mTLS |
| This page and the repository disagree | This page is a summary | Trust `docs/ROADMAP.md` |

## Get involved

Adhar is open source (Apache 2.0) and shaped in the open. The roadmap responds to real adoption stories faster than to feature requests. So the most useful thing you can bring is a use case.

- **[GitHub Issues](https://github.com/adhar-io/adhar/issues)** — bugs and feature requests. Thumbs-up an existing issue, or open one with the `roadmap` label
- **[GitHub Discussions](https://github.com/adhar-io/adhar/discussions)** — ideas and design conversations
- **Architecture Decision Records** — propose a design as an ADR in `docs/adr/` in the repository
- **[Slack](https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww)** — real-time community

## See also

- [Providers Overview](/docs/providers/overview) — what each verification status means for your cloud
- [Architecture](/docs/core-concepts/architecture) — the target design the roadmap converges on
- [Production](/docs/operations/production) — what is ready to run today
