---
title: "Notification"
section: "Modules"
order: 23
path: "/adhar-kit/modules/notification"
---

# Notification

"Send the customer an email" turns into a surprising amount of code. You need an SMTP client, a retry loop and template rendering. You need a way to stop a retry storm from sending the same message four times. And you need some record of what actually went out.

`adhar-kit-notification` **turns that into one call against a channel-agnostic service**. It then adds the operational parts as configuration, not code: idempotency, rate limiting, preferences, digesting, and bounded history.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-notification` |
| Built on | `adhar-kit-commons`, Spring Boot Mail (`JavaMailSender`), WebFlux `WebClient`; optional Dapr bindings |
| Entry points | `NotificationService`, `TemplateNotificationService`, `NotificationChannel` |
| Config prefix | `adhar.notification` |
| Use it when | A service sends transactional email, webhooks, SMS, or in-app messages and you want delivery outcomes you can audit |

## How it works

A `Notification` is an immutable record: `id`, `type`, `recipient`, `subject`, `body`, `metadata`, `createdAt`. `DefaultNotificationService` routes it to a `NotificationChannel`, then runs the shared guards around that delivery.

```diagram
kit-notification-send
```

### The routing order, exactly

`send(notification)` does these steps in this order, and the order matters:

1. **`findChannel(notification)`** — picks the first channel in the injected `List<NotificationChannel>` whose `supports(type)` returns true. If none matches, it throws `UnsupportedOperationException: No notification channel found for type: <TYPE>` **immediately**. Channel lookup happens *first*. So an unsupported type throws even for a recipient who has opted out, and even when an idempotency key would have suppressed the send.
2. **Opt-out** — `NotificationPreferenceStore.isOptedOut(recipient, type)`. A match logs at INFO and returns. No history entry.
3. **Rate limit** — `NotificationRateLimiter.tryAcquire(recipient, type)`. A rejection logs at WARN, records a **failure** history entry with `Rate limit exceeded`, and returns.
4. **Idempotency** — runs only when the notification's metadata carries a non-blank `idempotencyKey` entry (the constant `DefaultNotificationService.IDEMPOTENCY_KEY_METADATA`). If the key was already registered within the TTL, it logs at INFO and returns. No history entry.
5. **Delivery** — `channel.send(notification)`, then a history entry and (if a publisher is wired) a CloudEvent.

All three guards stop the send by returning `void`. From the return value, the caller cannot tell a suppressed send from a delivered one. Only the logs and the history show the difference.

`NotificationChannel` is a **sealed interface**. It permits exactly `EmailNotificationChannel`, `WebhookNotificationChannel`, `InAppNotificationChannel`, `SmsNotificationChannel` and `DaprBindingNotificationChannel`. You cannot write a sixth implementation; the compiler will refuse. To reach more providers, you can:

- configure the SMS or Dapr channel to point at a provider
- replace one of the permitted channels with your own bean of that exact type
- replace `NotificationService` outright

Each channel is registered only under certain conditions, and the defaults are stricter than most readers expect:

| Channel | Enabled by | Notes |
| --- | --- | --- |
| In-app | **`in-app.enabled`, default `true`** | The default implementation only writes an INFO log line. Nothing is persisted or delivered |
| Email | `email.enabled=true` **and** `JavaMailSender` on the classpath | Default is `false` |
| Webhook | `webhook.enabled=true` **and** `WebClient` on the classpath | Default is `false` |
| SMS | `sms.enabled=true` | Default is `false`; needs `sms.url` and a `payload-template` |
| Dapr binding | `adhar-kit-dapr` present, `adhar.dapr.enabled=true`, a `DaprFacade` bean, and `notification.dapr.enabled` (default `true`) | Registered after the native channels, so a configured native channel wins for its type |

### Async means `sendAsync`, not `send`

`adhar.notification.async` (default `true`) chooses the `Executor` used by `sendAsync` only:

- `true` → `Executors.newVirtualThreadPerTaskExecutor()`
- `false` → `Runnable::run`

**`send(notification)` is always synchronous on the calling thread**, whatever the flag says. To keep a slow SMTP server off your request thread, call `sendAsync`. Switching `async` does not do it for you.

With the virtual-thread executor, a blocked send parks a virtual thread instead of pinning a platform thread, so fan-out is cheap. It is also **unbounded**. Nothing limits how many sends can be in flight. The executor is never shut down, so in-flight sends are not drained on context close.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-notification</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`NotificationService`** — the SPI, and the bean you should inject: `send(notification)`, `sendAsync(notification)` (returns `CompletableFuture<Void>`), `sendBatch(list)`. Provide your own bean to replace `DefaultNotificationService` entirely.
- **`TemplateNotificationService`** — `registerTemplate(template)`, `sendFromTemplate(templateId, recipient, variables[, locale])`, `getTemplate`, `removeTemplate`, `templateCount`. Templates live in a `ConcurrentHashMap` on this bean instance.
- **`Notification`** — the record above. `metadata` defaults to an empty map and `createdAt` to now.
- **`NotificationTemplate`** — a record of `id`, `name`, `type`, `subjectTemplate`, `bodyTemplate`, `defaultMetadata`. Its `render(variables)` returns a `RenderedTemplate(subject, body)`. Placeholders are `${name}`. The record's own `render` does plain substitution with **no HTML escaping**. Only `TemplateNotificationService` escapes.
- **`NotificationType`** — `EMAIL`, `WEBHOOK`, `IN_APP`, `SMS`.
- **`NotificationHistory`** — `record(...)`, `getHistory(limit)`, `getFailedNotifications()`, `size()`, `clear()`. It is a bounded `ConcurrentLinkedDeque` that holds the most recent `history.max-size` entries.
- **`NotificationEvent`** — a record emitted per attempt, built with `NotificationEvent.success(...)` / `.failure(...)`. It is wrapped as CloudEvents of type `com.adhar.notification.sent` and `com.adhar.notification.failed`. See the caveat below.
- **Supporting beans** — `NotificationRetryHandler`, `NotificationPreferenceStore`, `NotificationRateLimiter`, `NotificationIdempotencyStore`, `NotificationDigestService`.

> **`NotificationFacade` is not auto-configured.** The module registers no `NotificationFacade` bean, and nothing populates the `NotificationFacade.getInstance()` singleton. That singleton is built with all-null collaborators. So `adhar.getNotification().send(...)` throws `IllegalStateException: NotificationService is not configured`. Inject `NotificationService` and `TemplateNotificationService` directly. Or build a `NotificationFacade` bean yourself and pass it to `AdharFacade.setNotification(...)`.

A second default catches people out in the same way.

> **CloudEvents are off unless you wire them.** `DefaultNotificationService` accepts an `eventPublisher`, but the auto-configuration passes `null`. No CloudEvents are published out of the box. To get them, define your own `NotificationService` bean using the full `DefaultNotificationService` constructor and supply a `Consumer<AdharCloudEvent<?>>`.

## Worked example: templated email with idempotency

```java
package com.example.orders;

