---
title: "Messaging"
section: "Modules"
order: 20
path: "/adhar-kit/modules/messaging"
---

# Messaging

Kafka and RabbitMQ have incompatible APIs, and neither gives you retry, dead-lettering, or idempotent consumption out of the box. `adhar-kit-messaging` **puts one publish/subscribe API over both and wraps every subscription in the reliability handlers you would otherwise write per consumer.** Payloads travel as CloudEvents 1.0, so a consumer in another language or another team can read them without knowing who produced them.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-messaging` |
| Built on | Spring for Apache Kafka, Spring AMQP, CloudEvents Java SDK; optional Micrometer, Dapr |
| Entry points | `MessagingFacade`, `Message`, `MessagePublisher`, `MessageListener` |
| Config prefix | `adhar.messaging` |
| Use it when | You publish domain events across services and need retry, DLQ, and dedup as defaults |

> **Framework support:** only the Spring Boot auto-configuration path is implemented. The `@CloudEventPublisher` / `@CloudEventListener` / `@CloudEventHandler` annotations exist as types but no aspect processes them — use the facade.

## How it works

`MessagingFacade` holds a `MessagePublisher` and a `MessageListener`, both supplied by auto-configuration based on what is on the classpath and which broker beans exist. Every subscription made through the facade is wrapped in a handler chain before your `Consumer<T>` ever runs.

```text
 publish(topic, payload)
        │
        ▼
  CloudEventAdapter ──▶ Message<T> (ce-id, ce-type, ce-source, ce-time)
        │
        ▼
  MessagePublisher ──▶ Kafka topic / RabbitMQ exchange
                                     │
                                     ▼
                              MessageListener
                                     │
        ┌────────────────────────────┴───────────────────────────┐
        │  DeduplicatingMessageHandler   (ce-id seen before?)    │
        │            ▼                                            │
        │  RetryingMessageHandler        (n attempts, backoff)   │
        │            ▼                                            │
        │  your Consumer<T>                                       │
        │            ▼ still failing                              │
        │  DeadLetterPublisher ──▶ <topic>.dlq                    │
        └─────────────────────────────────────────────────────────┘
```

Deduplication keys on the CloudEvents `ce-id` header, falling back to the message id. It is off by default because it needs a store with the right lifetime — the bundled `InMemoryProcessedMessageStore` is per-instance and TTL-bounded, which is sufficient for redelivery within one consumer but not for cross-instance exactly-once.

Broker selection is conditional. Kafka beans are created when `KafkaTemplate` is on the classpath, `adhar.messaging.kafka.enabled` is not `false`, and a `KafkaTemplate` bean exists; RabbitMQ likewise on `RabbitTemplate`. **If no broker beans are present the facade falls back to a logging stub** — it logs a warning and throws nothing, which is convenient in tests and dangerous if you assumed a broker was wired.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-messaging</artifactId>
    <version>0.1.0</version>
</dependency>

<!-- Choose your broker -->
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

## Key APIs

- **`MessagingFacade`** — `publish(topic, payload)`, `publish(topic, key, payload)` (the key drives Kafka partitioning and so per-key ordering), `subscribe(topic, type, handler)`, `subscribe(topic, consumerGroup, type, handler)` returning a subscription id, `unsubscribe(id)`, `sendAndReceive(topic, request, replyType)`, and `publishViaOutbox(destination, payload)`.
- **`Message<T>`** — the CloudEvents-shaped envelope: `id`, `payload`, `headers`, `timestamp`, `destination`, `routingKey`, `source`, `type`, `specVersion`, `dataContentType`, `dataSchema`, `subject`.
- **`CloudEventAdapter`** — `toCloudEvent(message)` / `fromCloudEvent(cloudEvent)`, registered whenever the CloudEvents SDK is present and `adhar.messaging.cloudevents.enabled` is not `false`.
- **`MessagePublisher` / `MessageListener`** — the transport SPIs. Implement either to add a broker; your bean wins over the built-ins.
- **`RetryingMessageHandler`, `DeadLetterPublisher`, `DeduplicatingMessageHandler`** — the reliability chain, applied automatically but usable standalone.
- **`RequestReplyClient`** — backs `sendAndReceive`; `KafkaRequestReplyClient` and `RabbitRequestReplyClient` are wired alongside the matching broker.
- **`OutboxStore` / `OutboxRelay`** — the module's own outbox (`JdbcOutboxStore` when a `DataSource` exists, otherwise in-memory), enabled by `adhar.messaging.outbox.enabled`.
- **`MessagingMetrics`** — publish, consume, retry, DLQ, and duplicate counters plus consume latency, registered when Micrometer and a `MeterRegistry` are present.

## Minimal: publish an event

```java
@Service
public class OrderService {
    @Autowired private MessagingFacade messaging;

    public void createOrder(OrderRequest request) {
        Order order = process(request);
        messaging.publish("order-events",
            new OrderCreatedEvent(order.getId(), order.getCustomerId(), Instant.now()));
    }
}
```

## Realistic: keyed publish, grouped consumer, idempotency

```java
@Service
public class OrderEventFlow {
    private final MessagingFacade messaging;
    private String subscriptionId;

    public OrderEventFlow(MessagingFacade messaging) { this.messaging = messaging; }

