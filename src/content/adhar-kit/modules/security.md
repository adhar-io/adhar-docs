---
title: "Security"
section: "Modules"
order: 24
path: "/adhar-kit/modules/security"
---

# Security

Standing up a correctly secured Spring service means assembling a `SecurityFilterChain`, a `JwtDecoder`, an authorities converter, a CORS source, a CSRF repository, headers, and a rate limiter — a dozen beans you get wrong once and then copy forever. `adhar-kit-security` **ships that assembly as a starter with secure defaults**, so a service points at its identity provider and is a working OAuth2 resource server; everything else is a toggle.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-security` |
| Built on | Spring Security, OAuth2 resource server and client, Nimbus JOSE+JWT, JJWT, Spring AOP; optional Redis, Dapr |
| Entry points | `SecurityFacade` / `SecurityService`, `@RequiresRole`, `@RequiresPermission`, `JwtUtils` |
| Config prefix | `adhar.security` |
| Use it when | A service validates OIDC tokens and enforces role- or permission-based access |

## How it works

Two layers, and it helps to keep them apart. The **filter chain** decides whether a request may enter the application at all. The **aspect** decides whether an authenticated principal may invoke a particular method.

```diagram
kit-security-layers
```

### The default filter chain, as built

`securityFilterChain(HttpSecurity)` is `@ConditionalOnMissingBean`, so defining any `SecurityFilterChain` of your own replaces the whole thing. What it configures, in order:

1. `sessionManagement` → `SessionCreationPolicy.STATELESS`. No `HttpSession` is created or consulted. Form login and session-based flows do not work; every request carries its own credential.
2. When `authorization.enabled` (default `true`), an `authorizeHttpRequests` block in exactly this order — `permit-all` patterns, then `authenticated` patterns, then the `authorities` map applied with `hasAnyAuthority`, and finally **`anyRequest().authenticated()`**. Spring Security matches top to bottom and the first match wins, so anything not explicitly listed falls through to the last rule and requires a token. That final line is the single most load-bearing default on this page: it is why actuator, Swagger and any unlisted path start returning 401 the moment the module is on the classpath.
3. CORS from `corsConfigurationSource()` when `cors.enabled`. With no `allowed-origins` configured the source is built with `*`.
4. CSRF when `csrf.enabled` (default `true`), using `CookieCsrfTokenRepository.withHttpOnlyFalse()` so a browser SPA can read and echo the token; otherwise CSRF is explicitly disabled.
5. `oauth2ResourceServer().jwt()` **only when** `oauth2.enabled` and `jwt.enabled` are true *and* an `issuer-uri` or `jwk-set-uri` is actually set. Without a configured endpoint there is no `JwtDecoder` bean, and wiring the resource server would fail the chain build — so it is skipped rather than half-wired.

`OnJwtConfiguredCondition` is what gates that: an `AnyNestedCondition` matching when either `adhar.security.jwt.issuer-uri` or `adhar.security.jwt.jwk-set-uri` is present. It guards the `JwtDecoder` bean and the whole `OAuth2ResourceServerConfig` import.

### Filters that run before the chain

Two features are plain servlet filters registered through `FilterRegistrationBean` on `/*`, at `Ordered.HIGHEST_PRECEDENCE + 10` (rate limiting) and `+ 20` (API key). Both orders are far below Spring Security's filter-chain registration order of `-100`, so **they run before any Spring Security filter**:

- `RateLimitingFilter` sheds load before authentication work happens. It identifies a client by `X-Forwarded-For` (first entry), then `X-Real-IP`, then `getRemoteAddr()`, and returns `429` with a `Retry-After` header and a JSON body. Behind a proxy that does not set those headers, every caller shares one bucket.
- `ApiKeyAuthenticationFilter` reads the configured header, resolves it through `ApiKeyService`, and on success populates `SecurityContextHolder` with a `UsernamePasswordAuthenticationToken` carrying the key's configured roles **verbatim as authorities** — no `ROLE_` prefix is added. It clears the context in a `finally` block. An invalid key short-circuits with `401` and a JSON body.

### Where the authorities come from

`jwtAuthenticationConverter` wires a `JwtGrantedAuthoritiesConverter` with `authoritiesClaimName` from configuration and **an authority prefix of `ROLE_`**. A claim value of `admin` therefore becomes the granted authority `ROLE_admin`. That prefix is why the facade's matching is prefix-tolerant on both sides.

## The facade and the delegate mechanism

`SecurityFacade` is a process-wide singleton (`getInstance()`) holding a `volatile SecurityService delegate`. At context refresh the `securityService` bean constructs a `SpringSecurityAdapter` and calls `SecurityFacade.getInstance().setDelegate(adapter)`. Every facade method forwards to the delegate when one is set.

That indirection is what lets framework-neutral code — the `AccessControlAspect`, your own domain services, a module with no Spring Security dependency — ask authorization questions. It also means the behaviour before the delegate is registered is worth knowing. **With no delegate the facade fails closed:**

| Method | No-delegate behaviour |
| --- | --- |
| `hasRole`, `hasPermission`, `isAuthenticated`, `validateToken` | `false` |
| `getCurrentUserId`, `getCurrentUsername`, `extractUserId` | `null` |
| `getCurrentUserRoles` | empty set |
| `generateToken`, `encodePassword` | throw `IllegalStateException` rather than fake a result |

Failing closed is right, but it is silent for the boolean checks: a bean that calls `SecurityFacade.getInstance().hasRole(...)` from its own constructor, before the `securityService` bean exists, gets `false` and no error. Call the facade from request-handling code, not from construction.

### How the principal is resolved

`SpringSecurityAdapter` reads `SecurityContextHolder` on every call and treats a null, unauthenticated, or `AnonymousAuthenticationToken` authentication as "no user".

- `getCurrentUserId()` — the JWT `sub` claim for a `JwtAuthenticationToken` or `Jwt` principal, otherwise `authentication.getName()`.
- `getCurrentUsername()` — `JwtUtils.extractUsername`, driven by `jwt.username-claim-name` (default `sub`), falling back to the subject.
- `getCurrentUserRoles()` — every authority with any `ROLE_` prefix stripped.
- `hasRole("ADMIN")` — matches an authority of `ADMIN` **or** `ROLE_ADMIN`.
- `hasPermission("order:read")` — matches an authority of `order:read` **or** `SCOPE_order:read`, which is the form the resource server produces from OAuth2 scopes.

Because the context is a thread-local, none of this works on a thread you spawned yourself. Resolve the principal on the request thread and pass the value.

## The aspect, and proxy mechanics

`AccessControlAspect` is a `@ConditionalOnMissingBean` bean registered whenever `adhar.security.rbac.enabled` is not `false`, and `spring-boot-starter-aspectj` is a direct (non-optional) dependency of the module, so there is nothing to switch on. Its pointcut covers `@annotation` and `@within` for both `@RequiresRole` and `@RequiresPermission`.

Resolution order inside the advice:

1. The most specific method is resolved with `AopUtils.getMostSpecificMethod` against the target class, so annotations on an implementation are seen even when the call arrives through an interface.
2. For each annotation type independently: the **method-level** annotation wins; only if absent is the **class-level** one used. A method-level `@RequiresRole` replaces the class-level `@RequiresRole` but leaves a class-level `@RequiresPermission` in force.
3. Role check first, then permission check. When both apply, **both must pass**.
4. `CheckMode.ANY_OF` (default) versus `CheckMode.ALL_OF` selects `hasAnyRole`/`hasAllRoles`, and `anyMatch`/`allMatch` over `hasPermission`.

> **Self-invocation silently disables the annotation.** The aspect runs in a Spring AOP proxy, so it only sees calls that arrive *through* the proxy. A `this.deleteOrder(id)` call from another method in the same class bypasses the proxy entirely and the `@RequiresRole` on `deleteOrder` is never evaluated — no error, no log line, no check. The same applies to a private method, a `final` method under CGLIB proxying, and any call made before the bean is proxied. Call through an injected reference to the bean (or split the methods into two beans), or do the check inline with the facade.

### What happens on a valid token that lacks the authority

Walk it through, because the answer differs by layer:

| Layer | Outcome |
| --- | --- |
| Filter chain, `anyRequest().authenticated()` | **Passes.** The token is valid and the principal is authenticated; authorities are not consulted |
| Filter chain, an `authorization.authorities` entry matching the path | Spring Security's own `AccessDeniedException` → `403` |
| Aspect, `@RequiresRole` / `@RequiresPermission` | Throws `com.adhar.kit.security.exception.AccessDeniedException` — a plain `RuntimeException`, deliberately *not* Spring Security's, so portable callers need no Spring Security dependency |

That last row has a consequence the module does not solve for you: it ships **no `@ControllerAdvice` and no `@ResponseStatus`**, so an unhandled `AccessDeniedException` from the aspect surfaces as a `500`, not a `403`. Add a handler.

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
        // The message names the roles/permissions required - do not echo it to the caller.
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Forbidden");
    }
}
```

## Worked example: layered authorization

```java
package com.example.orders;

import com.adhar.kit.security.SecurityFacade;
import com.adhar.kit.security.annotation.CheckMode;
import com.adhar.kit.security.annotation.RequiresPermission;
import com.adhar.kit.security.annotation.RequiresRole;
import com.adhar.kit.security.exception.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
@RequiresRole("ORDERS_USER")                 // class-level baseline
public class OrderAdminService {

    private final OrderRepository orders;
    private final SecurityFacade security = SecurityFacade.getInstance();

    public OrderAdminService(OrderRepository orders) {
        this.orders = orders;
    }

    @RequiresRole("ADMIN")                   // replaces the class-level @RequiresRole
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

    /**
     * Ownership is data-dependent, so the annotation model cannot express it.
     * Check inline against the resolved principal instead.
     */
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

