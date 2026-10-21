---
title: "Customization"
section: "Operations"
order: 3
path: "/docs/operations/customization"
---

# Customization

The golden rule: **customizations are declarative changes to the platform stack, applied with `adhar upgrade`**. Never `kubectl apply` against a managed object, because ArgoCD reverts it soon afterwards. If a routine customization seems to need a Go change, that is an architecture gap worth reporting, not a workflow.

This page is for platform engineers who want the platform to fit their organisation. That means switching packages on and off, retuning one, adding their own, and extending the self-service APIs. The page explains why hand-edits do not stick. Then it walks through each kind of change, with the commands to make it and the commands to prove it landed.

## At a glance

| Task | How |
|---|---|
| Enable/disable a package | `adhar stack enable <pkg>` → `adhar upgrade` |
| Change a package's config | Edit `values.yaml` → `generate-manifests.sh` → `adhar upgrade` |
| Add your own package | New dir + `adhar-package.yaml` + ApplicationSet and environment-config entries |
| Deploy team apps | `CustomPackage` CRD |
| Add a golden path | Backstage scaffolder template (shared by the CLI and the Console) |
| Add a self-service API | XRD + Composition (Crossplane v2) |
| Add a cloud provider | Implement the provider interface |
| Preview changes | `adhar upgrade --diff-only` |

## Why ArgoCD reverts your hand-edits

ArgoCD is a reconciliation loop, not a deployment tool. Every platform package is an `Application` whose desired state is a path inside the in-cluster Gitea `adhar/packages` repository. The loop compares live state against that path continuously. With self-heal on, anything that differs is overwritten.

An in-place `kubectl edit` is a difference, so it loses. It loses reliably, usually within moments, and without an error message anywhere.

That makes the source of truth unambiguous:

```diagram
gd-source-of-truth
```

One more exception catches people: the **ApplicationSet itself is not read from Gitea.** The controller applies it from the platform stack, so editing it inside Gitea has no effect at all. Edit it in your checkout.

## Enable or disable a package

Each entry in the stack has an `enabled` gate:

```yaml
- name: "velero"
  enabled: "false"        # ← flip to "true"
  namespace: "adhar-system"
  category: "core"
  manifestPath: "core/velero/manifests"
```

The `enabled` value is a quoted string, because the ApplicationSet generator selects on the label `enabled: "true"`.

Let the CLI make the edit. It edits the profile's ApplicationSet *and* its mirrored environment config, checks the invariants (conflicts and dependencies), and leaves the diff for you to review. Nothing is committed or pushed. It asks for confirmation; pass `--yes` in scripts and CI.

The local profile must stay a subset of production. So enabling a package in the local profile also enables it in production, and disabling one in production also disables it locally.

```bash
adhar stack list                     # the catalogue: declared vs live state
adhar stack enable velero
adhar stack disable posthog
adhar stack conflicts                # what must not be on together
adhar stack describe keycloak        # contract, live state, dependencies
adhar stack status                   # how converged the platform is
adhar stack sync velero              # ask ArgoCD to re-compare a package now
```

Then apply:

```bash
adhar upgrade --diff-only     # exactly what will change
adhar upgrade                 # converge, re-apply the ApplicationSet, re-push the stack
```

Editing by hand is fine too. Keep the ApplicationSet and its mirrored environment config in step, because a parity test enforces the match:

| Profile | ApplicationSet | Mirrored environment config |
|---|---|---|
| Local (Kind) | `platform/stack/adhar-appset-local.yaml` | `platform/stack/environments/local/config.yaml` |
| Production | `platform/stack/adhar-appset-production.yaml` | `platform/stack/environments/prod/config.yaml` |

Two more ApplicationSets sit beside them:

- `adhar-appset-gitops.yaml`
- `adhar-appset-workload.yaml`, the thin agent profile deployed onto registered workload clusters

