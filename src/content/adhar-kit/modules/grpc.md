---
title: "gRPC"
section: "Modules"
order: 21
path: "/adhar-kit/modules/grpc"
---

# gRPC

Raw `io.grpc` gives you a server builder and a channel builder and nothing else: no bean discovery, no deadlines, no metrics, no structured error mapping. `adhar-kit-grpc` **supplies the production scaffolding around gRPC so a service is a `@GrpcService` bean and a caller is a `@GrpcClient` field**, with TLS, retry, health, reflection, and observability configured declaratively instead of assembled by hand.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-grpc` |
| Built on | gRPC Java 1.82.0 (netty-shaded, protobuf, stub, services), Protobuf 4.35.1; optional Micrometer |
| Entry points | `AdharGrpcServer`, `AdharGrpcClientFactory`, `@GrpcService`, `@GrpcClient` |
| Config prefix | `adhar.grpc` |
| Use it when | Services talk to each other over gRPC and you want deadlines, mTLS, and traces without per-service wiring |

## How it works

Two halves, both driven by `GrpcProperties`. On the server side a Spring `SmartInitializingSingleton` finds your annotated beans and hands them to one `AdharGrpcServer`, which a `SmartLifecycle` then starts. On the client side channels are created once per **channel name** and cached, so `payments` resolves to the same `ManagedChannel` everywhere.

```text
 SERVER                                   CLIENT
 ┌──────────────────────────┐             ┌──────────────────────────┐
 │ @GrpcService beans       │             │ @GrpcClient("payments")  │
 │        │                 │             │        │                 │
 │ GrpcServiceRegistrar     │             │ GrpcClientBeanPostProc.  │
 │  (afterSingletons…)      │             │        │                 │
 │        ▼                 │             │        ▼                 │
 │ AdharGrpcServer          │             │ AdharGrpcClientFactory   │
 │  addService / start      │             │  getChannel(name) cached │
 └──────────┬───────────────┘             └──────────┬───────────────┘
            │                                        │
            └──────────── HTTP/2 :9090 ◀─────────────┘

 server interceptor chain, outermost first:
   Metrics → ConcurrencyLimit → Auth → Tracing → Logging → Exception
                                                            │
                                                     your service impl
```

Ordering is deliberate. `MetricsServerInterceptor` is outermost, so every call is recorded with its final status no matter where it was closed — an auth denial, an uncaught exception, or normal completion. Concurrency shedding sits inside metrics (a shed `RESOURCE_EXHAUSTED` call is still counted) but outside auth and tracing. Tracing runs before logging so log lines carry the trace and span ids. `ExceptionHandlerInterceptor` is innermost, closest to your service, where it can convert an escaping exception into a `StatusRuntimeException`.

**Retry is gRPC's own built-in retry policy**, configured through the channel's service config rather than a custom interceptor — so it respects the `retryable-status-codes` list and the server's own backoff hints.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-grpc</artifactId>
    <version>0.1.0</version>
</dependency>
```

The gRPC runtime (`grpc-netty-shaded`, `grpc-protobuf`, `grpc-stub`, `grpc-services`, `protobuf-java`) comes in transitively, aligned by an imported `grpc-bom` so all `io.grpc:*` artifacts stay on one version. Do not pin `io.grpc` versions yourself — mismatched `grpc-core` and `grpc-netty-shaded` produce a `NoSuchFieldError` at runtime.

## Key APIs

- **`AdharGrpcServer`** — `addService(BindableService)`, `start()`, `shutdown()`, `awaitTermination()`, `getPort()`, `isRunning()`, `getServiceCount()`, `getHealthStatusManager()` (the standard gRPC health service you flip per service), plus builder-style `withMeterRegistry`, `withAuthenticator`, `withGrpcObserver`, `withConcurrencyLimitInterceptor`.
- **`AdharGrpcClientFactory`** — `getChannel(name)` builds or returns the cached channel for that configured name; `shutdownChannel(name)`, `shutdown()`, `getChannelCount()`.
- **`@GrpcService(value, enableInterceptors, interceptors)`** — class-level; discovered by `GrpcServiceRegistrar` and registered before the server starts. The class must still extend the generated `…ImplBase`.
- **`@GrpcClient(value, timeout, enableRetry, maxRetries)`** — field- or parameter-level. `GrpcClientBeanPostProcessor` injects the named `ManagedChannel`. **Only fields typed `ManagedChannel` are injected**; any other type is logged and left alone, so a stub-typed field stays null.
- **Server interceptors** — `ExceptionHandlerInterceptor`, `LoggingInterceptor`, `MetricsServerInterceptor`, `TracingServerInterceptor`, `AuthServerInterceptor`, `ConcurrencyLimitServerInterceptor`.
- **Client interceptors** — `DeadlineClientInterceptor`, `MetricsClientInterceptor`, `TracingClientInterceptor`.
- **Auth SPI** — `GrpcAuthenticator` with `PermitAllGrpcAuthenticator` and `StaticTokenAuthenticator`; supply your own bean for real credentials.
- **`GrpcFacade`** — dynamic, stub-free calling: `call`, `callAsync`, `serverStream`, `isServiceAvailable`, `addMetadata`, `setDeadline`.

## Minimal: a service

