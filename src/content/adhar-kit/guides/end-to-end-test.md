---
title: "Write an end-to-end test with real dependencies"
section: "Guides"
order: 6
category: "Testing"
path: "/adhar-kit/guides/end-to-end-test"
---

# Write an end-to-end test with real dependencies

> Spin up the dependencies declared in your service manifest and run real integration tests.

**Category:** Testing

### 1. Annotate the test

@AdharTest reads service.yaml, starts TestContainers, and injects ready-to-use clients.

```java
@AdharTest
class OrdersIT {
    @Inject OrderRepo repo;
    @Inject KafkaTestClient kafka;

    @Test
    void persistsAndPublishes() {
        repo.save(new Order("o-1", "PAID"));
        assertThat(kafka.consume("orders.placed")).hasSize(1);
    }
}
```

