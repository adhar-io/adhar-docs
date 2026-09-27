---
title: "Platform Services"
section: "Core Concepts"
order: 4
path: "/docs/core-concepts/platform-services"
---

# Platform Services

Adhar ships a curated catalog of **91 open-source packages** (94 ApplicationSet entries). Locally a curated **32** are enabled; the production profile enables **76**. This page explains how packages work, how to reach them, and what's in the catalogue.

> 🧭 **Explore the ecosystem visually.** The [interactive Integrations explorer](/integrations) lets you search and filter every tool Adhar builds on, with logos and a description of how each one is used.

## What a "package" is

A package is a directory in the `adhar/packages` Git repo containing **pre-rendered manifests** plus a small contract. The Git diff *is* the cluster diff — there's no templating at apply time, so what you review is exactly what runs:

```text
platform/stack/packages/security/cert-manager/
├── adhar-package.yaml        # marketplace contract (name, category, description…)
├── values.yaml               # your configuration surface
├── generate-manifests.sh     # helm template … -f values.yaml > manifests/install.yaml
└── manifests/
    └── install.yaml          # what ArgoCD syncs (generated — never hand-edit)
```

## How packages are delivered

A single ArgoCD **ApplicationSet** turns every enabled entry into an Application and keeps it reconciled from Git:

```text
  adhar/packages (Git) ──▶ ApplicationSet ──▶ Application per enabled package ──▶ workloads
                                │                                                    │
                       enabled: "true" filter                          self-heal ◀───┘
```

Each entry is a list element:

```yaml
- name: "harbor"
  enabled: "false"        # ← the on/off gate
  namespace: "adhar-system"
  category: "application"
  manifestPath: "application/harbor/manifests"
```

The ApplicationSet is **selected by provider**: Kind uses the *local* profile (32 enabled), any cloud uses the *production* profile (76 enabled). Turning a package on is a one-line change plus `adhar upgrade` — full workflow in [Customization](/docs/operations/customization).

## Categories

| Category | Representative tools |
|---|---|
| **Core & infrastructure** | Kubernetes, Crossplane, ArgoCD, Backstage, Cilium, Gitea, Harbor, Kamaji, vCluster, Velero, External DNS |
| **Security & compliance** | Keycloak, OpenBao, Kyverno, Falco, Trivy, cert-manager, External Secrets, SPIFFE/SPIRE, Cosign, Tetragon, SealedSecrets |
| **Observability** | Prometheus, Grafana, Loki, Tempo, Mimir, Alloy, OpenTelemetry, Hubble, Pyroscope, Jaeger, AlertManager, OpenCost |
| **Delivery & CI/CD** | Tekton, Argo Workflows, Argo Rollouts, Argo Events, Kargo, Harbor, FluxCD, Knative, OpenFaaS, KEDA, buildpacks (kpack) |
| **Data & analytics** | CloudNativePG, MinIO, Kafka, Valkey, Trino, Iceberg, Spark, Airbyte, Metabase, PostHog, ClickHouse, Kubeflow |
| **AI (opt-in)** | agentgateway, vLLM, adhar-ai, MCP servers |
| **Developer experience** | Adhar Console (Backstage), Headlamp, Coder, LibreDB Studio |

The full, searchable list with logos and per-tool usage is on the [Integrations explorer](/integrations).

## Accessing services

Every UI is a subdomain of the platform host on the shared Cilium Gateway. Locally that's `https://<name>.adhar.localtest.me:8443`; in the cloud it's `https://<name>.<your-domain>` on 443. The authoritative list for your platform:

```bash
kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]
```

Commonly-used endpoints (local URLs shown):

| Service | URL | What it is |
|---|---|---|
| Adhar Console | `https://console.adhar.localtest.me:8443` | Developer portal: catalog, golden paths, scorecards, cloud shell |
| ArgoCD | `https://argocd.adhar.localtest.me:8443` | GitOps applications |
| Gitea | `https://gitea.adhar.localtest.me:8443` | Platform source of truth |
| Keycloak | `https://keycloak.adhar.localtest.me:8443` | Identity provider |
| Grafana | `https://grafana.adhar.localtest.me:8443` | Metrics, logs, traces, cost |
| Harbor | `https://harbor.adhar.localtest.me:8443` | Container registry (signed + scanned) |
| Headlamp | `https://headlamp.adhar.localtest.me:8443` | Kubernetes UI |
| Hubble | `https://hubble.adhar.localtest.me:8443` | Live network flows |

## Single sign-on

Every UI trusts the same Keycloak realm (`adhar`) — sign in once and the rest follow. Identity groups map to platform roles:

| Group | Grants |
|---|---|
| `platform-admin` | Gitea Owners, cluster-admin, full AI write tools |
| `platform-developer` | Gitea developers, `edit` |
| `platform-viewer` | Gitea viewers, `view` |

Retrieve credentials for any service with the CLI (never scrape them from pods):

```bash
adhar get secrets                 # everything the CLI knows about
adhar get secrets -p <service>    # argocd | gitea | keycloak | harbor | vault | postgres | redis | ...
```

## How your workloads use these services

The platform services aren't just dashboards — they're the runtime your apps build on:

- **Secrets** — reference an `ExternalSecret`; External Secrets fetches the value from OpenBao at runtime. Nothing sensitive lives in Git.
- **Registry** — images build and push to Harbor, scanned by Trivy and signed by Cosign; Kyverno gates what runs.
- **Observability** — metrics, logs, and traces are collected automatically; enabling a package means Grafana already sees it.
- **Policy** — Kyverno admits or rejects workloads; the denial message names the policy.
- **Self-service infrastructure** — request databases/caches/buckets as [Control Plane](/docs/core-concepts/control-plane) resources.

## Production readiness scorecards

The `application/scorecards` package grades every service 0–100 (A–F) from in-cluster signals; a CronJob runs every 30 minutes. Run it on demand:

```bash
kubectl -n adhar-system create job --from=cronjob/adhar-scorecard-scorer scorecard-now
kubectl -n adhar-system get configmap adhar-scorecards -o jsonpath='{.data.summary\.json}' | jq .
```

## Keep reading

- [Architecture](/docs/core-concepts/architecture) — how packages fit the four-layer design
- [Customization](/docs/operations/customization) — enable, configure, and add packages
- [Integrations explorer](/integrations) — the full searchable catalogue
