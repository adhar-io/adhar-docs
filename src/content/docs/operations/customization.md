---
title: "Customization"
section: "Operations"
order: 3
path: "/docs/operations/customization"
---

# Customization

The golden rule: **customizations are declarative changes to the platform stack, applied with `adhar upgrade`** — never `kubectl apply` against a managed object (ArgoCD reverts it within a minute).

## At a glance

| Task | How |
|---|---|
| Enable/disable a package | `adhar stack enable <pkg>` → `adhar upgrade` |
| Change a package's config | Edit `values.yaml` → `generate-manifests.sh` → `adhar upgrade` |
| Add your own package | New dir + `adhar-package.yaml` + ApplicationSet entry |
| Deploy team apps | `CustomPackage` CRD |
| Add a golden path | CLI template or Console scaffolder template |
| Add a self-service API | XRD + Composition (Crossplane v2) |
| Add a cloud provider | Implement the provider interface |
| Preview changes | `adhar upgrade --diff-only` |

## Enable or disable a package

Each entry in the stack carries an `enabled` gate:

```yaml
- name: "harbor"
  enabled: "false"        # ← flip to "true"
  namespace: "adhar-system"
  category: "application"
  manifestPath: "application/harbor/manifests"
```

Let the CLI edit the right files and check invariants:

```bash
adhar stack list                     # the catalogue: declared vs live state
adhar stack enable harbor
adhar stack disable posthog
adhar stack conflicts                # what must not be on together
adhar stack describe keycloak        # contract, live state, dependencies
```

Then apply:

```bash
adhar upgrade --diff-only     # exactly what will change
adhar upgrade                 # converge, re-apply the ApplicationSet, re-push the stack
```

Or edit the files directly — keep the ApplicationSet and its mirrored environment config in step (a parity test enforces the match):

| Profile | ApplicationSet | Mirrored environment config |
|---|---|---|
| Local (Kind) | `platform/stack/adhar-appset-local.yaml` | `platform/stack/environments/local/config.yaml` |
| Production | `platform/stack/adhar-appset-production.yaml` | `platform/stack/environments/production/config.yaml` |

**Two rules that bite:** a single Kind node can't run all 94 (check `kubectl top nodes`); and some packages are mutually exclusive (`platform/stack/packages/CONFLICTS.md`) — notably `vault` / `openbao` (exactly one), `vllm` + one of `vllm-cpu`/`vllm-gpu`, and `agentgateway` which requires `adhar-ai`.

## Change a package's configuration

Packages are **pre-rendered Helm charts** — the Git diff is the cluster diff:

```text
platform/stack/packages/security/cert-manager/
├── adhar-package.yaml        # marketplace contract
├── values.yaml               # your configuration surface
├── generate-manifests.sh     # helm template … -f values.yaml > manifests/install.yaml
└── manifests/install.yaml    # what ArgoCD syncs (generated — never hand-edit)
```

```bash
vi platform/stack/packages/security/cert-manager/values.yaml
cd platform/stack/packages/security/cert-manager && ./generate-manifests.sh
git diff manifests/install.yaml     # exactly what will change
adhar upgrade
```

Two generator gotchas: pass `--include-crds` when the chart ships CRDs, and render with `--namespace adhar-system`.

## Add your own package

```bash
mkdir -p platform/stack/packages/application/my-tool/manifests
# copy a neighbour's generate-manifests.sh (Helm) or drop raw manifests in manifests/
```

Wire it into both the ApplicationSet and the mirrored environment config:

```yaml
- name: "my-tool"
  enabled: "true"
  namespace: "adhar-system"
  category: "application"
  manifestPath: "application/my-tool/manifests"
```

Conventions:

- Keep custom packages in their **own directories**.
- **Target `adhar-system`.** Because it's shared, set `enableServiceLinks: false` on any pod that decodes env vars strictly (Kubernetes injects a `<NAME>_PORT` var per Service).
- Ship an `adhar-package.yaml` contract (CI fails without one).
- If it has a UI, ship an `HTTPRoute` attaching to `adhar-gateway`:

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

Write the literal local domain; the controller rewrites it to your host at seed time.

## Deploy team applications

Team workloads use the `CustomPackage` CRD, delivering an ArgoCD Application through the platform's Gitea:

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

- **CLI templates** — `platform/stack/templates/*.yaml` (pushed to the Gitea `templates` repo). Each is a `CompositeApplication` with `${APP_NAME}`/`${APP_NAMESPACE}` placeholders, instantiated by `adhar application deploy <name> --template <t>`. Shipped: `basic-git`, `microservice`, `frontend`.
- **Console golden paths** — Backstage scaffolder templates in `platform/stack/packages/application/adhar-templates/`. Shipped: `microservice`, `frontend`, `data-pipeline`, `ml`.

## Environments & config layers

Environments live in `platform/stack/environments/` (`local`, `development`, `testing`, `staging`, `production`), each with a `config.yaml`. Promotion is Git promotion (`development → staging → production`, with Kargo available to orchestrate).

The root `config.yaml` has four layers, each overriding the previous — `globalSettings → providers → environmentTemplates → environments`. Never put secrets in it. See [Configuration](/docs/getting-started/configuration).

## Extend the infrastructure APIs

The control plane (`platform/controlplane/`) ships composite APIs (XRDs) + compositions on Crossplane v2. Add a new implementation of an existing API by writing a new Composition that selects on your label; add a whole new API with an XRD (`apiextensions.crossplane.io/v2`, `scope: Namespaced`, no claims) plus one Composition per implementation. Namespaced managed resources have **no `spec.deletionPolicy`** — express retention with `managementPolicies`. See [Control Plane](/docs/core-concepts/control-plane).

## Add a provider

Implement the `Provider` interface (`platform/providers/interface.go`) and register it in `platform/providers/factory.go` (`platform/providers/civo/` is a good reference). The **`custom` provider** already points Adhar at any conformant cluster.
