---
title: "Dapr"
section: "Modules"
order: 29
path: "/adhar-kit/modules/dapr"
---

# Dapr

`adhar-kit-dapr` wraps the Dapr building blocks in annotation-driven Java APIs. The building blocks are state, pub/sub, service invocation, bindings, secrets, configuration, and distributed locks.

Dapr already solves the hard distributed-systems problems in a sidecar. The gap is that **the raw Dapr Java SDK is reactive, untyped, and leaves you to hand-write the `/dapr/subscribe` endpoint**. This module gives you blocking typed calls, a generated subscription endpoint, ETag-based optimistic concurrency, and retry plus circuit breaking on service invocation.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-dapr` |
| Built on | Dapr Java SDK 1.18.0 (`dapr-sdk`, `dapr-sdk-springboot`, optional `dapr-sdk-actors` and `dapr-sdk-workflows`) |
| Entry points | `AdharDaprClient`, `DaprFacade` (via `adhar.getDapr()`), `StateRepository<T>` |
| Annotations | `@DaprState`, `@DaprPublish`, `@DaprSubscribe`, `@DaprTopic` |
| Requires | A reachable Dapr sidecar — **nothing in this module verifies that at startup** |
| Use it when | Your services run with Dapr sidecars and you want typed, resilient access to the components |

## How it works

Your process never talks to Redis, Kafka, or Vault directly. It talks to the local Dapr sidecar over HTTP or gRPC and names a *component*, such as `statestore`, `pubsub` or `secretstore`. The platform decides what that component actually is.

```diagram
kit-dapr-sidecar
```

### The sidecar is the whole risk surface

Everything this module does is a network call to a process that may not be there yet. Three facts follow from this, and all three catch people out.

**Startup never fails.** `DaprClientBuilder.build()` constructs a client without contacting anything. `DaprFacade`'s private constructor then sets `available = true` unconditionally and logs *"Dapr sidecar connected successfully"*. That message is about wiring, not reachability. `AdharDaprClient` does the same.

So a pod starts cleanly even if its sidecar is missing, crash-looping, or slower to become ready than your app. It fails on the **first real call**. The error is a `DaprFacade.DaprException` (or a plain `RuntimeException` from `AdharDaprClient`) wrapping the transport error.

**`isAvailable()` and `getMetadata()` do not probe.** `isAvailable()` returns the flag above. `getMetadata()` returns a hardcoded two-entry map. Neither is a health check. If you need to know the sidecar is up, wire a readiness gate that performs a real, cheap operation, such as a `getState` on a sentinel key.

**Sidecar ordering at startup.** `DaprSubscriptionRegistrar` needs no sidecar, so subscription discovery always succeeds. But any eager bean that touches state or secrets in `@PostConstruct` races the sidecar. Move that work to an `ApplicationReadyEvent` listener, or let the first request pay the cost.

The upside is that your app survives a sidecar restart. The client is not stateful, so calls that failed during the gap start succeeding again.

### Subscriptions

After the context is built, `DaprSubscriptionRegistrar` scans every singleton bean for `@DaprSubscribe` and `@DaprTopic` methods. `ClassUtils.getUserClass` sees through proxies, and synthetic and bridge methods are skipped. For each method, the registrar builds a dispatch route:

```text
/dapr/subscribe/<slug(pubsubName)>/<slug(route or topic)>
```

The slug lowercases the name and replaces every run of non-alphanumeric characters with `-`. A custom `route()` value is folded into that path rather than used verbatim. This keeps the controller a single, predictable entry point.

Two handlers that slug to the same route collide. The first registration wins, and the second is logged as a WARN. So `orders.created` and `orders-created` on the same pubsub lose a subscription silently, apart from a warning line. A method carrying both annotations registers twice, under both derived routes.

`DaprSubscriptionController` then serves two endpoints. `GET /dapr/subscribe` is the endpoint Dapr polls at startup. `POST /dapr/subscribe/**` resolves the handler from the request URI.

The controller stands down under `@ConditionalOnMissingClass("io.dapr.springboot.DaprController")`. The SDK's own controller already maps `GET /dapr/subscribe`, and registering both causes an ambiguous-mapping startup failure. The whole subscription sub-configuration is `@ConditionalOnClass(RestController.class)`. Without Spring MVC, nothing is registered and no subscription is advertised.

### `DispatchStatus`, precisely

`DispatchStatus` has three values with Dapr's standard meanings. `SUCCESS` acknowledges. `RETRY` asks Dapr to redeliver. `DROP` discards or dead-letters without retry. What matters is how each one is *produced*.

| Outcome | Produced by | HTTP response |
|---|---|---|
| `SUCCESS` | The handler returning normally — **whatever it returns** | 200 `{"status":"SUCCESS"}` |
| `RETRY` | The handler **throwing**, or argument conversion failing | 500 `{"status":"RETRY"}` |
| `DROP` | No handler registered for the route | 404 `{"status":"DROP"}` |

> **`DaprEventDispatcher` ignores the handler's return value.** It invokes the method and returns `DispatchResult.success()` unless something threw. If a handler does `return DispatchStatus.RETRY;`, the message is acknowledged and gone. **Throw to get a redelivery.** A handler has no way to produce `DROP` at all. Configure a `deadLetterTopic` and let Dapr's own retry budget route there.

Argument binding uses the first parameter only:

- A zero-argument handler is invoked with no args.
- If the first parameter type is `io.dapr.client.domain.CloudEvent`, the whole envelope is reconstructed (id, source, type, specversion, datacontenttype, pubsubname, topic, data).
- Any other type is produced by Jackson from the envelope's `data` field. If there is no `data` key, Jackson uses the whole envelope.

Handlers that declare a second parameter fail at invocation time. Per the table above, that becomes a `RETRY`. The result is an infinite redelivery loop until the dead-letter budget is exhausted.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-dapr</artifactId>
    <version>0.1.0</version>
</dependency>
```

`dapr-sdk-actors` and `dapr-sdk-workflows` are optional. The actor and workflow auto-configurations activate only when those classes are present. Spring MVC is optional too. Without it, there is no subscription endpoint.

## Key APIs

**`AdharDaprClient`** — the thin, blocking, `AutoCloseable` wrapper over `DaprClient`. Methods: `saveState`, `getState` (returns `Optional<T>`), `deleteState`, `publishEvent`, `invokeService`, the `get`/`post` shorthands, `getSecret` / `getAllSecrets`, `invokeBinding`, `getConfiguration` / `getConfigurations`, `tryLock` / `unlock`.

**`DaprFacade`** — the richer surface, reachable through `adhar.getDapr()`:

- State with concurrency control: `getStateWithETag` returns a `StateWithETag<T>` (with `exists()`). `saveStateWithETag` and `deleteStateWithETag` return `false` when the ETag no longer matches. Also `saveStateWithTTL` (via a `ttlInSeconds` metadata entry), `getBulkState`, and `executeStateTransaction(store, List<StateOperation>)` for atomic multi-key writes.
- Invocation: `invokeService`, `invokeServiceAsync`, and `invokeServiceResilient`.
- Secrets and configuration: `getSecret`, `getBulkSecrets`, `getBulkSecretsNested`, `getConfiguration`, and `subscribeConfiguration(store, keys, callback)` for push updates.
- Locks: `tryLock(store, resourceId, owner, expirySeconds)` and `unlock(store, resourceId, owner)`.

**`StateRepository<T>`** — a typed repository over one store: `find`, `findWithETag`, `save`, `delete`, `update(key, UnaryOperator<T>)`. **`DaprInvocationResilience`** — linear retry plus a circuit breaker, configured by a `ResilienceSettings` record.

> **Status note, unchanged.** `tryLock` and `unlock` are implemented, backed by the Dapr preview client. `queryState`, `encrypt` and `decrypt` throw `UnsupportedOperationException`. So do the facade's actor conveniences: `invokeActor`, `saveActorState`, `getActorState`, `registerActorReminder`, `registerActorTimer`. Actors belong inside the actor runtime, so use `DaprActorProxyFactory` and the `dapr-sdk-actors` `ActorProxyBuilder`. If you build a `DaprFacade` through either public constructor without a `DaprPreviewClient`, the lock methods throw `IllegalStateException`.

## Worked example — order state and a subscriber

This complete service shows the three patterns that matter: an ETag-guarded read-modify-write, a handler that throws rather than returning a status, and explicit handling of the concurrency exception.

```java
import com.adhar.kit.dapr.DaprFacade;
import com.adhar.kit.dapr.annotation.DaprSubscribe;
import com.adhar.kit.dapr.state.OptimisticConcurrencyException;
import com.adhar.kit.dapr.state.StateRepository;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final StateRepository<Order> orders;
    private final Ledger ledger;

    public OrderService(DaprFacade dapr, Ledger ledger) {
        // 5 retries instead of the default 3, for a contended key
        this.orders = new StateRepository<>(dapr, "statestore", Order.class, 5);
        this.ledger = ledger;
    }

    /** Read-modify-write under ETag. The updater may be invoked more than once. */
    public Order markPaid(String orderId) {
        try {
            return orders.update("order:" + orderId, existing -> {
                if (existing == null) {
                    throw new IllegalStateException("Unknown order " + orderId);
                }
                return existing.withStatus(Status.PAID);   // must be side-effect free
            });
        } catch (OptimisticConcurrencyException e) {
            // Five read-modify-write cycles all lost the ETag race.
            throw new ConflictException("order " + orderId + " is being updated concurrently", e);
        }
    }

    @DaprSubscribe(pubsubName = "pubsub", topic = "payments.settled",
                   deadLetterTopic = "payments.dead")
    public void onPaymentSettled(PaymentSettled event) {
        if (!ledger.isReady()) {
            // THROW to make Dapr redeliver. Returning DispatchStatus.RETRY here
            // would be ignored and the message acknowledged.
            throw new IllegalStateException("ledger not ready; redeliver");
        }
        ledger.apply(event);        // must be idempotent: at-least-once delivery
    }
}
```

This code depends on two properties. First, the `update` lambda runs once per attempt, so it must be pure. Incrementing a counter inside it double-counts on a retry. Second, `onPaymentSettled` must be idempotent. A redelivery after a partially-applied handler is the normal case, not the exceptional one.

### Annotations and their aspects

`DaprAutoConfiguration` registers `DaprStateAspect` and `DaprPublishAspect` as beans. You need no `@Enable` annotation. Leave `adhar.dapr.enabled` at `true`.

`@DaprState(key = ...)` takes a **SpEL expression**. `DaprKeyResolver` evaluates it with the same conventions as Spring's `@Cacheable`. `#paramName`, `#p0`, and `#a0` all resolve to arguments, and the evaluation root is the target bean. Parsed expressions are cached in a `ConcurrentHashMap`. A blank expression, or one evaluating to `null`, falls back to `DeclaringClass.methodName:<deepHashCode of args>`.

