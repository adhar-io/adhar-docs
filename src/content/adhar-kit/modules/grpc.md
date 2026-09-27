---
title: "gRPC"
section: "Modules"
order: 21
path: "/adhar-kit/modules/grpc"
---

# gRPC

`adhar-kit-grpc` adds enterprise gRPC support: a server and client-channel factory, built-in retry, TLS/mTLS, health & reflection, and interceptors for logging, exceptions, metrics, auth, and deadlines — across Spring Boot, Quarkus, and Micronaut.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-grpc</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
<dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-netty-shaded</artifactId>
    <version>1.60.0</version>
</dependency>
<dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-services</artifactId>
    <version>1.60.0</version>
</dependency>
```

## Key APIs

- `AdharGrpcServer` — `addService`, `start`, `shutdown`, `getHealthStatusManager`
- `AdharGrpcClientFactory` — `getChannel`, `shutdownChannel`
- Interceptors — `LoggingInterceptor`, `ExceptionHandlerInterceptor`, `DeadlineClientInterceptor`, `MetricsServerInterceptor`, `AuthServerInterceptor`
- Annotations — `@GrpcService`, `@GrpcClient`

## A service

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

## Configuration

```yaml
adhar:
  grpc:
    server:
      enabled: true
      port: 9090
      enable-reflection: true
      enable-health-check: true
    client:
      channels:
        payments:
          target: dns:///payments:9090
          enable-retry: true
          max-retry-attempts: 3
          enable-tls: true
    security:
      enable-tls: true
      enable-mtls: false
    observability:
      enable-metrics: true
      enable-tracing: true
```

Metrics, tracing, and logging interceptors are wired to the same [metrics](/adhar-kit/modules/metrics) and [tracing](/adhar-kit/modules/tracing) pipelines, so gRPC calls are observable end to end.
