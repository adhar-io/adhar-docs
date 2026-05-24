---
title: "adhar-kit-observability"
section: "Modules"
order: 5
path: "/adhar-kit/modules/observability"
---

# adhar-kit-observability

> OpenTelemetry, Micrometer and structured logging — wired into every
> Adhar Kit application by default.

**Package:** `io.adhar.kit.observability` · **Status:** stable · **Since:** 1.0

## The three pillars

```text
 ┌──────────┐   ┌──────────┐   ┌──────────┐
 │  Traces  │   │  Metrics │   │   Logs   │
 │  (OTel)  │   │ (Micro-  │   │ (JSON,   │
 │          │   │  meter)  │   │  ECS)    │
 └────┬─────┘   └────┬─────┘   └────┬─────┘
      │ OTLP/gRPC    │ Prometheus    │ Loki / stdout
      ▼              ▼               ▼
   Tempo /        Prometheus /    Loki /
   Jaeger         Datadog         Datadog
```

All three pillars share the same **trace_id / span_id** so jumping from
a log line to a trace to a metric panel is one click.

## Features

- Zero-config OTel SDK with OTLP exporter
- HTTP, JDBC, Kafka, gRPC instrumentations auto-installed
- `@Traced` annotation for ad-hoc spans
- `@Timed`, `@Counted` for method-level metrics
- Structured JSON logging (ECS-compatible) with trace correlation
- Sampling strategies: parent-based, ratio, rate-limiting

## Annotations

```java
@Traced("order.create")
@Timed("orders.create.latency")
Order create(CreateOrder cmd) {
    return repo.save(map(cmd));
}
```

## Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `adhar.otel.exporter` | `otlp` | `otlp`, `jaeger`, `zipkin`, `none`. |
| `adhar.otel.endpoint` | `http://localhost:4317` | OTLP collector. |
| `adhar.otel.sample.ratio` | `0.1` | Head-based sampling ratio. |
| `adhar.metrics.export` | `prometheus` | `prometheus`, `otlp`, `statsd`. |
| `adhar.logs.format` | `json` | `json` or `text`. |

## Built-in metrics

| Metric | Tags | Description |
|--------|------|-------------|
| `adhar.http.server.requests` | method, route, status | HTTP request count. |
| `adhar.http.server.duration` | method, route | Histogram in ms. |
| `adhar.db.query.duration` | query | JDBC/JPA timings. |
| `adhar.messaging.consume.duration` | topic, group | Listener timing. |
| `adhar.jvm.*` | — | Standard JVM gauges. |

## See also

- [`Traced`](/adhar-kit/javadoc/io.adhar.kit.observability/Traced)
- [Distributed tracing guide](/adhar-kit/guides/distributed-tracing)
