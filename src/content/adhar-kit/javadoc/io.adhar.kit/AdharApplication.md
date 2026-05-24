---
title: "io.adhar.kit.AdharApplication"
section: "API Reference"
order: 1
kind: "annotation"
module: "adhar-kit-core"
since: "1.0.0"
path: "/adhar-kit/javadoc/io.adhar.kit/AdharApplication"
---

# `AdharApplication`

> annotation · module `adhar-kit-core` · since 1.0.0

```java
package io.adhar.kit;

public annotation AdharApplication
```

Marks the entrypoint class of an Adhar service. Equivalent to the framework-native bootstrap annotation (e.g. @SpringBootApplication, @QuarkusMain) but additionally wires the ServiceContext, lifecycle phases, and Kit-managed beans.


## Methods

### `run(`Class<?> primarySource`, `String[] args`)` → `ServiceContext`

public static · Boots the service. Returns the ServiceContext once the application has reached the READY phase.

**Parameters**

- `primarySource` (`Class<?>`) — The class annotated with @AdharApplication.
- `args` (`String[]`) — Command-line arguments forwarded to the underlying framework.

*Since 1.0.0*

### `shutdown(`long graceMs`)` → `void`

public static · Initiates a graceful shutdown of the running application.

**Parameters**

- `graceMs` (`long`) — Maximum milliseconds to wait for in-flight work.

*Since 1.2.0*


## See also

- `io.adhar.kit.ServiceContext`
- `io.adhar.kit.LifecycleManager`

