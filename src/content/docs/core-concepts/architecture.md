---
title: "Architecture"
section: "Core Concepts"
order: 1
path: "/docs/core-concepts/architecture"
---

# Architecture

Adhar's goal is to be the **open foundation for platform engineering**: one command (`adhar up`) produces a complete Internal Developer Platform built entirely from open-source components, on any of six providers or a local machine. This page is the tour of how it is designed and why.

It is written for the engineer who will run or extend the platform. It starts with the principles and the four layers, then follows the objects that actually drive the system — the `AdharPlatform` resource, the controller that reconciles it, the ApplicationSet that delivers every package, and the composite resources teams create — with the real manifests for each. By the end you should be able to read a running platform's state from its objects and predict what the controller will do next.

## Design principles

Everything below follows from seven principles:

1. **Management cluster first.** One cluster is the source of truth — it hosts the Git server, the GitOps engine, and the Crossplane control plane that provisions everything else, including other clusters.
2. **Bootstrap imperatively, operate declaratively.** A pure-GitOps system cannot bootstrap itself (ArgoCD cannot install the CNI it needs; the Git server does not exist yet). So `adhar up` runs a deterministic bootstrap, then hands off to GitOps for good.
3. **The platform is data, not code.** Packages and environments are declarative YAML in Git, pre-rendered — enabling a capability is a one-line change, not a code change.
4. **Standards over frameworks.** Gateway API, OIDC, OCI, CRDs, OpenTelemetry, MCP — portable seams, no lock-in.
5. **Secure by default, permissive by exception.**
6. **Everything observable** — by construction, not per-component setup.
7. **Local–production parity is sacred.** Kind runs the same controllers, GitOps flow, and package model as production — smaller, not different.

## The four layers

Each layer depends only on the one below it, and each has a defined customization surface.

```diagram
cc-layer-stack
```

| Layer | What it is | Managed by | You customize with |
|---|---|---|---|
| **L0 — Infrastructure** | Clusters, networks, load balancers, storage | Provider interface + Crossplane | Provider config, Compositions |
| **L1 — Foundation** | CNI, Gateway, GitOps engine, Git server, control plane | AdharPlatform controller (embedded manifests) | `AdharPlatform` spec, HA flags |
| **L2 — Platform Services** | 100+ packages across seven categories | ArgoCD ApplicationSet from Gitea | Package toggles, values, custom packages |
| **L3 — Developer Experience** | Console, CLI, dashboards, golden-path templates | GitOps packages + CLI releases | Templates, Backstage plugins |

## Foundation components

Pinned at bootstrap, compiled into the binary, and applied with Server-Side Apply — so the bootstrap cannot be broken by an upstream chart repository being down:

| Component | Version | Role |
|---|---|---|
| Kubernetes (default) | `v1.37.0` | The cluster |
| **Cilium** | `v1.20.0` | CNI (eBPF), kube-proxy replacement, Gateway API, Hubble, network policy, node encryption |
| **ArgoCD** | `v3.5.1` | GitOps engine |
| **Gitea** | `1.27.0` | In-cluster Git server (source of truth) |
| **Crossplane** | `v2.4.2` | Namespaced self-service infrastructure APIs |

**Cilium is the entire network layer** in one component — CNI, north-south routing (Gateway API, no separate ingress controller), flow observability (Hubble), microsegmentation, and WireGuard node-to-node encryption. It must install before anything else can schedule, which is why it pins the bootstrap order.

## The AdharPlatform resource

The whole foundation is driven by one object. `adhar up` creates it; the controller reconciles it; `adhar get status` reads it back. You rarely write it, but it is worth reading, because its `status` is the platform's own account of how far bootstrap has got. This is `examples/adharplatform.yaml`, trimmed:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: AdharPlatform
metadata:
  name: adhar
  namespace: adhar-system
spec:
  provider: civo              # kind | aws | azure | gcp | do | civo — selects the ApplicationSet profile
  autoscaling:                # the platform's own node autoscaler
    enabled: true
    minWorkers: 2
    maxWorkers: 5             # the spend limit
  clusterMesh:                # this cluster's identity in a Cilium Cluster Mesh
    name: adhar-mgmt
    id: 1                     # management cluster is 1; data planes take 2 upwards
  buildCustomization:         # written by `adhar up`; IMMUTABLE after creation
    protocol: https
    host: platform.example.com
    port: "443"
    clusterName: adhar-prod
    email: admin@example.com
    enableHAMode: true        # e.g. picks Crossplane's install-ha.yaml
    dnsProvider: civo
