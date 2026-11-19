---
title: "Batch"
section: "Modules"
order: 27
path: "/adhar-kit/modules/batch"
---

# Batch

`adhar-kit-batch` is the Spring Batch layer for applications that run on Adhar. It declares a job's parameters, builds restart-safe steps, keeps the JobRepository in your own PostgreSQL, and runs the job in a Kubernetes pod the way the platform's [BatchJob](/docs/core-concepts/batch) expects: one run, one exit code, one termination summary.

Use it for any Spring Batch job you deploy as a BatchJob, or for a small job that runs inside a service on the embedded scheduler. It is plain Spring Batch underneath: your jobs, steps, readers and writers are ordinary beans.

## At a glance

| | |
|---|---|
| **Artifact** | `com.adhar.kit:adhar-kit-batch` |
| **Facade** | `BatchFacade` (`adhar.getBatch()` through the starter) |
| **Active when** | The application defines at least one `Job` bean. A service without jobs gets none of the module's beans |
| **Needs** | A PostgreSQL `DataSource` for the JobRepository. An in-memory repository is refused |
| **Configuration** | `adhar.batch.*` |
| **Templates** | **Spring Batch Job** (`springboot-batch-service`) and **Spring Batch Partitioned Job** (`springboot-batch-partitioned`) |
| **Platform side** | [Batch Jobs](/docs/core-concepts/batch) and the [BatchJob API](/docs/reference/batch-job-api) |

## How it works

```diagram
nsv-kit-batch-layers
```

The module runs in one of two modes, chosen by `adhar.batch.mode` (default `auto`):

| Mode | When | What runs the job |
|---|---|---|
| `kubernetes` | `auto` picks it when the platform names a job (`ADHAR_BATCH_JOB`) | The **runner**: it runs that one job once, then the process exits with the run's exit code |
| `embedded` | `auto` picks it otherwise | Your service. Jobs start from the embedded scheduler or from your code |

On the platform, every run pod is `kubernetes` mode. The runner decides what this pod does:

```diagram
nsv-kit-batch-runner
```

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-batch</artifactId>
    <version>0.1.0</version>
</dependency>
```

With `adhar-kit-bom` imported, leave out the version. You also need the PostgreSQL JDBC driver. Do not add `@EnableBatchProcessing`: on Spring Boot it switches off Spring Boot's batch auto-configuration, and the kit's with it.

## Declare a job

Put `@AdharBatchJob` on the job's `@Bean` method. Its `@JobParam`s are the parameters a run accepts, and the identifying ones are the run's identity:

```java
@Bean
@AdharBatchJob(description = "Imports inbound records into Postgres", parameters = {
    @JobParam(name = "businessDate", type = ParamType.DATE, source = ParamSource.SCHEDULE),
    @JobParam(name = "source", defaultValue = "inbound/records.csv", pattern = "^[a-zA-Z0-9/._-]+$"),
    @JobParam(name = "dryRun", type = ParamType.BOOLEAN, identifying = false, defaultValue = "false")})
