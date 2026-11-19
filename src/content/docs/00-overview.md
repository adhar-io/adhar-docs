---
title: "Overview"
section: "Getting Started"
order: 1
path: "/docs"
---

# Overview

**Adhar** is an open-source **Internal Developer Platform (IDP)**: a ready-made set of tools your teams use to build, ship and run software on Kubernetes. One command, `adhar up`, installs the whole platform from a catalogue of more than 100 packages. It runs on your laptop, on five public clouds, or on machines you own. The name comes from the Sanskrit **अधार (Adhāra)**, "foundation".

This page explains what Adhar is, how it works, and where to go next.

> **Active development.** Adhar is in active development and changing quickly. Try it on a non-critical environment first, and check the [Roadmap](/docs/reference/roadmap) for what is planned.

## At a glance

| | |
|---|---|
| **What it is** | An Internal Developer Platform you run yourself |
| **Install** | `adhar up`, from a single binary that carries the whole platform. A cloud install is the same command plus a config file |
| **Built on** | Kubernetes, Cilium, ArgoCD, Gitea, Crossplane, Keycloak |
| **What it ships** | A catalogue of 100+ packages, delivered by GitOps. Each *profile* turns on a subset: a small core locally, most of the catalogue in production |
| **Where it runs** | Kind (local), AWS, Azure, GCP, DigitalOcean, Civo, your own hosts |
| **How you change it** | A Git commit, then `adhar upgrade` |
| **Licence** | Apache 2.0 throughout. No proprietary tier, no managed-only features |

## The problem Adhar solves

A growing engineering organisation has to choose between two costs.

| You choose | You get | It costs you |
|---|---|---|
| **Developer freedom** | Teams ship fast and own their stack | Twelve ways to deploy, undiscoverable services, unpatched images, no shared observability, an audit you cannot answer |
| **Central governance** | Consistency and compliance | A ticket queue between an engineer and a database, a platform team that is a bottleneck, shadow IT |

The trade-off exists only when standards are enforced after the fact, through review gates and checklists. Adhar builds them into a **paved road**: a supported, ready-made way to build and run a service, with security, compliance and observability already in place. The paved road is also the fastest way to ship, so nobody has to be forced onto it.

For example, a developer who needs PostgreSQL applies a small Kubernetes object, a `Database`, in their own namespace:

```diagram
nst-self-service
```

## How it works

`adhar up` builds the platform in two stages.

```diagram
nst-bootstrap-handoff
```

1. **Bootstrap.** The CLI installs a minimal foundation in a fixed order: **Cilium** (networking and the Gateway API), **ArgoCD** (reconciliation) and **Gitea** (an in-cluster Git server). It then seeds Gitea with the platform's definitions, the *stack*, which are built into the `adhar` binary.
2. **GitOps.** One ArgoCD **ApplicationSet** reads that repository and deploys every enabled package. **Crossplane** turns databases, caches and buckets into namespaced Kubernetes resources that developers request themselves.

After the handoff, the platform maintains itself. A push to Gitea triggers a sync immediately, and ArgoCD also compares the cluster against Git every two minutes.

### The write path

Every change reaches the cluster the same way, and you observe it the same way:

```diagram
write-path
```

### The layer stack

```diagram
layer-stack
```

### Three rules that always hold

1. **Git is the only write path.** ArgoCD runs with self-heal on. If you `kubectl edit` a managed object, ArgoCD reverts it. That is why the cluster always matches the repository.
2. **Each layer depends only on the one below it.** You can swap the cloud (L0) without touching packages (L2), and enable a package without touching the foundation (L1).
3. **Local and production are the same platform, differently sized.** Kind runs the same controllers, GitOps flow and package model as a cloud cluster. The *local profile* turns on a smaller set of packages; it is not a different product.

[Architecture](/docs/core-concepts/architecture) covers the full design, including the two-phase bootstrap and the control-plane / data-plane split.

## What you get

Every capability below is on in the *production profile*, which cloud installs use. The last column shows what the *local profile* (the smaller package set used on Kind) turns on. You can enable more locally with `adhar stack enable` if your machine has the memory; `adhar stack list --enabled` shows your current set.