`operation()` selects one of three modes:

- `SAVE` — proceed, then save a non-null return value.
- `GET` — skip the body entirely and return the stored value, unless the method returns `void`.
- `DELETE` — proceed, then delete.

`@DaprPublish` publishes the method's return value after the body runs. To publish an argument instead, set `publishReturnValue = false` and `parameterIndex = n`. An out-of-range index throws `IllegalArgumentException`. A `null` payload publishes nothing. Both aspects run *after* the body, so the publish is not part of any surrounding transaction. If that matters, use the outbox below.

> **Self-invocation.** Both are Spring AOP advice, so they fire only on external calls to the proxied bean. `this.createOrder(...)` from inside the same class writes no state and publishes no event. There is no error and no log line. Call through the injected bean, or inject a self-reference.
>
> **Not everything with an annotation has an aspect.** `@DaprInvoke`, `@DaprBinding`, `@DaprSecret`, `@DaprConfiguration`, and `@DaprLock` are declared but have no interceptor registered. Use the equivalent `DaprFacade` or `AdharDaprClient` method directly.

## How it behaves

**Thread safety.** `DaprFacade`, `AdharDaprClient`, `StateRepository` and `DaprInvocationResilience` are all safe to share as singletons. The repository holds only a store name, a type token and a retry count. `DaprSubscriptionRegistrar`'s handler map is filled once during `afterSingletonsInstantiated` and is read-only after that. Your handler methods run concurrently, on Spring MVC request threads.

