---
title: "adhar-kit-security"
section: "Modules"
order: 7
path: "/adhar-kit/modules/security"
---

# adhar-kit-security

> JWT, OAuth 2.1, mTLS, RBAC and OPA policies — secure by default.

**Package:** `io.adhar.kit.security` · **Status:** stable · **Since:** 1.0

## Request flow

```text
   client ──▶ ┌────────────┐  bearer token
              │ AuthFilter │ ─────────┐
              └─────┬──────┘          │
                    │                 ▼
                    │           ┌──────────┐  fetch JWKS
                    │           │  JWT     │ ──────────▶ IdP / Keycloak
                    │           │ Verifier │
                    │           └────┬─────┘
                    │                │ Principal
                    ▼                ▼
              ┌──────────────────────────┐
              │ @Secured / @RolesAllowed │
              │   policy evaluation      │
              └────────────┬─────────────┘
                           │ allow/deny
                           ▼
                       handler / 403
```

## Features

- OAuth 2.1 / OIDC with PKCE; pluggable IdPs (Keycloak, Auth0, Okta)
- JWT verification with JWKS caching and key rotation
- Mutual TLS with SPIFFE/SPIRE identity
- Annotation-based RBAC: `@Secured`, `@RolesAllowed`, `@Permits`
- OPA / Rego policy evaluation via `@Policy("orders.write")`
- CSRF protection, HSTS, secure cookie defaults
- Audit-log SPI for SIEM integration

## Example

```java
@AdharController("/admin")
@Secured            // require any authenticated user
class AdminApi {

    @Get("/users")
    @RolesAllowed({"admin", "support"})
    List<User> all() { ... }

    @Delete("/users/{id}")
    @Policy("users.delete")     // evaluated by OPA
    void delete(@PathParam String id) { ... }
}
```

## Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `adhar.security.oidc.issuer` | — | OIDC discovery URL. |
| `adhar.security.jwt.audience` | — | Expected `aud` claim. |
| `adhar.security.jwt.jwks-cache-ttl` | `10m` | JWKS refresh interval. |
| `adhar.security.opa.url` | — | OPA sidecar endpoint. |
| `adhar.security.mtls.enabled` | `false` | Require client certs. |

## Threat-model defaults

| Threat | Default mitigation |
|--------|--------------------|
| Token replay | `jti` + nonce cache |
| Algorithm confusion | Allow-list of `RS256`, `ES256`, `EdDSA` |
| Key rotation | JWKS auto-refresh, 0-downtime |
| CSRF | SameSite=Lax cookies + double-submit token |
| Clickjacking | `X-Frame-Options: DENY` |

## See also

- [`JwtVerifier`](/adhar-kit/javadoc/io.adhar.kit.security/JwtVerifier)
- [Configuration from Vault](/adhar-kit/guides/config-from-vault)
