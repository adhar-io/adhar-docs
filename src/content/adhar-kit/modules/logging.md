---
title: "Logging"
section: "Modules"
order: 13
path: "/adhar-kit/modules/logging"
---

# Logging

`adhar-kit-logging` gives a Spring Boot service JSON logs with correlation and trace ids in every line, masking of credentials before anything is written, annotations that log method calls, audits and business events, and a structured event pipeline (`AppLogEvent`) you can route to your own sinks. Use it when logs must join up across services and with traces, and when a stray `log.info(request)` must not leak a secret.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-logging` (Java package `com.adhar.adharkit.logging`) |
| Toggle | `adhar.logging.enabled` (default `true`) switches off the auto-configuration. Facade gate `adhar.kit.modules.logging` (default `true`); when `false`, `adhar.getLogging()` throws `IllegalStateException` |
| Facade | `adhar.getLogging()` returns a `LoggingFacade` named after `AdharFacade`. For your own logger name use `LoggingFacade.getLogger(MyClass.class)`. Injectable beans: `AdharLogger`, `AppLogEventPublisher`, `BusinessEventLogger`, `AuditEventLogger`, `PerformanceLogger`, `BatchJobLogger`, `LogDataMasker` |
| Dependencies | Required: `adhar-kit-commons`, Logback, `logstash-logback-encoder`, Jackson, Spring AOP, AspectJ, Janino. Optional: Spring Boot, Spring Web MVC, Spring Security (user context), Micrometer Tracing Brave bridge (trace ids) |
| Frameworks | Spring Boot: everything on this page (`AdharLoggingAutoConfiguration`, bundled `logback-spring.xml`). Quarkus, Micronaut, Helidon and Vert.x: a `LoggingService` adapter for plain logging and MDC only — no aspects, events, filters or masking |

## How it works

```diagram
nkc-logging-paths
```

- **SLF4J path.** Log statements and the `@Loggable`, `@LogExecutionTime`, `@LogExceptions`, `@Audit` and `@LogMetrics` aspects write to SLF4J. `MaskingJsonEncoder`, declared in the module's `logback-spring.xml`, masks the formatted message, sensitive MDC keys and exception messages at encode time.
- **Event path.** `@BusinessEvent`, `@LogOperation`, `@TrackPerformance`, `@LogBatchJob`, the typed event loggers and `RestApiLoggingFilter` build an `AppLogEvent`. `AppLogEventPublisher` fills `correlationId`, `traceId`, `spanId`, `userId` and `tenantId` from the MDC, masks the message, error message and metadata with `LogDataMasker`, then calls every `AppLogEventSink` bean. The default `Slf4jAppLogEventSink` logs the event as JSON on the logger `ADHAR_EVENT.<TYPE>` at the event's severity.
- **Request context.** In a servlet app, `MdcLoggingFilter` (highest precedence) sets `correlationId` from the request header or a new UUID, echoes it in a `correlationId` response header, adds `requestId`, `requestMethod`, `requestUri`, `clientIp`, `userAgent`, user id (from Spring Security) and trace ids from `traceparent` or B3 headers, and clears the MDC when the request ends.

The two paths use different maskers:

| | SLF4J path | Event path |
|---|---|---|
| Masker | `MaskingJsonEncoder` (created by logback) | `LogDataMasker` (Spring bean) |
| Keys | The 11 defaults only | Defaults + `masking.additional-keys` |
| Value patterns (`mask-credit-cards`, `mask-ssn`, `mask-emails`, `custom-patterns`) | Not applied | Applied |
| Replacement | Always `********` | `FULL`, `PARTIAL` or `HASH` per `masking.strategy` |

The default keys, matched case-insensitively, are `password`, `secret`, `token`, `authorization`, `credential`, `creditCard`, `ssn`, `socialSecurity`, `accountNumber`, `apiKey`, `privateKey`.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-logging</artifactId>
    <version>0.1.0</version>
</dependency>
```

Add `spring-boot-starter-security` if you want user ids in the MDC and in `@Audit` records, and [Tracing](/adhar-kit/modules/tracing) if you want `traceId` / `spanId` from the active span.

## Use it

### Context and correlation

```java
import com.adhar.adharkit.logging.util.AdharLogger;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class OrderService {

    private final AdharLogger log;

    public OrderService(AdharLogger log) {
        this.log = log;
    }

    public void ship(String orderId) {
        // orderId is in the MDC only while the lambda runs, then restored.
        log.withContext(Map.of("orderId", orderId), () ->
                log.info(OrderService.class, "Shipping order {}", orderId));
    }
}
```

