---
title: "Overview"
section: "Get Started"
order: 1
path: "/adhar-kit"
---

# Overview

**Adhar Kit** is a **framework-agnostic enterprise microservices toolkit** for Java — a Maven multi-module library that collapses 22 cross-cutting infrastructure concerns behind a single, consistent API called `AdharFacade`. You write `adhar.safe(...)` once and it means the same thing on Spring Boot, Quarkus, Micronaut, Helidon, and Vert.x.

> *A comprehensive, framework-agnostic enterprise microservices toolkit for Spring Boot, Quarkus, Micronaut, Helidon, and Vert.x.*

## At a glance

| | |
|---|---|
| What it is | A Maven library (29 modules) you add to a Java service |
| groupId | `com.adhar.kit` |
| Current version | `0.1.0` |
| Entry point | `com.adhar.kit.starter.AdharFacade` |
| Java | 25 or later (enforced by the build) |
| Maven | 3.9+ to consume, 3.8+ enforced when building the kit |
| Frameworks | Spring Boot 4.0+ · Quarkus 3.21+ · Micronaut 4.8+ · Helidon 4.2+ · Vert.x 4.5+ |
| License | Apache 2.0 |
| Source | [github.com/adhar-io/adhar-kit](https://github.com/adhar-io/adhar-kit) |

## The problem it solves

Look at a typical microservice constructor. It takes a `MeterRegistry`, a `Tracer`, a `CircuitBreakerRegistry`, a cache template, a Kafka template, a JPA repository, a security context accessor — six or seven infrastructure collaborators before a single line of domain logic exists. Then the next service in the estate does the same thing again, slightly differently. Then someone moves a service to Quarkus and all of it is rewritten against different types.

That is the cost Adhar Kit targets: **the same cross-cutting concerns, re-implemented per service and re-implemented per framework.** Three things follow from it.

- **Inconsistency.** Retry policy, metric naming, log structure and audit coverage drift between teams because each service wires them by hand.
- **Framework lock-in.** "Framework-agnostic" libraries usually still leak framework types into your business code, so a migration is a rewrite.
- **Boilerplate density.** The interesting logic in `createOrder` is four lines; the plumbing around it is forty.

## The AdharFacade idea

Adhar Kit answers all three with one object. `AdharFacade` is a framework-neutral class — no DI annotations, no compile-time coupling to any framework — that exposes every module through a sub-facade accessor, plus a set of one-call shortcuts for the combinations you reach for constantly.

There are 23 accessors: 22 for gated modules (`getMetrics()`, `getSecurity()`, `getAi()`, …) and `getUtils()`, which is never gated. Each sub-facade is constructed lazily on first access, and only if its module is enabled, so a service that never touches AI never pays for the AI module.

Above those accessors sit the shortcuts. `adhar.safe(name, work, fallback)` is tracing plus a circuit breaker plus a fallback in one call. `adhar.cached(cache, key, type, loader)` is the whole cache-aside pattern. `adhar.transactional(...)`, `adhar.publish(...)`, `adhar.hasPermission(...)`, `adhar.chat(...)` collapse a collaborator plus its ceremony into a method call.

```text
        ┌──────────────────────────────────────────────────┐
        │               YOUR APPLICATION CODE              │
        │        OrderService · PaymentService · …         │
        └───────────────────────┬──────────────────────────┘
                                │ adhar.safe(…)   adhar.cached(…)
                                │ adhar.publish(…) adhar.save(…)
        ┌───────────────────────▼──────────────────────────┐
        │                    AdharFacade                   │
        │   framework-neutral · 23 accessors · shortcuts   │
        ├──────────────────────────────────────────────────┤
        │  LoggingFacade  MetricsFacade  TracingFacade     │
        │  CacheFacade  SecurityFacade  MessagingFacade …  │
        │        (lazy, gated by AdharModuleAccess)        │
        ├──────────────────────────────────────────────────┤
        │              FRAMEWORK ADAPTER LAYER             │
        │  Spring · Quarkus · Micronaut · Helidon · Vert.x │
        └───────────────────────┬──────────────────────────┘
                                │
        ┌───────────────────────▼──────────────────────────┐
        │                  INFRASTRUCTURE                  │
        │  Kafka · RabbitMQ · JPA/Postgres · Caffeine      │
        │  OpenTelemetry · Micrometer/Prometheus           │
        │  Kubernetes · Dapr · OAuth2/JWT providers        │
        └──────────────────────────────────────────────────┘
```

The important line in that diagram is the adapter layer. Your code sits above it and never names a framework type; only the adapter below it does. That is what makes the portability claim real rather than aspirational.

## What is in the box

Twenty-nine Maven modules ship from the root `pom.xml`: 27 production modules, plus `adhar-kit-bom` for version management and `adhar-kit-parent` for build configuration.

| Group | Modules |
|---|---|
| Foundation | commons, core, config, logging, metrics, tracing, cache, resilience, health, persistence |
| Integration | messaging, grpc, graphql, notification, docs |
| Enterprise | security, event-sourcing, analytics, batch, ai, dapr, kubernetes, perf-profiler |
| Tooling | starter, maven-plugin, test-commons, rewrite, bom, parent |

Concretely, that means Resilience4j circuit breakers, retries, rate limiters and bulkheads; OAuth2/OIDC, JWT, RBAC and audit logging; OpenTelemetry tracing and Micrometer metrics with Prometheus export; JPA with multi-tenancy, auditing, soft delete and a transactional outbox; Kafka and RabbitMQ messaging where every event is a CloudEvents 1.0 envelope; an event store with CQRS and projections; and multi-provider LLM access. The [Modules overview](/adhar-kit/modules/overview) is the full catalogue.

## Relationship to the Adhar Platform

Adhar Kit is the **application-side library**. The [Adhar Platform](/docs) is the **infrastructure it can run on** — Kubernetes, Dapr, Prometheus and Grafana, Vault, Kafka, ArgoCD, Crossplane.

They are designed together but are not coupled. The kit runs fine on a laptop, on plain Docker, or on somebody else's Kubernetes cluster; the platform runs fine under services that have never heard of the kit. What you get from pairing them is that the kit already knows the platform's conventions, so `adhar.secret(...)`, `adhar.isInKubernetes()` and the Dapr building blocks resolve to real platform services rather than needing bespoke wiring.

Framework detection is genuinely automatic: `FrameworkDetector` probes the classpath at first use and caches the result, which you can read back with `adhar.currentFramework()`.

## A taste

```java
import com.adhar.kit.starter.AdharFacade;

@Service
public class OrderService {
    private final AdharFacade adhar;

    public OrderService(AdharFacade adhar) { this.adhar = adhar; }

    public Order createOrder(OrderRequest request) {
        if (!adhar.hasPermission("order:create")) throw new ForbiddenException();
        adhar.logInfo("Creating order for user {}", adhar.currentUserId());
        adhar.count("orders.created");

        // safe() = traced + resilient + fallback in one call
        return adhar.safe("create-order",
            () -> adhar.transactional(() -> {
                Order order = adhar.save(new Order(adhar.currentUserId()));
                adhar.publish("order-events", order);
                return order;
            }),
            () -> queueForLater(request));
    }
}
```

Nine lines of behaviour that would otherwise need six injected collaborators — and the identical nine lines compile and run on all five frameworks.

## Where to go next

| You want to… | Read |
|---|---|
| Get a service running with the kit | [Quick Start](/adhar-kit/quickstart) |
| See how the same code runs on your framework | [Framework Support](/adhar-kit/frameworks) |
| Understand the facade, gating and config precedence | [Concepts](/adhar-kit/concepts) |
| Browse the module catalogue and pick dependencies | [Modules Overview](/adhar-kit/modules/overview) |
| Build from source or contribute a change | [Building & Contributing](/adhar-kit/build) |
| Check a specific question | [FAQ](/adhar-kit/faq) |

If you are new, read [Concepts](/adhar-kit/concepts) after [Quick Start](/adhar-kit/quickstart) — the module pages assume the facade model it describes.
