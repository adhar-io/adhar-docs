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

```diagram
kit-batch-flow
```

Three details are worth knowing up front:

1. **The scheduler looks jobs up by Spring bean name.** `scheduleJob("nightlyReportJob", ...)` resolves `applicationContext.getBean("nightlyReportJob", Job.class)` — the string must be the bean name of a `Job`, not a display label. The lookup happens inside the scheduled task, not at schedule time, so a typo fails on the **first cron fire**, is caught and logged at ERROR, and the trigger keeps firing on schedule forever.
2. **Every scheduled run gets a unique `run.id` job parameter.** Exactly one parameter is added: `addLong("run.id", System.currentTimeMillis())`. Spring Batch identifies a `JobInstance` by its identifying parameters and refuses to re-run a completed instance with identical ones, so this is what makes a nightly job re-runnable at all. The corollary is that **every scheduled run is a new `JobInstance`** — a failed run is never automatically resumed by the scheduler, only by `BatchOperator.restart`.
3. **Multi-replica safety is automatic if you have a `DataSource`.** The auto-configuration then registers a `JdbcSchedulerLock` and the scheduler acquires a lock named after the job before launching. A replica that cannot take the lock logs at INFO — *"Skipping scheduled job [x] — lock held by another instance"* — and returns. **Without a `DataSource`, no `SchedulerLock` bean is registered at all** (there is no in-memory fallback implementation), the scheduler is constructed with `null`, and every replica fires.

## The scheduler lock

`JdbcSchedulerLock` creates its table in its constructor — so the DDL runs at bean-creation time, before any job:

```sql
CREATE TABLE IF NOT EXISTS adhar_scheduler_lock (
    lock_name    VARCHAR(255) PRIMARY KEY,
    locked_by    VARCHAR(255) NOT NULL,
    locked_at    TIMESTAMP    NOT NULL,
    locked_until TIMESTAMP    NOT NULL)
```

Acquisition is two-phase, not `ON CONFLICT`:

1. A plain `INSERT`. The primary key on `lock_name` means exactly one racing replica wins; the loser catches `DuplicateKeyException` and falls through.
2. A conditional `UPDATE ... WHERE lock_name = ? AND locked_until <= ?`. This is the expiry takeover: it only succeeds if the existing lock has aged out.

Release does **not** delete the row — it sets `locked_until` to now, guarded by `AND locked_by = ?`, so history stays visible and a non-owner's `unlock` is a no-op. `BatchScheduler.runScheduled` releases in a `finally`, but only when it actually acquired.

**The TTL is 30 minutes and there is no property for it.** `BatchScheduler.DEFAULT_LOCK_TTL` is `Duration.ofMinutes(30)`, and the auto-configuration passes that value explicitly. A job that runs longer than 30 minutes has its lock expire mid-run, and another replica's next cron fire will take it over and start a second, concurrent execution of the same job. To change it, define your own `BatchScheduler` bean with the five-argument constructor:

```java
@Bean
BatchScheduler batchScheduler(TaskScheduler taskScheduler, JobLauncher jobLauncher,
                              ApplicationContext context, SchedulerLock lock) {
    return new BatchScheduler(taskScheduler, jobLauncher, context, lock, Duration.ofHours(4));
}
```

A JVM that dies holding a lock frees it only by TTL expiry — there is no shutdown hook that releases it.

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

- `scheduleJob(jobName, cronExpression)` — register a cron trigger at runtime. Re-scheduling the same name cancels the old `ScheduledFuture` with `cancel(false)` first, so a run already in progress is **not** interrupted.
- `cancelJob(jobName)` / `listScheduledJobs()` — manage the live schedule.
- `getJobStats(jobName)` — a `BatchJobStats` record of `totalExecutions`, `successCount`, `failureCount`, `avgDurationMs`, `lastExecutionTime`.
- `recordJobExecution(jobName, durationMs, success)` — record an execution yourself when you launch a job outside the scheduler.
- `getDefaultChunkSize()` / `getDefaultPageSize()` — the configured defaults, so your step builders stay consistent with configuration. Nothing else reads them; the reader builders have their own hardcoded page size of 50.
- `health()` — `enabled`, `schedulerAvailable`, `metricsAvailable`, `scheduledJobCount`, `scheduledJobs`.

