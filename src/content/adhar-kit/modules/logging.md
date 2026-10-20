---
title: "Logging"
section: "Modules"
order: 13
path: "/adhar-kit/modules/logging"
---

# Logging

`adhar-kit-logging` is an enterprise logging framework. It gives you:

- a universal `AdharLogger` facade
- structured JSON output
- MDC/correlation and distributed-trace correlation
- sensitive-data masking
- eleven AOP annotations that log methods, audits and business events with no boilerplate

It exists because **logs are only useful when they join up**: with each other across services, with traces, and with an audit trail. It also exists because the fastest way to leak a credential is an unfiltered `log.info` on a request body.

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

There are two output paths. Keeping them apart is the key to understanding the module.

- Ordinary log statements go through `AdharLogger` to SLF4J and out via `MaskingJsonEncoder`.
- Structured *events* (business, audit, performance, batch, API) go through `AppLogEventPublisher` to any number of `AppLogEventSink`s. `Slf4jAppLogEventSink` is the default sink.

```diagram
kit-logging-paths
```

`MdcLoggingFilter` seeds the MDC for each request. `LoggerInjectionBeanPostProcessor` fills `@InjectLogger` fields.

**The two paths mask with two different implementations.** This is the most important thing to understand:

| | SLF4J path | Event path |
|---|---|---|
| Masker | `MaskingJsonEncoder` (a logback encoder) | `LogDataMasker` (a Spring bean) |
| Where it runs | Inside logback, at encode time | Inside `AppLogEventPublisher`, before any sink |
| Scans | `key=value` / `key: value` pairs in the formatted message; sensitive MDC keys; throwable messages (including causes) | The event message, error message and metadata map, recursing through nested maps and collections |
| Honours `strategy`, `mask-credit-cards`, `mask-ssn`, `mask-emails`, `custom-patterns` | No | Yes |
| Honours `additional-keys` | Only on the Spring `MaskingJsonEncoder` bean, which logback does not use | Yes |
| Replacement | always `********` | `FULL` / `PARTIAL` / `HASH` per `strategy` |

On the event path, the publisher masks before dispatch, so a custom sink cannot bypass it. On the SLF4J path, masking happens in whichever encoder your logback configuration creates.

The module ships a `logback-spring.xml`. It declares `MaskingJsonEncoder` inline in each JSON appender (console, rolling file, Logstash), wired to `adhar.logging.*` through `springProperty` placeholders.

Only one `logback-spring.xml` is used. If your application supplies its own, the module's is not applied. You must then copy the encoder blocks across, or nothing on the SLF4J path is masked.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-logging</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`AdharLogger`** — the facade.
  - Level methods take the source class: `info(Class, msg, args)`, `debug`, `warn`, `error(Class, msg, Throwable)`, `trace`. The `infoJson` / `errorJson` variants serialize an object as a field.
  - Context: `put`, `get`, `putAll`, `remove`, `clear`, `withContext(Map, Runnable)`, `withContextSupplier(Map, Supplier)`.
  - Correlation and trace: `ensureCorrelationId`, `setCorrelationId`, `getCorrelationId`, `setUserId`, `setTracingInfo`, `getTraceId`, `getSpanId`.
- **Annotations (11)** — `@Loggable`, `@LogExecutionTime`, `@LogExceptions`, `@LogMetrics`, `@Audit`, `@Sensitive`, `@LogOperation`, `@BusinessEvent`, `@TrackPerformance`, `@LogBatchJob`, `@InjectLogger`.
- **Event pipeline** — `AppLogEvent`, `AppLogEventType` (`BUSINESS`, `OPERATION`, `API`, `BATCH`, `PERFORMANCE`, `AUDIT`, `SECURITY`, `SYSTEM`), `AppLogEventOutcome`, `AppLogEventPublisher`, `AppLogEventSink`, and the typed producers `BusinessEventLogger`, `AuditEventLogger`, `BatchJobLogger`, `PerformanceLogger`.
- **Masking** — `LogDataMasker` (`maskText`, `maskValue`, `maskMap`, `isSensitiveKey`, `applyStrategy`) and `MaskingStrategy` (`FULL`, `PARTIAL`, `HASH`).
- **Web** — `MdcLoggingFilter`, `RestApiLoggingFilter`, `RestApiLoggingInterceptor`.

