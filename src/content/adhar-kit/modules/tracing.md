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
| Built on | OpenTelemetry SDK + OTLP exporter, Micrometer Tracing (OTel bridge); Zipkin, Brave and `adhar-kit-commons` optional |
| Entry points | `AdharTracing`, `TracingFacade`, the span annotations, `TraceContextTaskDecorator` |
| Auto-configuration | `AdharTracingAutoConfiguration` (needs `Tracer` on the classpath; gated on `adhar.tracing.enabled`) |
| Frameworks | Spring, Quarkus, Micronaut, Helidon, Vert.x adapters |
| Use it when | A request crosses a process boundary and you need end-to-end latency attribution |

## How it works

The auto-configuration builds an `OpenTelemetry` instance and a `Tracer`, then hangs three kinds of thing off it: things that *create* spans, things that *move* context, and things that *decide* which traces to keep.

```diagram
kit-tracing-path
```

The pipeline is `SdkTracerProvider` → sampler → span processors. Each configured exporter gets a `BatchSpanProcessor` with a maximum export batch of 512 spans and a five-second schedule delay. With tail sampling on, those batch processors are composed behind a `TailSamplingSpanProcessor` rather than registered directly. `SpanMetricsProcessor` is always added as a *separate* processor, so it observes every recorded span regardless of the sampling decision.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-tracing</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`AdharTracing`** — the programmatic API. Scoped execution: `withinSpan(name, supplier)`, `withinSpan(name, tags, runnable)`, `withinSpanCallable`, `withinSpanAsync`. Current context: `getCurrentSpan`, `getCurrentTraceId`, `getCurrentSpanId`, `isTracingActive`. Enrichment: `addTag`, `addTags`, `addEvent`, `recordException`. Typed spans that carry the right semantic attributes: `createDatabaseSpan(operation, table, statement)`, `createHttpClientSpan(method, url)`, `createMessagingSpan(operation, destination, system)`. Baggage: `setBaggage`, `getBaggage`, `removeBaggage`, `clearBaggage`, `getAllBaggage`, `injectBaggageIntoHeaders`, `extractBaggageFromHeaders`. Cross-thread: `wrapWithTraceContext` for `Runnable`, `Supplier`, `Callable`, `Function`, and `Consumer`.
- **`TracingFacade`** — the thin cross-framework view (`getInstance()`): `spanBuilder`, `executeInSpan`, `getCurrentTraceId`, `addTag`, `addEvent`. This is what `AdharFacade.getTracing()` returns.
- **Web and async** — `TraceContextTaskDecorator` (hand it to a Spring `TaskExecutor` so `@Async` work stays in the trace), `TraceContextMdcFilter` (mirrors `traceId` / `spanId` into the SLF4J MDC), `TracingServerSpanFilter` (the inbound server span, honouring `web.skip-patterns`), and `SpanMetricsProcessor` (the span-to-RED-metrics bridge).
- **Annotations** — `@NewSpan`, `@ContinueSpan`, `@DatabaseSpan`, `@HttpClientSpan`, `@MessagingSpan`, `@AsyncSpan`, `@SpanTag`.

## A realistic service

Annotations where the span is the whole method, the programmatic API where you need a span around part of one, and the error path recorded rather than lost:

```java
import com.adhar.kit.tracing.annotation.DatabaseSpan;
import com.adhar.kit.tracing.annotation.MessagingSpan;
import com.adhar.kit.tracing.annotation.NewSpan;
import com.adhar.kit.tracing.annotation.SpanTag;
import com.adhar.kit.tracing.util.AdharTracing;

@Service
public class OrderService {

    private final AdharTracing tracing;
    private final OrderRepository repository;
    private final KafkaProducer producer;

    public OrderService(AdharTracing tracing, OrderRepository repository,
                        KafkaProducer producer) {
        this.tracing = tracing;
        this.repository = repository;
        this.producer = producer;
    }

    @NewSpan("order.place")
    public Order place(@SpanTag("order.sku") String sku,
                       @SpanTag(value = "order.tenant", expression = "tenantId") Profile profile) {
        tracing.setBaggage("tenant.id", profile.tenantId());  // declared under baggage.remote-fields
        try {
            Order order = persist(sku, profile);
            announce(new OrderPlaced(order.id()));
            return order;
        } catch (RuntimeException e) {
            tracing.recordException(e);     // sets span status ERROR — tail sampling keeps the trace
            tracing.addTag("order.sku", sku);
            throw e;
        }
    }

    @DatabaseSpan(operation = "INSERT", table = "orders", database = "orders_db")
    public Order persist(String sku, Profile profile) {
        return repository.save(Order.of(sku, profile));
    }

    @MessagingSpan(operation = "publish", destination = "order-events", system = "kafka")
    public void announce(OrderPlaced event) {
        producer.send(event);
    }
}
```

