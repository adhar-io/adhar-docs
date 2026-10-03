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

```diagram
kit-config-priority
```

Two things happen around that core. At startup `ConfigValidationRunner` runs `ConfigValidator` over the merged map and can abort the boot. At runtime `ConfigRefreshManager` re-reads refreshable sources and notifies `@RefreshConfig` methods and registered `ConfigChangeListener`s.

**`ConfigManager` is a parallel view, not Spring's `Environment`.** The module registers no `PropertySource`, so `@Value`, `@ConfigurationProperties` and `Environment.getProperty(...)` resolve through Spring's own machinery and never see a Consul, Vault or ConfigMap source declared here. Read through `ConfigManager` / `ConfigFacade` when you want the merged view. This is also what makes the refresh story precise — see below.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-config</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`ConfigManager`** — the merge engine: `addSource`, `removeSource`, `getProperty(key)`, `getProperty(key, type)`, `getProperty(key, type, default)`, `getRequiredProperty`, `getPropertiesWithPrefix`, `containsProperty`, `refreshAll`, `refreshSource`, `addChangeListener`, `removeChangeListener`, `getHealthStatus`, `setEncryptor`.
- **`ConfigFacade`** — the read-only convenience view (`getInstance()`): `get`, `getOptional`, `getInt`, `getLong`, `getBoolean`, `getDouble`, `getPropertiesWithPrefix`, `containsKey`, `getActiveProfile`, `refresh`, `isRefreshable`. This is what `AdharFacade.getConfig()` returns.
- **`ConfigSource`** — the extension point. Implement `getType`, `loadConfig`, `getProperty`, and optionally `getPriority` (default 100), `isEnabled`, `supportsRefresh`, `refresh`, `isHealthy`. Shipped implementations: `EnvironmentConfigSource`, `FileConfigSource`, `ConsulConfigSource`, `VaultConfigSource`, `ConfigMapConfigSource`, `DaprConfigSource`, `DaprSecretConfigSource`. A source published as a Spring bean is picked up automatically.
- **`PropertyEncryptor`** — `encrypt`, `decrypt`, `isEncrypted`, `decryptIfNeeded`.
- **`ConfigValidator`** (+ `ConfigValidationRunner`) — `addRequiredProperty`, `addPatternRule`, `addRangeRule`, `addCustomRule`, `validate(Map)`, `validateOrThrow(Map)`.
- **`FeatureFlagService`** / `FeatureFlag` — percentage rollouts with allow/deny lists.
- **`ConfigChangeAuditPublisher`** / `ConfigChangeEvent` / `ConfigMasking` — an audit trail of what changed, with secret values masked.

## The source stack

The auto-configuration always adds `EnvironmentConfigSource` first, at priority **200**, so an environment variable overrides everything by default. Declared sources default to **100**; the Dapr configuration and secret sources sit at **150** and **160**. `EnvironmentConfigSource` lowercases each variable name and turns `_` into `.`, so `DATABASE_URL` resolves the key `database.url`.

```java
import com.adhar.kit.config.manager.ConfigManager;
import com.adhar.kit.config.source.impl.EnvironmentConfigSource;
import com.adhar.kit.config.source.impl.FileConfigSource;

ConfigManager manager = new ConfigManager();
manager.addSource(new EnvironmentConfigSource());              // priority 200
manager.addSource(new FileConfigSource("app.yml", 100));

String dbUrl  = manager.getProperty("database.url", String.class);
Integer pool  = manager.getProperty("database.pool.size", Integer.class, 10);
String apiKey = manager.getRequiredProperty("api.key", String.class);  // throws if absent
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

Recognised `type` values are `file`, `environment`, `vault`, `consul`, and `configmap` (alias `k8s`). `springcloud` is accepted but only logs — Spring Cloud Config stays on its own path. An unknown type logs a warning and is skipped.

Merging is **key-level, not deep**. Each source's `loadConfig()` map is applied with `putAll`, lowest priority first, so a higher source replaces individual keys but never merges nested structures. A key the high-priority source does not define falls through to the next source down.

## A realistic refreshable component

The whole point of `@RefreshConfig` is rebuilding a derived object — a client, a pool, a rate limiter — when its inputs change. Note that it is a **method-level** annotation:

```java
import com.adhar.kit.config.annotation.RefreshConfig;
import com.adhar.kit.config.manager.ConfigManager;
import java.time.Duration;

@Service
public class PricingClient {

    private final ConfigManager config;
    private volatile RestClient client;   // volatile: rebuilt on the refresh thread

