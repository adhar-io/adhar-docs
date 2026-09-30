---
title: "Notification"
section: "Modules"
order: 23
path: "/adhar-kit/modules/notification"
---

# Notification

"Send the customer an email" turns into a surprising amount of code: an SMTP client, a retry loop, template rendering, a way to stop a retry storm from sending the same message four times, and some record of what actually went out. `adhar-kit-notification` **collapses that into one call against a channel-agnostic service**, then adds the operational parts — idempotency, rate limiting, preferences, digesting, and bounded history — as configuration rather than code.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-notification` |
| Built on | `adhar-kit-commons`, Spring Boot Mail (`JavaMailSender`), WebFlux `WebClient`; optional Dapr bindings |
| Entry points | `NotificationFacade` (or `adhar.getNotification()`), `NotificationService`, `NotificationChannel` |
| Config prefix | `adhar.notification` |
| Use it when | A service sends transactional email, webhooks, SMS, or in-app messages and you want delivery outcomes you can audit |

## How it works

A `Notification` is an immutable record — `id`, `type`, `recipient`, `subject`, `body`, `metadata`, `createdAt`. `DefaultNotificationService` routes it to the first `NotificationChannel` whose `supports(type)` returns true, then runs the cross-cutting guards around that delivery.

```text
  adhar.notify(...) / sendFromTemplate(...)
              │
              ▼
        Notification (record)
              │  findChannel: first channel where supports(type)
   ┌──────────▼──────────┬──────────┬─────────┬─────────────┐
   │ EMAIL      WEBHOOK  │  IN_APP  │   SMS   │ Dapr binding│
   │ JavaMail   WebClient│  logged  │  HTTP   │  smtp/sms   │
   └──────────┬──────────┴──────────┴─────────┴─────────────┘
              │  none matches ──▶ UnsupportedOperationException
   ┌──────────▼───────────────────────────────┐
   │ preferences  has the user opted out?     │
   │ rate limit   within maxPerWindow?        │
   │ idempotency  seen this key already?      │  any hit ──▶ return
   └──────────┬───────────────────────────────┘
              │ send, then retry with exponential backoff
              ▼
   history entry  +  CloudEvent
      com.adhar.notification.sent / .failed
```

`NotificationChannel` is a **sealed interface** — it permits exactly `EmailNotificationChannel`, `WebhookNotificationChannel`, `InAppNotificationChannel`, `SmsNotificationChannel` and `DaprBindingNotificationChannel`. You extend reach by configuring the SMS or Dapr channel to point at a provider, not by writing a sixth implementation.

Each channel is conditional. Email needs `JavaMailSender` on the classpath *and* `adhar.notification.email.enabled=true`; webhook needs `WebClient` and its own flag; SMS needs its flag plus a `url`. In-app is the only one enabled by default. A channel is resolved first, by the first one whose `supports(type)` matches; **if no channel handles the type the send throws `UnsupportedOperationException`** rather than falling back. The opt-out, rate-limit and idempotency guards then run, and any of them short-circuits delivery silently.

When `adhar.notification.async` is true (the default), the service runs sends on `Executors.newVirtualThreadPerTaskExecutor()`, so a slow SMTP server blocks a virtual thread rather than a platform thread. Set it to `false` and sends run inline on the caller's thread.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-notification</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Key APIs

- **`NotificationFacade`** (`adhar.getNotification()`) — `send(notification)`, `sendEmail(recipient, subject, body)`, `sendWebhook(url, payload)`, `sendInApp(userId, message)`, `sendSms(phoneNumber, message)`, `sendAsync(notification)` returning a `CompletableFuture<Void>`, `sendFromTemplate(templateId, recipient, variables)`, `registerTemplate(template)`, `getHistory(limit)`, `getFailedNotifications()`, `health()`.
- **`AdharFacade` shortcuts** — `adhar.notify(recipient, subject, body)` and `adhar.webhook(url, payload)` for the two common cases.
- **`NotificationService`** — the SPI: `send`, `sendAsync`, `sendBatch(list)`. Provide your own bean to replace `DefaultNotificationService` entirely.
- **`Notification`** — the record above; `metadata` defaults to an empty map and `createdAt` to now.
- **`NotificationTemplate`** — record of `id`, `name`, `type`, `subjectTemplate`, `bodyTemplate`, `defaultMetadata`, with `render(variables)` returning a `RenderedTemplate(subject, body)`. Placeholders are `${name}`.
- **`NotificationType`** — `EMAIL`, `WEBHOOK`, `IN_APP`, `SMS`.
- **`NotificationEvent`** — record emitted per attempt; `NotificationEvent.success(...)` and `.failure(...)` are wrapped as CloudEvents of type `com.adhar.notification.sent` and `com.adhar.notification.failed`.
- **Supporting beans** — `NotificationRetryHandler`, `NotificationHistory`, `NotificationPreferenceStore`, `NotificationRateLimiter`, `NotificationIdempotencyStore`, `NotificationDigestService`, `TemplateNotificationService` (adds `MessageSource` localization).

## Minimal

```java
@Service
public class OrderService {
    private final AdharFacade adhar;
    public OrderService(AdharFacade adhar) { this.adhar = adhar; }

