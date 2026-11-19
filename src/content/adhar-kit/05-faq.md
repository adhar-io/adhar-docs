---
title: "FAQ"
section: "Get Started"
order: 6
path: "/adhar-kit/faq"
---

# FAQ

Short answers to the questions people ask most, grouped by when you are likely to ask them. Each answer links to the page with the detail. If something is already broken, start at [Troubleshooting](#troubleshooting).

## Getting started

### Is Adhar Kit tied to Spring Boot?

`AdharFacade` itself is a plain class, and the starter has adapters for Quarkus, Micronaut, Helidon and Vert.x. In practice Spring Boot is the complete runtime today: the module auto-configurations, the `adhar.kit.modules.*` gates and the tracing and resilience wiring are Spring Boot only, and the starter brings Spring Boot onto any classpath. See [Framework Support](/adhar-kit/frameworks) for what works elsewhere.

### Do I have to use the whole toolkit?

No. You can trim in two ways:

- **Build time** — import `adhar-kit-bom` and declare only the modules you want. Most modules depend only on `adhar-kit-commons`, so `adhar-kit-metrics` alone is a working dependency. See [Picking only what you need](/adhar-kit/modules/overview#picking-only-what-you-need).
- **Runtime** — with the starter, `adhar.kit.modules.<id>` decides which `AdharFacade` accessors work, and `adhar.<module>.enabled` switches a module's own auto-configuration off.

### What Java and Maven versions do I need?

Java 25 or later: the artifacts are Java 25 bytecode. Maven 3.8 or later, which `adhar-kit-parent` enforces along with Java 25.

### Which artifact do I start from?

| Artifact | Gives you |
|---|---|
| `adhar-kit-starter` | `AdharFacade`, 23 modules, the framework adapters |
| `adhar-kit-bom` | Versions for every kit module and the third-party stack, including the Spring Boot and Spring Cloud BOMs |
| `adhar-kit-parent` | Spring Boot parent, Java 25, the Enforcer and the 80% coverage gate — for your service too |

The [Quick Start](/adhar-kit/quickstart#choose-how-to-depend-on-the-kit) compares them.

### Is there a Gradle setup?

The kit builds with Maven and documents Maven only. The artifacts are ordinary Maven artifacts, so Gradle can consume them: add `platform("com.adhar.kit:adhar-kit-bom:0.1.0")`, then the modules. You lose `adhar-kit-parent`, so set the Java 25 toolchain and any coverage rules yourself.

### How does it relate to the Adhar Platform?

The kit is the application-side library; the [Adhar Platform](/docs) is the infrastructure. Neither requires the other. The platform's Spring Boot templates inherit `adhar-kit-parent` and depend on `adhar-kit-starter`, so a scaffolded service starts with the kit.

## Frameworks and portability

### How does the kit know which framework it is on?

`FrameworkDetector` checks for marker classes in a fixed order — Spring Boot, Quarkus, Micronaut, Helidon, Vert.x — and caches the first match. `adhar.currentFramework()` returns `SPRING_BOOT`, `QUARKUS`, `MICRONAUT`, `HELIDON`, `VERTX` or `OTHER`. Because the starter brings Spring Boot along, an application that uses the starter reports `SPRING_BOOT` whatever its runtime.

### Can I use the facade outside a DI container?

Yes. `AdharFacade.getInstance()` returns the process-wide singleton and creates it, with every module enabled, on the first call. Every framework adapter returns that same instance. Pass an `AdharModuleAccess` to the first call to gate modules: `AdharFacade.getInstance(AdharModuleAccess.of(Map.of("ai", false)))`.

### How do I migrate a service between frameworks?

The `AdharFacade` calls stay the same; the bootstrap, the build and framework-native code change. Check the [support table](/adhar-kit/frameworks#what-works-outside-spring-boot) for the target runtime first. For the mechanical annotation changes, [Rewrite](/adhar-kit/modules/rewrite) has `SpringToQuarkus` and `SpringToMicronaut` recipes.

### Does it work with GraalVM native image?

Not verified. The kit ships no GraalVM reachability metadata or Spring AOT runtime hints, its build does not compile a native image, and the facades load adapters reflectively (`Class.forName`). Test a native build of your service before relying on it.

## Usage

### What does the facade cost at runtime?

The shortcuts are thin wrappers — `traced(name, op)` is a Micrometer timer around a span — so you pay for the underlying library work, not the facade. Each sub-facade is built once, lazily, behind a `volatile` field; after that an access is a field read plus the gate check. A module you never call is never built.

### Should I use annotations or facade calls?

Both end in the same module code, so it is mostly readability. Annotations work through Spring AOP proxies, so **a call from an object to its own annotated method bypasses the aspect**. Use annotations when the concern covers a whole method; use facade calls for part of a method, a computed name or a condition.

## Production

### How do I turn modules on and off?

There are two switches — see [Concepts](/adhar-kit/concepts#3-two-switches-the-facade-gate-and-the-module):

- `adhar.kit.modules.<id>` gates the `AdharFacade` accessor. On by default: logging, metrics, tracing, resilience, security, persistence, cache, messaging, config, health, docs. Off: ai, analytics, kubernetes, dapr, grpc, graphql, batch, notification, event-sourcing, perf-profiler, rewrite.
- `adhar.<module>.enabled` switches the module's Spring auto-configuration. It is on when absent, and the facade gate does not affect it.

Both are startup configuration, fixed for the life of the process.

### How do I see which modules are live?

The startup banner lists the runtime and the facade gates. With Spring Boot Actuator and `management.endpoints.web.exposure.include=health,adhar`:

```text
GET /actuator/adhar          # version, counts and every gate's state
GET /actuator/adhar/{id}     # one module, e.g. /actuator/adhar/cache
```

The endpoint reads the same `AdharModuleAccess` that gates the facade. It does not show `adhar.<module>.enabled`; Spring Boot's `/actuator/conditions` does.

### How does configuration precedence work?

1. `adhar.kit.enabled` — the starter's banner, registry and gates; on when absent.
2. `adhar.kit.modules.<id>` — the facade gate.
3. `adhar.<module>.enabled` — the module's auto-configuration.
4. `adhar.<module>.*` — module settings.
5. The host framework's own source order.

Separately, `adhar-kit-config`'s `ConfigFacade` merges its `ConfigSource`s by priority; higher wins and the default is `100`. See [Concepts](/adhar-kit/concepts#6-configuration-precedence).

### Can I swap module implementations?

Yes: mock `AdharFacade`, replace one sub-facade with its setter (`adhar.setMetrics(stub)`), or register an `AdharFacadeCustomizer` — a Spring bean, or a `ServiceLoader` provider elsewhere. `AdharFacade.resetForTesting()` clears the singleton between tests; never call it in production.

## Troubleshooting

### `IllegalStateException: Adhar Kit module 'X' is disabled`

The facade gate is off. Set `adhar.kit.modules.X=true`. Eleven modules are off by default.

### Every request returns 403

`adhar-kit-security` requires authentication on every path except `/actuator/health` and `/actuator/info`, and with no JWT issuer nothing can authenticate. Configure `adhar.security.jwt.issuer-uri` or `adhar.security.jwt.jwk-set-uri`, or list public paths in `adhar.security.authorization.permit-all`.

### The startup banner never appears

`adhar.kit.enabled` is `false`, or `adhar-kit-starter` is not on the runtime classpath (check for `provided` or `test` scope). The banner comes from `AdharKitAutoConfiguration`.

### `/actuator/adhar` returns 404

Spring Boot Actuator is not on the classpath — the starter declares it optional — or `adhar` is missing from `management.endpoints.web.exposure.include`.

### `resilient(...)` or `safe(...)` throws `UnsupportedOperationException`

There is no `CircuitBreakerRegistry` bean for the facade to use: `adhar.resilience.enabled` is `false`, or the application is not running on Spring Boot. Re-enable the module or define the bean.

### `getBatch()` says `adhar-kit-batch is not on the classpath`

The starter declares `adhar-kit-batch` optional. Add `com.adhar.kit:adhar-kit-batch` to the service that runs jobs.

### Compilation fails with `class file has wrong version 69.0`

Your JDK is older than 25. Switch the toolchain; the kit cannot be consumed below Java 25.

### `mvn verify` fails on coverage

`adhar-kit-parent` enforces 80% instruction coverage per module at `verify` — in the kit and in services that inherit the parent. Add tests; `-Djacoco.skip=true` skips the gate while you iterate. See [Building & Contributing](/adhar-kit/build#coverage).

### Integration tests hang or fail to start

TestContainers needs a running Docker daemon. A test that hangs fails after the five-minute default JUnit timeout set by `adhar-kit-parent`.

## See also

- [Concepts](/adhar-kit/concepts) — the model behind most answers here.
- [Framework Support](/adhar-kit/frameworks) — per-runtime wiring and support.
- [Modules Overview](/adhar-kit/modules/overview) — every module and its gate id.
- [GitHub](https://github.com/adhar-io/adhar-kit) — issues and contributions.