## A realistic service

This example shows declarative entry/exit logging, a masked argument, a business event, an audit record, and a scoped MDC addition:

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

`@BusinessEvent` publishes whether the method returns or throws:

- When the method returns, it publishes `SUCCESS`.
- When it throws, it publishes `FAILURE` with severity `ERROR` and the throwable attached. The exception is rethrown unchanged.

The event always carries `durationMs`. `withContextSupplier` adds `paymentId` to the MDC while the lambda runs and removes it afterwards. So the key does not leak onto the pooled request thread.

## How it behaves

**Thread-safety and scope.** `AdharLogger`, `LogDataMasker`, `AppLogEventPublisher`, `Slf4jAppLogEventSink`, every aspect and every typed event logger is a singleton shared across request threads. `LogDataMasker` is immutable after construction. Its key set and compiled patterns are built once in the constructor and stored in immutable collections. The only per-thread state anywhere is the SLF4J MDC.

**Event publishing is synchronous and in-line.** `publish(event)` enriches the event from the MDC and masks it. Then it calls every sink on the *calling* thread, in registration order. There is no queue and no worker pool, so a slow sink slows down your business method. If a sink throws, the error is caught and logged at WARN, and the remaining sinks still run. Business code never fails because of a logging sink.

**Log writes are partly asynchronous.** In the bundled logback configuration, the console appender is synchronous. The file appender is wrapped in a logback `AsyncAppender` with `queueSize = adhar.logging.async.queue-size` (1024) and `discardingThreshold = 0`.

A discarding threshold of zero means nothing is dropped. When the queue fills, the appending thread **blocks** until there is space. That is backpressure, not loss. It also means a stalled disk can stall request threads.

**Failure behaviour.** Nothing in the module throws into business code:

- `AppLogEventPublisher` swallows sink failures.
- `Slf4jAppLogEventSink` falls back to `event.toString()` if JSON serialization fails.
- `LogDataMasker` returns its input unchanged when masking is disabled.

The one silent no-op worth knowing is the opposite risk. When `adhar.logging.events.enabled=false`, `publish` returns immediately. Every `@BusinessEvent` / `@Audit` / `@LogOperation` record then disappears with no warning.

**Masking cost on a hot path.** `LogDataMasker` compiles one `key=value` regex per sensitive key: eleven by default, plus every entry in `additional-keys`. `maskText` runs `replaceAll` for *each* of them over the whole string. Then it runs once more for every enabled value pattern (credit card, SSN, email, custom).

That is a linear scan of the text per pattern, with a fresh `Matcher` and a new `String` per pass. `maskMap` also recurses into nested maps and collections. It is not free. On a hot path:

- prefer `@Loggable(sampleRate = 0.05)`
- keep `additional-keys` and `custom-patterns` tight
- do not put large payloads into event metadata

Masking is skipped entirely when `adhar.logging.masking.enabled=false`.

**Masking fidelity.** `PARTIAL` keeps the last four characters only when the value is longer than eight. Otherwise it falls back to a full mask. `HASH` emits `sha256:` plus the first eight bytes of the digest in hex. This is stable, so equal values can still be matched across log lines without revealing the value.

**Lifecycle.** `AdharLogger` is created with a `Tracer` when one is on the classpath, and without it otherwise. So in a service with no tracing, `getTraceId()` returns null instead of failing. The MDC filter only registers in a servlet web application. Everything is gated on `adhar.logging.enabled`.

**Logger lookup.** `AdharLogger.info(Class, ...)` calls `LoggerFactory.getLogger(source)` on every call instead of caching a `Logger`. SLF4J's own logger map makes that a hash lookup. But if you log in a tight loop, hold a `Logger` from `log.logger(MyClass.class)` and call it directly.

## Aspect mechanics

Every annotation except `@InjectLogger` and `@Sensitive` is implemented by a proxy-based Spring AOP aspect. The aspects are registered only when both of these hold:

