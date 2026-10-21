---
title: "Observability that pays rent"
excerpt: "Metrics, logs, traces, network flows and cost that arrive without per-service setup, and how to turn them into decisions using the Discover and Decide stages of the 6 D's."
category: "DevOps"
author: "Adhar Team"
date: "2026-10-02"
featured: false
tags: ["Observability", "Grafana", "SLOs", "OpenCost", "Platform Engineering"]
---

A dashboard nobody reads is not observability. It is storage you are paying for. Telemetry earns its keep in two moments: when it shortens an incident, and when it changes a decision. Everything else is decoration.

This post covers what Adhar collects for you, the two small things a service has to do itself, and how to move from signals to decisions. In the language of Adhar's [6 D's framework](/docs/core-concepts/ds-framework), that is the step from **Discover** (what is it actually doing?) to **Decide** (what should we do next, and why?).

## Observable by construction

Most platforms bolt monitoring on per service. Every team then solves label naming, trace propagation and retention again, usually under deadline, and usually differently. Adhar makes three decisions once, for everyone:

- **One collection contract: OpenTelemetry.** Workloads never talk to a storage backend. They talk to Grafana Alloy, over OTLP or by exposing `/metrics` to be scraped. The platform can change where data lands without touching any application.
- **One storage tier: the Grafana LGTM stack.** Loki for logs, Tempo for traces, Mimir for long-term metrics, Prometheus for the fast local tier, and Pyroscope for profiles. They are backed by object storage, so retention is a policy decision rather than a disk limit.
- **One pane: Grafana.** Metrics, logs, traces, profiles and cost, cross-linked.

On a fleet, data planes run only Alloy. Everything flows to the management cluster, stamped with a `cluster` label, so one query spans every cluster.

## What ships, and where

The local and production profiles differ on purpose. A laptop cannot run everything.

| Package | Local | Production | What it gives you |
|---|---|---|---|
| `kube-prometheus` | on | on | Prometheus, Grafana, Alertmanager, 100+ dashboards |
| `metrics-server` | on | on | `kubectl top`, autoscaler input |
| `alloy` | off | on | OTLP receiver, log shipping, hub forwarding |
| `loki-stack`, `tempo`, `mimir` | off | on | Logs, traces, long-term metrics |
| `hubble` | off | on | Network flows and policy verdicts |
| `opencost`, `adhar-cost-governance` | off | on | Cost attribution and budget alerts |
| `beyla` | off | off | eBPF auto-instrumentation, opt-in |
| `pyroscope` | off | off | Continuous profiling, opt-in |

Turn on what you need locally with `adhar stack enable <pkg>` followed by `adhar upgrade`. Watch node memory while you do.

## What you get with zero setup

On the production profile, with no work from the application team:

- **Pod logs.** Alloy tails every container and labels each stream with `namespace`, `pod`, `container`, `node` and `app`, so filtering by namespace works from day one.
- **Kubernetes state and node metrics**, plus every platform component. Each package ships its own monitors and a Grafana dashboard.
- **Network flows** through Hubble: every connection and every policy verdict.
- **Cost**, attributed per namespace by OpenCost.
- **Automatic discovery.** Prometheus picks up monitors and alert rules from any namespace, with no special label.

This matters for a reason beyond convenience. You can only capture a baseline if collection starts before the thing you want to measure. Per-service instrumentation is exactly the step teams skip when they are busy.

## The two things a service does itself

Application metrics and traces need one object or one environment variable each.

**Metrics.** Expose `/metrics` and commit a `ServiceMonitor` next to your Deployment. The golden-path templates already include one.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: checkout
  namespace: checkout
  annotations:
    argocd.argoproj.io/sync-wave: "10"   # the CRD may not exist on first boot
spec:
  jobLabel: app.kubernetes.io/name
  selector:
    matchLabels:
      app.kubernetes.io/name: checkout
  endpoints:
    - port: http
      path: /metrics
      interval: 60s
```

**Traces.** Point your OpenTelemetry SDK at Alloy. Alloy fans traces, metrics and logs out to Tempo, Mimir and Loki.

```yaml
env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: http://alloy.adhar-system.svc.cluster.local:4318
  - name: OTEL_SERVICE_NAME
    value: checkout                      # without this, spans arrive with no service name
```

If you cannot touch the code, enable `beyla` for basic spans from eBPF. It is off by default because it is a per-node agent with a real resource cost.

## Discover: one path through an incident

In Grafana Explore the datasources are linked, so an investigation is one path rather than five tabs:

1. Start on a metric spike. Exemplars carry a `trace_id` and offer a link into Tempo.
2. From the trace, jump to the Loki lines for that service and pod within five minutes either side, filtered by trace ID.
3. Use Tempo's service map to see which dependency is slow. It is on by default, because Tempo's metrics generator writes span metrics and service graphs into Mimir.

From the terminal, the same signals are a few commands away:

```bash
adhar get status                                   # platform conditions and package health
adhar logs --namespace checkout --search timeout --lines 200
adhar network connectivity --from frontend --to orders-api -n team-payments

