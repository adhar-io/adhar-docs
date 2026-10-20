---
title: "Health"
section: "Modules"
order: 18
path: "/adhar-kit/modules/health"
---

# Health

A service that reports itself healthy while its database is unreachable will accept traffic it cannot serve. `adhar-kit-health` **makes "is this pod ready?" a question about real dependencies, not about whether the JVM is still running.**

It gives you:

- an indicator model
- worst-of aggregation into Kubernetes-shaped groups
- TTL caching, so probes cannot hammer your database
- a readiness gate that drains connections before shutdown

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-health` |
| Built on | `adhar-kit-commons`; optional Spring Boot Actuator, Spring Web MVC, Quarkus SmallRye Health, Micronaut Management |
| Entry points | `AdharHealthIndicator`, `HealthRegistry`, `Health`, `HealthFacade` |
| Config prefix | `adhar.health` |
| Use it when | You need probes that reflect dependency state, or custom checks aggregated into liveness/readiness |

## How it works

An **indicator** is one named check that returns a `Health`. The **registry** owns every indicator. It runs them in parallel with a timeout, caches results for a TTL, and aggregates them into **groups**. It also records **transitions** (status changes), so you can detect flapping.

```diagram
kit-health-registry
```

### Aggregation: worst-of, then weighted

Classic aggregation is **worst-of by severity**, and the ranking is exact:

| Status | Severity | Meaning in a group |
| --- | --- | --- |
| `DOWN` | 3 | One is enough to take the whole group down |
| `OUT_OF_SERVICE` | 2 | Degraded; beats `UNKNOWN` and `UP` |
| `UNKNOWN` | 1 | A check that could not determine anything |
| `UP` | 0 | The baseline |

This has two consequences to remember:

- **An empty group aggregates to `UP`.** `worstOf` starts at `UP` and nothing raises it. So a probe group you forgot to fill reports healthy forever.
- An indicator registered as **non-critical** (`register(indicator, false, …)`) still runs and still appears in `components`. When it is not `UP`, its name is added to a `degraded` list in the response details. But it never changes the aggregated status.

Weighted scoring is an alternative path, and **it is switched on by data, not by a flag**. If any indicator selected for this check carries a `weight > 0`, the whole group switches to weighted mode.

The score is `Σ(weight × value) / Σ(weight)`, where `UP` is `1.0`, `UNKNOWN` and `OUT_OF_SERVICE` are `0.5`, and `DOWN` is `0.0`. The score maps to a status by threshold:

- At or above `up-threshold`: `UP`.
- At or below `down-threshold`: `DOWN`.
- Anything strictly between: the degraded band, `OUT_OF_SERVICE`.

Any unweighted *critical* indicators are then folded back in with worst-of, so a hard failure still wins.

> **The default thresholds make weighted mode strict at the top and lenient at the bottom.** `up-threshold` defaults to `1.0` and `down-threshold` to `0.0`. So a single weighted indicator going `OUT_OF_SERVICE` drops the score below 1, and the group reports `OUT_OF_SERVICE`. But the group only reports `DOWN` when the score reaches exactly `0.0`, which means *every* weighted indicator is `DOWN`. If you want a weighted group to fail before total collapse, raise `down-threshold`.

### What is actually registered, and into which group

Most readers get this part wrong, and it decides what your probes mean. `AdharHealthAutoConfiguration` builds the registry from `ObjectProvider<AdharHealthIndicator>`. It then calls `SpringBootHealthIntegration.configureRegistry`. The result:

| Indicator | Registered automatically? | Group(s) | Critical |
| --- | --- | --- | --- |
| Your `AdharHealthIndicator` beans | Yes, by bean discovery | `default` | Yes |
| `ReadinessStateManager` (named `readinessGate`) | Yes, when `readiness-gate.enabled` | `readiness` | Yes |
| `MemoryHealthIndicator` | Yes, when `memory.enabled` | `default`, `liveness` | **No** |
| `CertificateExpiryHealthIndicator` | Only when `certificate.enabled` **and** a `keystore-path` or `host` is set | `default` | Yes |
| `CircuitBreakerHealthIndicator` | Only when a `CircuitBreakerStateProvider` bean exists | `default` | Yes |
| `DatabaseHealthIndicator`, `RedisHealthIndicator`, `KafkaHealthIndicator`, `MongoHealthIndicator`, `ElasticsearchHealthIndicator`, `GrpcHealthIndicator` | **No** | — | — |

The last row matters most. Those classes exist and work, but the Spring auto-configuration never constructs them. If you call `SpringBootHealthIntegration.createHealthRegistryWithAutoConfig(...)` yourself and hand it the clients, it wires Redis, Kafka, Mongo, Elasticsearch and gRPC. `DatabaseHealthIndicator` is always manual. If you add this module and expect your database to show up in health, nothing happens until you register an indicator.

Likewise, out of the box the **`readiness` group contains only the readiness gate**. The **`liveness` group contains only the non-critical memory indicator**. So both report `UP` regardless of your dependencies, until you register indicators into them.

### There is no HTTP health endpoint

The module registers no controller for `/health`, `/health/live` or `/health/ready`, and no Spring Boot Actuator `HealthContributor`. Actuator is an *optional* dependency, and no main-source class references it. So `adhar.health.endpoint`, `adhar.health.liveness-endpoint`, `adhar.health.readiness-endpoint` and `adhar.health.show-details` are declared but **never read**.

The only HTTP endpoint the module provides is the transition SSE stream at `adhar.health.events.sse-path` (default `/health/events`). It exists only when Spring Web MVC is present.

Reach health through `HealthFacade` / `HealthService` / `HealthRegistry`. If you want probes to see it, bridge it into Actuator yourself. The worked example below does exactly that.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-health</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`AdharHealthIndicator`** — the SPI you implement: `Health check()` plus `String getName()`. Any bean implementing it is auto-registered into `default`.
- **`@HealthIndicator(name, enabled, priority, timeout)`** — a documentation marker. **None of its attributes are read by the module.** Names come from `getName()`, discovery is by bean type, and the timeout comes from the registry call. It is harmless, but do not rely on it to configure anything.
- **`HealthRegistry`** — `register(indicator[, critical[, weight]], groups…)`, `setWeight`, `setWeightedThresholds(up, down)`, `unregister`, `checkHealth([timeoutMillis])`, `checkGroup(group[, timeoutMillis])`, `addTransitionListener`, `isFlapping(name)`, `configureFlapping(threshold, windowMillis)`, `setCacheTtlMillis`, `invalidateCache()`, `getHistory()`, `getGroups(name)`, `isCritical(name)`, `shutdown()`. Constants `LIVENESS_GROUP`, `READINESS_GROUP`, `STARTUP_GROUP`, `DEFAULT_GROUP`, and the detail keys `DEGRADED_DETAIL` (`degraded`) and `WEIGHTED_SCORE_DETAIL` (`weightedScore`).
- **`Health`** — builder: `up()`, `down()`, `down(exception)`, `outOfService()`, `unknown()`, then `withDetail(k, v)` / `withDetails(map)` and `build()`.
- **`ReadinessStateManager`** — the readiness gate, itself an indicator named `readinessGate`. `markReady()`, `markNotReady(reason)`, `isReady()`, `getReason()`, `registerShutdownHook()`, `onShutdown()`.
- **`RegistryHealthService` / `HealthFacade`** — `getHealth()`, `getLiveness()` (= `checkGroup("liveness")`), `getReadiness()` (= `checkGroup("readiness")`), `getDetailedHealth()`, plus `registerLivenessCheck(name, supplier)` and `registerReadinessCheck(name, supplier)` for lambda-style registration straight into a probe group.
- **Indicator classes available for manual wiring** — `DatabaseHealthIndicator`, `RedisHealthIndicator`, `KafkaHealthIndicator`, `MongoHealthIndicator`, `ElasticsearchHealthIndicator`, `GrpcHealthIndicator`, `DiskSpaceHealthIndicator`, `MemoryHealthIndicator`, `ThreadPoolHealthIndicator`, `CertificateExpiryHealthIndicator`, `CircuitBreakerHealthIndicator`.

## A minimal custom indicator

```java
@Component
public class PaymentGatewayHealth implements AdharHealthIndicator {

