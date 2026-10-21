---
title: "Your First Service"
section: "Getting Started"
order: 4
path: "/docs/getting-started/first-service"
---

# Your First Service

You have a platform. This page puts an application on it and follows the change the whole way. It starts at a golden-path template (a ready-made starting point for a service). It goes through a Git repository and ArgoCD reconciliation, and ends at a URL you can open.

**You never hand-edit a running workload.** Each command on this page *declares* what you want (a Git repository, an `Application`, a `Database`), and the platform builds and reconciles the rest. Understanding why is the point of this exercise. On Adhar, the workloads in the cluster are a copy of what is in Git. To change what is running, you change what is committed.

Before you start, have a running local platform and a terminal in which `adhar get status` reports `● Healthy`.

Everything below assumes a local platform from [Quick Start](/docs/getting-started/quick-start). The commands are identical on a cloud platform. Only the host name changes. By the end of this page, you will have:

- scaffolded and deployed a service
- watched the GitOps loop converge it
- verified it at every layer
- given it a database
- bound that database's credentials into it

## At a glance

| | |
|---|---|
| **Fastest path** | `adhar application deploy <name> --template <id> --path manifests` (add `-n <ns> --project default` for your own namespace) |
| **What it creates** | A Gitea repo `adhar/<name>` plus an `Application` resource (`platform.adhar.io`) |
| **What reconciles it** | ArgoCD, continuously, with self-heal on |
| **Where it lands** | The hostname in the template's `HTTPRoute`, under `adhar.localtest.me`. `kubectl get httproute -A` shows it |
| **Watch it with** | `adhar application status <name> --detailed` |

## The model: who creates what

Whichever route you take, your application becomes an **`Application`** in `platform.adhar.io/v1alpha1`. This is the platform's own application API, a namespaced Crossplane composite resource. (It was called `CompositeApplication` until 2026-10-07. The old kind is rejected, not aliased.) Crossplane expands it into an ArgoCD Application, and ArgoCD keeps the workload matching Git:

```diagram
gd-composite-application
```

