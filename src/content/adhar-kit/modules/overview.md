---
title: "Modules Overview"
section: "Modules"
order: 1
path: "/adhar-kit/modules/overview"
---

# Modules Overview

Adhar Kit ships **29 Maven modules: 27 production modules plus `adhar-kit-bom` and `adhar-kit-parent`.** They are not a stack you adopt whole. Every module is a separate artifact under `com.adhar.kit`, the dependency edges between them are deliberately sparse, and this page is the map you use to take only what you need.

## At a glance

| | |
|---|---|
| Coordinates | `com.adhar.kit:<artifactId>:0.1.0` |
| Version management | Import `adhar-kit-bom`, then declare modules without versions |
| Runtime toggle | `adhar.kit.modules.<id>` — 22 gated ids |
| Public API per module | One `*Facade` class; everything else is internal |
| Federated API | `AdharFacade` in `adhar-kit-starter` |
| Shared base | `adhar-kit-commons` — required by 20 of the 27 production modules |

## Core foundation

The modules most services start from. All of them are enabled by default when you use the starter.

| Module | artifactId | What it provides |
|---|---|---|
| [Commons](/adhar-kit/modules/commons) | `adhar-kit-commons` | DDD annotations, base classes, CloudEvents, idempotency, tenant/correlation context |
| [Core](/adhar-kit/modules/core) | `adhar-kit-core` | Patterns and utilities: Specification, Result, retry/backoff, async, Snowflake IDs |
| [Config](/adhar-kit/modules/config) | `adhar-kit-config` | Multi-source configuration, dynamic refresh, AES/GCM encryption |
| [Logging](/adhar-kit/modules/logging) | `adhar-kit-logging` | Structured JSON logging, MDC, sensitive-data masking, 11 annotations |
| [Metrics](/adhar-kit/modules/metrics) | `adhar-kit-metrics` | Micrometer metrics, SLO/error budgets, Prometheus/OTel export |
| [Tracing](/adhar-kit/modules/tracing) | `adhar-kit-tracing` | OpenTelemetry tracing, baggage, trace/log correlation |
| [Cache](/adhar-kit/modules/cache) | `adhar-kit-cache` | Caffeine caching, declarative annotations, statistics |
| [Resilience](/adhar-kit/modules/resilience) | `adhar-kit-resilience` | Resilience4j: circuit breaker, retry, rate limiter, bulkhead, time limiter |
| [Health](/adhar-kit/modules/health) | `adhar-kit-health` | Health checks, readiness gate, Kubernetes probes |
| [Persistence](/adhar-kit/modules/persistence) | `adhar-kit-persistence` | JPA, multi-tenancy, auditing, soft delete, transactional outbox |

## Integration and communication

How the service talks to everything outside its own process.

| Module | artifactId | What it provides |
|---|---|---|
| [Messaging](/adhar-kit/modules/messaging) | `adhar-kit-messaging` | Kafka and RabbitMQ with CloudEvents, pub/sub, DLQ, retry |
| [gRPC](/adhar-kit/modules/grpc) | `adhar-kit-grpc` | gRPC server/client, TLS/mTLS, interceptors, health/reflection |
| [GraphQL](/adhar-kit/modules/graphql) | `adhar-kit-graphql` | Schema registry, Relay pagination, DataLoader, complexity limits |
| [Notification](/adhar-kit/modules/notification) | `adhar-kit-notification` | Multi-channel: email, webhook, in-app, SMS; templates and retry |
| — | `adhar-kit-docs` | OpenAPI 3.0 / Swagger UI generation, reached via `adhar.getApiDocs()` |

## Enterprise and advanced

Off by default. Turn one on when you need it.

| Module | artifactId | What it provides |
|---|---|---|
| [Security](/adhar-kit/modules/security) | `adhar-kit-security` | OAuth2/OIDC, JWT, RBAC, CORS/CSRF, rate limiting, audit |
| [Event Sourcing](/adhar-kit/modules/event-sourcing) | `adhar-kit-event-sourcing` | Event store, CQRS, snapshots, projections, domain event bus |
| [Analytics](/adhar-kit/modules/analytics) | `adhar-kit-analytics` | PostHog analytics, feature flags, A/B testing |
| [Batch](/adhar-kit/modules/batch) | `adhar-kit-batch` | Spring Batch jobs, scheduling, partitioning |
| [AI](/adhar-kit/modules/ai) | `adhar-kit-ai` | Multi-provider LLM: chat, embeddings, RAG, function calling |
| [Dapr](/adhar-kit/modules/dapr) | `adhar-kit-dapr` | Dapr building blocks: state, pub/sub, service invocation |
| [Kubernetes](/adhar-kit/modules/kubernetes) | `adhar-kit-kubernetes` | Fabric8 integration, leader election, HPA, service discovery |
| [Perf Profiler](/adhar-kit/modules/perf-profiler) | `adhar-kit-perf-profiler` | Method profiling, hotspot and memory analysis |

> Security is a special case: it is **enabled by default** despite sitting in this group, because leaving authorization off by default would be the wrong failure mode.

## Tooling and build

