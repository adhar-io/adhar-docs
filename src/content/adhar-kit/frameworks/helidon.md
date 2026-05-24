---
title: "Helidon"
section: "Frameworks"
order: 4
badge: "4.1.x"
path: "/adhar-kit/frameworks/helidon"
---

# Helidon adapter

> Helidon Níma · Virtual threads · JDK 21+ · Blocking that scales

The Helidon adapter targets **Helidon 4 / Níma**, which uses JDK 21
virtual threads end-to-end. You write straight-line blocking code; the
runtime gives you reactive-grade concurrency.

## Why Helidon Níma

| | |
|---|---|
| 🧵 **Virtual threads** | One thread per request, millions concurrent |
| 🧘 **Blocking style** | No reactive operators, no callback hell |
| ⚡ **Fast** | Helidon Níma web server is among the fastest on the JVM |
| 🪶 **Small** | < 30 MB native binary |

## Artifacts

```xml
<dependency>
  <groupId>io.adhar.kit</groupId>
  <artifactId>adhar-kit-starter-helidon</artifactId>
  <version>1.4.0</version>
</dependency>
```

## Example

```java
import io.adhar.kit.AdharApplication;
import io.adhar.kit.web.AdharController;
import io.helidon.webserver.http.PathParam;

@AdharApplication
public class OrdersService {

    @AdharController("/orders")
    static class OrdersApi {
        @Get("/{id}")
        Order get(@PathParam String id) {
            return repo.findById(id).orElseThrow();   // blocking!
        }
    }
}
```

Every request runs on its own virtual thread — `Thread.sleep`,
synchronous JDBC, and even classic libraries all scale linearly.

## See also

- [Quickstart](/adhar-kit/quickstart)
- [`adhar-kit-resilience`](/adhar-kit/modules/resilience)
