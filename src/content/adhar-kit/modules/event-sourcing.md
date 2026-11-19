---
title: "Event Sourcing"
section: "Modules"
order: 25
path: "/adhar-kit/modules/event-sourcing"
---

# Event Sourcing

`adhar-kit-event-sourcing` makes an append-only event stream the source of truth for an aggregate. You get an event store (in-memory, JPA or Dapr) with optimistic version checks, an `AggregateRoot` base class, a repository that replays and snapshots, projections, catch-up subscriptions, upcasters and a step-based saga manager. Use it when the history is the record you must keep, or when reads and writes need different models.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-event-sourcing` |
| Module toggle | `adhar.kit.modules.event-sourcing` (default `false`) gates `adhar.getEventStore()` |
| Module switch | `adhar.event-sourcing.enabled` (default `true`) gates `EventSourcingAutoConfiguration` |
| Entry points | `AggregateRepository`, `RetryingAggregateRepository`, `EventStore`, `ProjectionManager`, `SagaManager` (Spring beans); `EventSourcingFacade` |
| Dependencies | Required: `adhar-kit-commons`, `jackson-databind`. Optional: `spring-boot-starter-data-jpa` (JPA store), `spring-kafka` (Kafka bus), `adhar-kit-dapr` (Dapr store and bus) |
| Frameworks | Spring Boot auto-configures every bean. Elsewhere, construct the classes yourself; they are plain Java |

## How it works

A command loads an aggregate by replaying its events, decides, and emits new events. `AggregateRepository.save` appends them under an expected version, then publishes each one to the `EventBus`, which feeds projections, sagas and catch-up subscriptions.

```diagram
kit-event-sourcing-flow
```

Three rules hold the model together:

1. **Events are immutable and append-only.** To undo, append a compensating event.
2. **The version is the concurrency token.** `saveEvents(id, events, expectedVersion)` throws `ConcurrencyException(aggregateId, expected, actual)` when another writer got there first.
3. **Snapshots and projections are derived.** You can delete and rebuild both from the stream.

`event-store-type` picks the store. The default is `in-memory`. `jpa` falls back to in-memory when the application has no `EntityManagerFactory`, and an unrecognised value creates no `EventStore`, so the context fails to start.

| Store | Durable parts | Concurrency check |
| --- | --- | --- |
| `in-memory` (default) | Nothing; lost on restart | `synchronized` per-aggregate check-and-append. Correct within one JVM |
| `jpa` | Events, snapshots, projection checkpoints, saga state | Read the stream, compare the last `version`, `saveAll`. **A race:** no lock, no transaction, no unique constraint on `(aggregate_id, version)` |
| `dapr` | Events only (one document per aggregate, key `es:<aggregateId>`) | Version compare plus an ETag conditional write. Safe across replicas when the state component supports ETags |

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-event-sourcing</artifactId>
    <version>0.1.0</version>
</dependency>
```

For durable storage, also add `spring-boot-starter-data-jpa` and a datasource, and set `adhar.event-sourcing.event-store-type=jpa`.

## Use it

### An aggregate

Extend `AggregateRoot`, give it a no-arg constructor, and change state only in `apply`. **`applyEvent` does not set the aggregate id**, so set it in `apply`; otherwise a loaded aggregate saves under a `null` id. `applyEvent` sets `version = event.version()` and never increments it, so each event you create carries `getVersion() + 1`.

```java
import com.adhar.kit.eventsourcing.core.AggregateRoot;
import com.adhar.kit.eventsourcing.core.DomainEvent;
import java.time.Instant;
import java.util.UUID;

public class Order extends AggregateRoot {
    private String status;

    public void cancel(String reason) {
        if ("SHIPPED".equals(status)) throw new IllegalStateException("already shipped");
        applyEvent(new DomainEvent(UUID.randomUUID().toString(), getAggregateId(), "Order",
                getVersion() + 1, "OrderCancelled", "{\"reason\":\"" + reason + "\"}", Instant.now()));
    }

    @Override
    protected void apply(DomainEvent event) {
        setAggregateId(event.aggregateId());
        switch (event.eventType()) {
            case "OrderCreated" -> status = "NEW";
            case "OrderCancelled" -> status = "CANCELLED";
            default -> { }
        }
    }
}
```

