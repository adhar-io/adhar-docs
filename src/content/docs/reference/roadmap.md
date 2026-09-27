---
title: "Roadmap"
section: "Reference"
order: 3
path: "/docs/reference/roadmap"
---

# Roadmap

Adhar is in active development (v0.1.x) and evolves in phases. Each phase builds on the last; local–production parity means capabilities land scaled-down on a laptop before they scale up in production.

> This is a high-level view. The authoritative, up-to-date roadmap and phase status live in the [repository](https://github.com/adhar-io/adhar).

## Phases

| Phase | Focus | Status |
|---|---|---|
| **1 — Local excellence** | One-command local platform on Kind; the curated core; GitOps + Crossplane control plane | ✅ Verified (exercised continuously by CI) |
| **2 — Single-cluster production** | Cloud bring-up, HA foundation, edge (DNS/TLS/LB), the full 76-package production profile | ✅ Live-verified on DigitalOcean |
| **3 — Multi-cluster** | Control-plane / data-plane separation, the `DataPlane` API, fleet management, hub-and-spoke observability | ✅ Live-verified; expanding |
| **4 — Developer experience** | Golden paths, scorecards, preview environments, Console depth | 🔄 In progress |
| **5 — Data & intelligence** | Lakehouse (Iceberg/Trino), ML workflows, the agentic AI platform (agentgateway, MCP) | 🔄 In progress |
| **6 — Enterprise scale** | Broader provider verification, advanced compliance, cost governance | 🔜 Planned |

## Provider verification status

| Provider | Status |
|---|---|
| Kind (local) | ✅ Exercised continuously by CI |
| DigitalOcean | ✅ Live-verified end to end |
| GCP | ✅ Live-verified (compute path) |
| AWS | ⚙️ Render-verified |
| Azure | ⚙️ Render-verified |
| Civo | ⚙️ Render-verified |
| Custom / on-prem | ⚙️ Render-verified |

See [Cloud Providers](/docs/providers/overview) for what each status means in practice.

## Get involved

Adhar is 100% open source (Apache 2.0), shaped in the open. The best ways to influence the roadmap:

- **[GitHub Discussions](https://github.com/adhar-io/adhar/discussions)** — ideas and design conversations
- **[GitHub Issues](https://github.com/adhar-io/adhar/issues)** — bugs and feature requests
- **[Slack](https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww)** — real-time community
