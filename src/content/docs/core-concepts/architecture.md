---
title: "Architecture"
section: "Core Concepts"
order: 2
path: "/docs/core-concepts/architecture"
---

# Adhar Architecture

Adhar is a **layered, modular internal developer platform**. Each layer
has a single responsibility and a stable contract with the layer above
and below it.

## Layers

### 1. Developer surface

Where every interaction begins.

- `adhar` CLI — project lifecycle, deploy, logs, run
- Self-service portal — catalogs, dashboards, on-call, RFCs
- IDE extensions — VSCode, IntelliJ, JetBrains Fleet
- ChatOps — Slack & Teams bots

### 2. Platform services

The reusable building blocks every service can pull in:

| Service | Purpose |
|---------|---------|
| **Gateway** | North-south traffic, auth, rate limiting |
| **Mesh** | East-west traffic, mTLS, retries, circuit breaking |
| **Identity** | OIDC, RBAC, SPIFFE service identities |
| **Secrets** | Vault-backed, rotation, envelope encryption |
| **Config** | Hierarchical, hot-reload, profile-aware |
| **Registry** | Container images, Helm charts, OPA bundles |
| **CI/CD** | Pipeline-as-code, signed artifacts |
| **Feature flags** | Targeted rollout, experimentation |
| **Cost control** | Budgets, anomaly detection, showback |

### 3. Observability

A single MDC-aware pipeline across every service:

- **Traces:** OpenTelemetry → Tempo / Jaeger / Honeycomb
- **Metrics:** Micrometer → Prometheus / OTLP
- **Logs:** Structured JSON → Loki / ELK
- **SLOs:** Defined in `service.yaml`, surfaced in dashboards

### 4. Infrastructure

Multi-cluster, multi-region Kubernetes with a managed data plane:

- **Compute:** EKS, GKE, AKS, or bare-metal Kubernetes
- **Data:** Postgres (primary), Kafka, Redis, S3-compatible object store
- **Networking:** Cilium CNI, Istio service mesh, Cloudflare edge
- **Storage:** EBS / persistent volumes, snapshot lifecycle

## Service manifest — `service.yaml`

Every Adhar service is described by a manifest. The platform reads it
to provision dependencies, wire observability, and configure SLOs.

```yaml
service:
  name: orders
  owner: payments-team
  language: java
  framework: spring

dependencies:
  - postgres
  - kafka
  - redis

slos:
  - name: availability
    objective: 99.9
    window: 30d

scale:
  min: 3
  max: 50
  cpu_target: 60
```

## Trust boundaries

```text
public ─► gateway ─► mesh ─► service ─► data plane
   │         │         │        │           │
   ▼         ▼         ▼        ▼           ▼
WAF      JWT/OIDC   mTLS    RBAC     Encrypted at rest
```

- **mTLS** is enforced east-west by Istio.
- **JWT** identities propagate as SPIFFE SVIDs.
- **Secrets** are never written to disk unencrypted.
- **PII** is tagged via OpenLineage and access-controlled by OPA.

## Further reading

- [5 D's framework](/docs/core-concepts/5-ds-framework)
- [Security model](/docs/security/security-best-practices)
- [Observability](/docs/operations/observability)
