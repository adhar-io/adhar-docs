---
title: "Config"
section: "Modules"
order: 12
path: "/adhar-kit/modules/config"
---

# Config

`adhar-kit-config` provides multi-source, priority-merged configuration with startup validation, dynamic refresh, and transparent AES/GCM property encryption. It's framework-agnostic across Spring, Quarkus, and Micronaut.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-config</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

- `ConfigManager`, `ConfigFacade` (`getInstance()`)
- `ConfigSource` + `EnvironmentConfigSource`, `FileConfigSource`, `ConsulConfigSource`, `MapConfigSource`
- `PropertyEncryptor` (`encrypt`, `decrypt`, `isEncrypted`, `decryptIfNeeded`)
- `ConfigValidator` (+ `ConfigValidationRunner`), `@RefreshConfig`

## Priority-merged sources

Higher-priority sources override lower ones. Default order: **Environment (200) > Consul/Vault (150) > File (100)**.

```java
ConfigManager manager = new ConfigManager();
manager.addSource(new EnvironmentConfigSource(200));   // highest
manager.addSource(new FileConfigSource("app.yml", 100));

String dbUrl = manager.getProperty("database.url", String.class);
Integer pool = manager.getProperty("database.pool.size", Integer.class, 10);  // default
String apiKey = manager.getRequiredProperty("api.key", String.class);          // throws if missing
```

## Encrypted properties

Values wrapped as `ENC(...)` are decrypted transparently at read time (AES/GCM, PBKDF2-derived key). Provide the key via `ADHAR_CONFIG_ENCRYPTION_KEY`:

```yaml
adhar:
  config:
    encryption:
      enabled: true
      algorithm: AES
      salt: my-app-salt
      key-iterations: 210000
    validation:
      enabled: true
      fail-on-error: true
      required:
        - database.url
        - api.key
      patterns:
        "[database.url]": "^jdbc:.*"
```

Encrypted format: `ENC(v2:<base64(iv+ciphertext+gcm-tag)>)` — cipher `AES/GCM/NoPadding`, `PBKDF2WithHmacSHA256`, 210,000 iterations by default.

## Startup validation

`ConfigValidator` fails fast on missing required properties, pattern mismatches, or out-of-range values — so a misconfigured service never reaches a bad steady state:

```java
validator.addRequiredProperty("api.key")
         .addPatternRule("database.url", "^jdbc:.*")
         .addRangeRule("server.port", 1, 65535)
         .validateOrThrow();
```

## Dynamic refresh

Annotate a bean `@RefreshConfig` to have its `@ConfigurationProperties` re-bound when a source changes, without a restart.