import com.adhar.kit.notification.DefaultNotificationService;
import com.adhar.kit.notification.NotificationHistory;
import com.adhar.kit.notification.NotificationService;
import com.adhar.kit.notification.TemplateNotificationService;
import com.adhar.kit.notification.model.Notification;
import com.adhar.kit.notification.model.NotificationHistoryEntry;
import com.adhar.kit.notification.model.NotificationTemplate;
import com.adhar.kit.notification.model.NotificationType;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class OrderNotifications {

    private static final Logger log = LoggerFactory.getLogger(OrderNotifications.class);

    private final NotificationService notifications;
    private final TemplateNotificationService templates;
    private final NotificationHistory history;

    public OrderNotifications(NotificationService notifications,
                              TemplateNotificationService templates,
                              NotificationHistory history) {
        this.notifications = notifications;
        this.templates = templates;
        this.history = history;
    }

    @PostConstruct
    void registerTemplates() {
        templates.registerTemplate(new NotificationTemplate(
                "order-confirmation",
                "Order confirmation email",
                NotificationType.EMAIL,
                "Order ${orderId} confirmed",
                "<p>Hi ${customerName}, your order ${orderId} for ${total} is on its way.</p>",
                // HTML mode: every substituted variable is HTML-escaped.
                Map.of("contentType", "text/html")));
    }

    /**
     * sendFromTemplate cannot carry an idempotency key - the notification it builds
     * takes only the template's defaultMetadata. Build the Notification by hand when
     * duplicate suppression matters.
     */
    public void confirm(Order order) {
        NotificationTemplate template = templates.getTemplate("order-confirmation");
        // NOTE: NotificationTemplate.render does plain substitution with NO HTML
        // escaping - only TemplateNotificationService escapes. Pass trusted values.
        var rendered = template.render(Map.of(
                "orderId",      order.getId().toString(),
                "customerName", order.getCustomerName(),
                "total",        order.getTotal().toString()));

        Notification notification = new Notification(
                UUID.randomUUID().toString(),
                NotificationType.EMAIL,
                order.getEmail(),
                rendered.subject(),
                rendered.body(),
                Map.of(DefaultNotificationService.IDEMPOTENCY_KEY_METADATA,
                       "order-confirmation:" + order.getId()),
                null);

        try {
            // Async so a slow SMTP server never blocks the request thread.
            notifications.sendAsync(notification).exceptionally(ex -> {
                // The future completes exceptionally only after retries are exhausted.
                log.error("Order {} confirmation undeliverable", order.getId(), ex);
                return null;
            });
        } catch (UnsupportedOperationException e) {
            // No channel supports EMAIL - email.enabled is false, or no JavaMailSender.
            log.error("Email channel not configured; cannot confirm order {}", order.getId(), e);
        }
    }

    public List<NotificationHistoryEntry> triage() {
        return history.getFailedNotifications();
    }
}
```

The idempotency key comes from the business event; it is not generated per call. That is the whole point. A retried HTTP request, a redelivered Kafka message and a duplicated job run all produce `order-confirmation:1234`, and only the first one sends.

```yaml
adhar:
  notification:
    async: true
    email:
      enabled: true
      from: no-reply@example.com
    webhook:
      enabled: true
      timeout-ms: 5000
    retry:
      max-retries: 5
      backoff-ms: 1000
      max-backoff-ms: 30000
    idempotency:
      enabled: true
      ttl-ms: 86400000
    rate-limit:
      enabled: true
      max-per-window: 30
      window-ms: 60000
