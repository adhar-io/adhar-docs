---
title: "Core"
section: "Modules"
order: 11
path: "/adhar-kit/modules/core"
---

# Core

`adhar-kit-core` is a small set of basic patterns and utilities with few dependencies. It covers functional types, retry/backoff, async execution with context propagation, memoization, lazy initialization, type conversion, and distributed ID generation.

It exists because **these primitives are too small to justify a library each, and too important to hand-roll per service**. Hand-rolled copies drift apart, and the hand-rolled retry loop is the one that takes production down.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-core` |
| Built on | Plain Java plus Guava, Apache Commons Lang3/Collections4/Codec, Jackson; Spring AOP and autoconfigure are optional |
| Entry points | `CoreFacade`, `Result<T, E>`, `Specification<T>`, `RetryUtil`, `SnowflakeIdGenerator`, `ContextPropagatingExecutor` |
| Auto-configuration | `CoreAutoConfiguration` (gated on `adhar.core.enabled`) |
| Use it when | You need retry, async, IDs, or error-as-value types without pulling in a framework |

## How it works

Core has two layers. The lower layer is a set of static utilities and value types with no Spring dependency at all. You can use it from a plain `main()`. The upper layer is an auto-configuration. When Spring is present, it publishes a shared executor, an `ObjectMapper`, a `CoreFacade`, and three aspects.

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

The aspects are proxy-based, so the usual Spring AOP rule applies. An annotated method only gets the behaviour when you call it through the bean's proxy, never on self-invocation.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-core</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`Result<T, E>`** — error-as-value. Two subclasses, `Success` and `Failure`, with `map`, `flatMap`, `mapError`, `ifSuccess`, `ifFailure`, `recover`, `fold`, `match`, `getOrDefault`, `orElseGet`, `getOrThrow`, `toOptional`, and the static `success`, `failure`, `of(Callable)`, `fromOptional`, `combine`. Use it when a failure is an expected outcome rather than an exceptional one. Use `Either` for an untyped left/right, and `Try` to capture an exception.
- **`Specification<T>`** — a `Predicate<T>` you can name, compose (`and`, `or`, `negate`, `where`, `alwaysTrue`, `alwaysFalse`) and apply to collections (`filter`, `findFirst`, `anyMatch`, `allMatch`). Business rules become reusable objects instead of inline lambdas.
- **`Lazy<T>` / `Memoizer<K, V>`** — deferred and cached computation. `Lazy.of(supplier)` initializes once behind a `volatile` field and a `ReentrantLock`. `Memoizer` caches per key, optionally with a TTL in milliseconds.
- **`RetryUtil`** — `execute` and `executeWithBackoff`, plus a nested `RetryPolicy` builder (`maxRetries`, `initialDelay`, `maxDelay`, `backoffMultiplier`) when you want the policy as a value.
- **`AsyncUtil`** — `runAsync`, `supplyAsync`, `executeInParallel`, `waitAll`, `executeWithTimeout` over a settable executor.
- **`ContextPropagatingExecutor`** — an `ExecutorService` decorator that captures registered `ContextSnapshot`s on submit and restores them on the worker thread.
- **`ContextSnapshot` / `ContextSnapshotRegistry`** — the SPI that decides *what* gets propagated. The default registry holds `MdcContextSnapshot` plus anything added via `register(...)` or discovered through `META-INF/services`.
- **`TypeConverter`** — `convert`, `objectToMap`, `mapToObject`, `parseDate`, `parseDateTime`, `canConvert`, extensible through `TypeConverterSpi` and `ConverterRegistry`.
- **`Observable<T>`** — in-process pub/sub with `subscribe`, `notifyObservers`, and a `Subscription` handle.
- **`CoreFacade`** — the one-stop bean: `generateId`, `generateUUID`, `generateShortId`, `generateSnowflakeId`, `toJson`, `toPrettyJson`, `fromJson`, `retryWithBackoff`, `executeAsync`, `generateSHA256`. Reachable as `AdharFacade.getUtils()`.
- **Annotations** — `@Retry`, its nested `@Retry.Backoff`, `@Async`, `@Memoize`.

## A realistic service

This example uses declarative retry on the I/O boundary, `Result` for the expected-failure path, and a `Specification` for the business rule:

```java
import com.adhar.kit.core.annotation.Retry;
import com.adhar.kit.core.pattern.Result;
import com.adhar.kit.core.pattern.Specification;
import java.io.IOException;
import java.util.concurrent.TimeoutException;

@Service
public class PaymentService {

