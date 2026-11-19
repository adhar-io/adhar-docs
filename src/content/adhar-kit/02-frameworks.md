---
title: "Framework Support"
section: "Get Started"
order: 3
path: "/adhar-kit/frameworks"
---

# Framework Support

`AdharFacade` is one plain class with no DI annotations, and `adhar-kit-starter` ships a thin adapter that hands it to Spring Boot, Quarkus, Micronaut, Helidon or Vert.x. Spring Boot gets the full kit. On the other runtimes you get the facade object and the framework-independent modules; several module facades do not work there yet. This page shows what each runtime gets today.

## At a glance

| Runtime | Status | How you get `AdharFacade` |
|---|---|---|
| Spring Boot 4 | `status:complete` | Constructor injection; auto-configured |
| Quarkus | `status:in-progress` | `@Inject`, from a CDI producer |
| Micronaut | `status:in-progress` | `@Inject`, from a factory you declare |
| Helidon MP / SE | `status:in-progress` | `@Inject` (MP) or `HelidonSeBootstrap.adhar()` (SE) |
| Vert.x | `status:in-progress` | `VertxAdharFacadeBootstrap.adhar()` |
| No container | `status:in-progress` | `AdharFacade.getInstance()` |

The kit's own tests cover the Spring Boot wiring. The other adapters have no tests in the kit repository.

## How the facade reaches your code

```diagram
nka-framework-adapters
```

The adapters live in `adhar-kit-starter` under `starter.spring`, `starter.quarkus`, `starter.micronaut`, `starter.helidon` and `starter.vertx`, and the starter declares each framework `<optional>true</optional>`. Every adapter returns the same process-wide singleton, so a `static` helper or `main` method that calls `AdharFacade.getInstance()` gets the instance the container injected.

## What works outside Spring Boot

> **Warning:** The starter puts Spring Boot on every classpath. Modules it requires — `adhar-kit-core`, `adhar-kit-persistence`, `adhar-kit-security` and others — depend on Spring Boot starters. `FrameworkDetector` checks for Spring Boot first, so in a Quarkus, Micronaut, Helidon or Vert.x application that uses the starter, `adhar.currentFramework()` reports `SPRING_BOOT`, and module facades take their Spring code path without the Spring beans it expects.

With the starter in a non-Spring application:

| Capability | Behaviour |
|---|---|
| `adhar.kit.modules.*` gates | Not read. Every module is enabled unless you [create the singleton yourself](#gating-modules-outside-spring-boot). |
| Module auto-configuration, banner, `/actuator/adhar` | None. They are Spring Boot auto-configurations. |
| `getMetrics()`, `count(...)` | Records to Micrometer's global registry, `Metrics.globalRegistry`. |
| `getTracing()`, `traced(...)` | Runs the operation without a span (no-op tracing); `traced` still records the timer. |
| `getResilience()`, `resilient(...)`, `safe(...)` | Throws `UnsupportedOperationException`. |
| Persistence, messaging and security shortcuts (`save`, `publish`, `hasPermission`, …) | Throw `No … configured` until you set a delegate, for example `PersistenceFacade.getInstance().setDelegate(...)`. On Spring Boot, each module's auto-configuration sets it. |
| `getHealth()`, `isHealthy()` | Registry-backed default service. |
| Logging, cache, config, `getUtils()` | Work as on Spring Boot. |

On Spring Boot, tracing and resilience work because `SpringAdharFacadeConfiguration` installs adapters built from the `Tracer` and `CircuitBreakerRegistry` beans that `adhar-kit-tracing` and `adhar-kit-resilience` register.

### Modules without the starter

If you depend on individual modules instead, Spring Boot stays off the classpath unless a module brings it, and `MetricsFacade`, `TracingFacade`, `CircuitBreakerFacade` and `HealthFacade` pick an adapter for the detected runtime. Several of those adapters exist in the source but are excluded from compilation in the 0.1.0 jars:

| Facade | Quarkus | Micronaut | Helidon | Vert.x |
|---|---|---|---|---|
| `MetricsFacade` | Adapter included | Adapter included | Not in jar: throws | Not in jar: throws |
| `TracingFacade` | Throws `UnsupportedOperationException` | Throws `UnsupportedOperationException` | Not in jar: throws | Not in jar: throws |
| `CircuitBreakerFacade` | Not in jar: throws | Not in jar: throws | Not in jar: throws | Not in jar: throws |
| `HealthFacade` | Registry-backed default | Registry-backed default | Falls back to the default | Falls back to the default |

"Not in jar" means the module's `pom.xml` excludes that adapter package from compilation, so the facade fails with `IllegalStateException` (`Failed to create adapter …` or `… adapter not available`).

## How the runtime is detected

`FrameworkDetector` checks for marker classes in a fixed order and caches the first match:

| Order | `Framework` | Marker class |
|---|---|---|
| 1 | `SPRING_BOOT` | `org.springframework.boot.SpringApplication` |
| 2 | `QUARKUS` | `io.quarkus.runtime.Quarkus` |
| 3 | `MICRONAUT` | `io.micronaut.context.ApplicationContext` |
| 4 | `HELIDON` | `io.helidon.webserver.WebServer` or `io.helidon.microprofile.cdi.Main` |
| 5 | `VERTX` | `io.vertx.core.Vertx` |
| — | `OTHER` | none matched |

Read the result with `adhar.currentFramework()`. The first match wins, so a Spring Boot application that embeds Vert.x reports `SPRING_BOOT`. Module facades such as `MetricsFacade` use the same result to pick their implementation.

Detection is separate from bean production: each container only activates its own adapter. `SpringAdharFacadeConfiguration` is `@ConditionalOnClass(name = "org.springframework.boot.SpringApplication")`, and the CDI producers only resolve inside a CDI container.

## Per-framework setup

### Spring Boot

Auto-configuration registers the bean. See the [Quick Start](/adhar-kit/quickstart) for a complete service.

```java
@Service
public class OrderService {
    private final AdharFacade adhar;
    public OrderService(AdharFacade adhar) { this.adhar = adhar; }
}
```

### Quarkus

`QuarkusAdharFacadeProducer` is a `@Singleton` class with an `@ApplicationScoped` `@Produces` method; ArC finds it through the `META-INF/beans.xml` in the starter jar.

```java
@ApplicationScoped
public class OrderService {
    @Inject AdharFacade adhar;
}
```

> **Note:** The same jar also carries `HelidonAdharFacadeProducer`, which produces the same unqualified type. If ArC reports an ambiguous `AdharFacade` dependency, exclude the Helidon one with `quarkus.arc.exclude-types=com.adhar.kit.starter.helidon.HelidonAdharFacadeProducer`.

### Micronaut

The starter contains `MicronautAdharFacadeFactory`, but it is not compiled with Micronaut's annotation processor, so the jar has no bean definitions for Micronaut to find. Declare the factory in your own code, where your build runs the processor:

```java
import com.adhar.kit.starter.AdharFacade;
import io.micronaut.context.annotation.Factory;
import jakarta.inject.Singleton;

@Factory
public class AdharFacadeFactory {
    @Singleton
    AdharFacade adharFacade() {
        return AdharFacade.getInstance();
    }
}
```

Then inject it as usual: `@Inject AdharFacade adhar;`.

### Helidon MP

`HelidonAdharFacadeProducer` is the same CDI producer pattern as on Quarkus:

```java
@ApplicationScoped
public class OrderService {
    @Inject AdharFacade adhar;
}
```

If CDI reports an unsatisfied `AdharFacade`, add your own `@ApplicationScoped` class with a `@Produces` method that returns `AdharFacade.getInstance()`.

### Helidon SE

There is no container, so call the bootstrap once and pass the result around:

```java
public static void main(String[] args) {
    AdharFacade adhar = HelidonSeBootstrap.adhar();
    adhar.logInfo("Starting on {}", adhar.currentFramework());
}
```

### Vert.x

`VertxAdharFacadeBootstrap` has three entry points:

- `adhar()` returns the singleton.
- `installInto(vertx)` stores it in `vertx.sharedData()`, in the local map `com.adhar.kit.starter.AdharFacade`.
- `from(vertx)` reads it back, installing it first if needed.

```java
public class OrderVerticle extends AbstractVerticle {
    private final AdharFacade adhar = VertxAdharFacadeBootstrap.adhar();
}
```

### No container

```java
AdharFacade adhar = AdharFacade.getInstance();
```

`getInstance()` creates the singleton with every module enabled and applies each `AdharFacadeCustomizer` registered under `META-INF/services/com.adhar.kit.starter.AdharFacadeCustomizer`.

## Gating modules outside Spring Boot

Only the Spring adapter reads `adhar.kit.*`. Everywhere else, the first call to `getInstance` decides the gates. Create the singleton yourself, before the container asks for it — for example at the top of `main`:

```java
AdharFacade.getInstance(AdharModuleAccess.of(Map.of(
        "ai", false,
        "dapr", false)));
```

Later `getInstance()` calls, including the adapters', return this instance.

## Migrating between frameworks

Calls on `AdharFacade` do not name framework types, so a migration touches the bootstrap, the build and the framework's own annotations — and any kit module that is not yet supported on the target runtime (see the table above). Framework-native code such as Spring Data repositories or Panache entities still has to be ported.

`adhar-kit-rewrite` has OpenRewrite recipes for the mechanical annotation changes, such as `SpringToQuarkus` and `SpringToMicronaut`. See [Rewrite](/adhar-kit/modules/rewrite).

## Next steps

- [Concepts](/adhar-kit/concepts) — gates, module switches and configuration precedence.
- [Quick Start](/adhar-kit/quickstart) — a complete service on Spring Boot.
- [Modules Overview](/adhar-kit/modules/overview) — what each module contributes.
- [FAQ](/adhar-kit/faq) — Gradle, native image and other questions.
