---
title: "Analytics"
section: "Modules"
order: 26
path: "/adhar-kit/modules/analytics"
---

# Analytics

`adhar-kit-analytics` sends product events, user identities and group memberships to PostHog, and reads PostHog feature flags. Every event passes a consent check and a PII scrubber, then waits in a bounded in-memory queue that a background thread sends in batches, so your request thread does not make the HTTP call. Use it for product telemetry and flag-driven rollouts. For operational telemetry, use [Metrics](/adhar-kit/modules/metrics) and [Tracing](/adhar-kit/modules/tracing).

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-analytics` (package `com.adhar.kit.analytics`) |
| Module toggle | `adhar.kit.modules.analytics`, default `false`. It gates `adhar.getAnalytics()` |
| Module switch | `adhar.analytics.enabled`, default `true`. It removes `AnalyticsAutoConfiguration` |
| Facade | `AnalyticsFacade` (singleton; also a Spring bean) |
| Required dependencies | Spring Boot (starter, web MVC, AOP), Jackson, `adhar-kit-commons` |
| Optional dependencies | `com.squareup.okhttp3:okhttp` (**needed to send anything**), `poi-ooxml` and `opencsv` for reports, `spring-kafka` for `EventPublisher` |
| Frameworks | Spring Boot applies `adhar.analytics.*` and registers the aspects. On any other runtime, `AnalyticsFacade.getInstance()` reads `POSTHOG_API_KEY` and `POSTHOG_HOST` |

## How it works

```diagram
nkb-analytics-pipeline
```

`AnalyticsFacade.getInstance()` builds the singleton lazily. It reads the API key from the `POSTHOG_API_KEY` environment variable, or else the `posthog.api.key` JVM system property. It reads the host from `POSTHOG_HOST` or `posthog.host`, defaulting to `https://app.posthog.com`. With no key, the facade stays unavailable (`isAvailable()` is `false`) and every call is a silent no-op.

On Spring Boot, `AnalyticsAutoConfiguration` calls `configure(properties)` on that same singleton. This rebuilds the client, sender, flag cache, consent list and scrubber from `adhar.analytics.*`. The bean has `destroyMethod = "shutdown"`, so the queue flushes when the context closes.

Each step in the pipeline behaves like this:

- **Consent.** `ConsentGateway.isAllowed(distinctId)` runs first in `track`, `identify`, `alias` and `group`. An opted-out id returns silently.
- **PII.** `PiiScrubber.scrub` returns a new map. A property whose key equals one of `pii.redacted-keys` (case-insensitive, exact) becomes `***REDACTED***`. With pattern detection on, a `String` value that *entirely* matches an email, a `ddd-dd-dddd` SSN, 13–19 digits or a phone number is redacted too. `"alice@example.com"` is redacted; `"emailed alice@example.com"` is not.
- **Queue.** `BatchingEventSender` holds a `LinkedBlockingDeque` of `queue-capacity` events. When it is full, `DROP_OLDEST` evicts the head and counts it in `droppedEvents`. `BLOCK` parks the caller until there is room.
- **Flush.** A daemon thread named `posthog-batch-flush` drains the queue every `flush-interval` seconds and POSTs it to `/batch/` in chunks of `batch-size`. When an `enqueue` brings the queue to `batch-size`, that flush runs **on the calling thread**. A `tryLock` stops two flushes from running at once.

Feature flags take their own path:

```diagram
nkb-analytics-flags
```

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-analytics</artifactId>
    <version>0.1.0</version>
</dependency>
<!-- Optional in the module POM, but the PostHog client is built on it -->
<dependency>
    <groupId>com.squareup.okhttp3</groupId>
    <artifactId>okhttp</artifactId>
    <version>4.12.0</version>
