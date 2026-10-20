---
title: "GraphQL"
section: "Modules"
order: 22
path: "/adhar-kit/modules/graphql"
---

# GraphQL

A GraphQL endpoint is an open invitation: the client decides the shape and the cost of every query. `adhar-kit-graphql` **closes that hole before execution starts**. It adds depth and complexity ceilings, a cost-based rate limiter, and an optional query allow-list.

It also fixes the two things that make naive GraphQL servers slow and leaky: N+1 resolver fetches, and fields that return data the caller should not see.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-graphql` |
| Built on | Spring for GraphQL, graphql-java, java-dataloader; optional Spring Security, Micrometer, Jakarta Validation |
| Entry points | `DataLoaderRegistrar`, `GraphQlSchemaRegistry`, `PaginationUtils`, the `@auth` directive |
| Config prefix | `adhar.graphql` |
| Use it when | You expose GraphQL to clients you do not control, or you assemble a schema at runtime |

## How it works

Requests pass through a chain of `WebGraphQlInterceptor`s, then through graphql-java `Instrumentation`, before a single data fetcher runs. Anything rejected in those stages costs you a parse, not a database round trip.

```diagram
kit-graphql-pipeline
```

### Why the limits are pre-execution, and what a client sees

`QueryComplexityInstrumentation` is a `ChainedInstrumentation` over graphql-java's own `MaxQueryComplexityInstrumentation` and `MaxQueryDepthInstrumentation`. Both hook `beginExecuteOperation`. That runs after parse and validation, but **strictly before any `DataFetcher` is invoked**. When a query is over budget, they throw `graphql.execution.AbortExecutionException`. graphql-java turns that into an `ExecutionResult` carrying an error.

That ordering is the whole point, and it changes what the client experiences:

- The response is still an HTTP 200 with a GraphQL `errors` array and `data: null`. GraphQL does not use HTTP status codes for this. Clients that only branch on HTTP status will treat a rejected query as a success with no data.
- **No resolver runs, so nothing is charged to your database, and partial data is never returned.** A rejection is all-or-nothing for the operation.
- A rejected query costs at most a parse plus validation of the document text. That is what makes the limit a usable defence rather than a post-mortem.

This replaces an earlier implementation. That version recomputed depth and complexity itself and rejected the query in `instrumentExecutionResult`, after it had already fully executed. If you are porting a schema from that era, the limits now apply earlier. Queries that used to squeak through will start failing.

Complexity is a **field-count score**, not a runtime cost estimate. Each field selection scores one point, and fragments add the cost of their selections. A query selecting 150 scalar fields and one that joins three tables score very differently from how they actually load the server. For real load control, pair the ceiling with the rate limiter.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-graphql</artifactId>
    <version>0.1.0</version>
</dependency>
```

The whole auto-configuration needs **both** `graphql.GraphQL` and `org.springframework.graphql.execution.RuntimeWiringConfigurer` to be present. It checks for them by class name rather than class literal. Without Spring GraphQL, reflecting over the bean-method signatures during condition evaluation would throw `NoClassDefFoundError` and abort the context. The name-based guard makes the module back off cleanly instead.

## The N+1 problem and the DataLoader contract

Resolving `products { supplier { name } }` naively issues one supplier query per product. A DataLoader fixes this. It defers each `load(key)` within one execution tick, collects the keys, and calls your batch function once with all of them.

`DataLoaderRegistrar.BatchLoaderFunction<K, V>` is a single method:

```java
CompletableFuture<List<V>> load(List<K> keys);
```

Follow two rules. Both are hard requirements of java-dataloader, not suggestions:

1. **The returned list must be the same size as `keys`.** A short list mis-aligns every subsequent key.
2. **It must be in the same order as `keys`**, with `null` at the position of any key that had no value. A repository `findAllById` returns rows in whatever order the database produced them, and drops rows that do not exist. So you must re-index its result against the key list yourself.

Scope and lifetime follow from where the registrar sits. `DataLoaderRegistrar` implements Spring GraphQL's `DataLoaderRegistrar` interface. `registerDataLoaders(registry, context)` is called **once per request**. Each call turns every registered `BatchLoaderFunction` into a brand-new `DataLoader` via `DataLoaderFactory.newDataLoader`. So:

- A `DataLoader`'s batching window and its internal cache both live for exactly one request.
- Two requests never share a loader, so a stale value cannot leak between users.
- The `BatchLoaderFunction` itself is a long-lived singleton that every request shares. It must be thread-safe and must not hold per-request state.

