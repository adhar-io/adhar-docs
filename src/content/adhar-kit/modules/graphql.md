---
title: "GraphQL"
section: "Modules"
order: 22
path: "/adhar-kit/modules/graphql"
---

# GraphQL

`adhar-kit-graphql` hardens a Spring for GraphQL endpoint. It rejects over-deep and over-complex queries before any resolver runs, adds optional per-client cost rate limiting, a query allow-list and Apollo persisted queries, enforces an `@auth` field directive, maps exceptions to safe GraphQL errors, and feeds your batch loaders into the per-request `DataLoaderRegistry`. Use it when you expose GraphQL to clients you do not control.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-graphql` |
| Module toggle | `adhar.kit.modules.graphql` (default `false`) gates `adhar.getGraphQl()` |
| Module switch | `adhar.graphql.enabled` (default `true`) gates `GraphQlAutoConfiguration` |
| Entry points | `DataLoaderRegistrar`, `GraphQlSchemaRegistry`, `PaginationUtils`, `InputValidator` (beans and helpers); `GraphQlFacade` |
| Dependencies | Required: `adhar-kit-commons`. Optional, and you add them: `spring-boot-starter-graphql` (the auto-configuration needs `graphql.GraphQL` and `RuntimeWiringConfigurer`), `spring-boot-starter-security` (introspection gate, `@auth`), `spring-boot-starter-validation` (`InputValidator`), `micrometer-core` (resolver timer) |
| Frameworks | Spring Boot (Spring for GraphQL) for everything that runs on a request. `PaginationUtils`, `QueryCostEstimator` and `GraphQlSchemaRegistry` have no Spring dependency |

## How it works

Every guard is a Spring for GraphQL `WebGraphQlInterceptor` or a graphql-java `Instrumentation` bean. Spring Boot picks them up automatically. Interceptors run before execution, the depth and complexity limits run after validation but before any data fetcher, and `@auth` is checked as each protected field is fetched.

```diagram
nkb-graphql-request-path
```

| Stage | Component | Present when | On rejection |
| --- | --- | --- | --- |
| Interceptor | `PersistedQueryInterceptor` | `persisted-queries.enabled=true` | `PersistedQueryNotFound` error for an unknown hash; hash mismatch error |
| Interceptor | `AllowedQueryInterceptor` | `allow-list.enabled=true` | `QueryNotAllowed` error (`code: QUERY_NOT_ALLOWED`) |
| Interceptor | `QueryCostRateLimitInterceptor` | `rate-limit.enabled=true` | `RateLimited` error (`code: RATE_LIMITED`, with `cost`) |
| Interceptor | `GraphQlSecurityInterceptor` | Spring Security on the classpath | Fails the request with `SecurityException` (introspection off, or anonymous with `require-authentication`) |
| Pre-execution | `QueryComplexityInstrumentation` (graphql-java `MaxQueryDepthInstrumentation` + `MaxQueryComplexityInstrumentation`) | Always | `AbortExecutionException`; no resolver runs |
| Field fetch | `FieldAuthorizationInstrumentation` | Spring Security on the classpath and `security.field-authorization-enabled=true` | That field is `null` with an `UNAUTHORIZED` error; siblings still resolve |
| Field fetch | `ResolverTracingInstrumentation` | `tracing.enabled=true` and a `MeterRegistry` | — |

The module declares no order between its interceptors. A rejected query still returns HTTP 200 with an `errors` array, so clients must branch on `errors`, not on the status code.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-graphql</artifactId>
    <version>0.1.0</version>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-graphql</artifactId>
</dependency>
```

Add `spring-boot-starter-security` if you use `@auth` or the introspection gate.

## Use it

### Batch loading

Register loaders on the injected `DataLoaderRegistrar` bean. Spring for GraphQL calls `registerDataLoaders` once per request, so each request gets fresh `DataLoader`s (batching window and cache live for one request). The `BatchLoaderFunction` itself is a shared singleton and must be thread-safe.

```java
import com.adhar.kit.graphql.dataloader.DataLoaderRegistrar;
import graphql.schema.DataFetchingEnvironment;
import jakarta.annotation.PostConstruct;
import org.dataloader.DataLoader;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.stream.Collectors;

@Controller
public class ProductGraphQlController {
    private final DataLoaderRegistrar registrar;
    private final SupplierRepository suppliers;

    public ProductGraphQlController(DataLoaderRegistrar registrar, SupplierRepository suppliers) {
        this.registrar = registrar;
        this.suppliers = suppliers;
    }

    @PostConstruct
    void registerLoaders() {
        registrar.registerBatchLoader("supplierById", (List<Long> ids) -> {
            Map<Long, Supplier> found = suppliers.findAllById(ids).stream()
                    .collect(Collectors.toMap(Supplier::getId, Function.identity()));
            // Same size and order as ids, null for misses.
            return CompletableFuture.completedFuture(ids.stream().map(found::get).toList());
        });
    }

    @SchemaMapping(typeName = "Product", field = "supplier")
    public CompletableFuture<Supplier> supplier(Product product, DataFetchingEnvironment env) {
        DataLoader<Long, Supplier> loader = env.getDataLoader("supplierById");
        return loader.load(product.getSupplierId());
    }
}
```

Return the future; calling `.join()` in the resolver brings back N+1. `CompositeBatchLoaderRegistry` is the `BatchLoaderRegistry` bean, so `@BatchMapping` and `forName(...)` registrations land in the same per-request registry.

### Field-level authorization

Declare the directive in your schema and mark protected fields:

```text
directive @auth(roles: [String!]) on FIELD_DEFINITION

type Product {
  id: ID!
  name: String!
  costPrice: Float! @auth(roles: ["PRICING_ADMIN"])
}
```

