---
title: "Perf Profiler"
section: "Modules"
order: 31
path: "/adhar-kit/modules/perf-profiler"
---

# Perf Profiler

`adhar-kit-perf-profiler` gives you method-level latency data from inside a running service: hotspot detection, percentile statistics, rolling time windows, slow-call events, memory and GC snapshots, thread-contention analytics, continuous JFR recording, and an Actuator endpoint. It exists because **the two usual options are both bad in production** — an external profiler you cannot attach to a live pod, or `System.currentTimeMillis()` scattered through the code. This module is designed to be left on at a low sample rate: sampling and a bounded method registry cap the overhead.

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

There are two recording paths and they feed different consumers.

```diagram
kit-profiler-paths
```

### The two overhead guards and the sampling gate

Before anything is measured, `ProfilingAspect.doProfile` consults two independent guards. Understanding where each one sits is the difference between "profiling is free" and "profiling is on the hot path".

**`sample-rate` is the first gate, and it short-circuits everything.** `shouldSample()` returns `true` immediately when the rate is `1.0`; otherwise it draws from `ThreadLocalRandom`. An unsampled call does nothing but `joinPoint.proceed()` — no signature reflection, no `System.nanoTime()`, no `Timer` lookup, no registry write. The cost of an unsampled call is one random draw plus the proxy hop. The rate is clamped to `[0.0, 1.0]` both in the setter and again in the aspect constructor, so an out-of-range value is corrected rather than rejected.

**`max-tracked-methods` is the second guard, and it is narrower than it looks.** `isTrackingAllowed(registryKey)` gates only the **registry write** and the p99 check. A sampled call always builds and records its Micrometer timer, even past the cap. Methods already in the tracked set are always allowed; once the set reaches the cap, each newly-seen key is skipped and a single WARN is logged for the whole process (`capWarningLogged` is a one-shot `AtomicBoolean`), naming the first method skipped. So the cap protects the registry from unbounded growth; it does not protect your meter registry from metric-name explosion.

**Debounced p99 breach detection.** When `p99-alert-threshold-ms` is greater than zero, every *recorded* call re-reads the method's aggregate stats from the registry and compares `p99Ms()` to the threshold. The debounce is a `Set<String> breachedMethods`: the event is published only when `breachedMethods.add(key)` returns `true`, so you get one `SlowCallThresholdBreachedEvent` per breach, not one per call. When p99 drops back under the threshold the key is removed and the method rearms. Note the cost: this adds a map lookup and two HdrHistogram percentile computations to every recorded call, so leave the threshold at `0` unless you want the alerts.

Separately and independently, if the elapsed time exceeds the annotation's `slowThresholdMs` and `logSlow` is on, the aspect logs a warning *and* publishes a per-call `SlowCallEvent`. This check is not debounced — a method that is uniformly slow produces one log line and one event per call, which is the usual cause of "profiling flooded our logs".

Alongside the aspect, `MemoryProfiler` reads heap, non-heap, GC, and thread counts from the JVM's management beans; `ThreadContentionCollector` reads `ThreadMXBean` contention data; and `JfrRecordingManager` drives a continuous Java Flight Recorder recording that `FlameGraphExporter` can collapse into flame-graph text.

### What profiling actually costs

No benchmark ships with this repo, so reason about it structurally rather than from a number:

| Per call | Work done |
|---|---|
| Not sampled | One `ThreadLocalRandom.nextDouble()`, then the method |
| Sampled, cap reached | Signature reflection, two `nanoTime()` reads, a `Timer.Builder` lookup and `record` |
| Sampled and tracked | The above, plus a `ConcurrentHashMap.compute` and a synchronized `Histogram.recordValue` |
| Sampled, tracked, p99 alerting on | The above, plus two `getValueAtPercentile` computations |

The synchronized block in `MutableMethodStats` is per method key, so two hot methods do not contend with each other — but all callers of the *same* hot method serialize briefly on that monitor. On a method called tens of thousands of times a second, that monitor rather than the timing itself is what you will measure.

So: leave `sample-rate` at `1.0` in development and load tests, drop it to `0.01`–`0.1` in production and scale counts accordingly, and leave `p99-alert-threshold-ms` at `0` and `jfr.enabled` at `false` until you are actually investigating.

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
- `getReport()`, `getHotspots(topN)` (slowest by average time), `getMethodStats(methodName)` keyed on the full `Class.method` registry key.
- `getMemorySnapshot()`, `getHeapUsageMb()`, `getThreadCount()`, `reset()`, `isEnabled()` / `setEnabled(boolean)`, and `health()` (`profiledMethodCount`, `totalProfiledCalls`, `heapUsedMb`, `heapMaxMb`).

