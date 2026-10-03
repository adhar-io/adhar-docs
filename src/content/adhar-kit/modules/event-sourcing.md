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

```diagram
kit-event-sourcing-flow
```

Three invariants hold the model together:

1. **Events are immutable and append-only.** You never update an event; you append a compensating one.
2. **Version is the concurrency token.** `saveEvents(id, events, expectedVersion)` compares `expectedVersion` against the aggregate's current version and throws `ConcurrencyException(aggregateId, expected, actual)` if another writer got there first.
3. **Snapshots and projections are derived, never authoritative.** Both can be deleted and rebuilt from the stream.

The store is pluggable by configuration: `jpa` (the default, and the only one where snapshots, projection checkpoints and saga state are also durable), `in-memory` for tests, or `dapr`.

## The append path: how concurrency control actually works

This is optimistic, version-checked concurrency — but **the strength of the check differs sharply by store**, and that difference decides what you can safely run.

| Store | Mechanism | Safe against |
| --- | --- | --- |
| `jpa` | Reads the whole stream, takes the last row's `version`, compares, then `saveAll` | A single-threaded writer. **Nothing else** |
| `in-memory` | Check-and-append inside a `synchronized` block on the per-aggregate list | Concurrent threads in one JVM |
| `dapr` | In-process version compare **plus** an ETag conditional write (`Concurrency.FIRST_WRITE`) over the whole stream document | Concurrent writers across replicas, to the extent the state component supports ETags |

> **The JPA store's check is a read-then-write race.** The SELECT and the INSERT are in separate transactions — the class is not `@Transactional`, there is no pessimistic lock, and the `domain_events` table declares **no unique constraint on `(aggregate_id, version)`**. Two writers can both read version 4, both pass the check, and both insert version 5. Neither raises `ConcurrencyException`, so the retry wrapper never sees it. Until that constraint exists, serialise writes per aggregate yourself — wrap the command in your own `@Transactional` with `SERIALIZABLE` isolation, or add the unique index by hand:
>
> ```sql
> CREATE UNIQUE INDEX uq_domain_events_aggregate_version
>     ON domain_events (aggregate_id, version);
> ```
>
> No DDL, Flyway or Liquibase script ships with the module; the tables come from Hibernate's `ddl-auto` in your application.

Note also that the JPA store reads the **entire** aggregate stream on every append merely to learn the last version, so append cost grows linearly with stream length regardless of snapshots. Keep streams short.

### What `executeWithRetry` retries, and what it does not

```java
public <T extends AggregateRoot> T executeWithRetry(
        String aggregateId, Class<T> type, Consumer<T> command)
```

It loops up to `retry-max-attempts` times. Each attempt **reloads the aggregate from the store**, applies your `Consumer`, and saves.

- **Retries exactly one thing: `ConcurrencyException`.** Nothing else. A JPA `DataAccessException`, a business exception from your command, or the `IllegalStateException` thrown when the aggregate has no events — all propagate on the first attempt.
- **There is no backoff.** Attempts run in a tight loop with no sleep and no jitter, so a hot aggregate produces a thundering retry rather than a staggered one.
- **On exhaustion it rethrows the last `ConcurrencyException` as-is**, with the store's original stack trace and no "retries exhausted" wrapper.
- **Your command runs again on every attempt.** Anything it does beyond mutating the aggregate — sending mail, calling an API, generating a random id — happens up to `retry-max-attempts` times. Keep the `Consumer` pure with respect to the outside world.

## Events, publication and ordering

`AggregateRepository.save` writes to the store **and then** publishes each event to the `EventBus`, in a loop, with no transaction and no outbox. A failure between the two loses the notification while the events remain stored. If subscribers must not miss anything, drive them from the stream — a `CatchUpSubscription` or a rebuild — rather than only from live bus traffic.

`expectedVersion` is computed as `aggregate.getVersion() − uncommittedEvents.size()`. `AggregateRoot.applyEvent` sets `version = event.version()`; it does **not** increment. The framework never assigns version numbers and never validates for gaps — the code constructing each `DomainEvent` owns that.

`EventBus` implementations behave differently enough to matter:

- **`SimpleEventBus`** dispatches synchronously on the publishing thread, so a projection runs inside your command before `save` returns. Each subscriber call is individually wrapped in `try/catch (Exception)`, so one throwing subscriber does not stop the others — but an `Error` aborts the loop.
- **`KafkaEventBus`** publishes keyed by `aggregateId`, giving per-aggregate ordering, and consumes through a `@KafkaListener`. The send future is not awaited, so publish failures are not observed. `subscribe` is local-only; it does not create a consumer.
- **`DaprEventBus`** publishes with a `partitionKey` header but has **no inbound listener** — wire a Dapr subscription and call `dispatch(message)` yourself. Unlike the other two, its dispatch has **no per-handler try/catch**, so one throwing subscriber aborts the rest for that event.

There is no `unsubscribe` on `EventBus`, anywhere. A projection registered twice leaves the first subscription live forever.

## Snapshots

A snapshot is written only by `AggregateRepository.save`, and only when the version crosses a multiple of `snapshot-interval` — a boundary test, not `version % interval == 0`, so a batch jumping from 98 to 103 with an interval of 100 still snapshots. Both hooks throw by default; override `createSnapshotState()` and `restoreFromSnapshot(state, version)` to opt in. The payload is an opaque `String` you serialise yourself — the module provides no snapshot serializer.

`InMemorySnapshotStore` keeps only the latest per aggregate. `JpaSnapshotStore` appends a new row every time and **never prunes**, so the `aggregate_snapshots` table grows without limit; `findLatest` orders by `version` descending.

## Projections and rebuild

`ProjectionManager.register` subscribes the projection to the bus for each of its `interestedEventTypes()`. Dispatch is therefore whatever the bus does — synchronous on the publishing thread with `SimpleEventBus`. There is no executor and no async anywhere in `ProjectionManager`.

The checkpoint advances only when `handle` returns normally. **A failing event is logged at error and silently dropped** — no retry, no dead-letter — and the position stays behind. Fix the handler, then rebuild.

`rebuild(name, eventStore)` resets the checkpoint to zero and replays `getAllEvents()` from the beginning. Three things to know before you call it:

- **It does not clear the read model.** There is no reset hook on `Projection` at all. Every event is re-applied on top of whatever is already there — fine for idempotent upserts, actively wrong for counters and append-style projections. **Truncate the read model yourself first.**
- **It is synchronous and loads the whole global stream into a `List`** — no paging, no streaming.
- **The projection stays subscribed to the live bus throughout**, so live events interleave with replayed ones and can be applied twice. There is no pause.

The two counters also occupy different position spaces — live dispatch advances only for *interested* events, rebuild for *every* event — so the numbers are not comparable. `InMemoryProjectionCheckpointStore` is per-JVM and lost on restart; `JpaProjectionCheckpointStore` is durable and shared, but its read-modify-write has no version column and no transaction, so two replicas can clobber each other's position.

## The `dapr` store type persists only the stream

With `event-store-type: dapr`, exactly one thing is durable: the event stream, held as one whole-stream document per aggregate under the key `es:<aggregateId>`. The three supporting stores fall back to in-memory variants, each `@ConditionalOnMissingBean` so your own bean wins:

| Component | Under `dapr` |
| --- | --- |
| `EventStore` | `DaprEventStore` — durable, ETag-guarded |
| `SnapshotStore` | `InMemorySnapshotStore` — **lost on restart** |
| `ProjectionCheckpointStore` | `InMemoryProjectionCheckpointStore` — **lost on restart, per-replica** |
| `SagaStateStore` | `InMemorySagaStateStore` — **lost on restart, so in-flight sagas are orphaned** |