`CompositeBatchLoaderRegistry` is registered as the single `BatchLoaderRegistry` bean that Spring Boot wires into `ExecutionGraphQlService`. It delegates the fluent `forName` / `forTypePair` API (used by `@BatchMapping`) to a `DefaultBatchLoaderRegistry`. It then merges in the Adhar registrar. So both registration styles land in the same per-request `DataLoaderRegistry`.

> **Register loaders on the `DataLoaderRegistrar` bean, not through `GraphQlFacade`.** The facade's `getInstance()` singleton constructs its *own* private `DataLoaderRegistrar`, `GraphQlSchemaRegistry` and `GraphQlProperties` in its constructor. Those instances are not the Spring beans. So a loader registered through `adhar.getGraphQl().registerBatchLoader(...)` is never installed into any request's registry, and silently does not batch. Also, `getProperties()` returns stock defaults rather than your bound configuration. Use the facade for the stateless helpers (`paginate`, `validate`), and inject the beans for everything else.

## Worked example: batch loading plus field-level authorization

Declare the directive in your SDL and mark the protected field:

```text
directive @auth(roles: [String!]) on FIELD_DEFINITION

type Product {
  id: ID!
  name: String!
  supplier: Supplier!
  costPrice: Float! @auth(roles: ["PRICING_ADMIN"])
}
```

Register the loader against the injected bean and resolve through it:

```java
package com.example.catalog;

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
            // One query for the whole batch...
            Map<Long, Supplier> found = suppliers.findAllById(ids).stream()
                    .collect(Collectors.toMap(Supplier::getId, Function.identity()));
            // ...then re-index against the keys. Same size, same order, null for misses.
            return CompletableFuture.completedFuture(
                    ids.stream().map(found::get).toList());
        });
    }

    @SchemaMapping(typeName = "Product", field = "supplier")
    public CompletableFuture<Supplier> supplier(Product product, DataFetchingEnvironment env) {
        DataLoader<Long, Supplier> loader = env.getDataLoader("supplierById");
        return loader.load(product.getSupplierId());
    }
}
```

Returning the `CompletableFuture` is what makes batching work. If you call `loader.load(...).join()` inside the resolver, you turn the whole thing back into N+1. It is even worse, because each load now also waits for a dispatch that cannot happen until the thread is released.

### What the `@auth` directive actually does

`FieldAuthorizationInstrumentation` hooks `instrumentDataFetcher`. For any field with an applied `@auth` directive, it replaces the fetcher with a wrapper. At fetch time, the wrapper reads `SecurityContextHolder` and compares authorities against the directive's `roles` argument. If none match, it throws `SecurityException`. `GraphQlExceptionResolver` then maps that to an `UNAUTHORIZED` GraphQL error with the message `Access denied`.

- Matching is **prefix-insensitive**. A directive role `ADMIN` matches a granted authority of either `ADMIN` or `ROLE_ADMIN`, because both sides are normalised by stripping `ROLE_`.
- A field with `@auth` but an **empty role list** requires only an authenticated caller.
- An unauthenticated or unauthenticated-token caller fails every `@auth` field.
- The failure applies to **that field** only. The error appears in `errors`, the field is `null`, and the rest of the response still resolves.
- The authority check runs on whichever thread runs the fetcher. `SecurityContextHolder` is thread-local, so a resolver that hands work to your own executor loses the context. Keep the directive check on the request thread, and do the async work after it.

The resolver hides internals in general:

- Anything unmapped becomes `An internal error occurred` with `INTERNAL_ERROR`. The real exception is logged at ERROR on the server.
- `IllegalArgumentException` becomes `BAD_REQUEST` and keeps its message.
- `UnsupportedOperationException` becomes `FORBIDDEN`.
- An exception whose simple class name contains `NotFoundException`, `EntityNotFoundException` or `NoSuchElement` becomes `NOT_FOUND`.

`CompletionException` is unwrapped first, so async resolvers are classified the same as synchronous ones.

## Key APIs

