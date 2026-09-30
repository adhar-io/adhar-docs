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

```text
 HTTP request
     │
 ┌───▼──────────────── servlet filters ─────────────────────┐
 │ SecurityHeadersFilter      HSTS, CSP, frame-options, …   │
 │ RateLimitingFilter         memory or Redis store         │
 │ ApiKeyAuthenticationFilter X-API-Key → principal         │
 └───┬──────────────────────────────────────────────────────┘
 ┌───▼──────────────── SecurityFilterChain ─────────────────┐
 │ sessions STATELESS                                       │
 │ CORS   → CsrfTokenRepository → oauth2ResourceServer.jwt  │
 │      └─ JwtDecoder validates, JwtUtils maps claims       │
 │         to the GrantedAuthority set                      │
 │ authorization: permit-all / authenticated / authorities, │
 │                then anyRequest().authenticated()         │
 └───┬──────────────────────────────────────────────────────┘
     │  SecurityContext populated
     ▼
 @RequiresRole / @RequiresPermission
     │  AccessControlAspect (@Around)
     │      ├─ method-level annotation wins over class-level
     │      ├─ role AND permission constraints must both pass
     │      └─ failure → AccessDeniedException
     ▼
 your method
```

`SpringSecurityAdapter` implements the framework-neutral `SecurityService` and registers itself as the delegate of the singleton `SecurityFacade` at startup. That is why `SecurityFacade.getInstance()` works from code that has no Spring dependency, and why the aspect can evaluate roles without importing Spring Security types.

**The aspect works because `spring-boot-starter-aspectj` is a direct dependency of the module**, and the `AccessControlAspect` bean is registered whenever `adhar.security.rbac.enabled` is not `false`. There is nothing to switch on — but the usual proxy rule applies: the annotation is only honoured on calls that arrive through the Spring proxy, never on a self-invocation inside the same bean.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-security</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`SecurityFacade`** (`getInstance()`) and **`SecurityService`** — `getCurrentUserId`, `getCurrentUsername`, `getCurrentUserRoles`, `hasRole`, `hasAnyRole`, `hasAllRoles`, `hasPermission`, `isAuthenticated`, `generateToken(userId, roles[, claims])`, `validateToken`, `extractUserId`, `encodePassword`, `verifyPassword`. Also reachable as `adhar.hasRole(...)`, `adhar.hasPermission(...)`, `adhar.currentUserId()`, `adhar.isAuthenticated()`.
- **`@RequiresRole(value, mode)`** and **`@RequiresPermission(value, mode)`** — on a method or a class. `mode` is `CheckMode.ANY_OF` (default) or `CheckMode.ALL_OF`.
- **`JwtUtils`** — `extractJwt(authentication)`, `extractUsername`, `extractName`, `extractEmail`, `extractAuthorities`, `extractAdditionalClaims`, `validateAudience`. Which claims it reads is driven by `adhar.security.jwt.*-claim-name`.
- **`TokenRefreshService`** — for services that issue their own tokens: `createTokenPair(subject, claims)`, `refreshAccessToken(refreshToken)`, `generateAccessToken`, `revokeRefreshToken`, `revokeAllUserTokens(userId)`, returning a `TokenResponse` record. Backed by `InMemoryRefreshTokenStore` or `RedisRefreshTokenStore`.
- **`ApiKeyService`** — validates SHA-256 hashes of configured keys; paired with `ApiKeyAuthenticationFilter`.
- **`SecurityAuditLogger`** and the `AuditEventSink` SPI (`Slf4jAuditEventSink` by default) — swap the sink to route audit events somewhere durable.
- **`BearerTokenRelayInterceptor`** — forwards the caller's bearer token on outbound calls, so a downstream service sees the original user.
- **`JwksKeyManager` / `JwksController`** — publish your own JWKS at `/.well-known/jwks.json` when this service signs tokens.

## Minimal: validate tokens from your IdP

```yaml
adhar:
  security:
    jwt:
      issuer-uri: https://keycloak.example.com/realms/adhar
      jwk-set-uri: https://keycloak.example.com/realms/adhar/protocol/openid-connect/certs
      authorities-claim-name: groups
```

The `JwtDecoder` bean is created only when JWT is actually configured (`OnJwtConfiguredCondition`), so a service with no `issuer-uri` starts without a half-wired resource server.

## Realistic: layered authorization

```java
@Service
@RequiresRole("ORDERS_USER")          // class-level baseline
public class OrderAdminService {

    private final SecurityFacade security = SecurityFacade.getInstance();

    @RequiresRole("ADMIN")            // method-level overrides the class baseline
    public void deleteOrder(Long id) { /* … */ }

    @RequiresRole(value = {"AUDITOR", "COMPLIANCE"}, mode = CheckMode.ALL_OF)
    public Report complianceReport() { /* … */ }

    @RequiresPermission({"order:read", "order:export"})   // ANY_OF by default
    public byte[] exportOrders() { /* … */ }

    public Order view(Long id) {
        Order order = orders.get(id);
        if (!order.getOwnerId().equals(security.getCurrentUserId())
                && !security.hasPermission("order:read:any")) {
            throw new AccessDeniedException("not your order");
        }
        return order;
    }
}
```

