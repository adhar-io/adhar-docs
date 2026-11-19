---
title: "Resilience"
section: "Modules"
order: 17
path: "/adhar-kit/modules/resilience"
---

# Resilience

`adhar-kit-resilience` puts Resilience4j circuit breakers, retries, rate limiters, bulkheads and time limiters behind five annotations that you can stack on one method, and adds a fallback cache, fault injection, metrics, a health indicator and an actuator endpoint. Use it on any call to something you do not control (an HTTP API, a broker, a database), so that one slow dependency cannot fill your threads and turn its outage into yours.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-resilience` |
| Toggle | `adhar.resilience.enabled` (default `true`). Facade gate `adhar.kit.modules.resilience` (default `true`); when it is `false`, `adhar.getResilience()` throws `IllegalStateException` |
| Facade | `adhar.getResilience()` → `CircuitBreakerFacade` (circuit breaker only). Injectable beans: the five Resilience4j registries, `ResilienceAspect`, `FallbackCache`, `ResilienceEventRecorder`, `ResilienceMetricsService` |
| Dependencies | Required: `resilience4j-all`, `resilience4j-micrometer`, `micrometer-core`, `adhar-kit-commons`. Optional: `spring-boot-starter-aspectj` (needed for the annotations), `spring-boot-starter-actuator` (endpoint, health), `adhar-kit-metrics` (platform metrics bridge), `resilience4j-spring-boot3` |
| Frameworks | Spring Boot: `ResilienceAutoConfiguration` (annotations, registries, endpoint, health). Quarkus, Micronaut, Helidon, Vert.x: a `CircuitBreakerService` adapter only |

## How it works

```diagram
nkc-resilience-chain
```

- One around-advice, `ResilienceAspect`, handles all five annotations. It builds the chain in the fixed order shown, so the method body runs once per attempt however many annotations you stack.
- Retry sits outside the breaker, so every attempt is counted and a failing dependency trips the breaker quickly. The rate limiter sits inside the breaker, so an open breaker does not use up permits. The bulkhead holds its permit for one attempt, not the whole retry sequence.
- Each annotation has a `name`. Instances are created per name (in the registry and in a per-name cache in the aspect), so every method that uses the same name shares one policy.
- Methods that return a `CompletionStage` (including `CompletableFuture`) take the async path: non-blocking time limiter and scheduled retry backoff. Every other method takes the sync path.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-resilience</artifactId>
    <version>0.1.0</version>
</dependency>
<!-- The annotations are Spring AOP advice; AspectJ is an optional dependency of the module -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aspectj</artifactId>
</dependency>
<!-- Optional: /actuator/resilience and the circuit breaker health indicator -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Every bean is `@ConditionalOnMissingBean`, so your own `CircuitBreakerRegistry`, `ResilienceAspect` or `FallbackCache` replaces the built-in one.

## Use it

### Annotations

All five live in `com.adhar.kit.resilience.annotation` and target methods or types. The method-level annotation wins over the class-level one.

| Annotation | Protects against | Attributes (numbers are milliseconds; `-1` = use the registry config) |
|---|---|---|
| `@CircuitBreaker` | A failing dependency | `name`, `fallbackMethod`, `fallbackCache`, `failureRateThreshold`, `slowCallRateThreshold`, `slowCallDurationThreshold`, `slidingWindowSize`, `minimumNumberOfCalls`, `permittedNumberOfCallsInHalfOpenState`, `waitDurationInOpenState` |
| `@Retry` | Transient failures | `name`, `fallbackMethod`, `fallbackCache`, `maxAttempts`, `waitDuration` |
| `@RateLimit` | Overload | `name`, `fallbackMethod`, `limitForPeriod`, `limitRefreshPeriod`, `timeoutDuration` |
| `@Bulkhead` | Too many concurrent calls | `name`, `fallbackMethod`, `maxConcurrentCalls`, `maxWaitDuration`, `type` |
| `@TimeLimiter` | Hung calls | `name`, `fallbackMethod`, `timeoutDuration`, `cancelRunningFuture` (default `true`) |

`name` defaults to `"default"` on every annotation, so always set it.

```java
package com.example.inventory;

