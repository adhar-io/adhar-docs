---
title: "Cache"
section: "Modules"
order: 16
path: "/adhar-kit/modules/cache"
---

# Cache

`adhar-kit-cache` is high-performance caching built on Caffeine: a fluent builder facade, loading caches, TTL/TTI/size eviction, statistics, a central cache manager, and thirteen declarative annotations. It solves the part of caching that is genuinely hard — not storing a value, but **doing so without stampedes, without unbounded growth, and without going blind** to whether the cache is helping at all.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-cache` (package `com.adhar.adharkit.cache`) |
| Built on | Caffeine (L1), optional Redis / Spring Cache / Dapr (L2), Kafka for invalidation, Micrometer, `adhar-kit-commons` |
| Entry points | `CacheFacade`, `CacheManager`, the annotation set |
| Auto-configuration | `AdharCacheAutoConfiguration`, `AdharCacheAspectsAutoConfiguration`, `AdharCacheDaprAutoConfiguration` |
| Use it when | A read is expensive and repeats, and you need the hit rate on a dashboard |

## How it works

`CacheManager` is a registry of named `CacheFacade` instances, each wrapping a Caffeine cache. The aspects resolve a cache by name through the manager, so a cache configured in code and one created by an annotation are the same object — and both appear in the statistics.

```text
  @Cacheable / @CachePut / @CacheEvict
        |
        v
   CachingAspect --- CacheKeyGenerator (SpEL key + KeyPartitionResolver)
        |
        v
   CacheManager ---> CacheFacade("products")  --> Caffeine L1
        |                    |
        |                    +--> CacheMetricsBinder --> Micrometer
        |                            adhar.cache.gets{result=hit|miss}
        |                            adhar.cache.evictions
        |                            adhar.cache.hit.ratio
        |                            adhar.cache.size
        |
        +--> MultiLevelCacheService (for @MultiLevelCache)
                 L1: CacheManager        L2: SecondLevelCache
                                              InMemory (default)
                                              SpringCache (e.g. Redis)
                                              Dapr

  KafkaCacheListener / KafkaCacheManager: cross-node invalidation messages
```

The L2 default is `InMemorySecondLevelCache` — useful for tests, useless across pods. Publish your own `SecondLevelCache` bean (for example `SpringCacheSecondLevelCache` over a Redis `CacheManager`) to make `@MultiLevelCache` genuinely distributed.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-cache</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`CacheFacade`** — one named cache. Writes: `put`, `putAll`, `putIfAbsent`. Reads: `get(key)`, `get(key, Class)`, `get(key, loader)`, `getAll(keys)`. Maintenance: `evict`, `evictAll`, `clear`, `cleanUp`. Introspection: `stats()`, `size()`, `keys()`, `containsKey`. Statics: `builder()`, `loadingBuilder()`, `getCache(name)`, `getAllCaches()`, `clearAll()`.
- **`CacheManager`** — `getInstance()`, `createCache(name)`, `getOrCreateCache(name)`, `getCache(name)`, `registerCache`, `getCacheNames`, `removeCache`, `clearAll`, `cleanUpAll`, `getAllStats`, `getCacheStats(name)`, `getHealthMetrics`, `getTotalEntries`, plus defaults via `setDefaultMaxSize` / `setDefaultExpireAfterWrite` / `setDefaultRecordStats`.
- **Core annotations** — `@Cacheable`, `@CachePut`, `@CacheEvict`, `@EnableCaching`.
- **Protection annotations** — `@CacheLock` (single-flight on an expensive load), `@CacheCircuitBreaker` (stop hammering a failing L2), `@CacheRateLimit` (bound concurrent and per-second loads).
- **Topology annotations** — `@MultiLevelCache` (L1 over L2), `@CachePartition` (per-tenant key namespacing), `@CacheRefresh` (proactive refresh of hot entries), `@CacheWarmup` (populate at startup), `@CacheMonitor` (alert on a poor hit rate).

## A minimal cache

```java
import com.adhar.adharkit.cache.CacheFacade;
import java.time.Duration;

CacheFacade cache = CacheFacade.builder()
    .cacheName("users")
    .maximumSize(1000)
    .expireAfterWrite(Duration.ofMinutes(10))
    .recordStats(true)
    .build();

