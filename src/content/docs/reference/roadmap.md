---
title: "Roadmap"
section: "Reference"
order: 3
path: "/docs/reference/roadmap"
---

# Roadmap

Adhar is in active development (v0.1.x) and evolves in phases. Each phase builds on the last; local–production parity means capabilities land scaled-down on a laptop before they scale up in production. **This page is a summary of direction, not a commitment** — sequencing follows community needs, and nothing here is a dated promise.

> The authoritative, continuously-updated roadmap lives in the repository at [`docs/ROADMAP.md`](https://github.com/adhar-io/adhar/blob/main/docs/ROADMAP.md). Work currently in flight and what each open item is blocked on is tracked in `docs/OPEN-ITEMS.md`. When this page and the repository disagree, the repository is correct.

## How to read this

Adhar uses a deliberately strict definition of "done", because a green ArgoCD Application is not a working feature. The project's own record of this is blunt: repeatedly, something was reported `Healthy` or `Synced` while the capability behind it was dead. So status here means what was *exercised*, not what was written.

| Status | What it means |
|---|---|
| **Shipped** | Implemented and exercised against a real cluster. The capability was driven end to end, not inspected in a manifest |
| **In progress** | Implemented, but still needs live verification or hardening before it is claimed |
| **Blocked** | Built, and waiting on a decision or an external dependency |
| **Planned** | Designed, not yet built. No date attached |

Two rules govern promotion between them:

- **A status only advances after a live run.** Phase items graduate once a real cloud provisioning or multi-cluster exercise has happened — not when the code merges.
- **Verification means exercising the capability.** A real completion, a real tool call, a pipeline that actually publishes. Reading a status field does not count.

## Phases

| Phase | Focus | Status |
|---|---|---|
| **0 — Local excellence** | One-command local platform on Kind; the curated core; GitOps + Crossplane control plane | Shipped — exercised continuously by CI (`make e2e`) |
| **1 — Single-cluster production** | Self-managed kubeadm clusters, HA mode, production edge (DNS/TLS/LB), SSO, backup/restore, `adhar upgrade`, node autoscaling | Shipped — live-verified on DigitalOcean |
| **2 — Multi-cluster platform** | Control-plane / data-plane separation, the `DataPlane` API, workload clusters via GitOps, Cilium Cluster Mesh, hub-and-spoke observability | Shipped — live-verified |
| **3 — Developer experience & ecosystem** | Paved-road CI, preview environments, supply-chain enforcement, golden paths, scorecards, the auth CLI, policy packs, tenant isolation, the agentic AI layer | Shipped — live-verified |
| **4 — Data & intelligence** | Lakehouse on an Iceberg REST catalog, Trino, table maintenance, ML workflows and model registry, metadata governance | Shipped — live-verified |
| **5 — Enterprise readiness & scale** | Fleet upgrades, hierarchical quotas, cost governance, compliance export, identity federation, hostile-tenant isolation, air-gapped install | Mixed — see below |

## Themes

Rather than reading the phases in order, it is usually more useful to read the roadmap by theme — the phases are chronology, the themes are what you are actually waiting for.

### Infrastructure and providers

The shared kubeadm lifecycle (node prep, join, drain, scale plan, cloud-controller-manager, CSI) is one implementation that every raw-compute provider uses. Provider parity is therefore *measured*, not assumed: a row turns green only after a real bring-up on that cloud.

| Provider | Status |
|---|---|
| Kind (local) | Shipped — exercised continuously by CI |
| DigitalOcean | Shipped — live-verified end to end, including DOKS via `CompositeCluster` |
| GCP | Shipped — live-verified, full production profile and clean teardown |
| AWS | Built, render-verified only — no live run yet |
| Azure | Built, render-verified only — no live run yet |
| Civo | Built, render-verified only — no live run yet |
| Custom / on-prem | Render-verified — the same kubeadm flow over SSH against machines you own |

See [Cloud Providers](/docs/providers/overview) for what each status means in practice before you plan against it.

### Developer experience

Paved-road CI, per-PR preview environments, the four golden-path skeletons, production-readiness scorecards and the package marketplace contract are all shipped and live-verified. Ongoing work here is depth in the Console rather than new primitives.

### Security and supply chain

Signature verification, no-`:latest` and the registry allowlist ship as two identical policy packs — audit everywhere, enforce as a one-line flip — so audit findings predict exactly what enforcement would block. Enforcement is live-verified in the production profile. See [Security Best Practices](/docs/security/security-best-practices).

### Data and intelligence

The lakehouse is founded on an Iceberg REST catalog served by the platform's own object store, with Trino and PyIceberg reading and writing the same tables, nightly table maintenance, an MLflow model registry and metadata ingestion. All live-verified.

### Enterprise scale — the current frontier

This is where most of the unfinished work sits, and it is worth being specific about what "unfinished" means for each item.

| Item | State | What is still missing |
|---|---|---|
| Fleet upgrades (`adhar fleet list/drift/upgrade`) | In progress | A live multi-cluster run |
| Hierarchical quotas + vcluster self-service | In progress | A vcluster provisioned through the composition, and the quota webhook exercised against a live over-allocation |
| Cost governance | In progress — rules live | Per-team showback reports in the Console and a budgets UI |
| Compliance evidence (`adhar compliance export`) | In progress | A scheduled export to object storage, and mapping findings to CIS/SOC2 control ids |
| Identity federation (Keycloak IdP reconciliation) | In progress | SCIM-style group sync, and a live federation against a real IdP |
| Self-hosted GPU inference | In progress | A run of the GPU profile on real accelerator capacity |
| Hostile-tenant isolation (Kamaji hosted control planes) | Planned | Designed, not built |
| Air-gapped installation | Planned | Designed, not built |

## Commitments that constrain the roadmap

These are the invariants the project holds itself to, and they explain why some things take longer than they might.

- **No breaking changes without an ADR** and a documented migration path.
- **Local–production parity is sacred.** Nothing lands in a larger topology that cannot be exercised, scaled down, on a laptop.
- **Every feature ships with docs.** The docs set is part of the definition of done.
- **APIs graduate deliberately.** `v1alpha1` to `v1beta1` only once the controllers run in-cluster and are covered by end-to-end tests.
- **Local engines are a CI matrix.** The e2e bootstrap runs on Docker *and* Podman on every push; a change that breaks one engine fails the build.

## Get involved

Adhar is open source (Apache 2.0) and shaped in the open. The roadmap responds to real adoption stories faster than to feature requests, so the most effective thing you can bring is a use case.

- **[GitHub Issues](https://github.com/adhar-io/adhar/issues)** — bugs and feature requests. Thumbs-up an existing issue, or open one with the `roadmap` label
- **[GitHub Discussions](https://github.com/adhar-io/adhar/discussions)** — ideas and design conversations
- **Architecture Decision Records** — propose a design as an ADR in `docs/adr/` in the repository
- **[Slack](https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww)** — real-time community

## See also

- [Providers Overview](/docs/providers/overview) — what each verification status means for your cloud
- [Architecture](/docs/core-concepts/architecture) — the target design the roadmap converges on
- [Production](/docs/operations/production) — what is ready to run today
