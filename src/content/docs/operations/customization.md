---
title: "Customization"
section: "Operations"
order: 3
path: "/docs/operations/customization"
---

# Customization

This page is for platform engineers who want Adhar to fit their organisation: switching packages on and off, retuning one, adding their own, and extending the self-service APIs. Each kind of change has the commands to make it and the commands to confirm it landed.

One rule covers all of it: **a customization is a declarative change to the platform stack, applied with `adhar upgrade`.** Never `kubectl apply` or `kubectl edit` a managed object, because ArgoCD reverts it. If a routine customization seems to need a Go change, report it as an architecture gap.

## Pick the mechanism

```diagram
nop-change-routes
```

| Task | How |
|---|---|
| Enable or disable a package | `adhar stack enable <pkg>` → `adhar upgrade` |
| Change a package's config | Edit `values.yaml` → `generate-manifests.sh` → `adhar upgrade` |
| Add your own package | New directory + `adhar-package.yaml` + ApplicationSet and environment-config entries |
| Deploy team apps | `CustomPackage` CRD |
| Add a golden path | Backstage scaffolder template (shared by the CLI and the Console) |
| Add a self-service API | XRD + Composition (Crossplane) |
| Add a cloud provider | Implement the provider interface |
| Preview any change | `adhar upgrade --diff-only` |

## Why hand-edits do not stick

ArgoCD is a reconciliation loop. Every platform package is an `Application` whose desired state is a path in the in-cluster Gitea `adhar/packages` repository. ArgoCD compares live state against that path continuously, and with self-heal on it overwrites anything that differs. A `kubectl edit` is a difference, so it is reverted, with no error message.

The source of truth is therefore your checkout:

```diagram
gd-source-of-truth
```

> **Note:** The ApplicationSet itself is not read from Gitea. The controller applies it from the platform stack, so editing it inside Gitea has no effect. Edit it in your checkout.

## Enable or disable a package

Each entry in the stack has an `enabled` gate:

```yaml
- name: "velero"
  enabled: "false"        # flip to "true"
  namespace: "adhar-system"
  category: "core"
  manifestPath: "core/velero/manifests"
```

The value is a quoted string, because the ApplicationSet generator selects on the label `enabled: "true"`.

```diagram
nop-stack-enable
```

Let the CLI make the edit. `adhar stack enable` and `adhar stack disable`:

- edit the profile's ApplicationSet and its mirrored environment config together
- check conflicts and dependencies before writing
- leave the diff in your checkout for review, without committing or pushing
- ask for confirmation (pass `--yes` in scripts and CI)

The local profile must stay a subset of production. Enabling a package locally also enables it in production, and disabling one in production also disables it locally.

1. Make the change.

   ```bash
   adhar stack list                     # the catalogue: declared vs live state
   adhar stack enable velero
   adhar stack disable posthog
   ```

2. Review it before it reaches the cluster.

   ```bash
   git diff platform/stack/             # the appset and its environment config (×2 if production changed too)
   adhar stack conflicts                # no violations
   adhar upgrade --diff-only            # the stack diff ArgoCD will see
   ```

3. Apply it.

   ```bash
   adhar upgrade                        # converge, re-apply the ApplicationSet, re-push the stack
   ```

**Check:** the package is declared on and live.

```bash
adhar stack status velero            # declared on, live Synced + Healthy
adhar get apps | grep velero
```

Other `adhar stack` commands you will use:

```bash
adhar stack describe keycloak        # contract, live state, dependencies
adhar stack status                   # how converged the platform is
adhar stack sync velero              # ask ArgoCD to re-compare a package now
```

> **Warning:** Disabling is destructive. With prune on (the platform default), ArgoCD uninstalls the workload. PersistentVolumes follow their reclaim policy, so data can go with them.

### Editing by hand

Hand-editing works too. Keep the ApplicationSet and its mirrored environment config in step; a parity test enforces the match.

| Profile | ApplicationSet | Mirrored environment config |
|---|---|---|
| Local (Kind) | `platform/stack/adhar-appset-local.yaml` | `platform/stack/environments/local/config.yaml` |
| Production | `platform/stack/adhar-appset-production.yaml` | `platform/stack/environments/prod/config.yaml` |

Two more ApplicationSets sit beside them: `adhar-appset-gitops.yaml`, and `adhar-appset-workload.yaml`, the thin agent profile deployed onto registered workload clusters.

