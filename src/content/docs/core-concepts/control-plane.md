---
title: "Control Plane"
section: "Core Concepts"
order: 2
path: "/docs/core-concepts/control-plane"
---

# Control Plane

Adhar's control plane turns "my team needs a database / cache / bucket / cluster" from a ticket into a **Kubernetes API call**. It is built on **Crossplane v2**, in its namespaced form. It works like this:

1. A developer creates an ordinary object in their own namespace. Kubernetes RBAC governs who may do this.
2. The platform composes (builds) the real infrastructure behind that object. On a laptop, that is an in-cluster operator. In production, it is a managed cloud service.
3. The platform keeps reconciling it, so the real infrastructure keeps matching the request.

This page is for two readers:

- **If you *consume* the platform**, it shows every self-service API that ships, how to request one, where the credentials land and what happens when you delete it.
- **If you *run* the platform**, it explains how XRDs, Compositions and composition functions fit together, how the control plane is installed, and how to add an API of your own.

By the end, you will have requested a PostgreSQL database by hand and followed it down to the objects it produced. You will have bound its credentials, and you will know how to keep its data when you delete it.

## Why a control plane

Traditional provisioning means tickets, wait times and inconsistent results. Adhar instead extends the Kubernetes API server into a **universal control plane**. You declare the infrastructure you want as a Kubernetes object. The platform makes it real and keeps it that way. It reconciles continuously, the same way on every provider.

This design adds a layer between you and the infrastructure. Three properties make that layer worth it:

- **One contract, many implementations.** The `Database` API is the same on Kind, AWS, GCP and Azure. A label on the request picks the implementation, so the application's manifest never changes when the platform moves.
- **Ordinary Kubernetes governance.** Requests are namespaced objects. Kubernetes RBAC decides who may create a `Database`. The namespace's `ResourceQuota` limits how much they may ask for. The audit log records who did it. There is no custom admission layer and no separate portal permissions.
- **One path for every client.** `adhar database create`, the Adhar Console and `kubectl apply` all produce the **same** object. The CLI source states it directly: the selection contract is "shared by CLI and Console". A resource created one way cannot be told apart from one created another way.

## The building blocks

Crossplane has its own vocabulary. Six terms carry the whole page:

| Term | What it is | Where it lives in the repo |
|---|---|---|
| **XRD** (CompositeResourceDefinition) | The contract: the API's name, its schema, and its default implementation | `platform/controlplane/configuration/xrd/*.xrd.yaml` |
| **XR** (composite resource) | What you create — an instance of an XRD, such as `Database/payments-db` | Your team namespace |
| **Composition** | One implementation of an XRD, labelled so a request can select it | `configuration/compositions/<domain>/*.yaml` |
| **Composition function** | A step in a Composition's pipeline that renders resources (Go templates, KCL, Python) | `configuration/functions/functions.yaml` |
| **Composed resource** | What a Composition produces: either a native Kubernetes object (a CNPG `Cluster`, a `Secret`) or a **managed resource** (MR) that a provider turns into a cloud API call | The XR's namespace |
| **ClusterProviderConfig** | Cluster-scoped credentials a provider uses for every namespaced MR | `configuration/providers/` |

Several Compositions can implement the same XRD, one per provider or engine. The request's labels choose between them. **This is how Adhar does multi-cloud:** the same manifest lands on RDS, Cloud SQL or a local CloudNativePG cluster, depending on the selector.

```diagram
ds-composition-fanout
```

### Kinds are named after the thing

Every self-service kind lives in `platform.adhar.io/v1alpha1` and is named for what you get: `Database`, `Bucket`, `Application` — **not** `CompositeDatabase`. The `Composite*` names were retired on 2026-10-07. They are **rejected, not aliased**, and a test in the repo (`TestNoXRDKindCarriesTheCompositePrefix`) keeps it that way. If you have an older manifest, change the `kind`. `adhar application deploy --file` will tell you to.

The plain names have one cost: several share a short name with another API group.

