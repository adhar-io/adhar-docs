---
title: "Concepts"
section: "Get Started"
order: 4
path: "/adhar-kit/concepts"
---

# Concepts

Five ideas run through every Adhar Kit module. **Once you can predict what `adhar.getCache()` does before you call it, every module page becomes reference material rather than new learning.** This page is that predictive model.

## At a glance

| Idea | One-line version |
|---|---|
| The facade pattern, twice | Each module has a `*Facade`; `AdharFacade` federates them all |
| Module independence | Modules depend on `adhar-kit-commons`, not on each other |
| Lazy, gated initialization | A sub-facade is built on first access, and only if enabled |
| Auto-configuration | Each module ships `@AutoConfiguration` + `@ConditionalOnProperty` |
| Annotations and aspects | Declarative alternative to facade calls, same implementation behind both |
| Configuration precedence | Gate, then binding, then the host framework's own source order |

## 1. The facade pattern, applied twice

Adhar Kit uses the facade pattern at two levels, and confusing them is the most common source of misreading the API.

**Level one — a facade per module.** Every module exposes exactly one class as its primary API: `MetricsFacade`, `CacheFacade`, `SecurityFacade`, `CircuitBreakerFacade`, and so on; everything else is an implementation detail that may change. Each works standalone — `MetricsFacade.getInstance()` is valid with or without the starter — which is what makes modules independently consumable.

**Level two — `AdharFacade` federates them.** The starter's `AdharFacade` holds all 23 sub-facades and exposes them through accessors, plus shortcuts that compose several at once. It is a plain class with no DI annotations, so the same object works as an injected bean and as `AdharFacade.getInstance()`.

```java
// Level one: full control over one module
adhar.getMetrics().increment("orders.created");
adhar.getResilience().executeWithFallback("payments", this::charge, this::queue);

// Level two: composed shortcuts
adhar.traced("op", () -> work());                          // tracing + metrics timing
adhar.resilient("svc", () -> call(), () -> fallback());    // circuit breaker + fallback
adhar.safe("op", () -> call(), () -> fallback());          // traced + resilient
adhar.cached("users", id, User.class, () -> db.find(id));  // cache-aside
adhar.transactional(() -> { save(a); save(b); });
adhar.publish("topic", event);
adhar.hasPermission("order:write");
adhar.chat("system", "user message");
adhar.notify("to@example.com", "Subject", "Body");
adhar.uuid();  adhar.shortId();  adhar.toJson(obj);  adhar.async(() -> work());
```

The shortcuts are not magic; they are the obvious composition, written once. `traced(name, op)` is `metrics.recordTime(name, () -> tracing.executeInSpan(name, op))`. `safe(name, op, fallback)` is `traced(name, () -> resilience.executeWithFallback(name, op, fallback))`. When a shortcut is not quite what you want, drop to the accessor — you lose nothing.

## 2. Module independence

Modules are not a layered stack you adopt together. Each is a separate Maven artifact under `com.adhar.kit`, and the edges between them are deliberately sparse: most depend on `adhar-kit-commons` (framework detection, DDD annotations, `AdharCloudEvent`, tenant and correlation context) and on nothing else in the kit.

So you can depend on `adhar-kit-metrics` alone and use `MetricsFacade` directly, and adding a module never changes the behaviour of one you already had — no module mutates a global registry on the way in. `adhar-kit-starter` is the exception: it depends on every module, which is what lets `AdharFacade` federate them.

## 3. Lazy, gated initialization

Every sub-facade accessor does two things before returning: it checks whether the module is enabled, and it constructs the facade if this is the first access.

Enablement is owned by one object, `AdharModuleAccess` — a framework-neutral map from module id to boolean. On Spring Boot it is built from `adhar.kit.modules.*` by `AdharKitAutoConfiguration`, and the **same instance** is handed to both `AdharFacade` and the `AdharKitModuleRegistry` behind the actuator endpoint, so the two can never disagree about what is on.

Unknown ids default to enabled, so a module added in a later release is opt-out rather than silently dark. A disabled module fails loudly and tells you the exact property to change:

