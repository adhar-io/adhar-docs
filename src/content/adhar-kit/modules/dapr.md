---
title: "Dapr"
section: "Modules"
order: 29
path: "/adhar-kit/modules/dapr"
---

# Dapr

`adhar-kit-dapr` wraps the Dapr building blocks — state, pub/sub, service invocation, bindings, secrets, configuration, and distributed locks — in annotation-driven Java APIs. Dapr already solves the hard distributed-systems problems in a sidecar; the gap this module closes is that **the raw Dapr Java SDK is reactive, untyped, and leaves you to hand-write the `/dapr/subscribe` endpoint**. Here you get blocking typed calls, a generated subscription endpoint, ETag-based optimistic concurrency, and retry plus circuit breaking on service invocation.

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

Your process never talks to Redis, Kafka, or Vault directly. It talks to the local Dapr sidecar over HTTP or gRPC, naming a *component* — `statestore`, `pubsub`, `secretstore` — and the platform decides what that component actually is.

```diagram
kit-dapr-sidecar
```

### The sidecar is the whole risk surface

Everything this module does is a network call to a process that may not be there yet. Three facts follow, and all three catch people out:

**Startup never fails.** `DaprClientBuilder.build()` constructs a client without contacting anything. `DaprFacade`'s private constructor then sets `available = true` unconditionally and logs *"Dapr sidecar connected successfully"* — a message about wiring, not reachability; `AdharDaprClient` does the same. A pod whose sidecar is missing, crash-looping, or simply slower to become ready than your app therefore starts cleanly and fails on the **first real call**, with `DaprFacade.DaprException` (or a plain `RuntimeException` from `AdharDaprClient`) wrapping the transport error.

**`isAvailable()` and `getMetadata()` do not probe.** `isAvailable()` returns the flag above; `getMetadata()` returns a hardcoded two-entry map. Neither is a health check. Wire a readiness gate that performs a real, cheap operation — a `getState` on a sentinel key — if you need to know the sidecar is up.

**Sidecar ordering at startup.** `DaprSubscriptionRegistrar` needs no sidecar, so subscription discovery always succeeds. But any eager bean that touches state or secrets in `@PostConstruct` races the sidecar; defer that work to an `ApplicationReadyEvent` listener, or let the first request pay the cost. The flip side is that a sidecar restart is survivable: the client is not stateful, so calls that failed during the gap simply start succeeding again.

### Subscriptions

`DaprSubscriptionRegistrar` scans every singleton bean after the context is built — `ClassUtils.getUserClass` sees through proxies, and synthetic and bridge methods are skipped — looking for `@DaprSubscribe` and `@DaprTopic` methods. For each it synthesises a dispatch route:

```text
/dapr/subscribe/<slug(pubsubName)>/<slug(route or topic)>
```

where the slug lowercases and replaces every run of non-alphanumeric characters with `-`. A custom `route()` value is folded into that path rather than used verbatim, so the controller stays a single predictable entry point. Two handlers that slug to the same route collide: the first registration wins and the second is logged as a WARN, so `orders.created` and `orders-created` on the same pubsub are a silent subscription loss with a warning line. A method carrying both annotations registers twice, under both derived routes.

`DaprSubscriptionController` then serves `GET /dapr/subscribe` — the endpoint Dapr polls at startup — and `POST /dapr/subscribe/**`, resolving the handler from the request URI. It stands down under `@ConditionalOnMissingClass("io.dapr.springboot.DaprController")`, because the SDK's own controller already maps `GET /dapr/subscribe` and registering both is an ambiguous-mapping startup failure. The whole subscription sub-configuration is `@ConditionalOnClass(RestController.class)`, so without Spring MVC nothing is registered and no subscription is advertised.

### `DispatchStatus`, precisely

`DispatchStatus` has three values with Dapr's standard meanings: `SUCCESS` acknowledges, `RETRY` asks Dapr to redeliver, `DROP` discards or dead-letters without retry. What matters is how each one is *produced*.

