---
title: "Persistence"
section: "Modules"
order: 19
path: "/adhar-kit/modules/persistence"
---

# Persistence

Every service team rebuilds the same data-layer scaffolding:

- audit columns
- a "delete" that really means hide
- tenant scoping
- writing a row *and* publishing an event without losing one of them

`adhar-kit-persistence` **ships those four as defaults, so each team does not write them once and get them subtly wrong.** It is a thin layer over JPA and Hibernate, not a replacement for them.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-persistence` |
| Built on | Spring Data JPA / Hibernate, HikariCP, Flyway; optional QueryDSL, Envers, Kafka, Micrometer |
| Entry points | `PersistenceFacade`, `BaseRepository`, `SoftDeleteRepository`, `OutboxEvent` |
| Config prefix | `adhar.persistence` |
| Use it when | You want audited, soft-deletable, tenant-scoped entities and atomic save-plus-publish |

## How it works

Four independent features sit on top of the same JPA session. You can adopt any one without the others.

```diagram
kit-persistence-layers
```

The rule that matters: **the outbox row and the business row commit together.** Nothing is published before the transaction succeeds. Nothing is lost if the process dies right after commit, because the relay picks the row up on its next pass.

## Transaction boundaries

`PersistenceFacade` is both a classic singleton and a Spring bean. But it is **not** annotated `@Transactional`, and it is not proxied. The transaction behavior lives one level down, in `SpringPersistenceAdapter`, which carries a **class-level `@Transactional`**. This table answers the question people actually ask:

| Call | What happens with no active transaction |
| --- | --- |
| `save`, `findById`, `count`, any CRUD method | The adapter's class-level `@Transactional` (`REQUIRED`) opens one. It does not throw and does not run unmanaged |
| `executeInTransaction(supplier)` | `REQUIRED` via the proxy. Joins an existing transaction or opens one |
| `executeReadOnly(supplier)` | `@Transactional(readOnly = true)` via the proxy |
| `executeInTransaction(supplier, isolationLevel)` | Programmatic `TransactionTemplate` with that isolation level, propagation `REQUIRED` |
| `executeInNewTransaction(runnable)` | Programmatic `TransactionTemplate` with `REQUIRES_NEW`. Always a separate transaction that commits on its own |
| Anything, when no `PersistenceService` delegate exists | `IllegalStateException`: *"No PersistenceService configured — refusing to fake persistence operations."* |

The last row is deliberate. The facade refuses to silently do nothing and pretend a write happened. A `SmartInitializingSingleton` wires the delegate after all singletons exist. So you can use the facade from application code, but **not** from another bean's constructor or `@PostConstruct`.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-persistence</artifactId>
    <version>0.1.0</version>
</dependency>
```

Add your JDBC driver (`org.postgresql:postgresql` for the examples here) alongside it.

## Key APIs

- **`PersistenceFacade`**: framework-neutral CRUD without injecting an `EntityManager`. Offers `save`, `saveAll`, `saveAllInBatch`, `findById`, `findAll` (paged or by `Specification`), `query`, `bulkUpdate`, `bulkDelete`, `count`, the three `execute*` transaction helpers, `merge`, `refresh`, `detach`, `flush` and `getQueryStats()`.
- **`BaseRepository<T, ID>`**: `JpaRepository` plus `JpaSpecificationExecutor`. **`SoftDeleteRepository`** adds `findAllActive()`, `findActiveById(id)`, `countActive()`, `softDeleteById(id)`, `findAllDeleted()`, `restore(id)`.
- **Entity base classes**: `BaseEntity` (identity `id`), `AuditableEntity` (adds `created_at`, `created_by`, `updated_at`, `updated_by` and a `@Version` column), `SoftDeletableEntity` (adds `deleted`, `deleted_at`, `deleted_by` plus `markDeleted()` and `restore()`).
- **Outbox**: `OutboxEvent` (+ nested `OutboxStatus`), `OutboxRepository`, `OutboxPublisher`, the `OutboxRelay` SPI with `ApplicationEventOutboxRelay` and `KafkaOutboxRelay`, and the `OutboxedEvent` marker interface bridged by `DomainEventOutboxBridge`.
- **`OptimisticLockRetryTemplate`**: call `withDefaults()` (3 attempts, 50 ms initial backoff, 2.0 multiplier), then `execute(supplier)`. Immutable and safe to share.
- **Multi-tenancy**: `TenantContext`, `TenantWebFilter`, `SchemaMultiTenantConnectionProvider`.