- `Secret` and `Service` collide with core Kubernetes.
- `Cluster` and `Database` collide with CloudNativePG.
- `Application` collides with Argo CD.
- `Project` collides with Kargo.
- `Release` collides with provider-helm.
- `Restore` collides with Velero.

Nothing breaks, because the groups differ. But `kubectl get databases` may not show you what you meant. **Qualify the resource whenever it matters:**

```bash
kubectl get databases.platform.adhar.io -n team-payments     # the XR you requested
kubectl get databases.postgresql.cnpg.io -n team-payments    # CNPG's logical databases
kubectl explain databases.platform.adhar.io.spec.parameters  # the full request schema
```

## What Crossplane v2 changes

Adhar runs Crossplane **v2.4.2** (core) and uses its namespaced model everywhere. If you know Crossplane v1, these are the differences that matter. The control-plane conventions in `platform/controlplane/CONVENTIONS.md` enforce every one of them:

| v1 habit | v2 as Adhar uses it |
|---|---|
| Cluster-scoped XRs plus namespaced **Claims** | **XRs are namespaced** (`scope: Namespaced`) and created directly. There is no claim kind |
| `spec.compositionSelector` on the XR | Crossplane reads **`spec.crossplane.compositionSelector`** — a reserved stanza it injects into every XR. Never declare `spec.crossplane` in an XRD |
| Patch-and-transform `Resources` mode | **Pipeline mode only.** Compositions are function pipelines; `Composition` itself stays `apiextensions.crossplane.io/v1` (only the XRD moved to `/v2`) |
| Cluster-scoped MRs (`rds.aws.upbound.io`) | **Namespaced MRs** in `.m` groups — `rds.aws.m.upbound.io/v1beta1`, `kubernetes.m.crossplane.io/v1alpha1`, `helm.m.crossplane.io/v1beta1` |
| A `ProviderConfig` per namespace | One shared **`ClusterProviderConfig`**: `default` for each cloud family, `kubernetes-provider` and `helm-provider` for the in-cluster providers |
| `spec.deletionPolicy: Orphan` on an MR | **Not in the schema** — the apply fails with "field not declared in schema". Retention is `managementPolicies` without `Delete` |
| `connectionSecretKeys` and automatic propagation | **Removed.** A Composition that surfaces credentials writes a `Secret` explicitly |

Team XRs and their composed resources live in the **team's namespace**. So ordinary Kubernetes RBAC and quotas govern who may request what. Crossplane itself runs in `adhar-system` with every other platform component. There is no `crossplane-system` namespace.

## Anatomy of an XRD

An XRD is an OpenAPI schema with a name. This excerpt is from the real `database.xrd.yaml`, trimmed to the fields that explain the design:

```yaml
apiVersion: apiextensions.crossplane.io/v2      # XRDs moved to /v2 in Crossplane v2
kind: CompositeResourceDefinition
metadata:
  name: databases.platform.adhar.io             # must be <plural>.<group>
spec:
  group: platform.adhar.io
  scope: Namespaced                             # an XR lives in the requester's namespace
  names:
    kind: Database                              # named for the thing, not "CompositeDatabase"
    plural: databases
  # A request that selects nothing gets in-cluster CloudNativePG, which needs
  # no cloud credentials — a bare request can never reach for a cloud.
  defaultCompositionRef:
    name: database-local-cnpg
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                parameters:
                  type: object
                  required: [engine, engineVersion]
                  properties:
                    engine:
                      type: string
                      enum: [postgresql, mysql, mariadb, mongodb, redis, valkey]
                    engineVersion: { type: string, default: "16" }
                    storageSize:   { type: string, default: "10Gi" }
                    replicas:      { type: integer, minimum: 0, maximum: 5, default: 0 }
                    deletionPolicy:
                      type: string
                      enum: [Delete, Orphan]   # translated to managementPolicies below
                      default: Delete
            status:
              type: object
              properties:
                phase:    { type: string }     # Pending, Creating, Available, Modifying, Failed
                endpoint: { type: string }
                port:     { type: integer }
```

