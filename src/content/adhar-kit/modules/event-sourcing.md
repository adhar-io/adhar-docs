---
title: "Event Sourcing"
section: "Modules"
order: 25
path: "/adhar-kit/modules/event-sourcing"
---

# Event Sourcing

A row in a table tells you what something *is*; it has already thrown away how it got there. When the audit trail, the temporal query, or the "replay this differently" requirement is the point, `adhar-kit-event-sourcing` **makes the append-only event stream the source of truth and derives everything else from it** — current state by replay, read models by projection, cross-service workflows by saga.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-event-sourcing` |
| Built on | Spring Data JPA (default store), Jackson; optional Kafka, Dapr |
| Entry points | `EventStore` (or `adhar.getEventStore()`), `AggregateRoot`, `AggregateRepository`, `Projection` |
| Config prefix | `adhar.event-sourcing` |
| Use it when | History is the record you must keep, or reads and writes want genuinely different models |

## How it works

A command loads an aggregate by replaying its events, decides, and appends new ones. The append is the only write. Everything downstream — the read model, the saga, the other service — reacts to what was appended.

```text
 Command
    │
    ▼
 AggregateRepository.load(id, Order.class)
    │   snapshot (if any) ──▶ applySnapshot
    │   + getEventsAfterVersion ──▶ apply(event) per event
    ▼
 AggregateRoot  ── business decision ──▶ uncommitted DomainEvent(s)
    │
    ▼
 EventStore.saveEvents(id, events, expectedVersion)
    │      version mismatch ──▶ ConcurrencyException
    │      every snapshot-interval events ──▶ SnapshotStore.save
    ▼
 EventBus.publish(event)
    │           │                 │
    ▼           ▼                 ▼
 Projections  SagaManager   CatchUpSubscription
 (read models,  (multi-step   (rebuild / late
  checkpointed)  workflows)     subscriber)
```

Three invariants hold the model together:

1. **Events are immutable and append-only.** You never update an event; you append a compensating one.
2. **Version is the concurrency token.** `saveEvents(id, events, expectedVersion)` compares `expectedVersion` against the aggregate's current version and throws `ConcurrencyException(aggregateId, expected, actual)` if another writer got there first.
3. **Snapshots and projections are derived, never authoritative.** Both can be deleted and rebuilt from the stream; `ProjectionManager.rebuild(name, eventStore)` does exactly that.

The store is pluggable by configuration: `jpa` (the default, and the only one where snapshots, projection checkpoints and saga state are also durable), `in-memory` for tests, or `dapr` — where **only the event stream itself is durable**, with the supporting stores falling back to in-memory unless you supply your own beans.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-event-sourcing</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`DomainEvent`** — the record every event is: `eventId`, `aggregateId`, `aggregateType`, `version`, `eventType`, `payload` (serialized, typically JSON), `occurredAt`.
- **`EventStore`** (`adhar.getEventStore()`) — `saveEvents(aggregateId, events, expectedVersion)`, `getEvents(aggregateId)`, `getEventsAfterVersion(aggregateId, version)`, `getAllEvents()` where the implementation supports it.
- **`EventSourcingFacade`** — the same operations plus `publish(event)`, `publishCloudEvent(event)`, `subscribe(eventType, handler)`, `loadAggregate(id, factory)`, `saveAggregate(aggregate)`, `health()`.
- **`AggregateRoot`** — extend it and implement `protected abstract void apply(DomainEvent event)`. You get `getAggregateId()`, `getVersion()`, `applyEvent(event)`, `getUncommittedEvents()`, `markEventsAsCommitted()`, and the snapshot hooks `createSnapshotState()` / `restoreFromSnapshot(state, version)`.
- **`AggregateRepository`** — `load(aggregateId, Class<T>)` and `save(aggregate)`; the aggregate class needs a no-arg constructor. **`RetryingAggregateRepository`** wraps that pair in a single call, `executeWithRetry(aggregateId, type, command)`: it loads, applies your `Consumer<T>`, saves, and on a `ConcurrencyException` **reloads and reapplies the command** up to `retry-max-attempts` before rethrowing.
- **`Projection`** — `getName()`, `interestedEventTypes()`, `handle(event)`. `ProjectionManager` does `register(projection)` and `rebuild(name, eventStore)`, checkpointing progress through `ProjectionCheckpointStore`.
- **`EventBus`** — `publish(event)`, `subscribe(eventType, handler)`. `SimpleEventBus` in-process by default; `KafkaEventBus` or `DaprEventBus` to fan out across services.
- **`EventUpcaster`** / **`UpcasterChain`** — `supports(eventType, version)` and `upcast(event)`; the chain is applied on read, so old events are transformed into the current shape before your `apply` sees them.
- **`SnapshotStore`** — `save(snapshot)`, `findLatest(aggregateId)`.
- **`CatchUpSubscription`** — `start()` / `start(fromPosition)`, `stop()`, `getPosition()`, `getState()`, for a consumer that must first read history then follow live.
- **`SagaManager`** — `register(SagaDefinition)`, `start(sagaName, correlationId, initialData)`, `onEvent(event)`, with `SagaStep`, `SagaContext`, `SagaInstance`, `SagaStatus`.
- **Facade shortcuts** — `adhar.publishEvent(event)`, `adhar.onEvent(type, handler)`.

## Minimal: append and react

```java
@Service
public class OrderCommandHandler {
    private final AdharFacade adhar;
    public OrderCommandHandler(AdharFacade adhar) { this.adhar = adhar; }