Note that `persist` and `announce` are called through `this`. In the code above those calls **bypass the proxy** and produce no child spans — see the aspect section below. Split them into collaborating beans, or wrap them with `tracing.withinSpan("order.persist", () -> …)` instead.

`@SpanTag` takes a plain name, or `expression` to read a field off the argument; it is a parameter annotation only. Every span annotation except `@SpanTag` targets methods.

## Sampling: the decision that matters most

Sampling is the one setting that changes both your bill and your ability to debug. The module offers two modes, selected with `adhar.tracing.sampling.mode`.

### Head-based (`ratio`, the default)

The decision is made when the trace starts, from the trace id, before anything is known about how the request will turn out. `probability` maps straight onto the OpenTelemetry sampler:

| `probability` | Sampler |
|---|---|
| `<= 0.0` | `Sampler.alwaysOff()` — nothing recorded at all |
| `>= 1.0` | `Sampler.alwaysOn()` |
| anything between | `Sampler.traceIdRatioBased(probability)` |

It is cheap: an unsampled trace costs almost nothing, because spans are never recorded. It is also blind — at the default `0.1`, nine errors in ten are discarded, and the one slow request you were paged about is probably not in Tempo. Because the decision is derived from the trace id, it is consistent across services: every service in the path makes the same call.

### Tail-based (`tail`)

The decision is deferred until the trace has finished, so it can be made on what actually happened. `TailSamplingSpanProcessor` buffers each trace's finished spans and, when the root span ends, schedules a decision `hold-window-ms` later (the window lets straggling child spans arrive). A trace is kept if, in order:

1. any of its spans ended with status `ERROR`; or
2. the root span's latency exceeded `latency-threshold-ms`; or
3. a random draw falls below `keep-rate` (`>= 1.0` keeps everything, `<= 0.0` keeps nothing).

Spans of a kept trace are forwarded to the batch processors; spans of a dropped trace are discarded. A span that arrives *after* the decision is forwarded or dropped consistently, because the processor keeps a bounded LRU of recent decisions.

**Enabling tail sampling forces the head sampler to `alwaysOn`.** The processor can only judge a trace it has seen, so every span in the process is recorded, attributed and buffered — you pay the full in-process cost of tracing on 100% of traffic and save only on export and storage. That is the trade: tail sampling buys you every error and every slow request, at the price of head sampling's cheapness.

**Memory is the thing to size.** The hold buffer is a `LinkedHashMap` of at most `max-buffered-traces` pending traces (default 1000), and **each entry holds every finished span of that trace in an `ArrayList`**. Peak heap is therefore roughly `max-buffered-traces × spans-per-trace × span size`: a service emitting fifty spans per request holds fifty thousand span objects at the cap. A second map of the same cap holds trace-id→decision booleans and is small. When the pending map exceeds the cap the **oldest pending trace is decided immediately** — possibly before its root span ended, in which case the latency rule cannot fire and the trace falls through to `keep-rate`. Under a burst, that is how a slow trace gets dropped.

**Other operational properties.** All buffering is guarded by a single `ReentrantLock`, so every span end in the process serialises through it — a contention point at high span rates. Decisions run on one daemon thread named `adhar-tail-sampling`; with `hold-window-ms` set to `0` the decision is taken inline on the thread that ended the root span. `trace-timeout-ms` (default 30s) decides a trace whose root never ends. On shutdown every still-pending trace is pushed through the normal decision path, so a clean stop does not drop the buffer.

**Tail sampling here is per process, not global.** `isRoot` treats a span with no parent *or* a remote parent as a root, so each service decides independently about the part of the trace it saw. A trace that errors only downstream is kept there and may be dropped by the caller, leaving a partial trace in your backend. For whole-trace consistency, do tail sampling centrally in an OpenTelemetry Collector and leave this set to `ratio`.

## How it behaves

**Lifecycle and scope.** `OpenTelemetry`, `Tracer`, `AdharTracing`, `TracingAspect`, `TraceContextTaskDecorator` and the span processors are singletons built once at startup; spans are per-operation and attached to the thread-local OpenTelemetry context. The whole auto-configuration is skipped if `Tracer` is not on the classpath or `adhar.tracing.enabled` is false, and every annotation then becomes inert.

**Export is asynchronous and lossy under pressure.** `BatchSpanProcessor` queues spans and exports in batches of up to 512 every five seconds. If the collector is down, exports fail and the SDK drops spans — it does not block request threads and it does not retry indefinitely. Tracing degrades silently; it never becomes the reason a request fails.

