---
title: "io.adhar.kit.ServiceContext"
section: "API Reference"
order: 2
kind: "interface"
module: "adhar-kit-core"
since: "1.0.0"
path: "/adhar-kit/javadoc/io.adhar.kit/ServiceContext"
---

# `ServiceContext`

> interface · module `adhar-kit-core` · since 1.0.0

```java
package io.adhar.kit;

public interface ServiceContext
```

Holds platform-wide singletons available to any Kit-managed component: the Clock, the active ConfigSource chain, the MetricRegistry, and the framework-specific BeanRegistry.


## Methods

### `clock()` → `Clock`

public · The platform Clock — fixed in tests, system in production.

### `config()` → `ConfigSource`

public · The merged ConfigSource chain.

### `registry()` → `BeanRegistry`

public · Framework-specific bean registry.

### `phase()` → `LifecycleManager.Phase`

public · The current lifecycle phase.


## See also

- `io.adhar.kit.AdharApplication`