- **`DataLoaderRegistrar`** — `registerBatchLoader(name, BatchLoaderFunction<K, V>)`, `getBatchLoader`, `hasLoader`, `getRegisteredNames`, `size`. Backed by a `ConcurrentHashMap`. Registering a name again replaces the previous loader.
- **`GraphQlSchemaRegistry`** — the programmatic SDL store: `registerType`, `registerQuery`, `registerMutation`, `merge(other)`, `getSchema()`, `getTypeDefinitionRegistry()`, `hasType`, the three counts, `clear()`. All three maps are `ConcurrentHashMap`s, so several modules can safely fill it at startup.
- **`PaginationUtils`** — Relay shapes as records: `Connection<T>(edges, pageInfo)`, `Edge<T>(node, cursor)`, `PageInfo(hasNextPage, hasPreviousPage, …)`, plus `fromList`, `encodeCursor(offset)`, `decodeCursor(cursor)`. Cursors are opaque encoded offsets, not database ids. So they are stable only if the list order is stable.
- **`FieldAuthorizationInstrumentation`** — enforces `@auth(roles: [...])`. Constants `AUTH_DIRECTIVE` and `ROLES_ARGUMENT`.
- **`GraphQlSecurityInterceptor`** — blocks introspection. With `require-authentication`, it also blocks anonymous requests. To detect introspection, it parses the document into an AST and looks structurally for `__schema`/`__type`. It falls back to substring matching only if the parse fails.
- **`InputValidator`** — runs Jakarta Validation annotations on input objects and returns a `ValidationResult`. Registered only when `jakarta.validation.Validator` is on the classpath.
- **`QueryCostEstimator`** — `estimateCost(document, operationName)`. The same field-count metric, exposed for your own use. An unparseable document costs `1`.
- **`DateTimeScalar`** — the `DateTime` scalar, added to runtime wiring automatically.

## How it behaves

- **Thread-safety.** Every bean here is a singleton and must be treated as shared. `DataLoaderRegistrar` and `GraphQlSchemaRegistry` use concurrent maps. `FieldAuthorizationInstrumentation` holds no state. `TokenBucket.tryConsume` is `synchronized`, and the bucket map is a synchronized `LinkedHashMap`. So the rate limiter is safe under load, but serialises briefly per client.
- **Lifecycle.** Beans are created at context refresh. `AllowedQueryRegistry` eagerly loads documents from `classpath:graphql/allowed-queries` at construction, whether or not enforcement is enabled. So the load cost and any malformed file show up at startup, not on the first request.
- **Failure behaviour of the guards.** Each guard is a separate conditional bean, and each fails *closed* on rejection, not open. But each one is conditional on its own:
  - The `allow-list`, `rate-limit` and `persisted-queries` interceptors only exist when their flag is `true`.
  - `GraphQlSecurityInterceptor` and `FieldAuthorizationInstrumentation` only exist when Spring Security is on the classpath.

  A schema full of `@auth` directives but with no Spring Security dependency enforces nothing, with no error. Check for the startup log line `Registering GraphQL field-level authorization instrumentation`.
- **Resource bounds.** `ClientRateLimiter` keeps an access-ordered LRU of at most `max-clients` buckets and evicts the least recently used. So memory stays bounded under a hostile stream of distinct client ids. The trade-off is that an evicted client comes back with a full bucket. Set `max-clients` well above your real client count. Otherwise a client can bypass the limit by rotating the `X-Client-Id` header. `InMemoryPersistedQueryCache` is likewise bounded by `max-cache-size`.
- **Client identity for rate limiting** resolves in this order: the configured client-id header, then the authenticated principal name, then the remote address, then a single shared `anonymous` bucket. A missing header does not mean "one bucket for everyone". But behind a proxy that hides the client IP, it can get close to that.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.graphql.enabled` | Master switch | `true` |
| `adhar.graphql.introspection-enabled` | Allow schema introspection | `false` |
| `adhar.graphql.max-query-depth` | Maximum nesting depth | `10` |
| `adhar.graphql.max-query-complexity` | Maximum field-count score | `200` |
| `adhar.graphql.cors-enabled` | CORS for the GraphQL endpoint | `true` |
| `adhar.graphql.pagination.default-page-size` | Page size when `first` is absent | `20` |
| `adhar.graphql.pagination.max-page-size` | Upper bound on `first` | `100` |
| `adhar.graphql.security.require-authentication` | Reject anonymous requests | `false` |
| `adhar.graphql.security.field-authorization-enabled` | Enforce `@auth` directives | `true` |
| `adhar.graphql.persisted-queries.enabled` | Apollo APQ support | `false` |
| `adhar.graphql.persisted-queries.max-cache-size` | Cached query texts | `1000` |
| `adhar.graphql.allow-list.enabled` | Reject unregistered queries | `false` |
| `adhar.graphql.allow-list.location` | Classpath location of allowed queries | `graphql/allowed-queries` |
| `adhar.graphql.rate-limit.enabled` | Cost-based per-client limiting | `false` |
| `adhar.graphql.rate-limit.capacity` | Token bucket size | `1000` |
| `adhar.graphql.rate-limit.refill-per-second` | Token refill rate | `100.0` |
| `adhar.graphql.rate-limit.client-id-header` | Header identifying a client | `X-Client-Id` |
| `adhar.graphql.rate-limit.max-clients` | Tracked client buckets (LRU) | `10000` |
| `adhar.graphql.tracing.enabled` | Resolver tracing instrumentation (needs a `MeterRegistry`) | `false` |
| `adhar.graphql.tracing.apollo-tracing-enabled` | Apollo tracing extension | `false` |
| `adhar.graphql.tracing.include-trivial-data-fetchers` | Trace property fetchers too | `false` |

```yaml
adhar:
  graphql:
    introspection-enabled: false
    max-query-depth: 8
    max-query-complexity: 150
    security:
      require-authentication: true
    persisted-queries:
      enabled: true
    rate-limit:
      enabled: true
      capacity: 2000
      refill-per-second: 200.0
