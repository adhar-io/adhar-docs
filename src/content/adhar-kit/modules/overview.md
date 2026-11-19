---
title: "Modules Overview"
section: "Modules"
order: 1
path: "/adhar-kit/modules/overview"
---

# Modules Overview

Adhar Kit is 29 Maven artifacts: 27 library modules plus `adhar-kit-bom` and `adhar-kit-parent`. Each module is a separate artifact under `com.adhar.kit` with one `*Facade` class, and modules depend on each other as little as possible. Use this page to find a module, its facade gate, and what it pulls in.

## At a glance

| | |
|---|---|
| Coordinates | `com.adhar.kit:<artifactId>:0.1.0` |
| Versions | Import `adhar-kit-bom`, then declare modules without versions |
| Facade gate | `adhar.kit.modules.<id>` — 22 ids, Spring Boot only |
| Module switch | `adhar.<module>.enabled` — the module's own auto-configuration, on when absent |
| Public API | One `*Facade` per module |
| Federated API | `AdharFacade` in `adhar-kit-starter` |

In the tables below, **Gate** is the `adhar.kit.modules` id and its default; "—" means the module has no `AdharFacade` gate.

## Foundation

| Module | artifactId | Gate | What it provides |
|---|---|---|---|
| [Commons](/adhar-kit/modules/commons) | `adhar-kit-commons` | — | Framework detection, DDD annotations and base classes, `AdharCloudEvent`, idempotency, tenant and correlation context |
| [Core](/adhar-kit/modules/core) | `adhar-kit-core` | — (`getUtils()`, never gated) | Utilities: IDs including Snowflake, JSON, retry with backoff, async, `Specification`, `Result` |
| [Config](/adhar-kit/modules/config) | `adhar-kit-config` | `config` (on) | Multi-source configuration with priorities, refresh, AES/GCM encryption |
| [Logging](/adhar-kit/modules/logging) | `adhar-kit-logging` | `logging` (on) | Structured JSON logging, MDC, sensitive-data masking, logging annotations |
| [Metrics](/adhar-kit/modules/metrics) | `adhar-kit-metrics` | `metrics` (on) | Micrometer metrics, SLO tracking, Prometheus and OTLP export |
| [Tracing](/adhar-kit/modules/tracing) | `adhar-kit-tracing` | `tracing` (on) | OpenTelemetry tracing through Micrometer Tracing, baggage, trace and log correlation |
| [Cache](/adhar-kit/modules/cache) | `adhar-kit-cache` | `cache` (on) | Caffeine caching, optional Redis and Kafka sync, cache annotations |
| [Resilience](/adhar-kit/modules/resilience) | `adhar-kit-resilience` | `resilience` (on) | Resilience4j circuit breaker, retry, rate limiter, bulkhead, time limiter |
| [Health](/adhar-kit/modules/health) | `adhar-kit-health` | `health` (on) | Health checks, readiness, Kubernetes probes |
| [Persistence](/adhar-kit/modules/persistence) | `adhar-kit-persistence` | `persistence` (on) | JPA, multi-tenancy, auditing, soft delete, outbox; switches itself off with no database |

## Integration

| Module | artifactId | Gate | What it provides |
|---|---|---|---|
| [Messaging](/adhar-kit/modules/messaging) | `adhar-kit-messaging` | `messaging` (on) | Kafka and RabbitMQ publish and subscribe with CloudEvents, dead letters, outbox. Add `spring-kafka` or `spring-rabbit` yourself. |
| [gRPC](/adhar-kit/modules/grpc) | `adhar-kit-grpc` | `grpc` (off) | gRPC server and client, TLS, interceptors, health and reflection |
| [GraphQL](/adhar-kit/modules/graphql) | `adhar-kit-graphql` | `graphql` (off) | Schema registry, pagination, DataLoader, query complexity limits |
| [Notification](/adhar-kit/modules/notification) | `adhar-kit-notification` | `notification` (off) | Email, webhook, in-app and SMS channels, templates, retry |
| [API Docs](/adhar-kit/modules/docs) | `adhar-kit-docs` | `docs` (on) | springdoc OpenAPI with kit defaults, shipped specs in Swagger UI, spec diff, AsyncAPI |

## Platform and advanced

| Module | artifactId | Gate | What it provides |
|---|---|---|---|
| [Security](/adhar-kit/modules/security) | `adhar-kit-security` | `security` (on) | OAuth2 resource server, JWT, RBAC, CORS, CSRF, rate limiting, audit. Protects every path once on the classpath. |
| [Event Sourcing](/adhar-kit/modules/event-sourcing) | `adhar-kit-event-sourcing` | `event-sourcing` (off) | Event store, CQRS, snapshots, projections |
| [Analytics](/adhar-kit/modules/analytics) | `adhar-kit-analytics` | `analytics` (off) | PostHog product analytics, feature flags |
| [Batch](/adhar-kit/modules/batch) | `adhar-kit-batch` | `batch` (off) | Spring Batch jobs, scheduling, partitioning. Optional in the starter: declare it yourself. |
| [AI](/adhar-kit/modules/ai) | `adhar-kit-ai` | `ai` (off) | Spring AI chat, embeddings, retrieval, tool calls |
| [Dapr](/adhar-kit/modules/dapr) | `adhar-kit-dapr` | `dapr` (off) | Dapr state, pub/sub, service invocation, actors; in-memory without a sidecar |
| [Kubernetes](/adhar-kit/modules/kubernetes) | `adhar-kit-kubernetes` | `kubernetes` (off) | Fabric8 client, ConfigMaps and Secrets, leader election, discovery, scaling |
| [Perf Profiler](/adhar-kit/modules/perf-profiler) | `adhar-kit-perf-profiler` | `perf-profiler` (off) | Method profiling, hotspot and memory analysis |

