---
title: "Logging"
section: "Modules"
order: 13
path: "/adhar-kit/modules/logging"
---

# Logging

`adhar-kit-logging` is an enterprise logging framework: a universal `AdharLogger` facade, structured JSON output, MDC/correlation, sensitive-data masking, distributed-trace correlation, and eleven AOP annotations for zero-boilerplate logging of methods, audits, and business events. It exists because **logs are only useful when they join up** — with each other across services, with traces, and with an audit trail — and because the fastest way to leak a credential is an unfiltered `log.info` on a request body.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-logging` (package `com.adhar.adharkit.logging`) |
| Built on | Logback, `logstash-logback-encoder`, SLF4J MDC, Micrometer Tracing (Brave bridge), `adhar-kit-commons` |
| Entry points | `AdharLogger`, `LoggingFacade`, the annotation set, `AppLogEventPublisher` |
| Auto-configuration | `AdharLoggingAutoConfiguration` (gated on `adhar.logging.enabled`) |
| Frameworks | Spring, Quarkus, Micronaut, Helidon, Vert.x adapters |
| Use it when | You need correlated, machine-parseable logs and a compliance-grade event trail |

## How it works

There are two output paths, and keeping them apart is the key to the module. Ordinary log statements go through `AdharLogger` to SLF4J and out via `MaskingJsonEncoder`. Structured *events* — business, audit, performance, batch, API — go through `AppLogEventPublisher` to any number of `AppLogEventSink`s, of which `Slf4jAppLogEventSink` is the default.

```diagram
kit-logging-paths
```

`MdcLoggingFilter` seeds the MDC for each request; `LoggerInjectionBeanPostProcessor` satisfies `@InjectLogger` fields.

**The two paths mask with two different implementations**, and that is the single most important thing to internalise:

| | SLF4J path | Event path |
|---|---|---|
| Masker | `MaskingJsonEncoder` (a logback encoder) | `LogDataMasker` (a Spring bean) |
| Where it runs | Inside logback, at encode time | Inside `AppLogEventPublisher`, before any sink |
| Scans | `key=value` / `key: value` pairs in the formatted message, sensitive MDC keys, throwable messages (including causes) | The event message, error message and metadata map — recursively through nested maps and collections |
| Honours `strategy`, `mask-credit-cards`, `mask-ssn`, `mask-emails`, `custom-patterns` | No | Yes |
| Honours `additional-keys` | Only on the Spring `MaskingJsonEncoder` bean, which logback does not use | Yes |
| Replacement | always `********` | `FULL` / `PARTIAL` / `HASH` per `strategy` |

On the event path, masking happens in the publisher before dispatch, so a custom sink cannot bypass it. On the SLF4J path, masking happens in whichever encoder your logback configuration instantiates.

The module ships a `logback-spring.xml` that declares `MaskingJsonEncoder` inline in each JSON appender (console, rolling file, Logstash), wired to `adhar.logging.*` through `springProperty` placeholders. Only one `logback-spring.xml` is used — if your application supplies its own, the module's is not applied and you must copy the encoder blocks across, or nothing on the SLF4J path is masked.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-logging</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`AdharLogger`** — the facade. Level methods take the source class: `info(Class, msg, args)`, `debug`, `warn`, `error(Class, msg, Throwable)`, `trace`, plus `infoJson` / `errorJson` variants that serialize an object as a field. Context: `put`, `get`, `putAll`, `remove`, `clear`, `withContext(Map, Runnable)`, `withContextSupplier(Map, Supplier)`. Correlation and trace: `ensureCorrelationId`, `setCorrelationId`, `getCorrelationId`, `setUserId`, `setTracingInfo`, `getTraceId`, `getSpanId`.
- **Annotations (11)** — `@Loggable`, `@LogExecutionTime`, `@LogExceptions`, `@LogMetrics`, `@Audit`, `@Sensitive`, `@LogOperation`, `@BusinessEvent`, `@TrackPerformance`, `@LogBatchJob`, `@InjectLogger`.
- **Event pipeline** — `AppLogEvent`, `AppLogEventType` (`BUSINESS`, `OPERATION`, `API`, `BATCH`, `PERFORMANCE`, `AUDIT`, `SECURITY`, `SYSTEM`), `AppLogEventOutcome`, `AppLogEventPublisher`, `AppLogEventSink`, and the typed producers `BusinessEventLogger`, `AuditEventLogger`, `BatchJobLogger`, `PerformanceLogger`.
- **Masking** — `LogDataMasker` (`maskText`, `maskValue`, `maskMap`, `isSensitiveKey`, `applyStrategy`) and `MaskingStrategy` (`FULL`, `PARTIAL`, `HASH`).
- **Web** — `MdcLoggingFilter`, `RestApiLoggingFilter`, `RestApiLoggingInterceptor`.

## A realistic service

Declarative entry/exit logging, a masked argument, a business event, an audit record, and a scoped MDC addition:

```java
import com.adhar.adharkit.logging.annotation.Audit;
import com.adhar.adharkit.logging.annotation.BusinessEvent;
import com.adhar.adharkit.logging.annotation.Loggable;
import com.adhar.adharkit.logging.util.AdharLogger;
import java.util.Map;

