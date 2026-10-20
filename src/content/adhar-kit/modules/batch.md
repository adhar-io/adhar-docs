---
title: "Batch"
section: "Modules"
order: 27
path: "/adhar-kit/modules/batch"
---

# Batch

`adhar-kit-batch` adds enterprise batch processing on top of Spring Batch. It gives you runtime cron scheduling, CSV/JDBC/JPA/JSON reader and writer builders, range partitioning, retryable steps, and Micrometer metrics.

It exists because **Spring Batch gives you the engine but not the operations layer**. A raw Spring Batch app has no distributed cron safety, no per-job statistics, and no failure event you can alert on. This module supplies those, and then gets out of the way.

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

```diagram
kit-batch-flow
```

Three details are worth knowing up front:

1. **The scheduler looks jobs up by Spring bean name.** `scheduleJob("nightlyReportJob", ...)` resolves `applicationContext.getBean("nightlyReportJob", Job.class)`. The string must be the bean name of a `Job`, not a display label. The lookup happens inside the scheduled task, not at schedule time. So a typo fails on the **first cron fire**. The error is caught and logged at ERROR, and the trigger keeps firing on schedule forever.
2. **Every scheduled run gets a unique `run.id` job parameter.** Exactly one parameter is added: `addLong("run.id", System.currentTimeMillis())`. Spring Batch identifies a `JobInstance` by its identifying parameters. It refuses to re-run a completed instance with identical ones. So this parameter is what makes a nightly job re-runnable at all. It also means **every scheduled run is a new `JobInstance`**. The scheduler never resumes a failed run on its own; only `BatchOperator.restart` does.
3. **Multi-replica safety is automatic if you have a `DataSource`.** The auto-configuration then registers a `JdbcSchedulerLock`. Before launching, the scheduler takes a lock named after the job. A replica that cannot take the lock logs at INFO — *"Skipping scheduled job [x] — lock held by another instance"* — and returns. **Without a `DataSource`, no `SchedulerLock` bean is registered at all.** There is no in-memory fallback implementation. The scheduler is constructed with `null`, and every replica fires.

## The scheduler lock

`JdbcSchedulerLock` creates its table in its constructor. So the DDL runs when the bean is created, before any job:

```sql
CREATE TABLE IF NOT EXISTS adhar_scheduler_lock (
    lock_name    VARCHAR(255) PRIMARY KEY,
    locked_by    VARCHAR(255) NOT NULL,
    locked_at    TIMESTAMP    NOT NULL,
    locked_until TIMESTAMP    NOT NULL)
```

Acquisition is two-phase, not `ON CONFLICT`:

1. A plain `INSERT`. The primary key on `lock_name` means exactly one racing replica wins. The loser catches `DuplicateKeyException` and falls through.
2. A conditional `UPDATE ... WHERE lock_name = ? AND locked_until <= ?`. This is the expiry takeover. It succeeds only if the existing lock has expired.

Release does **not** delete the row. It sets `locked_until` to now, guarded by `AND locked_by = ?`. So history stays visible, and an `unlock` from a non-owner is a no-op. `BatchScheduler.runScheduled` releases in a `finally`, but only if it actually took the lock.

**The TTL is 30 minutes and there is no property for it.** `BatchScheduler.DEFAULT_LOCK_TTL` is `Duration.ofMinutes(30)`, and the auto-configuration passes that value explicitly. If a job runs longer than 30 minutes, its lock expires mid-run. Another replica's next cron fire then takes the lock and starts a second, concurrent run of the same job. To change the TTL, define your own `BatchScheduler` bean with the five-argument constructor:

```java
@Bean
BatchScheduler batchScheduler(TaskScheduler taskScheduler, JobLauncher jobLauncher,
                              ApplicationContext context, SchedulerLock lock) {
    return new BatchScheduler(taskScheduler, jobLauncher, context, lock, Duration.ofHours(4));
}
```

If a JVM dies while holding a lock, the lock is freed only when the TTL expires. No shutdown hook releases it.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-batch</artifactId>
    <version>0.1.0</version>