    public void createOrder(String orderId, String customerId) {
        var event = new DomainEvent(
            UUID.randomUUID().toString(), orderId, "Order", 1,
            "OrderCreated", "{\"customerId\":\"" + customerId + "\"}", Instant.now());
        adhar.getEventStore().saveEvents(orderId, List.of(event), 0);  // expectedVersion 0
        adhar.publishEvent(event);
    }

    @PostConstruct
    public void setup() {
        adhar.onEvent("OrderCreated", e -> log.info("Order created: {}", e.aggregateId()));
    }
}
```

## Realistic: an aggregate, a projection, and a rebuild

```java
public class Order extends AggregateRoot {
    private String customerId;
    private OrderStatus status;

    public static Order create(String orderId, String customerId) {
        Order order = new Order();
        order.applyEvent(new DomainEvent(UUID.randomUUID().toString(), orderId,
            "Order", 1, "OrderCreated",
            "{\"customerId\":\"" + customerId + "\"}", Instant.now()));
        return order;
    }

    public void cancel(String reason) {
        if (status == OrderStatus.SHIPPED) throw new IllegalStateException("already shipped");
        applyEvent(new DomainEvent(UUID.randomUUID().toString(), getAggregateId(),
            "Order", getVersion() + 1, "OrderCancelled",
            "{\"reason\":\"" + reason + "\"}", Instant.now()));
    }

    @Override
    protected void apply(DomainEvent event) {
        switch (event.eventType()) {
            case "OrderCreated"   -> this.status = OrderStatus.NEW;
            case "OrderCancelled" -> this.status = OrderStatus.CANCELLED;
            default -> { }
        }
    }
}

@Component
public class OrderSummaryProjection implements Projection {
    private final OrderSummaryRepository summaries;

    @Override public String getName() { return "order-summary"; }

    @Override public Set<String> interestedEventTypes() {
        return Set.of("OrderCreated", "OrderCancelled");
    }

    @Override public void handle(DomainEvent event) {
        summaries.applyEvent(event.aggregateId(), event.eventType());
    }
}
```

Wire the write side through the retrying repository so a lost race is retried rather than surfaced:

```java
@Service
public class OrderService {
    private final RetryingAggregateRepository repository;
    private final ProjectionManager projections;

    public void cancel(String orderId, String reason) {
        // load → apply → save, reloading and reapplying on a version conflict
        repository.executeWithRetry(orderId, Order.class, order -> order.cancel(reason));
    }

    public void rebuildReadModel(EventStore store) {
        projections.rebuild("order-summary", store);
    }
}
```

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.event-sourcing.enabled` | Master switch | `true` |
| `adhar.event-sourcing.event-store-type` | `jpa`, `in-memory`, or `dapr` | `jpa` |
| `adhar.event-sourcing.snapshot-interval` | Events between snapshots | `100` |
| `adhar.event-sourcing.retry-max-attempts` | `ConcurrencyException` retries | `3` |
| `adhar.event-sourcing.kafka.enabled` | Use `KafkaEventBus` instead of in-process | `false` |
| `adhar.event-sourcing.kafka.topic` | Topic events are published to | `adhar.event-sourcing.events` |
| `adhar.event-sourcing.kafka.group-id` | Consumer group | `adhar-event-sourcing` |
| `adhar.event-sourcing.dapr.enabled` | Dapr pub/sub and state paths | `true` |
| `adhar.event-sourcing.dapr.pubsub-name` | Dapr pub/sub component | `pubsub` |
| `adhar.event-sourcing.dapr.topic` | Dapr topic | `adhar.event-sourcing.events` |
| `adhar.event-sourcing.dapr.state-store` | Dapr state store for the stream | `statestore` |

```yaml
adhar:
  event-sourcing:
    event-store-type: jpa
    snapshot-interval: 50
    retry-max-attempts: 5
    kafka:
      enabled: true
      topic: orders.domain-events
```

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `ConcurrencyException` under load | Two writers held the same `expectedVersion` | Use `RetryingAggregateRepository`, and keep aggregates small enough that contention is rare |
| Loading an aggregate gets slower over time | The stream grew past a useful snapshot interval | Lower `snapshot-interval`; snapshots are derived, so changing it is safe |
| Old events break after a schema change | `apply` expects the new payload shape | Add an `EventUpcaster` rather than editing stored events |
| Read model drifts from the stream | A projection threw and its checkpoint stalled | Fix the handler, then `ProjectionManager.rebuild(name, store)` |
| Events not visible to other services | The default `EventBus` is in-process only | Set `kafka.enabled: true`, or run with Dapr |
| Snapshots and saga state lost on restart | `event-store-type` is `in-memory`, or `dapr` (where only the stream is durable) | Use `jpa`, or supply your own `SnapshotStore` / `SagaStateStore` beans |
| Aggregate fails to load | `AggregateRepository.load` needs a no-arg constructor | Give the aggregate one; build state only through `apply` |
| `getAllEvents()` throws | Not every store implements it | Use `getEvents` / `getEventsAfterVersion`, or the JPA store |

## See also

- [Messaging](/adhar-kit/modules/messaging) — carries these events beyond the process when Kafka is enabled.
- [Persistence](/adhar-kit/modules/persistence) — backs the JPA event, snapshot, checkpoint and saga tables, and offers the outbox when state, not the stream, is your source of truth.
- [Dapr](/adhar-kit/modules/dapr) — the state-store and pub/sub backend for the `dapr` store type.
- [Concepts](/adhar-kit/concepts) — how the facade and module layering fit together.