**ETag retry and concurrent writes.** `saveStateWithETag` and `deleteStateWithETag` use `StateOptions.Concurrency.FIRST_WRITE`. They detect a conflict by checking the exception chain for a Dapr error code of `ABORTED` or a message containing "etag". A conflict returns `false`. **Anything else throws.**

So `StateRepository.update` retries only genuine conflicts. A transport error propagates on the first attempt rather than using up the retry budget. Each retry re-reads and re-applies, sleeping `min(20 × attempt, 200)` milliseconds between cycles. After `maxRetries` (3 by default) it throws `OptimisticConcurrencyException`.

`StateRepository.save` is an unconditional last-write-wins write. It does not take part in ETag checking at all, and `find` discards the ETag it read. Whenever two writers can touch a key, use `findWithETag` plus `saveStateWithETag`, or `update`.

**Service-invocation resilience.** The real `ResilienceSettings.defaults()` are **3 attempts, 100 ms base backoff, 5 s per-attempt timeout, breaker opens after 5 consecutive failures for 30 s**. Attempt *n* sleeps `backoff × n`. So a full failure costs roughly 100 ms + 200 ms of waiting plus three timeouts.

The auto-configured `DaprInvocationResilience` bean overrides two of those from properties and keeps the rest:

- `maxAttempts` comes from `service-invocation.retries` (3).
- `timeout` comes from `service-invocation.timeout` (60,000 ms).

