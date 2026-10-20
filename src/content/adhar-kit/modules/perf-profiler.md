---
title: "Perf Profiler"
section: "Modules"
order: 31
path: "/adhar-kit/modules/perf-profiler"
---

# Perf Profiler

`adhar-kit-perf-profiler` gives you method-level latency data from inside a running service. It provides hotspot detection, percentile statistics, rolling time windows, slow-call events, memory and GC snapshots, thread-contention analytics, continuous JFR recording, and an Actuator endpoint.

It exists because **the two usual options are both bad in production**. You cannot attach an external profiler to a live pod, and `System.currentTimeMillis()` scattered through the code is messy. This module is designed to stay on at a low sample rate. Sampling and a bounded method registry cap the overhead.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-perf-profiler` |
| Built on | Spring AOP (AspectJ), Micrometer `Timer`, HdrHistogram, JFR (`jdk.jfr`), `ThreadMXBean`, Spring Boot Actuator |
| Entry points | `ProfilerFacade` (via `adhar.getProfiler()`), `@Profiled`, `/actuator/profiling` |
| Activates when | Micrometer's `MeterRegistry` is on the classpath and `adhar.profiler.enabled` is not `false` |
| Resolution | Milliseconds — durations are truncated to ms before entering the histogram |
| Use it when | You need per-method latency in production, or a flame graph from a live pod |

## How it works

There are two recording paths, and they feed different consumers.

```diagram
kit-profiler-paths
```

### The two overhead guards and the sampling gate

Before measuring anything, `ProfilingAspect.doProfile` checks two independent guards. Where each one sits decides whether profiling is free or sits on the hot path.

**`sample-rate` is the first gate, and it short-circuits everything.** `shouldSample()` returns `true` at once when the rate is `1.0`. Otherwise it draws from `ThreadLocalRandom`.

An unsampled call does nothing but `joinPoint.proceed()`. There is no signature reflection, no `System.nanoTime()`, no `Timer` lookup and no registry write. Its cost is one random draw plus the proxy hop. The rate is clamped to `[0.0, 1.0]` in the setter and again in the aspect constructor. An out-of-range value is corrected, not rejected.

**`max-tracked-methods` is the second guard, and it is narrower than it looks.** `isTrackingAllowed(registryKey)` gates only the **registry write** and the p99 check. A sampled call always builds and records its Micrometer timer, even past the cap.

Methods already in the tracked set are always allowed. Once the set reaches the cap, each newly seen key is skipped. A single WARN is logged for the whole process, naming the first method skipped (`capWarningLogged` is a one-shot `AtomicBoolean`). So the cap protects the registry from unbounded growth. It does not protect your meter registry from an explosion of metric names.

**Debounced p99 breach detection.** When `p99-alert-threshold-ms` is greater than zero, every *recorded* call re-reads the method's aggregate stats from the registry. It then compares `p99Ms()` to the threshold.

The debounce is a `Set<String> breachedMethods`. The event is published only when `breachedMethods.add(key)` returns `true`. So you get one `SlowCallThresholdBreachedEvent` per breach, not one per call. When p99 drops back under the threshold, the key is removed and the method rearms.

This has a cost. It adds a map lookup and two HdrHistogram percentile computations to every recorded call. Leave the threshold at `0` unless you want the alerts.

There is a separate, independent check. If the elapsed time exceeds the annotation's `slowThresholdMs` and `logSlow` is on, the aspect logs a warning *and* publishes a per-call `SlowCallEvent`. This check is not debounced. A method that is always slow produces one log line and one event per call. This is the usual cause of "profiling flooded our logs".

Other components run alongside the aspect:

- `MemoryProfiler` reads heap, non-heap, GC, and thread counts from the JVM's management beans.
- `ThreadContentionCollector` reads `ThreadMXBean` contention data.
- `JfrRecordingManager` drives a continuous Java Flight Recorder recording. `FlameGraphExporter` can collapse it into flame-graph text.

### What profiling actually costs

No benchmark ships with this repo. So reason about the cost from the work each call does, not from a number:

| Per call | Work done |
|---|---|
| Not sampled | One `ThreadLocalRandom.nextDouble()`, then the method |
| Sampled, cap reached | Signature reflection, two `nanoTime()` reads, a `Timer.Builder` lookup and `record` |
| Sampled and tracked | The above, plus a `ConcurrentHashMap.compute` and a synchronized `Histogram.recordValue` |
| Sampled, tracked, p99 alerting on | The above, plus two `getValueAtPercentile` computations |

The synchronized block in `MutableMethodStats` is per method key. Two hot methods do not contend with each other. But all callers of the *same* hot method briefly queue on that monitor. On a method called tens of thousands of times a second, you will measure that monitor rather than the timing itself.

So:

- Leave `sample-rate` at `1.0` in development and load tests.
- Drop it to `0.01`–`0.1` in production, and scale counts to match.
- Leave `p99-alert-threshold-ms` at `0` and `jfr.enabled` at `false` until you are actually investigating.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-perf-profiler</artifactId>
    <version>0.1.0</version>
</dependency>
```

