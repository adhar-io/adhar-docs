---
title: "Concepts"
section: "Get Started"
order: 4
path: "/adhar-kit/concepts"
---

# Concepts

A few ideas run through every Adhar Kit module: a facade per module, one `AdharFacade` over them, two kinds of switch, and Spring Boot auto-configuration. Once you know them, you can predict what `adhar.getCache()` does before you call it, and the module pages become reference material.

## How it works

On Spring Boot, the starter wires the facade from your `adhar.*` properties at startup:

```diagram
nka-spring-wiring
```

The sections below take each part in turn.

## 1. Two levels of facade

**A facade per module.** Each module's public API is one class: `MetricsFacade`, `CacheFacade`, `SecurityFacade`, `CircuitBreakerFacade`, `ConfigFacade`, and so on. Each has a static `getInstance()` (the cache uses `CacheFacade.getCache(name)` and a builder), so you can use a module without the starter.

**`AdharFacade` over all of them.** The starter's `AdharFacade` has 23 accessors: one per gated module, plus `getUtils()` (the `CoreFacade`), which is never gated. It also has shortcuts that combine modules:

```java
// Accessor: the module's full API
adhar.getMetrics().increment("orders.created");
adhar.getResilience().executeWithFallback("payments", this::charge, this::queue);

// Shortcuts
adhar.traced("op", () -> work());                          // timer around a span
adhar.resilient("svc", () -> call(), () -> fallback());    // circuit breaker + fallback
adhar.safe("op", () -> call(), () -> fallback());          // traced + resilient
adhar.cached("users", id, User.class, () -> db.find(id));  // cache-aside
adhar.transactional(() -> repository.save(order));         // returns the Supplier's value
adhar.publish("order-events", event);
adhar.hasPermission("order:write");
adhar.config("app.region", "eu-west-1");
adhar.uuid();  adhar.toJson(obj);  adhar.async(() -> work());
```

Each shortcut is the obvious combination, written once:

- `traced(name, op)` is `getMetrics().recordTime(name, () -> getTracing().executeInSpan(name, op))`.
- `safe(name, op, fallback)` is `traced(name, () -> getResilience().executeWithFallback(name, op, fallback))`.

When a shortcut does not fit, use the accessor. You lose nothing.

## 2. Modules are separate artifacts

Each module is its own Maven artifact under `com.adhar.kit`. Most depend only on `adhar-kit-commons` (framework detection, `AdharCloudEvent`, DDD annotations, tenant and correlation context). Edges between sibling modules are `<optional>true</optional>`, so declaring one module never pulls in another. `adhar-kit-starter` is the exception: it depends on 23 modules so that `AdharFacade` can reach them.