| Outcome | Produced by | HTTP response |
|---|---|---|
| `SUCCESS` | The handler returning normally — **whatever it returns** | 200 `{"status":"SUCCESS"}` |
| `RETRY` | The handler **throwing**, or argument conversion failing | 500 `{"status":"RETRY"}` |
| `DROP` | No handler registered for the route | 404 `{"status":"DROP"}` |

> **`DaprEventDispatcher` ignores the handler's return value.** It invokes the method and returns `DispatchResult.success()` unless something threw. A handler that `return DispatchStatus.RETRY;` is acknowledged and the message is gone. **Throw to get a redelivery.** There is no handler-driven path to `DROP` at all; configure a `deadLetterTopic` and let Dapr's own retry budget route there.

Argument binding is first-parameter-only. A zero-argument handler is invoked with no args. Otherwise, if the first parameter type is `io.dapr.client.domain.CloudEvent` the whole envelope is reconstructed (id, source, type, specversion, datacontenttype, pubsubname, topic, data); any other type is produced by Jackson from the envelope's `data` field, or from the whole envelope when there is no `data` key. Handlers declaring a second parameter will fail at invocation time — which, per the table above, becomes a `RETRY` and an infinite redelivery loop until the dead-letter budget is exhausted.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-dapr</artifactId>
    <version>0.1.0</version>
</dependency>
```

`dapr-sdk-actors` and `dapr-sdk-workflows` are optional; the actor and workflow auto-configurations activate only when those classes are present. Spring MVC is optional too, and gates the subscription endpoint.

## Key APIs

**`AdharDaprClient`** — the thin, blocking, `AutoCloseable` wrapper over `DaprClient`: `saveState`, `getState` (returns `Optional<T>`), `deleteState`, `publishEvent`, `invokeService`, the `get`/`post` shorthands, `getSecret` / `getAllSecrets`, `invokeBinding`, `getConfiguration` / `getConfigurations`, `tryLock` / `unlock`.

**`DaprFacade`** — the richer surface, reachable through `adhar.getDapr()`:

- State with concurrency control: `getStateWithETag` returns a `StateWithETag<T>` (with `exists()`); `saveStateWithETag` and `deleteStateWithETag` return `false` when the ETag no longer matches. Also `saveStateWithTTL` (via a `ttlInSeconds` metadata entry), `getBulkState`, and `executeStateTransaction(store, List<StateOperation>)` for atomic multi-key writes.
- Invocation: `invokeService`, `invokeServiceAsync`, and `invokeServiceResilient`.
- Secrets and configuration: `getSecret`, `getBulkSecrets`, `getBulkSecretsNested`, `getConfiguration`, and `subscribeConfiguration(store, keys, callback)` for push updates.
- Locks: `tryLock(store, resourceId, owner, expirySeconds)` and `unlock(store, resourceId, owner)`.

**`StateRepository<T>`** — a typed repository over one store: `find`, `findWithETag`, `save`, `delete`, `update(key, UnaryOperator<T>)`. **`DaprInvocationResilience`** — linear retry plus a circuit breaker, configured by a `ResilienceSettings` record.

> **Status note, unchanged.** `tryLock` and `unlock` are implemented, backed by the Dapr preview client. `queryState`, `encrypt` and `decrypt` throw `UnsupportedOperationException`, as do the facade's actor conveniences — `invokeActor`, `saveActorState`, `getActorState`, `registerActorReminder`, `registerActorTimer`. Actors belong inside the actor runtime: use `DaprActorProxyFactory` and the `dapr-sdk-actors` `ActorProxyBuilder`. A `DaprFacade` built through either public constructor without a `DaprPreviewClient` throws `IllegalStateException` from the lock methods.

## Worked example — order state and a subscriber

A complete service showing the three patterns that matter: an ETag-guarded read-modify-write, a handler that throws rather than returning a status, and explicit handling of the concurrency exception.

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

Two properties this code depends on. The `update` lambda runs once per attempt, so it must be pure — incrementing a counter inside it double-counts on a retry. And `onPaymentSettled` must be idempotent, because a redelivery after a partially-applied handler is the normal case, not the exceptional one.

### Annotations and their aspects

`DaprStateAspect` and `DaprPublishAspect` are registered as beans by `DaprAutoConfiguration` — no `@Enable` annotation is needed, only `adhar.dapr.enabled` left at `true`.

`@DaprState(key = ...)` takes a **SpEL expression**, evaluated by `DaprKeyResolver` with the same conventions as Spring's `@Cacheable`: `#paramName`, `#p0`, and `#a0` all resolve to arguments, and the evaluation root is the target bean. Parsed expressions are cached in a `ConcurrentHashMap`. A blank expression, or one evaluating to `null`, falls back to `DeclaringClass.methodName:<deepHashCode of args>`. `operation()` selects `SAVE` (proceed, then save a non-null return value), `GET` (skip the body entirely and return the stored value, unless the method returns `void`), or `DELETE` (proceed, then delete).

