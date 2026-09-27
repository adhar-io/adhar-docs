---
title: "Security"
section: "Modules"
order: 24
path: "/adhar-kit/modules/security"
---

# Security

`adhar-kit-security` is a comprehensive security starter: OAuth2/OIDC, JWT validation, CORS, security headers/CSP, CSRF, URL authorization, rate limiting, audit logging, refresh-token rotation, RBAC annotations, and API-key auth.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-security</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

- `SecurityFacade` (`getInstance()`), `SecurityService` — `getCurrentUserId`, `hasRole`, `hasPermission`, `generateToken`, `validateToken`
- `JwtUtils` — `extractJwt`, `extractUsername`, `extractEmail`
- `TokenRefreshService` — `createTokenPair`, `refreshAccessToken`, `revokeRefreshToken`
- `SecurityAuditLogger`, `AccessControlAspect`
- Annotations — `@RequiresRole`, `@RequiresPermission` (plus Spring's `@PreAuthorize`)

## Role- and permission-based access

```java
@RequiresRole("ADMIN")
public void deleteOrder(Long id) { ... }

@RequiresRole(value = {"AUDITOR", "COMPLIANCE"}, mode = CheckMode.ALL_OF)
public Report complianceReport() { ... }

@RequiresPermission({"order:read", "order:export"})   // any-of by default
public byte[] exportOrders() { ... }
```

Or check inline via the facade: `adhar.hasPermission("order:create")`.

## OIDC / JWT

Point the module at your identity provider (on the [Adhar Platform](/docs), that's Keycloak) and it validates JWTs, maps claims to authorities, and populates the security context:

```yaml
adhar:
  security:
    enabled: true
    jwt:
      issuer-uri: https://keycloak.example.com/realms/adhar
      jwk-set-uri: https://keycloak.example.com/realms/adhar/protocol/openid-connect/certs
      authorities-claim-name: groups
    cors:      { enabled: true }
    headers:   { enabled: true }        # HSTS, frame-options, referrer-policy
    csrf:      { enabled: true, header-name: X-CSRF-TOKEN }
    rate-limit: { enabled: true, max-requests: 100, window-seconds: 60 }
    audit:     { enabled: true, log-failed-auth: true }
    token-refresh:
      enabled: true
      access-token-validity-seconds: 900
      rotate-refresh-tokens: true
    api-key:
      enabled: true
      header-name: X-API-Key
```

Refresh-token rotation, rate limiting, and audit logging are on by simple toggles — the secure defaults you'd otherwise hand-assemble from a dozen beans.
