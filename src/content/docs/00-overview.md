---
title: "Overview"
section: "Getting Started"
order: 1
path: "/docs"
---

# Overview

**Adhar** is an open **Internal Developer Platform (IDP)**. One command — `adhar up` — provisions a complete, production-grade platform of **100+ open-source packages** on your laptop or on any of six clouds. The name comes from the Sanskrit **अधार (Adhāra) — "foundation."**

This page is the map. It explains the problem Adhar exists to solve, the mental model you need before the rest of the documentation makes sense, and exactly which page to open next depending on why you are here.

> **Active development.** Adhar is at v0.1.x. The local and single-cluster production paths are live-verified end to end; validate cloud specifics in your own environment.

## The problem: developer freedom versus governance

Every engineering organisation past a handful of teams hits the same fork in the road, and both directions are bad.

| You choose | You get | It costs you |
|---|---|---|
| **Developer freedom** | Teams ship fast, pick their own tools, own their stack | Twelve ways to deploy, undiscoverable services, unpatched images, no shared observability, an audit you cannot answer |
| **Central governance** | Consistency, compliance, a single pane of glass | A ticket queue between an engineer and a database, platform teams as a bottleneck, shadow IT routing around them |

The trade-off is only real when standards are enforced *after* the fact — through review gates, checklists, and people saying no. Adhar's answer is **standardization as enablement**: a paved road where security, compliance, and observability are properties of the road itself. Taking the paved road is the fastest way to ship, so nobody has to be forced onto it.

Concretely, that means a developer asks for a PostgreSQL database by applying a small Kubernetes object in their own namespace, and gets a quota-bounded, backed-up, credential-rotated instance with its connection details in a Secret — without a ticket, and without the platform team having approved that specific request.

## At a glance

| | |
|---|---|
| **What it is** | An open-source Internal Developer Platform you run yourself |
| **How you install it** | `adhar up` — one command, roughly ten minutes locally |
| **Built on** | Kubernetes, Cilium, ArgoCD, Gitea, Crossplane, Keycloak |
| **What it ships** | 100+ curated open-source packages, delivered by GitOps |
| **Where it runs** | Kind (local), AWS, Azure, GCP, DigitalOcean, Civo, your own hosts |
| **How you change it** | A Git commit, then `adhar upgrade` |
| **Licence** | Apache 2.0 throughout — no proprietary tier, no managed-only features |

## How it works, in one paragraph

`adhar up` builds the platform in two moves. First it bootstraps a minimal foundation in an order that cannot be rearranged — **Cilium** for networking and the Gateway API, then **ArgoCD** to reconcile, then **Gitea** to hold the truth — and seeds that in-cluster Git with the platform's own definition. Then it steps out of the way: a single ArgoCD **ApplicationSet** reads the repository and deploys every enabled package, while a **Crossplane v2** control plane turns databases, caches, and buckets into ordinary namespaced Kubernetes resources that a developer can request without a ticket. After that handoff the platform maintains itself — ArgoCD reconciles the live cluster against Git roughly every minute, so a commit is the only thing that can change it, and the same model runs unchanged on a laptop under Kind, on one production cluster, or on a control plane governing a fleet.

## The mental model

Two pictures are enough to read the rest of these docs. The first is the **write path** — how any change reaches the cluster, and how you watch it land. The second is the **layer stack** — how the pieces sit on top of each other.

**The write path** — one way in, one way to observe:

```diagram
write-path
```

**The layer stack** — each layer depends only on the one below it:

```diagram
layer-stack
```

Three invariants follow from that picture, and they explain most of Adhar's behaviour:

1. **Git is the only write path.** ArgoCD runs with self-heal on, so a `kubectl edit` against a managed object is reverted within about a minute. This surprises people once; after that it is the reason the cluster matches the repo.
2. **Each layer depends only on the one below it.** You can swap a cloud (L0) without touching packages (L2), and enable a package without touching the foundation (L1).
3. **Local and production are the same platform, differently sized.** Kind runs the same controllers, the same GitOps flow, and the same package model as a cloud cluster — a smaller curated set, not a different product.

See [Architecture](/docs/core-concepts/architecture) for the full design, including the two-phase bootstrap and the control-plane / data-plane split.

