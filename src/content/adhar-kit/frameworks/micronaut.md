---
title: "Micronaut"
section: "Frameworks"
order: 3
badge: "4.6.x"
path: "/adhar-kit/frameworks/micronaut"
---

# Micronaut adapter

> AOT-first DI · No reflection · Low memory · JDK 17+

The Micronaut adapter generates all Kit wiring at compile time, so
there's no runtime classpath scanning, no proxy generation, and no
reflection — perfect for low-latency and native image targets.

## Highlights

- Compile-time DI through Micronaut's `BeanDefinition` processor
- Zero reflection — first-class GraalVM native image support
- Micronaut Data, Micronaut Security and Micronaut Tracing wired in
- KSP / annotation-processor friendly

## Artifacts

```groovy
dependencies {
  annotationProcessor "io.adhar.kit:adhar-kit-processor-micronaut:1.4.0"
  implementation       "io.adhar.kit:adhar-kit-starter-micronaut:1.4.0"
}
```

## Example

```java
import io.adhar.kit.AdharApplication;
import io.adhar.kit.web.AdharController;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;

@AdharApplication
public class OrdersService {

    @AdharController("/orders")
    static class OrdersApi {
        @Get("/{id}")
        public Order get(@PathVariable String id) {
            return new Order(id, "PAID");
        }
    }
}
```

## Build-time wiring

```text
javac ──▶ Micronaut AP ──▶ BeanDefinition$Generated
        │
        └─▶ Adhar Kit AP ──▶ AdharRouterModule$Generated
                              + OpenAPI 3.1 spec on disk
```

No runtime classpath scan happens — startup is dominated by JVM warm-up
only.

## See also

- [Quickstart](/adhar-kit/quickstart)
- [`adhar-kit-data`](/adhar-kit/modules/data)
