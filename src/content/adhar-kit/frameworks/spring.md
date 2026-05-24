---
title: "Spring Boot"
section: "Frameworks"
order: 1
badge: "3.3.x"
path: "/adhar-kit/frameworks/spring"
---

# Spring Boot adapter

> Convention over configuration · Requires JDK 17+ · Spring Boot 3.2 – 3.3

The Spring Boot adapter wires Adhar Kit into the Spring application
context, auto-configuration, and the broader Spring ecosystem
(Data, Security, Cloud).

## Highlights

- Auto-configuration via `META-INF/spring/...AutoConfiguration.imports`
- Native Actuator integration (`/actuator/health`, `/actuator/metrics`)
- Compatible with Spring Cloud Config, Discovery, Gateway
- Tested against Spring Boot 3.2 and 3.3
- GraalVM native image supported via `spring-aot`

## Bootstrap

```text
JVM start ──▶ SpringApplication.run
            └─▶ AdharBootstrap (BeanDefinitionRegistryPostProcessor)
                  ├─ scan @AdharController → register RequestMapping
                  ├─ scan @Repository       → register Spring Data repo
                  ├─ scan @Listener         → register Kafka consumer
                  └─ ServiceContext bean    → expose clock / metrics
```

## Artifacts

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>io.adhar.kit</groupId>
      <artifactId>adhar-kit-bom-spring</artifactId>
      <version>1.4.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependencies>
  <dependency>
    <groupId>io.adhar.kit</groupId>
    <artifactId>adhar-kit-starter-spring</artifactId>
  </dependency>
</dependencies>
```

## Minimal service

```java
import io.adhar.kit.AdharApplication;
import io.adhar.kit.web.AdharController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@AdharApplication
public class OrdersService {

    public static void main(String[] args) {
        AdharApplication.run(OrdersService.class, args);
    }

    @AdharController("/orders")
    static class OrdersApi {
        @GetMapping("/{id}")
        public Order get(@PathVariable String id) {
            return new Order(id, "PAID");
        }
    }

    record Order(String id, String status) {}
}
```

## Property mapping

The Kit's standard properties map onto Spring's:

| Adhar Kit | Spring Boot |
|-----------|-------------|
| `adhar.web.port` | `server.port` |
| `adhar.data.url` | `spring.datasource.url` |
| `adhar.otel.endpoint` | `management.otlp.tracing.endpoint` |

## Native image

```bash
./mvnw -Pnative native:compile
./target/orders-service     # ~50 MB, ~30 ms cold-start
```

## See also

- [Quickstart](/adhar-kit/quickstart)
- [`adhar-kit-web`](/adhar-kit/modules/web)