> The annotations in `com.adhar.kit.persistence.annotation` are **marker types with no processor**: `@Audited`, `@MultiTenant`, `@SoftDelete`, `@Repository`, `@Query`, `@Modifying`, `@Param`, `@Cacheable`. The module declares no aspect and does not depend on AspectJ. Soft delete comes from `@SQLRestriction`, auditing from Spring Data's listener, and Envers from Hibernate's own `org.hibernate.envers.@Audited`. Use the Spring Data annotations in your repositories.

## Auditing

Extend `AuditableEntity` and you get the four audit columns plus a `@Version` column. `AuditorAwareImpl` fills `created_by` and `updated_by` from the current Spring Security principal. The `@Version` column is what makes `OptimisticLockRetryTemplate` useful.

> `BaseEntity.equals` is id-based and tests only `instanceof BaseEntity`. So two entities of *different* subclasses with the same id compare equal. `hashCode()` returns `getClass().hashCode()`. This stays stable when the id is assigned, but a `HashSet` of mixed entities degrades to one bucket per class. Transient entities (`id == null`) are never equal to a different instance.

## Soft delete, and how it interacts with native queries

**Soft delete uses Hibernate's `@SQLRestriction("deleted = false")` on the `SoftDeletableEntity` mapped superclass.** It does not use `@SoftDelete` or `@SQLDelete`. Those would either shadow the `deleted` column or need a table name that a shared superclass cannot supply.

That choice sets the feature's limits, because **Hibernate applies `@SQLRestriction` when it generates a SELECT**. It covers JPQL, Criteria queries, `Specification`s, derived finders and association loads, including every default method on `SoftDeleteRepository`. It does **not** cover:

- **Native SQL.** You wrote it, and Hibernate does not rewrite it. Add `AND deleted = false` yourself. Reporting tools that read the table directly have the same problem.
- **Bulk JPQL `UPDATE`/`DELETE`**, which bypass both the restriction and the entity lifecycle.
- **A first-level-cache hit.** `EntityManager.find()`, which backs `findById`, returns an already-managed instance without issuing SQL. So a soft-deleted entity loaded earlier in the same transaction still comes back. The module's own integration test works around this with `flush()` then `clear()`.

The restriction always applies and cannot be switched off per session. So reading deleted rows needs an escape hatch. The implementation drops to native SQL, built at runtime from the entity's resolved table name:

```sql
SELECT * FROM <table> WHERE deleted = true          -- findAllDeleted()
SELECT * FROM <table> WHERE id = ?1                 -- restore(id), then restore() + save()
```

Two more things surprise people. First, `SoftDeleteRepositoryImpl` overrides only `delete(T)`. `deleteById`, `deleteAll` and `deleteAllById` become soft deletes because Spring Data's `SimpleJpaRepository` routes them through it. Second, the auto-configuration does **not** wire the implementation as the global `repositoryBaseClass`. Set `@EnableJpaRepositories(repositoryBaseClass = SoftDeleteRepositoryImpl.class)` yourself.

## The outbox: lifecycle and delivery guarantee

Inside your `@Transactional` method, `publishEvent(OrderPlaced)` does nothing until `BEFORE_COMMIT`. At that point `DomainEventOutboxBridge` inserts an `adhar_outbox_event` row with `status = PENDING`, `attempts = 0` and `next_attempt_at = now`. That insert joins your transaction, so the business row and the outbox row commit as one.