import com.adhar.kit.resilience.annotation.Bulkhead;
import com.adhar.kit.resilience.annotation.CircuitBreaker;
import com.adhar.kit.resilience.annotation.Retry;
import com.adhar.kit.resilience.annotation.TimeLimiter;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class InventoryClient {

    private final InventoryHttpClient http;   // your non-blocking HTTP client

    public InventoryClient(InventoryHttpClient http) {
        this.http = http;
    }

    @Retry(name = "inventory", maxAttempts = 3, waitDuration = 200)
    @CircuitBreaker(name = "inventory", fallbackMethod = "lastKnownGood", minimumNumberOfCalls = 20)
    @TimeLimiter(name = "inventory", timeoutDuration = 2000)
    @Bulkhead(name = "inventory", maxConcurrentCalls = 20)
    public CompletableFuture<StockLevel> check(String sku) {
        return http.getStock(sku);
    }

    // Exactly one Throwable-compatible parameter (or none) - not (String sku, Throwable cause)
    private CompletableFuture<StockLevel> lastKnownGood(Throwable cause) {
        return CompletableFuture.completedFuture(StockLevel.unknown());
    }
}
```

There is one fallback for the whole chain. When several annotations set `fallbackMethod`, the first non-empty one wins, in this order: `@Retry`, `@CircuitBreaker`, `@RateLimit`, `@TimeLimiter`, `@Bulkhead`.

### Fallback method rules

The aspect looks the fallback up by name, by reflection, on the target class and its superclasses:

1. A method with exactly one parameter whose type is assignable from the thrown exception (`Throwable` always matches).
2. Otherwise, the first method with zero parameters.
3. Otherwise, `RuntimeException("Fallback method execution failed")` with a `NoSuchMethodException` cause.

The fallback may be `private`. It is called on the raw target, not the proxy, so annotations on it do nothing. Its return type is not checked: a wrong type fails as a `ClassCastException` at the call site. On the async path, a non-future return value is wrapped in a completed future.

### Serve the last good result

Set `fallbackCache = true` on `@CircuitBreaker` or `@Retry`. Each successful result is stored in `FallbackCache`, keyed by declaring class, method name and a deep hash of the arguments. When the chain fails and there is no `fallbackMethod`, the cached value is returned (with a WARN log). A `fallbackMethod` always takes precedence, but successful results are still cached.

### Facade

```java
import com.adhar.kit.resilience.api.CircuitBreakerService;
import com.adhar.kit.starter.AdharFacade;

PaymentResult r = adhar.resilient("payment", () -> gateway.charge(req));           // breaker only
PaymentResult s = adhar.safe("payment", () -> gateway.charge(req), () -> queued(req)); // + tracing span
CircuitBreakerService.State state = adhar.getResilience().getState("payment");
adhar.getResilience().reset("payment");
```

`CircuitBreakerService` offers `execute`, `executeWithFallback`, `getState`, `getMetrics` and `reset`. It covers the circuit breaker only: no retry, rate limiter, bulkhead or time limiter. On Spring Boot the starter wires it from the `CircuitBreakerRegistry` bean, so it shares the breakers that the annotations and properties use. `CircuitBreakerFacade.getInstance()` on its own throws `UnsupportedOperationException` under Spring Boot; go through `AdharFacade`, or inject `CircuitBreakerRegistry`.

### Inject faults

With `adhar.resilience.chaos.enabled=true`, a `ChaosPolicy` bean adds latency and/or throws `ChaosPolicy.ChaosInjectedException` at the innermost point of the chain, so every decorator reacts as it would to a real fault.

```yaml
adhar:
  resilience:
    chaos:
      enabled: true
      latency-enabled: true
      min-latency-ms: 200
      max-latency-ms: 1500
      error-enabled: true
      error-probability: 0.2
      included-methods: [check]   # matched against the method name (equals or contains); empty = every annotated method
```

For tests, configure a test-only instance name with small values (for example `minimum-number-of-calls: 2`, `wait-duration-in-open-state: 100ms`); properties override annotation attributes. For network-level faults, `adhar-kit-test-commons` provides `ToxiproxyIntegrationTest` and `NetworkToxics`.

## Configuration

Named instances are map entries under each pattern, keyed by instance name. Durations use Spring `Duration` syntax (`500ms`, `2s`, `1m`).

```yaml
adhar:
  resilience:
    circuit-breaker:
      payment:
        failure-rate-threshold: 50
        minimum-number-of-calls: 20
        wait-duration-in-open-state: 30s
    retry:
      payment:
        max-attempts: 4
        wait-duration: 200ms
        enable-exponential-backoff: true
    health:
      critical-circuit-breakers: [payment]
