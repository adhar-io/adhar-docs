---
title: "Batch"
section: "Modules"
order: 27
path: "/adhar-kit/modules/batch"
---

# Batch

`adhar-kit-batch` provides enterprise batch processing on Spring Batch: cron job scheduling, CSV/JPA readers and writers, range partitioning, retryable steps, and Micrometer metrics.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-batch</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

`BatchFacade` (via `adhar.getBatch()`): `scheduleJob(name, cron)`, `cancelJob(name)`, `listScheduledJobs()`, `getJobStats(name)`, `recordJobExecution(name, ms, ok)`. Plus a range partitioner, retryable step builder, and job-execution listener.

## Usage

```java
@Service
public class ReportService {
    private final AdharFacade adhar;
    public ReportService(AdharFacade adhar) { this.adhar = adhar; }

    public void scheduleNightlyReport() {
        adhar.getBatch().scheduleJob("nightly-report", "0 0 2 * * ?");   // 02:00 daily
    }

    public BatchJobStats stats() {
        return adhar.getBatch().getJobStats("nightly-report");
    }
}
```

## Configuration

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

Chunked processing, range partitioning for parallelism, and per-job metrics make long-running data jobs observable and resilient. Combine with [health](/adhar-kit/modules/health) so a stuck job surfaces in readiness checks.
