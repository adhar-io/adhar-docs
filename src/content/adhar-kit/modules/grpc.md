---
title: "gRPC"
section: "Modules"
order: 21
path: "/adhar-kit/modules/grpc"
---

# gRPC

Raw `io.grpc` gives you a server builder and a channel builder and nothing else. There is no bean discovery, no deadlines, no metrics, and no structured error mapping.

`adhar-kit-grpc` **supplies the production scaffolding around gRPC so a service is a `@GrpcService` bean and a caller is a `@GrpcClient` field**. You configure TLS, retry, health, reflection, and observability declaratively instead of assembling them by hand.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-grpc` |
| Built on | gRPC Java 1.82.0 (netty-shaded, protobuf, stub, services), Protobuf 4.35.1; optional Micrometer |
| Entry points | `AdharGrpcServer`, `AdharGrpcClientFactory`, `@GrpcService`, `@GrpcClient` |
| Config prefix | `adhar.grpc` |
| Use it when | Services talk to each other over gRPC and you want deadlines, mTLS, and traces without per-service wiring |

## How it works

The module has two halves, both driven by `GrpcProperties`.

- **Server side.** A Spring `SmartInitializingSingleton` (`GrpcServiceRegistrar`) finds your annotated beans and hands them to one `AdharGrpcServer`. A `SmartLifecycle` then starts it.
- **Client side.** Channels are created once per **channel name** and cached. So `payments` resolves to the same `ManagedChannel` everywhere.

```diagram
kit-grpc-server-client
```

### Interceptor order, as `AdharGrpcServer.start()` builds it

Every service is wrapped with `ServerInterceptors.intercept(service, interceptors)`. In that API, **the last entry in the list is outermost**. Its `interceptCall` runs first, and everything added before it sees its `ServerCall` wrapping. The list is built in this order, so the effective nesting is the reverse:

| Position | Interceptor | Why it sits there |
| --- | --- | --- |
| Outermost | `MetricsServerInterceptor` | Added last, so it records a final status wherever the call was closed: auth denial, shed load, uncaught exception, or normal completion |
| | `ConcurrencyLimitServerInterceptor` | Inside metrics, so a shed `RESOURCE_EXHAUSTED` call is still counted. Outside auth and tracing |
| | `AuthServerInterceptor` | Only present when `adhar.grpc.auth.enabled` is `true` |
| | `TracingServerInterceptor` | Added after logging so its MDC `traceId`/`spanId` setup runs **before** `LoggingInterceptor`'s, giving log lines their correlation ids |
| | `LoggingInterceptor` | Always added, unconditionally |
| Innermost | `ExceptionHandlerInterceptor` | Closest to your service, where an escaping exception can still be mapped to a `Status` |

`ExceptionHandlerInterceptor` catches only around the listener callbacks it overrides: `onMessage`, `onHalfClose`, `onCancel`. A unary handler runs inside `onHalfClose`, so the normal path is covered. An exception thrown on a thread you spawned yourself never passes through it. Complete those calls with `responseObserver.onError(...)` by hand.

Exceptions are mapped by type:

- `IllegalArgumentException` and `NullPointerException` → `INVALID_ARGUMENT`
- `IllegalStateException` → `FAILED_PRECONDITION`
- `SecurityException` → `PERMISSION_DENIED`
- `UnsupportedOperationException` → `UNIMPLEMENTED`
- anything whose simple class name contains `Timeout`, `NotFound`, or `AlreadyExists` → the matching status

Everything else becomes `INTERNAL`, with the message prefixed `Internal server error:`.

**Retry is gRPC's own built-in retry policy.** It is configured through the channel's service config, not a custom interceptor. So it respects the `retryable-status-codes` list (default `UNAVAILABLE`, `DEADLINE_EXCEEDED`, `RESOURCE_EXHAUSTED`, `ABORTED`) and the server's own pushback hints. An earlier hand-rolled `RetryInterceptor` slept on failure without ever retrying. It has been removed.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-grpc</artifactId>
    <version>0.1.0</version>
</dependency>
```

The gRPC runtime (`grpc-netty-shaded`, `grpc-protobuf`, `grpc-stub`, `grpc-services`, `protobuf-java`) comes in transitively. A `grpc-bom` imported in this module's own `dependencyManagement` keeps the versions aligned. It is closer than the parent, so it wins over Spring Boot's older pins for `grpc-core`/`grpc-api`/`grpc-util`.

