---
title: "io.adhar.kit.resilience.CircuitBreaker"
section: "API Reference"
order: 9
kind: "annotation"
module: "adhar-kit-resilience"
since: "1.0.0"
path: "/adhar-kit/javadoc/io.adhar.kit.resilience/CircuitBreaker"
---

# `CircuitBreaker`

> annotation · module `adhar-kit-resilience` · since 1.0.0

```java
package io.adhar.kit.resilience;

public annotation CircuitBreaker
```

Wrap the annotated method in a Resilience4j CircuitBreaker. State is exported as Micrometer gauges.

## Fields

### `name` — `String`

public default · Breaker name. Defaults to the method signature.

### `fallback` — `String`

public default · Name of a method on the same class with matching signature that returns a fallback value.

### `failureRateThreshold` — `float`

public default · Percentage of failures that trip the breaker. Default 50.



