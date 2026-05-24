---
title: "Quarkus"
section: "Frameworks"
order: 2
badge: "3.15.x"
path: "/adhar-kit/frameworks/quarkus"
---

# Quarkus adapter

> Supersonic, subatomic Java · JDK 17+ · Mandrel native binaries

The Quarkus adapter integrates Adhar Kit with Quarkus' build-time
augmentation pipeline. All Kit metadata is resolved at build time,
producing a binary that starts in tens of milliseconds.

## Why Quarkus

| | |
|---|---|
| ⚡ **Cold-start** | ~25 ms JVM · ~10 ms native |
| 🪶 **Memory** | ~40 MB native RSS for a typical CRUD service |
| 🧬 **DEV mode** | `./mvnw quarkus:dev` — live reload, no daemon |
| ☁️ **Cloud-native** | First-class K8s, Knative, OpenShift |

## Artifacts

```xml
<dependency>
  <groupId>io.adhar.kit</groupId>
  <artifactId>adhar-kit-starter-quarkus</artifactId>
  <version>1.4.0</version>
</dependency>
```

## Example

```java
import io.adhar.kit.AdharApplication;
import io.adhar.kit.web.AdharController;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

@AdharApplication
public class OrdersService {

    @AdharController("/orders")
    static class OrdersApi {
        @GET @Path("/{id}")
        public Order get(@PathParam("id") String id) {
            return new Order(id, "PAID");
        }
    }
}
```

## Native build

```bash
./mvnw package -Dnative
./target/orders-runner          # ~45 MB binary
```

```text
                JVM           Native
  start-up      ~700 ms       ~25 ms
  first req     ~120 ms        ~5 ms
  rss (idle)    ~180 MB       ~42 MB
```

## See also

- [Quickstart](/adhar-kit/quickstart)
- [`adhar-kit-observability`](/adhar-kit/modules/observability)
