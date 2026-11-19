---
title: "Quick Start"
section: "Get Started"
order: 2
path: "/adhar-kit/quickstart"
---

# Quick Start

This page takes you from an empty directory to a Spring Boot service that logs, counts, traces and caches through one injected `AdharFacade`. You add one dependency, set a few `adhar.*` properties, and check the result in the startup banner and at `/actuator/adhar`.

```diagram
nka-quickstart-flow
```

## Prerequisites

- **JDK 25 or later.** Every kit artifact is Java 25 bytecode, so an older compiler fails with `class file has wrong version 69.0`.
- **Maven 3.8 or later.** `adhar-kit-parent` enforces it.
- **A repository that serves `com.adhar.kit` 0.1.0**: Maven Central for released versions, the platform's Nexus on an Adhar cluster, or your local `~/.m2` after you [build the kit from source](/adhar-kit/build).
- **Access to `https://projectlombok.org/edge-releases`** if you inherit `adhar-kit-parent`. The parent compiles with Lombok `edge-SNAPSHOT` and declares that repository.

## Choose how to depend on the kit

| Approach | Declare | What you get | Use it when |
|---|---|---|---|
| Parent + starter | `adhar-kit-parent` as `<parent>`, `adhar-kit-starter` as a dependency | Everything below, plus `AdharFacade` and Spring Boot auto-configuration | A new Spring Boot service. The platform templates do this. |
| BOM + modules | `adhar-kit-bom` imported in `<dependencyManagement>`, then each module without a version | Only the modules you list, each used through its own `*Facade` | A small dependency graph, or a service with its own parent |
| Starter, own parent | `adhar-kit-bom` import + `adhar-kit-starter`, and `<java.version>25</java.version>` | `AdharFacade` without the kit's build rules | Your organization already has a parent POM |

What each build artifact carries:

- **`adhar-kit-starter`** requires 23 kit modules and holds `AdharFacade` and the framework adapters. `adhar-kit-batch` is optional: declare it yourself to use `getBatch()`. Through those modules you also get Spring MVC, Spring Security, Spring Data JPA, Flyway and springdoc.
- **`adhar-kit-bom`** manages every kit module and the maven plugin, and imports the Spring Boot (`spring-boot-dependencies` 4.1.0) and Spring Cloud (2025.1.2) BOMs. It also pins the third-party versions the kit is built with: Resilience4j, OpenTelemetry, gRPC, CloudEvents, the Dapr SDK, the Fabric8 Kubernetes client, Spring AI, MapStruct, QueryDSL, springdoc, PostHog and WireMock.
- **`adhar-kit-parent`** inherits `spring-boot-starter-parent` 4.1.0, imports the BOM, sets Java 25 and UTF-8, and applies the Maven Enforcer and the JaCoCo gate. **The gate applies to your service too:** `mvn verify` fails below 80% instruction coverage. It also manages `adhar-kit-maven-plugin`: declare the plugin with only its `groupId` and `artifactId` to run spec-first OpenAPI generation.

## Step 1 — Create the pom

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.adhar.kit</groupId>
        <artifactId>adhar-kit-parent</artifactId>
        <version>0.1.0</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>greeting-service</artifactId>
    <version>0.0.1-SNAPSHOT</version>

    <dependencies>
        <dependency>
            <groupId>com.adhar.kit</groupId>
            <artifactId>adhar-kit-starter</artifactId>
        </dependency>
        <!-- /actuator/adhar; the starter declares Actuator optional -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

The parent's BOM supplies every version. If you keep your own parent instead, import the BOM and set the Java version:

```xml
<properties>
    <java.version>25</java.version>
</properties>

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
```

## Step 2 — Configure

Create `src/main/resources/application.yml`:

```yaml
spring:
  application:
    name: greeting-service       # the banner and docs title use it

adhar:
  kit:
    modules:                     # facade gates; these restate the defaults
      cache: true
      metrics: true
      tracing: true
      ai: false
  security:
    authorization:
      permit-all: "/**"          # demo only: every path is public

management:
  endpoints:
    web:
      exposure:
        include: health,adhar
```

- `adhar.kit.modules.<id>` gates the `AdharFacade` accessors. Eleven are on by default (`logging`, `metrics`, `tracing`, `resilience`, `security`, `persistence`, `cache`, `messaging`, `config`, `health`, `docs`) and eleven are off (`ai`, `analytics`, `kubernetes`, `dapr`, `grpc`, `graphql`, `batch`, `notification`, `event-sourcing`, `perf-profiler`, `rewrite`).
- `adhar.security.authorization.permit-all` is needed because `adhar-kit-security` is active as soon as it is on the classpath, and it requires authentication on every path except `/actuator/health` and `/actuator/info`. With no JWT issuer configured, every other request gets `403`. Replace `"/**"` with real rules and `adhar.security.jwt.issuer-uri` or `adhar.security.jwt.jwk-set-uri` before you deploy.
- You do not need a database. With no `spring.datasource.url`, `adhar-kit-persistence` switches the JDBC, JPA and Flyway auto-configuration off and logs that it did.

