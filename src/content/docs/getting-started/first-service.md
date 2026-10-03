---
title: "Your First Service"
section: "Getting Started"
order: 4
path: "/docs/getting-started/first-service"
---

# Your First Service

You have a platform. This page puts an application on it and follows the change the whole way — from a golden-path template, through a Git repository, through ArgoCD reconciliation, to a URL you can open. **Nothing you are about to do writes to the cluster directly**, and understanding why is the point of the exercise: on Adhar, the cluster is a projection of Git, so the way to change what is running is to change what is committed.

Everything below assumes a local platform from [Quick Start](/docs/getting-started/quick-start). The commands are identical on a cloud platform; only the host name changes.

## At a glance

| | |
|---|---|
| **Fastest path** | `adhar application deploy <name> --template <id> -n <ns>` |
| **What it creates** | A Gitea repo `adhar/<name>` plus a `CompositeApplication` resource |
| **What reconciles it** | ArgoCD, continuously, with self-heal on |
| **Where it lands** | `https://<name>.adhar.localtest.me:8443` |
| **Watch it with** | `adhar application status <name> --detailed` |

## The model: who creates what

Whichever route you take, your application becomes a **`CompositeApplication`** — the platform's own application API, a namespaced Crossplane composite resource. Crossplane expands it into an ArgoCD Application, and ArgoCD keeps the workload matching Git:

```diagram
gd-composite-application
```

The value of the indirection is that you declare *intent* — a repo, a path, a destination — and the platform owns the machinery. The same `CompositeApplication` behaves identically on Kind and on a cloud, because a provider-specific composition is selected for you.

## Step 1 — Pick a template

Templates are the platform's golden paths. They live in the `adhar/adhar-templates` repository in the in-cluster Gitea, mirrored from upstream, and they are the same collection the Adhar Console's create wizard offers — so a service scaffolded from the CLI and one scaffolded from the portal are the same service.

```bash
adhar application templates
```

| Template | What it scaffolds |
|---|---|
| `basic` | A plain Deployment — the smallest thing that works |
| `microservice` | Go microservice on the full supply chain |
| `frontend` | Static / SPA frontend |
| `data-pipeline` | A data-processing workflow |
| `ml` | A machine-learning service |
| `argo-workflows` | An Argo Workflow running a Spark job |
| `app-with-bucket` | A Go app plus the cloud resources it needs |

Name one to see the parameters it accepts — these are what `--param key=value` takes, and a required parameter you have not supplied looks like an arbitrary failure otherwise:

```bash
adhar application templates microservice
```

## Step 2 — Deploy it

```bash
adhar application deploy hello --template microservice -n hello
```

Three things happen, in order, and the CLI narrates each:

1. **Scaffold.** The template's skeleton is rendered with your values and committed to a **new Gitea repository, `adhar/hello`**, as a single commit named `scaffold hello from microservice` on `main`. The template's hostname parameter is filled in for you from the platform host, giving `hello.adhar.localtest.me`.
2. **Declare.** A `CompositeApplication` named `hello` is created in namespace `hello`, pointing at that repository.
3. **Reconcile.** Crossplane selects a composition, produces an ArgoCD Application, and ArgoCD syncs the manifests.

> **The repository must be new or empty.** Scaffolding refuses to overwrite an existing non-empty repo — your code is never clobbered by a re-run. Delete the repo, or choose another name.

The resource that results looks like this, which is also exactly what you would write by hand:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: CompositeApplication
metadata:
  name: hello
  namespace: hello
spec:
  parameters:
    project: default
    source:
      repoURL: http://gitea-http.adhar-system.svc.cluster.local:3000/adhar/hello
      targetRevision: main
    destination:
      namespace: hello
      server: https://kubernetes.default.svc
```

### Other ways in

| You have | Command |
|---|---|
| Manifests or a chart already in Git | `adhar application deploy my-app --repo https://github.com/org/repo --path manifests/ --dest-namespace my-team --wait` |
| Source code, no image, no Dockerfile | `adhar push my-app --git-url https://github.com/org/repo --wait` |
| A `CompositeApplication` you wrote yourself | `adhar application deploy my-app --file my-app.yaml` |

`--wait` blocks until the application reports healthy, with a `--timeout` that defaults to 10 minutes. Without it the command returns as soon as the resource is accepted, which is the right default for scripts that do their own polling.

## Step 3 — Watch the GitOps loop

This is the part worth watching once, carefully.

```bash
adhar application status hello --detailed
```

You get the sync status, health, the Git revision currently deployed, the last sync time, per-environment status and the resource's conditions. Add `-o json` for machine-readable output.

```diagram
gd-sync-states
```

Three states to recognise:

- **`OutOfSync`** — Git and the cluster differ. Expected immediately after any commit.
- **`Progressing`** — applied, waiting on pods, images or a database to be ready.
- **`Healthy` + `Synced`** — done. Your URL works.

Verify at each layer when you want certainty rather than a summary:

```bash
kubectl get compositeapplication -n hello               # the intent you declared
kubectl get applications -n adhar-system                # ArgoCD's view of it
kubectl get deploy,pods,svc -n hello                    # the workload itself
kubectl get httproute -A | grep hello                   # the route that makes it reachable
curl -sk -o /dev/null -w 'HTTP %{http_code}\n' https://hello.adhar.localtest.me:8443
```

