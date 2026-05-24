---
title: "adhar-kit-config"
section: "Modules"
order: 8
path: "/adhar-kit/modules/config"
---

# adhar-kit-config

> Layered configuration with profiles, env-vars, files, Vault & Consul —
> hot-reloadable and type-safe.

**Package:** `io.adhar.kit.config` · **Status:** stable · **Since:** 1.0

## Resolution order

Higher entries win when the same key is defined in multiple sources:

```text
1. JVM system properties          (-Dkey=value)
2. Environment variables          (KEY=value)
3. Vault / Consul                 (dynamic, watched)
4. Profile file                   (application-prod.yml)
5. Base file                      (application.yml)
6. @ConfigDefault on the class    (compile-time fallback)
```

## Type-safe binding

```java
@ConfigProperties("orders")
record OrdersConfig(
    @NotBlank String inventoryUrl,
    @Min(1) int maxBatchSize,
    Duration timeout
) {}

@Inject OrdersConfig cfg;
```

A startup-time validator fails fast if any required value is missing or
fails `@NotBlank` / `@Min` / regex checks.

## Hot reload

Watched sources (Vault, Consul, file watcher) trigger a `ConfigChange`
event. Components can react:

```java
@OnConfigChange("orders")
void rebind(OrdersConfig oldCfg, OrdersConfig newCfg) {
    httpClient.reconfigure(newCfg.timeout());
}
```

## Features

- YAML, JSON, TOML, properties, env, JVM props
- HashiCorp Vault (KV v2, transit, dynamic creds)
- Consul KV with long-polling watches
- AWS Parameter Store / Secrets Manager
- Profile activation: `--profile=prod,eu`
- Encrypted-at-rest values: `${dec:...}`
- Hot reload via `@OnConfigChange`

## Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `adhar.config.profile` | `default` | Comma-separated profiles. |
| `adhar.config.vault.address` | — | Vault URL. |
| `adhar.config.vault.path` | `secret/<service>` | KV mount path. |
| `adhar.config.reload.enabled` | `true` | Enable hot reload. |

## See also

- [`ConfigProperty`](/adhar-kit/javadoc/io.adhar.kit.config/ConfigProperty)
- [Configuration from Vault](/adhar-kit/guides/config-from-vault)
