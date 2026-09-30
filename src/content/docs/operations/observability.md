---
title: "Observability"
section: "Operations"
order: 4
path: "/docs/operations/observability"
---

# Observability

Most platforms bolt monitoring on per service, and every team solves label naming, trace propagation and retention again. Adhar is **observable by construction**: one collection contract (OpenTelemetry), one storage tier (the Grafana LGTM stack), one pane (Grafana). Enable a package and Grafana already sees it.

## At a glance

| | |
|---|---|
| **Collection** | Grafana Alloy (OTLP receiver, scraper, log tailer); Hubble for network flows |
| **Storage** | Prometheus (10d, local), Mimir (long-term), Loki, Tempo, Pyroscope |
| **UX** | Grafana — metrics, logs, traces, profiles and cost, cross-linked |
| **Alert routing** | Alertmanager to the Console's Notification Center; OnCall for paging |
| **Fleet (T3)** | Hub-and-spoke — spokes run Alloy only |
| **For your apps** | Free: pod logs, flows, Kubernetes state. Opt-in: a `ServiceMonitor` or an OTLP exporter |
| **Cost** | OpenCost, recorded into `adhar:namespace_cost_usd:*` |

## The model

Three decisions do most of the work.

**OpenTelemetry is the collection contract.** Workloads never talk to a storage backend. They talk to Alloy — over OTLP, or by exposing `/metrics` and letting Alloy or Prometheus scrape them. That indirection is what lets the platform change where data lands without touching a single application.

**The Grafana LGTM stack is storage and UX.** Loki for logs, Grafana for the pane, Tempo for traces, Mimir for long-term metrics, plus Pyroscope for profiles. All object-storage-backed, so retention is a policy decision rather than a disk limit.

**Hub-and-spoke for fleets.** Running a full LGTM stack per cluster gives you N panes of glass and N retention policies. So data planes run *only* Alloy, and everything flows to the management cluster's stores, stamped with a `cluster` label. One query spans the fleet.

### Signal flow

```text
  YOUR SERVICE                            PLATFORM COMPONENT
    | OTLP :4317 grpc / :4318 http          | /metrics
    | (traces + metrics + logs)             | (ServiceMonitor / PodMonitor)
    v                                       v
 +-----------------------------------------------------------------+
 | Grafana Alloy    (agent on every node, every cluster)            |
 |   otelcol.receiver.otlp .... 0.0.0.0:4317 / 0.0.0.0:4318         |
 |   prometheus.scrape ........ pods with prometheus.io/scrape=true |
 |   loki.source.kubernetes ... container stdout/stderr             |
 |                                                                  |
 |   relabels every stream with namespace/pod/container/node/app    |
 |   and stamps  external_labels { cluster = HUB_CLUSTER_NAME }     |
 +-----------------------------------------------------------------+
     | HUB_MIMIR_URL        | HUB_LOKI_URL        | HUB_TEMPO_URL
     | (mimir-gateway)      | (loki:3100)         | (tempo:4318)
     v                      v                     v
 +-----------+          +-----------+         +-----------+
 |   Mimir   |          |   Loki    |         |   Tempo   |
 +-----+-----+          +-----+-----+         +-----+-----+
       |                      |                     |
       |   +-------------+    |                     |
       |   | Prometheus  |    |   (span-metrics and service-graphs
       |   |  10d local  |    |    are remote-written Tempo -> Mimir)
       |   +------+------+    |                     |
       +----------+-----------+---------------------+
                             v
                      +-------------+
                      |   Grafana   |   fixed datasource UIDs:
                      +-------------+   prometheus | mimir | loki
                                        tempo | pyroscope
```

Those endpoints are not compiled in. They come from the `observability-hub` ConfigMap in `adhar-system`, which Alloy reads via `envFrom`. On the management cluster the defaults are in-cluster service URLs; on a spoke you override the same four keys with the hub's external Gateway URLs and the spoke's own name:

```yaml
# kubectl -n adhar-system edit configmap observability-hub   (on the SPOKE)
data:
  HUB_MIMIR_URL: https://mimir.platform.example.com/api/v1/push
  HUB_LOKI_URL: https://loki.platform.example.com/loki/api/v1/push
  HUB_TEMPO_URL: https://tempo.platform.example.com
  HUB_CLUSTER_NAME: wl-blr1
```