Supporting components:

- `BatchOperator` — `restart(executionId)`, `stop(executionId)`, `abandon(executionId)`, `getRunningExecutions(jobName)`, `getJobExecution(executionId)`. A thin delegation layer over Spring Batch's `JobOperator`; registered only when a `JobOperator` bean exists.
- `RetryableStepBuilderFactory.create(stepBuilder)` — wraps a `SimpleStepBuilder` in a `RetryableStepBuilder` already seeded with `adhar.batch.max-retries` and `adhar.batch.retry-on-failure`.
- `AdharRangePartitioner(start, end)` — splits an **inclusive** numeric range into partitions keyed `partition0`, `partition1`, …, writing the long keys `start` and `end` into each `ExecutionContext`. When `gridSize` exceeds the range you get one partition per value and **fewer than `gridSize` entries**; the last partition absorbs the division remainder. A `gridSize` of zero is not validated and throws `ArithmeticException`.
- Reader builders: `CsvItemReaderBuilder.csvReader` / `csvReaderWithHeader`, `JdbcItemReaderBuilder.cursorReader` / `pagingReader`, `JpaItemReaderBuilder.jpaPagingReader`, `JsonItemReaderBuilder.jsonReader`. Writer builders: `CsvItemWriterBuilder.csvWriter`, `JdbcItemWriterBuilder.beanMappedWriter` / `columnMappedWriter`, `JsonItemWriterBuilder.jsonWriter`.
- `BatchJobFailedEvent` — a Spring `ApplicationEvent` carrying `jobName`, `jobExecutionId`, `status`, `exitCode`, `exitDescription`, `durationMs`, and `failureExceptions`.

## Restart and recovery

`BatchOperator.restart(executionId)` delegates straight to Spring Batch and adds nothing of its own, so the semantics are Spring Batch's: a restart reuses the **same `JobInstance`**, skips steps already marked `COMPLETED` unless they were declared `allowStartIfComplete`, and resumes a chunk-oriented step from its saved `ExecutionContext`. The checked exceptions on the signature tell you the preconditions — `JobInstanceAlreadyCompleteException` if the instance finished successfully, `JobRestartException` if the job is not restartable, `NoSuchJobExecutionException` for an unknown id, `NoSuchJobException` if the job is no longer registered.

The interaction with `run.id` is the thing to internalise: the **scheduler never restarts anything**. Each cron fire is a brand-new instance with a new `run.id`, so a failed nightly run is left behind unless an operator calls `restart`. Build that into your runbook, driven by the failure event below.

`stop(executionId)` signals a stop that takes effect at the next chunk boundary; `abandon(executionId)` marks a stopped execution `ABANDONED` so a later restart can proceed.

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

> `BatchFacade` is **not registered as a bean by the auto-configuration**. It is a singleton whose constructor assigns the static instance, so `adhar.getBatch()` and `BatchFacade.getInstance()` both throw `IllegalStateException("BatchFacade has not been initialised")` until your application constructs one. Declare it yourself:
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

`retryables.create(...)` returns a `RetryableStepBuilder`; its `build()` yields a `FaultTolerantStepBuilder`, whose own `build()` yields the `Step` — hence the two calls. Calling `withRetryLimit(n)` explicitly overrides the configured default **and re-enables retry** even when `retry-on-failure` is `false`. Skip configuration is applied whenever either a positive skip limit or any `skipOn(...)` class is present, so `skipOn(X)` alone registers a skip limit of zero.

Readers built this way inherit Spring Batch's default `saveState = true`. The module never sets it, so the standard caveat applies: in a multi-threaded or partitioned step, share a reader between threads and its saved state will be wrong. Give each partition its own reader instance, or disable `saveState` and accept a non-restartable step.

Alert on failures by listening for the published event:

```java
@EventListener
public void onBatchFailure(BatchJobFailedEvent event) {
    pager.page("Batch job %s failed after %dms: %s"
        .formatted(event.getJobName(), event.getDurationMs(), event.getExitDescription()));
}
```