    private static final Specification<Account> FUNDED =
            a -> a.balance().signum() > 0;
    private static final Specification<Account> UNBLOCKED =
            a -> !a.blocked();
    private static final Specification<Account> ELIGIBLE = FUNDED.and(UNBLOCKED);

    private final PaymentGateway gateway;

    public PaymentService(PaymentGateway gateway) {
        this.gateway = gateway;
    }

    public Result<PaymentResult, String> pay(Account account, PaymentRequest request) {
        if (!ELIGIBLE.test(account)) {
            return Result.failure("account not eligible");
        }
        // charge() is proxied, so the retry actually happens
        return Result.<PaymentResult>of(() -> charge(request))
                     .mapError(Throwable::getMessage);
    }

    @Retry(maxAttempts = 3,
           backoff = @Retry.Backoff(delay = 1000, maxDelay = 30000, multiplier = 2.0),
           retryOn = { IOException.class, TimeoutException.class })
    public PaymentResult charge(PaymentRequest request) throws IOException {
        return gateway.charge(request);
    }
}
```

Note two things. First, `retryOn` defaults to `Exception.class`. Narrow it: retrying a validation failure only gives you three times the latency for the same 400. Second, the result-handling methods are `ifSuccess` / `ifFailure`, not `onSuccess` / `onFailure`:

```java
Result<PaymentResult, String> result = payments.pay(account, request);
result.ifSuccess(r -> log.info("charged {}", r.reference()))
      .ifFailure(err -> log.warn("declined: {}", err));
