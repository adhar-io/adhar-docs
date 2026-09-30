---
title: "FAQ"
section: "Get Started"
order: 6
path: "/adhar-kit/faq"
---

# FAQ

Questions that come up repeatedly, grouped by when you are likely to ask them. **Evaluating Adhar Kit? Start with "Getting started". Something already broken? Jump to "Troubleshooting".**

## Getting started

### Is Adhar Kit tied to Spring Boot?

No. Spring Boot, Quarkus, Micronaut, Helidon and Vert.x are all first-class. `AdharFacade` is a plain class with no DI annotations and no compile-time dependency on any framework; each runtime ships a thin adapter that hands it to the container. See [Framework Support](/adhar-kit/frameworks).

One caveat: `adhar-kit-parent` inherits `spring-boot-starter-parent` — a build-time convenience, not a runtime coupling. On Quarkus or Micronaut, use their platform BOM as your parent and take the kit through its BOM or starter.

### Do I have to use the whole toolkit?

No, in two independent ways. At **build time**, import `adhar-kit-bom` and declare only the modules you want — modules depend on `adhar-kit-commons` and generally not on each other, so `adhar-kit-metrics` alone is a working dependency. At **runtime**, if you take the starter (which depends on everything), the toggles under `adhar.kit.modules.*` decide what is live and sub-facades are built lazily; a module you never enable is never instantiated.

### What Java and Maven versions do I need?

Java 25 or later and Maven 3.9+. Both are hard requirements: the Maven Enforcer in `adhar-kit-parent` rejects Java below 25 and Maven below 3.8, and the code uses Java 25 language features throughout.

### Is there a Gradle setup?

The kit is built with Maven and every reference example is Maven. The artifacts are ordinary Maven artifacts, so Gradle consumes them normally — `platform("com.adhar.kit:adhar-kit-bom:0.1.0")`, then the modules you want. What you lose is `adhar-kit-parent`: toolchain, test patterns and the coverage gate become your problem.

### How does it relate to the Adhar Platform?

Adhar Kit is the **application-side library**; the [Adhar Platform](/docs) is the **infrastructure**. They are built together but neither requires the other — run the kit on a laptop or any Kubernetes cluster, and run the platform under services that have never heard of the kit. Pairing them removes integration work: `adhar.isInKubernetes()`, `adhar.secret(...)` and the Dapr building blocks resolve against real platform services rather than bespoke wiring.

## Frameworks and portability

### How does the kit know which framework it is on?

`FrameworkDetector` probes the classpath for marker classes in a fixed order — Spring Boot, Quarkus, Micronaut, Helidon, Vert.x — and caches the first match for the life of the process. Read it with `adhar.currentFramework()`: `SPRING_BOOT`, `QUARKUS`, `MICRONAUT`, `HELIDON`, `VERTX` or `OTHER`. First match wins, so a Spring Boot app that also embeds Vert.x reports `SPRING_BOOT`.

### Can I use the facade outside a DI container?

Yes. `AdharFacade.getInstance()` returns the process-wide singleton, creating it with every module enabled if it does not exist. Every framework adapter delegates to that singleton, so static helpers, a `ServiceLoader` provider or a `main` method reach the same object the container injected.

### How do I migrate a service between frameworks?

The kit calls do not change — that is the point of the adapter layer. What changes is the bootstrap, the build file, and framework-native code outside the kit (Spring Data repositories, Panache entities, Micronaut HTTP clients). The `adhar-kit-rewrite` module ships OpenRewrite recipes, including cross-framework migrations, for the mechanical part.

### Does it work with GraalVM native image?

Yes — all five supported frameworks target native image, and the kit is written to be compatible. You build the image with your framework's normal native build rather than anything kit-specific; on Spring Boot that is the `native` profile inherited from `spring-boot-starter-parent`.

## Performance

### What does the facade cost at runtime?

Structurally, very little. The shortcuts are thin compositions — `traced(name, op)` is a metrics timer wrapped around a span — so you pay for the underlying Micrometer and OpenTelemetry work, not for the facade. Sub-facades are built once, lazily, behind a double-checked `volatile` field, so steady-state access is a field read. The real cost is whatever you enabled; a disabled module is never constructed.

### What startup and throughput numbers does the project publish?

| Dimension | JVM | Native image |
|---|---|---|
| Startup (Spring Boot) | 2–3 s | under 100 ms |
| Startup (Quarkus) | 1–2 s | under 100 ms |
| Base memory | 256–512 MB | 50–100 MB |

Published throughput figures are 50,000+ requests/second for REST with caching, 100,000+ for gRPC, and 1,000,000+ messages/second for Kafka with batching, at p50 under 5 ms and p99 under 50 ms. These are the project's own benchmarks on its own hardware — measure your workload rather than assuming them.

