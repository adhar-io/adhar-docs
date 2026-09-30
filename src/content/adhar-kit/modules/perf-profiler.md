---
title: "Perf Profiler"
section: "Modules"
order: 31
path: "/adhar-kit/modules/perf-profiler"
---

# Perf Profiler

`adhar-kit-perf-profiler` gives you method-level latency data from inside a running service: hotspot detection, percentile statistics, rolling time windows, slow-call events, memory and GC snapshots, thread-contention analytics, continuous JFR recording, and an Actuator endpoint. It exists because **the two usual options are both bad in production** — an external profiler you cannot attach to a live pod, or `System.currentTimeMillis()` scattered through the code. This module is designed to be left on: sampling and a bounded method registry cap the overhead.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-perf-profiler` |
| Built on | Spring AOP (AspectJ), Micrometer `Timer`, HdrHistogram, JFR (`jdk.jfr`), `ThreadMXBean`, Spring Boot Actuator |
| Entry points | `ProfilerFacade` (via `adhar.getProfiler()`), `@Profiled`, `/actuator/profiling` |
| Activates when | Micrometer's `MeterRegistry` is on the classpath and `adhar.profiler.enabled` is not `false` |
| Use it when | You need per-method latency in production, or a flame graph from a live pod |

## How it works

There are two recording paths and they feed different consumers.

```text
   @Profiled method  /  adhar.profiled("name", supplier)
              |
      sampleRate gate  -- not sampled --> run method, record nothing
              |
              v
      time the call (System.nanoTime)
              |
        +-----+---------------------------+
        |                                 |
        v                                 v
  Micrometer Timer                  ProfilingRegistry
  "adhar.profiler.<name>"           (maxTrackedMethods cap)
  tags: class, method, success,       |
        error                         | rolling window (windowDuration)
        |                             | history (historyWindows)
        v                             v
   your metrics backend        ProfilingReport / hotspots / percentiles
                                      |
                        p99 > p99-alert-threshold-ms
                                      v
                        SlowCallThresholdBreachedEvent
```

Per call, if the elapsed time exceeds the annotation's `slowThresholdMs` and `logSlow` is on, the aspect logs a warning *and* publishes a `SlowCallEvent`. Separately, when `p99-alert-threshold-ms` is greater than zero, the aspect checks the method's aggregate p99 after each recorded call and publishes a `SlowCallThresholdBreachedEvent` — debounced, so you get one event per breach, not one per call, and the method rearms once p99 falls back under the threshold.

Two overhead guards matter more than anything else here:

- **`sample-rate`** decides which calls are timed. An unsampled call runs normally and records nothing — not a timer, not a registry entry. At `1.0` every call is measured.
- **`max-tracked-methods`** bounds the registry. Methods already tracked are always recorded; once the cap is reached, newly seen method names are skipped and a single warning is logged. This protects you from unbounded growth when metric names are dynamic.

Alongside the aspect, `MemoryProfiler` reads heap, non-heap, GC, and thread counts from the JVM's management beans; `ThreadContentionCollector` reads `ThreadMXBean` contention data; and `JfrRecordingManager` drives a continuous Java Flight Recorder recording that `FlameGraphExporter` can collapse into flame-graph text.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-perf-profiler</artifactId>
    <version>0.1.0</version>
</dependency>
```

