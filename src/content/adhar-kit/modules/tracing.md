---
title: "Tracing"
section: "Modules"
order: 15
path: "/adhar-kit/modules/tracing"
---

# Tracing

`adhar-kit-tracing` provides enterprise distributed tracing on OpenTelemetry (exporting to OTLP, Zipkin, or Jaeger): annotation-based spans, a programmatic `AdharTracing` API, W3C baggage propagation, cross-thread context propagation, and trace-to-log correlation. It answers the question metrics and logs cannot: **where did those 900 milliseconds actually go**, across the five services a single request touched.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-tracing` |
| Built on | OpenTelemetry SDK + OTLP/Zipkin exporters, Micrometer Tracing, Brave, `adhar-kit-commons` |
| Entry points | `AdharTracing`, `TracingFacade`, the span annotations, `TraceContextTaskDecorator` |
| Auto-configuration | `AdharTracingAutoConfiguration` (needs `Tracer` on the classpath; gated on `adhar.tracing.enabled`) |
| Frameworks | Spring, Quarkus, Micronaut, Helidon, Vert.x adapters |
| Use it when | A request crosses a process boundary and you need end-to-end latency attribution |

## How it works

The auto-configuration builds an `OpenTelemetry` instance and a `Tracer`, then hangs three kinds of thing off it: things that *create* spans, things that *move* context, and things that *decide* which traces to keep.

```text
  Inbound request
    | traceparent / baggage headers (W3C by default)
    v
  TracingServerSpanFilter  ---- creates the server span
    |
    +--> TraceContextMdcFilter  -> MDC{traceId, spanId}  -> logs
    |
    v
  TracingAspect  (@NewSpan, @ContinueSpan, @DatabaseSpan,
                  @HttpClientSpan, @MessagingSpan, @AsyncSpan)
    |
    +--> TraceContextTaskDecorator  -> context survives an @Async hop
    |
    v
  Span processors
    +-- SpanMetricsProcessor      -> span counts/latency into Micrometer
    +-- TailSamplingSpanProcessor -> keep-on-error / keep-on-latency
    |
    v
  Exporter: OTLP (default, gRPC :4317) | Zipkin | Jaeger
```

**Sampling has two modes.** `ratio` is head-based: the decision is made when the trace starts, using `sampling.probability`, and it is cheap but blind — a 10% sample drops nine errors in ten. `tail` buffers finished root-span trees for `hold-window-ms`, then keeps a trace if it errored, if it exceeded `latency-threshold-ms`, or with probability `keep-rate` otherwise. Tail sampling costs memory (`max-buffered-traces`) and buys you every slow and every failed request.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-tracing</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`AdharTracing`** — the programmatic API. Scoped execution: `withinSpan(name, supplier)`, `withinSpan(name, tags, runnable)`, `withinSpanCallable`, `withinSpanAsync`. Current context: `getCurrentSpan`, `getCurrentTraceId`, `getCurrentSpanId`, `isTracingActive`. Enrichment: `addTag`, `addTags`, `addEvent`, `recordException`. Typed spans that carry the right semantic attributes: `createDatabaseSpan(operation, table, statement)`, `createHttpClientSpan(method, url)`, `createMessagingSpan(operation, destination, system)`. Baggage: `setBaggage`, `getBaggage`, `removeBaggage`, `getAllBaggage`, `injectBaggageIntoHeaders`, `extractBaggageFromHeaders`. Cross-thread: `wrapWithTraceContext` for `Runnable`, `Supplier`, `Callable`, `Function`, and `Consumer`.
- **`TracingFacade`** — the thin cross-framework view (`getInstance()`): `spanBuilder`, `executeInSpan`, `getCurrentTraceId`, `addTag`, `addEvent`. This is what `AdharFacade.getTracing()` returns.
- **`TraceContextTaskDecorator`** — hand it to a Spring `TaskExecutor` so `@Async` work stays in the trace.
- **`TraceContextMdcFilter`** — mirrors `traceId` / `spanId` into the SLF4J MDC.
- **Annotations** — `@NewSpan`, `@ContinueSpan`, `@DatabaseSpan`, `@HttpClientSpan`, `@MessagingSpan`, `@AsyncSpan`, `@SpanTag`.

## A minimal span

```java
import com.adhar.kit.tracing.util.AdharTracing;

Order order = tracing.withinSpan("order.place", () -> orderService.place(request));
```

## Annotation-based spans

`TracingAspect` implements every span annotation. Attributes come from the annotation, and `@SpanTag` pulls values off the parameters:

```java
import com.adhar.kit.tracing.annotation.DatabaseSpan;
import com.adhar.kit.tracing.annotation.NewSpan;
import com.adhar.kit.tracing.annotation.SpanTag;

