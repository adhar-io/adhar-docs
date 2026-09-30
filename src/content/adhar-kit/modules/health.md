---
title: "Health"
section: "Modules"
order: 18
path: "/adhar-kit/modules/health"
---

# Health

A service that reports itself healthy while its database is unreachable will happily accept traffic it cannot serve. `adhar-kit-health` **makes "is this pod ready?" a question about real dependencies, not about whether the JVM is still running.** It gives you an indicator model, worst-of aggregation into Kubernetes-shaped groups, TTL caching so probes cannot hammer your database, and a readiness gate that drains connections before shutdown.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-health` |
| Built on | `adhar-kit-commons`; optional Spring Boot Actuator, Quarkus SmallRye Health, Micronaut Management |
| Entry points | `AdharHealthIndicator`, `HealthRegistry`, `Health`, `HealthFacade` |
| Config prefix | `adhar.health` |
| Use it when | You need probes that reflect dependency state, or custom checks aggregated into liveness/readiness |

## How it works

An **indicator** is one named check returning a `Health`. The **registry** owns every indicator, runs them with a per-check timeout, caches results for a TTL, aggregates them into **groups**, and records **transitions** so you can detect flapping.

```text
  @HealthIndicator beans          HealthRegistry                Groups
 ┌──────────────────────┐      ┌───────────────────┐      ┌──────────────┐
 │ DatabaseHealth...    │─────▶│ register(...)     │─────▶│ liveness     │
 │ RedisHealth...       │      │ TTL cache (10s)   │      │ readiness    │
 │ PaymentGatewayHealth │      │ per-check timeout │      │ startup      │
 │ ReadinessStateManager│      │ worst-of rollup   │      │ default      │
 └──────────────────────┘      │ transition history│      └──────┬───────┘
                               └───────────────────┘             │
                                                          k8s probes read
                                                       /health/live, /ready
```

Aggregation is **worst-of**, by severity: `DOWN (3) > OUT_OF_SERVICE (2) > UNKNOWN (1) > UP (0)`. One `DOWN` dependency takes the whole group down. The registry can also score weighted: `UP` counts 1.0, `UNKNOWN` and `OUT_OF_SERVICE` count 0.5, `DOWN` counts 0.0, compared against `weighted.up-threshold` / `weighted.down-threshold`.

The auto-configuration (`AdharHealthAutoConfiguration`) collects every `AdharHealthIndicator` bean in the context and registers it — into the `readiness` group for the readiness gate, into `default` for everything else. Built-in indicators are only wired when their client library is on the classpath: Redis needs `spring-data-redis`, Kafka needs `kafka-clients`, Mongo needs `mongodb-driver-sync`, Elasticsearch needs `elasticsearch-java`, gRPC needs `grpc-services`.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-health</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`AdharHealthIndicator`** — the SPI you implement: `Health check()` plus `String getName()`. Any bean implementing it is auto-registered.
- **`@HealthIndicator(name, enabled, priority, timeout)`** — marks the class and names it. `timeout` defaults to 5000 ms; the registry aborts a check that exceeds it rather than letting a hung dependency hang the probe.
- **`HealthRegistry`** — `register(indicator, critical, weight, groups...)`, `checkHealth()`, `checkGroup(group)`, `addTransitionListener(...)`, `isFlapping(name)`, `invalidateCache()`, `getHistory()`. Constants `LIVENESS_GROUP`, `READINESS_GROUP`, `STARTUP_GROUP`, `DEFAULT_GROUP`.
- **`Health`** — builder: `up()`, `down()`, `down(exception)`, `outOfService()`, `unknown()`, then `withDetail(k, v)` / `withDetails(map)` and `build()`.
- **`ReadinessStateManager`** — the readiness gate, itself an indicator named `readinessGate`. `markReady()`, `markNotReady(reason)`, `registerShutdownHook()`.
- **`HealthFacade`** — the framework-neutral entry point (`getHealth()`, `getLiveness()`, `getReadiness()`, `getDetailedHealth()`), also reachable as `adhar.getHealth()`.
- **Built-in indicators** — `DatabaseHealthIndicator`, `RedisHealthIndicator`, `KafkaHealthIndicator`, `MongoHealthIndicator`, `ElasticsearchHealthIndicator`, `GrpcHealthIndicator`, `DiskSpaceHealthIndicator`, `MemoryHealthIndicator`, `ThreadPoolHealthIndicator`, `CertificateExpiryHealthIndicator`, `CircuitBreakerHealthIndicator`.

## A minimal custom indicator

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

Being a bean is enough — no manual `register` call.

## A realistic one: tighter timeout, readiness group, flap alerting

```java
@Configuration
public class HealthWiring {

