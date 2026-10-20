---
title: "Resilience"
section: "Modules"
order: 17
path: "/adhar-kit/modules/resilience"
---

# Resilience

`adhar-kit-resilience` brings enterprise fault-tolerance patterns to any framework via Resilience4j. It covers circuit breaker, retry, rate limiter, bulkhead, and time limiter. You use them as annotations you can combine, with metrics, event logging, a health indicator, and an actuator endpoint.

The failure it prevents is the cascade: **one slow dependency fills your thread pool, and a problem in someone else's service becomes an outage in yours.**

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-resilience` |
| Built on | Resilience4j (all modules + Micrometer binding), Spring Cloud Circuit Breaker, `adhar-kit-metrics`, `adhar-kit-commons` |
| Entry points | `CircuitBreakerFacade`, the five annotations, `ResilienceEndpoint` |
| Auto-configuration | `ResilienceAutoConfiguration` (gated on `adhar.resilience.enabled`) |
| Actuator endpoint | `resilience` |
| Use it when | You call anything you do not control: an HTTP API, a broker, a database |

## The patterns

| Annotation | Protects against |
|---|---|
| `@CircuitBreaker` | A failing dependency dragging you down. Trips open after a failure threshold |
| `@Retry` | Transient failures. Retries with optional exponential backoff |
| `@RateLimit` | Overload. Caps calls per refresh period |
| `@Bulkhead` | Resource exhaustion. Limits concurrent calls |
| `@TimeLimiter` | Hung calls. Bounds execution time |

All five live in `com.adhar.kit.resilience.annotation` and target `METHOD` or `TYPE`. A class-level annotation applies to every method of that class. A method-level one on the same class wins, because annotation lookup checks the method first, then the declaring class, then the target class.

## How it works

A single `ResilienceAspect` handles all five annotations. It inspects the method and its declaring class. It then combines the Resilience4j decorators in one fixed order. So the method body runs exactly once per attempt, no matter how many annotations you stack.

```diagram
kit-resilience-order
```

### Why the nesting order matters

The aspect applies decorators from the inside out: bulkhead, then time limiter, then rate limiter, then circuit breaker, then retry. This makes **retry the outermost decorator and the bulkhead the innermost**. Read it from the outside in to see the effects:

- **Retry outside the circuit breaker.** Every retry attempt passes through the breaker and is counted by it. So a dependency that keeps failing trips the breaker, and later attempts fail fast with `CallNotPermittedException`. If you invert this, with the breaker outside retry, the breaker sees one "call" per three attempts. It then needs three times the traffic to notice anything is wrong, and each retry still pays the full timeout.
- **Rate limiter inside the breaker.** Only calls the breaker already allowed use up permits. So an open breaker does not burn your quota.
- **Time limiter inside the rate limiter.** The clock starts after a permit is acquired. Time spent waiting for a permit does not count against the call's deadline.
- **Bulkhead innermost.** A blocked call holds a permit for one attempt, not for the whole retry sequence. So concurrency is capped on real in-flight work.

There is one fallback for the whole chain, not one per annotation. When several annotations each set `fallbackMethod`, the aspect takes the first non-empty one in this order: `@Retry`, `@CircuitBreaker`, `@RateLimit`, `@TimeLimiter`, `@Bulkhead`.

### Configuration precedence runs the other way from what you might expect

Every entry you write under `adhar.resilience.circuit-breaker.*` (and the other four maps) becomes a named registry instance **eagerly at startup**, inside the registry `@Bean` method. Later, the aspect meets `@CircuitBreaker(name = "payment")` and asks the registry for `payment`. Resilience4j returns the instance that already exists, and the config built from the annotation is discarded. **A name configured in properties wins over the annotation's attributes.**

Annotation attributes use `-1` to mean "not set". If every numeric attribute is left at `-1`, the aspect uses the registry default as is. Otherwise it starts from the default config and overrides only what you set.

### Instances are cached per name, not per method

The aspect holds one `ConcurrentHashMap` per pattern, keyed by instance name and filled with `computeIfAbsent`. This has two effects:

- The first call fixes the configuration for the life of the process. Changing an annotation attribute at runtime has no effect.
- Two different methods annotated `@Retry(name = "inventory")` with *different* `maxAttempts` share one retry instance, from whichever was called first.

Give each distinct policy its own name.

### Sync and async take different paths

A method whose return type is assignable to `CompletionStage` (so `CompletableFuture` too) takes the asynchronous path. That path is built from the `decorateCompletionStage` variants. Everything else takes the synchronous path.

- **Async** uses a shared, static, daemon `ScheduledExecutorService` with **two threads** named `adhar-resilience-scheduler`. It serves both the non-blocking time limiter and retry backoff. It is created once per JVM and never shut down explicitly. Because these are daemon threads, they do not hold up exit.
- **Sync with `@TimeLimiter`** cannot interrupt a blocking call in place. So the aspect wraps the decorated supplier in `CompletableFuture.supplyAsync(...)` and waits for it with the timeout. That means **your method body runs on the common ForkJoinPool, not the caller's thread**. Anything in a `ThreadLocal`, such as the MDC, the Spring `SecurityContext` or a tenant id, is invisible inside the method unless you propagate it. Prefer the async path when thread-bound context matters.
- **Sync without `@TimeLimiter`** runs the body on the calling thread, so a `@Retry` backoff blocks that thread.

Checked exceptions are carried through the supplier chain in a private wrapper. They are unwrapped before the fallback runs or the failure is rethrown. So your declared exception type surfaces, not a `CompletionException`.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-resilience</artifactId>
    <version>0.1.0</version>
</dependency>
```