## Step 3 — Write the service

```java
package com.example.greeting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class GreetingApplication {
    public static void main(String[] args) {
        SpringApplication.run(GreetingApplication.class, args);
    }
}
```

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
            return adhar.cached("greetings", name, String.class, () -> "Hello, " + name);
        });
    }
}
```

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

`greet` uses three modules without importing any of them:

- `traced` records a Micrometer timer around an OpenTelemetry span.
- `count` increments a Micrometer counter tagged `name=<name>`.
- `cached` runs cache-aside against the cache `greetings`, and creates it on first use.

## Step 4 — Run it

```bash
mvn spring-boot:run
```

**Check:** the startup log contains the Adhar Kit banner. `adhar-kit-logging` writes JSON log lines, so the banner is in the `message` field of consecutive lines from `AdharKitAutoConfiguration`:

```text
===============================================================================
                       ADHAR KIT - Enterprise Framework
===============================================================================
  Application   : greeting-service
  Version       : 0.1.0
  Runtime       : SPRING_BOOT
  Profile       : default
  Spring Profile: default
  Started at    : <timestamp>
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
  Disabled: AI/ML, Analytics, Kubernetes, Dapr, gRPC, GraphQL, Batch, Notification, Event Sourcing, Perf Profiler, Rewrite
-------------------------------------------------------------------------------
  11 modules enabled, 11 disabled
===============================================================================
```

Call the endpoint:

```bash
curl http://localhost:8080/greet/ada
```

**Check:** the response is `Hello, ada`.

## Step 5 — Inspect the module registry

```bash
curl -s http://localhost:8080/actuator/adhar
```

**Check:** the report shows 22 modules, 11 enabled and 11 disabled. Module order varies between runs.

```json
{
  "version": "0.1.0",
  "totalModules": 22,
  "enabledModules": 11,
  "disabledModules": 11,
  "modules": [
    { "id": "cache", "name": "Cache",
      "description": "Distributed caching with Kafka synchronization",
      "enabled": true, "status": "UP" },
    { "id": "ai", "name": "AI/ML",
      "description": "Multi-provider AI integration",
      "enabled": false, "status": "DISABLED" }
  ]
}
```

`GET /actuator/adhar/{id}` returns one module, for example `/actuator/adhar/cache`. `status` reflects the gate only: `UP` means enabled, not health-checked.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every request returns `403`; the log warns `adhar.security requires authentication but no JWT issuer-uri or jwk-set-uri is configured` | `adhar-kit-security` protects all paths by default | Configure `adhar.security.jwt.*`, or list public paths in `adhar.security.authorization.permit-all` |
| `IllegalStateException: Adhar Kit module 'ai' is disabled (adhar.kit.modules.ai=false)` | The accessor's gate is off; `ai` is off by default | Set `adhar.kit.modules.ai=true` |
| `IllegalStateException: adhar-kit-batch is not on the classpath` from `getBatch()` | The starter does not bring `adhar-kit-batch` | Add `com.adhar.kit:adhar-kit-batch` |
| No banner, and `/actuator/adhar` is missing | `adhar.kit.enabled=false`, or the starter is not on the runtime classpath | Remove the property or fix the dependency scope. With the switch off, the `AdharFacade` bean still exists, with every module enabled. |
| `/actuator/adhar` returns `404` | Actuator is absent, or `adhar` is not in the exposure list | Add `spring-boot-starter-actuator` and include `adhar` |
| `UnsupportedOperationException` from `getResilience()`, `resilient(...)` or `safe(...)` | No `CircuitBreakerRegistry` bean, usually because `adhar.resilience.enabled=false` | Re-enable the module, or define a `CircuitBreakerRegistry` bean |
| `class file has wrong version 69.0` or `UnsupportedClassVersionError` | JDK older than 25 | Build and run on JDK 25 or later |
| Log warns `No Dapr sidecar configured … run in memory` | `adhar-kit-dapr` auto-configures whenever it is on the classpath; the facade gate does not stop it | Expected without a sidecar. Set `adhar.dapr.enabled=false` to switch it off. |

## Next steps

- [Concepts](/adhar-kit/concepts) — the two kinds of switch, lazy facades and configuration precedence.
- [Framework Support](/adhar-kit/frameworks) — the same facade on Quarkus, Micronaut, Helidon and Vert.x, and what works there today.
- [Modules Overview](/adhar-kit/modules/overview) — what else you can turn on.
- [Building & Contributing](/adhar-kit/build) — build the kit from source.