## Tooling and build

| Module | artifactId | Gate | What it provides |
|---|---|---|---|
| — | `adhar-kit-starter` | — | `AdharFacade`, its accessors and shortcuts, the framework adapters, `/actuator/adhar` |
| [Maven Plugin](/adhar-kit/modules/maven-plugin) | `adhar-kit-maven-plugin` | — | The `adhar:` goals: spec-first OpenAPI, versioning, release, validation, scaffolding |
| [Test Commons](/adhar-kit/modules/test-commons) | `adhar-kit-test-commons` | — | `@AdharIntegrationTest` with TestContainers, WireMock, Toxiproxy, `@AdharBatchTest` |
| [Rewrite](/adhar-kit/modules/rewrite) | `adhar-kit-rewrite` | `rewrite` (off) | OpenRewrite recipes and `RewriteFacade` |
| — | `adhar-kit-bom` | — | Versions for every kit artifact and the third-party stack |
| — | `adhar-kit-parent` | — | Build parent: Spring Boot parent, Java 25, Enforcer, 80% coverage gate |

The starter, BOM and parent are compared in the [Quick Start](/adhar-kit/quickstart#choose-how-to-depend-on-the-kit).

## How the modules depend on each other

```diagram
nka-module-dependencies
```

| Relationship | Modules |
|---|---|
| Require `adhar-kit-commons` (compile) | ai, analytics, batch, cache, config, dapr, event-sourcing, graphql, health, logging, maven-plugin, messaging, metrics, notification, perf-profiler, persistence, resilience, rewrite, starter |
| Depend on `commons` only optionally | docs, kubernetes, security, tracing |
| `provided` scope | test-commons (on commons and batch) |
| No kit dependency | core, grpc |

Every edge between sibling modules is `<optional>true</optional>`:

| From | Optional dependency | Enables |
|---|---|---|
| `resilience` | `metrics` | Circuit-breaker and retry meters |
| `analytics` | `persistence`, `messaging` | Event persistence; the Kafka publish path |
| `batch` | `logging` | Structured BATCH log events for every job run |
| `cache`, `config`, `event-sourcing`, `messaging`, `notification`, `persistence`, `security` | `dapr` | Routing that building block through a Dapr sidecar |

Maven does not resolve optional dependencies transitively, which has three effects:

1. **Declaring a module adds only what it requires.** `adhar-kit-resilience` brings `adhar-kit-commons`, not `adhar-kit-metrics`.
2. **To use an integration, declare both ends.** Add `adhar-kit-metrics` yourself for resilience meters; the module detects it and wires the integration.
3. **Optional-commons modules may need commons added.** If you use `tracing`, `kubernetes`, `security` or `docs` alone and get `NoClassDefFoundError` for `com.adhar.kit.commons.*`, declare `adhar-kit-commons`. Any module that requires commons brings it for you.

Module dependencies also carry third-party stacks. `adhar-kit-core` brings Spring MVC and validation; `persistence` brings Spring Data JPA and Flyway; `security` brings Spring Security. So `adhar-kit-starter` resolves Spring Boot, Spring AI, the Dapr SDK, the Fabric8 client, Resilience4j, OpenRewrite and more.

## Picking only what you need

Import the BOM once, then start from one of these sets:

| Goal | Declare | Notes |
|---|---|---|
| Utilities | `core` | No kit dependency, but brings Spring MVC and validation |
| Observability | `logging`, `metrics`, `tracing` | `commons` arrives through logging and metrics |
| Resilient client calls | `resilience`, plus `metrics` for meters | The `resilience → metrics` edge is optional |
| CRUD service | `core`, `persistence`, `health`, `logging` | Add your JDBC driver and `spring.datasource.url` |
| Event-driven service | `messaging`, `event-sourcing`, `persistence` | Add `spring-kafka` or `spring-rabbit` |
| API documentation | `docs`, plus `grpc` or `graphql` | `grpc` has no kit dependency |
| Everything behind one object | `starter` | 23 modules; add `batch` if you run jobs |

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

**Check:** `mvn dependency:tree -Dincludes=com.adhar.kit` lists the kit artifacts you resolved. Optional edges do not appear unless you declared both ends.

Without the starter you call each module's facade directly — `MetricsFacade.getInstance()`, `CacheFacade.getCache("users")` — and you get no `AdharFacade`, shortcuts or `/actuator/adhar`. The module auto-configurations still run on Spring Boot.

## Build-time selection versus runtime switches

- **The classpath** decides which modules exist. Leave a module out to drop its jar and its third-party stack.
- **`adhar.kit.modules.<id>`** decides which `AdharFacade` accessors work. A disabled accessor throws `IllegalStateException` naming the property; its sub-facade is never built.
- **`adhar.<module>.enabled`** decides whether a module's Spring auto-configuration runs.

A starter-based service with `adhar.kit.modules.ai=false` still ships the AI jar, and its auto-configuration still runs unless `adhar.ai.enabled=false`. See [Concepts](/adhar-kit/concepts#3-two-switches-the-facade-gate-and-the-module).

## Next steps

- [Concepts](/adhar-kit/concepts) — the facade, gate and switch model every module page assumes.
- [Quick Start](/adhar-kit/quickstart) — the starter, BOM and parent with a working service.
- [Framework Support](/adhar-kit/frameworks) — which module facades work off Spring Boot.
- [Building & Contributing](/adhar-kit/build) — the conventions a module follows, and how to add one.
