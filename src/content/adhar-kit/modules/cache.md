---
title: "Cache"
section: "Modules"
order: 16
path: "/adhar-kit/modules/cache"
---

# Cache

`adhar-kit-cache` is high-performance caching built on Caffeine. It gives you a fluent builder facade, loading caches, TTL/TTI/size eviction, statistics, a central cache manager, and eleven declarative annotations.

Storing a value is easy. The hard part is **doing so without stampedes, without unbounded growth, and without going blind** to whether the cache is helping at all. That is the part this module solves.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-cache` (package `com.adhar.adharkit.cache`) |
| Built on | Caffeine (L1), optional Redis / Spring Cache / Dapr (L2), Kafka for invalidation, Micrometer, `adhar-kit-commons` |
| Entry points | `CacheFacade`, `CacheManager`, the annotation set |
| Auto-configuration | `AdharCacheAutoConfiguration`, `AdharCacheAspectsAutoConfiguration`, `AdharCacheDaprAutoConfiguration` |
| Use it when | A read is expensive and repeats, and you need the hit rate on a dashboard |

## How it works

`CacheManager` is a registry of named `CacheFacade` instances. Each one wraps a Caffeine cache. The aspects look up a cache by name through the manager. So a cache configured in code and one created by an annotation are the same object, and both appear in the statistics.

```diagram
kit-cache-layers
```

`CacheManager` is a singleton, created eagerly and backed by a `ConcurrentHashMap`. `CacheFacade` also keeps its own static registry, which every `build()` writes into. Both are process-wide and shared by every thread. Neither is a Spring bean you can scope. If you build a second cache with a name already in use, it silently replaces the registry entry. Treat cache names as global constants.

## Eviction: four policies, and they are not interchangeable

Caffeine applies whichever of these you configured. An entry leaves when the *first* of them fires.

| Builder option | Clock starts at | Removes an entry when |
|---|---|---|
| `maximumSize(n)` | — | The cache is over capacity, by frequency-and-recency admission |
| `expireAfterWrite(d)` | The last write to that key | `d` has elapsed since that write, however often it was read |
| `expireAfterAccess(d)` | The last read *or* write | `d` has elapsed with no access — a time-to-idle |
| `refreshAfterWrite(d)` | The last write | Nothing is removed; see below |

Two consequences catch people out.

First, **eviction and expiry are lazy**. Caffeine does its housekeeping during other operations. So an expired entry can linger until something touches the cache. `size()` reports `estimatedSize()`. `cleanUp()` forces a maintenance pass. In tests, call it instead of sleeping and hoping.

Second, **`refreshAfterWrite` never serves a miss.** Once the interval has passed, the next read returns the *existing, stale* value at once and schedules an asynchronous reload. Only a later reader sees the new value. One reload runs per key, and if it fails the old value stays. This is right for a hot key where latency matters more than freshness. It is wrong when a stale answer is incorrect, not merely old.

> `refreshAfterWrite` requires a loader. `CacheFacade.builder()` accepts the option, but then calls Caffeine's no-loader `build()`, which rejects the combination at build time. Whenever you set it, use `CacheFacade.loadingBuilder()` with `.loader(...)`.

## Stampede protection

There are two mechanisms, with different scope.

- **`get(key, loader)` and `@Cacheable(sync = true)`** both compile down to Caffeine's atomic `Cache.get(key, mappingFunction)`. Concurrent callers for the same key block on the compute. Exactly one runs the loader, and the rest get its result. Different keys compute in parallel. Checked exceptions thrown by the method body pass through a wrapper and are unwrapped before they reach you. Note that in `sync` mode the aspect skips the `unless` and post-`#result` `condition` checks, because the compute itself caches the value.
- **`@CacheLock`** extends that guard to any expensive operation, cached or not, keyed by a SpEL expression. It is implemented as a `ConcurrentHashMap<String, CompletableFuture<Object>>`. The first caller for a key becomes the leader, and the rest wait on its future.
  - **It is an in-JVM guard, not a distributed lock.** Every pod elects its own leader.
  - `waitTime` is in **seconds**. When a follower's wait runs out, it logs and computes the value locally instead of failing. So under heavy contention the guard degrades to no guard. Set `failFast = true` to get a `CacheLockAcquisitionException` instead.
  - `leaseTime` is advisory. The aspect does not read it.

## The second level is in-process by default

This is the most important caveat on the page. `AdharCacheAspectsAutoConfiguration` registers `InMemorySecondLevelCache` as the `SecondLevelCache` bean. That is a `ConcurrentHashMap` of maps with its own TTL bookkeeping, living inside the JVM. **`@MultiLevelCache` is therefore not distributed out of the box.** Every pod has its own L1 *and* its own L2. An entry written on one pod is invisible to the others.

