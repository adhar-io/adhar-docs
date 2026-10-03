---
title: "GraphQL"
section: "Modules"
order: 22
path: "/adhar-kit/modules/graphql"
---

# GraphQL

A GraphQL endpoint is an open invitation: the client decides the shape and the cost of every query. `adhar-kit-graphql` **closes that hole before execution starts** — depth and complexity ceilings, a cost-based rate limiter, an optional query allow-list — and fixes the two things that make naive GraphQL servers slow and leaky: N+1 resolver fetches, and fields that return data the caller should not see.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-graphql` |
| Built on | Spring for GraphQL, graphql-java, java-dataloader; optional Spring Security, Micrometer, Jakarta Validation |
| Entry points | `DataLoaderRegistrar`, `GraphQlSchemaRegistry`, `PaginationUtils`, the `@auth` directive |
| Config prefix | `adhar.graphql` |
| Use it when | You expose GraphQL to clients you do not control, or you assemble a schema at runtime |

## How it works

Requests pass through a chain of `WebGraphQlInterceptor`s, then through graphql-java `Instrumentation` before a single data fetcher runs. Anything rejected in those stages costs you a parse, not a database round trip.

```diagram
kit-graphql-pipeline
```

### Why the limits are pre-execution, and what a client sees

`QueryComplexityInstrumentation` is a `ChainedInstrumentation` over graphql-java's own `MaxQueryComplexityInstrumentation` and `MaxQueryDepthInstrumentation`. Both hook `beginExecuteOperation`, which runs after parse and validation but **strictly before any `DataFetcher` is invoked**. Over budget, they throw `graphql.execution.AbortExecutionException`, and graphql-java turns that into an `ExecutionResult` carrying an error.

That ordering is the whole point, and it changes what the client experiences:

- The response is still an HTTP 200 with a GraphQL `errors` array and `data: null` — GraphQL does not use HTTP status codes for this. Clients that only branch on HTTP status will treat a rejected query as a success with no data.
- **No resolver runs, so nothing is charged to your database, and partial data is never returned.** A rejection is all-or-nothing for the operation.
- The cost of a rejected query is bounded by parse plus validation of the document text. That is what makes the limit a usable defence rather than a post-mortem.

This replaces an earlier implementation that recomputed depth and complexity itself and rejected the query in `instrumentExecutionResult` — after it had already fully executed. If you are porting a schema from that era, the limits now bite earlier and queries that used to squeak through will start failing.

Complexity is a **field-count score**, not a runtime cost estimate: one point per field selection, with fragments contributing the cost of their selections. A query selecting 150 scalar fields and one that joins three tables score very differently from how they actually load the server. Pair the ceiling with the rate limiter for real load control.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-graphql</artifactId>
    <version>0.1.0</version>
</dependency>
```

The whole auto-configuration is guarded on **both** `graphql.GraphQL` and `org.springframework.graphql.execution.RuntimeWiringConfigurer` being present, by class name rather than class literal. Without Spring GraphQL, reflecting over the bean-method signatures during condition evaluation would throw `NoClassDefFoundError` and abort the context; the name-based guard makes the module back off cleanly instead.

## The N+1 problem and the DataLoader contract

Resolving `products { supplier { name } }` naively issues one supplier query per product. A DataLoader defers each `load(key)` within one execution tick, collects the keys, and calls your batch function once with all of them.

`DataLoaderRegistrar.BatchLoaderFunction<K, V>` is a single method:

```java
CompletableFuture<List<V>> load(List<K> keys);
```

Two rules, and both are hard requirements of java-dataloader rather than suggestions:

1. **The returned list must be the same size as `keys`.** A short list mis-aligns every subsequent key.
2. **It must be in the same order as `keys`**, with `null` at the position of any key that had no value. A repository `findAllById` returns rows in whatever order the database produced them, and drops rows that do not exist — so you must re-index its result against the key list yourself.

Scope and lifetime follow from where the registrar sits. `DataLoaderRegistrar` implements Spring GraphQL's `DataLoaderRegistrar` interface, and `registerDataLoaders(registry, context)` is called **once per request**. Each call adapts every registered `BatchLoaderFunction` into a brand-new `DataLoader` via `DataLoaderFactory.newDataLoader`. So:

- A `DataLoader`'s batching window and its internal cache both live for exactly one request.
- Two requests never share a loader, so a stale value cannot leak between users.
- The `BatchLoaderFunction` itself is a long-lived singleton shared by every request. It must be thread-safe and must not hold per-request state.

`CompositeBatchLoaderRegistry` is registered as the single `BatchLoaderRegistry` bean that Spring Boot wires into `ExecutionGraphQlService`. It delegates the fluent `forName` / `forTypePair` API (used by `@BatchMapping`) to a `DefaultBatchLoaderRegistry` and then merges in the Adhar registrar, so both registration styles land in the same per-request `DataLoaderRegistry`.

> **Register loaders on the `DataLoaderRegistrar` bean, not through `GraphQlFacade`.** The facade's `getInstance()` singleton constructs its *own* private `DataLoaderRegistrar`, `GraphQlSchemaRegistry` and `GraphQlProperties` in its constructor. Those instances are not the Spring beans, so a loader registered through `adhar.getGraphQl().registerBatchLoader(...)` is never installed into any request's registry and silently does not batch — and `getProperties()` returns stock defaults rather than your bound configuration. Use the facade for the stateless helpers (`paginate`, `validate`) and inject the beans for everything else.

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

Returning the `CompletableFuture` is what makes batching work. If you call `loader.load(...).join()` inside the resolver you serialise the whole thing back into N+1 — worse, because each load now also waits for a dispatch that cannot happen until the thread is released.

### What the `@auth` directive actually does

`FieldAuthorizationInstrumentation` hooks `instrumentDataFetcher`. For any field carrying an applied `@auth` directive it replaces the fetcher with a wrapper that, at fetch time, reads `SecurityContextHolder`, compares authorities against the directive's `roles` argument, and throws `SecurityException` if none match. `GraphQlExceptionResolver` then maps that to an `UNAUTHORIZED` GraphQL error with the message `Access denied`.

- Matching is **prefix-insensitive**: a directive role `ADMIN` matches a granted authority of either `ADMIN` or `ROLE_ADMIN`, because both sides are normalised by stripping `ROLE_`.
- A field with `@auth` but an **empty role list** requires only an authenticated caller.
- An unauthenticated or unauthenticated-token caller fails every `@auth` field.
- The failure is scoped to **that field**: the error appears in `errors`, the field is `null`, and the rest of the response still resolves.
- The authority check happens on whichever thread runs the fetcher. `SecurityContextHolder` is thread-local, so a resolver that hands work to your own executor loses the context. Keep the directive check on the request thread and do the async work after it.

The resolver masks internals generally: anything unmapped becomes `An internal error occurred` with `INTERNAL_ERROR`, with the real exception logged at ERROR server-side. `IllegalArgumentException` becomes `BAD_REQUEST` and keeps its message; `UnsupportedOperationException` becomes `FORBIDDEN`; an exception whose simple class name contains `NotFoundException`, `EntityNotFoundException` or `NoSuchElement` becomes `NOT_FOUND`. `CompletionException` is unwrapped first, so async resolvers classify the same as synchronous ones.

## Key APIs

