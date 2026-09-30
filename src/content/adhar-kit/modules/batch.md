---
title: "Batch"
section: "Modules"
order: 27
path: "/adhar-kit/modules/batch"
---

# Batch

`adhar-kit-batch` provides enterprise batch processing on Spring Batch: runtime cron scheduling, CSV/JDBC/JPA/JSON reader and writer builders, range partitioning, retryable steps, and Micrometer metrics. It exists because **Spring Batch gives you the engine but not the operations layer** — a raw Spring Batch app has no distributed cron safety, no per-job statistics, and no failure event you can alert on. This module supplies those, and then gets out of the way.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-batch` |
| Built on | Spring Batch (`spring-boot-starter-batch`), Spring `TaskScheduler`, Micrometer (optional) |
| Entry points | `BatchFacade` (via `adhar.getBatch()`), `BatchScheduler`, `BatchOperator`, `RetryableStepBuilderFactory` |
| Activates when | `org.springframework.batch.core.job.Job` is on the classpath and `adhar.batch.enabled` is not `false` |
| Use it when | You run scheduled, chunk-oriented data jobs across more than one replica |

## How it works

`BatchAutoConfiguration` is a Spring Boot `@AutoConfiguration` gated on `@ConditionalOnClass(Job.class)`. Everything it registers uses `@ConditionalOnMissingBean`, so any bean you define yourself wins.

The pieces layer like this:

```text
   adhar.getBatch()  ->  BatchFacade
                            |
          +-----------------+------------------+
          |                                    |
     BatchScheduler                       BatchMetrics
     (cron -> TaskScheduler)              (Micrometer, optional)
          |                                    ^
          | per fire time                      | recordJobExecution
          v                                    |
     SchedulerLock.tryLock(jobName, ttl)  AdharJobExecutionListener
          |  not acquired -> skip on this node      |
          v                                         +-> BatchJobFailedEvent
     JobLauncher.run(job, run.id=<millis>)
          |
          v
     Spring Batch Job -> Step (chunk) -> Reader/Processor/Writer
                              |
                              +-> AdharStepExecutionListener, AdharSkipListener
```

Three details are worth knowing up front:

1. **The scheduler looks jobs up by Spring bean name.** `scheduleJob("nightlyReport", ...)` resolves `applicationContext.getBean("nightlyReport", Job.class)`, so the string must be the bean name of a `Job`, not a display label.
2. **Every scheduled run gets a unique `run.id` job parameter** (`System.currentTimeMillis()`). Spring Batch refuses to re-run a completed job with identical parameters; this is what makes a nightly job re-runnable.
3. **Multi-replica safety is automatic if you have a `DataSource`.** The auto-configuration then registers a `JdbcSchedulerLock` (table `adhar_scheduler_lock`) and the scheduler acquires a lock named after the job, with a 30-minute TTL, before launching. A replica that cannot take the lock logs and skips. Without a `DataSource`, no lock is registered and every replica fires.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-batch</artifactId>
    <version>0.1.0</version>
</dependency>
```

Micrometer, Jakarta Persistence, and Jackson are `optional` in the module POM. Add `micrometer-core` (or any Spring Boot Actuator registry) to get `BatchMetrics`; add JPA for `JpaItemReaderBuilder`; add Jackson for the JSON reader and writer builders.

## Key APIs

`BatchFacade`, reached through `adhar.getBatch()` or `BatchFacade.getInstance()`:

- `scheduleJob(jobName, cronExpression)` — register a cron trigger at runtime. Re-scheduling the same name cancels and replaces the old trigger.
- `cancelJob(jobName)` / `listScheduledJobs()` — manage the live schedule.
- `getJobStats(jobName)` — a `BatchJobStats` record of `totalExecutions`, `successCount`, `failureCount`, `avgDurationMs`, `lastExecutionTime`.
- `recordJobExecution(jobName, durationMs, success)` — record an execution yourself when you launch a job outside the scheduler.
- `getDefaultChunkSize()` / `getDefaultPageSize()` — the configured defaults, so your step builders and readers stay consistent with configuration.
- `health()` — `enabled`, `schedulerAvailable`, `metricsAvailable`, `scheduledJobCount`, `scheduledJobs`.

Supporting components:

- `BatchOperator` — `restart(executionId)`, `stop(executionId)`, `abandon(executionId)`, `getRunningExecutions(jobName)`, `getJobExecution(executionId)`. Registered only when a `JobOperator` bean exists.
- `RetryableStepBuilderFactory.create(stepBuilder)` — wraps a `SimpleStepBuilder` in a `RetryableStepBuilder` already seeded with `adhar.batch.max-retries` and `adhar.batch.retry-on-failure`.
- `AdharRangePartitioner(start, end)` — splits an inclusive numeric range into `gridSize` partitions, writing `start` and `end` into each partition's `ExecutionContext`.
- Reader builders: `CsvItemReaderBuilder.csvReader` / `csvReaderWithHeader`, `JdbcItemReaderBuilder.cursorReader` / `pagingReader`, `JpaItemReaderBuilder.jpaPagingReader`, `JsonItemReaderBuilder.jsonReader`. Writer builders: `CsvItemWriterBuilder.csvWriter`, `JdbcItemWriterBuilder.beanMappedWriter` / `columnMappedWriter`, `JsonItemWriterBuilder.jsonWriter`.
- `BatchJobFailedEvent` — a Spring `ApplicationEvent` carrying `jobName`, `jobExecutionId`, `status`, `exitCode`, `exitDescription`, `durationMs`, and `failureExceptions`.

