---
title: "Dapr"
section: "Modules"
order: 29
path: "/adhar-kit/modules/dapr"
---

# Dapr

`adhar-kit-dapr` gives you every Dapr building block (state, pub/sub, service invocation, bindings, secrets, configuration, locks, jobs, actors and workflows) through one blocking, typed `DaprFacade`, plus annotations for the common cases. Use it when your service runs with a Dapr sidecar. Without a sidecar it runs the core building blocks in memory, so the same code starts on a laptop with no Dapr installed.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-dapr` (package `com.adhar.kit.dapr`) |
| Module toggle | `adhar.kit.modules.dapr`, default `false`. It gates `adhar.getDapr()` |
| Module switch | `adhar.dapr.enabled`, default `true`. It gates `DaprAutoConfiguration` |
| Facade | `DaprFacade`, a Spring bean, also returned by `DaprFacade.getInstance()` |
| Required dependencies | `dapr-sdk`, `adhar-kit-commons`, Jackson, `micrometer-observation` |
| Optional dependencies | `dapr-sdk-actors`, `dapr-sdk-workflows`, `spring-boot-starter-webmvc` (callbacks), `spring-boot-starter-aspectj` (annotations), `micrometer-tracing`, `spring-boot-health` |
| Frameworks | Spring Boot is auto-configured. On other runtimes, `DaprFacade.getInstance()` or `DaprFacade.builder()` builds a facade from the environment. Annotations and callback endpoints are Spring only |

## How it works

Your code calls `DaprFacade`. The facade picks a *backend* at startup. In sidecar mode it talks to the local `daprd` over HTTP and gRPC. In memory mode it keeps state, cache, pub/sub, locks, configuration and secrets inside the JVM.

```diagram
nkb-dapr-flow
```

`adhar.dapr.mode` (or `ADHAR_DAPR_MODE`) chooses the backend:

```diagram
nkb-dapr-modes
```

| Mode | Backend |
|---|---|
| `auto` (default) | Sidecar when `DAPR_HTTP_PORT`, `DAPR_HTTP_ENDPOINT` or `adhar.dapr.dapr-http-port` is set. Memory otherwise |
| `sidecar` | Always the sidecar. One SDK client bean (`DaprClientImpl`), injectable as `DaprClient` or `DaprPreviewClient` |
| `memory` | In-process. Logs one warning at startup. Nothing is shared between replicas or kept across restarts |

The Dapr injector sets `DAPR_HTTP_PORT`, `DAPR_GRPC_PORT`, `DAPR_API_TOKEN` and `APP_ID` on every annotated pod, so on the platform you set nothing. In memory mode, invocation, bindings, jobs, actors, crypto and workflows fail with a `DaprError`.

### Inbound callbacks

In a Spring MVC app, `DaprAppCallbackHandlerMapping` serves every callback the sidecar makes into your app. It runs ahead of your `@RequestMapping`s and ahead of the SDK's own `DaprController`, so the two never collide.

| Path | Serves |
|---|---|
| `GET /dapr/subscribe` | The subscription list Dapr reads at startup |
| `POST /dapr/events/<pubsub>/<topic>` | Event delivery, or the `route` you declared |
| `OPTIONS` / `POST /<binding>` | `@DaprInputBinding` methods |
| `POST /job/<name>` | `@DaprJob` methods |
| `GET /dapr/config`, `/actors/...` | The actor runtime, when `dapr-sdk-actors` is present |

When the sidecar has an app API token (`APP_API_TOKEN` or `adhar.dapr.app-api-token`), every callback must carry it in the `dapr-api-token` header. Other callers get 401. With no web server, each subscriber becomes a streaming subscription. In memory mode, subscribers receive this process's own publishes.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-dapr</artifactId>
    <version>0.1.0</version>
</dependency>
<!-- Needed for @DaprState, @DaprPublish, @DaprLock, @DaprInvoke, @DaprBinding, @DaprConfiguration -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aspectj</artifactId>
</dependency>
```

To use the facade through `AdharFacade`, set `adhar.kit.modules.dapr=true`. Injecting `DaprFacade` directly needs no toggle.

## Use it

### By building block

Each view works on the default component. Call `withStore("<name>")` to use another one.