The catalogue holds 100+ entries. The local profile enables a small curated core, and production enables most of them. `adhar stack list` is always the live answer for the profile you are on.

*Verify* an enable or disable before you upgrade:

```bash
git diff platform/stack/                  # one line per file: the appset and its environment config (×2 if production changed too)
adhar stack conflicts                     # no violations
adhar upgrade --diff-only                 # the stack diff ArgoCD will see
```

And after:

```bash
adhar stack status velero                 # declared on, live Synced + Healthy
adhar get apps | grep velero
```

Disabling is destructive in the ordinary GitOps sense: with prune on (the platform default), ArgoCD **uninstalls** the workload. PersistentVolumes follow their reclaim policy, so data can go with them.

## Conflicts, advisories and dependencies

Every package installs into the shared `adhar-system` namespace, so some pairs claim the same cluster-scoped object. Two Applications owning one object flap between `OutOfSync` and `Synced` forever, both report `Degraded`, and neither says why — which is why the CLI refuses the edit rather than letting you discover it later.

| Kind | Rule | Behaviour |
|---|---|---|
| **Hard exclusion** | `vault` / `openbao` — both claim `ClusterSecretStore/vault` and `Service/vault` | `adhar stack enable` refuses until you disable the other |
| **Hard exclusion** | `vllm-cpu` / `vllm-gpu` — both Deployments are named `vllm` and share one Service | `adhar stack enable` refuses until you disable the other |
| **Advisory** | `minio` / `rustfs` — both are S3 endpoints, but every consumer reads RustFS's root credentials | Warns, proceeds |
| **Dependency** | `agentgateway` ↔ `adhar-ai`; `vllm-cpu`/`vllm-gpu` → `vllm` | Warns about the missing partner |

```bash
adhar stack conflicts     # the rules, plus whether the current profile violates any
```

The rules the CLI enforces are defined in `cmd/stack/profile.go`. `platform/stack/packages/CONFLICTS.md` explains the object-level collisions behind them, including the service-link collisions described below.

A second rule is about capacity, not correctness: **a single Kind node cannot run the whole catalogue.** Check `kubectl top nodes` before you enable anything heavy. The usual cause of a local cluster that never converges is an over-enabled profile.

## Anatomy of a package directory

Most packages are **pre-rendered Helm charts**: the chart is rendered to plain YAML in your checkout, so the Git diff is the cluster diff. There are no in-cluster Helm surprises.

```text
platform/stack/packages/security/cert-manager/
├── adhar-package.yaml        # marketplace contract (category, version,
│                             #   maintainer, provenance, stability, verification)
├── values.yaml               # your configuration surface
├── generate-manifests.sh     # helm template … -f values.yaml > manifests/
└── manifests/
    ├── install.yaml          # what ArgoCD syncs (generated)
    ├── cluster-issuers.yaml.tmpl  # rendered from the platform spec
    ├── civo-dns-webhook.yaml.tmpl
    └── servicemonitor.yaml   # hand-written additions live here too
```

Three things to know about that layout:

- `install.yaml` is **generated**. Hand-edits are lost on the next render.
- Files ending `.yaml.tmpl` are rendered at seed time (when the controller pushes the stack into Gitea) against the `AdharPlatform` spec, and the `.tmpl` suffix is dropped. That is how host and email reach the stack without being hardcoded.
- `adhar-package.yaml` is the marketplace contract. CI fails a package that lacks one (`hack/validate-packages.sh` validates it against `marketplace.schema.json`).

## Worked example: retune one package

Every package change follows the same six stages. Everything before `adhar upgrade` happens in your checkout and can be thrown away. The cluster only changes at the last two.

```diagram
do-package-change
```

Run cert-manager with two replicas and a stricter DNS-01 resolver. (cert-manager is on in the production profile and off locally, so this is a production-style change.)

```bash
cd platform/stack/packages/security/cert-manager
vi values.yaml
```

