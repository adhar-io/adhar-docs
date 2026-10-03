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

> **Framework support:** only the Spring Boot auto-configuration path is implemented. The `@CloudEventPublisher` / `@CloudEventListener` / `@CloudEventHandler` annotations exist as types, but nothing in the repository reads them — no aspect, no bean post-processor, no registrar. Every attribute they declare (`condition`, `partitionKey`, `maxRetries`, `enableDlq`, `async`) is inert. Use the facade.

## The most dangerous behaviour on this page

Broker wiring is conditional, and `MessagingFacade` is constructed with whatever `MessagePublisher` and `MessageListener` beans happen to exist — possibly none. The two halves then fail in opposite ways:

- **Publishing fails loudly.** With no `MessagePublisher`, `publish` throws `MessagingException("No MessagePublisher configured - cannot publish to topic '<topic>'...")`. You find out immediately.
- **Subscribing fails silently.** With no `MessageListener`, `subscribe` logs **one** warning — *"handler for topic X was stored but will never receive messages (using stub)"* — stores your handler in a map, and returns a perfectly ordinary-looking `sub-1` subscription id. `getSubscriptionCount()` increments. No broker subscription exists. **Nothing is logged again, ever.** A service wired this way looks healthy and processes nothing.

Treat that single WARN at startup as a fatal condition. The simplest guard is to assert on startup that `messaging.isConnected()` is true (it returns whether a publisher is present) and to fail fast otherwise.

Broker selection gates: Kafka beans require `KafkaTemplate` on the classpath, `adhar.messaging.kafka.enabled` not `false`, and a `KafkaTemplate` bean; the listener additionally needs a `ConcurrentKafkaListenerContainerFactory` and a `KafkaListenerEndpointRegistry`. RabbitMQ needs `RabbitTemplate` for the publisher and a `ConnectionFactory` for the listener. Dapr needs `adhar.dapr.enabled=true` explicitly. **A half-wired state is possible and common**: a `KafkaTemplate` without a container factory gives you a working publisher and a silent consumer.

## How it works

`MessagingFacade` holds a `MessagePublisher` and a `MessageListener`, both supplied by auto-configuration. Every subscription made through the facade is wrapped in a handler chain before your `Consumer<T>` ever runs.

```diagram
kit-messaging-chain
```

The chain composes outside-in as **dedup → retry → your handler**. Both outer layers are optional and only added when enabled.

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

- **`MessagingFacade`** — `publish(topic, payload)`, `publish(topic, key, payload)`, `subscribe(topic, type, handler)`, `subscribe(topic, consumerGroup, type, handler)` returning a subscription id, `unsubscribe(id)`, `sendAndReceive(topic, request, replyType)`, `publishViaOutbox(destination, payload)`, `isConnected()`, `getSubscriptionCount()`.
- **`Message<T>`** — the CloudEvents-shaped envelope: `id`, `payload`, `headers`, `timestamp`, `destination`, `routingKey`, `source`, `type`, `specVersion`, `dataContentType`, `dataSchema`, `subject`. `id` is always a fresh UUID and `timestamp` always `Instant.now()`; neither is settable, and `Message.Builder` has **no** `id(...)` method despite what some Javadoc examples show. Defaults: `source` = `urn:adhar:messaging`, `type` = the payload's simple class name, `specVersion` = `1.0`, `dataContentType` = `application/json`.
- **`CloudEventAdapter`** — `toCloudEvent(message)` / `fromCloudEvent(cloudEvent)`, registered whenever the CloudEvents SDK is present and `adhar.messaging.cloudevents.enabled` is not `false`.
- **`MessagePublisher` / `MessageListener`** — the transport SPIs. Implement either to add a broker; your bean wins over the built-ins.
- **`RetryingMessageHandler`, `DeadLetterPublisher`, `DeduplicatingMessageHandler`** — the reliability chain, applied automatically but usable standalone.
- **`RequestReplyClient`** — backs `sendAndReceive`; `KafkaRequestReplyClient` and `RabbitRequestReplyClient` are wired alongside the matching broker.
- **`OutboxStore` / `OutboxRelay`** — the module's own outbox (`JdbcOutboxStore` when a `DataSource` exists, otherwise in-memory), enabled by `adhar.messaging.outbox.enabled`.
- **`MessagingMetrics`** — counters named `adhar.messaging.publish`, `.publish.failure`, `.consume`, `.consume.failure`, `.retry`, `.dlq`, `.duplicate`, each tagged `destination` (literally `unknown` when null). Registered when Micrometer and a `MeterRegistry` are present.

