---
title: "Security"
section: "Modules"
order: 24
path: "/adhar-kit/modules/security"
---

# Security

`adhar-kit-security` turns a Spring Boot service into a stateless OAuth2 resource server: it builds the `SecurityFilterChain` and `JwtDecoder`, maps token claims to authorities, and adds method-level checks with `@RequiresRole` and `@RequiresPermission`. Opt-in extras cover rate limiting, API keys, a security audit log, self-issued tokens with refresh rotation, a JWKS endpoint and bearer-token relay. Use it when a service validates tokens from an identity provider such as Keycloak and enforces role- or permission-based access.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-security` |
| Toggle | `adhar.security.enabled` (default `true`) switches the auto-configuration. Facade gate `adhar.kit.modules.security` (default `true`); when `false`, `adhar.getSecurity()` throws `IllegalStateException` |
| Facade | `adhar.getSecurity()` → `SecurityFacade`, plus the shortcuts `adhar.hasRole(..)`, `adhar.hasPermission(..)`, `adhar.currentUserId()`, `adhar.isAuthenticated()`. Injectable beans: `SecurityService`, `JwtUtils`, and the opt-in `TokenRefreshService`, `ApiKeyService`, `SecurityAuditLogger`, `BearerTokenRelayInterceptor`, `JwksKeyManager` |
| Dependencies | Required: Spring Security, OAuth2 resource server, Spring MVC, AspectJ, Jackson. Optional: `jjwt` (token refresh), `spring-data-redis` (shared stores), `adhar-kit-dapr` (signing key from a secret store), OAuth2 client |
| Frameworks | Spring Boot (servlet stack) only. On other runtimes `SecurityFacade` has no delegate and fails closed |

## How it works

```diagram
nkc-security-layers
```

- **Servlet filters** run first. `RateLimitingFilter` (order `HIGHEST_PRECEDENCE + 10`) and `ApiKeyAuthenticationFilter` (`+ 20`) are registered on `/*` only when enabled, ahead of Spring Security.
- **The filter chain** decides whether a request may enter. It is `STATELESS` (no `HttpSession`). Its rules apply in order: health endpoints, `permit-all`, `authenticated`, `authorities`, then `anyRequest().authenticated()`. The first match wins. The JWT resource server is wired only when `issuer-uri` or `jwk-set-uri` is set.
- **The aspect** decides whether the authenticated principal may call a method. `AccessControlAspect` reads `@RequiresRole` / `@RequiresPermission` on the method, falling back to the class, and throws `com.adhar.kit.security.exception.AccessDeniedException` on failure.
- **The facade** answers the same questions from plain code. The `securityService` bean registers a `SpringSecurityAdapter` as the delegate of the `SecurityFacade` singleton, which reads `SecurityContextHolder` on every call.

The module also enables `@EnableMethodSecurity`, so Spring's own `@PreAuthorize` works alongside the kit annotations.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-security</artifactId>
    <version>0.1.0</version>
</dependency>
```

Token refresh signs tokens with JJWT, which the module declares optional. Add it if you set `token-refresh.enabled: true`:

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

For `store: redis` (rate limits or refresh tokens), add `spring-boot-starter-data-redis` so a `StringRedisTemplate` bean exists.

## Use it

### Validate tokens from your identity provider

```yaml
adhar:
  security:
    jwt:
      jwk-set-uri: https://keycloak.example.com/realms/adhar/protocol/openid-connect/certs
      authorities-claim-name: groups
    authorization:
      permit-all:
        - /v3/api-docs/**
      authorities:
        "/admin/**": [ROLE_admin]
```

`/actuator/health`, `/actuator/health/**` and `/actuator/info` are open by default (`permit-health-endpoints`), so Kubernetes probes work. Every other unlisted path needs a valid token.

The registered `jwtAuthenticationConverter` reads `authorities-claim-name` and adds the prefix `ROLE_`, so a claim value `admin` becomes the authority `ROLE_admin`. URL `authorities` rules compare the full authority string; `hasRole` accepts either form.

### Enforce access on methods

```java
package com.example.orders;

import com.adhar.kit.security.SecurityFacade;
import com.adhar.kit.security.annotation.CheckMode;
import com.adhar.kit.security.annotation.RequiresPermission;
import com.adhar.kit.security.annotation.RequiresRole;
import com.adhar.kit.security.exception.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
@RequiresRole("ORDERS_USER")                       // class-level baseline
public class OrderAdminService {

    private final OrderRepository orders;
    private final SecurityFacade security = SecurityFacade.getInstance();

    public OrderAdminService(OrderRepository orders) {
        this.orders = orders;
    }

    @RequiresRole("ADMIN")                         // replaces the class-level @RequiresRole
    public void deleteOrder(Long id) {
        orders.deleteById(id);
    }

    @RequiresRole(value = {"AUDITOR", "COMPLIANCE"}, mode = CheckMode.ALL_OF)
    public Report complianceReport() {
        return orders.buildComplianceReport();
    }

    @RequiresPermission({"order:read", "order:export"})   // ANY_OF by default
    public byte[] exportOrders() {
        return orders.exportAll();
    }

    // Data-dependent rules: check inline with the facade.
    public Order view(Long id) {
        Order order = orders.findById(id).orElseThrow();
        String caller = security.getCurrentUserId();
        if (!order.getOwnerId().equals(caller) && !security.hasPermission("order:read:any")) {
            throw new AccessDeniedException("order " + id + " is not owned by " + caller);
        }
        return order;
    }
}
```

How the checks resolve:

| Rule | Behaviour |
| --- | --- |
| Method vs class | Per annotation type, the method-level annotation wins; the class-level one applies only when the method has none |
| Role and permission | Roles are checked first, then permissions; when both apply, both must pass |
| `mode` | `CheckMode.ANY_OF` (default) or `CheckMode.ALL_OF` |
| `hasRole("ADMIN")` | Matches authority `ADMIN` or `ROLE_ADMIN` |
| `hasPermission("order:read")` | Matches authority `order:read` or `SCOPE_order:read` |
| `getCurrentUserId()` | The JWT `sub` claim, otherwise `Authentication.getName()` |
| `getCurrentUsername()` | The `jwt.username-claim-name` claim, falling back to `sub` |
| `getCurrentUserRoles()` | Every authority with `ROLE_` stripped |

The module ships no `@ControllerAdvice`, so an `AccessDeniedException` from the aspect surfaces as `500`. Map it to `403`:

```java
package com.example.web;

import com.adhar.kit.security.exception.AccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AuthorizationExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail onAccessDenied(AccessDeniedException ex) {
        // The message names the required roles; do not echo it to the caller.
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Forbidden");
    }
}
```

### Forward the caller's token downstream

With `token-relay.enabled: true`, register the interceptor on a client. It copies the inbound `Bearer` header to the outbound request unless that request already sets `Authorization`.

```java
import com.adhar.kit.security.relay.BearerTokenRelayInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestClient;

@Bean
RestClient inventoryClient(RestClient.Builder builder, BearerTokenRelayInterceptor relay) {
    return builder.baseUrl("http://inventory").requestInterceptor(relay).build();
}
```

### Authenticate machine clients with API keys

Configure the SHA-256 hex hash of each key, never the key itself (`printf '%s' "$KEY" | sha256sum`). Roles become authorities verbatim, with no `ROLE_` prefix added.

```yaml
adhar:
  security:
    api-key:
      enabled: true
      header-name: X-API-Key
      keys:
        - key-hash: <sha256-hex-of-key>
          principal: billing-job
          roles: [ROLE_BATCH]
```

A request without the header passes through to the other mechanisms; an unknown key gets `401` with a JSON body.

### Issue your own tokens

With `token-refresh.enabled: true` and JJWT on the classpath, `TokenRefreshService` issues HMAC-signed access/refresh pairs with rotation and reuse detection.

```java
import com.adhar.kit.security.service.TokenRefreshService;
import com.adhar.kit.security.service.TokenRefreshService.TokenResponse;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SessionTokens {

    private final TokenRefreshService tokens;

    public SessionTokens(TokenRefreshService tokens) {
        this.tokens = tokens;
    }

    public TokenResponse login(String userId) {
        return tokens.createTokenPair(userId, Map.of("tenant", "acme"));
    }

    public TokenResponse refresh(String refreshToken) {
        return tokens.refreshAccessToken(refreshToken);   // rotates the refresh token
    }

    public void logoutEverywhere(String userId) {
        tokens.revokeAllUserTokens(userId);
    }
}
```

Presenting an already-rotated refresh token revokes its whole family and throws `TokenRefreshException`. `SecurityFacade.generateToken`, `validateToken` and `extractUserId` delegate to this service; without it they throw or return `false`/`null`.

## Configuration

All keys sit under `adhar.security`.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | Master switch for the auto-configuration |
| `jwt.enabled` | boolean | `true` | Register the `JwtDecoder` |
| `jwt.issuer-uri` | String | — | Issuer; the decoder fetches OIDC discovery metadata at startup |
| `jwt.jwk-set-uri` | String | — | JWK set endpoint; keys are fetched on first use. Wins over `issuer-uri` |
| `jwt.audience` | List | empty | Read only by `JwtUtils.validateAudience`; not enforced by the decoder |
| `jwt.authorities-claim-name` | String | `authorities` | Claim mapped to authorities (with `ROLE_` prefix) |
| `jwt.username-claim-name` / `name-claim-name` / `email-claim-name` | String | `sub` / `name` / `email` | Claims read by `getCurrentUsername()` and `JwtUtils.extract*` |
| `jwt.additional-claims` | List | empty | Claims returned by `JwtUtils.extractAdditionalClaims` |
| `oauth2.enabled` | boolean | `true` | Wire the resource server into the chain (needs a JWT endpoint) |
| `authorization.enabled` | boolean | `true` | Apply URL rules; when `false`, the chain adds no `authorizeHttpRequests` block |
| `authorization.permit-health-endpoints` | boolean | `true` | Open `/actuator/health`, `/actuator/health/**`, `/actuator/info` |
| `authorization.permit-all` | List | empty | Paths open to anyone |
| `authorization.authenticated` | List | empty | Paths needing any authenticated principal |
| `authorization.authorities` | Map&lt;String, List&gt; | empty | Path → authorities, applied with `hasAnyAuthority` |
| `cors.enabled` | boolean | `true` | Register `CorsConfigurationSource` and `CorsFilter` for `/**` |
| `cors.allowed-origins` | List | empty (`*`) | Allowed origins; empty means `*` |
| `cors.allowed-methods` / `allowed-headers` / `exposed-headers` | List | `GET, POST, PUT, DELETE, OPTIONS` / `*` / empty | Methods, request headers, exposed headers |
| `cors.allow-credentials` | boolean | `true` | Applied only when `allowed-origins` is set |
| `cors.max-age` | long | `3600` | Preflight cache, seconds |
| `csrf.enabled` | boolean | `false` | CSRF with a JavaScript-readable cookie (`CookieCsrfTokenRepository.withHttpOnlyFalse()`); enable for cookie-authenticated browser apps |
| `csrf.ignore-ant-matchers` | List | empty | Paths exempt from CSRF |
| `rbac.enabled` | boolean | `true` | Register `AccessControlAspect` |
| `rate-limit.enabled` | boolean | `false` | Register `RateLimitingFilter` |
| `rate-limit.max-requests` | int | `100` | Requests per window per client |
| `rate-limit.window-seconds` | int | `60` | Fixed window length |
| `rate-limit.store` / `redis-key-prefix` | String | `memory` / `adhar:security:ratelimit:` | Counter store (`memory` or `redis`) and its key namespace |
| `api-key.enabled` | boolean | `false` | Register `ApiKeyService` and its filter |
| `api-key.header-name` | String | `X-API-Key` | Header carrying the key |
| `api-key.keys[].key-hash` / `.principal` / `.roles` | String / String / List | — | One entry per accepted key |
| `audit.enabled` | boolean | `false` | Register `SecurityAuditLogger` and `Slf4jAuditEventSink` |
| `audit.log-successful-auth` / `log-failed-auth` / `log-logout` | boolean | `true` | Which events to record |
| `token-refresh.enabled` | boolean | `false` | Register `TokenRefreshService` |
| `token-refresh.secret` | String | — | HMAC key, at least 32 characters |
| `token-refresh.access-token-validity-seconds` / `refresh-token-validity-seconds` | long | `900` / `604800` | Token lifetimes |
| `token-refresh.rotate-refresh-tokens` | boolean | `true` | Issue a new refresh token on each use |
| `token-refresh.store` / `redis-key-prefix` | String | `memory` / `adhar:security:refresh:` | Refresh-token store (`memory` or `redis`) and its key namespace |
| `jwks.enabled` | boolean | `false` | Register `JwksKeyManager` and `JwksController` |
| `jwks.path` | String | `/.well-known/jwks.json` | Where the public key set is served |
| `jwks.key-size` / `retain-keys` | int | `2048` / `1` | RSA key size; previous keys kept after `rotate()` |
| `token-relay.enabled` / `header-name` | boolean / String | `false` / `Authorization` | Register `BearerTokenRelayInterceptor`; inbound header to relay |
| `dapr.secret-store` / `jwt-secret-name` | String | `secretstore` / — | When the name is set (with `adhar-kit-dapr` and `adhar.dapr.enabled=true`), the token-refresh secret is read from Dapr and overrides `token-refresh.secret` |

## Operations

- **Rate limiting.** Each response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`. Over the limit the filter returns `429` with `Retry-After` and a JSON body. Clients are keyed by the first `X-Forwarded-For` entry, then `X-Real-IP`, then the remote address.
- **Audit.** `SecurityAuditLogger` listens for Spring Security authentication-success, bad-credentials, locked and logout events and writes one JSON line per event to the `SECURITY_AUDIT` logger (`WARN` for failures, `INFO` otherwise). Call `logCustomEvent(..)` for your own events. Replace the `AuditEventSink` bean to send them somewhere durable.
- **Startup.** With `issuer-uri` only, an unreachable identity provider fails the context; `jwk-set-uri` defers the fetch to the first request. With authorization on and no JWT endpoint, the module logs a warning, because no request can authenticate.
- **Failure behaviour.** The facade, the aspect and the chain all fail closed. Without a delegate, `SecurityFacade` returns `false`/`null`/empty for checks and throws `IllegalStateException` from `generateToken` and `encodePassword`.
- **Overriding.** Every bean is `@ConditionalOnMissingBean`. Your own `SecurityFilterChain` replaces the default entirely: URL rules, CORS, CSRF and the resource server.

## Limits

- **Self-invocation skips the annotations.** The aspect runs in a Spring AOP proxy; `this.deleteOrder(id)`, private methods and `final` methods under CGLIB are never checked. Call through the injected bean, or check inline with the facade.
- **Audience is not enforced.** The decoder has no extra `OAuth2TokenValidator`. Call `JwtUtils.validateAudience(jwt)` yourself, or supply a `JwtDecoder` with an audience validator.
- **The default chain does not name the converter.** It calls `oauth2ResourceServer().jwt()` and relies on Spring Security finding the `jwtAuthenticationConverter` bean. Check the authorities on a real token (`getCurrentUserRoles()`); if they are not what `authorities-claim-name` implies, set the converter on your own chain.
- **The API-key filter sits outside the chain.** It sets `SecurityContextHolder` before Spring Security runs. Cover API-key routes with an integration test; if the principal does not reach your endpoint, add `ApiKeyAuthenticationFilter` inside your own chain with `http.addFilterBefore(..)`.
- **Self-issued tokens are HMAC, the chain expects your IdP.** Tokens from `TokenRefreshService` do not validate against `jwk-set-uri`. Without a 32-character secret it generates a random one per instance, so tokens break across pods and restarts.
- **The JWKS endpoint needs a permit rule** (`permit-all: [/.well-known/jwks.json]`). Its RSA keys are generated in memory at startup, so they change on restart and differ per pod.
- **In-memory stores are per pod.** Rate-limit windows and refresh-token families reset on restart; use `store: redis` for shared state. `X-Forwarded-For` is trusted as sent, so put the service behind a proxy that overwrites it.
- **Session login does not work.** The chain is `STATELESS`; authenticate every request with a bearer token or API key.
- **Some keys bind but do nothing.** `headers.*`, `csp.*`, `authentication.*`, the OAuth2 client fields (`oauth2.client-id`, `token-uri`, …), `authorization.decision-manager`, `authorization.access-denied-handler` and the `csrf` cookie/header fields are not read by any auto-configured bean. Response headers are Spring Security's defaults.
- **`adhar.security.enabled: false` does not mean unsecured.** Spring Boot's own security auto-configuration takes over, with its generated default user.

## Next steps

- [GraphQL](/adhar-kit/modules/graphql) — reads the `Authentication` this module populates for field authorization.
- [Dapr](/adhar-kit/modules/dapr) — the secret store behind `dapr.jwt-secret-name`.
- [Platform services](/docs/core-concepts/platform-services) — Keycloak, the identity provider to point `jwk-set-uri` at.
- [Concepts](/adhar-kit/concepts) — module toggles, auto-configuration and the facade model.
