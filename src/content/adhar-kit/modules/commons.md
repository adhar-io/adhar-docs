---
title: "Commons"
section: "Modules"
order: 10
path: "/adhar-kit/modules/commons"
---

# Commons

`adhar-kit-commons` is the foundation every other module builds on. It exists because **every service in a fleet otherwise reinvents the same five things** — a correlation ID, a tenant scope, an error response shape, a retry-safe write, and an API deprecation signal — and reinvents them slightly differently, so nothing correlates across service boundaries. Commons fixes those conventions once, and auto-configures the runtime that enforces them.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-commons` |
| Built on | Jakarta Validation, Jackson annotations, SLF4J MDC; Spring Web / AOP / Servlet are `provided` and optional |
| Entry points | `BaseEntity<ID>`, `ApiResponse<T>`, `TenantContext`, `CorrelationContext`, `@Idempotent`, `@ApiVersion` |
| Auto-configuration | `AdharCommonsAutoConfiguration` |
| Use it when | You want consistent request context, error responses, and idempotency across services |

Every Spring dependency is declared `provided` or optional, and every bean is guarded by `@ConditionalOnClass` / `@ConditionalOnMissingBean`. The module therefore stays usable as a plain library in a non-web application — you get the base classes and DDD annotations without the servlet plumbing.

## How it works

Commons occupies the edges of a request. Two ordered servlet filters populate thread-local context and the SLF4J MDC before anything else runs; an interceptor stamps version headers on the way out; an aspect guards write methods; and a `@RestControllerAdvice` converts any escaping exception into a stable JSON body.

```text
  HTTP request
      |
      v
  CorrelationIdFilter      order = HIGHEST_PRECEDENCE + 10
    reads X-Correlation-ID / X-Request-ID (generates UUIDs if absent)
    -> CorrelationContext + MDC{correlationId, requestId}
      |
      v
  TenantContextFilter      order = CorrelationIdFilter.ORDER + 10
    reads X-Tenant-ID -> TenantContext + MDC{tenantId}
      |
      v
  ApiVersionInterceptor -> controller method
      |
      v
  IdempotencyAspect  (@Idempotent)  ->  service method
      |
      v
  SpringGlobalExceptionHandler  -> ErrorResponse (localized via ErrorCatalog)
      |
      v
  HTTP response  (X-Correlation-ID, X-Request-ID, X-API-Version echoed back)
```

Both filters clear their context and MDC keys in a `finally` block, so a pooled request thread never leaks a tenant into the next request.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-commons</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **DDD annotations** — `@AggregateRoot`, `@ValueObject`, `@DomainEntity`, `@DomainService`. Markers that make the layering of a domain model explicit and machine-readable.
- **Base classes** — `BaseEntity<ID extends Serializable>` supplies the audit columns (`createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `version`) plus `isNew()`, `prePersist(username)`, `preUpdate(username)`; `BaseDTO`, `BaseService`, `BaseController`, `BaseClient`, and `BaseRepository<T, ID>` (`save`, `findById`, `findAll`, `deleteById`, `existsById`, `count`) give each layer a common shape.
- **Models** — `ApiResponse<T>` (`success`, `error`, `withRequestId`), `ErrorResponse`, and `PagedResult<T>` (`of`, `empty`, `singlePage`) so every endpoint in the fleet returns the same envelope.
- **Exceptions** — `AdharException` and its subclasses carry an HTTP status the handler honours: `ValidationException` 400, `ResourceNotFoundException` 404, `BusinessException` 422, `IntegrationException` 502, `AdharException` 500.
- **Events** — `CloudEvent<T>`, `BaseCloudEvent`, `AdharCloudEvent`, `KafkaCloudEvent<T>`, `DomainEvent`, and the `CloudEventPublisher` / `EventPublisher` interfaces implement the CloudEvents v1.0 envelope. `@PublishEvent` and `@EventHandler` declare producers and consumers.
- **Runtime** — `SpringGlobalExceptionHandler`, `IdempotencyAspect`, `IdempotencyStore`, `TenantContext`, `CorrelationContext`, `TenantContextFilter`, `CorrelationIdFilter`, `ApiVersionInterceptor`, `ErrorCatalog`.
- **Utilities** — `StringUtils`, `CollectionUtils`, `DateUtils`, `DateTimeUtils`, `ValidationUtils`, and the `@NotNullOrEmpty` constraint.

