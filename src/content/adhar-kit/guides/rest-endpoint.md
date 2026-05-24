---
title: "Build a REST endpoint with validation & OpenAPI"
section: "Guides"
order: 1
category: "Web"
path: "/adhar-kit/guides/rest-endpoint"
---

# Build a REST endpoint with validation & OpenAPI

> Expose a resource over HTTP with input validation, error handling,
> and an OpenAPI 3.1 spec generated at build time.

**Category:** Web · **Time:** ~10 minutes · **Frameworks:** all five

By the end you'll have:

- A `/orders` endpoint with `GET`, `POST`, `DELETE`
- Jakarta Bean Validation on the request body
- RFC 7807 `application/problem+json` error responses
- An always-fresh OpenAPI 3.1 spec at `/openapi.json`

## 1. Declare the controller

Annotate a class with `@AdharController`. Methods use the Kit's portable
HTTP verb annotations — they compile to native handlers on every
framework.

```java
@AdharController("/orders")
class OrdersApi {

    @Inject OrderService service;

    @Get("/{id}")
    Order get(@PathParam String id) {
        return service.find(id).orElseThrow(NotFound::new);
    }

    @Post
    @Status(201)
    Order create(@Valid CreateOrder body) {
        return service.create(body);
    }

    @Delete("/{id}")
    @Status(204)
    void delete(@PathParam String id) {
        service.delete(id);
    }
}
```

## 2. Validate input

Use Jakarta Bean Validation annotations on the record. The Kit converts
violations to RFC 7807 `ProblemDetails` automatically.

```java
record CreateOrder(
    @NotBlank          String sku,
    @Min(1) @Max(1000) int    qty,
    @Email             String customerEmail
) {}
```

A bad request returns:

```json
{
  "type":   "https://errors.adhar.io/validation",
  "title":  "Constraint violations",
  "status": 400,
  "violations": [
    { "field": "sku", "message": "must not be blank" },
    { "field": "qty", "message": "must be greater than or equal to 1" }
  ],
  "traceId": "9c3e..."
}
```

## 3. Map your own errors

```java
class NotFound extends RuntimeException {}

@ErrorMapping(NotFound.class)
ProblemDetails notFound(NotFound ex) {
    return ProblemDetails.of(404, "Order not found")
        .type("https://errors.adhar.io/not-found");
}
```

## 4. Inspect the generated spec

OpenAPI 3.1 is generated at build time and served at `/openapi.json` —
no runtime cost, always in sync with your code.

```bash
curl -s localhost:8080/openapi.json | jq '.paths."/orders"'
```

```text
┌──────────── build time ────────────┐  ┌────── runtime ──────┐
│ javac ─▶ AdharSpecProcessor        │  │ GET /openapi.json   │
│         └─ scans @AdharController  │  │ ──▶ static resource │
│         └─ emits openapi.json into │  │                     │
│            META-INF/adhar/         │  └─────────────────────┘
└────────────────────────────────────┘
```

## 5. Test it

```java
@AdharTest
class OrdersApiTest {
    @Inject TestHttp http;

    @Test
    void createsAnOrder() {
        var res = http.post("/orders", Map.of("sku","ABC","qty",2,"customerEmail","a@b.c"));
        assertThat(res.status()).isEqualTo(201);
        assertThat(res.json().get("id")).isNotNull();
    }
}
```

## Next steps

- [Add distributed tracing](/adhar-kit/guides/distributed-tracing)
- [Make the client resilient](/adhar-kit/guides/resilient-client)
- [`adhar-kit-web` module reference](/adhar-kit/modules/web)
