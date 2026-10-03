---
title: "Metrics"
section: "Modules"
order: 14
path: "/adhar-kit/modules/metrics"
---

# Metrics

`adhar-kit-metrics` is a framework-agnostic metrics layer on Micrometer: annotation-driven and programmatic collection, automatic HTTP request metrics, SLO/error-budget tracking, Prometheus export, and Kubernetes-aware tagging. It solves two problems at once — **getting useful numbers out of a service without instrumenting every method by hand, and keeping those numbers from blowing up Prometheus** through unbounded label cardinality.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-metrics` |
| Built on | Micrometer core (required) plus the Prometheus registry, OpenTelemetry API and Fabric8 Kubernetes client (all optional), `adhar-kit-commons` |
| Entry points | `MetricsFacade`, `AdharMetrics`, `MetricsUtils`, `SloRecorder`, `HttpMetricsFilter` |
| Auto-configuration | `AdharMetricsAutoConfiguration` (gated on `adhar.metrics.enabled`) |
| Frameworks | Spring, Quarkus, Micronaut, Helidon, Vert.x adapters |
| Use it when | You need RED metrics, SLOs, and JVM/system telemetry on a Prometheus-scraped service |

## How it works

Everything lands in one Micrometer `MeterRegistry`. The module contributes to that registry from four directions, then bounds what comes out of it.

```diagram
kit-metrics-registry
```

The cardinality limiter matters more than it sounds. `HttpMetricsFilter` derives the `uri` tag from the best-matching handler pattern when one is available, and otherwise normalizes numeric and UUID path segments to `{id}`; the limiter then caps the number of distinct values. Without that, one crawler hitting `/orders/<random>` mints a new time series per request.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-metrics</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`MetricsFacade`** — the programmatic entry point (`getInstance()`): `counter`, `timer`, `gauge(name, supplier, tags)`, `recordTime(name, supplier)`, `increment(name, tags)`, `increment(name, amount, tags)`. Reachable as `AdharFacade.getMetrics()`.
- **`AdharMetrics` / `MetricsUtils`** — lower-level helpers for building and looking up meters.
- **`PlatformMetrics`** — the pre-named meters other Adhar Kit modules record into, also reachable as `PlatformMetrics.getInstance()`.
- **`JvmMetricsCollector`** — Adhar-prefixed JVM gauges refreshed from MXBeans on a 15-second schedule.
- **`KubernetesMetricsUtils`** — pod, namespace and node tags plus the `adhar.container.*` gauges; `CgroupMetricsPoller` reads container CPU and memory limits from the cgroup filesystem (v1 and v2), with no Kubernetes API access.
- **`SloRecorder`** — `record(target, success)`, `recordHttp(uri, success)`, `errorBudgetRemaining(target)`, `burnRate(target)`, `getObjectives()`.
- **`HttpMetricsFilter`** — the per-request timer; also feeds the `SloRecorder` and mirrors the current trace id into the MDC.
- **`TagCardinalityLimiter`** — `limit(tagKey, value)`, `cardinality(tagKey)`, `reset()`.
- **Annotations** — `@Timed`, `@Counted`, `@Gauged`, `@Summary`, `@Histogram`, `@MonitorPerformance`, `@CacheMetrics`, `@DatabaseMetrics`, `@ApiMetrics`, `@BusinessMetric`, `@Measured`.

## A realistic service

Programmatic timing where you need the scope explicit, annotations where you do not — and tags that are closed sets, never identifiers:

```java
import com.adhar.kit.metrics.MetricsFacade;
import com.adhar.kit.metrics.annotation.BusinessMetric;
import com.adhar.kit.metrics.annotation.Timed;
import com.adhar.kit.metrics.slo.SloRecorder;
import java.math.BigDecimal;

@Service
public class OrderService {

    private final MetricsFacade metrics = MetricsFacade.getInstance();
    private final SloRecorder slo;                 // injected: it owns the gauges
    private final InventoryClient inventory;

