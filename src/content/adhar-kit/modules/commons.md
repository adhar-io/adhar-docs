---
title: "Commons"
section: "Modules"
order: 10
path: "/adhar-kit/modules/commons"
---

# Commons

`adhar-kit-commons` is the foundation every other module builds on. It provides Domain-Driven Design annotations, base classes, a CloudEvents envelope, and auto-configured runtime plumbing for idempotency, multi-tenant/correlation context, API versioning, and global exception handling.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-commons</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

- **DDD annotations** — `@AggregateRoot`, `@ValueObject`, `@DomainEntity`, `@DomainService`
- **Base classes** — `BaseEntity<ID>`, `BaseDTO`, `BaseRepository<T, ID>`
- **Events** — `CloudEvent<T>`, `DomainEvent`, `KafkaCloudEvent<T>`, `CloudEventPublisher`
- **Models** — `ApiResponse`, `ErrorResponse`, `PageResponse`
- **Runtime** — `SpringGlobalExceptionHandler`, `IdempotencyAspect`, `TenantContext`, `CorrelationContext`, `TenantContextFilter`, `CorrelationIdFilter`, `ApiVersionInterceptor`
- **Annotations** — `@Idempotent`, `@ApiVersion`, `@PublishEvent`, `@EventHandler`, `@NotNullOrEmpty`

## Base entities

Extend `BaseEntity<ID>` to inherit identity, equality, and lifecycle conventions:

```java
@Entity
@Table(name = "users")
public class User extends BaseEntity<String> {
    @Id
    private String userId;
    private String username;
    private String email;

    @Override
    public String getId() { return userId; }
}
```

## Idempotency

Make an operation safe to retry — duplicate requests within the TTL return the stored result instead of re-executing:

```java
@Idempotent(key = "#request.orderId", ttl = "10m")
public Order createOrder(OrderRequest request) { ... }
```

Clients pass an `X-Request-ID` (or the SpEL `key` resolves one); a duplicate throws `DuplicateRequestException` or replays the result depending on configuration.

## Tenant & correlation context

Incoming requests carry `X-Tenant-ID`, `X-Correlation-ID`, and `X-Request-ID` headers; the filters populate `TenantContext` and `CorrelationContext` for the request lifetime, and every log line and event is stamped with them automatically.

## API versioning

```java
@ApiVersion(version = "1", deprecated = true, sunsetDate = "2026-12-31")
@GetMapping("/users")
public List<User> listV1() { ... }
```

Emits `Deprecation` and `Sunset` response headers so clients can plan migrations.

## Configuration

| Property | Purpose |
|---|---|
| `adhar.commons.exception-handler.enabled` | Global exception → `ErrorResponse` mapping |
| `adhar.commons.idempotency.enabled` | Enable the idempotency aspect |
| `adhar.commons.correlation.enabled` | Correlation-ID filter |
| `adhar.commons.tenant.enabled` | Tenant-context filter |
| `adhar.commons.api-versioning.enabled` | API-version interceptor |