    public PricingClient(ConfigManager config) {
        this.config = config;
    }

    @RefreshConfig(keys = {"pricing.timeout-ms", "pricing.base-url"},
                   refreshOnStartup = true)
    public void rebuild() {
        int timeout = config.getProperty("pricing.timeout-ms", Integer.class, 5000);
        String base = config.getRequiredProperty("pricing.base-url", String.class);
        this.client = RestClient.builder()
                .baseUrl(base)
                .requestFactory(factoryWithTimeout(Duration.ofMillis(timeout)))
                .build();
    }

    public Price quote(String sku) {
        return client.get().uri("/prices/{sku}", sku).retrieve().body(Price.class);
    }
}
```

`refreshOnStartup = true` makes the post-processor call `rebuild()` once at bean initialization, so the constructor can stay empty and there is exactly one code path that builds the client. Declare the field `volatile`: the rebuild runs on the refresh thread while request threads read it.

## How it behaves

**Reads are map lookups, not source calls.** `ConfigManager` keeps a `ConcurrentHashMap` cache of the merged view. `getProperty` never contacts Vault or Consul; it reads the cache and then, if an encryptor is attached, decrypts. Sources are only contacted at `addSource`, `refreshAll` and `refreshSource`.

**Decryption is per read.** `decryptIfNeeded` runs on every `getProperty` that returns a `String`, and a value starting with `ENC(` is decrypted each time. Key derivation (PBKDF2) happens once in the `PropertyEncryptor` constructor, but the AES/GCM operation does not — so read a secret once into a field, never inside a loop or a per-request path.

**Refresh clears before it repopulates.** `refreshCache()` calls `cache.clear()` and then re-applies every source from lowest to highest priority. A read that lands inside that window can see a key as absent — `getProperty` returns `null`, `getRequiredProperty` throws `IllegalArgumentException`. Resolve configuration into fields at startup or in a `@RefreshConfig` method rather than reading `ConfigManager` on a hot request path.

**Who sees a new value after a refresh.**

| Consumer | Sees the new value? |
|---|---|
| `configManager.getProperty(...)` / `ConfigFacade` called after the refresh | Yes |
| `@RefreshConfig` methods whose `keys` / `prefix` match | Yes, invoked during the refresh |
| Registered `ConfigManager.ConfigChangeListener`s | Yes, invoked during the refresh |
| A field assigned in a constructor or `@PostConstruct` | No |
| `@Value`-injected fields | No |
| `@ConfigurationProperties` beans, Spring's `Environment` | No |

**Failure behaviour is degrade-and-log, not fail.** If a source cannot be constructed (bad Vault URL, missing token) `addConfigSource` catches the exception and logs an error — the application still starts, simply without that source. If a source throws during `loadConfig()`, `refreshCache()` logs it and continues with the others. The symptom is a missing key much later, not a startup failure. Use `getRequiredProperty` or the startup validator to turn that into a loud failure, and check `getHealthStatus()` (and the `adharconfig` endpoint) for per-source health.

**Scheduled refresh is doubly gated and off by default.** `ConfigRefreshScheduler` is created only when `adhar.config.refresh.enabled=true` **and** `org.springframework.cloud.context.refresh.ContextRefresher` is on the classpath. It runs with a fixed delay of `adhar.config.refresh.interval` (default `PT30S`) after an initial delay of `adhar.config.refresh.initial-delay` (default `PT10S`). A refresh that throws is logged; `max-retries` and `retry-delay` are bound and logged but do not drive a retry loop — the next scheduled tick is the retry.

**Change notification is synchronous and serial.** `refreshAll()` diffs the old and new cache and calls every registered listener, in registration order, on the refreshing thread. A listener that blocks delays every later listener and the refresh itself; a listener that throws is caught and logged, and the remaining listeners still run.

**Concurrency.** `ConfigManager` holds sources and listeners in `CopyOnWriteArrayList`s and the merged view in a `ConcurrentHashMap`, so it is safe to share and safe to read from many threads. The encryptor field is `volatile`. `ConfigFacade` is a process-wide singleton whose `ConfigManager` is swapped in by the auto-configuration.

## Encryption

Encryption is **off by default** (`adhar.config.encryption.enabled=false`), and so is refresh. Turn encryption on and a `PropertyEncryptor` is built and attached to the `ConfigManager`.

The v2 format is `ENC(v2:<base64(iv + ciphertext + gcm-tag)>)`:

| Parameter | Value |
|---|---|
| Cipher | `AES/GCM/NoPadding` (authenticated — tampering is detected) |
| IV | random 12 bytes per encryption, prepended to the ciphertext |
| Auth tag | 128 bits |
| Key derivation | `PBKDF2WithHmacSHA256`, 256-bit key |
| Iterations | `adhar.config.encryption.key-iterations`, default `210000` |
| Salt | `adhar.config.encryption.salt`, default `adhar-kit-config-salt` |

Values written as `ENC(<base64>)` without the `v2:` marker are legacy v1 (AES/ECB) and are still decrypted for backward compatibility; `encrypt(...)` always emits v2 for AES. A non-AES `algorithm` falls back to the legacy cipher path entirely. Decryption failure — wrong key, changed salt, altered ciphertext — throws a `RuntimeException`, it does not return the raw value.

The key is resolved from `adhar.config.encryption.key` first, then the `ADHAR_CONFIG_ENCRYPTION_KEY` environment variable. **`key-location` is not implemented**: it is logged and ignored, and if nothing else supplied a key the bean throws `IllegalStateException` and the application fails to start. Supply the key through the property or the environment variable.

```yaml
adhar:
  config:
    encryption:
      enabled: true
      algorithm: AES
      salt: orders-prod-salt
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

Keep `salt` and `key-iterations` stable for the life of a ciphertext — changing either derives a different key and every existing `ENC(v2:...)` value stops decrypting.

## Startup validation

`ConfigValidationRunner` implements `InitializingBean`, so validation runs during bean initialization, after the `ConfigManager` exists. It merges the property-declared `required` keys and `patterns` into the `ConfigValidator`, validates the whole merged map, and — with `fail-on-error` true (the default) — throws `IllegalStateException` so the context fails to start. With it false, violations are logged as warnings when `log-warnings` is on.

The mutator methods return `void`, so configure the validator statement by statement:

```java
ConfigValidator validator = new ConfigValidator();
validator.addRequiredProperty("api.key");
validator.addPatternRule("database.url", "^jdbc:.*");
validator.addRangeRule("server.port", 1, 65535);

validator.validateOrThrow(configManager.getPropertiesWithPrefix(""));
```

## `@RefreshConfig` mechanics

`@RefreshConfig` is **not** an aspect, which makes it the one annotation in this group that is immune to the self-invocation trap. `RefreshConfigBeanPostProcessor` scans every bean's user-declared methods, and for each annotated method registers a `ConfigChangeListener` that invokes it reflectively on the target object — `ReflectionUtils.makeAccessible` is applied, so a private method works, and calling the method from inside the same class is irrelevant because the post-processor holds a direct reference.

What does bite:

- The annotation targets **methods only** (`@Target(ElementType.METHOD)`); putting it on a class will not compile.
- Only two signatures are supported: zero-argument, or `(String key, Object oldValue, Object newValue)`. Any other arity logs a warning at startup and is skipped entirely.
- Matching is per changed key: `keys` matches an exact key, `prefix` matches by `startsWith`, and **neither set means every change matches**.
- **The method is invoked once per matching changed key.** A method watching `{a, b}` runs twice when both change in the same refresh. Make it idempotent and cheap, or guard it.
- `refreshOnStartup = true` only works on zero-argument methods; on a three-argument method it logs a warning and skips the startup call.
- An exception inside the method is caught and logged — it does not abort the refresh or surface to the caller.
- Refresh defaults to off, so none of this fires until `adhar.config.refresh.enabled=true` (or you call `configManager.refreshAll()` yourself).

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.config.enabled` | Master switch | `true` |
| `adhar.config.application-name` | Logical name used when namespacing remote keys | — |
| `adhar.config.profiles` | Active profiles for source lookups | `[default]` |
| `adhar.config.sources.<name>.{type,location,prefix,priority,enabled,auth}` | Declare a source | `priority: 100`, `enabled: true` |
| `adhar.config.encryption.enabled` | Enable `PropertyEncryptor` | `false` |
| `adhar.config.encryption.key` | Encryption key (or `ADHAR_CONFIG_ENCRYPTION_KEY`) | — |
| `adhar.config.encryption.salt` | PBKDF2 salt | `adhar-kit-config-salt` |
| `adhar.config.encryption.key-iterations` | PBKDF2 iterations | `210000` |
| `adhar.config.validation.enabled` | Run startup validation | `true` |
| `adhar.config.validation.fail-on-error` | Abort the boot on a violation | `true` |
| `adhar.config.validation.log-warnings` | Log violations when not failing | `true` |
| `adhar.config.refresh.enabled` | Enable scheduled refresh | `false` |
| `adhar.config.refresh.interval` | Re-read interval | `PT30S` |
| `adhar.config.refresh.initial-delay` | Delay before the first refresh | `PT10S` |
| `adhar.config.feature-flags.enabled` | Register `FeatureFlagService` | `false` |
| `adhar.config.audit.enabled` | Record `ConfigChangeEvent`s | `true` |
| `adhar.config.audit.max-events` | Retained audit ring size | `100` |
| `adhar.config.endpoint.enabled` | Expose the `adharconfig` actuator endpoint | `true` |

## Testing

- **Build the manager by hand.** `new ConfigManager()` needs no Spring. Add a tiny `ConfigSource` returning a fixed `Map` from `loadConfig()` at a chosen priority, and you can assert override order, prefix lookups and `getRequiredProperty` failures in a plain unit test.
- **Assert refresh wiring without the scheduler.** Call `configManager.refreshAll()` directly; `@RefreshConfig` methods and listeners fire exactly as they would on a scheduled tick, with no clock involved. Keep `adhar.config.refresh.enabled=false` in tests so nothing fires behind your back.
- **Round-trip encryption.** `new PropertyEncryptor(key, "AES", salt, iterations)` is directly constructible. Lower `iterations` in tests — 210,000 PBKDF2 rounds per constructor call is deliberate and slow. Assert `isEncrypted`, `decrypt(encrypt(x)).equals(x)`, and that a mutated ciphertext throws.
- **Validation.** `ConfigValidator.validate(map)` returns the error list, so assert messages without catching an exception; use `validateOrThrow` only when the failure itself is the behaviour under test.
- **Watch the facade singleton.** `ConfigFacade.getInstance()` is process-wide and the auto-configuration mutates it with `setConfigManager`. Across several Spring test contexts in one JVM, the facade points at whichever context started last — inject `ConfigManager` in tests rather than reaching for the facade.
- **Disable the module.** `adhar.config.enabled=false` removes everything; `adhar.config.validation.enabled=false` lets a deliberately incomplete test fixture boot.

## Interaction with sibling modules

Secrets decrypted here are typically consumed by [Security](/adhar-kit/modules/security); the ConfigMap and Secret sources are the in-cluster half of [Kubernetes](/adhar-kit/modules/kubernetes). When `adhar-kit-dapr` is on the classpath and `adhar.dapr.enabled=true`, `DaprConfigSource` (priority 150) and `DaprSecretConfigSource` (priority 160) are contributed as beans and merged automatically — both above declared file sources, below environment variables. `ConfigChangeAuditPublisher` emits each change as a Spring `ConfigChangeEvent` with secret values masked by `ConfigMasking`, which is the hook to forward configuration drift into [Logging](/adhar-kit/modules/logging)'s audit event stream. Errors raised here use the exception hierarchy from [Commons](/adhar-kit/modules/commons).

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| A file value is ignored | `EnvironmentConfigSource` sits at 200 and an env var shadows it | Raise the file source's priority, or unset the variable |
| `@Value` fields never change on refresh | `ConfigManager` is not a Spring `PropertySource` | Read through `ConfigManager`, or rebuild in a `@RefreshConfig` method |
| `ENC(...)` appears verbatim in the app | `adhar.config.encryption.enabled` is `false` (the default) | Enable it and provide the key |
| Boot fails with "Encryption is enabled but no key provided" | Only `key-location` was set, which is not implemented | Use `adhar.config.encryption.key` or `ADHAR_CONFIG_ENCRYPTION_KEY` |
| Decryption fails after a redeploy | `salt` or `key-iterations` changed, so a different key is derived | Keep both stable for the life of the ciphertext |
| A Vault key is missing but startup succeeded | Source construction failures are caught and logged | Check `getHealthStatus()` / `adharconfig`; add the key to `validation.required` |
| `@RefreshConfig` never fires | It targets methods, not classes, and refresh defaults to off | Annotate a method and set `adhar.config.refresh.enabled=true` |
| A `@RefreshConfig` method runs twice per refresh | It is invoked once per matching changed key | Make it idempotent, or watch a single key |
| `validator.addRequiredProperty(...).addPatternRule(...)` does not compile | These methods return `void` | Call them as separate statements |

## See also

- [Commons](/adhar-kit/modules/commons) — the exception and response types this module depends on
- [Security](/adhar-kit/modules/security) — where the secrets decrypted here are usually consumed
- [Kubernetes](/adhar-kit/modules/kubernetes) — the ConfigMap and Secret sources in a cluster
- [Configuration](/docs/getting-started/configuration) — platform-level configuration on Adhar