`ResilienceAutoConfiguration` carries `@EnableAspectJAutoProxy` and registers every bean with `@ConditionalOnMissingBean`. So your own `CircuitBreakerRegistry`, `ResilienceAspect` or `FallbackCache` replaces the built-in one.

> **Self-invocation silently disables every annotation on this page.** The aspect is a Spring AOP around-advice, which only fires on calls that go through the proxy. `this.process(request)` from inside the same class calls the raw method. You get no breaker, no retry, no timeout, no fallback, and no warning. Inject the bean into a collaborator and call it from there, or move the protected call into its own bean.

## A minimal circuit breaker, and the exact fallback signature

The fallback is found **by name, by reflection, on the target class and its superclasses**. The aspect scans `getDeclaredMethods()` on each class, up to but not including `Object`. The matching rule is:

1. Prefer a method with **exactly one parameter whose type is assignable from the thrown exception's class**. `Throwable` always matches. A narrower type such as `IOException` matches only when that is what was actually thrown.
2. Otherwise use the first method found with **zero parameters**.
3. If neither exists, the aspect raises `NoSuchMethodException`, which surfaces as `RuntimeException: Fallback method execution failed`.

So a fallback that copies the original method's parameter list is **never matched**. This is the single most common mistake with this module.

```java
import com.adhar.kit.resilience.annotation.CircuitBreaker;

@Service
public class PaymentService {

    @CircuitBreaker(name = "payment", fallbackMethod = "fallback")
    public PaymentResponse process(PaymentRequest request) {
        return externalGateway.process(request);
    }

    private PaymentResponse fallback(Throwable cause) {
        return PaymentResponse.failed("Service unavailable");
    }
}
```

The method may be `private`, because the aspect calls `setAccessible(true)`. It is invoked on the **raw target object**, not the proxy, so annotations on the fallback itself do nothing. The return type is never checked during lookup. So an incompatible one fails late, as a `ClassCastException` at the call site, not at startup.

## A complete example: a protected outbound client

