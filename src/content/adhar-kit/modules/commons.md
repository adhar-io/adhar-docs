---
title: "Commons"
section: "Modules"
order: 10
path: "/adhar-kit/modules/commons"
---

# Commons

`adhar-kit-commons` is the base every other module builds on. It fixes the conventions that otherwise drift between services — correlation and tenant context, the error body, retry-safe writes and API versioning — and, on Spring MVC, auto-configures the filters, handlers and aspect that enforce them. Use it directly when you want those conventions without the rest of the kit; you also get it transitively from almost every other module.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-commons` (package `com.adhar.kit.commons`) |
| Module toggle | None. Commons has no `adhar.kit.modules.*` id and no facade accessor; each feature has its own `adhar.commons.*.enabled` switch |
| Entry points | `TenantContext`, `CorrelationContext`, `@Idempotent`, `ApiResponse<T>`, `ErrorResponse`, `AdharException` and subclasses, `BaseEntity<ID>` |
| Dependencies | Required: `jakarta.validation-api`, `slf4j-api`, `commons-lang3`. Everything Spring (`spring-web`, `spring-webmvc`, `spring-aop`, `aspectjweaver`, `spring-expression`, servlet API) and Jackson annotations are `provided` |
| Frameworks | Auto-configuration (`AdharCommonsAutoConfiguration`) is Spring Boot, servlet MVC only. Context classes, models, exceptions, base classes and `FrameworkDetector` are plain Java and work anywhere |

## How it works

On a Spring MVC request, commons runs at both edges: filters fill the context on the way in, and a handler plus a response advice shape the error on the way out.

```diagram
nkb-commons-request
```

| Order | Component | What it does |
|---|---|---|
| `HIGHEST_PRECEDENCE + 10` | `CorrelationIdFilter` | Reads `X-Correlation-ID` and `X-Request-ID` (generates a UUID for each one missing), stores them in `CorrelationContext` and the MDC (`correlationId`, `requestId`), and echoes both on the response |
| `HIGHEST_PRECEDENCE + 20` | `TenantContextFilter` | Reads `X-Tenant-ID` into `TenantContext` and the MDC (`tenantId`) |
| `HIGHEST_PRECEDENCE + 30` | `ApiVersionHeaderFilter` | On `/api/v<major>` paths, sets `API-Version` to the full version and rejects a request whose `API-Version` header names another major |
| — | `IdempotencyAspect` | Around-advice for `@Idempotent` methods |
| — | `SpringGlobalExceptionHandler` | `@RestControllerAdvice` that turns exceptions into `ErrorResponse` |
| — | `ProblemDetailsResponseAdvice` | Rewrites an `ErrorResponse` with status ≥ 400 as RFC 9457 `application/problem+json` on `/api/v<major>` paths |

Both context filters clear their thread-local and MDC keys in a `finally` block, so a pooled thread never carries a tenant into the next request. The clear is unconditional: a tenant bound earlier on the same thread is gone once the filter unwinds.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-commons</artifactId>
    <version>0.1.0</version>
</dependency>
```

The web, AOP and servlet dependencies are `provided`, so the runtime features appear only when your application already has Spring MVC (for example `spring-boot-starter-webmvc`) and, for `@Idempotent`, `aspectjweaver`.

## Use it

### Versioned endpoint with an idempotent write

```java
import com.adhar.kit.commons.annotation.Idempotent;
import com.adhar.kit.commons.context.TenantContext;
import com.adhar.kit.commons.exception.BusinessException;
import com.adhar.kit.commons.model.ApiResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")          // major 1; API-Version comes from api/v1/openapi.yaml
public class OrderController {

    private final OrderService orders;

    public OrderController(OrderService orders) {
        this.orders = orders;
    }

    @PostMapping
    public ApiResponse<Order> create(@RequestBody OrderRequest request) {
        return ApiResponse.success(orders.createOrder(request));
    }
}

@Service
public class OrderService {

    private final OrderRepository repository;

    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }

    @Idempotent(key = "#request.orderId", ttl = 600)   // ttl in seconds
    public Order createOrder(OrderRequest request) {
        String tenant = TenantContext.getTenantId();
        if (tenant == null) {
            throw new BusinessException("TENANT_REQUIRED", "X-Tenant-ID header is required");
        }
        return repository.save(Order.from(request, tenant));
    }
}
```

A retry that arrives while the first call is still running throws `DuplicateRequestException`, which the global handler maps to **409**. You do not need your own handler for it.

### Error responses

Throw a kit exception and the handler picks the status from `getHttpStatus()`:

| Exception | Status | Logged |
|---|---|---|
| `ValidationException` | 400 | — |
| `ResourceNotFoundException` | 404 | — |
| `DuplicateRequestException` | 409 | — |
| `BusinessException` | 422 | — |
| `ServiceException` | 500 | ERROR |
| `IntegrationException` | 502 | ERROR |
| `AdharException` (other) | its `getHttpStatus()`, default 500 | — |
| Bean validation (`MethodArgumentNotValidException`, `ConstraintViolationException`, `HandlerMethodValidationException`) | 400, `fieldErrors` by field | — |
| Spring MVC exceptions (404 no handler, 405, 415, unreadable body, invalid API version, …) | the status Spring assigns | ERROR if 5xx |
| Anything else | 500, fixed message | ERROR |

The body is `ErrorResponse` (`code`, `message`, `details`, `fieldErrors`, `validationErrors`, `requestId`, `path`, `timestamp`). The handler adds the request path and the request id from `CorrelationContext` (falling back to the `X-Request-ID` header). Messages are localized through `ErrorCatalog`, which reads the bundled `adhar-errors` bundle (English and French; code `XYZ` resolves key `adhar.error.XYZ`). If your application has its own `MessageSource`, it becomes the bundle's parent, so you can add codes without replacing the catalog.

### Context off the request thread

`TenantContext` and `CorrelationContext` are `ThreadLocal`-backed static classes. For listeners, jobs and other non-HTTP work, bind and restore in one call:

```java
Order order = TenantContext.callWith("acme", () -> orderService.createOrder(request));
CorrelationContext.runWith(messageId, () -> handler.process(message));
```

Both save the previous value, bind the new one, and restore it in a `finally`.

### API versioning

A service serves each major version under `/api/v<major>`, resolved by Spring's built-in API versioning (path segment 1). The full version reported in `API-Version` comes from `info.version` of the `api/v<major>/openapi.yaml` shipped on the classpath, or from configuration, or `<major>.0.0` if the major is only mapped. Announce a deprecation per major:

```yaml
adhar:
  commons:
    api-versioning:
      versions:
        v1:
          deprecated: 2026-09-01      # ISO date/date-time, epoch seconds, or true
          sunset: 2027-01-31
          successor: /api/v2          # defaults to the next major served
```

Requests under a deprecated `/api/v1` then get RFC 9745 `Deprecation`, RFC 8594 `Sunset` and `Link: </api/v2>; rel="successor-version"`. Two discovery routes are added: `GET /api` lists every major (`major`, `version`, `status`, `sunset`, `spec`) and `GET /api/v<major>/openapi.yaml` serves the shipped spec with an ETag.

`@ApiVersion` and `ApiVersionInterceptor` are deprecated. They still work on single endpoints: under `/api/v<major>` a `deprecated` endpoint gets the same standard headers; elsewhere the legacy behaviour applies (`X-API-Version`, `Deprecation: true`, `X-API-Deprecation-Message`, `Sunset`).

### Other building blocks

| Kind | Types |
|---|---|
| Envelopes | `ApiResponse<T>` (`success`, `error`, `withRequestId`), `PagedResult<T>` (`of`, `empty`, `singlePage`) |
| Base classes | `BaseEntity<ID>` (audit fields, `isNew`, `prePersist`, `preUpdate`), `BaseDTO`, `BaseRepository<T, ID>`, `BaseService<T, ID>`, `BaseController`, `BaseClient` |
| DDD markers | `@AggregateRoot`, `@ValueObject`, `@DomainEntity`, `@DomainService` |
| Events | `CloudEvent<T>`, `BaseCloudEvent`, `AdharCloudEvent<T>`, `KafkaCloudEvent<T>`, `DomainEvent`, the `CloudEventPublisher` interface; `@PublishEvent`, `@EventHandler`, `@EventPublisher` annotations |
| Validation | `@NotNullOrEmpty`, `ValidationUtils` |
| Utilities | `StringUtils`, `CollectionUtils`, `DateUtils`, `DateTimeUtils`, `CommonConstants` (header names) |
| Runtime detection | `FrameworkDetector`, `Framework`, `AdapterFactory` |

`BaseEntity` is a Lombok `@Data` POJO with no JPA annotations, and nothing calls `prePersist`/`preUpdate` for you; add `@MappedSuperclass` and a listener yourself or use [Persistence](/adhar-kit/modules/persistence). `@Data` puts the audit fields into `equals`/`hashCode`; override them where identity is the id alone.

## Configuration

All keys bind to `AdharCommonsProperties` (`adhar.commons`).