## Delivery semantics

**At-least-once at best, and at-most-once with the defaults.** Both listeners discard the handler's return value and swallow its exceptions:

- **Kafka.** `enable-auto-commit` defaults to `true`, which selects Spring Kafka's `AckMode.BATCH` — the poll batch's offsets are committed after the records are handed to the listener, regardless of whether your handler succeeded. A handler that throws, or whose retries are exhausted, does not hold the offset back. Exceptions inside the record loop are caught and logged at ERROR, and the offset still advances. Set `enable-auto-commit: false` and you get `AckMode.MANUAL`, but the facade's message context never calls `acknowledge()` on a real `Acknowledgment` — **so offsets are then never committed at all** and the consumer re-reads from its last committed position on every restart.
- **RabbitMQ.** The ack mode is read from the *Kafka* property `adhar.messaging.kafka.consumer.enable-auto-commit`; `true` (the default) means `AcknowledgeMode.AUTO`, so a thrown exception nacks and a `false` return acks. Set it to `false` and a failure does `basicReject(tag, requeue = true)` — an unbounded requeue loop with no redelivery counter.

The practical consequence: **make every handler idempotent, and never treat a successful `publish` as a successful consume.** For publish-on-commit, do not call `publish` inside a transaction — use `publishViaOutbox`, or the [persistence](/adhar-kit/modules/persistence) outbox.

## Ordering

| Scope | Guarantee |
| --- | --- |
| `publish(topic, payload)` on Kafka | **None.** No key header is set, so records spread across partitions |
| `publish(topic, key, payload)` on Kafka | Per-partition, which for a fixed key means **per-key** — the key becomes `KafkaHeaders.KEY` and the configured partitioner decides |
| Consumption on Kafka | Per-partition. Your handler runs **synchronously on the container's poll thread** — there is no dispatch executor anywhere in the module, so ordering is not broken by the kit |
| RabbitMQ | **None by default.** The listener container is created with `concurrency` 1 but `max-concurrency` 10, so it scales to ten competing consumers on one queue |

Two things erode even per-partition ordering. Container concurrency is inherited from your own `ConcurrentKafkaListenerContainerFactory`, not set by this module — with concurrency above one you get several threads owning disjoint partitions, which is still per-partition but no longer per-thread. And because retry backoff sleeps on the poll thread (see below), one failing message stalls its whole partition.

## Deduplication

`DeduplicatingMessageHandler` keys on the CloudEvents `ce-id` header, falling back to a `messageId` header and then to the context's message id. It wraps the retry handler, so **a duplicate is rejected before any attempt is made**.

Dedup is off by default because the bundled `InMemoryProcessedMessageStore` is per-facade-instance: a `ConcurrentHashMap` of id to first-seen instant, purged lazily by a full `removeIf` scan on every single call. It is bounded only by `ttl-ms` (default 600 000), so its steady-state size is ten minutes of distinct ids and its cost is O(entries) per message. It is sufficient for redelivery within one consumer; it is **not** cross-instance exactly-once.

Two sharp edges. The id is marked processed *before* your handler runs and is never unmarked, so a message that exhausts its retries and lands in the DLQ will still be swallowed as a duplicate if the broker redelivers it. And when neither header is present, the context's message id is a freshly generated UUID, so dedup silently never fires.

## Retry and dead-lettering

`RetryingMessageHandler` catches **every** `Exception` with no retryable/non-retryable classification, and also retries a handler that returns `false` without throwing. The sleep between attempts is `min(initialDelay × multiplier^(n-1), maxDelay)` with no jitter — with the defaults that is 200 ms then 400 ms, so three attempts means two sleeps. **Those sleeps happen on the broker's consumer thread.** Long backoffs therefore stall the partition and, past `max.poll.interval.ms`, trigger a Kafka rebalance.

On exhaustion, `DeadLetterPublisher` forwards the message to `<destination><topic-suffix>` with `x-dlq: true`, `x-dlq-original-destination`, `x-dlq-attempts`, and — when there was an exception — `x-dlq-exception-class` and `x-dlq-exception-message`. Two independent loop guards refuse to re-publish: one checks the `x-dlq` header, the other checks whether the destination already ends with the suffix. The DLQ message is sent without a partition key, so DLQ ordering is not preserved.

If no `MessagePublisher` exists, no `DeadLetterPublisher` is constructed, and an exhausted message is logged at ERROR and dropped.

## Consumer groups

