---
title: "Perf Profiler"
section: "Modules"
order: 31
path: "/adhar-kit/modules/perf-profiler"
---

# Perf Profiler

`adhar-kit-perf-profiler` provides method-level performance profiling with hotspot detection, HdrHistogram-backed percentile stats, rolling time windows, sampling/overhead guards, slow-call events, memory/GC profiling, and an Actuator endpoint.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-perf-profiler</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

`ProfilerFacade` (via `adhar.getProfiler()`): `profile(name, supplier)`, `getReport()`, `getHotspots(topN)`, `getMemorySnapshot()`, `reset()`. Facade shortcut: `adhar.profiled("name", () -> work())`. Annotation: `@Profiled`. Events: `SlowCallEvent`, `SlowCallThresholdBreachedEvent`.

## Usage

```java
@Service
public class DataProcessor {
    private final AdharFacade adhar;
    public DataProcessor(AdharFacade adhar) { this.adhar = adhar; }

    @Profiled(slowThresholdMs = 200, histogram = true)
    public Result processData(Request request) { return doWork(request); }

    public Report generateReport() {
        return adhar.profiled("report-generation", () -> buildReport());
    }
}
```

## Actuator endpoints

```text
GET    /actuator/profiling
GET    /actuator/profiling/hotspots?top=10
GET    /actuator/profiling/memory
GET    /actuator/profiling/percentiles
DELETE /actuator/profiling
```

## Configuration

```yaml
adhar:
  profiler:
    enabled: true
    default-slow-threshold-ms: 500
    log-slow-by-default: true
    window-duration: 5m
    history-windows: 5
    sample-rate: 1.0            # lower to reduce overhead in production
    max-tracked-methods: 1000
    p99-alert-threshold-ms: 0   # >0 to emit an alert event
```

Sampling and a bounded tracked-method set keep overhead low enough to leave on in production; slow-call events integrate with your alerting.
