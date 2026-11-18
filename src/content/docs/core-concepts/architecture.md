---
title: "Architecture"
section: "Core Concepts"
order: 1
path: "/docs/core-concepts/architecture"
---

# Architecture

Adhar builds a complete Internal Developer Platform (IDP) from open-source components with one command, `adhar up`. It runs on a laptop or on any of six providers. This page explains how the platform is put together: the layers, the bootstrap, the GitOps loop that delivers every package, and the objects that drive it all.

It is for engineers who run or extend the platform. After reading it, you can look at a running platform's objects and predict what the controller will do next.

## How it works

Adhar starts in two phases. A short **imperative** phase lays the foundation. A **declarative** GitOps phase then delivers everything else and never stops.

```diagram
ncc-bootstrap
```

The split exists because a pure-GitOps system cannot bootstrap itself. ArgoCD cannot install the CNI (cluster network plugin) it needs to run, and the Git server it reads from does not exist yet. So `adhar up` installs just enough for GitOps to take over: the network, the GitOps engine and the Git server.

## Design principles

1. **Management cluster first.** One cluster is the source of truth. It hosts the Git server, the GitOps engine and the Crossplane control plane, and it provisions everything else, including other clusters.
2. **Bootstrap imperatively, operate declaratively.** `adhar up` runs a fixed, repeatable bootstrap, then hands off to GitOps for good.
3. **The platform is data, not code.** Packages and environments are pre-rendered YAML in Git. Turning on a capability is a one-line change.
4. **Standards over frameworks.** Gateway API for routing, OIDC for identity, OCI for artefacts, CRDs for APIs, MCP for agent tooling. Components are replaceable because the seams are standard.
5. **Secure by default, permissive by exception.**
6. **Everything observable**, by construction rather than per-component setup.
7. **Local–production parity.** Kind runs the same controllers, GitOps flow and package model as production. It is smaller, not different.

## The four layers

Each layer depends only on the layer below it, and each has a defined way to customise it.

```diagram
cc-layer-stack
```

| Layer | What it is | Managed by | You customise with |
|---|---|---|---|
| **L0 — Infrastructure** | Clusters, networks, load balancers, storage | Provider interface + Crossplane | Provider config, Compositions |
| **L1 — Foundation** | CNI, Gateway, GitOps engine, Git server, control plane | `AdharPlatform` controller (embedded manifests) | `AdharPlatform` spec, HA flags |
| **L2 — Platform Services** | 100+ packages across seven categories | ArgoCD ApplicationSet from Gitea | Package toggles, values, custom packages |
| **L3 — Developer Experience** | Console, CLI, dashboards, golden-path templates | GitOps packages + CLI releases | Templates, Backstage plugins |

### Foundation components

The foundation is pre-rendered, embedded in the `adhar` binary and applied with Server-Side Apply. Bootstrap fetches nothing from an upstream chart repository, so an unreachable repository cannot break it. The embedded manifests under `platform/controllers/adharplatform/resources/` pin every component.

| Component | Role |
|---|---|
| **Cilium** | CNI (eBPF), kube-proxy replacement, Gateway API, Hubble, network policy |
| **ArgoCD** | GitOps engine |
| **Gitea** | In-cluster Git server, the source of truth |
| **Crossplane** | Namespaced self-service infrastructure APIs |

Cilium is the whole network layer: the CNI, north-south routing through Gateway API (there is no separate ingress controller), flow observability (Hubble) and network policy. Transparent WireGuard encryption is available but **not** enabled by the shipped configuration; see [Security Best Practices](/docs/security/security-best-practices). Nothing can be scheduled until Cilium is installed, which is why it comes first.

## The AdharPlatform resource

One object drives the foundation. `adhar up` creates it, the controller reconciles it, and `adhar get status` reads it back. You rarely write it yourself, but its `status` is the platform's own record of how far bootstrap has got.

This is `examples/adharplatform.yaml`, trimmed:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: AdharPlatform
metadata:
  name: adhar
  namespace: adhar-system
spec:
  provider: gcp               # kind | aws | azure | gcp | do | civo | custom
  autoscaling:                # the platform's own node autoscaler
    enabled: true
    minWorkers: 2
    maxWorkers: 10            # the spend limit
  clusterMesh:                # this cluster's identity in a Cilium Cluster Mesh
    name: adhar-mgmt
    id: 1                     # management cluster is 1; data planes take 2 upwards
  buildCustomization:         # written by `adhar up`; treat as immutable
    protocol: https
    host: platform.example.com
    port: "443"
    clusterName: adhar-prod
    email: admin@example.com
    enableHAMode: true        # e.g. selects Crossplane's install-ha.yaml
    dnsProvider: civo