Do not pin `io.grpc` versions yourself. Mismatched `grpc-core` and `grpc-netty-shaded` produce a `NoSuchFieldError` at runtime. That BOM import exists to prevent exactly this.

## Key APIs

- **`AdharGrpcServer`** — `addService(BindableService)`, `start()`, `shutdown()`, `awaitTermination()`, `getPort()`, `isRunning()`, `getServiceCount()`, `getHealthStatusManager()` (the standard gRPC health service you flip per service), plus builder-style `withMeterRegistry`, `withAuthenticator`, `withGrpcObserver`, `withConcurrencyLimitInterceptor`.
- **`AdharGrpcClientFactory`** — `getChannel(name)` builds or returns the cached channel for that configured name. Also `shutdownChannel(name)`, `shutdown()`, `getChannelCount()`.
- **`@GrpcService(value, enableInterceptors, interceptors)`** — class-level. `GrpcServiceRegistrar` discovers it and registers it before the server starts. The class must still extend the generated `…ImplBase`.
- **`@GrpcClient(value, timeout, enableRetry, maxRetries)`** — field- or parameter-level. `GrpcClientBeanPostProcessor` injects the named `ManagedChannel`. **Only fields assignable from `ManagedChannel` are injected.** Any other type is logged at WARN and left alone, so a stub-typed field stays null.
- **Server interceptors** — `ExceptionHandlerInterceptor`, `LoggingInterceptor`, `MetricsServerInterceptor`, `TracingServerInterceptor`, `AuthServerInterceptor`, `ConcurrencyLimitServerInterceptor`.
- **Client interceptors** — `DeadlineClientInterceptor`, `MetricsClientInterceptor`, `TracingClientInterceptor`.
- **Auth SPI** — `GrpcAuthenticator` with `PermitAllGrpcAuthenticator` and `StaticTokenAuthenticator`. Supply your own bean for real credentials.
- **`GrpcUtils`** — `Metadata.Key` constants (`CORRELATION_ID_KEY`, `REQUEST_ID_KEY`, `USER_ID_KEY`, `TENANT_ID_KEY`, `AUTHORIZATION_KEY`, `API_KEY_KEY`) plus the matching getters, `exceptionToStatus`, `isRetryableStatus`, `isIdempotentMethod`, `resolveCertFile`.
- **`GrpcFacade`** — present, but its `call`, `callAsync` and `serverStream` methods are **unimplemented placeholders**. They log a warning and return `null`. Call real generated stubs, and do not build on the facade.

## Worked example: a resilient client

Pay attention to two things here: where the stub is built, and what happens to the deadline.

```java
package com.example.orders;

import com.adhar.kit.grpc.annotation.GrpcClient;
import io.grpc.ManagedChannel;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class PaymentsClient {

    @GrpcClient("payments")
    private ManagedChannel channel;

    public ChargeResult charge(String orderId, long amountMinor) {
        // Build the stub lazily. GrpcClientBeanPostProcessor does not implement
        // Ordered, so do not assume the field is populated by @PostConstruct time.
        var stub = PaymentServiceGrpc.newBlockingStub(channel)
                .withDeadlineAfter(2, TimeUnit.SECONDS);
        try {
            ChargeResponse response = stub.charge(ChargeRequest.newBuilder()
                    .setOrderId(orderId)
                    .setAmountMinor(amountMinor)
                    .build());
            return ChargeResult.settled(response.getPaymentId());
        } catch (StatusRuntimeException e) {
            Status.Code code = e.getStatus().getCode();
            if (code == Status.Code.DEADLINE_EXCEEDED || code == Status.Code.UNAVAILABLE) {
                // Built-in retry already exhausted its attempts for these codes.
                return ChargeResult.unknown(orderId);
            }
            if (code == Status.Code.INVALID_ARGUMENT) {
                throw new IllegalArgumentException(e.getStatus().getDescription(), e);
            }
            throw e;
        }
    }
}
```

```yaml
adhar:
  grpc:
    server:
      port: 9090
      enable-reflection: false          # off in production
      enable-health-check: true
      shutdown-grace-period: 30
    client:
      channels:
        payments:
          target: payments-headless.adhar.svc.cluster.local:9090
          enable-retry: true
          max-retry-attempts: 3
          default-timeout: 2000
          enable-tls: true
          load-balancing-policy: round_robin
    security:
      enabled: true
      enable-tls: true
      enable-mtls: true
      cert-chain: /etc/tls/tls.crt
      private-key: /etc/tls/tls.key
      trust-cert-collection: /etc/tls/ca.crt
      client-auth: REQUIRE
    concurrency:
      enabled: true
      global-limit: 200
```