Use annotations for coarse, static rules and the facade for anything that depends on the data being accessed.

## Minimal: validate tokens from your IdP

```yaml
adhar:
  security:
    jwt:
      issuer-uri: https://keycloak.example.com/realms/adhar
      jwk-set-uri: https://keycloak.example.com/realms/adhar/protocol/openid-connect/certs
      authorities-claim-name: groups
    authorization:
      permit-all:
        - /actuator/health/**
        - /actuator/info
```

> **`issuer-uri` on its own makes startup depend on the IdP.** `NimbusJwtDecoder.withIssuerLocation(...)` resolves OIDC discovery metadata eagerly while the bean is created, so an unreachable Keycloak fails the context. `jwk-set-uri` builds the decoder lazily and fetches keys on first use. When both are set, `jwk-set-uri` wins. Prefer it for services that must start before the IdP is reachable, and keep `issuer-uri` for discovery convenience in environments where ordering is guaranteed.

There is a second trap in the same block of configuration.

> **`adhar.security.jwt.audience` is not enforced by the decoder.** The `JwtDecoder` is built with no additional `OAuth2TokenValidator`, so the configured audience list is never applied automatically. `JwtUtils.validateAudience(jwt)` exists and reads it, but nothing in the module calls it. If audience restriction matters, call it yourself or supply your own `JwtDecoder` bean with the validator attached.