`AggregateRoot` is not thread-safe. One instance belongs to one command on one thread.

### A command with retry

```java
import com.adhar.kit.eventsourcing.repository.RetryingAggregateRepository;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    private final RetryingAggregateRepository orders;

    public OrderService(RetryingAggregateRepository orders) { this.orders = orders; }

    public void cancel(String orderId, String reason) {
        orders.executeWithRetry(orderId, Order.class, order -> order.cancel(reason));
    }
}
```

`executeWithRetry` reloads the aggregate, runs your command and saves, up to `retry-max-attempts` times:

- It retries **only** `ConcurrencyException`. Anything else propagates on the first attempt.
- There is no backoff between attempts.
- On exhaustion it rethrows the last `ConcurrencyException`.
- **Your command runs again on every attempt.** Keep it free of external side effects (mail, API calls).

`AggregateRepository.load(id, type)` throws `IllegalStateException` when the stream is empty and no snapshot was restored.

### A projection

```java
import com.adhar.kit.eventsourcing.core.DomainEvent;
import com.adhar.kit.eventsourcing.projection.Projection;
import java.util.Set;

public class OrderSummaryProjection implements Projection {
    @Override public String getName() { return "order-summary"; }
    @Override public Set<String> interestedEventTypes() { return Set.of("OrderCreated", "OrderCancelled"); }
    @Override public void handle(DomainEvent event) {
        // idempotent upsert: a rebuild re-applies every event over existing state
    }
}
```

Projection beans are not discovered. Register each one: `projectionManager.register(new OrderSummaryProjection())`. Rebuild with `projectionManager.rebuild("order-summary", eventStore)`.

### A saga

```java
import com.adhar.kit.eventsourcing.saga.SagaDefinition;
import com.adhar.kit.eventsourcing.saga.SagaStep;

sagaManager.register(SagaDefinition.builder("checkout")
        .startEventType("OrderPlaced")
        .step(SagaStep.of("reserve-stock", ctx -> stock.reserve(ctx.correlationId()),
                                           ctx -> stock.release(ctx.correlationId())))
        .step(SagaStep.builder("charge")
                .action(ctx -> payments.request(ctx.correlationId()))
                .awaitEventType("PaymentCaptured")
                .failureEventType("PaymentFailed")
                .build())
        .build());
```

A step with `awaitEventType` pauses until that event arrives; otherwise the next step runs at once. Events correlate on their `aggregateId`; an instance with a `null` correlation id matches every event. On failure (the action throws, or `failureEventType` arrives) the manager compensates earlier steps in reverse. The failing step itself is not compensated. A compensation that throws does not stop the rest, and the final status is `FAILED` instead of `COMPENSATED`.

### Snapshots and upcasters

- **Snapshots:** override `createSnapshotState()` and `restoreFromSnapshot(state, version)`; both throw by default, which disables snapshotting for that type. The state is a `String` you serialise yourself. `AggregateRepository.save` writes one when the version crosses a multiple of `snapshot-interval`.
- **Upcasters:** publish `EventUpcaster` beans (`supports(eventType, version)`, `upcast(event)`). The stores apply the `UpcasterChain` on read. The bus never does, so a projection fed live sees raw events while the same projection rebuilt from the store sees upcast ones.

### The facade

`EventSourcingFacade` offers `saveEvents`, `getEvents`, `getEventsAfterVersion`, `publish`, `subscribe`, `publishCloudEvent`, `loadAggregate(id, Supplier)`, `saveAggregate` and `health()`. **`adhar.getEventStore()` returns `EventSourcingFacade.getInstance()`, which has no store:** `saveEvents` and `publish` throw `IllegalStateException`, and reads return empty lists. On Spring Boot, inject the beans above, or build a working facade and install it:

```java
@Bean
AdharFacadeCustomizer eventStoreFacade(EventStore store, EventBus bus, AggregateRepository repo) {
    return facade -> facade.setEventStore(new EventSourcingFacade(store, bus, repo));
}
```