</dependency>
```

Micrometer, Jakarta Persistence and Jackson are `optional` in the module POM. Add each one for the feature it unlocks:

- `micrometer-core` (or any Spring Boot Actuator registry) for `BatchMetrics`.
- JPA for `JpaItemReaderBuilder`.
- Jackson for the JSON reader and writer builders.

## Key APIs

`BatchFacade`, reached through `adhar.getBatch()` or `BatchFacade.getInstance()`:

- `scheduleJob(jobName, cronExpression)` — Registers a cron trigger at runtime. If you schedule the same name again, it first cancels the old `ScheduledFuture` with `cancel(false)`. So a run already in progress is **not** interrupted.
- `cancelJob(jobName)` / `listScheduledJobs()` — Manage the live schedule.
- `getJobStats(jobName)` — Returns a `BatchJobStats` record of `totalExecutions`, `successCount`, `failureCount`, `avgDurationMs`, `lastExecutionTime`.
- `recordJobExecution(jobName, durationMs, success)` — Records an execution yourself, when you launch a job outside the scheduler.
- `getDefaultChunkSize()` / `getDefaultPageSize()` — Return the configured defaults, so your step builders stay consistent with configuration. Nothing else reads them. The reader builders have their own hardcoded page size of 50.
- `health()` — `enabled`, `schedulerAvailable`, `metricsAvailable`, `scheduledJobCount`, `scheduledJobs`.

Supporting components:

- `BatchOperator` — `restart(executionId)`, `stop(executionId)`, `abandon(executionId)`, `getRunningExecutions(jobName)`, `getJobExecution(executionId)`. A thin layer that delegates to Spring Batch's `JobOperator`. It is registered only when a `JobOperator` bean exists.
- `RetryableStepBuilderFactory.create(stepBuilder)` — Wraps a `SimpleStepBuilder` in a `RetryableStepBuilder`, already seeded with `adhar.batch.max-retries` and `adhar.batch.retry-on-failure`.
- `AdharRangePartitioner(start, end)` — Splits an **inclusive** numeric range into partitions keyed `partition0`, `partition1`, … It writes the long keys `start` and `end` into each `ExecutionContext`.
  - If `gridSize` is larger than the range, you get one partition per value, so **fewer than `gridSize` entries**.
  - The last partition takes the division remainder.
  - A `gridSize` of zero is not validated and throws `ArithmeticException`.
- Reader builders: `CsvItemReaderBuilder.csvReader` / `csvReaderWithHeader`, `JdbcItemReaderBuilder.cursorReader` / `pagingReader`, `JpaItemReaderBuilder.jpaPagingReader`, `JsonItemReaderBuilder.jsonReader`.
- Writer builders: `CsvItemWriterBuilder.csvWriter`, `JdbcItemWriterBuilder.beanMappedWriter` / `columnMappedWriter`, `JsonItemWriterBuilder.jsonWriter`.
- `BatchJobFailedEvent` — A Spring `ApplicationEvent` carrying `jobName`, `jobExecutionId`, `status`, `exitCode`, `exitDescription`, `durationMs` and `failureExceptions`.

## Restart and recovery

`BatchOperator.restart(executionId)` delegates straight to Spring Batch and adds nothing of its own. So Spring Batch's rules apply. A restart:

- reuses the **same `JobInstance`**;
- skips steps already marked `COMPLETED`, unless they were declared `allowStartIfComplete`;
- resumes a chunk-oriented step from its saved `ExecutionContext`.

The checked exceptions on the signature tell you the preconditions:

- `JobInstanceAlreadyCompleteException` if the instance finished successfully.
- `JobRestartException` if the job is not restartable.
- `NoSuchJobExecutionException` for an unknown id.
- `NoSuchJobException` if the job is no longer registered.

The key point about `run.id`: the **scheduler never restarts anything**. Each cron fire is a brand-new instance with a new `run.id`. So a failed nightly run is left behind unless an operator calls `restart`. Build that into your runbook, triggered by the failure event below.

`stop(executionId)` signals a stop that takes effect at the next chunk boundary. `abandon(executionId)` marks a stopped execution `ABANDONED`, so a later restart can go ahead.

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

> `BatchFacade` is **not registered as a bean by the auto-configuration**. It is a singleton, and its constructor sets the static instance. Until your application constructs one, `adhar.getBatch()` and `BatchFacade.getInstance()` both throw `IllegalStateException("BatchFacade has not been initialised")`. Declare it yourself:
>
> ```java
> @Bean
> BatchFacade batchFacade(BatchScheduler scheduler, ObjectProvider<BatchMetrics> metrics,
>                         BatchProperties properties) {
>     return new BatchFacade(scheduler, metrics.getIfAvailable(), properties);
> }
> ```

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
        return new AdharRangePartitioner(1, 1_000_000);   // reads "start"/"end" via ctx.getLong(...)
    }
}
```