```java
adhar.getAi();
// IllegalStateException: Adhar Kit module 'ai' is disabled
// (adhar.kit.modules.ai=false); enable it to use this facade.
```

The 22 module ids are `logging`, `metrics`, `tracing`, `resilience`, `cache`, `health`, `messaging`, `persistence`, `security`, `config`, `docs`, `grpc`, `ai`, `analytics`, `kubernetes`, `dapr`, `graphql`, `batch`, `notification`, `event-sourcing`, `perf-profiler` and `rewrite`. `getUtils()` — the `CoreFacade` — is the one accessor that is never gated.

```yaml
adhar:
  kit:
    enabled: true          # master switch; absent means enabled
    modules:
      cache: true          # on by default
      ai: true             # off by default, turned on here
      dapr: false
```

> Gating is fixed for the lifetime of the singleton. `AdharFacade.getInstance(moduleAccess)` only honours the argument on the call that actually creates the instance; later calls log a debug message and ignore it. Do not treat module toggles as runtime-switchable.

## 4. Auto-configuration and discovery

Modules activate without you importing anything. The mechanism has three parts, all conventional Spring Boot.

1. Each module ships an `@AutoConfiguration` class guarded by `@ConditionalOnProperty`, so it only contributes beans when its property says so.
2. That class is listed in the module jar's `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`, which is how Spring Boot finds it.
3. `AdharKitAutoConfiguration` — itself gated by `@ConditionalOnProperty(prefix = "adhar.kit", name = "enabled", matchIfMissing = true)` — builds the `AdharModuleAccess`, the module registry and the graceful-shutdown orchestrator, then `SpringAdharFacadeConfiguration` runs `@AutoConfigureAfter` it to produce the `AdharFacade` bean.

Optional pieces stay optional by classpath condition, not by configuration: the actuator endpoint is registered only when Actuator's `Endpoint` annotation is present, and the Spring adapter only when `SpringApplication` is. On other frameworks discovery is the host's — CDI on Quarkus and Helidon MP, `@Factory` on Micronaut, a static bootstrap on Helidon SE and Vert.x. Outside a container it falls back to the JDK `ServiceLoader`, which applies any `AdharFacadeCustomizer` registered under `META-INF/services/` once, when `getInstance()` creates the singleton.

## 5. Annotations and aspects

Most modules offer a declarative alternative to facade calls: an annotation plus an AspectJ aspect that implements it. Both paths end in the same module facade, so mixing them is safe.

| Module | Representative annotations | Aspect |
|---|---|---|
| Resilience | `@CircuitBreaker`, `@Retry`, `@RateLimit`, `@Bulkhead`, `@TimeLimiter` | `ResilienceAspect` |
| Metrics | `@Timed`, `@Counted`, `@Gauged`, `@Histogram`, `@Measured` | `MetricsAspect`, `EnhancedMetricsAspect` |
| Tracing | `@NewSpan`, `@ContinueSpan`, `@AsyncSpan`, `@SpanTag` | `TracingAspect` |
| Logging | `@Loggable`, `@Audit`, `@LogExecutionTime`, `@Sensitive` | `LoggableAspect`, `AuditAspect`, … |
| Cache | `@Cacheable`, `@CachePut`, `@CacheEvict`, `@CacheLock` | `CachingAspect`, `CacheLockAspect` |
| Security | `@RequiresRole`, `@RequiresPermission` | `AccessControlAspect` |
| Commons | `@Idempotent`, `@PublishEvent`, `@AggregateRoot` | `IdempotencyAspect` |
| Persistence | `@MultiTenant`, `@SoftDelete`, `@Audited` | — (JPA lifecycle) |
| Profiler | `@Profiled` | `ProfilingAspect` |

