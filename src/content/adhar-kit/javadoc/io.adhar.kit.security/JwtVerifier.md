---
title: "io.adhar.kit.security.JwtVerifier"
section: "API Reference"
order: 6
kind: "class"
module: "adhar-kit-security"
since: "1.0.0"
path: "/adhar-kit/javadoc/io.adhar.kit.security/JwtVerifier"
---

# `JwtVerifier`

> class · module `adhar-kit-security` · since 1.0.0

```java
package io.adhar.kit.security;

public final class JwtVerifier
```

Verifies and decodes JWT tokens using a rotating JWKS keyset fetched from the configured OIDC issuer.


## Methods

### `verify(`String token`)` → `Claims`

public · Verify the token's signature and standard claims (exp, nbf, iss, aud).

**Parameters**

- `token` (`String`) — Compact-serialised JWT.

**Throws**

- `TokenExpiredException` — If the token's exp claim is in the past.
- `InvalidSignatureException` — If the signature does not match any active key.

### `rotate()` → `void`

public · Force a refresh of the JWKS keyset. Normally invoked automatically.


