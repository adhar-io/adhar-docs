---
title: "Metrics"
section: "Modules"
order: 14
path: "/adhar-kit/modules/metrics"
---

# Metrics

`adhar-kit-metrics` is a framework-agnostic metrics layer on Micrometer: annotation-driven and programmatic collection, automatic HTTP request metrics, SLO/error-budget tracking, Prometheus/OpenTelemetry export, and Kubernetes-aware tagging. It solves two problems at once — **getting useful numbers out of a service without instrumenting every method by hand, and keeping those numbers from blowing up Prometheus** through unbounded label cardinality.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-metrics` |
| Built on | Micrometer (core + Prometheus registry), OpenTelemetry SDK metrics, Fabric8 Kubernetes client, `adhar-kit-commons` |
| Entry points | `MetricsFacade`, `AdharMetrics`, `MetricsUtils`, `SloRecorder`, `HttpMetricsFilter` |
| Auto-configuration | `AdharMetricsAutoConfiguration` (gated on `adhar.metrics.enabled`) |
| Frameworks | Spring, Quarkus, Micronaut, Helidon, Vert.x adapters |
| Use it when | You need RED metrics, SLOs, and JVM/system telemetry on a Prometheus-scraped service |

## How it works

Everything lands in one Micrometer `MeterRegistry`. The module contributes to that registry from four directions, then bounds what comes out of it.

```text
  Sources                                 Registry            Export
  --------------------------------        --------            ------
  @Timed / @Counted / @Gauged ...  -->  |          |
      (EnhancedMetricsAspect)          |          |
                                       |  Meter   |--> /actuator/prometheus
  MetricsFacade.increment/recordTime-->|  Registry|
                                       |          |--> OTLP collector (opt-in)
  HttpMetricsFilter                    |          |
   adhar.http.server.requests      --> |          |
                                       +----+-----+
  JVM / system / cgroup collectors --> |    |
                                            |
                  MeterFilters:  common tags (application, environment,
                                 pod, namespace) + TagCardinalityLimiter
                                 capping `uri` at max-uri-tags
                                            |
                                    SloRecorder reads HTTP outcomes
                                    -> adhar.slo.error_budget.remaining
                                    -> adhar.slo.burn_rate
```

The cardinality limiter matters more than it sounds. `HttpMetricsFilter` derives the `uri` tag from the best-matching handler pattern when one is available, and otherwise normalizes numeric and UUID path segments to `{id}`; the limiter then caps the number of distinct values at `max-uri-tags`. Without that, one crawler hitting `/orders/<random>` mints a new time series per request.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-metrics</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`MetricsFacade`** — the programmatic entry point (`getInstance()`): `counter(name, tags)`, `timer(name, tags)`, `gauge(name, supplier, tags)`, `recordTime(name, supplier)`, `increment(name, tags)`, `increment(name, amount, tags)`. Reachable as `AdharFacade.getMetrics()`.
- **`AdharMetrics` / `MetricsUtils`** — lower-level helpers over the registry for building and looking up meters.
- **`KubernetesMetricsUtils`** — adds pod, namespace, and node tags; `CgroupMetricsPoller` reads container CPU and memory limits from the cgroup filesystem.
- **`SloRecorder`** — `record(target, success)`, `recordHttp(uri, success)`, `errorBudgetRemaining(target)`, `burnRate(target)`, `getObjectives()`.
- **`HttpMetricsFilter`** — the per-request timer; also feeds the `SloRecorder`.
- **`TagCardinalityLimiter`** — the bound on distinct tag values.
- **Annotations** — `@Timed`, `@Counted`, `@Gauged`, `@Summary`, `@Histogram`, `@MonitorPerformance`, `@CacheMetrics`, `@DatabaseMetrics`, `@ApiMetrics`, `@BusinessMetric`.

## A minimal measurement

```java
import com.adhar.kit.metrics.MetricsFacade;