## Configuration

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `adhar.event-sourcing.enabled` | boolean | `true` | Registers the module's beans |
| `adhar.event-sourcing.event-store-type` | string | `in-memory` | `in-memory`, `jpa` or `dapr` |
| `adhar.event-sourcing.snapshot-interval` | int | `100` | Version boundary that triggers a snapshot; `0` disables |
| `adhar.event-sourcing.retry-max-attempts` | int | `3` | Attempts in `executeWithRetry`; must be at least 1 |
| `adhar.event-sourcing.kafka.enabled` | boolean | `false` | Use `KafkaEventBus`; needs `spring-kafka` and a `KafkaTemplate` bean |
| `adhar.event-sourcing.kafka.topic` | string | `adhar.event-sourcing.events` | Topic events are published to and consumed from |
| `adhar.event-sourcing.kafka.group-id` | string | `adhar-event-sourcing` | Consumer group of the bus listener |
| `adhar.event-sourcing.dapr.enabled` | boolean | `true` | Use `DaprEventBus` when `adhar.dapr.enabled=true` and a `DaprFacade` bean exists; `false` falls back to `SimpleEventBus` |
| `adhar.event-sourcing.dapr.pubsub-name` | string | `pubsub` | Dapr pub/sub component |
| `adhar.event-sourcing.dapr.topic` | string | `adhar.event-sourcing.events` | Dapr topic |
| `adhar.event-sourcing.dapr.state-store` | string | `statestore` | Dapr state store for the `dapr` event store |

Bus selection: an enabled Kafka bus wins, then Dapr, then the in-process `SimpleEventBus`. Every bean is `@ConditionalOnMissingBean`, so your own `EventStore`, `EventBus`, `SnapshotStore`, `ProjectionCheckpointStore` or `SagaStateStore` replaces the default.

With `jpa`, the module enables `@EnableJpaRepositories(basePackages = "com.adhar.kit.eventsourcing")` and adds its entities to the scanned packages. The tables (`domain_events`, `aggregate_snapshots`, `projection_checkpoints`, `saga_instances`) come from your Hibernate DDL setting; no migration script ships.

## Operations

- **No metrics and no health indicator.** Observe through logs, or `EventSourcingFacade.health()` (`enabled`, `eventStoreType`, `eventBusType`). Instrument the write path with [Metrics](/adhar-kit/modules/metrics) if you need conflict counts.
- **Publish is not transactional.** `save` stores the events, then publishes them in a loop. A failure between the two loses the notification, not the events. Drive critical subscribers from the stream (`CatchUpSubscription`, `rebuild`).
- **Bus failure handling differs.** `SimpleEventBus` dispatches synchronously on the caller's thread and catches each handler's exception. `KafkaEventBus` keys by `aggregateId` (per-aggregate order) and does not await the send. `DaprEventBus` has no inbound listener: wire a Dapr subscription and call `dispatch(message)`; a throwing handler stops the rest for that event.
- **Projection failures are dropped.** A `handle` that throws is logged and skipped, with no retry. Fix the handler, then rebuild.
- **Rebuild does not clear the read model**, loads the whole stream into memory, and runs while the projection stays subscribed live. Truncate the read model first and make `handle` idempotent.

## Limits

- The JPA append check races under concurrent writers. Serialise writes per aggregate, or add `CREATE UNIQUE INDEX ... ON domain_events (aggregate_id, version)` yourself. It also reads the whole stream on every append.
- The `dapr` store keeps only events durable; snapshots, checkpoints and saga state are in-memory. It does not implement `getAllEvents()`, so `rebuild` and `CatchUpSubscription` throw `UnsupportedOperationException`.
- `JpaSnapshotStore` never prunes old snapshots. `JpaProjectionCheckpointStore` has no locking, so two replicas can overwrite each other's position.
- `EventBus` has no `unsubscribe`; `CatchUpSubscription.stop()` does not remove its bus subscription.
- Events read back from the JPA store carry the row UUID as `eventId`, not the id you created.

## Next steps

- [Persistence](/adhar-kit/modules/persistence) — the JPA setup behind the `jpa` store
- [Messaging](/adhar-kit/modules/messaging) — carrying events between services
- [Dapr](/adhar-kit/modules/dapr) — the state store and pub/sub behind the `dapr` store type
- [Concepts](/adhar-kit/concepts) — module toggles and the facade
