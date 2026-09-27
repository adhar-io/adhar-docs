---
title: "Observability"
section: "Operations"
order: 4
path: "/docs/operations/observability"
---

# Observability

Adhar is **observable by construction** — every component's metrics, logs, and traces land in the standard pipeline without per-component setup. Enable a package and Grafana already sees it.

## At a glance

| | |
|---|---|
| **Collection** | OpenTelemetry via Grafana Alloy; Beyla/Pixie (eBPF); Hubble (network) |
| **Storage** | Prometheus + Mimir (metrics), Loki (logs), Tempo (traces), Pyroscope (profiles) |
| **UX** | Grafana — one pane for metrics, logs, traces, cost |
| **Fleet (T3)** | Hub-and-spoke — data planes ship to the management-cluster hub |
| **For your apps** | Auto-instrumented — no per-service setup |
| **Cost** | OpenCost attribution |

## The stack

Adhar standardizes on **OpenTelemetry** as the collection contract and the **Grafana LGTM** stack for storage and UX:

| Layer | Tools | Role |
|---|---|---|
| **Collection** | Grafana Alloy (OTel), Beyla/Pixie (eBPF auto-instrumentation), Hubble (network) | Ship metrics, logs, traces — no code changes needed |
| **Storage** | Prometheus (cluster-local), Mimir (long-term), Loki (logs), Tempo (traces), Pyroscope (profiles) | Object-storage-backed in production — retention is policy, not disk size |
| **UX** | Grafana (dashboards, Explore, alerting), Alertmanager / Grafana OnCall, OpenCost | One pane of glass; alert routing; cost attribution |

## Topology

- **Local & single-cluster (T1/T2):** the full stack runs in-cluster.
- **Fleet (T3):** hub-and-spoke — data planes run only collectors (Alloy); the management cluster hosts storage and query, giving one pane of glass across every environment.

## Using it

Open Grafana and sign in with Keycloak SSO:

```text
https://grafana.<your-host>          # dashboards, logs (Loki), traces (Tempo), cost
https://prometheus.<your-host>       # raw metric queries
https://hubble.<your-host>           # live network flows
```

Quick network debugging from the CLI:

```bash
cilium status
hubble observe --since 5m --namespace <ns>
```

## What you get automatically

- **Metrics** for every platform component and your workloads (Prometheus → Mimir).
- **Logs** aggregated in Loki, correlated with traces.
- **Traces** in Tempo; eBPF auto-instrumentation via Beyla means no code changes for basic spans.
- **Network flows** via Hubble (Cilium) — see every connection and policy verdict.
- **Cost** attributed by OpenCost (enable the package).

## Production notes

- Point Mimir/Loki/Tempo at real **object storage** so retention is a policy decision, not a disk limit.
- Alert on the signals that predict outages: MinIO PVC usage > 80%, CNPG `lastFailedBackup`, and the autoscaler's `lastReason` sitting at `maxWorkers reached`.

## Production readiness scorecards

The `application/scorecards` package grades every service 0–100 (A–F) from in-cluster signals; a CronJob runs every 30 minutes. Run it on demand:

```bash
kubectl -n adhar-system create job --from=cronjob/adhar-scorecard-scorer scorecard-now
kubectl -n adhar-system get configmap adhar-scorecards -o jsonpath='{.data.summary\.json}' | jq .
```

See [Platform Services](/docs/core-concepts/platform-services) for the full observability package list.