Separately, every `poll-interval-ms`, `OutboxPublisher` runs a pass:

1. Fetch a batch of rows that are `PENDING` or `FAILED` and due.
2. Call `relay.relay(event)` on each.
3. Mark each one processed.
4. Commit the whole batch at the end.

**The guarantee is at-least-once, not exactly-once.** The write side is atomic. The bridge listens at `TransactionPhase.BEFORE_COMMIT`, so the outbox insert joins your transaction and a rollback takes the event with it.

The *delivery* side is not atomic. `relay()` is an external side effect: an `ApplicationEventPublisher` call or a blocking Kafka send. It happens **before** `markAsProcessed`, which is a bulk JPQL update that is only flushed when the batch transaction commits. A crash, rollback or shutdown in between leaves the row `PENDING` with `next_attempt_at` in the past. So the next pass delivers it again. There is no dedup key, no unique constraint and no "already processed" check anywhere in the path.

**So your consumer must be idempotent.** Use `OutboxEvent.id` as the dedup key. `KafkaOutboxRelay` carries it as the `outbox-event-id` header.

For safety across multiple instances, the publisher uses `@Lock(PESSIMISTIC_WRITE)` plus the Hibernate lock-timeout sentinel that requests `SKIP LOCKED`. If the database or dialect rejects it, the publisher logs one warning. It then falls back to an **unlocked** fetch for the rest of the process's life. You need a restart to retry the locking path. On that fallback, concurrent publishers will sometimes deliver the same event twice.

Rows move through these states:

- `PENDING → PROCESSED` on success.
- `FAILED`, with an incremented attempt count and `next_attempt_at = now + min(initialBackoff × multiplier^(attempts−1), maxBackoff)`.
- `DEAD` once `max-attempts` is exhausted.

**There is no automatic redrive from `DEAD`.**

### A complete example

```java
package com.example.orders;

import com.adhar.kit.persistence.outbox.OutboxedEvent;
import com.adhar.kit.persistence.repository.SoftDeleteRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Entity @Table(name = "orders")
public class Order extends SoftDeletableEntity { /* … */ }

public interface OrderRepository extends SoftDeleteRepository<Order, Long> { }

public record OrderPlaced(String orderId, String customerId) implements OutboxedEvent {
    @Override public String aggregateType() { return "Order"; }
    @Override public String aggregateId()   { return orderId; }
    @Override public String eventType()     { return "OrderPlaced"; }
    @Override public String payload()       { return "{\"customerId\":\"" + customerId + "\"}"; }
}

@Service
public class OrderService {

    private final OrderRepository orders;
    private final ApplicationEventPublisher events;

    public OrderService(OrderRepository o, ApplicationEventPublisher e) { orders = o; events = e; }

    @Transactional                                  // REQUIRED - the bridge needs a transaction
    public Order place(Order order) {
        Order saved = orders.save(order);
        events.publishEvent(new OrderPlaced(saved.getId().toString(), order.getCustomerId()));
        return saved;                               // outbox row written BEFORE_COMMIT
    }

    @Transactional
    public void cancel(Long id) {
        orders.deleteById(id);                      // flips `deleted`, issues no SQL DELETE
    }
}
```

```yaml
adhar:
  persistence:
    outbox: { enabled: true, bridge-enabled: true, relay: kafka }
```

> **The bridge is silently skipped without a transaction.** `@TransactionalEventListener` defaults to `fallbackExecution = false`. So if you publish an `OutboxedEvent` from a non-transactional method, it is dropped with nothing but a debug log. The `@Transactional` on `place` is essential, and so is calling it through the proxy. A `this.place(order)` call from elsewhere in `OrderService` bypasses the transaction proxy. That means no transaction, so no outbox row and no exception. This is the standard self-invocation trap, and here it loses data silently.

You must also register the outbox entity and repository yourself:

1. Add `@EnableJpaRepositories` and `@EntityScan` for `com.adhar.kit.persistence.outbox`.
2. Create the `adhar_outbox_event` table. No migration ships with the module.

## How it behaves

- **The relay thread.** `pollAndPublish` is a `@Scheduled(fixedDelayString = "${adhar.persistence.outbox.poll-interval-ms:5000}")` method. It runs on Spring Boot's shared, single-threaded `taskScheduler`, which every other `@Scheduled` method in your application also uses. Polls are strictly serial. `KafkaOutboxRelay` blocks on the send future with **no timeout**. So a stuck broker stalls that thread indefinitely, and every other scheduled task with it.
- **Shutdown drops the batch.** There is no `@PreDestroy` or `SmartLifecycle`. The scheduler is destroyed without waiting, so an in-flight `pollAndPublish` is interrupted and its whole transaction rolls back. That includes status updates for events already relayed successfully. This is the concrete reason delivery is at-least-once.
- **Tenancy does not propagate.** `TenantContext` is a plain `ThreadLocal`, not `InheritableThreadLocal`. It has no `TaskDecorator` or context-propagation accessor. An `@Async` method, a `CompletableFuture`, a scheduled task and a virtual thread all see the default tenant. `TenantWebFilter` reads `X-Tenant-ID` and clears it in a `finally`, which is correct for pooled request threads. Every non-HTTP entry point must clear it itself. `SchemaMultiTenantConnectionProvider` sets the connection schema on checkout and **does not reset it on release**. Only the `SCHEMA` strategy is implemented.
- **Optimistic-lock retry is narrow.** `OptimisticLockRetryTemplate` catches exactly `ObjectOptimisticLockingFailureException` and `jakarta.persistence.OptimisticLockException`. It does not catch the parent `OptimisticLockingFailureException`, nor Hibernate's `StaleObjectStateException`. With defaults it sleeps 50 ms, then 100 ms, then rethrows. The supplier runs again on each attempt, so it must have no external side effects.
- **The N+1 detector grows.** `NPlusOneDetector` keeps per-thread `HashMap`s that map statement text to a count, and **nothing resets them**. On a pooled thread they build up for the thread's whole lifetime. Keep it off outside development.
- **The module ships its own `application.properties`** on the classpath. It forces `spring.jpa.open-in-view=false`, `hibernate.jdbc.batch_size=20`, `order_inserts=true`, `order_updates=true` and `batch_versioned_data=true`. These are good defaults, but they are applied silently.

## Metrics

With a `MeterRegistry` present, `PersistenceMetricsCollector` publishes four **untagged** meters:

- the timers `adhar.persistence.query.duration` and `adhar.persistence.transaction.duration`, both with p50/p95/p99
- the counter `adhar.persistence.errors`
- the counter `adhar.persistence.slow.queries`, which fires with a WARN log when a query takes at least `slow-query-threshold-ms`