```java
import com.adhar.kit.dapr.DaprFacade;
import com.adhar.kit.dapr.invoke.InvokeOptions;
import com.adhar.kit.dapr.state.StateRepository;
import java.time.Duration;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final DaprFacade dapr;
    private final StateRepository<Order> orders;
    private final FxClient fx;
    private final ReportBuilder reports;

    public OrderService(DaprFacade dapr, FxClient fx, ReportBuilder reports) {
        this.dapr = dapr;
        this.orders = dapr.state().repository(Order.class);
        this.fx = fx;
        this.reports = reports;
    }

    public void place(Order order) {
        dapr.state().save("order:" + order.id(), order);      // last write wins
        dapr.publish("orders.placed", order);                  // default pubsub
    }

    public Order markPaid(String id) {
        // Read, apply, save with the ETag; retried on conflict. Keep the lambda side-effect free.
        return orders.update("order:" + id, o -> o.withStatus(Status.PAID));
    }

    public Stock stock(String sku) {
        return dapr.invoke("inventory", "api/v1/stock/" + sku, InvokeOptions.get(), Stock.class);
    }

    public Rates rates() {
        return dapr.cache().getOrSet("rates:EUR", Duration.ofMinutes(5), Rates.class, fx::loadEur);
    }

    public Optional<Report> nightlyReport(String owner) {
        // Empty when another replica holds the lock; the work does not run.
        return dapr.lock().runLocked("nightly-report", owner, 300, reports::build);
    }
}
```

| View | Main methods |
|---|---|
| `state()` | `get`, `getEntry` (value plus ETag), `getBulk`, `save` (with `SaveOptions.etag(..)` / `.ttl(..)`), `saveBulk`, `delete`, `transact`, `query`, `repository(Class)` |
| `cache()` | `get`, `set(key, value, ttl)`, `delete`, `getOrSet`. Keys are prefixed `cache:` on the state store |
| `secrets()` | `get(name)` (map), `value(name)`, `getBulk()` |
| `configuration()` | `get(keys)`, `value(key)`, `subscribe(keys, onChange)` |
| `lock()` | `tryLock`, `unlock` (returns `UnlockStatus`), `runLocked` |
| `bindings()` | `invoke(name, operation, data[, metadata[, type]])` |
| `jobs()` | `schedule(name, JobOptions)`, `get`, `delete` |
| `actors()` | `invoke`, `registerReminder` |

The facade also keeps the explicit-component API, for example `saveState(store, key, value)`, `getStateWithETag`, `saveStateWithETag` (returns `false` on an ETag conflict), `publishEvent(pubsub, topic, event)`, `publishBulk`, `invokeServiceResilient(..., fallback)`, `encrypt` and `decrypt`. Use `dapr.client()` for an SDK API the kit does not wrap.

### Subscribers

```java
import com.adhar.kit.dapr.annotation.DaprSubscribe;
import com.adhar.kit.dapr.pubsub.DispatchStatus;

@DaprSubscribe(topic = "payments.settled", deadLetterTopic = "payments.dead")
public DispatchStatus onPaymentSettled(PaymentSettled event) {
    if (!ledger.isReady()) {
        return DispatchStatus.RETRY;        // Dapr redelivers
    }
    ledger.apply(event);                    // must be idempotent: delivery is at least once
    return DispatchStatus.SUCCESS;
}
```

A handler takes zero or one parameter: the payload type, a `DaprCloudEvent<T>`, or the SDK's `CloudEvent`. A method with more parameters fails at startup. The outcome maps like this:

| Handler result | Status sent to Dapr |
|---|---|
| Returns normally, `void` or `null` | `SUCCESS` |
| Returns a `DispatchStatus` | That status |
| Returns `false` | `RETRY` |
| Throws `DropEventException`, or the data cannot be read | `DROP` |
| Throws anything else | `RETRY` |

`@DaprSubscribe` also takes `pubsubName`, `route`, `match` and `priority` (routing rules), `metadata`, and `bulk` with `maxMessagesCount` / `maxAwaitDurationMs`. When several handlers share a topic, each one except the default needs a `match` rule. To subscribe at runtime, call `dapr.subscribe(topic, Type.class, event -> ...)`. Register it while the app starts, because Dapr reads `GET /dapr/subscribe` once.

### Annotations

