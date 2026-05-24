---
title: "io.adhar.kit.data.Repository"
section: "API Reference"
order: 5
kind: "interface"
module: "adhar-kit-data"
since: "1.0.0"
path: "/adhar-kit/javadoc/io.adhar.kit.data/Repository"
---

# `Repository`

> interface · module `adhar-kit-data` · since 1.0.0

```java
package io.adhar.kit.data;

public interface Repository
```

Generic repository contract. Implementations are generated at build time for the active persistence engine (JDBC, JPA, R2DBC).


## Methods

### `save(`T entity`)` → `T`

public · Insert or update an entity.

**Parameters**

- `entity` (`T`) — Entity to persist.

### `findById(`ID id`)` → `Optional<T>`

public · Find by primary key.

**Parameters**

- `id` (`ID`) — Primary key.

### `delete(`ID id`)` → `void`

public · Delete an entity by primary key.

**Parameters**

- `id` (`ID`) — Primary key.

### `findAll()` → `List<T>`

public · Return every row. Use with care on large tables.