    private final PaymentGatewayClient client;

    public PaymentGatewayHealth(PaymentGatewayClient client) { this.client = client; }

    @Override
    public Health check() {
        try {
            return client.ping()
                ? Health.up().withDetail("endpoint", client.endpoint()).build()
                : Health.down().withDetail("gateway", "unavailable").build();
        } catch (Exception e) {
            return Health.down(e).withDetail("error", e.getMessage()).build();
        }
    }

    @Override public String getName() { return "payment-gateway"; }
}
```

Being a bean is enough to register it. But it lands in the `default` group, which no probe reads. Put it where it belongs.

## Worked example: probe groups wired end to end

Getting liveness and readiness the wrong way round is the most damaging mistake you can make with this module. Wire them deliberately.

```java
package com.example.health;

import com.adhar.kit.health.config.AdharHealthProperties;
import com.adhar.kit.health.indicator.AdharHealthIndicator;
import com.adhar.kit.health.integration.SpringBootHealthIntegration;
import com.adhar.kit.health.model.Health;
import com.adhar.kit.health.registry.HealthRegistry;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.actuate.health.Status;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HealthWiring {

    /**
     * Replaces the auto-configured registry (every bean there is
     * @ConditionalOnMissingBean), so we own group membership explicitly.
     */
    @Bean(destroyMethod = "shutdown")
    public HealthRegistry adharHealthRegistry(AdharHealthProperties properties,
                                              ObjectProvider<AdharHealthIndicator> indicators,
                                              PaymentGatewayHealth gateway,
                                              DatabaseProbe database,
                                              AlertClient alerts) {
        HealthRegistry registry = new HealthRegistry();
        indicators.forEach(registry::register);          // everything into `default`

        // Readiness: things that make this pod unable to SERVE. Critical, weighted.
        registry.register(database, true, 2.0, HealthRegistry.READINESS_GROUP);
        registry.register(gateway, true, 1.0, HealthRegistry.READINESS_GROUP);

        // Fail readiness once the weighted score drops below two thirds.
        registry.setWeightedThresholds(1.0, 0.66);

        registry.configureFlapping(3, 120_000L);
        registry.addTransitionListener(t -> {
            if (registry.isFlapping(t.indicator())) {
                alerts.page("Health flapping: " + t.indicator());
            }
        });

        // Applies cache TTL, history capacity, memory + certificate indicators,
        // and the adhar.health.weighted.* config on top.
        return SpringBootHealthIntegration.configureRegistry(registry, properties);
    }

    /** Bridge into Actuator so Kubernetes probes can actually see the groups. */
    @Bean("adharReadiness")
    public HealthIndicator adharReadiness(HealthRegistry registry) {
        return () -> toActuator(registry.checkGroup(HealthRegistry.READINESS_GROUP).getStatus());
    }

    @Bean("adharLiveness")
    public HealthIndicator adharLiveness(HealthRegistry registry) {
        return () -> toActuator(registry.checkGroup(HealthRegistry.LIVENESS_GROUP).getStatus());
    }

    private static org.springframework.boot.actuate.health.Health toActuator(Health.Status status) {
        Status mapped = switch (status) {
            case UP -> Status.UP;
            case DOWN -> Status.DOWN;
            case OUT_OF_SERVICE -> Status.OUT_OF_SERVICE;
            case UNKNOWN -> Status.UNKNOWN;
        };
        return org.springframework.boot.actuate.health.Health.status(mapped).build();
    }
}
```

```yaml
management:
  endpoint:
    health:
      group:
        readiness:
          include: readinessState,adharReadiness
        liveness:
          include: livenessState,adharLiveness