> **Non-obvious:** metrics go through `mimir-gateway`, never the distributor. Mimir runs multi-tenant, and the distributor answers `401 no org id` to any push without an `X-Scope-OrgID` header — which is every push Alloy makes. The gateway's nginx injects the tenant. This was live for months before it was caught, because Grafana read *through* the tenant-injecting gateway and looked fine while not one sample Alloy shipped had ever been accepted.

The hub's ingestion routes sit behind a Keycloak oauth2-proxy in bearer mode, so a spoke must present an access token obtained via `client_credentials` against the `mimir`, `loki` or `tempo` client.

## What ships enabled

The two profiles differ deliberately — the local core keeps a laptop usable.

| Package | Local | Prod | What it gives you |
|---|---|---|---|
| `observability/metrics-server` | on | on | `kubectl top`, HPA input |
| `observability/kube-prometheus` | on | on | Prometheus, Grafana, Alertmanager, 100+ dashboards |
| `observability/alloy` | off | on | OTLP receiver, log shipping, hub forwarding |
| `observability/loki-stack` | off | on | Log storage |
| `observability/tempo` | off | on | Trace storage and span metrics |
| `observability/mimir` | off | on | Long-term metrics |
| `observability/hubble` | off | on | Network flow visibility |
| `observability/opencost`, `adhar-cost-governance` | off | on | Cost attribution and budget alerts |
| `observability/oncall` | off | on | Paging and schedules |
| `observability/beyla` | off | off | eBPF auto-instrumentation — opt-in |
| `observability/pyroscope` | off | off | Continuous profiling — opt-in |

## What you get with zero setup

- **Pod logs.** Alloy tails every container's stdout/stderr and relabels each stream with `namespace`, `pod`, `container`, `node` and `app` before writing to Loki. Without those relabels Loki only gets `job`/`instance`, which makes namespace filtering and Grafana's log-volume panel useless.
- **Kubernetes state and node metrics**, plus every platform component — each package ships its own `ServiceMonitor`/`PodMonitor` and a Grafana dashboard.
- **Network flows** via Hubble: every connection and every policy verdict. **Cost**, attributed per namespace by OpenCost.
- **Automatic discovery.** Prometheus runs with `serviceMonitorSelector`, `podMonitorSelector` and `ruleSelector` all empty and `*NilUsesHelmValues: false`, so it picks up monitors and rules **anywhere in the cluster** with no extra label. The Grafana dashboard sidecar runs `searchNamespace: ALL` for the same reason.

## What needs instrumentation

Two things, and each is one object or one env var.

### Metrics: ship a ServiceMonitor

Expose `/metrics` on your Service's port, then commit this next to your Deployment. The golden-path skeletons already include it.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: checkout
  namespace: checkout
  annotations:
    argocd.argoproj.io/sync-wave: "10"   # CRDs may not exist on first boot
  labels:
    app.kubernetes.io/name: checkout
spec:
  jobLabel: app.kubernetes.io/name       # makes the Prometheus `job` label = checkout
  namespaceSelector:
    matchNames: [checkout]
  selector:
    matchLabels:
      app.kubernetes.io/name: checkout
  endpoints:
    - port: http
      path: /metrics
      interval: 60s
```

Confirm it landed:

```bash
adhar metrics list                      # every ServiceMonitor the cluster knows about
adhar metrics list --query 'up{job="checkout"}' \
  --prometheus-url http://localhost:9090
```

### Traces (and app metrics and logs) over OTLP

Point your OpenTelemetry SDK at Alloy. Nothing else is required — Alloy fans the three signals out to Tempo, Mimir and Loki for you.

```yaml
env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: http://alloy.adhar-system.svc.cluster.local:4318
  - name: OTEL_SERVICE_NAME
    value: checkout