> **`target` must be plain `host:port`.** `AdharGrpcClientFactory.createChannel` splits the target on `:` and calls `ManagedChannelBuilder.forAddress(host, port)`. A URI-style target such as `dns:///payments:9090` parses as host `dns` and a port of `///payments`. That throws `NumberFormatException` at channel creation.
>
> Point the channel at a **headless** Service, so DNS returns pod IPs for `round_robin` to balance over. A normal ClusterIP Service resolves to one virtual IP, which leaves the policy nothing to spread across.

## Deadlines and cancellation

`DeadlineClientInterceptor` is installed on every channel. It fills in `default-timeout` as a `CallOptions` deadline **only when the caller set none**. An explicit `withDeadlineAfter` always wins. A `default-timeout` of zero or less disables defaulting entirely. Without that interceptor, the configured timeout would do nothing, because nothing in grpc-java reads it on its own.

The deadline then travels to the server on the wire. On the server side, it appears as `io.grpc.Context.current().getDeadline()`. The context is cancelled when the deadline passes. **Cancellation does not interrupt your handler thread.** A handler in the middle of a slow query keeps running until it finishes, or until it checks for itself:

```java
if (io.grpc.Context.current().isCancelled()) {
    responseObserver.onError(Status.CANCELLED.asRuntimeException());
    return;
}
```

For long handlers, check that between stages, or register `Context.current().addListener(...)` to abort the backing work. Also pass the remaining budget onward. A downstream call made inside a handler should inherit the deadline rather than start a fresh 2 seconds. Otherwise a chain of three hops costs the caller six.

## mTLS

Server-side TLS is built in `AdharGrpcServer.buildServerBuilder`. It activates only when **both** `security.enabled` and `security.enable-tls` are true. Then `cert-chain` and `private-key` are mandatory. If either is missing, startup throws `GrpcServiceConfigurationException` rather than silently serving plaintext.

With `enable-mtls: true`, `trust-cert-collection` becomes mandatory too. `client-auth` is parsed as `NONE`, `OPTIONAL` or `REQUIRE`. A blank value means `REQUIRE`, and anything unrecognised fails startup.

On the client, `trust-cert-collection` sets the trust manager. `enable-mtls` requires `cert-chain`/`private-key` for the client certificate. Paths go through `GrpcUtils.resolveCertFile`, so `classpath:` locations work as well as filesystem paths.

## How it behaves

- **Thread-safety.** `AdharGrpcServer` and `AdharGrpcClientFactory` are singletons shared across the application. `getChannel(name)` is `synchronized` and backed by `computeIfAbsent`, so concurrent callers get the same channel. `shutdown()` and `shutdownChannel()` are *not* synchronized. Do not call them while request threads are still resolving channels. `ManagedChannel` itself is thread-safe and designed to be shared. Generated stubs are immutable and cheap. So calling `newBlockingStub(channel).withDeadlineAfter(...)` per call allocates little and avoids shared mutable state.
- **Lifecycle.** `GrpcServiceRegistrar` runs as a `SmartInitializingSingleton`, so every `@GrpcService` singleton is fully initialised before registration. The server lifecycle bean uses `getPhase() == Integer.MAX_VALUE`, so the port opens last, after your datasource, caches and everything else are up. A bean annotated `@GrpcService` that is not a `BindableService` is logged at WARN and skipped. It is never registered.
- **Shutdown.** `shutdown()` calls `server.shutdown()` (stop accepting, drain in-flight). It waits up to `shutdown-grace-period` seconds, then forces `shutdownNow()`. It runs from three places: the `SmartLifecycle.stop()`, a JVM shutdown hook registered inside `start()`, and Spring's inferred destroy-method on the public no-arg `shutdown()`. All three are idempotent. The client factory's `shutdown()` is also inferred as a destroy method. It drains each channel with a fixed 30-second wait.
- **Failure behaviour.** A target that is down yields `UNAVAILABLE`, which is retryable by default. So a write with `enable-retry: true` can be applied more than once. Turn retry off per channel for non-idempotent methods. A channel name with no configuration entry does **not** fail. The factory logs a WARN, falls back to `client.defaults`, and connects to `client.default-target` (`localhost:9090`). So a typo in a channel name connects to the wrong place rather than raising an error.
- **Resource bounds.** `ConcurrencyLimitServerInterceptor` uses `tryAcquire` on a global `Semaphore`, plus optional per-service semaphores keyed by fully-qualified service name. A call must take both. If it fails either, it is closed immediately with `RESOURCE_EXHAUSTED` and releases whatever it already held. Permits return on `onComplete` or `onCancel`, guarded by an `AtomicBoolean` so each call releases exactly once. There is no queue. Excess load is shed, not buffered.