To make it really distributed, publish your own `SecondLevelCache` bean. The SPI has four methods:

```java
Object get(String cacheName, Object key);
void put(String cacheName, Object key, Object value, Duration ttl);
void evict(String cacheName, Object key);
void clear(String cacheName);
```

Three implementations ship. Each has a caveat to know before you pick one:

- `SpringCacheSecondLevelCache`, over a Redis Spring `CacheManager`. **It ignores the `ttl` argument on every `put`**, because Spring's `Cache` has no per-entry TTL. So `l2Ttl` does nothing, and your Redis cache configuration decides expiry. If the named Spring cache does not exist, every operation is a silent no-op.
- `DaprSecondLevelCache`, over a Dapr state store. It is registered only when `adhar.dapr.enabled=true` (no `matchIfMissing`). A read failure is caught, logged at WARN and **treated as a miss**, which is the degradation you want. A write failure propagates. `clear(name)` always throws `UnsupportedOperationException`, because state stores cannot list their keys.
- `InMemorySecondLevelCache`, the default, for tests.

On a read, `MultiLevelCacheService` checks L1, then L2. It **promotes an L2 hit back into L1** before returning. It calls your loader only when both miss. The result always goes to L1. It goes to L2 only when `writeThrough` is true (the default).

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-cache</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`CacheFacade`** — one named cache.
  - Writes: `put`, `putAll`, `putIfAbsent`.
  - Reads: `get(key)`, `get(key, Class)`, `get(key, loader)`, `getAll(keys)`.
  - Maintenance: `evict`, `evictAll`, `clear`, `cleanUp`.
  - Introspection: `stats()`, `size()`, `keys()`, `containsKey`.
  - Statics: `builder()`, `loadingBuilder()`, `getCache(name)`, `getAllCaches()`, `clearAll()`.
- **`CacheManager`** — `getInstance()`, `createCache(name)`, `getOrCreateCache(name)`, `getCache(name)`, `registerCache`, `getCacheNames`, `removeCache`, `clearAll`, `cleanUpAll`, `getAllStats`, `getCacheStats(name)`, `getHealthMetrics`, `getTotalEntries`, plus defaults via `setDefaultMaxSize` / `setDefaultExpireAfterWrite` / `setDefaultRecordStats`.
- **Core annotations** — `@Cacheable`, `@CachePut`, `@CacheEvict`.
- **Protection annotations** — `@CacheLock` (single-flight on an expensive load), `@CacheCircuitBreaker` (stop hammering a failing load path), `@CacheRateLimit` (bound concurrent and per-second loads).
- **Topology annotations** — `@MultiLevelCache` (L1 over L2), `@CachePartition` (per-tenant key namespacing), `@CacheRefresh` (proactive refresh of hot entries), `@CacheWarmup` (populate at startup), `@CacheMonitor` (alert on a poor hit rate).

On a type mismatch, `get(key, Class)` returns `null` and logs a warning instead of throwing. `CacheManager.createCache(name)` returns `null` if the name is already registered, so prefer `getOrCreateCache`.

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

## A complete service

Declarative caching with stampede protection and a second level:

```java
package com.example.catalog;

import com.adhar.adharkit.cache.annotation.CacheEvict;
import com.adhar.adharkit.cache.annotation.CacheLock;
import com.adhar.adharkit.cache.annotation.Cacheable;
import com.adhar.adharkit.cache.annotation.MultiLevelCache;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Service
public class ProductService {

    private final ProductRepository repo;
    private final PricingEngine pricingEngine;

    public ProductService(ProductRepository repo, PricingEngine pricingEngine) {
        this.repo = repo;
        this.pricingEngine = pricingEngine;
    }

    // ttl is a number plus a unit - not a duration string
    @Cacheable(cacheName = "products", key = "#id",
               ttl = 5, ttlUnit = TimeUnit.MINUTES,
               unless = "#result == null", sync = true)
    public Product findProduct(String id) {
        return repo.get(id);
    }

    // waitTime is SECONDS; the guard is per-JVM, not cluster-wide
    @CacheLock(lockKey = "'pricing:' + #sku", waitTime = 5)
    @MultiLevelCache(l1Cache = "pricing-l1", l2Cache = "pricing-l2",
                     key = "#sku", l1Ttl = 5, l2Ttl = 60)
    public Price computePrice(String sku) {
        return pricingEngine.evaluate(sku);   // expensive; runs once per key per pod
    }

    @CacheEvict(cacheName = "products", key = "#product.id")
    public void update(Product product) {
        repo.save(product);
    }
}
```

`@Cacheable` also takes `condition` (decided before the call) and `unless` (decided on the result). `@CacheEvict` adds `allEntries` and `beforeInvocation`. With `beforeInvocation = true`, the eviction happens even if the method throws.