`@DaprPublish` publishes the method's return value after the body runs; set `publishReturnValue = false` and `parameterIndex = n` to publish an argument instead — an out-of-range index throws `IllegalArgumentException`. A `null` payload publishes nothing. Both aspects run *after* the body, so the publish is not part of any surrounding transaction; use the outbox below if that matters.

> **Self-invocation.** Both are Spring AOP advice, so they fire only on external calls to the proxied bean. `this.createOrder(...)` from inside the same class writes no state and publishes no event, with no error and no log line. Call through the injected bean, or inject a self-reference.
>
> **Not everything with an annotation has an aspect.** `@DaprInvoke`, `@DaprBinding`, `@DaprSecret`, `@DaprConfiguration`, and `@DaprLock` are declared but have no interceptor registered — use the equivalent `DaprFacade` or `AdharDaprClient` method directly.

## How it behaves

**Thread safety.** `DaprFacade`, `AdharDaprClient`, `StateRepository` and `DaprInvocationResilience` are all safe to share as singletons; the repository holds only a store name, a type token and a retry count. `DaprSubscriptionRegistrar`'s handler map is populated once during `afterSingletonsInstantiated` and read-only thereafter. Your handler methods are invoked on Spring MVC request threads, concurrently.

**ETag retry and concurrent writes.** `saveStateWithETag` and `deleteStateWithETag` use `StateOptions.Concurrency.FIRST_WRITE` and distinguish a conflict by inspecting the exception chain for a Dapr error code of `ABORTED` or a message containing "etag". A conflict returns `false`; **anything else throws**. `StateRepository.update` therefore retries only genuine conflicts — a transport error propagates on the first attempt rather than burning the retry budget. Each retry re-reads and re-applies, sleeping `min(20 × attempt, 200)` milliseconds between cycles; after `maxRetries` (3 by default) it throws `OptimisticConcurrencyException`. Note that `StateRepository.save` is an unconditional last-write-wins write: it does not participate in ETag checking at all, and `find` discards the ETag it read. Use `findWithETag` plus `saveStateWithETag`, or `update`, whenever two writers can touch a key.

**Service-invocation resilience.** The real `ResilienceSettings.defaults()` are **3 attempts, 100 ms base backoff, 5 s per-attempt timeout, breaker opens after 5 consecutive failures for 30 s**. Attempt *n* sleeps `backoff × n`, so a full failure costs roughly 100 ms + 200 ms of waiting plus three timeouts. The auto-configured `DaprInvocationResilience` bean overrides two of those from properties — `maxAttempts` from `service-invocation.retries` (3) and `timeout` from `service-invocation.timeout` (60,000 ms) — and keeps the rest, giving effective defaults of 3 attempts, 100 ms backoff, **60 s timeout**, threshold 5, open 30 s.

