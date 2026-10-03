---
title: "Control Plane"
section: "Core Concepts"
order: 2
path: "/docs/core-concepts/control-plane"
---

# Control Plane

Adhar's control plane turns "my team needs a database / cache / bucket / cluster" from a ticket into a **Kubernetes API call**. It's built on **Crossplane v2** (namespaced) and lets developers request infrastructure as ordinary, RBAC-governed resources in their own namespace — the same object model, tooling, and audit trail as everything else in Kubernetes.

## Why a control plane

Traditional provisioning means tickets, wait times, and inconsistent results. Adhar instead extends the Kubernetes API server into a **universal control plane**: you declare the infrastructure you want as a Kubernetes object, and the platform makes it real and keeps it that way — reconciling continuously, across clouds, forever. It ships with **25 XRDs, 47 Compositions, and composition functions** covering databases, caches, buckets, clusters, networks, projects, and more.

## The four Crossplane concepts

| Concept | What it is |
|---|---|
| **Managed Resource (MR)** | A single external resource (an RDS instance, a bucket) |
| **Composite Resource (XR)** | The thing you create — a high-level request like `CompositeDatabase` |
| **CompositeResourceDefinition (XRD)** | The contract / schema for an XR |
| **Composition** | One implementation of an XRD (e.g. AWS RDS, GCP Cloud SQL, or in-cluster CNPG) |

Several Compositions can implement the same XRD — one per cloud — selected per request by labels. **This is how Adhar does multi-cloud:** the same manifest lands on RDS, Cloud SQL, or a local CNPG cluster depending on the selector.

```text
        CompositeDatabase (XRD)  ── the contract "a team can ask for a database"
              ├── Composition: aws-rds        (feature=database, provider=aws)
              ├── Composition: gcp-cloudsql    (feature=database, provider=gcp)
              └── Composition: cnpg            (feature=database, provider=kind)
                       ▲
             one request, selected by labels ─▶ lands on the right implementation
```

## What Crossplane v2 changes

Adhar uses Crossplane v2, whose namespaced model is a much better fit for an IDP:

- **XRs are namespaced** (`scope: Namespaced`) — you create the XR directly; Claims are gone.
- A team's XR and its managed resources live in the **team's namespace**, so ordinary **Kubernetes RBAC and quotas** govern who may request what — no custom admission layer.
- **Pipeline mode only** — Compositions are function pipelines (`function-kcl`, `function-auto-ready`, and others).
- Namespaced MRs use `.m` API groups (e.g. `rds.aws.m.upbound.io`) and reference a shared cluster-scoped `ClusterProviderConfig`.
- Namespaced MRs have **no `deletionPolicy`** — express retention with `managementPolicies` (omit `Delete` to retain).

## A request's life — a developer wants PostgreSQL

Apply a small namespaced resource:

```yaml
# in the team-orders namespace
apiVersion: platform.adhar.io/v1alpha1
kind: CompositeDatabase
metadata:
  name: orders-db
  namespace: team-orders
spec:
  crossplane:
    compositionSelector:
      matchLabels: { feature: database, provider: aws, engine: postgresql }
  parameters:
    engine: postgresql
    engineVersion: "16"
    storageSize: 50Gi
    multiAZ: true
```

> The composition selector lives at **`spec.crossplane.compositionSelector`** (the v2 reserved stanza), not `spec.compositionSelector`.

```diagram
cc-request-life
```

Change `provider: gcp` and the same manifest lands on Cloud SQL; locally it renders a CNPG cluster — the application never changes. Deleting the XR cascades to the managed resources (retention governed by `managementPolicies`).

## Composite APIs shipped

`CompositeCluster`, `CompositeApplication`, `CompositeDatabase`, `CompositeNetwork`, `CompositeLogging`, `CompositeEnvironment`, `CompositePlatformConfig`, `CompositeProject`, `CompositePipeline`, `CompositeStorage`.

Request them via YAML, or through the CLI:

```bash
adhar database create --name orders --engine postgresql
adhar cache create sessions --replicas 2
adhar bucket create uploads
adhar application bind my-app orders
```

## Two provisioning paths

Adhar deliberately keeps two complementary paths — the imperative one builds the management cluster, the declarative one lets that cluster manage everything else:

| Path | Surface | Used for |
|---|---|---|
| **Imperative** | A Go provider interface (`aws`, `azure`, `gcp`, `digitalocean`, `civo`, `kind`, `custom`) | Day-0 cluster creation and day-2 cluster ops from the CLI |
| **Declarative** | The Crossplane v2 control plane | Self-service infrastructure requested as ordinary Kubernetes objects |

## Install order

After the GitOps ApplicationSet is applied, the control plane comes up in a strict order (an empty ProviderConfig list is treated as a hard error, not a valid state):

```text
1. Crossplane core (--enable-operations)      6. Functions
2. wait for core Ready (up to 5 min)          7. Provider packages (kubernetes, helm)
3. Composition RBAC                            8. ClusterProviderConfigs  (STRICT)
4. XRDs                                         9. Operations (day-2)
5. Compositions                               10. Active cloud's provider + ProviderConfig
```

Only the active cloud family's providers install — all five clouds at once would register ~3000 CRDs and overwhelm one control plane.

## Extend it: add a self-service API

Adding a new platform API is declarative:

- **New implementation of an existing API** — write a new Composition (pipeline mode) that selects on your label; consumers are unchanged.
- **A whole new API** (e.g. `CompositeQueue`):
  1. Define an XRD in `configuration/xrd/` — `apiextensions.crossplane.io/v2`, `scope: Namespaced`, no claims.
  2. Write one Composition per implementation in `configuration/compositions/`.
  3. Follow the conventions: namespaced managed resources have **no `spec.deletionPolicy`** — express retention with `managementPolicies: ["Observe","Create","Update","LateInitialize"]`.
  4. Build and commit; ArgoCD rolls it out.

See [Customization](/docs/operations/customization#extend-the-infrastructure-apis).

## Day-2 operations

The control plane ships scheduled operations (Crossplane v2 `CronOperation`/`WatchOperation`): daily backups, weekly secret rotation, config-drift detection, and a monthly reconstructability drill — so backup, rotation, and recovery are part of the platform, not afterthoughts.

## Debugging & verification

`adhar get status` reports platform health but does **not** verify that Crossplane can actually provision. Confirm the provider configs applied:

```bash
kubectl get clusterproviderconfigs.kubernetes.m.crossplane.io
kubectl get clusterproviderconfigs.helm.m.crossplane.io
# per cloud family in use, e.g.:
kubectl get clusterproviderconfigs.aws.m.upbound.io
```

"No resources found" for every group means provisioning is broken. Inspect a stuck request with the usual Crossplane tools:

```bash
kubectl describe compositedatabase orders-db -n team-orders   # XR status + events
kubectl get managed -A                                         # all managed resources
```

See [Troubleshooting](/docs/reference/troubleshooting) for the "zero ProviderConfigs" and `deletionPolicy` fixes.

## Keep reading

- [Architecture](/docs/core-concepts/architecture) — how the control plane fits the whole platform
- [Your First Service](/docs/getting-started/first-service#give-your-app-a-backing-service) — request and bind a database
- [Customization](/docs/operations/customization) — write your own XRDs and Compositions
