---
title: "Analytics"
section: "Modules"
order: 26
path: "/adhar-kit/modules/analytics"
---

# Analytics

`adhar-kit-analytics` is a production wrapper around PostHog for product analytics. It covers event tracking, user identification, feature flags / A-B testing, and group analytics.

The problem it solves: **the naive integration — an HTTP call to PostHog on the request thread — leaks PII, ignores consent, and couples your latency to a third party's uptime.** This module puts four things between your code and the wire: a consent gate, a PII scrubber, a bounded async queue, and a retrying sender.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-analytics` |
| Built on | PostHog HTTP API via OkHttp + Jackson; Spring Boot auto-configuration; AspectJ proxies |
| Entry points | `AnalyticsFacade` (singleton), `EventAggregator`, `ReportGenerator`, `LocalFlagEvaluator` |
| Annotations | `@TrackEvent`, `@TrackGroup`, `@AliasUser`, `@FeatureFlag` |
| Delivery | Bounded in-memory queue → batch POST → `DelayQueue` retry → optional JSONL spill |
| Use it when | You want product telemetry and flag-driven rollouts without hand-rolling batching, consent, and redaction |
| Skip it when | You only need operational telemetry — use [Metrics](/adhar-kit/modules/metrics) and [Tracing](/adhar-kit/modules/tracing) instead |

## How it works

`AnalyticsFacade` is a process-wide singleton. It starts up lazily from the environment: `POSTHOG_API_KEY` / `posthog.api.key` and `POSTHOG_HOST` / `posthog.host`, with the host defaulting to `https://app.posthog.com`. That is why `getInstance()` works in plain Java, and in aspects built before the Spring context is ready.

When Spring is present, `AnalyticsAutoConfiguration` calls `configure(properties)` once. This overrides those defaults and rebuilds the HTTP client, batching sender, flag cache, consent gateway and PII scrubber. The bean uses `destroyMethod = "shutdown"`, so buffered events flush when the context closes.

Every call travels the same pipeline:

```diagram
kit-analytics-pipeline
```

Feature flags take a different path. `FeatureFlagCache` holds `/decide/?v=3` results for `feature-flag-cache-ttl-seconds`. With local evaluation on, `LocalFlagEvaluator` decides rollout percentages and property conditions in-process first. It falls back to `/decide` only for flags it cannot resolve.

### The queue and its overflow policy

`BatchingEventSender` holds a `LinkedBlockingDeque` sized to `queue-capacity` (10,000 by default). What happens when it is full is the most important operational fact about this module:

- **`DROP_OLDEST` (the default)** — The sender calls `pollFirst()` to evict the head, increments a `droppedCount`, and logs a WARN naming the discarded event. The caller is never blocked and never sees an error. You find out from `health().droppedEvents` or from the log.
- **`BLOCK`** — The caller's thread parks on `putLast` until space frees up. Latency moves onto your request path. That is the point: here, losing events is worse than being slow. One edge case: if the parked thread is interrupted, the event is dropped with a WARN and the interrupt flag is re-set. `droppedCount` is *not* incremented.

A flush is triggered in two ways:

- **Scheduled.** It runs on a single daemon thread named `posthog-batch-flush` every `flush-interval` seconds (floored at 50 ms).
- **Opportunistic.** It runs **on the calling thread**, inside `enqueue`, as soon as `queue.size() >= batch-size`.

Both go through a `tryLock`. If a flush is already running, the second caller returns at once instead of waiting behind it. So under `DROP_OLDEST`, the worst case for a producer is one batch POST on its own thread.

`flush()` drains the entire queue. It then slices it into chunks of `batch-size` and POSTs each to `/batch/`.

### Retry, backoff, and the spill file

A failed chunk goes to `scheduleRetry(batch, 1)`. Each `RetryBatch` carries a ready-at timestamp and sits in a `DelayQueue`. The same scheduler thread polls that queue every `max(25, min(initial-backoff-millis, 500))` milliseconds.

Attempt *n* waits `initial-backoff-millis * multiplier^(n-1)`, capped at `max-backoff-millis`. With defaults, that is 500 ms, 1 s, 2 s.

A batch leaves the retry queue in one of four ways:

- It is delivered (this increments `retriedCount`).
- It runs out of `max-attempts`.
- It arrives when the queue already holds `max-batches` (1,000).
- `shutdown()` runs.

The last three all go to `spillOrDrop`.

