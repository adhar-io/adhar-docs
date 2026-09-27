---
title: "Resilience"
section: "Modules"
order: 17
path: "/adhar-kit/modules/resilience"
---

# Resilience

`adhar-kit-resilience` brings enterprise fault-tolerance patterns to any framework via Resilience4j: circuit breaker, retry, rate limiter, bulkhead, and time limiter — as composable annotations with metrics, event logging, and an actuator endpoint.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-resilience</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## The patterns

| Annotation | Protects against |
|---|---|
| `@CircuitBreaker` | A failing dependency dragging you down — trips open after a failure threshold |
| `@Retry` | Transient failures — retries with backoff |
| `@RateLimit` | Overload — caps calls per window |
| `@Bulkhead` | Resource exhaustion — limits concurrent calls |
| `@TimeLimiter` | Hung calls — bounds execution time |

They compose in a fixed, sensible order (outermost → innermost): **Retry → CircuitBreaker → RateLimiter → TimeLimiter → Bulkhead**.

## Usage

```java
@Service
public class PaymentService {

    @CircuitBreaker(name = "payment", fallbackMethod = "fallback")
    public PaymentResponse process(PaymentRequest request) {
        return externalGateway.process(request);
    }

    private PaymentResponse fallback(PaymentRequest request, Exception ex) {
        return PaymentResponse.failed("Service unavailable");
    }
}
```

Or via the facade shortcut, which combines resilience with tracing:

```java
return adhar.resilient("payment", () -> gateway.process(req), () -> queued(req));
return adhar.safe("payment", () -> gateway.process(req), () -> queued(req)); // + tracing
```

## Configuration

Configure per named instance (property config wins over annotation attributes):

```yaml
adhar:
  resilience:
    circuit-breaker:
      payment:
        failure-rate-threshold: 50
        sliding-window-size: 100
        minimum-number-of-calls: 10
        wait-duration-in-open-state: 60s
    retry:
      order:
        max-attempts: 5
        wait-duration: 1s
        enable-exponential-backoff: true
    rate-limiter:
      search:
        limit-for-period: 100
        limit-refresh-period: 1m
    bulkhead:
      report:
        max-concurrent-calls: 10
    time-limiter:
      data:
        timeout-duration: 5s
```

## Observability

Metrics for every pattern export to Micrometer; the actuator endpoint surfaces live state and lets you reset a breaker:

```text
GET  /actuator/resilience
POST /actuator/resilience/{name}     # reset a circuit breaker
```