The real file's comments record two lessons. Learn both before you write an XRD of your own:

- **Undeclared fields are silently pruned.** The API server drops any field the structural schema does not declare. A Composition that reads that field sees nothing. `replicas` once had exactly this bug — "a request for replicas was silently ignored" — until it was declared.
- **Defaults are policy.** `engineVersion` defaults to `"16"` for the cloud Compositions. The local CNPG Composition deliberately ignores it and lets the operator choose its image. Deriving the image from that default once downgraded nine live databases from 18 to 16. Pin `imageName` when you need a specific build.

## Anatomy of a Composition

A Composition does three things. It names the XRD it implements, carries the labels a request selects on, and runs a pipeline of functions. This is the start of `database-local-cnpg`, the Composition a local `Database` uses:

```yaml
apiVersion: apiextensions.crossplane.io/v1     # Composition stays v1 in Crossplane v2
kind: Composition
metadata:
  name: database-local-cnpg
  labels:                                      # what a request's selector matches
    feature: database
    provider: local
    engine: postgresql
spec:
  compositeTypeRef:
    apiVersion: platform.adhar.io/v1alpha1
    kind: Database
  mode: Pipeline                               # the only mode in v2
  pipeline:
    - step: render
      functionRef:
        name: function-go-templating           # renders the CNPG Cluster, backup, extra DBs
      input:
        apiVersion: gotemplating.fn.crossplane.io/v1beta1
        kind: GoTemplate
        source: Inline
        inline:
          template: |
            {{- $xr := .observed.composite.resource -}}
            {{- $p := dig "spec" "parameters" dict $xr -}}
            {{- $instances := add 1 (int (dig "replicas" 0 $p)) -}}
            ---
            apiVersion: postgresql.cnpg.io/v1
            kind: Cluster
            metadata:
              name: {{ $xr.metadata.name }}
              annotations:
                gotemplating.fn.crossplane.io/composition-resource-name: db-cluster
            spec:
              instances: {{ $instances }}      # CNPG counts TOTAL instances
              # … storage, bootstrap, backup to the platform object store …
    - step: ready
      functionRef:
        name: function-auto-ready              # XR is Ready when every composed object is
```

The cloud Compositions use KCL instead of Go templates. That is where retention (whether the data outlives the request) is decided. From `database-aws-rds-postgresql`:

```python
# Namespaced (.m) managed resources have NO spec.deletionPolicy.
# Retention is expressed by withholding Delete from managementPolicies.
_retainOnDelete = (params.deletionPolicy or "Delete") in ["Orphan", "Retain"]
managementPolicies = ["Observe", "Create", "Update", "LateInitialize"] if _retainOnDelete else ["*"]
```

### The composition functions

Five functions are installed with the control plane (`configuration/functions/functions.yaml`). Reference them by `functionRef.name`:

| Function | Version | Used for |
|---|---|---|
| `function-kcl` | v0.12.1 | Cloud resources — RDS, Cloud SQL, Azure SQL — where logic and status mapping are easier in a typed language |
| `function-go-templating` | v0.12.1 | Most in-cluster Compositions: CNPG, Valkey, RustFS, Argo CD Applications |
| `function-patch-and-transform` | v0.10.7 | Declarative patching where a template would be overkill |
| `function-auto-ready` | v0.6.5 | Derives the XR's `Ready` from its composed resources; ends most pipelines |
| `function-python` | v0.4.0 | The day-2 Operations (backups, rotation, drift, drills) |

> Use the canonical name `function-go-templating`, not the legacy `fn-go-templating` that older docs mention.

## Every self-service API the platform ships

The control plane ships about **forty XRDs and sixty-odd Compositions**. To see the live list on your cluster, run `kubectl get xrd` and `kubectl get compositions --show-labels`. Every kind below has a working example under `examples/` in the platform repo. A test fails if one loses its example.

