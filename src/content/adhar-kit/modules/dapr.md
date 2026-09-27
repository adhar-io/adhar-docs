---
title: "Dapr"
section: "Modules"
order: 29
path: "/adhar-kit/modules/dapr"
---

# Dapr

`adhar-kit-dapr` wraps the Dapr building blocks in simple, annotation-driven APIs: state management, pub/sub (with a real subscription endpoint), service invocation (with resilience), bindings, secrets, and configuration.

> **Status:** state, pub/sub, service invocation, bindings, secrets, and configuration are implemented on Dapr Java SDK 1.18.0. Distributed lock (`@DaprLock`), actors (`@DaprActor`), and cryptography are marked as planned and throw `UnsupportedOperationException`.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-dapr</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

`AdharDaprClient` — `saveState`, `getState`, `deleteState`, `publishEvent`, `invokeService`, `invokeBinding`, `getSecret`, `getConfiguration`. `DaprFacade` — `invokeServiceResilient`, `getStateWithETag`, `saveStateWithETag`. `StateRepository<T>` for typed state. Annotations: `@DaprState`, `@DaprPublish`, `@DaprSubscribe`, `@DaprTopic`, `@DaprConfiguration`, `@DaprBinding`, `@DaprSecret`.

## Usage

```java
@Service
public class UserService {
    private final AdharDaprClient dapr = new AdharDaprClient();

    public void saveUser(User user) {
        dapr.saveState("statestore", "user:" + user.getId(), user);
    }

    public Optional<User> getUser(String userId) {
        return dapr.getState("statestore", "user:" + userId, User.class);
    }
}
```

`@DaprState` supports a SpEL `key` (like Spring's `@Cacheable`); optimistic concurrency is available via the ETag methods.

## Configuration

```yaml
adhar:
  dapr:
    enabled: true
    app-id: orders-service
    app-port: 8080
    dapr-port: 3500
    state-store: statestore
    pubsub: pubsub
    secret-store: vault
```

Dapr complements the [Adhar Platform](/docs): sidecars handle the distributed-systems plumbing while the platform provides the components (state stores, pub/sub brokers, secret stores).