```

## How it behaves

- **Thread-safety.** `DefaultNotificationService` is a stateless singleton over its collaborators. All of these are safe to share, and none serialise across unrelated recipients:
  - `NotificationHistory` uses a `ConcurrentLinkedDeque`.
  - `TemplateNotificationService` uses a `ConcurrentHashMap`.
  - The idempotency store uses a `ConcurrentHashMap` with an atomic `compute`.
  - The rate limiter uses a `ConcurrentHashMap` of per-key deques, each guarded by its own monitor.
- **Retry blocks the caller.** `NotificationRetryHandler.retry(...)` is `retryAsync(...).join()`, and `DefaultNotificationService.send` calls it on the failure path. Backoff is exponential: `backoff-ms × 2^attempt`, capped at `max-backoff-ms`. A **single-threaded daemon scheduler** named `notification-retry-scheduler` runs the backoff, and the retried attempts also run on that one thread.

  With the defaults (3 retries, 1 s base), a final failure blocks the caller for 1 s + 2 s + 4 s before throwing. Concurrent failing sends queue behind one another on that single thread. This is the strongest argument for using `sendAsync`.
- **Failure propagation.**
  - With a retry handler present and all attempts used up, `send` records a failure entry and throws `RuntimeException("Failed to send notification [id=…] after retries", cause)`.
  - With no retry handler, it records the failure and rethrows the original exception.
  - `sendAsync` reports that as a failed future, **which is silently discarded if you never call `exceptionally` or `join`**.
  - `sendBatch` catches errors per notification, logs at ERROR and continues. So one bad address does not stop the batch.
- **Lifecycle.** `NotificationRetryHandler` implements `AutoCloseable`. So Spring's inferred destroy method shuts its scheduler down with `shutdownNow()`, and retries still scheduled at shutdown are dropped. The virtual-thread executor behind `sendAsync` is not registered for shutdown at all, so in-flight async sends are not drained.
- **Resource bounds.**
  - `NotificationHistory` is bounded by `history.max-size` (default 1000) and drops the oldest entry on write.
  - The idempotency store purges expired keys lazily on every `register`. So its size is the number of distinct keys within the TTL. A 24-hour default TTL with high-cardinality keys is a real memory cost.
  - **`NotificationRateLimiter` never evicts its per-`recipient|type` deques.** Its map grows with the number of distinct recipients for the life of the process. It is sized for a bounded set of recipients, not for arbitrary public input.
- **Everything in-memory is per-pod.** History, preferences, idempotency keys and rate-limit windows all live in the JVM. Across replicas, the same idempotency key can send once per pod, and a restart forgets everything. For shared, durable state, replace `NotificationIdempotencyStore`, `NotificationPreferenceStore` or `NotificationHistory` with your own bean (all are `@ConditionalOnMissingBean`).

### Template rendering

`${name}` placeholders are filled by literal string replacement from the variable map:

- Keys are exact and case-sensitive.
- An absent key leaves the placeholder text in the output.
- A null value is replaced with an empty string.

When the template's `defaultMetadata` contains `contentType: text/html` or `html: true`, **substituted values are HTML-escaped** (`&`, `<`, `>`, `"`). That is what stops a customer name from becoming an injection vector. The template text itself is never escaped.