    public void publish(Order order) {
        // key = customerId keeps one customer's events on one partition, in order
        messaging.publish("order-events", order.getCustomerId(),
            new OrderCreatedEvent(order.getId(), order.getCustomerId(), Instant.now()));
    }

    @PostConstruct
    public void consume() {
        subscriptionId = messaging.subscribe(
            "order-events", "fulfilment",          // consumer group
            OrderCreatedEvent.class,
            event -> fulfilment.reserve(event.orderId()));
    }

    @PreDestroy
    public void stop() { messaging.unsubscribe(subscriptionId); }
}
```

```yaml
adhar:
  messaging:
    kafka:
      bootstrap-servers: kafka.adhar.svc:9092
      producer: { acks: all, retries: 5 }
      consumer: { group-id: fulfilment, auto-offset-reset: earliest, enable-auto-commit: false }
    common:
      retry: { max-attempts: 5, initial-delay-ms: 500, backoff-multiplier: 2.0, max-delay-ms: 10000 }
      dlq:   { enabled: true, topic-suffix: .dlq }
      dedup: { enabled: true, ttl-ms: 900000 }
```

A handler that throws is retried up to `max-attempts` with exponential backoff; on exhaustion `DeadLetterPublisher` forwards the message to `order-events.dlq`. There is a loop guard so a failing DLQ consumer does not produce `order-events.dlq.dlq`.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.messaging.enabled` | Master switch | `true` |
| `adhar.messaging.kafka.enabled` | Wire Kafka publisher/listener | `true` |
| `adhar.messaging.kafka.bootstrap-servers` | Broker list | `localhost:9092` |
| `adhar.messaging.kafka.producer.acks` | Producer durability | `all` |
| `adhar.messaging.kafka.producer.retries` | Producer-level retries | `3` |
| `adhar.messaging.kafka.consumer.group-id` | Default consumer group | `adhar-consumer-group` |
| `adhar.messaging.kafka.consumer.auto-offset-reset` | Offset reset policy | `latest` |
| `adhar.messaging.kafka.consumer.max-poll-records` | Records per poll | `500` |
| `adhar.messaging.rabbitmq.enabled` | Wire RabbitMQ publisher/listener | `true` |
| `adhar.messaging.rabbitmq.default-exchange` | Exchange used when unspecified | `adhar.default` |
| `adhar.messaging.rabbitmq.listener.prefetch-count` | Unacked messages per consumer | `250` |
| `adhar.messaging.rabbitmq.listener.concurrency` | Starting consumer threads | `1` |
| `adhar.messaging.cloudevents.enabled` | Register `CloudEventAdapter` | `true` |
| `adhar.messaging.common.retry.max-attempts` | Handler retry attempts | `3` |
| `adhar.messaging.common.retry.initial-delay-ms` | First retry delay | `200` |
| `adhar.messaging.common.retry.backoff-multiplier` | Backoff growth | `2.0` |
| `adhar.messaging.common.retry.max-delay-ms` | Backoff ceiling | `5000` |
| `adhar.messaging.common.dlq.enabled` | Route exhausted messages to a DLQ | `true` |
| `adhar.messaging.common.dlq.topic-suffix` | DLQ destination suffix | `.dlq` |
| `adhar.messaging.common.dedup.enabled` | Idempotent consumption | `false` |
| `adhar.messaging.common.dedup.ttl-ms` | How long an id is remembered | `600000` |
| `adhar.messaging.common.reply.timeout-ms` | `sendAndReceive` timeout | `30000` |
| `adhar.messaging.outbox.enabled` | Module-local transactional outbox | `false` |
| `adhar.messaging.outbox.table-name` | JDBC outbox table | `adhar_outbox` |

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `publish` logs but nothing reaches the broker | No `KafkaTemplate`/`RabbitTemplate` bean, so the facade is the logging stub | Add the broker starter and its connection config; check startup logs for the warning |
| Events published for a transaction that rolled back | `publish` is not transactional | Use `publishViaOutbox`, or the [persistence](/adhar-kit/modules/persistence) outbox |
| Duplicate side effects after a rebalance | At-least-once delivery, dedup off | Set `common.dedup.enabled: true`, and make handlers idempotent anyway |
| Per-entity events arrive out of order | Published without a key, so they spread across partitions | Pass the entity id as the key in `publish(topic, key, payload)` |
| DLQ filling silently | Handler throws on every attempt | Alert on the DLQ counter from `MessagingMetrics`; inspect `<topic>.dlq` |
| `sendAndReceive` times out | No reply produced within `common.reply.timeout-ms` | Confirm a responder exists on the reply destination, or raise the timeout |
| Consumer replays the whole topic on first start | `auto-offset-reset` is `earliest` for a brand-new group | Choose the policy deliberately per consumer group |

## See also

- [Event Sourcing](/adhar-kit/modules/event-sourcing) — its `KafkaEventBus` distributes domain events over the same broker.
- [Persistence](/adhar-kit/modules/persistence) — the transactional outbox for publish-on-commit.
- [Dapr](/adhar-kit/modules/dapr) — enables the pub/sub-component publisher path.
- [Platform Services](/docs/core-concepts/platform-services) — the bundled Kafka to point `bootstrap-servers` at.
