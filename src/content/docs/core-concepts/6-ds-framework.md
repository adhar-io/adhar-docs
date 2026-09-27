---
title: "The 6 D's Framework"
section: "Core Concepts"
order: 3
path: "/docs/core-concepts/ds-framework"
---

# The 6 D's Framework

The 6 D's are ADHAR's methodology for the full cloud-native lifecycle — a simple mental model that maps each stage of building and running software to the platform capabilities that support it. Each phase builds on the previous one, and the last phase (**Decide**) feeds back into the first (**Define**), closing the loop from strategy to delivery and back.

```text
        ┌──▶ Define ──▶ Design ──▶ Develop ──▶ Deliver ──▶ Discover ──┐
        │      (what)     (how)     (build)     (ship)     (observe)   │
        │                                                              ▼
        └──────────────────────────  Decide  ◀────────────────────────┘
                                    (learn & steer)
```

## Why a framework

Platform engineering fails when tools are adopted piecemeal and no one can see the whole path from idea to production and back. The 6 D's give teams a shared vocabulary and give the platform a way to organize its 91 packages around outcomes rather than technologies. Every capability Adhar ships maps to at least one D.

## The six phases

### 1. Define 📋 — establish clear requirements and architecture

- **Service boundaries** — microservice responsibilities and ownership
- **Data models** — schemas and data flow
- **API contracts** — service interfaces and communication patterns
- **Non-functional requirements** — performance, security, scalability

```yaml
# Example: a service definition
apiVersion: adhar.dev/v1
kind: ServiceDefinition
metadata:
  name: user-service
spec:
  domain: identity
  apis:
    - path: /users
      methods: [GET, POST, PUT, DELETE]
  database:
    type: postgresql
    schema: users
```

### 2. Design 🎨 — comprehensive system architecture

- **System architecture** — high-level component design
- **Security model** — authentication, authorization, compliance
- **Deployment strategy** — environment topology and release processes
- **Integration patterns** — external service connections

### 3. Develop 💻 — implement with best practices

- **Code generation** — scaffolding from definitions (golden paths, `adhar-kit`)
- **Local development** — a full platform on a laptop, plus `adhar dev` inner loop
- **Testing strategy** — unit, integration, and contract testing
- **Code quality** — linting, formatting, and security scanning

### 4. Deliver 🚀 — automated and reliable releases

- **GitOps workflow** — Git-based deployment automation (ArgoCD)
- **Progressive delivery** — canary and blue-green deployments (Argo Rollouts)
- **Supply chain** — build → scan → sign → registry (Tekton, Trivy, Cosign, Harbor)
- **Environment promotion** — automated dev → staging → production (Kargo)

### 5. Discover 🔍 — observe and optimize

- **Service discovery** — automatic registration and routing
- **Monitoring & alerting** — the LGTM + OpenTelemetry stack
- **Performance analytics** — application and infrastructure metrics
- **Continuous improvement** — data-driven optimization

### 6. Decide 📊 — turn insights into strategy

- **Business intelligence** — aggregate signals from Discover into clear reporting
- **Strategic planning** — data-driven roadmap and investment decisions
- **Growth analytics** — measure impact and identify opportunities
- **Close the loop** — feed decisions back into Define

## How each phase maps to the platform

| Phase | What it covers | Powered by |
|---|---|---|
| **Define** | Requirements, boundaries, API contracts | Backstage catalog, OpenAPI |
| **Design** | Architecture, security model, governance | Crossplane, Kyverno |
| **Develop** | Paved-road development | Golden paths, `adhar-kit`, Coder, `adhar dev` |
| **Deliver** | GitOps deployments, progressive delivery, rollbacks | ArgoCD, Argo Rollouts, Tekton, Harbor, Kargo |
| **Discover** | Observability, analytics, continuous improvement | Prometheus, Grafana, Loki, Tempo, OpenTelemetry |
| **Decide** | Insights → strategy and roadmap | Metabase, PostHog, Grafana |

## Benefits

- **Consistency** — a standardized approach across teams
- **Velocity** — faster development and deployment cycles
- **Quality** — best practices and governance built in
- **Observability** — complete visibility into system behavior
- **Scalability** — designed for enterprise-scale operations

## Next steps

- [Architecture](/docs/core-concepts/architecture) — the layers and lifecycle behind the framework
- [Your First Service](/docs/getting-started/first-service) — Develop → Deliver in practice
- [Observability](/docs/operations/observability) — the Discover phase in depth
- [Platform Services](/docs/core-concepts/platform-services) — the tools behind each phase