```java
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {
    private final OrderService orderService;
    public OrderServiceImpl(OrderService s) { this.orderService = s; }

    @Override
    public void createOrder(CreateOrderRequest req, StreamObserver<CreateOrderResponse> obs) {
        Order order = orderService.create(req);
        obs.onNext(CreateOrderResponse.newBuilder().setOrder(order).build());
        obs.onCompleted();
    }
}
```

## Realistic: calling another service with deadlines and mTLS

```java
@Component
public class PaymentsClient {

    @GrpcClient("payments")
    private ManagedChannel channel;

    private PaymentServiceGrpc.PaymentServiceBlockingStub stub;

    @PostConstruct
    void init() {
        stub = PaymentServiceGrpc.newBlockingStub(channel);
    }

    public ChargeResponse charge(String orderId, long amountMinor) {
        return stub.withDeadlineAfter(2, TimeUnit.SECONDS)
                   .charge(ChargeRequest.newBuilder()
                       .setOrderId(orderId)
                       .setAmountMinor(amountMinor)
                       .build());
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
          target: dns:///payments.adhar.svc:9090
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
    concurrency:
      enabled: true
      global-limit: 200
```

`dns:///` plus `round_robin` is what makes client-side load balancing across pod IPs work; a plain `host:port` target resolves once and pins you to a single backend.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.grpc.enabled` | Master switch | `true` |
| `adhar.grpc.enable-service-registrar` | Auto-discover `@GrpcService` beans | `true` |
| `adhar.grpc.enable-client-injection` | Auto-inject `@GrpcClient` fields | `true` |
| `adhar.grpc.server.port` | Listen port | `9090` |
| `adhar.grpc.server.address` | Bind address | `0.0.0.0` |
| `adhar.grpc.server.max-inbound-message-size` | Max request bytes | `4194304` (4 MB) |
| `adhar.grpc.server.executor-thread-pool-size` | Handler threads | `100` |
| `adhar.grpc.server.enable-reflection` | Expose the reflection service | `true` |
| `adhar.grpc.server.enable-health-check` | Expose the gRPC health service | `true` |
| `adhar.grpc.server.shutdown-grace-period` | Drain seconds on shutdown | `30` |
| `adhar.grpc.client.default-target` | Target when a channel omits one | `localhost:9090` |
| `adhar.grpc.client.channels.<name>.target` | Channel target URI | — |
| `adhar.grpc.client.channels.<name>.enable-retry` | Built-in gRPC retry | `true` |
| `adhar.grpc.client.channels.<name>.max-retry-attempts` | Retry attempts | `3` |
| `adhar.grpc.client.channels.<name>.default-timeout` | Deadline in ms | `60000` |
| `adhar.grpc.client.channels.<name>.load-balancing-policy` | LB policy | `round_robin` |
| `adhar.grpc.client.channels.<name>.initial-backoff-millis` | First retry delay | `1000` |
| `adhar.grpc.client.channels.<name>.max-backoff-millis` | Backoff ceiling | `10000` |
| `adhar.grpc.security.enable-tls` | Server-side TLS | `false` |
| `adhar.grpc.security.enable-mtls` | Require client certificates | `false` |
| `adhar.grpc.security.client-auth` | Client-cert policy | `NONE` |
| `adhar.grpc.auth.enabled` | Enable `AuthServerInterceptor` | `false` |
| `adhar.grpc.observability.enable-metrics` | Metrics interceptors | `true` |
| `adhar.grpc.observability.enable-tracing` | Tracing interceptors | `true` |
| `adhar.grpc.observability.log-level` | Logging interceptor verbosity | `BASIC` |
| `adhar.grpc.concurrency.enabled` | In-flight call limiting | `false` |
| `adhar.grpc.concurrency.global-limit` | Max concurrent calls | `200` |

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `@GrpcService` bean never serves traffic | The class is annotated but does not extend the generated `…ImplBase`, so it is not a `BindableService` | Extend the generated base class |
| `@GrpcClient` field is null | The field is typed as a stub, not `ManagedChannel` | Inject `ManagedChannel` and build the stub yourself |
| `NoSuchFieldError` from `io.grpc` on startup | Mixed `io.grpc` versions from another dependency's management | Let the module's `grpc-bom` win; remove your own `io.grpc` pins |
| Calls hang for a minute | No deadline set, falling back to the 60 s channel default | Set `default-timeout` per channel and `withDeadlineAfter` per call |
| Traffic all hits one pod | Target is `host:port` rather than `dns:///host:port` | Use a `dns:///` target with `round_robin` |
| Retries fire on a non-idempotent write | Retry is on by default per channel | Set `enable-retry: false` for that channel, or narrow `retryable-status-codes` |
| Kubernetes probe cannot reach gRPC health | `enable-health-check` is off, or the probe points at the HTTP port | Turn it on and point the probe at `adhar.grpc.server.port` |
| Schema visible to anyone who can reach the port | Reflection is enabled by default | Set `enable-reflection: false` in production |

## See also

- [Health](/adhar-kit/modules/health) — `GrpcHealthIndicator` reports channel state into readiness.
- [Metrics](/adhar-kit/modules/metrics) and [Tracing](/adhar-kit/modules/tracing) — where the interceptors send their signals.
- [Resilience](/adhar-kit/modules/resilience) — circuit breaking around remote calls.
