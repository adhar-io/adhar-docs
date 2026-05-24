---
title: "io.adhar.kit.web.RouterBuilder"
section: "API Reference"
order: 4
kind: "class"
module: "adhar-kit-web"
since: "1.0.0"
path: "/adhar-kit/javadoc/io.adhar.kit.web/RouterBuilder"
---

# `RouterBuilder`

> class · module `adhar-kit-web` · since 1.0.0

```java
package io.adhar.kit.web;

public final class RouterBuilder
```

Programmatic HTTP routing API for frameworks without an annotation model (Helidon SE, Vert.x). Mirrors the @AdharController routing semantics, including content negotiation and error mapping.


## Methods

### `get(`String path`, `RequestHandler handler`)` → `RouterBuilder`

public · Registers an HTTP GET route.

**Parameters**

- `path` (`String`) — Path template, e.g. /orders/{id}.
- `handler` (`RequestHandler`) — Handler invoked for matching requests.

### `post(`String path`, `RequestHandler handler`)` → `RouterBuilder`

public · Registers an HTTP POST route.

**Parameters**

- `path` (`String`) — Path template.
- `handler` (`RequestHandler`) — Handler invoked for matching requests.

### `build()` → `Router`

public · Materialises the configured routes into a framework-native Router.


