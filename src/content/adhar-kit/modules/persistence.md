---
title: "Persistence"
section: "Modules"
order: 19
path: "/adhar-kit/modules/persistence"
---

# Persistence

`adhar-kit-persistence` is a thin layer over Spring Data JPA and Hibernate that gives you the data-layer pieces every service rebuilds: audited entities with optimistic locking, soft delete, schema-per-tenant multi-tenancy, and a transactional outbox that commits an event with the business row. Use it when a service owns a relational database and you want those behaviours as base classes and configuration instead of hand-written code. Each feature is independent; adopt one without the others.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-persistence` |
| Toggle | `adhar.persistence.enabled` (default `true`). Facade gate `adhar.kit.modules.persistence` (default `true`); when `false`, `adhar.getPersistence()` throws `IllegalStateException` |
| Facade | `adhar.getPersistence()` → `PersistenceFacade` (auto-wired to `SpringPersistenceAdapter`). Main beans: `PersistenceService`, `OutboxPublisher`, `RevisionHistoryReader`, `DaprStateRepository` |
| Dependencies | Required: `adhar-kit-commons`, Spring Data JPA, Flyway, HikariCP, Bean Validation. Optional: `spring-kafka` (Kafka relay), `hibernate-envers`, `micrometer-core`, `spring-security-core` (auditor), `jakarta.servlet-api` (tenant filter), QueryDSL, `adhar-kit-dapr`, PostgreSQL/MySQL drivers |
| Frameworks | Spring Boot auto-configuration. On other runtimes, call `PersistenceFacade.getInstance().setDelegate(...)` with your own `PersistenceService` |

## How it works

```diagram
kit-persistence-layers
```

- **Entities** extend `BaseEntity` → `AuditableEntity` → `SoftDeletableEntity`. Spring Data's auditing listener fills the audit columns; Hibernate's `@SQLRestriction("deleted = false")` hides soft-deleted rows.
- **`PersistenceFacade`** is a framework-neutral `PersistenceService`. On Spring Boot, a `SmartInitializingSingleton` sets its delegate to `SpringPersistenceAdapter` (an `EntityManager` plus the transaction manager) once all singletons exist.
- **The outbox** writes an `adhar_outbox_event` row inside your transaction. A scheduled `OutboxPublisher` later hands due rows to an `OutboxRelay` (Spring application event or Kafka).
- **No database, no JPA.** If `spring.datasource.url` and `spring.datasource.jndi-name` are unset and no embedded driver (H2, HSQLDB, Derby) is on the classpath, `NoDatabaseEnvironmentPostProcessor` excludes the DataSource, JPA, Spring Data JPA, Flyway and persistence auto-configurations and logs one line. A gateway or event consumer built on the starter then starts without a database.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-persistence</artifactId>
    <version>0.1.0</version>
</dependency>
<!-- Your JDBC driver, e.g. -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

Add `spring-kafka` for the Kafka relay, `hibernate-envers` for revision history, and `spring-security-core` if you keep the default auditor (`adhar-kit-starter` brings it through `adhar-kit-security`).

## Use it

### Enable repositories

The module registers no `@EnableJpaRepositories` of its own. Declare it in your application, with `SoftDeleteRepositoryImpl` as the base class so `SoftDeleteRepository` methods work. Add the outbox package if you use the outbox.

```java
package com.example.orders;

import com.adhar.kit.persistence.repository.SoftDeleteRepositoryImpl;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(
        basePackages = {"com.example.orders", "com.adhar.kit.persistence.outbox"},
        repositoryBaseClass = SoftDeleteRepositoryImpl.class)
@EntityScan(basePackages = {"com.example.orders", "com.adhar.kit.persistence.outbox"})
public class PersistenceConfig {
}
```

### Audited, soft-deletable entity

```java
package com.example.orders;

import com.adhar.kit.persistence.entity.SoftDeletableEntity;
import com.adhar.kit.persistence.repository.SoftDeleteRepository;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "orders")
public class Order extends SoftDeletableEntity {
    private String customerId;
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
}