> **Do not fix a running app with `kubectl edit`.** ArgoCD reconciles with self-heal enabled, so a hand edit to a managed object is reverted, typically within a minute. It looks like the cluster is ignoring you. Commit to the repository instead — that is the only durable change.

## Step 4 — Debug when it does not come up

Work down the chain: intent → ArgoCD → workload → route. The first layer that is wrong is the one to fix.

| Symptom | Likely cause | What to do |
|---|---|---|
| `application not found: hello/hello` | Wrong namespace — `-n` defaults to `default` | `adhar application list -A` |
| Stuck `OutOfSync`, never applies | Manifest path wrong, or the repo has no manifests at that path | Re-deploy with an explicit `--path`; check the repo in Gitea |
| `Progressing` forever, pods `Pending` | Node out of memory or CPU | `kubectl describe pod -n hello`; `kubectl top nodes`; give the engine more RAM |
| `ImagePullBackOff` | Image missing, or not yet built | `kubectl describe pod -n hello`; check the build pipeline finished |
| Pod rejected at admission | Unsigned image — Kyverno blocks it | Build through the supply chain so the image gets signed (below) |
| `Healthy` but the URL returns nothing | No `HTTPRoute`, or a hostname mismatch | `kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]` |
| Everything green, browser warns on TLS | The local certificate is self-signed | Expected; accept it, or trust the platform CA |

## The paved road: build from source

`adhar push` and the Console both trigger the platform's Tekton supply chain, so a developer and an operator take the same path:

```bash
adhar push api --git-url https://github.com/paketo-buildpacks/samples --subpath go/mod --wait
```

The full CI pipeline that a repo runs on every push looks like this:

```diagram
gd-ci-pipeline
```

Two properties make this more than a build script. **Scanning happens before signing**, so only a clean image ever gets a signature. And the Kyverno cluster policy `verify-supply-chain-images` runs in enforce mode: a Pod referencing a Harbor `library/*` image without a valid Cosign signature is rejected at admission. Unsigned code cannot run, regardless of how it was applied.

The write-back step is what closes the loop — CI does not deploy, it *commits*, and ArgoCD deploys the commit. Your deployment history is your Git history.

### Adopting an existing repo

A repository in the platform's Gitea that contains a **`.adhar/app.yaml`** is picked up automatically by the `adhar-services` ApplicationSet, which scans the `adhar` organisation. From then on the repo has an Application named `<repo>-bootstrap`, synced from its `.adhar` directory with prune and self-heal on. No registration step, no ticket.

## Give your app a backing service

Infrastructure is requested as ordinary Kubernetes resources, governed by normal RBAC and quotas:

```bash
adhar database create --name orders-db --engine postgresql --version 16 --size 20Gi
adhar cache create sessions --engine valkey --replicas 2
adhar bucket create uploads --size 100Gi

adhar application bind hello orders-db      # mounts the connection Secret
```

`bind` finds the generated connection Secret — `<service>-app` by convention, overridable with `--secret` — and adds it as `envFrom` on the application's first container, then lets the Deployment roll. It is idempotent: binding twice tells you it is already bound and changes nothing.

The declarative equivalent, which is what you would commit:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: CompositeDatabase
metadata:
  name: orders-db
  namespace: team-orders
spec:
  parameters:
    engine: postgresql
    engineVersion: "16"
    storageSize: 50Gi
```

The same manifest resolves to a managed cloud database or an in-cluster CloudNativePG instance depending on where you run it. Your application never changes. See [Control Plane](/docs/core-concepts/control-plane).

## Secrets, observability and previews

**Secrets** never go in Git. Commit an `ExternalSecret` — a pointer — and External Secrets fetches the value from the platform's secrets backend at runtime and materialises an ordinary Kubernetes Secret:

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: myapp-config
  namespace: my-team
spec:
  secretStoreRef:
    name: vault
    kind: ClusterSecretStore
  target:
    name: myapp-config
  data:
    - secretKey: password
      remoteRef:
        key: myapp/config
        property: password
```

The `vault` `ClusterSecretStore` is created by the OpenBao package, which ships with the production profile — enable it before using this pattern on a laptop.

**Observability** needs no wiring: metrics from your pods reach Prometheus and Grafana as soon as they run. The log, trace and network-flow stacks (Loki, Tempo, Hubble) belong to the production profile and are off by default locally — enable them with `adhar stack enable` if you want them on a laptop. See [Observability](/docs/operations/observability).

**Preview environments** give every pull request its own deployment. Add a `preview/kustomization.yaml` overlay to your default branch once, then label a PR `preview`: ArgoCD's pull-request generator re-checks every 60 seconds and deploys to `https://<repo>-pr-<number>.<host>` in namespace `preview-<repo>-<number>`. Closing or merging the PR, or removing the label, deletes the Application and prunes the namespace. Previews are unauthenticated — use synthetic data only. The package ships with the production profile.

## Manage a running application

```bash
adhar application list -A                 # inventory across all namespaces
adhar application status hello --detailed
adhar application scale hello --replicas 3
adhar application restart hello
adhar application delete hello
```

## Next steps

- **[Platform Services](/docs/core-concepts/platform-services)** — everything else your application can reach for
- **[Customization](/docs/operations/customization)** — enable more packages, add your own golden paths
- **[CLI Reference](/docs/reference/cli)** — every command and flag
- **[Troubleshooting](/docs/reference/troubleshooting)** — deeper failure signatures
