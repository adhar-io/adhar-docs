---
title: "Resilience"
section: "Modules"
order: 17
path: "/adhar-kit/modules/resilience"
---

# Resilience

`adhar-kit-resilience` brings enterprise fault-tolerance patterns to any framework via Resilience4j: circuit breaker, retry, rate limiter, bulkhead, and time limiter — as composable annotations with metrics, event logging, a health indicator, and an actuator endpoint. The failure mode it prevents is the cascade: **one slow dependency fills your thread pool, and a problem in someone else's service becomes an outage in yours.**

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-resilience` |
| Built on | Resilience4j (all modules + Micrometer binding), Spring Cloud Circuit Breaker, `adhar-kit-metrics`, `adhar-kit-commons` |
| Entry points | `CircuitBreakerFacade`, the five annotations, `ResilienceEndpoint` |
| Auto-configuration | `ResilienceAutoConfiguration` (gated on `adhar.resilience.enabled`) |
| Actuator endpoint | `resilience` |
| Use it when | You call anything you do not control — an HTTP API, a broker, a database |

## The patterns

| Annotation | Protects against |
|---|---|
| `@CircuitBreaker` | A failing dependency dragging you down — trips open after a failure threshold |
| `@Retry` | Transient failures — retries with optional exponential backoff |
| `@RateLimit` | Overload — caps calls per refresh period |
| `@Bulkhead` | Resource exhaustion — limits concurrent calls (`SEMAPHORE` or `THREADPOOL`) |
| `@TimeLimiter` | Hung calls — bounds execution time |

## How it works

A single `ResilienceAspect` handles all five annotations. It inspects the method and its declaring class, then composes the Resilience4j decorators in one fixed order, so the method body runs exactly once per attempt no matter how many annotations you stack.

```text
  caller
    |
    v
  Retry              <- outermost: re-attempts the whole chain below
    |
  CircuitBreaker     <- counts the outcome of each attempt
    |
  RateLimiter        <- admission control
    |
  TimeLimiter        <- bounds one attempt
    |
  Bulkhead           <- innermost: concurrency cap
    |
    v
  your method  ----(throws)----> fallbackMethod, else FallbackCache,
                                 else the exception propagates
```

The ordering is deliberate. Retry outside the circuit breaker means each retry is a counted attempt, so a persistently failing dependency trips the breaker instead of being hammered; the bulkhead innermost means a blocked call holds a permit, not a retry slot.

**Configuration precedence runs the other way from what you might expect.** A named instance is created on first use from the annotation's explicitly set attributes (`-1` means "inherit the registry default"), but a name already configured through `adhar.resilience.*` properties wins over the annotation. Instances are cached per name, so the first caller fixes the configuration for the life of the process.

Methods returning `CompletionStage` or `CompletableFuture` take the asynchronous decorator path, including a non-blocking time limiter; everything else uses the synchronous path.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-resilience</artifactId>
    <version>0.1.0</version>
</dependency>
```

## A minimal circuit breaker

The fallback method is resolved by name on the target class (and its superclasses). It must take **either one parameter assignable from the thrown `Throwable`, or no parameters at all** — it does not mirror the original signature:

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

## Stacking the patterns

A realistic outbound call: bounded concurrency, a hard timeout, a few retries, and a breaker over the whole thing.

```java
import com.adhar.kit.resilience.annotation.Bulkhead;
import com.adhar.kit.resilience.annotation.CircuitBreaker;
import com.adhar.kit.resilience.annotation.Retry;
import com.adhar.kit.resilience.annotation.TimeLimiter;

@Service
public class InventoryClient {

    @Retry(name = "inventory", maxAttempts = 3, waitDuration = 200)
    @CircuitBreaker(name = "inventory", fallbackMethod = "lastKnownGood",
                    failureRateThreshold = 50, minimumNumberOfCalls = 20)
    @TimeLimiter(name = "inventory", timeoutDuration = 2000)
    @Bulkhead(name = "inventory", maxConcurrentCalls = 20, type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<StockLevel> check(String sku) {
        return http.getStock(sku);
    }

    private CompletableFuture<StockLevel> lastKnownGood(Throwable cause) {
        return CompletableFuture.completedFuture(StockLevel.unknown());
    }
}
```

Setting `fallbackCache = true` on `@CircuitBreaker` or `@Retry` instead serves the last successful result from `FallbackCache` when the call fails — useful when a stale answer beats no answer.

Or via the facade shortcut, which combines resilience with tracing and metrics:

```java
return adhar.resilient("payment", () -> gateway.process(req), () -> queued(req));
return adhar.safe("payment", () -> gateway.process(req), () -> queued(req)); // + tracing
```

## Configuration

Configure per named instance. Every key below is a map entry under its pattern, keyed by instance name.

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
| `adhar.resilience.metrics.bridge-to-platform-metrics` | Also publish through `adhar-kit-metrics` | `true` |
| `adhar.resilience.events.enabled` | Record state transitions via `ResilienceEventRecorder` | `true` |
| `adhar.resilience.endpoint.enabled` | Expose the `resilience` actuator endpoint | `true` |
| `adhar.resilience.health.enabled` | Register `CircuitBreakerHealthIndicator` | `true` |
| `adhar.resilience.health.critical-circuit-breakers` | Breakers whose OPEN state makes the app unhealthy | empty |
| `adhar.resilience.fallback-cache.enabled` | Enable `FallbackCache` for `fallbackCache = true` | `false` |
| `adhar.resilience.fallback-cache.ttl` | How long a last-good result stays servable | `PT5M` |
| `adhar.resilience.chaos.enabled` | Inject latency or errors for fault-injection testing | `false` |

Pattern defaults when nothing is specified: circuit breaker 50% failure rate over a 100-call window with a minimum of 10 calls and 60s open; retry 3 attempts at 500ms; rate limiter 10 per second; bulkhead 25 concurrent; time limiter 1s.

## Observability

Metrics for every pattern export to Micrometer, `CircuitBreakerHealthIndicator` reports critical breakers through the health endpoint, and the actuator endpoint surfaces live state:

```text
GET  /actuator/resilience
       -> circuitBreakers, retries, rateLimiters, bulkheads, events

POST /actuator/resilience/{name}
       -> resets that circuit breaker to CLOSED and clears its metrics
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `NoSuchMethodException` for the fallback | The fallback mirrors the original signature | Give it one `Throwable` parameter, or none |
| Annotation attributes are ignored | A property block already configured that instance name | Remove the YAML entry, or configure it there instead |
| Changing an attribute has no effect after startup | Instances are cached per name on first use | Use a distinct name, or configure via properties |
| The breaker never opens | `minimum-number-of-calls` (default 10) has not been reached | Lower it, or send more traffic before judging |
| The annotation does nothing | Self-invocation bypasses the proxy | Call through an injected bean reference |
| A timeout fires but the work keeps running | `cancel-running-future` was disabled | Leave it at `true` for `CompletableFuture` methods |

## See also

- [Core](/adhar-kit/modules/core) — the lightweight `@Retry` when you need nothing more than backoff
- [Metrics](/adhar-kit/modules/metrics) — the registry these patterns report into
- [Health](/adhar-kit/modules/health) — where `CircuitBreakerHealthIndicator` surfaces
- [Messaging](/adhar-kit/modules/messaging) — consumers that need bulkheads and retry the most