Localised text works when a `MessageSource` bean is present and you pass a `Locale` to the four-argument `sendFromTemplate`. The subject and body are then looked up as `<templateId>.subject` and `<templateId>.body` first. If the code is missing, it falls back to the template's own text. An unknown `templateId` throws `IllegalArgumentException`.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.notification.enabled` | Master switch | `true` |
| `adhar.notification.async` | Executor for `sendAsync` (virtual threads vs inline) | `true` |
| `adhar.notification.email.enabled` | Register the email channel | `false` |
| `adhar.notification.email.from` | Sender address | — |
| `adhar.notification.email.template-path` | Template lookup root | `classpath:templates/` |
| `adhar.notification.webhook.enabled` | Register the webhook channel | `false` |
| `adhar.notification.webhook.default-url` | Fallback webhook target | — |
| `adhar.notification.webhook.timeout-ms` | HTTP timeout | `5000` |
| `adhar.notification.in-app.enabled` | Register the in-app (log-only) channel | `true` |
| `adhar.notification.sms.enabled` | Register the SMS channel | `false` |
| `adhar.notification.sms.url` / `.method` / `.content-type` | SMS provider endpoint | — / `POST` / `application/json` |
| `adhar.notification.sms.auth-header-name` / `.auth-header-value` | Provider credential header | `Authorization` / — |
| `adhar.notification.sms.payload-template` | Provider request body | `{"to":"${recipient}","message":"${body}"}` |
| `adhar.notification.sms.timeout-ms` | SMS HTTP timeout | `5000` |
| `adhar.notification.retry.max-retries` | Attempts after the first failure | `3` |
| `adhar.notification.retry.backoff-ms` | Initial backoff | `1000` |
| `adhar.notification.retry.max-backoff-ms` | Backoff ceiling | `30000` |
| `adhar.notification.history.max-size` | Entries retained in memory | `1000` |
| `adhar.notification.rate-limit.enabled` | Per-recipient, per-channel throttling | `false` |
| `adhar.notification.rate-limit.max-per-window` | Sends allowed per window | `60` |
| `adhar.notification.rate-limit.window-ms` | Sliding window length | `60000` |
| `adhar.notification.idempotency.enabled` | Register the idempotency store | `true` |
| `adhar.notification.idempotency.ttl-ms` | How long a key is remembered | `86400000` (24 h) |
| `adhar.notification.digest.enabled` | Batch instead of sending each | `false` |
| `adhar.notification.digest.window-ms` | Batching window | `60000` |
| `adhar.notification.digest.max-batch-size` | Messages per digest | `50` |
| `adhar.notification.digest.subject-template` | Digest subject | `You have ${count} new notifications` |
| `adhar.notification.dapr.enabled` | Register the Dapr binding channel | `true` |
| `adhar.notification.dapr.email-binding` / `.sms-binding` / `.http-binding` | Dapr output binding names | `smtp` / `sms` / `webhook` |

## Testing

`adhar-kit-test-commons` has no notification helper. But `WireMockIntegrationTest` is the right base for webhook and SMS channels, and `MockRestServer` suits simpler stubs.

