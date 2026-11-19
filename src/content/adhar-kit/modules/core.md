---
title: "Core"
section: "Modules"
order: 11
path: "/adhar-kit/modules/core"
---

# Core

`adhar-kit-core` is the kit's small-utility layer: error-as-value types (`Result`, `Either`, `Try`), composable `Specification`s, retry with backoff, async execution that carries the MDC across threads, memoization, lazy initialization, type conversion and Snowflake ID generation. Use it when you need these primitives in one consistent form instead of hand-rolling them per service. On Spring Boot it also publishes a bounded async executor, a `CoreFacade` bean and the `@Retry`, `@Memoize` and `@Async` aspects.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-core` (package `com.adhar.kit.core`) |
| Module toggle | None. `adhar.getUtils()` is not gated by `adhar.kit.modules.*`. The Spring auto-configuration has its own switch, `adhar.core.enabled` (default `true`) |
| Facade | `CoreFacade` — `adhar.getUtils()`, `CoreFacade.getInstance()`, or the Spring bean |
| Dependencies | Required: `spring-boot-starter-webmvc`, `spring-boot-starter-validation`, Jackson (`jackson-databind`, `jackson-datatype-jsr310`), `commons-lang3`, `commons-collections4`, `commons-codec`, Guava. Optional: `spring-boot-autoconfigure`, `spring-context`, `spring-aop`, `aspectjweaver` |
| Frameworks | `CoreAutoConfiguration` and the aspects are Spring Boot only. `CoreFacade.getInstance()` and every utility and value type work in any JVM |

## How it works

Core has two layers. The lower one is plain static utilities and immutable value types; you can call them from a `main()`. The upper one is `CoreAutoConfiguration`, which adds managed beans when Spring Boot is present.

```diagram
nkb-core-layers
```

The Spring `CoreFacade` bean and `CoreFacade.getInstance()` are **different objects**, each with its own executor and its own `SnowflakeIdGenerator`. `adhar.getUtils()` returns the static instance, not the bean, unless you install the bean with an `AdharFacadeCustomizer` (`facade -> facade.setUtils(coreFacade)`).

| | Spring bean | `CoreFacade.getInstance()` |
|---|---|---|
| Executor | `adharCoreAsyncExecutor` (bounded, context-propagating) | Fixed pool of `availableProcessors() * 2` daemon threads, no context propagation |
| Snowflake node id | `adhar.core.snowflake.node-id`, else auto-resolved | Auto-resolved |
| `ObjectMapper` | The `objectMapper` bean | Its own, with `JavaTimeModule` |

The async executor wraps a `ThreadPoolExecutor` in a `ContextPropagatingExecutor`, so the SLF4J MDC follows each task:

```diagram
nkb-core-context-executor
```

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-core</artifactId>
    <version>0.1.0</version>
</dependency>
```

For the aspects, add `org.aspectj:aspectjweaver`; without it the aspect configuration is skipped and the annotations do nothing.

## Use it

### Retry, `Result` and `Specification`

Put `@Retry` on the I/O boundary bean, and call it from another bean so the call goes through the proxy:

```java
import com.adhar.kit.core.annotation.Retry;
import com.adhar.kit.core.pattern.Result;
import com.adhar.kit.core.pattern.Specification;
import java.io.IOException;
import java.util.concurrent.TimeoutException;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

@Component
public class GatewayClient {

    private final PaymentGateway gateway;

    public GatewayClient(PaymentGateway gateway) {
        this.gateway = gateway;
    }

    @Retry(maxAttempts = 3,
           backoff = @Retry.Backoff(delay = 1000, maxDelay = 30000, multiplier = 2.0),
           retryOn = { IOException.class, TimeoutException.class })
    public PaymentResult charge(PaymentRequest request) throws IOException {
        return gateway.charge(request);
    }
}

@Service
public class PaymentService {

    private static final Specification<Account> ELIGIBLE =
            Specification.<Account>where(a -> a.balance().signum() > 0)
                         .and(a -> !a.blocked());

    private final GatewayClient client;

    public PaymentService(GatewayClient client) {
        this.client = client;
    }

    public Result<PaymentResult, String> pay(Account account, PaymentRequest request) {
        if (!ELIGIBLE.test(account)) {
            return Result.failure("account not eligible");
        }
        return Result.of(() -> client.charge(request))   // Result<PaymentResult, Exception>
                     .mapError(Exception::getMessage);
    }
}
```

`retryOn` defaults to `Exception.class`; narrow it so a validation failure is not retried. A non-matching exception is rethrown at once; after the last attempt the original exception is rethrown. Handle the outcome with `ifSuccess` / `ifFailure` (there is no `onSuccess`):

```java
payments.pay(account, request)
        .ifSuccess(r -> log.info("charged {}", r.reference()))
        .ifFailure(err -> log.warn("declined: {}", err));
