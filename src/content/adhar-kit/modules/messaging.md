---
title: "Messaging"
section: "Modules"
order: 20
path: "/adhar-kit/modules/messaging"
---

# Messaging

`adhar-kit-messaging` gives you one publish/subscribe API, `MessagingFacade`, over Kafka, RabbitMQ or Dapr pub/sub. Every subscription runs through configurable retry, dead-lettering and deduplication, and an optional JDBC outbox publishes on commit. Use it when a Spring Boot service publishes or consumes domain events and you want those reliability handlers as configuration instead of code in every consumer.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-messaging` |
| Toggle | `adhar.messaging.enabled` (default `true`) switches the auto-configuration. `adhar.kit.modules.messaging` (default `true`) gates `adhar.getMessaging()`; when `false` that call throws `IllegalStateException` |
| Facade | Inject the `MessagingFacade` bean. `adhar.getMessaging()` (from `adhar-kit-starter`) returns a separate, unwired singleton unless you hand it the bean — see [Use it from `AdharFacade`](#use-it-from-adharfacade) |
| Other beans | `MessagePublisher`, `MessageListener`, `RequestReplyClient`, `CloudEventAdapter`, `MessagingMetrics`; with the outbox on: `OutboxStore`, `OutboxRelay` |
| Dependencies | Required: `adhar-kit-commons`, `spring-boot-starter`, CloudEvents SDK (`cloudevents-core`, `cloudevents-json-jackson`), `jackson-databind`. Optional, add the ones you use: `spring-kafka`, `spring-rabbit`, `adhar-kit-dapr`, `spring-jdbc`, `micrometer-core` |
| Frameworks | Spring Boot auto-configuration only |

## How it works

```diagram
nkc-messaging-pipeline
```

- **Transport is chosen from the beans you have.** The publisher and the listener are picked independently, each from the first match in the order Kafka, RabbitMQ, Dapr. A bean of your own (`MessagePublisher`, `MessageListener`) replaces the built-in one.
- **The facade does not wrap payloads in CloudEvents.** Kafka and RabbitMQ carry your payload as serialised by the broker client, plus a `messageId` header (Kafka) or AMQP message id (RabbitMQ) when `common.trace-enabled` is on. Dapr is the exception: the sidecar wraps every publish in a CloudEvents 1.0 envelope. To build a CloudEvent yourself, use `Message<T>` with `CloudEventAdapter` or `CloudEventUtils`.
- **Each `subscribe` builds its own handler chain**: dedup (if enabled) → retry (if enabled) → your `Consumer<T>`, with the dead-letter publisher at the end of the retry step.

| Bean | Registered when |
| --- | --- |
| Kafka `MessagePublisher`, `RequestReplyClient` | `KafkaTemplate` on the classpath and as a bean, `adhar.messaging.kafka.enabled` not `false` |
| Kafka `MessageListener` | As above, plus `ConcurrentKafkaListenerContainerFactory` and `KafkaListenerEndpointRegistry` beans |
| RabbitMQ `MessagePublisher`, `RequestReplyClient` | `RabbitTemplate` bean, `adhar.messaging.rabbitmq.enabled` not `false` |
| RabbitMQ `MessageListener` | `ConnectionFactory` bean |
| Dapr `MessagePublisher`, `MessageListener` | `adhar-kit-dapr` on the classpath, a `DaprFacade` bean, and neither `adhar.dapr.enabled` nor `adhar.messaging.dapr.enabled` set to `false` |
| `CloudEventAdapter` | CloudEvents SDK present, `adhar.messaging.cloudevents.enabled` not `false` |
| `MessagingMetrics` | Micrometer on the classpath and a `MeterRegistry` bean |
| `OutboxStore`, `OutboxRelay` | `adhar.messaging.outbox.enabled=true`. JDBC store with a `DataSource`, in-memory otherwise. The relay also needs a `MessagePublisher` |

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-messaging</artifactId>
    <version>0.1.0</version>
</dependency>

<!-- Pick a broker; Spring Boot's starter supplies KafkaTemplate and the listener factory -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-kafka</artifactId>
</dependency>
<!-- or: org.springframework.boot:spring-boot-starter-amqp -->
```

Connection settings come from Spring Boot (`spring.kafka.*`, `spring.rabbitmq.*`), not from `adhar.messaging.*`. Configure JSON serialisation, because the listener does not convert payloads to the type you pass to `subscribe`:

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      value-serializer: org.springframework.kafka.support.serializer.JacksonJsonSerializer
    consumer:
      value-deserializer: org.springframework.kafka.support.serializer.JacksonJsonDeserializer
      properties:
        spring.json.trusted.packages: com.example.orders
