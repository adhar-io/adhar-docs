---
title: "Add distributed tracing in three lines"
section: "Guides"
order: 2
category: "Observability"
path: "/adhar-kit/guides/distributed-tracing"
---

# Add distributed tracing in three lines

> Pipe HTTP, DB, and messaging spans to any OTLP-compatible backend (Tempo, Jaeger, Honeycomb).

**Category:** Observability

### 1. Add the module

Pull adhar-kit-observability. HTTP, JDBC, and Kafka instrumentation activate automatically.

```xml
<dependency>
  <groupId>io.adhar.kit</groupId>
  <artifactId>adhar-kit-observability</artifactId>
</dependency>
```

### 2. Configure the exporter

Point the OTLP exporter at your collector.

```yaml
adhar:
  observability:
    otlp:
      endpoint: http://otel-collector:4317
```

### 3. Annotate business spans

Wrap high-value operations with @Traced for explicit, named spans.

```java
@Traced("order.fulfil")
public Order fulfil(String id) { ... }
```