| Module | artifactId | What it provides |
|---|---|---|
| [Maven Plugin](/adhar-kit/modules/maven-plugin) | `adhar-kit-maven-plugin` | Versioning, release, code generation, validation |
| — | `adhar-kit-starter` | `AdharFacade`, all accessors, 40+ shortcuts, the five framework adapters |
| — | `adhar-kit-test-commons` | TestContainers helpers (Postgres, Redis, Kafka, RabbitMQ, Vault…) |
| — | `adhar-kit-rewrite` | OpenRewrite recipes, including cross-framework migration |
| — | `adhar-kit-bom` / `adhar-kit-parent` | Dependency management and build configuration |

## How the modules depend on each other

This is the part that decides how small a dependency set you can get away with. The edges are few and they point almost entirely at two artifacts.

```text
  ── required edge      ┄┄ optional edge (<optional>true</optional>)

   ┌──────────────────────────────────────────────────────────┐
   │  Standalone — no dependency on any other kit module:     │
   │  adhar-kit-core    adhar-kit-docs    adhar-kit-grpc      │
   └──────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────┐
   │                    adhar-kit-commons                     │
   │  framework detection · AdharCloudEvent · DDD annotations │
   │  tenant & correlation context · idempotency              │
   └───────────────────────────▲──────────────────────────────┘
                               │ required by 20 modules
   ┌───────────────────────────┴──────────────────────────────┐
   │  logging   metrics   cache    config    health   batch   │
   │  messaging persistence  notification    graphql  ai      │
   │  analytics event-sourcing  dapr  resilience  rewrite     │
   │  perf-profiler  maven-plugin  test-commons  starter      │
   │                                                          │
   │  tracing ┄┄ kubernetes ┄┄ security   (optional edge)     │
   └──────────────────────────────────────────────────────────┘

   Sibling edges, all optional:
     resilience   ┄┄> metrics
     analytics    ┄┄> persistence, messaging
     cache, config, messaging, notification, persistence,
     event-sourcing, security   ┄┄> dapr
```

Three rules follow, and they are worth internalising.

- **`adhar-kit-commons` is the only real hub.** Twenty modules require it; three (tracing, kubernetes, security) treat it as optional; three (core, docs, grpc) do not use it at all. Nothing else in the kit is a hub.
- **Every sibling edge is optional.** `resilience` can publish its own metrics if `adhar-kit-metrics` is present and works without it. Seven modules can route through Dapr if `adhar-kit-dapr` is present and fall back to their direct implementation otherwise. Maven never pulls an optional dependency transitively, so these edges cost you nothing unless you opt in.
- **`adhar-kit-starter` is the one heavyweight.** It requires all 24 production modules the facade federates. That is the price of `AdharFacade`, and it is why picking modules individually is a real option rather than a token one.

## Picking only what you need

Import the BOM once, then add modules. Start from one of these, not from the full list.

| Goal | Modules to declare |
|---|---|
| Observability sidecar | `commons`, `logging`, `metrics`, `tracing` |
| Resilient HTTP client layer | `commons`, `resilience`, `metrics` (optional, for circuit-breaker metrics) |
| CRUD service with a database | `commons`, `core`, `persistence`, `health`, `logging` |
| Event-driven service | `commons`, `messaging`, `event-sourcing`, `persistence` (outbox) |
| Everything, one dependency | `starter` |

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.adhar.kit</groupId>
            <artifactId>adhar-kit-bom</artifactId>
            <version>0.1.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>com.adhar.kit</groupId>
        <artifactId>adhar-kit-commons</artifactId>
    </dependency>
    <dependency>
        <groupId>com.adhar.kit</groupId>
        <artifactId>adhar-kit-metrics</artifactId>
    </dependency>
</dependencies>
```

Without the starter you use each module's own facade directly — `MetricsFacade.getInstance()`, `CacheFacade.getCache("users")` — and there is no `AdharFacade`, no unified shortcuts and no `/actuator/adhar` endpoint. That is the trade.

## Runtime gating versus build-time selection

The two are independent, and mixing them up causes confusion.

**Build time** decides what is on the classpath. **Runtime** decides what is initialized: `adhar.kit.modules.<id>` gates 22 module ids, sub-facades are constructed lazily on first access, and a disabled module throws `IllegalStateException` naming the property to change. Eleven modules are on by default (logging, metrics, tracing, resilience, security, persistence, cache, messaging, config, health, docs); eleven are off (ai, analytics, kubernetes, dapr, grpc, graphql, batch, notification, event-sourcing, perf-profiler, rewrite).

So a starter-based service with `adhar.kit.modules.ai=false` still ships the AI jar — it never constructs `AiFacade`. If jar size matters, select at build time; if startup cost and blast radius matter, gate at runtime; most services do both.

> Some advanced modules mark parts of their surface as in progress — certain messaging annotations, Dapr locks and actors, concrete AI providers. Each module page notes its status where relevant.

## Next steps

- [Concepts](/adhar-kit/concepts) — the facade, gating and configuration model every module page assumes.
- [Quick Start](/adhar-kit/quickstart) — the BOM, starter and parent options with a working example.
- [Framework Support](/adhar-kit/frameworks) — how modules behave on Quarkus, Micronaut, Helidon and Vert.x.
- [Building & Contributing](/adhar-kit/build) — the conventions a module must follow, and how to add one.