### Properties that are defined but not read

`GrpcProperties` declares several fields the module never consumes. Setting them has no effect:

| Property | Reality |
| --- | --- |
| `adhar.grpc.server.address` | The server is built with `ServerBuilder.forPort(port)`, so it binds all interfaces |
| `adhar.grpc.server.executor-thread-pool-size` | No executor is set, so the default gRPC executor is used |
| `adhar.grpc.observability.enable-logging` and `.log-level` | `LoggingInterceptor` is always added and logs two INFO lines per call. Quieten it with a logger level on `com.adhar.kit.grpc.interceptor.LoggingInterceptor` |

## Observability

Metrics need three things: `micrometer-core` on the classpath, a `MeterRegistry` bean, and `observability.enable-metrics` set to true. The interceptors then emit:

- `grpc.server.calls` and `grpc.client.calls` — counters tagged `method` and `status`
- `grpc.server.duration` and `grpc.client.duration` — timers, same tags
- `grpc.server.calls.inflight` — gauge

`status` is the gRPC `Status.Code` name, so you can alert directly on `DEADLINE_EXCEEDED` and `RESOURCE_EXHAUSTED`.

Tracing works at two levels. `TracingServerInterceptor` always parses the W3C `traceparent` header and derives a child span. It stores the span on the gRPC `Context` under `TRACE_CONTEXT_KEY`, and copies `traceId`/`spanId` into SLF4J MDC. This needs no extra dependency.

