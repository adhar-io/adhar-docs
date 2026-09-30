---
title: "Core"
section: "Modules"
order: 11
path: "/adhar-kit/modules/core"
---

# Core

`adhar-kit-core` is a dependency-light collection of fundamental patterns and utilities: functional types, retry/backoff, async execution with context propagation, memoization, lazy initialization, type conversion, and distributed ID generation. It solves the problem that **these primitives are too small to justify a library each, and too important to hand-roll per service** — so they drift, and the hand-rolled retry loop is the one that takes production down.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-core` |
| Built on | Plain Java plus Guava, Apache Commons Lang3/Collections4/Codec, Jackson; Spring AOP and autoconfigure are optional |
| Entry points | `CoreFacade`, `Result<T, E>`, `Specification<T>`, `RetryUtil`, `SnowflakeIdGenerator`, `ContextPropagatingExecutor` |
| Auto-configuration | `CoreAutoConfiguration` (gated on `adhar.core.enabled`) |
| Use it when | You need retry, async, IDs, or error-as-value types without pulling in a framework |

## How it works

Core is two layers. The lower one is a set of static utilities and value types with no Spring dependency at all — usable from a plain `main()`. The upper one is an auto-configuration that, when Spring is present, publishes a shared executor, an `ObjectMapper`, a `CoreFacade`, and three aspects.

```text
  CoreAutoConfiguration        (adhar.core.enabled, default true)
    |
    +-- adharCoreAsyncExecutor : ExecutorService   <- adhar.core.async.*
    +-- objectMapper           : ObjectMapper
    +-- CoreFacade             : ids, json, retry, async, hashing
    |
    +-- AspectsConfiguration   (needs ProceedingJoinPoint on the classpath,
        |                       adhar.core.aspects.enabled, default true)
        +-- RetryAspect    @Retry
        +-- MemoizeAspect  @Memoize
        +-- AsyncAspect    @Async   (runs on adharCoreAsyncExecutor)

  No-Spring layer (always available):
    Result / Either / Try / Specification / Observable
    Lazy / Memoizer / RetryUtil / AsyncUtil / TypeConverter
    SnowflakeIdGenerator / ContextPropagatingExecutor
```

The aspects are proxy-based, so the usual Spring AOP rule applies: an annotated method only gets the behaviour when called through the bean's proxy, never on self-invocation.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-core</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`Result<T, E>`** — error-as-value. Two subclasses, `Success` and `Failure`, with `map`, `flatMap`, `mapError`, `ifSuccess`, `ifFailure`, `recover`, `fold`, `match`, `getOrDefault`, `getOrThrow`, `toOptional`, and the static `success`, `failure`, `of(Callable)`, `fromOptional`, `combine`. Use it where a failure is an expected outcome rather than an exceptional one. `Either` and `Try` sit alongside it for the cases where you want an untyped left/right or exception capture.
- **`Specification<T>`** — a `Predicate<T>` you can name, compose (`and`, `or`, `negate`) and apply to collections (`filter`, `findFirst`, `anyMatch`, `allMatch`). Business rules become reusable objects instead of inline lambdas.
- **`Lazy<T>` / `Memoizer<K, V>`** — deferred and cached computation. `Lazy.of(supplier)` initializes once; `Memoizer` caches per key, optionally with a TTL in milliseconds.
- **`RetryUtil`** — `execute` and `executeWithBackoff`, plus a nested `RetryPolicy` builder (`maxRetries`, `initialDelay`, `maxDelay`, `backoffMultiplier`) when you want the policy as a value.
- **`AsyncUtil`** — `runAsync`, `supplyAsync`, `executeInParallel`, `waitAll`, `executeWithTimeout` over a settable executor.
- **`ContextPropagatingExecutor`** — an `ExecutorService` decorator that captures registered `ContextSnapshot`s (MDC by default, via `MdcContextSnapshot`) on submit and restores them on the worker thread.
- **`TypeConverter`** — `convert`, `objectToMap`, `mapToObject`, `parseDate`, `parseDateTime`, `canConvert`, extensible through `TypeConverterSpi` and `ConverterRegistry`.
- **`Observable<T>`** — in-process pub/sub with `subscribe`, `notifyObservers`, and a `Subscription` handle.
- **`CoreFacade`** — the one-stop bean: `generateId`, `generateUUID`, `generateShortId`, `generateSnowflakeId`, `toJson`, `toPrettyJson`, `fromJson`, `retryWithBackoff`, `executeAsync`, `generateSHA256`. Reachable as `AdharFacade.getUtils()`.
- **Annotations** — `@Retry`, its nested `@Retry.Backoff`, `@Async`, `@Memoize`.

## Declarative retry

The minimal form takes the registry defaults (3 attempts, 1000 ms initial delay, 2.0 multiplier):

```java
import com.adhar.kit.core.annotation.Retry;