PaymentResult value = result.getOrThrow(IllegalStateException::new);
```

## How it behaves

**What is a singleton.** With Spring, `CoreFacade`, the `ObjectMapper`, `adharCoreAsyncExecutor` and the three aspects are singletons. Without Spring, `CoreFacade.getInstance()` builds a *different* singleton. It has its own fixed pool (`availableProcessors() * 2` daemon threads) and its own `SnowflakeIdGenerator`.

- Value types (`Result`, `Either`, `Try`, `Specification`) are immutable and free to share.
- `Lazy`, `Memoizer`, `Observable`, `ContextSnapshotRegistry`, and `SnowflakeIdGenerator` are internally synchronised and safe to share.
- `TypeConverter` registrations are process-wide.

**The async executor.** `adharCoreAsyncExecutor` is a `ThreadPoolExecutor` with:

- `pool-size` core threads
- a `LinkedBlockingQueue` of `queue-capacity`
- a `max-pool-size` ceiling
- `CallerRunsPolicy`
- daemon threads named `adhar-async-<n>`

The standard `ThreadPoolExecutor` growth rule applies. Threads grow to the core size, then work queues. Only when the queue is full do threads grow towards the maximum. These are platform threads, not virtual threads.

When both the queue and the pool are saturated, `CallerRunsPolicy` runs the task on the *submitting* thread. You get backpressure instead of a rejection exception. But it also means a saturated pool slows down your request threads. The whole executor is wrapped in a `ContextPropagatingExecutor`, so the MDC follows the task.

**Shutdown.** The executor bean declares `destroyMethod = "shutdown"`. On context close, it stops accepting work and drains what is already queued. In-flight tasks are not interrupted, and `shutdownNow` is never called. The threads are daemons, so a JVM exit will not wait for them.

**Ordering.** Nothing in core guarantees ordering. Tasks submitted to the shared pool interleave freely, and `CallerRunsPolicy` can even complete a later task before an earlier queued one.

**`ContextPropagatingExecutor` carries exactly one thing by default.** It calls three methods:

- `captureAll()` at submit time, on the caller thread
- `restoreAll()` on the worker, before the task
- `resetAll()` in a `finally`, after the task

The only provider in the default registry is `MdcContextSnapshot`. It captures `MDC.getCopyOfContextMap()` and resets with `MDC.clear()`. So the SLF4J MDC survives the hop, including the `correlationId`, `requestId` and `tenantId` written by [Commons](/adhar-kit/modules/commons). Plain thread-locals such as `TenantContext` and `CorrelationContext` **do not**. If you need those values themselves, and not just the log fields, register a `ContextSnapshot` for them:

```java
ContextSnapshotRegistry.getDefault().register(new ContextSnapshot() {
    public Object capture()           { return TenantContext.getTenantId(); }
    public void restore(Object token) { TenantContext.setTenantId((String) token); }
    public void reset()               { TenantContext.clear(); }
});
```

> `reset()` is `MDC.clear()`. So a task that runs inline under `CallerRunsPolicy` clears the *caller's* MDC when it finishes. On a saturated `adharCoreAsyncExecutor`, the request thread that absorbed the task loses its own `correlationId` for the rest of the request. If that matters, give the hot path its own executor with an unbounded queue or an explicit rejection policy.

**Memoizer resource bounds.** `Memoizer` holds a `ConcurrentHashMap` of values and a second map of per-key `ReentrantLock`s. Neither map is bounded, and neither is swept. An expired entry is only replaced when the same key is read again. A key's lock is never removed until `clear()`.

The per-key lock is the stampede guard. Concurrent callers for the same key block on it, and exactly one computes. A failed computation propagates without being cached. Memoize a bounded key space (a currency code, a feature name), never a user or order id. When the key space is open, use [Cache](/adhar-kit/modules/cache).

**Snowflake IDs.** `SnowflakeIdGenerator` produces positive, time-sortable 64-bit longs from a custom epoch (`2024-01-01T00:00:00Z`). Each ID has 41 timestamp bits, 10 node bits (0–1023), and 12 sequence bits.

`nextId()` is `synchronized`, so one generator is a single lock. It has a hard ceiling of 4096 IDs per millisecond per node. Past that, it spins (`Thread.onSpinWait`) into the next millisecond rather than reusing a sequence.

The node id is resolved in this order:

1. an explicit non-negative constructor argument (the Spring bean passes `adhar.core.snowflake.node-id`);
2. the `adhar.core.snowflake.node-id` **system property**;
3. the `ADHAR_SNOWFLAKE_NODE_ID` **environment variable**;
4. `Math.floorMod(hostname.hashCode(), 1024)`;
5. a `SecureRandom` value in 0–1023, only if the hostname cannot be resolved.

A configured value that is unparseable or above 1023 logs a warning and falls through to the hostname hash. A value above 1023 passed directly to the constructor throws `IllegalArgumentException`.

**Clock skew is handled by waiting.** If the wall clock moves backwards, `nextId()` logs a warning. It then spins until the clock catches up with the last issued timestamp. It never emits a duplicate or out-of-order ID. But the calling thread blocks for the length of the skew while holding the generator's monitor, so every other caller blocks with it. A large NTP step backwards is a stall, not a correctness bug.

> **One generator per process.** Two `SnowflakeIdGenerator` instances that resolve the same node id can emit identical IDs, because each has its own sequence counter. This is easy to hit by accident. The Spring `CoreFacade` bean and a stray `CoreFacade.getInstance()` call both construct a generator, and both auto-resolve to the same hostname hash. Inject the `CoreFacade` bean, and do not mix it with the static singleton.

**Aspect behaviour.** `RetryAspect` converts `maxAttempts` into `maxAttempts - 1` retries. It delegates to `RetryUtil.executeWithBackoff`, filtering on `retryOn`. A non-matching exception is rethrown immediately.

`MemoizeAspect` keeps one `Memoizer` per `value()`+`ttl()` pair. It keys entries on the declaring class, method name and parameter types. When `useAllParams` is true, it also adds `Arrays.deepToString(args)`. So the quality of each argument's `toString()` decides the quality of the key.

`AsyncAspect` supports exactly two return types:

- `void` methods are dispatched fire-and-forget. There is no future to complete, so **a thrown exception is logged at ERROR and otherwise swallowed**.
- `CompletableFuture` methods return a future that completes with the result. `timeout` (milliseconds, `0` = none) is applied with `orTimeout`.

Any other return type logs a warning and executes **synchronously**. The annotation silently does nothing useful.

## Aspect and proxy mechanics

`AspectsConfiguration` registers the aspects. It needs two things: `org.aspectj.lang.ProceedingJoinPoint` on the classpath, and `adhar.core.aspects.enabled` (default `true`). It applies `@EnableAspectJAutoProxy` itself. If either condition fails, the beans are never created. `@Retry`, `@Memoize` and `@Async` then become inert annotations, with no log line to tell you.

> **Self-invocation bypasses every one of them.** `this.charge(request)` from inside `PaymentService` goes directly to the target object. You get no retry, no memoization, no async dispatch, and no error. Call through an injected reference to the bean, or move the annotated method to a collaborator. This is the most common reason these annotations "do nothing".

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

`AdharCoreProperties` also binds `adhar.core.retry.*`, `adhar.core.circuit-breaker.*`, `adhar.core.cache.*` and `adhar.core.validation.*`. No code in this module reads them today. `@Retry` takes its retry behaviour from the annotation's own defaults, not from those properties: `maxAttempts = 3`, `delay = 1000`, `multiplier = 2.0`, `maxDelay = 30000`. Set the values on the annotation, or pass a `RetryUtil.RetryPolicy` explicitly.

## Testing

- **Deterministic IDs.** `SnowflakeIdGenerator` has a constructor taking `(long nodeId, LongSupplier clock)`. Drive it with a mutable `long[]` clock. You can then assert monotonicity, sequence rollover at 4096 within one millisecond, and the clock-skew wait, with no sleeping and no flakes. `extractTimestamp` / `extractNodeId` / `extractSequence` are static and decode the IDs you produced.
- **Isolate context propagation.** `ContextSnapshotRegistry.empty()` and `withDefaults()` build registries independent of the process-wide default. `ContextPropagatingExecutor` has a constructor taking an explicit `List<ContextSnapshot>`. Use these in tests. Do not mutate `getDefault()`, which leaks registrations across test classes.
- **Memoization.** `MemoizeAspect.clearAll()` drops every cache it manages. Call it in `@AfterEach` when an aspect-level cache would otherwise carry results between tests. For direct `Memoizer` tests, `invalidate(key)`, `size()` and `containsKey(key)` are enough to assert hit/miss without timing.
- **Turn the aspects off.** `adhar.core.aspects.enabled=false` makes a slice test exercise the plain method; `adhar.core.enabled=false` removes the executor and facade entirely.
- **Async without races.** In tests, define a same-thread executor bean named `adharCoreAsyncExecutor`. Because of `@ConditionalOnMissingBean(name = "adharCoreAsyncExecutor")`, your definition wins. `@Async` work then completes before the assertion.
- **Retry.** Assert the attempt count with a counting stub rather than a timer. Keep `delay` small in the test profile, because `RetryUtil.executeWithBackoff` sleeps for real.

## Interaction with sibling modules

`adharCoreAsyncExecutor` is the executor behind `@Async`. It propagates the MDC, so it keeps [Logging](/adhar-kit/modules/logging) output correlated across a thread hop. The `correlationId`, `requestId` and `tenantId` that [Commons](/adhar-kit/modules/commons)' filters put in the MDC all survive.

Tracing context uses a different mechanism. The OpenTelemetry context is not in the MDC. For spans, use [Tracing](/adhar-kit/modules/tracing)'s `TraceContextTaskDecorator` or `wrapWithTraceContext`.

`@Retry` is a bare retry loop with no failure accounting. When you need a circuit breaker, bulkhead or rate limiter around the same call, use [Resilience](/adhar-kit/modules/resilience) instead of stacking retries.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `@Retry` / `@Memoize` silently ignored | Self-invocation, or `aspectjweaver` missing so the aspects were never registered | Call through the proxy; add `org.aspectj:aspectjweaver` |
| Two pods emit colliding snowflake IDs | Both fell back to the same hostname hash or random node id | Set `ADHAR_SNOWFLAKE_NODE_ID` per replica (a StatefulSet ordinal works well) |
| Colliding IDs inside one JVM | Two generators resolved the same node id | Use the `CoreFacade` bean only; do not also call `CoreFacade.getInstance()` |
| `@Async` method returns a value but runs inline | Only `void` and `CompletableFuture` are dispatched | Change the return type, or use `AsyncUtil.supplyAsync` |
| An `@Async void` failure vanishes | There is no future to carry it; it is logged at ERROR only | Return `CompletableFuture` and handle the failure |
| `result.onSuccess(...)` does not compile | The methods are `ifSuccess` / `ifFailure` | Rename the call |
| Tasks submitted to a raw pool lose `correlationId` | A plain `ExecutorService` copies no thread-locals | Wrap it in `ContextPropagatingExecutor` |
| `@Memoize` entries never expire | `ttl` defaults to `-1`, meaning "never" | Set `ttl` explicitly — it is in **milliseconds** |
| Memory climbs under `@Memoize` | The cache and its per-key locks are unbounded | Memoize a bounded key space, or use [Cache](/adhar-kit/modules/cache) |

## See also

- [Commons](/adhar-kit/modules/commons) — the MDC and tenant context that `ContextPropagatingExecutor` carries
- [Resilience](/adhar-kit/modules/resilience) — when you need circuit breaking and bulkheads, not retry alone
- [Cache](/adhar-kit/modules/cache) — a managed cache when `Memoizer` outgrows its scope
- [Concepts](/adhar-kit/concepts) — how the facades and module toggles fit together
