---
title: "Metrics"
section: "Modules"
order: 14
path: "/adhar-kit/modules/metrics"
---

# Metrics

`adhar-kit-metrics` puts Micrometer metrics into a service with little hand instrumentation: a per-request HTTP timer with a bounded `uri` tag, annotation-driven method meters, a programmatic `MetricsFacade`, SLO error-budget and burn-rate gauges, JVM and container gauges, and Prometheus and OTLP export defaults. Use it on any service that Prometheus scrapes, or that pushes metrics over OTLP, when you want RED metrics and SLOs without high-cardinality labels (too many distinct label values) filling the metrics backend.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-metrics` |
| Toggle | `adhar.metrics.enabled` (default `true`) removes the auto-configuration and the environment defaults. Facade gate `adhar.kit.modules.metrics` (default `true`); when it is `false`, `adhar.getMetrics()` throws `IllegalStateException` |
| Facade | `adhar.getMetrics()` → `MetricsFacade` (also `MetricsFacade.getInstance()`). Injectable beans: `SloRecorder`, `TagCardinalityLimiter`, `MetricsUtils`, `AdharMetrics`, `PlatformMetrics`, `HttpMetricsFilter` |
| Dependencies | Required: `adhar-kit-commons`, `micrometer-core`. Optional (add them yourself): `spring-boot-starter-actuator`, `spring-boot-starter-aspectj` (annotations), `spring-boot-starter-webmvc` (HTTP filter), `micrometer-registry-prometheus`, `micrometer-registry-otlp`, `opentelemetry-api` (trace ids and exemplars) |
| Frameworks | Spring Boot: full auto-configuration. Quarkus, Micronaut, Helidon, Vert.x: `MetricsFacade` adapters only |

## How it works

```diagram
nkc-metrics-http-path
```

- **HTTP.** `HttpMetricsFilter` records the timer `adhar.http.server.requests` (tags `method`, `status`, `outcome`, `uri`) in a `finally`, so failed requests are timed too; a request whose chain throws is tagged `status=500`. Spring Boot's own `http.server.requests` keeps running alongside it.
- **Bounded `uri`.** The tag is the Spring MVC handler pattern (`/api/orders/{id}`). Without one (no MVC, a 404, an error dispatch), all-digit and UUID segments become `{id}` and paths are cut at ten segments plus `/**`. `TagCardinalityLimiter` then admits the first `max-uri-tags` distinct values and maps every later one to `other`. The request is still counted.
- **Methods and code.** `EnhancedMetricsAspect` implements the annotations; `MetricsInterceptor` implements `@Measured` and `@MonitorPerformance` as `adhar.operation.*`. `MetricsFacade` records into Micrometer's `Metrics.globalRegistry`.
- **SLOs.** The filter calls `SloRecorder.recordHttp(uri, status < 500)` for every request.
- **Environment defaults.** At startup, at the lowest precedence (your own settings win), the module sets `management.metrics.tags.application` (`spring.application.name`, else `OTEL_SERVICE_NAME`) and `management.metrics.tags.environment`, a percentile histogram plus SLO buckets `50ms,100ms,250ms,500ms,1s,2s,5s` for `http.server.requests`, and `management.endpoints.web.exposure.include=health,info,prometheus`.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-metrics</artifactId>
    <version>0.1.0</version>
</dependency>
<!-- Optional dependencies are not transitive: add the ones you use. -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aspectj</artifactId>
</dependency>
```

Add `io.micrometer:micrometer-registry-otlp` as well if you push metrics over OTLP.

## Use it

### Programmatic meters, annotations and an SLO

```java
package com.example.orders;

import com.adhar.kit.metrics.MetricsFacade;
import com.adhar.kit.metrics.annotation.BusinessMetric;
import com.adhar.kit.metrics.annotation.Timed;
import com.adhar.kit.metrics.slo.SloRecorder;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final MetricsFacade metrics = MetricsFacade.getInstance();
    private final SloRecorder slo;

    public OrderService(SloRecorder slo) {
        this.slo = slo;
    }

    public String placeOrder(String region) {
        boolean ok = false;
        try {
            String id = metrics.recordTime("order.creation", () -> UUID.randomUUID().toString());
            metrics.increment("orders.created", "region", region); // a closed set, never an id
            ok = true;
            return id;
        } finally {
            slo.record("checkout", ok); // non-HTTP work: record it yourself
        }
    }

    @Timed(name = "inventory.check", percentiles = {0.5, 0.95, 0.99})
    public boolean inStock(String sku) {
        return !sku.isBlank();
    }

    // Counter adhar.business.order.value {category, outcome}; summary adhar.business.order.value.value
    @BusinessMetric(name = "order.value", category = "revenue")
    public BigDecimal orderValue(String orderId) {
        return BigDecimal.TEN;
    }
}
```

`MetricsFacade` methods: `counter(name, tags...)`, `timer(name, tags...)`, `gauge(name, supplier, tags...)`, `recordTime(name, supplier)`, `increment(name, tags...)`, `increment(name, amount, tags...)`. Tags are key/value pairs. `AdharMetrics` offers the same operations as static methods, plus builders.

### Annotations

| Annotation | Records | Default name |
|---|---|---|
| `@Timed` | Timer; `percentiles`, `successOnly` | `<simpleclassname lower-cased>.<method>` |
| `@Counted` | Counter; `recordFailures` adds `<name>.failures` | same |
| `@Gauged` | Gauge set from the numeric return value | same |
| `@Summary` / `@Histogram` | Distribution of the return value (or a `valueField`); `@Histogram` times the call by default | same |
| `@MonitorPerformance` | `<name>.duration`, `.total`, `.errors`, and `adhar.operation.*` | same |
| `@Measured` | `adhar.operation.duration` / `.count` / `.errors`, tagged `module`, `operation`, `class`, `method` | `<Class>.<method>` |
| `@BusinessMetric` | Counter `adhar.business.<name>` tagged `category`, `outcome`; with `recordValue` (default `true`) and a `Number` return value, a summary `adhar.business.<name>.value` | as `@Timed` |
| `@DatabaseMetrics` | `database.query.time`, `database.errors`, `database.slow_queries`, `database.rows` | — |
| `@ApiMetrics` | `api.request.time`, `api.requests`, `api.payload.size` | — |
| `@CacheMetrics` | `cache.hits` / `cache.misses` / `cache.requests`, `cache.load.time` | — |

The attribute is `name`, not `value`: write `@Timed(name = "x")`. `@Measured` is the exception (`@Measured("x")`).

### SLO targets

```yaml
adhar:
  metrics:
    slo:
      window-seconds: 3600
      targets:
        global: 0.99      # reserved: matches every HTTP request
        checkout: 0.999   # matches a uri equal to, ending in, or containing /checkout/
```

Each target gets two gauges, tagged `target` and `objective`: `adhar.slo.error_budget.remaining` (the share of the budget left, floored at 0) and `adhar.slo.burn_rate` (observed error rate ÷ allowed error rate). The window is split into 60 buckets. With no traffic they read `1.0` and `0.0`.

### OTLP push

With `micrometer-registry-otlp` on the classpath, the module maps the standard OpenTelemetry variables onto `management.otlp.metrics.export.*`:

| Variable | Becomes |
|---|---|
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, else `OTEL_EXPORTER_OTLP_ENDPOINT` + `/v1/metrics` | `url` |
| `OTEL_EXPORTER_OTLP_[METRICS_]HEADERS` | `headers[...]` |
| `OTEL_METRIC_EXPORT_INTERVAL` (ms) | `step` |

Export stays off when there is no endpoint, when `OTEL_METRICS_EXPORTER` does not name `otlp`, or when the protocol is `grpc` (Micrometer's registry speaks `http/protobuf` only). If you set `management.otlp.metrics.export.url` yourself, it is never switched off. Push suits short-lived pods, such as batch runs, that may end before a scrape.

## Configuration

All keys are under `adhar.metrics`.

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Master switch for the module |
| `common-tags` | map | empty | Extra tags applied to the registry |
| `environment` | string | resolved | The `environment` tag. Unset: `ADHAR_ENVIRONMENT`, then `deployment.environment[.name]` in `OTEL_RESOURCE_ATTRIBUTES` (except `local` inside a pod), then the pod namespace, then the first active profile other than `kubernetes`/`default`, then `local` |
| `web.enabled` | boolean | `true` | Register `HttpMetricsFilter` and the `uri` meter filter |
| `web.max-uri-tags` | int | `100` | Distinct `uri` values kept, for both HTTP timers |
| `web.record-request-size` / `web.record-response-size` | boolean | `true` | `false` denies `http.server.requests` meters with a `request.size` / `response.size` tag |
| `application.method-timing` | boolean | `true` | Register `EnhancedMetricsAspect` and `MetricsInterceptor` |
| `jvm.enabled` | boolean | `true` | `JvmMetricsCollector` (`adhar.jvm.*`, refreshed every 15 s) |
| `jvm.memory` / `gc` / `threads` / `class-loader` | boolean | `true` | Micrometer JVM binders |
| `system.processor` / `file-descriptor` / `uptime` / `disk-space` | boolean | `true` | Micrometer system binders (disk space for the working directory) |
| `slo.enabled` | boolean | `true` | Register `SloRecorder` |
| `slo.targets` | map&lt;string, double&gt; | empty | Availability objective per target |
| `slo.window-seconds` | long | `3600` | Rolling SLO window (minimum 1 s) |
| `kubernetes.enabled` | boolean | `false` | Register `KubernetesMetricsUtils` |
| `kubernetes.include-pod-info` / `include-namespace` / `include-node-info` | boolean | `true` | Tags that `KubernetesMetricsUtils` adds to the meters it records |
| `kubernetes.resource-polling.enabled` | boolean | `false` | Poll cgroup v1/v2 CPU and memory into `adhar.container.*`; idle when `/sys/fs/cgroup` is absent |
| `kubernetes.resource-polling.interval-seconds` | long | `15` | Poll interval |

> **Note:** The conditions behind `method-timing`, `class-loader`, `file-descriptor`, `disk-space`, `record-request-size` and `record-response-size` look up the camelCase name. To switch one off in YAML, write the key in camelCase, for example `adhar.metrics.application.methodTiming: false`, or set the environment variable (`ADHAR_METRICS_APPLICATION_METHODTIMING=false`).

## Operations

| Area | Meters |
|---|---|
| HTTP | `adhar.http.server.requests` (timer: `method`, `status`, `outcome`, `uri`) |
| SLO | `adhar.slo.error_budget.remaining`, `adhar.slo.burn_rate` |
| JVM | `adhar.jvm.memory.heap.*`, `adhar.jvm.memory.nonheap.*`, `adhar.jvm.threads.*`, `adhar.jvm.classes.*`, `adhar.jvm.cpu.*`, `adhar.jvm.file_descriptors.*`, `adhar.jvm.gc.pause`, next to Micrometer's `jvm.*` |
| Container | `adhar.container.cpu.limit.cores`, `.cpu.usage.cores`, `.memory.limit.bytes`, `.memory.usage.bytes` (NaN when unlimited or unknown) |
| Kubernetes (on call) | `kubernetes.deployment.*` and others, from `KubernetesMetricsUtils.record*` methods |
| Platform | `PlatformMetrics` families (`adhar.persistence.*`, `adhar.cache.*`, `adhar.messaging.*`, `adhar.resilience.*`, `adhar.http.request.*`, `adhar.ai.*`, `adhar.operation.*`), recorded only when code calls them. [Resilience](/adhar-kit/modules/resilience) does, through its bridge |

- **Endpoints.** `/actuator/prometheus` needs the actuator and the Prometheus registry on the classpath; the module exposes `health,info,prometheus` by default.
- **Trace correlation.** With `opentelemetry-api` present, the filter puts the current trace and span ids in the SLF4J MDC for the request, and with the Prometheus client a `SpanContext` bean adds exemplars to counters and histograms. Trace ids never become tags.
- **Dashboards.** The jar ships Grafana dashboards under `grafana/`: `http-red-dashboard.json`, `jvm-dashboard.json`, `slo-error-budget-dashboard.json`.
- **Failure behaviour.** Recording errors in the filter are caught and logged at WARN; metrics never fail a request. A broken meter is silent, so check the name in `/actuator/prometheus` before blaming export.

## Limits

- **Only `uri` is bounded.** A tag value you pass yourself (`increment("x", "customerId", id)`) is unbounded and every combination is a permanent series. Keep tags to closed sets; put ids in logs or spans.
- **The `uri` budget is first come, first served and never evicted.** Endpoints that appear after the first `max-uri-tags` values report as `uri="other"`. Slugs and base62 tokens are not normalised. At the limit, Boot's `http.server.requests` meter is denied (dropped), not relabelled.
- **Proxy-based AOP.** A self-call (`this.inStock(...)`) records nothing, and so does a missing `spring-boot-starter-aspectj`. Class-level `@Timed` / `@Counted` do nothing; annotate methods (`@Measured` and `@MonitorPerformance` do work on types).
- **`@MonitorPerformance` on a method records twice** (both aspects), and `EnhancedMetricsAspect` rethrows a checked exception wrapped in `RuntimeException`.
- **`@Timed(successOnly = true)`** never times a failing call.
- **SLO targets are fixed at startup.** `record("unknown", ...)` for a target that is not configured is a silent no-op.
- **Custom `common-tags` are applied after all singletons are created**, so meters registered during bean construction miss them. `application` and `environment` come from `management.metrics.tags.*` and are on every meter. Register your own meters lazily.
- **`MetricsFacade` uses the global registry.** In tests, counters accumulate across Spring contexts; assert deltas or inject `MeterRegistry`.
- **`kubernetes.enabled` does not tag every meter.** The pod, namespace and node tags apply only to meters recorded through `KubernetesMetricsUtils`.
- **Bound but not read:** `web.ignore-patterns` (actuator paths are still timed), `prometheus.*` (endpoint, step, descriptions), `open-telemetry.*` (use the OTLP variables above), `application.enabled` / `exception-counting` / `cache` / `database`, `system.enabled`, `kubernetes.custom-labels`.

## Next steps

- [Tracing](/adhar-kit/modules/tracing): spans, and span metrics in the same registry
- [Logging](/adhar-kit/modules/logging): the trace ids this module puts in the MDC
- [Resilience](/adhar-kit/modules/resilience): circuit-breaker state bridged into `PlatformMetrics`
- [Observability](/docs/operations/observability): Prometheus and Grafana on the platform
