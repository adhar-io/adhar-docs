---
title: "Perf Profiler"
section: "Modules"
order: 31
path: "/adhar-kit/modules/perf-profiler"
---

# Perf Profiler

`adhar-kit-perf-profiler` measures method latency inside a running service. Annotate a method or class with `@Profiled` and you get a Micrometer timer per method, rolling-window percentiles, slow-call events, JVM memory and thread-contention snapshots, and on-demand JFR recordings with flame-graph export, all behind `/actuator/profiling`. Use it when you need per-method latency from a live pod without attaching an external profiler. Sampling and a cap on tracked methods keep the overhead bounded, so it can stay on in production.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-perf-profiler` |
| Toggle | `adhar.profiler.enabled` (default `true`) turns the auto-configuration on or off. The facade gate `adhar.kit.modules.perf-profiler` defaults to `false`; while it is off, `adhar.getProfiler()` throws `IllegalStateException` |
| Facade | `adhar.getProfiler()` → `ProfilerFacade`. It is **not** a Spring bean and does not share the auto-configured registry (see [Use one registry](#use-one-registry-for-both-paths)). Injectable beans: `ProfilingRegistry`, `ProfilingAspect`, `MemoryProfiler`, `JfrRecordingManager`, `FlameGraphExporter`, `ThreadContentionCollector`, `ProfilingActuatorEndpoint` |
| Dependencies | Required: `micrometer-core`, `HdrHistogram`, `adhar-kit-commons`. Optional (you add them): `spring-boot-starter-aspectj` for `@Profiled`, `spring-boot-starter-actuator` for the endpoint |
| Frameworks | Spring Boot auto-configuration only. `ProfilerFacade` is a plain class you can construct on any runtime |

## How it works

```diagram
nkc-perf-profiler-paths
```

- `PerfProfilerAutoConfiguration` registers everything when `MeterRegistry` is on the classpath and `adhar.profiler.enabled` is not `false`. The endpoint is added only when Actuator is present.
- `ProfilingAspect` advises `@Profiled` methods, and every **public** method of a `@Profiled` class. A method-level annotation overrides the class-level one. The aspect runs through the Spring proxy, so a call from inside the same bean is not profiled.
- Each sampled call is recorded twice. The Micrometer timer keeps nanosecond precision and goes to your metrics backend. The `ProfilingRegistry` keeps whole-millisecond aggregates for the current window and a bounded history of past windows.
- `ProfilerFacade.profile(name, ...)` is a separate path. It times a block with `System.currentTimeMillis()`, records it under the key `manual.<name>`, emits no Micrometer timer, and ignores `sample-rate`.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-perf-profiler</artifactId>
    <version>0.1.0</version>
</dependency>
<!-- The module marks these optional: add them yourself. -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aspectj</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Expose the endpoint:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,profiling
```

## Use it

### Profile methods

```java
import com.adhar.kit.profiler.annotation.Profiled;
import org.springframework.stereotype.Service;

@Service
@Profiled(slowThresholdMs = 1000)                 // every public method
public class ReportService {

    @Profiled(value = "report.pdf-render", slowThresholdMs = 200, histogram = true)
    public byte[] renderPdf(ReportSpec spec) {    // timer: adhar.profiler.report.pdf-render
        return render(spec);
    }

    public Report generate(ReportSpec spec) {     // timer: adhar.profiler.ReportService.generate
        return new Report(spec, renderPdf(spec)); // self-call: renderPdf is NOT profiled here
    }
}
```

`@Profiled` attributes:

| Attribute | Default | Effect |
|---|---|---|
| `value` | `""` | Timer name suffix. Empty means `ClassName.method`. The registry key is always `ClassName.method` |
| `slowThresholdMs` | `500` | A call above this logs a WARN and publishes a `SlowCallEvent` |
| `logSlow` | `true` | Turns the slow-call log and event on or off |
| `histogram` | `false` | Adds `publishPercentileHistogram()` to the timer, so the backend can compute percentiles |

Every timer carries the tags `class` (simple name), `method`, `success` (`true`/`false`), and `error` (exception simple name) on failure.

### React to slow calls

```java
import com.adhar.kit.profiler.event.SlowCallEvent;
import com.adhar.kit.profiler.event.SlowCallThresholdBreachedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
class LatencyAlerts {

    @EventListener
    void onBreach(SlowCallThresholdBreachedEvent e) {   // debounced, needs p99-alert-threshold-ms > 0
        System.out.printf("p99 of %s is %.1fms (> %dms)%n",
                e.getMethodKey(), e.getP99Ms(), e.getThresholdMs());
    }

    @EventListener
    void onSlowCall(SlowCallEvent e) {                  // one per slow call
        System.out.printf("%s took %dms%n", e.getMethodKey(), e.getDurationMs());
    }
}
```

