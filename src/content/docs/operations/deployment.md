---
title: "Deployment"
section: "Operations"
order: 2
path: "/docs/operations/deployment"
---

# Deployment

`adhar deploy` is the single command that ships a service from a git
commit to a running pod. This page covers what happens behind the
scenes, how to roll out safely, and how to roll back.

## The deployment pipeline

```text
git push ─► CI ─► test ─► build ─► sign ─► deploy ─► verify ─► promote
                                                        │
                                                        ▼
                                                  rollback (if SLO burns)
```

| Stage | Tooling | Typical duration |
|-------|---------|------------------|
| Test | JUnit, TestContainers | 1–3 min |
| Build | Buildpacks / Jib | 30–90 s |
| Sign | Sigstore / Cosign | 5 s |
| Deploy | Argo CD | 30 s |
| Verify | Smoke + health probes | 30 s |
| Promote | Progressive rollout | 5–30 min |

## Progressive rollout

By default, services use **canary** rollout: 5% → 25% → 50% → 100% with
SLO checks at each step.

```yaml
deploy:
  strategy: canary
  steps:
    - weight: 5
      pause: 2m
    - weight: 25
      pause: 5m
    - weight: 50
      pause: 5m
    - weight: 100
```

Switch to **blue-green** for stateful migrations:

```yaml
deploy:
  strategy: blue-green
  switch: manual
```

## Rollback

Automatic if SLO error budget burns faster than 2× during the rollout.
Manual rollback is a single command:

```bash
adhar deploy rollback orders --to v2026.05.22-1
adhar deploy history orders
```

## Environments

| Env | Promotion gate | Approvers |
|-----|----------------|-----------|
| `dev` | Every merge to `main` | none |
| `stage` | Smoke pass | team lead |
| `prod` | Stage soak ≥ 1h | on-call |

## Feature flags vs. deploys

Use **deploys** for code changes you can roll back instantly. Use
**feature flags** for behaviour you want to enable/disable per cohort
without redeploying.

```java
if (flags.enabled("orders.new-pricing", user)) {
    return newPricing.quote(order);
} else {
    return legacyPricing.quote(order);
}
```

## Troubleshooting a stuck rollout

```bash
adhar deploy status orders
adhar deploy logs orders --canary
adhar deploy rollback orders
```

If the rollout is stuck on a verification gate, check the SLO
dashboard. If the SLO is fine but the rollout still waits, the canary
analysis may be waiting for traffic — generate some with
`adhar load orders --rps 10 --duration 60s`.
