---
title: "adhar-kit-data"
section: "Modules"
order: 3
path: "/adhar-kit/modules/data"
---

# adhar-kit-data

> Repository-style persistence for JDBC, JPA, R2DBC and MongoDB — with
> migrations, transactions and read-replica routing built in.

**Package:** `io.adhar.kit.data` · **Status:** stable · **Since:** 1.0

## Why

Spring, Micronaut, Quarkus and Helidon all ship great persistence
stories — but they're all different. `adhar-kit-data` gives you the
same `Repository<T, ID>` shape everywhere, so business code doesn't
care which ORM is underneath.

## Repository contract

```java
public interface Repository<T, ID> {
    Optional<T> findById(ID id);
    List<T> findAll();
    T save(T entity);
    void deleteById(ID id);
    long count();
    <R> R query(String name, Class<R> type, Object... args);
}
```

## Connection topology

```text
 ┌─────────────┐    writes    ┌──────────────┐
 │  @Tx writer │ ───────────▶ │ primary DB   │
 └─────────────┘              └──────┬───────┘
                                     │ async replication
 ┌─────────────┐    reads     ┌──────▼───────┐
 │  @Tx reader │ ───────────▶ │ read replica │
 └─────────────┘              └──────────────┘
```

`@Tx(readOnly = true)` automatically routes the query to the nearest
read replica when one is configured.

## Features

- Annotation-driven repositories (`extends Repository<T, ID>`)
- Declarative transactions via `@Tx` (REQUIRED, REQUIRES_NEW, NESTED)
- Schema migrations via Flyway or Liquibase, run on startup
- Read/write splitting and connection-pool tuning per profile
- Native-image friendly metadata generation at build time
- Optimistic locking (`@Version`) and soft-delete (`@SoftDelete`) helpers

## Example

```java
record Order(@Id String id, String sku, int qty, @Version int v) {}

interface OrderRepo extends Repository<Order, String> {
    @Query("select o from Order o where o.sku = ?1")
    List<Order> bySku(String sku);
}

@AdharController("/orders")
class OrdersApi {
    @Inject OrderRepo repo;

    @Tx
    Order place(CreateOrder cmd) {
        return repo.save(new Order(UUID.randomUUID().toString(), cmd.sku(), cmd.qty(), 0));
    }
}
```

## Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `adhar.data.url` | — | JDBC / R2DBC URL. |
| `adhar.data.pool.size` | `10` | Max pool size. |
| `adhar.data.migrate-on-start` | `true` | Run Flyway/Liquibase at boot. |
| `adhar.data.read-replica.url` | — | Optional read-only datasource. |

## Compatibility

| Framework | JDBC | JPA | R2DBC | Mongo |
|-----------|------|-----|-------|-------|
| Spring | ✅ | ✅ | ✅ | ✅ |
| Quarkus | ✅ | ✅ (Hibernate) | ✅ | ✅ |
| Micronaut | ✅ | ✅ (Micronaut Data) | ✅ | ✅ |
| Helidon | ✅ | ✅ | ✅ | beta |
| Vert.x | ✅ (jdbc-client) | — | ✅ | ✅ |

## See also

- [`Repository`](/adhar-kit/javadoc/io.adhar.kit.data/Repository)
- [Transactional outbox guide](/adhar-kit/guides/transactional-outbox)