Micrometer `micrometer-core` and HdrHistogram come in with the module; Actuator is needed for the endpoint. Expose it:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,profiling
```

## Key APIs

`ProfilerFacade`, via `adhar.getProfiler()` or `ProfilerFacade.getInstance()`:

- `profile(name, Supplier<T>)` and `profile(name, Runnable)` — time a block that has no method to annotate. `AdharFacade` exposes the same as `adhar.profiled(name, () -> work())`.
- `getReport()` — a `ProfilingReport` with per-method statistics for the current window.
- `getHotspots(topN)` — the slowest methods as a `List<MethodProfile>`.
- `getMethodStats(methodName)` — an `Optional<MethodProfile>` for one method.
- `getMemorySnapshot()`, `getHeapUsageMb()`, `getThreadCount()`.
- `reset()` — clear all statistics; `isEnabled()` / `setEnabled(boolean)` — toggle at runtime.
- `health()` — a status map for health checks.

`ProfilingRegistry` is the aggregation engine behind the facade: `record(result)`, `getReport([topN])`, `getHotspots(topN)`, `getMethodStats(key)`, `getWindowHistory()` returning `List<WindowSnapshot>`, and `reset()`. Its defaults — `DEFAULT_WINDOW_DURATION` of 5 minutes and `DEFAULT_HISTORY_WINDOWS` of 5 — match the configuration defaults.

`JfrRecordingManager`: `isJfrAvailable()`, `start()`, `stop()`, `dump()`, `latestDump()`, `status()`.

Events: `SlowCallEvent` (per call) and `SlowCallThresholdBreachedEvent` (aggregate p99).

## Worked example — minimal

```java
import com.adhar.kit.profiler.annotation.Profiled;

@Service
public class DataProcessor {

    @Profiled
    public Result processData(Request request) {
        return doWork(request);
    }
}
```

With no attributes the Micrometer timer is named `adhar.profiler.DataProcessor.processData`, tagged with `class`, `method`, and `success`, and the slow threshold is the annotation default of 500 ms.

## Worked example — tuned annotation, programmatic blocks, alerting

```java
import com.adhar.kit.profiler.annotation.Profiled;
import com.adhar.kit.profiler.event.SlowCallThresholdBreachedEvent;
import com.adhar.kit.starter.AdharFacade;

@Service
@Profiled(slowThresholdMs = 1000)          // class-level: every public method
public class ReportService {

    private final AdharFacade adhar;
    public ReportService(AdharFacade adhar) { this.adhar = adhar; }

    @Profiled(value = "report.pdf-render", slowThresholdMs = 200, histogram = true)
    public byte[] renderPdf(ReportSpec spec) {
        return renderer.render(spec);
    }

    public Report generateReport() {
        return adhar.profiled("report-generation", () -> buildReport());
    }

