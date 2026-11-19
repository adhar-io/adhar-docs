---
title: "Cache"
section: "Modules"
order: 16
path: "/adhar-kit/modules/cache"
---

# Cache

`adhar-kit-cache` gives you named in-process caches on Caffeine (`CacheFacade`), a set of caching annotations with stampede, rate-limit and circuit-breaker protection, an optional second level in Redis or a Dapr state store, and Micrometer statistics. Use it when a read is expensive and repeats, and you want the hit rate on a dashboard rather than a guess.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-cache` (package `com.adhar.adharkit.cache`) |
| Module toggle | `adhar.kit.modules.cache` (default `true`) gates `adhar.getCache()` and `adhar.cached(...)` |
| Module switches | `adhar.cache.enabled` (Redis and Kafka cache managers), `adhar.cache.aspects.enabled` (annotations) — both default `true` |
| Facade | `CacheFacade` (one named cache), `CacheManager` (registry of them) |
| Required dependencies | `adhar-kit-commons`, Caffeine, Jackson |
| Optional dependencies | `aspectjweaver` (annotations), `micrometer-core` (metrics), `spring-boot-starter-data-redis` (Redis), `spring-kafka` (Kafka sync), `adhar-kit-dapr` (Dapr state store) |
| Frameworks | `CacheFacade` and `CacheManager` work anywhere. Annotations, Redis, Kafka and Dapr wiring are Spring Boot auto-configuration. `CacheService` adapters exist for Quarkus (`QuarkusCacheAdapter`, CDI bean), Micronaut (`MicronautCacheAdapter`), Helidon and Vert.x (construct them yourself) |

## How it works

The module has two independent paths. Keep them apart, because they are configured differently.

```diagram
nkb-cache-paths
```

- **Adhar annotations** (`com.adhar.adharkit.cache.annotation.*`) run as Spring AOP aspects over the Caffeine `CacheManager`. A cache named by an annotation and one built in code with `CacheFacade.builder()` are the same object if the names match, and both appear in the metrics.
- **Spring's own `@Cacheable`** (`org.springframework.cache.annotation`) goes through whichever Spring `CacheManager` the module registers: Dapr, Redis, or Kafka-synchronised local maps, chosen by `adhar.cache.provider` and what is on the classpath.

`@MultiLevelCache` joins the two: L1 is the Caffeine cache, L2 is a `SecondLevelCache` bean.

```diagram
nkb-cache-multilevel
```

The L2 bean is chosen in this order: your own `SecondLevelCache` bean, then `DaprSecondLevelCache` (when `adhar-kit-dapr` is on the classpath), then `SpringCacheSecondLevelCache` over the Redis cache manager, then `InMemorySecondLevelCache`. Only the last one is per-pod.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-cache</artifactId>
    <version>0.1.0</version>
</dependency>
```

Add `org.aspectj:aspectjweaver` if you want the annotations; without it `AdharCacheAspectsAutoConfiguration` does not load.

## Use it

A cache in code:

```java
import com.adhar.adharkit.cache.CacheFacade;
import java.time.Duration;

CacheFacade users = CacheFacade.builder()
    .cacheName("users")
    .maximumSize(10_000)
    .expireAfterWrite(Duration.ofMinutes(10))
    .recordStats(true)          // off by default; metrics read these stats
    .build();

users.put("u-123", user);
User cached = users.get("u-123", User.class);             // null on miss or type mismatch
User loaded = users.get("u-456", id -> repo.find(id));    // atomic get-or-load
```

Through the facade, cache-aside in one call: `adhar.cached("users", id, User.class, () -> repo.find(id))`.

Declaratively, on a Spring bean:

```java
import com.adhar.adharkit.cache.annotation.CacheEvict;
import com.adhar.adharkit.cache.annotation.CacheLock;
import com.adhar.adharkit.cache.annotation.Cacheable;
import com.adhar.adharkit.cache.annotation.MultiLevelCache;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    private final ProductRepository repo;
    private final PricingEngine pricing;

    public ProductService(ProductRepository repo, PricingEngine pricing) {
        this.repo = repo;
        this.pricing = pricing;
    }

    @Cacheable(cacheName = "products", key = "#id",
               ttl = 5, ttlUnit = TimeUnit.MINUTES, sync = true)
    public Product find(String id) {
        return repo.get(id);
    }

    @CacheLock(lockKey = "#sku", waitTime = 5)                 // seconds
    @MultiLevelCache(l1Cache = "price-l1", l2Cache = "price-l2",
                     key = "#sku", l1Ttl = 5, l2Ttl = 60)       // minutes
    public Price price(String sku) {
        return pricing.evaluate(sku);
    }

    @CacheEvict(cacheName = "products", key = "#product.id")
    public void update(Product product) {
        repo.save(product);
    }
}
```

### Annotations

| Annotation | What it does | Key attributes (defaults) |
|---|---|---|
| `@Cacheable` | Return the cached value; otherwise run and store a non-null result | `cacheName` (method name), `key`, `condition`, `unless`, `ttl` (`-1`), `ttlUnit` (`MINUTES`), `sync` (`false`) |
| `@CachePut` | Always run, then store the result | `cacheName`, `key`, `condition`, `unless`, `ttl`, `ttlUnit` |
| `@CacheEvict` | Remove one key or all entries | `cacheName`, `key`, `allEntries` (`false`), `beforeInvocation` (`false`), `condition` |
| `@CacheLock` | Single-flight: one caller computes per key, the rest wait for its result | `lockKey`, `waitTime` (`10` s), `failFast` (`false`), `leaseTime` (not read) |
| `@MultiLevelCache` | L1 then L2 then the method; promotes L2 hits into L1 | `l1Cache`, `l2Cache`, `key`, `l1Ttl` (`5` min), `l2Ttl` (`60` min), `writeThrough` (`true`) |
| `@CachePartition` | Get-or-compute in a per-tenant cache `<cacheName><separator><tenant>` | `cacheName`, `tenantParam`, `key`, `ttl` (`10` min) |
| `@CacheRefresh` | Re-invokes the method on a schedule and stores the result | `cacheName`, `refreshInterval` (`10` min), `initialDelay` (`1` min), `refreshAsync` |
| `@CacheWarmup` | Fills a cache on `ApplicationReadyEvent` | `cacheName`, `warmupMethod`, `async` (`true`), `delay` (`0` ms) |
| `@CacheCircuitBreaker` | Opens after consecutive failures or slow calls and serves `fallbackMethod` | `cacheName`, `fallbackMethod`, `failureThreshold` (`5`), `timeout` (`5000` ms), `waitDurationInOpenState` (`60000` ms) |
| `@CacheRateLimit` | Token bucket plus concurrency cap; throws `CacheRateLimitExceededException` past `timeout` | `maxConcurrent` (`10`), `maxPerSecond` (`100`), `timeout` (`5000` ms) |
| `@CacheMonitor` | Hit/miss counters, a latency timer and alert counters | `metricsPrefix` (`cache`), `alertOnHitRateBelow` (`0.5`), `alertOnEvictionRateAbove` (`0.5`) |

Keys, `condition` and `unless` are SpEL. Use `#<param>` (needs `-parameters`), `#p0`/`#a0`, `#result`, or `#root.methodName`/`#root.args`. A blank `key` defaults to `Class.method:<hash of args>`. With `adhar.cache.partitioning.enabled=true`, every generated key is prefixed with the tenant from the `KeyPartitionResolver` bean (default: the thread-local `TenantContextHolder`).

### Behaviour worth knowing