### Should I use annotations or facade calls?

Both end in the same module facade, so it is a readability decision with one mechanical caveat: annotations need an AOP proxy, so **self-invocation inside the same object bypasses them** — a private helper calling an annotated method on `this` gets no circuit breaker. Use annotations when the concern covers a whole method; use facade calls for partial, computed or conditional application.

## Production

### How do I turn modules on and off?

Set `adhar.kit.modules.<id>`. The defaults are asymmetric: logging, metrics, tracing, resilience, security, persistence, cache, messaging, config, health and docs are **on**; ai, analytics, kubernetes, dapr, grpc, graphql, batch, notification, event-sourcing, perf-profiler and rewrite are **off**. Unknown ids default to enabled, so a module added in a later release is opt-out rather than silently dark.

Gating is fixed for the life of the singleton — startup configuration, not a runtime feature flag. For runtime flags, use the analytics module.

### How do I see which modules are actually live?

The kit logs a startup banner listing the detected runtime and every enabled and disabled module. At runtime, with Spring Boot Actuator present:

```properties
management.endpoints.web.exposure.include=health,adhar
```

```text
GET /actuator/adhar          # version, counts, every module's state
GET /actuator/adhar/{id}     # one module, e.g. /actuator/adhar/cache
```

The endpoint reads the same `AdharModuleAccess` instance that gates the facade, so the two cannot disagree.

### How does configuration precedence work?

Four layers resolve in order: `adhar.kit.enabled` (master switch, enabled when absent), `adhar.kit.modules.<id>` (the gate), `adhar.<module>.*` (module settings bound by `@ConfigurationProperties`), then the host framework's own source ordering. Separately, `adhar-kit-config` merges multiple `ConfigSource` implementations — file, environment, ConfigMap, Vault, Consul, Dapr — by numeric priority, higher wins, default `100`. [Concepts](/adhar-kit/concepts) covers it in full.

### Can I swap module implementations?

Yes, at three levels: mock `AdharFacade` outright, override one sub-facade with its setter (`adhar.setMetrics(mock)`), or register an `AdharFacadeCustomizer` — a Spring bean, or a `ServiceLoader` provider elsewhere. The customizer is the supported hook in production too, for organization-specific wrappers around a stock facade. `AdharFacade.resetForTesting()` clears the singleton between tests and is test-only: it races with callers holding the old reference.

## Troubleshooting

### `IllegalStateException: Adhar Kit module 'X' is disabled`

The gate is off. The message names the exact property — set `adhar.kit.modules.X=true`. This is by far the most common report, because eleven modules are off by default.

### The startup banner never appears

Either `adhar.kit.enabled` is `false`, or `adhar-kit-starter` is not on the runtime classpath (check for a `provided` or `test` scope). The banner is printed from `AdharKitAutoConfiguration`'s `@PostConstruct`, so no banner means that auto-configuration never activated.

### `/actuator/adhar` returns 404

The endpoint is registered only when Spring Boot Actuator is on the classpath, and Actuator publishes only endpoints named in `management.endpoints.web.exposure.include`. Add `spring-boot-starter-actuator` and include `adhar`.

### `adhar.traced(...)` or `adhar.safe(...)` fails on Spring Boot

On Spring Boot the tracing and resilience facades need injected infrastructure, so `SpringAdharFacadeConfiguration` wires them only when a Micrometer `Tracer` bean and a Resilience4j `CircuitBreakerRegistry` bean exist. Add those, or stay on shortcuts that do not need them (`adhar.count(...)`, `adhar.logInfo(...)`).

### Dependency resolution fails before compilation

Almost always a Java 24 or earlier toolchain — the Enforcer rejects it. Switch the JDK rather than relaxing the rule; the bytecode target is Java 25 regardless.

### `mvn verify` fails on coverage after my change

JaCoCo enforces 80% instruction coverage per module at `verify`. Add tests. `mvn verify -Djacoco.skip=true` (what CI uses for pull-request builds) lets you iterate meanwhile, but the gate must pass before merge. See [Building & Contributing](/adhar-kit/build).

### Integration tests hang or fail to start

Integration tests use TestContainers and need a running Docker daemon. Surefire also applies a five-minute default JUnit timeout, so a hung test fails its module rather than stalling the reactor.

## See also

Issues and contributions go to [GitHub](https://github.com/adhar-io/adhar-kit).

- [Concepts](/adhar-kit/concepts) — the model behind most of the answers above.
- [Framework Support](/adhar-kit/frameworks) — per-framework wiring and the adapter table.
- [Modules Overview](/adhar-kit/modules/overview) — what each toggle actually enables.
- [Building & Contributing](/adhar-kit/build) — the fork, test, changelog, PR flow.