```

> **Non-obvious:** the Alloy chart publishes only its own `:12345` by default. Adhar adds `4317`/`4318` to both the container and the Service through `alloy.extraPorts`. If you run a stock Alloy chart elsewhere, that Service port is the first thing to check when OTLP "silently" does nothing.

If you would rather not touch the code at all, enable `observability/beyla` — eBPF auto-instrumentation that produces basic spans with no application changes. It is off by default because it is a per-node agent with real cost.

## Using it

Every UI is behind Keycloak SSO on the platform host:

```text
https://grafana.<host>      dashboards, Explore, alerting
https://prometheus.<host>   raw PromQL (oauth2-proxy fronted)
https://hubble.<host>       live network flows
https://opencost.<host>     cost UI
https://oncall.<host>       schedules and escalation
```

In **Explore**, the datasources are cross-linked, so an investigation is one path rather than five tabs:

1. Start on a metric spike (`Prometheus` or `Mimir`). Exemplars carry a `trace_id` and render a **View trace** button into Tempo.
2. In the Tempo trace, `tracesToLogsV2` jumps to the Loki lines for that `service.name` / `k8s.pod.name` within ±5 minutes, filtered by trace ID. From a Loki line, the `TraceID` derived field goes back the other way.
3. Tempo's service map and node graph are on by default, because the metrics generator is enabled and remote-writes span metrics and service graphs into Mimir.

From the CLI:

```bash
adhar get status                 # platform conditions + per-package health
adhar metrics alert              # firing and pending alerts from /api/v1/alerts
adhar metrics dashboard          # dashboards provisioned in the cluster
adhar traces search --service checkout --tags 'http.status_code=500'
adhar logs --namespace checkout --search "timeout" --lines 200
adhar cost                       # spend per namespace, against declared budgets
adhar cost breakdown             # split into CPU and memory
cilium status
hubble observe --since 5m --namespace checkout
```

> `adhar metrics` and `adhar traces` default to service URLs that do not exist on an Adhar cluster. Pass `--prometheus-url` / `--tempo-url` explicitly, or port-forward first. `adhar cost` needs no flag — it reaches Prometheus through the API server's service proxy, authorised by your own RBAC.

## Adding a dashboard

Dashboards are ConfigMaps, not clicks. Grafana runs with `allowUiUpdates: false`, so anything saved in the UI is lost on the next pod restart — export the JSON and commit it instead.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adhar-dashboard-checkout
  namespace: adhar-system
  labels:
    grafana_dashboard: "1"          # the sidecar selects on this
  annotations:
    grafana_folder: "Application"   # Platform | Application
data:
  checkout.json: |
    { "title": "Checkout", "panels": [ ... ] }
```

Pin panel datasources to the fixed UIDs — `prometheus`, `mimir`, `loki`, `tempo`, `pyroscope`, `alertmanager`. They are fixed precisely so committed dashboards resolve; a dashboard referencing a generated UID renders "datasource not found".

## Adding an alert

Alerts are `PrometheusRule` objects, picked up from any namespace.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: checkout-slo
  namespace: checkout
  annotations: {argocd.argoproj.io/sync-wave: "10"}
spec:
  groups:
    - name: checkout.slo
      rules:
        - alert: CheckoutErrorBudgetBurn
          expr: |
            sum(rate(http_requests_total{job="checkout",code=~"5.."}[5m]))
            / sum(rate(http_requests_total{job="checkout"}[5m])) > 0.02
          for: 10m
          labels: {severity: critical}
          annotations:
            summary: checkout is serving >2% 5xx
            runbook_url: https://github.com/adhar-io/adhar/blob/main/docs/TROUBLESHOOTING.md
```

Routing is already wired: Alertmanager groups by `namespace` and `alertname` (`group_wait: 30s`, `group_interval: 5m`, `repeat_interval: 12h`) and delivers to the Console's Notification Center over an authenticated webhook. `Watchdog` — Alertmanager's own heartbeat — routes to `null`, and `critical` inhibits `warning` and `info` for the same namespace and alert name.

## Retention and object-storage sizing

Every store writes to the platform's S3-compatible object store, so growth costs storage rather than availability. Defaults as shipped:

| Store | Retention | Backing |
|---|---|---|
| Prometheus | `10d` | local PVC — the fast, cluster-local tier |
| Mimir | object-store lifecycle | buckets `mimir-blocks`, `mimir-ruler`, `mimir-alertmanager` |
| Loki | `retention_period: 720h` (30d) | bucket `loki`, plus a 50Gi index/cache PVC |
| Tempo | object-store lifecycle | platform object store |
| Alertmanager | `120h` | PVC — notification state, not telemetry |

Sizing is the part people get wrong. Loki accepts `ingestion_rate_mb: 32` and asks for 30 days, and its index-shipper cache lives on the PVC. **Keep the PVC and the ingestion limits in proportion, and raise them together.** A 10Gi claim under those limits did not degrade — Loki *died*: the cache write hit `ENOSPC`, the store module failed to initialise (`err="short write"`), and `loki-0` sat in `CrashLoopBackOff` for 29 restarts. Grafana's only symptoms were "no Loki datasource configured" and "Log volume has not been configured" — two *configuration* messages for a backend that was dead.

## The alerts that actually predict outages

Coverage is not the goal; leading indicators are.

| Area | Alert on | Why it leads |
|---|---|---|
| ArgoCD | apps `Degraded`/`OutOfSync` > 15 min | A push storm clears in ~10 min; longer is a real sync failure |
| Databases | `lastFailedBackup` on any CNPG cluster | Your recovery point is already gone |
| Capacity | PVC usage > 80% (object store, Loki, backup targets) | See the Loki failure above |
| Capacity | pods `Pending`; autoscaler `lastReason` at `maxWorkers reached` | The cluster wants to grow and is not allowed to |
| Edge | 5xx rate; certificate expiry < 21 days | Wildcard renewal is DNS-01 and fails quietly |
| Controllers | reconcile error rate, workqueue depth | Reconciliation stops before anything looks unhealthy |
| Cilium | agent health, policy drop anomalies (Hubble) | Policy regressions read as application bugs |
| Cost | `AdharNamespaceBudgetWarning` at 80% of projected spend | 100% tells you after the money is spent |

Cost alerting is opt-in by construction: `adhar-cost-governance` ships its budget rule group **empty**, so installing it cannot start paging anyone. Declare a budget to switch it on:

```yaml
# in the adhar.cost.budgets group of the adhar-cost-governance PrometheusRule
- record: adhar:namespace_budget_usd:monthly
  labels: {namespace: team-payments}
  expr: vector(500)
