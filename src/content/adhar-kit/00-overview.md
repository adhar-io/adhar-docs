---
title: "Overview"
section: "Get Started"
order: 1
path: "/adhar-kit"
---

# Adhar Kit

**Adhar Kit** is a comprehensive, **framework-agnostic enterprise microservices toolkit** for Java — a Maven multi-module library that collapses ~20 infrastructure concerns behind a single, consistent API.

> *A comprehensive, framework-agnostic enterprise microservices toolkit for Spring Boot, Quarkus, Micronaut, Helidon, and Vert.x.*

## Why Adhar Kit

Most microservices spend enormous effort re-wiring the same cross-cutting concerns — logging, metrics, tracing, caching, resilience, security, persistence, messaging. Adhar Kit gives you production-ready modules for all of them behind one facade, so you write business logic instead of boilerplate.

- **One facade, one-line shortcuts.** `AdharFacade` exposes every module and 40+ convenience methods (`adhar.safe(...)`, `adhar.traced(...)`, `adhar.cached(...)`).
- **Truly portable.** The same code runs identically across **Spring Boot, Quarkus, Micronaut, Helidon, and Vert.x** — only the wiring differs.
- **Platform-aware.** Auto-detects its environment (Local → Docker → Kubernetes → Adhar Platform) and adapts.
- **Enterprise concerns built in.** Resilience (circuit breakers, retry, bulkhead), security (JWT/OAuth2, RBAC, audit), observability (OpenTelemetry, Micrometer), event sourcing/CQRS, transactional outbox, AI, and more.
- **Pairs with the [Adhar Platform](/docs).** Bridges apps to Kubernetes, Dapr, Prometheus/Grafana, Vault, and Kafka.

## Requirements

| Requirement | Version |
|---|---|
| Java | 25+ |
| Maven | 3.9+ |
| Framework | Spring Boot 4.0+ · Quarkus 3.21+ · Micronaut 4.8+ · Helidon 4.2+ · Vert.x 4.5+ |

- **groupId:** `com.adhar.kit` · **License:** Apache 2.0

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

## Where to go next

| You want to… | Read |
|---|---|
| Add it to a project | [Quick Start](/adhar-kit/quickstart) |
| Use it on your framework | [Framework Support](/adhar-kit/frameworks) |
| Understand the facade & conventions | [Concepts](/adhar-kit/concepts) |
| Browse what's available | [Modules](/adhar-kit/modules/overview) |
| Build or contribute | [Building & Contributing](/adhar-kit/build) |