1. **Routing and guards** — build `DefaultNotificationService` directly. Give it a fake channel that records what it received, and `Runnable::run` as the executor. You get a fully synchronous service with no Spring context. You can then assert the guard order: a type with no supporting channel must throw even with an opted-out recipient.
2. **Idempotency** — send the same notification twice with the same `idempotencyKey` metadata. Assert the fake channel saw exactly one send. `InMemoryNotificationIdempotencyStore` has a constructor that takes a `LongSupplier` clock, so you can move past the TTL without sleeping.
3. **Rate limiting** — `NotificationRateLimiter` takes the same injectable clock. Use it instead of `Thread.sleep` to test window rollover.
4. **Retry** — pass your own `ScheduledExecutorService` to the `NotificationRetryHandler(properties, scheduler)` constructor. The handler does not shut down a scheduler it does not own. So you can use a deterministic one and assert attempt counts without waiting out real backoff.
5. **Templates** — call `TemplateNotificationService.registerTemplate`, then `sendFromTemplate` against a fake `NotificationService`. Assert the rendered subject and body. Cover the HTML path with a variable containing `<script>`, and assert it was escaped.
6. **Suppressing side effects in a unit test** — either:
   - set `adhar.notification.enabled: false` to turn off the whole auto-configuration, or
   - set `adhar.notification.in-app.enabled: false` with every other channel already off. A stray send then fails loudly with `UnsupportedOperationException` instead of silently logging.

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `adhar.getNotification().send(…)` throws `IllegalStateException` | `getNotification()` itself succeeds: it lazily builds `NotificationFacade.getInstance()`, which has all-null collaborators. The guard fires on the call, not the lookup | Inject `NotificationService` / `TemplateNotificationService` instead, or build a `NotificationFacade` yourself and pass it to `AdharFacade.setNotification(…)` |
| `UnsupportedOperationException: No notification channel found for type` | No enabled channel `supports(type)` | Enable the channel for that `NotificationType`; there is no fallback |
| In-app notifications "work" but nobody sees them | The default in-app channel only writes a log line | Replace `InAppNotificationChannel` with your own bean of that type |
| Email silently not sent | `email.enabled` defaults to `false`, or no `JavaMailSender` bean exists | Set the flag and configure `spring.mail.*` |
| No CloudEvents arrive | The auto-configuration passes a `null` event publisher | Define your own `NotificationService` with the full constructor |
| The caller blocks for seconds on a failing send | `send` runs retries inline with exponential backoff | Use `sendAsync`, and lower `retry.max-retries` or `max-backoff-ms` |
| `async: true` but `send` still blocks | The flag only chooses the executor for `sendAsync` | Call `sendAsync` |
| An async failure disappears | `sendAsync` returns a future nobody inspects | Attach `.exceptionally(...)` or log the result |
| Placeholders appear literally in the body | Variable names in the map do not match the `${…}` names | Keys are exact and case-sensitive |
| Template sends are never deduplicated | `sendFromTemplate` copies only the template's `defaultMetadata`, so no per-send idempotency key gets through | Build the `Notification` by hand with the key, as above |
| Duplicate messages across replicas | The idempotency store is in-memory and per-instance | Provide your own `NotificationIdempotencyStore` bean backed by shared state |
| History is empty after a restart | `NotificationHistory` is a bounded in-memory deque | Replace the bean, or persist the entries yourself |
| A send returns quietly and nothing arrives | An opt-out, rate-limit, or idempotency guard short-circuited it | Check the INFO/WARN logs, the preference store, and the history for a `Rate limit exceeded` entry |
| Heap grows in a public-facing service | The rate limiter never evicts its per-recipient windows | Keep rate limiting for a bounded recipient set, or supply your own limiter |

## See also

- [Messaging](/adhar-kit/modules/messaging) — where you would publish the sent/failed CloudEvents once you wire a publisher.
- [Dapr](/adhar-kit/modules/dapr) — routes delivery through output bindings instead of direct clients.
- [Commons](/adhar-kit/modules/commons) — defines the `AdharCloudEvent` envelope used here.
- [Concepts](/adhar-kit/concepts) — module gating, auto-configuration and the facade model.