`AdharLogger` also has `put` / `get` / `remove` / `putAll`, `setCorrelationId`, `setUserId`, `getTraceId`, `getSpanId`, and `infoJson(Class, String, Object)` (plus `debugJson`, `warnJson`, `errorJson`) to log an object as JSON. `@InjectLogger` on a field of type `org.slf4j.Logger`, `LoggingFacade` or `AdharLogger` fills it in any Spring bean.

### Annotations

```java
import com.adhar.adharkit.logging.annotation.BusinessEvent;
import com.adhar.adharkit.logging.annotation.Loggable;
import com.adhar.adharkit.logging.annotation.Sensitive;
import com.adhar.adharkit.logging.annotation.TrackPerformance;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    @Loggable(logArgs = true)
    @BusinessEvent(value = "payment.captured", category = "billing", tags = {"web"})
    @TrackPerformance(slowThresholdMs = 500)
    public String capture(String accountId, @Sensitive(showLast = 4) String cardNumber) {
        return "receipt-" + accountId;
    }
}
```

| Annotation | Target | Writes | Key attributes (defaults) |
|---|---|---|---|
| `@Loggable` | method, class | Entry/exit/exception lines on the class's logger | `level` (`INFO`), `logArgs` (`false`), `logResult` (`false`), `sampleRate` (`1.0`) |
| `@LogExecutionTime` | method, class | Duration line | `level`, `thresholdMs` (`0`), `includeArgs`, `sampleRate` |
| `@LogExceptions` | method, class | Exception line, rethrows | `level` (`ERROR`), `includeArgs` (`true`), `includeStackTrace` (`true`) |
| `@Audit` | method, class | JSON line on logger `AUDIT.<class>` | `eventType`, `level`, `includeArgs` (`true`), `includeResult` (`false`), `includeUser` (`true`), `tags` |
| `@LogMetrics` | method, class | JSON line on logger `METRICS.<class>` (no Micrometer meters) | `metricName`, `includeExecutionTime` (`true`), `tags`, `sampleRate` |
| `@BusinessEvent` | method | `BUSINESS` event, `SUCCESS` or `FAILURE` | `value`, `category`, `includeArgs`, `includeResult`, `tags` |
| `@LogOperation` | method, class | `OPERATION` event | as `@BusinessEvent` |
| `@TrackPerformance` | method, class | Stats in `PerformanceLogger`; `PERFORMANCE` event when slow | `slowThresholdMs` (`-1` = use `performance.slow-threshold-ms`) |
| `@LogBatchJob` | method | `BATCH` events: started, then completed or failed | `value` (job name) |
| `@Sensitive` | parameter | Masks that argument in `@Loggable` output | `mask` (`***`), `showFirst` (`0`), `showLast` (`0`) |
| `@InjectLogger` | field | Fills the logger field | `value` (logger name) |

Event aspects record `durationMs`, publish in a `finally` block, and rethrow the original exception. Arguments and results on events are kept only when they are strings (masked), numbers or booleans; other objects appear as `[ClassName]`.

### Typed event loggers

```java
import com.adhar.adharkit.logging.audit.AuditEventLogger;
import com.adhar.adharkit.logging.batch.BatchJobLogger;
import com.adhar.adharkit.logging.batch.BatchJobRun;
import com.adhar.adharkit.logging.event.BusinessEventLogger;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AccountEvents {

    private final AuditEventLogger audit;
    private final BusinessEventLogger business;
    private final BatchJobLogger batch;

    public AccountEvents(AuditEventLogger audit, BusinessEventLogger business, BatchJobLogger batch) {
        this.audit = audit;
        this.business = business;
        this.batch = batch;
    }

    public void changeEmail(String actor, String accountId, String oldEmail, String newEmail) {
        audit.event("account.email.changed")
                .actor(actor)
                .resource("account", accountId)
                .change("email", oldEmail, newEmail)   // values masked by LogDataMasker
                .success();                            // or .failure(e) / .denied()
    }

    public void reindex(List<String> ids) {
        try (var op = business.startOperation("search.reindex")) {
            op.metadata("count", ids.size());
            // ... work; call op.failure(e) in a catch block, or close() reports SUCCESS
        }
        try (BatchJobRun run = batch.startJob("nightly-reindex")) {
            ids.forEach(id -> run.itemProcessed());   // PROGRESS event every progress-log-interval items
        }
    }
}
```

### Your own sink

```java
import com.adhar.adharkit.logging.event.AppLogEventSink;
import com.adhar.adharkit.logging.event.Slf4jAppLogEventSink;
import com.adhar.adharkit.logging.properties.AdharLoggingProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class EventSinks {

    @Bean
    AppLogEventSink kafkaSink(AuditForwarder forwarder) {   // AuditForwarder is your class
        return event -> forwarder.send(event.toMap());       // already enriched and masked
    }

    // The default sink backs off when any AppLogEventSink exists; declare it to keep the JSON lines.
    @Bean
    Slf4jAppLogEventSink slf4jAppLogEventSink(AdharLoggingProperties props, ObjectMapper mapper) {
        return new Slf4jAppLogEventSink(props, mapper);
    }
}
```

