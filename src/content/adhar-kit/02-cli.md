---
title: "CLI Reference"
section: "Get Started"
order: 3
path: "/adhar-kit/cli"
---

# `adhar kit` — CLI reference

Every command supported by the Adhar Kit CLI.

## Project lifecycle

### `adhar kit new <name>`

Scaffold a new service.

| Flag | Description | Default |
|------|-------------|---------|
| `--framework` | One of `spring`, `quarkus`, `micronaut`, `helidon`, `vertx` | `spring` |
| `--module` | Add a module. Repeatable. | — |
| `--jdk` | Target JDK version | `17` |
| `--package` | Java root package | `com.example.<name>` |

```bash
adhar kit new payments-service --framework quarkus --module messaging
```

### `adhar kit add <module>`

Add a module to an existing project.

```bash
adhar kit add security
```

### `adhar kit run`

Run the service in dev mode with hot reload.

```bash
adhar kit run --profile dev --port 8080
```

### `adhar kit test`

Run tests with TestContainers fixtures from `service.yaml`.

```bash
adhar kit test --module data
```

### `adhar kit build`

Produce a production artifact (jar, native binary, or container image).

```bash
adhar kit build --native --image
```

## Code generation

### `adhar kit generate openapi`

Regenerate the OpenAPI 3.1 spec from annotations.

### `adhar kit generate client`

Generate a typed client jar from an OpenAPI spec.

```bash
adhar kit generate client --spec ./spec/payments.yaml --lang java
```

## Inspection

### `adhar kit doctor`

Validate the local environment, manifest, and configuration.

### `adhar kit info`

Print resolved module versions and framework adapter info.

## Configuration via env

| Variable | Purpose |
|----------|---------|
| `ADHAR_PROFILE` | Active profile (`dev`, `stage`, `prod`) |
| `ADHAR_CONFIG_SOURCES` | Comma-separated source URIs |
| `ADHAR_OTEL_ENDPOINT` | OTLP collector endpoint |
| `ADHAR_LOG_FORMAT` | `json` or `text` |