@Service
public class UserService {

    @NewSpan("user.create")
    public User createUser(@SpanTag("user.email") String email,
                           @SpanTag(value = "user.tenant", expression = "tenantId") Profile profile) {
        return repository.save(new User(email, profile));
    }

    @DatabaseSpan(operation = "SELECT", table = "users", database = "orders_db")
    public List<User> findUsers() {
        return repository.findAll();
    }

    @MessagingSpan(operation = "publish", destination = "order-events", system = "kafka")
    public void announce(OrderPlaced event) {
        producer.send(event);
    }
}
```

`@SpanTag` takes a plain name, or `expression` to read a field off the argument. Like every proxy-based aspect, these apply only to calls that go through the bean's proxy.

## Baggage and correlation

Baggage is key/value data that rides the trace across service boundaries in the W3C `baggage` header. Declare which keys propagate remotely, then set them once at the edge:

```java
tracing.setBaggage("tenant.id", TenantContext.getTenantId());
tracing.setBaggage("user.id", currentUserId);
// Downstream services read the same keys with getBaggage(...)
```

Because `TraceContextMdcFilter` puts `traceId` and `spanId` into the MDC, [logging](/adhar-kit/modules/logging) output carries them automatically — click a span in Grafana, get the log lines for that exact request.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.tracing.enabled` | Master switch | `true` |
| `adhar.tracing.sampling.mode` | `ratio` (head-based) or `tail` | `ratio` |
| `adhar.tracing.sampling.probability` | Head sampling rate | `0.1` |
| `adhar.tracing.sampling.tail.latency-threshold-ms` | Always keep traces slower than this | `1000` |
| `adhar.tracing.sampling.tail.keep-rate` | Fraction kept when neither error nor latency applies | `0.1` |
| `adhar.tracing.sampling.tail.max-buffered-traces` | Buffer bound before a forced decision | `1000` |
| `adhar.tracing.open-telemetry.enabled` | OTLP exporter | `true` |
| `adhar.tracing.open-telemetry.endpoint` | OTLP endpoint | `http://localhost:4317` |
| `adhar.tracing.open-telemetry.use-grpc` | gRPC rather than HTTP | `true` |
| `adhar.tracing.zipkin.enabled` / `jaeger.enabled` | Alternative exporters | `false` |
| `adhar.tracing.propagation.type` | `tracecontext`, `b3`, `jaeger`, `ottrace` | `tracecontext` |
| `adhar.tracing.baggage.enabled` | Enable baggage | `true` |
| `adhar.tracing.baggage.remote-fields` | Keys propagated across processes | empty |
| `adhar.tracing.web.enabled` | Web instrumentation | `true` |
| `adhar.tracing.web.mdc-enabled` | Register `TraceContextMdcFilter` | `true` |
| `adhar.tracing.web.server-spans-enabled` | Register `TracingServerSpanFilter` | `true` |
| `adhar.tracing.web.skip-patterns` | Paths excluded from tracing | `/actuator/**`, `/health/**`, `/info/**` |
| `adhar.tracing.database.include-sql-parameters` | Put bind values on the span | `false` |
| `adhar.tracing.messaging.include-payloads` | Put message bodies on the span | `false` |
| `adhar.tracing.metrics.enabled` | Register `SpanMetricsProcessor` | `true` |

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| No spans anywhere | The auto-configuration needs `Tracer` on the classpath | Confirm the module resolved and `adhar.tracing.enabled` is true |
| Traces break at an `@Async` boundary | The OpenTelemetry context is thread-local | Register `TraceContextTaskDecorator` on the executor, or wrap the task with `wrapWithTraceContext` |
| Errors rarely show up in Tempo | Head sampling drops them at trace start | Switch `sampling.mode` to `tail` |
| Traces stop at a partner service | It speaks B3, not W3C `traceparent` | Set `propagation.type: b3` or add it to `additional-formats` |
| Baggage does not reach downstream | A key must be declared remote to be serialized | Add it to `baggage.remote-fields` |
| Span attributes contain PII | SQL parameter or payload capture was enabled | Leave `include-sql-parameters` and `include-payloads` off |

## See also

- [Logging](/adhar-kit/modules/logging) — consumes the `traceId` / `spanId` this module publishes
- [Metrics](/adhar-kit/modules/metrics) — `SpanMetricsProcessor` feeds span data into the same registry
- [Messaging](/adhar-kit/modules/messaging) — where `@MessagingSpan` and header propagation pay off
- [Observability](/docs/operations/observability) — Tempo and Grafana on the platform
