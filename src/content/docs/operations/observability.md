---
title: "Observability"
section: "Operations"
order: 1
path: "/docs/operations/observability"
---

# Observability

Adhar treats observability as a **first-class platform concern**. Every
service ships with traces, metrics, and structured logs the moment it's
created — no per-team setup.

## The three pillars

| Pillar | Pipeline | Backend (default) |
|--------|----------|-------------------|
| **Traces** | OpenTelemetry SDK → OTLP | Tempo |
| **Metrics** | Micrometer → Prometheus / OTLP | Prometheus + Mimir |
| **Logs** | SLF4J → JSON → stdout → Vector | Loki |

All three carry the same correlation IDs (`trace_id`, `span_id`,
`service.name`) so you can pivot between them in Grafana.

## Tracing

Every HTTP, JDBC, and Kafka call is instrumented automatically.

```java
@Traced("checkout.complete")
public Receipt checkout(Cart cart) {
    var payment = payments.charge(cart);
    var fulfilment = warehouse.reserve(cart);
    return new Receipt(payment, fulfilment);
}
```

The Kit emits one parent span (`checkout.complete`) and child spans for
every downstream call.

### Sampling

| Profile | Default sample rate |
|---------|---------------------|
| `dev` | 100% |
| `stage` | 25% |
| `prod` | 5% (always 100% for errors) |

Override per service:

```yaml
adhar:
  observability:
    sampling:
      ratio: 0.10
      always_sample_errors: true
```

## Metrics

Two flavours, both via Micrometer:

- **Platform metrics** — JVM, HTTP, DB pool, GC — emitted automatically.
- **Business metrics** — domain counters / gauges / timers you define.

```java
@Inject MetricRegistry metrics;

void onOrder(Order o) {
    metrics.counter("orders.placed", "region", o.region()).increment();
    metrics.timer("orders.fulfilment").record(o.fulfilmentDuration());
}
```

## Structured logging

Every log line is JSON with trace correlation:

```json
{
  "ts": "2026-05-23T10:14:22.114Z",
  "level": "INFO",
  "logger": "com.example.OrdersService",
  "msg": "order placed",
  "order_id": "o-7281",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7"
}
```

## SLOs

Define SLOs in `service.yaml`. The platform calculates burn rate and
opens an incident automatically when fast-burn thresholds are hit.

```yaml
slos:
  - name: availability
    objective: 99.9
    window: 30d
    indicator:
      type: http
      good: status < 500
      total: status > 0
  - name: latency
    objective: 99.0
    window: 7d
    indicator:
      type: http
      good: latency_p99 < 250ms
      total: status > 0
```

## Dashboards

Out of the box, every service gets:

- **RED dashboard** — Rate, Errors, Duration per endpoint
- **USE dashboard** — Utilisation, Saturation, Errors per resource
- **SLO dashboard** — Burn rate, error budget remaining

Custom dashboards live alongside the code in `dashboards/*.json` and are
versioned with the service.

## Further reading

- [Incident response](/docs/incident-response)
- [Monitoring & logging](/docs/monitoring-and-logging)