**Failure behaviour in the API.** `AdharTracing` catches and logs rather than propagating: `setBaggage` with a null key or value warns and returns, a disabled baggage subsystem logs at debug and returns. `getCurrentTraceId` returns null when no span is active, so `isTracingActive()` is the guard to use.

**Context does not cross threads by itself.** The OpenTelemetry context is thread-local, exactly like the MDC, and it is a *different* store from the MDC — so [Core](/adhar-kit/modules/core)'s `ContextPropagatingExecutor`, which carries the MDC, does **not** carry the span. Use `TraceContextTaskDecorator` on a Spring `TaskExecutor`, or wrap the task yourself:

```java
@Bean
public Executor reportExecutor(TraceContextTaskDecorator decorator) {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setTaskDecorator(decorator);
    executor.initialize();
    return executor;
}
```

The decorator captures `tracer.currentSpan()` at submit time and re-attaches it with a `SpanInScope` for the task's duration; with no current span it returns the runnable untouched.

**Baggage bookkeeping is process-wide.** `setBaggage(key, value)` opens a Micrometer `BaggageInScope` and stores the handle in a `ConcurrentHashMap` on the singleton `AdharTracing`, **keyed by name alone** — not per thread. The value itself lives in the thread-local context, so `getBaggage` is correct per thread, but two request threads setting the same key race on the handle and one loses the ability to close its scope cleanly. Set baggage once at the edge of a request, with a small fixed set of keys, and declare each under `baggage.remote-fields` or it is not serialized across the process boundary.

## Aspect mechanics

`TracingAspect` implements every span annotation with `@Around("@annotation(...)")` pointcuts — method level only, on a Spring AOP proxy.

> **Self-invocation bypasses the proxy.** Calling `this.persist(sku, profile)` from another method of the same bean goes straight to the target object: no database span, no attributes, no error, no log line. You get a parent span with a suspicious gap in it and nothing explaining the gap. Call through an injected reference to the bean, move the method to a collaborator, or use `tracing.withinSpan(...)` for in-method scoping.

The aspect needs `spring-boot-starter-aspectj` (or an equivalent AspectJ weaver) on the classpath; without it the bean is never created and the annotations do nothing. `@NewSpan` always starts a child span; `@ContinueSpan` enriches the span that is already current and adds `startEvent` / `endEvent` markers rather than creating one.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.tracing.enabled` | Master switch | `true` |
| `adhar.tracing.sampling.mode` | `ratio` (head-based) or `tail` | `ratio` |
| `adhar.tracing.sampling.probability` | Head sampling rate | `0.1` |
| `adhar.tracing.sampling.tail.hold-window-ms` | Wait after the root span ends before deciding | `2000` |
| `adhar.tracing.sampling.tail.latency-threshold-ms` | Always keep traces slower than this | `1000` |
| `adhar.tracing.sampling.tail.keep-rate` | Fraction kept when neither error nor latency applies | `0.1` |
| `adhar.tracing.sampling.tail.max-buffered-traces` | Pending-trace bound before a forced decision | `1000` |
| `adhar.tracing.sampling.tail.trace-timeout-ms` | Decide a trace whose root never ends | `30000` |
| `adhar.tracing.open-telemetry.enabled` | OTLP exporter | `true` |
| `adhar.tracing.open-telemetry.endpoint` | OTLP endpoint | `http://localhost:4317` |
| `adhar.tracing.open-telemetry.use-grpc` | gRPC rather than HTTP | `true` |
| `adhar.tracing.open-telemetry.compression` | Exporter compression | `gzip` |
| `adhar.tracing.zipkin.enabled` / `jaeger.enabled` | Alternative exporters | `false` |
| `adhar.tracing.propagation.type` | `tracecontext`, `b3`, `jaeger`, `ottrace` | `tracecontext` |
| `adhar.tracing.baggage.enabled` | Enable baggage | `true` |
| `adhar.tracing.baggage.remote-fields` | Keys propagated across processes | empty |
| `adhar.tracing.baggage.correlation-fields` | Keys also tagged onto the current span | empty |
| `adhar.tracing.web.enabled` | Web instrumentation | `true` |
| `adhar.tracing.web.mdc-enabled` | Register `TraceContextMdcFilter` | `true` |
| `adhar.tracing.web.server-spans-enabled` | Register `TracingServerSpanFilter` | `true` |
| `adhar.tracing.web.skip-patterns` | Paths excluded from tracing | `/actuator/**`, `/health/**`, `/info/**` |
| `adhar.tracing.database.include-sql-parameters` | Put bind values on the span | `false` |
| `adhar.tracing.messaging.include-payloads` | Put message bodies on the span | `false` |
| `adhar.tracing.metrics.enabled` | Register `SpanMetricsProcessor` | `true` |
| `adhar.tracing.metrics.meter-prefix` | Prefix for the derived RED meters | `span` |
| `adhar.tracing.resource.service-name` | `service.name` resource attribute | `${spring.application.name:unknown-service}` |