## A minimal entity

Extend `BaseEntity<ID>` to inherit the audit fields and lifecycle conventions:

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

## A realistic endpoint

Idempotency, tenant scoping, and versioning working together:

```java
import com.adhar.kit.commons.annotation.ApiVersion;
import com.adhar.kit.commons.annotation.Idempotent;
import com.adhar.kit.commons.context.TenantContext;
import com.adhar.kit.commons.model.ApiResponse;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orders;

    @ApiVersion(version = "1", deprecated = true,
                deprecationMessage = "Use /api/v2/orders",
                sunsetDate = "2026-12-31")
    @PostMapping
    public ApiResponse<Order> create(@RequestBody OrderRequest request) {
        return ApiResponse.success(orders.createOrder(request));
    }
}

@Service
public class OrderService {

    // ttl is in SECONDS; 600 = 10 minutes
    @Idempotent(key = "#request.orderId", ttl = 600)
    public Order createOrder(OrderRequest request) {
        String tenant = TenantContext.getTenantId();
        return repository.save(Order.from(request, tenant));
    }
}
```

## How the idempotency aspect behaves

`IdempotencyAspect` is registered by the auto-configuration whenever `org.aspectj.lang.ProceedingJoinPoint` is on the classpath; it applies `@EnableAspectJAutoProxy` itself, so no extra annotation is needed on your application class. The `key` is resolved as SpEL when it contains `#`, as an index substitution when it contains `{0}`-style placeholders, and literally otherwise, then namespaced as `storage::declaringClass.method::resolvedKey` — identical key values on different methods never collide.

| Call | Outcome |
|---|---|
| First call | Key claimed, method runs, result stored for `ttl` seconds |
| Duplicate after success, within TTL | Stored result replayed; the method does **not** run again |
| Duplicate while the original is in flight | `DuplicateRequestException` (fail-fast — the aspect never blocks) |
| Original failed | Key released so the operation can be retried |

The default store is `InMemoryIdempotencyStore`. Register your own `IdempotencyStore` bean (Redis-backed, say) to make replay work across replicas.

`@ApiVersion` works through `ApiVersionInterceptor`, which always sets `X-API-Version`, adds `Deprecation: true` plus `X-API-Deprecation-Message` when the version is deprecated, and emits an RFC 8594 `Sunset` header when `sunsetDate` is set.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.commons.exception-handler.enabled` | Register `SpringGlobalExceptionHandler` | `true` |
| `adhar.commons.error-catalog.enabled` | Register the localized `ErrorCatalog` | `true` |
| `adhar.commons.idempotency.enabled` | Register the idempotency store and aspect | `true` |
| `adhar.commons.correlation.enabled` | Register `CorrelationIdFilter` | `true` |
| `adhar.commons.tenant.enabled` | Register `TenantContextFilter` | `true` |
| `adhar.commons.api-versioning.enabled` | Register `ApiVersionInterceptor` | `true` |
| `adhar.commons.api-versioning.validate-request-version` | Reject a mismatching `X-API-Version` request header with 400 | `false` |

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `@Idempotent` never fires | The method is called from inside the same bean, so the proxy is bypassed | Call it through an injected reference to the bean, or move the method to a separate bean |
| Duplicate requests re-execute across pods | The default store is per-JVM | Register a shared `IdempotencyStore` bean |
| `ttl` behaves as far shorter than expected | `ttl` is a `long` in **seconds**, not a duration string | Use `ttl = 600`, not `"10m"` |
| `TenantContext.getTenantId()` returns null in an `@Async` method | Thread-locals do not cross thread boundaries | Use `ContextPropagatingExecutor` from [Core](/adhar-kit/modules/core) |
| Log lines have no `correlationId` | The MDC is populated by the filter only, so non-request threads have none | Wrap the work with `CorrelationContext.runWith(id, …)` |

## See also

- [Core](/adhar-kit/modules/core) — patterns, retry, and the context-propagating executor that carries this MDC across threads
- [Logging](/adhar-kit/modules/logging) — consumes the MDC keys these filters set
- [Persistence](/adhar-kit/modules/persistence) — multi-tenancy and auditing built on `TenantContext` and `BaseEntity`
- [Messaging](/adhar-kit/modules/messaging) — transports the CloudEvents envelope defined here