Micrometer `micrometer-core` and HdrHistogram come in with the module. You need Actuator for the endpoint. Expose it:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,profiling
```

## Key APIs

`ProfilerFacade`, via `adhar.getProfiler()` or `ProfilerFacade.getInstance()`:

- `profile(name, Supplier<T>)` and `profile(name, Runnable)` time a block that has no method to annotate. `AdharFacade` exposes the same thing as `adhar.profiled(name, () -> work())`.
- `getReport()`, `getHotspots(topN)` (slowest by average time), and `getMethodStats(methodName)`, keyed on the full `Class.method` registry key.
- `getMemorySnapshot()`, `getHeapUsageMb()`, `getThreadCount()`, `reset()`, `isEnabled()` / `setEnabled(boolean)`, and `health()` (`profiledMethodCount`, `totalProfiledCalls`, `heapUsedMb`, `heapMaxMb`).

`ProfilingRegistry` is the aggregation engine. It offers `record(result)`, `getReport([topN])`, `getHotspots(topN)`, `getMethodStats(key)` returning `Optional<ProfilingReport.MethodStats>` (avg, min, max, p95, p99), `getWindowHistory()` and `reset()`. Its constants `DEFAULT_WINDOW_DURATION` (5 minutes) and `DEFAULT_HISTORY_WINDOWS` (5) match the configuration defaults.

`JfrRecordingManager` offers `isJfrAvailable()`, `start()`, `stop()`, `dump()`, `latestDump()` and `status()`.

Two events are published: `SlowCallEvent` (per call) and `SlowCallThresholdBreachedEvent` (aggregate p99, debounced).

> **`ProfilerFacade` is not a Spring bean.** `PerfProfilerAutoConfiguration` registers `ProfilingRegistry`, `ProfilingAspect`, `MemoryProfiler`, `JfrRecordingManager`, `FlameGraphExporter`, `ThreadContentionCollector` and the Actuator endpoint, but no `ProfilerFacade`. `adhar.getProfiler()` returns `ProfilerFacade.getInstance()`, a singleton that builds its **own** default `ProfilingRegistry`. As a result:
>
> - Blocks timed with `adhar.profiled(...)` do not appear in `/actuator/profiling`.
> - `@Profiled` methods do not appear in `adhar.getProfiler().getReport()`.
> - The facade's registry ignores `window-duration` and `history-windows`.
> - `setEnabled(false)` silences only the programmatic path, never the aspect.
>
> If you want one view, declare your own `ProfilerFacade` bean built from the injected `ProfilingRegistry`.

## Worked example — annotated methods plus a programmatic block

```java
import com.adhar.kit.profiler.ProfilerFacade;
import com.adhar.kit.profiler.annotation.Profiled;
import com.adhar.kit.profiler.event.SlowCallThresholdBreachedEvent;
import com.adhar.kit.profiler.registry.ProfilingRegistry;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
@Profiled(slowThresholdMs = 1000)            // class level: every PUBLIC method
public class ReportService {

    private final ProfilerFacade profiler;
    private final PdfRenderer renderer;
    private final AlertSink alerts;

    // Build the facade over the Spring-configured registry so programmatic
    // blocks and annotated methods land in the same report.
    public ReportService(ProfilingRegistry registry, PdfRenderer renderer, AlertSink alerts) {
        this.profiler = new ProfilerFacade(registry, null);
        this.renderer = renderer;
        this.alerts = alerts;
    }

