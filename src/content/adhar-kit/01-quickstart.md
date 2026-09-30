---
title: "Quick Start"
section: "Get Started"
order: 2
path: "/adhar-kit/quickstart"
---

# Quick Start

This page takes you from an empty `pom.xml` to a running service that logs, counts, traces and caches through a single injected object. **The whole integration is one dependency and one constructor parameter** — everything else on this page is explaining what happens as a result.

## At a glance

| | |
|---|---|
| Time | About ten minutes |
| You end up with | A Spring Boot service using `AdharFacade` |
| Dependency | `com.adhar.kit:adhar-kit-starter:0.1.0` |
| Config prefix | `adhar.kit.*` |
| Verification | The Adhar Kit startup banner plus `GET /actuator/adhar` |

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| JDK | 25 or later | The kit compiles to Java 25 bytecode and the Maven Enforcer rejects anything older |
| Maven | 3.9+ | 3.8 is the enforced floor when building the kit itself; use 3.9+ to consume it |
| A framework | Spring Boot 4.0+, Quarkus 3.21+, Micronaut 4.8+, Helidon 4.2+ or Vert.x 4.5+ | Optional — the kit also runs standalone |

Check the JDK before anything else, because a Java 24 toolchain fails during dependency resolution rather than at compile time, which produces a confusing error:

```bash
java -version    # openjdk version "25" …
mvn -version     # Apache Maven 3.9.x …
```

## Step 1 — choose how you depend on it

There are three shapes, and they are not mutually exclusive. Pick one as your primary.

### Option A — the starter

The starter transitively brings in every module and registers the framework adapters and auto-configuration. Choose it when you want the full facade and are not counting bytes.

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-starter</artifactId>
    <version>0.1.0</version>
</dependency>
```

### Option B — the BOM, then individual modules

Import `adhar-kit-bom` once into `dependencyManagement`, then declare modules without versions. Choose it when you want a slim dependency graph — a metrics-only sidecar, for example.

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.adhar.kit</groupId>
            <artifactId>adhar-kit-bom</artifactId>
            <version>0.1.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>com.adhar.kit</groupId>
        <artifactId>adhar-kit-commons</artifactId>
    </dependency>
    <dependency>
        <groupId>com.adhar.kit</groupId>
        <artifactId>adhar-kit-logging</artifactId>
    </dependency>
    <dependency>
        <groupId>com.adhar.kit</groupId>
        <artifactId>adhar-kit-metrics</artifactId>
    </dependency>
</dependencies>
```

The BOM also manages the third-party versions the kit is tested against — Resilience4j, OpenTelemetry, gRPC, CloudEvents, the Kubernetes client, Spring AI — so importing it keeps your own direct dependencies aligned with the kit's.

### Option C — inherit the parent POM

For a greenfield service, inherit `adhar-kit-parent`. It sets Java 25, UTF-8, Surefire/Failsafe wiring, the Enforcer rules and the JaCoCo coverage gate, and it already imports the BOM.

```xml
<parent>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-parent</artifactId>
    <version>0.1.0</version>
</parent>
```

> The parent inherits from `spring-boot-starter-parent`. That is convenient on Spring Boot and harmless elsewhere, but if you are on Quarkus or Micronaut you probably want their platform BOM as your parent and Option A or B for the kit.

## Step 2 — configure

Everything the starter reads lives under `adhar.kit`. The two keys you always set are the master switch and the application name.

```yaml
adhar:
  kit:
    enabled: true
    application-name: greeting-service
    profile: default
    modules:
      cache: true
      metrics: true
      tracing: true
      ai: false
```

Defaults matter here, and they are asymmetric. Eleven modules are **on** out of the box — logging, metrics, tracing, resilience, security, persistence, cache, messaging, config, health and docs. Eleven are **off** — ai, analytics, kubernetes, dapr, grpc, graphql, batch, notification, event-sourcing, perf-profiler and rewrite. Every entry in the block above restates a default; it is spelled out so you can see the shape of the `modules` map before you change anything in it.

## Step 3 — write the service

On Spring Boot the facade is auto-configured as a bean. Take it as a constructor parameter.

