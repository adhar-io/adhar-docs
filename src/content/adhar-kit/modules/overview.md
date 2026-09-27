---
title: "Modules Overview"
section: "Modules"
order: 1
path: "/adhar-kit/modules/overview"
---

# Modules

Adhar Kit is a set of focused, independently-usable modules. Import the [BOM](/adhar-kit/quickstart) and add only what you need — every module is `com.adhar.kit:<artifactId>` and is lazily initialized behind an `adhar.kit.modules.<name>` toggle.

## Core foundation

| Module | artifactId | What it provides |
|---|---|---|
| [Commons](/adhar-kit/modules/commons) | `adhar-kit-commons` | DDD annotations, base classes, CloudEvents, idempotency, tenant/correlation context |
| [Core](/adhar-kit/modules/core) | `adhar-kit-core` | Patterns & utilities: Specification, Result, retry/backoff, async, Snowflake IDs |
| [Config](/adhar-kit/modules/config) | `adhar-kit-config` | Multi-source configuration, dynamic refresh, AES/GCM encryption |
| [Logging](/adhar-kit/modules/logging) | `adhar-kit-logging` | Structured JSON logging, MDC, sensitive-data masking, 11 annotations |
| [Metrics](/adhar-kit/modules/metrics) | `adhar-kit-metrics` | Micrometer metrics, SLO/error budgets, Prometheus/OTel export |
| [Tracing](/adhar-kit/modules/tracing) | `adhar-kit-tracing` | OpenTelemetry tracing, baggage, trace/log correlation |
| [Cache](/adhar-kit/modules/cache) | `adhar-kit-cache` | Caffeine caching, declarative annotations, statistics |
| [Resilience](/adhar-kit/modules/resilience) | `adhar-kit-resilience` | Resilience4j: circuit breaker, retry, rate limiter, bulkhead, time limiter |
| [Health](/adhar-kit/modules/health) | `adhar-kit-health` | Health checks, readiness gate, Kubernetes probes |
| [Persistence](/adhar-kit/modules/persistence) | `adhar-kit-persistence` | JPA, multi-tenancy, auditing, soft delete, transactional outbox |

## Integration & communication

| Module | artifactId | What it provides |
|---|---|---|
| [Messaging](/adhar-kit/modules/messaging) | `adhar-kit-messaging` | Kafka & RabbitMQ with CloudEvents, pub/sub, DLQ, retry |
| [gRPC](/adhar-kit/modules/grpc) | `adhar-kit-grpc` | gRPC server/client, TLS/mTLS, interceptors, health/reflection |
| [GraphQL](/adhar-kit/modules/graphql) | `adhar-kit-graphql` | Schema registry, Relay pagination, DataLoader, complexity limits |
| [Notification](/adhar-kit/modules/notification) | `adhar-kit-notification` | Multi-channel: email, webhook, in-app, SMS; templates & retry |

## Enterprise & advanced

| Module | artifactId | What it provides |
|---|---|---|
| [Security](/adhar-kit/modules/security) | `adhar-kit-security` | OAuth2/OIDC, JWT, RBAC, CORS/CSRF, rate limiting, audit |
| [Event Sourcing](/adhar-kit/modules/event-sourcing) | `adhar-kit-event-sourcing` | Event store, CQRS, snapshots, projections, domain event bus |
| [Analytics](/adhar-kit/modules/analytics) | `adhar-kit-analytics` | PostHog analytics, feature flags, A/B testing |
| [Batch](/adhar-kit/modules/batch) | `adhar-kit-batch` | Spring Batch jobs, scheduling, partitioning |
| [AI](/adhar-kit/modules/ai) | `adhar-kit-ai` | Multi-provider LLM: chat, embeddings, RAG, function calling |
| [Dapr](/adhar-kit/modules/dapr) | `adhar-kit-dapr` | Dapr building blocks: state, pub/sub, service invocation |
| [Kubernetes](/adhar-kit/modules/kubernetes) | `adhar-kit-kubernetes` | Fabric8 integration, leader election, HPA, service discovery |
| [Perf Profiler](/adhar-kit/modules/perf-profiler) | `adhar-kit-perf-profiler` | Method profiling, hotspot & memory analysis |

## Tooling & build

| Module | artifactId | What it provides |
|---|---|---|
| [Maven Plugin](/adhar-kit/modules/maven-plugin) | `adhar-kit-maven-plugin` | Versioning, release, code generation, validation |
| `adhar-kit-starter` | `adhar-kit-starter` | The unified `AdharFacade` + all accessors + 40+ shortcuts + framework adapters |
| `adhar-kit-test-commons` | `adhar-kit-test-commons` | TestContainers helpers (Postgres, Redis, Kafka, RabbitMQ, Vault…) |
| `adhar-kit-bom` / `adhar-kit-parent` | — | Dependency management and build configuration |

> Some advanced modules mark parts of their surface as in progress (e.g. certain messaging annotations, Dapr locks/actors, concrete AI providers). Each module page notes its status where relevant.
