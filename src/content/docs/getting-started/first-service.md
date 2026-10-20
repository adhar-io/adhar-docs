---
title: "Your First Service"
section: "Getting Started"
order: 4
path: "/docs/getting-started/first-service"
---

# Your First Service

You have a platform. This page puts an application on it and follows the change the whole way. It starts at a golden-path template (a ready-made starting point for a service). It goes through a Git repository and ArgoCD reconciliation, and ends at a URL you can open.

**Nothing you are about to do writes to the cluster directly.** Understanding why is the point of this exercise. On Adhar, the cluster is a copy of what is in Git. To change what is running, you change what is committed.

Everything below assumes a local platform from [Quick Start](/docs/getting-started/quick-start). The commands are identical on a cloud platform. Only the host name changes. By the end of this page, you will have:

- scaffolded and deployed a service
- watched the GitOps loop converge it
- verified it at every layer
- given it a database
- bound that database's credentials into it

## At a glance

| | |
|---|---|
| **Fastest path** | `adhar application deploy <name> --template <id> -n <ns>` |
| **What it creates** | A Gitea repo `adhar/<name>` plus an `Application` resource (`platform.adhar.io`) |
| **What reconciles it** | ArgoCD, continuously, with self-heal on |
| **Where it lands** | `https://<name>.adhar.localtest.me:8443` |
| **Watch it with** | `adhar application status <name> --detailed` |

## The model: who creates what

Whichever route you take, your application becomes an **`Application`** in `platform.adhar.io/v1alpha1`. This is the platform's own application API, a namespaced Crossplane composite resource. (It was called `CompositeApplication` until 2026-10-07. The old kind is rejected, not aliased.) Crossplane expands it into an ArgoCD Application, and ArgoCD keeps the workload matching Git:

```diagram
gd-composite-application
```

This extra layer means you only declare *intent*: a repo, a path, a destination. The platform owns the machinery. The same `Application` behaves identically on Kind and on a cloud, because the platform picks a provider-specific composition for you.

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

Name a template to see the parameters it accepts. These are the values `--param key=value` takes. Check them first: if you miss a required parameter, the failure looks random:

```bash
adhar application templates microservice
```

## Step 2 — Deploy it

The `Application` is namespaced, and neither the CLI nor the control plane creates its namespace for you. Create the namespace first, then deploy into it.

Watch the `-n` flag. On `adhar application`, `-n` means `--namespace`. On `adhar database`, it means `--name`, so spell out `--namespace` there:

```bash
kubectl create namespace hello
adhar application deploy hello --template microservice -n hello
```

Three things happen, in order, and the CLI reports each one:

1. **Scaffold.** The CLI fills in the template's skeleton with your values. It commits the result to a **new Gitea repository, `adhar/hello`**, as a single commit named `scaffold hello from microservice` on `main`. It fills in the template's hostname parameter for you from the platform host, giving `hello.adhar.localtest.me`.
2. **Declare.** The CLI creates an `Application` named `hello` in namespace `hello`. It points at that repository and at the manifest path the template declares.
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
    project: default                        # the Argo CD project (--project)
    source:
      repoURL: <platform Gitea URL>/adhar/hello.git   # the repo just scaffolded
      path: <the template's manifest path>             # or --path
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
curl -sk -o /dev/null -w 'HTTP %{http_code}\n' https://hello.adhar.localtest.me:8443
```

> **Do not fix a running app with `kubectl edit`.** ArgoCD reconciles with self-heal enabled, so a hand edit to a managed object is reverted, typically within a minute. It looks like the cluster is ignoring you. Commit to the repository instead. That is the only change that lasts.

## Step 4 — Debug when it does not come up

Work down the chain: intent → ArgoCD → workload → route. Fix the first layer that is wrong.

| Symptom | Likely cause | What to do |
|---|---|---|
| `namespaces "hello" not found` on deploy | The namespace was never created | `kubectl create namespace hello`, then deploy again |
| `application not found: hello/hello` | Wrong namespace. `-n` defaults to `default` | `adhar application list -A` |
| Stuck `OutOfSync`, never applies | Manifest path wrong, or the repo has no manifests at that path | Re-deploy with an explicit `--path`. Check the repo in Gitea |
| `Progressing` forever, pods `Pending` | Node out of memory or CPU | Run `kubectl describe pod -n hello` and `kubectl top nodes`. Give the engine more RAM |
| `ImagePullBackOff` | Image missing, or not yet built | Run `kubectl describe pod -n hello`. Check the build pipeline finished |
| Pod rejected at admission | Unsigned image. Kyverno blocks it | Build through the supply chain so the image gets signed (below) |
| `Healthy` but the URL returns nothing | No `HTTPRoute`, or a hostname mismatch | `kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]` |
| Everything green, browser warns on TLS | The local certificate is self-signed | Expected. Accept it, or trust the platform CA |

## The paved road: build from source

`adhar push` and the Console both trigger the platform's Tekton supply chain. So a developer and an operator take the same path:

```bash
adhar push api --git-url https://github.com/paketo-buildpacks/samples --subpath go/mod --wait
```

This is the full CI pipeline a repo runs on every push:

```diagram
gd-ci-pipeline
```

Two properties make this more than a build script:

- **Scanning happens before signing**, so only a clean image ever gets a signature.
- The Kyverno cluster policy `verify-supply-chain-images` runs in enforce mode. A Pod that references a Harbor `library/*` image without a valid Cosign signature is rejected at admission. Unsigned code cannot run, no matter how it was applied.

The write-back step closes the loop. CI does not deploy. It *commits*, and ArgoCD deploys the commit. Your deployment history is your Git history.

### Adopting an existing repo

The `adhar-services` ApplicationSet scans the `adhar` organisation in the platform's Gitea. It automatically picks up any repository that contains a **`.adhar/app.yaml`**. From then on, the repo has an Application named `<repo>-bootstrap`. It is synced from the repo's `.adhar` directory with prune and self-heal on. There is no registration step and no ticket.

## Give your app a backing service

You request infrastructure as ordinary Kubernetes resources, governed by normal RBAC and quotas:

```bash
adhar database create --name orders-db --engine postgresql --version 16 --size 20Gi --namespace hello
adhar cache create sessions --engine valkey --replicas 2
adhar bucket create uploads --size 100Gi

adhar application bind hello orders-db --namespace hello   # mounts the connection Secret
```

Two flags trip people up here:

- On `adhar database`, `-n` is short for `--name`, not namespace. Use `--namespace hello` to put the database next to the app.
- `--version` is required.

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

You create the `SecretStore` named `openbao` once in your namespace, with a ServiceAccount named `adhar-secrets`. It can read only `secret/tenants/<your namespace>/`. The platform's `vault` `ClusterSecretStore` serves `adhar-system` only. OpenBao ships with the production profile, so enable it before you use this pattern on a laptop. [Manage Secrets End to End](/docs/guides/manage-secrets) has the full setup.

**Observability** needs no wiring. Metrics from your pods reach Prometheus and Grafana as soon as they run. The log, trace and network-flow stacks (Loki, Tempo, Hubble) belong to the production profile and are off by default locally. To use them on a laptop, enable them with `adhar stack enable`. See [Observability](/docs/operations/observability).

**Preview environments** give every pull request its own deployment. To set them up:

1. Add a `preview/kustomization.yaml` overlay to your default branch, once.
2. Label a PR `preview`.

ArgoCD's pull-request generator re-checks every 60 seconds. It deploys to `https://<repo>-pr-<number>.<host>` in namespace `preview-<repo>-<number>`. Closing or merging the PR, or removing the label, deletes the Application and prunes the namespace. Previews are unauthenticated, so use synthetic data only. The package ships with the production profile.

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
