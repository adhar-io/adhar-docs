---
title: "FAQ"
section: "Get Started"
order: 6
path: "/adhar-kit/faq"
---

# FAQ

These are the questions people ask most often, grouped by when you are likely to ask them. **Evaluating Adhar Kit? Start with "Getting started". Something already broken? Jump to "Troubleshooting".**

## Getting started

### Is Adhar Kit tied to Spring Boot?

No. Spring Boot, Quarkus, Micronaut, Helidon and Vert.x are all fully supported. `AdharFacade` is a plain class with no DI annotations and no compile-time dependency on any framework. Each runtime ships a thin adapter that hands it to the container. See [Framework Support](/adhar-kit/frameworks).

One caveat: `adhar-kit-parent` inherits `spring-boot-starter-parent`. This is a build-time convenience, not a runtime coupling. On Quarkus or Micronaut, use their platform BOM as your parent, and add the kit through its BOM or starter.

### Do I have to use the whole toolkit?

No, and you can trim it in two separate ways.

At **build time**, import `adhar-kit-bom` and declare only the modules you want. Modules depend on `adhar-kit-commons` and generally not on each other, so `adhar-kit-metrics` alone is a working dependency.

At **runtime**, if you use the starter (which depends on everything), the toggles under `adhar.kit.modules.*` decide what is live. Sub-facades are built lazily, so a module you never enable is never instantiated.

### What Java and Maven versions do I need?

Java 25 or later, and Maven 3.9+. Both are hard requirements. The Maven Enforcer in `adhar-kit-parent` rejects Java below 25 and Maven below 3.8. The code also uses Java 25 language features throughout.

### Is there a Gradle setup?

The kit is built with Maven, and every reference example uses Maven. But the artifacts are ordinary Maven artifacts, so Gradle can use them normally. Add `platform("com.adhar.kit:adhar-kit-bom:0.1.0")`, then the modules you want. What you lose is `adhar-kit-parent`: you must set up the toolchain, test patterns and coverage gate yourself.

### How does it relate to the Adhar Platform?

Adhar Kit is the **application-side library**. The [Adhar Platform](/docs) is the **infrastructure**. They are built together, but neither requires the other. You can run the kit on a laptop or any Kubernetes cluster, and run the platform under services that have never heard of the kit.

Pairing them removes integration work. `adhar.isInKubernetes()`, `adhar.secret(...)` and the Dapr building blocks connect to real platform services, with no custom wiring.

## Frameworks and portability

### How does the kit know which framework it is on?

`FrameworkDetector` checks the classpath for marker classes in a fixed order: Spring Boot, Quarkus, Micronaut, Helidon, Vert.x. It caches the first match for the life of the process. Read it with `adhar.currentFramework()`, which returns `SPRING_BOOT`, `QUARKUS`, `MICRONAUT`, `HELIDON`, `VERTX` or `OTHER`. The first match wins, so a Spring Boot app that also embeds Vert.x reports `SPRING_BOOT`.

### Can I use the facade outside a DI container?

Yes. `AdharFacade.getInstance()` returns the process-wide singleton. If it does not exist yet, it is created with every module enabled. Every framework adapter delegates to that singleton. So static helpers, a `ServiceLoader` provider or a `main` method all reach the same object the container injected.

### How do I migrate a service between frameworks?

The kit calls do not change. That is the point of the adapter layer. What changes is the bootstrap, the build file, and framework-native code outside the kit (Spring Data repositories, Panache entities, Micronaut HTTP clients). For the mechanical part, the `adhar-kit-rewrite` module ships OpenRewrite recipes, including cross-framework migrations.

### Does it work with GraalVM native image?

Yes. All five supported frameworks target native image, and the kit is written to be compatible. Build the image with your framework's normal native build; nothing is kit-specific. On Spring Boot, that is the `native` profile inherited from `spring-boot-starter-parent`.

## Performance

### What does the facade cost at runtime?

Very little, by design. The shortcuts are thin wrappers. For example, `traced(name, op)` is a metrics timer wrapped around a span. So you pay for the underlying Micrometer and OpenTelemetry work, not for the facade.

Sub-facades are built once, lazily, behind a double-checked `volatile` field. After that, each access is a field read. The real cost is whatever you enabled. A disabled module is never constructed.

### What startup and throughput numbers does the project publish?

| Dimension | JVM | Native image |
|---|---|---|
| Startup (Spring Boot) | 2–3 s | under 100 ms |
| Startup (Quarkus) | 1–2 s | under 100 ms |
| Base memory | 256–512 MB | 50–100 MB |

Published throughput figures, at p50 under 5 ms and p99 under 50 ms:

- 50,000+ requests/second for REST with caching
- 100,000+ for gRPC
- 1,000,000+ messages/second for Kafka with batching

These are the project's own benchmarks on its own hardware. Measure your own workload instead of assuming them.

### Should I use annotations or facade calls?

Both end in the same module facade, so it is mostly a readability choice. There is one mechanical caveat. Annotations need an AOP proxy, so **self-invocation inside the same object bypasses them**. A private helper that calls an annotated method on `this` gets no circuit breaker.

Use annotations when the concern covers a whole method. Use facade calls when it covers part of a method, or needs a computed name or a condition.

## Production

### How do I turn modules on and off?

Set `adhar.kit.modules.<id>`. The defaults differ by module:

- **On**: logging, metrics, tracing, resilience, security, persistence, cache, messaging, config, health and docs.
- **Off**: ai, analytics, kubernetes, dapr, grpc, graphql, batch, notification, event-sourcing, perf-profiler and rewrite.

Unknown ids default to enabled. So a module added in a later release is opt-out, instead of silently switched off.

Gating is fixed for the life of the singleton. It is startup configuration, not a runtime feature flag. For runtime flags, use the analytics module.

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

Four layers resolve in order:

1. `adhar.kit.enabled` — the master switch; enabled when absent.
2. `adhar.kit.modules.<id>` — the gate.
3. `adhar.<module>.*` — module settings bound by `@ConfigurationProperties`.
4. The host framework's own source ordering.

Separately, `adhar-kit-config` merges several `ConfigSource` implementations (file, environment, ConfigMap, Vault, Consul, Dapr) by numeric priority. Higher wins, and the default is `100`. [Concepts](/adhar-kit/concepts) covers it in full.

### Can I swap module implementations?

Yes, at three levels:

- Mock `AdharFacade` outright.
- Override one sub-facade with its setter (`adhar.setMetrics(mock)`).
- Register an `AdharFacadeCustomizer`, as a Spring bean or as a `ServiceLoader` provider elsewhere.

The customizer is also the supported hook in production, for organization-specific wrappers around a stock facade. `AdharFacade.resetForTesting()` clears the singleton between tests. It is test-only, because it races with callers holding the old reference.

## Troubleshooting

### `IllegalStateException: Adhar Kit module 'X' is disabled`

The gate is off. The message names the exact property: set `adhar.kit.modules.X=true`. This is by far the most common report, because eleven modules are off by default.

### The startup banner never appears

Either `adhar.kit.enabled` is `false`, or `adhar-kit-starter` is not on the runtime classpath. Check for a `provided` or `test` scope. The banner is printed from `AdharKitAutoConfiguration`'s `@PostConstruct`, so no banner means that auto-configuration never activated.

### `/actuator/adhar` returns 404

The endpoint is registered only when Spring Boot Actuator is on the classpath. Actuator publishes only the endpoints named in `management.endpoints.web.exposure.include`. Add `spring-boot-starter-actuator` and include `adhar`.

### `adhar.traced(...)` or `adhar.safe(...)` fails on Spring Boot

On Spring Boot, the tracing and resilience facades need injected infrastructure. `SpringAdharFacadeConfiguration` wires them only when a Micrometer `Tracer` bean and a Resilience4j `CircuitBreakerRegistry` bean exist. Add those beans, or stick to shortcuts that do not need them (`adhar.count(...)`, `adhar.logInfo(...)`).

### Dependency resolution fails before compilation

This is almost always a Java 24 or earlier toolchain, which the Enforcer rejects. Switch the JDK instead of relaxing the rule. The bytecode target is Java 25 either way.

### `mvn verify` fails on coverage after my change

JaCoCo enforces 80% instruction coverage per module at `verify`. Add tests. In the meantime, `mvn verify -Djacoco.skip=true` (what CI uses for pull-request builds) lets you keep iterating. But the gate must pass before merge. See [Building & Contributing](/adhar-kit/build).

### Integration tests hang or fail to start

Integration tests use TestContainers and need a running Docker daemon. Surefire also applies a five-minute default JUnit timeout. So a hung test fails its module instead of stalling the whole reactor.

## See also

Issues and contributions go to [GitHub](https://github.com/adhar-io/adhar-kit).

- [Concepts](/adhar-kit/concepts) — the model behind most of the answers above.
- [Framework Support](/adhar-kit/frameworks) — per-framework wiring and the adapter table.
- [Modules Overview](/adhar-kit/modules/overview) — what each toggle actually enables.
- [Building & Contributing](/adhar-kit/build) — the fork, test, changelog, PR flow.
