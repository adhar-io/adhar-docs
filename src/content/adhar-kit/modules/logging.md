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

There are two output paths, and keeping them apart is the key to the module. Ordinary log statements go through `AdharLogger` to SLF4J and out via `MaskingJsonEncoder`. Structured *events* — business, audit, performance, batch, API — go through `AppLogEventPublisher` to any number of `AppLogEventSink`s, of which `Slf4jAppLogEventSink` is the default. Both paths pass through `LogDataMasker` first.

```text
  @Loggable / log.info(...)        @BusinessEvent / @Audit / @LogBatchJob
          |                                   |
          v                                   v
      AdharLogger                    AppLogEventPublisher
          |                                   |
          |                          LogDataMasker (mask before any sink)
          |                                   |
          |                          +--------+---------+
          |                          |                  |
          |                  Slf4jAppLogEventSink   <your sink>
          |                          |
          +----------+---------------+
                     v
            MaskingJsonEncoder  (+ MDC: correlationId, requestId,
                                  tenantId, userId, traceId, spanId)
                     v
              stdout / file / Logstash
```

`MdcLoggingFilter` seeds the MDC for each request; `LoggerInjectionBeanPostProcessor` satisfies `@InjectLogger` fields. Masking is applied **before** a value reaches any sink, so a custom sink cannot accidentally bypass it.

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
- **Event pipeline** — `AppLogEvent`, `AppLogEventType` (`BUSINESS`, `OPERATION`, `API`, `BATCH`, `PERFORMANCE`, `AUDIT`, `SECURITY`, `SYSTEM`), `AppLogEventPublisher`, `AppLogEventSink`, and the typed producers `BusinessEventLogger`, `AuditEventLogger`, `BatchJobLogger`, `PerformanceLogger`.
- **Masking** — `LogDataMasker` and `MaskingStrategy` (`FULL`, `PARTIAL` keeps the last four characters, `HASH` emits a SHA-256 prefix).
- **Web** — `MdcLoggingFilter`, `RestApiLoggingFilter`, `RestApiLoggingInterceptor`.

## A minimal logger

```java
import com.adhar.adharkit.logging.util.AdharLogger;

@Service
public class OrderService {
    private final AdharLogger log;

    public OrderService(AdharLogger log) { this.log = log; }

    public Order createOrder(OrderRequest request) {
        log.info(OrderService.class, "Processing order for customer {}",
                 request.getCustomerId());
        return process(request);
    }
}
```

## A realistic service

Declarative entry/exit logging, a masked argument, a business event, and a scoped MDC addition:

```java
import com.adhar.adharkit.logging.annotation.Audit;
import com.adhar.adharkit.logging.annotation.BusinessEvent;
import com.adhar.adharkit.logging.annotation.Loggable;

@Service
public class PaymentService {
    private final AdharLogger log;

    @Loggable(logArgs = true, logResult = true, maskFields = {"cardNumber"})
    @BusinessEvent(value = "payment.captured", category = "billing",
                   includeResult = true, tags = {"channel", "web"})
    @Audit(eventType = "PAYMENT_CAPTURE", includeArgs = true, includeUser = true)
    public PaymentResult capture(PaymentRequest request) {
        return log.withContextSupplier(Map.of("paymentId", request.getId()),
                () -> gateway.charge(request));
    }
}
```

`@Loggable` samples at `sampleRate = 1.0` by default; drop it to `0.05` on a hot path to keep one line in twenty. The aspects are proxy-based, and every one of them is registered only when `adhar.logging.aspects.enabled` is true (it is by default) and `aspectjweaver` is on the classpath.

## Sensitive-data masking

Masking runs on both output paths and covers field names, well-known formats, and your own regexes:

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

Typed events land on dedicated SLF4J loggers named `<logger-prefix>.<TYPE>` — `ADHAR_EVENT.BUSINESS`, `ADHAR_EVENT.AUDIT`, `ADHAR_EVENT.PERFORMANCE`, `ADHAR_EVENT.BATCH` — so you can route or retain them independently of application logs.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.logging.enabled` | Master switch | `true` |
| `adhar.logging.aspects.enabled` | Register all annotation aspects | `true` |
| `adhar.logging.masking.enabled` | Mask before any sink | `true` |
| `adhar.logging.masking.strategy` | `FULL`, `PARTIAL`, or `HASH` | `FULL` |
| `adhar.logging.mdc.enabled` | Register `MdcLoggingFilter` | `true` |
| `adhar.logging.tracing.include-trace-id` | Add `traceId` to the MDC | `true` |
| `adhar.logging.events.logger-prefix` | Logger name prefix for typed events | `ADHAR_EVENT` |
| `adhar.logging.console.json` | JSON on stdout rather than a pattern | `true` |
| `adhar.logging.file.max-history` | Rolled files retained | `7` |
| `adhar.logging.file.total-size-cap` | Total on-disk cap | `1GB` |
| `adhar.logging.async.queue-size` | Async appender queue depth | `1024` |
| `adhar.logging.rest-api.max-payload-length` | Captured payload characters | `2048` |
| `adhar.logging.rest-api.slow-request-threshold-ms` | Above this, flag and log at WARN | `3000` |
| `adhar.logging.performance.slow-threshold-ms` | Above this, log the operation at WARN | `1000` |
| `adhar.logging.batch.progress-log-interval` | Items between progress events | `1000` |
| `adhar.logging.audit.include-changes` | Allow masked before/after values | `true` |

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Annotations have no effect | Self-invocation, or `aspectjweaver` absent | Call through the proxy; check `adhar.logging.aspects.enabled` |
| A secret still appears in a log | Its field name is not in the default set | Add it to `masking.additional-keys`, or a regex to `custom-patterns` |
| No `traceId` in log lines | [Tracing](/adhar-kit/modules/tracing) is not on the classpath, so no `Tracer` bean exists | Add the tracing module; `AdharLogger` picks up the `Tracer` automatically |
| Request bodies are missing from API events | Payload capture is opt-in | Set `adhar.logging.rest-api.include-request-payload: true` |
| Business events are hard to find | They go to `ADHAR_EVENT.BUSINESS`, not your application logger | Configure a level or appender for that logger name |

## See also

- [Metrics](/adhar-kit/modules/metrics) — the second leg of the observability trio
- [Tracing](/adhar-kit/modules/tracing) — supplies the `traceId` / `spanId` these logs carry
- [Commons](/adhar-kit/modules/commons) — sets `correlationId`, `requestId`, and `tenantId` in the MDC
- [Observability](/docs/operations/observability) — how these logs reach Loki and Grafana on the platform