| Annotation | Effect |
|---|---|
| `@DaprState(key, operation)` | `SAVE` stores the return value. `GET` skips the body and returns the stored value. `DELETE` deletes after the body. `key` is SpEL (`#id`, `#p0`) |
| `@DaprPublish(topic)` | Publishes the return value, or argument `parameterIndex` when `publishReturnValue = false`. A `null` payload publishes nothing |
| `@DaprLock(resourceId, expiryInSeconds = 30)` | Runs the body while holding the lock. The owner is unique per call. When the lock is held: throws `DaprLockNotAcquiredException`, or returns a default value if `failOnLockFailure = false` |
| `@DaprInvoke(appId, endpoint, method = "GET")` | Replaces the body with an invocation. `{name}` in `endpoint` takes that argument. The first unused argument is the body |
| `@DaprBinding(bindingName, operation = "create")` | Sends the result to an output binding. A failed call fails the method |
| `@DaprConfiguration(key, defaultValue, subscribe)` | Returns the config value converted to the return type. With `subscribe = true` the value stays live |
| `@DaprSecret(secretName, key)` | Field injection: a `String` / `char[]` gets one value, a `Map<String, String>` gets the whole secret. A missing secret fails bean creation |
| `@DaprInputBinding(name)`, `@DaprJob(name, schedule)` | Input binding and job handlers (Spring MVC only). A job with a `schedule` is scheduled once at startup |
| `@DaprActor` | Marks an actor class for the actor runtime |

The method annotations are Spring AOP advice. They fire only on calls through the proxy, so a `this.method()` call from the same class does nothing.

### Secrets as configuration

```properties
spring.config.import=optional:dapr-secrets:secretstore/db-credentials
spring.datasource.password=${db-credentials.password}
```

The location form is `dapr-secrets:<store>[/<name>,...][?prefix=<prefix>]`.

## Configuration

All keys are under `adhar.dapr`. Environment variables `ADHAR_DAPR_MODE`, `ADHAR_DAPR_PUBSUB`, `ADHAR_DAPR_STATESTORE`, `ADHAR_DAPR_SECRETSTORE`, `ADHAR_DAPR_CONFIGSTORE` and `ADHAR_DAPR_LOCKSTORE` work too.

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Turns `DaprAutoConfiguration` on or off |
| `mode` | `auto` / `sidecar` / `memory` | `auto` | Backend selection (see above) |
| `app-id` | String | `APP_ID`, `DAPR_APP_ID`, `ADHAR_APP_NAME`, then `spring.application.name` | This app's id |
| `http-endpoint` | String | `DAPR_HTTP_ENDPOINT`, else `http://127.0.0.1:${DAPR_HTTP_PORT:-3500}` | Sidecar HTTP URL |
| `grpc-endpoint` | String | `DAPR_GRPC_ENDPOINT`, else the SDK default | Sidecar gRPC endpoint |
| `dapr-http-port` (alias `dapr-port`) / `dapr-grpc-port` | Integer | `DAPR_HTTP_PORT` / `DAPR_GRPC_PORT` | Sidecar ports |
| `api-token` | String | `DAPR_API_TOKEN` | Token sent to the sidecar |
| `state-store` / `pubsub` / `secret-store` / `config-store` / `lock-store` | String | `statestore` / `pubsub` / `secretstore` / `configstore` / `lockstore` | Default component names |
| `sidecar.wait-on-startup` | boolean | `true` | Wait for `GET /v1.0/healthz/outbound` before the web server opens |
| `sidecar.wait-timeout` | Duration | `30s` | How long to wait |
| `sidecar.fail-on-timeout` | boolean | `false` | Fail startup instead of logging an error |
| `memory.secrets` / `memory.configuration` | Map | empty | Seed values for memory mode |
| `service-invocation.timeout` | long (ms) | `60000` | Per-attempt timeout |
| `service-invocation.retries` | int | `3` | Attempts including the first |
| `service-invocation.retry-backoff` | Duration | `100ms` | Attempt *n* waits *n* times this |
| `service-invocation.failure-threshold` | int | `5` | Consecutive failures that open a target's breaker |
| `service-invocation.open-state-duration` | Duration | `30s` | How long an open breaker rejects calls |
| `configuration.subscribe-enabled` | boolean | `true` | Lets `@DaprConfiguration(subscribe = true)` keep values live |
| `actors.enabled` | boolean | `true` | Actor runtime, when `dapr-sdk-actors` is present |
| `actors.actor-idle-timeout` / `actor-scan-interval` / `drain-ongoing-call-timeout` | Duration | `60m` / `30s` / `60s` | Actor runtime settings |
| `actors.drain-rebalanced-actors` | boolean | `true` | Drain actors on rebalance |
| `actors.scan-packages` | List | the app's packages | Where `@DaprActor` classes are found |
| `workflow.enabled` | boolean | `true` | `DaprWorkflowFacade`, when `dapr-sdk-workflows` is present |
| `workflow.register-beans` | boolean | `true` | Register `Workflow` / `WorkflowActivity` beans and start the runtime |
| `crypto.default-component` | String | `crypto` | Default crypto component |
| `outbox.enabled` | boolean | `false` | Wire `OutboxPublisher` and the relay scheduler |
| `outbox.state-store` / `outbox.pubsub` / `outbox.lock-store` | String | `statestore` / `pubsub` / `lockstore` | Outbox components. An empty lock store relays unguarded |
| `outbox.max-attempts` | int | `5` | Attempts before an event is parked as `DEAD` |
| `outbox.relay-interval-ms` | long | `5000` | Delay between relay passes |