- **`DataLoaderRegistrar`** — `registerBatchLoader(name, BatchLoaderFunction<K, V>)`, `getBatchLoader`, `hasLoader`, `getRegisteredNames`, `size`. Backed by a `ConcurrentHashMap`; re-registering a name replaces the previous loader.
- **`GraphQlSchemaRegistry`** — the programmatic SDL store: `registerType`, `registerQuery`, `registerMutation`, `merge(other)`, `getSchema()`, `getTypeDefinitionRegistry()`, `hasType`, the three counts, `clear()`. All three maps are `ConcurrentHashMap`s, so it is safe to populate from several modules at startup.
- **`PaginationUtils`** — Relay shapes as records: `Connection<T>(edges, pageInfo)`, `Edge<T>(node, cursor)`, `PageInfo(hasNextPage, hasPreviousPage, …)`, plus `fromList`, `encodeCursor(offset)`, `decodeCursor(cursor)`. Cursors are opaque encoded offsets, not database ids — so they are stable only against a stable list order.
- **`FieldAuthorizationInstrumentation`** — enforces `@auth(roles: [...])`. Constants `AUTH_DIRECTIVE` and `ROLES_ARGUMENT`.
- **`GraphQlSecurityInterceptor`** — blocks introspection and, with `require-authentication`, anonymous requests. Introspection detection parses the document into an AST and looks structurally for `__schema`/`__type`, falling back to substring matching only if the parse fails.
- **`InputValidator`** — runs Jakarta Validation annotations on input objects and returns a `ValidationResult`. Registered only when `jakarta.validation.Validator` is on the classpath.
- **`QueryCostEstimator`** — `estimateCost(document, operationName)`; the same field-count metric, exposed for your own use. An unparseable document costs `1`.
- **`DateTimeScalar`** — the `DateTime` scalar, added to runtime wiring automatically.

## How it behaves

- **Thread-safety.** Every bean here is a singleton and must be treated as shared. `DataLoaderRegistrar` and `GraphQlSchemaRegistry` use concurrent maps. `FieldAuthorizationInstrumentation` holds no state. `TokenBucket.tryConsume` is `synchronized` and the bucket map is a synchronized `LinkedHashMap`, so the rate limiter is safe under load but serialises briefly per client.
- **Lifecycle.** Beans are created at context refresh. `AllowedQueryRegistry` eagerly loads documents from `classpath:graphql/allowed-queries` at construction, whether or not enforcement is enabled — so the load cost and any malformed file surface at startup, not on first request.
- **Failure behaviour of the guards.** Each guard is a separate conditional bean and each fails *closed* on rejection, not open. But they are all individually conditional: `allow-list`, `rate-limit` and `persisted-queries` interceptors only exist when their flag is `true`, and `GraphQlSecurityInterceptor` and `FieldAuthorizationInstrumentation` only exist when Spring Security is on the classpath. A schema peppered with `@auth` directives and no Spring Security dependency enforces nothing, with no error — check the startup log line `Registering GraphQL field-level authorization instrumentation`.
- **Resource bounds.** `ClientRateLimiter` keeps an access-ordered LRU of at most `max-clients` buckets and evicts the least recently used, so memory is bounded under a hostile stream of distinct client ids. The trade-off is that an evicted client comes back with a full bucket; set `max-clients` comfortably above your real client count or the limit is bypassable by rotating the `X-Client-Id` header. `InMemoryPersistedQueryCache` is likewise bounded by `max-cache-size`.
- **Client identity for rate limiting** resolves in order: the configured client-id header, then the authenticated principal name, then the remote address, then a single shared `anonymous` bucket. It is not "one bucket for everyone" when the header is missing — but behind a proxy that hides the client IP it can collapse to close to that.

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

1. **Limits** — the fastest check needs no Spring context. Construct `new QueryComplexityInstrumentation(maxComplexity, maxDepth)`, run a deliberately over-budget document through graphql-java, and assert the result has errors and that your fetcher's invocation counter is still zero. Asserting the counter is the part that proves it is pre-execution.
2. **Batch loaders** — call the `BatchLoaderFunction` directly with a key list that includes a deliberately missing id, and assert the returned list has the same size as the input and `null` in the right slot. This catches the ordering bug without a running server.
3. **Batching actually happening** — with `@SpringBootTest` and `GraphQlTester`, execute a query over several parents and assert the repository was hit once (a Mockito `verify(..., times(1))` or a query counter), not once per row.
4. **`@auth`** — set a `SecurityContextHolder` authentication with the authorities under test, run the query, and assert the protected field is `null` while the sibling fields resolved. Do not assert on the message text beyond `Access denied`; everything unmapped is deliberately masked.
5. **Disabling the module** — `adhar.graphql.enabled: false` backs the whole auto-configuration off. To keep GraphQL but remove a single guard, set its own flag (`rate-limit.enabled`, `allow-list.enabled`) or define your own bean, since every bean is `@ConditionalOnMissingBean`.

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
