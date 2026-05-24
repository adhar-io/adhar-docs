---
title: "Publish Kafka events with the outbox pattern"
section: "Guides"
order: 4
category: "Messaging"
path: "/adhar-kit/guides/transactional-outbox"
---

# Publish Kafka events with the outbox pattern

> Eliminate dual-writes by writing events to an outbox table inside the same DB transaction.

**Category:** Messaging

### 1. Enable the outbox

Mark the publisher with @TransactionalOutbox. The Kit installs a Liquibase migration for the outbox table.

```java
@TransactionalOutbox
@Inject EventPublisher events;
```

### 2. Publish inside a transaction

Events are persisted with the business write. A background poller drains them with at-least-once delivery.

```java
@Transactional
void place(Order o) {
    repo.save(o);
    events.publish("orders.placed", new OrderPlaced(o.id()));
}
```

