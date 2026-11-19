---
title: "Test Commons"
section: "Modules"
order: 34
path: "/adhar-kit/modules/test-commons"
---

# Test Commons

`adhar-kit-test-commons` is a test-scope library for services built on the kit. `@AdharIntegrationTest` starts the containers a test needs — PostgreSQL, MongoDB, Redis, Kafka, LocalStack, Toxiproxy, Dapr — once per JVM and points the Spring context at them. It also has base classes, WireMock and fault-injection helpers, contract matchers, and `@AdharBatchTest` for Spring Batch jobs.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-test-commons` (package `com.adhar.kit.test`); declare it with `<scope>test</scope>` |
| Facade gate | None. It is not part of `adhar-kit-starter` |
| Facade | `TestContainerFacade` (programmatic container control) |
| Dependencies | **All `provided`**: Spring Boot Test, Testcontainers and its modules, WireMock, AssertJ, REST Assured, Awaitility, Spring Batch Test, `adhar-kit-commons`, `adhar-kit-batch`. Your build must declare the ones you use. |
| Needs | A Docker daemon, or a compatible endpoint, for every container helper |
| Frameworks | Spring Boot (`@SpringBootTest`) |

## How it works

```diagram
nka-test-containers
```

Each container helper (`PostgresTestContainer`, `KafkaTestContainer`, …) holds a static singleton, so every test class in a JVM shares one container per type. `TestContainerRegistry` tracks them on a shared Docker network and stops them in order.

| `AdharContainer` | Image | Properties published |
|---|---|---|
| `POSTGRES` | `postgres:15-alpine` | `spring.datasource.url`, `.username`, `.password` |
| `MONGO` | `mongo:6.0` | `spring.data.mongodb.uri` |
| `REDIS` | `redis:7-alpine` | `spring.data.redis.host`, `spring.data.redis.port` |
| `KAFKA` | `confluentinc/cp-kafka:7.5.0` | `spring.kafka.bootstrap-servers` |
| `LOCALSTACK` | `localstack/localstack:3.4` | `aws.endpoint`, `aws.region`, `aws.accessKeyId`, `aws.secretAccessKey` |
| `TOXIPROXY` | `ghcr.io/shopify/toxiproxy:2.5.0` | `toxiproxy.control.port` |
| `DAPR` | `daprio/daprd:1.13.5` | `dapr.http.endpoint`, `dapr.grpc.port` |

## Add it

With the BOM imported, declare the module and the Testcontainers modules for the containers you use. Spring Boot's BOM manages the Testcontainers versions.

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-test-commons</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers-junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers-postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

| Container | Testcontainers module to add |
|---|---|
| `POSTGRES` | `testcontainers-postgresql` (plus your PostgreSQL driver) |
| `MONGO` | `testcontainers-mongodb` |
| `KAFKA` | `testcontainers-kafka` |
| `LOCALSTACK` | `testcontainers-localstack` |
| `TOXIPROXY` | `testcontainers-toxiproxy` |
| `REDIS`, `DAPR` | `testcontainers` (core) |

## Use it

### Write an integration test

`@AdharIntegrationTest` is `@ExtendWith(AdharKitExtension.class)` + `@SpringBootTest` + the dynamic-property configuration:

```java
import com.adhar.kit.test.junit.AdharContainer;
import com.adhar.kit.test.junit.AdharIntegrationTest;
import com.adhar.kit.test.junit.ContainerProperty;

@AdharIntegrationTest({AdharContainer.POSTGRES, AdharContainer.KAFKA})
class OrderServiceIT {

    @ContainerProperty("spring.datasource.url")
    String jdbcUrl;

    @Autowired
    OrderService orders;