### Tenancy and delivery

| Kind | What you get | Implementations (Composition → selector) |
|---|---|---|
| `Organisation` | Tenant root: home namespace, Keycloak group, Gitea organisation | `organisation-local` |
| `Team` | The onboarding and isolation unit, with its Keycloak and Gitea groups | `team-local` |
| `Project` | Guard-railed namespace (quota, LimitRange, default-deny policy), RBAC bound to the team's group, Gitea repo, AppProject, Kargo project | `project-local` |
| `Environment` | A tiered dev/test/prod environment with quotas and default-deny network policy | `environment-local`, `environment-kubernetes` |
| `Application` | An Argo CD Application (plus Kargo Warehouse and Stages in the multi-environment shape) | `application-local-argocd` (`provider=local`), `application-multienv` (default), `application-argocd` |
| `Release` | One promotion of a piece of freight into one environment | `release-kargo` |
| `Repository` | A Gitea repository with its Harbor project and Nexus repositories | `repository-local` |
| `Pipeline` | A CI pipeline (clone → build → scan → sign → deploy) | `pipeline-local` (default), `pipeline-tekton`, `pipeline-argo-workflows` |
| `GitOps` | An Argo CD AppProject and the ApplicationSets that fill it | `gitops-argocd` |
| `Service`, `Scale`, `Webhook` | A Service with its ServiceMonitor; an HPA; platform events to your endpoint | `service-k8s`, `scale-hpa`, `webhook-k8s` |
| `AgentWorkload` | A governed AI agent: namespace, quota, egress policy, model and MCP-tool allow-lists | `agentworkload-kubernetes` |

### Backing services

| Kind | What you get | Implementations |
|---|---|---|
| `Database` | PostgreSQL (CNPG locally; RDS, Cloud SQL on a cloud), Valkey or Redis | `database-local-cnpg` (default), `database-local-valkey`, `database-local-redis`, `database-aws-rds-postgresql`, `database-gcp-cloudsql`, `database-azure-sql` |
| `Cache` | A team Valkey through the valkey-operator, with exporter and ServiceMonitor | `cache-local-valkey` |
| `Bucket` | An S3 bucket on RustFS with versioning, quota and lifecycle rule | `bucket-local-rustfs` |
| `Storage` | Object storage (`type: object`, RustFS) or a PersistentVolume | `storage-local-rustfs`, `storage-pv` |
| `NoSqlDatabase` | A MongoDB replica set with metrics, alerts, PDB and nightly dumps | `nosql-mongodb` |
| `GraphDatabase` | A Neo4j server with APOC, metrics and a nightly export | `graph-neo4j` |
| `Search` | An OpenSearch cluster with credentials, ISM policy and snapshots | `search-opensearch` |
| `Vector` | A Qdrant vector store with API keys and declared collections | `vector-qdrant` |
| `Messaging`, `Topic`, `Queue` | A Strimzi Kafka cluster; a topic on the shared cluster; a RabbitMQ queue with DLQ | `messaging-local-strimzi`, `topic-local-strimzi`, `queue-local-rabbitmq` |
| `Table` | An Iceberg table in the lakehouse, created with Trino DDL | `table-local-iceberg` |
| `Secret`, `SecretRotation` | A secret sourced from OpenBao via External Secrets; scheduled rotation | `secrets-external`, `secret-local`; `secretrotation-local`, `secretrotation-aws` |

### Clusters, observability and governance

