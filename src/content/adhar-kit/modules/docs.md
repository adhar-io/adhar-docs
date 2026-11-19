---
title: "API Docs"
section: "Modules"
order: 33
path: "/adhar-kit/modules/docs"
---

# API Docs

`adhar-kit-docs` builds on springdoc-openapi. It serves `/v3/api-docs` and Swagger UI with the kit's defaults — the service name as the title, the build version, a bearer-JWT security scheme — and, for spec-first services, makes Swagger UI show the OpenAPI files you ship instead of the document springdoc derives from code. It also gives you a breaking-change diff and an AsyncAPI generator.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-docs` (package `com.adhar.kit.docs`); included in `adhar-kit-starter` |
| Facade gate | `adhar.kit.modules.docs`, default `true`. It gates `adhar.getApiDocs()` |
| Module switch | `adhar.docs.enabled`, default `true`. It gates `DocsAutoConfiguration` |
| Facade | `ApiDocsFacade` |
| Required dependencies | `springdoc-openapi-starter-webmvc-ui`, `spring-boot-autoconfigure` |
| Optional dependencies | `adhar-kit-commons` (shipped specs), `spring-boot-starter-webmvc` |
| Frameworks | Spring Boot (Spring MVC) `status:complete`. Quarkus and Micronaut: `QuarkusOpenApiIntegration` and `MicronautOpenApiIntegration` only build an `OpenAPI` object, `status:in-progress` |

## How it works

A **spec-first** service writes its contract and generates code from it. The kit's Maven plugin, `adhar-kit-commons` and this module form the chain:

```diagram
nka-docs-spec-first
```

A **code-first** service needs nothing extra: springdoc scans the controllers, and `DocsAutoConfiguration` supplies the base `OpenAPI` document it builds on.

| Endpoint | Served by | Content |
|---|---|---|
| `/v3/api-docs`, `/v3/api-docs.yaml` | springdoc | The document derived from your code |
| `/swagger-ui.html` | springdoc | Swagger UI — showing the shipped specs when there are any |
| `/api/v<major>/openapi.yaml` | `adhar-kit-commons` | The spec the build copied into the jar |

## Add it