@Service
public class PaymentService {

    private final AdharLogger log;
    private final PaymentGateway gateway;

    public PaymentService(AdharLogger log, PaymentGateway gateway) {
        this.log = log;
        this.gateway = gateway;
    }

    @Loggable(logArgs = true, logResult = true, maskFields = {"cardNumber"})
    @BusinessEvent(value = "payment.captured", category = "billing",
                   includeResult = true, tags = {"channel", "web"})
    @Audit(eventType = "PAYMENT_CAPTURE", includeArgs = true, includeUser = true)
    public PaymentResult capture(PaymentRequest request) {
        return log.withContextSupplier(Map.of("paymentId", request.getId()), () -> {
            try {
                return gateway.charge(request);
            } catch (GatewayException e) {
                // the business event is still published, with outcome FAILURE
                log.error(PaymentService.class, "capture failed for {}", request.getId(), e);
                throw e;
            }
        });
    }
}
```

`@BusinessEvent` publishes on both paths of control flow: `SUCCESS` when the method returns, `FAILURE` with severity `ERROR` and the throwable attached when it throws — and the exception is rethrown unchanged. The event always carries `durationMs`. `withContextSupplier` adds `paymentId` to the MDC for the duration of the lambda and removes it afterwards, so the key does not leak onto the pooled request thread.

## How it behaves

**Thread-safety and scope.** `AdharLogger`, `LogDataMasker`, `AppLogEventPublisher`, `Slf4jAppLogEventSink`, every aspect and every typed event logger is a singleton shared across request threads. `LogDataMasker` is immutable after construction — the key set and compiled patterns are built once in the constructor and stored in immutable collections. The only per-thread state anywhere is the SLF4J MDC.

**Event publishing is synchronous and in-line.** `publish(event)` enriches the event from the MDC, masks it, then calls every sink on the *calling* thread, in registration order. There is no queue and no worker pool: a slow sink slows down your business method. A sink that throws is caught, logged at WARN, and the remaining sinks still run — business code never fails because of a logging sink.

**Log writes are partly asynchronous.** In the bundled logback configuration the console appender is synchronous, while the file appender is wrapped in a logback `AsyncAppender` with `queueSize = adhar.logging.async.queue-size` (1024) and `discardingThreshold = 0`. A discarding threshold of zero means nothing is dropped — when the queue fills, the appending thread **blocks** until space is available. That is backpressure, not loss, and it means a stalled disk can stall request threads.

**Failure behaviour.** Nothing in the module throws into business code. `AppLogEventPublisher` swallows sink failures; `Slf4jAppLogEventSink` falls back to `event.toString()` if JSON serialization fails; `LogDataMasker` returns its input unchanged when masking is disabled. The one silent no-op worth knowing is the opposite risk: when `adhar.logging.events.enabled=false`, `publish` returns immediately and every `@BusinessEvent` / `@Audit` / `@LogOperation` record disappears with no warning.

**Masking cost on a hot path.** `LogDataMasker` compiles one `key=value` regex per sensitive key — eleven by default, plus every entry in `additional-keys` — and `maskText` runs `replaceAll` for *each* of them over the whole string, then once more for every enabled value pattern (credit card, SSN, email, custom). That is a linear scan of the text per pattern, with a fresh `Matcher` and a new `String` per pass, and `maskMap` recurses into nested maps and collections. It is not free. On a hot path, prefer `@Loggable(sampleRate = 0.05)`, keep `additional-keys` and `custom-patterns` tight, and do not put large payloads into event metadata. Masking is skipped entirely when `adhar.logging.masking.enabled=false`.

**Masking fidelity.** `PARTIAL` keeps the last four characters only when the value is longer than eight, otherwise it falls back to a full mask. `HASH` emits `sha256:` plus the first eight bytes of the digest in hex, which is stable — equal values stay correlatable across log lines without revealing the value.

**Lifecycle.** `AdharLogger` is created with a `Tracer` when one is on the classpath and without it otherwise, so `getTraceId()` returns null rather than failing in a service with no tracing. The MDC filter only registers in a servlet web application. Everything is gated on `adhar.logging.enabled`.

**Logger lookup.** `AdharLogger.info(Class, ...)` calls `LoggerFactory.getLogger(source)` on every call rather than caching a `Logger`. SLF4J's own logger map makes that a hash lookup, but if you are logging in a tight loop, hold a `Logger` from `log.logger(MyClass.class)` and call it directly.

## Aspect mechanics

Every annotation except `@InjectLogger` and `@Sensitive` is implemented by a proxy-based Spring AOP aspect. The aspects are registered only when `adhar.logging.aspects.enabled` is true (the default) and `aspectjweaver` is on the classpath; `AdharLoggingAutoConfiguration` carries `@EnableAspectJAutoProxy`, so you do not add it yourself.

> **Self-invocation bypasses the proxy.** A `this.capture(request)` call from another method of `PaymentService` reaches the target object directly: no entry/exit log, no business event, no audit record, no exception — just missing telemetry you will not notice until an audit. Call through an injected reference to the bean, or move the annotated method to a collaborator.

`@Loggable` is the one annotation that also works at class level (`@within`), applying to every method of the bean. It samples with `ThreadLocalRandom` against `sampleRate` (default `1.0`); the check runs before anything else, so a sampled-out call costs one random draw. `maskFields` and `@Sensitive` on parameters are handled by `LoggableAspect` itself, independently of `LogDataMasker`.

When the aspects are disabled the annotations remain on your code and do nothing — there is no startup warning.

## Masking configuration

These keys drive `LogDataMasker`, which is what the event pipeline and the event aspects use:

```yaml
adhar:
  logging:
    masking:
      enabled: true
      strategy: FULL          # FULL | PARTIAL | HASH
      mask-credit-cards: true
      mask-ssn: true
      mask-emails: false
      additional-keys: [apiKey, secretToken, clientSecret]
      custom-patterns:
        - "ACC-\\d{6}"
