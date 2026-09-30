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
| Requires | A Dapr sidecar reachable on `dapr-http-port` (3500) / `dapr-grpc-port` (50001) |
| Use it when | Your services run with Dapr sidecars and you want typed, resilient access to the components |

## How it works

Your process never talks to Redis, Kafka, or Vault directly. It talks to the local Dapr sidecar over HTTP or gRPC, naming a *component* — `statestore`, `pubsub`, `secretstore` — and the platform decides what that component actually is.

```text
  +---------------------- pod ----------------------+
  |                                                 |
  |  your app                    dapr sidecar       |
  |  +---------------------+     +---------------+  |
  |  | AdharDaprClient     |---->| :3500 HTTP    |  |
  |  | DaprFacade          |     | :50001 gRPC   |  |
  |  | @DaprState aspect   |     |               |  |
  |  | @DaprPublish aspect |     +-------+-------+  |
  |  |                     |             |          |
  |  | GET  /dapr/subscribe|<------------+  (Dapr   |
  |  | POST /dapr/subscribe/<pubsub>/<topic>  asks  |
  |  +---------------------+             |   then   |
  +--------------------------------------|--delivers|
                                         v
                       components: statestore | pubsub | secretstore
                                   configstore | lockstore | bindings
```

`DaprSubscriptionRegistrar` is a `SmartInitializingSingleton`: after the context is built it scans every bean for `@DaprSubscribe` and `@DaprTopic` methods and synthesises a dispatch route at `/dapr/subscribe/<pubsub>/<topic>` for each. `DaprSubscriptionController` then serves `GET /dapr/subscribe` — the endpoint Dapr polls at startup to learn what you are subscribed to — and `POST /dapr/subscribe/**`, which dispatches incoming CloudEvents to the right handler. The registrar synthesises its own routes regardless of a custom `route()` value, which is folded into the generated path. The controller backs off with `@ConditionalOnMissingClass("io.dapr.springboot.DaprController")` so it does not clash with the SDK's own controller.

A handler returns a `DispatchStatus`: `SUCCESS` acknowledges, `RETRY` asks Dapr to redeliver, `DROP` discards or dead-letters without retry.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-dapr</artifactId>
    <version>0.1.0</version>
</dependency>
```

`dapr-sdk-actors` and `dapr-sdk-workflows` are optional; the actor and workflow auto-configurations activate only when those classes are present.

## Key APIs

**`AdharDaprClient`** — the thin, blocking wrapper over `DaprClient`. `saveState`, `getState` (returns `Optional<T>`), `deleteState`, `publishEvent`, `invokeService`, the `get`/`post` shorthands, `getSecret` / `getAllSecrets`, `invokeBinding`, `getConfiguration` / `getConfigurations`, and `tryLock` / `unlock`. It is `AutoCloseable`.

**`DaprFacade`** — the richer surface, reachable through `adhar.getDapr()`:

- State with concurrency control: `getStateWithETag` returns a `StateWithETag<T>` (with `exists()`); `saveStateWithETag` and `deleteStateWithETag` return `false` when the ETag no longer matches. Also `saveStateWithTTL`, `getBulkState`, and `executeStateTransaction(store, List<StateOperation>)` for atomic multi-key writes.
- Invocation: `invokeService`, `invokeServiceAsync` (a `CompletableFuture`), and `invokeServiceResilient`, which routes through `DaprInvocationResilience`.
- Secrets and configuration: `getSecret`, `getBulkSecrets`, `getConfiguration`, and `subscribeConfiguration(store, keys, callback)` for push updates.
- Locks: `tryLock(store, resourceId, owner, expirySeconds)` and `unlock(...)`.
- Operational: `isAvailable()`, `getMetadata()`, `shutdown()`.

**`StateRepository<T>`** — a typed repository over one store: `find`, `findWithETag`, `save`, `delete`, and `update(key, UnaryOperator<T>)`, which performs a read-modify-write under ETag and retries on conflict up to `maxRetries`, throwing `OptimisticConcurrencyException` when it gives up.

**`DaprInvocationResilience`** — linear retry plus a circuit breaker, configured by a `ResilienceSettings` record: `maxAttempts`, `retryBackoff` (attempt *n* sleeps `retryBackoff * n`), per-attempt `timeout`, `failureThreshold`, and `openStateDuration`. Defaults are 3 attempts, 100 ms backoff, 5 s timeout, opening after 5 consecutive failures for 30 s. The auto-configured bean takes `maxAttempts` from `adhar.dapr.service-invocation.retries` and `timeout` from `adhar.dapr.service-invocation.timeout`, keeping the rest at defaults. When the breaker is open, calls fail with `CircuitBreakerOpenException`.

## Worked example — minimal state access

```java
import com.adhar.kit.dapr.client.AdharDaprClient;