The keys `app-port`, `state-store-config.*`, `pub-sub-config.*`, `bindings.*`, `lock.default-timeout` and the nested `*.enabled` flags (other than `actors`, `workflow` and `outbox`) are bound but not read.

## Operations

- **Startup.** `DaprSidecarLifecycle` waits for the sidecar before the web server opens. If the sidecar is not ready in time, startup continues and logs an error. Set `sidecar.fail-on-timeout=true` to fail instead. Memory mode never waits.
- **Health.** With `spring-boot-health` present, a `dapr` indicator probes the sidecar (2 s timeout) and reports `mode`, `appId` and `endpoint`. It is always `UP` in memory mode. Add it to readiness: `management.endpoint.health.group.readiness.include=readinessState,dapr`.
- **Metrics and tracing.** Every facade call is a Micrometer observation named `adhar.dapr`, tagged `dapr.api`, `dapr.operation`, `dapr.component` and `outcome` (`SUCCESS`, `CONFLICT`, `NOT_FOUND`, `CLIENT_ERROR`, `UNAVAILABLE` or `SERVER_ERROR`). Calls carry the current span's trace context, or the inbound request's, to the sidecar.
- **Errors.** Failures are `DaprError` (a `DaprFacade.DaprException`) with `getStatus()`, `getErrorCode()`, `getDaprMessage()`, and `isNotFound()`, `isConflict()` and `isUnavailable()`.
- **Invocation resilience.** Each target app id gets its own breaker from `DaprResilienceRegistry`, so one failing dependency does not block the others. `invoke` retries idempotent verbs only, on connection failures and 502/503/504. `invokeServiceResilient` retries every verb and takes a fallback. An open breaker throws `CircuitBreakerOpenException`. A facade built outside Spring uses `ResilienceSettings.defaults()`: 3 attempts, 100 ms backoff, 5 s timeout, breaker opens after 5 failures for 30 s.
- **ETag conflicts.** `StateRepository.update` retries only genuine conflicts, up to 3 times by default, and then throws `OptimisticConcurrencyException`. Pass a higher `maxRetries` to the `StateRepository` constructor for a contended key. `save` and `state().save` are last-write-wins.
- **Outbox.** `OutboxPublisher.append(topic, payload)` writes the event and its index entry in one state transaction. The relay takes a lock on `lockstore`, so one replica publishes per pass. A failed publish counts an attempt. At `max-attempts` the event is parked as `DEAD`. The outbox does not join your own business write.

## Limits

- Memory mode is per process. Use it for local runs and tests, not for more than one replica.
- In memory mode, invocation, bindings, jobs, actors, crypto and workflows are unavailable.
- The facade's actor methods call actors from outside. Host actors with `@DaprActor` and call them with `DaprActorProxyFactory.create(...)`.
- Without Spring MVC there are no input bindings, jobs or actor callbacks. Subscriptions fall back to streaming.
- `AdharDaprClient` is deprecated. It delegates to `DaprFacade`, so use the facade.
- For tests, build a facade around Mockito mocks with `new DaprFacade(daprClient, previewClient)`, or run against a real sidecar with `DaprTestContainer` from `adhar-kit-test-commons`.

## Next steps

- [Messaging](/adhar-kit/modules/messaging): the broker path without Dapr.
- [Resilience](/adhar-kit/modules/resilience): circuit breakers for calls that do not go through Dapr.
- [Health](/adhar-kit/modules/health): readiness groups for the `dapr` indicator.
- [Kubernetes](/adhar-kit/modules/kubernetes): where sidecars are injected.