    public void notifyCustomer(Order order) {
        adhar.notify(order.getEmail(), "Order Confirmed",
            "Your order #" + order.getId() + " is confirmed.");

        adhar.webhook("https://hooks.slack.com/services/T000/B000/XXXX",
            "{\"text\":\"New order: " + order.getId() + "\"}");
    }
}
```

## Realistic: a registered template, idempotency, and delivery auditing

```java
@Component
public class OrderNotifications {
    private final NotificationFacade notifications;

    @PostConstruct
    void registerTemplates() {
        notifications.registerTemplate(new NotificationTemplate(
            "order-confirmation",
            "Order confirmation email",
            NotificationType.EMAIL,
            "Order ${orderId} confirmed",
            "Hi ${customerName}, your order ${orderId} for ${total} is on its way.",
            Map.of()));
    }

    public void confirm(Order order) {
        notifications.sendFromTemplate("order-confirmation", order.getEmail(),
            Map.of("orderId",      order.getId().toString(),
                   "customerName", order.getCustomerName(),
                   "total",        order.getTotal().toString()));
    }

    public List<NotificationHistoryEntry> triage() {
        return notifications.getFailedNotifications();
    }
}
```

```yaml
adhar:
  notification:
    async: true
    email:
      enabled: true
      from: no-reply@example.com
      template-path: classpath:templates/
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

Because every attempt emits a CloudEvent, you can subscribe a consumer to `com.adhar.notification.failed` and alert on delivery failures instead of discovering them in a support ticket.

## Configuration

| Property | Purpose | Default |
| --- | --- | --- |
| `adhar.notification.enabled` | Master switch | `true` |
| `adhar.notification.async` | Send on virtual threads rather than inline | `true` |
| `adhar.notification.email.enabled` | Register the email channel | `false` |
| `adhar.notification.email.from` | Sender address | — |
| `adhar.notification.email.template-path` | Template lookup root | `classpath:templates/` |
| `adhar.notification.webhook.enabled` | Register the webhook channel | `false` |
| `adhar.notification.webhook.default-url` | Fallback webhook target | — |
| `adhar.notification.webhook.timeout-ms` | HTTP timeout | `5000` |
| `adhar.notification.in-app.enabled` | Register the in-app channel | `true` |
| `adhar.notification.sms.enabled` | Register the SMS channel | `false` |
| `adhar.notification.sms.url` | SMS provider endpoint | — |
| `adhar.notification.sms.payload-template` | Provider request body | `{"to":"${recipient}","message":"${body}"}` |
| `adhar.notification.retry.max-retries` | Attempts after the first failure | `3` |
| `adhar.notification.retry.backoff-ms` | Initial backoff | `1000` |
| `adhar.notification.retry.max-backoff-ms` | Backoff ceiling | `30000` |
| `adhar.notification.history.max-size` | Entries retained in memory | `1000` |
| `adhar.notification.rate-limit.enabled` | Per-recipient throttling | `false` |
| `adhar.notification.rate-limit.max-per-window` | Sends allowed per window | `60` |
| `adhar.notification.rate-limit.window-ms` | Window length | `60000` |
| `adhar.notification.idempotency.enabled` | Suppress duplicate sends | `true` |
| `adhar.notification.idempotency.ttl-ms` | How long a key is remembered | `86400000` (24 h) |
| `adhar.notification.digest.enabled` | Batch instead of sending each | `false` |
| `adhar.notification.digest.window-ms` | Batching window | `60000` |
| `adhar.notification.digest.max-batch-size` | Messages per digest | `50` |
| `adhar.notification.digest.subject-template` | Digest subject | `You have ${count} new notifications` |
| `adhar.notification.dapr.email-binding` | Dapr output binding for email | `smtp` |
| `adhar.notification.dapr.sms-binding` | Dapr output binding for SMS | `sms` |
| `adhar.notification.dapr.http-binding` | Dapr output binding for webhooks | `webhook` |

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Email silently not sent | `email.enabled` defaults to `false`, or no `JavaMailSender` bean exists | Set the flag and configure `spring.mail.*` |
| Placeholders appear literally in the body | Variable names in the map do not match the `${…}` names | Keys are exact and case-sensitive |
| Duplicate messages after a redeploy | The idempotency store is in-memory and per-instance | Expected across instances; provide your own `NotificationIdempotencyStore` bean for shared state |
| History is empty after a restart | `NotificationHistory` is a bounded in-memory ring | Consume the CloudEvents and persist them if you need durable audit |
| `UnsupportedOperationException: No notification channel found for type` | No enabled channel `supports(type)` | Enable the channel for that `NotificationType`; there is no fallback |
| A send returns quietly and nothing arrives | An opt-out, rate-limit, or idempotency guard short-circuited it | Check the preference store, `rate-limit`, and whether the same idempotency key was used |
| Caller blocks on a slow SMTP server | `async: false` runs delivery inline | Leave `async: true`, or call `sendAsync` |
| A retry storm floods one recipient | Retry is per attempt, not per recipient | Turn on `rate-limit`, or `digest` for high-volume notifications |

## See also

- [Messaging](/adhar-kit/modules/messaging) — consume the sent/failed CloudEvents elsewhere.
- [Dapr](/adhar-kit/modules/dapr) — routes delivery through output bindings instead of direct clients.
- [Commons](/adhar-kit/modules/commons) — defines the `AdharCloudEvent` envelope used here.
