---
title: "Core"
section: "Modules"
order: 11
path: "/adhar-kit/modules/core"
---

# Core

`adhar-kit-core` is a dependency-light collection of fundamental patterns and utilities: functional types, retry/backoff, async execution with context propagation, memoization, lazy initialization, type conversion, and distributed ID generation.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-core</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

- **Patterns** — `Specification<T>`, `Result<T, E>`, `Observable<T>` / `Observer<T>`, `Lazy<T>`, `Memoizer<K, V>`
- **Utilities** — `RetryUtil`, `RetryPolicy`, `TypeConverter`, `AsyncUtil`, `SnowflakeIdGenerator`, `ContextPropagatingExecutor`
- **Facade** — `CoreFacade` (also `AdharFacade.getUtils()`)
- **Annotations** — `@Retry`, `@Backoff`, `@Async`, `@Memoize`

## Declarative retry

```java
@Service
public class PaymentService {
    @Retry(maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2.0))
    public PaymentResult process(PaymentRequest request) {
        return gateway.charge(request);   // retried with exponential backoff
    }
}
```

## Result and Specification

`Result<T, E>` models success/failure without exceptions; `Specification<T>` composes reusable predicates:

```java
Result<Order, String> result = orderService.place(request);
result.onSuccess(o -> log.info("placed {}", o.id()))
      .onFailure(err -> log.warn("rejected: {}", err));

Specification<User> active = u -> u.isEnabled();
Specification<User> premium = u -> u.tier() == Tier.PREMIUM;
boolean ok = active.and(premium).isSatisfiedBy(user);
```

## Distributed IDs

`SnowflakeIdGenerator` produces sortable 64-bit IDs; the node id auto-resolves (or set `ADHAR_SNOWFLAKE_NODE_ID`):

```java
long id = adhar.getUtils().snowflake().nextId();
String short = adhar.shortId();   // facade shortcut
```

## Async with context propagation

`ContextPropagatingExecutor` carries MDC (correlation/tenant) across thread boundaries, so async work stays traceable.

## Configuration

```yaml
adhar:
  core:
    enabled: true
    aspects:
      enabled: true
    snowflake:
      node-id: -1          # 0–1023; -1 = auto-resolve
    async:
      pool-size: 10
      max-pool-size: 50
      queue-capacity: 100
    retry:
      max-attempts: 3
      initial-delay: 1000
      backoff-multiplier: 2.0
```