### Use one registry for both paths

`adhar.getProfiler()` returns `ProfilerFacade.getInstance()`, which builds its own `ProfilingRegistry`. Blocks timed with `adhar.profiled(...)` then never reach `/actuator/profiling`, and `@Profiled` methods never reach `adhar.getProfiler().getReport()`. Point the facade at the auto-configured beans:

```java
import com.adhar.kit.profiler.ProfilerFacade;
import com.adhar.kit.profiler.memory.MemoryProfiler;
import com.adhar.kit.profiler.registry.ProfilingRegistry;
import com.adhar.kit.starter.AdharFacadeCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class ProfilerWiring {

    @Bean
    ProfilerFacade profilerFacade(ProfilingRegistry registry, MemoryProfiler memory) {
        return new ProfilerFacade(registry, memory);
    }

    @Bean
    AdharFacadeCustomizer useSharedProfiler(ProfilerFacade profiler) {
        return facade -> facade.setProfiler(profiler);
    }
}
```

Then time a block with no method to annotate:

```java
Report report = adhar.profiled("report-generation", () -> build(spec)); // key: manual.report-generation
```

`ProfilerFacade` methods: `profile(name, Supplier<T>)`, `profile(name, Runnable)`, `getReport()`, `getHotspots(topN)`, `getMethodStats(key)` (returns `Optional<MethodProfile>`: counts, total, min, max, errors), `getMemorySnapshot()`, `getHeapUsageMb()`, `getThreadCount()`, `reset()`, `isEnabled()` / `setEnabled(boolean)`, and `health()`. For percentiles of one method, call `ProfilingRegistry.getMethodStats(key)`, which returns `Optional<ProfilingReport.MethodStats>` (avg, min, max, p95, p99).

### Capture a flame graph

The JFR recording starts only on request:

```bash
curl -X POST http://localhost:8080/actuator/profiling/jfr-start
# ... let the workload run ...
curl http://localhost:8080/actuator/profiling/flamegraph > app.collapsed
curl -X POST http://localhost:8080/actuator/profiling/jfr-stop
```

The output is collapsed-stack text (`root;caller;leaf <samples>` per line, built from `jdk.ExecutionSample` events), ready for `flamegraph.pl` or speedscope.

## Configuration

| Property | Type | Default | Description |
|---|---|---|---|
| `adhar.profiler.enabled` | boolean | `true` | Registers the whole module |
| `adhar.profiler.sample-rate` | double | `1.0` | Fraction of `@Profiled` calls timed; clamped to 0.0–1.0 |
| `adhar.profiler.max-tracked-methods` | int | `1000` | Distinct registry keys; `<= 0` means unbounded |
| `adhar.profiler.p99-alert-threshold-ms` | long | `0` | Publish `SlowCallThresholdBreachedEvent` when a method's p99 exceeds this; `0` disables |
| `adhar.profiler.window-duration` | Duration | `5m` | Length of the rolling window |
| `adhar.profiler.history-windows` | int | `5` | Completed windows kept in history |
| `adhar.profiler.default-slow-threshold-ms` | long | `500` | Bound but not read by any component; set `slowThresholdMs` on the annotation |
| `adhar.profiler.log-slow-by-default` | boolean | `true` | Bound but not read by any component; set `logSlow` on the annotation |
| `adhar.profiler.jfr.enabled` | boolean | `false` | Bound but not read: nothing starts the recording at startup. Use `POST .../jfr-start` |
| `adhar.profiler.jfr.settings` | String | `default` | JFR preset, `default` or `profile`. An unknown name starts a recording with no preset |
| `adhar.profiler.jfr.max-size-mb` | long | `100` | Recording disk buffer; `<= 0` disables the limit |
| `adhar.profiler.jfr.max-age` | Duration | `1h` | Age of buffered data; zero or negative disables the limit |
| `adhar.profiler.jfr.dump-directory` | String | `<java.io.tmpdir>/adhar-profiler-jfr` | Where dumps are written |
| `adhar.profiler.jfr.max-dump-files` | int | `5` | Dumps kept; the oldest are deleted first (minimum 1) |
| `adhar.profiler.contention.time-monitoring-enabled` | boolean | `false` | Turns on JVM-wide contention time measurement at startup |
| `adhar.profiler.contention.top-threads` | int | `10` | Threads reported when no `top` is given |

```yaml
adhar:
  kit:
    modules:
      perf-profiler: true        # only needed for adhar.getProfiler()
  profiler:
    sample-rate: 0.1             # 10% of calls in production
    p99-alert-threshold-ms: 0    # turn on while investigating
    jfr:
      settings: profile
```