`spillOrDrop` writes to the `SpillStore` if one is configured, and increments `spilledCount`. Otherwise it increments `retryDroppedCount` and logs a WARN. **If the disk write itself fails**, the error is logged and the batch falls through to the drop path. So a full or read-only volume leads to data loss, not to an exception on your request path.

`JsonlSpillStore` is deliberately simple. It uses one file, `analytics-spill.jsonl`, in `spill-directory`. Each line is one JSON array of events, appended under an intrinsic lock.

Its constructor calls `Files.createDirectories` and throws `UncheckedIOException` if that fails. So a bad `spill-directory` fails at `configure()` time, during context startup, instead of silently later.

On the next start, `BatchingEventSender`'s constructor calls `loadAndClear()`. This does the following:

- It parses every line back into a batch and re-queues it at attempt 1.
- It skips malformed lines with a warning.
- It deletes the file. But if the file cannot be *read*, the loader returns empty and leaves the file in place instead of destroying it.

Only `loadAndClear()` prunes the file, so it grows unbounded while the process is offline. This is a crash safety net, not a durable queue.

> The facade's `health()` exposes `pendingEvents` and `droppedEvents`. But `droppedEvents` is only the **queue-overflow** counter. `spilledCount()`, `retryDroppedCount()`, `retriedCount()` and `retryPendingCount()` live on `BatchingEventSender` and the facade does not surface them. If loss from exhausted retries matters to you, watch the logs for "Dropping analytics batch".

### Consent and PII

`ConsentGateway.isAllowed(distinctId)` is checked at the top of `track`, `identify`, `alias` and `group`. For an opted-out id, the call returns silently, with no event and no counter. The gateway *allows* a `null` distinct id; the calling methods reject it separately.

`PiiScrubber.scrub` never changes its input; it returns a new map. Two independent rules apply to each property:

- **Key-based.** A key that matches `redacted-keys` (case-insensitive) becomes `***REDACTED***`, whatever the value.
- **Pattern-based** (`pattern-detection-enabled`, on by default). A `String` value is redacted if it *fully matches* one of these: an email, a `ddd-dd-dddd` SSN, 13–19 digits after stripping spaces and dashes, or a phone pattern.

The pattern rules are anchored to the whole value. `"alice@example.com"` is redacted; `"emailed alice@example.com yesterday"` is not. Treat pattern detection as a backstop for a mis-keyed field, not as free-text redaction.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-analytics</artifactId>
    <version>0.1.0</version>
</dependency>
```

OkHttp, Kafka, Spring Batch, POI, OpenCSV and iText are declared `optional` in the module POM. If you use the reporting or event-publishing paths, add them yourself.

## Key APIs

`AnalyticsFacade.getInstance()` is the one object you need:

- `track(userId, event, properties)` — Records an action. The event name is the unit of analysis in PostHog, so name it as a past-tense action ("User Registered").
- `identify(userId, properties)` — Sends a `$identify` event with the properties under `$set`. Keys that begin with `$` (like `$email`) are PostHog's reserved person fields.
  - `trackPageView` sends `$pageview` with `$current_url`.
  - `group` sends `$groupidentify` (`$group_type` defaults to `company`).
  - `alias` sends `$create_alias`.
- `isFeatureEnabled(userId, featureKey)` and `getFeatureFlag(userId, featureKey)` — **User id first, flag key second.** Each has a third-argument `personProperties` overload that prefers local evaluation.
- `flush()` forces the queue out. `shutdown()` flushes, closes the client, and sets `available = false`, so every later call becomes a no-op.
- `health()` returns `available`, `provider`, `featureFlagsCacheSize`, `pendingEvents`, and `droppedEvents`.

Supporting types:

- `EventAggregator` — `countByEventType`, `getTopUsers`, `getHourlyDistribution`, `funnel`, `retention`.
- `ReportGenerator` — CSV and Excel, to a stream, a byte array or a path.
- `PiiScrubber` / `ConsentGateway` — both reachable from the facade.

## Worked example — a checkout service

This is a complete service, wired the way you would really ship it:

- The flag read is explicit, not annotation-driven, so the disabled branch is visible.
- Consent is respected by construction.
- The event is sent after the write commits.

```java
import com.adhar.kit.analytics.AnalyticsFacade;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class CheckoutService {

    private final AnalyticsFacade analytics;
    private final OrderRepository orders;

    public CheckoutService(AnalyticsFacade analytics, OrderRepository orders) {
        this.analytics = analytics;        // Spring bean; falls back to getInstance() off-Spring
        this.orders = orders;
    }

    public Receipt checkout(String userId, String tenantId, Cart cart) {
        // Flag read is cached for feature-flag-cache-ttl-seconds and fails closed:
        // any /decide error returns false, so the legacy path is the safe default.
        boolean newFlow = analytics.isFeatureEnabled(userId, "new-checkout");

        Order order = newFlow ? orders.placeV2(cart) : orders.placeV1(cart);

        Map<String, Object> props = new HashMap<>();
        props.put("orderId", order.id());
        props.put("itemCount", cart.items().size());
        props.put("totalMinor", cart.totalMinorUnits());
        props.put("variant", newFlow ? "v2" : "v1");
        props.put("tenantId", tenantId);

        // Enqueue only; this returns without a network call unless the queue
        // just crossed batch-size, in which case one POST runs on this thread.
        analytics.track(userId, "Order Placed", props);

        return order.receipt();
    }
}
```

Note three deliberate choices:

- It passes the **user id first** to `isFeatureEnabled`. The reverse order compiles, and silently always returns `false`.
- It puts no raw email in `props`. An exact-match email value comes back as `***REDACTED***`, and an embedded one is not caught at all.
- It calls `track` after the repository write. You can recover from a dropped event, but not from a phantom one.

## Worked example — annotations

```java
import com.adhar.kit.analytics.annotation.FeatureFlag;
import com.adhar.kit.analytics.annotation.TrackEvent;