## Worked example — schedule a job

```java
import com.adhar.kit.batch.metrics.BatchJobStats;
import com.adhar.kit.starter.AdharFacade;

@Service
public class ReportService {
    private final AdharFacade adhar;
    public ReportService(AdharFacade adhar) { this.adhar = adhar; }

    public void scheduleNightlyReport() {
        adhar.getBatch().scheduleJob("nightlyReportJob", "0 0 2 * * ?");   // 02:00 daily
    }

    public BatchJobStats stats() {
        return adhar.getBatch().getJobStats("nightlyReportJob");
    }
}
```

`"nightlyReportJob"` must be the bean name of a `Job` in the context; otherwise the scheduled run fails with a bean-lookup error at fire time, not at schedule time.

## Worked example — a partitioned, retrying, CSV-to-JDBC job

```java
import com.adhar.kit.batch.partitioner.AdharRangePartitioner;
import com.adhar.kit.batch.reader.CsvItemReaderBuilder;
import com.adhar.kit.batch.retry.RetryableStepBuilderFactory;
import com.adhar.kit.batch.writer.JdbcItemWriterBuilder;

@Configuration
public class ImportJobConfig {

    @Bean
    Step importStep(JobRepository jobRepository,
                    PlatformTransactionManager tx,
                    DataSource dataSource,
                    RetryableStepBuilderFactory retryables) {

        var reader = CsvItemReaderBuilder
                .csvReaderWithHeader("/data/customers.csv", Customer.class)
                .name("customerCsvReader")
                .build();

        var writer = JdbcItemWriterBuilder.<Customer>beanMappedWriter(
                dataSource,
                "INSERT INTO customer (id, email) VALUES (:id, :email)");

        SimpleStepBuilder<Customer, Customer> base = new StepBuilder("importStep", jobRepository)
                .<Customer, Customer>chunk(100, tx)
                .reader(reader)
                .writer(writer);

        return retryables.create(base)
                .retryOn(TransientDataAccessException.class)
                .withSkipLimit(50)
                .skipOn(FlatFileParseException.class)
                .build()
                .build();
    }

    @Bean
    Partitioner customerRangePartitioner() {
        return new AdharRangePartitioner(1, 1_000_000);   // read start/end from ExecutionContext
    }
}
```

`retryables.create(...)` returns a `RetryableStepBuilder`; its `build()` yields a `FaultTolerantStepBuilder`, whose own `build()` yields the `Step` — hence the two calls. Calling `withRetryLimit(n)` explicitly overrides the configured default.

Alert on failures by listening for the published event:

```java
@EventListener
public void onBatchFailure(BatchJobFailedEvent event) {
    pager.page("Batch job %s failed after %dms: %s"
        .formatted(event.getJobName(), event.getDurationMs(), event.getExitDescription()));
}
```

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.batch.enabled` | Master switch for the auto-configuration | `true` |
| `adhar.batch.table-prefix` | Prefix for Spring Batch metadata tables | `BATCH_` |
| `adhar.batch.max-concurrent-jobs` | Concurrency limit on the `SimpleAsyncTaskExecutor` behind the job launcher | `5` |
| `adhar.batch.retry-on-failure` | Whether `RetryableStepBuilderFactory` enables retry by default | `true` |
| `adhar.batch.max-retries` | Default retry limit seeded into retryable steps | `3` |
| `adhar.batch.default-chunk-size` | Default chunk size, read back via `getDefaultChunkSize()` | `100` |
| `adhar.batch.default-page-size` | Default page size for paginated readers | `50` |

```yaml
adhar:
  batch:
    enabled: true
    table-prefix: BATCH_
    max-concurrent-jobs: 5
    retry-on-failure: true
    max-retries: 3
    default-chunk-size: 100
    default-page-size: 50
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| A scheduled job runs once per replica | No `DataSource` bean, so no `JdbcSchedulerLock` was registered | Add a `DataSource`, or supply your own `SchedulerLock` bean |
| `IllegalStateException: BatchFacade has not been initialised` | `BatchFacade.getInstance()` called before the bean was constructed | Inject `AdharFacade` and use `adhar.getBatch()` instead of the static accessor |
| `IllegalStateException: BatchScheduler is not available` | The facade was built without a scheduler | Confirm `adhar.batch.enabled` is true and Spring Batch is on the classpath |
| Scheduled job fails at fire time with a bean lookup error | The name passed to `scheduleJob` is not a `Job` bean name | Use the exact bean name of the `@Bean Job` |
| `getJobStats` returns nothing useful | No `MeterRegistry`, so `BatchMetrics` was not registered | Add Actuator or `micrometer-core` |
| Ambiguous `JobLauncher` injection | Spring Batch's auto-configured `JobOperator` also implements `JobLauncher` | The module's `adharJobLauncher` is `@Primary`; do not mark a second `JobLauncher` primary |
| A long job's lock expires mid-run | The scheduler lock TTL is 30 minutes | Construct your own `BatchScheduler` bean with a longer `lockTtl` |

## See also

- [Health](/adhar-kit/modules/health) — surface a stuck or failing job in readiness checks
- [Metrics](/adhar-kit/modules/metrics) — where `BatchMetrics` counters land
- [Persistence](/adhar-kit/modules/persistence) — the `DataSource` the scheduler lock and JDBC readers use
- [Modules Overview](/adhar-kit/modules/overview) — the rest of the kit
