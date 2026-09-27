---
title: "Cache"
section: "Modules"
order: 16
path: "/adhar-kit/modules/cache"
---

# Cache

`adhar-kit-cache` is high-performance caching built on Caffeine: a fluent builder facade, loading caches, TTL/TTI/size eviction, statistics, a central cache manager, and declarative caching annotations.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-cache</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

- `CacheFacade` — `builder()`, `loadingBuilder()`, `put/get/getAll/evict/clear`, `stats`, `size`
- `CacheManager` — `getInstance()`, `createCache`, `getCache`, `getAllStats`, `getHealthMetrics`
- **Annotations** — `@Cacheable`, `@CachePut`, `@CacheEvict`, `@CacheLock`, `@MultiLevelCache`, `@CacheRefresh`

## Fluent cache

```java
import com.adhar.kit.cache.CacheFacade;
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

## Cache-aside via the facade shortcut

```java
User user = adhar.cached("users", id, User.class, () -> db.find(id));
```

## Declarative annotations

```java
@Cacheable(cacheName = "products", key = "#id", expireAfterWrite = "5m")
public Product findProduct(String id) { return repo.get(id); }

@CacheEvict(cacheName = "products", key = "#product.id")
public void update(Product product) { repo.save(product); }
```

`@MultiLevelCache` layers an in-memory L1 over a distributed L2; `@CacheLock` prevents cache-stampede on expensive loads; `@CacheRefresh` proactively refreshes hot entries.

## Statistics

Cache stats (hit rate, evictions, load time) export to Micrometer automatically when `micrometer-core` is present, so they show up in Grafana next to your other [metrics](/adhar-kit/modules/metrics).

## Configuration

| Property | Purpose |
|---|---|
| `adhar.cache.aspects.enabled` | Enable/disable the annotation aspects |

Builder options: `cacheName`, `maximumSize`, `initialCapacity`, `expireAfterWrite`, `expireAfterAccess`, `refreshAfterWrite`, `recordStats`, `loader`.
