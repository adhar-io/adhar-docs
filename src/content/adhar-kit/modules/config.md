---
title: "Config"
section: "Modules"
order: 12
path: "/adhar-kit/modules/config"
---

# Config

`adhar-kit-config` merges configuration from environment variables, files, Vault, Consul, mounted ConfigMaps and Dapr stores into one view ordered by priority, with `ENC(...)` decryption on read, startup validation, change listeners and percentage feature flags. Use it when a service draws settings from more than one place, or carries secrets you do not want in plaintext.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-config` (package `com.adhar.kit.config`) |
| Module toggle | `adhar.kit.modules.config` (default `true`) gates `adhar.getConfig()` |
| Module switch | `adhar.config.enabled` (default `true`) gates `ConfigAutoConfiguration` |
| Facade | `ConfigFacade` (read-only view); `ConfigManager` is the merge engine |
| Required dependencies | `spring-boot-starter`, `adhar-kit-commons` |
| Optional dependencies | `adhar-kit-dapr` (Dapr sources), `spring-boot-starter-actuator` (`adharconfig` endpoint), Spring Cloud context (scheduled refresh), Spring Cloud Config / Vault, Jasypt |
| Frameworks | `ConfigManager` and the sources are plain Java. `ConfigFacade` works anywhere: without a linked `ConfigManager` it reads system properties and environment variables. Source wiring, validation, refresh and the endpoint are Spring Boot auto-configuration |

## How it works

`ConfigManager` holds a list of `ConfigSource`s sorted by priority. It loads each source's map, lowest priority first, into one merged `ConcurrentHashMap`, so a higher-priority source replaces individual keys. Merging is key-level, not deep. Reads are map lookups; sources are contacted only when a source is added and on refresh.

```diagram
nkb-config-sources
```

`ConfigManager` is a view parallel to Spring's `Environment`, not part of it. It registers no `PropertySource`. So `@Value`, `@ConfigurationProperties` and `Environment` never see the Vault, Consul or ConfigMap sources declared here. In the other direction, `application.yml` is not in `ConfigManager` unless you declare it as a `file` source: `EnvironmentConfigSource` reads `System.getenv()` only.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-config</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Use it

Declare sources. Each `adhar.config.sources.<name>` entry has `type`, `location`, `prefix`, `priority` (default `100`), `enabled` and an `auth` map:

```yaml
adhar:
  config:
    sources:
      app-file:
        type: file
        location: classpath:app.yml
      orders-vault:
        type: vault
        location: https://vault.internal:8200
        prefix: secret/orders
        priority: 150
        auth:
          token: ${VAULT_TOKEN}
          kvVersion: "2"
```

| `type` | Source | `auth` keys |
|---|---|---|
| `file` | `FileConfigSource` (`classpath:` or file path) | — |
| `vault` | `VaultConfigSource` | `token`, `namespace`, `kvVersion` (default `2`) |
| `consul` | `ConsulConfigSource` | `token` |
| `configmap`, `k8s` | `ConfigMapConfigSource` over a mounted directory | `watch` (default `false`) |
| `environment` | Ignored; the environment source is always added | — |
| `springcloud` | Logged only; Spring Cloud Config stays on its own path | — |

Any `ConfigSource` bean is added too. Read the merged view:

```java
import com.adhar.kit.config.manager.ConfigManager;

String url  = configManager.getProperty("database.url", String.class);
int pool    = configManager.getProperty("database.pool.size", Integer.class, 10);
String key  = configManager.getRequiredProperty("api.key", String.class); // IllegalArgumentException if absent
Map<String, Object> db = configManager.getPropertiesWithPrefix("database.");
```

`ConfigFacade` offers string-typed reads: `get`, `getOptional`, `getInt`, `getLong`, `getBoolean`, `getDouble`, `getPropertiesWithPrefix`, `containsKey`, `refresh`.

React to changes with `@RefreshConfig` on a method of any bean:

```java
import com.adhar.kit.config.annotation.RefreshConfig;
import com.adhar.kit.config.manager.ConfigManager;
import org.springframework.stereotype.Service;

@Service
public class PricingClient {