@Service
public class UserService {
    private final AdharDaprClient dapr;
    public UserService(AdharDaprClient dapr) { this.dapr = dapr; }   // auto-configured bean

    public void saveUser(User user) {
        dapr.saveState("statestore", "user:" + user.getId(), user);
    }

    public Optional<User> getUser(String userId) {
        return dapr.getState("statestore", "user:" + userId, User.class);
    }
}
```

## Worked example — annotations, concurrency, and a subscriber

```java
import com.adhar.kit.dapr.annotation.DaprPublish;
import com.adhar.kit.dapr.annotation.DaprState;
import com.adhar.kit.dapr.annotation.DaprSubscribe;
import com.adhar.kit.dapr.pubsub.DispatchStatus;
import com.adhar.kit.dapr.state.StateRepository;

@Service
public class OrderService {

    private final StateRepository<Order> orders;

    public OrderService(DaprFacade dapr) {
        this.orders = new StateRepository<>(dapr, "statestore", Order.class);
    }

    @DaprState(storeName = "statestore", key = "'order:' + #order.id")
    @DaprPublish(pubsubName = "pubsub", topic = "orders.created")
    public Order createOrder(Order order) {
        orders.save("order:" + order.getId(), order);
        return order;              // published to orders.created by @DaprPublish
    }

    // read-modify-write under ETag; retries on conflict
    public Order markPaid(String orderId) {
        return orders.update("order:" + orderId, o -> o.withStatus(Status.PAID));
    }

    @DaprSubscribe(pubsubName = "pubsub", topic = "payments.settled",
                   deadLetterTopic = "payments.dead")
    public DispatchStatus onPaymentSettled(PaymentSettled event) {
        if (!ledger.isReady()) {
            return DispatchStatus.RETRY;      // Dapr redelivers
        }
        ledger.apply(event);
        return DispatchStatus.SUCCESS;
    }
}
```

### How the aspects work

`DaprStateAspect` and `DaprPublishAspect` are registered as beans by `DaprAutoConfiguration` — no `@Enable` annotation is needed, only `adhar.dapr.enabled` left at `true`. Both are Spring AOP advice, so they fire on external calls to proxied beans; a self-call inside the same class bypasses them.

`@DaprState(key = ...)` takes a **SpEL expression**, evaluated by `DaprKeyResolver` with the same conventions as Spring's `@Cacheable`: `#paramName`, `#p0`, and `#a0` all resolve to arguments. A blank expression, or one evaluating to `null`, falls back to a deterministic key built from the declaring class, method name, and argument hash. `operation()` selects `SAVE` (the default), `GET`, or `DELETE`.

`@DaprPublish` publishes the method's return value by default; set `publishReturnValue = false` and `parameterIndex = n` to publish an argument instead.

