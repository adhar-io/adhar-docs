---
title: "gRPC"
section: "Modules"
order: 21
path: "/adhar-kit/modules/grpc"
---

# gRPC

`adhar-kit-grpc` runs a gRPC server and named client channels from configuration. A service is a `@GrpcService` bean, a caller gets a `@GrpcClient` `ManagedChannel`, and the module adds exception-to-status mapping, default deadlines, built-in retry, TLS and mTLS, optional token auth, concurrency limiting, metrics and W3C trace propagation. Use it when your services talk to each other over gRPC and you want that scaffolding without per-service wiring.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-grpc` |
| Module toggle | `adhar.kit.modules.grpc` (default `false`) gates `adhar.getGrpc()` |
| Module switch | `adhar.grpc.enabled` (default `true`) gates `GrpcAutoConfiguration`; `adhar.grpc.server.enabled` (default `true`) controls whether the port is bound |
| Entry points | `AdharGrpcServer`, `AdharGrpcClientFactory`, `@GrpcService`, `@GrpcClient` |
| Dependencies | Required (transitive): `grpc-netty-shaded`, `grpc-protobuf`, `grpc-stub`, `grpc-services`, `protobuf-java`, aligned by an imported `grpc-bom`. Optional: `micrometer-core` (metrics), `micrometer-observation` (spans) |
| Frameworks | Spring Boot auto-configures the server, registrar, client injection and lifecycle. Elsewhere, construct `AdharGrpcServer` and `AdharGrpcClientFactory` from a `GrpcProperties` yourself |

## How it works

On the server, `GrpcServiceRegistrar` hands every `@GrpcService` bean to `AdharGrpcServer`, and a `SmartLifecycle` in the last phase starts it, so the port opens after the rest of the context is ready. On the client, `GrpcClientBeanPostProcessor` injects channels from `AdharGrpcClientFactory`, which builds one channel per name and caches it.

```diagram
kit-grpc-server-client
```

Each of your services is wrapped in this interceptor chain, outermost first:

| Order | Interceptor | Present when |
| --- | --- | --- |
| 1 | `MetricsServerInterceptor` | A `MeterRegistry` bean and `observability.enable-metrics` |
| 2 | `ConcurrencyLimitServerInterceptor` | `concurrency.enabled` |
| 3 | `AuthServerInterceptor` | `auth.enabled` |
| 4 | `TracingServerInterceptor` | `observability.enable-tracing` |
| 5 | `LoggingInterceptor` | Always |
| 6 | `ExceptionHandlerInterceptor` | Always |

The health and reflection services are added without this chain. Client channels get `DeadlineClientInterceptor` always, plus tracing and metrics interceptors under the same switches.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-grpc</artifactId>
    <version>0.1.0</version>
</dependency>
```

Generate your stubs with the usual protobuf Maven plugin. Do not pin `io.grpc` versions yourself; mixed `grpc-core` and `grpc-netty-shaded` versions fail at runtime with `NoSuchFieldError`.

## Use it

### A service

```java
import com.adhar.kit.grpc.annotation.GrpcService;
import io.grpc.stub.StreamObserver;
import org.springframework.stereotype.Component;

@Component
@GrpcService
public class PaymentService extends PaymentServiceGrpc.PaymentServiceImplBase {
    @Override
    public void charge(ChargeRequest request, StreamObserver<ChargeResponse> response) {
        if (request.getAmountMinor() <= 0) throw new IllegalArgumentException("amount must be positive");
        response.onNext(ChargeResponse.newBuilder().setPaymentId("p-1").build());
        response.onCompleted();
    }
}
```

The class must extend the generated `…ImplBase`; a `@GrpcService` bean that is not a `BindableService` is skipped with a WARN. The annotation's `value`, `enableInterceptors` and `interceptors` attributes are not read.

`ExceptionHandlerInterceptor` maps an exception that escapes your handler on the call thread:

| Exception | Status |
| --- | --- |
| `IllegalArgumentException`, `NullPointerException` | `INVALID_ARGUMENT` |
| `IllegalStateException` | `FAILED_PRECONDITION` |
| `SecurityException` | `PERMISSION_DENIED` |
| `UnsupportedOperationException` | `UNIMPLEMENTED` |
| Simple class name containing `Timeout` / `NotFound` / `AlreadyExists` | `DEADLINE_EXCEEDED` / `NOT_FOUND` / `ALREADY_EXISTS` |
| Anything else | `INTERNAL`, description `Internal server error: <message>` |

An exception on a thread you started never reaches it; call `responseObserver.onError(...)` yourself.

### A client