Job importJob(JobRepository jobRepository, Step importStep) {
    return new JobBuilder("importJob", jobRepository).start(importStep).build();
}
```

| `@JobParam` attribute | Default | Meaning |
|---|---|---|
| `name` | — | **Required** |
| `type` | `STRING` | `STRING`, `LONG`, `DOUBLE`, `BOOLEAN`, `DATE` or `DATETIME` |
| `identifying` | `true` | Part of the JobInstance's identity and of the run's name |
| `required` | `false` | |
| `defaultValue` | — | Used when a run gives no value |
| `pattern`, `allowed` | — | A regular expression, or the only values accepted |
| `source` | `INPUT` | `SCHEDULE` derives the value from the scheduled time, in the schedule's zone |
| `sensitive` | `false` | Masked in logs, events and the termination summary |
| `description` | — | Shown in the Console's run form |

- **The same parameters live in two places.** The runner validates a run against `@AdharBatchJob`; the Console and the CLI check against the BatchJob's `spec.parameters.parameters`. [`BatchContractAssertions`](/adhar-kit/modules/test-commons) fails your build when the two differ.
- **Names that look like credentials are refused.** Parameters are stored in clear text in the JobRepository; read secrets from the environment.
- **A `JobParametersIncrementer` is refused** unless `allowIncrementer = true`. An incrementer makes Spring Batch ignore the supplied parameters, so a failed run could never be restarted.

## Build steps

Inject `AdharSteps` instead of `new StepBuilder(...)`. Every step it builds uses the JobRepository's transaction manager, so business writes and progress commit together, and carries the kit's listeners and observations:

```java
@Bean
Step importStep(AdharSteps steps, ItemReader<InputRecord> reader,
                RecordProcessor processor, ItemWriter<Record> writer) {
    return steps.<InputRecord, Record>chunk("importStep")    // size from adhar.batch.chunk.size
        .reader(reader).processor(processor).writer(writer)
        .faultTolerance(FaultTolerance.transientInfrastructure()
            .skip(ValidationException.class, 100)             // skip up to 100 invalid items
            .deadLetter())                                    // and keep them
        .build();
}
```

`AdharSteps` also builds `tasklet(name, tasklet)` steps and gives you a plain `step(name)` builder.

### Fault tolerance

`FaultTolerance` is immutable; every method returns a new value.

| Method | Effect |
|---|---|
| `none()` | No retry, no skip |
| `transientInfrastructure()`, `transientHttp()` | Retry presets for connection and transient database errors, or for transient HTTP errors |
| `retryOn(types…)`, `alsoRetryOn(types…)` | Retry these exceptions |
| `maxAttempts(n)`, `backoff(initial, max)` | Override `adhar.batch.retry.*` for this step |
| `skip(type, limit)`, `skip(limit, types…)`, `skipPolicy(policy)` | Skip failing items, up to a limit |
| `deadLetter()` | Write every skipped item to the dead-letter table |

> **Note:** Retry happens per item, inside the chunk's transaction. A failed statement aborts a PostgreSQL transaction, so a retried database *write* in the same chunk cannot succeed; the run resumes from its last commit on restart instead. Retry pays off on reads, on processors that call other systems, and on getting a connection.

### Dead letters

With `deadLetter()`, a skipped item is written to the `ADHAR_BATCH_DEAD_LETTER` table on the JobRepository's database, in the same transaction as its chunk. The count appears in the termination summary (`deadLettered`), the `adhar.batch.items.dead.lettered` meter and `adhar batch dlq`. Over-long values are truncated rather than failing the chunk.

## Read and write

The builders are restart-safe: a restarted step continues exactly where the last commit left it.

| Builder | Use it for |
|---|---|
| `KeysetPagingItemReaderBuilder` | Paging a table by a unique key (`WHERE key > last ORDER BY key`), never by offset. It refuses a key no primary key or unique index covers. Page size from `adhar.batch.page.size` |
| `JdbcItemReaderBuilder`, `JpaItemReaderBuilder` | Ordinary JDBC and JPA readers with the kit's page size |
| `PostgresUpsertItemWriterBuilder` | `INSERT … ON CONFLICT (keys) DO UPDATE`: writing an item twice leaves one row, which makes a chunk's output exactly-once on restart |
| `JdbcItemWriterBuilder` | Plain JDBC batch writes |
| `CsvItemReaderBuilder`, `CsvItemWriterBuilder` | CSV files |
| `JsonItemReaderBuilder`, `JsonItemWriterBuilder`, `JsonLinesItemReaderBuilder`, `JsonLinesItemWriterBuilder` | JSON arrays and JSON Lines |
| `S3ItemReaderBuilder`, `S3ItemWriterBuilder` | One object, or every object under a prefix in key order, in an S3 bucket |

```java
JdbcPagingItemReader<InputRecord> reader = KeysetPagingItemReaderBuilder.of(dataSource, InputRecord.class)
        .from("public.inbound_records")
        .where("business_date = :businessDate")
        .parameter("businessDate", businessDate)
        .key("record_key")
        .build();

JdbcBatchItemWriter<Record> writer = PostgresUpsertItemWriterBuilder.<Record>into(dataSource, "public.records")
        .columns("record_key", "amount", "business_date")
        .conflictOn("record_key")
        .build();
```

**S3 on the platform is RustFS.** When `spring-cloud-aws-starter-s3` is on the classpath, the kit points it at the platform's object store for every key you have not set: the endpoint (`ADHAR_S3_ENDPOINT`, else the in-cluster RustFS service), path-style access, the region (`ADHAR_S3_REGION`, else `us-east-1`) and the credentials (`ADHAR_S3_ACCESS_KEY`, `ADHAR_S3_SECRET_KEY`). A `Bucket`'s connection Secret supplies those variables. An explicit `spring.cloud.aws.*` setting always wins, so an application that talks to AWS sets its own.

An S3 reader fails the step when the selection is empty, because a missing input is far more often a wrong path than an empty day; set `strict(false)` to allow it.

## Partition a job

A partitioned run is one **manager** pod and several **worker** pods. The manager splits the input and hands one request per partition to the workers through a table in your own database (the `jdbc` channel). A restart re-runs only the partitions that did not complete, each from its own last commit.

```java
@Bean
@AdharBatchJob(parameters = @JobParam(name = "businessDate", type = ParamType.DATE, source = ParamSource.SCHEDULE))
Job importJob(JobRepository jobRepository, RemotePartitioning partitioning, DataSource dataSource) {
    return new JobBuilder("importJob", jobRepository)
        .start(partitioning.manager("importManager", "importStep",
            SqlKeyRangePartitioner.of(dataSource, "public.inbound_records", "id").build()))
        .build();
}

