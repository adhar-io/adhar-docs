---
title: "Analytics"
section: "Modules"
order: 26
path: "/adhar-kit/modules/analytics"
---

# Analytics

`adhar-kit-analytics` is a production wrapper around PostHog for product analytics: event tracking, user identification, feature flags / A-B testing, and group analytics. The problem it solves is that **the naive integration — an HTTP call to PostHog on the request thread — leaks PII, ignores consent, and couples your latency to a third party's uptime.** This module puts a consent gate, a PII scrubber, a bounded async queue, and a retrying sender between your code and the wire.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-analytics` |
| Built on | PostHog HTTP API via OkHttp + Jackson; Spring Boot auto-configuration; AspectJ proxies |
| Entry points | `AnalyticsFacade` (singleton), `EventAggregator`, `ReportGenerator`, `LocalFlagEvaluator` |
| Annotations | `@TrackEvent`, `@TrackGroup`, `@AliasUser`, `@FeatureFlag` |
| Use it when | You want product telemetry and flag-driven rollouts without hand-rolling batching, consent, and redaction |
| Skip it when | You only need operational telemetry — use [Metrics](/adhar-kit/modules/metrics) and [Tracing](/adhar-kit/modules/tracing) instead |

## How it works

`AnalyticsFacade` is a process-wide singleton that bootstraps lazily from the environment (`POSTHOG_API_KEY` / `posthog.api.key`, `POSTHOG_HOST` / `posthog.host`, defaulting to `https://app.posthog.com`) — which is why `getInstance()` works in plain Java and in aspects constructed before the Spring context is ready. When Spring is present, `AnalyticsAutoConfiguration` calls `configure(properties)` once, overriding those defaults and rebuilding the HTTP client, batching sender, flag cache, consent gateway, and PII scrubber. The bean uses `destroyMethod = "shutdown"`, so buffered events flush when the context closes.

Every call travels the same pipeline:

```text
  track() / identify() / group()
            |
            v
   [ ConsentGateway ]  distinct id opted out? -> drop, return
            |
            v
   [ PiiScrubber ]     redacted keys + pattern detection -> ***REDACTED***
            |
            v
   [ BatchingEventSender ]  bounded queue (queue-capacity)
            |                overflow -> DROP_OLDEST | BLOCK
            |  flush on batch-size OR flush-interval
            v
   [ OkHttpPostHogClient ] --> PostHog /capture
            |  failure
            v
   [ retry buffer ] exp. backoff -> optional JSONL spill file
```

Feature flags take a different path: `FeatureFlagCache` holds `/decide` results for `feature-flag-cache-ttl-seconds`. With local evaluation enabled, `LocalFlagEvaluator` decides rollout percentages and property conditions in-process first, falling back to `/decide` only for flags it cannot resolve.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-analytics</artifactId>
    <version>0.1.0</version>
</dependency>
```

OkHttp, Kafka, Spring Batch, POI, OpenCSV, and iText are declared `optional` in the module POM — pull them in explicitly if you use the reporting or event-publishing paths.

## Key APIs

`AnalyticsFacade.getInstance()` is the one object you need:

- `track(userId, event, properties)` — record an action. The event name is the unit of analysis in PostHog, so name it as a past-tense action ("User Registered").
- `identify(userId, properties)` — attach person properties to a distinct id. Keys beginning with `$` (like `$email`) are PostHog's reserved person fields.
- `trackPageView(userId, page, properties)`, `group(userId, groupId, properties)` for per-organisation reporting, and `alias(distinctId, alias)` to stitch an anonymous id to a known user after sign-up.
- `isFeatureEnabled(userId, featureKey)` and `getFeatureFlag(userId, featureKey)` — boolean and multivariate flag reads, each with a `personProperties` overload for local evaluation.
- `flush()` forces the queue out; `shutdown()` flushes and stops the sender.
- `health()` returns `available`, `provider`, `featureFlagsCacheSize`, `pendingEvents`, and `droppedEvents`. Alert on the last one.

Supporting types: `EventAggregator` (`countByEventType`, `getTopUsers`, `funnel`, `retention`), `ReportGenerator` (CSV and Excel), and `PiiScrubber` / `ConsentGateway`, both reachable from the facade so aspects can redact before assembling a property map.

## Worked example — minimal

```java
import com.adhar.kit.analytics.AnalyticsFacade;
import java.util.Map;

@Service
public class UserService {
    private final AnalyticsFacade analytics = AnalyticsFacade.getInstance();

    public void registerUser(User user) {
        analytics.identify(user.getId(), Map.of("$email", user.getEmail(), "plan", "free"));
        analytics.track(user.getId(), "User Registered", Map.of("source", "web"));
    }

