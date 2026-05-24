---
title: "adhar-kit-messaging"
section: "Modules"
order: 4
path: "/adhar-kit/modules/messaging"
---

# adhar-kit-messaging

> A single `@Listener` / `EventPublisher` API over Kafka, NATS, RabbitMQ
> and Pulsar — with schema registry, retries and DLQ handling.

**Package:** `io.adhar.kit.messaging` · **Status:** stable · **Since:** 1.1

## Topology

```text
   producer              broker            consumer group
 ┌───────────┐        ┌──────────┐       ┌──────────────┐
 │ Publisher │ ─────▶ │  Kafka / │ ────▶ │  @Listener   │
 │  .publish │        │  NATS    │       │   handler    │
 └───────────┘        └────┬─────┘       └──────┬───────┘
                            │ on failure              │
                            ▼                         ▼
                       ┌─────────┐               ┌─────────┐
                       │  retry  │ ─── max ───▶ │   DLQ   │
                       └─────────┘               └─────────┘
```

## Features

- Brokers: **Kafka**, **NATS JetStream**, **RabbitMQ**, **Pulsar**
- Apache Avro / JSON Schema / Protobuf with schema-registry integration
- At-least-once with idempotency keys; transactional outbox helper
- Built-in retry, exponential backoff and Dead-Letter-Queue routing
- Consumer-side concurrency, partition assignment, manual ack
- Observability: per-record spans + `messaging.*` metrics

## Publishing

```java
@Inject EventPublisher events;

@Tx
void place(Order o) {
    repo.save(o);
    events.publish("orders.placed", new OrderPlaced(o.id(), o.sku()));
}
```

## Consuming

```java
@Listener(topic = "orders.placed", group = "billing", retries = 5)
void onPlaced(OrderPlaced evt, MessageContext ctx) {
    invoices.create(evt.orderId());
    ctx.ack();
}
```

## Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `adhar.messaging.broker` | `kafka` | One of `kafka`, `nats`, `rabbit`, `pulsar`. |
| `adhar.messaging.bootstrap` | — | Comma-separated broker URLs. |
| `adhar.messaging.schema-registry.url` | — | Avro/Proto schema registry. |
| `adhar.messaging.retry.max-attempts` | `5` | Per-listener default. |
| `adhar.messaging.dlq.suffix` | `.dlq` | DLQ topic suffix. |

## Delivery semantics

| Mode | Producer | Consumer | Notes |
|------|----------|----------|-------|
| at-most-once | fire & forget | auto-commit | lossy, fastest |
| at-least-once *(default)* | acks=all | manual ack | requires idempotency |
| exactly-once | tx producer | tx consumer | Kafka only |

## See also

- [`EventPublisher`](/adhar-kit/javadoc/io.adhar.kit.messaging/EventPublisher)
- [Transactional outbox guide](/adhar-kit/guides/transactional-outbox)