`subscribe(topic, type, handler)` uses the literal group `"default-group"` — it does **not** fall back to `adhar.messaging.kafka.consumer.group-id`, which is unreachable through the facade. Always pass a group explicitly.

On Kafka the group becomes the container's `group.id`. On RabbitMQ it is used as the **queue name**, with the topic as the exchange; the binding routing key is the fixed `adhar.messaging.rabbitmq.default-routing-key`, not the topic or your publish key.

> Calling `subscribe` twice for the same topic and group **in one process** creates two separate listener containers that join the same consumer group. Kafka rebalances and splits the partitions between them, so each handler sees an arbitrary subset — and on a single-partition topic one of them sees nothing. Subscribe once per topic-and-group and fan out in your own code.

## A complete consumer and producer

```java
package com.example.orders;

import com.adhar.kit.messaging.MessagingFacade;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;
import java.time.Instant;

@Service
public class OrderEventFlow {

    private final MessagingFacade messaging;
    private final FulfilmentService fulfilment;
    private String subscriptionId;

    public OrderEventFlow(MessagingFacade messaging, FulfilmentService fulfilment) {
        this.messaging = messaging;
        this.fulfilment = fulfilment;
    }

    public void publish(Order order) {
        // key = customerId keeps one customer's events on one partition, in order
        messaging.publish("order-events", order.getCustomerId(),
            new OrderCreatedEvent(order.getId(), order.getCustomerId(), Instant.now()));
    }

    @PostConstruct
    public void consume() {
        if (!messaging.isConnected()) {
            // no publisher means no broker wiring; subscribe would silently no-op
            throw new IllegalStateException("No messaging broker configured");
        }
        subscriptionId = messaging.subscribe(
            "order-events", "fulfilment",          // always name the group explicitly
            OrderCreatedEvent.class,
            event -> fulfilment.reserve(event.orderId()));   // must be idempotent
    }

    @PreDestroy
    public void stop() {
        messaging.unsubscribe(subscriptionId);
    }
}
```

```yaml
adhar:
  messaging:
    kafka:
      consumer: { enable-auto-commit: true }
    common:
      retry: { max-attempts: 5, initial-delay-ms: 500, backoff-multiplier: 2.0, max-delay-ms: 10000 }
      dlq:   { enabled: true, topic-suffix: .dlq }
      dedup: { enabled: true, ttl-ms: 900000 }
```