</dependency>
```

Set `adhar.analytics.post-hog.api-key`, or `POSTHOG_API_KEY` outside Spring. Set `adhar.kit.modules.analytics=true` if you use `adhar.getAnalytics()`.

## Use it

```java
import com.adhar.kit.analytics.AnalyticsFacade;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class CheckoutService {

    private final AnalyticsFacade analytics;
    private final OrderRepository orders;

    public CheckoutService(AnalyticsFacade analytics, OrderRepository orders) {
        this.analytics = analytics;
        this.orders = orders;
    }

    public Receipt checkout(String userId, Cart cart) {
        // User id first, flag key second. Fails closed: any error returns false.
        boolean newFlow = analytics.isFeatureEnabled(userId, "new-checkout");

        Order order = newFlow ? orders.placeV2(cart) : orders.placeV1(cart);

        // Send after the write: a dropped event is recoverable, a phantom one is not.
        analytics.track(userId, "Order Placed", Map.of(
                "orderId", order.id(),
                "itemCount", cart.items().size(),
                "variant", newFlow ? "v2" : "v1"));
        return order.receipt();
    }
}
```

| Method | Sends |
|---|---|
| `track(userId, event[, properties])` | A capture event |
| `trackPageView(userId, page[, properties])` | `$pageview` with `$current_url` |
| `identify(userId[, properties])` | `$identify`, with the properties under `$set` |
| `alias(distinctId, alias)` | `$create_alias` |
| `group(userId, groupId, properties)` | `$groupidentify`; `$group_type` defaults to `company` |
| `trackAsCloudEvent(userId, event, properties)` | A normal `track`, and returns an `AdharCloudEvent` envelope as well |
| `isFeatureEnabled(userId, key[, personProperties])` | Nothing; returns `boolean` |
| `getFeatureFlag(userId, key[, personProperties])` | Nothing; returns the variant as a `String`, or `null` |
| `preloadFeatureFlags(userId)` / `reloadFeatureFlags()` | Fills the flag cache for one user / clears the whole cache |
| `flush()` / `shutdown()` | Drains the queue / flushes, closes the client, and makes every later call a no-op |

At runtime, `analytics.getConsentGateway().optOut(id)` and `optIn(id)` change consent. The list is in memory, per JVM, and `configure()` resets it to `consent.opted-out-ids`.

### Local flag evaluation

With `post-hog.local-evaluation-enabled: true`, the `personProperties` overloads ask `LocalFlagEvaluator` first. It evaluates rollout percentages and property conditions in-process, and falls back to `/decide` for flags it cannot decide. The module does not fetch definitions itself. Load them with `LocalFlagEvaluator.setDefinitions(...)` or `addDefinition(...)`; the evaluator is a Spring bean.

### Annotations

```java
import com.adhar.kit.analytics.annotation.TrackEvent;

@Service
public class OrderService {

    @TrackEvent(event = "Order Placed", userIdParam = "userId",
                includeReturnValue = true, returnValueProperty = "orderId")
    public String placeOrder(String userId, Cart cart) {
        return orders.save(cart).getId();
    }
}
```

| Annotation | Registered by | Behaviour |
|---|---|---|
| `@TrackEvent` | Auto-configuration (`annotations.track-event-enabled`) | Tracks on success by default (`trackOnEntry`, `trackOnFailure` are opt-in). With no `properties()`, every parameter except `userIdParam` and `excludeProperties()` becomes a property. `{param}` works in the event name |
| `@TrackGroup` | Auto-configuration (`annotations.track-group-enabled`) | Calls `group(...)` from `userIdParam` and `groupIdParam` before the method runs, then tracks `eventName` (default "User Added to Group") |
| `@AliasUser` | Auto-configuration (`annotations.alias-user-enabled`) | Calls `alias(...)` from `distinctIdParam` and `aliasParam` before the method runs; `trackEvent = true` also tracks `eventName` |
| `@FeatureFlag` | **Component scan only** (`com.adhar.kit.analytics.aspect`) | Records `$feature_flag_called`. A disabled flag still runs the method unless `requireEnabled = true`; then it calls `fallbackMethod` or returns the type's zero value |

Behaviour to know:

- **Self-invocation skips the aspects.** `this.placeOrder(...)` from inside the same bean tracks nothing.
- **Missing user id.** If `userIdParam` resolves to `null`, the aspect logs a warning and runs the method untracked.
- **An unavailable facade runs the method.** With no API key, `@FeatureFlag` runs the guarded method, while `isFeatureEnabled` returns `false`.
- **The fallback skips the proxy.** It is invoked reflectively on the target, so annotations on it do not apply.
- **`async` changes nothing.** `@TrackEvent(async = …)` behaves the same either way, because properties are always built on the caller's thread.
- **Order.** `@FeatureFlag` is `@Order(50)` and wraps the other three, which are `@Order(100)`.

## Configuration

Properties bind under `adhar.analytics` (`AnalyticsProperties`). The PostHog block is the field `postHog`, so the canonical key is `post-hog`.

| Property | Type | Default | Description |
|---|---|---|---|
| `adhar.analytics.enabled` | boolean | `true` | Registers `AnalyticsAutoConfiguration` |
| `...post-hog.api-key` | String | — | PostHog project key. Without it, `configure()` keeps the env/system-property key, if any |
| `...post-hog.host` | String | `https://app.posthog.com` | PostHog endpoint. Applied only together with `api-key` |
| `...post-hog.batch-size` | int | `100` | Events per POST, and the inline-flush trigger |
| `...post-hog.flush-interval` | int (seconds) | `10` | Background flush period (floored at 50 ms) |
| `...post-hog.batching-enabled` | boolean | `true` | `false` sends each event synchronously on the caller |
| `...post-hog.queue-capacity` | int | `10000` | Queue bound |
| `...post-hog.overflow-policy` | enum | `DROP_OLDEST` | `DROP_OLDEST` or `BLOCK` when the queue is full |
| `...post-hog.feature-flag-cache-ttl-seconds` | long | `60` | How long `/decide` results stay cached |
| `...post-hog.local-evaluation-enabled` | boolean | `false` | Attaches `LocalFlagEvaluator` to the `personProperties` overloads |
| `...post-hog.retry-enabled` | boolean | `true` | Retry buffer for batches whose send throws |
| `...post-hog.retry-max-attempts` | int | `3` | Attempts before a batch is spilled or dropped |
| `...post-hog.retry-initial-backoff-millis` | long | `500` | First retry delay |
| `...post-hog.retry-backoff-multiplier` | double | `2.0` | Delay growth per attempt |
| `...post-hog.retry-max-backoff-millis` | long | `30000` | Delay cap |
| `...post-hog.retry-max-batches` | int | `1000` | Retry buffer bound |
| `...post-hog.spill-enabled` | boolean | `false` | Writes batches leaving the retry buffer to `analytics-spill.jsonl` and replays them on the next start |
| `...post-hog.spill-directory` | String | — | Spill location. Required with `spill-enabled`; an uncreatable directory fails startup |
| `...consent.opted-out-ids` | List | empty | Distinct ids that are never sent |
| `...pii.redacted-keys` | Set | `password`, `passwd`, `secret`, `token`, `apikey`, `api_key`, `ssn`, `creditcard`, `credit_card`, `cardnumber`, `card_number` | Keys always redacted. Setting the list replaces the defaults |
| `...pii.pattern-detection-enabled` | boolean | `true` | Also redacts values that fully match email, SSN, card or phone patterns |
| `...annotations.track-event-enabled` | boolean | `true` | Registers the `@TrackEvent` aspect |
| `...annotations.track-group-enabled` | boolean | `true` | Registers the `@TrackGroup` aspect |
| `...annotations.alias-user-enabled` | boolean | `true` | Registers the `@AliasUser` aspect |

