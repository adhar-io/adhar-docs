---
title: "Observability"
section: "Operations"
order: 4
path: "/docs/operations/observability"
---

# Observability

Most platforms bolt monitoring on per service, so every team solves label naming, trace propagation and retention again. Adhar is **observable by construction**:

- one collection contract (OpenTelemetry)
- one storage tier (the Grafana LGTM stack)
- one pane (Grafana)

Enable a package and Grafana already sees it.

This page is for platform engineers running the stack and developers who want their service visible in it. It explains:

- how signals flow
- what you get for free
- the two things a service has to do itself
- how to investigate an incident across metrics, traces and logs
- which alerts actually predict outages

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

## The model

Three decisions do most of the work.

**OpenTelemetry is the collection contract.** Workloads never talk to a storage backend. They talk to Alloy, either over OTLP or by exposing `/metrics` for Alloy or Prometheus to scrape. This indirection lets the platform change where data lands without touching a single application.

**The Grafana LGTM stack is storage and UX.** LGTM stands for Loki (logs), Grafana (the pane), Tempo (traces) and Mimir (long-term metrics); Pyroscope adds profiles. Loki and Mimir write to object storage, so their retention is a policy decision rather than a disk limit. Tempo, as shipped, keeps traces on local storage for a short window (see [Retention](#retention-and-object-storage-sizing)).

**Hub-and-spoke for fleets.** A full LGTM stack per cluster would give you N panes of glass and N retention policies. So data planes (workload clusters) run no telemetry stores: Alloy is their only observability component. Everything flows to the management cluster's stores, stamped with a cluster name. One query spans the fleet.

> **Local profile:** only `kube-prometheus` and `metrics-server` are on locally. Alloy, Loki, Tempo and Mimir are production-profile packages. On a laptop you get Prometheus, Grafana and Alertmanager; enable the others with `adhar stack enable` if you have the capacity (see [Customization](/docs/operations/customization)).

### Signal flow

```diagram
gd-observability-signals
```

Those endpoints are not compiled in. They come from the `observability-hub` ConfigMap in `adhar-system`, which Alloy reads via `envFrom`. On the management cluster the defaults are in-cluster service URLs. On a spoke, override the same four keys with the hub's external Gateway URLs and the spoke's own name:

```yaml
# kubectl -n adhar-system edit configmap observability-hub   (on the SPOKE)
data:
  HUB_MIMIR_URL: https://mimir.platform.example.com/api/v1/push
  HUB_LOKI_URL: https://loki.platform.example.com/loki/api/v1/push
  HUB_TEMPO_URL: https://tempo.platform.example.com
  HUB_CLUSTER_NAME: wl-blr1
```

> **Non-obvious:** in-cluster, metrics go through `mimir-gateway`, never straight to the distributor. Mimir runs multi-tenant. The distributor answers `401 no org id` to any push without an `X-Scope-OrgID` header, and that is every push Alloy makes. The gateway's nginx injects the tenant.
>
> This bug was live for months before it was caught. Grafana read *through* the tenant-injecting gateway and looked fine, while not one sample Alloy shipped had ever been accepted.

The hub's ingestion routes sit behind a Keycloak oauth2-proxy in bearer mode. So a spoke must present an access token, obtained via `client_credentials` against the `mimir`, `loki` or `tempo` client.

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
| `application/adhar-scorecards` | off | on | Production-readiness grades (see below) |
| `observability/beyla` | off | off | eBPF auto-instrumentation — opt-in |
| `observability/pyroscope` | off | off | Continuous profiling — opt-in |

## What you get with zero setup

- **Pod logs.** Alloy tails every container's stdout/stderr. Before writing to Loki, it relabels each stream with `namespace`, `pod`, `container`, `node` and `app`. Without those relabels Loki only gets `job`/`instance`, and namespace filtering and Grafana's log-volume panel become useless.
- **Kubernetes state and node metrics**, plus every platform component. Each package ships its own `ServiceMonitor`/`PodMonitor` and a Grafana dashboard.
- **Network flows** via Hubble (production profile): every connection and every policy verdict.
- **Cost**, attributed per namespace by OpenCost (production profile).
- **Automatic discovery.** Prometheus runs with `serviceMonitorSelector`, `podMonitorSelector` and `ruleSelector` all empty and `*NilUsesHelmValues: false`. So it picks up monitors and rules **anywhere in the cluster**, with no extra label. The Grafana dashboard sidecar runs `searchNamespace: ALL` for the same reason.

## What needs instrumentation

Two things, and each is one object or one env var.

### Metrics: ship a ServiceMonitor

Expose `/metrics` on your Service's port, then commit this next to your Deployment. The `microservice`, `frontend`, `data-pipeline` and `ml` golden-path skeletons already include one.

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

Point your OpenTelemetry SDK at Alloy. Nothing else is required. Alloy fans the three signals out to Tempo, Mimir and Loki for you. (This needs the production-profile packages: Alloy, Tempo, Mimir and Loki are off locally.)

```yaml
env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: http://alloy.adhar-system.svc.cluster.local:4318
  - name: OTEL_SERVICE_NAME
    value: checkout
```

> **Non-obvious:** the Alloy chart publishes only its own `:12345` by default. Adhar adds `4317`/`4318` to both the container and the Service through `alloy.extraPorts`. If you run a stock Alloy chart elsewhere and OTLP "silently" does nothing, check that Service port first.

If you would rather not touch the code at all, enable `observability/beyla`. It is eBPF auto-instrumentation that produces basic spans with no application changes. It is off by default because it is a per-node agent with real cost.

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

```diagram
do-investigation
```

1. Start on a metric spike (`Prometheus` or `Mimir`). Exemplars carry a `trace_id` and render a **View trace** button into Tempo.
2. In the Tempo trace, `tracesToLogsV2` jumps to the Loki lines for that `service.name` / `k8s.pod.name` within ±5 minutes, filtered by trace ID. From a Loki line, the `TraceID` derived field goes back the other way.
3. Use Tempo's service map and node graph. They are on by default, because the metrics generator is enabled and remote-writes span metrics and service graphs into Mimir.

From the CLI:

```bash
adhar get status                 # platform conditions + per-package health
adhar metrics alert              # firing and pending alerts from /api/v1/alerts
adhar metrics dashboard          # dashboards provisioned in the cluster
adhar traces search --tags 'service.name=checkout http.status_code=500' --tempo-url http://localhost:3200
adhar logs --namespace checkout --search "timeout" --lines 200
adhar cost                       # spend per namespace, against declared budgets
adhar cost breakdown             # split into CPU and memory
cilium status
hubble observe --since 5m --namespace checkout
```

> `adhar metrics` and `adhar traces` default to service URLs that do not exist on an Adhar cluster (a `monitoring` namespace and old service names). Port-forward first, then pass `--prometheus-url` / `--tempo-url` explicitly. `adhar cost` needs no flag. It reaches Prometheus through the API server's service proxy, authorised by your own RBAC.
>
> Filter traces with `--tags`. The `--service` and `--operation` flags shown in `adhar traces search --help` examples are not accepted by the `search` subcommand in current releases (it fails with `unknown flag: --service`), so use `--tags 'service.name=<name>'` instead.

## Verify a service end to end

"Configured" is not "working". The platform learned that the hard way: Alloy shipped metrics that Mimir refused for months, while Grafana looked fine. Verify at the **reader**, with a query that must return data.

1. **The monitor exists and selects your Service.**

   ```bash
   kubectl -n checkout get servicemonitor checkout
   kubectl -n checkout get svc -l app.kubernetes.io/name=checkout   # the selector must match
   ```

2. **Prometheus is scraping it.** Port-forward and ask for the target's `up` series:

   ```bash
   kubectl -n adhar-system port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 &
   adhar metrics list --query 'up{job="checkout"}' --prometheus-url http://localhost:9090
   ```

   *Success:* one series per pod with value `1`. No series means the selector missed. `0` means the target is down.

3. **Traces arrive in Tempo.** Send one real request, then search for it:

   ```bash
   kubectl -n adhar-system port-forward svc/tempo 3200:3200 &
   adhar traces search --tags 'service.name=checkout' --tempo-url http://localhost:3200
   ```

   *Success:* at least one trace for `checkout`. Nothing at all usually means `OTEL_EXPORTER_OTLP_ENDPOINT` points somewhere other than Alloy on 4318.

4. **Logs carry Kubernetes labels.** In Grafana Explore, query Loki with `{namespace="checkout"}`. *Success:* lines appear and can be filtered by `pod` and `container`.

5. **The cross-links work.** Open a trace from step 3 and follow its link into Loki. The jump filters on `service.name` / `k8s.pod.name` and the trace ID within ±5 minutes. If it comes back empty while both stores have data, check two things:

   - the spans carry `service.name` (set `OTEL_SERVICE_NAME`)
   - your log lines include the trace ID

## Adding a dashboard

Dashboards are ConfigMaps, not clicks. Grafana runs with `allowUiUpdates: false`, so anything saved in the UI is lost on the next pod restart. Export the JSON and commit it instead.

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

Pin panel datasources to the fixed UIDs: `prometheus`, `mimir`, `loki`, `tempo`, `pyroscope`, `alertmanager`. They are fixed so that committed dashboards resolve. A dashboard that references a generated UID renders "datasource not found".

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
            runbook_url: https://wiki.example.com/runbooks/checkout-error-budget   # your own runbook
```

Routing is already wired:

- Alertmanager groups by `namespace` and `alertname` (`group_wait: 30s`, `group_interval: 5m`, `repeat_interval: 12h`).
- It delivers to the Console's Notification Center over an authenticated webhook.
- `Watchdog`, Alertmanager's own heartbeat, routes to `null`.
- `critical` inhibits `warning` and `info`, and `warning` inhibits `info`, for the same namespace and alert name.

Grafana OnCall is installed in production for schedules and escalation, but no Alertmanager route sends to it out of the box. To page through OnCall, add an OnCall integration and an Alertmanager receiver for it.

## Retention and object-storage sizing

Loki and Mimir write to the platform's S3-compatible object store (RustFS), so growth costs storage rather than availability. The shipped defaults:

| Store | Retention | Backing |
|---|---|---|
| Prometheus | `10d` | pod-local `emptyDir` (no PVC by default), so a rescheduled pod starts empty; Mimir is the durable tier |
| Mimir | object-store lifecycle | buckets `mimir-blocks`, `mimir-ruler`, `mimir-alertmanager` |
| Loki | `retention_period: 720h` (30d) | bucket `loki`, plus a 50Gi index/cache PVC |
| Tempo | `block_retention: 24h` | `local` backend inside the pod, no PVC — traces do not survive a pod restart. Point `storage.trace` at the object store if you need more |
| Alertmanager | `120h` | pod-local (no PVC by default) — notification state, not telemetry |

Sizing is the part people get wrong. Loki accepts `ingestion_rate_mb: 32` and asks for 30 days, and its index-shipper cache lives on the PVC. **Keep the PVC and the ingestion limits in proportion, and raise them together.**

A 10Gi claim under those limits did not degrade. Loki *died*:

- the cache write hit `ENOSPC`
- the store module failed to initialise (`err="short write"`)
- `loki-0` sat in `CrashLoopBackOff` for 29 restarts

Grafana's only symptoms were "no Loki datasource configured" and "Log volume has not been configured". Those are two *configuration* messages for a backend that was dead.

## The alerts that actually predict outages

Coverage is not the goal. Leading indicators are.

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

Cost alerting is opt-in by construction. `adhar-cost-governance` ships its budget rule group **empty**, so installing it cannot start paging anyone. Declare a budget to switch it on:

```yaml
# in the adhar.cost.budgets group of the adhar-cost-governance PrometheusRule
- record: adhar:namespace_budget_usd:monthly
  labels: {namespace: team-payments}
  expr: vector(500)
```

The figures are the cost of resource **requests**, not usage. That is what the scheduler reserves, and so what denies capacity to everyone else.

## Production readiness scorecards

The `application/adhar-scorecards` package grades every service 0–100 (A–F) from in-cluster signals:

- ArgoCD health and sync
- probes
- resource requests and limits
- no-`:latest`
- Kyverno PolicyReport pass rate
- HTTPRoute exposure
- backup presence

A CronJob runs every 30 minutes. To run it on demand:

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
| Nothing pages through OnCall | No Alertmanager receiver targets OnCall by default | Add an OnCall integration and a matching receiver |
| `adhar traces search --service` fails with `unknown flag` | The flag is not registered on the `search` subcommand | Use `--tags 'service.name=<name>'` |

## See also

- [Platform Services](/docs/core-concepts/platform-services) — the full observability package list
- [Production](/docs/operations/production) — sizing, HA, backup and the day-2 routine
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup for the whole platform
- [CLI Reference](/docs/reference/cli) — `adhar metrics`, `adhar traces`, `adhar logs`, `adhar cost`