```yaml
replicaCount: 2
extraArgs:
  - --dns01-recursive-nameservers-only
```

Re-render. The chart version is pinned by `CHART_VERSION` at the top of the script, so you bump it there too:

```bash
./generate-manifests.sh
git diff manifests/install.yaml
```

```text
   spec:
-    replicas: 1
+    replicas: 2
       containers:
         - args:
+            - --dns01-recursive-nameservers-only
```

That diff is exactly what will change in the cluster. Push it:

```bash
adhar upgrade --diff-only     # stack diff, no changes
adhar upgrade                 # converge foundation, push the stack, refresh ArgoCD
adhar get apps                # cert-manager back to Synced + Healthy
```

> Two generator traps cost real time:
>
> - Render the chart's CRDs: pass `--include-crds`, or the chart's own switch (cert-manager uses `--set crds.enabled=true`). Without them, the render has no CRDs and the controller crash-loops on an unknown kind.
> - Render with `--namespace adhar-system`. Otherwise a chart bakes a different namespace into CA-injection annotations and APIService SANs.

## Worked example: add your own package

```bash
mkdir -p platform/stack/packages/application/my-tool/manifests
```

Copy a neighbour's `generate-manifests.sh` for a Helm chart, or drop raw manifests into `manifests/`. Write the contract. Every field below is required by `marketplace.schema.json`, except `dependencies`; `category` must match the top-level directory the package sits in:

```yaml
apiVersion: marketplace.adhar.io/v1alpha1
kind: AdharPackage
name: my-tool
category: application
version: "1.4.0"
description: Internal tool for X.
maintainer:
  name: Platform Team
  firstParty: false
license: Apache-2.0
adharCompatibility:
  minVersion: "0.1.0"
provenance:
  sourceRepo: https://git.example.com/platform/my-tool
  signed: false
  cosignKeyless: false
  scanned: false
planeAffinity: control-plane    # control-plane | data-plane | any
stability: alpha                # alpha | beta | stable | community
dependencies: []
```

`security/cert-manager/adhar-package.yaml` is a complete real example.

Wire it into **both** the ApplicationSet and the mirrored environment config:

```yaml
- name: "my-tool"
  enabled: "true"
  namespace: "adhar-system"
  category: "application"
  manifestPath: "application/my-tool/manifests"
```

If it has a UI, ship an `HTTPRoute` so it gets `my-tool.<domain>` like everything else:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-tool
  namespace: adhar-system
spec:
  parentRefs:
    - name: adhar-gateway
      namespace: adhar-system
  hostnames: ["my-tool.adhar.localtest.me"]
  rules:
    - backendRefs:
        - name: my-tool
          port: 80
```

Write the literal local domain. At seed time the controller rewrites `adhar.localtest.me` (with or without `:8443`) to your host in every stack file, so one manifest serves every platform. Then validate and apply:

```bash
hack/validate-packages.sh
adhar stack list | grep my-tool
adhar upgrade
```

These conventions keep you upgrade-safe:

- Keep custom packages in their **own directories**, never inside a shipped one.
- Target `adhar-system`.
- Set `enableServiceLinks: false` on any pod that decodes environment variables strictly. In the shared namespace, Kubernetes injects a `<NAME>_PORT` variable per Service.

## Deploy team applications

Platform packages are for platform capabilities. **Team workloads** use the `CustomPackage` CRD. It delivers an ArgoCD `Application` or `ApplicationSet` through the platform's own Gitea, so the cluster never depends on your laptop or an external forge. With `replicate: true`, the package's contents are copied into the in-cluster Gitea:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: CustomPackage
metadata:
  name: my-app
  namespace: adhar-system
spec:
  argoCD:
    applicationFile: ./my-app/app.yaml
  replicate: true
```

## Add a golden path

Golden paths are Backstage scaffolder templates. The CLI and the Console read the **same** collection: the `adhar/adhar-templates` repository in the platform's Gitea. The controller creates that repository at bootstrap as a pull mirror of `github.com/adhar-io/adhar-templates`, in every profile.

