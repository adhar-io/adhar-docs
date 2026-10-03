---
title: "Framework Support"
section: "Get Started"
order: 3
path: "/adhar-kit/frameworks"
---

# Framework Support

Adhar Kit runs on Spring Boot, Quarkus, Micronaut, Helidon and Vert.x. **Your business logic — every `adhar.*` call — is byte-for-byte identical on all five**; only the four or five lines that obtain the `AdharFacade` differ. This page explains how that is arranged, so you can judge the claim rather than take it.

## At a glance

| | |
|---|---|
| Supported runtimes | Spring Boot 4.0+, Quarkus 3.21+, Micronaut 4.8+, Helidon 4.2+, Vert.x 4.5+ |
| Shared across all | `AdharFacade`, every `*Facade`, every shortcut, module gating |
| Adapter-specific | How the facade becomes injectable; how config is read |
| Selection | Classpath detection by `FrameworkDetector`, cached after first call |
| Fallback | `AdharFacade.getInstance()` works with no container at all |

## Why this is not the usual claim

Most libraries that call themselves framework-agnostic still put framework types in your method signatures — a `@Component` here, a Spring `Environment` there — so moving frameworks means touching every class. Adhar Kit puts the boundary one level lower.

`AdharFacade` carries **no DI annotations and no compile-time dependency on any framework**. It is a plain class. Each supported runtime ships a thin adapter in its own package (`starter.spring`, `starter.quarkus`, `starter.micronaut`, `starter.helidon`, `starter.vertx`) whose only job is to hand that plain class to the container. The adapters live in `adhar-kit-starter` and every framework dependency they need is declared `<optional>true</optional>`, so adding the starter to a Quarkus app does not drag Spring onto your classpath.

```diagram
kit-framework-adapters
```

## Shared versus adapter-specific

| Concern | Shared | Adapter-specific |
|---|---|---|
| Facade API and shortcuts | Yes — one class, one implementation | — |
| Module facades (`MetricsFacade`, `CacheFacade`, …) | Yes | — |
| Module gating and `AdharModuleAccess` | Yes | How the toggles are read |
| Event format (CloudEvents 1.0) | Yes | — |
| Obtaining the facade | — | `@Bean`, `@Produces`, `@Factory`, or a static bootstrap |
| Configuration source | — | Spring `Environment`, SmallRye Config, Micronaut Environment, MP Config, Vert.x `ConfigRetriever` |
| Infrastructure adapters for tracing and resilience | — | Wired from container beans where the container has them |

The last row is the one people trip over. On Spring Boot, `SpringAdharFacadeConfiguration` cannot let the tracing and resilience facades self-initialize, because those need injected infrastructure. It therefore looks for a Micrometer `Tracer` bean and a Resilience4j `CircuitBreakerRegistry` bean and, when present, installs `SpringTracingAdapter` and `SpringCircuitBreakerAdapter` onto the facade. If neither bean exists, `getTracing()` and `getResilience()` — and by extension `traced()`, `resilient()` and `safe()` — have nothing to delegate to.

## How the right adapter is selected

Two independent mechanisms are at work, and it helps to keep them apart.

**Bean production** is selected by the container itself. Each adapter is only active when its framework is on the classpath — `SpringAdharFacadeConfiguration` is annotated `@ConditionalOnClass(name = "org.springframework.boot.SpringApplication")`, the Quarkus and Helidon producers are CDI beans that only resolve inside a CDI container, and so on. Nothing chooses between them; only one can be active.

**Runtime identification** is selected by `FrameworkDetector`, which probes for marker classes in a fixed order and caches the first hit:

| Order | Framework | Marker class |
|---|---|---|
| 1 | `SPRING_BOOT` | `org.springframework.boot.SpringApplication` |
| 2 | `QUARKUS` | `io.quarkus.runtime.Quarkus` |
| 3 | `MICRONAUT` | `io.micronaut.context.ApplicationContext` |
| 4 | `HELIDON` | `io.helidon.webserver.WebServer` or `io.helidon.microprofile.cdi.Main` |
| 5 | `VERTX` | `io.vertx.core.Vertx` |
| — | `OTHER` | Nothing matched; standalone/fallback mode |

Read the result with `adhar.currentFramework()`. The order is first-match-wins, which matters in the unusual case of a hybrid classpath: a Spring Boot app that also embeds Vert.x reports `SPRING_BOOT`.

Whichever path produced the facade, it is the same process-wide singleton. `AdharFacade.getInstance()` returns that instance, so utility code outside the container — a `static` helper, a `ServiceLoader` provider, a JMH benchmark — can reach the facade without injection.

## Capability comparison

