---
title: "io.adhar.kit.observability.Traced"
section: "API Reference"
order: 7
kind: "annotation"
module: "adhar-kit-observability"
since: "1.1.0"
path: "/adhar-kit/javadoc/io.adhar.kit.observability/Traced"
---

# `Traced`

> annotation · module `adhar-kit-observability` · since 1.1.0

```java
package io.adhar.kit.observability;

public annotation Traced
```

Captures a custom span around the annotated method using the active OpenTelemetry Tracer.

## Fields

### `value` — `String`

public default · Span name. Defaults to ClassName#methodName.

### `kind` — `SpanKind`

public default · OTel span kind. Defaults to INTERNAL.