See [Modules Overview](/adhar-kit/modules/overview#how-the-modules-depend-on-each-other) for every edge.

## 3. Two switches: the facade gate and the module

The kit has two independent families of switch. Mixing them up is the most common source of surprise.

```diagram
nka-two-switches
```

### The facade gate: `adhar.kit.modules.<id>`

`AdharModuleAccess` is a framework-neutral map from module id to enabled. On Spring Boot, `AdharKitAutoConfiguration` builds it from `adhar.kit.modules.*`, and the **same instance** goes to `AdharFacade` and to the registry behind `/actuator/adhar`, so the two never disagree.

Every gated accessor checks it before doing anything. A disabled module fails with the property to change:

```text
java.lang.IllegalStateException: Adhar Kit module 'ai' is disabled (adhar.kit.modules.ai=false); enable it to use this facade.
```

The 22 ids are `logging`, `metrics`, `tracing`, `resilience`, `cache`, `health`, `messaging`, `persistence`, `security`, `config`, `docs`, `grpc`, `ai`, `analytics`, `kubernetes`, `dapr`, `graphql`, `batch`, `notification`, `event-sourcing`, `perf-profiler` and `rewrite`. The first eleven are on by default; the rest are off.

- **Lazy.** An enabled sub-facade is built on its first access, behind a `volatile` field and a lock, and reused after that.
- **Fixed for the singleton's lifetime.** `AdharFacade.getInstance(moduleAccess)` uses its argument only on the call that creates the instance; later calls ignore it. You cannot change gates at runtime.
- **Unknown ids are enabled.** `AdharModuleAccess.of(map)` treats any id missing from the map as enabled.
- **Spring Boot only.** The Quarkus, Micronaut, Helidon and Vert.x adapters call `AdharFacade.getInstance()`, which enables every module. To gate there, create the singleton yourself before the container asks for it:

```java
AdharFacade adhar = AdharFacade.getInstance(
        AdharModuleAccess.of(Map.of("ai", false, "dapr", false)));
```

### The module switch: `adhar.<module>.enabled`

Each module ships its own Spring Boot auto-configuration, guarded by its own property. It is on when the property is absent, and it is **not** affected by the facade gate. With the starter on the classpath, the Dapr and analytics auto-configurations run even though `adhar.kit.modules.dapr` and `adhar.kit.modules.analytics` are `false`.

| Module | Switch (default `true`) | Also needs |
|---|---|---|
| ai, analytics, config, core, dapr, docs, event-sourcing, grpc, health, kubernetes, logging, messaging, metrics, notification, persistence, resilience, rewrite, security, tracing | `adhar.<module>.enabled` | grpc: `io.grpc.Server`; persistence: a configured database; health: Spring Boot |
| perf-profiler | `adhar.profiler.enabled` | A `MeterRegistry` class |
| cache | `adhar.cache.enabled`; aspects: `adhar.cache.aspects.enabled` | Kafka sync is off until `adhar.cache.kafka.enabled=true` |
| graphql | `adhar.graphql.enabled` | `graphql-java` and Spring GraphQL |
| batch | `adhar.batch.enabled` | A Spring Batch `Job` bean |
| commons | always on | — |

Messaging's transactional outbox is off until `adhar.messaging.outbox.enabled=true`.

## 4. Auto-configuration and discovery

On Spring Boot, nothing needs importing:

1. Each module lists its `@AutoConfiguration` classes in `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`.
2. `AdharKitAutoConfiguration` runs when `adhar.kit.enabled` is `true` or absent. It builds `AdharModuleAccess`, the module registry and the graceful-shutdown orchestrator, prints the banner, and registers the actuator endpoint when Spring Boot Actuator is present.
3. `SpringAdharFacadeConfiguration` runs after it and produces the `AdharFacade` bean. It looks for a Micrometer `Tracer` bean and a Resilience4j `CircuitBreakerRegistry` bean — `adhar-kit-tracing` and `adhar-kit-resilience` provide both — and installs the Spring tracing and circuit-breaker adapters on the facade.

With `adhar.kit.enabled=false`, step 2 backs off, but the `AdharFacade` bean is still created, with every module enabled.

Other runtimes discover the facade through their own container: CDI on Quarkus and Helidon MP, a `@Factory` on Micronaut, a static bootstrap on Helidon SE and Vert.x. See [Framework Support](/adhar-kit/frameworks).

## 5. Annotations and aspects

Most modules also offer annotations, implemented by aspects that call the same module code as the facade, so you can mix both styles.

| Module | Representative annotations | Implemented by |
|---|---|---|
| Resilience | `@CircuitBreaker`, `@Retry`, `@RateLimit`, `@Bulkhead`, `@TimeLimiter` | `ResilienceAspect` |
| Metrics | `@Timed`, `@Counted`, `@Gauged`, `@Histogram`; `@Measured`, `@MonitorPerformance` | `MetricsAspect`, `EnhancedMetricsAspect`; `MetricsInterceptor` |
| Tracing | `@NewSpan`, `@ContinueSpan`, `@AsyncSpan`, `@SpanTag` | `TracingAspect` |
| Logging | `@Loggable`, `@Audit`, `@LogExecutionTime`, `@Sensitive` | `LoggableAspect`, `AuditAspect`, … |
| Cache | `@Cacheable`, `@CachePut`, `@CacheEvict`, `@CacheLock` | `CachingAspect`, `CacheLockAspect` |
| Security | `@RequiresRole`, `@RequiresPermission` | `AccessControlAspect` |
| Commons | `@Idempotent` | `IdempotencyAspect` |
| Perf Profiler | `@Profiled` | `ProfilingAspect` |

```diagram
kit-annotation-vs-facade
```

Use an annotation when the concern covers a whole method and you want it visible in the signature. Use a facade call when it covers part of a method, needs a computed name, or is conditional.

> **Note:** Aspects work through Spring AOP proxies, so a call from an object to its own annotated method bypasses the aspect. Facade calls have no such gap.

## 6. Configuration precedence

Read the keys as layers, not one flat namespace:

1. **`adhar.kit.enabled`** — the starter's banner, registry, endpoint and gates. Enabled when absent.
2. **`adhar.kit.modules.<id>`** — the facade gate. An accessor that is off throws, whatever its module's settings say.
3. **`adhar.<module>.enabled`** — whether the module's own auto-configuration runs.
4. **`adhar.<module>.*`** — module settings bound by `@ConfigurationProperties`, such as `adhar.security.jwt.issuer-uri` or `adhar.docs.title`.
5. **The host framework's source order** — which file, profile or environment variable supplies a key. The kit does not change it. On Spring Boot, relaxed binding makes `adhar.kit.modules.event-sourcing` and `ADHAR_KIT_MODULES_EVENTSOURCING` the same key.

Inside the application, `adhar-kit-config` adds its own merge: `ConfigFacade` reads several `ConfigSource`s (file, environment, Kubernetes ConfigMap, Vault, Consul, Dapr) and a higher `getPriority()` overrides a lower one. The default priority is `100`.

## Inspect the resolved state

- **The banner** lists the detected runtime and the enabled and disabled facade gates.
- **`GET /actuator/adhar`** returns the version and every gate's state; `GET /actuator/adhar/{id}` returns one. It needs Spring Boot Actuator and `adhar` in `management.endpoints.web.exposure.include`, and `adhar-kit-security` protects it like any other path.

Neither shows the module switches (`adhar.<module>.enabled`). For those, use Spring Boot's `/actuator/conditions`.

## Testability

- **Mock the whole facade.** `AdharFacade` is a plain class, so Mockito can mock it.
- **Replace one sub-facade.** Every accessor has a setter, such as `adhar.setMetrics(stub)`.
- **Register a customizer.** An `AdharFacadeCustomizer` bean is applied, in order, right after Spring creates the facade. Outside Spring, register it under `META-INF/services/com.adhar.kit.starter.AdharFacadeCustomizer`; it runs once, when `getInstance()` creates the singleton.

```java
@Bean
AdharFacadeCustomizer stubMetrics(MetricsFacade stub) {
    return facade -> facade.setMetrics(stub);
}
```

`AdharFacade.resetForTesting()` clears the singleton between tests. It races with callers that hold the old instance, so never call it from production code.

## Conventions

- Packages are `com.adhar.kit.<module>.*`, except the cache and logging modules, which still use `com.adhar.adharkit.cache` and `com.adhar.adharkit.logging`.
- `AdharCloudEvent` (`com.adhar.kit.commons.event`) is the kit's CloudEvents 1.0 envelope.
- Framework-specific dependencies are `<optional>true</optional>`, so you pull in only the runtime you use.

## Next steps

- [Framework Support](/adhar-kit/frameworks) — how the adapters hand out the facade, and what works on each runtime.
- [Modules Overview](/adhar-kit/modules/overview) — every module, its gate id and its dependencies.
- [Quick Start](/adhar-kit/quickstart) — put the model into a running service.
- [Building & Contributing](/adhar-kit/build) — the conventions a new module follows.