```java
import com.adhar.kit.grpc.annotation.GrpcClient;
import io.grpc.ManagedChannel;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

@Component
public class PaymentsClient {
    @GrpcClient("payments")
    private ManagedChannel channel;

    public String charge(String orderId, long amountMinor) {
        var stub = PaymentServiceGrpc.newBlockingStub(channel).withDeadlineAfter(2, TimeUnit.SECONDS);
        return stub.charge(ChargeRequest.newBuilder()
                .setOrderId(orderId).setAmountMinor(amountMinor).build()).getPaymentId();
    }
}
```

- **Only `ManagedChannel` fields are injected.** A stub-typed field is logged at WARN and stays `null`; constructor parameters are not injected.
- Build the stub when you call, not in `@PostConstruct`: the post-processor runs after `@PostConstruct` handling, so the field is still `null` there.
- `@GrpcClient`'s `timeout`, `enableRetry` and `maxRetries` attributes are not read. Configure the channel instead.

```yaml
adhar:
  grpc:
    server:
      port: 9090
      enable-reflection: false
    client:
      channels:
        payments:
          target: payments-headless.payments.svc.cluster.local:9090
          default-timeout: 2000
          enable-tls: true
    security:
      enabled: true
      enable-tls: true
      enable-mtls: true
      client-auth: REQUIRE
      cert-chain: /etc/tls/tls.crt
      private-key: /etc/tls/tls.key
      trust-cert-collection: /etc/tls/ca.crt
```

- **`target` is plain `host:port`.** The factory splits on `:`, so `dns:///payments:9090` fails with `NumberFormatException`. A missing port means `9090`.
- A channel name with no configuration logs `No channel configuration found` and connects to `client.default-target` (`localhost:9090`). A typo connects to the wrong place instead of failing.
- For `round_robin` to spread load, point the target at a headless Service so DNS returns pod IPs.

### Deadlines and retry

`DeadlineClientInterceptor` applies `default-timeout` only when the caller set no deadline; `withDeadlineAfter` always wins, and `<= 0` disables the default. On the server, a passed deadline cancels the gRPC `Context` but does not interrupt your thread. In long handlers, check `io.grpc.Context.current().isCancelled()` between stages.

Retry is gRPC's built-in retry policy, set through the channel's service config: `max-retry-attempts` (raised to at least 2), exponential backoff, and `retryable-status-codes`. Retry is on by default, and `UNAVAILABLE` is retryable, so a non-idempotent write can apply twice. Set `enable-retry: false` on such a channel.

### Without Spring

```java
GrpcProperties props = new GrpcProperties();
props.getServer().setPort(9090);
AdharGrpcServer server = new AdharGrpcServer(props).addService(new PaymentService());
server.start();

ManagedChannel channel = new AdharGrpcClientFactory(props).getChannel("payments");
```

`GrpcFacade` (`adhar.getGrpc()`) is a placeholder: `call`, `callAsync` and `serverStream` log a warning and return `null`. Use generated stubs.

