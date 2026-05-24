---
title: "io.adhar.kit.test.AdharTest"
section: "API Reference"
order: 11
kind: "annotation"
module: "adhar-kit-test"
since: "1.0.0"
path: "/adhar-kit/javadoc/io.adhar.kit.test/AdharTest"
---

# `AdharTest`

> annotation · module `adhar-kit-test` · since 1.0.0

```java
package io.adhar.kit.test;

public annotation AdharTest
```

Marks a JUnit 5 class as an Adhar integration test. The Kit reads service.yaml, starts TestContainers for declared dependencies, and injects ready-to-use clients.

## Fields

### `dependencies` — `String[]`

public default · Override the dependency set for this test class.

### `rollback` — `boolean`

public default · Whether to roll back DB state between tests. Default true.