    private final ConfigManager config;
    private volatile int timeoutMs;          // written on the refresh thread

    public PricingClient(ConfigManager config) {
        this.config = config;
    }

    @RefreshConfig(keys = "pricing.timeout-ms", refreshOnStartup = true)
    void reload() {
        timeoutMs = config.getProperty("pricing.timeout-ms", Integer.class, 5000);
    }
}
```

`RefreshConfigBeanPostProcessor` registers each annotated method as a `ConfigChangeListener` and calls it by reflection, so private methods and self-calls work. Rules:

- The method takes no arguments or `(String key, Object oldValue, Object newValue)`; any other signature is skipped with a warning.
- `keys` match exactly, `prefix` matches with `startsWith`; with neither, every change matches.
- It runs **once per matching changed key**, so make it idempotent.
- `refreshOnStartup = true` calls a zero-argument method once at bean initialisation.

Validate at startup, or in code:

```java
import com.adhar.kit.config.validator.ConfigValidator;

ConfigValidator validator = new ConfigValidator();   // mutators return void
validator.addRequiredProperty("api.key");
validator.addPatternRule("database.url", "^jdbc:.*");
validator.addRangeRule("server.port", 1, 65535);
List<String> errors = validator.validate(configManager.getPropertiesWithPrefix(""));
```

`ConfigValidationRunner` applies `adhar.config.validation.required` and `patterns` to the merged map during bean initialisation and, with `fail-on-error`, throws `IllegalStateException`.

Feature flags (with `adhar.config.feature-flags.enabled=true`):

```java
boolean on = featureFlagService.isEnabled("new-checkout", userId);
```

The deny list wins, then the allow list, then `enabled`, then a stable hash bucket against `rollout-percentage`. A partial rollout with no key is off.

## Configuration

`ConfigProperties` (`adhar.config.*`):

| Property | Type | Default | Description |
|---|---|---|---|
| `adhar.config.enabled` | boolean | `true` | Master switch |
| `adhar.config.application-name` | String | — | Logical application name |
| `adhar.config.profiles` | String[] | `[default]` | Active profiles for source lookups |
| `adhar.config.sources.<name>.*` | Map | — | Declared sources (see above); `priority` `100`, `enabled` `true` |
| `adhar.config.encryption.enabled` | boolean | `false` | Build a `PropertyEncryptor` and attach it to `ConfigManager` |
| `adhar.config.encryption.key` | String | — | Key; falls back to the `ADHAR_CONFIG_ENCRYPTION_KEY` environment variable |
| `adhar.config.encryption.algorithm` | String | `AES` | `AES` writes the v2 GCM format; anything else uses the legacy cipher |
| `adhar.config.encryption.salt` | String | `adhar-kit-config-salt` | PBKDF2 salt |
| `adhar.config.encryption.key-iterations` | int | `210000` | PBKDF2 iterations |
| `adhar.config.validation.enabled` | boolean | `true` | Register the validator and run it at startup |
| `adhar.config.validation.fail-on-error` | boolean | `true` | Abort startup on a violation |
| `adhar.config.validation.log-warnings` | boolean | `true` | Log violations when not failing |
| `adhar.config.validation.required` | List | — | Keys that must be present |
| `adhar.config.validation.patterns` | Map | — | Key to regex |
| `adhar.config.refresh.enabled` | boolean | `false` | Scheduled `refreshAll()` (also needs Spring Cloud's `ContextRefresher` on the classpath) |
| `adhar.config.refresh.interval` | Duration | `30s` | Fixed delay between refreshes |
| `adhar.config.refresh.initial-delay` | Duration | `10s` | Delay before the first refresh (placeholder only, not a bound field) |
| `adhar.config.feature-flags.enabled` | boolean | `false` | Register `FeatureFlagService` |
| `adhar.config.feature-flags.flags.<name>.*` | Map | — | `enabled` (`true`), `rollout-percentage` (`100`), `allow-list`, `deny-list` |
| `adhar.config.audit.enabled` | boolean | `true` | Publish a `ConfigChangeEvent` per changed key |
| `adhar.config.audit.max-events` | int | `100` | Retained recent events |
| `adhar.config.audit.secret-key-patterns` | List | `password`, `secret`, `token`, … | Substrings that mark a key as secret; its values are masked |
| `adhar.config.endpoint.enabled` | boolean | `true` | Register the `adharconfig` actuator endpoint |
| `adhar.config.dapr.config-enabled` / `secrets-enabled` | boolean | `true` / `true` | Add the Dapr configuration / secret sources |
| `adhar.config.dapr.config-store` / `secret-store` | String | `configstore` / `secretstore` | Dapr component names |
| `adhar.config.dapr.keys` | List | — | Configuration keys to load |
| `adhar.config.dapr.subscribe` | boolean | `true` | Subscribe to configuration updates |
| `adhar.config.dapr.config-priority` / `secret-priority` | int | `150` / `160` | Source priorities |

The Dapr sources are added only when `adhar-kit-dapr` is on the classpath, a `DaprFacade` bean exists and `adhar.dapr.enabled=true` is set explicitly. `refresh.max-retries`, `refresh.retry-delay`, `encryption.key-location`, `key-alias`, `encrypted-prefix` and `encrypted-suffix` are bound but do not change behaviour.

### Encryption format

`encrypt(...)` emits `ENC(v2:<base64(iv + ciphertext + tag)>)`: AES/GCM/NoPadding with a random 12-byte IV and a 128-bit tag, under a 256-bit key derived with PBKDF2WithHmacSHA256 from the key, salt and iteration count. `ENC(<base64>)` without `v2:` is the legacy AES/ECB format and is still decrypted. A wrong key, changed salt or altered ciphertext throws `RuntimeException("Decryption failed")`. Keep the salt and iteration count fixed for the life of a ciphertext.

## Operations

- **Actuator.** `GET /actuator/adharconfig` returns `sources` (type and health), `properties` (merged, secret-looking values masked), `featureFlags` and `recentChanges`. `ConfigManager.getHealthStatus()` gives the per-source health map in code.
- **Audit.** `ConfigChangeAuditPublisher` is a change listener that publishes Spring `ConfigChangeEvent`s (`key`, `oldValue`, `newValue`, `secret`, `sourceType`, `changedAt`) with secret values masked.
- **Refresh.** `refreshAll()` refreshes sources that support it, rebuilds the merged map, diffs it, and calls every listener in registration order on the refreshing thread. A listener that throws is logged; the others still run.
- **Failure behaviour.** A declared source that fails to construct (bad URL, missing token) is logged and skipped; startup continues. A source that throws in `loadConfig()` is logged and skipped. A failed scheduled refresh is logged and retried on the next tick. Encryption enabled with no key fails startup with `IllegalStateException`.

## Limits

- Only reads through `ConfigManager` or `ConfigFacade` see the merged view and decrypt `ENC(...)`. `@Value`, `@ConfigurationProperties` beans and fields set at construction do not change on refresh.
- Startup validation checks the merged view, not `application.yml`. A `required` key that lives only in `application.yml` fails validation unless you declare that file as a `file` source.
- The merged map is cleared and rebuilt on refresh. A read in that window can miss a key, so resolve values into fields at startup or in a `@RefreshConfig` method rather than on a request path.
- `ENC(...)` values are decrypted on every read (AES/GCM per call). Read secrets once.
- The environment source lowercases names and maps `_` to `.`: `DATABASE_URL` becomes `database.url`. At priority 200 it overrides every declared source by default.
- `ConfigFacade.getInstance()` is process-wide; with several Spring contexts in one JVM it points at the last one started. Inject `ConfigManager` in tests.
- `ConfigRefreshManager` (a `ContextRefresher` wrapper gated on `adhar.config.refresh.auto-refresh`) is not registered by the auto-configuration.

## Next steps

- [Security](/adhar-kit/modules/security) — where decrypted secrets are usually consumed
- [Kubernetes](/adhar-kit/modules/kubernetes) — ConfigMaps and Secrets in a cluster
- [Dapr](/adhar-kit/modules/dapr) — the configuration and secret stores behind the Dapr sources
- [Concepts](/adhar-kit/concepts) — how `adhar.kit.modules.*` and module settings combine