Each template is a directory under `templates/` holding a `template.yaml` and the `skeleton/` it renders. Because the repository is a mirror, the templates a platform offers stay current without a platform release. Contribute a new template upstream (or to a fork you point the mirror at). Do not edit it in Gitea.

```bash
adhar application templates                 # what this platform offers
adhar application templates <template>      # one template's parameters
adhar application deploy my-app --template <template> --path manifests --param key=value --wait   # --param repeats
```

The stack also ships Backstage catalog templates in `platform/stack/packages/application/adhar-templates/`. They are registered through the `targets` list in its `catalog-info.yaml` (`basic`, `argo-workflows`, `app-with-bucket`, `microservice`, `frontend`, `data-pipeline`, `ml`).

Whichever kind you write, omit the `adhar:create-argocd-app` step if your skeleton ships `.adhar/app.yaml`. The `adhar-services` ApplicationSet already adopts such repos. Two Applications managing one set of resources is exactly the drift the platform forbids.

## Environments and config layers

Environments live in `platform/stack/environments/` (`local`, `dev`, `test`, `prod`). Each has a `config.yaml` that declares that environment's package set. Promotion is Git promotion, with Kargo orchestrating it. See [Promote Across Environments](/docs/guides/promote-across-environments).

The root `config.yaml` has four layers, each overriding the previous: `globalSettings → providers → environmentTemplates → environments`. Keep each environment block to the minimal delta, and never put secrets in it. See [Configuration](/docs/getting-started/configuration).

## Extend the infrastructure APIs

The control plane (`platform/controlplane/`) ships composite APIs (XRDs) plus compositions on Crossplane v2.

- To add a new implementation of an existing API, write a Composition that selects on your label.
- To add a whole new API, write an XRD (`apiextensions.crossplane.io/v2`, `scope: Namespaced`, no claims) plus one Composition per implementation.

Namespaced managed resources have **no `spec.deletionPolicy`**. Express retention with `managementPolicies` instead. See [Control Plane](/docs/core-concepts/control-plane).

## Add a provider

Implement the `Provider` interface (`platform/providers/interface.go`) and register it in `platform/providers/factory.go`. `platform/providers/civo/` is a compact reference. The **`custom` provider** already points Adhar at any conformant cluster, with no provisioning at all.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Your `kubectl edit` disappears | ArgoCD self-heal reconciles managed objects | Change `values.yaml`, re-render, `adhar upgrade` |
| Editing the ApplicationSet in Gitea does nothing | It is applied by the controller, not read from Gitea | Edit it in your checkout |
| A parity test fails in CI | Appset and environment config drifted, or a package is on locally but off in production | Use `adhar stack enable/disable`, which keeps both files and both profiles in step |
| Two packages both `Degraded`, no reason given | A hard exclusion is violated | `adhar stack conflicts` |
| Controller crash-loops on an unknown kind | Rendered without `--include-crds` | Add the flag and re-render |
| A pod panics parsing `<NAME>_PORT` | Service-link injection in the shared namespace | `enableServiceLinks: false` |
| CI rejects a new package | Missing or incomplete `adhar-package.yaml` | Add every required field, run `hack/validate-packages.sh` |
| A new template never appears | You pushed it to the Gitea mirror, which the next pull overwrites | Contribute it to the mirrored source repository |
| A package edit vanished after re-render | You edited the generated `install.yaml` | Change `values.yaml` and re-run `generate-manifests.sh` |

## Next steps

- [CLI Reference](/docs/reference/cli) — `adhar stack` and `adhar upgrade` in full.
- [Configuration](/docs/getting-started/configuration) — the four config layers.
- [Control Plane](/docs/core-concepts/control-plane) — XRDs and compositions.
- [Troubleshooting](/docs/reference/troubleshooting) — when a change does not converge.
