---
title: "Commons"
section: "Modules"
order: 10
path: "/adhar-kit/modules/commons"
---

# Commons

`adhar-kit-commons` is the foundation every other module builds on.

It exists because **every service in a fleet otherwise reinvents the same five things**: a correlation ID, a tenant scope, an error response shape, a retry-safe write, and an API deprecation signal. Each service reinvents them slightly differently, so nothing correlates across service boundaries. Commons fixes those conventions once, and auto-configures the runtime that enforces them.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-commons` |
| Built on | Jakarta Validation, Jackson annotations, SLF4J MDC; Spring Web / AOP / Servlet are `provided` and optional |
| Entry points | `BaseEntity<ID>`, `ApiResponse<T>`, `TenantContext`, `CorrelationContext`, `@Idempotent`, `@ApiVersion` |
| Auto-configuration | `AdharCommonsAutoConfiguration` |
| Use it when | You want consistent request context, error responses, and idempotency across services |

Every Spring dependency is declared `provided` or optional. Every bean is guarded by `@ConditionalOnClass` / `@ConditionalOnMissingBean`. So the module still works as a plain library in a non-web application. You get the base classes and DDD annotations without the servlet plumbing.

## How it works

Commons sits at the edges of a request:

- Two ordered servlet filters fill the thread-local context and the SLF4J MDC before anything else runs.
- An interceptor stamps version headers on the way out.
- An aspect guards write methods.
- A `@RestControllerAdvice` turns any exception that escapes into a stable JSON body.

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

Both filters clear their context and MDC keys in a `finally` block. So a pooled request thread never leaks a tenant into the next request. The clear is unconditional. `TenantContextFilter` removes the tenant on exit even if it never set one. So if something bound a tenant earlier on the same thread, it loses it when the filter unwinds.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-commons</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **DDD annotations** — `@AggregateRoot`, `@ValueObject`, `@DomainEntity`, `@DomainService`. These markers make the layering of a domain model explicit and machine-readable.
- **Base classes** — These give each layer a common shape.
  - `BaseEntity<ID extends Serializable>` supplies the audit fields (`createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `version`) plus `isNew()`, `prePersist(username)`, `preUpdate(username)`.
  - `BaseDTO`, `BaseService`, `BaseController`, `BaseClient`.
  - `BaseRepository<T, ID>` (`save`, `findById`, `findAll`, `deleteById`, `existsById`, `count`).
- **Models** — `ApiResponse<T>` (`success`, `error`, `withRequestId`), `ErrorResponse`, and `PagedResult<T>` (`of`, `empty`, `singlePage`). With these, every endpoint in the fleet returns the same envelope.
- **Exceptions** — `AdharException` and its subclasses carry an HTTP status that the handler uses: `ValidationException` 400, `ResourceNotFoundException` 404, `BusinessException` 422, `ServiceException` 500, `IntegrationException` 502, and `AdharException` its own `getHttpStatus()`.
- **Events** — `CloudEvent<T>`, `BaseCloudEvent`, `AdharCloudEvent`, `KafkaCloudEvent<T>`, `DomainEvent`, and the `CloudEventPublisher` / `EventPublisher` interfaces implement the CloudEvents v1.0 envelope. `@PublishEvent` and `@EventHandler` declare producers and consumers.
- **Runtime** — `SpringGlobalExceptionHandler`, `IdempotencyAspect`, `IdempotencyStore`, `TenantContext`, `CorrelationContext`, `TenantContextFilter`, `CorrelationIdFilter`, `ApiVersionInterceptor`, `ErrorCatalog`.
- **Utilities** — `StringUtils`, `CollectionUtils`, `DateUtils`, `DateTimeUtils`, `ValidationUtils`, and the `@NotNullOrEmpty` constraint.

`BaseEntity` has no JPA annotations of its own. It is a Lombok `@Data` POJO, so it still works outside a persistence context. Nothing calls `prePersist` / `preUpdate` for you. Add `@MappedSuperclass` and a JPA entity listener in your own code, or let [Persistence](/adhar-kit/modules/persistence) do it. `@Data` generates `equals` / `hashCode` over the audit fields. In entities where identity should be the id alone, override them.

## A realistic endpoint

This example shows idempotency, tenant scoping and versioning working together. The duplicate path is handled here instead of being left to the generic 500 handler:

