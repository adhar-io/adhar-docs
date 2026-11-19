---
title: "Tracing"
section: "Modules"
order: 15
path: "/adhar-kit/modules/tracing"
---

# Tracing

`adhar-kit-tracing` gives a Spring Boot service distributed tracing on the OpenTelemetry SDK with no code: it builds the SDK, supplies the Micrometer `Tracer` and `Propagator` that Spring Boot uses to turn HTTP, Kafka, RabbitMQ and JDBC observations into spans, reads the standard `OTEL_*` environment variables, and exports over OTLP. On top of that you get span annotations, a programmatic API, head or tail sampling, trace IDs in the log MDC, and RED metrics derived from spans. Use it when a request crosses process boundaries and you need to see where its time went.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-tracing` |
| Toggle | `adhar.tracing.enabled` (default `true`). Facade gate `adhar.kit.modules.tracing` (default `true`); when `false`, `adhar.getTracing()` throws `IllegalStateException` |
| Facade | `adhar.getTracing()` → `TracingFacade`. On Spring Boot the starter backs it with `SpringTracingAdapter` when a Micrometer `Tracer` bean exists; otherwise it is a no-op that still runs your code. Injectable beans: `AdharTracing`, `Tracer`, `OpenTelemetry`, `TraceContextTaskDecorator` |
| Dependencies | Required: OpenTelemetry API/SDK + OTLP exporter, Micrometer Tracing + OTel bridge, `spring-boot-micrometer-tracing`, `datasource-micrometer` (JDBC spans). Optional: `spring-boot-starter-aspectj` (annotations), `opentelemetry-exporter-zipkin` (Zipkin), Micrometer `MeterRegistry` (span metrics), servlet stack (web filters) |
| Frameworks | Spring Boot auto-configuration. `TracingService` adapters for Quarkus (CDI bean), Micronaut (bean), Helidon and Vert.x (construct with an OpenTelemetry `Tracer`) |

## How it works

```diagram
nkc-tracing-pipeline
```

- `AdharTracingAutoConfiguration` runs before Spring Boot's tracer auto-configurations, so Boot's no-op tracer backs off and Boot's observation handlers use the kit's `Tracer` and `Propagator`. Outgoing `RestClient`/`WebClient`/`RestTemplate` calls built from Boot's builders, Kafka and RabbitMQ templates and listeners, Lettuce commands, JDBC connections and queries, and incoming HTTP requests become spans and carry `traceparent`.
- `OtelEnvironmentPostProcessor` maps `OTEL_*` variables onto `adhar.tracing.*` at the lowest precedence and switches on the Kafka/RabbitMQ observations that Boot leaves off. Anything you set in application config wins.
- The SDK sampler records spans; in `tail` mode a buffer decides per trace before export. Each exporter gets a `BatchSpanProcessor` (batches of 512, every 5 s). `SpanMetricsProcessor` sees every recorded span, whatever the sampling decision.
- `TracingServerSpanFilter` creates a `SERVER` span only when no server span is already in progress (a fallback for when Boot's `ServerHttpObservationFilter` is absent). `TraceContextMdcFilter` copies `traceId` and `spanId` into the SLF4J MDC.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-tracing</artifactId>
    <version>0.1.0</version>
</dependency>
<!-- Needed for @NewSpan and the other span annotations -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aspectj</artifactId>
</dependency>
```