### Expression and proxy mechanics

Key, `condition` and `unless` expressions are SpEL. Each is parsed once and memoised. The evaluation context exposes:

- `#<parameterName>` for every parameter;
- the positional aliases `#p0`/`#a0`;
- `#result` (null before the call);
- a root object giving `#root.methodName`, `#root.target`, `#root.args` and `#root.method`.

Named parameters need the class to be compiled with `-parameters`. Without it, use `#p0`. If you leave `key` blank, the default is `declaringClass.methodName:<deepHashCode of args>`.

`AdharCacheAspectsAutoConfiguration` registers the aspects. It carries `@EnableAspectJAutoProxy(proxyTargetClass = true)` and is gated on `adhar.cache.aspects.enabled` (default `true`). Only two aspects declare an order: `@CacheRateLimit` is outermost, then `@CacheCircuitBreaker`. The rest have no order relative to each other. When you stack more than two, do not rely on `@CacheLock` and `@MultiLevelCache` combining in a particular direction.

> **Self-invocation silently disables every annotation here.** The aspects are Spring AOP around-advice. They fire only on calls that arrive through the proxy. A `this.findProduct(id)` call from another method in `ProductService` runs the raw method: no cache, no lock, no warning. Inject the bean into a collaborator and call it from there. The same trap applies to `@CacheRefresh`. On its refresh schedule, it invokes the **raw target method** by reflection, so any other annotation on that method is bypassed on refresh.

## How it behaves

- **Thread safety.** `CacheFacade` holds only a name and the Caffeine cache, so it is safe to share. `CacheManager` and the facade registry are `ConcurrentHashMap`s. Every aspect is a stateless singleton, apart from its own concurrent bookkeeping maps.
- **TTL is fixed at creation.** When an annotation's `ttl` causes a cache to be built, that TTL is baked in. A second method that names the same `cacheName` with a different `ttl` silently gets the existing cache, with its original TTL.
- **Scheduled work.** `CacheRefreshScheduler` runs on its own two-thread daemon pool (`adhar-cache-refresh-N`) with `scheduleAtFixedRate`. `CacheWarmupProcessor` runs on another pool (`adhar-cache-warmup-N`), triggered by `ApplicationReadyEvent`. Neither uses Spring's `TaskScheduler`. Both are registered with `destroyMethod = "close"`. So shutdown calls `shutdownNow()`, and in-flight refreshes are dropped, not drained.
- **Startup is never blocked by warmup failures.** Once the context is ready, `@CacheWarmup` scans every bean definition. A warmup method that throws is caught and logged at WARN. A `Map` result is bulk-loaded with `putAll`. Any other non-null result is stored under the method name. `delay` here is in **milliseconds**, unlike `@CacheRefresh`, which uses minutes.
- **Failure behaviour.** A refresh loader that throws is swallowed at WARN, and the periodic task survives. Failures to send Kafka invalidation messages are only logged at ERROR. The local change already happened and is not rolled back. A non-Dapr L2 that throws on read is *not* caught by `MultiLevelCacheService`, and the whole call fails.
- **Resource bounds.** `maximumSize` defaults to 1000 on both builders. `getOrCreateCache` picks up `CacheManager`'s defaults of 1000 entries and a 10-minute write TTL. A cache built with neither a size bound nor an expiry bound grows until the heap runs out.

## Statistics

When `micrometer-core` is present, `CacheMetricsBinder` (a `MeterBinder`) publishes four meters, all tagged `cache=<name>`:

| Meter | Type | Tags | Source |
|---|---|---|---|
| `adhar.cache.gets` | counter | `result=hit` | `stats().hitCount()` |
| `adhar.cache.gets` | counter | `result=miss` | `stats().missCount()` |
| `adhar.cache.evictions` | counter | — | `stats().evictionCount()` |
| `adhar.cache.hit.ratio` | gauge | — | `stats().hitRate()` |
| `adhar.cache.size` | gauge | — | `estimatedSize()` |

Binding is idempotent and lazy. Caches created after `bindTo` are picked up on the next pass.

`@CacheMonitor` emits its own set under `metricsPrefix` (default `cache`):

- `<prefix>.gets`, tagged `method` and `result`;
- a `<prefix>.latency` timer;
- a `<prefix>.alerts` counter, tagged `type=hit-rate` or `type=eviction-rate`.