@Service
public class OrderService {

    @TrackEvent(event = "Order Placed",
                userIdParam = "userId",
                trackOnFailure = true,
                includeReturnValue = true,
                returnValueProperty = "orderId")
    public String placeOrder(String userId, Cart cart) {
        return orders.save(cart).getId();
    }

    @FeatureFlag(flag = "new-checkout",
                 userIdParam = "userId",
                 requireEnabled = true,          // without this the fallback never runs
                 trackExposure = true,
                 fallbackMethod = "legacyCheckout")
    public Receipt checkout(String userId, Cart cart) { ... }

    public Receipt legacyCheckout(String userId, Cart cart) { ... }
}
```

### Aspect mechanics

All four aspects are AspectJ `@Around` advice matched on `@annotation(...)`. Two mechanics decide whether they fire at all.

**Self-invocation.** Spring AOP works through a proxy. So `this.placeOrder(...)`, called from another method of `OrderService`, bypasses the advice completely: no event, no flag check, no error, no log. Call annotated methods from a different bean, or inject a self-reference. This is the most common reason an annotation "does nothing".

**Registration.** `AnalyticsAutoConfiguration` declares bean methods for three aspects:

- `TrackEventAspect` (`adhar.analytics.annotations.track-event-enabled`)
- `TrackGroupAspect` (`track-group-enabled`)
- `AliasUserAspect` (`alias-user-enabled`)

It declares **none for `FeatureFlagAspect`**. That class carries only `@Component`, so `@FeatureFlag` does nothing unless your component scan reaches `com.adhar.kit.analytics.aspect`. (`AnalyticsProperties` also defines `feature-flag-enabled`, `track-page-view-enabled`, `identify-user-enabled`, `track-session-enabled` and `enable-analytics-enabled`, but no aspect reads them.)

**Ordering.** `FeatureFlagAspect` is `@Order(50)`. The other three are all `@Order(100)`. So the flag advice wraps the tracking advice:

- The flag decision and its `$feature_flag_called` exposure event are recorded before the tracking advice builds its property map.
- On the disabled-with-fallback path, the tracking advice still sees the call.

The relative order of the three `@Order(100)` aspects is unspecified. They do not interact.

**`requireEnabled` defaults to `false`.** In that case a disabled flag *still runs the original method*. The annotation only tracks exposure. Only with `requireEnabled = true` does a disabled flag route to `fallbackMethod`. With no fallback named, it returns the return type's zero value. The fallback is invoked reflectively on `joinPoint.getTarget()`. So it bypasses the proxy, and annotations on it do not apply.

**`async()` is a no-op.** `@TrackEvent(async = ...)` reaches a method that takes the same synchronous branch either way. The `@Async` on it sits on a protected method called from within the same object, so Spring's async proxy never sees it. Properties are always built on the caller's thread. The asynchrony you get comes from the queue, not the annotation.

By default `@TrackEvent` fires on success only (`trackOnSuccess = true`, `trackOnFailure = false`, `trackOnEntry = false`). If no `properties()` are listed, every parameter becomes a property, except `userIdParam` and anything in `excludeProperties()`. On the failure path, `error` and `error_message` are added. If `userIdParam` resolves to nothing, the aspect logs a warning and carries on without an event.

## How it behaves

**Thread safety.** `AnalyticsFacade` is a singleton. Its mutable fields are `volatile` and its `configure` is `synchronized`. The queue is a `LinkedBlockingDeque`, the counters are atomics, and a `ReentrantLock` guards `flush`. Share one instance freely. `PiiScrubber` and `ConsentGateway` are immutable after construction.

**Ordering.** The queue is FIFO, and a single flusher POSTs chunks in order. But a failed chunk goes to the delay queue while later chunks keep flowing. So **PostHog can receive events out of order once a retry happens.** Events carry their own capture timestamp, so this affects delivery order, not analysis.

**Lifecycle.** Construction is lazy and never fails. With no API key, the facade logs a warning and leaves `available = false`, and every tracking call returns silently.

`configure()` shuts down the previous sender, which flushes it, before building the new one. So re-configuring does not lose buffered events.

`shutdown()` does the following, in order:

1. Stops the scheduler and waits up to 2 seconds for it.
2. Runs a final synchronous flush.
3. Spills the retry queue.
4. Closes the HTTP client.
5. Flips `available` to `false`.

**Failure behaviour.** Every public method is wrapped in try/catch, and logs instead of throwing. If PostHog is down, your request path sees zero exceptions. Batches fail, retry, back off, and finally spill or drop. `isFeatureEnabled` catches everything and returns `false`; `getFeatureFlag` returns `null`. So flags **fail closed**. Write your code so the disabled branch is the safe one.

**Resource bounds.** The event queue is capped at `queue-capacity`, and the retry queue at `max-batches`. Two things are unbounded:

- The spill file, while the process is offline.
- `FeatureFlagCache`, which holds one entry per `(userId, flagKey)` seen within the TTL. Many distinct anonymous ids will grow it. Prefer `preloadFeatureFlags` on a stable id over per-request reads on a fresh one.

## Testing

`adhar-kit-test-commons` ships no analytics helper. Test at the seam instead.

- **Unit tests** — The module's own tests use `AnalyticsFacade`'s package-private constructor. They build a standalone instance around a stub `PostHogClient`, which avoids state leaking between tests through the singleton. From your own package, mock `AnalyticsFacade` and inject it by constructor, as in the worked example above. That constructor also takes:
  - `batchingEnabled = false`, for one synchronous send per call, so assertions do not race the flusher.
  - a `java.time.Clock`, which you can advance past `feature-flag-cache-ttl-seconds` without sleeping.
- **Disabling side effects** — `adhar.analytics.enabled: false` drops the whole auto-configuration. Leaving the API key unset also works: the facade stays unavailable and every call is a no-op. `annotations.track-event-enabled: false` silences the annotation path only.
- **Aspect tests** — `TrackEventAspect` and `FeatureFlagAspect` both have package-private constructors that take an `AnalyticsFacade`. You can drive them with a mocked `ProceedingJoinPoint` and no Spring context.

## Configuration

Properties bind under `adhar.analytics`. The PostHog sub-object is the field `postHog`, so its canonical metadata key is `post-hog`. Spring's relaxed binding also accepts `posthog`.

```yaml
adhar:
  analytics:
    enabled: true
    post-hog:
      api-key: ${POSTHOG_API_KEY}
      host: https://posthog.example.com
      batch-size: 100
      flush-interval: 10
      overflow-policy: DROP_OLDEST
      feature-flag-cache-ttl-seconds: 60
      spill-enabled: true
      spill-directory: /var/lib/app/analytics-spill
    consent: { opted-out-ids: [] }
    pii: { pattern-detection-enabled: true }