Point it at a collector. In a pod, the standard variables are enough:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://alloy.monitoring:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_SERVICE_NAME=orders
```

| Variable | Maps to |
|---|---|
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, else `OTEL_EXPORTER_OTLP_ENDPOINT` (+ `/v1/traces` for HTTP) | `adhar.tracing.open-telemetry.endpoint` |
| `OTEL_EXPORTER_OTLP_[TRACES_]PROTOCOL` (default `http/protobuf`) | `adhar.tracing.open-telemetry.use-grpc` |
| `OTEL_TRACES_EXPORTER=none` | `adhar.tracing.open-telemetry.enabled=false` |
| `OTEL_SERVICE_NAME` | `adhar.tracing.resource.service-name` |
| `OTEL_RESOURCE_ATTRIBUTES` | `adhar.tracing.resource.attributes[...]` |
| `OTEL_TRACES_SAMPLER_ARG` (a value in 0–1) | `adhar.tracing.sampling.probability` |

If you set `adhar.tracing.open-telemetry.endpoint` but not `use-grpc`, the protocol follows the endpoint: port `4317` means gRPC, port `4318` or a `/v1/traces` path means HTTP.

## Use it

### Annotate a method

```java
import com.adhar.kit.tracing.annotation.NewSpan;
import com.adhar.kit.tracing.annotation.SpanTag;
import com.adhar.kit.tracing.util.AdharTracing;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final AdharTracing tracing;
    private final OrderRepository repository;

    public OrderService(AdharTracing tracing, OrderRepository repository) {
        this.tracing = tracing;
        this.repository = repository;
    }

    @NewSpan("order.place")
    public Order place(@SpanTag("order.sku") String sku,
                       @SpanTag(value = "order.tenant", expression = "tenantId") Customer customer) {
        tracing.addTag("order.channel", "web");   // tags the order.place span
        return repository.save(Order.of(sku, customer));
    }
}
```

| Annotation | Effect |
|---|---|
| `@NewSpan(value, tags)` | New child span around the method; name defaults to `Class.method` |
| `@ContinueSpan(tags, startEvent, endEvent)` | No new span; tags and events go on the current span |
| `@DatabaseSpan(operation, table, statement, database)` | Client span with `db.*` attributes |
| `@HttpClientSpan(method, url)` | Client span with `http.method`, `http.url` |
| `@MessagingSpan(operation, destination, destinationType, system)` | Producer span with `messaging.*` attributes |
| `@AsyncSpan(value, propagateContext)` | Span that ends when a returned `CompletableFuture` completes |
| `@SpanTag(value, expression)` | On a parameter: tag from its value, or a SpEL `expression` evaluated against it |

`tags` takes key/value pairs: `tags = {"tier", "gold"}`. JDBC, HTTP and messaging calls made through Boot-managed clients are already traced, so the `@DatabaseSpan`/`@HttpClientSpan`/`@MessagingSpan` annotations are for code those observations do not cover.

### Wrap a block in a span

```java
import com.adhar.kit.starter.AdharFacade;
import org.springframework.stereotype.Service;

@Service
public class ReportService {

    private final AdharFacade adhar;
    private final ReportRenderer renderer;

    public ReportService(AdharFacade adhar, ReportRenderer renderer) {
        this.adhar = adhar;
        this.renderer = renderer;
    }

    public Report build(ReportRequest request) {
        return adhar.getTracing().executeInSpan("report.build", () -> renderer.render(request));
    }
}
```

`TracingFacade.executeInSpan` makes the new span current, so spans started inside it (an outgoing HTTP call, a query) become its children. `adhar.traced(name, supplier)` does the same and also records a timer.

### Keep the trace across threads

```java
import com.adhar.kit.tracing.async.TraceContextTaskDecorator;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Bean
ThreadPoolTaskExecutor reportExecutor(TraceContextTaskDecorator decorator) {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setTaskDecorator(decorator);   // re-attaches the submitter's span
    return executor;
}
```

For a plain `ExecutorService`, wrap the task: `executor.submit(tracing.wrapWithTraceContext(task))`. `wrapWithTraceContext` has overloads for `Runnable`, `Callable`, `Supplier`, `Function` and `Consumer`.

### Pass baggage to a downstream call

The kit's propagators carry trace context only (W3C `traceparent`, B3 or Jaeger), not the W3C `baggage` header. Move baggage explicitly:

```java
tracing.setBaggage("tenant.id", tenantId);        // at the edge of the request

