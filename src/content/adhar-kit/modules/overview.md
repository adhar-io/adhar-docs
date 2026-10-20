---
title: "Modules Overview"
section: "Modules"
order: 1
path: "/adhar-kit/modules/overview"
---

# Modules Overview

Adhar Kit ships **29 Maven modules: 27 production modules plus `adhar-kit-bom` and `adhar-kit-parent`.** You do not have to adopt them as a whole stack. Each module is a separate artifact under `com.adhar.kit`, and the modules depend on each other as little as possible. Use this page as a map to pick only what you need.

## At a glance

| | |
|---|---|
| Coordinates | `com.adhar.kit:<artifactId>:0.1.0` |
| Version management | Import `adhar-kit-bom`, then declare modules without versions |
| Runtime toggle | `adhar.kit.modules.<id>` — 22 gated ids |
| Public API per module | One `*Facade` class; everything else is internal |
| Federated API | `AdharFacade` in `adhar-kit-starter` |
| Shared base | `adhar-kit-commons` — required by 20 of the 27 production modules |
| Standalone | `adhar-kit-core`, `adhar-kit-docs`, `adhar-kit-grpc` — zero kit dependencies |

## Core foundation

Most services start from these modules. When you use the starter, all of them are enabled by default.

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

These modules connect the service to everything outside its own process.

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

> Security is a special case. It sits in this group but is **enabled by default**, because leaving authorization off by default would be the wrong failure mode.

## Tooling and build

| Module | artifactId | What it provides |
|---|---|---|
| [Maven Plugin](/adhar-kit/modules/maven-plugin) | `adhar-kit-maven-plugin` | Versioning, release, code generation, validation |
| — | `adhar-kit-starter` | `AdharFacade`, all accessors, 40+ shortcuts, the five framework adapters |
| — | `adhar-kit-test-commons` | TestContainers helpers (Postgres, Redis, Kafka, RabbitMQ, Dapr, LocalStack, Toxiproxy…) |
| — | `adhar-kit-rewrite` | OpenRewrite recipes, including cross-framework migration |
| — | `adhar-kit-bom` / `adhar-kit-parent` | Dependency management and build configuration |

## How the modules depend on each other

This section decides how small your dependency set can be. There are few dependency edges, and almost all of them point at two artifacts.

```diagram
kit-module-dependencies
```

### The required edges, in full

Only one artifact is ever a required dependency of another: `adhar-kit-commons`.

| Relationship | Modules |
|---|---|
| **Require `commons`** (compile, non-optional) | `ai`, `analytics`, `batch`, `cache`, `config`, `dapr`, `event-sourcing`, `graphql`, `health`, `logging`, `maven-plugin`, `messaging`, `metrics`, `notification`, `perf-profiler`, `persistence`, `resilience`, `rewrite`, `starter` |
| **Require `commons` at `provided` scope** | `test-commons` |
| **Treat `commons` as optional** | `kubernetes`, `security`, `tracing` |
| **No kit dependency at all** | `core`, `docs`, `grpc` |

The three standalone modules are truly standalone. `adhar-kit-core` (patterns and utilities), `adhar-kit-docs` (OpenAPI generation) and `adhar-kit-grpc` declare no `com.adhar.kit` dependency at all. You can put any of them on a classpath with nothing else from the kit.

### The optional edges, and what `<optional>true</optional>` means for you

Every edge between sibling modules, other than the `commons` edge, is declared `<optional>true</optional>`:

| From | Optional dependency | What it enables |
|---|---|---|
| `resilience` | `metrics` | Circuit-breaker and retry meters |
| `analytics` | `persistence`, `messaging` | Event persistence; the Kafka publish path |
| `cache`, `config`, `event-sourcing`, `messaging`, `notification`, `persistence`, `security` | `dapr` | Routing that building block through a Dapr sidecar instead of a direct client |
| `kubernetes`, `security`, `tracing` | `commons` | The shared context and base types |

Maven does not resolve an optional dependency transitively. This has three practical effects:

