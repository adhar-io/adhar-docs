---
title: "Observability"
section: "Operations"
order: 4
path: "/docs/operations/observability"
---

# Observability

Adhar collects metrics, logs, traces and cost through one contract (OpenTelemetry), stores them in one tier (the Grafana LGTM stack) and shows them in one place (Grafana). This page is for platform engineers who run that stack and developers who want their service visible in it. It covers how signals flow, what you get with no setup, the two things a service must do itself, and how to investigate, alert and size storage.

## At a glance

| | |
|---|---|
| **Collection** | Grafana Alloy (OTLP receiver, scraper, log tailer); Hubble for network flows |
| **Storage** | Prometheus (10d, pod-local), Mimir (long-term), Loki, Tempo, Pyroscope (opt-in) |
| **UX** | Grafana — metrics, logs, traces, profiles and cost, cross-linked |
| **Alert routing** | Alertmanager to the Console's Notification Center. Grafana OnCall ships for schedules and paging, but is not wired to Alertmanager by default |
| **Fleet (T3)** | Hub-and-spoke — spokes ship telemetry through Alloy and keep no stores of their own |
| **For your apps** | Free: pod logs, flows, Kubernetes state. Opt-in: a `ServiceMonitor` or an OTLP exporter |
| **Cost** | OpenCost for attribution; `adhar-cost-governance` records `adhar:namespace_cost_usd:*` from resource requests |

## How it works

```diagram
gd-observability-signals
```

Three decisions shape the design.

