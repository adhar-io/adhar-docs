---
title: "Call another service with retries & circuit breaking"
section: "Guides"
order: 3
category: "Resilience"
path: "/adhar-kit/guides/resilient-client"
---

# Call another service with retries & circuit breaking

> Wrap an outbound call with circuit breaker, retry, and a typed fallback.

**Category:** Resilience

### 1. Inject AdharClient

AdharClient is the framework-agnostic HTTP client. It honours service discovery & timeouts from config.

```java
@Inject AdharClient client;
```

### 2. Declare policies

Combine @CircuitBreaker and @Retry with a fallback method.

```java
@CircuitBreaker(fallback = "cached")
@Retry(maxAttempts = 3, backoff = "exponential")
User fetch(String id) {
    return client.get("/users/" + id).as(User.class);
}

User cached(String id) {
    return cache.getOrDefault(id, User.UNKNOWN);
}
```

