---
title: "Overview"
section: "Get Started"
order: 1
path: "/adhar-kit"
---

# Overview

**Adhar Kit** is a set of Java libraries for the cross-cutting parts of a service: logging, metrics, tracing, resilience, caching, security, persistence, messaging and more. Each concern is a separate Maven module with one `*Facade` class, and one object, `AdharFacade`, gives you all of them. This page explains what the kit is and where to start.

## At a glance

| | |
|---|---|
| What it is | A Maven reactor of 29 artifacts: 27 library modules, `adhar-kit-bom` and `adhar-kit-parent` |
| Coordinates | `com.adhar.kit:<artifactId>:0.1.0` |
| Entry point | `com.adhar.kit.starter.AdharFacade`, from `adhar-kit-starter` |
| Java | 25 or later — the artifacts are Java 25 bytecode |
| Spring Boot | 4.x, `status:complete` — the starter auto-configures everything |
| Quarkus, Micronaut, Helidon, Vert.x | `status:in-progress` — adapters hand out the facade; see [Framework Support](/adhar-kit/frameworks) |
| License | Apache 2.0 |
| Source | [github.com/adhar-io/adhar-kit](https://github.com/adhar-io/adhar-kit) |

## How it works

```diagram
kit-facade-layers
```

- **One facade per module.** `MetricsFacade`, `CacheFacade`, `SecurityFacade`, `CircuitBreakerFacade` and the rest are each a module's public API. You can use a module on its own, without the starter.
- **One facade over all of them.** `AdharFacade` has an accessor per module (`getMetrics()`, `getCache()`, `getAi()`, …) and shortcuts that combine several, such as `safe(...)` (traced, timed, circuit breaker and fallback) and `cached(...)` (cache-aside).
- **Gated and lazy.** On Spring Boot, `adhar.kit.modules.<id>` decides which accessors work. A sub-facade is built on first use, and a disabled one throws instead of starting.
- **Framework-neutral.** `AdharFacade` is a plain class with no DI annotations. A thin adapter per framework hands it to the container.

[Concepts](/adhar-kit/concepts) explains each idea in detail.

## A taste

```java
import com.adhar.kit.starter.AdharFacade;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    private final AdharFacade adhar;

    public OrderService(AdharFacade adhar) { this.adhar = adhar; }

    public Order createOrder(OrderRequest request) {
        if (!adhar.hasPermission("order:create")) throw new SecurityException("order:create");
        adhar.logInfo("Creating order for user {}", adhar.currentUserId());
        adhar.count("orders.created");

        // traced + timed + circuit breaker + fallback in one call
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

`Order`, `OrderRequest` and `queueForLater` are your own code. One constructor parameter replaces a metrics registry, a tracer, a circuit-breaker registry, a repository, a message template and a security accessor. `save` and `transactional` need a configured database.

## What is in the box

| Group | Modules |
|---|---|
| Foundation | commons, core, config, logging, metrics, tracing, cache, resilience, health, persistence |
| Integration | messaging, grpc, graphql, notification, docs |
| Platform and advanced | security, event-sourcing, analytics, batch, ai, dapr, kubernetes, perf-profiler |
| Tooling | starter, maven-plugin, test-commons, rewrite |
| Build | bom, parent |

The [Modules Overview](/adhar-kit/modules/overview) describes each module, its toggle and its dependencies.

## Three ways to add it

| You want | Add | Read |
|---|---|---|
| Everything behind `AdharFacade` | `adhar-kit-starter` | [Quick Start](/adhar-kit/quickstart) |
| Only some modules | `adhar-kit-bom` import, then each module | [Modules Overview](/adhar-kit/modules/overview#picking-only-what-you-need) |
| The kit's build defaults for a new service | `adhar-kit-parent` as your parent | [Quick Start](/adhar-kit/quickstart#choose-how-to-depend-on-the-kit) |

## Relationship to the Adhar Platform

Adhar Kit is the application-side library; the [Adhar Platform](/docs) is the infrastructure it can run on. Neither requires the other: the kit runs on a laptop or any Kubernetes cluster, and the platform runs services that never use the kit. The platform's Spring Boot templates inherit `adhar-kit-parent` and depend on `adhar-kit-starter`, so a scaffolded service starts with the kit wired in.

## Where to go next

Read the Get Started pages in order:

1. [Quick Start](/adhar-kit/quickstart) — a running Spring Boot service that uses `AdharFacade`.
2. [Concepts](/adhar-kit/concepts) — facades, gates, auto-configuration and configuration precedence.
3. [Framework Support](/adhar-kit/frameworks) — what each non-Spring runtime gets today.
4. [Building & Contributing](/adhar-kit/build) — build the kit from source and add a module.

Then use the [Modules Overview](/adhar-kit/modules/overview) and the [FAQ](/adhar-kit/faq) as reference.