The `@PreDestroy` matters more than it looks. **`MessagingFacade` has no shutdown hook of its own**, and the listener containers it creates are instantiated directly rather than registered as beans — Spring never stops them at context close. Without an explicit `unsubscribe`, they are orphaned, and nothing drains in-flight messages. The one exception is `OutboxRelay`, which is wired with `initMethod = "start"` and `destroyMethod = "stop"`; its `stop()` calls `shutdownNow()` without awaiting termination, so an in-progress relay pass is interrupted — safe only because its state lives in the store.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.messaging.enabled` | Master switch | `true` |
| `adhar.messaging.kafka.enabled` | Wire Kafka publisher/listener | `true` |
| `adhar.messaging.kafka.consumer.enable-auto-commit` | `true` → `AckMode.BATCH`; also drives the RabbitMQ ack mode | `true` |
| `adhar.messaging.rabbitmq.enabled` | Wire RabbitMQ publisher/listener | `true` |
| `adhar.messaging.rabbitmq.default-exchange` | Exchange used when unspecified | `adhar.default` |
| `adhar.messaging.rabbitmq.default-routing-key` | Binding and fallback routing key | `adhar.default` |
| `adhar.messaging.rabbitmq.listener.prefetch-count` | Unacked messages per consumer | `250` |
| `adhar.messaging.rabbitmq.listener.concurrency` | Starting consumer threads | `1` |
| `adhar.messaging.rabbitmq.listener.max-concurrency` | Ceiling the container scales to | `10` |
| `adhar.messaging.cloudevents.enabled` | Register `CloudEventAdapter` | `true` |
| `adhar.messaging.common.retry.enabled` | Wrap handlers in retry | `true` |
| `adhar.messaging.common.retry.max-attempts` | Total attempts (so attempts − 1 sleeps) | `3` |
| `adhar.messaging.common.retry.initial-delay-ms` | First retry delay | `200` |
| `adhar.messaging.common.retry.backoff-multiplier` | Backoff growth | `2.0` |
| `adhar.messaging.common.retry.max-delay-ms` | Backoff ceiling | `5000` |
| `adhar.messaging.common.dlq.enabled` | Route exhausted messages to a DLQ | `true` |
| `adhar.messaging.common.dlq.topic-suffix` | DLQ destination suffix | `.dlq` |
| `adhar.messaging.common.dedup.enabled` | Idempotent consumption | `false` |
| `adhar.messaging.common.dedup.ttl-ms` | How long an id is remembered | `600000` |
| `adhar.messaging.common.reply.timeout-ms` | `sendAndReceive` timeout | `30000` |
| `adhar.messaging.common.reply.topic-suffix` | Kafka reply topic suffix | `.reply` |
| `adhar.messaging.outbox.enabled` | Module-local transactional outbox | `false` |
| `adhar.messaging.outbox.table-name` | JDBC outbox table | `adhar_outbox` |
| `adhar.messaging.outbox.relay-interval-ms` | Relay poll period | `1000` |
| `adhar.messaging.outbox.max-attempts` | Attempts before `DEAD` | `5` |

Several bound keys are never read, because the module relies on Spring Boot's own broker auto-configuration: `adhar.messaging.kafka.bootstrap-servers`, the whole `kafka.producer.*` block, `kafka.consumer.auto-offset-reset`, `kafka.consumer.max-poll-records`, `kafka.consumer.group-id`, and the RabbitMQ connection details. Configure those under `spring.kafka.*` and `spring.rabbitmq.*` instead.

`sendAndReceive` blocks and returns the reply directly; it is not a future. It throws `MessagingException` on timeout, not `TimeoutException`. Note that the module ships **no responder side** — nothing reads the `adhar_replyTopic` header and publishes a reply, so you must write that half yourself.

## Testing

- **Assert the wiring, not only the logic.** A unit test with a stub facade will never catch the silent-subscribe failure. Add a context test that asserts a `MessageListener` bean exists.
- **Test the pipeline directly.** `RetryingMessageHandler` takes a `Sleeper` functional interface as a constructor argument precisely so a test can substitute a no-op and assert the attempt count without real delays. `InMemoryProcessedMessageStore` takes a `java.time.Clock`, so TTL expiry is testable without waiting.
- **Use a real broker for anything about ordering, offsets or rebalancing** — none of it is reproducible against a stub. `adhar-kit-test-commons` provides `KafkaIntegrationTest` and `KafkaTestContainer` (Confluent image, container reuse enabled), which register `spring.kafka.bootstrap-servers` through `@DynamicPropertySource`. There is no RabbitMQ container helper.
- **Prove the DLQ path** by subscribing to `<topic>.dlq` in the test and asserting the `x-dlq-attempts` header, rather than asserting on logs.

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| A consumer processes nothing and logs nothing | No `MessageListener` bean, so `subscribe` stored the handler and stopped | Add the broker starter and its container factory; check startup logs for the subscribe WARN |
| `publish` throws `MessagingException` | No `MessagePublisher` bean | Add the broker starter and its connection config |
| Events published for a transaction that rolled back | `publish` is not transactional | Use `publishViaOutbox`, or the [persistence](/adhar-kit/modules/persistence) outbox |
| Duplicate side effects after a rebalance | At-least-once delivery, dedup off | Set `common.dedup.enabled: true`, and make handlers idempotent anyway |
| Messages lost when a handler fails | Offsets commit regardless of handler outcome | Keep the DLQ enabled and alert on `adhar.messaging.dlq` |
| Offsets never advance after disabling auto-commit | `AckMode.MANUAL` is selected but nothing acknowledges | Leave `enable-auto-commit` at `true` |
| Per-entity events arrive out of order | Published without a key, so they spread across partitions | Pass the entity id as the key in `publish(topic, key, payload)` |
| Consumer lag spikes on a failing message | Retry backoff sleeps on the poll thread | Lower `max-delay-ms` and `max-attempts`, and let the DLQ take the message |
| Two handlers each see half the traffic | Two `subscribe` calls with the same topic and group in one process | Subscribe once and fan out in code |
| A RabbitMQ handler receives `byte[]` instead of your type | The listener ignores the `Class<T>` argument; the default converter is `SimpleMessageConverter` | Register a `Jackson2JsonMessageConverter` bean |

## See also

- [Event Sourcing](/adhar-kit/modules/event-sourcing) — its `KafkaEventBus` distributes domain events over the same broker.
- [Persistence](/adhar-kit/modules/persistence) — the transactional outbox for publish-on-commit.
- [Dapr](/adhar-kit/modules/dapr) — enables the pub/sub-component publisher path.
- [Platform Services](/docs/core-concepts/platform-services) — the bundled Kafka to point your brokers at.