cache.put("user123", user);
User u = cache.get("user123", User.class);
```

Or cache-aside in one line through the facade shortcut:

```java
User user = adhar.cached("users", id, User.class, () -> db.find(id));
```

## A realistic service

Declarative caching with stampede protection and a distributed second level:

```java
import com.adhar.adharkit.cache.annotation.CacheEvict;
import com.adhar.adharkit.cache.annotation.CacheLock;
import com.adhar.adharkit.cache.annotation.Cacheable;
import com.adhar.adharkit.cache.annotation.MultiLevelCache;
import java.util.concurrent.TimeUnit;

@Service
public class ProductService {

    // ttl is a number plus a unit - not a duration string
    @Cacheable(cacheName = "products", key = "#id",
               ttl = 5, ttlUnit = TimeUnit.MINUTES,
               unless = "#result == null", sync = true)
    public Product findProduct(String id) {
        return repo.get(id);
    }

    @CacheLock(lockKey = "'pricing:' + #sku", waitTime = 5, leaseTime = 30)
    @MultiLevelCache(l1Cache = "pricing-l1", l2Cache = "pricing-l2",
                     key = "#sku", l1Ttl = 5, l2Ttl = 60)
    public Price computePrice(String sku) {
        return pricingEngine.evaluate(sku);   // expensive; runs once per key
    }

    @CacheEvict(cacheName = "products", key = "#product.id")
    public void update(Product product) {
        repo.save(product);
    }
}
```

`@Cacheable` also takes `condition` (decide before the call) and `unless` (decide on the result); `sync = true` collapses concurrent misses for the same key. `@CacheEvict` adds `allEntries` and `beforeInvocation`. All of this runs through proxy-based aspects registered by `AdharCacheAspectsAutoConfiguration`, which needs `aspectjweaver` on the classpath and `adhar.cache.aspects.enabled` left at its default of `true` — self-invoked methods are not intercepted.

## Statistics

When `micrometer-core` is present, `CacheMetricsBinder` publishes `adhar.cache.gets` (tagged `result=hit|miss`), `adhar.cache.evictions`, `adhar.cache.hit.ratio`, and `adhar.cache.size`, tagged by cache name — so hit rates show up in Grafana next to your other [metrics](/adhar-kit/modules/metrics). Statistics are only collected on caches built with `recordStats(true)`.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.cache.enabled` | Master switch | `true` |
| `adhar.cache.time-to-live` | Default TTL for managed caches | `PT30M` |
| `adhar.cache.max-size` | Default maximum entries | `1000` |
| `adhar.cache.allow-null-values` | Permit caching a `null` result | `true` |
| `adhar.cache.aspects.enabled` | Register the annotation aspects | `true` |
| `adhar.cache.partitioning.enabled` | Prefix keys with the resolved partition (tenant) | `false` |
| `adhar.cache.partitioning.separator` | Partition/key separator | `::` |
| `adhar.cache.redis.enabled` | Redis-backed distributed layer | `true` |
| `adhar.cache.redis.key-prefix` | Namespace for Redis keys | `adhar-cache:` |
| `adhar.cache.kafka.enabled` | Kafka invalidation messages | `true` |
| `adhar.cache.kafka.topic-prefix` | Invalidation topic prefix | `adhar-cache` |

Builder options on `CacheFacade.builder()` / `loadingBuilder()`: `cacheName`, `maximumSize`, `initialCapacity`, `expireAfterWrite`, `expireAfterAccess`, `refreshAfterWrite`, `recordStats`, and `loader`.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `expireAfterWrite = "5m"` on an annotation does not compile | Annotations take `ttl` (a `long`) plus `ttlUnit` | Use `ttl = 5, ttlUnit = TimeUnit.MINUTES` |
| `@Cacheable` never caches | Self-invocation, or `aspectjweaver` missing | Call through the proxy; verify `adhar.cache.aspects.enabled` |
| `stats()` returns zeros | The cache was built without `recordStats(true)` | Enable it at build time |
| `@MultiLevelCache` misses on every pod | The default L2 is in-process | Publish a `SecondLevelCache` bean over Redis or Dapr |
| A stale entry survives an update on another pod | L1 is local and nothing invalidated it | Enable the Kafka invalidation channel, or evict through the shared L2 |
| Two tenants see each other's data | Keys collide because partitioning is off | Set `adhar.cache.partitioning.enabled=true`, or use `@CachePartition` |

## See also

- [Metrics](/adhar-kit/modules/metrics) — where the cache gauges and counters land
- [Persistence](/adhar-kit/modules/persistence) — the queries most often worth caching
- [Resilience](/adhar-kit/modules/resilience) — the same protection patterns for outbound calls
- [Dapr](/adhar-kit/modules/dapr) — the Dapr state store as an L2 backend
