---
title: "Concepts"
section: "Get Started"
order: 4
path: "/adhar-kit/concepts"
---

# Concepts

Five ideas run through every Adhar Kit module. **Once you can predict what `adhar.getCache()` does before you call it, every module page becomes reference material instead of new learning.** This page gives you that model.

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

Adhar Kit uses the facade pattern at two levels. Mixing them up is the most common reason people misread the API.

**Level one — a facade per module.** Every module exposes exactly one class as its main API: `MetricsFacade`, `CacheFacade`, `SecurityFacade`, `CircuitBreakerFacade`, and so on. Everything else is an implementation detail that may change. Each facade works on its own: `MetricsFacade.getInstance()` is valid with or without the starter. That is what lets you use modules independently.

**Level two — `AdharFacade` brings them together.** The starter's `AdharFacade` holds all 23 sub-facades and exposes them through accessors. It also offers shortcuts that combine several at once. It is a plain class with no DI annotations, so the same object works as an injected bean and as `AdharFacade.getInstance()`.

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

The shortcuts are not magic. Each is the obvious combination, written once:

- `traced(name, op)` is `metrics.recordTime(name, () -> tracing.executeInSpan(name, op))`.
- `safe(name, op, fallback)` is `traced(name, () -> resilience.executeWithFallback(name, op, fallback))`.

When a shortcut is not quite what you want, use the accessor instead. You lose nothing.

## 2. Module independence

Modules are not a layered stack you must adopt together. Each is a separate Maven artifact under `com.adhar.kit`, and they deliberately depend on each other as little as possible. Most depend only on `adhar-kit-commons` and nothing else in the kit. Commons provides framework detection, DDD annotations, `AdharCloudEvent`, and tenant and correlation context.

So you can depend on `adhar-kit-metrics` alone and use `MetricsFacade` directly. Adding a module never changes the behaviour of one you already had, because no module changes a global registry when it loads.

`adhar-kit-starter` is the exception. It depends on every module, which is what lets `AdharFacade` bring them together.

## 3. Lazy, gated initialization

Every sub-facade accessor does two things before it returns. It checks whether the module is enabled. Then, on first access, it builds the facade.

One object decides which modules are enabled: `AdharModuleAccess`, a framework-neutral map from module id to boolean. On Spring Boot, `AdharKitAutoConfiguration` builds it from `adhar.kit.modules.*`. The **same instance** goes to both `AdharFacade` and the `AdharKitModuleRegistry` behind the actuator endpoint. So the two can never disagree about what is on.

Unknown ids default to enabled. So a module added in a later release is opt-out, instead of silently switched off. A disabled module fails loudly and tells you the exact property to change:

```java
adhar.getAi();
// IllegalStateException: Adhar Kit module 'ai' is disabled
// (adhar.kit.modules.ai=false); enable it to use this facade.
```

The 22 module ids are `logging`, `metrics`, `tracing`, `resilience`, `cache`, `health`, `messaging`, `persistence`, `security`, `config`, `docs`, `grpc`, `ai`, `analytics`, `kubernetes`, `dapr`, `graphql`, `batch`, `notification`, `event-sourcing`, `perf-profiler` and `rewrite`. `getUtils()`, the `CoreFacade`, is the one accessor that is never gated.

```yaml
adhar:
  kit:
    enabled: true          # master switch; absent means enabled
    modules:
      cache: true          # on by default
      ai: true             # off by default, turned on here
      dapr: false
```

> Gating is fixed for the lifetime of the singleton. `AdharFacade.getInstance(moduleAccess)` only uses the argument on the call that actually creates the instance. Later calls log a debug message and ignore it. You cannot switch module toggles at runtime.

## 4. Auto-configuration and discovery

Modules activate without you importing anything. The mechanism has three parts, all standard Spring Boot.

1. Each module ships an `@AutoConfiguration` class guarded by `@ConditionalOnProperty`. It only contributes beans when its property says so.
2. That class is listed in the module jar's `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`. This is how Spring Boot finds it.
3. `AdharKitAutoConfiguration` builds the `AdharModuleAccess`, the module registry and the graceful-shutdown orchestrator. It is itself gated by `@ConditionalOnProperty(prefix = "adhar.kit", name = "enabled", matchIfMissing = true)`. Then `SpringAdharFacadeConfiguration` runs `@AutoConfigureAfter` it to produce the `AdharFacade` bean.