| Kind | What you get | Implementations |
|---|---|---|
| `Cluster` | A real cloud cluster, a vcluster, or an adopted Kind cluster | `cluster-aws-eks` (default), `cluster-gcp-gke`, `cluster-azure-aks`, `cluster-digitalocean-doks`, `cluster-civo-k3s`, `vcluster`, `kind-kubernetes` |
| `Network` | A cloud VPC/VNet with subnets and flow logs | `network-aws-vpc` (default), `network-gcp-vpc`, `network-azure-vnet` |
| `Logging`, `Metrics`, `Trace`, `Health` | A Loki stack; scrape targets and alerts; a trace pipeline; synthetic checks | `logging-loki`, `metrics-prometheus`, `traces-jaeger`, `health-probe` |
| `CostTracker` | Cost attribution by namespace with budget alerts | `costtracker-opencost` |
| `CompliancePolicy` | Kyverno (or Gatekeeper) guardrails in audit or enforce mode | `compliancepolicy-local` (default), `policy-kyverno`, `policy-opa-gatekeeper` |
| `BackupPolicy`, `Restore` | A Velero schedule with retention; a restore from it | `backuppolicy-velero`, `restore-velero` |
| `AuthStack` | A Keycloak realm of your own: clients, groups, federation, policies | `authstack-keycloak` |
| `PlatformConfig` | Platform-wide settings published for workloads to read | `platformconfig-default` |

Kinds with no default (`Storage`, `Secret`, `Service`, `Restore` and a few others) must carry a selector. There is more than one sensible implementation, and the platform will not guess.

## A worked request: PostgreSQL for a team

This walk-through runs on a local platform from [Quick Start](/docs/getting-started/quick-start). On a cloud, change one label and the same steps produce RDS or Cloud SQL.

### 1. Have a namespace to request into

XRs are namespaced, so the team needs a namespace first. In practice, a `Project` creates it with quotas and RBAC already attached. For a quick experiment, a plain namespace is enough:

```bash
kubectl create namespace team-payments
```

### 2. Apply the request

This is a trimmed copy of `examples/database.yaml`, annotated:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Database
metadata:
  name: payments-db
  namespace: team-payments
spec:
  crossplane:                       # Crossplane v2's reserved stanza
    compositionSelector:
      matchLabels:
        provider: local             # aws | gcp on a cloud — nothing else changes
        engine: postgresql
  parameters:
    engine: postgresql
    engineVersion: "16"             # used by the cloud Compositions; CNPG picks its own image
    storageSize: 20Gi
    replicas: 1                     # read replicas beside the primary → 2 CNPG instances
    databaseName: payments
    credentials:
      masterUsername: payments
    additionalDatabases:            # a second logical DB is far cheaper than a second cluster
      - name: payments_audit
    backupSchedule: "0 30 1 * * *"  # SIX fields — the first is SECONDS
    deletionPolicy: Orphan          # honoured by the cloud Compositions (see below)
```

```bash
kubectl apply -f payments-db.yaml
```

The CLI produces the same object. On `adhar database`, `-n` means `--name`, not namespace. `--version` is required:

```bash
adhar database create --name payments-db --engine postgresql --version 16 \
  --size 20Gi --namespace team-payments
```

The CLI takes the `provider` label from the `ADHAR_PROVIDER` environment variable, which defaults to `local`. So on a cloud platform, `ADHAR_PROVIDER=aws adhar database create …` resolves the identical request to RDS.

### 3. Watch it compose

```diagram
cc-request-life
```

Crossplane then:

1. Validates the request against the XRD schema.
2. Matches the labels to `database-local-cnpg`.
3. Runs its pipeline.
4. Creates the results in `team-payments`.

```diagram
ds-composed-tree
```

Check each layer yourself rather than trusting a summary:

```bash
# the XR: SYNCED and READY columns, and which Composition was chosen
kubectl get databases.platform.adhar.io -n team-payments
kubectl describe databases.platform.adhar.io payments-db -n team-payments

# what it composed
kubectl get clusters.postgresql.cnpg.io,scheduledbackups.postgresql.cnpg.io \
  -n team-payments
kubectl get databases.postgresql.cnpg.io -n team-payments