```

- `adhar up` writes `provider` for you. `kind` or an empty value selects the local profile; a provider it does not recognise becomes `custom`.
- **Treat `buildCustomization` as fixed once the cluster exists.** Every URL, ClusterIssuer and foundation manifest is rendered from it. The API does not stop you editing it, but an edit does not re-render what is already running. To change the host, rebuild the platform.

### Status gates

The status is a set of **gates**: checks that must pass before the controller moves on. Each gate is also surfaced as a Kubernetes condition.

| Status field | Set when | Condition |
|---|---|---|
| `status.gateway.available` | Gateway API CRDs, Cilium and the Cilium Gateway are up | `GatewayReady` |
| `status.ArgoCD.available` | ArgoCD is up | `ArgoCDReady` |
| `status.gitea.available` | Gitea is serving its API | `GiteaReady` |
| `status.gitea.repositoriesCreated` | The GitOps repositories are seeded | `GitOpsReady` |
| `status.crossplane.available` and `status.crossplane.controlPlaneApplied` | Crossplane core is up, and every XRD, Composition and ProviderConfig is applied (both are required) | `CrossplaneReady` |
| `status.gitOps` | Counts `applicationsTotal` and `applicationsHealthy` as the stack converges | None (informational) |
| All gates above except `status.gitOps` | Every gate has passed | `Ready` |

> **Note:** The `ArgoCD` key is capitalised, unlike its neighbours.

```bash
kubectl -n adhar-system get adharplatform adhar -o jsonpath='{.status.crossplane}{"\n"}'
kubectl -n adhar-system get adharplatform adhar \
  -o jsonpath='{range .status.conditions[*]}{.type}={.status}{"\n"}{end}'
```

## The reconcile loop

The `AdharPlatform` controller walks the same sequence of gates on every pass. It skips a gate that is already satisfied and does the work for the first one that is not. This makes `adhar up` **idempotent and resumable**: if a run is interrupted, the next run picks up at whichever gate was still pending.

```diagram
ds-reconcile-loop
```

A pass does this, top to bottom:

1. **Fetch and adopt.** Read `adhar-system/adhar`. A controller that starts without host configuration of its own (the in-cluster manager) adopts `spec.buildCustomization` from the resource.
2. **Short-circuit when done.** When the controller runs inside the CLI and the platform is already deployed with Crossplane's control plane applied, it skips straight to driving Applications to `Synced` and `Healthy`, then exits.
3. **Install the foundation.** If ArgoCD, the Gateway or Gitea is unavailable, install in order: Gateway API CRDs → Cilium → Cilium Gateway → (CNPG in HA mode) → ArgoCD → Gitea. Crossplane is deliberately **not** in this block.
4. **Start Crossplane early.** Apply the Crossplane core manifest on a best-effort basis, so its image pull overlaps the repository seeding.
5. **Apply the platform stack.** This step runs only when the controller has a local stack directory, that is, inside the CLI. Seed the GitOps repositories once (guarded by `repositoriesCreated`). Then apply ArgoCD's repository credentials and the ApplicationSets on **every** pass, so an ArgoCD that has lost its ApplicationSet corrects itself on the next run.
6. **Install Crossplane.** Install core, wait for it, then apply the control plane in strict order (see [Control Plane](/docs/core-concepts/control-plane#install-order)). This runs *after* the ApplicationSets, so a slow or failing Crossplane never stops packages from deploying.
7. **Requeue or exit.** Until `controlPlaneApplied` is true, requeue every 15 seconds. A failure records a reason on the status and requeues in 5 seconds. In watch mode, the controller keeps nudging Applications stuck on a comparison error. Run from the CLI, it exits once everything has converged.

### Where the controller runs

The same reconciler serves both phases, from two places:

| When | Where it runs | What it does |
|---|---|---|
| During `adhar up` | Inside the `adhar` CLI process | Reads the platform stack from the working tree and runs the full loop. Exits when the platform has converged or `--apps-timeout` (default `15m`) runs out. ArgoCD keeps reconciling packages after it exits |
| After `adhar up` | An in-cluster controller manager (a Deployment that runs `adhar controller`, with leader election) | Maintains the foundation of an already-seeded platform. It has no stack directory, so it skips step 5 |

The CLI always installs the in-cluster manager on a cloud or on-prem provider. On Kind, it is installed only with `adhar up --in-cluster`; otherwise, re-run `adhar up` to reconcile the foundation again.

Because the in-cluster manager never applies the stack, stack changes reach the cluster through `adhar upgrade`.

## The GitOps write path

After bootstrap, **Git is the only write path**: every change to the platform goes through a commit.

```diagram
ncc-gitops-path
```

The controller creates three repositories in the in-cluster Gitea, under the `adhar` organisation:

| Repository | Content | Consumed by |
|---|---|---|
| `adhar/packages` | One directory per package: pre-rendered manifests, `values.yaml`, marketplace contract. Seeded from the stack | The ApplicationSets |
| `adhar/environments` | Per-environment configuration (`local`, `dev`, `test`, `prod`). The `local` and `prod` files mirror the two ApplicationSets. Seeded from the stack | Kargo, the Console and `adhar stack` (the ApplicationSets use inline lists) |
| `adhar/adhar-templates` | Golden-path service templates: a pull mirror of `github.com/adhar-io/adhar-templates` | CLI `--template` and the Console's create wizard |

To change the platform, change the stack and run `adhar upgrade`. It re-applies the foundation, shows the stack diff, pushes the stack to Gitea and re-applies the ApplicationSet. If you edit an object that ArgoCD manages directly on the cluster, self-heal reverts the edit.

## The package model

The catalogue has **100+ packages**. Each is one element of an ArgoCD **ApplicationSet**, a resource that generates one ArgoCD Application per list entry. The controller selects the ApplicationSet file by provider:

| Provider | File | Enables |
|---|---|---|
| Kind, or unset | `adhar-appset-local.yaml` | A curated core. A single node cannot run the full catalogue |
| Any cloud or on-prem | `adhar-appset-production.yaml` | Most of the catalogue. Every disabled entry carries its reason inline |

Every package is wired in both files. Apart from a few template details, only the `enabled` flag differs. `adhar stack list --enabled` prints the live set for your profile.

Two more ApplicationSets are always applied:

- a **workload** set (`adhar-appset-workload.yaml`), which generates nothing until workload clusters register
- a **services** set (`adhar-services-appset.yaml`), which adopts any Gitea repository that has a `.adhar/app.yaml`

### An ApplicationSet entry

Each package is one list element. The generator's selector passes only elements whose `enabled` label is `"true"`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: helm-charts-production          # helm-charts-local for the local profile
  namespace: adhar-system
spec:
  generators:
    - list:
        elements:
          - name: "keycloak"
            enabled: "true"             # the on/off gate — a string, not a boolean
            namespace: "adhar-system"   # every platform package installs here
            category: "security"
            manifestPath: "security/keycloak/manifests"
      selector:
        matchLabels:
          enabled: "true"
  goTemplate: true
  template:
    metadata:
      name: "{{ .name }}"
      labels:
        adhar.io/package-name: "{{ .name }}"
        adhar.io/category: "{{ .category }}"
    spec:
      project: default
      destination:
        namespace: "{{ .namespace }}"
        server: https://kubernetes.default.svc
      sources:
        - path: "{{ .manifestPath }}"
          repoURL: http://gitea-http.adhar-system.svc.cluster.local:3000/adhar/packages
          targetRevision: main
      syncPolicy:
        automated:
          prune: true                   # disabling a package uninstalls it
          selfHeal: true                # hand edits are reverted
        syncOptions:
          - ServerSideApply=true
          - SkipDryRunOnMissingResource=true
```