```

Per instance (`adhar.resilience.<pattern>.<name>.*`):

| Property | Type | Default | Description |
|---|---|---|---|
| `circuit-breaker.<name>.failure-rate-threshold` | float | `50.0` | Failure percentage that opens the breaker |
| `circuit-breaker.<name>.slow-call-rate-threshold` | float | `100.0` | Slow-call percentage that opens the breaker |
| `circuit-breaker.<name>.slow-call-duration-threshold` | Duration | `60s` | Calls slower than this count as slow |
| `circuit-breaker.<name>.sliding-window-size` | int | `100` | Calls in the sliding window |
| `circuit-breaker.<name>.minimum-number-of-calls` | int | `10` | Calls before the failure rate is evaluated |
| `circuit-breaker.<name>.permitted-number-of-calls-in-half-open-state` | int | `10` | Trial calls in HALF_OPEN |
| `circuit-breaker.<name>.wait-duration-in-open-state` | Duration | `60s` | Time OPEN before HALF_OPEN |
| `circuit-breaker.<name>.automatic-transition-from-open-to-half-open-enabled` | boolean | `false` | Move to HALF_OPEN without waiting for a call |
| `retry.<name>.max-attempts` | int | `3` | Total attempts, including the first |
| `retry.<name>.wait-duration` | Duration | `500ms` | Wait between attempts (initial interval with backoff) |
| `retry.<name>.enable-exponential-backoff` | boolean | `false` | Multiply the wait after each attempt (no upper cap) |
| `retry.<name>.exponential-backoff-multiplier` | double | `1.5` | Backoff multiplier |
| `rate-limiter.<name>.limit-for-period` | int | `10` | Permits per refresh period |
| `rate-limiter.<name>.limit-refresh-period` | Duration | `1s` | Refresh period |
| `rate-limiter.<name>.timeout-duration` | Duration | `5s` | How long a caller waits for a permit |
| `bulkhead.<name>.max-concurrent-calls` | int | `25` | Concurrent calls allowed |
| `bulkhead.<name>.max-wait-duration` | Duration | `0ms` | How long a caller waits for a slot |
| `time-limiter.<name>.timeout-duration` | Duration | `1s` | Deadline per attempt |
| `time-limiter.<name>.cancel-running-future` | boolean | `true` | Cancel the future on timeout |

Names that appear only in annotations, and the `"default"` name, use the registry defaults, which equal the defaults above.

Module-wide (`adhar.resilience.*`):

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Turn the whole auto-configuration on or off |
| `metrics.enabled` | boolean | `true` | Register Resilience4j Micrometer binders and `ResilienceMetricsService` |
| `metrics.export-circuit-breaker-metrics` / `export-retry-metrics` / `export-rate-limiter-metrics` / `export-bulkhead-metrics` | boolean | `true` | Register each tagged binder (needs a `MeterRegistry` bean) |
| `metrics.bridge-to-platform-metrics` | boolean | `true` | Forward events to `adhar-kit-metrics` `PlatformMetrics` (when that module and bean are present) |
| `events.enabled` | boolean | `true` | Register `ResilienceEventRecorder` and WARN-level event logging |
| `endpoint.enabled` | boolean | `true` | Register the `resilience` actuator endpoint (Actuator on the classpath) |
| `health.enabled` | boolean | `true` | Register `CircuitBreakerHealthIndicator` |
| `health.critical-circuit-breakers` | list | empty | Breakers whose OPEN state reports DOWN. **Empty means every breaker is critical** |
| `fallback-cache.enabled` | boolean | `false` | Apply the fallback cache to **every** annotated method. The cache bean exists either way, so per-method `fallbackCache = true` works without it |
| `fallback-cache.max-size` | int | `1000` | Entries kept (least recently used evicted) |
| `fallback-cache.ttl` | Duration | `5m` | How long a result stays servable; zero or negative = no expiry |
| `chaos.enabled` | boolean | `false` | Register `ChaosPolicy` |
| `chaos.latency-enabled` / `chaos.min-latency-ms` / `chaos.max-latency-ms` | boolean / long / long | `false` / `0` / `0` | Random delay in `[min, max]` ms |
| `chaos.error-enabled` / `chaos.error-probability` | boolean / double | `false` / `0.0` | Throw on this fraction of calls |
| `chaos.included-methods` | list | empty | Method names to affect; empty = all |

## Operations

**Metrics.** With a `MeterRegistry` bean, the Resilience4j tagged binders publish their standard `resilience4j.*` meters for circuit breakers, retries, rate limiters and bulkheads. With `adhar-kit-metrics`, the bridge also records:

| Meter | Tags | Recorded on |
|---|---|---|
| `adhar.resilience.circuit_breaker.<name>` (gauge) | — | Breaker state as a number |
| `adhar.resilience.circuit_breaker.transitions` | `name`, `state` | Every state transition |
| `adhar.resilience.retry.attempts` | `name`, `attempt`, `success` | Each retry, and a success after retries |
| `adhar.resilience.rate_limit.rejected` | `name` | Each rejected permit |
| `adhar.operation.count` / `.errors` / `.duration` | `module=resilience`, `operation=bulkhead.<name>.rejected` or `timeLimiter.<name>.timeout` | Bulkhead rejections, time-limiter timeouts |

Instances created later (from annotations) are covered too: the listeners subscribe to registry `onEntryAdded`.

**Health.** `CircuitBreakerHealthIndicator` (bean `resilienceCircuitBreakers`) reports each breaker's `state`, `critical` and `failureRate`, plus `openCriticalBreakers`. It is DOWN when any critical breaker is OPEN or FORCED_OPEN. Because an empty `critical-circuit-breakers` list makes every breaker critical, one open breaker on a non-essential dependency turns the whole health check DOWN until you list the ones that matter.

**Endpoint.** Expose it with `management.endpoints.web.exposure.include=resilience`.

```text
GET  /actuator/resilience          -> circuitBreakers, retries, rateLimiters, bulkheads, events
POST /actuator/resilience/{name}   -> {"name":"payment","result":"reset","state":"CLOSED"}
                                      {"name":"typo","result":"not-found"}