Map<String, String> headers = new HashMap<>();
tracing.injectBaggageIntoHeaders(headers);         // writes the W3C "baggage" header
// downstream: tracing.extractBaggageFromHeaders(incomingHeaders);
```

`injectBaggageIntoHeaders` sends only the keys in `baggage.remote-fields` when that list is set, otherwise all baggage. Keys in `baggage.correlation-fields` are also tagged onto the current span as `baggage.<key>`.

## Configuration

All keys are under `adhar.tracing`.

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Turns the whole auto-configuration on or off |
| `tags` | map | empty | Added to the resource as `adhar.<key>` |
| `sampling.mode` | string | `ratio` | `ratio` (head-based) or `tail` |
| `sampling.probability` | double | `1.0` | Head sampling: `<= 0` off, `>= 1` always, else trace-ID ratio |
| `sampling.tail.hold-window-ms` | long | `2000` | Wait after the root span ends before deciding; `0` decides inline |
| `sampling.tail.latency-threshold-ms` | long | `1000` | Keep traces whose root span is slower than this |
| `sampling.tail.keep-rate` | double | `0.1` | Fraction kept when neither error nor latency applies |
| `sampling.tail.max-buffered-traces` | int | `1000` | Pending traces before the oldest is decided early |
| `sampling.tail.trace-timeout-ms` | long | `30000` | Decide a trace whose root never ends |
| `open-telemetry.enabled` | boolean | `true` | OTLP exporter |
| `open-telemetry.endpoint` | string | `http://localhost:4317` | Collector address; HTTP gets `/v1/traces` appended when the URL has no path |
| `open-telemetry.use-grpc` | boolean | `true` | gRPC (`true`) or HTTP/protobuf (`false`) |
| `open-telemetry.timeout` | ISO-8601 duration | `PT30S` | Export timeout |
| `open-telemetry.headers` | map | empty | Headers sent with each export |
| `open-telemetry.compression` | string | `gzip` | `gzip` or `none` |
| `zipkin.enabled` | boolean | `false` | Zipkin exporter; add `io.opentelemetry:opentelemetry-exporter-zipkin` |
| `zipkin.base-url` / `zipkin.api-path` | string | `http://localhost:9411` / `/api/v2/spans` | Zipkin endpoint |
| `zipkin.read-timeout` | ISO-8601 duration | `PT10S` | Zipkin read timeout |
| `jaeger.enabled` | boolean | `false` | Extra OTLP gRPC exporter aimed at Jaeger |
| `jaeger.grpc-endpoint` | string | `http://localhost:14250` | Target when `jaeger.use-grpc=true` |
| `jaeger.http-endpoint` | string | `http://localhost:14268/api/traces` | Target when `jaeger.use-grpc=false` (still sent as OTLP gRPC) |
| `jaeger.timeout` | ISO-8601 duration | `PT30S` | Export timeout |
| `propagation.type` | string | `tracecontext` | `tracecontext` (or `w3c`), `b3`, `jaeger`; anything else falls back to W3C |
| `propagation.additional-formats` | string[] | empty | Extra formats: `b3`, `jaeger`, `tracecontext` |
| `propagation.b3-single-header` | boolean | `false` | Single `b3` header instead of `X-B3-*` |
| `baggage.enabled` | boolean | `true` | Baggage API; `false` makes it a no-op |
| `baggage.remote-fields` | string[] | empty | Keys `injectBaggageIntoHeaders` sends (all when empty) |
| `baggage.correlation-fields` | string[] | empty | Keys also tagged on the current span |
| `baggage.max-entries` / `baggage.max-value-length` | int | `100` / `1000` | Limits applied by `extractBaggageFromHeaders` |
| `web.mdc-enabled` | boolean | `true` | Register `TraceContextMdcFilter` |
| `web.server-spans-enabled` | boolean | `true` | Register `TracingServerSpanFilter` |
| `web.skip-patterns` | string[] | `/actuator/**`, `/health/**`, `/info/**` | Paths both filters skip |
| `web.detect-existing-instrumentation` | boolean | `true` | Disable the server-span filter when a class in `web.instrumentation-detection-classes` (OpenTelemetry Java agent, OTel Spring WebMVC) is present |
| `resource.service-name` | string | `${spring.application.name:unknown-service}` | `service.name` |
| `resource.service-version` / `service-namespace` | string | `unknown` / `default` | `service.version`, `service.namespace` |
| `resource.service-instance-id` | string | `${random.uuid}` | `service.instance.id` |
| `resource.attributes` | map | empty | Extra resource attributes; empty values are skipped |
| `metrics.enabled` | boolean | `true` | Register `SpanMetricsProcessor` (needs a `MeterRegistry` bean) |
| `metrics.meter-prefix` | string | `span` | Meter names `<prefix>.duration`, `<prefix>.errors` |
| `metrics.include-span-kind` / `metrics.record-errors` | boolean | `true` / `true` | Add the `span.kind` tag; record the `error` tag and error counter |