The real file adds three things:

- **An `ignoreDifferences` list** for fields that controllers and admission webhooks add after ArgoCD applies an object. Ignoring them lets packages settle at `Synced` instead of flapping `OutOfSync`.
- **A retry policy with no limit** and a short backoff.
- **The in-cluster Gitea as the source**, not GitHub. ArgoCD always applies what the platform's own Git server holds.

See [Platform Services](/docs/core-concepts/platform-services) for the catalogue and [Customization](/docs/operations/customization) for how to change it.

### One namespace

Every platform package installs into **`adhar-system`**, alongside the foundation and Crossplane. Your applications get their own namespaces. Sharing one namespace keeps the platform easy to read, but it forces two rules on packages:

- **Rename colliding objects**, or make the packages mutually exclusive (for example `vault` ↔ `openbao`). `platform/stack/packages/CONFLICTS.md` lists the known collisions.
- **Set `enableServiceLinks: false`** on components that read configuration from environment variables. Otherwise Kubernetes injects service-link variables that a component can mistake for its own settings.

## What teams create: composite resources

Platform operators change the platform through the stack. Teams change *their* part of it through **composite resources**: namespaced request objects that Crossplane expands into the real resources behind them. `Application`, `Database`, `Project` and the rest of the [Control Plane](/docs/core-concepts/control-plane) APIs are all composite resources.

`adhar application deploy --repo …` creates exactly this object (from `examples/application.yaml`):

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Application
metadata:
  name: payments-api
  namespace: team-payments
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local              # selects application-local-argocd
  parameters:
    displayName: Payments API
    project: default
    source:
      repoURL: https://gitea.cloud.adhar.io/adhar/payments-api.git
      path: deploy
      targetRevision: main
    destination:
      namespace: team-payments