```

> **Liveness must not depend on anything external.** A failing liveness probe restarts the pod. Suppose a shared database goes down and every pod's liveness is wired to it. Kubernetes restarts the entire fleet at once. Each restart takes longer than the last, because the database is now also serving a reconnect storm. You get a cluster-wide restart loop that outlives the original outage.
>
> Liveness answers "is this JVM wedged?" and nothing more. Dependency checks belong in **readiness**. A not-ready pod is removed from Service endpoints but keeps running, so it rejoins the moment the dependency recovers.

This is why the module registers the `MemoryHealthIndicator` in `liveness` as **non-critical**. High heap usage is reported as degraded, but it will not restart your pod.

## How it behaves

- **Thread-safety.** `HealthRegistry` is a singleton built for concurrent probes. Registrations, cache and last-known statuses are `ConcurrentHashMap`s. Listeners are a `CopyOnWriteArrayList`. The thresholds and TTL are `volatile`. `HealthHistory` is `synchronized` throughout. Your `check()` implementations must be thread-safe, because several probes can run them at once.
- **Concurrency.** Each check call submits **one task per selected indicator** to an `Executors.newCachedThreadPool()`. It then waits on each `Future` with the call's timeout. Indicators run in parallel, so one slow dependency does not queue behind another. The order of results has no meaning.
- **Timeouts are a wait, not a cancellation.** `checkHealth()` and `checkGroup(group)` default to 5000 ms (the overload takes an explicit value). On expiry, the registry records `DOWN` with `Health check timeout` for that indicator. But it never calls `future.cancel`, so **the task keeps running**. An indicator blocked on a dead socket with no socket timeout leaks one thread per probe into an unbounded cached pool. Always set a client-side timeout inside `check()`. Do not rely on the registry's.
- **Caching.** Results are cached per group key (plus one key for the all-indicator check) for `cache.ttl` milliseconds, default 10000. Any `register`, `unregister`, `setWeight`, `setWeightedThresholds` or `setCacheTtlMillis` call clears the whole cache. A cached response is returned verbatim. So during a cache hit, **no indicators run and no transitions are recorded**. Set the TTL below your flap-detection expectations, not just below the kubelet period.
- **Transitions and listeners.** After each uncached run, the registry compares each result to the last-seen status. On a change, it records a `HealthTransition` and notifies listeners. **Listeners run synchronously on the thread doing the check**, so a slow listener slows your probe. A throwing listener is caught and logged at WARN, and does not break the check.
- **Flap detection.** `HealthHistory` is a single bounded deque shared by *all* indicators, with a default capacity of 100. `isFlapping(name)` counts that indicator's transitions within the window (defaults: 5 transitions in 60 s). One noisy indicator can push out another's history and hide its flapping. If you have many indicators, raise `history.capacity`.
- **Lifecycle and shutdown.** The registry bean declares `destroyMethod = "shutdown"`, which shuts the executor down with a 5-second grace period. `ReadinessStateManager` starts **not ready** unless `readiness-gate.initially-ready` is true. With `shutdown-hook` (default true), it registers a JVM hook that flips it to not-ready. `SpringReadinessLifecycle` bridges Spring context events to the same gate, so readiness drops before the context closes.
- **Failure behaviour.** An exception thrown by `check()` is caught per indicator and converted to `Health.down(e)`. One broken indicator never fails the whole probe with a stack trace.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.health.enabled` | Master switch for the auto-configuration | `true` |
| `adhar.health.cache.enabled` | Enable result caching | `true` |
| `adhar.health.cache.ttl` | Result cache lifetime in ms (`0` disables) | `10000` |
| `adhar.health.memory.enabled` | Register the memory indicator (non-critical) | `true` |
| `adhar.health.memory.threshold` | Heap usage fraction that trips `DOWN` | `0.90` |
| `adhar.health.thread-pool.queue-usage-threshold` | Queue fullness that trips the thread-pool indicator | `0.90` |
| `adhar.health.certificate.enabled` | Enable TLS expiry checking | `false` |
| `adhar.health.certificate.keystore-path` / `.host` | Certificate source; one is required for registration | — |
| `adhar.health.certificate.warning-days` | Days before expiry to warn | `30` |
| `adhar.health.certificate.keystore-type` | Keystore format | `PKCS12` |
| `adhar.health.readiness-gate.enabled` | Register the readiness gate | `true` |
| `adhar.health.readiness-gate.initially-ready` | Start ready before the context is up | `false` |
| `adhar.health.readiness-gate.shutdown-hook` | Flip to not-ready on shutdown | `true` |
| `adhar.health.history.capacity` | Transitions retained, shared across indicators | `100` |
| `adhar.health.history.flapping-threshold` | Transitions in window that mean flapping | `5` |
| `adhar.health.history.flapping-window` | Flapping window (ms) | `60000` |
| `adhar.health.weighted.up-threshold` | Score at or above which a weighted group is `UP` | `1.0` |
| `adhar.health.weighted.down-threshold` | Score at or below which a weighted group is `DOWN` | `0.0` |
| `adhar.health.weighted.weights.<name>` | Per-indicator weight; any value > 0 enables weighted mode | empty |
| `adhar.health.circuit-breaker.enabled` | Register the circuit-breaker indicator when a provider bean exists | `true` |
| `adhar.health.events.enabled` | Publish transitions as Spring application events | `true` |
| `adhar.health.events.sse-enabled` | Expose the transition SSE stream | `true` |
| `adhar.health.events.sse-path` | SSE path | `/health/events` |
| `adhar.health.database.timeout` / `.validation-query` | Used by `DatabaseHealthIndicator` when you register it | `5000` / `SELECT 1` |
| `adhar.health.redis.timeout`, `.kafka.timeout`, `.mongo.timeout`, `.elasticsearch.timeout`, `.grpc.timeout` | Used by those indicators when you register them | `3000` / `5000` / `3000` / `3000` / `3000` |

