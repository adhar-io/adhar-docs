---
title: "Overview"
section: "Getting Started"
order: 1
path: "/docs"
---

# Overview

**Adhar** is an open **Internal Developer Platform (IDP)**: a ready-made set of tools your teams use to build, ship and run software. One command, `adhar up`, sets up a complete, production-grade platform from a catalogue of **more than 100 packages**: established open-source projects plus Adhar's own portal, policy and governance packages. It runs on your laptop, on five public clouds, or on machines you own. The name comes from the Sanskrit **अधार (Adhāra) — "foundation."**

This page is your map. It covers three things:

- the problem Adhar solves
- the mental model you need before the rest of the docs make sense
- which page to open next, based on why you are here

> **Active development.** Adhar is at v0.1.x and changing quickly. Expect rough edges, try it on a non-critical environment first, and check the [Roadmap](/docs/reference/roadmap) for what's planned.

## The problem: developer freedom versus governance

Once an engineering organisation grows past a handful of teams, it reaches a fork in the road. Both directions have a cost.

| You choose | You get | It costs you |
|---|---|---|
| **Developer freedom** | Teams ship fast, pick their own tools, own their stack | Twelve ways to deploy, undiscoverable services, unpatched images, no shared observability, an audit you cannot answer |
| **Central governance** | Consistency, compliance, a single pane of glass | A ticket queue between an engineer and a database, platform teams as a bottleneck, shadow IT routing around them |

This trade-off only exists when standards are enforced *after* the fact: through review gates, checklists, and people saying no. Adhar's answer is **standardisation as enablement**. It gives you a *paved road* (a supported, ready-made way to build and run a service) where security, compliance and observability are built into the road itself. The paved road is also the fastest way to ship, so nobody has to be forced onto it.

Here is what that looks like in practice. A developer asks for a PostgreSQL database by applying a small Kubernetes object (a `Database`) in their own namespace. The platform builds the database, schedules its backups and writes its connection details to a Secret next to the application. There is no ticket, and the platform team does not have to approve that specific request. Quotas and policies, set once by the platform team, still apply.

## At a glance

| | |
|---|---|
| **What it is** | An open-source Internal Developer Platform you run yourself |
| **How you install it** | One `adhar up`, run from a clone of the Adhar repository. Locally it takes about ten minutes. On a cloud it is the same command plus a config file, and the provider's machine provisioning sets the pace |
| **Built on** | Kubernetes, Cilium, ArgoCD, Gitea, Crossplane, Keycloak |
| **What it ships** | A catalogue of 100+ packages, delivered by GitOps. Each profile turns on a subset: a small core locally, most of the catalogue in production. `adhar stack list --enabled` shows yours |
| **Where it runs** | Kind (local), AWS, Azure, GCP, DigitalOcean, Civo, your own hosts |
| **How you change it** | A Git commit, then `adhar upgrade` |
| **Licence** | Apache 2.0 throughout — no proprietary tier, no managed-only features |

## How it works, in one paragraph

`adhar up` builds the platform in two moves. First, it bootstraps a minimal foundation in a fixed order: **Cilium** for networking and the Gateway API, then **ArgoCD** to reconcile, then **Gitea** to hold the source of truth. It then seeds that in-cluster Git with the platform's own definition (the `platform/stack` directory of the Adhar repository). Second, it steps out of the way. A single ArgoCD **ApplicationSet** (one object that generates an ArgoCD Application per package) reads the repository and deploys every enabled package. Meanwhile, a **Crossplane v2** control plane turns databases, caches and buckets into ordinary namespaced Kubernetes resources that a developer can request without a ticket. After that handoff, the platform maintains itself. A push to Gitea triggers a sync straight away, and ArgoCD re-compares every package with Git every two minutes as a backstop. So a commit is the only lasting way to change it. The same model runs unchanged on a laptop under Kind, on one production cluster, or on a control plane that governs a fleet.

## The mental model

You need two pictures to read the rest of these docs. The first is the **write path**: how any change reaches the cluster, and how you watch it land. The second is the **layer stack**: how the pieces sit on top of each other.

**The write path** — one way in, one way to observe:

```diagram
write-path
```

**The layer stack** — each layer depends only on the one below it:

```diagram
layer-stack
```

Three rules that always hold follow from that picture. They explain most of Adhar's behaviour:

1. **Git is the only write path.** ArgoCD runs with self-heal on. So if you run `kubectl edit` against a managed object, ArgoCD soon reverts the change. This surprises people once. After that, it is the reason the cluster matches the repo.
2. **Each layer depends only on the one below it.** You can swap a cloud (L0) without touching packages (L2). You can enable a package without touching the foundation (L1).
3. **Local and production are the same platform, differently sized.** Kind runs the same controllers, the same GitOps flow, and the same package model as a cloud cluster. It turns on a smaller curated set of packages (the *local profile*), not a different product.