```java
import com.adhar.kit.commons.annotation.ApiVersion;
import com.adhar.kit.commons.annotation.Idempotent;
import com.adhar.kit.commons.context.TenantContext;
import com.adhar.kit.commons.exception.BusinessException;
import com.adhar.kit.commons.idempotency.DuplicateRequestException;
import com.adhar.kit.commons.model.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orders;

    public OrderController(OrderService orders) {
        this.orders = orders;
    }

    @ApiVersion(version = "1", deprecated = true,
                deprecationMessage = "Use /api/v2/orders",
                sunsetDate = "2026-12-31")
    @PostMapping
    public ApiResponse<Order> create(@RequestBody OrderRequest request) {
        return ApiResponse.success(orders.createOrder(request));
    }

    // 409 instead of a 500 when a retry arrives while the first call is still running
    @ExceptionHandler(DuplicateRequestException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> onDuplicate(DuplicateRequestException ex) {
        return ApiResponse.error("DUPLICATE_REQUEST", "Request already in progress");
    }
}

@Service
public class OrderService {

    private final OrderRepository repository;

    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }

    // ttl is in SECONDS; 600 = 10 minutes
    @Idempotent(key = "#request.orderId", ttl = 600)
    public Order createOrder(OrderRequest request) {
        String tenant = TenantContext.getTenantId();
        if (tenant == null) {
            throw new BusinessException("X-Tenant-ID header is required");
        }
        return repository.save(Order.from(request, tenant));
    }
}
```

`ApiResponse.error(code, message)` returns `ApiResponse<Void>`. The generic `success` / `error` factories are the only envelope shapes the fleet should emit.

## How it behaves

**Thread-safety and scope.** `TenantContext` and `CorrelationContext` are final utility classes over `ThreadLocal`. There is no instance to share and no synchronisation. `IdempotencyAspect`, `InMemoryIdempotencyStore`, `ApiVersionInterceptor` and both filters are singletons that every request thread shares. All their mutable state lives in a `ConcurrentHashMap` or on the calling thread. `ErrorCatalog` and `SpringGlobalExceptionHandler` are stateless singletons.

**Context lifetime.** Thread-locals end at the thread boundary. `CorrelationContext.runWith(id, runnable)` and `callWith(id, supplier)`, and the `TenantContext` equivalents, do three things: save the previous value, bind the new one, and restore it in a `finally`. Use them for messaging listeners, scheduled jobs, and anything that is not an HTTP request. If you set a context by hand without a matching `clear()`, it leaks into the next task on a pooled thread.

**Idempotency semantics.** `IdempotencyStore.begin(key, ttl)` must be atomic. `InMemoryIdempotencyStore` implements it with a single `ConcurrentHashMap.compute`, so two concurrent callers cannot both acquire.

| Call | Outcome |
|---|---|
| First call | Key claimed, method runs, result stored for `ttl` seconds |
| Duplicate after success, within TTL | Stored result replayed; the method does **not** run again |
| Duplicate while the original is in flight | `DuplicateRequestException` (fail-fast — the aspect never blocks) |
| Original failed | `abort(key)` removes the key so the operation can be retried |

The in-progress marker carries the same TTL as the result. Two consequences follow:

- If the guarded method runs *longer* than `ttl`, the marker expires. A duplicate then acquires the key and runs again. Set `ttl` well above your worst-case method duration.
- If the JVM dies mid-call, the marker is gone with the heap. So the operation can be retried on restart.

**Resource bounds.** `InMemoryIdempotencyStore` holds the *result object itself* for the TTL. Expired entries are replaced only lazily, when the same key is seen again. Nothing schedules cleanup: `purgeExpired()` exists, but the auto-configuration never calls it. So a fast-changing key space with large results grows the heap. To stop it, schedule `purgeExpired()` yourself or register a distributed store.

**Failure behaviour.** The generic `@ExceptionHandler(Exception.class)` logs at ERROR and returns 500 with a fixed message. The original exception text is never written into the response body. Validation failures (`MethodArgumentNotValidException`, `ConstraintViolationException`) become 400 with an error map keyed by field. Every response body gets the request path and the request id from `CorrelationContext`, falling back to the `X-Request-ID` header.

**Startup and gating.**

- The filters register only in a servlet web application (`@ConditionalOnWebApplication`).
- The interceptor also needs `WebMvcConfigurer`.
- The idempotency beans need `ProceedingJoinPoint`.

On a plain-library classpath none of them exist, and `TenantContext` / `ApiResponse` still work.

## Aspect mechanics

`IdempotencyAspect` is a Spring AOP `@Around` advice on `@annotation(idempotent)`. The nested `IdempotencyConfiguration` carries `@EnableAspectJAutoProxy` itself, so you do not add it to your application class. But the usual proxy rule applies in full:

> **Self-invocation bypasses the proxy.** Calling `this.createOrder(request)` from another method of `OrderService` goes straight to the target object. The aspect never runs, no key is claimed, and duplicates execute — silently, with no warning anywhere. Call the method through an injected reference to the bean, or move it to a separate bean.

The same happens when `aspectjweaver` is absent. The configuration is skipped, `@Idempotent` does nothing, and nothing logs a complaint.

The `key` is resolved in one of three ways:

- As SpEL, when it contains `#` (named parameters plus `#p0`/`#a0` indexes).
- As an index substitution, when it contains `{0}`-style placeholders.
- Literally, otherwise.

It is then namespaced as `storage::declaringClass.method::resolvedKey`, so identical key values on different methods never collide. The default store is `InMemoryIdempotencyStore`. To make replay work across replicas, register your own `IdempotencyStore` bean (Redis-backed, for example).

`@ApiVersion` is not an aspect. It is an MVC `HandlerInterceptor`, so self-invocation does not matter. It looks for the annotation on the handler method first, then falls back to the controller class. It:

- always sets `X-API-Version`;
- adds `Deprecation: true` plus `X-API-Deprecation-Message` when deprecated;
- emits an RFC 8594 `Sunset` header. An ISO date is converted to RFC 1123; a value it cannot parse is passed through as-is.

With `validate-request-version` on, it rejects a request with 400 only when the client *sent* an `X-API-Version` that differs. A request with no version header always passes.

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

If the application defines its own `MessageSource`, it is attached as the parent of the bundled `adhar-errors` catalog. So you can add messages for custom error codes without replacing the catalog.

## Testing

- **Idempotency with a predictable TTL.** `InMemoryIdempotencyStore` has a second constructor that takes a `java.time.Clock`. Build it with `Clock.fixed(...)` (or your own mutable test clock). Then assert that a second `begin` returns `COMPLETED` before expiry and `ACQUIRED` after, with no sleeping.
- **Disable the side effects.** In a slice test that should not go through the aspect, set `adhar.commons.idempotency.enabled=false`. For context-free unit tests of a controller, set `adhar.commons.correlation.enabled=false` and `adhar.commons.tenant.enabled=false` to keep the filter chain out of the way.
- **Context in unit tests.** Prefer `TenantContext.callWith("acme", () -> service.createOrder(req))` over bare `setTenantId`. That way a failing assertion cannot leak the tenant into the next test on the same JUnit thread. If you do use the setters, clear them in `@AfterEach`.
- **Aspect coverage.** `@Idempotent` fires only on a proxied bean. Test it from a `@SpringBootTest` that injects the bean, never from a hand-built `new OrderService(...)`.
- **Error contract.** Assert against `ErrorResponse` fields (`code`, `message`, `path`, `requestId`, `fieldErrors`), not the raw JSON string. The envelope is the contract; the serialization is not.

[`adhar-kit-test-commons`](/adhar-kit/modules/overview) provides Testcontainers bases and `CustomAssertions`, but no commons-specific stubs. The hooks above are the intended seams.

## Interaction with sibling modules

`CorrelationIdFilter` and `TenantContextFilter` write `correlationId`, `requestId` and `tenantId` into the SLF4J MDC. That is exactly where [Logging](/adhar-kit/modules/logging) reads its `AppLogEvent` enrichment fields from. [Tracing](/adhar-kit/modules/tracing) adds `traceId` / `spanId` alongside them.

[Core](/adhar-kit/modules/core)'s `ContextPropagatingExecutor` carries the **MDC map** across a thread hop, which keeps those log fields correct. But it does not restore the `TenantContext` thread-local, because the MDC and the thread-local are separate stores. To carry the tenant itself, register a `ContextSnapshot` for it on `ContextSnapshotRegistry`.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `@Idempotent` never fires | The method is called from inside the same bean, so the proxy is bypassed | Call it through an injected reference to the bean, or move the method to a separate bean |
| Duplicate requests re-execute across pods | The default store is per-JVM | Register a shared `IdempotencyStore` bean |
| A slow method is executed twice despite `@Idempotent` | The in-progress marker expired before the method returned | Raise `ttl` above the worst-case duration |
| `ttl` behaves as far shorter than expected | `ttl` is a `long` in **seconds**, not a duration string | Use `ttl = 600`, not `"10m"` |
| Heap grows in a long-running service | Idempotency records are purged only lazily | Schedule `purgeExpired()`, or use a store with native TTL |
| `TenantContext.getTenantId()` returns null after a thread hop | `ContextPropagatingExecutor` restores the MDC, not this thread-local | Pass the tenant explicitly, or register a `ContextSnapshot` for it |
| Log lines have no `correlationId` | The MDC is populated by the filter only, so non-request threads have none | Wrap the work with `CorrelationContext.runWith(id, …)` |

## See also

- [Core](/adhar-kit/modules/core) — patterns, retry, and the context-propagating executor that carries this MDC across threads
- [Logging](/adhar-kit/modules/logging) — consumes the MDC keys these filters set
- [Persistence](/adhar-kit/modules/persistence) — multi-tenancy and auditing built on `TenantContext` and `BaseEntity`
- [Messaging](/adhar-kit/modules/messaging) — transports the CloudEvents envelope defined here