The starter already contains it. Without the starter, with the BOM imported:

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-docs</artifactId>
</dependency>
```

`adhar-kit-security` protects these paths like any other. To open them, permit them explicitly:

```yaml
adhar:
  security:
    authorization:
      permit-all:
        - /v3/api-docs/**
        - /swagger-ui/**
        - /swagger-ui.html
```

**Check:** `curl -s localhost:8080/v3/api-docs | jq .info` shows your `spring.application.name` as `title`.

## Use it

### Set the document metadata

`DocsAutoConfiguration` registers an `OpenAPI` bean unless you define one:

- `title` is `adhar.docs.title` when set, otherwise `spring.application.name`.
- `version` is `adhar.docs.version` when set, otherwise the version from Spring Boot build info (`META-INF/build-info.properties`), otherwise `1.0.0`.
- With `adhar.docs.security.enabled` (default `true`), it adds an HTTP bearer scheme named `bearer-jwt` and a global requirement for it.

```yaml
adhar:
  docs:
    title: Orders API
    description: Order intake and tracking
    contact:
      name: Orders team
      email: orders@example.com
```

### Show shipped specs in Swagger UI

When the service ships `api/v<major>/openapi.yaml` — `adhar:openapi` copies it into the jar — `ShippedSpecSwaggerUi` replaces Swagger UI's URL list with one entry per major version, such as `v1 (1.2.0)`, pointing at `/api/v1/openapi.yaml`. It applies only when all of these hold:

- `adhar-kit-commons` is on the classpath, with `adhar.commons.api-versioning.endpoints.enabled` not `false`;
- `adhar.docs.shipped-specs` is `true` (the default);
- you have not set `springdoc.swagger-ui.url` or `springdoc.swagger-ui.urls`.

Generating the code is the [Maven plugin's](/adhar-kit/modules/maven-plugin) job: `adhar-kit-parent` binds `adhar:openapi-lint` to `validate` and `adhar:openapi` to `generate-sources` once you declare the plugin.

### Document controllers with composed annotations

```java
import com.adhar.kit.docs.annotation.PageableParameters;
import com.adhar.kit.docs.annotation.SecuredEndpoint;
import com.adhar.kit.docs.annotation.StandardApiResponses;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    @GetMapping
    @StandardApiResponses   // 200, 400, 401, 403, 404, 500
    @PageableParameters     // page, size, sort query parameters
    @SecuredEndpoint        // security requirement "bearerAuth"
    public List<OrderDto> list(Pageable pageable) { … }
}
```

`@StandardApiResponses`, `@PageableParameters`, `@PageableDocumentation` and `@SecuredEndpoint` are meta-annotated with Swagger annotations, so springdoc reads them directly. `@SecuredEndpoint` names the scheme `bearerAuth`, while the default scheme is `bearer-jwt`: set `adhar.docs.security.scheme-name: bearerAuth` so the two match.

`@ApiGroup`, `@DeprecatedApi` and `@EnableOpenApiDocs` are plain metadata that no auto-configuration reads. Use them through `ApiGroupProcessor.processMultiple(classes)` (tags from `@ApiGroup`) or `SpringBootOpenApiIntegration.createFromAnnotation(App.class)` (an `OpenAPI` from `@EnableOpenApiDocs`), and register the result yourself.

### Add customizers

The customizers are not registered automatically. Each has a `customize(OpenAPI)` method, so it fits springdoc's `OpenApiCustomizer`:

```java
import com.adhar.kit.docs.ApiDocsFacade;
import com.adhar.kit.docs.customizer.AdharOpenApiCustomizer;
import com.adhar.kit.docs.customizer.ProblemDetailCustomizer;
import org.springdoc.core.customizers.OpenApiCustomizer;

@Configuration
class ApiDocsConfig {

    @Bean   // RFC 9457 application/problem+json bodies for 400, 401, 403, 404, 409, 422, 500
    OpenApiCustomizer problemDetails() {
        return new ProblemDetailCustomizer()::customize;
    }

    @Bean   // common headers such as X-Correlation-ID, and common responses
    OpenApiCustomizer adharDefaults() {
        return AdharOpenApiCustomizer.builder()
                .addCommonHeaders()
                .addCommonResponses()
                .build()::customize;
    }

    @Bean   // applies ApiDocsFacade's info, global headers and security schemes
    OpenApiCustomizer facade() {
        return (OpenApiCustomizer) ApiDocsFacade.getInstance().createOpenApiCustomizer();
    }
}
```

### Fail the build on breaking API changes

`OpenApiDiffService` compares two specs (JSON or YAML) and classifies each change as breaking or not:

```java
SpecDiffReport report = new OpenApiDiffService().diff(baselineYaml, candidateYaml);
if (report.hasBreakingChanges()) {
    throw new IllegalStateException(OpenApiDiffService.render(report));
}
```

`OpenApiDiffService` also has a `main(old, new)` that exits `1` on breaking changes, and `adhar.docs.diff.enabled=true` registers it as a bean. In a Maven build, prefer the plugin's `adhar:openapi-diff` goal.

### Generate an AsyncAPI document

With `adhar.docs.async-api.enabled=true`, the module builds an AsyncAPI 3.0.0 `AsyncApiDocument` bean from configured channels. It is not served over HTTP; export it:

```yaml
adhar:
  docs:
    async-api:
      enabled: true
      title: Order events
      channels:
        - name: orderCreated
          address: order-events
          action: SEND          # SEND, RECEIVE or SEND_AND_RECEIVE
          message-name: OrderCreated
```

```java
new AsyncApiSpecExporter().exportAll(asyncApiDocument, Path.of("target"));
// target/asyncapi.json and target/asyncapi.yaml
```

### Read the spec at runtime

`adhar.getApiDocs()` returns `ApiDocsFacade`. `getOpenApiSpec()` fetches `http://localhost:8080/v3/api-docs` (change it with `withBaseUrl(...)`); when the fetch fails — including a `403` from `adhar-kit-security` — it returns a minimal spec built from the facade's own settings. `getEndpoints()` lists the paths and methods, and `getSwaggerUiUrl()` the UI address.

## Configuration

All keys are under `adhar.docs` (`DocsProperties`). Swagger UI and the springdoc endpoints keep their own `springdoc.*` settings.

| Key | Default | Description |
|---|---|---|
| `enabled` | `true` | Module switch |
| `title` | `Adhar API Documentation` | Used only when set; otherwise `spring.application.name` |
| `description` | `API documentation for Adhar platform services` | `info.description` |
| `version` | `1.0.0` | Used when set, or when there is no build info |
| `terms-of-service-url` | — | `info.termsOfService` |
| `contact.name` / `.email` / `.url` | `Adhar Platform Team` / — / — | `info.contact` |
| `license.name` / `.url` | `Apache 2.0` / Apache License URL | `info.license` |
| `security.enabled` | `true` | Add the bearer scheme and a global requirement |
| `security.scheme-name` | `bearer-jwt` | Scheme name; `bearerAuth` matches `@SecuredEndpoint` |
| `security.scheme` / `.bearer-format` / `.description` | `bearer` / `JWT` / `JWT authentication` | Scheme details |
| `groups[n].name` / `.display-name` / `.packages-to-scan` / `.paths-to-match` | — | One springdoc `GroupedOpenApi` per entry |
| `shipped-specs` | `true` | Show shipped specs in Swagger UI |
| `diff.enabled` | `false` | Register `OpenApiDiffService` as a bean |
| `async-api.enabled` | `false` | Build the `AsyncApiDocument` bean |
| `async-api.title` / `.version` / `.description` | `Adhar Async API` / `1.0.0` / … | Document info |
| `async-api.channels[n].name` / `.address` / `.description` / `.action` / `.message-name` / `.payload-type` | — / name / — / `SEND` / `<name>Message` / `object` | One channel each |

## Limits

- **Spring MVC only.** The module depends on springdoc's WebMVC starter; there is no WebFlux variant.
- **The global security requirement covers every operation**, including public ones, while `adhar.docs.security.enabled` is `true`.
- **Keys with no effect in 0.1.0:** `adhar.docs.base-path`, `adhar.docs.show-actuator` and `adhar.docs.diff.fail-on-breaking` are declared but not read. The module's `adhar-kit-docs.reference.yml` uses older key names (`info.title`, `swagger-ui.*`) that do not bind; use the keys above and `springdoc.*`.

## Next steps

- [Maven Plugin](/adhar-kit/modules/maven-plugin) — `adhar:openapi`, `adhar:openapi-lint` and `adhar:openapi-diff`.
- [Commons](/adhar-kit/modules/commons) — API versioning and the shipped-spec endpoint.
- [Security](/adhar-kit/modules/security) — permitting the documentation paths.
- [Modules Overview](/adhar-kit/modules/overview) — the other modules.