1. **Optional edges add nothing you did not ask for.** Declaring `adhar-kit-resilience` pulls in `adhar-kit-commons` (required) but *not* `adhar-kit-metrics`. Your classpath stays as small as your own list.
2. **To turn on an integration, declare both ends yourself.** For resilience metrics, add `adhar-kit-metrics` to your own `<dependencies>`, without a version, from the BOM. The module detects it at runtime via `@ConditionalOnClass` / `@ConditionalOnBean` and wires the integration. When it is absent, the module degrades silently and correctly.
3. **The three optional-`commons` modules may need commons added by hand.** `tracing`, `kubernetes` and `security` compile against commons but do not bring it with them. If you use one on its own and get a `NoClassDefFoundError` from `com.adhar.kit.commons.*`, declare `adhar-kit-commons` explicitly. If you pair it with any module that requires commons, the problem goes away, because that module brings commons transitively.

On the other hand, `adhar-kit-commons` arrives transitively for 19 of the 27 production modules, so you almost never declare it yourself. The `provided`-scope commons in `test-commons` is also not transitive, which is correct for a test-only artifact.

### `adhar-kit-starter` is the one heavyweight

The starter requires **all 24 production modules** that the facade federates: commons, core, logging, metrics, tracing, config, persistence, cache, messaging, grpc, resilience, security, kubernetes, dapr, health, ai, analytics, docs, graphql, batch, notification, event-sourcing, perf-profiler, rewrite.

Every one is a required edge. So this single `<dependency>` resolves the entire kit and its transitive third-party stack: Spring AI, Dapr SDK, Fabric8, Resilience4j, OpenRewrite and the rest. That is the price of `AdharFacade`. It is also why picking modules one by one is a real option, not a token one.

## Picking only what you need

Import the BOM once, then add modules. Start from one of these sets, not from the full list.

| Goal | Modules to declare | Why |
|---|---|---|
| Utilities only, no Spring opinion | `core` | Standalone; no kit dependency, no auto-configuration |
| Observability sidecar | `logging`, `metrics`, `tracing` | `commons` arrives transitively via logging and metrics |
| Resilient HTTP client layer | `resilience`, plus `metrics` if you want breaker meters | The `resilience → metrics` edge is optional |
| CRUD service with a database | `core`, `persistence`, `health`, `logging` | `commons` arrives transitively |
| Event-driven service | `messaging`, `event-sourcing`, `persistence` | Persistence supplies the transactional outbox |
| API surface only | `docs`, plus `grpc` or `graphql` | `docs` and `grpc` are standalone |
| Everything, one dependency | `starter` | Resolves all 24 production modules |

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
        <artifactId>adhar-kit-metrics</artifactId>
    </dependency>
    <dependency>
        <groupId>com.adhar.kit</groupId>
        <artifactId>adhar-kit-resilience</artifactId>
    </dependency>
</dependencies>
```

To check what you actually got, run `mvn dependency:tree -Dincludes=com.adhar.kit`. Optional edges do not appear in the output. This is the quickest way to confirm whether an integration is wired.

Without the starter, you use each module's own facade directly, such as `MetricsFacade.getInstance()` or `CacheFacade.getCache("users")`. You get no `AdharFacade`, no unified shortcuts and no `/actuator/adhar` endpoint. That is the trade-off.

## Runtime gating versus build-time selection

These two are independent. Mixing them up causes confusion.

**Build time** decides what is on the classpath. **Runtime** decides what is initialized:

- `adhar.kit.modules.<id>` gates 22 module ids.
- Sub-facades are constructed lazily, on first access.
- A disabled module throws `IllegalStateException` that names the property to change.

Eleven modules are on by default (logging, metrics, tracing, resilience, security, persistence, cache, messaging, config, health, docs). Eleven are off (ai, analytics, kubernetes, dapr, grpc, graphql, batch, notification, event-sourcing, perf-profiler, rewrite). An id that is not listed at all resolves to enabled. So a newly added module is opt-out, not silently disabled.

For example, a starter-based service with `adhar.kit.modules.ai=false` still ships the AI jar, but it never constructs `AiFacade`. If jar size matters, select at build time. If startup cost and blast radius matter, gate at runtime. Most services do both.

> Some advanced modules mark parts of their surface as in progress: certain messaging annotations, Dapr actors and `queryState`, and concrete AI providers. Each module page notes its status where relevant.

## Next steps

- [Concepts](/adhar-kit/concepts) — the facade, gating and configuration model every module page assumes.
- [Quick Start](/adhar-kit/quickstart) — the BOM, starter and parent options with a working example.
- [Framework Support](/adhar-kit/frameworks) — how modules behave on Quarkus, Micronaut, Helidon and Vert.x.
- [Building & Contributing](/adhar-kit/build) — the conventions a module must follow, and how to add one.