These land next to your other [metrics](/adhar-kit/modules/metrics). **Statistics are only collected on caches built with `recordStats(true)`.** The builders default it to `false`; the manager defaults it to `true`.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.cache.enabled` | Master switch for `AdharCacheAutoConfiguration` | `true` |
| `adhar.cache.time-to-live` | Entry TTL used by the Redis cache manager | `PT30M` |
| `adhar.cache.allow-null-values` | Permit caching a `null` result | `true` |
| `adhar.cache.aspects.enabled` | Register the annotation aspects | `true` |
| `adhar.cache.partitioning.enabled` | Prefix keys with the resolved partition (tenant) | `false` |
| `adhar.cache.partitioning.separator` | Partition/key separator | `::` |
| `adhar.cache.redis.enabled` | Redis-backed distributed layer | `true` |
| `adhar.cache.redis.key-prefix` | Namespace for Redis keys | `adhar-cache:` |
| `adhar.cache.kafka.enabled` | Kafka invalidation messages | `true` |
| `adhar.cache.kafka.topic-prefix` | Invalidation topic prefix | `adhar-cache` |
| `adhar.kit.cache.dapr.state-store` | State store behind `DaprSecondLevelCache` | `statestore` |

Two gates are worth calling out:

- `AdharCacheAutoConfiguration` covers the Kafka invalidation path and the `cacheManager` bean. It is also `@ConditionalOnClass` on `org.apache.kafka.clients.producer.KafkaProducer`. So none of it exists without Kafka on the classpath.
- `RedisConfig` is **not** listed in `AutoConfiguration.imports`. The `adhar.cache.redis.*` keys take effect only once you import that configuration explicitly.

Invalidation messages flow over `<topic-prefix>-put`, `-evict` and `-clear`. Each carries a `sourceInstanceId`. `KafkaCacheListener` skips messages that came from the same instance, so a write does not echo back.

Builder options on `CacheFacade.builder()`: `cacheName`, `maximumSize`, `initialCapacity`, `expireAfterWrite`, `expireAfterAccess`, `refreshAfterWrite`, `recordStats`. `loadingBuilder()` has the same set minus `initialCapacity`, plus a required `loader`.

## Testing

- **Isolate between tests.** The manager and the facade registry are process-wide singletons. A cache filled by one test is visible to the next. Call `CacheFacade.clearAll()` in an `@AfterEach`.
- **Do not sleep for expiry.** Build the cache with a very short `expireAfterWrite`. Call `cleanUp()` to force a maintenance pass, then assert on `size()` or `containsKey`.
- **Test the aspect, not the object.** `new ProductService(...)` has no proxy, so annotations do nothing. Use a slice context that imports `AdharCacheAspectsAutoConfiguration`. Or set `adhar.cache.aspects.enabled=false` to turn caching off and test the plain method.
- **Prove the stampede guard.** Fire N threads at one key through a `CountDownLatch`, and assert the loader ran exactly once. That is what sets `sync = true` apart from a plain `@Cacheable`.
- **For a real distributed L2**, `adhar-kit-test-commons` provides `@AdharIntegrationTest(AdharContainer.REDIS)` and `RedisIntegrationTest`.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `expireAfterWrite = "5m"` on an annotation does not compile | Annotations take `ttl` (a `long`) plus `ttlUnit` | Use `ttl = 5, ttlUnit = TimeUnit.MINUTES` |
| `@Cacheable` never caches | Self-invocation, or `aspectjweaver` missing | Call through the proxy; verify `adhar.cache.aspects.enabled` |
| `IllegalStateException` on `build()` | `refreshAfterWrite` set on a cache with no loader | Use `loadingBuilder()` and supply `.loader(...)` |
| `stats()` returns zeros | The cache was built without `recordStats(true)` | Enable it at build time |
| A second method's `ttl` is ignored | The cache already existed; TTL is fixed at creation | Give it its own `cacheName` |
| `#id` resolves to nothing in a key | Compiled without `-parameters` | Add the compiler flag, or use `#p0` |
| `@MultiLevelCache` misses on every pod | The default L2 is in-process | Publish a `SecondLevelCache` bean over Redis or Dapr |
| `l2Ttl` has no effect on Redis | `SpringCacheSecondLevelCache` ignores per-put TTL | Set expiry in the Redis cache configuration |
| `@CacheLock` lets two pods compute at once | It is a per-JVM single-flight guard | Accept one load per pod, or add a real distributed lock |
| A stale entry survives an update on another pod | L1 is local and nothing invalidated it | Enable the Kafka invalidation channel, or evict through the shared L2 |
| Two tenants see each other's data | Keys collide because partitioning is off | Set `adhar.cache.partitioning.enabled=true`, or use `@CachePartition` |

## See also

- [Metrics](/adhar-kit/modules/metrics) — where the cache gauges and counters land
- [Persistence](/adhar-kit/modules/persistence) — the queries most often worth caching
- [Resilience](/adhar-kit/modules/resilience) — the same protection patterns for outbound calls
- [Dapr](/adhar-kit/modules/dapr) — the Dapr state store as an L2 backend