| Capability | What ships | On locally? |
|---|---|---|
| **GitOps delivery** | ArgoCD and in-cluster Gitea as the single source of truth | Yes |
| **Self-service infrastructure** | Crossplane APIs: databases, caches, buckets and clusters as Kubernetes resources | Yes. CloudNativePG, Valkey and RustFS back local requests |
| **Identity and SSO** | Keycloak (OIDC) for every service and the Kubernetes API | Yes |
| **Secrets** | External Secrets Operator and OpenBao, a Vault-compatible store. Secret values never go in Git | External Secrets only |
| **Observability** | Prometheus and Grafana (metrics), Loki (logs), Tempo (traces), Mimir (long-term metrics), Hubble (network flows) | Prometheus and Grafana only |
| **Promotion** | Kargo moves each signed image digest dev → test → prod; Argo Rollouts runs it | Yes |
| **Secure supply chain** | Tekton and buildpacks build, Cosign signs, Harbor stores, Kyverno rejects unsigned Harbor `library/*` images | Yes. The wider policy packs are production-only |
| **Developer portal** | Adhar Console (built on Backstage): catalogue, golden paths, cloud shell, production-readiness scorecards | Yes, without scorecards |
| **Backup and rotation** | Scheduled Velero backups (daily and weekly) and bootstrap-credential rotation | No |

Each package arrives already wired into identity, the Gateway, policy and telemetry. That wiring is the product.

## Who it is for

| If you are | What changes for you |
|---|---|
| **An application developer** | You scaffold from a *golden path* (a supported template for a new service), run `adhar dev` against the real platform, and open a pull request. The supply chain and GitOps take it to production |
| **A platform engineer** | The catalogue, its policies and its self-service APIs are declarative files you review in Git. There is no custom internal tool to maintain |
| **An SRE or operator** | One observability stack, one identity provider, one promotion path, with backups and credential rotation in the production profile |
| **A technical leader evaluating** | A complete IDP you stand up with one `adhar up`, on a laptop or your own cloud, under Apache 2.0 |

You can run Adhar two ways:

- **Self-hosted.** Adhar runs on your own clusters and in your own cloud account. You keep your infrastructure and your data.
- **[Adhar Cloud](/pricing).** The same open-source platform, run for you. You can move between Adhar Cloud and self-hosting at any time.

## Where to go next

Pick the path that matches why you are here. Each path is ordered.

| You want to | Read, in order |
|---|---|
| **Evaluate Adhar** | [Quick Start](/docs/getting-started/quick-start) → [Installation](/docs/getting-started/installation) → [Architecture](/docs/core-concepts/architecture) → [Roadmap](/docs/reference/roadmap) |
| **Ship a service** | [Quick Start](/docs/getting-started/quick-start) → [Your First Service](/docs/getting-started/first-service) → [Control Plane](/docs/core-concepts/control-plane) → [Accessing the Platform](/docs/operations/accessing-the-platform) |
| **Run the platform** | [Architecture](/docs/core-concepts/architecture) → [Platform Services](/docs/core-concepts/platform-services) → [Customization](/docs/operations/customization) → [Cloud Providers](/docs/providers/overview) |
| **Operate it in production** | [Production](/docs/operations/production) → [Observability](/docs/operations/observability) → [Security Best Practices](/docs/security/security-best-practices) → [Troubleshooting](/docs/reference/troubleshooting) |

### Task guides

Each guide walks through one task end to end, with a check after every stage.

1. [Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service) — template, `Database` request, binding, GitOps
2. [Promote Across Environments](/docs/guides/promote-across-environments) — build once, promote the digest
3. [Onboard a Team](/docs/guides/onboard-a-team) — Keycloak groups, RBAC, quotas, access
4. [Manage Secrets End to End](/docs/guides/manage-secrets) — OpenBao, External Secrets, rotation
5. [Backup and Restore](/docs/guides/backup-and-restore) — Velero, CloudNativePG, a restore drill
6. [Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet) — control plane, workload clusters, Cluster Mesh
7. [Upgrade the Platform](/docs/guides/upgrade-the-platform) — diff, converge, roll back
8. [Preview Environments per Pull Request](/docs/guides/preview-environments) — one namespace per PR
9. [Deploy a Function](/docs/guides/deploy-a-function) — a scale-to-zero function on the same delivery chain
10. [Deploy a Batch Job](/docs/guides/deploy-a-batch-job) — a scheduled Spring Batch job with a deadline and a smoke run

### Background and reference

- [The 6 D's Framework](/docs/core-concepts/ds-framework) — the lifecycle model the platform is organised around
- [Integrations & Ecosystem](/integrations) — the searchable catalogue of every tool Adhar builds on
- [CLI Reference](/docs/reference/cli) — every `adhar` command

## Getting help

- **Slack** — [join the community](https://join.slack.com/t/adhar-io/shared_invite/zt-4e93jrspf-HpEo6FRHwi1LA05TEJUCVg)
- **GitHub** — [issues](https://github.com/adhar-io/adhar/issues) · [discussions](https://github.com/adhar-io/adhar/discussions)