kubectl -n adhar-system port-forward svc/tempo 3200:3200 &
adhar traces search --service checkout --tags 'http.status_code=500' \
  --tempo-url http://localhost:3200
```

`adhar metrics` and `adhar traces` default to service URLs that do not exist on an Adhar cluster, so port-forward and pass the URL explicitly.

## SLOs: decide what "good" means first

An alert that fires on CPU tells you a number moved. An alert that fires on users getting errors tells you something worth waking up for. Write service level objectives as `PrometheusRule` objects in your repository. Prometheus picks them up from any namespace:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: checkout-slo
  namespace: checkout
  annotations: { argocd.argoproj.io/sync-wave: "10" }
spec:
  groups:
    - name: checkout.slo
      rules:
        - alert: CheckoutErrorBudgetBurn
          expr: |
            sum(rate(http_requests_total{job="checkout",code=~"5.."}[5m]))
            / sum(rate(http_requests_total{job="checkout"}[5m])) > 0.02
          for: 10m
          labels: { severity: critical }
          annotations:
            summary: checkout is serving more than 2% 5xx
```

Routing is already wired. Alertmanager groups by namespace and alert name, delivers to the Console's Notification Center, and suppresses `warning` and `info` alerts when a matching `critical` one is firing.

Coverage is not the goal. Leading indicators are. A few the platform documentation recommends:

| Alert on | Why it leads |
|---|---|
| ArgoCD apps `Degraded` or `OutOfSync` for more than 15 minutes | A post-push burst clears in about ten; longer is a real sync failure |
| `lastFailedBackup` on any CloudNativePG cluster | Your recovery point is already gone |
| PVC usage above 80% | A full Loki volume does not degrade; Loki stops |
| Certificate expiry under 21 days | Wildcard renewal uses DNS-01 and fails quietly |
| Namespace spend at 80% of budget | At 100% the money is already spent |

## Scorecards: readiness as a number with a stated basis

The `adhar-scorecards` package grades every service from 0 to 100, mapped to A to F. It reads in-cluster signals: ArgoCD health and sync, probes, resource requests, no `:latest` tags, Kyverno PolicyReport pass rate, HTTPRoute exposure and backup presence. A CronJob refreshes it every 30 minutes.

```bash
kubectl -n adhar-system create job --from=cronjob/adhar-scorecard-scorer scorecard-now
kubectl -n adhar-system get configmap adhar-scorecards \
  -o jsonpath='{.data.summary\.json}' | jq .
```

The grade describes the production readiness of a service, never the performance of the people who wrote it. Read the spread across all services as a measure of the platform. A criterion that scores weakly everywhere is a platform gap, not a collection of careless teams.

## Cost: the other side of every trade-off

OpenCost attributes spend to namespaces and workloads. `adhar cost` reads it through the API server, so it needs no flags:

```bash
adhar cost              # spend per namespace, against declared budgets
adhar cost breakdown    # split into CPU and memory
```

Two details matter. First, the figures are the cost of resource **requests**, not usage, because requests are what the scheduler reserves and denies to everyone else. Second, budget alerting is opt-in. `adhar-cost-governance` ships its budget rule group empty, so installing it cannot page anyone until you declare a budget.

## Decide: close the loop

Discover produces signals. Decide turns them into commitments: a budget, a roadmap change, a requirement that goes back into Define. Without that step, dashboards accumulate and nothing changes. The table below pairs common questions with the signal that answers them and the decision it should drive.

| Question | Signal | Decision it should drive |
|---|---|---|
| Is this service ready for production? | Scorecard grade and its failing criteria | Fix the criteria, or fix the golden path if every service fails the same one |
| Are we keeping our promise to users? | SLO burn alert | Spend reliability work, or relax the objective |
| Which team is over budget, and why? | `adhar cost`, CPU versus memory split | Right-size requests, or raise the budget deliberately |
| Is it safe to enforce default-deny? | Hubble flows per namespace | Write network policy from observed traffic |
| Can we show an auditor our posture? | `adhar compliance export -o posture.md` | Close the failing controls before the review |

## Pitfalls worth knowing

- **Verify at the reader.** "Configured" is not "working". Adhar once shipped metrics that Mimir rejected for months while Grafana looked fine, because Grafana read through a different path. Prove each signal with a query that must return data.
- **Dashboards are code.** Grafana runs with UI saves disabled, so edits made in the browser vanish on restart. Export the JSON and commit it as a ConfigMap labelled `grafana_dashboard: "1"`.
- **Size Loki's volume with its limits.** A volume too small for the ingestion rate and retention does not slow Loki down. It crashes it, and Grafana reports a configuration error rather than a dead backend.

## Next steps

- [Observability](/docs/operations/observability) covers signal flow, instrumentation, retention and troubleshooting in full.
- [The 6 D's Framework](/docs/core-concepts/ds-framework) places Discover and Decide in the wider lifecycle.
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) explains how to use scorecards and metrics without gaming them.
- The [CLI Reference](/docs/reference/cli) lists every `adhar logs`, `adhar traces`, `adhar metrics` and `adhar cost` flag.