```text
  Two ways into one module — identical implementation behind both

   @CircuitBreaker("payments")             adhar.resilient("payments", …)
   public Receipt charge(Order o) {…}                  │
                │                                      │
     ┌──────────▼──────────┐                           │
     │  ResilienceAspect   │  AOP proxy, opt-in        │
     │  around the method  │  per annotated method     │
     └──────────┬──────────┘                           │
                └───────────────┬──────────────────────┘
                                ▼
                 ┌──────────────────────────────┐
                 │    CircuitBreakerFacade      │  module public API
                 └──────────────┬───────────────┘
                                ▼
                 ┌──────────────────────────────┐
                 │  Resilience4j registry via   │
                 │  SpringCircuitBreakerAdapter │
                 └──────────────────────────────┘
```

Choose annotations when the concern covers a whole method and you want it visible in the signature; choose facade calls when it covers part of a method, needs a computed name, or has to be conditional. Aspects need a proxy, so self-invocation inside the same object bypasses them — facade calls do not.

Metrics are partly automatic either way: JVM, persistence, cache, messaging and HTTP metrics are collected without annotation, and `@Measured` is the opt-in for method-level latency, count and error tracking.

## 6. Configuration precedence

Four things resolve in order. Reading them as one flat namespace is what makes configuration confusing.

1. **`adhar.kit.enabled`** — the master switch for the starter's auto-configuration. Absent means enabled (`matchIfMissing = true`). If this is `false`, nothing below matters.
2. **`adhar.kit.modules.<id>`** — the gate. Decides whether a module's facade may exist at all. A gate that is off beats any amount of module configuration underneath it.
3. **`adhar.<module>.*`** — module settings, bound by `@ConfigurationProperties(prefix = "adhar.<module>")`. For example `adhar.security.jwt.secret`, `adhar.cache.ttl`, `adhar.ai.provider`.
4. **The host framework's source order** — which file or environment variable supplies a given key. The kit does not override this: Spring Boot's ordering (command line, then environment, then profile-specific YAML, then `application.yml`) applies unchanged, and relaxed binding means `adhar.kit.modules.event-sourcing` and `ADHAR_KIT_MODULES_EVENTSOURCING` are the same key.

The `adhar-kit-config` module adds a fifth layer *inside* the application: `ConfigFacade` merges multiple `ConfigSource` implementations — file, environment, Kubernetes ConfigMap, Vault, Consul, Dapr — by numeric priority, where **higher priority overrides lower** and the default is `100`. That merge is a kit concern and is independent of how the framework loaded `application.yml`.

## Inspecting what actually happened

Two checkpoints show the resolved state rather than the intended one. At startup the kit logs a banner listing the detected runtime and every enabled and disabled module. At runtime, with Spring Boot Actuator present:

```properties
management.endpoints.web.exposure.include=adhar
```

```text
GET /actuator/adhar          # version, counts, and every module's state
GET /actuator/adhar/{id}     # one module, e.g. /actuator/adhar/cache
```

## Testability

Substitution has three levels.

- **Mock the whole facade.** `AdharFacade` is a plain class; Mockito can mock it outright.
- **Override one sub-facade.** Every accessor has a matching setter, so `adhar.setMetrics(mock)` swaps one module on a real instance.
- **Register a customizer.** Implement `AdharFacadeCustomizer` as a Spring bean (applied in declared order right after the facade is created) or as a `ServiceLoader` provider on other frameworks.

`AdharFacade.resetForTesting()` clears the process-wide singleton between tests. It is a test-only escape hatch and races with concurrent `getInstance()` callers, so never call it from production code.

## Other conventions

Packages are `com.adhar.kit.<module>.*`. Every event — domain, notification, analytics — uses the CloudEvents 1.0 envelope via `AdharCloudEvent`. Java 25 features (records, sealed interfaces, pattern matching, virtual threads) are used freely. Framework dependencies are `<optional>true</optional>`, so consumers pull only the runtime they use.

## Next steps

- [Modules Overview](/adhar-kit/modules/overview) — the catalogue, now that you know what a module page is describing.
- [Framework Support](/adhar-kit/frameworks) — how the adapter layer implements the facade's framework neutrality.
- [Quick Start](/adhar-kit/quickstart) — put the model into a running service.
- [Building & Contributing](/adhar-kit/build) — the conventions a new module must follow.
