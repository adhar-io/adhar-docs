---
title: "Architecture"
section: "Core Concepts"
order: 1
path: "/docs/core-concepts/architecture"
---

# Architecture

Adhar's goal is to be the **open foundation for platform engineering**: one command (`adhar up`) produces a complete, production-grade Internal Developer Platform built entirely from open-source components (Apache 2.0 throughout), on any of six providers or a local machine. This page is the definitive tour of how it's designed and why.

## Design principles

Everything below follows from seven principles:

1. **Management cluster first.** One cluster is the source of truth — it hosts the Git server, the GitOps engine, and the Crossplane control plane that provisions everything else, including other clusters.
2. **Bootstrap imperatively, operate declaratively.** A pure-GitOps system can't bootstrap itself (ArgoCD can't install the CNI it needs; the Git server doesn't exist yet). So `adhar up` runs a deterministic bootstrap, then hands off to GitOps forever after.
3. **The platform is data, not code.** Packages and environments are declarative YAML in Git, pre-rendered — enabling a capability is a one-line change, not a code change.
4. **Standards over frameworks.** Gateway API, OIDC, OCI, CRDs, OpenTelemetry, MCP — portable seams, no lock-in.
5. **Secure by default, permissive by exception.**
6. **Everything observable** — by construction, not per-component setup.
7. **Local–production parity is sacred.** Kind runs the same controllers, GitOps flow, and package model as production — smaller, not different.

## The four layers

Each layer depends only on the one below it, and each has a defined customization surface.

```diagram
cc-layer-stack
```

| Layer | What it is | Managed by | You customize with |
|---|---|---|---|
| **L0 — Infrastructure** | Clusters, networks, load balancers, storage | Provider interface + Crossplane | Provider config, Compositions |
| **L1 — Foundation** | CNI, Gateway, GitOps engine, Git server, control plane | AdharPlatform controller (embedded manifests) | `AdharPlatform` spec, HA flags |
| **L2 — Platform Services** | 100+ packages across eight categories | ArgoCD ApplicationSet from Gitea | Package toggles, values, custom packages |
| **L3 — Developer Experience** | Console, CLI, dashboards, golden-path templates | GitOps packages + CLI releases | Templates, Backstage plugins |

## Foundation components

Pinned at bootstrap and applied with Server-Side Apply:

| Component | Version | Role |
|---|---|---|
| Kubernetes (default) | `v1.37.0` | The cluster |
| **Cilium** | `v1.20.0` | CNI (eBPF), kube-proxy replacement, Gateway API, Hubble, network policy, node encryption |
| **ArgoCD** | `v3.5.1` | GitOps engine |
| **Gitea** | `1.27.0` | In-cluster Git server (source of truth) |
| **Crossplane** | `v2.3.1` | Namespaced self-service infrastructure APIs |

**Cilium is the entire network layer** in one component — CNI, north-south routing (Gateway API, no separate ingress controller), flow observability (Hubble), zero-trust microsegmentation, and WireGuard node-to-node encryption. It must install before anything else schedules, which is why it pins the bootstrap order.

## Two-phase bootstrap

`adhar up` is split into two phases, each gated on `AdharPlatform.status`, which makes the whole process **idempotent, all-or-retry, and resumable**.

```diagram
cc-bootstrap-phases
```

Why two phases (per ADR-0001): a pure-GitOps system can't install its own prerequisites. Phase 1 lays exactly enough foundation — network, GitOps engine, Git server, control plane — for Phase 2 to take over. Because each phase is gated on status flags, an interrupted run resumes from the pending gate: locally the controller is ephemeral (it exits on convergence), so you just re-run `adhar up`; in production the in-cluster controller self-heals continuously.

## The GitOps write path

After bootstrap, **Git is the only write path.** Three repos live in the in-cluster Gitea under the `adhar` org:

| Repository | Content | Consumed by |
|---|---|---|
| `adhar/packages` | One directory per package: pre-rendered manifests, `values.yaml`, marketplace contract | ArgoCD ApplicationSet |
| `adhar/environments` | Per-environment package sets (`local`, `development`, `staging`, `production`) | ApplicationSet generators |
| `adhar/templates` | Service scaffolding templates | CLI + Console golden paths |

```diagram
write-path
```

A single ArgoCD **ApplicationSet** deploys every package whose `enabled` flag is `"true"`. Enabling a package is a one-line Git change followed by `adhar upgrade`.

## The package model

The catalogue is **100+ packages** wired as a matching number of **ApplicationSet entries** (a few ship variants). The ApplicationSet is **selected by provider**:

- **Kind / unset** → the *local* ApplicationSet — a curated **32** enabled (a single node can't run the full catalogue).
- **Any cloud / on-prem** → the *production* ApplicationSet — **76** enabled.
- A third *workload* ApplicationSet is applied unconditionally and generates nothing until workload clusters register.

Each package is a list element with `name`, `namespace`, `category`, `manifestPath`, and an `enabled` flag. See [Platform Services](/docs/core-concepts/platform-services) for the catalogue and [Customization](/docs/operations/customization) for how to change it.

## Namespace model

Every platform package installs into **`adhar-system`** — the same namespace as the bootstrap foundation. The one exception is `buildpack` (kpack), which keeps `kpack-system` (its webhooks hardcode a Secret name). Your applications get their own namespaces. Sharing one namespace keeps the platform legible but forces two rules: rename colliding objects (or make packages mutually exclusive, e.g. `vault` ↔ `openbao`), and set `enableServiceLinks: false` on components that read config from env vars.

## Control plane vs data plane

A hard invariant: **application workloads run only on data planes; the control plane runs only fleet and platform services.**

- **Control plane** (the management cluster) — the fleet brain. Runs GitOps (ArgoCD, Gitea), IaC (Crossplane), identity (Keycloak), the secrets root (OpenBao + ESO), the observability hub (Grafana + Mimir/Loki/Tempo), the shared registry (Harbor), and fleet controllers. Hosts no application workloads.
- **Data plane** (a workload cluster) — where applications run. Runs a thin agent profile: Cilium, metrics-server, Kyverno, Alloy collectors (shipping to the hub), an ESO agent, a SPIRE agent, and a local Gateway. Its applications are delivered by the control plane's ArgoCD.

```diagram
cc-fleet-topology
```

A first-class **`DataPlane` API** (`platform.adhar.io/v1alpha1`) manages the whole lifecycle of a workload cluster — provision, register with ArgoCD, apply the thin-agent profile, join the mesh, wire telemetry — reported through status conditions (`InfraReady`, `Registered`, `AgentsReady`, `MeshJoined`, `Ready`).

## Three topologies

Promotion between them is configuration, not re-architecture.

| Topology | Shape | Status |
|---|---|---|
| **T1 — Local** | Single Kind cluster; manager runs in the CLI and exits after convergence; 32-package curated core; self-signed TLS; < 10 min | Default path |
| **T2 — Single-cluster production** | One cloud cluster runs platform and workloads; in-cluster manager; HA mode | Verified on DigitalOcean |
| **T3 — Management + workload clusters** | A control plane governs a fleet of data planes | Live-verified |

For local–production parity, the local data plane runs as a vcluster on the same Kind node — apps live inside the vcluster (data plane), platform services on the host (control plane) — so the logical split is preserved even on a laptop. Scaling to T3 is *adding* physical data planes, not changing the architecture.

## Reconciliation controllers

The foundation is run by controller-runtime reconcilers, chiefly:

| Controller | Responsibility |
|---|---|
| **AdharPlatform** | Foundation lifecycle, GitOps setup, ApplicationSet apply, health |
| **GitRepository** | Manages Git repos across Gitea/GitHub/GitLab/Bitbucket |
| **CustomPackage** | Delivers user/team workloads as ArgoCD Applications via Gitea |
| **DataPlane** | Registers and governs workload clusters |
| **Node autoscaler** | Watches Pods/Nodes and scales the worker pool |

## Day-2 is designed, not discovered

Backup, upgrade, scaling, cost, and removal are part of a capability's definition of done. The control plane ships scheduled operations (Crossplane v2 `CronOperation`/`WatchOperation`): daily backups, weekly secret rotation, config-drift detection, and a monthly reconstructability drill. See [Production](/docs/operations/production) for the runbooks.

## Extensibility

Because the platform is data, most extension is declarative:

- **Turn a package on/off** — one line in the stack, then `adhar upgrade`.
- **Change a package's values** — edit `values.yaml`, re-render, commit.
- **Add your own package** — drop a directory with a marketplace contract.
- **Add a self-service API** — write an XRD + Composition on the [Control Plane](/docs/core-concepts/control-plane).
- **Add a cloud provider** — implement the provider interface.

Full walkthroughs in [Customization](/docs/operations/customization).

## The IDP critical pillars

Every addition to Adhar is tested against eight pillars: **one command, whole platform** · **Git is the only write path** · **self-service with guardrails** · **local–production parity is sacred** · **secure by default, not by add-on** · **observable by construction** · **day-2 is designed, not discovered** · **100% open source, no lock-in.** A change that violates a pillar needs an ADR justifying the exception.

## Keep reading

- [Control Plane](/docs/core-concepts/control-plane) — the Crossplane v2 self-service engine in depth
- [The 6 D's Framework](/docs/core-concepts/ds-framework) — the delivery methodology
- [Platform Services](/docs/core-concepts/platform-services) — the full package catalogue
- [Cloud Providers](/docs/providers/overview) · [Production](/docs/operations/production)