```

The eleven always-masked keys are `password`, `secret`, `token`, `authorization`, `credential`, `creditCard`, `ssn`, `socialSecurity`, `accountNumber`, `apiKey`, `privateKey` — matched case-insensitively.

## Structured JSON and trace correlation

Every line is emitted as JSON with the MDC attached; when tracing is on, `traceId` and `spanId` are attached so logs and traces line up in Grafana:

```yaml
adhar:
  logging:
    enabled: true
    mdc:
      enabled: true
      include-correlation-id: true
      include-tenant-id: true
    tracing:
      enabled: true
      include-trace-id: true
      include-span-id: true
    events:
      enabled: true
      logger-prefix: ADHAR_EVENT
    aspects:
      enabled: true
```

Typed events land on dedicated SLF4J loggers named `<logger-prefix>.<TYPE>` — `ADHAR_EVENT.BUSINESS`, `ADHAR_EVENT.AUDIT`, `ADHAR_EVENT.PERFORMANCE`, `ADHAR_EVENT.BATCH` — at the event's own severity, so you can route or retain them independently of application logs with ordinary logback configuration.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.logging.enabled` | Master switch | `true` |
| `adhar.logging.aspects.enabled` | Register all annotation aspects | `true` |
| `adhar.logging.masking.enabled` | Mask before any sink | `true` |
| `adhar.logging.masking.strategy` | `FULL`, `PARTIAL`, or `HASH` | `FULL` |
| `adhar.logging.mdc.enabled` | Register `MdcLoggingFilter` | `true` |
| `adhar.logging.tracing.include-trace-id` | Add `traceId` to the MDC | `true` |
| `adhar.logging.events.enabled` | Publish `AppLogEvent`s at all | `true` |
| `adhar.logging.events.logger-prefix` | Logger name prefix for typed events | `ADHAR_EVENT` |
| `adhar.logging.console.json` | JSON on stdout rather than a pattern | `true` |
| `adhar.logging.file.max-history` | Rolled files retained | `7` |
| `adhar.logging.file.total-size-cap` | Total on-disk cap | `1GB` |
| `adhar.logging.async.queue-size` | Async appender queue depth | `1024` |
| `adhar.logging.async.discarding-threshold` | `0` = never discard, block instead | `0` |
| `adhar.logging.rest-api.max-payload-length` | Captured payload characters | `2048` |
| `adhar.logging.rest-api.slow-request-threshold-ms` | Above this, flag and log at WARN | `3000` |
| `adhar.logging.performance.slow-threshold-ms` | Above this, log the operation at WARN | `1000` |
| `adhar.logging.batch.progress-log-interval` | Items between progress events | `1000` |
| `adhar.logging.audit.include-changes` | Allow masked before/after values | `true` |