```

**Failure behaviour.**

- With no fallback and no cached value, the original exception is rethrown, unwrapped from `CompletionException`/`ExecutionException`. An open breaker throws `CallNotPermittedException`; a timeout throws `TimeoutException`.
- A fallback that throws surfaces as `RuntimeException("Fallback method execution failed")` with the real failure as the cause, logged at ERROR.
- Breaker transitions, retries and rejections are logged at WARN as `resilience.event type=...` while `events.enabled` is on.
- Instances defined in properties exist from startup. Instances defined only by annotations appear (in the endpoint, health and metrics) after their first call.

## Limits

- **Self-invocation bypasses everything.** The annotations are Spring AOP advice, so `this.process(...)` inside the same class gets no breaker, retry, timeout or fallback, and no warning. Call through another bean.
- **Properties beat annotation attributes.** A name configured under `adhar.resilience.*` is created at startup; the annotation's attributes for that name are ignored.
- **One policy per name.** The first call fixes the configuration for that name. Two methods with `@Retry(name = "inventory")` and different `maxAttempts` share whichever was created first.
- **Sync `@TimeLimiter` changes threads.** On the sync path the body runs via `CompletableFuture.supplyAsync` on the common ForkJoinPool, so `ThreadLocal` state (MDC, `SecurityContext`, tenant id) is not visible inside it. Return a `CompletableFuture` when that matters.
- **A timeout does not stop the work.** Cancelling a `CompletableFuture` does not interrupt the thread running it, so timed-out work keeps running. Set a timeout on the client or transport as well.
- **`@Bulkhead(type = THREADPOOL)` is not implemented.** The aspect always builds a semaphore bulkhead.
- **Bound but unused properties:** `bulkhead.<name>.core-thread-pool-size`, `max-thread-pool-size`, `queue-capacity`, `keep-alive-duration`; `retry.<name>.max-wait-duration`, `enable-randomized-wait`; `circuit-breaker.<name>.record-exceptions`; `metrics.export-time-limiter-metrics`.
- **Exponential backoff has no annotation attribute.** Enable it per name in properties.
- **The facade fallback hides failures from the breaker.** `executeWithFallback` (behind `adhar.resilient(name, op, fallback)` and `adhar.safe`) catches the exception inside the breaker, so the breaker records a success and does not open from those failures. If the breaker is already open, the call throws `CallNotPermittedException` instead of running the fallback. Use `@CircuitBreaker(fallbackMethod = ...)` when you need the breaker to trip.
- **`FallbackCache` is one synchronized map**, in memory, per instance. Avoid it on very high-frequency methods.
- **Use fixed instance names.** Event counters and meters are kept per name; never build names from request data.
- **Other runtimes get the circuit breaker only.** The Quarkus, Micronaut, Helidon and Vert.x adapters each build their own registry (largely Resilience4j defaults); annotations, `adhar.resilience.*` instances, the endpoint and health are Spring Boot only.
- If `resilience4j-spring-boot3` is on the classpath, the module also activates Resilience4j's own annotation aspects (`io.github.resilience4j.*.annotation.*`). Use one annotation family per method.

## Next steps

- [Core](/adhar-kit/modules/core) — the lightweight `@Retry` and `RetryUtil` when backoff is all you need
- [Metrics](/adhar-kit/modules/metrics) — where `PlatformMetrics` and the `adhar.resilience.*` meters come from
- [Health](/adhar-kit/modules/health) — the kit's health checks, alongside `CircuitBreakerHealthIndicator`
- [Concepts](/adhar-kit/concepts) — module toggles, auto-configuration and the facade