- Roles match with or without the `ROLE_` prefix on either side.
- An empty role list requires only an authenticated caller.
- The check reads `SecurityContextHolder` on the thread that runs the fetcher. Work you hand to your own executor loses the context.

### Pagination and validation

```java
PaginationUtils.Connection<Product> page = PaginationUtils.fromList(products, 20, afterCursor);
InputValidator.ValidationResult result = inputValidator.validate(createProductInput);  // Jakarta Validation
if (!result.isValid()) { /* result.errors(): field + message */ }
```

Cursors are Base64-encoded offsets, stable only while the list order is stable. `fromList` throws `IllegalArgumentException` for a negative `first` and does not cap it; enforce a page-size ceiling yourself.

### Errors

`GraphQlExceptionResolver` maps exceptions thrown by data fetchers (after unwrapping `CompletionException`):

| Exception | Error type | Message |
| --- | --- | --- |
| `IllegalArgumentException` | `BAD_REQUEST` | The exception message |
| `SecurityException` | `UNAUTHORIZED` | `Access denied` |
| `UnsupportedOperationException` | `FORBIDDEN` | `Operation not permitted` |
| Simple class name containing `NotFoundException`, `EntityNotFoundException` or `NoSuchElement` | `NOT_FOUND` | The exception message |
| Anything else | `INTERNAL_ERROR` | `An internal error occurred` (logged at ERROR) |

### The facade

`GraphQlFacade.getInstance()` builds its own `GraphQlSchemaRegistry`, `DataLoaderRegistrar`, `InputValidator` and default `GraphQlProperties`; they are not the Spring beans. A loader registered through `adhar.getGraphQl().registerBatchLoader(...)` never reaches a request, and `getProperties()` ignores your configuration. Use the facade for `paginate` and `validate`; inject the beans for everything else.

## Configuration

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `adhar.graphql.enabled` | boolean | `true` | Registers the module's beans |
| `adhar.graphql.introspection-enabled` | boolean | `false` | Allow `__schema`/`__type` queries (enforced by `GraphQlSecurityInterceptor`) |
| `adhar.graphql.max-query-depth` | int | `10` | Maximum selection depth |
| `adhar.graphql.max-query-complexity` | int | `200` | Maximum field-count score |
| `adhar.graphql.security.require-authentication` | boolean | `false` | Reject anonymous requests |
| `adhar.graphql.security.field-authorization-enabled` | boolean | `true` | Enforce `@auth` |
| `adhar.graphql.persisted-queries.enabled` | boolean | `false` | Apollo automatic persisted queries |
| `adhar.graphql.persisted-queries.max-cache-size` | int | `1000` | Cached query texts |
| `adhar.graphql.allow-list.enabled` | boolean | `false` | Reject queries not on the allow-list |
| `adhar.graphql.allow-list.location` | string | `graphql/allowed-queries` | Classpath folder of `*.graphql` / `*.gql` files |
| `adhar.graphql.rate-limit.enabled` | boolean | `false` | Per-client token bucket charged by query cost |
| `adhar.graphql.rate-limit.capacity` | long | `1000` | Bucket size |
| `adhar.graphql.rate-limit.refill-per-second` | double | `100.0` | Refill rate |
| `adhar.graphql.rate-limit.client-id-header` | string | `X-Client-Id` | Header that identifies a client |
| `adhar.graphql.rate-limit.max-clients` | int | `10000` | Buckets kept (LRU) |
| `adhar.graphql.tracing.enabled` | boolean | `false` | Time each resolver into a Micrometer timer |
| `adhar.graphql.tracing.apollo-tracing-enabled` | boolean | `false` | Add the Apollo `tracing` extension to responses |
| `adhar.graphql.tracing.include-trivial-data-fetchers` | boolean | `false` | Also time plain property fetchers |
| `adhar.graphql.cors-enabled` | boolean | `true` | Bound but not used by the module |
| `adhar.graphql.pagination.default-page-size` | int | `20` | Bound and logged only; `PaginationUtils` does not read it |
| `adhar.graphql.pagination.max-page-size` | int | `100` | Bound and logged only; not enforced |

Every bean is `@ConditionalOnMissingBean`, so your own bean replaces the default.

## Operations

- **Metrics:** with `tracing.enabled`, timer `graphql.resolver` tagged `parent` and `field`. Nothing else is emitted by this module.
- **Health:** `GraphQlFacade.health()` reports counts from the facade's own registries, not the beans, so it does not reflect your application.
- **Startup:** `AllowedQueryRegistry` loads the allow-list folder at startup even when enforcement is off. Look for `Registering GraphQL field-level authorization instrumentation` in the log to confirm `@auth` is active.
- **Rate-limit identity:** the client-id header, then the authenticated principal, then the remote address, then one shared `anonymous` bucket.

## Limits

- Complexity is a field count (one point per field, fragments expanded), not a cost estimate. Pair it with `rate-limit` for load control.
- Without Spring Security on the classpath, `@auth` directives and the introspection gate do nothing, with no error.
- The allow-list accepts a request whose operation name matches an allow-listed operation, whatever its document. Clients choose the operation name, so treat the allow-list as a guard against accidents, not as access control.
- Evicted rate-limit buckets return full; a client that rotates `X-Client-Id` values beyond `max-clients` escapes the limit.
- `adhar-kit-test-commons` has no GraphQL helpers; use Spring for GraphQL's `GraphQlTester`.

## Next steps

- [Security](/adhar-kit/modules/security) — the `Authentication` that `@auth` reads
- [Persistence](/adhar-kit/modules/persistence) — the data layer your batch loaders query
- [Cache](/adhar-kit/modules/cache) — results that must outlive one request
- [Concepts](/adhar-kit/concepts) — module toggles and the facade