- **OpenTelemetry is the collection contract.** Workloads never talk to a storage backend. They send OTLP to Alloy, or expose `/metrics` for Alloy or Prometheus to scrape. The platform can change where data lands without touching an application.
- **The Grafana LGTM stack is storage and UX.** LGTM is Loki (logs), Grafana (the UI), Tempo (traces) and Mimir (long-term metrics); Pyroscope adds profiles. Loki and Mimir write to object storage, so their retention is a policy decision, not a disk limit. Tempo, as shipped, keeps traces on local storage for a short window (see [Retention](#retention-and-object-storage-sizing)).
- **Fleets are hub-and-spoke.** Workload clusters run no telemetry stores. Alloy is their only observability component, and everything flows to the management cluster's stores, stamped with a cluster name. One query spans the fleet.

> **Note:** The local profile enables only `kube-prometheus` and `metrics-server`, which gives you Prometheus, Grafana and Alertmanager. Alloy, Loki, Tempo and Mimir are production-profile packages. Enable them locally with `adhar stack enable` if you have the capacity (see [Customization](/docs/operations/customization)).

### Where Alloy sends data

The endpoints in the diagram are not compiled in. Alloy reads them, via `envFrom`, from the `observability-hub` ConfigMap in `adhar-system`. On the management cluster the defaults are in-cluster service URLs:

| Key | Default on the management cluster |
|---|---|
| `HUB_MIMIR_URL` | `http://mimir-gateway.adhar-system.svc.cluster.local:8080/api/v1/push` |
| `HUB_LOKI_URL` | `http://loki.adhar-system.svc.cluster.local:3100/loki/api/v1/push` |
| `HUB_TEMPO_URL` | `http://tempo.adhar-system.svc.cluster.local:4318` |
| `HUB_CLUSTER_NAME` | `management` |

> **Warning:** In-cluster, metrics must go through `mimir-gateway`, never straight to the distributor. Mimir runs multi-tenant, and the distributor answers `401 no org id` to any push without an `X-Scope-OrgID` header. Alloy sends none; the gateway's nginx injects the tenant. Grafana reads through the same gateway, so its datasource looks healthy even when every push is being refused.

### Shipping from a workload cluster

```diagram
nop-fleet-telemetry
```

On a spoke, override the same four keys with the hub's external Gateway URLs and the spoke's own name:

```yaml
# kubectl -n adhar-system edit configmap observability-hub   (on the SPOKE)
data:
  HUB_MIMIR_URL: https://mimir.platform.example.com/api/v1/push
  HUB_LOKI_URL: https://loki.platform.example.com/loki/api/v1/push
  HUB_TEMPO_URL: https://tempo.platform.example.com
  HUB_CLUSTER_NAME: wl-blr1
```

The hub's ingestion routes sit behind a Keycloak oauth2-proxy in bearer mode. A spoke must present an access token, obtained with `client_credentials` against the `mimir`, `loki` or `tempo` client.

## What ships enabled

The two profiles differ on purpose: the local core keeps a laptop usable.

| Package | Local | Prod | What it gives you |
|---|---|---|---|
| `observability/metrics-server` | on | on | `kubectl top`, HPA input |
| `observability/kube-prometheus` | on | on | Prometheus, Grafana, Alertmanager, and 100+ curated dashboards (the chart's own defaults are switched off) |
| `observability/alloy` | off | on | OTLP receiver, log shipping, hub forwarding |
| `loki` (`observability/loki-stack`) | off | on | Log storage |
| `observability/tempo` | off | on | Trace storage and span metrics |
| `observability/mimir` | off | on | Long-term metrics |
| `observability/hubble` | off | on | Network flow visibility |
| `observability/opencost`, `adhar-cost-governance` | off | on | Cost attribution and budget alerts |
| `observability/oncall` | off | on | Paging and schedules |
| `application/adhar-scorecards` | off | on | Production-readiness grades (see [Scorecards](#production-readiness-scorecards)) |
| `observability/beyla` | off | off | eBPF auto-instrumentation — opt-in |
| `observability/pyroscope` | off | off | Continuous profiling — opt-in |

## What you get with no setup

- **Pod logs.** Alloy tails every container's stdout and stderr. Before writing to Loki it labels each stream with `namespace`, `pod`, `container`, `node` and `app`, which is what makes namespace filtering and Grafana's log-volume panel work.
- **Kubernetes state and node metrics**, plus every platform component. Each package ships its own `ServiceMonitor` or `PodMonitor` and a Grafana dashboard.
- **Network flows** from Hubble (production profile): every connection and every policy verdict.
- **Cost**, attributed per namespace by OpenCost (production profile).
- **Automatic discovery.** Prometheus runs with `serviceMonitorSelector`, `podMonitorSelector` and `ruleSelector` all empty and `*NilUsesHelmValues: false`, so it picks up monitors and rules from any namespace with no extra label. The Grafana dashboard sidecar runs `searchNamespace: ALL` for the same reason.

## Instrument your service

A service has two things to do. Each is one object or one environment variable.

### Metrics: ship a ServiceMonitor

Expose `/metrics` on your Service's port, then commit this next to your Deployment. Services scaffolded from the web-service golden-path templates do not need one: they push metrics to Alloy over OTLP, as the next section describes.

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

### Traces, app metrics and logs: send OTLP to Alloy

Point your OpenTelemetry SDK at Alloy. Alloy fans the three signals out to Tempo, Mimir and Loki. This needs the production-profile packages (Alloy, Tempo, Mimir and Loki are off locally).

```yaml
env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: http://alloy.adhar-system.svc.cluster.local:4318
  - name: OTEL_SERVICE_NAME
    value: checkout
```

> **Note:** The stock Alloy chart publishes only its own `:12345`. Adhar adds `4317` and `4318` to both the container and the Service through `alloy.extraPorts`. If you run a stock Alloy chart elsewhere and OTLP does nothing, check the Service ports first.

To avoid code changes altogether, enable `observability/beyla`. It is eBPF auto-instrumentation that produces basic spans. It is off by default because it runs an agent on every node.

### Verify a service end to end

Verify at the reader, with a query that must return data. A healthy-looking configuration proves nothing.

1. **The monitor exists and selects your Service.**

   ```bash
   kubectl -n checkout get servicemonitor checkout
   kubectl -n checkout get svc -l app.kubernetes.io/name=checkout   # the selector must match
   ```

2. **Prometheus is scraping it.** Port-forward and ask for the target's `up` series.

   ```bash
   kubectl -n adhar-system port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 &
   adhar metrics list --query 'up{job="checkout"}' --prometheus-url http://localhost:9090
   ```

   **Check:** one series per pod with value `1`. No series means the selector missed. `0` means the target is down.

3. **Traces arrive in Tempo.** Send one real request, then search for it.

   ```bash
   kubectl -n adhar-system port-forward svc/tempo 3200:3200 &
   adhar traces search --tags 'service.name=checkout' --tempo-url http://localhost:3200
   ```

   **Check:** at least one trace for `checkout`. None usually means `OTEL_EXPORTER_OTLP_ENDPOINT` points somewhere other than Alloy on 4318.

4. **Logs carry Kubernetes labels.** In Grafana Explore, query Loki with `{namespace="checkout"}`.

   **Check:** lines appear and can be filtered by `pod` and `container`.

5. **The cross-links work.** Open a trace from step 3 and follow its link into Loki. The jump filters on `service.name` / `k8s.pod.name` and the trace ID within ±5 minutes.

   **Check:** matching log lines appear. If the result is empty while both stores have data, confirm that the spans carry `service.name` (set `OTEL_SERVICE_NAME`) and that your log lines include the trace ID.

## Use it

Every UI is behind Keycloak SSO on the platform host:

```text
https://grafana.<host>      dashboards, Explore, alerting
https://prometheus.<host>   raw PromQL (oauth2-proxy fronted)
https://hubble.<host>       live network flows
https://opencost.<host>     cost UI
https://oncall.<host>       schedules and escalation
```

### Investigate in Grafana

In **Explore**, the datasources are cross-linked, so one investigation follows one path:

```diagram
do-investigation
```

1. Start on a metric spike in `Prometheus` or `Mimir`. Exemplars carry a `trace_id` and render a **View trace** button into Tempo.
2. From the Tempo trace, `tracesToLogsV2` jumps to the Loki lines for that `service.name` / `k8s.pod.name` within ±5 minutes, filtered by trace ID. From a Loki line, the `TraceID` derived field goes back the other way.
3. Use Tempo's service map and node graph. They work out of the box, because Tempo's metrics generator is enabled and remote-writes span metrics and service graphs into Mimir.

### Investigate from the CLI

```bash
adhar get status                 # platform conditions + per-package health
adhar metrics list               # every ServiceMonitor the cluster knows about
adhar metrics alert              # firing and pending alerts from /api/v1/alerts
adhar metrics dashboard          # dashboards provisioned in the cluster
adhar traces search --tags 'service.name=checkout http.status_code=500' --tempo-url http://localhost:3200
adhar logs --namespace checkout --search "timeout" --lines 200
adhar cost                       # spend per namespace, against declared budgets
adhar cost breakdown             # split into CPU and memory
cilium status
hubble observe --since 5m --namespace checkout
```

> **Note:** Two CLI details to know.
>
> - `adhar metrics` and `adhar traces` default to service URLs that do not exist on an Adhar cluster (a `monitoring` namespace and old service names). Port-forward first, then pass `--prometheus-url` or `--tempo-url`. `adhar cost` needs no flag: it reaches Prometheus through the API server's service proxy, authorised by your own RBAC.
> - Filter traces with `--tags 'service.name=<name>'`. The `search` subcommand does not accept the `--service` and `--operation` flags shown in its help examples; it fails with `unknown flag: --service`.

## Add a dashboard

Dashboards are ConfigMaps. Grafana runs with `allowUiUpdates: false`, so anything saved in the UI is lost on the next pod restart. Export the JSON and commit it.

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

Pin panel datasources to the fixed UIDs: `prometheus`, `mimir`, `loki`, `tempo`, `pyroscope`, `alertmanager`. A dashboard that references a generated UID renders "datasource not found".

## Add an alert

Alerts are `PrometheusRule` objects, picked up from any namespace.

```diagram
nop-alert-routing
```

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
            runbook_url: https://wiki.example.com/runbooks/checkout-error-budget   # your own runbook
```

Routing is already wired:

| Behaviour | Shipped setting |
|---|---|
| Grouping | By `namespace` and `alertname` (`group_wait: 30s`, `group_interval: 5m`, `repeat_interval: 12h`) |
| Delivery | The Console's Notification Center, over an authenticated webhook |
| Heartbeat | `Watchdog` routes to `null` |
| Inhibition | `critical` inhibits `warning` and `info`; `warning` inhibits `info`, for the same namespace and alert name |

Grafana OnCall is installed in production for schedules and escalation, but no Alertmanager route sends to it. To page through OnCall, add an OnCall integration and an Alertmanager receiver for it.

## Retention and object-storage sizing

Loki and Mimir write to the platform's S3-compatible object store (RustFS), so growth costs storage, not availability. The shipped defaults:

| Store | Retention | Backing |
|---|---|---|
| Prometheus | `10d` | Pod-local `emptyDir` (no PVC by default), so a rescheduled pod starts empty; Mimir is the durable tier |
| Mimir | Object-store lifecycle | Buckets `mimir-blocks`, `mimir-ruler`, `mimir-alertmanager` |
| Loki | `retention_period: 720h` (30d) | Bucket `loki`, plus a 50Gi index/cache PVC |
| Tempo | `block_retention: 24h` | `local` backend inside the pod, no PVC — traces do not survive a pod restart. Point `storage.trace` at the object store if you need more |
| Alertmanager | `120h` | Pod-local (no PVC by default) — notification state, not telemetry |

> **Warning:** Keep Loki's PVC and its ingestion limits in proportion, and raise them together. Loki accepts `ingestion_rate_mb: 32` with 30 days of retention, and its index-shipper cache lives on the PVC. An undersized PVC does not degrade Loki, it stops it: the cache write hits `ENOSPC`, the store module fails to initialise (`err="short write"`), and `loki-0` enters `CrashLoopBackOff`. Grafana then reports "no Loki datasource configured" and "Log volume has not been configured" — configuration messages for a backend that is down.

## Alerts that predict outages

Alert on leading indicators, not on everything.

| Area | Alert on | Why it leads |
|---|---|---|
| ArgoCD | Apps `Degraded`/`OutOfSync` > 15 min | A stack push briefly flips many apps `OutOfSync`; a state that persists is a real sync failure |
| Databases | `lastFailedBackup` on any CNPG cluster | Your recovery point is already gone |
| Capacity | PVC usage > 80% (object store, Loki, backup targets) | A full volume stops the store (see the Loki warning above) |
| Capacity | Pods `Pending`; autoscaler `lastReason` at `maxWorkers reached` | The cluster wants to grow and is not allowed to |
| Edge | 5xx rate; certificate expiry < 21 days | Wildcard renewal is DNS-01 and fails quietly |
| Controllers | Reconcile error rate, workqueue depth | Reconciliation stops before anything looks unhealthy |
| Cilium | Agent health, policy-drop anomalies (Hubble) | Policy regressions read as application bugs |
| Cost | `AdharNamespaceBudgetWarning` at 80% of projected spend | 100% tells you after the money is spent |

### Cost budgets

Cost alerting is opt-in. `adhar-cost-governance` ships its budget rule group empty, so installing it pages nobody. Declare a budget to switch it on:

```yaml
# in the adhar.cost.budgets group of the adhar-cost-governance PrometheusRule
- record: adhar:namespace_budget_usd:monthly
  labels: {namespace: team-payments}
  expr: vector(500)
```

The figures are the cost of resource **requests**, not usage. Requests are what the scheduler reserves, and so what denies capacity to everyone else.

## Production readiness scorecards

The `application/adhar-scorecards` package grades every service 0–100 (A–F) from in-cluster signals:

- ArgoCD health and sync
- probes
- resource requests and limits
- no `:latest` tag
- Kyverno PolicyReport pass rate
- HTTPRoute exposure
- backup presence

A CronJob scores every 30 minutes. To run it on demand and read the result:

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
| Monitor exists, target `DOWN` | The app does not serve `/metrics` on that port | `kubectl port-forward svc/<svc> 8080:http` then `curl localhost:8080/metrics` |
| Monitor rejected on a fresh cluster | Prometheus Operator CRDs not installed yet | Add `argocd.argoproj.io/sync-wave: "10"` to every monitoring object |
| Traces missing although the app sends OTLP | Wrong endpoint, or Alloy's Service does not publish 4317/4318 | Use `http://alloy.adhar-system.svc.cluster.local:4318`; check `kubectl -n adhar-system get svc alloy` lists both ports |
| Spans arrive with no service name | `OTEL_SERVICE_NAME` unset | Set it — Alloy promotes `service.name` to the label dashboards key on |
| Grafana shows data, Mimir is empty | Pushed to the distributor, not `mimir-gateway` (`401 no org id`) | Fix `HUB_MIMIR_URL` in the `observability-hub` ConfigMap |
| "No Loki datasource configured" | Loki is down, not misconfigured | `kubectl -n adhar-system logs loki-0`; look for `short write`, then grow the PVC |
| Logs have no `namespace`/`pod` labels | The `discovery.relabel "pod_logs"` rules were dropped | Restore them in the Alloy config |
| Spoke invisible in Grafana | `HUB_*` still in-cluster, or no bearer on the ingestion route | Override the ConfigMap; supply a `client_credentials` token for the `mimir`/`loki`/`tempo` client |
| Dashboard edit vanished after a restart | `allowUiUpdates: false` — the UI is read-only by design | Export the JSON, commit it as a `grafana_dashboard: "1"` ConfigMap |
| Panels show "datasource not found" | Dashboard pins a generated UID | Repin to `prometheus` / `mimir` / `loki` / `tempo` / `pyroscope` |
| Alerts fire but nobody is told | Route lands on `null`, or the webhook token is missing | Check the route tree and `kubectl -n adhar-system get secret alertmanager-console-webhook` |
| Nothing pages through OnCall | No Alertmanager receiver targets OnCall by default | Add an OnCall integration and a matching receiver |
| `adhar traces search --service` fails with `unknown flag` | The flag is not registered on the `search` subcommand | Use `--tags 'service.name=<name>'` |

## Next steps

- [Platform Services](/docs/core-concepts/platform-services) — the full observability package list.
- [Production](/docs/operations/production) — sizing, HA, backup and the day-2 routine.
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup for the whole platform.
- [CLI Reference](/docs/reference/cli) — `adhar metrics`, `adhar traces`, `adhar logs`, `adhar cost`.
