---
title: "io.adhar.kit.messaging.EventPublisher"
section: "API Reference"
order: 8
kind: "interface"
module: "adhar-kit-messaging"
since: "1.0.0"
path: "/adhar-kit/javadoc/io.adhar.kit.messaging/EventPublisher"
---

# `EventPublisher`

> interface · module `adhar-kit-messaging` · since 1.0.0

```java
package io.adhar.kit.messaging;

public interface EventPublisher
```

Type-safe event publisher. When combined with @TransactionalOutbox, events are persisted in the same transaction as the originating business write.


## Methods

### `publish(`String topic`, `Object payload`)` → `void`

public · Publish a single event.

**Parameters**

- `topic` (`String`) — Destination topic / subject / queue.
- `payload` (`Object`) — Event payload — serialised via the active codec.

### `publishAll(`String topic`, `Collection<?> payloads`)` → `void`

public default · Publish a batch of events atomically.

**Parameters**

- `topic` (`String`) — Destination topic.
- `payloads` (`Collection<?>`) — Batch of events.


