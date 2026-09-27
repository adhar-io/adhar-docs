---
title: "Framework Support"
section: "Get Started"
order: 3
path: "/adhar-kit/frameworks"
---

# Framework Support

Adhar Kit runs identically across five Java frameworks. Your business logic — every `adhar.*` call — is the same everywhere; only how you obtain the `AdharFacade` differs.

| Capability | Spring Boot | Quarkus | Micronaut | Helidon | Vert.x |
|---|---|---|---|---|---|
| Core APIs | Identical | Identical | Identical | Identical | Identical |
| Configuration | Native YAML | Native props | Native YAML | MP Config | JSON/YAML |
| DI integration | Spring DI | ArC CDI | Micronaut DI | MP CDI / SE | Standalone |
| Native image | GraalVM | GraalVM | GraalVM | GraalVM | GraalVM |

Detect the runtime at any point with `adhar.currentFramework()` → `SPRING_BOOT`, `QUARKUS`, `MICRONAUT`, `HELIDON`, `VERTX`, or `OTHER`.

## Wiring per framework

```java
// Spring Boot — auto-configured, just inject
@Service
public class OrderService {
    private final AdharFacade adhar;
    public OrderService(AdharFacade adhar) { this.adhar = adhar; }
}
```

```java
// Quarkus
@ApplicationScoped
public class OrderService {
    @Inject AdharFacade adhar;
}
```

```java
// Micronaut
@Singleton
public class OrderService {
    @Inject AdharFacade adhar;
}
```

```java
// Helidon MP
@ApplicationScoped
public class OrderService {
    @Inject AdharFacade adhar;
}
```

```java
// Helidon SE — static bootstrap
AdharFacade adhar = HelidonSeBootstrap.adhar();
```

```java
// Vert.x — static bootstrap
public class OrderVerticle extends AbstractVerticle {
    private final AdharFacade adhar = VertxAdharFacadeBootstrap.adhar();
}
```

```java
// Outside any container
AdharFacade adhar = AdharFacade.getInstance();
```

## Adapters

Each framework has a thin adapter that produces the facade; all delegate to the same singleton, so `AdharFacade.getInstance()` is always valid.

| Framework | Adapter | Mechanism |
|---|---|---|
| Spring Boot | `SpringAdharFacadeConfiguration` | `@AutoConfiguration` + `@Bean` |
| Quarkus | `QuarkusAdharFacadeProducer` | CDI `@Produces` |
| Micronaut | `MicronautAdharFacadeFactory` | `@Factory` + `@Singleton` |
| Helidon MP | `HelidonAdharFacadeProducer` | CDI `@Produces` |
| Helidon SE | `HelidonSeBootstrap.adhar()` | Static bootstrap |
| Vert.x | `VertxAdharFacadeBootstrap` | Static + shared-data |

On Spring Boot, modules read config via `adhar.kit.*` properties; on the others they use the native mechanism (SmallRye Config, Micronaut Environment, MP Config, Vert.x ConfigRetriever). Optional framework dependencies are marked `<optional>true</optional>`, so you only pull the runtime you use.

## Migrating between frameworks

The [`adhar-kit-rewrite`](/adhar-kit/modules/overview) module ships OpenRewrite recipes — including cross-framework migration — so moving a service between frameworks is largely automated.