    @Bean
    public HealthRegistry adharHealthRegistry(PaymentGatewayHealth gateway,
                                              AlertClient alerts) {
        HealthRegistry registry = new HealthRegistry(5_000L, 200);

        // critical=true, weight=2.0, in both readiness and the default group
        registry.register(gateway, true, 2.0,
                HealthRegistry.READINESS_GROUP, HealthRegistry.DEFAULT_GROUP);

        registry.configureFlapping(3, 120_000L);
        registry.addTransitionListener(t -> {
            if (registry.isFlapping(t.indicator())) {
                alerts.page("Health flapping: " + t.indicator());
            }
        });
        return registry;
    }
}
```

Defining your own `HealthRegistry` bean replaces the auto-configured one (every bean there is `@ConditionalOnMissingBean`), so register the indicators you want yourself.

Transitions are also broadcast: `HealthTransitionApplicationEvent` on the Spring context, and a server-sent-event stream at `adhar.health.events.sse-path` (default `/health/events`) when `spring-webmvc` is present.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.health.enabled` | Master switch for the auto-configuration | `true` |
| `adhar.health.show-details` | Whether component details appear in responses | `always` |
| `adhar.health.endpoint` | Aggregate health path | `/health` |
| `adhar.health.liveness-endpoint` | Liveness path | `/health/live` |
| `adhar.health.readiness-endpoint` | Readiness path | `/health/ready` |
| `adhar.health.cache.ttl` | Result cache lifetime in ms | `10000` |
| `adhar.health.database.timeout` | Database check timeout (ms) | `5000` |
| `adhar.health.database.validation-query` | Probe query | `SELECT 1` |
| `adhar.health.redis.timeout` | Redis check timeout (ms) | `3000` |
| `adhar.health.memory.threshold` | Heap usage fraction that trips `DOWN` | `0.90` |
| `adhar.health.certificate.enabled` | Enable TLS expiry checking | `false` |
| `adhar.health.certificate.warning-days` | Days before expiry to warn | `30` |
| `adhar.health.certificate.keystore-type` | Keystore format | `PKCS12` |
| `adhar.health.readiness-gate.initially-ready` | Start ready before the context is up | `false` |
| `adhar.health.readiness-gate.shutdown-hook` | Flip to not-ready on shutdown | `true` |
| `adhar.health.history.capacity` | Transitions retained | `100` |
| `adhar.health.history.flapping-threshold` | Transitions in window that mean flapping | `5` |
| `adhar.health.history.flapping-window` | Flapping window (ms) | `60000` |
| `adhar.health.events.sse-enabled` | Expose the transition SSE stream | `true` |

```yaml
adhar:
  health:
    show-details: always
    memory:
      threshold: 0.85
    certificate:
      enabled: true
      keystore-path: /etc/tls/service.p12
      warning-days: 30
    readiness-gate:
      enabled: true
      shutdown-hook: true
```

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Pod restarts during a brief database blip | The database indicator landed in the liveness group | Keep dependency checks in `readiness`; liveness should only prove the process is alive |
| A custom indicator never appears | The class has `@HealthIndicator` but is not a bean | Add `@Component` / `@ApplicationScoped` / `@Singleton` — discovery is over beans |
| Probes hammer the database | Cache TTL too short for the probe period | Raise `adhar.health.cache.ttl` above the kubelet `periodSeconds` |
| Status stays stale after a fix | Results are served from the TTL cache | Call `registry.invalidateCache()`, or wait out the TTL |
| Built-in Redis/Kafka checks missing | The client library is not on the classpath | Detection is classpath-based; add the driver or write your own indicator |
| Your indicators vanish after adding a `HealthRegistry` bean | Yours replaced the auto-configured registry | Register indicators explicitly in your bean, as above |

## See also

- [Metrics](/adhar-kit/modules/metrics) and [Tracing](/adhar-kit/modules/tracing) — the rest of the observability stack.
- [Resilience](/adhar-kit/modules/resilience) — supplies the circuit-breaker state that `CircuitBreakerHealthIndicator` reports on.
- [Observability](/docs/operations/observability) — how the platform scrapes and alerts on these signals.
