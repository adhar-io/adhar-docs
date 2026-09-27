---
title: "Health"
section: "Modules"
order: 18
path: "/adhar-kit/modules/health"
---

# Health

`adhar-kit-health` provides automated, multi-framework health checks with auto-discovery, built-in indicators for common dependencies, health groups, TTL caching, a readiness gate for graceful shutdown, transition events, and Kubernetes liveness/readiness probes.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-health</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

- `AdharHealthIndicator` interface + `@HealthIndicator(name, timeout)`
- `HealthRegistry` — `checkHealth`, `checkGroup`, `register`, `addTransitionListener`, `isFlapping`
- `Health` builder — `up()`, `down()`, `down(e)`, `outOfService()`, `withDetail(...)`
- Built-in indicators: `Database`, `Redis`, `Kafka`, `Mongo`, `Elasticsearch`, `Grpc`, `DiskSpace`, `Memory`, certificate expiry

## A custom indicator

```java
@HealthIndicator(name = "payment-gateway")
@Component   // @ApplicationScoped (Quarkus) / @Singleton (Micronaut)
public class PaymentGatewayHealth implements AdharHealthIndicator {
    @Autowired private PaymentGatewayClient client;

    @Override
    public Health check() {
        try {
            return client.ping()
                ? Health.up().withDetail("latency", "45ms").build()
                : Health.down().withDetail("gateway", "unavailable").build();
        } catch (Exception e) {
            return Health.down(e).withDetail("error", e.getMessage()).build();
        }
    }

    @Override public String getName() { return "payment-gateway"; }
}
```

## Groups & aggregation

Indicators aggregate into `liveness`, `readiness`, `startup`, and `default` groups. Status aggregation is worst-of: `DOWN > OUT_OF_SERVICE > UNKNOWN > UP`. A **readiness gate** flips the service to not-ready and drains connections on shutdown for zero-downtime rollouts.

## Configuration

```yaml
adhar:
  health:
    enabled: true
    show-details: always
    database: { enabled: true, timeout: 5000 }
    redis:    { enabled: true, timeout: 3000 }
    memory:   { enabled: true, threshold: 0.90 }
    certificate:
      enabled: true
      keystore-path: /etc/tls/service.p12
      warning-days: 30
    readiness-gate:
      enabled: true
      shutdown-hook: true
    history:
      capacity: 100
      flapping-threshold: 5
```

The `liveness`/`readiness` groups map directly onto Kubernetes probes, so a pod is only marked ready when its real dependencies are.