## Testing

- **Assert on exported spans.** Add `io.opentelemetry:opentelemetry-sdk-testing` as a test dependency and build an `SdkTracerProvider` around an `InMemorySpanExporter`, then assert span names, parent/child structure, status and attributes directly.
- **Make sampling deterministic.** Set `adhar.tracing.sampling.probability=1.0` in the test profile. At the default `0.1`, nine runs in ten record nothing and assertions fail at random.
- **Do not point tests at a collector.** `adhar.tracing.open-telemetry.enabled=false` removes the OTLP exporter so tests do not reach for `localhost:4317`; `adhar.tracing.enabled=false` removes the module entirely.
- **Keep tail sampling out of unit tests.** Leave `sampling.mode=ratio`: tail sampling defers export by `hold-window-ms` on a background thread, so a test asserting immediately sees nothing. If you must test it, `hold-window-ms: 0` makes the decision inline on the ending thread.
- **Spans need proxies.** `@NewSpan` and friends only fire through the Spring proxy — assert them from a `@SpringBootTest`, or call `AdharTracing.withinSpan(...)` explicitly in a plain unit test.
- **Clean up baggage.** `clearBaggage()` in `@AfterEach` — the scope map lives on the singleton and survives the test method.

## Interaction with sibling modules

`TraceContextMdcFilter` puts `traceId` and `spanId` into the SLF4J MDC, which is what makes [Logging](/adhar-kit/modules/logging) output clickable from a span in Grafana: `AdharLogger` picks up the `Tracer` bean automatically, and `AppLogEventPublisher` enriches every structured event with the same two ids. Towards [Metrics](/adhar-kit/modules/metrics), `SpanMetricsProcessor` records each finished span as `span.duration` (a timer tagged `span.name`, `span.kind` and `error`) and `span.errors`; separately, that module's `HttpMetricsFilter` bridges the current trace id to Prometheus exemplars, linking a latency spike to a specific trace without a high-cardinality tag. Baggage is the natural carrier for the tenant id [Commons](/adhar-kit/modules/commons) establishes at the edge, and `@MessagingSpan` plus header propagation keeps a trace intact across [Messaging](/adhar-kit/modules/messaging).

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| No spans anywhere | The auto-configuration needs `Tracer` on the classpath | Confirm the module resolved and `adhar.tracing.enabled` is true |
| A method's span is missing but its caller's is there | Self-invocation bypassed the proxy | Inject the bean, or use `tracing.withinSpan(...)` |
| Traces break at an `@Async` boundary | The OpenTelemetry context is thread-local and is not in the MDC | Register `TraceContextTaskDecorator`, or wrap the task with `wrapWithTraceContext` |
| Errors rarely show up in Tempo | Head sampling drops them at trace start | Switch `sampling.mode` to `tail` |
| Heap grows after enabling tail sampling | The hold buffer keeps every span of up to `max-buffered-traces` traces | Lower `max-buffered-traces` or `hold-window-ms` |
| Tail sampling still misses slow traces under load | The buffer overflowed and the oldest trace was decided before its root ended | Raise `max-buffered-traces`, or move tail sampling into a collector |
| CPU did not drop after lowering `keep-rate` | Tail mode forces the head sampler to `alwaysOn`; only export is reduced | Use `ratio` mode if in-process cost is the problem |
| Traces stop at a partner service | It speaks B3, not W3C `traceparent` | Set `propagation.type: b3` or add it to `additional-formats` |
| Baggage does not reach downstream | A key must be declared remote to be serialized | Add it to `baggage.remote-fields` |
| Span attributes contain PII | SQL parameter or payload capture was enabled | Leave `include-sql-parameters` and `include-payloads` off |

## See also

- [Logging](/adhar-kit/modules/logging) — consumes the `traceId` / `spanId` this module publishes
- [Metrics](/adhar-kit/modules/metrics) — `SpanMetricsProcessor` feeds span data into the same registry
- [Messaging](/adhar-kit/modules/messaging) — where `@MessagingSpan` and header propagation pay off
- [Observability](/docs/operations/observability) — Tempo and Grafana on the platform