Optional pieces stay optional through classpath conditions, not configuration. The actuator endpoint is registered only when Actuator's `Endpoint` annotation is present. The Spring adapter is registered only when `SpringApplication` is.

On other frameworks, the host handles discovery: CDI on Quarkus and Helidon MP, `@Factory` on Micronaut, and a static bootstrap on Helidon SE and Vert.x. Outside a container, the kit falls back to the JDK `ServiceLoader`. It applies any `AdharFacadeCustomizer` registered under `META-INF/services/` once, when `getInstance()` creates the singleton.

## 5. Annotations and aspects

Most modules offer a declarative alternative to facade calls: an annotation, plus an AspectJ aspect that implements it. Both paths end in the same module facade, so you can safely mix them.

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

```diagram
kit-annotation-vs-facade
```

Choose annotations when the concern covers a whole method and you want it visible in the signature. Choose facade calls when it covers part of a method, needs a computed name, or has to be conditional.

Aspects need a proxy. So when an object calls its own method, the aspect is bypassed. Facade calls do not have this problem.

Some metrics are automatic either way. JVM, persistence, cache, messaging and HTTP metrics are collected without annotations. Use `@Measured` to opt in to method-level latency, count and error tracking.

## 6. Configuration precedence

Four things resolve in order. Configuration gets confusing when you read them as one flat namespace.

1. **`adhar.kit.enabled`** — the master switch for the starter's auto-configuration. If it is absent, the kit is enabled (`matchIfMissing = true`). If it is `false`, nothing below matters.
2. **`adhar.kit.modules.<id>`** — the gate. It decides whether a module's facade can exist at all. A gate that is off beats any amount of module configuration below it.
3. **`adhar.<module>.*`** — module settings, bound by `@ConfigurationProperties(prefix = "adhar.<module>")`. Examples: `adhar.security.jwt.secret`, `adhar.cache.ttl`, `adhar.ai.provider`.
4. **The host framework's source order** — which file or environment variable supplies a given key. The kit does not override this. Spring Boot's ordering applies unchanged: command line, then environment, then profile-specific YAML, then `application.yml`. Relaxed binding means `adhar.kit.modules.event-sourcing` and `ADHAR_KIT_MODULES_EVENTSOURCING` are the same key.

The `adhar-kit-config` module adds a fifth layer *inside* the application. `ConfigFacade` merges several `ConfigSource` implementations (file, environment, Kubernetes ConfigMap, Vault, Consul, Dapr) by numeric priority. **Higher priority overrides lower**, and the default is `100`. The kit handles this merge, separately from how the framework loaded `application.yml`.

## Inspecting what actually happened

Two checkpoints show the actual resolved state, not the intended one. At startup, the kit logs a banner listing the detected runtime and every enabled and disabled module. At runtime, with Spring Boot Actuator present:

```properties
management.endpoints.web.exposure.include=adhar
```

```text
GET /actuator/adhar          # version, counts, and every module's state
GET /actuator/adhar/{id}     # one module, e.g. /actuator/adhar/cache
```

## Testability

You can substitute test doubles at three levels.

- **Mock the whole facade.** `AdharFacade` is a plain class, so Mockito can mock it outright.
- **Override one sub-facade.** Every accessor has a matching setter. So `adhar.setMetrics(mock)` swaps one module on a real instance.
- **Register a customizer.** Implement `AdharFacadeCustomizer` as a Spring bean, or as a `ServiceLoader` provider on other frameworks. Spring beans are applied in declared order, right after the facade is created.

`AdharFacade.resetForTesting()` clears the process-wide singleton between tests. It is for tests only, and it races with concurrent `getInstance()` callers. Never call it from production code.

## Other conventions

- Packages are `com.adhar.kit.<module>.*`.
- Every event (domain, notification, analytics) uses the CloudEvents 1.0 envelope through `AdharCloudEvent`.
- Java 25 features (records, sealed interfaces, pattern matching, virtual threads) are used freely.
- Framework dependencies are `<optional>true</optional>`, so consumers pull in only the runtime they use.

## Next steps

- [Modules Overview](/adhar-kit/modules/overview) — the catalogue, now that you know what a module page is describing.
- [Framework Support](/adhar-kit/frameworks) — how the adapter layer implements the facade's framework neutrality.
- [Quick Start](/adhar-kit/quickstart) — put the model into a running service.
- [Building & Contributing](/adhar-kit/build) — the conventions a new module must follow.