Method-level annotations take precedence over class-level ones **for the same annotation type**. A method-level `@RequiresRole` replaces the class-level `@RequiresRole`, but a class-level `@RequiresPermission` still applies — when both a role and a permission constraint are in force, both must pass.

Use annotations for coarse, static rules and the facade for anything that depends on the data being accessed, as in `view` above.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.security.enabled` | Master switch | `true` |
| `adhar.security.jwt.issuer-uri` | Expected token issuer | — |
| `adhar.security.jwt.jwk-set-uri` | Signing key endpoint | — |
| `adhar.security.jwt.audience` | Accepted audiences | empty |
| `adhar.security.jwt.authorities-claim-name` | Claim holding roles | `authorities` |
| `adhar.security.jwt.username-claim-name` | Claim holding the user id | `sub` |
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
| `adhar.security.csp.report-only` | Report rather than block | `false` |
| `adhar.security.csrf.enabled` | CSRF protection | `true` |
| `adhar.security.csrf.header-name` | CSRF header | `X-CSRF-TOKEN` |
| `adhar.security.rate-limit.enabled` | Request rate limiting | `false` |
| `adhar.security.rate-limit.max-requests` | Requests per window | `100` |
| `adhar.security.rate-limit.window-seconds` | Window length | `60` |
| `adhar.security.rate-limit.store` | `memory` or `redis` | `memory` |
| `adhar.security.audit.enabled` | Security audit logging | `false` |
| `adhar.security.audit.log-successful-auth` | Log successful logins | `true` |
| `adhar.security.token-refresh.enabled` | Issue and rotate tokens here | `false` |
| `adhar.security.token-refresh.access-token-validity-seconds` | Access token lifetime | `900` |
| `adhar.security.token-refresh.refresh-token-validity-seconds` | Refresh token lifetime | `604800` |
| `adhar.security.token-refresh.rotate-refresh-tokens` | New refresh token per use | `true` |
| `adhar.security.token-refresh.store` | `memory` or `redis` | `memory` |
| `adhar.security.api-key.enabled` | API-key authentication | `false` |
| `adhar.security.api-key.header-name` | API-key header | `X-API-Key` |
| `adhar.security.rbac.enabled` | Register `AccessControlAspect` | `true` |
| `adhar.security.jwks.enabled` | Serve a JWKS document | `false` |
| `adhar.security.jwks.path` | JWKS path | `/.well-known/jwks.json` |
| `adhar.security.token-relay.enabled` | Forward bearer tokens downstream | `false` |

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Health and metrics endpoints start returning 401 | The default chain ends in `anyRequest().authenticated()` | Add those paths to `adhar.security.authorization.permit-all` |
| Every request is 403 after wiring the IdP | `authorities-claim-name` does not match the claim your IdP emits | Decode a real token; Keycloak commonly uses `groups` or `realm_access.roles`, not `authorities` |
| Session-based login does not stick | The chain is `SessionCreationPolicy.STATELESS` by design | Authenticate per request with a bearer token or API key |
| `@RequiresRole` ignored | The call is a self-invocation inside the same bean, so no proxy is involved | Call through the injected bean, or check inline with the facade |
| Rate limits reset on every deploy and differ per pod | The default store is in-process | Set `rate-limit.store: redis` with `spring-data-redis` on the classpath |
| Refresh tokens stop working after a restart | `token-refresh.store` is `memory` | Use `redis`, or accept re-authentication |
| Audit trail missing | `audit.enabled` defaults to `false` | Turn it on; replace `Slf4jAuditEventSink` for durable storage |
| CSRF blocks a machine-to-machine API | CSRF is on by default and stateless clients cannot carry a token | Add those paths to `csrf.ignore-ant-matchers` |
| Nothing is secured at all | `adhar.security.enabled: false`, or your own `SecurityFilterChain` bean took precedence | Every bean is `@ConditionalOnMissingBean` — a custom chain replaces the whole default |
| API keys appear to be ignored | The configured key is the raw value, not its SHA-256 hash | `api-key.keys[].key-hash` expects a hash |

## See also

- [Platform Services](/docs/core-concepts/platform-services) — Keycloak as the platform's identity provider, and the realm URIs to point `issuer-uri` at.
- [Security Best Practices](/docs/security/security-best-practices) — the platform-level hardening guidance this module implements at the service level.
- [Accessing the Platform](/docs/operations/accessing-the-platform) — obtaining tokens and reaching protected services.
- [GraphQL](/adhar-kit/modules/graphql) — reads the `Authentication` this module populates for field authorization.
