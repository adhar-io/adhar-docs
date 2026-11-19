---
title: "Notification"
section: "Modules"
order: 23
path: "/adhar-kit/modules/notification"
---

# Notification

`adhar-kit-notification` gives you one channel-agnostic `NotificationService` for email, webhooks, SMS, in-app messages and Dapr output bindings, with retry, idempotency, opt-out, rate limiting, digesting and a bounded delivery history around it. Use it when a service sends transactional messages and you want duplicate suppression and an auditable record of what went out, configured rather than hand-coded.

## At a glance

| | |
| --- | --- |
| Artifact | `com.adhar.kit:adhar-kit-notification` |
| Toggle | `adhar.notification.enabled` (default `true`) turns the auto-configuration on or off. The facade gate `adhar.kit.modules.notification` defaults to `false`; while it is off, `adhar.getNotification()` throws `IllegalStateException` |
| Facade | `adhar.getNotification()` → `NotificationFacade`. **Not auto-wired**: the module registers no `NotificationFacade` bean, so facade calls throw `IllegalStateException: NotificationService is not configured` until you wire one ([below](#use-the-facade)). Inject the beans instead: `NotificationService`, `TemplateNotificationService`, `NotificationHistory`, `NotificationPreferenceStore`, `NotificationDigestService` |
| Dependencies | Required: `adhar-kit-commons`. Optional: `spring-boot-starter-mail` (email), `spring-boot-starter-webflux` (webhook), `adhar-kit-dapr` (Dapr binding channel) |
| Frameworks | Spring Boot auto-configuration (`NotificationAutoConfiguration`). No adapters for other runtimes; the classes are plain Java and can be constructed by hand |

## How it works

A `Notification` is an immutable record (`id`, `type`, `recipient`, `subject`, `body`, `metadata`, `createdAt`). `DefaultNotificationService.send` routes it to the first channel in the injected `List<NotificationChannel>` whose `supports(type)` is true, then runs the guards and delivery in this order:

```diagram
nkc-notification-send
```

1. **Channel lookup** — no supporting channel throws `UnsupportedOperationException` immediately, even for an opted-out recipient or a duplicate key.
2. **Opt-out** — `NotificationPreferenceStore.isOptedOut(recipient, type)`; logs at INFO and returns.
3. **Rate limit** — only when `rate-limit.enabled`; logs at WARN, records a failure entry `Rate limit exceeded`, returns.
4. **Idempotency** — only when `metadata` has a non-blank `idempotencyKey` (`DefaultNotificationService.IDEMPOTENCY_KEY_METADATA`); a key registered within `ttl-ms` logs at INFO and returns.
5. **Delivery** — `channel.send`, then a history entry. On failure the retry handler takes over.

The guards return `void`, so the caller cannot tell a suppressed send from a delivered one; only logs and history show the difference.

`NotificationChannel` is a **sealed interface** permitting exactly five channels. You cannot add a sixth; to change behaviour, replace one of them with your own bean of the same type (each is `@ConditionalOnMissingBean`) or replace `NotificationService`.

| Channel | `NotificationType` | Registered when | Delivers via |
| --- | --- | --- | --- |
| `InAppNotificationChannel` | `IN_APP` | `in-app.enabled` (default `true`) | An INFO log line only; nothing is stored |
| `EmailNotificationChannel` | `EMAIL` | `email.enabled=true` and a `JavaMailSender` bean (`spring.mail.*`) | `SimpleMailMessage` (plain text); `cc`/`bcc` metadata, comma-separated |
| `WebhookNotificationChannel` | `WEBHOOK` | `webhook.enabled=true` and a `WebClient.Builder` bean | JSON `POST` to `metadata.webhookUrl`, else `webhook.default-url` |
| `SmsNotificationChannel` | `SMS` | `sms.enabled=true` | HTTP gateway call — but see [Limits](#limits): the auto-configured bean ignores `sms.*` |
| `DaprBindingNotificationChannel` | `EMAIL`, `SMS`, `WEBHOOK` | `adhar-kit-dapr` on the classpath, `adhar.dapr.enabled=true` set explicitly, a `DaprFacade` bean, `notification.dapr.enabled` (default `true`) | `DaprFacade.invokeBinding` (`create` for email/SMS, `post` for webhook) |

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-notification</artifactId>
    <version>0.1.0</version>
</dependency>
<!-- Email channel -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
<!-- Webhook channel -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

`adhar-kit-starter` already depends on `adhar-kit-notification`.

## Use it

### Send with duplicate suppression

```java
import com.adhar.kit.notification.DefaultNotificationService;
import com.adhar.kit.notification.NotificationService;
import com.adhar.kit.notification.model.Notification;
import com.adhar.kit.notification.model.NotificationType;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class OrderNotifications {

    private final NotificationService notifications;

    OrderNotifications(NotificationService notifications) {
        this.notifications = notifications;
    }

    void confirm(String orderId, String email) {
        Notification n = new Notification(
                UUID.randomUUID().toString(),
                NotificationType.EMAIL,
                email,
                "Order " + orderId + " confirmed",
                "Your order " + orderId + " is on its way.",
                // Derive the key from the business event, not per call:
                // a retried request or redelivered message then sends once.
                Map.of(DefaultNotificationService.IDEMPOTENCY_KEY_METADATA, "order-confirmed:" + orderId),
                null); // createdAt defaults to now

        notifications.sendAsync(n).exceptionally(ex -> {
            // Completes exceptionally only after retries are exhausted.
            System.err.println("Confirmation for " + orderId + " failed: " + ex);
            return null;
        });
    }
}
```

Use `sendAsync` for anything on a request thread: `send` is always synchronous and blocks through the retry backoff. `sendBatch(list)` calls `send` for each item, logs failures at ERROR and continues.

### Templates

```java
import com.adhar.kit.notification.TemplateNotificationService;
import com.adhar.kit.notification.model.NotificationTemplate;
import com.adhar.kit.notification.model.NotificationType;
import java.util.Map;

void sendWelcome(TemplateNotificationService templates, String userId, String name) {
    templates.registerTemplate(new NotificationTemplate(
            "welcome", "Welcome message", NotificationType.IN_APP,
            "Welcome, ${name}", "<p>Hello ${name}</p>",
            Map.of("contentType", "text/html")));   // HTML-escape substituted values

    templates.sendFromTemplate("welcome", userId, Map.of("name", name));
}
```

- Placeholders are `${name}`, replaced literally; keys are case-sensitive, a missing key leaves the placeholder, a null value becomes empty.
- With `contentType: text/html` or `html: true` in `defaultMetadata`, `TemplateNotificationService` escapes `& < > " '` in substituted values (never in the template text). `NotificationTemplate.render(...)` on its own does no escaping.
- With a `MessageSource` bean, the four-argument `sendFromTemplate(id, recipient, vars, locale)` looks up `<id>.subject` and `<id>.body` first and falls back to the template text.
- The notification it builds carries only the template's `defaultMetadata`, so it cannot carry a per-send `idempotencyKey` or `webhookUrl`. Render with `getTemplate(id).render(vars)` and build the `Notification` yourself when you need them.
- An unknown template id throws `IllegalArgumentException`. Templates live in memory on the bean.

### Webhooks

```java
notifications.send(new Notification(
        UUID.randomUUID().toString(), NotificationType.WEBHOOK,
        "billing-service", "invoice.paid", "{\"invoice\":\"INV-42\"}",
        Map.of("webhookUrl", "https://hooks.example.com/billing"), null));
```

The native channel posts `{id, type, recipient, subject, body, metadata, createdAt}` and waits up to `webhook.timeout-ms`. It builds the payload with `Map.of`, so **`recipient`, `subject` and `body` must be non-null**. The URL comes from `metadata.webhookUrl` or `webhook.default-url`, never from `recipient`.

### Opt-outs and digests

```java
preferences.optOut("user-42", NotificationType.EMAIL);   // NotificationPreferenceStore
digests.submit(notification);                            // NotificationDigestService
```

`NotificationDigestService` (registered when `digest.enabled=true`) does not intercept `send`; you call `submit` explicitly. It buckets by recipient and type, and on `window-ms` expiry or `max-batch-size` sends one notification whose subject is `subject-template` and whose body lists `- <subject>: <body>` per item. A bucket of one is sent unchanged. Digest notifications carry only `digest` and `digest.count` metadata, so per-item idempotency keys and webhook URLs are dropped. `flushAll()` sends everything pending; closing the bean flushes too.

### Use the facade

To make `adhar.getNotification()` work, enable the gate and set a facade built from the beans:

```yaml
adhar:
  kit:
    modules:
      notification: true
```

```java
import com.adhar.kit.notification.NotificationFacade;
import com.adhar.kit.notification.NotificationHistory;
import com.adhar.kit.notification.NotificationService;
import com.adhar.kit.notification.TemplateNotificationService;
import com.adhar.kit.starter.AdharFacadeCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class NotificationFacadeWiring {
    @Bean
    AdharFacadeCustomizer notificationFacade(NotificationService service,
                                             TemplateNotificationService templates,
                                             NotificationHistory history) {
        return adhar -> adhar.setNotification(new NotificationFacade(service, templates, history));
    }
}
```

The facade adds `sendEmail`, `sendSms`, `sendInApp`, `sendWebhook`, `sendFromTemplate`, `registerTemplate`, `getHistory(limit)`, `getFailedNotifications()` and `health()`. `adhar.notify(recipient, subject, body)` is `sendEmail`. Avoid `sendWebhook(url, payload)` and `adhar.webhook(...)` with the native webhook channel: they pass the URL as `recipient` and a null subject, so the send fails.

### Publish CloudEvents

The auto-configured service passes a `null` event publisher, so no CloudEvents are emitted. Define your own `NotificationService` to get `com.adhar.notification.sent` / `com.adhar.notification.failed` events (source `adhar-kit/notification`, data `NotificationEvent`):

```java
@Bean
NotificationService notificationService(List<NotificationChannel> channels,
                                        NotificationRetryHandler retry,
                                        NotificationHistory history,
                                        NotificationPreferenceStore preferences,
                                        ObjectProvider<NotificationRateLimiter> rateLimiter,
                                        NotificationIdempotencyStore idempotency,
                                        ApplicationEventPublisher events) {
    return new DefaultNotificationService(channels, Executors.newVirtualThreadPerTaskExecutor(),
            retry, history, events::publishEvent,
            preferences, rateLimiter.getIfAvailable(), idempotency);
}
```

A publisher that throws is logged at WARN and does not fail the send.

## Configuration

All keys are under `adhar.notification`.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | Master switch for the auto-configuration |
| `async` | boolean | `true` | Executor for `sendAsync`: virtual thread per task (`true`) or the caller thread (`false`). Does not affect `send` |
| `email.enabled` | boolean | `false` | Register the email channel |
| `email.from` | String | — | Sender address |
| `email.template-path` | String | `classpath:templates/` | Declared but not read by the module |
| `webhook.enabled` | boolean | `false` | Register the webhook channel |
| `webhook.default-url` | String | — | Target when `metadata.webhookUrl` is absent |
| `webhook.timeout-ms` | int | `5000` | Blocking wait for the HTTP response |
| `in-app.enabled` | boolean | `true` | Register the in-app (log-only) channel |
| `sms.enabled` | boolean | `false` | Register the SMS channel |
| `sms.url` | String | — | Gateway URL; unset means the channel only logs |
| `sms.method` | String | `POST` | HTTP method |
| `sms.content-type` | String | `application/json` | Request content type; a JSON type escapes values in the payload |
| `sms.auth-header-name` | String | `Authorization` | Credential header name |
| `sms.auth-header-value` | String | — | Credential header value |
| `sms.payload-template` | String | `{"to":"${recipient}","message":"${body}"}` | Body template; also `${subject}`, `${id}`, `${metadata.<key>}` |
| `sms.timeout-ms` | int | `5000` | Connect and request timeout |
| `retry.max-retries` | int | `3` | Retry attempts after the immediate resend |
| `retry.backoff-ms` | long | `1000` | Initial backoff, doubled per attempt |
| `retry.max-backoff-ms` | long | `30000` | Backoff ceiling |
| `history.max-size` | int | `1000` | Entries kept; oldest dropped first |
| `rate-limit.enabled` | boolean | `false` | Register the per-recipient, per-type limiter |
| `rate-limit.max-per-window` | int | `60` | Sends allowed per window |
| `rate-limit.window-ms` | long | `60000` | Sliding window length |
| `idempotency.enabled` | boolean | `true` | Register the in-memory idempotency store |
| `idempotency.ttl-ms` | long | `86400000` | How long a key is remembered (24 h) |
| `digest.enabled` | boolean | `false` | Register `NotificationDigestService` |
| `digest.window-ms` | long | `60000` | Time a bucket stays open |
| `digest.max-batch-size` | int | `50` | Bucket size that triggers an immediate flush |
| `digest.subject-template` | String | `You have ${count} new notifications` | Digest subject |
| `dapr.enabled` | boolean | `true` | Register the Dapr binding channel (when Dapr is active) |
| `dapr.email-binding` / `dapr.email-enabled` | String / boolean | `smtp` / `true` | Binding for `EMAIL`; metadata `emailTo`, `subject` |
| `dapr.sms-binding` / `dapr.sms-enabled` | String / boolean | `sms` / `true` | Binding for `SMS`; metadata `toNumber` |
| `dapr.http-binding` / `dapr.webhook-enabled` | String / boolean | `webhook` / `true` | Binding for `WEBHOOK`; `recipient` becomes metadata `path` |

## Operations

- **Retry.** After a failed send, `NotificationRetryHandler` resends immediately, then up to `max-retries` more times with `backoff-ms × 2^n` delays (capped at `max-backoff-ms`), so one failing notification reaches the channel up to `max-retries + 2` times. With the defaults, `send` blocks the caller for 1 s + 2 s + 4 s before throwing `RuntimeException("Failed to send notification [id=…] after retries")`. Delayed attempts run on a single daemon thread, `notification-retry-scheduler`, shared by all failing sends.
- **Failure surface.** A failed `sendAsync` future that nobody inspects is silently dropped; attach `exceptionally` or `whenComplete`.
- **History.** `NotificationHistory.getHistory(limit)` (newest first) and `getFailedNotifications()` are the delivery audit. Opt-outs and duplicates leave no entry; rate-limited sends leave a failure entry.
- **Health and metrics.** The module registers no health indicator or Micrometer meters. `NotificationFacade.health()` returns a map (`historySize`, `failedCount`, `templateCount`, …) if you wire the facade.
- **Shutdown.** Closing the context shuts the retry scheduler down with `shutdownNow()` (pending retries are dropped) and flushes pending digests. The `sendAsync` virtual-thread executor is never shut down, so in-flight async sends are not drained.
- **Testing.** Construct `DefaultNotificationService` directly with a fake channel and `Runnable::run`. `InMemoryNotificationIdempotencyStore` and `NotificationRateLimiter` accept a `LongSupplier` clock; `NotificationRetryHandler` and `NotificationDigestService` accept your own `ScheduledExecutorService`, which they do not shut down.

## Limits

- **The auto-configured SMS channel ignores `adhar.notification.sms.*`.** It is created with `new SmsNotificationChannel()`, which reads built-in defaults (no URL), so every SMS is only logged. Define the bean yourself to use your gateway:

  ```java
  @Bean
  SmsNotificationChannel smsNotificationChannel(NotificationProperties properties) {
      return new SmsNotificationChannel(properties.getSms());
  }
  ```

- **Email is plain text.** `EmailNotificationChannel` sends a `SimpleMailMessage`, so an HTML body arrives as literal tags. Replace the bean for MIME/HTML mail.
- **In-app delivers nothing** beyond a log line. Replace `InAppNotificationChannel` to store or push messages.
- **One channel per type.** When a native channel and the Dapr channel both support a type, the first in the injected list wins. Enable only one, or turn the Dapr side off per type (`dapr.email-enabled: false`, …).
- **Everything is in memory and per pod**: history, templates, opt-outs, idempotency keys, rate-limit windows and digest buckets. Across replicas the same idempotency key can send once per pod, and a restart forgets all of it. Replace `NotificationIdempotencyStore`, `NotificationPreferenceStore` or `NotificationHistory` with shared-state beans when that matters.
- **Unbounded growth.** The rate limiter never evicts per-`recipient|type` windows, and the idempotency store holds every distinct key for `ttl-ms`. Size both for a bounded recipient set, not arbitrary public input.
- **`sendAsync` is unbounded.** The virtual-thread executor has no concurrency limit.

## Next steps

- [Messaging](/adhar-kit/modules/messaging) — publish the sent/failed CloudEvents to Kafka or RabbitMQ.
- [Dapr](/adhar-kit/modules/dapr) — deliver through Dapr output bindings.
- [Commons](/adhar-kit/modules/commons) — the `AdharCloudEvent` envelope.
- [Concepts](/adhar-kit/concepts) — module gating, auto-configuration and the facade model.
