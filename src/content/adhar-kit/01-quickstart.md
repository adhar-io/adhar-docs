---
title: "Quickstart"
section: "Get Started"
order: 2
path: "/adhar-kit/quickstart"
---

# Quickstart

A guided tour. By the end you'll have a service running locally with
HTTP, persistence, tracing, and OpenAPI — about five minutes of work.

## 1. Install the CLI

> Requires Java 17+ and Docker.

```bash
brew install adhar/tap/adhar-cli
adhar --version
```

Other installers: `apt`, `winget`, or the standalone tarball from
[adhar.io/downloads](https://adhar.io/downloads).

## 2. Scaffold a project

```bash
adhar kit new orders-service \
  --framework spring \
  --module data \
  --module observability
cd orders-service
```

Available framework values: `spring`, `quarkus`, `micronaut`,
`helidon`, `vertx`. Modules can be added later with
`adhar kit add <module>`.

## 3. Pull in the BOM

**Maven** — `pom.xml`

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>io.adhar.kit</groupId>
      <artifactId>adhar-kit-bom</artifactId>
      <version>1.4.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

**Gradle** — `build.gradle`

```groovy
dependencies {
  implementation platform("io.adhar.kit:adhar-kit-bom:1.4.0")
  implementation "io.adhar.kit:adhar-kit-starter-spring"
  implementation "io.adhar.kit:adhar-kit-observability"
}
```

## 4. Write the service

```java
package com.example.orders;

import io.adhar.kit.AdharApplication;
import io.adhar.kit.web.AdharController;
import io.adhar.kit.data.Repository;
import io.adhar.kit.observability.Traced;
import jakarta.inject.Inject;

@AdharApplication
public class OrdersService {

    public static void main(String[] args) {
        AdharApplication.run(OrdersService.class, args);
    }

    @AdharController("/orders")
    static class OrdersApi {
        @Inject OrderRepo repo;

        @Traced("order.get")
        Order get(String id) {
            return repo.findById(id).orElseThrow();
        }
    }

    interface OrderRepo extends Repository<Order, String> {}

    record Order(String id, String status) {}
}
```

## 5. Run it

```bash
adhar kit run
```

Then open:

- `http://localhost:8080/orders/o-1` — your endpoint
- `http://localhost:8080/openapi.json` — generated spec
- `http://localhost:8080/health` — readiness & liveness
- `http://localhost:8080/metrics` — Prometheus

## 6. Where to go next

- **[Build a REST endpoint](/adhar-kit/guides/rest-endpoint)** — validation + OpenAPI
- **[Add distributed tracing](/adhar-kit/guides/distributed-tracing)** — OTLP in 3 lines
- **[Resilient client calls](/adhar-kit/guides/resilient-client)** — retries + breakers
- **[CLI reference](/adhar-kit/cli)** — every `adhar kit` command