Real spans are recorded only when `micrometer-observation` is on the classpath and an `ObservationRegistry` bean exists. Those two wire in `MicrometerGrpcObserver`. Without them, you still get log correlation, but no spans.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.grpc.enabled` | Master switch | `true` |
| `adhar.grpc.enable-service-registrar` | Auto-discover `@GrpcService` beans | `true` |
| `adhar.grpc.enable-client-injection` | Auto-inject `@GrpcClient` fields | `true` |
| `adhar.grpc.server.port` | Listen port | `9090` |
| `adhar.grpc.server.max-inbound-message-size` | Max request bytes | `4194304` (4 MB) |
| `adhar.grpc.server.max-inbound-header-list-size` | Max metadata bytes | `8192` |
| `adhar.grpc.server.keep-alive-time` / `.keep-alive-timeout` | Keep-alive seconds | `300` / `20` |
| `adhar.grpc.server.enable-reflection` | Expose the reflection service | `true` |
| `adhar.grpc.server.enable-health-check` | Expose the gRPC health service | `true` |
| `adhar.grpc.server.shutdown-grace-period` | Drain seconds on shutdown | `30` |
| `adhar.grpc.client.default-target` | Target when a channel omits one | `localhost:9090` |
| `adhar.grpc.client.channels.<name>.target` | Channel target, `host:port` only | — |
| `adhar.grpc.client.channels.<name>.enable-retry` | Built-in gRPC retry | `true` |
| `adhar.grpc.client.channels.<name>.max-retry-attempts` | Retry attempts (clamped to at least 2) | `3` |
| `adhar.grpc.client.channels.<name>.default-timeout` | Deadline in ms; `<= 0` disables | `60000` |
| `adhar.grpc.client.channels.<name>.load-balancing-policy` | LB policy | `round_robin` |
| `adhar.grpc.client.channels.<name>.initial-backoff-millis` | First retry delay | `1000` |
| `adhar.grpc.client.channels.<name>.max-backoff-millis` | Backoff ceiling | `10000` |
| `adhar.grpc.client.channels.<name>.backoff-multiplier` | Backoff growth | `2.0` |
| `adhar.grpc.client.channels.<name>.retryable-status-codes` | Codes eligible for retry | `UNAVAILABLE, DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED, ABORTED` |
| `adhar.grpc.security.enabled` | Gate for the TLS block | `false` |
| `adhar.grpc.security.enable-tls` | Server-side TLS | `false` |
| `adhar.grpc.security.enable-mtls` | Require client certificates | `false` |
| `adhar.grpc.security.client-auth` | `NONE`, `OPTIONAL`, `REQUIRE` | `NONE` |
| `adhar.grpc.auth.enabled` | Enable `AuthServerInterceptor` | `false` |
| `adhar.grpc.auth.shared-secret` | Switches the default authenticator to `StaticTokenAuthenticator` | — |
| `adhar.grpc.observability.enable-metrics` | Metrics interceptors | `true` |
| `adhar.grpc.observability.enable-tracing` | Tracing interceptors | `true` |
| `adhar.grpc.concurrency.enabled` | In-flight call limiting | `false` |
| `adhar.grpc.concurrency.global-limit` | Max concurrent calls | `200` |
| `adhar.grpc.concurrency.service-limits` | Map of service name to limit | empty |

## Testing

`adhar-kit-test-commons` has no gRPC-specific helper. Test against the in-process transport instead, which is how this module tests itself. Add `io.grpc:grpc-inprocess` and `io.grpc:grpc-testing` at test scope. The module's own `grpc-bom` keeps the version aligned.

1. **Service logic** — a `@GrpcService` class is an ordinary bean. Call its method directly with a hand-rolled `StreamObserver` that captures `onNext`/`onError`, and assert on the captured value. You need no server.
2. **Interceptor behaviour** — build an `InProcessServerBuilder` with your service wrapped in the interceptors under test. Build an `InProcessChannelBuilder` against the same name. This is the only way to assert the real ordering, and the behaviour depends on the nesting.
3. **Deadlines** — make the stub service sleep for longer than the deadline. Assert that the client sees `DEADLINE_EXCEEDED`. The module's own `EchoServiceSupport` does exactly this with a `slow:<millis>` request convention.
4. **Disabling the module** — set `adhar.grpc.enabled: false` in a `@SpringBootTest` property. No auto-configuration runs, so no port is bound. For a context that needs beans but not a listener, set `adhar.grpc.server.enabled: false`. `start()` then returns without binding.
5. **Avoid port clashes** — the default `9090` is fixed. Give each integration test an explicit free port, or use the in-process transport.

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `@GrpcService` bean never serves traffic | The class is annotated but does not extend the generated `…ImplBase`, so it is not a `BindableService` | Extend the generated base class. The skip is logged at WARN |
| `@GrpcClient` field is null | The field is typed as a stub, not `ManagedChannel` | Inject `ManagedChannel` and build the stub yourself |
| NPE building a stub in `@PostConstruct` | The post-processor is not `Ordered`, so injection may not have happened yet | Build the stub lazily inside the calling method |
| `NumberFormatException` creating a channel | A URI-style `dns:///host:port` target | Use plain `host:port` |
| `NoSuchFieldError` from `io.grpc` on startup | Mixed `io.grpc` versions from another dependency's management | Let the module's `grpc-bom` win; remove your own `io.grpc` pins |
| Calls to the wrong backend | A mistyped channel name silently falls back to `client.default-target` | Check the "No channel configuration found" WARN at startup |
| Calls hang for a minute | No deadline set, falling back to the 60 s channel default | Set `default-timeout` per channel and `withDeadlineAfter` per call |
| Traffic all hits one pod | The target is a ClusterIP Service, so DNS returns one virtual IP | Point `round_robin` at a headless Service |
| Retries fire on a non-idempotent write | Retry is on by default per channel | Set `enable-retry: false` for that channel, or narrow `retryable-status-codes` |
| Server keeps working after the client gave up | A deadline cancels the gRPC `Context`, not the handler thread | Check `Context.current().isCancelled()` between stages |
| Kubernetes probe cannot reach gRPC health | `enable-health-check` is off, or the probe points at the HTTP port | Turn it on and point the probe at `adhar.grpc.server.port` |
| Schema visible to anyone who can reach the port | Reflection is enabled by default | Set `enable-reflection: false` in production |

## See also

- [Health](/adhar-kit/modules/health) — `GrpcHealthIndicator` reports channel state into readiness.
- [Metrics](/adhar-kit/modules/metrics) and [Tracing](/adhar-kit/modules/tracing) — where the interceptors send their signals.
- [Resilience](/adhar-kit/modules/resilience) — circuit breaking around remote calls.
- [Concepts](/adhar-kit/concepts) — the shared facade, module gating and auto-configuration model.