interface OrderRepository extends SoftDeleteRepository<Order, Long> { }
```

| Base class | Columns it adds |
| --- | --- |
| `BaseEntity` | `id` (`Long`, `IDENTITY`) |
| `AuditableEntity` | `created_at`, `created_by`, `updated_at`, `updated_by` (`LocalDateTime` / `String`), `version` (`@Version`) |
| `SoftDeletableEntity` | `deleted`, `deleted_at`, `deleted_by`, plus `markDeleted()`, `markDeleted(String)`, `restore()`, `isDeleted()` |

`SoftDeleteRepository<T, ID>` (extends `BaseRepository` = `JpaRepository` + `JpaSpecificationExecutor`) adds `findAllActive()` (also with `Sort` or `Pageable`), `findActiveById(id)`, `countActive()`, `softDeleteById(id)`, `findAllDeleted()` and `restore(id)`. With `SoftDeleteRepositoryImpl`, `delete`, `deleteById`, `deleteAll` and `deleteAllById` set `deleted = true` instead of issuing SQL `DELETE`.

### Save and publish atomically (outbox)

```java
package com.example.orders;

import com.adhar.kit.persistence.outbox.OutboxedEvent;

public record OrderPlaced(String orderId, String customerId) implements OutboxedEvent {
    @Override public String aggregateType() { return "Order"; }
    @Override public String aggregateId()   { return orderId; }
    @Override public String eventType()     { return "OrderPlaced"; }
    @Override public String payload()       { return "{\"customerId\":\"" + customerId + "\"}"; }
}
```

```java
package com.example.orders;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {
    private final OrderRepository orders;
    private final ApplicationEventPublisher events;

    public OrderService(OrderRepository orders, ApplicationEventPublisher events) {
        this.orders = orders;
        this.events = events;
    }

    @Transactional // required: the bridge listens at BEFORE_COMMIT
    public Order place(Order order) {
        Order saved = orders.save(order);
        events.publishEvent(new OrderPlaced(saved.getId().toString(), saved.getCustomerId()));
        return saved;
    }
}
```

```yaml
adhar:
  persistence:
    outbox:
      enabled: true
      bridge-enabled: true
      relay: kafka            # or application-event (default)
```

Create the `adhar_outbox_event` table yourself (no migration ships). Its columns map `OutboxEvent`: `id` (UUID), `aggregate_type`, `aggregate_id`, `event_type`, `payload` (TEXT), `created_at`, `processed_at`, `status` (`PENDING`/`PROCESSED`/`FAILED`/`DEAD`), `attempts`, `next_attempt_at`, `last_error` (≤2000).

```diagram
nkc-persistence-outbox-states
```

Delivery is **at-least-once**. The relay runs before the row is marked `PROCESSED`, and the status update commits with the whole batch, so a crash or shutdown mid-batch redelivers. Make consumers idempotent on `OutboxEvent.id`; `KafkaOutboxRelay` sends it as the `outbox-event-id` header, with `outbox-aggregate-type`, `outbox-aggregate-id` and `outbox-event-type`, keyed by aggregate id. To relay elsewhere, define your own `OutboxRelay` bean.

### The facade

```java
import com.adhar.kit.persistence.PersistenceFacade;
import com.adhar.kit.persistence.specification.SpecificationBuilder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

PersistenceFacade db = adhar.getPersistence();     // adhar: the injected AdharFacade

Order saved = db.save(order);                       // EntityManager.merge: use the return value
Specification<Order> spec = SpecificationBuilder.of(Order.class)
        .equal("customerId", "c-42")
        .isNull("deletedAt")
        .build();
Page<Order> page = db.findAll(Order.class, spec, PageRequest.of(0, 20));

int n = db.executeInTransaction(() ->
        db.bulkUpdate(Order.class, "UPDATE Order o SET o.customerId = ?1 WHERE o.customerId = ?2",
                "c-43", "c-42"));