@Service
public class PaymentService {

    @Retry(maxAttempts = 3,
           backoff = @Retry.Backoff(delay = 1000, maxDelay = 30000, multiplier = 2.0),
           retryOn = { IOException.class, TimeoutException.class })
    public PaymentResult process(PaymentRequest request) {
        return gateway.charge(request);
    }
}
```

`retryOn` defaults to `Exception.class`; narrowing it matters, because retrying a validation failure only buys three times the latency for the same 400.

## Result and Specification together

```java
import com.adhar.kit.core.pattern.Result;
import com.adhar.kit.core.pattern.Specification;

Specification<User> active  = User::isEnabled;
Specification<User> premium = u -> u.tier() == Tier.PREMIUM;
Specification<User> eligible = active.and(premium);

Result<Order, String> result = eligible.test(user)
        ? Result.success(orderService.place(request))
        : Result.<Order, String>failure("user not eligible");

result.ifSuccess(o -> log.info("placed {}", o.id()))
      .ifFailure(err -> log.warn("rejected: {}", err));

Order order = result.getOrThrow(IllegalStateException::new);
List<User> targets = eligible.filter(allUsers);
```

Note the method names: `ifSuccess` / `ifFailure`, not `onSuccess` / `onFailure`.

## Distributed IDs

`SnowflakeIdGenerator` produces time-sortable 64-bit IDs from a custom epoch (2024-01-01), with 10 node bits (0–1023) and 12 sequence bits. The node id resolves in order: the `adhar.core.snowflake.node-id` system property, then the `ADHAR_SNOWFLAKE_NODE_ID` environment variable, then a hash of the hostname, then a secure random value.

```java
SnowflakeIdGenerator generator = new SnowflakeIdGenerator();
long id = generator.nextId();

long ts   = SnowflakeIdGenerator.extractTimestamp(id);
long node = SnowflakeIdGenerator.extractNodeId(id);

// Through the facade
long viaFacade = adhar.getUtils().generateSnowflakeId();
String shortId = adhar.shortId();
```

## Async with context propagation

Wrap any executor so correlation and tenant MDC survive the thread hop:

```java
ExecutorService pool = new ContextPropagatingExecutor(
        Executors.newFixedThreadPool(8));

pool.submit(() -> {
    // MDC{correlationId, requestId, tenantId} is present here
    return reportService.build(query);
});
```

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.core.enabled` | Master switch for the auto-configuration | `true` |
| `adhar.core.aspects.enabled` | Register the `@Retry` / `@Memoize` / `@Async` aspects | `true` |
| `adhar.core.snowflake.node-id` | Node id, 0–1023; `-1` triggers auto-resolution | `-1` |
| `adhar.core.async.pool-size` | Core threads for `adharCoreAsyncExecutor` | `10` |
| `adhar.core.async.max-pool-size` | Maximum threads | `50` |
| `adhar.core.async.queue-capacity` | Bounded queue depth | `100` |
| `adhar.core.async.thread-name-prefix` | Worker thread name prefix | `adhar-async-` |
| `adhar.core.async.keep-alive-seconds` | Idle thread keep-alive | `60` |
| `adhar.core.retry.max-attempts` | Default retry attempts | `3` |
| `adhar.core.retry.initial-delay` | First backoff delay, ms | `1000` |
| `adhar.core.retry.max-delay` | Backoff ceiling, ms | `30000` |
| `adhar.core.retry.backoff-multiplier` | Exponential factor | `2.0` |

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `@Retry` / `@Memoize` silently ignored | Self-invocation, or `aspectjweaver` missing so the aspects were never registered | Call through the proxy; add `org.aspectj:aspectjweaver` |
| Two pods emit colliding snowflake IDs | Both fell back to the same hostname hash or random node id | Set `ADHAR_SNOWFLAKE_NODE_ID` per replica (a StatefulSet ordinal works well) |
| `result.onSuccess(...)` does not compile | The methods are `ifSuccess` / `ifFailure` | Rename the call |
| Tasks submitted to a raw pool lose `correlationId` | A plain `ExecutorService` copies no thread-locals | Wrap it in `ContextPropagatingExecutor` |
| `@Memoize` entries never expire | `ttl` defaults to `-1`, meaning "never" | Set `ttl` explicitly — it is in **milliseconds** |

## See also

- [Commons](/adhar-kit/modules/commons) — the MDC and tenant context that `ContextPropagatingExecutor` carries
- [Resilience](/adhar-kit/modules/resilience) — when you need circuit breaking and bulkheads, not retry alone
- [Cache](/adhar-kit/modules/cache) — a managed cache when `Memoizer` outgrows its scope
- [Concepts](/adhar-kit/concepts) — how the facades and module toggles fit together