    @Profiled(value = "report.pdf-render", slowThresholdMs = 200, histogram = true)
    public byte[] renderPdf(ReportSpec spec) {
        return renderer.render(spec);        // timer: adhar.profiler.report.pdf-render
    }

    public Report generateReport(ReportSpec spec) {
        // Registry key is "manual.report-generation"; no Micrometer timer is emitted.
        return profiler.profile("report-generation", () -> {
            byte[] pdf = renderPdf(spec);    // SELF-CALL: not profiled, see below
            return new Report(spec, pdf);
        });
    }

    @EventListener
    public void onSustainedSlowness(SlowCallThresholdBreachedEvent event) {
        alerts.warn("p99 breach on %s: %.1fms > %dms"
            .formatted(event.getMethodKey(), event.getP99Ms(), event.getThresholdMs()));
    }
}
```

The `renderPdf(spec)` call inside `generateReport` is left as a self-call on purpose, to show the trap. It produces no timer and no registry entry, and nothing warns you. Instead, inject a self-reference, move the renderer into its own bean, or wrap it with `profiler.profile(...)`.

### How the interception works

`PerfProfilerAutoConfiguration` registers `ProfilingAspect` as a bean. There is no `@EnableProfiling`. The aspect exists as soon as the module is on the classpath and a `MeterRegistry` is present. It advises two pointcuts:

- `@Around("@annotation(profiled)")` matches one annotated method, whatever its visibility *as seen through the proxy*.
- `@Around("@within(profiled) && execution(public * *(..))")` matches every **public** method of an annotated class.

So `@Profiled` on a class profiles all its public methods with the class-level attributes. A method-level `@Profiled` overrides them for that method.

The `execution(public ...)` clause on the class-level pointcut is explicit. Package-private and protected methods of a `@Profiled` class are never profiled, even though Spring AOP could in principle advise them on a CGLIB proxy. `@Profiled` is not `@Inherited`, so annotating a base class does not profile a subclass.

> **Self-invocation.** Both pointcuts work through the Spring proxy. A call from inside the same bean, such as `this.renderPdf(...)`, skips the advice entirely. You get no timer, no registry entry, no warning and no error. This is by far the most common reason a method "shows no data". Call through the injected bean, inject a self-reference, or use `ProfilerFacade.profile(...)` for work inside the class.

### Timer names and tags

The Micrometer timer name is **always** `adhar.profiler.` plus either `Class.method` (when `value()` is empty) or the annotation's `value()`:

```text
@Profiled                                  -> adhar.profiler.DataProcessor.processData
@Profiled(value = "report.pdf-render")     -> adhar.profiler.report.pdf-render
```

Every timer carries the tags `class` (the declaring type's simple name), `method`, and `success` (`"true"` / `"false"`). On a failure, a fourth tag, `error`, holds the exception's simple name.

`histogram = true` adds `publishPercentileHistogram()`. This lets your metrics backend compute accurate server-side percentiles. Without it, the backend only sees count and sum.

The **registry** key is always `Class.method`, whatever `value()` is. So the two views use different identifiers for the same method. `ProfilerFacade.profile(name, ...)` records under class name `"manual"`, giving the key `manual.<name>`. It emits no Micrometer timer at all.

## How it behaves

**Thread safety.** `ProfilingRegistry` is a `ConcurrentHashMap` of per-method accumulators. Every write goes through `compute` (one writer per key), and every accumulator method is `synchronized`. So concurrent reads during report generation are consistent. `ProfilingAspect` holds two concurrent key sets and an `AtomicBoolean`. Both are safe to share as singletons. `MemoryProfiler` and `ThreadContentionCollector` are stateless readers of JVM management beans.

**Resolution and rounding.** Elapsed time is measured with `System.nanoTime()`. It is converted with `TimeUnit.NANOSECONDS.toMillis()` before it reaches the registry. The HdrHistogram covers 1 ms to 1 hour at two significant digits. So a sub-millisecond method records `0`, and its p95/p99 read as `0`.

The Micrometer timer keeps the full nanosecond value. For fast methods, use the timer, not the registry. `ProfilerFacade.profile` uses `System.currentTimeMillis()`, which is coarser still.

**Memory is bounded by design.** Each accumulator holds one HdrHistogram. Its size is fixed at construction by its range and precision, and it does not grow with sample count. `max-tracked-methods` caps the number of accumulators. The window history is capped at `history-windows` snapshots, oldest evicted first. No per-call data is kept anywhere.

**Windows roll forward and discard.** `maybeRollover()` runs on every `record` and `getReport`. In the common case it costs a volatile read plus a duration comparison. When a rollover is due, it runs under a `ReentrantLock` with a double check.

On rollover, the current stats are snapshotted into `windowHistory`, and **`stats.clear()` wipes the live map.** This means:

- `getMethodStats` returns empty for a method not called in the current window.
- Hotspots reflect the current window only.
- A p99 breach rearms at every window boundary, because the key disappears from the registry.

Use `/actuator/profiling/windows` for trend data.

**Lifecycle and failure.** The beans are plain singletons created at context startup. Recording begins with the first proxied call. Nothing is drained or persisted at shutdown, which is correct for this kind of data. But a JFR recording started through the endpoint is *not* stopped on context close, so take a dump before you shut down.

The aspect's `finally` block always runs. So a method that throws is still timed and recorded with `success=false` and an `error` tag. Exceptions propagate unchanged. With no `MeterRegistry` on the classpath, the entire auto-configuration is skipped, endpoint included.

## JFR and the cost of leaving it on

`jfr.enabled` is `false` by default, and it should usually stay that way. A continuous recording is the most expensive thing in this module:

- It buffers up to `jfr.max-size-mb` on disk.
- It keeps `jfr.max-age` of events.
- The `profile` preset samples much harder than `default`.

Dumps build up in `jfr.dump-directory` up to `jfr.max-dump-files`, oldest deleted first. The intended workflow is on demand:

```bash
curl -X POST http://localhost:8080/actuator/profiling/jfr-start
# ... let the workload run ...
curl http://localhost:8080/actuator/profiling/flamegraph
curl -X POST http://localhost:8080/actuator/profiling/jfr-stop
```

`flamegraph` dumps the running recording on demand, or falls back to the most recent retained dump. It then collapses it. If neither is available, it returns `{"error": "No JFR dump available: start the JFR recording first"}` instead of failing.

Thread-contention *time* measurement (`contention.time-monitoring-enabled`) is the other opt-in cost. It turns on a JVM-wide per-monitor measurement. Blocked and waited **counts** are always available. Only the **times** need it.

## Actuator endpoints

The endpoint id is `profiling`.

```text
GET    /actuator/profiling                      full ProfilingReport
GET    /actuator/profiling/hotspots?top=10      slowest methods (default top 10)
GET    /actuator/profiling/percentiles          per-method avg/min/max/p95/p99
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