## Configuration

All keys are under `adhar.logging`. The `console`, `file`, `async`, `json-encoder`, `logstash`, `syslog` and `levels` groups are read by the bundled `logback-spring.xml`; the rest by the Java beans.

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Whole auto-configuration |
| `aspects.enabled` | boolean | `true` | Register every annotation aspect |
| `events.enabled` | boolean | `true` | `AppLogEventPublisher.publish` is a no-op when `false` |
| `events.logger-prefix` | String | `ADHAR_EVENT` | Logger name prefix for `Slf4jAppLogEventSink` |
| `masking.enabled` | boolean | `true` | `LogDataMasker` on/off; also registers the `MaskingJsonEncoder` bean |
| `masking.strategy` | `FULL` \| `PARTIAL` \| `HASH` | `FULL` | Event path replacement. `PARTIAL` keeps the last 4 characters of values longer than 8; `HASH` writes `sha256:` + 16 hex characters |
| `masking.additional-keys` | Set&lt;String&gt; | empty | Extra sensitive keys (event path) |
| `masking.mask-credit-cards` / `mask-ssn` / `mask-emails` | boolean | `true` / `true` / `false` | Value patterns (event path) |
| `masking.custom-patterns` | List&lt;String&gt; | empty | Extra regexes (event path) |
| `mdc.enabled` | boolean | `true` | Register `MdcLoggingFilter` (servlet apps) |
| `mdc.include-correlation-id` / `include-user-info` / `include-tenant-id` / `include-session-id` / `include-request-id` | boolean | `true` | MDC fields to set |
| `mdc.correlation-id-field` / `user-id-field` / `tenant-id-field` / `session-id-field` / `request-id-field` | String | `correlationId` / `userId` / `tenantId` / `sessionId` / `requestId` | MDC key names; the correlation field is also the request and response header name |
| `tracing.enabled` | boolean | `true` | Copy trace ids into the MDC |
| `tracing.include-trace-id` / `include-span-id` / `include-parent-id` / `include-sampled` | boolean | `true` | Trace fields to set |
| `tracing.trace-id-field` / `span-id-field` / `parent-id-field` / `sampled-field` | String | `traceId` / `spanId` / `parentId` / `sampled` | MDC key names |
| `rest-api.enabled` | boolean | `true` | `RestApiLoggingFilter`: one `API` event per request |
| `rest-api.interceptor-enabled` | boolean | `true` | `RestApiLoggingInterceptor`: a DEBUG `API` event per controller call |
| `rest-api.include-headers` / `include-request-payload` / `include-response-payload` | boolean | `false` | Capture headers and bodies (masked) |
| `rest-api.include-query-string` | boolean | `true` | Capture the query string |
| `rest-api.max-payload-length` | int | `2048` | Captured body characters |
| `rest-api.slow-request-threshold-ms` | long | `3000` | Slower requests are logged at WARN |
| `rest-api.exclude-paths` | List&lt;String&gt; | `/actuator/**`, `/health/**`, `/static/**`, `/webjars/**`, `/favicon.ico` | Ant patterns skipped |
| `rest-api.masked-headers` | Set&lt;String&gt; | `authorization`, `cookie`, `set-cookie`, `proxy-authorization`, `x-api-key` | Headers always masked |
| `performance.enabled` | boolean | `true` | Register `PerformanceLogger` |
| `performance.slow-threshold-ms` | long | `1000` | Slow operations are logged at WARN |
| `performance.log-all-operations` | boolean | `false` | Emit a DEBUG event for every timed operation |
| `batch.enabled` | boolean | `true` | Register `BatchJobLogger` |
| `batch.progress-log-interval` | long | `1000` | Items between `PROGRESS` events |
| `batch.max-item-errors-logged` | int | `10` | `ITEM_FAILED` events per run |
| `audit.enabled` | boolean | `true` | Register `AuditEventLogger` |
| `audit.include-changes` | boolean | `true` | Keep `change(...)` before/after values |
| `console.enabled` / `console.json` | boolean | `true` / `true` | Console appender; JSON or a text pattern |
| `file.enabled` / `file.json` | boolean | `true` / `true` | Rolling file `<logging.file.path>/<spring.application.name>.json.log` (path default `logs`) |
| `file.max-size` / `max-history` / `total-size-cap` | String / int / String | `100MB` / `7` / `1GB` | Rolling policy |
| `async.queue-size` / `discarding-threshold` / `max-flush-time` | int | `1024` / `0` / `1000` | `AsyncAppender` in front of the file appender |
| `json-encoder.include-mdc` | boolean | `true` | Write MDC fields into each JSON line |
| `json-encoder.*-field-name` | String | `timestamp`, `level`, `logger`, `thread`, `message`, `exception` | JSON field names |
| `logstash.enabled` / `host` / `port` / `tcp` | boolean / String / int / boolean | `false` / `localhost` / `5000` / `true` | Logstash appender (masked) |
| `syslog.enabled` / `host` / `port` / `facility` | boolean / String / int / String | `false` / `localhost` / `514` / `LOCAL0` | Syslog appender (not masked) |
| `levels.use-environment-specific` | boolean | `true` | Per-profile levels for `org.springframework`, `org.hibernate`, `com.adhar.adharkit` under profiles `dev,default`, `test`, `prod,staging` |