    public boolean newCheckout(String userId) {
        return analytics.isFeatureEnabled(userId, "new-checkout");   // note: userId first
    }
}
```

## Worked example — annotations and flags

`@TrackEvent` and `@FeatureFlag` are AspectJ `@Around` advice matched on `@annotation(...)`, so they only fire on Spring-proxied beans called from *outside* the bean. A self-call inside the same class bypasses the proxy and silently records nothing.

```java
import com.adhar.kit.analytics.annotation.FeatureFlag;
import com.adhar.kit.analytics.annotation.TrackEvent;

@Service
public class CheckoutService {

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
                 trackExposure = true,
                 fallbackMethod = "legacyCheckout")
    public Receipt checkout(String userId, Cart cart) { ... }

    public Receipt legacyCheckout(String userId, Cart cart) { ... }
}
```

`FeatureFlagAspect` runs at `@Order(50)`, ahead of `TrackEventAspect` at `@Order(100)`, so the flag decision and its exposure event land before the tracking advice builds its properties. A disabled flag routes to `fallbackMethod`; with no fallback named, the aspect returns the return type's zero value.

## Configuration

Properties bind under `adhar.analytics`. The PostHog sub-object is the field `postHog`, so its canonical metadata key is `post-hog`; Spring's relaxed binding also accepts `posthog`.

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
    consent: { opted-out-ids: [] }
    pii: { pattern-detection-enabled: true }
```

| Property | Purpose | Default |
|---|---|---|
| `adhar.analytics.enabled` | Master switch for the auto-configuration | `true` |
| `...post-hog.api-key` | PostHog project key; without it the facade stays unavailable | (none) |
| `...post-hog.host` | PostHog endpoint | `https://app.posthog.com` |
| `...post-hog.batch-size` | Events per HTTP call, and the queue drain chunk | `100` |
| `...post-hog.flush-interval` | Background flush period, seconds | `10` |
| `...post-hog.batching-enabled` | `false` sends synchronously, one event per call | `true` |
| `...post-hog.queue-capacity` | In-memory buffer bound | `10000` |
| `...post-hog.overflow-policy` | `DROP_OLDEST` or `BLOCK` when the queue is full | `DROP_OLDEST` |
| `...post-hog.feature-flag-cache-ttl-seconds` | TTL on cached `/decide` results | `60` |
| `...post-hog.local-evaluation-enabled` | Decide flags in-process where a definition is cached | `false` |
| `...post-hog.retry-enabled` | Re-queue failed batches with exponential backoff | `true` |
| `...post-hog.retry-*` | `max-attempts` `3`, `initial-backoff-millis` `500`, `backoff-multiplier` `2.0`, `max-backoff-millis` `30000`, `max-batches` `1000` | — |
| `...post-hog.spill-enabled` / `.spill-directory` | Persist exhausted batches as JSONL and reload on startup; the directory is required when on | `false` / (none) |
| `...consent.opted-out-ids` | Distinct ids whose events are dropped before send | empty |
| `...pii.redacted-keys` | Always-redacted property keys (case-insensitive) | `password, secret, token, api_key, ssn, credit_card, card_number`, and variants |
| `...pii.pattern-detection-enabled` | Also redact values that look like email / SSN / card / phone | `true` |
| `...annotations.<name>-enabled` | Per-annotation aspect toggles | `true` |
| `...event-tracking.track-http-requests` / `.track-exceptions` | Automatic HTTP and exception events | `false` / `true` |

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `health()` reports `available: false` | No API key resolved from properties or `POSTHOG_API_KEY` | Set `adhar.analytics.post-hog.api-key` or the env var |
| Events vanish under load | Queue hit `queue-capacity` with `DROP_OLDEST` | Watch `droppedEvents`; raise the capacity, shorten `flush-interval`, or switch to `BLOCK` |
| Events lost on shutdown in a non-Spring app | Nothing calls `shutdown()` | Call `AnalyticsFacade.getInstance().shutdown()` yourself; Spring does it via `destroyMethod` |
| `@TrackEvent` never fires | Self-invocation, or the aspect bean was not created | Call through the injected bean, and check `adhar.analytics.annotations.track-event-enabled` |
| A flag flips slowly after a PostHog change | Decisions are cached for the TTL | Lower `feature-flag-cache-ttl-seconds`, or call `reloadFeatureFlags()` |
| A property arrives as `***REDACTED***` | Key matched `redacted-keys`, or pattern detection matched the value | Rename the property, or narrow `redacted-keys` / disable `pattern-detection-enabled` |

On the [Adhar Platform](/docs), point `host` at the bundled PostHog instance so events never leave the cluster.

## See also

- [Modules Overview](/adhar-kit/modules/overview) — how analytics sits alongside the rest of the kit
- [Metrics](/adhar-kit/modules/metrics) — operational counters, as distinct from product events
- [Messaging](/adhar-kit/modules/messaging) — the optional Kafka path for publishing analytics events
- [Observability](/docs/operations/observability) — where platform telemetry is collected