```

Crossplane turns it into an Argo CD `Application` in `adhar-system`. Because that crosses namespaces, the Argo CD object is wrapped in a provider-kubernetes `Object` and labelled with the source namespace, so the platform can trace it back. From there, the same GitOps loop that delivers the platform's packages delivers your application.

> **Note:** The kind `Application` also exists in Argo CD's API group. Qualify it on the command line: `kubectl get applications.platform.adhar.io -A`.

## Control plane and data plane

In the target design, **application workloads run only on data planes, and the control plane runs only fleet and platform services**. This is a mode you switch on, not the default. A fresh platform is a single cluster that plays both roles.

```diagram
ncc-planes
```

- `adhar upgrade split-planes` separates the two roles in staged, reversible steps.
- The Kyverno policy that enforces the split ships in `adhar-policy-packs`, which is disabled by default.
- The **`DataPlane` API** (`platform.adhar.io/v1alpha1`) manages a workload cluster's lifecycle: it provisions the cluster, registers it with ArgoCD, applies the agent profile and joins it to the mesh. It reports progress through the conditions `InfraReady`, `Registered`, `AgentsReady`, `MeshJoined`, `FleetJoined` and `Ready`.

### Three topologies

Moving from one topology to the next is a configuration change, not a redesign.

| Topology | Shape | When you get it |
|---|---|---|
| **T1 — Local** | One Kind cluster. The controller runs in the CLI and exits after convergence. Curated local core, self-signed TLS | Default on Kind |
| **T2 — Single-cluster production** | One cloud cluster runs platform and workloads. HA mode. The in-cluster controller keeps reconciling the foundation | Default on cloud providers |
| **T3 — Management + workload clusters** | A control plane governs a fleet of data planes | Opt-in |

For local–production parity, `adhar upgrade split-planes` can create a local data plane as a vcluster (a virtual cluster inside the host cluster) on the same Kind node. Applications then live in the vcluster and platform services on the host, so the logical split holds on a laptop. Scaling to T3 means *adding* physical data planes, not changing the architecture.

## Controllers

Adhar's own CRDs are reconciled by these controllers:

| Controller | Responsibility |
|---|---|
| **AdharPlatform** | Foundation lifecycle, GitOps setup, ApplicationSet apply, Crossplane install, health |
| **GitRepository** | Manages Git repositories across Gitea, GitHub, GitLab and Bitbucket |
| **CustomPackage** | Delivers user and team workloads as ArgoCD Applications through Gitea |
| **DataPlane** | Provisions, registers and governs workload clusters |
| **Node autoscaler** | Watches Pods and Nodes and scales the worker pool between `minWorkers` and `maxWorkers` |

Crossplane reconciles everything else (databases, buckets, projects, applications) against the XRDs, the API definitions on the control plane.

## Day-2 operations

Backup, upgrade, scaling, cost and removal are part of a capability's definition of done. The control plane ships scheduled Crossplane Operations:

- a daily Velero backup
- a weekly secret-rotation nudge
- ConfigMap drift recording
- nightly lakehouse maintenance
- a monthly reconstructability drill, measured against a one-hour rebuild target

Schedules are listed in [Control Plane](/docs/core-concepts/control-plane#day-2-operations); runbooks are in [Production](/docs/operations/production).

## Extend the platform

Because the platform is data, most extension is declarative:

| To | Do this |
|---|---|
| Turn a package on or off | `adhar stack enable <pkg>`, then `adhar upgrade` |
| Change a package's values | Edit `values.yaml`, re-render, commit |
| Add your own package | Add a directory with a marketplace contract, or deliver it as a `CustomPackage` |
| Add a self-service API | Write an XRD and a Composition on the [Control Plane](/docs/core-concepts/control-plane#extend-it-add-a-self-service-api) |
| Add a cloud provider | Implement the provider interface |

Full walkthroughs are in [Customization](/docs/operations/customization).

## The eight pillars

Every addition to Adhar is tested against eight pillars. A change that violates one needs an ADR (architecture decision record) that justifies the exception.

1. One command, whole platform.
2. Git is the only write path.
3. Self-service with guardrails.
4. Local–production parity is sacred.
5. Secure by default, not by add-on.
6. Observable by construction.
7. Day-2 is designed, not discovered.
8. 100% open source, no lock-in.

## Next steps

- [Control Plane](/docs/core-concepts/control-plane) — the Crossplane self-service APIs in depth
- [Platform Services](/docs/core-concepts/platform-services) — the package catalogue and how to change it
- [The 6 D's Framework](/docs/core-concepts/ds-framework) — the delivery lifecycle the platform supports
- [Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet) — the T3 topology in practice