Three details worth knowing. Each attempt runs on a shared static cached daemon pool named `adhar-dapr-resilience`, so a timeout cancels the `Future` and returns control to you, but the underlying blocking SDK call may keep running until the socket gives up. The breaker counts *consecutive* failures per `DaprInvocationResilience` instance, not per target app, so one unhealthy downstream opens the circuit for every downstream sharing that instance. And after `openStateDuration` a single `HALF_OPEN` trial is admitted; if it fails the circuit re-opens immediately. An open circuit throws `CircuitBreakerOpenException`, or calls your fallback when you passed one.

> `DaprFacade.invokeServiceResilient` uses the facade's **own private** `DaprInvocationResilience`, constructed with `ResilienceSettings.defaults()`. `adhar.dapr.service-invocation.*` configures the auto-configured *bean*, not the facade's field — so the facade method keeps the 5 s timeout. Inject `DaprInvocationResilience` and call `execute(...)` or `invokeService(client, ...)` when you need the configured settings.

**The outbox.** With `adhar.dapr.outbox.enabled: true`, `OutboxPublisher.append(topic, payload)` writes an `OutboxEvent` under `outbox:evt:<uuid>` and adds the id to an ETag-guarded `outbox:index` document. `OutboxRelayScheduler` runs `relay()` every `relay-interval-ms` (5 s), publishing each pending event, marking it `PUBLISHED` and removing it from the index; on failure it increments the attempt count, and at `max-attempts` (5) parks the event as `DEAD`. Relay failures are logged and swallowed so the schedule never stops. Two caveats: `append` performs two separate state writes rather than one transaction, and it is not joined to your own business write — the guarantee is that a publish survives a broker outage, not that state and event commit atomically. The index is a single hot key, so a high append rate contends on one ETag.

**Resource bounds.** The resilience executor is a cached pool: one thread per concurrent in-flight invocation, unbounded. Everything else is bounded by your own code or stateless.

## Testing

`adhar-kit-test-commons` ships `DaprTestContainer`, a Testcontainers wrapper around `daprio/daprd` for integration tests: `start()`, `stop()`, `getHttpEndpoint()`, `getGrpcPort()`, `getHost()`, `setAppId(...)`.

- **Unit tests** — both `DaprFacade` and `AdharDaprClient` have public constructors taking a `DaprClient` (and optionally a `DaprPreviewClient`), so you can pass Mockito mocks and stub `daprClient.getState(...)` to return a `Mono<State<T>>`. `StateRepository` takes a `DaprFacade`, so a mocked facade drives the retry loop: return a `StateWithETag` and make `saveStateWithETag` return `false` to assert the conflict path.
- **Aspect tests** — construct `new DaprStateAspect(facade)` / `new DaprPublishAspect(facade)` with a mocked `ProceedingJoinPoint`; no Spring context needed.
- **Subscription dispatch** — `DaprEventDispatcher.dispatch(handler, cloudEventMap)` takes a plain `Map`, so you can assert routing, argument conversion, and that a throwing handler yields `DispatchStatus.RETRY`, all without HTTP.
- **Disabling side effects** — `adhar.dapr.enabled: false` removes the whole auto-configuration, the right setting for test slices that would otherwise build a client against a nonexistent sidecar. Leave the outbox off unless you are testing it; `@EnableScheduling` comes with it.

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

The sidecar endpoint itself is resolved by the Dapr SDK's own environment configuration, which `dapr run` and the Kubernetes sidecar injector set for you — the port properties above are bound for completeness and do not change where the client connects.

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

Dapr complements the [Adhar Platform](/docs): sidecars handle the plumbing while the platform provides the components.

## See also

- [Messaging](/adhar-kit/modules/messaging) — the non-Dapr broker path, and how the two compare
- [Resilience](/adhar-kit/modules/resilience) — the circuit-breaker vocabulary used here
- [Event Sourcing](/adhar-kit/modules/event-sourcing) — pairs with the transactional outbox
- [Kubernetes](/adhar-kit/modules/kubernetes) — where sidecars are injected