# the CLI's own view
adhar database status payments-db --namespace team-payments
```

Success looks like `READY True` on the XR and a CNPG `Cluster` that reports its instances healthy. If that is not what you see, use `describe`. Its events name the Composition that was selected. Any composed object that is not ready yet is listed by its `composition-resource-name` (`db-cluster`, `db-scheduled-backup`, …).

## Connection Secrets

Crossplane v2 removed native connection-detail propagation from XRs. So **each Composition decides where credentials land**, and they do not all choose the same name. When you wire up an application, this is the most useful table on the page:

| Request | Secret | Written by | Keys |
|---|---|---|---|
| `Database`, local PostgreSQL | `<name>-app` | The CNPG operator, from the composed `Cluster` | CNPG's standard set, including `uri`, `host`, `port`, `username`, `password` |
| `Database`, local Valkey (what `adhar cache create` makes) | `<name>-app` | The Composition, as a composed `Secret` | `uri`, `host`, `port`, `engine` |
| `Database` on AWS, GCP or Azure | `<name>-db` (override with `spec.writeConnectionSecretToRef.name`) | The managed resource, via `writeConnectionSecretToRef` | The provider's connection details |
| `Bucket` (local RustFS) | Shown by `adhar bucket credentials <name>` | The Composition, as a composed `Secret` | `endpoint`, `bucket`, `region`, and `credentialsSecret` naming the store's credential Secret — referenced, not copied |

Bind a Secret into an application with the CLI. It adds the Secret as `envFrom` on the app's first container and rolls the Deployment:

```bash
adhar application bind payments-api payments-db --namespace team-payments
# on a cloud, the Secret is <name>-db — say so explicitly:
adhar application bind payments-api payments-db --secret payments-db-db --namespace team-payments
```

> **Do not set `credentialsSecret` on a database whose consumers read `<name>-app`.** If you give CNPG a bootstrap Secret, it stops publishing the generated one. Everything that mounts `<name>-app` then loses it. The XRD's own description warns about exactly this.

## Deleting, and keeping the data

Deleting an XR deletes what it composed. What happens to the *external* resource depends on the composed object's `managementPolicies` — the list of actions Crossplane may take on it:

| Request | On delete | How to keep the data |
|---|---|---|
| Cloud `Database` with `deletionPolicy: Delete` (the default) | Every MR carries `managementPolicies: ["*"]`; the cloud database is deleted. RDS takes a final snapshot unless `skipFinalSnapshot: true` | Set `deletionPolicy: Orphan` **before** deleting |
| Cloud `Database` with `deletionPolicy: Orphan` | MRs carry `["Observe","Create","Update","LateInitialize"]` — no `Delete` — so the MR goes and the cloud database stays | Re-adopt it later, or delete it in the provider console |
| `Cluster` on AWS | The EKS Composition always withholds `Delete` on the cluster's MRs | Clean up deliberately in the cloud account |
| Local `Database` (CNPG) | The CNPG `Cluster` is deleted with the XR. The Composition does **not** read `deletionPolicy` | Base backups and WAL go to `s3://adhar-backups/cnpg/<name>` on the platform object store, kept for `backupRetentionDays` (default 7) — restore with `adhar database restore` |

`managementPolicies` is the v2 mechanism for all of this. It is more expressive than the old boolean:

- `Observe` alone imports an existing resource read-only.
- Dropping `Update` freezes it.
- Dropping `Delete` orphans it.

## Two provisioning paths

Adhar deliberately keeps two paths that complement each other. The imperative path builds the management cluster. The declarative path lets that cluster manage everything else:

| Path | Surface | Used for |
|---|---|---|
| **Imperative** | A Go provider interface (`aws`, `azure`, `gcp`, `digitalocean`, `civo`, `kind`, `custom`) | Day-0 cluster creation and day-2 cluster ops from the CLI |
| **Declarative** | The Crossplane v2 control plane | Self-service infrastructure requested as ordinary Kubernetes objects |

The imperative path exists because a control plane cannot create the cluster it runs on. Once that cluster exists, everything else — including further clusters, through the `Cluster` API — is declarative.

## Install order