`post-hog.personal-api-key`, `annotations.enabled`, the other `annotations.*-enabled` flags and all of `event-tracking.*` are bound but not read. In particular, nothing tracks HTTP requests or exceptions automatically.

## Operations

**Health.** `health()` returns `available`, `provider` (`posthog`), `featureFlagsCacheSize` (users with cached flags), `pendingEvents` and `droppedEvents`. `droppedEvents` counts queue overflow only.

**Failure behaviour.** No public method throws. Errors are logged and the call returns.

- **A failed send is lost.** `OkHttpPostHogClient` logs a non-2xx response (`PostHog API call to /batch/ failed: <code>`) or a network error (`Failed to call PostHog endpoint`) and returns normally. So during a PostHog outage those batches are lost, and the retry buffer and spill file are not involved. Retries and spilling apply only to exceptions that escape the client.
- **Retry and spill.** A batch whose send throws is retried after `initial-backoff × multiplier^(attempt-1)`, capped at `max-backoff`. After `max-attempts`, or when the buffer holds `max-batches`, it is spilled (if enabled) or dropped with the WARN `Dropping analytics batch`. On shutdown, batches still waiting are spilled or dropped.
- **Flags fail closed.** A failed `/decide` call returns no flags, and the facade caches "off" for every requested key for the TTL. `getFeatureFlag` returns `null`.

**Shutdown.** `shutdown()` stops the scheduler (it waits up to 2 seconds), runs a final flush, spills the retry buffer and closes the client. Outside Spring, call `AnalyticsFacade.getInstance().shutdown()` yourself, or events still in the queue are lost.

## Limits

- **Delivery is at-most-once and in-process.** The queue lives in memory, and `DROP_OLDEST` discards events without telling the caller.
- **Flag lookups block the caller on a miss.** The first `isFeatureEnabled` for a user makes a synchronous `/decide` call on the calling thread. The flag cache has no size bound, so many distinct anonymous ids make it grow.
- **The spill file is not a durable queue.** It is one append-only file. It is pruned only when the next start replays it, and only when retries are enabled.
- **Only exact-key and whole-value PII matching.** Free text that contains an email or a phone number passes through, so redact it before you add it as a property.
- **No processor for `@TrackPageView`, `@IdentifyUser`, `@TrackSession` or `@EnableAnalytics`.** The annotations exist, but nothing intercepts them.
- **Scan-only extras.** `EventAggregator` (counts, funnels, retention over a `List<AnalyticsEvent>` you supply) is a bean. `ReportGenerator` (CSV and Excel) and `EventPublisher` (Kafka topic `analytics-events`) exist only when scanned, and need POI and OpenCSV, or `spring-kafka`.

## Next steps

- [Concepts](/adhar-kit/concepts) — module toggles, facades and auto-configuration
- [Metrics](/adhar-kit/modules/metrics) — operational counters, as distinct from product events
- [Messaging](/adhar-kit/modules/messaging) — event publishing over Kafka
- [Modules Overview](/adhar-kit/modules/overview) — the rest of the kit
