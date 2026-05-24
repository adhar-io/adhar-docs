---
title: "adhar-kit-web"
section: "Modules"
order: 2
path: "/adhar-kit/modules/web"
---

# adhar-kit-web

> HTTP server, REST/GraphQL routing, content negotiation, OpenAPI 3.1 —
> one annotation set across every framework.

**Package:** `io.adhar.kit.web` · **Status:** stable · **Since:** 1.0

A thin annotation layer that compiles to native handlers for each
supported framework. Generates OpenAPI 3.1 specs at build time and
exposes them at `/openapi.json`.

## Routing model

```text
   Request
      │
      ▼
 ┌─────────────┐  match path/method
 │ AdharRouter │ ───────────────────▶ NotFound → 404 ProblemDetails
 └─────┬───────┘
       │
       ▼
 ┌─────────────┐  Jakarta Bean Validation
 │ Validation  │ ──── violation ────▶ 400 ProblemDetails
 └─────┬───────┘
       │
       ▼
 ┌─────────────┐
 │  Handler    │ ──── throws ───▶ ErrorMapper → 4xx/5xx ProblemDetails
 │  (your code)│
 └─────┬───────┘
       │ returns
       ▼
   Negotiate → JSON / CBOR / Protobuf
```

## Key classes

| Class | Purpose |
|-------|---------|
| [`@AdharController`](/adhar-kit/javadoc/io.adhar.kit.web/AdharController) | Marks a class as an HTTP controller. |
| [`RouterBuilder`](/adhar-kit/javadoc/io.adhar.kit.web/RouterBuilder) | Programmatic route registration. |
| `OpenApiPublisher` | Serves the generated spec. |
| `ErrorMapper` | Maps exceptions to RFC 7807 ProblemDetails. |

## Features

- Single annotation: `@AdharController`
- HTTP verb annotations: `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`
- Content negotiation: JSON, CBOR, Protobuf
- Automatic OpenAPI 3.1 generation (build-time, zero runtime cost)
- Centralised error → ProblemDetails mapping (RFC 7807)
- Streaming responses via `Flow.Publisher` / reactive types
- WebSocket and Server-Sent Events helpers

## Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `adhar.web.port` | `8080` | HTTP port. |
| `adhar.web.host` | `0.0.0.0` | Bind address. |
| `adhar.web.openapi.path` | `/openapi.json` | Spec endpoint. |
| `adhar.web.cors.allowed-origins` | `*` | CORS origins. |
| `adhar.web.max-body-size` | `10MB` | Request body limit. |

## Example

```java
@AdharController("/users")
class UsersApi {

    @Inject UserService service;

    @Get("/{id}")
    User get(@PathParam String id) {
        return service.find(id).orElseThrow(NotFound::new);
    }

    @Post
    @Status(201)
    User create(@Valid CreateUser body) {
        return service.create(body);
    }
}

record CreateUser(@NotBlank String email, @Min(0) int age) {}
```

## Compatibility

| Framework | Support | Underlying server |
|-----------|---------|-------------------|
| Spring | ✅ full | Tomcat / Netty |
| Quarkus | ✅ full | Vert.x |
| Micronaut | ✅ full | Netty |
| Helidon | ✅ full | Helidon Níma (Loom) |
| Vert.x | ✅ full | Vert.x core |

## See also

- [Build a REST endpoint](/adhar-kit/guides/rest-endpoint)
- [`RouterBuilder`](/adhar-kit/javadoc/io.adhar.kit.web/RouterBuilder)
- [`adhar-kit-security`](/adhar-kit/modules/security)
