---
title: "Overview"
section: "Get Started"
order: 1
icon: "rocket"
badge: "v1.4"
path: "/adhar-kit"
---

# Adhar Kit

> The enterprise Java microservices toolkit. **One** programming model.
> **Five** Java frameworks. **Zero** boilerplate.

Adhar Kit gives every team the same annotations, the same CLI, the same
observability story — regardless of whether the underlying service runs on
**Spring Boot, Quarkus, Micronaut, Helidon, or Vert.x**. Write your
business logic once; let the Kit translate it to the framework you've
standardised on.

> **TL;DR** — `adhar kit new my-service` then `adhar kit run`. You get HTTP,
> persistence, OpenAPI 3.1, OTel tracing, metrics, health checks and
> graceful shutdown wired the same way on every framework.

## Why teams choose the Kit

| | |
|---|---|
| ⚡ **10× faster bootstrap** | New service from `adhar kit new` to deployed in under 10 minutes. |
| 🧩 **Framework-agnostic** | Switch frameworks without rewriting business code. |
| 🔭 **Observability baked in** | OpenTelemetry, Micrometer, structured logs — zero config. |
| 🛡️ **Production defaults** | Resilience, security, secrets management out of the box. |
| 📚 **Live OpenAPI 3.1** | Specs generated at build time — always in sync. |
| 🧪 **TestContainers wired** | `@AdharTest` spins up Postgres, Kafka, Vault automatically. |
| 🏎️ **Native-image ready** | All adapters build to GraalVM / Mandrel native binaries. |
| 🧰 **Pluggable SPI** | Bring your own metrics exporter, secrets backend, or auth provider. |

## Supported frameworks

| Framework | Version | JDK | Native image | Reactive | Best for |
|-----------|---------|-----|--------------|----------|----------|
| **Spring Boot** | 3.3.x | 17+ | ✅ | Optional (WebFlux) | Mature teams, large ecosystems |
| **Quarkus** | 3.15.x | 17+ | ✅ (Mandrel) | ✅ | Serverless, fast startup |
| **Micronaut** | 4.6.x | 17+ | ✅ | ✅ | AOT-first, low memory |
| **Helidon** | 4.1.x | 21+ | ✅ (Loom) | Virtual threads | Modern blocking with Loom |
| **Vert.x** | 4.5.x | 11+ | ✅ | ✅ (event-loop) | Real-time, high concurrency |

## Architecture at a glance

```text
┌──────────────────────────────────────────────────────────────┐
│                  Your service (business logic)               │
├──────────────────────────────────────────────────────────────┤
│  @AdharController  @Repository  @Listener  @Traced  @Secured │
├──────────────────────────────────────────────────────────────┤
│            Adhar Kit core (lifecycle, context, SPI)          │
├──────────────────────────────────────────────────────────────┤
│   Spring   │  Quarkus  │ Micronaut │  Helidon  │   Vert.x    │
└──────────────────────────────────────────────────────────────┘
```

The Kit is layered so business code never touches the framework directly.
The **core** module defines the contracts; thin **adapters** translate
them to each framework's idioms at compile time.

## Request lifecycle

```text
   client ──▶ ┌────────────┐ ──▶ ┌─────────────┐ ──▶ ┌──────────┐
              │  AdharCtrl │     │  Interceptor│     │ Handler  │
              │  routing   │     │  chain       │     │ (yours)  │
              └─────┬──────┘     └──────┬──────┘     └────┬─────┘
                    │                   │                  │
            ┌───────▼───────┐   ┌───────▼───────┐  ┌───────▼───────┐
            │  validation   │   │  @Traced /    │  │  @Repository  │
            │  (Jakarta)    │   │  @Secured /   │  │  @EventPub    │
            │               │   │  @Timed       │  │  @Cached      │
            └───────────────┘   └───────────────┘  └───────────────┘
```

Each stage is observable: a span is opened, metrics are recorded, and
errors are mapped to RFC 7807 `application/problem+json` automatically.

## Get going in 60 seconds

```bash
# 1. Scaffold
adhar kit new orders-service --framework spring

# 2. Run
cd orders-service && adhar kit run

# 3. Open
open http://localhost:8080/openapi.json
```

> 💡 **Pro tip** — pass `--module data,messaging,resilience` to wire the
> persistence, Kafka and circuit-breaker modules during scaffolding.

Then dive into the **[Quickstart](/adhar-kit/quickstart)** for a guided
walkthrough, browse the **[Modules](/adhar-kit/modules/core)**, or jump
into the **[API Reference](/adhar-kit/javadoc/io.adhar.kit/AdharApplication)**.

## Module map

| Module | Package | Purpose |
|--------|---------|---------|
| `adhar-kit-core` | `io.adhar.kit` | Bootstrap, lifecycle, SPI |
| `adhar-kit-web` | `io.adhar.kit.web` | HTTP, REST, OpenAPI |
| `adhar-kit-data` | `io.adhar.kit.data` | JDBC/JPA repositories |
| `adhar-kit-messaging` | `io.adhar.kit.messaging` | Kafka, NATS, Pulsar |
| `adhar-kit-observability` | `io.adhar.kit.observability` | OTel, Micrometer, logs |
| `adhar-kit-resilience` | `io.adhar.kit.resilience` | Retries, breakers, bulkheads |
| `adhar-kit-security` | `io.adhar.kit.security` | JWT, OAuth2, mTLS |
| `adhar-kit-config` | `io.adhar.kit.config` | Profiles, Vault, env |
| `adhar-kit-test` | `io.adhar.kit.test` | TestContainers, fixtures |

## How these docs work

Every page on this site is a markdown file under
`src/content/adhar-kit/`. Drop a new `.md` file in, set the frontmatter
(`title`, `section`, `order`, `badge`), and it shows up in the sidebar —
no React, no build step.

```yaml
---
title: My new page
section: Guides
order: 3
badge: beta
---
```