```java
package com.example.greeting;

import com.adhar.kit.starter.AdharFacade;
import org.springframework.stereotype.Service;

@Service
public class GreetingService {

    private final AdharFacade adhar;

    public GreetingService(AdharFacade adhar) {
        this.adhar = adhar;
    }

    public String greet(String name) {
        return adhar.traced("greet", () -> {
            adhar.count("greetings", "name", name);
            adhar.logInfo("Greeting {}", name);
            return adhar.cached("greetings", name, String.class,
                    () -> "Hello, " + name);
        });
    }
}
```

Three module boundaries are crossed in that method and none of them appear in the imports. `traced` opens a span through `TracingFacade` and records the duration through `MetricsFacade`. `count` increments a Micrometer counter. `cached` runs the cache-aside pattern against a cache named `greetings`, creating it on first use.

Expose it over HTTP so there is something to call:

```java
package com.example.greeting;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GreetingController {

    private final GreetingService greetings;

    public GreetingController(GreetingService greetings) {
        this.greetings = greetings;
    }

    @GetMapping("/greet/{name}")
    public String greet(@PathVariable String name) {
        return greetings.greet(name);
    }
}
```

## Step 4 — run it

```bash
mvn clean install
mvn spring-boot:run
```

Adhar Kit prints a banner during startup listing the runtime it detected and which modules are live. Seeing it is how you know auto-configuration fired:

```text
===============================================================================
                       ADHAR KIT - Enterprise Framework
===============================================================================
  Application   : greeting-service
  Version       : 0.1.0
  Runtime       : SPRING_BOOT
  Profile       : default
  Spring Profile: default
  Started at    : 2026-01-14 09:41:07
-------------------------------------------------------------------------------
  Active Modules:
    [+] Logging
    [+] Metrics
    [+] Tracing
    [+] Resilience
    [+] Security
    [+] Persistence
    [+] Cache
    [+] Messaging
    [+] Configuration
    [+] Health
    [+] API Docs
  Disabled: AI/ML, Analytics, Kubernetes, Dapr, gRPC, GraphQL, Batch,
            Notification, Event Sourcing, Perf Profiler, Rewrite
-------------------------------------------------------------------------------
  11 modules enabled, 11 disabled
===============================================================================
```

Then call it:

```bash
curl http://localhost:8080/greet/ada
# Hello, ada
```

## Step 5 — verify the module registry

Add Spring Boot Actuator and expose the `adhar` endpoint. It reports the same registry the banner printed, but at runtime and as JSON.

```properties
management.endpoints.web.exposure.include=health,adhar
```

```bash
curl -s http://localhost:8080/actuator/adhar
```

```json
{
  "version": "0.1.0",
  "totalModules": 22,
  "enabledModules": 11,
  "disabledModules": 11,
  "modules": [
    { "id": "metrics", "name": "Metrics",
      "description": "Micrometer metrics collection and export",
      "enabled": true, "status": "UP" },
    { "id": "ai", "name": "AI/ML",
      "description": "Multi-provider AI integration",
      "enabled": false, "status": "DISABLED" }
  ]
}
```

`GET /actuator/adhar/{id}` returns a single module, for example `/actuator/adhar/cache`.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `IllegalStateException: Adhar Kit module 'ai' is disabled` | You called `adhar.getAi()` while `adhar.kit.modules.ai` is `false` — and it is false by default | Set `adhar.kit.modules.ai=true` |
| No startup banner | `adhar.kit.enabled` is `false`, or the starter is not on the runtime classpath | Check the dependency scope and the property |
| `/actuator/adhar` returns 404 | Actuator is absent, or the endpoint is not in the exposure list | Add `spring-boot-starter-actuator` and include `adhar` |
| Dependency resolution fails on Java 24 or lower | The Enforcer requires Java 25+ | Switch the toolchain, do not lower the rule |
| `adhar.traced(...)` fails on Spring Boot | The Spring adapter wires tracing only when a Micrometer `Tracer` bean exists | Add Micrometer Tracing, or use `adhar.count(...)` alone |

## Next steps

- [Framework Support](/adhar-kit/frameworks) — the same service on Quarkus, Micronaut, Helidon or Vert.x. The business code is unchanged; only the injection differs.
- [Concepts](/adhar-kit/concepts) — why the facade is gated and lazy, and how configuration precedence resolves.
- [Modules Overview](/adhar-kit/modules/overview) — what else you can turn on.
- [Building & Contributing](/adhar-kit/build) — build the kit from source if you need an unreleased fix.