The effective defaults are therefore 3 attempts, 100 ms backoff, **60 s timeout**, threshold 5, open 30 s.

Three details are worth knowing:

- Each attempt runs on a shared static cached daemon pool named `adhar-dapr-resilience`. A timeout cancels the `Future` and returns control to you. But the underlying blocking SDK call may keep running until the socket gives up.
- The breaker counts *consecutive* failures per `DaprInvocationResilience` instance, not per target app. So one unhealthy downstream opens the circuit for every downstream sharing that instance.
- After `openStateDuration`, a single `HALF_OPEN` trial is admitted. If it fails, the circuit re-opens immediately.

An open circuit throws `CircuitBreakerOpenException`, or calls your fallback if you passed one.

> `DaprFacade.invokeServiceResilient` uses the facade's **own private** `DaprInvocationResilience`, constructed with `ResilienceSettings.defaults()`. `adhar.dapr.service-invocation.*` configures the auto-configured *bean*, not the facade's field. So the facade method keeps the 5 s timeout. When you need the configured settings, inject `DaprInvocationResilience` and call `execute(...)` or `invokeService(client, ...)`.

**The outbox.** Set `adhar.dapr.outbox.enabled: true` to turn it on. `OutboxPublisher.append(topic, payload)` then writes an `OutboxEvent` under `outbox:evt:<uuid>` and adds the id to an ETag-guarded `outbox:index` document.

`OutboxRelayScheduler` runs `relay()` every `relay-interval-ms` (5 s). It publishes each pending event, marks it `PUBLISHED` and removes it from the index. On failure, it increments the attempt count. At `max-attempts` (5), it parks the event as `DEAD`. Relay failures are logged and swallowed, so the schedule never stops.

There are two caveats:

- `append` performs two separate state writes rather than one transaction, and it is not joined to your own business write. The guarantee is that a publish survives a broker outage, not that state and event commit atomically.
- The index is a single hot key, so a high append rate contends on one ETag.

**Resource bounds.** The resilience executor is a cached pool. It uses one thread per concurrent in-flight invocation, with no upper bound. Everything else is bounded by your own code or stateless.

## Testing

`adhar-kit-test-commons` ships `DaprTestContainer`, a Testcontainers wrapper around `daprio/daprd` for integration tests. It provides `start()`, `stop()`, `getHttpEndpoint()`, `getGrpcPort()`, `getHost()`, `setAppId(...)`.

