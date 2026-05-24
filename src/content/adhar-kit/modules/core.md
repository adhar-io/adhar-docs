---
title: "adhar-kit-core"
section: "Modules"
order: 1
path: "/adhar-kit/modules/core"
---

# adhar-kit-core

> Bootstrap, lifecycle, dependency wiring, and platform conventions —
> the foundation every other Kit module builds on.

**Package:** `io.adhar.kit` · **Status:** stable · **Since:** 1.0

The core module provides the `AdharApplication` entrypoint, the
`ServiceContext` that holds platform-wide singletons (clock, config,
metrics, tracer), and a small `LifecycleManager` that orchestrates
startup and shutdown phases consistently across all five frameworks.

## Key classes

| Class | Purpose |
|-------|---------|
| [`AdharApplication`](/adhar-kit/javadoc/io.adhar.kit/AdharApplication) | Annotation + bootstrap entrypoint. |
| [`ServiceContext`](/adhar-kit/javadoc/io.adhar.kit/ServiceContext) | Holds the clock, config snapshot, metrics & tracer. |
| `LifecycleManager` | Drives `bind → validate → start → ready → drain → stop`. |
| `BeanRegistry` | Adapter-agnostic component lookup. |

## Lifecycle phases

```text
   ┌───────┐   ┌──────────┐   ┌───────┐   ┌───────┐
   │ bind  │──▶│ validate │──▶│ start │──▶│ ready │──▶ HTTP 200 /health
   └───────┘   └──────────┘   └───────┘   └───────┘
                                             │
                                  SIGTERM    ▼
                                          ┌───────┐   ┌──────┐
                                          │ drain │──▶│ stop │
                                          └───────┘   └──────┘
```

Each phase emits a structured log event and a metric
(`adhar.lifecycle.phase.duration`).

## Features

- Single entrypoint: `AdharApplication.run(...)`
- Deterministic startup phases with timeouts per phase
- Graceful shutdown that drains traffic before closing connections
- Pluggable bean discovery (CDI, Spring, Micronaut, manual)
- Hot-reload friendly: `@AdharApplication(devMode = true)`

## Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `adhar.lifecycle.start-timeout` | `30s` | Hard cap on the `start` phase. |
| `adhar.lifecycle.drain-timeout` | `15s` | Time to finish in-flight requests. |
| `adhar.lifecycle.shutdown-grace` | `5s`  | Final delay before exiting JVM. |

## Compatibility

| Framework | Support | Notes |
|-----------|---------|-------|
| Spring | ✅ full | Hooks into `SmartLifecycle` |
| Quarkus | ✅ full | Uses `StartupEvent` / `ShutdownEvent` |
| Micronaut | ✅ full | Uses `ApplicationEventListener` |
| Helidon | ✅ full | Uses Helidon SE lifecycle |
| Vert.x | ✅ full | Uses verticle `start`/`stop` |

## Example

```java
@AdharApplication
public class App {
    public static void main(String[] args) {
        AdharApplication.run(App.class, args);
    }

    @OnReady
    void warmCaches(ServiceContext ctx) {
        ctx.metrics().counter("startup.warm").increment();
    }
}
```

## See also

- [`ServiceContext`](/adhar-kit/javadoc/io.adhar.kit/ServiceContext)
- [Quickstart](/adhar-kit/quickstart)
- [`adhar-kit-config`](/adhar-kit/modules/config)