This extra layer means you only declare *intent*: a repo, a path, a destination. The platform owns the machinery. The CLI chooses the composition (Crossplane's recipe for turning your request into real objects) from the `ADHAR_PROVIDER` environment variable, which defaults to `local`. The `local` Application composition is the one that exists today, and it creates an in-cluster ArgoCD Application on any provider. So leave `ADHAR_PROVIDER` unset when you deploy applications.

Argo CD also has a kind called `Application`. On the command line, refer to the platform's one by its full name, `applications.platform.adhar.io`.

## Step 1 — Pick a template

Templates are the platform's golden paths. They live in the `adhar/adhar-templates` repository in the in-cluster Gitea, mirrored from upstream. The Adhar Console's create wizard offers the same collection. So a service scaffolded from the CLI and one scaffolded from the portal are the same service. List them:

```bash
adhar application templates
```

| Template | What it scaffolds |
|---|---|
| `basic` | A plain Deployment: the smallest thing that works |
| `microservice` | Go microservice on the full supply chain |
| `frontend` | Static / SPA frontend |
| `data-pipeline` | A data-processing workflow |
| `ml` | A machine-learning service |
| `argo-workflows` | An Argo Workflow running a Spark job |
| `app-with-bucket` | A Go app plus the cloud resources it needs |

The collection is fetched from the upstream `adhar-templates` repository, so it can change between releases. Treat the table as a guide and the output of `adhar application templates` as the truth for your platform.

Name a template to see the parameters it accepts. These are the values `--param key=value` takes. Check them first: if you miss a required parameter, the failure looks random:

```bash
adhar application templates microservice
```

## Step 2 — Deploy it

The `Application` is namespaced, and neither the CLI nor the control plane creates its namespace for you. Create the namespace first, then deploy into it.

Watch the `-n` flag. On `adhar application`, `-n` means `--namespace`. On `adhar database`, it means `--name`, so spell out `--namespace` there:

```bash
kubectl create namespace hello
adhar application deploy hello --template microservice -n hello \
  --path manifests --project default
```

Two flags need explaining. `--path manifests` names the directory the shipped skeletons keep their manifests in; without it the CLI falls back to `deploy`, which they don't have. `--project default` uses ArgoCD's unrestricted `default` project, because the CLI's default `--project adhar` only admits the platform Project's namespaces (`adhar`, `dev`, `test`, `prod`), and `hello` isn't one of them. Deploying into `dev` (the default `-n`) works without it.

Three things happen, in order, and the CLI reports each one:

1. **Scaffold.** The CLI fills in the template's skeleton with your values. It commits the result to a **new Gitea repository, `adhar/hello`**, as a single commit named `scaffold hello from microservice` on `main`. If the template takes a hostname parameter, the CLI fills it in for you from the platform host and environment.
2. **Declare.** The CLI creates an `Application` named `hello` in namespace `hello`. It points at that repository and at the path you passed with `--path`.
3. **Reconcile.** Crossplane selects a composition and produces an ArgoCD Application. ArgoCD then syncs the manifests.

> **The repository must be new or empty.** Scaffolding will not overwrite an existing non-empty repo, so a re-run never overwrites your code. Delete the repo, or choose another name.

The resulting resource looks like this. It is also exactly what you would write by hand:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Application
metadata:
  name: hello
  namespace: hello
  labels:
    adhar.io/managed-by: adhar-cli          # set by the CLI; harmless to omit by hand
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local                     # from ADHAR_PROVIDER; local on Kind
        feature: application
  parameters:
    project: default                        # --project; the CLI default is adhar
    source:
      repoURL: <platform Gitea URL>/adhar/hello.git   # the repo just scaffolded
      path: manifests                                  # --path
      targetRevision: main
    destination:
      namespace: hello
      server: https://kubernetes.default.svc
```

### Other ways in

| You have | Command |
|---|---|
| Manifests or a chart already in Git | `adhar application deploy my-app --repo https://github.com/org/repo --path manifests/ --dest-namespace my-team --wait` |
| Source code, no image, no Dockerfile | `adhar push my-app --git-url https://github.com/org/repo --wait` (see [the paved road](#the-paved-road-build-from-source) for what it does today) |
| An `Application` manifest you wrote yourself | `adhar application deploy my-app --file my-app.yaml` |

`--wait` makes the command wait until the application reports healthy. Its `--timeout` defaults to 10 minutes. Without `--wait`, the command returns as soon as the resource is accepted. That is the right default for scripts that do their own polling.

## Step 3 — Watch the GitOps loop

Watch this part carefully at least once.

```bash
adhar application status hello --detailed
```

This shows the sync status, health, the Git revision currently deployed, the last sync time, per-environment status and the resource's conditions. Add `-o json` for machine-readable output.

```diagram
gd-sync-states
```

Learn to recognise three states:

- **`OutOfSync`**: Git and the cluster differ. This is expected right after any commit.
- **`Progressing`**: applied, and waiting for pods, images or a database to be ready.
- **`Healthy` + `Synced`**: done. Your URL works.

When you want certainty instead of a summary, check each layer:

```bash
kubectl get applications.platform.adhar.io -n hello    # the intent you declared
kubectl get applications.argoproj.io hello -n adhar-system   # ArgoCD's view of it
kubectl get deploy,pods,svc -n hello                    # the workload itself
kubectl get httproute -A | grep hello                   # the route that makes it reachable
HOST=$(kubectl get httproute -A -o jsonpath='{range .items[*]}{.spec.hostnames[0]}{"\n"}{end}' | grep hello | head -1)
curl -sk -o /dev/null -w 'HTTP %{http_code}\n' "https://$HOST:8443"   # HTTP 200
```

> **Do not fix a running app with `kubectl edit`.** ArgoCD reconciles with self-heal enabled, so a hand edit to a managed object is reverted, typically within a minute. It looks like the cluster is ignoring you. Commit to the repository instead. That is the only change that lasts.

## Step 4 — Debug when it does not come up

Work down the chain: intent → ArgoCD → workload → route. Fix the first layer that is wrong.

| Symptom | Likely cause | What to do |
|---|---|---|
| `namespaces "hello" not found` on deploy | The namespace was never created. The scaffold was already committed to `adhar/hello`, so a plain re-run is refused (`already exists and is not empty`) | `kubectl create namespace hello`. Then delete the `adhar/hello` repo in Gitea and deploy again, or deploy the existing repo with `--repo` and `--path` |
| `application not found: dev/hello` | Wrong namespace. On `adhar application`, `-n` defaults to `dev` | `adhar application list -A`, then pass the right `-n` |
| Stuck `OutOfSync`, never applies | Manifest path wrong, or the repo has no manifests at that path | Re-deploy with an explicit `--path`. Check the repo in Gitea |
| `Progressing` forever, pods `Pending` | Node out of memory or CPU | Run `kubectl describe pod -n hello` and `kubectl top nodes`. Give the engine more RAM |
| `ImagePullBackOff` | Image missing, or not yet built | Run `kubectl describe pod -n hello`. Check the build pipeline finished |
| Pod rejected at admission | Unsigned image. Kyverno blocks it | Build through the supply chain so the image gets signed (below) |
| `Healthy` but the URL returns nothing | No `HTTPRoute`, or a hostname mismatch | `kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]` |
| Everything green, browser warns on TLS | The local certificate is self-signed | Expected. Accept it, or trust the platform CA |

## The paved road: build from source

The platform's paved-road CI is a Tekton pipeline called `app-ci`. It runs on every push to a repository wired to the platform's `app-push` trigger. This is what it does:

```diagram
gd-ci-pipeline
```

Two properties make this more than a build script:

- **Scanning happens before signing**, so only a clean image ever gets a signature.
- The Kyverno cluster policy `verify-supply-chain-images` (from the `adhar-supply-chain` package, on in every profile) runs in enforce mode. In workload namespaces, a Pod that references a Harbor `library/*` image without a valid Cosign signature is rejected at admission. Two limits: the policy does not check `adhar-system`, and it *fails open* (if Kyverno's webhook is unavailable, the Pod is admitted).

The write-back step closes the loop. CI does not deploy. It *commits* (`ci: deploy <revision>`), and ArgoCD deploys the commit. Your deployment history is your Git history.

### What `adhar push` does today

`adhar push` (and `adhar routes new`) runs a different, smaller Tekton pipeline called `new-service`:

```bash
adhar push api --git-url https://github.com/paketo-buildpacks/samples --subpath go/mod --wait
```

That pipeline creates a Deployment and a Service named `api` in `adhar-system`, running `harbor-core.adhar-system.svc.cluster.local/library/api:latest`. It does **not** build the image itself. The image appears only once `app-ci` has built and pushed it, so until then the pod cannot pull its image. `--wait` waits for the `new-service` run only (up to 15 minutes), not for a healthy pod. Check with `kubectl get deploy,pods -n adhar-system -l app=api`.

### Adopting an existing repo

The `adhar-services` ApplicationSet scans the `adhar` organisation in the platform's Gitea. It automatically picks up any repository that contains a **`.adhar/app.yaml`**. From then on, the repo has an Application named `<repo>-bootstrap`. It is synced from the repo's `.adhar` directory with prune and self-heal on. There is no registration step and no ticket.

## Give your app a backing service

You request infrastructure as ordinary Kubernetes resources, governed by normal RBAC and quotas:

```bash
adhar database create --name orders-db --engine postgresql --version 16 --size 20Gi --namespace hello
adhar cache create sessions --engine valkey --replicas 2 --namespace hello
adhar bucket create uploads --size 100Gi --namespace hello

adhar application bind hello orders-db --namespace hello   # mounts the connection Secret
```

Two flags trip people up here:

- On `adhar database`, `-n` is short for `--name`, not namespace. Use `--namespace hello` to put the database next to the app. Without it, the database goes to `default`.
- `--version` is required.
- `adhar cache` and `adhar bucket` default to `adhar-system`, so pass `--namespace hello` to them too.

```diagram
ds-bind-flow
```

`bind` finds the generated connection Secret. By convention it is `<service>-app`, and you can override it with `--secret`. `bind` adds the Secret as `envFrom` on the application's first container, then lets the Deployment roll out.

It is safe to run twice. A second bind prints that the app is already bound and changes nothing. Verify the wiring, and check that the new pods carry it:

```bash
kubectl get databases.platform.adhar.io orders-db -n hello            # READY True
kubectl get secret orders-db-app -n hello                              # the connection details
kubectl get deploy hello -n hello \
  -o jsonpath='{.spec.template.spec.containers[0].envFrom}{"\n"}'      # contains orders-db-app
kubectl rollout status deploy/hello -n hello                           # the roll completed
```

On a cloud platform, the database Compositions write `<name>-db` instead of `<name>-app`. So bind with `--secret orders-db-db` there.

Here is the declarative equivalent, which is what you would commit:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Database                         # formerly CompositeDatabase
metadata:
  name: orders-db
  namespace: hello
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local                # aws or gcp on a cloud
        engine: postgresql
  parameters:
    engine: postgresql
    engineVersion: "16"
    storageSize: 20Gi
```

Depending on the `provider` label, the same manifest becomes a managed cloud database or an in-cluster CloudNativePG instance. Your application never changes. See [Control Plane](/docs/core-concepts/control-plane) for every API you can request this way, and where each one puts its credentials.

## Secrets, observability and previews

**Secrets** never go in Git. Instead, commit an `ExternalSecret`, which is a pointer. At runtime, External Secrets fetches the value from the platform's secrets backend and creates an ordinary Kubernetes Secret:

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: myapp-config
  namespace: my-team
spec:
  secretStoreRef:
    name: openbao
    kind: SecretStore              # your namespace's own store
  target:
    name: myapp-config
  data:
    - secretKey: password
      remoteRef:
        key: tenants/my-team/myapp/config
        property: password
```

You create this `SecretStore` (here named `openbao`; the name is your choice) once in your namespace. It authenticates to OpenBao as the ServiceAccount `adhar-secrets` through OpenBao's `tenant` role, which can read only `secret/tenants/<your namespace>/`. The platform's `vault` `ClusterSecretStore` serves `adhar-system` only. OpenBao ships with the production profile, so enable it before you use this pattern on a laptop. [Manage Secrets End to End](/docs/guides/manage-secrets) has the full setup.

**Observability** needs no wiring for the basics. Prometheus and Grafana are on in both profiles, so cluster metrics for your pods (CPU, memory, restarts) are there as soon as they run. The log, trace and network-flow stacks (Loki, Tempo, Hubble) belong to the production profile and are off by default locally. To use them on a laptop, enable them with `adhar stack enable`. See [Observability](/docs/operations/observability).

**Preview environments** give every pull request its own deployment. To set them up:

1. Add a `preview/kustomization.yaml` overlay to your default branch, once.
2. Label a PR `preview`.

ArgoCD's pull-request generator re-checks every 60 seconds. It deploys to `https://<repo>-pr-<number>.<host>` in namespace `preview-<repo>-<number>`. Closing or merging the PR, or removing the label, deletes the Application. The namespace is pruned only if your overlay declares the `Namespace` object itself; otherwise it stays behind. Previews are unauthenticated, so use synthetic data only. The package (`adhar-preview-environments`) is on in the production profile and off locally.

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
- **[Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service)** — this page's last two steps, in depth
- **[Preview Environments per Pull Request](/docs/guides/preview-environments)** — previews, set up end to end
- **[Customization](/docs/operations/customization)** — enable more packages, add your own golden paths
- **[CLI Reference](/docs/reference/cli)** — every command and flag
- **[Troubleshooting](/docs/reference/troubleshooting)** — deeper failure signatures
