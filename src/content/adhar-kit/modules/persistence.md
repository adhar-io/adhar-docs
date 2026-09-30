---
title: "Persistence"
section: "Modules"
order: 19
path: "/adhar-kit/modules/persistence"
---

# Persistence

Every service team rebuilds the same data-layer scaffolding: audit columns, "delete" that really means hide, tenant scoping, and the eternal problem of writing a row *and* publishing an event without one of them going missing. `adhar-kit-persistence` **ships those four as defaults rather than as a project each team writes once and gets subtly wrong.** It is a thin layer over JPA and Hibernate, not a replacement for them.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-persistence` |
| Built on | Spring Data JPA / Hibernate, HikariCP, Flyway; optional QueryDSL, Envers, Kafka, Micrometer |
| Entry points | `PersistenceFacade`, `BaseRepository`, `SoftDeleteRepository`, `OutboxEvent` |
| Config prefix | `adhar.persistence` |
| Use it when | You want audited, soft-deletable, tenant-scoped entities and atomic save-plus-publish |

## How it works

Four independent concerns layer over the same JPA session. You can adopt any one without the others.

```text
     your @Service (@Transactional)
              │
       PersistenceFacade  ──delegate──▶ SpringPersistenceAdapter
              │                              (EntityManager + TxManager)
              ▼
   ┌──────────────────────────────────────────────────────┐
   │ AuditableEntity   @CreatedDate/@CreatedBy/@Version    │
   │ SoftDeletableEntity  @SQLRestriction("deleted=false") │
   │ Multi-tenancy     TenantContext → schema resolver     │
   │ Outbox            row written in the SAME transaction │
   └──────────────────────────────────────────────────────┘
              │                              │
           COMMIT                    OutboxPublisher polls
                                   SELECT … FOR UPDATE SKIP LOCKED
                                            │
                                     OutboxRelay.relay(event)
```

The invariant that matters: **the outbox row and the business row commit together.** Nothing is published before the transaction succeeds, and nothing is lost if the process dies right after commit — the relay picks it up on its next pass.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-persistence</artifactId>
    <version>0.1.0</version>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
```

## Key APIs

- **`PersistenceFacade`** — framework-neutral CRUD without injecting an `EntityManager`: `save`, `saveAll`, `saveAllInBatch(list, batchSize)`, `findById`, `findAll(type, page, size)`, `findAll(type, spec, pageable)`, `query`, `bulkUpdate`, `bulkDelete`, `count`, `executeInTransaction`, `executeReadOnly`, `executeInNewTransaction`, `merge`, `refresh`, `detach`, `flush`, `getQueryStats()`.
- **`BaseRepository<T, ID>`** — `JpaRepository` plus `JpaSpecificationExecutor`, so every repository gets `Specification` queries for free.
- **`SoftDeleteRepository<T extends SoftDeletableEntity, ID>`** — adds `findAllActive()`, `findActiveById(id)`, `countActive()`, `softDeleteById(id)`, `findAllDeleted()`, `restore(id)`.
- **Entity base classes** — `BaseEntity` (identity `id`, `equals`/`hashCode`), `AuditableEntity` (adds `created_at`, `created_by`, `updated_at`, `updated_by` and a `@Version` column), `SoftDeletableEntity` (adds the `deleted` flag plus `markDeleted()`).
- **Annotations** — `@Repository`, `@Query`, `@Modifying`, `@Param`, `@Cacheable`, `@Audited(withRevisionHistory, auditTableName, excludeProperties)`, `@MultiTenant(strategy, discriminatorColumn, autoFilter)`, `@SoftDelete`.
- **Outbox** — `OutboxEvent` (+ nested `OutboxStatus`), `OutboxRepository`, `OutboxPublisher`, the `OutboxRelay` SPI with `ApplicationEventOutboxRelay` and `KafkaOutboxRelay`, and the `OutboxedEvent` marker interface bridged by `DomainEventOutboxBridge`.
- **`OptimisticLockRetryTemplate`** — `withDefaults()` or `new OptimisticLockRetryTemplate(maxAttempts, initialBackoff, multiplier)`, then `execute(supplier)` to retry through version conflicts.
- **Multi-tenancy** — `TenantContext` (`setTenant`, `getTenant`, `clear`), `TenantWebFilter` (reads the `X-Tenant-ID` header), `SchemaMultiTenantConnectionProvider`.

## Minimal: audited entity plus facade

```java
@Entity
@Table(name = "users")
public class User extends AuditableEntity {
    @Column(nullable = false, unique = true) private String email;
    private String name;
    // getters / setters
}

@Service
public class UserService {
    private final PersistenceFacade persistence = PersistenceFacade.getInstance();

    @Transactional
    public User createUser(String email, String name) {
        User user = new User();
        user.setEmail(email);
        user.setName(name);
        return persistence.save(user);   // created_at / created_by filled in
    }
}
```

`created_by` and `updated_by` come from `AuditorAwareImpl`, which reads the current Spring Security principal.

## Realistic: soft delete plus transactional outbox

