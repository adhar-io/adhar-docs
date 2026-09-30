---
title: "Config"
section: "Modules"
order: 12
path: "/adhar-kit/modules/config"
---

# Config

`adhar-kit-config` provides multi-source, priority-merged configuration with startup validation, dynamic refresh, and transparent AES/GCM property encryption. The problem it solves is that **a service in production draws settings from four places at once** — environment variables, a mounted ConfigMap, Consul or Vault, and a packaged file — and without one merge order and one validation pass, the effective configuration is whatever the last framework to load happened to win.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-config` |
| Built on | Spring Boot / Spring Cloud Config, Spring Cloud Vault, Jasypt, `adhar-kit-commons` |
| Entry points | `ConfigManager`, `ConfigFacade`, `ConfigSource`, `PropertyEncryptor`, `ConfigValidator` |
| Auto-configuration | `ConfigAutoConfiguration` (gated on `adhar.config.enabled`) |
| Actuator endpoint | `adharconfig` |
| Use it when | Configuration arrives from more than one place, or carries secrets |

## How it works

`ConfigManager` is the single owner of the merged view. Sources register with a numeric priority; the manager keeps them sorted and resolves a key from the highest-priority source that has it. A `PropertyEncryptor`, when present, sits in the read path so `ENC(...)` values are decrypted at the moment they are read — never stored in plaintext.

```text
  getProperty("database.url")
        |
        v
  +---------------------- ConfigManager -----------------------+
  |  sources sorted by priority, highest first                 |
  |                                                            |
  |   EnvironmentConfigSource   200   <- added automatically    |
  |   VaultConfigSource         150                            |
  |   ConsulConfigSource        140                            |
  |   ConfigMapConfigSource     130                            |
  |   FileConfigSource          (explicit; interface default 100)|
  |   <your ConfigSource bean>  (contributed, any priority)    |
  +------------------------------+-----------------------------+
                                 |
                       PropertyEncryptor  (ENC(...) -> plaintext)
                                 |
                                 v
                          resolved value
```

Two things happen around that core. At startup `ConfigValidationRunner` runs `ConfigValidator` over the merged map and can abort the boot. At runtime `ConfigRefreshManager` re-reads refreshable sources and notifies `@RefreshConfig` methods and registered `ConfigChangeListener`s.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-config</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`ConfigManager`** — the merge engine: `addSource`, `removeSource`, `getProperty(key)`, `getProperty(key, type)`, `getProperty(key, type, default)`, `getRequiredProperty`, `getPropertiesWithPrefix`, `containsProperty`, `refreshAll`, `refreshSource`, `addChangeListener`, `getHealthStatus`, `setEncryptor`.
- **`ConfigFacade`** — the read-only convenience view (`getInstance()`): `get`, `getOptional`, `getInt`, `getLong`, `getBoolean`, `getDouble`, `getPropertiesWithPrefix`, `containsKey`, `getActiveProfile`, `refresh`, `isRefreshable`. This is what `AdharFacade.getConfig()` returns.
- **`ConfigSource`** — the extension point. Implement `getType`, `loadConfig`, `getProperty`, and optionally `getPriority`, `supportsRefresh`, `refresh`, `isHealthy`. Shipped implementations: `EnvironmentConfigSource`, `FileConfigSource`, `ConsulConfigSource`, `VaultConfigSource`, `ConfigMapConfigSource`, `DaprConfigSource`, `DaprSecretConfigSource`. A source published as a Spring bean is picked up automatically.
- **`PropertyEncryptor`** — `encrypt`, `decrypt`, `isEncrypted`, `decryptIfNeeded`.
- **`ConfigValidator`** (+ `ConfigValidationRunner`) — `addRequiredProperty`, `addPatternRule`, `addRangeRule`, `addCustomRule`, `validate(Map)`, `validateOrThrow(Map)`.
- **`FeatureFlagService`** / `FeatureFlag` — percentage rollouts with allow/deny lists.
- **`ConfigChangeAuditPublisher`** / `ConfigChangeEvent` / `ConfigMasking` — an audit trail of what changed, with secret values masked.

## Priority-merged sources

The auto-configuration always adds `EnvironmentConfigSource` at priority 200, so an environment variable overrides everything by default. Declare the rest under `adhar.config.sources`, or build the manager by hand:

```java
import com.adhar.kit.config.manager.ConfigManager;
import com.adhar.kit.config.source.impl.EnvironmentConfigSource;
import com.adhar.kit.config.source.impl.FileConfigSource;

ConfigManager manager = new ConfigManager();
manager.addSource(new EnvironmentConfigSource());              // priority 200
manager.addSource(new FileConfigSource("app.yml", 100));