`retryables.create(...)` returns a `RetryableStepBuilder`. Its `build()` returns a `FaultTolerantStepBuilder`, whose own `build()` returns the `Step`. That is why there are two calls.

Calling `withRetryLimit(n)` explicitly overrides the configured default **and re-enables retry**, even when `retry-on-failure` is `false`. Skip configuration is applied whenever there is a positive skip limit or any `skipOn(...)` class. So `skipOn(X)` on its own registers a skip limit of zero.

Readers built this way inherit Spring Batch's default `saveState = true`. The module never sets it, so the standard caveat applies. In a multi-threaded or partitioned step, if threads share a reader, its saved state will be wrong. Give each partition its own reader instance. Or disable `saveState` and accept a step that cannot be restarted.

Alert on failures by listening for the published event:

```java
@EventListener
public void onBatchFailure(BatchJobFailedEvent event) {
    pager.page("Batch job %s failed after %dms: %s"
        .formatted(event.getJobName(), event.getDurationMs(), event.getExitDescription()));
}
```

`AdharJobExecutionListener` publishes it from `afterJob`, synchronously. It runs on the job's own `adhar-batch-*` execution thread — **not** the thread that called `jobLauncher.run`. Spring's default event multicaster is synchronous, so your listener blocks that thread. Keep it fast, or make it `@Async`.

## How it behaves

- **Threads.** The job launcher is a `TaskExecutorJobLauncher` over a `SimpleAsyncTaskExecutor` with prefix `adhar-batch-`. So `jobLauncher.run` returns at once and the job runs elsewhere. `max-concurrent-jobs` is applied as `setConcurrencyLimit(...)`. That is a throttle, not a bounded pool: the executor still creates a thread per task. The cron triggers run on a separate `ThreadPoolTaskScheduler` of **pool size 2**, named `adhar-batch-scheduler-`.
- **Shutdown drops nothing gracefully.** The module declares no `@PreDestroy`, no `DisposableBean` and no `SmartLifecycle`. `BatchScheduler` does not cancel its tracked futures when the context closes. The `SimpleAsyncTaskExecutor` behind the launcher is a **local variable, not a bean**, so the container never closes it. This module neither waits for nor stops a job that is running at shutdown.
- **Failures never propagate out of the scheduler.** `runScheduled` catches every `Exception` — bean lookup, launch failure, everything — and logs at ERROR. The cron trigger survives. That is usually what you want for a nightly job, but it is dangerous if you expected the schedule to stop.
- **Statistics are in-memory and per-JVM.** `getJobStats` does not query the `MeterRegistry`. It reads a separate `ConcurrentHashMap` of accumulators that `recordJobExecution` fills. They reset on restart and are not shared across replicas. `recordStepExecution` does not feed them at all.
- **The lock table name can only be set in code**, through the two-argument `JdbcSchedulerLock` constructor. It is concatenated into the DDL and DML without escaping, so keep it a literal constant.

## Observability

`BatchMetrics` is registered when both the `MeterRegistry` class and a bean are present:

| Meter | Type | Tags |
|---|---|---|
| `adhar.batch.job.executions` | counter | `job`, `status` (`success` / `failure`) |
| `adhar.batch.job.duration` | timer | `job` |
| `adhar.batch.step.reads` | counter | `step` |
| `adhar.batch.step.writes` | counter | `step` |
| `adhar.batch.step.skips` | counter | `step` |

These land alongside your other [metrics](/adhar-kit/modules/metrics). Set two alerts:

- On `adhar.batch.job.executions{status="failure"}`.
- On a missing `success` increment within the expected window.