> **Not everything with an annotation has an aspect.** `@DaprInvoke`, `@DaprBinding`, `@DaprSecret`, `@DaprConfiguration`, and `@DaprLock` are declared but have no interceptor registered — use the equivalent `DaprFacade` or `AdharDaprClient` method directly.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.dapr.enabled` | Master switch for the auto-configuration | `true` |
| `adhar.dapr.app-id` | This service's Dapr app id | (none) |
| `adhar.dapr.app-port` | Port the sidecar calls back on | `8080` |
| `adhar.dapr.dapr-port` / `dapr-http-port` | Sidecar HTTP port | `3500` |
| `adhar.dapr.dapr-grpc-port` | Sidecar gRPC port | `50001` |
| `adhar.dapr.state-store` | Default state component name | `statestore` |
| `adhar.dapr.pubsub` | Default pub/sub component name | `pubsub` |
| `adhar.dapr.secret-store` | Default secret component name | `secretstore` |
| `adhar.dapr.configuration-store` | Default configuration component | `configstore` |
| `adhar.dapr.lock-store` | Default lock component | `lockstore` |
| `adhar.dapr.state-store-config.consistency` / `.concurrency` | State semantics | `eventual` / `first-write` |
| `adhar.dapr.pub-sub-config.dead-letter-topic` | Default dead-letter topic | `dead-letter` |
| `adhar.dapr.service-invocation.timeout` | Per-attempt timeout, ms | `60000` |
| `adhar.dapr.service-invocation.retries` | Attempts including the first | `3` |
| `adhar.dapr.lock.default-timeout` | Lock hold time, ms | `30000` |
| `adhar.dapr.actors.enabled` / `.actor-idle-timeout` | Actor runtime | `true` / `60m` |
| `adhar.dapr.workflow.enabled` | Workflow facade | `true` |
| `adhar.dapr.outbox.enabled` | Wire `OutboxPublisher` and the relay scheduler | `false` |
| `adhar.dapr.outbox.max-attempts` / `.relay-interval-ms` | Outbox relay behaviour | `5` / `5000` |

```yaml
adhar:
  dapr:
    enabled: true
    app-id: orders-service
    app-port: 8080
    dapr-port: 3500
    state-store: statestore
    pubsub: pubsub
    secret-store: vault
    service-invocation: { timeout: 60000, retries: 3 }
    outbox: { enabled: true, relay-interval-ms: 5000 }
```

Enabling the outbox registers an `OutboxPublisher` — `append(topic, payload)` stores the event in the state store within your write, and a scheduled `OutboxRelayScheduler` publishes it afterwards — so a publish can no longer be lost between the state write and the broker.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Every call fails at startup | No Dapr sidecar; the client cannot reach port 3500 | Run with `dapr run`, or deploy with the sidecar injection annotations |
| `@DaprSubscribe` handler never fires | Spring MVC absent, so the subscription controller was not registered | Add `spring-boot-starter-webmvc`; check `GET /dapr/subscribe` lists the topic |
| Duplicate subscription endpoints | The SDK's own `io.dapr.springboot.DaprController` is on the classpath | The module's controller stands down automatically; use one or the other |
| `@DaprState` writes to an unexpected key | The SpEL expression was blank or evaluated to `null` | Use `#paramName` / `#p0`; remember the literal quotes in `"'order:' + #order.id"` |
| `UnsupportedOperationException` on `queryState`, `encrypt`, `decrypt` | Not available through the SDK version in use | Call the Dapr HTTP API directly |
| `UnsupportedOperationException` from `invokeActor` / actor state | Actor operations belong inside the actor runtime | Use `DaprActorProxyFactory` and the `dapr-sdk-actors` `ActorProxyBuilder` |
| `OptimisticConcurrencyException` from `StateRepository.update` | Contention exhausted the retry budget | Raise `maxRetries`, or reduce the write hot spot |
| `CircuitBreakerOpenException` | 5 consecutive invocation failures opened the breaker | Wait out `openStateDuration` (30 s), and fix the downstream service |
| An annotation appears to do nothing | Self-invocation, or the annotation has no aspect | Call through the bean; for `@DaprInvoke`, `@DaprBinding`, `@DaprSecret`, `@DaprConfiguration`, `@DaprLock` use the facade methods |

Dapr complements the [Adhar Platform](/docs): sidecars handle the plumbing while the platform provides the components.

## See also

- [Messaging](/adhar-kit/modules/messaging) — the non-Dapr broker path, and how the two compare
- [Resilience](/adhar-kit/modules/resilience) — the circuit-breaker vocabulary used here
- [Event Sourcing](/adhar-kit/modules/event-sourcing) — pairs with the transactional outbox
- [Kubernetes](/adhar-kit/modules/kubernetes) — where sidecars are injected
