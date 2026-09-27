---
title: "Event Sourcing"
section: "Modules"
order: 25
path: "/adhar-kit/modules/event-sourcing"
---

# Event Sourcing

`adhar-kit-event-sourcing` implements event sourcing and CQRS: an event store (JPA or in-memory) with optimistic concurrency, snapshotting, projections, event upcasting, an aggregate repository, and an in-process domain event bus with CloudEvent support.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-event-sourcing</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

- `EventStore` (via `adhar.getEventStore()`) — `saveEvents`, `getEvents`, `getEventsAfterVersion`, `loadAggregate`, `saveAggregate`, `subscribe`
- `AggregateRoot` (`createSnapshotState`, `restoreFromSnapshot`), `AggregateRepository`, `RetryingAggregateRepository`
- `Projection`, `ProjectionManager`, `SnapshotStore`, `EventUpcaster` / `UpcasterChain`, `ConcurrencyException`
- Facade shortcuts — `adhar.publishEvent(event)`, `adhar.onEvent(type, handler)`

## Append and react to events

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

    public void setup() {
        adhar.onEvent("OrderCreated", e -> log.info("Order created: {}", e.aggregateId()));
    }
}
```

## How it fits together

```text
Command → AggregateRoot ──apply──▶ DomainEvent(s)
                 │                      │
                 ▼                      ▼
          EventStore.saveEvents   EventBus.publish
          (optimistic version)         │
                 │                      ▼
          snapshot every N events   Projections → read models
```

- **Optimistic concurrency** — `saveEvents(id, events, expectedVersion)` throws `ConcurrencyException` on a conflicting write.
- **Snapshots** — every N events (configurable) an aggregate snapshot is stored so replays stay fast.
- **Projections** — build and maintain read models from the event stream, with checkpointing.
- **Upcasting** — evolve event schemas over time via an `UpcasterChain`.

## Configuration

```yaml
adhar:
  event-sourcing:
    enabled: true
    event-store-type: jpa       # or in-memory
    snapshot-interval: 100
    retry-max-attempts: 3
```