String dbUrl   = manager.getProperty("database.url", String.class);
Integer pool   = manager.getProperty("database.pool.size", Integer.class, 10);
String apiKey  = manager.getRequiredProperty("api.key", String.class);  // throws if absent
```

Declaratively, with a Vault source layered over a file:

```yaml
adhar:
  config:
    application-name: orders
    sources:
      app-file:
        type: file
        location: classpath:app.yml
        priority: 100
      platform-vault:
        type: vault
        location: https://vault.internal:8200
        prefix: secret/orders
        priority: 150
        auth:
          token: ${VAULT_TOKEN}
          kvVersion: "2"
```

Recognised `type` values are `file`, `environment`, `vault`, `consul`, and `configmap` (alias `k8s`).

## Encrypted properties

Values wrapped as `ENC(...)` are decrypted transparently at read time. The v2 format is `ENC(v2:<base64(iv + ciphertext + gcm-tag)>)` — cipher `AES/GCM/NoPadding` with a 12-byte IV and 128-bit tag, key derived by `PBKDF2WithHmacSHA256` to 256 bits over 210,000 iterations by default.

Encryption is **off by default**. Turn it on and supply the key through `adhar.config.encryption.key`, a file at `key-location`, or the `ADHAR_CONFIG_ENCRYPTION_KEY` environment variable:

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

## Startup validation

`ConfigValidator` fails fast on missing required properties, pattern mismatches, or out-of-range values, so a misconfigured service never reaches a bad steady state. The mutator methods return `void` — configure it statement by statement, then validate against the merged map:

```java
ConfigValidator validator = new ConfigValidator();
validator.addRequiredProperty("api.key");
validator.addPatternRule("database.url", "^jdbc:.*");
validator.addRangeRule("server.port", 1, 65535);

validator.validateOrThrow(configManager.getPropertiesWithPrefix(""));
```

## Dynamic refresh

Refresh is off by default. Enable it, then annotate a **method** with `@RefreshConfig` to have it invoked when one of the named keys (or anything under `prefix`) changes:

```java
@Service
public class RateLimitSettings {

    @RefreshConfig(keys = {"api.timeout", "api.retries"}, refreshOnStartup = true)
    public void reload() {
        this.timeout = config.getInt("api.timeout", 5000);
        this.retries = config.getInt("api.retries", 3);
    }
}
```

`RefreshConfigBeanPostProcessor` registers these callbacks; the scheduled re-read is additionally gated on Spring Cloud's `ContextRefresher` being on the classpath.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.config.enabled` | Master switch | `true` |
| `adhar.config.application-name` | Logical name used when namespacing remote keys | — |
| `adhar.config.profiles` | Active profiles for source lookups | `[default]` |
| `adhar.config.sources.<name>.{type,location,prefix,priority,enabled,auth}` | Declare a source | `priority: 100`, `enabled: true` |
| `adhar.config.encryption.enabled` | Enable `PropertyEncryptor` | `false` |
| `adhar.config.encryption.salt` | PBKDF2 salt | `adhar-kit-config-salt` |
| `adhar.config.encryption.key-iterations` | PBKDF2 iterations | `210000` |
| `adhar.config.validation.enabled` | Run startup validation | `true` |
| `adhar.config.validation.fail-on-error` | Abort the boot on a violation | `true` |
| `adhar.config.refresh.enabled` | Enable scheduled refresh | `false` |
| `adhar.config.refresh.interval` | Re-read interval | `PT30S` |
| `adhar.config.feature-flags.enabled` | Register `FeatureFlagService` | `false` |
| `adhar.config.audit.enabled` | Record `ConfigChangeEvent`s | `true` |
| `adhar.config.audit.max-events` | Retained audit ring size | `100` |
| `adhar.config.endpoint.enabled` | Expose the `adharconfig` actuator endpoint | `true` |

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| A file value is ignored | `EnvironmentConfigSource` sits at 200 and an env var shadows it | Raise the file source's priority, or unset the variable |
| `ENC(...)` appears verbatim in the app | `adhar.config.encryption.enabled` is `false` (the default) | Enable it and provide the key |
| Decryption fails after a redeploy | `salt` or `key-iterations` changed, so a different key is derived | Keep both stable for the life of the ciphertext |
| `@RefreshConfig` never fires | It targets methods, not classes, and refresh defaults to off | Annotate a method and set `adhar.config.refresh.enabled=true` |
| `validator.addRequiredProperty(...).addPatternRule(...)` does not compile | These methods return `void` | Call them as separate statements |

## See also

- [Commons](/adhar-kit/modules/commons) — the exception and response types this module depends on
- [Security](/adhar-kit/modules/security) — where the secrets decrypted here are usually consumed
- [Kubernetes](/adhar-kit/modules/kubernetes) — the ConfigMap and Secret sources in a cluster
- [Configuration](/docs/getting-started/configuration) — platform-level configuration on Adhar