- `adhar.logging.aspects.enabled` is true (the default)
- `aspectjweaver` is on the classpath

`AdharLoggingAutoConfiguration` carries `@EnableAspectJAutoProxy`, so you do not add it yourself.

> **Self-invocation bypasses the proxy.** A `this.capture(request)` call from another method of `PaymentService` reaches the target object directly. You get no entry/exit log, no business event, no audit record and no exception. The telemetry is just missing, and you will not notice until an audit. Call through an injected reference to the bean, or move the annotated method to a collaborator.

`@Loggable` is the one annotation that also works at class level (`@within`), where it applies to every method of the bean. It samples with `ThreadLocalRandom` against `sampleRate` (default `1.0`). The check runs before anything else, so a sampled-out call costs one random draw. `LoggableAspect` itself handles `maskFields` and `@Sensitive` on parameters, separately from `LogDataMasker`.

When the aspects are disabled, the annotations stay on your code and do nothing. There is no startup warning.

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

The eleven keys that are always masked are `password`, `secret`, `token`, `authorization`, `credential`, `creditCard`, `ssn`, `socialSecurity`, `accountNumber`, `apiKey`, `privateKey`. They are matched case-insensitively.

## Structured JSON and trace correlation

Every line is emitted as JSON with the MDC attached. When tracing is on, `traceId` and `spanId` are attached too, so logs and traces line up in Grafana:

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

Typed events land on dedicated SLF4J loggers named `<logger-prefix>.<TYPE>`: `ADHAR_EVENT.BUSINESS`, `ADHAR_EVENT.AUDIT`, `ADHAR_EVENT.PERFORMANCE`, `ADHAR_EVENT.BATCH`. Each is logged at the event's own severity. So you can route or retain them separately from application logs with ordinary logback configuration.

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

- **Capture events, not strings.** Define your own `AppLogEventSink` bean that collects into a list. Assert on `AppLogEvent` fields (`type`, `name`, `outcome`, `durationMs`, `metadata`). Note the condition: the default `Slf4jAppLogEventSink` is `@ConditionalOnMissingBean(AppLogEventSink.class)`. So your test sink **replaces** it instead of adding to it. Declare both if you want the JSON line as well.
- **Masking in isolation.** `new LogDataMasker(new AdharLoggingProperties.MaskingProperties())` needs no Spring. Set `strategy`, `additionalKeys` and `customPatterns` on the properties object, and assert `maskText` / `maskMap` directly. This is much faster than asserting against captured log output.
- **Disable the side effects.**
  - `adhar.logging.aspects.enabled=false` removes every aspect from a unit test.
  - `adhar.logging.events.enabled=false` silences the event pipeline.
  - `adhar.logging.enabled=false` removes the whole auto-configuration.
- **Aspect coverage needs a context.** `@Loggable` and `@BusinessEvent` only fire on a proxied bean. Assert them from a `@SpringBootTest`, never from a service you built by hand.
- **Sampling.** Pin `sampleRate = 1.0` in anything you assert on. A sampled annotation is non-deterministic by design.
- **MDC hygiene.** Clear the MDC in `@AfterEach`. JUnit reuses threads, and an MDC key left behind by one test shows up in the next one's captured output.

## Interaction with sibling modules

`AppLogEventPublisher` enriches every event from the MDC, using the configured field names. So the `correlationId`, `requestId` and `tenantId` written by [Commons](/adhar-kit/modules/commons)' filters land on business and audit events automatically. So does `userId`, once something sets it.

`traceId` and `spanId` come from [Tracing](/adhar-kit/modules/tracing). `AdharLogger` picks up a `Tracer` bean when the module is present. `TraceContextMdcFilter` copies the ids into the MDC for the SLF4J path.

Across a thread hop, [Core](/adhar-kit/modules/core)'s `ContextPropagatingExecutor` carries the MDC map. So log correlation survives `@Async` work, even though plain thread-locals do not.

`@LogMetrics` is the bridge to [Metrics](/adhar-kit/modules/metrics) when you want a counter as well as a log line.

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