## How it behaves

- **Thread-safety.** `SecurityFacade` and `SpringSecurityAdapter` are singletons and hold no per-request state; everything comes from the thread-local `SecurityContextHolder`. The delegate reference is `volatile`, so a late `setDelegate` is visible to other threads.
- **Lifecycle.** The delegate is registered when the `securityService` bean is created. Filters and the chain are built once at startup; changing `adhar.security.*` at runtime has no effect without a restart.
- **Failure behaviour.** The facade fails closed. The aspect fails closed. The filter chain fails closed on `anyRequest().authenticated()`. The one place the module fails *open* is conditional registration: `rate-limit`, `api-key`, `audit`, `token-refresh`, `jwks` and `token-relay` all default to disabled, and `audit.enabled: false` means no security audit trail at all until you turn it on.
- **Overriding.** Every bean is `@ConditionalOnMissingBean`. That is a sharp edge rather than a convenience for `SecurityFilterChain`: your own chain replaces the default entirely, including `anyRequest().authenticated()`, the CORS source and the CSRF repository. Note also that when a JWT endpoint is configured, the imported `OAuth2ResourceServerConfig` contributes a second chain bean named `oauth2SecurityFilterChain`. If you need certainty about which rules are in force, declare your own `SecurityFilterChain` and own the whole thing.
- **Resource bounds and distribution.** The default `RateLimiterStore` and `RefreshTokenStore` are in-process (`InMemoryRateLimiterStore`, `InMemoryRefreshTokenStore`). Limits are therefore per pod and reset on restart; refresh tokens do not survive a redeploy. Switching either `store` to `redis` requires `spring-data-redis` on the classpath, and uses key prefixes `adhar:security:ratelimit:` and `adhar:security:refresh:`.

## Key APIs

