---
title: "Tracing"
section: "Modules"
order: 15
path: "/adhar-kit/modules/tracing"
---

# Tracing

`adhar-kit-tracing` provides enterprise distributed tracing on OpenTelemetry (exporting to OTLP/Zipkin/Jaeger): annotation-based spans, a programmatic `AdharTracing` API, W3C baggage propagation, cross-thread context propagation, and trace ↔ log (MDC) correlation.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-tracing</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

- `AdharTracing` — `withinSpan`, `getCurrentSpan/TraceId/SpanId`, `addTag/addEvent`, `recordException`, `createDatabaseSpan/createHttpClientSpan/createMessagingSpan`, `setBaggage/getBaggage`, `injectBaggageIntoHeaders`, `wrapWithTraceContext`
- `TraceContextTaskDecorator`, `TraceContextMdcFilter`
- **Annotations** — `@NewSpan`, `@ContinueSpan`, `@DatabaseSpan`, `@HttpClientSpan`, `@MessagingSpan`, `@AsyncSpan`, `@SpanTag`

## Annotation-based spans

```java
@Service
public class UserService {

    @NewSpan("user.create")
    public User createUser(@SpanTag("user.email") String email) {
        return repository.save(new User(email));
    }

    @DatabaseSpan(operation = "SELECT", table = "users")
    public List<User> findUsers() {
        return repository.findAll();
    }
}
```

`@SpanTag` supports SpEL (`expression = "id"`) to tag with a field of the argument.

## Baggage & correlation

Baggage travels with the trace across services via the W3C `baggage` header; the MDC filter mirrors `traceId`/`spanId` into logs so [logging](/adhar-kit/modules/logging) and traces correlate automatically.

## Configuration

```yaml
adhar:
  tracing:
    enabled: true
    sampling:
      probability: 0.1
    open-telemetry:
      enabled: true
      endpoint: http://otel-collector:4317
    propagation:
      type: tracecontext      # w3c | b3 | jaeger
    baggage:
      enabled: true
      remote-fields: [user.id, tenant.id]
    web:
      enabled: true
      mdc-enabled: true
      skip-patterns: ["/actuator/**"]
```

On the [Adhar Platform](/docs), spans land in Tempo and are viewable in Grafana alongside logs and metrics.