```

| Method group | Behaviour |
| --- | --- |
| `save`, `saveAll`, `findById`, `findAll`, `query`, `count`, `delete…`, `existsById` | Run in the adapter's class-level `@Transactional` (`REQUIRED`). `query`/`bulkUpdate`/`bulkDelete` take JPQL with positional `?1` parameters |
| `saveAll(iterable)` / `saveAllInBatch(list, batchSize)` | Flush and clear every `default-batch-size` / `batchSize` entities |
| `executeInTransaction(supplier)` / `executeReadOnly(supplier)` | `@Transactional` / `@Transactional(readOnly = true)` |
| `executeInTransaction(supplier, isolationLevel)` / `executeInNewTransaction(runnable)` | `TransactionTemplate` with that isolation / `REQUIRES_NEW` |
| `merge`, `refresh`, `detach`, `isManaged`, `flush` | Direct `EntityManager` calls |
| `getQueryStats()` / `resetQueryStats()` | In-process `QueryStats` (`totalQueries`, `avgLatencyMs`, `maxLatencyMs`, `slowQueryCount`, `errorCount`) |

With no delegate, every call except `getQueryStats` throws `IllegalStateException` ("No PersistenceService configured - refusing to fake persistence operations"). The delegate is wired after singleton creation, so do not call the facade from another bean's constructor or `@PostConstruct`.

### Multi-tenancy, optimistic locking, history

- **Schema per tenant.** Set `adhar.persistence.multitenancy.enabled=true`. Hibernate gets `SchemaMultiTenantConnectionProvider` and a resolver reading `TenantContext`; `TenantWebFilter` copies the `X-Tenant-ID` header into `TenantContext` and clears it after the request. Outside HTTP, call `TenantContext.setTenant(id)` and `TenantContext.clear()` yourself.
- **Optimistic-lock retry.** `OptimisticLockRetryTemplate.withDefaults()` (3 attempts, 50 ms initial backoff, ×2.0) or `new OptimisticLockRetryTemplate(maxAttempts, Duration, multiplier)`, then `execute(supplier)`. It retries `ObjectOptimisticLockingFailureException` and `jakarta.persistence.OptimisticLockException` only; the supplier must be side-effect free.
- **Envers.** With `hibernate-envers` on the classpath, annotate entities with `org.hibernate.envers.Audited` and inject `RevisionHistoryReader`: `getRevisions(class, id)`, `findAtRevision(class, id, rev)`, `findLatest(class, id)`.
- **Dapr state store.** With `adhar-kit-dapr`, `adhar.dapr.enabled=true` and a `DaprFacade` bean, `DaprStateRepository` offers `save(entity, id)`, `findById(type, id)`, `saveWithVersion` / `findWithVersion` (ETag), `existsById`, `deleteById`. Keys are `<SimpleClassName>:<id>`.

## Configuration

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `adhar.persistence.enabled` | boolean | `true` | Turns the auto-configuration on |
| `adhar.persistence.disable-without-database` | boolean | `true` | Exclude JDBC/JPA auto-configuration when no database is configured; `false` keeps Spring Boot's fail-fast |
| `adhar.persistence.enable-auditing` | boolean | `true` | `@EnableJpaAuditing` with the `auditorAware` bean |
| `adhar.persistence.default-batch-size` | int | `50` | Flush/clear interval for `saveAll` |
| `adhar.persistence.metrics.slow-query-threshold-ms` | long | `500` | Slow-query WARN log and counter threshold |
| `adhar.persistence.multitenancy.enabled` | boolean | `false` | Hibernate schema multi-tenancy and `TenantWebFilter` |
| `adhar.persistence.multitenancy.strategy` | enum | `SCHEMA` | Only `SCHEMA` is wired; `DATABASE` and `DISCRIMINATOR` register nothing |
| `adhar.persistence.outbox.enabled` | boolean | `false` | Outbox publisher and relay |
| `adhar.persistence.outbox.bridge-enabled` | boolean | `false` | Persist published `OutboxedEvent`s as outbox rows |
| `adhar.persistence.outbox.relay` | string | `application-event` | `application-event` or `kafka` (needs a `KafkaTemplate<String, String>` bean) |
| `adhar.persistence.outbox.kafka.topic` | string | `adhar.outbox.events` | Topic for `KafkaOutboxRelay` |
| `adhar.persistence.outbox.poll-interval-ms` | long | `5000` | Fixed delay between publisher passes |
| `adhar.persistence.outbox.batch-size` | int | `100` | Rows fetched per pass |
| `adhar.persistence.outbox.max-attempts` | int | `5` | Attempts before `DEAD` |
| `adhar.persistence.outbox.initial-backoff-ms` | long | `1000` | First retry delay |
| `adhar.persistence.outbox.backoff-multiplier` | double | `2.0` | Backoff growth per attempt |
| `adhar.persistence.outbox.max-backoff-ms` | long | `60000` | Backoff ceiling |
| `adhar.persistence.envers.enabled` | boolean | `true` | Register `RevisionHistoryReader` when Envers is present |
| `adhar.persistence.diagnostics.n-plus-one.enabled` | boolean | `false` | Register the N+1 `StatementInspector` |
| `adhar.persistence.diagnostics.n-plus-one.threshold` | int | `10` | Repeats of one statement on a thread before a WARN |
| `adhar.persistence.dapr.enabled` | boolean | `true` | Register `DaprStateRepository` (when Dapr is enabled) |
| `adhar.persistence.dapr.state-store` | string | `statestore` | Dapr state store component name |

Bound but not read by any code: `enable-soft-delete`, `metrics.enabled`, `migration.*`, `connection-pool.*`, and the legacy flat `multi-tenancy-strategy`. The legacy `enable-multi-tenancy` registers a `TenantIdentifierResolver` bean that is not wired into Hibernate. Configure Flyway and HikariCP with `spring.flyway.*` and `spring.datasource.hikari.*`.

## Operations

- **Metrics.** With a `MeterRegistry`, `PersistenceMetricsCollector` registers untagged meters: timers `adhar.persistence.query.duration` and `adhar.persistence.transaction.duration` (p50/p95/p99), counters `adhar.persistence.errors` and `adhar.persistence.slow.queries`. Only calls through `PersistenceFacade`/`SpringPersistenceAdapter` are measured, not your Spring Data repositories.
- **Outbox thread.** `pollAndPublish` is a `@Scheduled` method on Spring's shared scheduler, so passes are serial and share the thread with your other `@Scheduled` tasks. `KafkaOutboxRelay` blocks on the send with no timeout; set producer delivery timeouts or give the app a larger `TaskScheduler`.
- **Multiple instances.** The publisher fetches with `PESSIMISTIC_WRITE` and `SKIP LOCKED`. If the database rejects that once, it logs a warning and uses an unlocked fetch until restart; concurrent publishers can then deliver the same event twice.
- **Shutdown.** The publisher has no shutdown hook. An interrupted pass rolls back its status updates, and those events are delivered again on the next start.
- **Redriving.** `DEAD` rows stay put. Fix the cause, then set `status = 'PENDING'` and `next_attempt_at` to now.

## Limits

- **Soft delete applies only to Hibernate-generated SELECTs.** Native SQL, bulk JPQL `UPDATE`/`DELETE`, and first-level-cache hits (`findById` on an entity already loaded in the same transaction) still see deleted rows. Add `deleted = false` to native queries; use `flush()` and `clear()` in tests.
- **`SoftDeleteRepository` needs `repositoryBaseClass = SoftDeleteRepositoryImpl.class`.** `findAllDeleted()` and `restore(id)` are implemented only there (as native SQL on the entity's table).
- **No transaction, no outbox row.** The bridge is a `@TransactionalEventListener(BEFORE_COMMIT)`, so an `OutboxedEvent` published outside a transaction, or via `this.method()` self-invocation that bypasses the proxy, is dropped with only a DEBUG log.
- **`TenantContext` is a plain `ThreadLocal`.** `@Async` methods, `CompletableFuture`s, scheduled tasks and virtual threads do not inherit it. Without a tenant, `getTenant()` returns `default`, which becomes the schema name. The connection provider sets the schema on checkout and does not reset it on release.
- **Default auditor.** `AuditorAwareImpl` returns the Spring Security principal name, or `system` when unauthenticated. Without `spring-security-core`, set `enable-auditing=false` or define your own `AuditorAware<String>` bean named `auditorAware`.
- **`BaseEntity` equality** is id-based across all subclasses (`instanceof BaseEntity`), and `hashCode()` is `getClass().hashCode()`.
- **N+1 detector state is never reset** on pooled threads; keep it for development.
- **The marker annotations** in `com.adhar.kit.persistence.annotation` (`@Audited`, `@SoftDelete`, `@MultiTenant`, `@Repository`, `@Query`, `@Modifying`, `@Param`, `@Cacheable`) have no processor. Use the Spring Data, Hibernate and Envers annotations.

## Next steps

- [Messaging](/adhar-kit/modules/messaging) — consume the events the outbox relays.
- [Event Sourcing](/adhar-kit/modules/event-sourcing) — when the event stream, not the row, is the source of truth.
- [Cache](/adhar-kit/modules/cache) — read-through caching in front of this layer.
- [Dapr](/adhar-kit/modules/dapr) — the sidecar behind `DaprStateRepository`.
