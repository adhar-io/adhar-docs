---
title: "Health"
section: "Modules"
order: 18
path: "/adhar-kit/modules/health"
---

# Health

`adhar-kit-health` turns "is this pod ready?" into a question about real dependencies. You write indicators. A `HealthRegistry` runs them in parallel with a timeout, caches the results, rolls them up into groups such as `readiness` and `liveness`, and records status transitions so you can detect flapping. It also gives you a readiness gate that drops readiness before shutdown. Use it when your probes must reflect dependency state, not just a running JVM.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-health` (package `com.adhar.kit.health`) |
| Module toggle | `adhar.kit.modules.health`, default `true`. It gates `adhar.getHealth()` |
| Module switch | `adhar.health.enabled`, default `true`. It gates `AdharHealthAutoConfiguration` |
| Facade | `HealthFacade` (`adhar.getHealth()`). On Spring Boot, inject `HealthRegistry` or `HealthService` instead (see [Limits](#limits)) |
| Required dependencies | `adhar-kit-commons` |
| Optional dependencies | Spring Boot (Actuator, Web MVC for the SSE stream), Quarkus SmallRye Health, Micronaut Management, and the clients for the Redis, Kafka, MongoDB, Elasticsearch and gRPC indicators |
| Frameworks | Spring Boot is auto-configured. Quarkus and Micronaut have `QuarkusHealthIntegration` / `MicronautHealthIntegration` helpers you call from a producer. Helidon and Vert.x get adapters through `HealthFacade` |

## How it works

An *indicator* is one named check that returns a `Health`. The registry holds every indicator, each with a criticality, an optional weight and a set of groups. A group check runs only that group's indicators.

```diagram
nkb-health-groups
```

**Aggregation.** By default a group takes the worst status of its critical indicators: `DOWN` > `OUT_OF_SERVICE` > `UNKNOWN` > `UP`. An empty group is `UP`. A non-critical indicator still runs and appears in `components`. When it is not `UP`, its name goes into the `degraded` detail, but it never changes the group status.

**Weighted mode.** If any selected indicator has a weight above 0, the group computes a score: Σ(weight × value) / Σ(weight), where `UP` = 1.0, `UNKNOWN` and `OUT_OF_SERVICE` = 0.5 and `DOWN` = 0. A score at or above `up-threshold` is `UP`. A score at or below `down-threshold` is `DOWN`. Anything between is `OUT_OF_SERVICE`. Unweighted critical indicators are then folded in with worst-of. The score appears in the `weightedScore` detail.

> **Note:** With the defaults (`1.0` / `0.0`), one weighted indicator below `UP` makes the group `OUT_OF_SERVICE`, but the group is `DOWN` only when every weighted indicator is `DOWN`. Raise `down-threshold` to fail earlier.

### What the auto-configuration registers

| Indicator | Registered when | Group(s) | Critical |
|---|---|---|---|
| Your `AdharHealthIndicator` beans | Always | `default` | Yes |
| `ReadinessStateManager` (`readinessGate`) | `readiness-gate.enabled` (default `true`) | `readiness` | Yes |
| `MemoryHealthIndicator` (`memory`) | `memory.enabled` (default `true`) | `default`, `liveness` | No |
| `CertificateExpiryHealthIndicator` (`certificate`) | `certificate.enabled` and a `keystore-path` or `host` is set | `default` | Yes |
| `CircuitBreakerHealthIndicator` | A `CircuitBreakerStateProvider` bean exists. One is wired for you when a Resilience4j `CircuitBreakerRegistry` bean exists | `default` | Yes |
| `DatabaseHealthIndicator`, `RedisHealthIndicator`, `KafkaHealthIndicator`, `MongoHealthIndicator`, `ElasticsearchHealthIndicator`, `GrpcHealthIndicator`, `DiskSpaceHealthIndicator`, `ThreadPoolHealthIndicator` | Never. Construct and register them yourself | — | — |

So out of the box, `readiness` holds only the gate and `liveness` holds only the non-critical memory check. Both stay `UP` whatever your dependencies do, until you register indicators into them.

The module exposes **no `/health` endpoint and no Actuator contributor**. The one HTTP endpoint is the transition stream (Server-Sent Events) at `adhar.health.events.sse-path`. To make probes see a group, bridge it into Actuator, as shown below.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-health</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Use it

### Write an indicator

```java
import com.adhar.kit.health.indicator.AdharHealthIndicator;
import com.adhar.kit.health.model.Health;
import org.springframework.stereotype.Component;

@Component
public class PaymentGatewayHealth implements AdharHealthIndicator {

    private final PaymentGatewayClient client;

    public PaymentGatewayHealth(PaymentGatewayClient client) {
        this.client = client;
    }

    @Override
    public Health check() {
        // Use a client-side timeout: the registry stops waiting but does not cancel this call.
        return client.ping()
                ? Health.up().withDetail("endpoint", client.endpoint()).build()
                : Health.down().withDetail("gateway", "unavailable").build();
    }