These keys bind but nothing reads them, so setting them has no effect: `sampling.rate-limit`, `sampling.per-service`, `sampling.per-operation`, `open-telemetry.interval`, `zipkin.connect-timeout`, `zipkin.sender-type`, `zipkin.kafka-*`, `web.enabled`, `web.trace-http-clients`, `web.trace-http-servers`, `web.include-*`, `web.max-url-tags`, `resource.auto-detect`, and everything under `database.*` and `messaging.*`. JDBC capture is set by datasource-micrometer instead; the kit defaults it to `jdbc.includes=connection,query` and `jdbc.datasource-proxy.include-parameter-values=false`.

## Operations

- **Metrics.** With a `MeterRegistry`, every recorded span produces a timer `span.duration` (tags `span.name`, `span.kind`, `error`) and, for spans with status `ERROR`, a counter `span.errors`.
- **Export failures** never fail a request. `BatchSpanProcessor` queues and drops spans when the collector is unreachable. A broken exporter configuration logs an error at startup and that exporter is skipped; with no exporter left, the module logs `No tracing exporters configured`.
- **Shutdown.** A JVM shutdown hook closes the tracer provider, which flushes pending batches. In tail mode, still-buffered traces go through the normal decision first.
- **Tail sampling cost.** Tail mode forces the head sampler to `alwaysOn`, so every span is recorded and buffered; you save only on export and storage. Peak heap is roughly `max-buffered-traces × spans per trace`. When the buffer overflows, the oldest trace is decided before its root ends, so the latency rule cannot keep it. Decisions run on one daemon thread, `adhar-tail-sampling`, behind a single lock.

## Limits

- **Error status.** The aspect and `AdharTracing` record exceptions as tags (`success=false`, `error.class`, `error.message`), not as span status `ERROR`. Tail sampling's error rule and `span.errors` see only `ERROR` status, which Boot's observations and `TracingServerSpanFilter` (5xx or exception) set. To mark a span yourself, call `tracer.currentSpan().error(e)` on the Micrometer `Tracer`.
- **`AdharTracing.withinSpan*` does not make the span current.** Tags added with `addTag` and child spans started inside the block attach to the enclosing span. Use `TracingFacade.executeInSpan` or `@NewSpan` when nesting matters.
- **Self-invocation bypasses the aspect.** Calling an annotated method through `this` creates no span. Call it through another bean, or use `executeInSpan`.
- **Tail sampling is per process.** A span with a remote parent counts as a root, so each service decides on its own part of the trace and backends can receive partial traces. For whole-trace decisions, sample in an OpenTelemetry Collector and keep `sampling.mode=ratio`.
- **Baggage scope handles are shared.** `setBaggage` keeps its scope handle in a map on the singleton keyed by name, not per thread. Set a small, fixed set of keys once per request, and call `clearBaggage()` in test teardown.
- **Web filters are servlet-only.** A WebFlux-only application gets neither the MDC filter nor the fallback server-span filter.
- **Jaeger exporter is OTLP gRPC** even with `jaeger.use-grpc=false`. Jaeger accepts OTLP natively, so the simpler option is the default OTLP exporter pointed at Jaeger's OTLP port.
- **Facade on other runtimes.** `TracingFacade.getInstance()` cannot build the Quarkus, Micronaut, Helidon or Vert.x adapter on its own. Construct the adapter with a `Tracer` and pass it to `new TracingFacade(adapter)`, then `adhar.setTracing(...)`.

## Next steps

- [Logging](/adhar-kit/modules/logging): uses the `traceId` and `spanId` this module puts in the MDC.
- [Metrics](/adhar-kit/modules/metrics): the registry that receives `span.duration` and `span.errors`.
- [Messaging](/adhar-kit/modules/messaging): Kafka and RabbitMQ sends that carry the trace.
- [Observability](/docs/operations/observability): Tempo and Grafana on the platform.