| Capability | Spring Boot | Quarkus | Micronaut | Helidon | Vert.x |
|---|---|---|---|---|---|
| Core APIs | Identical | Identical | Identical | Identical | Identical |
| Configuration | Native YAML | Native props | Native YAML | MP Config | JSON/YAML |
| DI integration | Spring DI | ArC CDI | Micronaut DI | MP CDI / SE | Standalone |
| Native image | GraalVM | GraalVM | GraalVM | GraalVM | GraalVM |
| Facade obtained by | Injection | Injection | Injection | Injection or bootstrap | Bootstrap |

Configuration is the row with real consequences. On Spring Boot the kit binds `adhar.kit.*` through `AdharKitProperties` and the standard relaxed binding rules, so `adhar.kit.modules.event-sourcing` and `ADHAR_KIT_MODULES_EVENTSOURCING` both work. On the other runtimes the same logical keys are read through that framework's native mechanism — SmallRye Config on Quarkus, the Micronaut `Environment`, MicroProfile Config on Helidon, `ConfigRetriever` on Vert.x — so the key names match but the precedence rules are the host framework's, not the kit's.

## Per-framework setup

### Spring Boot

Auto-configuration registers the bean; take it as a constructor parameter.

```java
@Service
public class OrderService {
    private final AdharFacade adhar;
    public OrderService(AdharFacade adhar) { this.adhar = adhar; }
}
```

```yaml
adhar:
  kit:
    enabled: true
    modules:
      cache: true
```

### Quarkus

`QuarkusAdharFacadeProducer` is a `@Singleton` bean with an `@ApplicationScoped` `@Produces` method.

```java
@ApplicationScoped
public class OrderService {
    @Inject AdharFacade adhar;
}
```

```properties
adhar.kit.enabled=true
adhar.kit.modules.cache=true
```

### Micronaut

`MicronautAdharFacadeFactory` is a `@Factory` exposing the facade as a `@Singleton`.

```java
@Singleton
public class OrderService {
    @Inject AdharFacade adhar;
}
```

```yaml
adhar:
  kit:
    enabled: true
```

### Helidon MP

`HelidonAdharFacadeProducer` produces an `@ApplicationScoped` CDI bean, exactly as on Quarkus.

```java
@ApplicationScoped
public class OrderService {
    @Inject AdharFacade adhar;
}
```

### Helidon SE

There is no CDI container in SE mode, so use the static bootstrap.

```java
public static void main(String[] args) {
    AdharFacade adhar = HelidonSeBootstrap.adhar();
    adhar.logInfo("Starting on {}", adhar.currentFramework());
}
```

### Vert.x

`VertxAdharFacadeBootstrap` gives you three entry points: `adhar()` for the plain singleton, `installInto(Vertx)` to publish it into the `Vertx` shared data map under the key `com.adhar.kit.starter.AdharFacade`, and `from(Vertx)` to read it back inside a verticle.

```java
public class OrderVerticle extends AbstractVerticle {
    private final AdharFacade adhar = VertxAdharFacadeBootstrap.adhar();
}
```

### No container at all

```java
AdharFacade adhar = AdharFacade.getInstance();
```

`getInstance()` creates the singleton with every module enabled and applies any `AdharFacadeCustomizer` registered through `META-INF/services`.

## Adapter reference

| Framework | Adapter class | Mechanism |
|---|---|---|
| Spring Boot | `SpringAdharFacadeConfiguration` | `@AutoConfiguration` + `@Bean` |
| Quarkus | `QuarkusAdharFacadeProducer` | CDI `@Produces` |
| Micronaut | `MicronautAdharFacadeFactory` | `@Factory` + `@Singleton` |
| Helidon MP | `HelidonAdharFacadeProducer` | CDI `@Produces` |
| Helidon SE | `HelidonSeBootstrap.adhar()` | Static bootstrap |
| Vert.x | `VertxAdharFacadeBootstrap` | Static bootstrap + `Vertx` shared data |

## Migrating between frameworks

Because your code never names a framework type through the facade, a migration touches the bootstrap, the build file and the framework's own annotations — not the kit calls. The `adhar-kit-rewrite` module ships OpenRewrite recipes, including cross-framework migrations, to automate most of the mechanical part. Reach them at runtime via `adhar.getRewrite()`; see the [Modules Overview](/adhar-kit/modules/overview).

> Migration is not free. Framework-native code outside the kit — Spring Data repositories, Quarkus Panache entities, Micronaut HTTP clients — still has to be ported. What the kit removes is the cross-cutting half of the work.

## Next steps

- [Concepts](/adhar-kit/concepts) — module gating, lazy initialization and configuration precedence.
- [Quick Start](/adhar-kit/quickstart) — a full first service on Spring Boot.
- [Modules Overview](/adhar-kit/modules/overview) — what each module contributes.
- [FAQ](/adhar-kit/faq) — native image, Gradle, and other cross-framework questions.