```

| Property | Purpose | Default |
|---|---|---|
| `adhar.analytics.enabled` | Master switch for the auto-configuration | `true` |
| `...post-hog.api-key` | PostHog project key; without it the facade stays unavailable | (none) |
| `...post-hog.host` | PostHog endpoint | `https://app.posthog.com` |
| `...post-hog.personal-api-key` | Personal key, for local-evaluation definition loading | (none) |
| `...post-hog.batch-size` | Events per HTTP call, and the inline-flush trigger | `100` |
| `...post-hog.flush-interval` | Background flush period, seconds (floored at 50 ms) | `10` |
| `...post-hog.batching-enabled` | `false` sends synchronously, one event per call | `true` |
| `...post-hog.queue-capacity` | In-memory buffer bound | `10000` |
| `...post-hog.overflow-policy` | `DROP_OLDEST` or `BLOCK` when the queue is full | `DROP_OLDEST` |
| `...post-hog.feature-flag-cache-ttl-seconds` | TTL on cached `/decide` results | `60` |
| `...post-hog.local-evaluation-enabled` | Wire `LocalFlagEvaluator` into the `personProperties` overloads | `false` |
| `...post-hog.retry-enabled` / `.retry-max-attempts` / `.retry-max-batches` | Retry buffer, attempts per batch, and queue bound | `true` / `3` / `1000` |
| `...post-hog.retry-initial-backoff-millis` / `-backoff-multiplier` / `-max-backoff-millis` | Backoff curve | `500` / `2.0` / `30000` |
| `...post-hog.spill-enabled` / `.spill-directory` | Persist exhausted batches as JSONL and replay on startup | `false` / (none) |
| `...consent.opted-out-ids` | Distinct ids whose events are dropped before send | empty |
| `...pii.redacted-keys` | Always-redacted property keys (case-insensitive) | `password, secret, token, api_key, ssn, credit_card, card_number`, and variants |
| `...pii.pattern-detection-enabled` | Also redact values that *fully match* email / SSN / card / phone | `true` |
| `...annotations.track-event-enabled` / `.track-group-enabled` / `.alias-user-enabled` | The three aspects that are actually registered | `true` |
| `...event-tracking.track-http-requests` / `.track-exceptions` | Automatic HTTP and exception events | `false` / `true` |

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `health()` reports `available: false` | No API key resolved from properties or `POSTHOG_API_KEY` | Set `adhar.analytics.post-hog.api-key` or the env var |
| Events vanish under load | Queue hit `queue-capacity` with `DROP_OLDEST` | Watch `droppedEvents`; raise the capacity, shorten `flush-interval`, or switch to `BLOCK` |
| Events vanish and `droppedEvents` is zero | Retries were exhausted with no spill store | Grep for "Dropping analytics batch"; set `spill-enabled` with a writable `spill-directory` |
| A spike in request latency on a producer thread | `batch-size` was crossed, so the flush POST ran inline | Lower `batch-size`, or shorten `flush-interval` so the scheduler usually wins the race |
| Startup fails with `UncheckedIOException` | `spill-directory` cannot be created | Point it at a writable volume, or set `spill-enabled: false` |
| `@FeatureFlag` never fires | `FeatureFlagAspect` has no bean method in the auto-configuration | Component-scan `com.adhar.kit.analytics.aspect`, or declare the bean |
| `@FeatureFlag` fires but never uses the fallback | `requireEnabled` defaults to `false` | Set `requireEnabled = true` |
| `@TrackEvent` never fires | Self-invocation, or `track-event-enabled` is off | Call through the injected bean, not `this.` |
| A flag is always `false` | Argument order reversed, or `/decide` is failing and the read fails closed | `isFeatureEnabled(userId, featureKey)`; check for logged `/decide` warnings |
| A flag flips slowly after a PostHog change | Decisions are cached for the TTL | Lower `feature-flag-cache-ttl-seconds`, or call `reloadFeatureFlags()` |
| A property arrives as `***REDACTED***`, or an embedded email did not | Key matched `redacted-keys`; pattern matching is anchored to the whole value | Rename the property, or redact free text yourself before adding it |
| Events lost on shutdown in a non-Spring app | Nothing calls `shutdown()` | Call `AnalyticsFacade.getInstance().shutdown()`; Spring does it via `destroyMethod` |

On the [Adhar Platform](/docs), point `host` at the bundled PostHog instance so events never leave the cluster.

## See also

- [Modules Overview](/adhar-kit/modules/overview) — how analytics sits alongside the rest of the kit
- [Metrics](/adhar-kit/modules/metrics) — operational counters, as distinct from product events
- [Messaging](/adhar-kit/modules/messaging) — the optional Kafka path for publishing analytics events
- [Observability](/docs/operations/observability) — where platform telemetry is collected