## Testing

- **Capture events, not strings.** Define your own `AppLogEventSink` bean that collects into a list and assert on `AppLogEvent` fields (`type`, `name`, `outcome`, `durationMs`, `metadata`). Note the condition: the default `Slf4jAppLogEventSink` is `@ConditionalOnMissingBean(AppLogEventSink.class)`, so your test sink **replaces** it rather than adding to it. Declare both if you want the JSON line as well.
- **Masking in isolation.** `new LogDataMasker(new AdharLoggingProperties.MaskingProperties())` needs no Spring: set `strategy`, `additionalKeys` and `customPatterns` on the properties object and assert `maskText` / `maskMap` directly. This is much faster than asserting against captured log output.
- **Disable the side effects.** `adhar.logging.aspects.enabled=false` removes every aspect from a unit test; `adhar.logging.events.enabled=false` silences the event pipeline; `adhar.logging.enabled=false` removes the whole auto-configuration.
- **Aspect coverage needs a context.** `@Loggable` and `@BusinessEvent` only fire on a proxied bean, so assert them from a `@SpringBootTest`, never from a hand-constructed service.
- **Sampling.** Pin `sampleRate = 1.0` in anything you assert on; a sampled annotation is non-deterministic by design.
- **MDC hygiene.** Clear the MDC in `@AfterEach`. JUnit reuses threads, and an MDC key left behind by one test shows up in the next one's captured output.

## Interaction with sibling modules

`AppLogEventPublisher` enriches every event from the MDC using the configured field names, so the `correlationId`, `requestId` and `tenantId` written by [Commons](/adhar-kit/modules/commons)' filters land on business and audit events automatically — and `userId` too, once something sets it. `traceId` and `spanId` come from [Tracing](/adhar-kit/modules/tracing): `AdharLogger` picks up a `Tracer` bean when the module is present, and `TraceContextMdcFilter` mirrors the ids into the MDC for the SLF4J path. Across a thread hop, [Core](/adhar-kit/modules/core)'s `ContextPropagatingExecutor` carries the MDC map, so log correlation survives `@Async` work even though plain thread-locals do not. `@LogMetrics` is the bridge towards [Metrics](/adhar-kit/modules/metrics) when you want a counter as well as a log line.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Annotations have no effect | Self-invocation, or `aspectjweaver` absent | Call through the proxy; check `adhar.logging.aspects.enabled` |
| A secret still appears in a log | Its field name is not in the default set | Add it to `masking.additional-keys`, or a regex to `custom-patterns` |
| `additional-keys` works for events but not for plain log lines | Logback instantiates its own `MaskingJsonEncoder`, which does not read that property | Declare the extra keys in your logback encoder block |
| No masking at all on stdout | Your application supplies its own `logback-spring.xml`, so the module's is not used | Copy the `MaskingJsonEncoder` encoder block into yours |
| No `traceId` in log lines | [Tracing](/adhar-kit/modules/tracing) is not on the classpath, so no `Tracer` bean exists | Add the tracing module; `AdharLogger` picks up the `Tracer` automatically |
| Business events vanished after adding a custom sink | The default sink is `@ConditionalOnMissingBean(AppLogEventSink.class)` | Declare `Slf4jAppLogEventSink` explicitly alongside yours |
| Request bodies are missing from API events | Payload capture is opt-in | Set `adhar.logging.rest-api.include-request-payload: true` |
| Business events are hard to find | They go to `ADHAR_EVENT.BUSINESS`, not your application logger | Configure a level or appender for that logger name |
| Throughput drops under load with large payloads | Masking scans every pattern over every string, and the file appender blocks when its queue is full | Sample with `@Loggable(sampleRate = …)`, trim patterns, cap payload length |

## See also

- [Metrics](/adhar-kit/modules/metrics) — the second leg of the observability trio
- [Tracing](/adhar-kit/modules/tracing) — supplies the `traceId` / `spanId` these logs carry
- [Commons](/adhar-kit/modules/commons) — sets `correlationId`, `requestId`, and `tenantId` in the MDC
- [Observability](/docs/operations/observability) — how these logs reach Loki and Grafana on the platform