- **Unit tests** — both `DaprFacade` and `AdharDaprClient` have public constructors taking a `DaprClient` (and optionally a `DaprPreviewClient`). Pass Mockito mocks and stub `daprClient.getState(...)` to return a `Mono<State<T>>`. `StateRepository` takes a `DaprFacade`, so a mocked facade drives the retry loop. To assert the conflict path, return a `StateWithETag` and make `saveStateWithETag` return `false`.
- **Aspect tests** — construct `new DaprStateAspect(facade)` / `new DaprPublishAspect(facade)` with a mocked `ProceedingJoinPoint`. You need no Spring context.
- **Subscription dispatch** — `DaprEventDispatcher.dispatch(handler, cloudEventMap)` takes a plain `Map`. You can assert routing, argument conversion, and that a throwing handler yields `DispatchStatus.RETRY`, all without HTTP.
- **Disabling side effects** — `adhar.dapr.enabled: false` removes the whole auto-configuration. Use it for test slices that would otherwise build a client against a nonexistent sidecar. Leave the outbox off unless you are testing it, because `@EnableScheduling` comes with it.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.dapr.enabled` | Master switch for the auto-configuration | `true` |
| `adhar.dapr.app-id` / `.app-port` | App id and callback port — bound, but read by nothing in this module | (none) / `8080` |
| `adhar.dapr.dapr-port` / `.dapr-http-port` / `.dapr-grpc-port` | Sidecar ports — bound only (see note below) | `3500` / `3500` / `50001` |
| `adhar.dapr.state-store` / `.pubsub` / `.secret-store` | Default component names | `statestore` / `pubsub` / `secretstore` |
| `adhar.dapr.configuration-store` / `.lock-store` | Default configuration and lock components | `configstore` / `lockstore` |
| `adhar.dapr.state-store-config.consistency` / `.concurrency` | State semantics | `eventual` / `first-write` |
| `adhar.dapr.pub-sub-config.dead-letter-topic` | Default dead-letter topic | `dead-letter` |
| `adhar.dapr.service-invocation.timeout` | Per-attempt timeout on the resilience **bean**, ms | `60000` |
| `adhar.dapr.service-invocation.retries` | Attempts including the first, on the resilience bean | `3` |
| `adhar.dapr.lock.default-timeout` | Lock hold time, ms | `30000` |
| `adhar.dapr.actors.enabled` / `.actor-idle-timeout` | Actor runtime (needs `dapr-sdk-actors`) | `true` / `60m` |
| `adhar.dapr.workflow.enabled` | Workflow facade (needs `dapr-sdk-workflows`) | `true` |
| `adhar.dapr.outbox.enabled` | Wire `OutboxPublisher` and the relay scheduler | `false` |
| `adhar.dapr.outbox.state-store` / `.pubsub` | Components the outbox uses | `statestore` / `pubsub` |
| `adhar.dapr.outbox.max-attempts` / `.relay-interval-ms` | Attempts before `DEAD`, and relay period | `5` / `5000` |

The Dapr SDK resolves the sidecar endpoint from its own environment configuration. `dapr run` and the Kubernetes sidecar injector set this for you. The port properties above are bound for completeness only. They do not change where the client connects.

```yaml
adhar:
  dapr:
    enabled: true
    app-id: orders-service
    state-store: statestore
    pubsub: pubsub
    secret-store: vault
    service-invocation: { timeout: 60000, retries: 3 }
    outbox: { enabled: true, relay-interval-ms: 5000 }
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Startup succeeds, first request fails | No sidecar; nothing probes it at startup | Run with `dapr run` or the injection annotations; add a real readiness probe |
| An eager `@PostConstruct` state read fails | The bean raced the sidecar becoming ready | Move the work to an `ApplicationReadyEvent` listener |
| `@DaprSubscribe` handler never fires | Spring MVC absent, so the subscription configuration was skipped | Add `spring-boot-starter-webmvc`; check `GET /dapr/subscribe` lists the topic |
| A subscription silently disappeared | Two topics slugged to the same route; first registration won | Check the startup WARN; rename one topic or pubsub |
| Messages are acknowledged despite a failure | The handler returned `DispatchStatus.RETRY`, which the dispatcher ignores | Throw an exception to force redelivery |
| A handler redelivers forever | It takes more than one parameter, so argument binding throws every time | Declare exactly one parameter, or none |
| Duplicate subscription endpoints | The SDK's own `io.dapr.springboot.DaprController` is on the classpath | The module's controller stands down automatically; use one or the other |
| `@DaprState` writes to an unexpected key | The SpEL expression was blank or evaluated to `null` | Use `#paramName` / `#p0`; remember the literal quotes in `"'order:' + #order.id"` |
| An annotation appears to do nothing | Self-invocation, or the annotation has no aspect | Call through the bean; for `@DaprInvoke`, `@DaprBinding`, `@DaprSecret`, `@DaprConfiguration`, `@DaprLock` use the facade methods |
| A concurrent write silently wins | `StateRepository.save` is unconditional | Use `update(...)` or `findWithETag` + `saveStateWithETag` |
| `OptimisticConcurrencyException` | Contention exhausted the retry budget | Raise `maxRetries` on the repository constructor, or reduce the write hot spot |
| `CircuitBreakerOpenException` for a healthy service | One shared breaker counts consecutive failures across all targets | Use a separate `DaprInvocationResilience` per downstream |
| `service-invocation.timeout` seems ignored | `DaprFacade.invokeServiceResilient` uses its own defaults instance | Inject the `DaprInvocationResilience` bean and call it directly |
| `UnsupportedOperationException` on `queryState`, `encrypt`, `decrypt`, or the facade's actor methods | Not implemented here | Call the Dapr HTTP API directly, or use `DaprActorProxyFactory` and the SDK's `ActorProxyBuilder` |
| `IllegalStateException` from `tryLock` | The facade was built without a `DaprPreviewClient` | Use `getInstance()`, or the two-argument constructor |

Dapr complements the [Adhar Platform](/docs). Sidecars handle the plumbing, and the platform provides the components.

## See also

- [Messaging](/adhar-kit/modules/messaging) — the non-Dapr broker path, and how the two compare
- [Resilience](/adhar-kit/modules/resilience) — the circuit-breaker vocabulary used here
- [Event Sourcing](/adhar-kit/modules/event-sourcing) — pairs with the transactional outbox
- [Kubernetes](/adhar-kit/modules/kubernetes) — where sidecars are injected