    @Test
    void storesAnOrder() {
        assertThat(orders.create(new OrderRequest("ada"))).isNotNull();
    }
}
```

**Check:** the test log shows each container starting once; a second test class with the same containers reuses them.

Besides `@ContainerProperty` fields and parameters, the extension can inject a `ContainerConnectionInfo` (`get(key)`, `asMap()`) or the `TestContainerRegistry`.

### Use a base class instead

Each container also has an abstract base class with its own `@DynamicPropertySource`: `BaseIntegrationTest` (PostgreSQL), `MongoIntegrationTest`, `RedisIntegrationTest`, `KafkaIntegrationTest`, `LocalStackIntegrationTest`, `ToxiproxyIntegrationTest`, `DaprIntegrationTest`, `WireMockIntegrationTest` and `CompositeIntegrationTest`. For tests without containers there are `BaseUnitTest` (Mockito extension), `BaseControllerTest` (`@SpringBootTest` + MockMvc), and the tag annotations `@UnitTest` and `@IntegrationTest` (the latter also activates the `test` profile).

### Inject network faults

`NetworkToxics` drives a Toxiproxy proxy in front of another container:

```java
ContainerProxy proxy = NetworkToxics.proxy(ToxiproxyTestContainer.getInstance(), postgres, 5432);
NetworkToxics.addLatency(proxy, "slow-db", 500, 50);   // latency and jitter, in ms
NetworkToxics.takeDown(proxy);                          // connection refused
NetworkToxics.bringUp(proxy);
```

### Other helpers

| Helper | Use |
|---|---|
| `WireMockTestServer.start()` | A WireMock server; `baseUrl()`, `port()`, `rawServer()` |
| `MockRestServer.create(restTemplate)` | Expectations on a `RestTemplate` |
| `ContractLoader`, `JsonContractMatcher`, `ContractTestBase` | Load JSON contracts and verify responses against them |
| `DatabaseSeeder.forDataSource(ds)` | `execute`, `runScript`, `insert` and `insertAll` for test data |
| `TestDataBuilder<T>` | Fluent fixtures, plus `randomId()`, `randomEmail()`, `randomName()` |
| `CustomAssertions` | `assertValidUUID`, `assertValidEmail`, `assertRecentTimestamp`, `assertSameProperties` |
| `TestContainerFacade.getInstance()` | Start containers from code, such as `startPostgres()` |

### Test a batch job

`@AdharBatchTest` runs a batch application as the platform does: `@SpringBootTest` with no web server, `@SpringBatchTest`'s `JobOperatorTestUtils` and `JobRepositoryTestUtils`, a fresh database on a PostgreSQL `postgres:18.4` container migrated by the kit's Flyway `batch` schema, and Spring Boot's start-up job runner off. `s3 = true` adds a LocalStack S3 endpoint. Without Docker the test fails rather than skips.

```java
@AdharBatchTest
class ImportJobIT {

    @Autowired JobOperatorTestUtils jobs;

    @Test
    void importsTheDay() throws Exception {
        JobExecution run = jobs.startJob(new JobParametersBuilder()
                .addLocalDate("businessDate", LocalDate.of(2026, 11, 3)).toJobParameters());
        assertThat(run.getStatus()).isEqualTo(BatchStatus.COMPLETED);
    }
}
```

- **`RestartScenario`** with a `FailureInjector` bean fails the job at a chosen item, restarts it with the same parameters, and asserts it resumed from the last commit and wrote each row exactly once.
- **`BatchContractAssertions.assertContract(context, DEFAULT_MANIFEST)`** checks the job's `@AdharBatchJob` parameters, memory and termination grace period against `deploy/base/batchjob.yaml`, and reports every difference at once.

See [Batch](/adhar-kit/modules/batch) for the job model these check.

## Limits

- **Provided-scope dependencies.** Nothing comes transitively; a missing Testcontainers module shows up as `NoClassDefFoundError` when its container starts.
- **Fixed images.** The helpers pin the images in the table above; `PostgresTestContainer.PLATFORM_IMAGE` (`postgres:18.4`) is used only by `@AdharBatchTest`.
- **Shared state.** Containers are JVM-wide singletons; a test that writes data should clean up or use unique keys.

## Next steps

- [Batch](/adhar-kit/modules/batch) — the job model `@AdharBatchTest` and the contract assertions check.
- [Building & Contributing](/adhar-kit/build#running-tests) — how the kit's own build runs unit and integration tests.
- [Modules Overview](/adhar-kit/modules/overview) — the other modules.