```

`buildCustomization` cannot change after the cluster is created — every URL, ClusterIssuer and foundation manifest was rendered from it. To change the host, rebuild.

The status is a set of gates, one per foundation component, plus Kubernetes conditions:

| Status field | Set when | Surfaced as condition |
|---|---|---|
| `status.gateway.available` | Gateway API CRDs, Cilium and the Cilium Gateway are up | `GatewayReady` |
| `status.ArgoCD.available` | ArgoCD is up | `ArgoCDReady` |
| `status.gitea.available` · `repositoriesCreated` | Gitea is up · the GitOps repos are seeded | `GiteaReady` |
| `status.crossplane.available` · `controlPlaneApplied` | Crossplane core is up · every XRD, Composition and ProviderConfig applied | `CrossplaneReady` |
| `status.gitOps` | Counts `applicationsTotal` and `applicationsHealthy` as the stack converges | `GitOpsReady` |
| — | All of the above | `Ready` |

```bash
kubectl -n adhar-system get adharplatform adhar -o jsonpath='{.status.crossplane}{"\n"}'
kubectl -n adhar-system get adharplatform adhar \
  -o jsonpath='{range .status.conditions[*]}{.type}={.status}{"\n"}{end}'
```

## The reconcile loop

The `AdharPlatform` controller is a controller-runtime reconciler. Each pass walks the same sequence of gates; a satisfied gate short-circuits, the first unsatisfied one does the work. This is what makes `adhar up` **idempotent, all-or-retry, and resumable**: re-running it after an interruption starts a new pass, and the pass resumes at whichever gate was pending.

```diagram
ds-reconcile-loop
```

Read top to bottom, a pass does this:

1. **Fetch and adopt.** Read `adhar-system/adhar`. An in-cluster manager starts with no host configuration of its own, so it adopts `spec.buildCustomization` from the resource — before that fix, it rendered URLs like `https://keycloak./realms/adhar`.
2. **Short-circuit when done.** When the controller runs inside the CLI (`ExitOnSync`), if Crossplane's control plane is applied and the platform is already deployed, skip straight to driving Applications to `Synced` and `Healthy`, then exit.
3. **Foundation.** If ArgoCD, the Gateway or Gitea is not available, install the foundation in order: Gateway API CRDs → Cilium → Cilium Gateway → (CNPG in HA mode) → ArgoCD → Gitea. Crossplane is deliberately **not** in this block.
4. **Start Crossplane early.** Apply the Crossplane core manifest best-effort, so its image pull overlaps the ~60-second repo seeding instead of following it.
5. **Platform stack.** Seed the GitOps repositories once (guarded by `repositoriesCreated`), then apply ArgoCD's repo credentials and the ApplicationSets on **every** pass. Re-applying each time is deliberate: an earlier design applied the ApplicationSet only when the repos were new, so any re-run found the repos present, skipped the apply, and left ArgoCD empty.
6. **Crossplane.** Install core, wait up to five minutes for it, then apply the control plane in strict order (see [Control Plane](/docs/core-concepts/control-plane#install-order)). This runs *after* the ApplicationSet, so a slow or failing Crossplane can never stop applications from deploying.
7. **Requeue or exit.** Until `controlPlaneApplied` is true, requeue every 15 seconds. Any failure records a reason on the status and requeues in 5 seconds. In watch mode the controller keeps nudging Applications stuck on a comparison error; run from the CLI, it exits once everything has converged.

### Two phases, two homes for the controller

The same reconciler runs in two places, which is why the bootstrap is described as two phases (per ADR-0001):

```diagram
cc-bootstrap-phases
```

- **By default — locally and on a cloud —** the controller runs **inside the `adhar` CLI process**, reads the platform stack from the working tree, and exits once the platform has converged (bounded by `--apps-timeout`). ArgoCD keeps reconciling the packages after it exits; re-running `adhar up` restarts the foundation controller.
- **With `adhar up --in-cluster`**, the CLI also installs the controller manager as a Deployment, started as `adhar controller --leader-elect=true`, so foundation reconciliation continues after the CLI exits. It has no local stack directory, so it skips the seeding step and maintains an already-seeded platform.

Phase 1 lays exactly enough foundation — network, GitOps engine, Git server, control plane — for Phase 2, GitOps, to take over.

## The GitOps write path

After bootstrap, **Git is the only write path.** The controller seeds repositories in the in-cluster Gitea under the `adhar` organisation:

| Repository | Content | Consumed by |
|---|---|---|
| `adhar/packages` | One directory per package: pre-rendered manifests, `values.yaml`, marketplace contract | The ApplicationSets |
| `adhar/environments` | Per-environment package sets (`local`, `development`, `staging`, `production`) | ApplicationSet generators |
| `adhar/adhar-templates` | Golden-path service templates — a pull mirror of `github.com/adhar-io/adhar-templates` | CLI `--template` and the Console's create wizard |
| `adhar/adhar` | A read-only pull mirror of the platform source | The in-cluster AI knowledge base |

```diagram
write-path
```

Enabling a package is a one-line Git change followed by `adhar upgrade`. A hand edit to a managed object is reverted by ArgoCD's self-heal, typically within a minute.

## The package model

The catalogue is **100+ packages**, each wired as one element of an ArgoCD **ApplicationSet**. The ApplicationSet file is **selected by provider** — the controller's `appSetFileForProvider` returns one of two:

- **Kind, or provider unset** → `adhar-appset-local.yaml` — a curated core, because a single node cannot run the full catalogue (the full set OOM-kills it).
- **Any cloud or on-prem** → `adhar-appset-production.yaml` — most of the catalogue, with every disabled entry carrying its reason inline.

Every package is wired in both; only the `enabled` flag differs. `adhar stack list --enabled` prints the live count for your profile. Two more ApplicationSets are applied unconditionally: a **workload** set that generates nothing until workload clusters register, and a **services** set (`adhar-services-appset.yaml`) that adopts any Gitea repo carrying `.adhar/app.yaml`.

### The shape of an ApplicationSet entry

Each package is a list element. The generator's selector passes only elements whose `enabled` label is `"true"`:

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

Three details in the real file repay attention. The template carries a long `ignoreDifferences` list — fields that controllers and admission webhooks default onto objects after ArgoCD applies them, each measured against the live object — so packages settle at `Synced` instead of flapping `OutOfSync` forever. The retry policy has no limit, with a short backoff. And the source is the in-cluster Gitea, not GitHub, so what ArgoCD applies is always what the platform's own Git server holds.

See [Platform Services](/docs/core-concepts/platform-services) for the catalogue and [Customization](/docs/operations/customization) for how to change it.

## What teams create: composite resources

Platform operators change the platform through the stack. Teams change *their* part of it through namespaced composite resources — `Application`, `Database`, `Project` and the rest of the [Control Plane](/docs/core-concepts/control-plane) APIs. An application deployed with `adhar application deploy --repo …` is exactly this object (from `examples/application.yaml`):

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Application                    # formerly CompositeApplication — renamed, not aliased
metadata:
  name: payments-api
  namespace: team-payments
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local              # picks application-local-argocd
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

Crossplane renders it into an Argo CD `Application` in `adhar-system`, wrapped in a provider-kubernetes `Object` because it crosses namespaces, and labelled with the source namespace so the platform can trace it back. From there the GitOps loop is the same one that delivers the platform's own packages. Because the kind `Application` also exists in Argo CD's group, qualify it on the command line: `kubectl get applications.platform.adhar.io -A`.

## Namespace model

Every platform package installs into **`adhar-system`** — the same namespace as the foundation and Crossplane. The one exception is `buildpack` (kpack), which keeps `kpack-system` because its webhooks hardcode a Secret name. Your applications get their own namespaces. Sharing one namespace keeps the platform legible but forces two rules: rename colliding objects (or make packages mutually exclusive, e.g. `vault` ↔ `openbao`), and set `enableServiceLinks: false` on components that read configuration from environment variables — injected service-link variables have crashed components that mistook them for their own flags.

## Control plane vs data plane

A hard invariant: **application workloads run only on data planes; the control plane runs only fleet and platform services.**

- **Control plane** (the management cluster) — the fleet brain. Runs GitOps (ArgoCD, Gitea), IaC (Crossplane), identity (Keycloak), the secrets root (OpenBao + External Secrets), the observability hub (Grafana with Mimir, Loki and Tempo), the shared registry (Harbor), and fleet controllers.
- **Data plane** (a workload cluster) — where applications run. It gets Cilium plus a thin agent set from the workload ApplicationSet: metrics-server, Kyverno and its policies, Alloy collectors shipping telemetry to the hub, and an External Secrets agent resolving secrets from the control plane. Its applications are delivered by the control plane's ArgoCD.

```diagram
cc-fleet-topology
```

A first-class **`DataPlane` API** (`platform.adhar.io/v1alpha1`) manages a workload cluster's lifecycle — provision, register with ArgoCD, apply the agent profile, join the mesh — reported through status conditions `InfraReady`, `Registered`, `AgentsReady`, `MeshJoined` and `Ready`.

## Three topologies

Promotion between them is configuration, not re-architecture.

| Topology | Shape | Status |
|---|---|---|
| **T1 — Local** | Single Kind cluster; the controller runs in the CLI and exits after convergence; curated local core; self-signed TLS; about ten minutes on a warm machine | Default path |
| **T2 — Single-cluster production** | One cloud cluster runs platform and workloads; HA mode; optional in-cluster controller (`--in-cluster`) | Verified on DigitalOcean |
| **T3 — Management + workload clusters** | A control plane governs a fleet of data planes | Live-verified |

For local–production parity, the local data plane runs as a vcluster on the same Kind node — apps live inside the vcluster, platform services on the host — so the logical split is preserved even on a laptop. Scaling to T3 is *adding* physical data planes, not changing the architecture.

## Reconciliation controllers

The platform's own CRDs are run by controller-runtime reconcilers:

| Controller | Responsibility |
|---|---|
| **AdharPlatform** | Foundation lifecycle, GitOps setup, ApplicationSet apply, Crossplane install, health |
| **GitRepository** | Manages Git repos across Gitea/GitHub/GitLab/Bitbucket |
| **CustomPackage** | Delivers user/team workloads as ArgoCD Applications via Gitea |
| **DataPlane** | Provisions, registers and governs workload clusters |
| **Node autoscaler** | Watches Pods and Nodes and scales the worker pool between `minWorkers` and `maxWorkers` |

Everything else — databases, buckets, projects, applications — is reconciled by Crossplane against the XRDs, not by Adhar's own controllers.

## Day-2 is designed, not discovered

Backup, upgrade, scaling, cost and removal are part of a capability's definition of done. The control plane ships scheduled Crossplane v2 Operations: a daily Velero backup, a weekly secret-rotation nudge, ConfigMap drift recording, nightly lakehouse maintenance, and a monthly reconstructability drill measured against a one-hour rebuild target. See [Production](/docs/operations/production) for the runbooks.

## Extensibility

Because the platform is data, most extension is declarative:

- **Turn a package on or off** — `adhar stack enable <pkg>`, then `adhar upgrade`.
- **Change a package's values** — edit `values.yaml`, re-render, commit.
- **Add your own package** — drop a directory with a marketplace contract, or deliver it as a `CustomPackage`.
- **Add a self-service API** — write an XRD and Composition on the [Control Plane](/docs/core-concepts/control-plane).
- **Add a cloud provider** — implement the provider interface.

Full walkthroughs in [Customization](/docs/operations/customization).

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| ArgoCD is up but shows no Applications | The pass that applies the ApplicationSet never ran to completion | Re-run `adhar up`; the stack step re-applies on every pass |
| `adhar get status` healthy, but no `Database` ever composes | `status.crossplane.controlPlaneApplied` is still false | Read `.status.crossplane` and the `CrossplaneReady` condition; see [Control Plane](/docs/core-concepts/control-plane#debugging-and-verification) |
| URLs render with an empty host after a restart | Build customization missing in a hand-started controller | Let the controller adopt it from the `AdharPlatform`; never edit `buildCustomization` |
| A `kubectl edit` to a package keeps reverting | ArgoCD self-heal | Change the stack in Git, then `adhar upgrade` |
| Two packages flap `Degraded` together | Both claim one object in `adhar-system` | `adhar stack conflicts`, disable one |
| `kubectl get applications` shows Argo CD apps, not yours | Short-name collision | `kubectl get applications.platform.adhar.io -A` |

## The IDP critical pillars

Every addition to Adhar is tested against eight pillars: **one command, whole platform** · **Git is the only write path** · **self-service with guardrails** · **local–production parity is sacred** · **secure by default, not by add-on** · **observable by construction** · **day-2 is designed, not discovered** · **100% open source, no lock-in.** A change that violates a pillar needs an ADR justifying the exception.

## Keep reading

- [Control Plane](/docs/core-concepts/control-plane) — the Crossplane v2 self-service engine in depth
- [The 6 D's Framework](/docs/core-concepts/ds-framework) — the delivery methodology
- [Platform Services](/docs/core-concepts/platform-services) — the full package catalogue
- [Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet) — T3 in practice
- [Cloud Providers](/docs/providers/overview) · [Production](/docs/operations/production)