## What you get out of the box

| Capability | What ships |
|---|---|
| **GitOps delivery** | ArgoCD + in-cluster Gitea as the single source of truth |
| **Self-service infrastructure** | Crossplane v2 APIs — databases, caches, buckets, clusters as ordinary Kubernetes resources |
| **Identity & SSO** | Keycloak (OIDC) for every service and the Kubernetes API |
| **Secrets** | External Secrets Operator + OpenBao (Vault-compatible), never in Git |
| **Observability** | Prometheus, Loki, Tempo, Mimir, Grafana, Hubble — collected without per-service setup |
| **Secure supply chain** | Tekton and buildpacks build → Cosign signs → Harbor stores → Kyverno admits only signed images |
| **Developer portal** | Adhar Console (Backstage): catalog, golden paths, scorecards, cloud shell |
| **Any cloud** | AWS, Azure, GCP, DigitalOcean, Civo, on-prem, or local Kind |

None of it is bolted on afterwards: a package arrives already wired into identity, the Gateway, policy, and the telemetry pipeline. That wiring is the product.

## Who Adhar is for

| If you are | What changes for you |
|---|---|
| **An application developer** | You scaffold from a golden path, run `adhar dev` against the real platform, open a pull request, and the supply chain and GitOps take it to production |
| **A platform engineer** | The catalogue, its policies, and its self-service APIs are declarative files you review in Git rather than a bespoke internal tool you maintain |
| **An SRE or operator** | One observability stack, one identity provider, one promotion path, and day-2 operations (backup, rotation, drift detection) shipped as scheduled operations |
| **A technical leader evaluating** | A complete IDP you can stand up on a laptop in ten minutes, entirely Apache 2.0, with no vendor to negotiate with before you find out whether it fits |

Adhar is a good fit if you run Kubernetes and want a coherent platform rather than a shelf of tools. It is not a PaaS: you keep your clusters, your cloud account, and your data.

## Where to go next

Pick the path that matches why you are here. Each is ordered — read them in sequence.

### Evaluating Adhar (about 30 minutes)

1. [Quick Start](/docs/getting-started/quick-start) — what `adhar up` actually does, step by step
2. [Installation](/docs/getting-started/installation) — prerequisites and machine sizing for a local run
3. [Architecture](/docs/core-concepts/architecture) — the design and the principles behind it
4. [Roadmap](/docs/reference/roadmap) — what is verified today and what is next

### Shipping a service as a developer

1. [Quick Start](/docs/getting-started/quick-start) — get a platform running
2. [Your First Service](/docs/getting-started/first-service) — scaffold, build, deploy, expose
3. [Control Plane](/docs/core-concepts/control-plane) — request a database, cache, or bucket for your service
4. [Accessing the Platform](/docs/operations/accessing-the-platform) — URLs, SSO, and credentials

### Running the platform as a platform engineer

1. [Architecture](/docs/core-concepts/architecture) — layers, bootstrap, and the GitOps write path
2. [Platform Services](/docs/core-concepts/platform-services) — the catalogue, and how packages are enabled
3. [Customization](/docs/operations/customization) — change a package, add your own, extend the APIs
4. [Cloud Providers](/docs/providers/overview) — choose a target and see what is proven where

### Operating it in production

1. [Production](/docs/operations/production) — topology choice, HA sizing, hardening, backup and DR
2. [Observability](/docs/operations/observability) — the metrics, logs, traces, and cost stack
3. [Security Best Practices](/docs/security/security-best-practices) — the hardening checklist
4. [Troubleshooting](/docs/reference/troubleshooting) — failure signatures and fixes

### Background reading

- [The 6 D's Framework](/docs/core-concepts/ds-framework) — the lifecycle model the platform is organised around
- [Integrations & Ecosystem](/integrations) — the searchable catalogue of every tool Adhar builds on
- [CLI Reference](/docs/reference/cli) — every `adhar` command

## Getting help

- **Slack** — [join the community](https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww)
- **GitHub** — [issues](https://github.com/adhar-io/adhar/issues) · [discussions](https://github.com/adhar-io/adhar/discussions)
- **License** — Apache 2.0, 100% open source