```

On RabbitMQ, register a JSON `MessageConverter` bean (for example `JacksonJsonMessageConverter`); both the publisher (through `RabbitTemplate`) and the listener use it. Without one the listener uses `SimpleMessageConverter` and hands you `byte[]` or `String`.

## Use it

### Publish and consume

```java
import com.adhar.kit.messaging.MessagingFacade;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

@Service
public class OrderEvents {

    public record OrderCreated(String orderId, String customerId) {}

    private final MessagingFacade messaging;
    private String subscriptionId;

    public OrderEvents(MessagingFacade messaging) {
        this.messaging = messaging;
    }

    public void orderCreated(String orderId, String customerId) {
        // The key keeps one customer's events on one Kafka partition, in order.
        messaging.publish("order-events", customerId, new OrderCreated(orderId, customerId));
    }

    @PostConstruct
    void start() {
        if (!messaging.isConnected()) {               // true only when a publisher exists
            throw new IllegalStateException("No messaging broker configured");
        }
        subscriptionId = messaging.subscribe("order-events", "fulfilment",
                OrderCreated.class, event -> reserveStock(event.orderId()));
    }

    @PreDestroy
    void stop() {
        messaging.unsubscribe(subscriptionId);         // stops the listener container
    }

    private void reserveStock(String orderId) { /* idempotent */ }
}
```

Always pass the consumer group: the three-argument `subscribe` uses the literal group `default-group`.

### Publish on commit (outbox)

With `adhar.messaging.outbox.enabled=true`, `publishViaOutbox` writes a row instead of calling the broker. With the JDBC store the row joins the caller's transaction on the same `DataSource`, so it is rolled back with your data. `OutboxRelay` publishes pending rows in the background.

```java
@Transactional
public void placeOrder(Order order) {
    orders.save(order);
    String entryId = messaging.publishViaOutbox("order-events", order.customerId(),
            new OrderCreated(order.id(), order.customerId()));
}
```

Without an `OutboxStore`, `publishViaOutbox` throws `MessagingException`. For an outbox written through JPA entities, see the [persistence](/adhar-kit/modules/persistence) outbox.

### Request-reply

```java
StockLevel level = messaging.sendAndReceive("stock-queries", new StockQuery("sku-42"), StockLevel.class);
```

`sendAndReceive` blocks for up to `common.reply.timeout-ms` and throws `MessagingException` on timeout. You write the responder:

| Broker | Request goes to | The responder must |
| --- | --- | --- |
| Kafka | Topic `<topic>` with headers `adhar_correlationId` and `adhar_replyTopic` | Publish the reply to the `adhar_replyTopic` value (`<topic>` + `common.reply.topic-suffix`), copying `adhar_correlationId` |
| RabbitMQ | Exchange `rabbitmq.default-exchange`, routing key `<topic>`, via `RabbitTemplate.convertSendAndReceive` | Return a value from a standard Spring AMQP listener (reply-to) |

Dapr has no request-reply client.

### Use it from `AdharFacade`

`adhar.getMessaging()`, `adhar.publish(...)` and `adhar.subscribe(...)` use `MessagingFacade.getInstance()`, which has no publisher or listener: publishing throws and subscribing never delivers. Hand the facade the auto-configured bean:

```java
import com.adhar.kit.messaging.MessagingFacade;
import com.adhar.kit.starter.AdharFacadeCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class MessagingWiring {
    @Bean
    AdharFacadeCustomizer messagingCustomizer(MessagingFacade messaging) {
        return facade -> facade.setMessaging(messaging);
    }
}
```

## Configuration

All keys are under `adhar.messaging`. Retry, DLQ and dedup settings apply to every subscription made through the facade.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | Master switch for the auto-configuration |
| `kafka.enabled` | boolean | `true` | Register the Kafka publisher, listener and request-reply client |
| `kafka.default-topic` | String | `default-topic` | Topic when a publish has no destination |
| `kafka.consumer.enable-auto-commit` | boolean | `true` | `true` → `AckMode.BATCH`; `false` → `AckMode.MANUAL`. Also sets the RabbitMQ acknowledge mode |
| `kafka.consumer.group-id` | String | `adhar-consumer-group` | Group for direct `MessageListener` calls without a group; the facade never uses it |
| `rabbitmq.enabled` | boolean | `true` | Register the RabbitMQ publisher, listener and request-reply client |
| `rabbitmq.default-exchange` | String | `adhar.default` | Exchange when none is given; request-reply exchange |
| `rabbitmq.default-routing-key` | String | `adhar.default` | Publish routing key when none is given, and the key every subscription queue is bound with |
| `rabbitmq.default-queue` | String | `adhar.default` | Queue for direct listener calls without a group |
| `rabbitmq.publisher.confirms` | boolean | `false` | Wait for broker confirms in `MessagePublisher.publishAsync` |
| `rabbitmq.publisher.exchange-durable` | boolean | `true` | Durability of exchanges the listener declares |
| `rabbitmq.listener.auto-declare` | boolean | `true` | Declare the exchange, queue and binding on `subscribe` |
| `rabbitmq.listener.queue-durable` / `queue-exclusive` / `queue-auto-delete` | boolean | `true` / `false` / `false` | Properties of declared queues |
| `rabbitmq.listener.prefetch-count` | int | `250` | Unacknowledged messages per consumer |
| `rabbitmq.listener.concurrency` | int | `1` | Starting consumers per subscription |
| `rabbitmq.listener.max-concurrency` | int | `10` | Consumers a subscription can scale to |
| `dapr.enabled` | boolean | `true` | Register the Dapr publisher and listener |
| `dapr.pubsub-name` | String | — | Dapr pub/sub component; blank uses the component configured in `adhar-kit-dapr` |
| `dapr.default-topic` | String | `default-topic` | Topic when a publish has no destination |
| `cloudevents.enabled` | boolean | `true` | Register `CloudEventAdapter` |
| `common.trace-enabled` | boolean | `true` | Add a generated `messageId` (and timestamp) to each Kafka/RabbitMQ publish |
| `common.retry.enabled` | boolean | `true` | Wrap handlers in `RetryingMessageHandler` |
| `common.retry.max-attempts` | int | `3` | Total attempts, including the first |
| `common.retry.initial-delay-ms` | long | `200` | Delay before the second attempt |
| `common.retry.backoff-multiplier` | double | `2.0` | Growth factor per attempt |
| `common.retry.max-delay-ms` | long | `5000` | Delay ceiling |
| `common.dlq.enabled` | boolean | `true` | Publish exhausted messages to a dead-letter destination |
| `common.dlq.topic-suffix` | String | `.dlq` | Dead-letter destination = topic + suffix |
| `common.dedup.enabled` | boolean | `false` | Wrap handlers in `DeduplicatingMessageHandler` |
| `common.dedup.ttl-ms` | long | `600000` | How long a message id is remembered |
| `common.reply.timeout-ms` | long | `30000` | `sendAndReceive` timeout |
| `common.reply.topic-suffix` | String | `.reply` | Kafka reply topic = topic + suffix |
| `outbox.enabled` | boolean | `false` | Register the outbox store and relay |
| `outbox.table-name` | String | `adhar_outbox` | JDBC table (letters, digits, underscores) |
| `outbox.initialize-schema` | boolean | `true` | Run `CREATE TABLE IF NOT EXISTS` at startup |
| `outbox.relay-interval-ms` | long | `1000` | Delay between relay passes |
| `outbox.batch-size` | int | `50` | Rows published per pass |
| `outbox.max-attempts` | int | `5` | Attempts before a row is marked `DEAD` |

These bound keys are not read by the module; set the Spring Boot equivalents instead: `kafka.bootstrap-servers`, `kafka.producer.*`, `kafka.consumer.auto-offset-reset`, `kafka.consumer.max-poll-records`, `kafka.properties`, the RabbitMQ connection keys (`host`, `port`, `username`, `password`, `virtual-host`), `rabbitmq.publisher.returns`, `exchange-type`, `exchange-auto-delete`, and `common.default-serialization-format`, `validation-enabled`, `default-timeout-ms`, `default-retries`, `default-backoff-ms`.

## Operations

**Metrics.** With `MessagingMetrics` registered, the module records counters tagged `destination` (`unknown` when null):

| Counter | Incremented when |
| --- | --- |
| `adhar.messaging.publish` / `.publish.failure` | A facade or outbox-relay publish succeeds / fails |
| `adhar.messaging.consume` | Your handler returns normally |
| `adhar.messaging.retry` | An attempt failed and another is scheduled |
| `adhar.messaging.consume.failure` | All retry attempts failed |
| `adhar.messaging.dlq` | A message was published to the dead-letter destination |
| `adhar.messaging.duplicate` | Dedup skipped a message |

Alert on `publish.failure` and `dlq`. The module has no health indicator.

**Startup check.** The facade logs one INFO line naming its publisher, listener, outbox and request-reply client. `none (stub)` for the listener means `subscribe` will store handlers that never run; it logs a single WARN per call and returns a normal subscription id.

**Failure behaviour.**

| Situation | What happens |
| --- | --- |
| No `MessagePublisher` | `publish` throws `MessagingException` |
| Broker send fails | Kafka/RabbitMQ publisher logs ERROR and returns `false`; the facade logs WARN and counts `publish.failure`. **`publish` does not throw** |
| Handler throws, retry on | Retries with backoff on the consumer thread; on exhaustion, DLQ publish (if enabled and a publisher exists), then the listener sees a failure |
| Failure reaches Kafka listener | Logged; the offset is committed with the batch anyway (`AckMode.BATCH`) |
| Failure reaches RabbitMQ listener | `basicReject(requeue=true)`, so the message comes back with no redelivery limit — even after it was dead-lettered |
| Failure reaches Dapr listener | Dapr is asked to redeliver (`RETRY`); unreadable payloads are dropped |
| Retry off | No DLQ step: the exception goes straight to the listener |
| Outbox publish fails | Row marked `FAILED` and retried every pass; `DEAD` after `outbox.max-attempts` |

**Shutdown.** Listener containers created by `subscribe` are not Spring beans, so the context does not stop them. Call `unsubscribe` in `@PreDestroy`. `OutboxRelay` stops with the context (`shutdownNow`, so a pass in progress is interrupted; state is in the store).

## Limits

- **Delivery is at-least-once at best.** With the Kafka defaults a failed message's offset still commits (effectively at-most-once for that message, rescued only by the DLQ). Setting `enable-auto-commit: false` selects `AckMode.MANUAL`, but nothing acknowledges, so offsets never advance. Make handlers idempotent.
- **Ordering.** Kafka keeps per-partition order; `publish(topic, payload)` sets no key, so use `publish(topic, key, payload)` for per-entity order. Retry backoff sleeps on the poll thread, stalling the partition, and long sleeps can exceed `max.poll.interval.ms`. RabbitMQ subscriptions scale to `max-concurrency` (10) competing consumers, so they are unordered by default. Dead-lettered messages are published without a key.
- **RabbitMQ topology.** The topic is the exchange and the consumer group is the queue name. Queues are bound with `default-routing-key`, so a message published with a different key does not reach facade subscribers. The module never declares the `<topic>.dlq` exchange — declare it yourself or dead letters are lost.
- **Dedup is in-memory and per instance.** `InMemoryProcessedMessageStore` scans all entries on every message and is not shared across replicas. An id is marked before your handler runs and never unmarked, so a redelivery of a dead-lettered message is skipped. On RabbitMQ the AMQP message id is not a header, so dedup only works when the producer sets a `ce-id` or `messageId` header; without one, every message gets a fresh id and nothing is deduplicated. Dapr messages always carry `ce-id`.
- **Retry does not classify errors.** Every exception is retried, with no jitter.
- **One subscription per topic and group per process.** Two `subscribe` calls with the same topic and group create two containers in one group; Kafka splits partitions between them. Dapr ignores the group: replicas of an app share a subscription.
- **Outbox.** The relay takes no row locks, so several replicas can publish the same row (at-least-once). Published rows are never deleted. The generated DDL uses `CLOB`, which PostgreSQL does not support; there, create the table yourself and set `outbox.initialize-schema: false`. The in-memory store is lost on restart.
- **Annotations do nothing.** `@CloudEventPublisher`, `@CloudEventListener` and `@CloudEventHandler` exist as types, but no processor reads them. Use the facade.
- **`Message<T>` ids are generated.** `id` is always a new UUID and `timestamp` is `Instant.now()`; the builder has no setter for either.
- **Testing.** `RetryingMessageHandler` takes a `Sleeper` and `InMemoryProcessedMessageStore` takes a `Clock`, so both are testable without real delays. `adhar-kit-test-commons` provides `KafkaIntegrationTest` and `KafkaTestContainer`; there is no RabbitMQ helper.

## Next steps

- [Persistence](/adhar-kit/modules/persistence) — the JPA transactional outbox.
- [Dapr](/adhar-kit/modules/dapr) — the pub/sub component behind the Dapr transport.
- [Event Sourcing](/adhar-kit/modules/event-sourcing) — distributes domain events over the same brokers.
- [Platform Services](/docs/core-concepts/platform-services) — the Kafka the platform provides.