This client combines bounded concurrency, a hard timeout, a few retries, and a breaker over the whole thing.

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

    private final InventoryHttpClient http;

    public InventoryClient(InventoryHttpClient http) {
        this.http = http;
    }

    @Retry(name = "inventory", maxAttempts = 3, waitDuration = 200)
    @CircuitBreaker(name = "inventory", fallbackMethod = "lastKnownGood",
                    failureRateThreshold = 50, minimumNumberOfCalls = 20)
    @TimeLimiter(name = "inventory", timeoutDuration = 2000)
    @Bulkhead(name = "inventory", maxConcurrentCalls = 20)
    public CompletableFuture<StockLevel> check(String sku) {
        return http.getStock(sku);   // must not block; the async path expects a future
    }

    // one Throwable parameter - NOT (String sku, Throwable cause)
    private CompletableFuture<StockLevel> lastKnownGood(Throwable cause) {
        return CompletableFuture.completedFuture(StockLevel.unknown());
    }
}
```

Numeric attributes here are milliseconds: `waitDuration = 200` is 200 ms, and `timeoutDuration = 2000` is two seconds. Durations in YAML are different. They are parsed as Spring `Duration` values, so `200ms` and `2s` are correct there. Because the method returns `CompletableFuture`, the time limiter does not block, and the retry backoff is scheduled rather than slept.

> **`@Bulkhead(type = THREADPOOL)` is not implemented.** The attribute exists. But the aspect only logs, at debug level, that thread-pool isolation was requested, and builds a **semaphore** bulkhead anyway. `maxConcurrentCalls` and `maxWaitDuration` are the only bulkhead settings that take effect. The `core-thread-pool-size`, `max-thread-pool-size`, `queue-capacity` and `keep-alive-duration` properties are bound, but the aspect does not use them.

### Serving a stale answer instead of none

Set `fallbackCache = true` on `@CircuitBreaker` or `@Retry` to record each successful result. When the call later fails, the last good result is served.

`FallbackCache` is an access-ordered `LinkedHashMap` behind a synchronized wrapper. It is bounded by `max-size` (default 1000), with a `ttl` (default 5 minutes). The key is the declaring class, the method name, and a deep hash of the arguments. A fallback *method* takes precedence over the cache, but successful results are still recorded in that case.

> `adhar.resilience.fallback-cache.enabled` does **not** gate the feature. The `FallbackCache` bean is always registered, so `fallbackCache = true` on an annotation works with the property left at its default. Setting the property to `true` applies the cache to **every** annotated method in the application, whether or not it asked for it.

### The facade shortcut

```java
return adhar.resilient("payment", () -> gateway.process(req), () -> queued(req));
return adhar.safe("payment", () -> gateway.process(req), () -> queued(req)); // + tracing
```

Both delegate to `CircuitBreakerService.executeWithFallback` and give you the circuit breaker only. You get no retry, rate limiter, bulkhead or time limiter.

`CircuitBreakerFacade.getInstance()` is deliberately unusable under Spring Boot. It throws `UnsupportedOperationException`, telling you to inject `SpringCircuitBreakerAdapter` instead. The static path cannot see the Spring-managed registry.

## Configuration

Configure each named instance separately. Every key below is a map entry under its pattern, keyed by instance name.

```yaml
adhar:
  resilience:
    circuit-breaker:
      payment:
        failure-rate-threshold: 50
        slow-call-rate-threshold: 100
        slow-call-duration-threshold: 60s
        sliding-window-size: 100
        minimum-number-of-calls: 10
        permitted-number-of-calls-in-half-open-state: 10
        wait-duration-in-open-state: 60s
        automatic-transition-from-open-to-half-open-enabled: true
    retry:
      order:
        max-attempts: 5
        wait-duration: 1s
        enable-exponential-backoff: true
        exponential-backoff-multiplier: 1.5
    rate-limiter:
      search:
        limit-for-period: 100
        limit-refresh-period: 1m
        timeout-duration: 5s
    bulkhead:
      report:
        max-concurrent-calls: 10
        max-wait-duration: 0ms
    time-limiter:
      data:
        timeout-duration: 5s
        cancel-running-future: true
```

Module-level switches:

| Property | Purpose | Default |
|---|---|---|
| `adhar.resilience.enabled` | Master switch | `true` |
| `adhar.resilience.metrics.enabled` | Export pattern metrics to Micrometer | `true` |
| `adhar.resilience.metrics.export-circuit-breaker-metrics` | Register `TaggedCircuitBreakerMetrics` (siblings exist for retry, rate limiter and bulkhead) | `true` |
| `adhar.resilience.metrics.bridge-to-platform-metrics` | Also publish through `adhar-kit-metrics` | `true` |
| `adhar.resilience.events.enabled` | Record state transitions via `ResilienceEventRecorder` | `true` |
| `adhar.resilience.endpoint.enabled` | Expose the `resilience` actuator endpoint | `true` |
| `adhar.resilience.health.enabled` | Register `CircuitBreakerHealthIndicator` | `true` |
| `adhar.resilience.health.critical-circuit-breakers` | Breakers whose OPEN state makes the app unhealthy | empty |
| `adhar.resilience.fallback-cache.enabled` | Apply the fallback cache to *every* annotated method | `false` |
| `adhar.resilience.fallback-cache.max-size` | Entries retained | `1000` |
| `adhar.resilience.fallback-cache.ttl` | How long a last-good result stays servable | `PT5M` |
| `adhar.resilience.chaos.enabled` | Register `ChaosPolicy` and inject latency or errors | `false` |

Registry defaults when nothing is specified:

- **Circuit breaker:** 50% failure rate, 100% slow-call rate over a 60s slow-call threshold, 100-call sliding window, minimum 10 calls, 10 permitted half-open calls, 60s open.
- **Retry:** 3 attempts at 500 ms.
- **Rate limiter:** 10 per second with a 5s acquire timeout.
- **Bulkhead:** 25 concurrent with a 0 ms wait.
- **Time limiter:** 1s with `cancelRunningFuture` on.

## How it behaves

- **Thread safety.** `ResilienceAspect` is a stateless singleton, apart from its five `ConcurrentHashMap` instance caches. The Resilience4j registries and instances are themselves thread-safe and designed to be shared. `FallbackCache` serialises all access through a synchronized map. It is correct under concurrency, but it is a single lock, so do not use it for high-frequency methods.
- **Lifecycle.** Named instances mentioned in properties exist from startup. Instances that exist only in annotations are created on their first intercepted call. So a breaker you have never exercised does not appear in `/actuator/resilience` yet. Nothing is drained at shutdown. The async scheduler threads are daemons, and in-flight `CompletableFuture`s are abandoned with the JVM.
- **Failure behaviour.** With no fallback and no usable cached value, the original exception is rethrown unchanged after unwrapping. If a fallback itself throws, it is wrapped in `RuntimeException("Fallback method execution failed")` with the real failure as the cause. The failure is logged at error level.
- **Resource bounds.** Sliding windows, the half-open permit count and the bulkhead semaphore are all fixed-size. `ResilienceEventRecorder` keeps `LongAdder` counters keyed by instance name. So its memory is bounded by the number of distinct instance names. That is why those names must come from a small, fixed set and never be built from request data.

## Observability

Resilience4j's own tagged Micrometer binders are registered when a `MeterRegistry` bean is present.

Separately, `ResiliencePlatformMetricsBridge` subscribes to registry events and forwards them into `adhar-kit-metrics`. It subscribes to `onEntryAdded` too, so instances created later are also covered. It forwards:

- breaker state transitions
- retry attempts (flagged once a retried call eventually succeeds)
- rate-limiter rejections
- bulkhead rejections and time-limiter timeouts, as zero-duration failed operations under the module name `resilience`

`CircuitBreakerHealthIndicator` reports each breaker's `state`, `critical` flag and `failureRate`. It reports DOWN, with an `openCriticalBreakers` detail, when any breaker named in `health.critical-circuit-breakers` is open.

```text
GET  /actuator/resilience
       -> circuitBreakers, retries, rateLimiters, bulkheads, events

