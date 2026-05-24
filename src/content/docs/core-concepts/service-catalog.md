---
title: "Service Catalog"
section: "Core Concepts"
order: 3
path: "/docs/core-concepts/service-catalog"
---

# Service catalog

Every service registered on Adhar appears in the **catalog**. It's the
single source of truth for ownership, dependencies, SLOs, and
on-call routing.

## Registering a service

A service is registered by committing a `service.yaml` to its repo.

```yaml
service:
  name: orders
  owner: payments-team
  tier: 1
  description: Handles order lifecycle from cart to fulfilment.

links:
  repo: https://github.com/acme/orders
  runbook: https://wiki/orders/runbook
  dashboard: https://grafana/d/orders

dependencies:
  - postgres
  - kafka
  - redis
  - inventory-service
  - payments-service

on_call:
  primary: pagerduty:payments-primary
  secondary: pagerduty:payments-secondary
```

## Service tiers

| Tier | Description | SLO baseline | On-call |
|------|-------------|--------------|---------|
| **0** | Platform-critical | 99.99% | 24×7 |
| **1** | Customer-facing | 99.9% | 24×7 |
| **2** | Internal-critical | 99.5% | business hours |
| **3** | Best-effort | none | none |

## Discovering services

```bash
adhar catalog list --owner payments-team
adhar catalog show orders
adhar catalog deps orders --tree
```

## Ownership

Every service has exactly one **owning team**. Ownership transfer
requires a PR to the catalog plus sign-off from both teams.

```bash
adhar catalog transfer orders --to checkout-team
```

## Dependencies & blast radius

The catalog builds a live dependency graph. Use it to:

- Preview blast radius before a deploy
- Discover unowned services
- Plan migrations across multiple teams

```bash
adhar catalog blast-radius orders
```