```

The figures are the cost of resource **requests**, not usage — what the scheduler reserves, and therefore what denies capacity to everyone else.

## Production readiness scorecards

The `application/adhar-scorecards` package grades every service 0–100 (A–F) from in-cluster signals — ArgoCD health and sync, probes, resource requests, no-`:latest`, Kyverno PolicyReport pass rate, HTTPRoute exposure, backup presence. A CronJob runs every 30 minutes; run it on demand with:

```bash
kubectl -n adhar-system create job \
  --from=cronjob/adhar-scorecard-scorer scorecard-now
kubectl -n adhar-system get configmap adhar-scorecards \
  -o jsonpath='{.data.summary\.json}' | jq .
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No metrics from my service | No `ServiceMonitor`, or its selector misses the Service labels | `adhar metrics list`; match `spec.selector.matchLabels` to the Service exactly |
| Monitor exists, target `DOWN` | The app doesn't serve `/metrics` on that port | `kubectl port-forward svc/<svc> 8080:http` then `curl localhost:8080/metrics` |
| Monitor rejected on a fresh cluster | Prometheus Operator CRDs not installed yet | Add `argocd.argoproj.io/sync-wave: "10"` to every monitoring object |
| Traces missing although the app sends OTLP | Wrong endpoint, or Alloy's Service doesn't publish 4317/4318 | Use `http://alloy.adhar-system.svc.cluster.local:4318`; check `kubectl -n adhar-system get svc alloy` lists both ports |
| Spans arrive with no service name | `OTEL_SERVICE_NAME` unset | Set it — Alloy promotes `service.name` to the label dashboards key on |
| Grafana shows data, Mimir is empty | Pushed to the distributor, not `mimir-gateway` (`401 no org id`) | Fix `HUB_MIMIR_URL` in the `observability-hub` ConfigMap |
| "No Loki datasource configured" | Loki is dead, not misconfigured | `kubectl -n adhar-system logs loki-0`; look for `short write`, then grow the PVC |
| Logs have no `namespace`/`pod` labels | The `discovery.relabel "pod_logs"` rules were dropped | Restore them in the Alloy config |
| Spoke invisible in Grafana | `HUB_*` still in-cluster, or no bearer on the ingestion route | Override the ConfigMap; supply a `client_credentials` token for the `mimir`/`loki`/`tempo` client |
| Dashboard edit vanished after a restart | `allowUiUpdates: false` — the UI is read-only by design | Export the JSON, commit it as a `grafana_dashboard: "1"` ConfigMap |
| Panels show "datasource not found" | Dashboard pins a generated UID | Repin to `prometheus` / `mimir` / `loki` / `tempo` / `pyroscope` |
| Alerts fire but nobody is told | Route lands on `null`, or the webhook token is missing | Check the route tree and `kubectl -n adhar-system get secret alertmanager-console-webhook` |

## See also

- [Platform Services](/docs/core-concepts/platform-services) — the full observability package list
- [Production](/docs/operations/production) — sizing, HA, backup and the day-2 routine
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup for the whole platform
- [CLI Reference](/docs/reference/cli) — `adhar metrics`, `adhar traces`, `adhar logs`, `adhar cost`