    public OrderService(SloRecorder slo, InventoryClient inventory) {
        this.slo = slo;
        this.inventory = inventory;
    }

    public Order createOrder(OrderRequest request) {
        boolean ok = false;
        try {
            Order order = metrics.recordTime("order.creation", () -> process(request));
            // region is a closed set; order id would not be
            metrics.increment("orders.created", "region", order.getRegion());
            ok = true;
            return order;
        } finally {
            slo.record("checkout", ok);            // non-HTTP work must be recorded by hand
        }
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

`@Timed` and `@Counted` take `name = "..."` — there is no implicit `value` attribute — plus `description`, `tags`, `successOnly`, `autoRegister`, and for `@Timed` a `percentiles` array. With `name` omitted the meter is named `<simpleclassname-lowercased>.<methodName>`. `@BusinessMetric` produces the counter `adhar.business.<name>` tagged `category` and `outcome`, plus `adhar.business.<name>.value` when `recordValue` is true.

## How it behaves

**One registry, one process.** `MetricsFacade.getInstance()` is a double-checked singleton that resolves a framework adapter once; on Spring and Micronaut it binds to Micrometer's **`Metrics.globalRegistry`**, not to the `MeterRegistry` bean. That makes it independent of the Spring context lifecycle — convenient in a static utility, awkward in tests, where meters from one context are still visible to the next. Inject `MeterRegistry` or `SloRecorder` where you can.

**Meters are cached, not recreated.** `EnhancedMetricsAspect` keeps `ConcurrentHashMap`s of timers, counters, summaries and gauges keyed on name plus tags, so a hot annotated method does one map lookup per call. Both those caches and Micrometer's own are unbounded, which is exactly why tag discipline matters: every distinct tag combination is a permanent map entry *and* a permanent time series.

**Thread-safety.** Every singleton here — the registry and its meters, `TagCardinalityLimiter`, `SloRecorder`, `PlatformMetrics`, `JvmMetricsCollector`, the aspect — is safe to share across request threads, and `HttpMetricsFilter` is a stateless `OncePerRequestFilter`.

**Failure behaviour is a silent no-op.** `HttpMetricsFilter.recordRequest`, `SpanMetricsProcessor` and the Kubernetes pollers all catch and log at WARN. Metrics collection never fails a request — which also means a broken meter produces nothing and says nothing. If a dashboard is empty, check the meter name in `/actuator/prometheus` before assuming an export problem.

**Request timing.** `HttpMetricsFilter` records a timer named **`adhar.http.server.requests`** with tags `method`, `status` (the real response status, or `500` if the chain threw), `outcome` (`1xx`–`5xx`, or `unknown`), and `uri`. It records in a `finally`, so a failed request is still timed, and Spring Boot's own `http.server.requests` continues alongside it.

**Common tags are applied late.** `metricsCommonTagsPostProcessor` adds `application`, `environment` and your `common-tags` to the registry from a `SmartInitializingSingleton`, after every singleton has been created. Micrometer applies meter filters only to meters registered *after* the filter is added, so a meter created during bean construction will not carry the common tags. Register meters lazily — on first use, inside the method — rather than in a constructor or `@PostConstruct`.

## Cardinality: the thing that kills metrics systems

A Prometheus time series exists for every distinct combination of meter name and label values. One unbounded label — a user id, an order id, a raw URL — turns one metric into millions of series, and the cost lands on the scraper and the registry's heap, not on the code that caused it. This module bounds exactly one dimension automatically; the rest is on you.

**Step 1: URI normalisation.** `HttpMetricsFilter.resolveUri` prefers Spring MVC's best-matching handler pattern (`/api/orders/{id}`), which is already a template. With no handler pattern available — no Spring MVC, an error dispatch, a 404 that never reached a handler — it falls back to `normalizePath`, which replaces any segment that is entirely digits or a canonical UUID with `{id}` and truncates to ten segments followed by `/**`. A slug or base62 token is *not* normalised and passes through intact.

**Step 2: the limiter.** The surviving value goes through `TagCardinalityLimiter.limit("uri", value)`, which keeps a `ConcurrentHashMap<String, Set<String>>` of admitted values per tag key bounded by `adhar.metrics.web.max-uri-tags` (default 100). An already-admitted value passes on a lock-free `contains`; a new value takes a short lock on that key's set and is admitted if the set is below the limit, or replaced by the literal string **`other`** if it is at the limit.

So you never lose the request — its timing is folded into a `uri="other"` series. Two consequences follow. The limit is **first-come, first-served**: whichever 100 URIs appear first own the budget, and an endpoint deployed later may land entirely in `other`. And the admitted set is **never evicted** — `reset()` exists but nothing calls it — which is what makes the bound a bound.

**Step 3: the Spring Boot meter filter.** Separately, `uriTagLimitFilter` registers `MeterFilter.maximumAllowableTags("http.server.requests", "uri", maxUriTags, MeterFilter.deny())`. That applies to Boot's own timer, not the Adhar one, and its action at the limit is **deny** — the meter is dropped rather than relabelled. Same property, two outcomes:

| Meter | Limiter | At the limit |
|---|---|---|
| `adhar.http.server.requests` | `TagCardinalityLimiter` | `uri` becomes `other`; the observation is kept |
| `http.server.requests` | Micrometer `MeterFilter` | the meter is denied; the observation is dropped |

**Everything else is on you.** `max-uri-tags` bounds the `uri` tag of those two meters and nothing more. A tag you pass to `metrics.increment("orders.created", "customerId", id)` is unbounded, and so is an annotation `tags` array interpolated from a parameter. Keep tags to closed sets — region, tier, outcome, status class — and put identifiers in logs or span attributes instead.

> `adhar.metrics.web.ignore-patterns` is bound by the properties class but is not read by any code in this module: the filter does not skip actuator or health paths. Those endpoints are low-cardinality, so they cost two or three series, but do not rely on the property to exclude anything.

## Meter names

Knowing the actual names saves a lot of guessing in Grafana:

| Area | Meters |
|---|---|
| HTTP | `adhar.http.server.requests` (timer, from the filter); `adhar.http.request.duration`, `adhar.http.request.count`, `adhar.http.errors` (from `PlatformMetrics`) |
| SLO | `adhar.slo.error_budget.remaining`, `adhar.slo.burn_rate` — both gauges, tagged `target` and `objective` |
| JVM | `adhar.jvm.memory.heap.used` / `.committed` / `.max`, `adhar.jvm.memory.nonheap.used` / `.committed`, `adhar.jvm.threads.live` / `.daemon` / `.peak`, `adhar.jvm.classes.loaded` / `.unloaded` / `.loaded.total`, `adhar.jvm.cpu.processors`, `adhar.jvm.cpu.system_load_average`, `adhar.jvm.file_descriptors.open` / `.max`, `adhar.jvm.gc.pause` |
| Container | `adhar.container.cpu.limit.cores`, `adhar.container.cpu.usage.cores`, `adhar.container.memory.limit.bytes`, `adhar.container.memory.usage.bytes` |
| Database (`@DatabaseMetrics`) | `database.query.time`, `database.errors`, `database.slow_queries` |
| API (`@ApiMetrics`) | `api.request.time` |
| Business (`@BusinessMetric`) | `adhar.business.<name>`, `adhar.business.<name>.value` |
| Cross-module | `adhar.persistence.*`, `adhar.cache.*`, `adhar.messaging.*`, `adhar.resilience.*`, `adhar.ai.*`, `adhar.operation.*` |

Micrometer's standard JVM and system binders (`jvm.memory.*`, `process.uptime`) are registered too, so the `adhar.jvm.*` gauges sit alongside the conventional names, not instead of them.

## Aspect mechanics

`EnhancedMetricsAspect` implements every annotation and is registered when `adhar.metrics.application.method-timing` is true (the default); `MetricsInterceptor` covers `@Measured` and `@MonitorPerformance` under the same flag. Both are proxy-based Spring AOP aspects.

> **Self-invocation bypasses the proxy.** A `this.inStock(sku)` call from inside `OrderService` produces no timer, no counter, no error and no log line — the annotation is inert. Call through an injected reference, or move the method to a collaborator. The same silence applies when `spring-boot-starter-aspectj` is missing or `method-timing` is false.

Two more quiet traps. `@Timed` and `@Counted` are declared `@Target({METHOD, TYPE})`, but the pointcuts are `@annotation(...)` only — **a class-level `@Timed` does nothing**. And `@Timed(successOnly = true)` never times a method that throws, which is rarely what you want when hunting latency on the failure path.

## SLOs and error budgets

`SloRecorder` tracks a rolling success ratio per target against a configured availability objective, over a window of `window-seconds` divided into 60 buckets, and publishes `adhar.slo.error_budget.remaining` (the fraction of the budget still unspent, clamped at 0) and `adhar.slo.burn_rate` (observed error rate divided by the allowed rate). Alerting on burn rate catches a bad deploy in minutes; alerting on raw error count does not.

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

Targets and gauges are fixed at construction, so `record("unknown", false)` is a silent no-op — the name must exist in configuration. `HttpMetricsFilter` calls `recordHttp(uri, status < 500)` automatically; `global` matches every request, and any other target matches when the (already templated and limited) uri equals the target, equals `/target`, ends with `/target`, or contains `/target/`. With no traffic, remaining budget reads `1.0` and burn rate `0.0`. Memory is fixed at 60 buckets per target regardless of volume.

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
    web:
      enabled: true            # the adhar.http.server.requests timer
      max-uri-tags: 100
    kubernetes:
      enabled: true            # pod / namespace / node tags
      resource-polling:
        enabled: true
        interval-seconds: 15
management:
  endpoints:
    web:
      exposure:
        include: prometheus,health,info
```

Exposing the scrape endpoint is Spring Boot's job, not this module's: `adhar.metrics.prometheus.endpoint` and `step` are bound but the Prometheus post-processor only logs, so set `management.endpoints.web.exposure.include` as above. Likewise, `adhar.metrics.open-telemetry.*` is bound but no OTLP metric exporter is registered — use Micrometer's own OTLP registry for that. Trace *correlation* is wired: with the OpenTelemetry API present a `TraceContext` bean appears, and with the Prometheus client it is bridged to a `SpanContext` so counters and histograms carry exemplars. On the [Adhar Platform](/docs), Prometheus scrapes all of this with no extra wiring.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.metrics.enabled` | Master switch | `true` |
| `adhar.metrics.common-tags` | Tags added to every meter | empty |
| `adhar.metrics.prometheus.enabled` | Prometheus registry post-processing | `true` |
| `adhar.metrics.web.enabled` | Register `HttpMetricsFilter` and the uri meter filter | `true` |
| `adhar.metrics.web.max-uri-tags` | Distinct `uri` values retained | `100` |
| `adhar.metrics.web.record-request-size` / `record-response-size` | Keep Boot's size meters | `true` |
| `adhar.metrics.application.method-timing` | Register `EnhancedMetricsAspect` and `MetricsInterceptor` | `true` |
| `adhar.metrics.jvm.enabled` | `JvmMetricsCollector` (15-second schedule) | `true` |
| `adhar.metrics.jvm.memory` / `gc` / `threads` / `class-loader` | Micrometer JVM binders | `true` |
| `adhar.metrics.system.processor` / `file-descriptor` / `uptime` / `disk-space` | Micrometer system binders | `true` |
| `adhar.metrics.kubernetes.enabled` | Pod / namespace / node tags | `false` |
| `adhar.metrics.kubernetes.resource-polling.enabled` | Poll cgroup CPU/memory limits | `false` |
| `adhar.metrics.kubernetes.resource-polling.interval-seconds` | Poll interval | `15` |
| `adhar.metrics.slo.enabled` | Register `SloRecorder` | `true` |
| `adhar.metrics.slo.window-seconds` | Rolling SLO window | `3600` |

## Testing

- **Assert on a real registry.** Build a `SimpleMeterRegistry`, pass it to the component under test, and assert with Micrometer's fluent search: `registry.get("adhar.http.server.requests").tag("status", "200").timer().count()`. No mocks, no string matching on log output.
- **Cardinality is directly testable.** `new TagCardinalityLimiter(3)` plus four `limit("uri", ...)` calls proves the fourth comes back as `"other"`; `cardinality("uri")` reports the budget used and `reset()` clears it between tests.
- **URI normalisation without a servlet container.** `HttpMetricsFilter.normalizePath(...)` is package-private and static — call it from a test in the same package, or drive the filter with `MockHttpServletRequest` / `MockFilterChain`, setting `BEST_MATCHING_PATTERN_ATTRIBUTE` to simulate a resolved handler.
- **Deterministic SLOs.** `SloRecorder` has a constructor taking a `LongSupplier` time source: drive it with a mutable `long[]` to walk the rolling window across bucket boundaries without sleeping.
- **Turn it off.** `adhar.metrics.application.method-timing=false` removes the aspects; `adhar.metrics.enabled=false` removes the module; `adhar.metrics.kubernetes.enabled=false` (the default) keeps the Fabric8 client out of a unit test.
- **Beware the global registry.** `MetricsFacade.getInstance()` holds `Metrics.globalRegistry` for the life of the JVM, so counters accumulate across test classes. Assert deltas, or inject `MeterRegistry`.

## Interaction with sibling modules

[Tracing](/adhar-kit/modules/tracing)'s `SpanMetricsProcessor` records every finished span into this registry as `span.duration` (a timer tagged `span.name`, `span.kind` and `error`) and `span.errors`, giving you RED metrics derived from spans alongside the ones derived from the filter. In the other direction, `HttpMetricsFilter` publishes the current trace id into the SLF4J MDC for the duration of a request, so [Logging](/adhar-kit/modules/logging) output and metrics point at the same trace without a trace id ever becoming a tag. [Resilience](/adhar-kit/modules/resilience), [Cache](/adhar-kit/modules/cache), [Persistence](/adhar-kit/modules/persistence) and [Messaging](/adhar-kit/modules/messaging) record into their matching `PlatformMetrics` families.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `@Timed("name")` does not compile | The attribute is `name`, not `value` | Write `@Timed(name = "name")` |
| A class-level `@Timed` produces nothing | The aspect matches `@annotation`, i.e. methods only | Annotate the methods |
| Annotations produce no meters | Self-invocation, or `method-timing` disabled | Call through the proxy; check `adhar.metrics.application.method-timing` |
| Prometheus memory climbs steadily | High-cardinality tags such as a user or order id | Keep ids out of tags; `max-uri-tags` only bounds `uri` |
| Most traffic reports `uri="other"` | The first 100 distinct URIs claimed the budget | Raise `max-uri-tags`, or make sure handler patterns resolve |
| `uri` shows up as `{id}` everywhere | No handler pattern was available, so the path was normalized | Expected outside Spring MVC; the raw path is intentionally not used |
| Common tags missing from some meters | Those meters were registered before the post-processor ran | Register meters lazily on first use, not in a constructor |
| `/actuator/prometheus` returns 404 | The endpoint is exposed by Spring Boot, not by this module | Add `prometheus` to `management.endpoints.web.exposure.include` |
| Error budget stays at 1.0 | No target configured for that name and no `global` target set | Add it under `adhar.metrics.slo.targets` |
| A latency spike is invisible | `@Timed(successOnly = true)` skips failed calls | Leave `successOnly` false on anything that can fail |

## See also

- [Logging](/adhar-kit/modules/logging) — the same requests, as structured events
- [Tracing](/adhar-kit/modules/tracing) — exemplars link a latency spike to a specific trace
- [Resilience](/adhar-kit/modules/resilience) — bridges circuit-breaker state into this registry
- [Observability](/docs/operations/observability) — Prometheus and Grafana on the platform
