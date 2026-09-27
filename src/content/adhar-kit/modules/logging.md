---
title: "Logging"
section: "Modules"
order: 13
path: "/adhar-kit/modules/logging"
---

# Logging

`adhar-kit-logging` is an enterprise logging framework: a universal `AdharLogger` facade, structured JSON output, MDC/correlation, sensitive-data masking, distributed-trace correlation, and eleven AOP annotations for zero-boilerplate logging of methods, audits, and business events.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-logging</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

- `AdharLogger` — `info/debug/warn/error`, `withContext`, `put/get/clear` (MDC), `getTraceId`, `getSpanId`
- **Annotations (11)** — `@Loggable`, `@LogExecutionTime`, `@LogExceptions`, `@LogMetrics`, `@Audit`, `@Sensitive`, `@LogOperation`, `@BusinessEvent`, `@TrackPerformance`, `@LogBatchJob`, `@InjectLogger`
- **Event pipeline** — `AppLogEvent`, `AppLogEventPublisher`, `AppLogEventSink`, plus `BusinessEventLogger`, `AuditEventLogger`, `BatchJobLogger`, `PerformanceLogger`

## Declarative logging

`@Loggable` records entry/exit (and optionally args/result); the logger stays correlated automatically:

```java
@Service
public class OrderService {
    private final AdharLogger log;
    public OrderService(AdharLogger log) { this.log = log; }

    @Loggable(logArgs = true, logResult = true)
    public Order createOrder(OrderRequest request) {
        log.info(OrderService.class, "Processing order for customer {}", request.getCustomerId());
        return process(request);
    }
}
```

## Sensitive-data masking

Values matching configured rules (credit cards, passwords, tokens, custom keys) are masked before they reach any sink — so PII never lands in logs:

```yaml
adhar:
  logging:
    masking:
      enabled: true
      mask-credit-cards: true
      mask-passwords: true
      additional-keys: [apiKey, secretToken]
```

## Structured JSON & trace correlation

Every line is emitted as JSON with MDC fields; when tracing is enabled, `traceId`/`spanId` are attached so logs and traces line up in Grafana:

```yaml
adhar:
  logging:
    enabled: true
    mdc:
      enabled: true
      include-correlation-id: true
    tracing:
      enabled: true
      include-trace-id: true
      include-span-id: true
    aspects:
      enabled: true
      log-method-execution: true
      log-exceptions: true
```

## Typed events

Beyond plain logs, structured events flow through dedicated loggers (`ADHAR_EVENT.BUSINESS`, `.AUDIT`, `.PERFORMANCE`, `.BATCH`, …) via `@BusinessEvent`, `@Audit`, `@TrackPerformance`, and `@LogBatchJob` — ideal for downstream analytics and compliance.