| Property | Type | Default | Description |
|---|---|---|---|
| `adhar.commons.exception-handler.enabled` | boolean | `true` | Register `SpringGlobalExceptionHandler` and `ProblemDetailsResponseAdvice` |
| `adhar.commons.exception-handler.problem-details` | `versioned-api` \| `always` \| `never` | `versioned-api` | Which error responses become `application/problem+json` |
| `adhar.commons.error-catalog.enabled` | boolean | `true` | Register the localized `ErrorCatalog` |
| `adhar.commons.idempotency.enabled` | boolean | `true` | Register the idempotency store and aspect |
| `adhar.commons.correlation.enabled` | boolean | `true` | Register `CorrelationIdFilter` |
| `adhar.commons.tenant.enabled` | boolean | `true` | Register `TenantContextFilter` |
| `adhar.commons.api-versioning.enabled` | boolean | `true` | Configure path-major versioning, its headers and endpoints |
| `adhar.commons.api-versioning.reject-mismatched-major` | boolean | `true` | Reject with a 400 problem a request whose `API-Version` names another major than its path |
| `adhar.commons.api-versioning.spec-locations` | list | `classpath*:api/v*/openapi.yaml` | Where the shipped OpenAPI specs are found |
| `adhar.commons.api-versioning.endpoints.enabled` | boolean | `true` | Serve `GET /api` and `GET /api/v<major>/openapi.yaml` |
| `adhar.commons.api-versioning.versions.v<N>.version` | string | spec `info.version` | Full version reported for major N |
| `adhar.commons.api-versioning.versions.v<N>.deprecated` | string | — | Deprecation date, epoch seconds, or `true` |
| `adhar.commons.api-versioning.versions.v<N>.sunset` | string | — | Sunset date; must not precede `deprecated` |
| `adhar.commons.api-versioning.versions.v<N>.successor` | string | next major served | Successor URL for the `Link` header |
| `adhar.commons.api-versioning.versions.v<N>.deprecation-link` / `sunset-link` | URI | — | Documentation links (`rel="deprecation"` / `rel="sunset"`) |
| `adhar.commons.api-versioning.validate-request-version` | boolean | `false` | Legacy: let `ApiVersionInterceptor` reject a mismatching `X-API-Version` outside `/api/v<major>` |

Conditions worth knowing:

- The exception handler needs `DispatcherServlet` and the servlet API; the filters need a web application and `jakarta.servlet.Filter`; versioning needs a servlet app with Spring's `ApiVersionDeprecationHandler` on the classpath; the idempotency beans need AspectJ (`ProceedingJoinPoint`).
- Every bean is `@ConditionalOnMissingBean`, so your own bean of the same type replaces it.
- Unless you set `spring.mvc.apiversion.required` yourself, the kit marks the version as not required, so paths outside `/api/v<major>` are not rejected for a missing version.
- An invalid `versions.*` entry (bad key, sunset before deprecation) fails startup.

## Operations

**Logs.** The MDC keys `correlationId`, `requestId` and `tenantId` are what [Logging](/adhar-kit/modules/logging) reads for enrichment. Unhandled exceptions, `ServiceException` and `IntegrationException` log at ERROR with the stack trace; the original exception text never reaches the response body of the catch-all 500.

**Idempotency outcomes:**

| Call | Outcome |
|---|---|
| First call | Key claimed, method runs, result stored for `ttl` seconds |
| Duplicate after success, within TTL | Stored result returned; the method does not run |
| Duplicate while the first is in flight | `DuplicateRequestException` → 409; the aspect never blocks |
| First call threw | Key released (`abort`), so the operation can be retried |

The key is resolved as SpEL when it contains `#` (parameter names, `#p0`, `#a0`), as `{0}`-style index substitution, or literally, then namespaced as `<storage>::<class>.<method>::<key>`.

## Limits

- **Self-invocation bypasses `@Idempotent`.** It is Spring AOP advice; `this.createOrder(...)` runs the raw method with no key claimed and no warning. The same happens silently when AspectJ is absent.
- **The default store is per JVM.** `InMemoryIdempotencyStore` does not share keys across replicas. Register your own `IdempotencyStore` bean (it must make `begin` atomic) for replay across pods.
- **The in-progress marker expires with the TTL.** A method that runs longer than `ttl` can be executed twice. Set `ttl` above the worst-case duration.
- **The in-memory store is never swept.** It holds result objects and replaces expired entries only when the same key reappears. Call `purgeExpired()` on a schedule or use a store with native TTL.
- **Thread-locals do not cross threads.** [Core](/adhar-kit/modules/core)'s `ContextPropagatingExecutor` carries the MDC, not `TenantContext`; register a `ContextSnapshot` for the tenant if you need the value itself.
- **The event annotations are markers.** Nothing in the kit processes `@PublishEvent`, `@EventHandler` or `@EventPublisher`; they document intent.
- **Servlet only.** There is no WebFlux equivalent of the filters, handler or versioning.
- Reading `info.version` from a shipped spec needs SnakeYAML on the classpath (Spring Boot includes it); without it the version falls back to `<major>.0.0`.

## Next steps

- [Core](/adhar-kit/modules/core) — retry, async and the context-propagating executor
- [Logging](/adhar-kit/modules/logging) — consumes the MDC keys these filters set
- [Persistence](/adhar-kit/modules/persistence) — auditing and multi-tenancy on `BaseEntity` and `TenantContext`
- [Concepts](/adhar-kit/concepts) — how modules, facades and toggles fit together