A second limitation follows from the whole-stream-per-key shape: `DaprEventStore` does not implement `getAllEvents()`, so the interface default throws `UnsupportedOperationException`. **`ProjectionManager.rebuild` and `CatchUpSubscription.start` cannot be used with this store type.** And note the `EventStore` bean additionally requires a `DaprFacade` bean — without one no `EventStore` is created at all, while the three in-memory fallbacks still are, so the context fails on a missing dependency rather than a clear message.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-event-sourcing</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`DomainEvent`** — a record: `eventId`, `aggregateId`, `aggregateType`, `version` (int), `eventType`, `payload` (serialized, typically JSON), `occurredAt`. No validation; nulls are accepted.
- **`EventStore`** — `saveEvents(aggregateId, events, expectedVersion)`, `getEvents(aggregateId)`, `getEventsAfterVersion(aggregateId, version)`, and `getAllEvents()` where supported.
- **`AggregateRoot`** — extend it and implement `protected abstract void apply(DomainEvent event)`. You get `getAggregateId()`, `getVersion()`, `applyEvent(event)`, `getUncommittedEvents()`, `markEventsAsCommitted()`, and the snapshot hooks. **Not thread-safe** — the uncommitted list is a plain `ArrayList` and the fields are non-volatile. One aggregate instance belongs to one command on one thread.
- **`AggregateRepository`** — `load(aggregateId, Class<T>)` (needs a no-arg constructor; throws `IllegalStateException` when the stream is empty and no snapshot restored) and `save(aggregate)`. **`RetryingAggregateRepository.executeWithRetry`** wraps the pair.
- **`Projection`** — `getName()`, `interestedEventTypes()`, `handle(event)`. `ProjectionManager` does `register(projection)` and `rebuild(name, eventStore)`.
- **`EventUpcaster`** / **`UpcasterChain`** — `supports(eventType, version)` and `upcast(event)`. The chain re-runs passes until nothing changes, bounded by `upcasters.size() + 1`; an upcaster that always reports `supports` burns all passes and stops silently.
- **`CatchUpSubscription`** — `start()` / `start(fromPosition)`, `stop()`, `getPosition()`, `getState()` (`NEW`, `CATCHING_UP`, `LIVE`, `STOPPED`). `start()` replays **synchronously on the calling thread**; live events arriving during replay are buffered and drained on the flip to `LIVE`. `stop()` never removes the bus subscription.

> **Upcasters run on read only.** `UpcasterChain.apply` is invoked by the event stores, never by the buses or `ProjectionManager`. A projection fed **live** from the bus therefore sees raw events, while the *same* projection rebuilt from the store sees upcast ones. Keep `handle` tolerant of both shapes, or rebuild rather than relying on live dispatch after a schema change.

## A complete write side

```java
package com.example.orders;

import com.adhar.kit.eventsourcing.core.AggregateRoot;
import com.adhar.kit.eventsourcing.core.DomainEvent;
import com.adhar.kit.eventsourcing.repository.RetryingAggregateRepository;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.UUID;

public class Order extends AggregateRoot {
    private OrderStatus status;

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

@Service
public class OrderService {

    private final RetryingAggregateRepository repository;

    public OrderService(RetryingAggregateRepository repository) {
        this.repository = repository;
    }

    public void cancel(String orderId, String reason) {
        // the command runs again on every attempt - keep it free of external side effects
        repository.executeWithRetry(orderId, Order.class, order -> order.cancel(reason));
    }
}
```

The projection side is an ordinary bean implementing `Projection`, registered with `ProjectionManager.register(...)`:

```java
@Component
public class OrderSummaryProjection implements Projection {
    private final OrderSummaryRepository summaries;

    public OrderSummaryProjection(OrderSummaryRepository summaries) { this.summaries = summaries; }

    @Override public String getName() { return "order-summary"; }

    @Override public Set<String> interestedEventTypes() {
        return Set.of("OrderCreated", "OrderCancelled");
    }

    @Override public void handle(DomainEvent event) {
        // must be idempotent: a rebuild re-applies every event over existing state
        summaries.upsert(event.aggregateId(), event.eventType());
    }
}
```

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.event-sourcing.enabled` | Master switch | `true` |
| `adhar.event-sourcing.event-store-type` | `jpa`, `in-memory`, or `dapr` | `jpa` |
| `adhar.event-sourcing.snapshot-interval` | Version boundary that triggers a snapshot | `100` |
| `adhar.event-sourcing.retry-max-attempts` | `ConcurrencyException` retries, no backoff | `3` |
| `adhar.event-sourcing.kafka.enabled` | Use `KafkaEventBus` instead of in-process | `false` |
| `adhar.event-sourcing.kafka.topic` | Topic events are published to | `adhar.event-sourcing.events` |
| `adhar.event-sourcing.kafka.group-id` | Consumer group | `adhar-event-sourcing` |
| `adhar.event-sourcing.dapr.enabled` | Dapr event bus (set `false` to fall back to `SimpleEventBus`) | `true` |
| `adhar.event-sourcing.dapr.pubsub-name` | Dapr pub/sub component | `pubsub` |
| `adhar.event-sourcing.dapr.topic` | Dapr topic | `adhar.event-sourcing.events` |
| `adhar.event-sourcing.dapr.state-store` | Dapr state store for the stream | `statestore` |

An unrecognised `event-store-type` matches no configuration, so the context fails on a missing `EventStore` bean rather than with a clear message. The JPA configuration also carries `@EnableJpaRepositories(basePackages = "com.adhar.kit.eventsourcing")`, which can interact with your own repository scanning.

> **There are no Micrometer metrics and no health indicator in this module.** The only observability surfaces are SLF4J logging and `EventSourcingFacade.health()`, which returns `enabled`, `eventStoreType` and `eventBusType`. Instrument the write path yourself with [metrics](/adhar-kit/modules/metrics) to see append rates or conflict counts.

## Sagas

`SagaManager` (`register`, `start`, `onEvent`) drives a `SagaDefinition` of ordered `SagaStep`s. A step with an `awaitEventType` pauses until that event arrives; a step without one advances immediately by recursion, so a long synchronous saga nests one stack frame per step. Correlation is matched against the **event's `aggregateId`**, and an instance with a null `correlationId` matches every event.

On failure — the step action throws, or the step's `failureEventType` arrives — the manager sets `COMPENSATING`, then runs compensations **in reverse from `currentStepIndex − 1` down to 0**. The currently failing step is **not** compensated. A compensation that throws does not abort the loop; the rest still run and the terminal status becomes `FAILED` instead of `COMPENSATED`. Compensations are never retried.

## Testing

- **Test aggregates without any infrastructure.** `AggregateRoot` has no dependencies — construct one, call `applyEvent`, and assert on the state your `apply` produced plus `getUncommittedEvents()`.
- **Use `event-store-type: in-memory` for everything else.** It is the only store with a genuinely correct concurrency check, which makes it the right place to assert that `ConcurrencyException` is raised and that `executeWithRetry` reloads. Fire two threads at one aggregate through a latch.
- **Assert that a retried command re-ran** by incrementing a counter inside the `Consumer` — that is the behaviour most likely to bite in production. And make rebuild tests truncate first, so the double-count caveat is documented in code.
- There is **no event-sourcing test support in `adhar-kit-test-commons`**. Use `PostgresTestContainer` via `BaseIntegrationTest` if you need the JPA store against a real database; the module's own tests mock every repository and never touch one.

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Two events share a version and no exception was raised | The JPA store's check is a read-then-write race with no unique constraint | Add the unique index on `(aggregate_id, version)`, or serialise writes per aggregate |
| `ConcurrencyException` under load | Two writers held the same `expectedVersion` | Use `RetryingAggregateRepository`, and keep aggregates small enough that contention is rare |
| Retries hammer the database | `executeWithRetry` has no backoff | Lower `retry-max-attempts`; add your own backoff around the call |
| A command's side effect happened three times | The `Consumer` re-runs on every retry attempt | Move side effects outside the command, or emit them from a projection |
| Old events break after a schema change | `apply` expects the new payload shape | Add an `EventUpcaster` rather than editing stored events |
| A projection sees upcast events on rebuild but raw ones live | Upcasters are applied on read only, never on the bus | Make `handle` tolerant of both, or rebuild after a schema change |
| A rebuild doubles every count | `rebuild` does not clear the read model | Truncate the read model before calling it |
| `getAllEvents()` throws | `DaprEventStore` does not implement it | Use `jpa` or `in-memory` for rebuilds and catch-up subscriptions |
| Snapshots and saga state lost on restart | `event-store-type` is `in-memory`, or `dapr` | Use `jpa`, or supply your own `SnapshotStore` / `SagaStateStore` beans |
| Aggregate fails to load | `load` needs a no-arg constructor, and throws on an empty stream | Give the aggregate one; build state only through `apply` |

## See also

- [Messaging](/adhar-kit/modules/messaging) — carries these events beyond the process when Kafka is enabled.
- [Persistence](/adhar-kit/modules/persistence) — backs the JPA event, snapshot, checkpoint and saga tables, and offers the outbox when state, not the stream, is your source of truth.
- [Dapr](/adhar-kit/modules/dapr) — the state-store and pub/sub backend for the `dapr` store type.
- [Concepts](/adhar-kit/concepts) — how the facade and module layering fit together.
