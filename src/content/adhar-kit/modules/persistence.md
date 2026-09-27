---
title: "Persistence"
section: "Modules"
order: 19
path: "/adhar-kit/modules/persistence"
---

# Persistence

`adhar-kit-persistence` is a framework-agnostic data layer over JPA with a unified facade and enterprise features baked in: auditing, automatic soft delete, multi-tenancy, a transactional outbox, and optimistic-lock retries.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-persistence</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
```

## Key APIs

- `PersistenceFacade` — `save`, `saveAll`, `findById`, `deleteById`, `query`, `executeInTransaction`
- Repository annotations — `@Repository`, `@Query`, `@Modifying`, `@Param`
- Entity annotations — `@Audited`, `@SoftDelete`, `@MultiTenant(strategy = …)`, `@TenantId`
- Base classes — `SoftDeletableEntity`, `SoftDeleteRepository`, `BaseAuditEntity`
- Outbox — `OutboxPublisher`, `OutboxRelay`, `OutboxEvent`, `OutboxStatus`
- `OptimisticLockRetryTemplate`

## Basic usage

```java
@Service
public class UserService {
    private final PersistenceFacade persistence = PersistenceFacade.getInstance();

    @Transactional
    public User createUser(String email, String name) {
        User user = new User();
        user.setEmail(email);
        user.setName(name);
        return persistence.save(user);
    }
}
```

## Soft delete

Extend `SoftDeletableEntity` and deletes become soft deletes automatically — `findAll()`/`findById()`/counts exclude soft-deleted rows (Hibernate `@SQLRestriction("deleted = false")`), while `SoftDeleteRepository` exposes `findAllDeleted()`, `restore(id)`, and `findAllActive()`. (Batch deletes remain physical.)

## Multi-tenancy

```java
@Entity
@MultiTenant(strategy = MultiTenancyStrategy.SCHEMA)
public class Invoice extends BaseEntity<Long> { ... }
```

Requests carry `X-Tenant-ID`; the tenant filter resolves the tenant and Hibernate routes to the right schema. (The `SCHEMA` strategy is the one implemented today.)

## Transactional outbox

Guarantee "save + publish" atomicity: the event is written to an outbox table in the same transaction, then a relay delivers it with retry/backoff and a dead-letter state — no lost or double-published events.

```yaml
adhar:
  persistence:
    multitenancy:
      enabled: true
      strategy: SCHEMA
    outbox:
      enabled: true
      poll-interval-ms: 5000
      batch-size: 100
      max-attempts: 5          # then marked DEAD
      backoff-multiplier: 2.0
```

Multi-instance delivery is safe via `SELECT … FOR UPDATE SKIP LOCKED`. Pairs naturally with [messaging](/adhar-kit/modules/messaging) for reliable event-driven systems.