`AdharJobExecutionListener` publishes it from `afterJob`, synchronously, on the job's own `adhar-batch-*` execution thread — **not** the thread that called `jobLauncher.run`. Spring's default event multicaster is synchronous, so your listener blocks that thread; keep it fast or make it `@Async`.

## How it behaves

- **Threads.** The job launcher is a `TaskExecutorJobLauncher` over a `SimpleAsyncTaskExecutor` with prefix `adhar-batch-`, so `jobLauncher.run` returns immediately and the job runs elsewhere. `max-concurrent-jobs` is applied as `setConcurrencyLimit(...)` — a throttle, not a bounded pool; the executor still spawns a thread per task. The cron triggers run on a separate `ThreadPoolTaskScheduler` of **pool size 2** named `adhar-batch-scheduler-`.
- **Shutdown drops nothing gracefully.** The module declares no `@PreDestroy`, no `DisposableBean` and no `SmartLifecycle`. `BatchScheduler` does not cancel its tracked futures at context close, and the `SimpleAsyncTaskExecutor` behind the launcher is a **local variable, not a bean**, so the container never closes it. A job in flight at shutdown is neither awaited nor stopped by this module.
- **Failures never propagate out of the scheduler.** `runScheduled` catches every `Exception` — bean lookup, launch failure, the lot — and logs at ERROR. The cron trigger survives, which is usually what you want for a nightly job and is dangerous if you were expecting the schedule to stop.
- **Statistics are in-memory and per-JVM.** `getJobStats` does not query the `MeterRegistry`; it reads a parallel `ConcurrentHashMap` of accumulators that `recordJobExecution` populates. Those reset on restart and are not shared across replicas. `recordStepExecution` does not feed them at all.
- **The lock table name is only settable in code**, through the two-argument `JdbcSchedulerLock` constructor. It is concatenated into the DDL and DML without escaping, so keep it a literal constant.

## Observability

`BatchMetrics` is registered when both the `MeterRegistry` class and a bean are present:

| Meter | Type | Tags |
|---|---|---|
| `adhar.batch.job.executions` | counter | `job`, `status` (`success` / `failure`) |
| `adhar.batch.job.duration` | timer | `job` |
| `adhar.batch.step.reads` | counter | `step` |
| `adhar.batch.step.writes` | counter | `step` |
| `adhar.batch.step.skips` | counter | `step` |

Those land alongside your other [metrics](/adhar-kit/modules/metrics). Alert on `adhar.batch.job.executions{status="failure"}` and on the absence of a `success` increment within the expected window — a replica that silently loses every lock race produces no failures at all, only silence.

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

- **Drive the trigger, do not wait for it.** The module's own tests capture the `Runnable` passed to `TaskScheduler.schedule` with an `ArgumentCaptor` and invoke it directly. That gives you deterministic coverage of the bean lookup, the `run.id` parameter, and the lock acquire-and-release path without any wall-clock delay.
- **Test the lock against a real database.** `JdbcSchedulerLock` is exercised with an embedded H2 database per test, uniquely named (`"schedlock-" + System.nanoTime()`) and shut down in `@AfterEach`. Pass `Duration.ZERO` as the TTL to produce an immediately expired lock and assert the takeover path; the expiry comparison is `locked_until <= now`, so zero works. For Postgres-specific behaviour, `adhar-kit-test-commons` provides `PostgresTestContainer`.
- **Reset the facade singleton.** `BatchFacadeTest` clears the private static `instance` field reflectively, because there is no API for it. Do the same, or the facade from one test leaks into the next.
- **Wire the auto-configuration with `ApplicationContextRunner`** and `AutoConfigurations.of(BatchAutoConfiguration.class)`, supplying mocked `JobRepository` and `JobOperator` beans plus a `SimpleMeterRegistry` and an embedded `DataSource`. That is how you prove the conditional gates — notably that `BatchOperator` is absent without a `JobOperator` and `SchedulerLock` absent without a `DataSource`.
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