MetricsFacade metrics = MetricsFacade.getInstance();
metrics.increment("orders.created", "region", "eu-west-1");
```

## A realistic service

Programmatic timing where you need the scope explicit, annotations where you do not:

```java
import com.adhar.kit.metrics.MetricsFacade;
import com.adhar.kit.metrics.annotation.BusinessMetric;
import com.adhar.kit.metrics.annotation.Timed;

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

    @Timed(name = "inventory.check", percentiles = {0.5, 0.95, 0.99})
    public boolean inStock(String sku) {
        return inventory.available(sku) > 0;
    }

    @BusinessMetric(name = "order.value", category = "revenue", recordValue = true)
    public BigDecimal totalValue(Order order) {
        return order.total();
    }
}
```

Every annotation is handled by `EnhancedMetricsAspect`, a proxy-based aspect registered when `adhar.metrics.application.method-timing` is true (the default). Note that `@Timed` and `@Counted` take `name = "..."` — there is no implicit `value` attribute — plus `description`, `tags`, `successOnly`, and `autoRegister`.

## SLOs and error budgets

`SloRecorder` tracks a rolling success ratio per target against a configured availability objective, and publishes two gauges: `adhar.slo.error_budget.remaining` (the fraction of the budget still unspent) and `adhar.slo.burn_rate` (observed error rate divided by the allowed rate). Alerting on burn rate catches a bad deploy in minutes; alerting on raw error count does not.

```yaml
adhar:
  metrics:
    slo:
      enabled: true
      window-seconds: 3600
      targets:
        global: 0.99        # the reserved name applied to all traffic
        checkout: 0.999
```

`HttpMetricsFilter` feeds it automatically, counting any response below 500 as a success. Call `record("checkout", ok)` yourself for non-HTTP work.

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
      step: PT1M
    open-telemetry:
      enabled: false
      endpoint: http://otel-collector:4318/v1/metrics
    web:
      enabled: true            # the adhar.http.server.requests timer
      max-uri-tags: 100
      ignore-patterns: ["/actuator/**", "/health/**", "/info/**"]
    kubernetes:
      enabled: true            # pod / namespace / node tags
```

On the [Adhar Platform](/docs), Prometheus scrapes these automatically and they appear in Grafana with no extra wiring.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.metrics.enabled` | Master switch | `true` |
| `adhar.metrics.common-tags` | Tags added to every meter | empty |
| `adhar.metrics.prometheus.enabled` | Prometheus registry post-processing | `true` |
| `adhar.metrics.prometheus.endpoint` | Scrape path | `/actuator/prometheus` |
| `adhar.metrics.open-telemetry.enabled` | OTLP metric export | `false` |
| `adhar.metrics.open-telemetry.endpoint` | OTLP HTTP endpoint | `http://localhost:4318/v1/metrics` |
| `adhar.metrics.web.enabled` | Register `HttpMetricsFilter` | `true` |
| `adhar.metrics.web.max-uri-tags` | Distinct `uri` values retained | `100` |
| `adhar.metrics.application.method-timing` | Register `EnhancedMetricsAspect` | `true` |
| `adhar.metrics.jvm.enabled` | JVM collectors (memory, gc, threads, class loader) | `true` |
| `adhar.metrics.system.enabled` | Processor, file descriptor, uptime, disk space | `true` |
| `adhar.metrics.kubernetes.enabled` | Pod / namespace / node tags | `false` |
| `adhar.metrics.kubernetes.resource-polling.enabled` | Poll cgroup CPU/memory limits | `false` |
| `adhar.metrics.slo.enabled` | Register `SloRecorder` | `true` |
| `adhar.metrics.slo.window-seconds` | Rolling SLO window | `3600` |

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `@Timed("name")` does not compile | The attribute is `name`, not `value` | Write `@Timed(name = "name")` |
| Annotations produce no meters | Self-invocation, or `method-timing` disabled | Call through the proxy; check `adhar.metrics.application.method-timing` |
| Prometheus memory climbs steadily | High-cardinality tags such as a user or order id | Keep ids out of tags; `max-uri-tags` only bounds `uri` |
| `uri` shows up as `{id}` everywhere | No handler pattern was available, so the path was normalized | Expected outside Spring MVC; the raw path is intentionally not used |
| Error budget stays at 1.0 | No target configured for that name and no `global` target set | Add it under `adhar.metrics.slo.targets` |

## See also

- [Logging](/adhar-kit/modules/logging) — the same requests, as structured events
- [Tracing](/adhar-kit/modules/tracing) — exemplars link a latency spike to a specific trace
- [Resilience](/adhar-kit/modules/resilience) — bridges circuit-breaker state into this registry
- [Observability](/docs/operations/observability) — Prometheus and Grafana on the platform