| Topic | Behaviour |
|---|---|
| Stampedes | `get(key, loader)` and `@Cacheable(sync = true)` use Caffeine's atomic compute: one loader per key, other callers block. In `sync` mode `unless` and result-based `condition` are not checked. |
| `@CacheLock` scope | An in-JVM map of futures, not a distributed lock. When a follower's `waitTime` runs out it computes locally; set `failFast = true` to get `CacheLockAcquisitionException` instead. |
| TTL | An annotation's `ttl` applies only when that annotation creates the cache. A later method naming the same cache gets the existing TTL. |
| `refreshAfterWrite` | Needs a loader. Use `CacheFacade.loadingBuilder().loader(...)`; on the plain builder Caffeine rejects it at `build()`. A refresh serves the stale value and reloads in the background. |
| Expiry is lazy | Caffeine evicts during other operations. `size()` is an estimate; call `cleanUp()` to force maintenance, for example in tests. |
| Self-invocation | Every annotation is proxy advice. `this.find(id)` from inside the same class bypasses the cache. `@CacheRefresh` also calls the raw method, bypassing other annotations on it. |
| Aspect order | Only `@CacheRateLimit` (outermost) and `@CacheCircuitBreaker` declare an order. Do not rely on the order of other stacked annotations. |
| Registries | `CacheManager.getInstance()` and the `CacheFacade` registry are process-wide. Building a cache with a name already in use replaces the registry entry. |

## Configuration

`AdharCacheProperties` (`adhar.cache.*`) and `AdharCacheDaprProperties` (`adhar.cache.dapr.*`):

| Property | Type | Default | Description |
|---|---|---|---|
| `adhar.cache.enabled` | boolean | `true` | Gates the Redis and Kafka Spring cache managers |
| `adhar.cache.provider` | String | `auto` | `dapr` puts Spring's `@Cacheable` in a Dapr state store; `auto` picks Redis, then Kafka, then Spring Boot's default |
| `adhar.cache.time-to-live` | Duration | `30m` | Entry TTL for the Redis and Dapr cache managers |
| `adhar.cache.allow-null-values` | boolean | `true` | Cache `null` results (Redis, Dapr, Kafka managers) |
| `adhar.cache.aspects.enabled` | boolean | `true` | Register the annotation aspects |
| `adhar.cache.partitioning.enabled` | boolean | `false` | Prefix every generated key with the resolved tenant |
| `adhar.cache.partitioning.separator` | String | `::` | Tenant/key separator, also used by `@CachePartition` |
| `adhar.cache.redis.enabled` | boolean | `true` | Register `RedisCacheManager` when a Redis connection exists |
| `adhar.cache.redis.host` / `port` | String / int | `localhost` / `6379` | Fallback connection, used only when the app has no `RedisConnectionFactory` |
| `adhar.cache.redis.password` / `database` / `ssl` | String / int / boolean | — / `0` / `false` | Fallback connection settings |
| `adhar.cache.redis.read-timeout` | Duration | `5s` | Command timeout of the fallback connection |
| `adhar.cache.redis.key-prefix` | String | `adhar-cache:` | Prefix for Redis cache names |
| `adhar.cache.kafka.enabled` | boolean | `false` | Kafka-synchronised local caches (opt-in) |
| `adhar.cache.kafka.bootstrap-servers` | String | `spring.kafka.bootstrap-servers` | Brokers for the module's private Kafka clients |
| `adhar.cache.kafka.group-id` | String | `adhar-cache-group` | Group id base; a random suffix per instance makes every instance receive every message |
| `adhar.cache.kafka.topic-prefix` | String | `adhar-cache` | Topics `<prefix>-put`, `-evict`, `-clear` |
| `adhar.cache.kafka.partitions` / `replication-factor` / `auto-create-topics` | int / short / boolean | `3` / `1` / `true` | Topic creation |
| `adhar.cache.kafka.properties` | Map | — | Extra Kafka client properties |
| `adhar.cache.dapr.enabled` | boolean | `true` | Wire the Dapr L2 and Dapr cache manager (also needs `adhar.dapr.enabled`, default `true`) |
| `adhar.cache.dapr.state-store` | String | the Dapr module's state store | State store component holding the caches |
| `adhar.cache.dapr.key-prefix` | String | `cache:` | Prefix of every cache key in the store |
| `adhar.cache.dapr.time-to-live.<cache>` | Map of Duration | — | Per-cache TTL, overriding `adhar.cache.time-to-live` |
| `adhar.cache.dapr.generation-ttl` | Duration | `2s` | How long a replica trusts its view of a cache's generation; a `clear()` reaches other replicas within this time |