An unrecognised section or action returns `{"error": "Unknown section: ..."}` with a 200, not a 404. These operational endpoints expose method names and heap figures. Secure them like any other non-health Actuator endpoint.

## Testing

`adhar-kit-test-commons` has no profiler helper. The components are plain objects, so test them directly.

- **Aspect tests.** The two-argument convenience constructor `new ProfilingAspect(meterRegistry, registry)` gives sample rate `1.0`, no event publisher and the default cap. Pass a `SimpleMeterRegistry` and a real `ProfilingRegistry`, and drive a mocked `ProceedingJoinPoint`. Then assert on `registry.getMethodStats("Class.method")` and the meter registry's timers. The four-argument form takes a `PerfProfilerProperties` you have configured. A `sampleRate` of `0.0` makes the aspect a pure pass-through. This is a clean way to check that your method still behaves correctly without profiling.
- **Events and windows.** Pass a mock `ApplicationEventPublisher` and verify the events instead of scraping logs. Construct `new ProfilingRegistry(Duration.ofMillis(50), 2)` so a rollover happens on demand instead of after five minutes.
- **Disabling side effects.** `adhar.profiler.enabled: false` removes the whole auto-configuration. Leaving Micrometer off the test classpath has the same effect. Avoid `ProfilerFacade.getInstance()` in tests. It is a process-wide singleton shared across the JVM, so construct `new ProfilerFacade(registry, memoryProfiler)` explicitly.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.profiler.enabled` | Master switch | `true` |
| `adhar.profiler.default-slow-threshold-ms` | Bound, but not consulted by the aspect | `500` |
| `adhar.profiler.log-slow-by-default` | Bound, but not consulted by the aspect | `true` |
| `adhar.profiler.window-duration` | Rolling aggregation window | `5m` |
| `adhar.profiler.history-windows` | Completed windows retained | `5` |
| `adhar.profiler.sample-rate` | Fraction of calls timed, 0.0–1.0 (clamped) | `1.0` |
| `adhar.profiler.max-tracked-methods` | Distinct method keys in the registry; `<= 0` means unbounded | `1000` |
| `adhar.profiler.p99-alert-threshold-ms` | Emit `SlowCallThresholdBreachedEvent` above this p99; 0 disables | `0` |
| `adhar.profiler.jfr.enabled` / `.settings` | Start the recording at startup; preset `default` or `profile` | `false` / `default` |
| `adhar.profiler.jfr.max-size-mb` / `.max-age` | Recording buffer caps; `<= 0` disables either limit | `100` / `1h` |
| `adhar.profiler.jfr.dump-directory` / `.max-dump-files` | Dump location, and how many are retained (oldest deleted first) | `<java.io.tmpdir>/adhar-profiler-jfr` / `5` |
| `adhar.profiler.contention.time-monitoring-enabled` / `.top-threads` | JVM contention *time* measurement; default top-N | `false` / `10` |

On every path, the slow-call threshold and the slow-call logging flag come from the `@Profiled` annotation (`slowThresholdMs = 500`, `logSlow = true`). The two module-level properties above are bound and readable, but no component consults them. Set the annotation attributes instead.

```yaml
adhar:
  profiler:
    enabled: true
    window-duration: 5m
    history-windows: 5
    sample-rate: 0.1            # 10% of calls in production
    max-tracked-methods: 1000
    p99-alert-threshold-ms: 0   # turn on only while investigating
    jfr: { enabled: false, settings: profile, max-dump-files: 5 }
    contention: { time-monitoring-enabled: false }
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Nothing is recorded at all | No `MeterRegistry`, so the whole auto-configuration was skipped | Add Actuator or a Micrometer registry |
| A method shows no data | Self-invocation, or a non-public method on a `@Profiled` class | Call through the bean; the class-level pointcut matches public methods only |
| `adhar.profiled(...)` blocks never appear in the endpoint | `ProfilerFacade.getInstance()` has its own registry | Build a `ProfilerFacade` over the injected `ProfilingRegistry` |
| `setEnabled(false)` does not stop profiling | The flag only gates `ProfilerFacade.profile`, never the aspect | Set `adhar.profiler.enabled: false`, or `sample-rate: 0.0` |
| `/actuator/profiling` returns 404 | The endpoint is not exposed | Add `profiling` to `management.endpoints.web.exposure.include` |
| Counts look far too low | `sample-rate` is below 1.0 | Expected: unsampled calls are not recorded. Scale accordingly |
| Stats disappear every few minutes | A window rolled over and cleared the live map | Read `/actuator/profiling/windows` for history; lengthen `window-duration` |
| p95 and p99 read as 0 for a fast method | The registry truncates to whole milliseconds | Use the Micrometer timer with `histogram = true` |
| A newly deployed method never appears | `max-tracked-methods` was reached; check for the one-time WARN | Raise the cap, or stop generating dynamic metric names |
| Metric cardinality keeps growing past the cap | The cap gates the registry, not the Micrometer timer | Avoid dynamic `value()` on `@Profiled` |
| Logs flooded with "Slow execution detected" | The per-call slow check is not debounced | Raise `slowThresholdMs`, or set `logSlow = false` and listen for the p99 event |
| Percentiles look wrong in the metrics backend | `histogram = false`, so no percentile histogram is published | Set `histogram = true` on the hot methods that need it |
| Contention times are all zero | `contention.time-monitoring-enabled` is `false` | Turn it on; blocked/waited *counts* are always available |
| JFR endpoints unavailable, or flame graph empty | JFR is disabled in the JVM, or no recording and no retained dump | Check `isJfrAvailable()` and your JVM flags; `POST .../jfr-start` and let it run |

## See also

- [Metrics](/adhar-kit/modules/metrics) — the Micrometer registry the timers are published to
- [Tracing](/adhar-kit/modules/tracing) — per-request spans, complementary to per-method aggregates
- [Observability](/docs/operations/observability) — where this data is collected on the platform
- [Health](/adhar-kit/modules/health) — wiring `health()` into readiness
