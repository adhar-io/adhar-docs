---
title: "Metrics"
section: "Modules"
order: 14
path: "/adhar-kit/modules/metrics"
---

# Metrics

`adhar-kit-metrics` is a framework-agnostic metrics layer on Micrometer: annotation-driven and programmatic collection, automatic HTTP request metrics, SLO/error-budget tracking, Prometheus/OpenTelemetry export, and Kubernetes-aware tagging.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-metrics</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

- `MetricsFacade` (`getInstance()`, `increment`, `recordTime`, `gauge`, `counter`)
- `AdharMetrics`, `MetricsUtils`, `KubernetesMetricsUtils`, `SloRecorder`, `HttpMetricsFilter`
- **Annotations** — `@Timed`, `@Counted`, `@Gauged`, `@Summary`, `@Histogram`, `@MonitorPerformance`, `@CacheMetrics`, `@DatabaseMetrics`, `@ApiMetrics`, `@BusinessMetric`

## Programmatic & annotation usage

```java
@Service
public class OrderService {
    private final MetricsFacade metrics = MetricsFacade.getInstance();

    public Order createOrder(OrderRequest request) {
        return metrics.recordTime("order.creation", () -> {
            Order order = process(request);
            metrics.increment("orders.created", "region", order.getRegion());
            return order;
        });
    }

    @Timed("inventory.check")     // or use the facade shortcut adhar.count(...)
    public boolean inStock(String sku) { ... }
}
```

## SLOs & error budgets

`SloRecorder` tracks success ratios against targets and exposes `adhar.slo.error_budget.remaining` and `adhar.slo.burn_rate` gauges — so you can alert on burn rate, not just raw errors:

```yaml
adhar:
  metrics:
    slo:
      enabled: true
      window-seconds: 3600
      targets:
        global: 0.99
        checkout: 0.999
```

## Export

```yaml
adhar:
  metrics:
    enabled: true
    common-tags:
      application: my-service
      environment: production
    prometheus:
      enabled: true
      endpoint: /actuator/prometheus
    open-telemetry:
      enabled: false
      endpoint: http://otel-collector:4318/v1/metrics
    web:
      enabled: true            # automatic adhar.http.server.requests timer
      max-uri-tags: 100
    kubernetes:
      enabled: true            # pod/namespace tags
```

On the [Adhar Platform](/docs), Prometheus scrapes these automatically and they appear in Grafana with no extra wiring.