`ProfilingRegistry` is the aggregation engine: `record(result)`, `getReport([topN])`, `getHotspots(topN)`, `getMethodStats(key)` returning `Optional<ProfilingReport.MethodStats>` (avg, min, max, p95, p99), `getWindowHistory()`, `reset()`. Its constants `DEFAULT_WINDOW_DURATION` (5 minutes) and `DEFAULT_HISTORY_WINDOWS` (5) match the configuration defaults. `JfrRecordingManager` offers `isJfrAvailable()`, `start()`, `stop()`, `dump()`, `latestDump()`, `status()`. Two events are published: `SlowCallEvent` (per call) and `SlowCallThresholdBreachedEvent` (aggregate p99, debounced).

> **`ProfilerFacade` is not a Spring bean.** `PerfProfilerAutoConfiguration` registers `ProfilingRegistry`, `ProfilingAspect`, `MemoryProfiler`, `JfrRecordingManager`, `FlameGraphExporter`, `ThreadContentionCollector` and the Actuator endpoint — but no `ProfilerFacade`. `adhar.getProfiler()` returns `ProfilerFacade.getInstance()`, a singleton that builds its **own** default `ProfilingRegistry`. Consequences: blocks timed with `adhar.profiled(...)` do not appear in `/actuator/profiling`, `@Profiled` methods do not appear in `adhar.getProfiler().getReport()`, the facade's registry ignores `window-duration` and `history-windows`, and `setEnabled(false)` silences only the programmatic path — never the aspect. Declare your own `ProfilerFacade` bean built from the injected `ProfilingRegistry` if you want one view.

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

The `renderPdf(spec)` call inside `generateReport` is deliberately left as a self-call to show the trap: it produces no timer and no registry entry, and nothing warns you. Inject a self-reference, split the renderer into its own bean, or wrap it with `profiler.profile(...)` instead.

### How the interception works

`ProfilingAspect` is registered as a bean by `PerfProfilerAutoConfiguration` — there is no `@EnableProfiling`; the aspect exists as soon as the module is on the classpath with a `MeterRegistry` present. It advises two pointcuts:

- `@Around("@annotation(profiled)")` — one annotated method, whatever its visibility *as seen through the proxy*.
- `@Around("@within(profiled) && execution(public * *(..))")` — every **public** method of an annotated class.

So `@Profiled` on a class profiles all its public methods with the class-level attributes, and a method-level `@Profiled` overrides them for that method. The `execution(public ...)` clause on the class-level pointcut is explicit: package-private and protected methods of a `@Profiled` class are never profiled, even though Spring AOP could in principle advise them on a CGLIB proxy. `@Profiled` is not `@Inherited`, so annotating a base class does not profile a subclass.

> **Self-invocation.** Both pointcuts work through the Spring proxy. A call from inside the same bean — `this.renderPdf(...)` — bypasses the advice entirely: no timer, no registry entry, no warning, no error. This is by far the most common reason a method "shows no data". Call through the injected bean, inject a self-reference, or use `ProfilerFacade.profile(...)` for in-class work.

### Timer names and tags

The Micrometer timer name is **always** `adhar.profiler.` plus either `Class.method` (when `value()` is empty) or the annotation's `value()`:

```text
@Profiled                                  -> adhar.profiler.DataProcessor.processData
@Profiled(value = "report.pdf-render")     -> adhar.profiler.report.pdf-render
```