```yaml
adhar:
  health:
    cache:
      ttl: 15000              # above the kubelet periodSeconds
    memory:
      threshold: 0.85
    certificate:
      enabled: true
      keystore-path: /etc/tls/service.p12
      warning-days: 30
    history:
      capacity: 500
      flapping-threshold: 3
      flapping-window: 120000
    weighted:
      up-threshold: 1.0
      down-threshold: 0.5
      weights:
        database: 2.0
        payment-gateway: 1.0
```

## Testing

`adhar-kit-test-commons` has no health-specific helper. But its Testcontainers bases (`PostgresTestContainer`, `RedisTestContainer`, `ToxiproxyTestContainer`) are the right tool to prove an indicator actually goes `DOWN`.

1. **An indicator in isolation** — it is a plain object. Construct it with a stubbed client and call `check()`. Assert the `Health.Status` and the details. You need no registry and no Spring.
2. **Aggregation** — create a `new HealthRegistry()` (caching is off by default in that constructor). Register stubs that return fixed statuses. Assert that `checkGroup(...)` gives the status you expect. This is how you prove that a non-critical indicator lands in `degraded` without changing the status, and that an empty group is `UP`.
3. **Timeout handling** — register an indicator whose `check()` sleeps. Call `checkGroup(group, 50)` and assert `DOWN`. Remember that the sleeping thread survives the assertion.
4. **Flapping** — call `configureFlapping(2, 60_000)`. Drive a stub indicator up and down across several `checkHealth()` calls with caching disabled, then assert `isFlapping(name)`. With the default 10 s cache TTL, the repeated checks return cached results and no transitions are recorded. So disable the cache (`setCacheTtlMillis(0)`) in the test.
5. **Injecting failure for real** — route the dependency through Toxiproxy and cut the connection. This is the only way to confirm that the indicator's own client timeout is short enough.
6. **Disabling** — `adhar.health.enabled: false` turns off the whole auto-configuration. To keep the module but silence the gate, set `adhar.health.readiness-gate.enabled: false`.

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Pod restarts during a brief database blip | A dependency check landed in the liveness group | Keep dependency checks in `readiness`; liveness should only prove the process is alive |
| Readiness is always `UP` | By default the `readiness` group holds only the readiness gate | Register your indicators with `HealthRegistry.READINESS_GROUP` |
| Database or Redis never appears in health | Those indicators are not auto-registered by the Spring auto-configuration | Register them yourself, or call `createHealthRegistryWithAutoConfig` with the clients |
| `/health` returns 404 | The module exposes no HTTP endpoint and no Actuator contributor | Bridge `HealthRegistry` into an Actuator `HealthIndicator`, as above |
| A custom indicator never appears | The class implements the SPI but is not a bean | Add `@Component` / `@ApplicationScoped` / `@Singleton`. Discovery only finds beans |
| Status stays stale after a fix | Results are served from the TTL cache | Call `registry.invalidateCache()`, or wait out the TTL |
| Probes hammer the database | Cache TTL too short for the probe period | Raise `adhar.health.cache.ttl` above the kubelet `periodSeconds` |
| Flapping never detected | Cached checks record no transitions | Lower the cache TTL, or raise the flapping window |
| Thread count climbs during an outage | A timed-out check is not cancelled, and the pool is unbounded | Set a client timeout inside `check()` itself |
| A weighted group never reports `DOWN` | `down-threshold` defaults to `0.0`, requiring every weighted indicator to be `DOWN` | Raise `adhar.health.weighted.down-threshold` |
| `@HealthIndicator(timeout = …)` has no effect | The annotation's attributes are never read | Pass a timeout to `checkGroup(group, timeoutMillis)`, or enforce it in the client |
| Your indicators vanish after adding a `HealthRegistry` bean | Yours replaced the auto-configured registry | Register indicators explicitly in your bean, and call `configureRegistry` to keep the property-driven setup |

## See also

- [Metrics](/adhar-kit/modules/metrics) and [Tracing](/adhar-kit/modules/tracing) — the rest of the observability stack.
- [Resilience](/adhar-kit/modules/resilience) — supplies the circuit-breaker state that `CircuitBreakerHealthIndicator` reports on.
- [Kubernetes](/adhar-kit/modules/kubernetes) — its own readiness gate and graceful-shutdown drain.
- [Production](/docs/operations/production) — rollout, probe configuration and drain behaviour in practice.