You need the second one because a replica that silently loses every lock race produces no failures at all, only silence.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.batch.enabled` | Master switch for the auto-configuration | `true` |
| `adhar.batch.max-concurrent-jobs` | Concurrency limit on the `SimpleAsyncTaskExecutor` behind the job launcher | `5` |
| `adhar.batch.retry-on-failure` | Whether `RetryableStepBuilderFactory` enables retry by default | `true` |
| `adhar.batch.max-retries` | Default retry limit seeded into retryable steps | `3` |
| `adhar.batch.default-chunk-size` | Read back via `getDefaultChunkSize()`; not applied automatically | `100` |
| `adhar.batch.default-page-size` | Read back via `getDefaultPageSize()`; not applied automatically | `50` |
| `adhar.batch.table-prefix` | **Bound but never read** — use `spring.batch.jdbc.table-prefix` | `BATCH_` |

```yaml
adhar:
  batch:
    max-concurrent-jobs: 5
    retry-on-failure: true
    max-retries: 3
```

## Testing

- **Drive the trigger, do not wait for it.** The module's own tests capture the `Runnable` passed to `TaskScheduler.schedule` with an `ArgumentCaptor`, and invoke it directly. This gives you repeatable coverage of the bean lookup, the `run.id` parameter, and the lock acquire-and-release path, with no wall-clock delay.
- **Test the lock against a real database.** The tests run `JdbcSchedulerLock` against an embedded H2 database per test. Each database is uniquely named (`"schedlock-" + System.nanoTime()`) and shut down in `@AfterEach`. To test the takeover path, pass `Duration.ZERO` as the TTL; this gives a lock that has already expired. Zero works because the expiry check is `locked_until <= now`. For Postgres-specific behaviour, `adhar-kit-test-commons` provides `PostgresTestContainer`.
- **Reset the facade singleton.** `BatchFacadeTest` clears the private static `instance` field by reflection, because there is no API for it. Do the same, or the facade from one test leaks into the next.
- **Wire the auto-configuration with `ApplicationContextRunner`** and `AutoConfigurations.of(BatchAutoConfiguration.class)`. Supply mocked `JobRepository` and `JobOperator` beans, a `SimpleMeterRegistry` and an embedded `DataSource`. This is how you prove the conditional gates. In particular: `BatchOperator` is absent without a `JobOperator`, and `SchedulerLock` is absent without a `DataSource`.
- There is **no batch-specific support in `adhar-kit-test-commons`** — no job-launcher helper, no batch container.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| A scheduled job runs once per replica | No `DataSource` bean, so no `JdbcSchedulerLock` was registered and there is no in-memory fallback | Add a `DataSource`, or supply your own `SchedulerLock` bean |
| `IllegalStateException: BatchFacade has not been initialised` | The auto-configuration does not register a `BatchFacade` bean | Declare one yourself and let Spring construct it before first use |
| `IllegalStateException: BatchScheduler is not available` | The facade was built without a scheduler | Confirm `adhar.batch.enabled` is true and Spring Batch is on the classpath |
| A scheduled job never runs and only logs at ERROR | The name passed to `scheduleJob` is not a `Job` bean name; the failure is caught and the trigger keeps firing | Use the exact bean name of the `@Bean Job` |
| Two replicas run the same long job concurrently | The 30-minute lock TTL expired mid-run and another replica took it over | Construct your own `BatchScheduler` with a longer `lockTtl` |
| `getJobStats` returns zeros | No `MeterRegistry`, so `BatchMetrics` was not registered — or the stats are from a different replica | Add Actuator or `micrometer-core`; treat stats as per-JVM |
| Ambiguous `JobLauncher` injection | Spring Batch's auto-configured `JobOperator` also implements `JobLauncher` | The module's `adharJobLauncher` is `@Primary`; do not mark a second `JobLauncher` primary |
| A failed nightly run is never retried | Each cron fire is a new `JobInstance` with a new `run.id`; the scheduler never restarts | Alert on `BatchJobFailedEvent` and call `BatchOperator.restart` |
| A partitioned step restarts from the wrong offset | One reader instance shared across partitions with `saveState` on | Give each partition its own reader, or disable `saveState` |
| `adhar.batch.table-prefix` has no effect | The property is bound but never consumed | Set `spring.batch.jdbc.table-prefix` instead |

## See also

- [Health](/adhar-kit/modules/health) — surface a stuck or failing job in readiness checks
- [Metrics](/adhar-kit/modules/metrics) — where `BatchMetrics` counters land
- [Persistence](/adhar-kit/modules/persistence) — the `DataSource` the scheduler lock and JDBC readers use
- [Modules Overview](/adhar-kit/modules/overview) — the rest of the kit
