---
title: "FAQ & Troubleshooting"
section: "Get Started"
order: 4
path: "/adhar-kit/faq"
---

# FAQ & Troubleshooting

## General

### Is Adhar Kit production-ready?

Yes. The Kit ships with semver guarantees on the `io.adhar.kit.*` public
APIs and is used in production by teams running thousands of services.

### Can I mix frameworks within a single project?

No. A single service targets one framework. Different services in your
fleet can target different frameworks freely — the Kit's annotations are
identical across all five.

### How does the Kit handle Java versions?

| Framework | Minimum JDK |
|-----------|-------------|
| Spring Boot, Quarkus, Micronaut | 17 |
| Helidon | 21 (virtual threads) |
| Vert.x | 11 |

The Kit itself is compiled against Java 17. Bytecode toolchains for
older runtimes are available on request.

## Build & run

### `adhar kit run` fails with "port already in use"

Another process owns `:8080`. Either stop it or pass `--port`.

```bash
adhar kit run --port 9090
```

### Native image build is slow

Native builds compile ahead-of-time and inherently take longer than JVM
builds. Use `--native` only for release builds; iterate on JVM during
development.

### "No suitable adapter found for framework X"

Add the matching starter to your project:

```xml
<dependency>
  <groupId>io.adhar.kit</groupId>
  <artifactId>adhar-kit-starter-spring</artifactId>
</dependency>
```

## Observability

### Spans aren't showing up in Jaeger / Tempo

1. Confirm `adhar-kit-observability` is on the classpath.
2. Set `ADHAR_OTEL_ENDPOINT` (or `adhar.observability.otlp.endpoint`).
3. Check the service log line `OTel exporter ready → <endpoint>` at startup.

### Metrics endpoint returns 404

The metrics endpoint defaults to `/metrics`. Confirm Micrometer is on
the classpath and `adhar.observability.metrics.enabled=true`.

## Data

### "No transaction in progress" when calling a repository method

You need either `@Transactional` on the calling method, or the
repository must be invoked through a transactional service bean.

### `MigrationRunner` doesn't pick up my SQL

The default location is `db/migration/`. Override with
`adhar.data.migrations.location=classpath:my/path`.

## Getting help

- **Docs:** you're here.
- **GitHub:** [github.com/adhar-platform/adhar-kit](https://github.com/adhar-platform/adhar-kit)
- **Community:** `#adhar-kit` on [Adhar Slack](https://slack.adhar.io)
- **Commercial support:** [adhar.io/support](https://adhar.io/support)