```

### `@Async` and `@Memoize`

```java
import com.adhar.kit.core.annotation.Async;     // not Spring's @Async
import com.adhar.kit.core.annotation.Memoize;
import java.math.BigDecimal;
import java.util.concurrent.CompletableFuture;

@Service
public class ReportService {

    @Async(timeout = 5000)                       // ms; 0 = no timeout
    public CompletableFuture<Report> build(String id) {
        return CompletableFuture.completedFuture(render(id));
    }

    @Memoize(value = "fx", ttl = 60_000)         // ttl in ms; -1 (default) = never expires
    public BigDecimal rate(String currency) {
        return fxClient.fetch(currency);
    }
}
```

`@Async` dispatches only `void` and `CompletableFuture` methods to `adharCoreAsyncExecutor`. Any other return type logs a warning and runs synchronously. A failing `void` method is logged at ERROR and otherwise lost.

### Without Spring

```java
CoreFacade core = CoreFacade.getInstance();
long id = core.generateSnowflakeId();
String json = core.toJson(order);
String hash = core.generateSHA256(payload);
Order loaded = core.retryWithBackoff(() -> repo.load(key), 3, Duration.ofMillis(200), Duration.ofSeconds(5));
```

### API summary

| Type | What you use |
|---|---|
| `CoreFacade` | `generateId` (32-char UUID without hyphens), `generateUUID`, `generateShortId` (8 chars), `generateSnowflakeId`, `toJson`, `toPrettyJson`, `fromJson`, `retryWithBackoff`, `executeAsync`, `generateHash`, `generateMD5`, `generateSHA256`, `isBlank`, `nullSafe`, `truncate` |
| `Result<T, E>` | `success`, `failure`, `of(Callable)`, `fromOptional`, `combine`; `map`, `flatMap`, `mapError`, `recover`, `fold`, `match`, `ifSuccess`, `ifFailure`, `getOrDefault`, `orElseGet`, `getOrThrow`, `toOptional` |
| `Either<L, R>`, `Try<T>` | Left/right values (`left`, `right`, `fromResult`); captured exceptions (`Try.of(Callable)`) |
| `Specification<T>` | A `Predicate<T>` with `and`, `or`, `negate`, `where`, `alwaysTrue`, `alwaysFalse`, `filter`, `findFirst`, `anyMatch`, `allMatch` |
| `RetryUtil` | `execute(op, maxRetries, delayMs)`, `executeWithBackoff(op, maxRetries, delay, multiplier[, maxDelay, retryOn])` |
| `AsyncUtil` | `runAsync`, `supplyAsync`, `executeInParallel`, `waitAll`, `executeWithTimeout`, `setExecutor`, `shutdown` |
| `Lazy<T>`, `Memoizer<K, V>` | Initialize once (`Lazy.of`); per-key cache with optional TTL in ms and a per-key lock |
| `ContextPropagatingExecutor`, `ContextSnapshot`, `ContextSnapshotRegistry` | Executor decorator and the SPI that decides what crosses the thread hop |
| `TypeConverter` | `convert`, `objectToMap`, `mapToObject`, `parseDate`, `parseDateTime`, `canConvert`, `registerConverter` (`TypeConverterSpi`) |
| `Observable<T>` | In-process `subscribe` / `notifyObservers` with a `Subscription` handle |
| `SnowflakeIdGenerator` | `nextId`, `getNodeId`, static `extractTimestamp` / `extractNodeId` / `extractSequence` |

### Carry more than the MDC

The default registry holds `MdcContextSnapshot` plus any `ContextSnapshot` listed in `META-INF/services/com.adhar.kit.core.util.ContextSnapshot`. To carry a thread-local such as [Commons](/adhar-kit/modules/commons)' `TenantContext`, implement a snapshot:

```java
public final class TenantContextSnapshot implements ContextSnapshot {
    public Object capture()           { return TenantContext.getTenantId(); }
    public void restore(Object token) { TenantContext.setTenantId((String) token); }
    public void reset()               { TenantContext.clear(); }
}
```

Register it through `META-INF/services`. A `ContextPropagatingExecutor` copies the registry's snapshots when it is constructed, so `ContextSnapshotRegistry.getDefault().register(...)` at runtime does not reach `adharCoreAsyncExecutor` once that bean exists; it only affects executors created afterwards.

## Configuration

All keys bind to `AdharCoreProperties` (`adhar.core`).

| Property | Type | Default | Description |
|---|---|---|---|
| `adhar.core.enabled` | boolean | `true` | Master switch for `CoreAutoConfiguration` |
| `adhar.core.aspects.enabled` | boolean | `true` | Register `RetryAspect`, `MemoizeAspect`, `AsyncAspect` (also needs AspectJ) |
| `adhar.core.snowflake.node-id` | long | `-1` | Node id for the bean's generator, 0–1023; `-1` auto-resolves |
| `adhar.core.async.pool-size` | int | `10` | Core threads of `adharCoreAsyncExecutor` |
| `adhar.core.async.max-pool-size` | int | `50` | Maximum threads (at least `pool-size`) |
| `adhar.core.async.queue-capacity` | int | `100` | Bounded queue depth |
| `adhar.core.async.thread-name-prefix` | string | `adhar-async-` | Worker thread name prefix |
| `adhar.core.async.keep-alive-seconds` | int | `60` | Idle keep-alive for threads above the core size |

`AdharCoreProperties` also binds `adhar.core.async.enabled`, `adhar.core.retry.*`, `adhar.core.circuit-breaker.*`, `adhar.core.cache.*` and `adhar.core.validation.*`, but no code reads them. `@Retry` uses its own annotation defaults (`maxAttempts = 3`, `delay = 1000`, `multiplier = 2.0`, `maxDelay = 30000`); set values on the annotation.

Override any bean by defining one with the same name or type: `adharCoreAsyncExecutor` (matched by name), `ObjectMapper`, `CoreFacade`, and each aspect.

## Operations

**The async executor.** A `ThreadPoolExecutor` with daemon platform threads and `CallerRunsPolicy`. Threads grow to `pool-size`, then work queues, and only a full queue grows threads toward `max-pool-size`. When both are saturated the task runs on the submitting thread: backpressure instead of rejection, but your request threads slow down. On context close the bean's `shutdown()` stops new work and lets queued tasks drain; nothing is interrupted.

**Snowflake IDs.** Positive, time-sortable 64-bit longs from a custom epoch of `2024-01-01T00:00:00Z`: 41 timestamp bits, 10 node bits, 12 sequence bits, so up to 4096 IDs per millisecond per generator. `nextId()` is `synchronized`; past 4096 in one millisecond it spins into the next. If the clock moves backwards it logs a warning and waits until the clock catches up, holding the lock, so every caller stalls for the skew. The node id resolves in this order:

1. An explicit non-negative constructor argument (the Spring bean passes `adhar.core.snowflake.node-id`); above 1023 throws `IllegalArgumentException`.
2. The `adhar.core.snowflake.node-id` JVM system property.
3. The `ADHAR_SNOWFLAKE_NODE_ID` environment variable.
4. `Math.floorMod(hostname.hashCode(), 1024)`.
5. A `SecureRandom` value, if the hostname cannot be resolved.

An unparseable or out-of-range value in steps 2–3 logs a warning and falls through to the hostname hash.

**Retry logging.** Each failed attempt logs at WARN; exhaustion logs at ERROR. Backoff sleeps the calling thread.

## Limits

- **Self-invocation bypasses every aspect.** `@Retry`, `@Memoize` and `@Async` are Spring AOP proxies; `this.method()` runs the raw method with no warning. Without `aspectjweaver`, or with `adhar.core.aspects.enabled=false`, they are inert.
- **Generators with the same node id collide.** Two `SnowflakeIdGenerator`s that resolve the same node id have separate sequence counters and can emit identical IDs. The Spring bean and `CoreFacade.getInstance()` (which `adhar.getUtils()` returns) each own one, and both auto-resolve to the same hostname hash. Use one of them, and set `ADHAR_SNOWFLAKE_NODE_ID` per replica (a StatefulSet ordinal works).
- **`MDC.clear()` on a caller-run task.** The MDC snapshot resets with `MDC.clear()`. A task that `CallerRunsPolicy` runs inline clears the submitting thread's MDC when it finishes, so the request loses its `correlationId` for the rest of the request.
- **Thread-locals other than the MDC do not travel** unless you register a `ContextSnapshot`. Tracing context is separate; see [Tracing](/adhar-kit/modules/tracing).
- **`Memoizer` is unbounded.** Values and per-key locks are never swept; an expired entry is replaced only when its key is read again. Memoize a bounded key space (currency codes, feature names), never user or order ids; use [Cache](/adhar-kit/modules/cache) otherwise. `@Memoize` keys on class, method, parameter types and `Arrays.deepToString(args)`, so argument `toString()` quality decides key quality.
- **`AsyncUtil` has its own pool** (`availableProcessors()` threads, no context propagation) unless you call `setExecutor`.
- **`CoreFacade.retryWithBackoff` retries every exception** and wraps exhaustion in a `RuntimeException`; the `long` variant adds jitter and has no delay cap, the `Duration` variant caps at `maxDelay`.
- **`RetryUtil.RetryPolicy` is a value only.** No method in core accepts it.
- **Core is not dependency-free.** `spring-boot-starter-webmvc` and `spring-boot-starter-validation` are compile dependencies, so they land on any classpath that adds core.

## Next steps

- [Commons](/adhar-kit/modules/commons) — the MDC keys and `TenantContext` that the executor carries
- [Resilience](/adhar-kit/modules/resilience) — circuit breakers, bulkheads and rate limiters beyond a retry loop
- [Cache](/adhar-kit/modules/cache) — a managed, bounded cache when `Memoizer` is not enough
- [Concepts](/adhar-kit/concepts) — how facades and module toggles fit together