@Bean
@ConditionalOnBatchRole(BatchRole.WORKER)
Step importStep(AdharSteps steps, JdbcPagingItemReader<Record> rangeReader, ItemWriter<Record> writer) {
    return steps.<Record, Record>chunk("importStep").reader(rangeReader).writer(writer).build();
}
```

- **`SqlKeyRangePartitioner`** splits a table into key ranges, by equal row counts (`NTILE`, the default) or equal-width integer ranges (`MIN_MAX`). It always creates exactly `gridSize` partitions, so their names stay stable across a restart. Each partition's context carries `minKey` and `maxKey`.
- **`ObjectPrefixPartitioner`** makes one partition per "directory" under an S3 prefix (or per object with `perObject()`); the input, not the grid size, decides the count. `AdharRangePartitioner` splits a plain numeric range.
- **The role** comes from `ADHAR_BATCH_ROLE` (`single`, `manager`, `worker` or `indexed`). `@ConditionalOnBatchRole` creates a bean only in that role. The platform sets the role and the grid size; you do not.
- **On the platform**, set `mode: partitioned` and `workers` on the BatchJob. It runs as a Volcano gang in the production profile and as an Indexed Job on plain Kubernetes. See [Volcano and partitioned jobs](/docs/core-concepts/batch#volcano-and-partitioned-jobs).

## Run in a service

For a job that belongs inside a long-running service, turn on the embedded scheduler. It has two engines:

| Engine | Use it for |
|---|---|
| `simple` (default) | A few cron schedules, on the service's own threads, with a lock row per job so only one replica runs a slot |
| `quartz` | Sub-minute or business-hours schedules, and runs that must carry on on another replica when one dies. A clustered Quartz JDBC job store in the `batch` schema |

```yaml
adhar:
  batch:
    scheduler:
      enabled: true
      engine: quartz
      time-zone: Asia/Singapore
    quartz:
      misfire: latest                    # skip | latest | all
      max-catch-up: 24                   # the most slots `all` runs after an outage
      triggers:
        importJob:
          - name: nightly
            kind: cron                   # cron | interval | daily
            expression: "0 30 1 ? * *"   # Quartz syntax, seconds first
