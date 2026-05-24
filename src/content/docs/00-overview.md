---
title: "Overview"
section: "Getting Started"
order: 1
path: "/docs"
---

# Adhar Documentation

> Everything you need to build, ship, and operate services on the
> **Adhar Internal Developer Platform**.

Adhar gives every team a paved road from `git push` to production — with
50+ pre-wired services and 10-minute provisioning via `adhar up`. These
docs cover the platform, its core concepts, and the operational
practices that keep it humming.

## Where to start

| Path | Best for |
|------|----------|
| 🚀 **[Installation](/docs/getting-started/installation)** | First time on the platform |
| ⚡ **[Quick start](/docs/getting-started/quick-start)** | Deploy your first service |
| 🧭 **[5 D's framework](/docs/core-concepts/5-ds-framework)** | Understand the methodology |
| 🛡️ **[Security best practices](/docs/security/security-best-practices)** | Identity, network, data |
| 🏗️ **[Architecture overview](/docs/core-concepts/architecture)** | How Adhar fits together |
| 🔭 **[Observability](/docs/operations/observability)** | Tracing, metrics, logs |

## The Adhar platform in one diagram

```text
┌─────────────────────────────────────────────────────────────┐
│  Developers                                                 │
│  ─────────                                                  │
│   adhar up · adhar deploy · adhar kit · self-service portal │
├─────────────────────────────────────────────────────────────┤
│  Platform services                                          │
│  ─────────────────                                          │
│   API gateway · Service mesh · Identity · Secrets · Config  │
│   CI/CD · Artifact registry · Feature flags · Cost control  │
├─────────────────────────────────────────────────────────────┤
│  Observability                                              │
│  ─────────────                                              │
│   OTLP traces · Prometheus metrics · Loki logs · SLOs       │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure                                             │
│  ──────────────                                             │
│   Kubernetes · Postgres · Kafka · Redis · Object storage    │
└─────────────────────────────────────────────────────────────┘
```

## Working with these docs

Every page is a markdown file under `src/content/docs/`. Drop a new
`.md` file into a folder, optionally add frontmatter, and it appears in
the sidebar — no React, no build step.

```yaml
---
title: My new page
section: Operations
order: 3
badge: beta
---
```

## Looking for something specific?

- **[Adhar Kit](/adhar-kit)** — Java microservices toolkit (Spring,
  Quarkus, Micronaut, Helidon, Vert.x)
- **[API reference](/docs/api-reference)** — REST API documentation
- **[Architecture showcase](/architecture-showcase)** — Visual platform tour