POST /actuator/resilience/{name}
       -> {"name":"payment","result":"reset","state":"CLOSED"}
       -> {"name":"typo","result":"not-found"}   when the name is unknown
```

## Testing

- **Unit-test the policy, not the proxy.** Annotations do nothing on a plain `new PaymentService()`, so an aspect-level test needs a real context. Instantiate `ResilienceAspect` directly with purpose-built registries, or use a slice context that imports `ResilienceAutoConfiguration`.
- **Keep tests fast by shrinking the instance, not by sleeping.** Configure a test-only name under `adhar.resilience.*` with `minimum-number-of-calls: 2` and `wait-duration-in-open-state: 100ms`. Because properties beat annotations, this works without touching the production code.
- **Reset between tests.** Shared registries leak state across test methods. Call `reset()` on the breaker, or `POST /actuator/resilience/{name}`, in an `@AfterEach`.
- **Inject real faults.** Set `adhar.resilience.chaos.enabled: true` with `latency-enabled` or `error-enabled` and an `included-methods` list. This makes a named method slow or failing from configuration alone. The chaos policy is applied at the innermost point of the chain, so the decorators see it exactly as they would a real failure. For real network faults, `adhar-kit-test-commons` provides `ToxiproxyIntegrationTest` and `NetworkToxics` (`addLatency`, `addBandwidth`, `takeDown`, `bringUp`). They degrade a container's traffic while the test runs.
- **Assert on effects, not timings.** Count calls on a stubbed dependency to prove a retry happened, and assert `getState(name)` rather than measuring elapsed time.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `NoSuchMethodException` / `Fallback method execution failed` | The fallback mirrors the original parameter list | Give it exactly one `Throwable`-assignable parameter, or none |
| Annotation attributes are ignored | A property block already created that instance name at startup | Remove the YAML entry, or configure it there instead |
| Changing an attribute has no effect after startup | Instances are cached per name on first use | Use a distinct name, or configure via properties |
| Two methods share one policy unexpectedly | They use the same `name`, and the cache is keyed by name only | Give each distinct policy its own name |
| The breaker never opens | `minimum-number-of-calls` (default 10) has not been reached | Lower it, or send more traffic before judging |
| The annotation does nothing | Self-invocation bypasses the proxy | Call through an injected bean reference |
| MDC or security context is empty inside the method | Sync `@TimeLimiter` runs the body on the common ForkJoinPool | Return a `CompletableFuture` to take the async path, or propagate context explicitly |
| A timeout fires but the work keeps running | `cancel-running-future` was disabled, or the call ignores interrupts | Leave it at `true`, and set a transport-level timeout too |
| Thread-pool isolation seems to have no effect | `@Bulkhead(type = THREADPOOL)` falls back to semaphore isolation | Bound concurrency with `maxConcurrentCalls`, or manage your own pool |

## See also

- [Core](/adhar-kit/modules/core) — the lightweight `@Retry` when you need nothing more than backoff
- [Metrics](/adhar-kit/modules/metrics) — the registry these patterns report into
- [Health](/adhar-kit/modules/health) — where `CircuitBreakerHealthIndicator` surfaces
- [Messaging](/adhar-kit/modules/messaging) — consumers that need bulkheads and retry the most