Separately, `getQueryStats()` returns a `QueryStats` record. It is computed from in-process adders, not from the registry. So it is per-JVM and resets on restart.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.persistence.enabled` | Master switch | `true` |
| `adhar.persistence.enable-auditing` | Register the JPA auditing listener | `true` |
| `adhar.persistence.default-batch-size` | Batch size for `saveAllInBatch` | `50` |
| `adhar.persistence.metrics.slow-query-threshold-ms` | Slow-query log/metric threshold | `500` |
| `adhar.persistence.multitenancy.enabled` | Tenant resolution and filter (`SCHEMA` strategy only) | `false` |
| `adhar.persistence.outbox.enabled` | Outbox publisher | `false` |
| `adhar.persistence.outbox.bridge-enabled` | Persist `OutboxedEvent`s automatically | `false` |
| `adhar.persistence.outbox.relay` | `application-event` or `kafka` | `application-event` |
| `adhar.persistence.outbox.poll-interval-ms` | Relay poll period (fixed delay) | `5000` |
| `adhar.persistence.outbox.batch-size` | Rows per pass | `100` |
| `adhar.persistence.outbox.max-attempts` | Attempts before `DEAD` | `5` |
| `adhar.persistence.outbox.initial-backoff-ms` / `.backoff-multiplier` / `.max-backoff-ms` | Retry backoff curve | `1000` / `2.0` / `60000` |
| `adhar.persistence.outbox.kafka.topic` | Topic for `KafkaOutboxRelay` | `adhar.outbox.events` |
| `adhar.persistence.envers.enabled` | Envers revision-history reader | `true` |
| `adhar.persistence.diagnostics.n-plus-one.enabled` / `.threshold` | N+1 detector, and repeats of one statement that trip it | `false` / `10` |

The `adhar.persistence.migration.*` and `adhar.persistence.connection-pool.*` blocks are bound, but no code in the module reads them. Configure Flyway and HikariCP through Spring Boot's own `spring.flyway.*` and `spring.datasource.hikari.*` keys. The same applies to `enable-soft-delete`, which gates nothing.

## Testing

- **Reset the facade singleton** with `PersistenceFacade.getInstance().setDelegate(null)` in an `@AfterEach`. There is no other API. Clear `TenantContext` there too. A tenant left over on a reused test thread causes baffling failures in other tests.
- **Prove soft delete honestly.** Call `flush()` then `clear()` before asserting that a deleted row is gone. Otherwise the first-level cache hands it straight back, and the test passes for the wrong reason.
- **Drive the outbox deterministically.** Set a long `poll-interval-ms`, call `pollAndPublish()` directly, then assert on row status. Stub `OutboxRelay` to throw, and assert the attempt count and `next_attempt_at` instead of waiting out a backoff.
- **Use Postgres, not H2, for anything about `SKIP LOCKED`.** On H2 the publisher takes its unlocked fallback, and the test proves nothing. `adhar-kit-test-commons` provides `BaseIntegrationTest` and `PostgresTestContainer` (`postgres:15-alpine`), plus `DatabaseSeeder` for fixture rows.

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Deleted rows still return from a report | The query is native SQL or a bulk delete. `@SQLRestriction` only applies to Hibernate-generated SELECTs | Filter `deleted = false` yourself in native queries |
| `findById` returns a deleted entity | It hit the first-level cache and issued no SQL | `flush()` then `clear()`, or use `findActiveById` |
| `deleteById` physically removes the row | The repository is not backed by `SoftDeleteRepositoryImpl` | Set `repositoryBaseClass` yourself; the entity must extend `SoftDeletableEntity` |
| No outbox row is written and nothing is logged | The publishing method had no transaction, so `BEFORE_COMMIT` never fired | Annotate it `@Transactional` and call it through the proxy, not via `this.` |
| Two instances publish the same outbox event | `SKIP LOCKED` was rejected once, so the publisher permanently fell back to an unlocked fetch | Use PostgreSQL/MySQL 8+, or run a single relay |
| Every scheduled task in the app stalls | `KafkaOutboxRelay` blocks on a send with no timeout, on the shared scheduler | Dedicate a `TaskScheduler` pool; set broker delivery timeouts |
| Rows stuck at `DEAD` | `max-attempts` exhausted; no automatic redrive | Fix the relay, then reset `status` to `PENDING` |
| The tenant is wrong inside an `@Async` method | `TenantContext` is a plain `ThreadLocal` | Set it at the start of the async task |
| `OptimisticLockException` under contention | Concurrent writers to one `@Version` row | Wrap a side-effect-free unit of work in `OptimisticLockRetryTemplate.execute(...)` |

## See also

- [Cache](/adhar-kit/modules/cache) — read-through caching in front of this layer.
- [Event Sourcing](/adhar-kit/modules/event-sourcing) — when the event stream, not the row, is the source of truth.
- [Messaging](/adhar-kit/modules/messaging) — where outbox events go once relayed.
- [Dapr](/adhar-kit/modules/dapr) — backs the optional `DaprStateRepository`.
