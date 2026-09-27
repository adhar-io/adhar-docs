---
title: "Overview"
section: "Getting Started"
order: 1
path: "/docs"
---

# Adhar Platform Documentation

**Adhar** is an open **Internal Developer Platform (IDP)**. One command — `adhar up` — provisions a complete, production-grade platform of **91 open-source packages** on your laptop or on any of six clouds. The name comes from the Sanskrit **अधार (Adhāra) — "foundation."**

Adhar exists to end a familiar trade-off: give developers freedom and you get inconsistent, insecure sprawl; enforce governance and you get tickets and bottlenecks. Adhar's answer is **standardization as enablement** — a paved road where security, compliance, and observability are built into the road itself.

> **Active development.** Adhar is at v0.1.x. The local and single-cluster production paths are live-verified end to end; validate cloud specifics in your own environment.

## How it works, in one paragraph

`adhar up` bootstraps a strictly ordered foundation — **Cilium** (CNI + Gateway API) → **ArgoCD** → **Gitea** — then seeds in-cluster Git repositories and hands control to GitOps. A single ArgoCD **ApplicationSet** deploys every enabled package from Git, and a **Crossplane v2** control plane exposes namespaced, self-service infrastructure APIs. From that moment, every change to the platform is a reviewable Git commit. The same architecture runs on a laptop (Kind), on one production cluster, or on a control plane governing a fleet of workload clusters.

## What you get out of the box

| Capability | What ships |
|---|---|
| **GitOps delivery** | ArgoCD + in-cluster Gitea as the single source of truth |
| **Self-service infrastructure** | Crossplane v2 APIs — databases, caches, buckets, clusters as ordinary Kubernetes resources |
| **Identity & SSO** | Keycloak (OIDC) for every service and the Kubernetes API |
| **Secrets** | External Secrets Operator + OpenBao (Vault-compatible), never in Git |
| **Observability** | Prometheus, Loki, Tempo, Mimir, Grafana, Hubble — auto-instrumented |
| **Secure supply chain** | Tekton build → Trivy scan → Cosign sign → Harbor registry |
| **Developer portal** | Adhar Console (Backstage): catalog, golden paths, scorecards, cloud shell |
| **Any cloud** | AWS, Azure, GCP, DigitalOcean, Civo, on-prem, or local Kind |

## The four layers

```
Layer 3 — Developer Experience   Console · CLI · Headlamp · Hubble · Grafana
Layer 2 — Platform Services      91 GitOps packages (security, observability, delivery, data, AI)
Layer 1 — Cluster Foundation     Cilium · ArgoCD · Gitea · Crossplane control plane
Layer 0 — Infrastructure         Kind · AWS · Azure · GCP · DigitalOcean · Civo · Custom
```

Each layer depends only on the one below it and has a defined customization surface. See [Architecture](/docs/core-concepts/architecture) for the full design.

## Start here

| You want to… | Read |
|---|---|
| Install and run it locally | [Installation](/docs/getting-started/installation) → [Quick Start](/docs/getting-started/quick-start) |
| Deploy your first service | [Your First Service](/docs/getting-started/first-service) |
| Understand the design | [Architecture](/docs/core-concepts/architecture) · [Control Plane](/docs/core-concepts/control-plane) |
| Go to a cloud | [Cloud Providers](/docs/providers/overview) |
| Run it for real | [Production](/docs/operations/production) |
| Look up a command | [CLI Reference](/docs/reference/cli) |

## Getting help

- **Slack** — [join the community](https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww)
- **GitHub** — [issues](https://github.com/adhar-io/adhar/issues) · [discussions](https://github.com/adhar-io/adhar/discussions)
- **License** — Apache 2.0, 100% open source