    @Override
    public String getName() {
        return "payment-gateway";
    }
}
```

An exception thrown from `check()` becomes `Health.down(e)` for that indicator. The `Health` builders are `up()`, `down()`, `down(exception)`, `outOfService()` and `unknown()`, each followed by `withDetail` / `withDetails` and `build()`.

### Put checks in the right group and expose them

Being a bean puts an indicator in `default`, which no probe reads. Own the registry to control group membership, then bridge the groups into Actuator:

```java
import com.adhar.kit.health.config.AdharHealthProperties;
import com.adhar.kit.health.indicator.AdharHealthIndicator;
import com.adhar.kit.health.indicator.DatabaseHealthIndicator;
import com.adhar.kit.health.integration.SpringBootHealthIntegration;
import com.adhar.kit.health.lifecycle.ReadinessStateManager;
import com.adhar.kit.health.registry.HealthRegistry;
import javax.sql.DataSource;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.boot.health.contributor.Status;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HealthWiring {

    /** Replaces the auto-configured registry, which is @ConditionalOnMissingBean. */
    @Bean(destroyMethod = "shutdown")
    public HealthRegistry adharHealthRegistry(AdharHealthProperties properties,
                                              ObjectProvider<AdharHealthIndicator> indicators,
                                              DataSource dataSource,
                                              PaymentGatewayHealth gateway) {
        HealthRegistry registry = new HealthRegistry();
        indicators.forEach(i -> {
            if (i instanceof ReadinessStateManager) {
                registry.register(i, HealthRegistry.READINESS_GROUP);
            } else {
                registry.register(i);                  // default group
            }
        });
        // Readiness: what this pod needs to serve traffic. Critical, weighted.
        // Registering a name again replaces its earlier entry, groups included.
        registry.register(new DatabaseHealthIndicator(dataSource, properties.getDatabase()),
                true, 2.0, HealthRegistry.READINESS_GROUP);
        registry.register(gateway, true, 1.0, HealthRegistry.READINESS_GROUP);
        // Applies cache TTL, history, memory and certificate indicators, and adhar.health.weighted.*.
        return SpringBootHealthIntegration.configureRegistry(registry, properties);
    }

    @Bean
    public HealthIndicator adharReadiness(HealthRegistry registry) {
        return () -> toActuator(registry.checkGroup(HealthRegistry.READINESS_GROUP).getStatus());
    }

    @Bean
    public HealthIndicator adharLiveness(HealthRegistry registry) {
        return () -> toActuator(registry.checkGroup(HealthRegistry.LIVENESS_GROUP).getStatus());
    }

    private static Health toActuator(com.adhar.kit.health.model.Health.Status status) {
        return Health.status(new Status(status.name())).build();
    }
}
```

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true
      group:
        readiness:
          include: readinessState,adharReadiness
        liveness:
          include: livenessState,adharLiveness
```

> **Warning:** Keep dependency checks out of `liveness`. A failing liveness probe restarts the pod, so a shared database outage would restart the whole fleet at once. A pod that fails readiness leaves the Service endpoints but keeps running, and rejoins when the dependency recovers. This is why the memory indicator is non-critical in `liveness`.

### React to transitions

```java
registry.configureFlapping(3, 120_000L);
registry.addTransitionListener(t -> {
    if (registry.isFlapping(t.indicator())) {
        alerts.page("Health flapping: " + t.indicator() + " " + t.from() + " -> " + t.to());
    }
});
```

Transitions are also published as Spring application events (`HealthTransitionApplicationEvent`) and streamed as `health-transition` SSE events.

### Registry API

| Method | Purpose |
|---|---|
| `register(indicator[, critical[, weight]], groups...)` | Add an indicator. No groups means `default` |
| `unregister(name)`, `setWeight(name, w)`, `setWeightedThresholds(up, down)` | Change membership and scoring |
| `checkHealth([timeoutMillis])`, `checkGroup(group[, timeoutMillis])` | Run checks. The default timeout is 5000 ms |
| `setCacheTtlMillis`, `invalidateCache()` | Result cache control |
| `addTransitionListener`, `getHistory()`, `isFlapping(name)`, `configureFlapping(threshold, windowMillis)` | Transitions |
| `getIndicators()`, `getGroups(name)`, `isCritical(name)`, `shutdown()` | Introspection and lifecycle |

Group constants: `DEFAULT_GROUP`, `LIVENESS_GROUP`, `READINESS_GROUP`, `STARTUP_GROUP`. The readiness gate (`ReadinessStateManager`) has `markReady()`, `markNotReady(reason)`, `isReady()` and `getReason()`. When not ready it reports `OUT_OF_SERVICE` with the reason.

## Configuration