- **`SecurityFacade`** (`getInstance()`) and **`SecurityService`** — `getCurrentUserId`, `getCurrentUsername`, `getCurrentUserRoles`, `hasRole`, `hasAnyRole`, `hasAllRoles`, `hasPermission`, `isAuthenticated`, `generateToken(userId, roles[, claims])`, `validateToken`, `extractUserId`, `encodePassword`, `verifyPassword`, plus `setDelegate`, `clearDelegate`, `hasDelegate`. Also reachable as `adhar.hasRole(...)`, `adhar.hasPermission(...)`, `adhar.currentUserId()`, `adhar.isAuthenticated()`.
- **`@RequiresRole(value, mode)`** and **`@RequiresPermission(value, mode)`** — on a method or a class. `mode` is `CheckMode.ANY_OF` (default) or `CheckMode.ALL_OF`.
- **`JwtUtils`** — `extractJwt(authentication)`, `extractUsername`, `extractName`, `extractEmail`, `extractAuthorities`, `extractAdditionalClaims`, `validateAudience`. Which claims it reads is driven by `adhar.security.jwt.*-claim-name`.
- **`TokenRefreshService`** — for services that issue their own tokens: `createTokenPair(subject, claims)`, `refreshAccessToken(refreshToken)`, `generateAccessToken`, `revokeRefreshToken`, `revokeAllUserTokens(userId)`. Also the prerequisite for `SecurityFacade.generateToken`/`validateToken`/`extractUserId`, which throw or return falsy without it.
- **`ApiKeyService`** — validates SHA-256 hashes of configured keys; paired with `ApiKeyAuthenticationFilter`.
- **`SecurityAuditLogger`** and the `AuditEventSink` SPI (`Slf4jAuditEventSink` by default) — swap the sink to route audit events somewhere durable.
- **`BearerTokenRelayInterceptor`** — a `ClientHttpRequestInterceptor` you register on a `RestClient`/`RestTemplate` builder. It copies the inbound `Authorization` header outbound, and only when the outbound request does not already set one.
- **`JwksKeyManager` / `JwksController`** — publish your own JWKS at `/.well-known/jwks.json` when this service signs tokens.
- **`DaprSecretKeyProvider`** — when `adhar-kit-dapr` is present, Dapr is enabled and `adhar.security.dapr.jwt-secret-name` is set, the signing key is fetched from the Dapr secret store and **overrides** `token-refresh.secret`.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.security.enabled` | Master switch | `true` |
| `adhar.security.jwt.issuer-uri` | Expected token issuer; resolved eagerly at startup | — |
| `adhar.security.jwt.jwk-set-uri` | Signing key endpoint; lazy, and wins over `issuer-uri` | — |
| `adhar.security.jwt.audience` | Read only by `JwtUtils.validateAudience`, not enforced | empty |
| `adhar.security.jwt.authorities-claim-name` | Claim holding roles; values get a `ROLE_` prefix | `authorities` |
| `adhar.security.jwt.username-claim-name` | Claim holding the user name | `sub` |
| `adhar.security.jwt.email-claim-name` | Claim holding the email | `email` |
| `adhar.security.authorization.enabled` | Apply URL authorization rules | `true` |
| `adhar.security.authorization.permit-all` | Paths open to anyone | empty |
| `adhar.security.authorization.authenticated` | Paths needing any authenticated user | empty |
| `adhar.security.authorization.authorities` | Map of path to required authorities | empty |
| `adhar.security.cors.enabled` | CORS configuration source | `true` |
| `adhar.security.cors.allowed-methods` | Permitted methods | `GET, POST, PUT, DELETE, OPTIONS` |
| `adhar.security.cors.allow-credentials` | Send credentials cross-origin | `true` |
| `adhar.security.headers.hsts-max-age-seconds` | HSTS lifetime | `31536000` |
| `adhar.security.headers.frame-options-value` | X-Frame-Options | `DENY` |
| `adhar.security.headers.referrer-policy-value` | Referrer-Policy | `strict-origin-when-cross-origin` |
| `adhar.security.csp.enabled` | Content-Security-Policy | `true` |
| `adhar.security.csrf.enabled` | CSRF protection | `true` |
| `adhar.security.csrf.ignore-ant-matchers` | Paths exempt from CSRF | empty |
| `adhar.security.rate-limit.enabled` | Request rate limiting | `false` |
| `adhar.security.rate-limit.max-requests` | Requests per window | `100` |
| `adhar.security.rate-limit.window-seconds` | Window length | `60` |
| `adhar.security.rate-limit.store` | `memory` or `redis` | `memory` |
| `adhar.security.audit.enabled` | Security audit logging | `false` |
| `adhar.security.token-refresh.enabled` | Issue and rotate tokens here | `false` |
| `adhar.security.token-refresh.access-token-validity-seconds` | Access token lifetime | `900` |
| `adhar.security.token-refresh.refresh-token-validity-seconds` | Refresh token lifetime | `604800` |
| `adhar.security.token-refresh.rotate-refresh-tokens` | New refresh token per use | `true` |
| `adhar.security.token-refresh.store` | `memory` or `redis` | `memory` |
| `adhar.security.api-key.enabled` | API-key authentication | `false` |
| `adhar.security.api-key.header-name` | API-key header | `X-API-Key` |
| `adhar.security.rbac.enabled` | Register `AccessControlAspect` | `true` |
| `adhar.security.jwks.enabled` | Serve a JWKS document | `false` |
| `adhar.security.token-relay.enabled` | Forward bearer tokens downstream | `false` |

## Testing

`adhar-kit-test-commons` carries nothing security-specific; use `spring-security-test`, which this module itself depends on at test scope.

1. **Annotation enforcement** — `@SpringBootTest` with `@WithMockUser(authorities = "ROLE_ADMIN")`, then assert `AccessDeniedException` is thrown for a user without it. Call the bean **through the injected proxy**, never a `new`-ed instance, or the aspect is not in the picture and the test passes vacuously.
2. **Facade-based checks** — unit-test them without Spring by setting a stub: `SecurityFacade.getInstance().setDelegate(myFakeSecurityService)`. Because the facade is a process-wide singleton, call `clearDelegate()` in an `@AfterEach` or the stub leaks into every subsequent test in the JVM.
3. **URL rules** — `@WebMvcTest` with `MockMvc` and `.with(jwt().authorities(...))` from `spring-security-test` exercises the real chain, which is the only way to catch a missing `permit-all` entry.
4. **Turning the module off** — `adhar.security.enabled: false` backs off the whole auto-configuration, which means the service is then **completely unsecured**. Use it for slice tests of unrelated code, never as a production escape hatch.
5. **Keeping the aspect but not the chain** — set `adhar.security.rbac.enabled: false` to drop the aspect alone, or define your own `SecurityFilterChain` to replace the chain alone.

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Health and metrics endpoints start returning 401 | The default chain ends in `anyRequest().authenticated()` | Add those paths to `adhar.security.authorization.permit-all` |
| Every request is 403 after wiring the IdP | `authorities-claim-name` does not match the claim your IdP emits | Decode a real token; Keycloak commonly uses `groups` or `realm_access.roles`, not `authorities` |
| Authority names have an unexpected `ROLE_` prefix | The converter is configured with an authority prefix of `ROLE_` | Expected; `hasRole` matches with or without it, URL `authorities` rules do not |
| An annotation denial returns 500 instead of 403 | The module ships no `@ControllerAdvice` for its `AccessDeniedException` | Add an `@ExceptionHandler`, as shown above |
| `@RequiresRole` ignored | The call is a self-invocation inside the same bean, so no proxy is involved | Call through the injected bean, or check inline with the facade |
| Tokens from the wrong client are accepted | `jwt.audience` is configured but never enforced | Call `JwtUtils.validateAudience`, or supply your own `JwtDecoder` with the validator |
| The service will not start when the IdP is down | `issuer-uri` resolves OIDC metadata eagerly | Use `jwk-set-uri` |
| Session-based login does not stick | The chain is `SessionCreationPolicy.STATELESS` by design | Authenticate per request with a bearer token or API key |
| Rate limits reset on every deploy and differ per pod | The default store is in-process | Set `rate-limit.store: redis` with `spring-data-redis` on the classpath |
| All callers share one rate-limit bucket | The proxy does not set `X-Forwarded-For` or `X-Real-IP` | Configure the proxy to forward the client address |
| Refresh tokens stop working after a restart | `token-refresh.store` is `memory` | Use `redis`, or accept re-authentication |
| Audit trail missing | `audit.enabled` defaults to `false` | Turn it on; replace `Slf4jAuditEventSink` for durable storage |
| CSRF blocks a machine-to-machine API | CSRF is on by default and stateless clients cannot carry a token | Add those paths to `csrf.ignore-ant-matchers` |
| Nothing is secured at all | `adhar.security.enabled: false`, or your own `SecurityFilterChain` bean took precedence | Every bean is `@ConditionalOnMissingBean` — a custom chain replaces the whole default |
| API keys appear to be ignored | The configured key is the raw value, not its SHA-256 hash | `api-key.keys[].key-hash` expects a hash |

## See also

- [Platform Services](/docs/core-concepts/platform-services) — Keycloak as the platform's identity provider, and the realm URIs to point `issuer-uri` at.
- [Accessing the Platform](/docs/operations/accessing-the-platform) — obtaining tokens and reaching protected services.
- [Security Best Practices](/docs/security/security-best-practices) — the platform-level hardening guidance this module implements at the service level.
- [GraphQL](/adhar-kit/modules/graphql) — reads the `Authentication` this module populates for `@auth` field authorization.
