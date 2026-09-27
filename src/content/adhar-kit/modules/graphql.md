---
title: "GraphQL"
section: "Modules"
order: 22
path: "/adhar-kit/modules/graphql"
---

# GraphQL

`adhar-kit-graphql` provides GraphQL support with a schema registry, Relay cursor pagination, DataLoader batching (N+1 prevention), pre-execution depth/complexity limits, Apollo Automatic Persisted Queries, and a security interceptor.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-graphql</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

`GraphQlFacade` (via `adhar.getGraphQl()`): `registerType`, `registerQuery`, `registerMutation`, `getSchema`, `paginate(list, first, cursor)`, `registerBatchLoader(name, fn)`, `validate`. Built on graphql-java (`MaxQueryDepthInstrumentation`, `MaxQueryComplexityInstrumentation`, `DataLoader`) and Spring GraphQL.

## Usage

```java
@Service
public class ProductService {
    private final AdharFacade adhar;
    public ProductService(AdharFacade adhar) { this.adhar = adhar; }

    public void setup() {
        adhar.getGraphQl().registerType("Product",
            "type Product { id: ID!, name: String!, price: Float! }");
        adhar.getGraphQl().registerQuery("products",
            "products(first: Int, after: String): ProductConnection");

        // Relay-style pagination
        var connection = adhar.getGraphQl().paginate(productList, 10, afterCursor);
    }
}
```

## Guardrails

Depth and complexity limits are enforced **before** execution, so a malicious or accidental deep query is rejected rather than run:

```yaml
adhar:
  graphql:
    enabled: true
    introspection-enabled: false     # off in production
    max-query-depth: 10
    max-query-complexity: 200
    pagination:
      default-page-size: 20
      max-page-size: 100
    security:
      require-authentication: true
    persisted-queries:
      enabled: true
      max-cache-size: 1000
```

DataLoader batching eliminates N+1 database hits; register a batch loader per relationship and the module coalesces lookups within a request.
