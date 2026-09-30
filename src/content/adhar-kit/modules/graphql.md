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
| Built on | Spring for GraphQL, graphql-java, java-dataloader; optional Spring Security, Micrometer |
| Entry points | `GraphQlFacade` (or `adhar.getGraphQl()`), `GraphQlSchemaRegistry`, `DataLoaderRegistrar` |
| Config prefix | `adhar.graphql` |
| Use it when | You expose GraphQL to clients you do not control, or you assemble a schema at runtime |

## How it works

Requests pass through a chain of `WebGraphQlInterceptor`s, then through graphql-java `Instrumentation` before a single data fetcher runs. Anything rejected in those stages costs you a parse, not a database round trip.

```text
   HTTP POST /graphql
         │
   ┌─────▼──────────────── WebGraphQlInterceptor chain ──────────┐
   │ PersistedQueryInterceptor   hash → full query (Apollo APQ)  │
   │ AllowedQueryInterceptor     reject anything unregistered    │
   │ QueryCostRateLimitInterceptor  token bucket per client id   │
   │ GraphQlSecurityInterceptor  require-authentication gate     │
   └─────┬───────────────────────────────────────────────────────┘
         │
   ┌─────▼──────────────── Instrumentation (pre-execution) ──────┐
   │ MaxQueryDepthInstrumentation      hard depth ceiling        │
   │ MaxQueryComplexityInstrumentation field-count ceiling       │
   │ FieldAuthorizationInstrumentation @auth(roles:[…]) directive│
   └─────┬───────────────────────────────────────────────────────┘
         │
    DataFetchers ──▶ DataLoader batches keys ──▶ one query per batch
```

`QueryComplexityInstrumentation` is a `ChainedInstrumentation` over graphql-java's own `MaxQueryComplexityInstrumentation` and `MaxQueryDepthInstrumentation`. Both hook `beginExecuteOperation`, which runs after validation but **strictly before any `DataFetcher` is invoked** — an over-budget query throws `AbortExecutionException` and comes back as an error result without touching your resolvers.

The DataLoader piece is the N+1 fix. A named batch loader receives the set of keys collected during one request tick and returns them together, so `products { supplier { name } }` over 50 products issues one supplier query rather than 50. `CompositeBatchLoaderRegistry` merges the module's registrar with Spring GraphQL's own `BatchLoaderRegistry`, so both registration styles coexist.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-graphql</artifactId>
    <version>0.1.0</version>
</dependency>
```

Pulls in `spring-boot-starter-graphql` and `graphql-java`.

## Key APIs

- **`GraphQlFacade`** (`adhar.getGraphQl()`) — `registerType(name, sdl)`, `registerQuery(name, sdl)`, `registerMutation(name, sdl)`, `getSchema()`, `paginate(list, first, afterCursor)`, `registerBatchLoader(name, fn)`, `validate(input)`, `health()`.
- **`GraphQlSchemaRegistry`** — the programmatic schema store behind the facade: `merge(other)`, `getTypeDefinitionRegistry()`, `hasType`, `getTypeCount`/`getQueryCount`/`getMutationCount`, `clear()`. Use it to assemble a schema from modules at startup.
- **`PaginationUtils`** — Relay shapes as records: `Connection<T>(edges, pageInfo)`, `Edge<T>(node, cursor)`, `PageInfo(hasNextPage, hasPreviousPage, …)`, plus `fromList`, `encodeCursor(offset)`, `decodeCursor(cursor)`. Cursors are opaque encoded offsets, not database ids.
- **`DataLoaderRegistrar`** — `registerBatchLoader(name, BatchLoaderFunction<K, V>)`, `getBatchLoader`, `hasLoader`, `getRegisteredNames`. A `BatchLoaderFunction` is `CompletableFuture<List<V>> load(List<K> keys)`; the returned list must match the keys in size and order.
- **`FieldAuthorizationInstrumentation`** — enforces the `@auth(roles: [...])` schema directive per field.
- **`InputValidator`** — runs Jakarta Validation annotations on input objects and returns a `ValidationResult`.
- **`GraphQlExceptionResolver`** — maps thrown exceptions to typed GraphQL errors (a `SecurityException` becomes `UNAUTHORIZED`).
- **`DateTimeScalar`** — a registered custom scalar; the runtime wiring configurer adds it automatically.

## Minimal: register a type and paginate

```java
@Service
public class ProductService {
    private final AdharFacade adhar;
    public ProductService(AdharFacade adhar) { this.adhar = adhar; }

    @PostConstruct
    public void setup() {
        adhar.getGraphQl().registerType("Product",
            "type Product { id: ID!, name: String!, price: Float! }");
        adhar.getGraphQl().registerQuery("products",
            "products(first: Int, after: String): ProductConnection");
    }

    public PaginationUtils.Connection<Product> page(List<Product> all, int first, String after) {
        return adhar.getGraphQl().paginate(all, first, after);
    }
}
```

## Realistic: batch loading plus field-level authorization

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

Register a batch loader for the relationship and resolve through it:

```java
@Component
public class ProductGraphQl {
    private final AdharFacade adhar;
    private final SupplierRepository suppliers;

    @PostConstruct
    void registerLoaders() {
        // the returned list MUST be the same size and order as the keys;
        // use null for a key with no value
        adhar.getGraphQl().registerBatchLoader("supplierById", (List<Long> ids) -> {
            Map<Long, Supplier> found = suppliers.findAllById(ids).stream()
                    .collect(Collectors.toMap(Supplier::getId, s -> s));
            return CompletableFuture.completedFuture(
                    ids.stream().map(found::get).toList());
        });
    }

    @SchemaMapping(typeName = "Product", field = "supplier")
    public CompletableFuture<Supplier> supplier(Product product,
                                                DataFetchingEnvironment env) {
        DataLoader<Long, Supplier> loader = env.getDataLoader("supplierById");
        return loader.load(product.getSupplierId());
    }
}
```

Role matching on the directive is prefix-insensitive, so `"ADMIN"` matches an authority of either `ADMIN` or `ROLE_ADMIN`. A caller without the role gets an `UNAUTHORIZED` error **for that field**; the rest of the response still resolves.

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
| `adhar.graphql.rate-limit.max-clients` | Tracked client buckets | `10000` |
| `adhar.graphql.tracing.enabled` | Resolver tracing instrumentation | `false` |
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

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Clients get `PersistedQueryNotFound` | APQ working as designed — the hash is not cached yet | None; Apollo Client retries with the full query text, which is then cached |
| A legitimate deep query is rejected | `max-query-depth` counts nesting levels, and fragments count | Raise the limit deliberately, or flatten the query |
| Complexity limit never trips | Complexity is a field-count score, not a runtime cost estimate | Pair it with `rate-limit` for actual load control |
| Still seeing N+1 queries | The resolver calls the repository directly instead of through the DataLoader | Resolve via `env.getDataLoader(name)` and return the `CompletableFuture` |
| Every client shares one rate-limit bucket | The `X-Client-Id` header is absent | Have clients send it, or configure a different `client-id-header` |
| `@auth` directive has no effect | The directive is not declared in the SDL, or `field-authorization-enabled` is off | Declare `directive @auth(roles: [String!]) on FIELD_DEFINITION` and keep the flag on |
| Schema browsable in production | Introspection was turned on for local development | It defaults to `false`; check for an environment override |

## See also

- [Security](/adhar-kit/modules/security) — supplies the `Authentication` that field authorization reads.
- [Persistence](/adhar-kit/modules/persistence) — the data layer your batch loaders query.
- [Cache](/adhar-kit/modules/cache) — for resolver results that outlive a single request.