See [Architecture](/docs/core-concepts/architecture) for the full design, including the two-phase bootstrap and the control-plane / data-plane split.

## What you get out of the box

The table shows what each capability is built from, and whether the *local profile* (the smaller package set used on Kind) turns it on. Everything in the table is on in the *production profile*, which cloud installs use. You can turn on more locally with `adhar stack enable`, if your machine has the memory.

| Capability | What ships | On locally? |
|---|---|---|
| **GitOps delivery** | ArgoCD + in-cluster Gitea as the single source of truth | Yes |
| **Self-service infrastructure** | Crossplane v2 APIs — databases, caches, buckets, clusters as ordinary Kubernetes resources | Yes (CloudNativePG, Valkey and RustFS back the local requests) |
| **Identity & SSO** | Keycloak (OIDC) for every service and the Kubernetes API | Yes |
| **Secrets** | External Secrets Operator + OpenBao (a Vault-compatible secrets store). Secret values never go in Git | External Secrets only. OpenBao is production-only |
| **Observability** | Prometheus and Grafana for metrics. Loki (logs), Tempo (traces), Mimir (long-term metrics) and Hubble (network flows) in production. No per-service setup | Prometheus and Grafana only |
| **Secure supply chain** | Tekton and buildpacks build → Cosign signs → Harbor stores → Kyverno rejects unsigned Harbor `library/*` images | Yes. The wider audit/enforce policy packs are production-only |
| **Developer portal** | Adhar Console (built on Backstage): catalogue, golden paths, cloud shell, plus production-readiness scorecards | Yes, without scorecards |
| **Any cloud** | AWS, Azure, GCP, DigitalOcean, Civo, on-prem, or local Kind | — |

None of it is bolted on afterwards. Each package arrives already wired into identity, the Gateway, policy and the telemetry pipeline. That wiring is the product.

## Who Adhar is for

| If you are | What changes for you |
|---|---|
| **An application developer** | You scaffold from a golden path (a supported template for a new service), run `adhar dev` against the real platform, and open a pull request. The supply chain and GitOps take it to production |
| **A platform engineer** | The catalogue, its policies, and its self-service APIs are declarative files you review in Git. There is no custom internal tool to maintain |
| **An SRE or operator** | One observability stack, one identity provider, one promotion path. Scheduled Velero backups (daily and weekly) and credential rotation ship in the production profile |
| **A technical leader evaluating** | A complete IDP you stand up with one `adhar up`: on a laptop in about ten minutes, or on your cloud. Entirely Apache 2.0, with no vendor to negotiate with before you know if it fits |

Adhar is a good fit if you run Kubernetes and want one coherent platform, not a shelf of separate tools. It is not a PaaS (a hosted platform you rent). You keep your clusters, your cloud account, and your data.

## Where to go next

Pick the path that matches why you are here. Each path is ordered, so read its pages in sequence.

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

### Getting real work done — task guides

Each guide walks you through a task end to end, with a check after every stage.

1. [Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service) — template, `Database` request, binding, GitOps
2. [Promote Across Environments](/docs/guides/promote-across-environments) — build once, promote the digest
3. [Onboard a Team](/docs/guides/onboard-a-team) — Keycloak groups, RBAC, quotas, access
4. [Manage Secrets End to End](/docs/guides/manage-secrets) — OpenBao, External Secrets, rotation
5. [Backup and Restore](/docs/guides/backup-and-restore) — Velero, CloudNativePG, a real restore drill
6. [Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet) — control plane, workload clusters, Cluster Mesh
7. [Upgrade the Platform](/docs/guides/upgrade-the-platform) — diff, converge, roll back
8. [Preview Environments per Pull Request](/docs/guides/preview-environments) — one namespace per PR

### Background reading

- [The 6 D's Framework](/docs/core-concepts/ds-framework) — the lifecycle model the platform is organised around
- [Integrations & Ecosystem](/integrations) — the searchable catalogue of every tool Adhar builds on
- [CLI Reference](/docs/reference/cli) — every `adhar` command

## Getting help

- **Slack** — [join the community](https://join.slack.com/t/adhar-io/shared_invite/zt-4e93jrspf-HpEo6FRHwi1LA05TEJUCVg)
- **GitHub** — [issues](https://github.com/adhar-io/adhar/issues) · [discussions](https://github.com/adhar-io/adhar/discussions)
- **Licence** — Apache 2.0, 100% open source
