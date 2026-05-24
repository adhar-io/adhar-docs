---
title: "io.adhar.kit.config.ConfigProperty"
section: "API Reference"
order: 10
kind: "annotation"
module: "adhar-kit-config"
since: "1.0.0"
path: "/adhar-kit/javadoc/io.adhar.kit.config/ConfigProperty"
---

# `ConfigProperty`

> annotation · module `adhar-kit-config` · since 1.0.0

```java
package io.adhar.kit.config;

public annotation ConfigProperty
```

Binds a configuration value to a field, constructor parameter, or method parameter with strict type coercion.

## Fields

### `name` — `String`

public · Dotted config key, e.g. `db.url`.

### `defaultValue` — `String`

public default · Default if the key is absent.



