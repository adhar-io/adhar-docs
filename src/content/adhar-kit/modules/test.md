---
title: "adhar-kit-test"
section: "Modules"
order: 9
path: "/adhar-kit/modules/test"
---

# adhar-kit-test

> One annotation. Real Postgres, Kafka, Vault, Redis. No mocks.

**Package:** `io.adhar.kit.test` · **Status:** stable · **Since:** 1.0

`@AdharTest` boots the application with TestContainers wired in for
every declared module. Container reuse keeps the suite fast.

## Test pyramid

```text
              ┌──────────────────┐
              │  e2e (browser)   │   < 5%   minutes
              ├──────────────────┤
              │  @AdharTest      │  ~15%   30s suites
              │  (TestContainers)│
              ├──────────────────┤
              │  slice tests     │  ~30%   seconds
              │  @WebTest etc.   │
              ├──────────────────┤
              │  unit tests      │  ~50%   millis
              └──────────────────┘
```

## Example

```java
@AdharTest(
    modules = { Modules.DATA, Modules.MESSAGING },
    containers = { Postgres.class, Kafka.class }
)
class OrdersIT {

    @Inject OrderRepo repo;
    @Inject EventPublisher events;

    @Test
    void placesAndPublishes() {
        var saved = repo.save(new Order("o-1", "SKU-1", 2, 0));
        assertThat(saved.id()).isEqualTo("o-1");
        TestKafka.assertEvent("orders.placed").hasField("orderId", "o-1");
    }
}
```

## Built-in containers

| Class | Image | Purpose |
|-------|-------|---------|
| `Postgres` | `postgres:16` | JDBC/JPA tests. |
| `Kafka` | `confluentinc/cp-kafka:7.6` | Messaging tests. |
| `Vault` | `hashicorp/vault:1.17` | Secrets / config. |
| `Redis` | `redis:7` | Cache tests. |
| `LocalStack` | `localstack/localstack` | AWS services. |
| `Wiremock` | `wiremock/wiremock` | HTTP stubs. |

## Helpers

- `TestKafka.assertEvent(topic)` — fluent event assertions
- `TestHttp.client()` — pre-configured WebClient pointing at the app
- `TestClock` — controllable `Clock` for deterministic time
- `TestVault.put(path, value)` — seed secrets before the test

## Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `adhar.test.reuse-containers` | `true` | Persist containers across runs. |
| `adhar.test.parallel` | `false` | Allow parallel test classes. |

## See also

- [`AdharTest`](/adhar-kit/javadoc/io.adhar.kit.test/AdharTest)
- [End-to-end test guide](/adhar-kit/guides/end-to-end-test)