```java
@Entity
@Table(name = "orders")
public class Order extends SoftDeletableEntity { /* … */ }

public interface OrderRepository extends SoftDeleteRepository<Order, Long> { }

public record OrderPlaced(String orderId, String customerId) implements OutboxedEvent {
    @Override public String aggregateType() { return "Order"; }
    @Override public String aggregateId()   { return orderId; }
    @Override public String eventType()     { return "OrderPlaced"; }
    @Override public String payload() {
        return "{\"customerId\":\"" + customerId + "\"}";
    }
}

@Service
public class OrderService {
    private final OrderRepository orders;
    private final ApplicationEventPublisher events;

    @Transactional
    public Order place(Order order) {
        Order saved = orders.save(order);
        events.publishEvent(new OrderPlaced(saved.getId().toString(), order.getCustomerId()));
        return saved;   // bridge writes the outbox row BEFORE_COMMIT
    }

    @Transactional
    public void cancel(Long id) {
        orders.deleteById(id);   // flips `deleted`, issues no SQL DELETE
    }
}
```

Enable the bridge and pick a relay:

```yaml
adhar:
  persistence:
    outbox:
      enabled: true
      bridge-enabled: true
      relay: kafka
      kafka:
        topic: orders.events
```

`DomainEventOutboxBridge` listens at `TransactionPhase.BEFORE_COMMIT`, so the outbox insert joins the same transaction. `OutboxPublisher` then polls due rows, calls `OutboxRelay.relay(event)`, and on an exception applies backoff and re-queues. Rows move `PENDING → PROCESSED`, or `FAILED` while attempts remain, and `DEAD` once `max-attempts` is exhausted.

**Soft delete is implemented with Hibernate's `@SQLRestriction("deleted = false")` on the mapped superclass**, not `@SoftDelete` or `@SQLDelete` — those would either shadow the `deleted` column or need a table name that a shared superclass cannot supply. The restriction is unconditional and cannot be switched off per session, which is why seeing deleted rows requires `findAllDeleted()` and a native query.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.persistence.enabled` | Master switch | `true` |
| `adhar.persistence.enable-auditing` | Register the JPA auditing listener | `true` |
| `adhar.persistence.enable-soft-delete` | Soft-delete support | `true` |
| `adhar.persistence.default-batch-size` | Batch size for `saveAllInBatch` | `50` |
| `adhar.persistence.migration.locations` | Flyway script location | `classpath:db/migration` |
| `adhar.persistence.migration.baseline-on-migrate` | Baseline an existing schema | `true` |
| `adhar.persistence.connection-pool.maximum-pool-size` | Hikari max connections | `10` |
| `adhar.persistence.connection-pool.minimum-idle` | Hikari idle floor | `5` |
| `adhar.persistence.metrics.slow-query-threshold-ms` | Slow-query log/metric threshold | `500` |
| `adhar.persistence.multitenancy.enabled` | Tenant resolution and filter | `false` |
| `adhar.persistence.multitenancy.strategy` | `SCHEMA`, `DATABASE`, `DISCRIMINATOR` | `SCHEMA` |
| `adhar.persistence.outbox.enabled` | Outbox publisher | `false` |
| `adhar.persistence.outbox.bridge-enabled` | Persist `OutboxedEvent`s automatically | `false` |
| `adhar.persistence.outbox.relay` | `application-event` or `kafka` | `application-event` |
| `adhar.persistence.outbox.poll-interval-ms` | Relay poll period | `5000` |
| `adhar.persistence.outbox.batch-size` | Rows per pass | `100` |
| `adhar.persistence.outbox.max-attempts` | Attempts before `DEAD` | `5` |
| `adhar.persistence.outbox.initial-backoff-ms` | First retry delay | `1000` |
| `adhar.persistence.outbox.backoff-multiplier` | Backoff growth | `2.0` |
| `adhar.persistence.outbox.max-backoff-ms` | Backoff ceiling | `60000` |
| `adhar.persistence.envers.enabled` | Envers revision-history reader | `true` |
| `adhar.persistence.diagnostics.n-plus-one.enabled` | N+1 query detector | `false` |
| `adhar.persistence.diagnostics.n-plus-one.threshold` | Similar queries that trip it | `10` |

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Deleted rows still return from a report | The query is native SQL or a bulk delete — `@SQLRestriction` only applies to Hibernate-generated SELECTs | Filter `deleted = false` yourself in native queries |
| `deleteById` physically removes the row | The repository is not backed by `SoftDeleteRepositoryImpl` | Extend `SoftDeleteRepository`; the entity must extend `SoftDeletableEntity` |
| Two instances publish the same outbox event | The database or dialect does not support `SKIP LOCKED`, so the publisher falls back to an unlocked fetch (a warning is logged) | Use PostgreSQL/MySQL 8+, or run a single relay instance |
| Events published but the transaction rolled back | Publishing directly to a broker inside the method instead of through the outbox | Emit an `OutboxedEvent` and let the bridge write the row |
| `created_by` is null | No authenticated principal when the row was written | Expect nulls for system writes, or supply your own `AuditorAware` |
| Rows stuck at `DEAD` | `max-attempts` exhausted; there is no automatic redrive | Fix the relay, then reset `status` to `PENDING` |
| `OptimisticLockException` under contention | Concurrent writers to the same `@Version` row | Wrap the unit of work in `OptimisticLockRetryTemplate.execute(...)` |

## See also

- [Cache](/adhar-kit/modules/cache) — read-through caching in front of this layer.
- [Event Sourcing](/adhar-kit/modules/event-sourcing) — when the event stream, not the row, is the source of truth.
- [Messaging](/adhar-kit/modules/messaging) — where outbox events go once relayed.
- [Dapr](/adhar-kit/modules/dapr) — backs the optional `DaprStateRepository`.