`adhar.cache.max-size`, `redis.connect-timeout`, `redis.use-key-expiration-events` and `redis.properties` are bound but not read. The older key `adhar.kit.cache.dapr.state-store` still works and logs a deprecation warning.

Which Spring `CacheManager` wins:

| Condition | Spring `CacheManager` |
|---|---|
| You define one | Yours |
| `adhar.cache.provider=dapr` and `adhar-kit-dapr` present | `DaprCacheManager` |
| A `RedisConnectionFactory` exists (Spring Boot's, or the fallback when Lettuce is on the classpath) | `RedisCacheManager` |
| `adhar.cache.kafka.enabled=true` and `spring-kafka` present | `KafkaCacheManager` |
| Otherwise | Spring Boot's default |

## Operations

**Metrics.** With `micrometer-core` present, `CacheMetricsBinder` publishes, for every cache in `CacheManager`, tagged `cache=<name>`:

| Meter | Type | Source |
|---|---|---|
| `adhar.cache.gets{result=hit\|miss}` | function counter | `stats().hitCount()` / `missCount()` |
| `adhar.cache.evictions` | function counter | `stats().evictionCount()` |
| `adhar.cache.hit.ratio` | gauge | `stats().hitRate()` |
| `adhar.cache.size` | gauge | `estimatedSize()` |

Stats are only recorded on caches built with `recordStats(true)`. The builders default to `false`; caches created by `CacheManager.getOrCreateCache` and by annotations with a `ttl` record stats. `@CacheMonitor` adds `<prefix>.gets{method,result}`, `<prefix>.latency{method}` and `<prefix>.alerts{method,type=hit-rate|eviction-rate}`. `CacheManager.getHealthMetrics()` returns totals (caches, entries, average hit rate, evictions) for a health endpoint of your own.

**Failure behaviour.**

| Event | Result |
|---|---|
| Dapr L2 read fails | Logged at WARN, treated as a miss |
| Redis or in-memory L2 read fails | The exception reaches the caller |
| Kafka send fails | Logged at ERROR; the local change stands |
| `@CacheRefresh` loader throws | Logged at WARN; the schedule continues |
| `@CacheWarmup` method throws | Logged at WARN; startup continues |
| Shutdown | Refresh and warmup pools (`adhar-cache-refresh-N`, `adhar-cache-warmup-N`, two daemon threads each) are stopped with `shutdownNow()`; in-flight work is dropped |

**Tests.** Call `CacheFacade.clearAll()` between tests, because the registries are process-wide. Use `cleanUp()` instead of sleeping for expiry. Annotations do nothing on `new ProductService(...)`; test through a Spring context, or set `adhar.cache.aspects.enabled=false` to test the plain method.

## Limits

- `InMemorySecondLevelCache` is per pod. `@MultiLevelCache` is shared across pods only with Dapr, Redis or your own `SecondLevelCache`.
- `SpringCacheSecondLevelCache` ignores `l2Ttl`; the Redis cache manager's `adhar.cache.time-to-live` decides expiry. If the named Spring cache does not exist, every L2 call is a no-op.
- Kafka mode keeps unbounded `ConcurrentHashMap`s locally, with no TTL. Messages from the same instance are skipped by `sourceInstanceId`.
- With Lettuce on the classpath and no Redis connection configured, `RedisConfig` connects to `localhost:6379`. Set `adhar.cache.redis.enabled=false` if you only want Caffeine.
- Nothing invalidates a Caffeine (L1) entry on other pods; Kafka sync applies only to Spring's `@Cacheable`. Keep `l1Ttl` short for data that changes.
- `@CacheLock` and `@CacheCircuitBreaker` state is per JVM.
- Both builders default `maximumSize` to 1000. `adhar.cached(...)` creates a missing cache with that bound, no expiry and no stats; build the cache yourself first when you need a TTL.

## Next steps

- [Metrics](/adhar-kit/modules/metrics) — where the cache meters land
- [Dapr](/adhar-kit/modules/dapr) — the state store behind the Dapr L2
- [Resilience](/adhar-kit/modules/resilience) — the same protection patterns for outbound calls
- [Concepts](/adhar-kit/concepts) — module toggles and the facade