The `AdharPlatform` controller installs the control plane from manifests embedded in the binary. It does this **after** the GitOps ApplicationSet, so applications never wait on Crossplane. Within the control plane, the order is strict:

```diagram
ds-cp-install-order
```

Two choices in that order are deliberate:

- **An empty ProviderConfig list is a hard error.** The provider CRDs register a minute or two after the packages install. An earlier version treated "CRD not registered yet" as success. That produced live platforms with providers installed but no ProviderConfig at all, so they could not reconcile a single managed resource. The step now requires the CRDs and retries until they apply.
- **Only the active cloud's providers install.** Every upjet provider family registers hundreds of CRDs. AWS, Azure and GCP together come to about 3,000, which pushed a single control-plane node's API server into timeouts. Kind installs no cloud provider at all. You opt in to additional clouds from `configuration/providers/cloud/`.

## Extend it: add a self-service API

Adding a platform API is declarative and follows the conventions file.

**A new implementation of an existing API:** write one more Composition with the same `compositeTypeRef` and a distinguishing label. Consumers who select that label get it. Nobody else notices.

**A whole new API**, for example a `Queue` backed by something other than RabbitMQ:

1. **Define the XRD** in `configuration/xrd/`: `apiextensions.crossplane.io/v2`, `scope: Namespaced`, `metadata.name` equal to `<plural>.<group>`, a `defaultCompositionRef` if a safe default exists, and **no** `spec.crossplane` in the schema.
2. **Write one Composition per implementation** in `configuration/compositions/<domain>/`: `apiextensions.crossplane.io/v1`, `mode: Pipeline`, labels `feature: <domain>` and `provider: <name>`, ending in `function-auto-ready` unless it computes readiness itself.
3. **Use the namespaced MR groups** for anything external, with `providerConfigRef: { kind: ClusterProviderConfig, name: default }`. Express retention with `managementPolicies`, never `deletionPolicy`.
4. **Add an example** under `examples/`. `TestEveryPlatformObjectHasAnExample` and `TestExamplesMatchTheirSchema` will fail without one.
5. **Build and roll out.** The configuration is embedded into the binary at build time (`make build`). On a running platform, run `adhar upgrade` with the new binary. It clears the `controlPlaneApplied` gate for that pass and re-applies every XRD, Composition and Function server-side.

A minimal Composition skeleton:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: queue-local-nats                 # hypothetical — your implementation
  labels:
    feature: queue
    provider: local
    engine: nats
spec:
  compositeTypeRef:
    apiVersion: platform.adhar.io/v1alpha1
    kind: Queue
  mode: Pipeline
  pipeline:
    - step: render
      functionRef: { name: function-go-templating }
      input:
        apiVersion: gotemplating.fn.crossplane.io/v1beta1
        kind: GoTemplate
        source: Inline
        inline:
          template: |
            # emit native objects; omit metadata.namespace —
            # Crossplane applies the XR's namespace for you
    - step: ready
      functionRef: { name: function-auto-ready }
