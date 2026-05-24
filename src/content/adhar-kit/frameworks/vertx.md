---
title: "Vert.x"
section: "Frameworks"
order: 5
badge: "4.5.x"
path: "/adhar-kit/frameworks/vertx"
---

# Vert.x adapter

> Event-loop reactive · Polyglot-ready · JDK 11+ · Massive concurrency

The Vert.x adapter runs your Adhar Kit code as verticles on the Vert.x
event loop. Use the same `@AdharController` annotations — the adapter
generates a non-blocking handler under the hood.

## When to pick Vert.x

| | |
|---|---|
| ⚡ **Real-time** | WebSockets, SSE, MQTT — the bread and butter of Vert.x |
| 🔁 **High concurrency** | Tens of thousands of connections per node |
| 🌐 **Polyglot** | Mix with Kotlin coroutines, Scala, JS, Rust over the bus |

## Artifacts

```xml
<dependency>
  <groupId>io.adhar.kit</groupId>
  <artifactId>adhar-kit-starter-vertx</artifactId>
  <version>1.4.0</version>
</dependency>
```

## Example

```java
import io.adhar.kit.AdharApplication;
import io.adhar.kit.web.AdharController;
import io.vertx.core.Future;

@AdharApplication
public class OrdersService {

    @AdharController("/orders")
    static class OrdersApi {
        @Get("/{id}")
        Future<Order> get(String id) {
            return repo.findByIdAsync(id);    // non-blocking, event loop safe
        }
    }
}
```

## Threading model

```text
   ┌────────────────────────────────────────────────┐
   │  event loop threads (2 × cores)                │
   │  ├─ no blocking calls allowed                  │
   │  └─ @AdharController handlers run here         │
   └────────────────────────────────────────────────┘
   ┌────────────────────────────────────────────────┐
   │  worker pool (configurable)                    │
   │  └─ @Blocking methods are offloaded here       │
   └────────────────────────────────────────────────┘
```

Use `@Blocking` to mark methods that must call legacy blocking APIs;
the Kit dispatches them on the worker pool transparently.

## See also

- [Quickstart](/adhar-kit/quickstart)
- [`adhar-kit-messaging`](/adhar-kit/modules/messaging)