    @EventListener
    public void onSustainedSlowness(SlowCallThresholdBreachedEvent event) {
        alerts.warn("p99 breach on %s: %.1fms > %dms"
            .formatted(event.getMethodKey(), event.getP99Ms(), event.getThresholdMs()));
    }
}
```

### How the interception works

`ProfilingAspect` is registered as a bean by `PerfProfilerAutoConfiguration` — there is no `@EnableProfiling`; the aspect exists as soon as the module is on the classpath with a `MeterRegistry` present. It advises two pointcuts:

- `@Around("@annotation(profiled)")` — one annotated method.
- `@Around("@within(profiled) && execution(public * *(..))")` — every **public** method of an annotated class.

So `@Profiled` on a class profiles all its public methods with the class-level attributes, and a method-level `@Profiled` overrides them for that method. Being Spring AOP, both work only through the proxy: a private method, or a call from inside the same bean, is not profiled.

`histogram = true` adds `publishPercentileHistogram()` to the Micrometer timer, which is what lets your backend compute accurate server-side percentiles. `value` overrides the metric name; the registry key stays `Class.method` regardless.

## Actuator endpoints

The endpoint id is `profiling`.

```text
GET    /actuator/profiling                      full ProfilingReport
GET    /actuator/profiling/hotspots?top=10      slowest methods (default top 10)
GET    /actuator/profiling/percentiles          per-method percentile statistics
GET    /actuator/profiling/memory               heap, non-heap, GC, threads
GET    /actuator/profiling/windows              current window plus history
GET    /actuator/profiling/contention?top=10    thread contention snapshot
GET    /actuator/profiling/jfr                  JFR recording status
GET    /actuator/profiling/flamegraph           collapsed flame-graph text
POST   /actuator/profiling/jfr-start            start the continuous recording
POST   /actuator/profiling/jfr-stop             stop it
POST   /actuator/profiling/jfr-dump             write a dump file
DELETE /actuator/profiling                      reset all statistics
```

`flamegraph` dumps the running recording on demand, falling back to the most recent retained dump, then collapses it.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.profiler.enabled` | Master switch | `true` |
| `adhar.profiler.default-slow-threshold-ms` | Module-level slow threshold | `500` |
| `adhar.profiler.log-slow-by-default` | Log slow calls without per-annotation opt-in | `true` |
| `adhar.profiler.window-duration` | Rolling aggregation window | `5m` |
| `adhar.profiler.history-windows` | Completed windows retained | `5` |
| `adhar.profiler.sample-rate` | Fraction of calls timed, 0.0–1.0 (clamped) | `1.0` |
| `adhar.profiler.max-tracked-methods` | Distinct method names in the registry | `1000` |
| `adhar.profiler.p99-alert-threshold-ms` | Emit `SlowCallThresholdBreachedEvent` above this p99; 0 disables | `0` |
| `adhar.profiler.jfr.enabled` | Start the continuous recording at startup | `false` |
| `adhar.profiler.jfr.settings` | JFR preset: `default` or `profile` | `default` |
| `adhar.profiler.jfr.max-size-mb` | Recording buffer cap, MB | `100` |
| `adhar.profiler.jfr.max-age` | Buffer retention | `1h` |
| `adhar.profiler.jfr.dump-directory` | Where dumps are written | `<java.io.tmpdir>/adhar-profiler-jfr` |
| `adhar.profiler.jfr.max-dump-files` | Dumps retained; oldest deleted first | `5` |
| `adhar.profiler.contention.time-monitoring-enabled` | Enable JVM contention *time* measurement | `false` |
| `adhar.profiler.contention.top-threads` | Default top-N contended threads | `10` |

```yaml
adhar:
  profiler:
    enabled: true
    default-slow-threshold-ms: 500
    window-duration: 5m
    history-windows: 5
    sample-rate: 0.1            # 10% of calls in production
    max-tracked-methods: 1000
    p99-alert-threshold-ms: 750
    jfr: { enabled: false, settings: profile, max-dump-files: 5 }
    contention: { time-monitoring-enabled: false }
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Nothing is recorded at all | No `MeterRegistry`, so the whole auto-configuration was skipped | Add Actuator or a Micrometer registry |
| A method shows no data | Self-invocation, a private method, or a non-public method on a `@Profiled` class | Call through the bean; the class-level pointcut matches public methods only |
| `/actuator/profiling` returns 404 | The endpoint is not exposed | Add `profiling` to `management.endpoints.web.exposure.include` |
| Counts look far too low | `sample-rate` is below 1.0 | Expected: unsampled calls are not recorded. Scale accordingly, or raise the rate |
| A newly deployed method never appears | `max-tracked-methods` was reached; check for the one-time warning | Raise the cap, or stop generating dynamic metric names |
| Percentiles look wrong in the metrics backend | `histogram = false`, so no percentile histogram is published | Set `histogram = true` on the hot methods that need it |
| Contention times are all zero | `contention.time-monitoring-enabled` is `false` | Turn it on; blocked/waited *counts* are always available, times are not |
| JFR endpoints report unavailable | JFR is absent or disabled in the JVM | Check `isJfrAvailable()` and your JVM flags |
| Flame graph export returns nothing | No recording running and no retained dump | `POST /actuator/profiling/jfr-start`, let it run, then retry |

## See also

- [Metrics](/adhar-kit/modules/metrics) — the Micrometer registry the timers are published to
- [Tracing](/adhar-kit/modules/tracing) — per-request spans, complementary to per-method aggregates
- [Observability](/docs/operations/observability) — where this data is collected on the platform
- [Health](/adhar-kit/modules/health) — wiring `health()` into readiness
