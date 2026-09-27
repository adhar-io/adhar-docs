---
title: "Concepts"
section: "Get Started"
order: 4
path: "/adhar-kit/concepts"
---

# Concepts

A few ideas run through every Adhar Kit module. Understand these and the whole toolkit clicks.

## The unified facade

`AdharFacade` is the single entry point. It offers two API styles:

- **Module accessors** — full control: `adhar.getMetrics()`, `adhar.getSecurity()`, `adhar.getAi()`, …
- **One-call shortcuts** — the common cross-cutting patterns in a single call:

```java
adhar.traced("op", () -> work());                    // tracing + metrics timing
adhar.resilient("svc", () -> call(), () -> fallback()); // circuit breaker + fallback
adhar.safe("op", () -> call(), () -> fallback());       // traced + resilient
adhar.cached("users", id, User.class, () -> db.find(id)); // cache-aside
adhar.transactional(() -> { save(a); save(b); });    // transaction
adhar.publish("topic", event);                       // publish an event
adhar.hasPermission("order:write");                  // permission check
adhar.chat("system", "user message");                // AI chat
adhar.notify("to@x.com", "Subject", "Body");         // send a notification
adhar.uuid();  adhar.shortId();  adhar.toJson(obj);  adhar.async(() -> work());
```

It works both as an injected bean and as a singleton (`AdharFacade.getInstance()`); every framework adapter delegates to that singleton.

## Lazy, gated modules

Every sub-facade initializes on first use, and only if its module is enabled. Toggles live under `adhar.kit.modules.<name>` and are the single source of truth. A disabled module fails loudly:

```java
adhar.getAi(); // IllegalStateException: module 'ai' is disabled
               // (adhar.kit.modules.ai=false); enable it to use this facade.
```

`adhar.getUtils()` is never gated.

```yaml
adhar:
  kit:
    modules:
      cache: true
      ai: true
      analytics: true
      kubernetes: true
      dapr: false
```

## Conventions

- **Facade per module** — each module exposes a `*Facade` as its primary API.
- **Auto-configuration** — every module ships `@AutoConfiguration` with `@ConditionalOnProperty`, so it activates only when enabled.
- **Config binding** — properties bind under `@ConfigurationProperties(prefix = "adhar.<module>")`.
- **CloudEvents 1.0** — all events (domain, notification, analytics) use the CloudEvent envelope via `AdharCloudEvent`.
- **Package naming** — `com.adhar.kit.<module>.*`.
- **Java 25** — records, sealed interfaces, pattern matching, virtual threads.
- **Auto-metrics** — JVM, persistence, cache, messaging, and HTTP metrics collect automatically; opt-in method timing with `@Measured`.

## Platform awareness

The kit auto-detects its environment (Local Dev → Docker → Kubernetes → Adhar Platform) and adapts infrastructure wiring accordingly — the same build runs correctly in each without config changes.

## Inspecting modules at runtime

With Spring Boot Actuator present, the module registry is exposed:

```text
GET /actuator/adhar          # all modules and their state
GET /actuator/adhar/{id}     # one module
```

```properties
management.endpoints.web.exposure.include=adhar
```

## Testability

Mock `AdharFacade` directly, override a single sub-facade on a real instance (e.g. `adhar.setMetrics(mock)`), or register an `AdharFacadeCustomizer` (Spring bean, or a `ServiceLoader` provider on other frameworks).
