---
title: "Quick Start"
section: "Get Started"
order: 2
path: "/adhar-kit/quickstart"
---

# Quick Start

Add Adhar Kit to a Java service in one of three ways, then inject `AdharFacade` and go. Requires **Java 25+** and **Maven 3.9+**.

## Option A — the starter (simplest)

The starter pulls the full facade with sensible defaults and auto-configuration:

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-starter</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Option B — the BOM, then pick modules

Import the BOM once to manage versions, then declare only the modules you need (no versions):

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.adhar.kit</groupId>
            <artifactId>adhar-kit-bom</artifactId>
            <version>0.1.0-SNAPSHOT</version>
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

## Option C — inherit the parent POM

For a greenfield service, inherit `adhar-kit-parent` for build config, plugin management, and coverage enforcement:

```xml
<parent>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-parent</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</parent>
```

## Hello, Adhar

On Spring Boot, the facade auto-configures — just inject it:

```java
import com.adhar.kit.starter.AdharFacade;

@Service
public class GreetingService {
    private final AdharFacade adhar;

    public GreetingService(AdharFacade adhar) { this.adhar = adhar; }

    public String greet(String name) {
        return adhar.traced("greet", () -> {   // auto tracing + metrics timing
            adhar.count("greetings");
            return "Hello, " + name;
        });
    }
}
```

Enable and tune modules under `adhar.kit.*`:

```yaml
adhar:
  kit:
    enabled: true
    application-name: greeting-service
    modules:
      cache: true
      ai: false
```

## Build & run

```bash
mvn clean install         # build with tests
mvn spring-boot:run       # (Spring Boot) run locally
mvn -Pnative native:compile   # optional GraalVM native image
```

Using a different framework? The application code is identical — only the injection wiring changes. See [Framework Support](/adhar-kit/frameworks). Next, explore the [Concepts](/adhar-kit/concepts) behind the facade or browse the [Modules](/adhar-kit/modules/overview).
