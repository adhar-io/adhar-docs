---
title: "Notification"
section: "Modules"
order: 23
path: "/adhar-kit/modules/notification"
---

# Notification

`adhar-kit-notification` delivers multi-channel notifications — email, webhook, in-app, and SMS — with templates, exponential-backoff retry, bounded history, async (virtual-thread) delivery, and CloudEvent publishing.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-notification</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

`NotificationFacade` (via `adhar.getNotification()`): `sendEmail`, `sendWebhook`, `sendInApp`, `sendSms`, `sendAsync`, `sendFromTemplate(id, to, vars)`, `registerTemplate`, `getHistory`, `getFailedNotifications`. Facade shortcuts: `adhar.notify(...)` and `adhar.webhook(...)`.

## Usage

```java
@Service
public class OrderService {
    private final AdharFacade adhar;
    public OrderService(AdharFacade adhar) { this.adhar = adhar; }

    public void notifyCustomer(Order order) {
        adhar.notify(order.getEmail(), "Order Confirmed",
            "Your order #" + order.getId() + " is confirmed.");

        adhar.webhook("https://hooks.slack.com/…",
            "{\"text\":\"New order: " + order.getId() + "\"}");

        adhar.getNotification().sendFromTemplate("order-confirmation", order.getEmail(),
            Map.of("orderId", order.getId(), "total", order.getTotal()));
    }
}
```

Sends publish `com.adhar.notification.sent` / `com.adhar.notification.failed` CloudEvents, so you can audit or react to delivery outcomes.

## Configuration

```yaml
adhar:
  notification:
    enabled: true
    async: true
    email:   { enabled: true, from: no-reply@example.com, template-path: classpath:/templates }
    webhook: { enabled: true, timeout-ms: 5000 }
    in-app:  { enabled: true }
    sms:     { enabled: false }
    retry:   { max-retries: 3, backoff-ms: 1000 }
    history: { max-size: 1000 }
```