```

See [Customization](/docs/operations/customization#extend-the-infrastructure-apis) for the full workflow.

## Day-2 operations

Crossplane v2 adds `Operation`, `CronOperation` and `WatchOperation` (`ops.crossplane.io/v1alpha1`). They handle work that does not fit the "reconcile a desired state" model. They need the core flag `--enable-operations`, which the platform sets. Five ship in `configuration/operations/`, and all of them run `function-python`:

| Operation | Kind | Schedule | What it does |
|---|---|---|---|
| `adhar-daily-backup` | CronOperation | `0 2 * * *` | Emits a timestamped Velero `Backup` of `adhar-system` |
| `adhar-weekly-secret-rotation` | CronOperation | `0 3 * * 0` | Stamps the `force-sync` annotation on ExternalSecrets so they re-pull |
| `adhar-configmap-drift` | WatchOperation | On change | Records an observation whenever a ConfigMap labelled `adhar.io/managed=true` in `adhar-system` changes |
| `adhar-reconstructability-drill` (+ observer) | CronOperation + WatchOperation | `0 4 1 * *` | Creates a small Kind-backed drill `Cluster` and measures it against the one-hour rebuild target |
| `adhar-lakehouse-maintenance` | CronOperation | `0 3 * * *` | Asks the Iceberg catalog to plan and run table maintenance |

```bash
kubectl get cronoperations,watchoperations
kubectl get operations --sort-by=.metadata.creationTimestamp   # each run, with its output
```

## Debugging and verification

`adhar get status` reports platform health, including a `CrossplaneReady` condition. But it does **not** prove that Crossplane can provision. Confirm that the provider configs applied:

```bash
kubectl get clusterproviderconfigs.kubernetes.m.crossplane.io   # expect kubernetes-provider
kubectl get clusterproviderconfigs.helm.m.crossplane.io         # expect helm-provider
kubectl get clusterproviderconfigs.aws.m.upbound.io             # on AWS: expect default
kubectl get providers,functions                                 # all should be HEALTHY
```

If the first two return "No resources found", provisioning is broken. A provider showing **0 replicas** is not broken. Since Crossplane 2.4, safe-start provider runtimes scale to zero until one of their CRDs is actually used.

Then inspect a stuck request from the top down:


```bash
kubectl describe databases.platform.adhar.io payments-db -n team-payments   # events + unready resources
kubectl get compositions -l feature=database --show-labels                  # did any match your selector?
kubectl get managed                                                         # cloud MRs and their SYNCED/READY
kubectl -n adhar-system logs deploy/crossplane | grep payments-db           # composition errors
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `no matches for kind "CompositeDatabase"` | The `Composite*` kinds were renamed and are not aliased | Use `kind: Database` (and likewise `Application`, `Project`, …) |
| XR accepted but never composes; events say no Composition matched | Selector labels match nothing — e.g. `engine: postgresql` on Azure, whose Composition is labelled `engine=mssql` | `kubectl get compositions -l feature=database --show-labels` and fix the labels |
| `adhar cache create` on a cloud fails to match | There is no managed-cache Composition yet | Leave `adhar cache` on its default `--provider local` |
| `kubectl get database payments-db` returns the wrong object or nothing | `Database` also exists in `postgresql.cnpg.io` | Qualify: `databases.platform.adhar.io` |
| A field in your request has no effect | Undeclared in the XRD, so the API server pruned it | `kubectl explain databases.platform.adhar.io.spec.parameters`; fix the spelling |
| Composed MR fails with "field not declared in schema" | A Composition set `deletionPolicy` on a namespaced MR | Use `managementPolicies` without `Delete` |
| Every local request fails with "cannot patch resource … forbidden" | Composition RBAC did not apply | Check `status.crossplane.controlPlaneApplied` on the `AdharPlatform`; re-run `adhar up` |
| App cannot find `<name>-app` on a cloud | Cloud Compositions write `<name>-db` | `adhar application bind … --secret <name>-db` |
| Local database runs, but its backups and WAL archiving fail | The CNPG Composition reads object-store keys from a Secret named `root-creds` in the request's own namespace | Make `root-creds` available in that namespace (for example with an `ExternalSecret`), or set `enableBackup: false` for throwaway databases |
| Backup runs at the wrong time of day | A five-field cron in CNPG's six-field `backupSchedule` | Prefix seconds: `"0 30 1 * * *"` |

More failure signatures, including "zero ProviderConfigs", are in [Troubleshooting](/docs/reference/troubleshooting).

## Keep reading

- [Architecture](/docs/core-concepts/architecture) — how the control plane fits the whole platform and its reconcile loop
- [Your First Service](/docs/getting-started/first-service#give-your-app-a-backing-service) — request and bind a database from the CLI
- [Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service) — the full guide, end to end
- [Onboard a Team](/docs/guides/onboard-a-team) — `Organisation`, `Team` and `Project` in practice
- [Customization](/docs/operations/customization) — write your own XRDs and Compositions