```

## Testing

`adhar-kit-test-commons` provides nothing GraphQL-specific. Use Spring GraphQL's own `GraphQlTester` and target each layer separately.

1. **Limits** — the fastest check needs no Spring context. Construct `new QueryComplexityInstrumentation(maxComplexity, maxDepth)`. Run a deliberately over-budget document through graphql-java. Assert that the result has errors and that your fetcher's invocation counter is still zero. The counter assertion is what proves the check is pre-execution.
2. **Batch loaders** — call the `BatchLoaderFunction` directly with a key list that includes a deliberately missing id. Assert that the returned list has the same size as the input, with `null` in the right slot. This catches the ordering bug without a running server.
3. **Batching actually happening** — with `@SpringBootTest` and `GraphQlTester`, execute a query over several parents. Assert that the repository was hit once, not once per row. Use a Mockito `verify(..., times(1))` or a query counter.
4. **`@auth`** — set a `SecurityContextHolder` authentication with the authorities under test, and run the query. Assert that the protected field is `null` while the sibling fields resolved. Do not assert on the message text beyond `Access denied`, because everything unmapped is deliberately masked.
5. **Disabling the module** — `adhar.graphql.enabled: false` turns off the whole auto-configuration. To keep GraphQL but remove a single guard, set its own flag (`rate-limit.enabled`, `allow-list.enabled`). Or define your own bean, since every bean is `@ConditionalOnMissingBean`.

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| A batch loader registered via `adhar.getGraphQl()` never batches | The facade singleton owns a private `DataLoaderRegistrar` that nothing wires into requests | Inject the `DataLoaderRegistrar` bean and register on that |
| Wrong supplier attached to each product | The batch function returned rows in repository order, not key order | Re-index the result against `keys`, with `null` for misses |
| Still seeing N+1 queries | The resolver calls the repository directly, or joins the future instead of returning it | Return the `CompletableFuture` from `env.getDataLoader(name).load(key)` |
| Clients treat a rejected query as success | GraphQL returns HTTP 200 with an `errors` array | Branch on `errors`, not on the status code |
| A legitimate deep query is rejected | `max-query-depth` counts nesting levels, and fragments count | Raise the limit deliberately, or flatten the query |
| Complexity limit never trips | Complexity is a field-count score, not a runtime cost estimate | Pair it with `rate-limit` for actual load control |
| `@auth` directive has no effect | The directive is not declared in the SDL, `field-authorization-enabled` is off, or Spring Security is not on the classpath | Declare `directive @auth(roles: [String!]) on FIELD_DEFINITION`, keep the flag on, and check the startup log |
| `@auth` denies an authenticated caller on an async resolver | `SecurityContextHolder` is thread-local and the fetcher ran on another thread | Do the authority-gated work on the request thread |
| Rate limit bypassed by rotating a header value | Evicted LRU buckets come back full | Raise `max-clients` above the real client count |
| Clients get `PersistedQueryNotFound` | APQ working as designed — the hash is not cached yet | None; Apollo Client retries with the full query text, which is then cached |
| Schema browsable in production | Introspection was turned on for local development | It defaults to `false`; check for an environment override |

## See also

- [Security](/adhar-kit/modules/security) — supplies the `Authentication` that field authorization reads.
- [Persistence](/adhar-kit/modules/persistence) — the data layer your batch loaders query.
- [Cache](/adhar-kit/modules/cache) — for resolver results that must outlive a single request, which a DataLoader never does.
- [Concepts](/adhar-kit/concepts) — module gating, auto-configuration and the facade model.