## Configuration

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `adhar.grpc.enabled` | boolean | `true` | Registers the module's beans |
| `adhar.grpc.enable-service-registrar` | boolean | `true` | Discover `@GrpcService` beans |
| `adhar.grpc.enable-client-injection` | boolean | `true` | Inject `@GrpcClient` fields |
| `adhar.grpc.server.enabled` | boolean | `true` | `false` keeps the beans but binds no port |
| `adhar.grpc.server.port` | int | `9090` | Listen port (all interfaces) |
| `adhar.grpc.server.max-inbound-message-size` | int | `4194304` | Max request bytes |
| `adhar.grpc.server.max-inbound-header-list-size` | int | `8192` | Max metadata bytes |
| `adhar.grpc.server.keep-alive-time` / `keep-alive-timeout` | int (s) | `300` / `20` | Server keep-alive |
| `adhar.grpc.server.permit-keep-alive-time` | int (s) | `300` | Minimum client keep-alive interval accepted |
| `adhar.grpc.server.permit-keep-alive-without-calls` | boolean | `false` | Allow client pings with no active call |
| `adhar.grpc.server.enable-reflection` | boolean | `true` | Expose the reflection service |
| `adhar.grpc.server.enable-health-check` | boolean | `true` | Expose the standard gRPC health service |
| `adhar.grpc.server.shutdown-grace-period` | int (s) | `30` | Drain time before `shutdownNow()` |
| `adhar.grpc.client.default-target` | string | `localhost:9090` | Target when a channel has none |
| `adhar.grpc.client.defaults.*` | | | Channel settings used for unconfigured names |
| `adhar.grpc.client.channels.<name>.target` | string | — | `host:port` |
| `...channels.<name>.default-timeout` | long (ms) | `60000` | Deadline when the caller sets none |
| `...channels.<name>.enable-retry` | boolean | `true` | Built-in retry |
| `...channels.<name>.max-retry-attempts` | int | `3` | Total attempts (minimum 2) |
| `...channels.<name>.initial-backoff-millis` / `max-backoff-millis` | long | `1000` / `10000` | Retry backoff |
| `...channels.<name>.backoff-multiplier` | double | `2.0` | Backoff growth |
| `...channels.<name>.retryable-status-codes` | list | `UNAVAILABLE, DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED, ABORTED` | Codes retried |
| `...channels.<name>.enable-load-balancing` / `load-balancing-policy` | boolean / string | `true` / `round_robin` | Default LB policy |
| `...channels.<name>.enable-tls` | boolean | `false` | TLS using `adhar.grpc.security.*` files |
| `...channels.<name>.max-inbound-message-size` | int | `4194304` | Max response bytes |
| `...channels.<name>.keep-alive-time` / `keep-alive-timeout` / `keep-alive-without-calls` | int / int / boolean | `300` / `20` / `false` | Client keep-alive |
| `...channels.<name>.user-agent` | string | `adhar-grpc-client/1.0.0` | User agent |
| `adhar.grpc.security.enabled` + `enable-tls` | boolean | `false` | Both must be `true` for server TLS |
| `adhar.grpc.security.enable-mtls` | boolean | `false` | Server requires `trust-cert-collection`; clients send `cert-chain`/`private-key` |
| `adhar.grpc.security.client-auth` | string | `NONE` | `NONE`, `OPTIONAL` or `REQUIRE` |
| `adhar.grpc.security.cert-chain` / `private-key` / `trust-cert-collection` | string | — | File or `classpath:` paths |
| `adhar.grpc.auth.enabled` | boolean | `false` | Add `AuthServerInterceptor` |
| `adhar.grpc.auth.shared-secret` | string | — | Use `StaticTokenAuthenticator` with this secret |
| `adhar.grpc.observability.enable-metrics` | boolean | `true` | Metrics interceptors |
| `adhar.grpc.observability.enable-tracing` | boolean | `true` | Tracing interceptors |
| `adhar.grpc.concurrency.enabled` | boolean | `false` | Shed calls over the limits |
| `adhar.grpc.concurrency.global-limit` | int | `200` | Concurrent calls across all services |
| `adhar.grpc.concurrency.service-limits` | map | empty | Per fully-qualified service name |

Bound but not read: `server.address` (the server binds all interfaces), `server.executor-thread-pool-size`, `observability.enable-logging`, `observability.log-level`, `observability.enable-health-check`. To quieten per-call logging, set the log level of `com.adhar.kit.grpc.interceptor.LoggingInterceptor`.

## Operations

- **Metrics** (needs `micrometer-core` and a `MeterRegistry` bean): counters `grpc.server.calls` and `grpc.client.calls`, timers `grpc.server.duration` and `grpc.client.duration`, all tagged `method` and `status` (the `Status.Code` name), and gauge `grpc.server.calls.inflight`.
- **Tracing:** `TracingServerInterceptor` reads the W3C `traceparent` header, puts the context on the gRPC `Context` (`TRACE_CONTEXT_KEY`) and copies `traceId`/`spanId` into MDC. Spans are recorded only when `micrometer-observation` and an `ObservationRegistry` bean are present (`MicrometerGrpcObserver`).
- **Health:** the standard gRPC health service via `getHealthStatusManager()`. The [Health](/adhar-kit/modules/health) module has a `GrpcHealthIndicator`.
- **Auth:** tokens come from the `authorization` header (a `Bearer` prefix is optional) or `x-api-key`. A failure closes the call with `UNAUTHENTICATED`; the principal is on `AuthServerInterceptor.PRINCIPAL_CONTEXT_KEY`.
- **Load shedding:** over the global or per-service limit, a call closes immediately with `RESOURCE_EXHAUSTED`. There is no queue.
- **Shutdown:** the server stops accepting calls, drains for `shutdown-grace-period`, then forces. Channels drain for a fixed 30 seconds each.

## Limits

- `auth.enabled: true` without `shared-secret` (and without your own `GrpcAuthenticator` bean) installs `PermitAllGrpcAuthenticator`, which accepts every call.
- `enable-mtls: true` does not by itself require client certificates: `client-auth` defaults to `NONE`. Set `client-auth: REQUIRE`.
- `GrpcFacade` is not implemented.
- `adhar-kit-test-commons` has no gRPC helper; test with `grpc-inprocess` and `grpc-testing`.
- The default port `9090` is fixed; give integration tests their own port or use the in-process transport.

## Next steps

- [Health](/adhar-kit/modules/health) — channel state in readiness
- [Metrics](/adhar-kit/modules/metrics) and [Tracing](/adhar-kit/modules/tracing) — where the interceptors report
- [Resilience](/adhar-kit/modules/resilience) — circuit breaking around remote calls
