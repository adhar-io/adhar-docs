---
title: "Messaging"
section: "Modules"
order: 20
path: "/adhar-kit/modules/messaging"
---

# Messaging

`adhar-kit-messaging` is an event-driven messaging facade over Kafka and RabbitMQ, with CloudEvents 1.0 envelopes, pub/sub, retry with dead-letter queues, and deduplication.

> **Status:** the Spring Boot auto-configuration path with real Kafka/RabbitMQ beans is implemented; some documented annotations and `sendAndReceive` request-reply are marked as in progress in the module README.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-messaging</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>

<!-- Choose your broker -->
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

## Key APIs

- `MessagingFacade` — `publish`, `subscribe`, `unsubscribe`
- `RetryingMessageHandler`, `DeadLetterPublisher`, `DeduplicatingMessageHandler`
- `CloudEventAdapter`, `Message` / `Message.builder()`, `MessagePublisher`, `MessageListener`

## Publish an event

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

Events are wrapped in a CloudEvents envelope, so consumers on any platform component get a standard, self-describing message.

## Reliability

- **Retry** with configurable backoff on transient handler failures.
- **Dead-letter queue** — messages exhausting retries route to `<topic>.dlq`.
- **Deduplication** — an optional processed-message store drops duplicates (idempotent consumers).

## Configuration

```yaml
adhar:
  messaging:
    enabled: true
    kafka:
      enabled: true
      bootstrap-servers: localhost:9092
      producer: { acks: all, enable-idempotence: true }
      consumer: { group-id: orders, auto-offset-reset: earliest }
    common:
      enable-cloud-events: true
      retry: { max-attempts: 3, backoff-delay: 1000, backoff-multiplier: 2.0 }
      dlq:   { enabled: true, topic-suffix: .dlq }
```

For guaranteed publish-on-commit semantics, combine with the [persistence](/adhar-kit/modules/persistence) transactional outbox. On the [Adhar Platform](/docs), point `bootstrap-servers` at the bundled Kafka.
