---
title: "Analytics"
section: "Modules"
order: 26
path: "/adhar-kit/modules/analytics"
---

# Analytics

`adhar-kit-analytics` is a production wrapper around PostHog for product analytics: event tracking, user identification, feature flags / A/B testing, and group analytics — with batching, consent gating, and PII scrubbing.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-analytics</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

`AnalyticsFacade` (`getInstance()`): `identify`, `track`, `trackPageView`, `group`, `isFeatureEnabled`, `getFeatureFlag`, `flush`, `health`. Annotations: `@TrackEvent`, `@TrackPageView`, `@IdentifyUser`, `@FeatureFlag`, `@TrackGroup`, `@TrackSession`.

## Usage

```java
@Service
public class UserService {
    private final AnalyticsFacade analytics = AnalyticsFacade.getInstance();

    public void registerUser(User user) {
        analytics.identify(user.getId(), Map.of(
            "$email", user.getEmail(), "plan", "free"));
        analytics.track(user.getId(), "User Registered", Map.of("source", "web"));
    }

    public boolean newCheckout(String userId) {
        return analytics.isFeatureEnabled("new-checkout", userId);   // feature flag / A-B
    }
}
```

## Privacy built in

- **Consent gating** — opted-out user ids are never sent.
- **PII scrubbing** — redacted keys and pattern detection strip sensitive fields before events leave the process.
- **Batching** — events are buffered and flushed on an interval with a bounded queue.

## Configuration

```yaml
adhar:
  analytics:
    enabled: true
    posthog:
      api-key: ${POSTHOG_API_KEY}
      host: https://posthog.example.com
      batch-size: 100
      flush-interval: 10
      feature-flag-cache-ttl-seconds: 60
    consent:
      opted-out-ids: []
    pii:
      redacted-keys: [email, ssn]
      pattern-detection-enabled: true
```

On the [Adhar Platform](/docs), point `host` at the bundled PostHog.
