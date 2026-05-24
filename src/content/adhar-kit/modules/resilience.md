---
title: "adhar-kit-resilience"
section: "Modules"
order: 6
path: "/adhar-kit/modules/resilience"
---

# adhar-kit-resilience

> Retries, circuit breakers, bulkheads, timeouts and rate-limits —
> declarative, observable, and tuned for production.

**Package:** `io.adhar.kit.resilience` · **Status:** stable · **Since:** 1.1

Built on **Resilience4j**, exposed as portable annotations so the same
declaration works on Spring, Quarkus, Micronaut, Helidon and Vert.x.

## Circuit-breaker state machine

```text
                   failure ratio ≥ threshold
        ┌────────┐ ───────────────────────▶ ┌────────┐
        │ CLOSED │                          │  OPEN  │
        │  ✓✓✓   │ ◀──────────────────────  │  ✗✗✗  │
        └────────┘   ratio < threshold      └────┬───┘
              ▲          (after probe)            │ wait-duration
              │                                   ▼
              │         probes succeed     ┌──────────────┐
              └────────────────────────────│  HALF_OPEN   │
                                           │   ?  ?  ?    │
                                           └──────────────┘
```

## Annotations

| Annotation | Effect |
|------------|--------|
| `@Retry(max=3, backoff="exp")` | Retry transient failures. |
| `@CircuitBreaker(name="billing")` | Fail-fast when downstream is unhealthy. |
| `@Bulkhead(max=20)` | Limit concurrent calls. |
| `@Timeout("2s")` | Cancel after the given duration. |
| `@RateLimit(rps=50)` | Reject above the throughput cap. |

## Example

```java
@CircuitBreaker(name = "billing", fallback = "fallback")
@Retry(max = 3, backoff = "exp", jitter = "100ms")
@Timeout("750ms")
Invoice charge(Order o) {
    return billing.charge(o);
}

Invoice fallback(Order o, Throwable t) {
    metrics.counter("billing.fallback").increment();
    return Invoice.pending(o.id());
}
```

## Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `adhar.resilience.cb.<name>.failure-rate` | `50%` | Trip threshold. |
| `adhar.resilience.cb.<name>.wait` | `30s` | Open-state cool-down. |
| `adhar.resilience.retry.<name>.max-attempts` | `3` | Per-policy override. |
| `adhar.resilience.bulkhead.<name>.max` | `25` | Concurrent calls cap. |

## Observability

Every policy emits metrics and trace events:

- `adhar.resilience.cb.state{name}` – gauge (0=closed, 1=open, 2=half)
- `adhar.resilience.retry.attempts{name}` – counter
- `adhar.resilience.bulkhead.queue{name}` – gauge

## See also

- [`CircuitBreaker`](/adhar-kit/javadoc/io.adhar.kit.resilience/CircuitBreaker)
- [Resilient client guide](/adhar-kit/guides/resilient-client)