```

Both engines identify a slot the same way the platform does, so a job keeps its JobInstances, restart points and run names if it changes engine, or moves to a BatchJob. With `engine: quartz`, `adhar.batch.scheduler.lock` must stay `jdbc`.

From code, the facade schedules and inspects jobs in embedded mode:

```java
BatchFacade batch = BatchFacade.getInstance();      // or adhar.getBatch()
batch.scheduleJob("nightlyReport", "0 0 2 * * *");
BatchJobStats stats = batch.getJobStats("nightlyReport");
```

`BatchOperator` (`batch.getOperator()`) starts, restarts, stops, abandons and recovers executions, and looks up history.

## Restart and recovery

- **A restart is Spring Batch's.** It is a new execution of the same JobInstance, and completed steps do not run again. The runner restarts automatically when the last execution of a run's identity is `FAILED` or `STOPPED`.
- **A dead owner is recovered.** Each running execution holds a lease, renewed every `adhar.batch.recovery.heartbeat-interval`. When a pod finds an execution still `STARTED` whose heartbeat is older than `stale-after` and whose owner pod is gone, it marks it `FAILED` and restarts it. If the owner is still terminating, it waits up to `max-wait`.
- **A graceful stop.** SIGTERM stops the job at the next chunk boundary and records `STOPPED` within `adhar.batch.shutdown.timeout`. Keep that below the BatchJob's `terminationGracePeriodSeconds`.
- **Already complete.** A run whose identity already completed exits `0` as skipped. Set `adhar.batch.exit.already-complete: fail` to exit `3` instead.

The runner's exit codes are the platform's: see [Exit codes](/docs/reference/batch-job-api#exit-codes).

## Observability

Spring Batch's own meters (`spring.batch.job`, `spring.batch.step`, `spring.batch.item.read`, `spring.batch.chunk.write` and others) are kept. The kit adds only what they do not say:

| Meter | Type | Tags | Meaning |
|---|---|---|---|
| `adhar.batch.run` | Gauge | `job`, `trigger` | `1` while a run is in progress |
| `adhar.batch.last.commit` | Gauge | `job`, `step` | Epoch seconds of the step's last committed chunk. A stuck step is a gauge that stops moving |
| `adhar.batch.items.dead.lettered` | Counter | `job`, `step` | Items the step dead-lettered |

On the platform, run pods push these over OTLP, and the `BatchNoProgress` and `BatchDeadLetterGrowing` alerts read them. Every log line of a run, including your own and the partition workers', carries the job, instance, execution, step, partition, business date and Kubernetes Job in its MDC. A failed execution also publishes a Spring `BatchJobFailedEvent` you can listen for.

## Configuration

| Property | Default | Meaning |
|---|---|---|
| `adhar.batch.enabled` | `true` | The module also needs at least one `Job` bean |
| `adhar.batch.mode` | `auto` | `auto`, `kubernetes` or `embedded` |
| `adhar.batch.repository.schema` | `batch` | The JobRepository's PostgreSQL schema |
| `adhar.batch.repository.table-prefix` | `BATCH_` | Becomes `spring.batch.jdbc.table-prefix` (`batch.BATCH_`) |
| `adhar.batch.repository.migrate` | `true` | Run the kit's Flyway migrations of that schema |
| `adhar.batch.recovery.heartbeat-interval` | `30s` | How often a running execution renews its lease |
| `adhar.batch.recovery.stale-after` | `2m` | A `STARTED` execution with an older heartbeat is recovered |
| `adhar.batch.recovery.max-wait` | `10m` | How long a run waits for a terminating owner pod |
| `adhar.batch.shutdown.timeout` | `90s` | Graceful stop of a running job on shutdown |
| `adhar.batch.exit.already-complete` | `success` | `success` (exit 0) or `fail` (exit 3) |
| `adhar.batch.chunk.size` | `100` | Chunk size for `AdharSteps.chunk(name)` |
| `adhar.batch.page.size` | `500` | Page size for the kit's paging readers |
| `adhar.batch.retry.max-attempts` | `3` | `FaultTolerance` retry presets |
| `adhar.batch.retry.initial-backoff`, `max-backoff` | `1s`, `30s` | |
| `adhar.batch.dead-letter.enabled` | `true` | `deadLetter()` writes to the JDBC table |
| `adhar.batch.telemetry.trace-items` | `false` | Per-item spans. Off: a million items would be a million spans |
| `adhar.batch.partition.transport` | `jdbc` | The partition channel |
| `adhar.batch.partition.poll-interval` | `5s` | How often the manager and idle workers look at the repository |
| `adhar.batch.scheduler.enabled` | `false` | The embedded scheduler |
| `adhar.batch.scheduler.engine` | `simple` | `simple` or `quartz` |
| `adhar.batch.scheduler.time-zone` | `UTC` | |
| `adhar.batch.scheduler.lock` | `jdbc` | `jdbc` or `none`; `none` is refused with `quartz` |

In `kubernetes` mode, the platform supplies the job, role, parameters, partition settings and the JobRepository's connection through the environment. Do not set them yourself.

## Test it

Add [`adhar-kit-test-commons`](/adhar-kit/modules/test-commons) and keep the manifest and the code in step:

```java
@AdharBatchTest
class BatchJobContractTest {
    @Test
    void theManifestMatchesTheCode(@Autowired ApplicationContext context) {
        BatchContractAssertions.assertContract(context, BatchContractAssertions.DEFAULT_MANIFEST);
    }
}
```

It checks that `deploy/base/batchjob.yaml` declares exactly the parameters `@AdharBatchJob` declares, that the memory is at least `1Gi`, and that the grace period exceeds `adhar.batch.shutdown.timeout`. Every difference is reported at once. The templates ship this test, plus an integration test against a Testcontainers PostgreSQL.

## Limits

| Not provided | What to do instead |
|---|---|
| An in-memory JobRepository | Use PostgreSQL; the runner refuses a resourceless repository with exit `2` |
| Business calendars, JobRepository retention and the `recover`, `abandon` and `dlq-replay` ops commands in the runner | `status:in-progress`. The platform already passes them to the run |
| Remote chunking, Kafka or AMQP partition channels | `status:planned` |

## Next steps

- **[Deploy a Batch Job](/docs/guides/deploy-a-batch-job)** — from the template to a scheduled run in prod
- **[Batch Jobs](/docs/core-concepts/batch)** — the platform side: schedules, holds, dependencies and deadlines
- **[Test Commons](/adhar-kit/modules/test-commons)** — `@AdharBatchTest` and the contract assertions