`graylog.*`, `levels.root` and `levels.packages` bind but nothing reads them; set root and package levels with Spring Boot's `logging.level.*`.

## Operations

- **Output.** JSON lines on stdout and in the rolling file carry `app_name` (`spring.application.name`), `env` (`adhar.environment`, default `local`) and the MDC. Route `ADHAR_EVENT.*`, `AUDIT.*` and `METRICS.*` loggers with ordinary logback configuration.
- **Event delivery is synchronous.** `publish` runs every sink on the calling thread in order; a slow sink slows the business method. A sink exception is logged at WARN and the next sink still runs.
- **File writes block, not drop.** `discarding-threshold: 0` means a full async queue blocks the logging thread; a stalled disk can stall request threads. The console appender is synchronous.
- **Failures stay out of business code.** Sink errors are swallowed, JSON serialization falls back to `toString()`, and aspects rethrow only the method's own exception.
- **Per-request volume.** With defaults, every non-excluded HTTP request produces an INFO `API` event and a DEBUG handler event.
- **No health indicator or metrics.** `PerformanceLogger.snapshot()` and `logSummary()` expose in-memory per-operation stats; `@LogMetrics` writes log lines, not Micrometer meters — use [Metrics](/adhar-kit/modules/metrics) for counters.

## Limits

- **Your own `logback-spring.xml` replaces the module's.** Nothing on the SLF4J path is then masked unless you copy the `MaskingJsonEncoder` encoder blocks across.
- **`masking.additional-keys` and the value patterns do not reach log lines.** Logback creates its own `MaskingJsonEncoder` with the 11 default keys. To mask more keys on the SLF4J path, use an encoder subclass that calls `addMaskedKeys(...)`.
- **Key masking matches `key=value` and `key: value`, not JSON.** A `"password":"x"` pair inside a JSON-serialized `@Loggable` argument is not masked. Mark sensitive parameters `@Sensitive`.
- **`@Loggable(maskFields = ...)` has no effect, and `logResult` output is not masked.** Only `@Sensitive` parameters are masked by the aspect.
- **`@Loggable` replaces `correlationId` in the MDC** with a new UUID for the duration of the call, then restores it. Lines logged inside the method do not carry the request's correlation id.
- **`@Audit` is not an `AppLogEvent`.** It writes its own JSON line on `AUDIT.<class>`; it ignores `events.enabled` and custom sinks, and redacts string arguments containing `password`, `secret`, `token`, `key` or `credential`. Use `AuditEventLogger` for audits that go through sinks.
- **Proxy-based AOP.** A `this.method()` call skips every aspect silently. Call through the injected bean.
- **`events.enabled: false` silently drops** every `@BusinessEvent`, `@LogOperation`, `@TrackPerformance`, `@LogBatchJob`, typed-logger and API event.
- **Turning off `performance.enabled` or `batch.enabled` while aspects are on** removes `PerformanceLogger` or `BatchJobLogger`, which `TrackPerformanceAspect` and `LogBatchJobAspect` need; set `aspects.enabled: false` too, or keep them on.
- **User context reads Spring Security.** `mdc.include-user-info` and `@Audit(includeUser = true)` use `SecurityContextHolder`; without Spring Security on the classpath, set them to `false`.
- **`BusinessEventLogger.OperationScope` reports `SUCCESS` on close** unless you call `failure(e)` first.
- **Masking costs CPU.** `LogDataMasker` runs one regex per key and per value pattern over each string, recursing into nested maps. Keep patterns tight, use `sampleRate` on hot paths, and keep large payloads out of event metadata.
- **MDC is per thread.** Across `@Async` or executor hops, use [Core](/adhar-kit/modules/core)'s `ContextPropagatingExecutor` to carry it.

## Next steps

- [Tracing](/adhar-kit/modules/tracing) — supplies the `traceId` / `spanId` these logs carry
- [Metrics](/adhar-kit/modules/metrics) — counters and timers alongside the logs
- [Commons](/adhar-kit/modules/commons) — the shared base the module builds on
- [Observability](/docs/operations/observability) — how logs reach Loki and Grafana on the platform
