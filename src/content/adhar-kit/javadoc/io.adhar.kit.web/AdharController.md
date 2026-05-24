---
title: "io.adhar.kit.web.AdharController"
section: "API Reference"
order: 3
kind: "annotation"
module: "adhar-kit-web"
since: "1.0.0"
path: "/adhar-kit/javadoc/io.adhar.kit.web/AdharController"
---

# `AdharController`

> annotation · module `adhar-kit-web` · since 1.0.0

```java
package io.adhar.kit.web;

public annotation AdharController
```

Marks a class as an HTTP controller. The Kit compiles the class to native handlers for the active framework (Spring MVC, JAX-RS, Micronaut HTTP, Helidon WebServer, Vert.x Router).

## Fields

### `value` — `String`

public default · Base path mounted by the controller. Supports path templates and matrix params.

### `produces` — `String[]`

public default · Default media types produced by methods of this controller.



## See also

- `io.adhar.kit.web.RouterBuilder`
- `io.adhar.kit.web.OpenApiPublisher`