All keys are under `adhar.health`.

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Turns the auto-configuration on or off |
| `cache.enabled` | boolean | `true` | Cache group results |
| `cache.ttl` | long (ms) | `10000` | Cache lifetime. `0` disables |
| `memory.enabled` | boolean | `true` | Register the memory indicator |
| `memory.threshold` | double | `0.90` | Heap fraction at which it reports `DOWN` |
| `certificate.enabled` | boolean | `false` | Register the certificate-expiry indicator |
| `certificate.keystore-path` / `keystore-password` / `keystore-type` | String | — / — / `PKCS12` | Keystore source |
| `certificate.host` / `certificate.port` | String / int | — / `443` | TLS endpoint source |
| `certificate.warning-days` | int | `30` | Reports `DOWN` when the certificate expires within this many days |
| `readiness-gate.enabled` | boolean | `true` | Register the readiness gate |
| `readiness-gate.initially-ready` | boolean | `false` | Start ready. Otherwise the gate opens on `ContextRefreshedEvent` |
| `readiness-gate.shutdown-hook` | boolean | `true` | Flip to not-ready from a JVM shutdown hook |
| `history.capacity` | int | `100` | Transitions kept, shared by all indicators |
| `history.flapping-threshold` | int | `5` | Transitions within the window that count as flapping |
| `history.flapping-window` | long (ms) | `60000` | Flapping window |
| `weighted.up-threshold` / `weighted.down-threshold` | double | `1.0` / `0.0` | Weighted-mode thresholds |
| `weighted.weights.<name>` | Map | empty | Per-indicator weight. Any value above 0 turns on weighted mode for its groups |
| `circuit-breaker.enabled` | boolean | `true` | Register the circuit-breaker indicator |
| `circuit-breaker.treat-half-open-as-degraded` | boolean | `true` | Report `OUT_OF_SERVICE` for a half-open breaker. An open breaker is always `DOWN` |
| `events.enabled` | boolean | `true` | Publish transitions as Spring application events |
| `events.sse-enabled` | boolean | `true` | Expose the SSE stream (needs Spring Web MVC) |
| `events.sse-path` | String | `/health/events` | SSE path |
| `events.sse-timeout` | long (ms) | `0` | SSE emitter timeout. `0` uses the server default |
| `thread-pool.queue-usage-threshold` | double | `0.90` | Used by `ThreadPoolHealthIndicator` when you register it |
| `database.timeout` / `database.validation-query` | long / String | `5000` / `SELECT 1` | Used by `DatabaseHealthIndicator` when you register it |
| `redis.timeout`, `kafka.timeout`, `mongo.timeout`, `elasticsearch.timeout`, `grpc.timeout` | long (ms) | `3000`, `5000`, `3000`, `3000`, `3000` | Used by those indicators when you register them |

`endpoint`, `liveness-endpoint`, `readiness-endpoint`, `show-details`, `show-components`, `custom.*` and the per-client `*.enabled` flags are bound but not read.

## Operations

- **Concurrency.** Each check submits one task per selected indicator to an unbounded cached thread pool. Indicators run in parallel, so your `check()` must be thread-safe.
- **Timeouts.** When an indicator exceeds the timeout, the registry records `DOWN` with `Health check timeout`. The task is not cancelled and keeps its thread. Set a timeout inside each client.
- **Caching.** Each group's result is cached for `cache.ttl`. A cache hit runs no indicators and records no transitions. Any `register`, `unregister`, `setWeight` or threshold change clears the cache.
- **Listeners** run synchronously on the probing thread. A throwing listener is logged at WARN and ignored.
- **Shutdown.** The registry bean's `shutdown()` stops the executor with a 5 s grace period. The readiness gate goes not-ready on `ContextClosedEvent`, before the context closes.

## Limits

- **`HealthFacade` uses its own registry on Spring Boot, Quarkus and Micronaut.** It creates a `RegistryHealthService` over a new, empty `HealthRegistry`. Checks you add through `adhar.getHealth().registerReadinessCheck(...)` do not appear in the auto-configured registry, and your indicator beans do not appear in the facade. On Spring Boot, inject `HealthRegistry` or the `HealthService` bean (a `RegistryHealthService` over the shared registry).
- The facade's `registerHealthCheck` / `registerLivenessCheck` / `registerReadinessCheck` take a `Supplier<HealthService.HealthStatus>` (`UP`, `DOWN`, `UNKNOWN`).
- `@HealthIndicator(name, enabled, priority, timeout)` is a marker. None of its attributes are read: the name comes from `getName()`, and discovery is by bean type.
- History is one bounded queue for all indicators. A noisy indicator can push out another's transitions. Raise `history.capacity` if you have many.
- The certificate indicator is critical in `default` and reports `DOWN` inside the warning window, not only after expiry.

## Next steps

- [Metrics](/adhar-kit/modules/metrics) and [Tracing](/adhar-kit/modules/tracing): the rest of the observability stack.
- [Resilience](/adhar-kit/modules/resilience): the breakers `CircuitBreakerHealthIndicator` reports on.
- [Kubernetes](/adhar-kit/modules/kubernetes): its own readiness gate and graceful-shutdown drain.
- [Production](/docs/operations/production): probe configuration in practice.