The catalogue holds 100+ entries. The local profile enables a small curated core and production enables most of them. `adhar stack list` is the live answer for the profile you are on.

## Conflicts, advisories and dependencies

Every package installs into the shared `adhar-system` namespace, so some pairs claim the same cluster-scoped object. Two Applications that own one object flap between `OutOfSync` and `Synced`, both report `Degraded`, and neither says why. The CLI refuses such an edit up front.

| Kind | Rule | Behaviour |
|---|---|---|
| **Hard exclusion** | `vault` / `openbao` — both claim `ClusterSecretStore/vault` and `Service/vault` | `adhar stack enable` refuses until you disable the other |
| **Hard exclusion** | `vllm-cpu` / `vllm-gpu` — both Deployments are named `vllm` and share one Service | `adhar stack enable` refuses until you disable the other |
| **Advisory** | `minio` / `rustfs` — both are S3 endpoints, but every consumer reads RustFS's root credentials | Warns, proceeds |
| **Dependency** | `agentgateway` ↔ `adhar-ai`; `vllm-cpu`/`vllm-gpu` → `vllm` | Warns about the missing partner |

```bash
adhar stack conflicts     # the rules, plus whether the current profile violates any
```

The rules live in `cmd/stack/profile.go`. `platform/stack/packages/CONFLICTS.md` explains the object-level collisions behind them, including the service-link collisions described under [Add your own package](#add-your-own-package).

> **Note:** A single Kind node cannot run the whole catalogue. Check `kubectl top nodes` before you enable anything heavy. An over-enabled profile is the usual cause of a local cluster that never converges.

## Anatomy of a package directory

Most packages are **pre-rendered Helm charts**: the chart is rendered to plain YAML in your checkout, so the Git diff is the cluster diff.

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

| File | What to know |
|---|---|
| `manifests/install.yaml` | Generated. Hand-edits are lost on the next render |
| `*.yaml.tmpl` | Rendered against the `AdharPlatform` spec when the controller seeds the stack into Gitea; the `.tmpl` suffix is dropped. This is how host and email reach the stack without being hardcoded |
| `adhar-package.yaml` | The marketplace contract. CI fails a package without one (`hack/validate-packages.sh` validates it against `marketplace.schema.json`) |

## Retune a package

Every package change moves through the same stages. Everything before `adhar upgrade` happens in your checkout and can be thrown away.

```diagram
do-package-change
```

This example runs cert-manager with two replicas and a stricter DNS-01 resolver. cert-manager is on in the production profile and off locally.

1. Edit the values.

   ```bash
   cd platform/stack/packages/security/cert-manager
   vi values.yaml
   ```

   ```yaml
   replicaCount: 2
   extraArgs:
     - --dns01-recursive-nameservers-only
   ```

2. Re-render. To change the chart version as well, bump `CHART_VERSION` at the top of the script.

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

   That diff is what will change in the cluster.

3. Preview and apply.

   ```bash
   adhar upgrade --diff-only     # stack diff, no changes
   adhar upgrade                 # converge foundation, push the stack, refresh ArgoCD
   ```

**Check:** `adhar get apps` shows cert-manager back at `Synced` and `Healthy`.

> **Warning:** Two rules apply to every `generate-manifests.sh`:
>
> - Render the chart's CRDs: pass `--include-crds`, or the chart's own switch (cert-manager uses `--set crds.enabled=true`). Without them the controller crash-loops on an unknown kind.
> - Render with `--namespace adhar-system`. Otherwise a chart bakes a different namespace into CA-injection annotations and APIService SANs.

## Add your own package

1. Create the directory.

   ```bash
   mkdir -p platform/stack/packages/application/my-tool/manifests
   ```

   For a Helm chart, copy a neighbour's `generate-manifests.sh`. Otherwise drop raw manifests into `manifests/`.

2. Write the contract, `adhar-package.yaml`. `marketplace.schema.json` requires every field below except `dependencies`. `category` must match the top-level directory the package sits in. `security/cert-manager/adhar-package.yaml` is a complete example.

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

3. Add the entry to **both** the ApplicationSet and the mirrored environment config.

   ```yaml
   - name: "my-tool"
     enabled: "true"
     namespace: "adhar-system"
     category: "application"
     manifestPath: "application/my-tool/manifests"
   ```

4. If the package has a UI, ship an `HTTPRoute` so it gets `my-tool.<domain>` like every other package.

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

   Write the literal local domain. At seed time the controller rewrites `adhar.localtest.me` (with or without `:8443`) to your host in every stack file, so one manifest serves every platform.

5. Validate and apply.

   ```bash
   hack/validate-packages.sh
   adhar stack list | grep my-tool
   adhar upgrade
   ```

Three conventions keep a custom package upgrade-safe:

- Keep it in its **own directory**, never inside a shipped package.
- Target `adhar-system`.
- Set `enableServiceLinks: false` on any pod that decodes environment variables strictly. In the shared namespace, Kubernetes injects a `<NAME>_PORT` variable per Service.

## Deploy team applications

Platform packages are for platform capabilities. Team workloads use the `CustomPackage` CRD. It delivers an ArgoCD `Application` or `ApplicationSet` through the platform's own Gitea, so the cluster never depends on your laptop or an external forge. With `replicate: true`, the package's contents are copied into the in-cluster Gitea.

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

A *golden path* is a supported starting point for a new service, implemented as a Backstage scaffolder template. The CLI and the Console read the same collection: the `adhar/adhar-templates` repository in the platform's Gitea. The controller creates that repository at bootstrap, in every profile, as a pull mirror of `github.com/adhar-io/adhar-templates`.

Each template is a directory under `templates/` holding a `template.yaml` and the `skeleton/` it renders. Because the repository is a mirror, the templates stay current without a platform release. Contribute a new template upstream, or to a fork you point the mirror at. Do not edit it in Gitea: the next pull overwrites it.

```bash
adhar application templates                 # what this platform offers
adhar application templates <template>      # one template's parameters
adhar application deploy my-app --template <template> --param key=value --wait   # --param repeats
```

With a template, leave `--path` off: the template declares where its manifests live, and the CLI refuses a path with no `envs/` directory. See [Your First Service](/docs/getting-started/first-service).

The stack directory `platform/stack/packages/application/adhar-templates/` holds a separate set of Backstage catalog templates, registered through the `targets` list in its `catalog-info.yaml`: `basic`, `app-with-bucket`, `microservice`, `frontend`, `data-pipeline` and `ml`. They are not part of the mirrored collection, so `adhar application deploy --template` does not accept them.

> **Note:** If your skeleton ships `.adhar/app.yaml`, omit the `adhar:create-argocd-app` step. The `adhar-services` ApplicationSet already adopts such repositories, and two Applications managing one set of resources drift against each other.

## Environments and config layers

Environments live in `platform/stack/environments/` (`local`, `dev`, `test`, `prod`). Each has a `config.yaml` that declares that environment's package set. Promotion is Git promotion, orchestrated by Kargo. See [Promote Across Environments](/docs/guides/promote-across-environments).

The root `config.yaml` has four layers, each overriding the previous: `globalSettings → providers → environmentTemplates → environments`. Keep each environment block to the minimal delta, and never put secrets in it. See [Configuration](/docs/getting-started/configuration).

## Extend the infrastructure APIs

The control plane (`platform/controlplane/`) ships composite APIs (XRDs) and their compositions on Crossplane.

| To add | Write |
|---|---|
| A new implementation of an existing API | A Composition that selects on your label |
| A new API | An XRD (`apiextensions.crossplane.io/v2`, `scope: Namespaced`, no claims) plus one Composition per implementation |

Namespaced managed resources have no `spec.deletionPolicy`. Express retention with `managementPolicies` instead. See [Control Plane](/docs/core-concepts/control-plane).

## Add a provider

Implement the `Provider` interface (`platform/providers/interface.go`) and register it in `platform/providers/factory.go`. `platform/providers/civo/` is a compact reference.

Before you write one, check whether the **`custom` provider** is enough: it points Adhar at any conformant cluster, with no provisioning.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Your `kubectl edit` disappears | ArgoCD self-heal reconciles managed objects | Change `values.yaml`, re-render, `adhar upgrade` |
| Editing the ApplicationSet in Gitea does nothing | The controller applies it; it is not read from Gitea | Edit it in your checkout |
| A parity test fails in CI | The appset and environment config drifted, or a package is on locally but off in production | Use `adhar stack enable/disable`, which keeps both files and both profiles in step |
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