Every timer carries the tags `class` (the declaring type's simple name), `method`, and `success` (`"true"` / `"false"`). On a failure a fourth tag, `error`, holds the exception's simple name. `histogram = true` adds `publishPercentileHistogram()`, which is what lets your metrics backend compute accurate server-side percentiles — without it the backend only sees count and sum.

The **registry** key is always `Class.method` regardless of `value()`, so the two views use different identifiers for the same method. `ProfilerFacade.profile(name, ...)` records under class name `"manual"`, giving the key `manual.<name>`, and emits no Micrometer timer at all.

## How it behaves

**Thread safety.** `ProfilingRegistry` is a `ConcurrentHashMap` of per-method accumulators; every write goes through `compute` (one writer per key) and every accumulator method is `synchronized`, so concurrent reads during report generation are consistent. `ProfilingAspect` holds two concurrent key sets and an `AtomicBoolean`. Both are safe to share as singletons; `MemoryProfiler` and `ThreadContentionCollector` are stateless readers of JVM management beans.

**Resolution and rounding.** Elapsed time is measured with `System.nanoTime()` but converted with `TimeUnit.NANOSECONDS.toMillis()` before it reaches the registry, and the HdrHistogram covers 1 ms to 1 hour at two significant digits. A sub-millisecond method therefore records `0` and its p95/p99 read as `0`. The Micrometer timer keeps the full nanosecond value, so use the timer, not the registry, for fast methods. `ProfilerFacade.profile` uses `System.currentTimeMillis()`, coarser still.

**Memory is bounded by construction.** Each accumulator holds one HdrHistogram whose footprint is fixed at construction by its range and precision — it does not grow with sample count. The number of accumulators is capped by `max-tracked-methods`, and the window history at `history-windows` snapshots, oldest evicted first. No per-call data is retained anywhere.

**Windows roll forward and discard.** `maybeRollover()` runs on every `record` and `getReport`: a volatile read plus a duration comparison in the common case, and under a `ReentrantLock` with a double check when a rollover is due. On rollover the current stats are snapshotted into `windowHistory` and **`stats.clear()` wipes the live map.** So `getMethodStats` returns empty for a method not called in the current window, hotspots reflect the current window only, and a p99 breach implicitly rearms at every window boundary because the key disappears from the registry. Use `/actuator/profiling/windows` for trend data.

**Lifecycle and failure.** The beans are plain singletons created at context startup; recording begins with the first proxied call. Nothing is drained or persisted at shutdown, which is correct for this kind of data — but a JFR recording started through the endpoint is *not* stopped on context close, so take a dump before you shut down. The aspect's `finally` block always runs, so a throwing method is still timed and recorded with `success=false` and an `error` tag; exceptions propagate unchanged. With no `MeterRegistry` on the classpath the entire auto-configuration is skipped, endpoint included.

## JFR and the cost of leaving it on

`jfr.enabled` is `false` by default and should usually stay that way. A continuous recording is the most expensive thing in this module: it buffers up to `jfr.max-size-mb` on disk, retains `jfr.max-age` of events, and the `profile` preset samples substantially harder than `default`. Dumps accumulate in `jfr.dump-directory` up to `jfr.max-dump-files`, oldest deleted first. The intended workflow is on-demand:

```bash
curl -X POST http://localhost:8080/actuator/profiling/jfr-start
# ... let the workload run ...
curl http://localhost:8080/actuator/profiling/flamegraph
curl -X POST http://localhost:8080/actuator/profiling/jfr-stop
```

`flamegraph` dumps the running recording on demand, falling back to the most recent retained dump, then collapses it. With neither available it returns `{"error": "No JFR dump available: start the JFR recording first"}` rather than failing.

Thread-contention *time* measurement (`contention.time-monitoring-enabled`) is the other opt-in cost: it enables a JVM-wide per-monitor measurement. Blocked and waited **counts** are always available; only the **times** require it.

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

An unrecognised section or action returns `{"error": "Unknown section: ..."}` with a 200, not a 404. These are operational endpoints that expose method names and heap figures — secure them like any other non-health Actuator endpoint.

## Testing

`adhar-kit-test-commons` has no profiler helper; the components are plain objects, so test them directly.

- **Aspect tests** — the two-argument `new ProfilingAspect(meterRegistry, registry)` convenience constructor gives sample rate `1.0`, no event publisher, default cap. Pass a `SimpleMeterRegistry` and a real `ProfilingRegistry`, drive a mocked `ProceedingJoinPoint`, then assert on `registry.getMethodStats("Class.method")` and the meter registry's timers. The four-argument form takes a `PerfProfilerProperties` you have configured; a `sampleRate` of `0.0` makes the aspect a pure pass-through, a clean way to assert your method still behaves correctly unprofiled.
- **Events and windows** — pass a mock `ApplicationEventPublisher` and verify the events rather than scraping logs; construct `new ProfilingRegistry(Duration.ofMillis(50), 2)` so a rollover happens on demand instead of after five minutes.
- **Disabling side effects** — `adhar.profiler.enabled: false` removes the whole auto-configuration, and omitting Micrometer from the test classpath has the same effect. Avoid `ProfilerFacade.getInstance()` in tests: it is a process-wide singleton shared across the JVM, so construct `new ProfilerFacade(registry, memoryProfiler)` explicitly.

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

The slow-call threshold and the slow-call logging flag come from the `@Profiled` annotation (`slowThresholdMs = 500`, `logSlow = true`) on every path. The two module-level properties above are bound and readable but no component consults them; set the annotation attributes instead.

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