## Operations

### Endpoint

The endpoint id is `profiling`. It exposes method names and heap figures, so secure it like any non-health Actuator endpoint.

| Request | Returns |
|---|---|
| `GET /actuator/profiling` | Full `ProfilingReport` for the current window (top 10 slowest) |
| `GET /actuator/profiling/hotspots?top=10` | Slowest methods by average time |
| `GET /actuator/profiling/percentiles` | Per-method avg/min/max/p95/p99 |
| `GET /actuator/profiling/windows` | Current report plus window history |
| `GET /actuator/profiling/memory` | Heap, non-heap, GC counts and times, thread counts |
| `GET /actuator/profiling/contention?top=10` | Most contended threads, with deltas since the previous snapshot |
| `GET /actuator/profiling/jfr` | Recording status and retained dump files |
| `GET /actuator/profiling/flamegraph` | Collapsed stacks from a fresh dump, or the latest retained one |
| `POST /actuator/profiling/jfr-start` \| `jfr-stop` \| `jfr-dump` | Control the recording |
| `DELETE /actuator/profiling` | Reset statistics and window history |

An unknown section or action returns `{"error": "..."}` with status 200, not 404. `flamegraph` without a recording or dump returns `{"error": "No JFR dump available: start the JFR recording first"}`.

### Overhead

| Per call | Work done |
|---|---|
| Not sampled | One `ThreadLocalRandom` draw, then the method |
| Sampled, over the cap | Signature lookup, two `nanoTime()` reads, timer lookup and `record` |
| Sampled and tracked | Plus a `ConcurrentHashMap.compute` and a synchronized histogram write |
| p99 alerting on | Plus two percentile computations per recorded call |

All callers of the same method briefly share one monitor in the registry; different methods do not contend. Keep `sample-rate` at `1.0` in development and load tests, and lower it in production. Leave `p99-alert-threshold-ms` at `0` and JFR stopped until you are investigating.

### Failure behaviour

- A method that throws is still timed, with `success=false` and an `error` tag. The exception propagates unchanged.
- With no `MeterRegistry` on the classpath, the whole module is skipped, endpoint included.
- When JFR is unavailable in the JVM, `jfr-start` returns a "not started" status instead of failing.
- On context close, `JfrRecordingManager.close()` stops the recording without dumping it. Dump first if you need the data.

## Limits

- **Self-invocation is invisible.** `this.method()` inside the bean skips the aspect: no timer, no registry entry, no warning. Non-public methods of a `@Profiled` class are never profiled, and `@Profiled` is not inherited by subclasses.
- **Millisecond resolution in the registry.** Durations are truncated to whole milliseconds; the histogram covers 1 ms to 1 hour at two significant digits. Fast methods show p95/p99 of `0`. Use the Micrometer timer with `histogram = true` for them.
- **Windows discard live data.** At each rollover the current stats move to history and the live map is cleared. `getMethodStats` and hotspots reflect the current window only; read `/windows` for trends.
- **The p99 alert rearms only on recovery.** After a breach, the event fires again only once a recorded call sees p99 at or below the threshold. A window rollover does not rearm it.
- **The cap counts every method seen since startup.** `max-tracked-methods` is not reset by window rollover or `DELETE /actuator/profiling`. Past the cap, new methods still get Micrometer timers, so dynamic `value()` names still grow metric cardinality. One WARN is logged when the cap is first hit.
- **Slow-call logging is not debounced.** An always-slow method logs and publishes a `SlowCallEvent` on every call. Raise `slowThresholdMs`, or set `logSlow = false` and use the p99 event.
- **Sampled counts are partial.** With `sample-rate` below 1.0, call counts cover only the sampled calls.
- **`setEnabled(false)` stops only the facade path.** It never affects the aspect. To stop profiling, set `adhar.profiler.enabled: false` or `sample-rate: 0.0`.
- **Every `GET /flamegraph` writes a dump** while a recording runs, which rotates older dumps out of `jfr.dump-directory`.
- **Contention times need opt-in.** Without `contention.time-monitoring-enabled`, blocked and waited times read `-1` and threads are ranked by counts.
- **State is per process.** Nothing is persisted or shared across replicas.

## Next steps

- [Metrics](/adhar-kit/modules/metrics) — the Micrometer registry the timers publish to.
- [Tracing](/adhar-kit/modules/tracing) — per-request spans, complementary to per-method aggregates.
- [Concepts](/adhar-kit/concepts) — module toggles, auto-configuration and the facade model.
- [Observability](/docs/operations/observability) — where the platform collects this data.
