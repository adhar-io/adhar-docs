---
title: "Your First Service"
section: "Getting Started"
order: 4
path: "/docs/getting-started/first-service"
---

# Your First Service

This page puts an application on your platform and follows it the whole way: from a *golden-path template* (a supported starting point for a service), through a Git repository, a signed image build and a GitOps sync, to a URL in `dev`, and then on to `test` and `prod`. It is for developers shipping their first service on Adhar.

```diagram
nst-first-service
```

**You never hand-edit a running workload.** Each command on this page *declares* what you want, and the platform builds and reconciles the rest. To change what is running, you change what is committed.

## At a glance

| | |
|---|---|
| **Command** | `adhar application deploy <name> --template <id>` |
| **What it creates** | A Gitea repository `adhar/<name>` and an `Application` (`platform.adhar.io`) in `adhar-system` |
| **What builds it** | The `app-ci` Tekton pipeline, on every push to `main` |
| **What deploys it** | Kargo promotes each signed image; ArgoCD syncs it, with self-heal on |
| **Where it lands** | `https://<name>.dev.<host>` first; `test` follows automatically; `prod` takes a Release |
| **Watch it with** | `adhar application status <name> --detailed` |

## Prerequisites

- A running platform. The commands assume the local platform from [Quick Start](/docs/getting-started/quick-start); on a cloud platform only the host name changes (`<name>.dev.<your-domain>`, no port).
- `kubectl` on your `PATH`, for the checks. `git`, to change the service.

The local profile includes everything this page uses: Tekton and the supply chain, Harbor, Kargo, Argo Rollouts, cert-manager and CloudNativePG.

**Check:** the delivery packages are healthy.

```bash
adhar get status                                  # Overall Status: ● Healthy
adhar stack status kargo                          # Synced, Healthy
adhar stack status argo-rollout                   # Synced, Healthy
```

## How an application is modelled

Your application is an **`Application`** in `platform.adhar.io/v1alpha1`: the platform's own application API, a namespaced Crossplane composite resource. It belongs to a **project**, and the project owns the environments and the promotion chain. The default project, `adhar`, has `dev`, `test` and `prod`, each a namespace of the same name. From that one object, the platform composes everything needed to deliver the application to each environment:

```diagram
nst-app-environments
```

You declare *intent*: a repository and a project. The platform owns the machinery.

> **Note:** ArgoCD also has a kind called `Application`. On the command line, refer to the platform's one by its full name, `applications.platform.adhar.io`. The old kind name `CompositeApplication` is rejected, not aliased.

## Step 1 — Pick a template

Templates are the platform's golden paths. They live in the `adhar/adhar-templates` repository in the in-cluster Gitea, mirrored from upstream. The Adhar Console's create wizard offers the same collection, so a service scaffolded from the CLI and one scaffolded from the portal are the same service.

```bash
adhar application templates                    # list every template
adhar application templates go-web-service     # show one template's parameters
```

The collection includes:

| Family | Templates |
|---|---|
| Web services | `go-web-service`, `nodejs-web-service`, `python-web-service`, `quarkus-web-service`, `springboot-web-service`, `springboot-hexagon-service`, `springboot-gateway-service` |
| Frontends | `react-spa-app`, `angular-spa-app`, `tanstack-start-fullstack-app` |
| Functions | `function-go-service`, `function-nodejs-service`, `function-python-service`, `function-java-service`, `function-deno-service` |
| Batch | `springboot-batch-service`, `springboot-batch-partitioned` |
| AI | `agent-service` |

The collection changes between releases. Treat the output of `adhar application templates` as the truth for your platform.

**Check:** the second command prints the parameters the template accepts. These are the values `--param key=value` takes.

## Step 2 — Deploy it

```bash
adhar application deploy hello --template go-web-service
```

The CLI does three things, and reports each one:

1. **Scaffold.** It renders the template with your values and commits the result to a **new Gitea repository, `adhar/hello`**, as one commit named `scaffold hello from go-web-service` on `main`. The repository holds the source and `deploy/base` plus `deploy/envs/{dev,test,prod}` overlays.
2. **Declare.** It creates an `Application` named `hello` in `adhar-system`, pointing at that repository.
3. **Reconcile.** Crossplane composes the Kargo Warehouse and the ArgoCD Applications shown above.

The resulting resource:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Application
metadata:
  name: hello
  namespace: adhar-system
  labels:
    adhar.io/managed-by: adhar-cli
    adhar.io/project: adhar
    adhar.io/application: hello
    adhar.io/scaffolded: "true"
spec:
  parameters:
    project: adhar                          # --project; the default
    displayName: hello
    source:
      repoURL: <platform Gitea URL>/adhar/hello.git   # the repo just scaffolded
      path: deploy                                     # overlays live in deploy/envs/<environment>
      targetRevision: main
```

Flags that matter with `--template`:

| Flag | Effect |
|---|---|
| `--param key=value` | Set a template parameter. Repeatable |
| `--project <name>` | Put the application in another project. Default `adhar`. The project must exist |
| `--env <name>` | The environment the scaffolded hostname is published in. Default `dev` |
| `--path <dir>` | Leave it off. The template declares where its manifests live, and a path with no `envs/` directory is refused |
| `--wait` | Wait until the application reports healthy. `--timeout` defaults to `10m` |

`--namespace`, `--dest-namespace`, `--dest-server` and `--version` do not apply to a template deploy. The project's environments decide where the application runs, and the scaffold always tracks `main`. The CLI warns if you pass them.

> **Note:** The repository must be new or empty. Scaffolding never overwrites a non-empty repository: delete it, or choose another name.

**Check:** the Application exists, and so do its three ArgoCD Applications.

```bash
kubectl get applications.platform.adhar.io hello -n adhar-system
kubectl get applications.argoproj.io -n adhar-system | grep hello    # adhar-hello-dev, -test, -prod
```

## Step 3 — Watch it build and land in dev

The scaffold commit is a push, so the paved-road CI starts by itself. `app-ci` is a Tekton pipeline that runs on every push to the `main` branch of an application repository:

```diagram
gd-ci-pipeline
```

Two properties make it more than a build script:

- **Scanning happens before signing**, so only a clean image gets a signature.
- **Admission enforces the signature.** The Kyverno cluster policy `verify-supply-chain-images` runs in enforce mode: in workload namespaces, a Pod that references a Harbor `library/*` image without a valid Cosign signature is rejected. Two limits: the policy does not check `adhar-system`, and it *fails open* (if Kyverno's webhook is unavailable, the Pod is admitted).

When the image reaches Harbor, the Warehouse turns it into *Freight* (Kargo's record of one build). The project's `dev` Stage promotes it: Kargo renders `deploy/envs/dev` with the image digest into the branch `stage/dev`, and ArgoCD syncs that branch into the `dev` namespace. Follow it:

```bash
tkn -n adhar-system pipelinerun logs -f --last       # the build, if you have the Tekton CLI
adhar application status hello --detailed            # sync, health, revision, per-environment status
```

`adhar application status` looks for the Application in `adhar-system` and then `dev` unless you pass `-n`. Add `-o json` for machine-readable output.

**Check:** verify each layer, top to bottom.

```bash
kubectl -n adhar get freights.kargo.akuity.io                         # one Freight per build
kubectl get rollout,pods,svc,httproute -n dev                         # the workload itself
curl -sk -o /dev/null -w 'HTTP %{http_code}\n' https://hello.dev.adhar.localtest.me:8443   # HTTP 200
```

The service's address is `<name>.<environment>.<host>`, so each environment has its own URL.

## Step 4 — Promote to test and prod

Promotion follows the project's chain, **`dev` → `test` → `prod`**, and moves the same signed image digest from stage to stage:

```diagram
ha-promotion-chain
```

**`test` follows by itself.** Once `dev` runs the build Healthy, Kargo verifies it and promotes the same Freight to `test`. Until that first promotion, `test` and `prod` deploy nothing.

```bash
kubectl -n adhar get stages.kargo.akuity.io                          # dev, test, prod and their Freight
curl -sk -o /dev/null -w 'HTTP %{http_code}\n' https://hello.test.adhar.localtest.me:8443  # HTTP 200
```

**`prod` is never promoted automatically.** A production change arrives through a **Release**: an object that names one Freight and one environment, and records why. Copy the Freight name (the 40-character hash in the `NAME` column, not its alias) from `kubectl -n adhar get freights.kargo.akuity.io`, then:

```yaml
# release-hello-prod.yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Release
metadata:
  name: hello-prod-1                 # a new Release per promotion; Promotions are immutable
  namespace: adhar-system            # alongside the Project and the Application
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: kargo
  parameters:
    project: adhar                   # the Kargo project namespace the Stages live in
    application: hello
    environment: prod
    freight: <freight-name>
    reason: "first production release of hello"
```

```bash
kubectl apply -f release-hello-prod.yaml
```

**Check:** the Promotion succeeds and `prod` answers.

```bash
kubectl -n adhar get promotions.kargo.akuity.io -l adhar.io/release=hello-prod-1   # Succeeded
curl -sk -o /dev/null -w 'HTTP %{http_code}\n' https://hello.prod.adhar.localtest.me:8443  # HTTP 200
```

You can watch the same chain in the Kargo UI at `https://kargo.adhar.localtest.me:8443`. [Promote Across Environments](/docs/guides/promote-across-environments) covers per-environment configuration, soak times and rollback.

## Step 5 — Change it

Clone `adhar/hello` from Gitea, edit it, commit and push. Sign in as `gitea_admin` (`adhar get secrets -p gitea`). Git needs the platform CA to trust the local certificate:

```bash
kubectl -n default get secret adhar-cert -o jsonpath='{.data.ca\.crt}' | base64 -d > adhar-ca.crt
git config --global http.https://gitea.adhar.localtest.me:8443/.sslCAInfo "$PWD/adhar-ca.crt"
git clone https://gitea.adhar.localtest.me:8443/adhar/hello.git && cd hello
# edit main.go, or a manifest under deploy/
git commit -am "Change the greeting" && git push
```

The same loop runs again: `app-ci` builds and signs a new image, Kargo promotes it to `dev` and then `test`, and ArgoCD syncs each. `prod` keeps the release you gave it until the next Release.

```diagram
gd-sync-states
```

Three ArgoCD states are worth recognising:

- **`OutOfSync`**: Git and the cluster differ. Expected right after a commit or a promotion.
- **`Progressing`**: applied, and waiting for pods or images to be ready.
- **`Healthy` + `Synced`**: done. The URL serves the new version.

**Check:** `kubectl -n adhar get freights.kargo.akuity.io` lists a new Freight, and `https://hello.dev.adhar.localtest.me:8443` serves your change.

> **Warning:** Do not fix a running app with `kubectl edit`. ArgoCD reconciles with self-heal enabled, so a hand edit to a managed object is reverted. Commit to the repository instead.

## Give your app a backing service

### With the template

The web-service templates can provision a database with the service. Pass the parameter when you scaffold:

```bash
adhar application deploy shop --template go-web-service --param withDatabase=true
```

The repository then carries `deploy/base/database.yaml`, a CloudNativePG PostgreSQL cluster named `shop-db`. The operator writes its connection details to the Secret `shop-db-app`, and the workload reads the connection string as `DATABASE_URL`. Because it is in Git, every environment gets its own database once a build is promoted there.

**Check:** `kubectl get clusters.postgresql.cnpg.io shop-db -n dev` shows the cluster in a healthy state.

### From the control plane

You can also request infrastructure as Kubernetes resources, governed by normal RBAC and quotas:

```bash
adhar database create --name orders-db --engine postgresql --version 16 --size 20Gi --namespace dev
adhar cache create sessions --engine valkey --replicas 2 --namespace dev
adhar bucket create uploads --size 100Gi --namespace dev
```

Watch the namespace flags:

- On `adhar database`, `-n` is short for `--name`, not namespace. Spell out `--namespace`; without it the database goes to `default`. `--version` is required.
- `adhar cache` and `adhar bucket` default to the platform namespace (`adhar-system`), so pass `--namespace` to them too.

The declarative equivalent, which is what you would commit:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Database
metadata:
  name: orders-db
  namespace: dev
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local                # aws or gcp on a cloud
        feature: database
        engine: postgresql
  parameters:
    engine: postgresql
    engineVersion: "16"
    storageSize: 20Gi
```

Depending on the `provider` label, the same manifest becomes a managed cloud database or an in-cluster CloudNativePG cluster with scheduled backups. Your application does not change. Locally the connection Secret is `<name>-app`; the cloud database Compositions write `<name>-db` instead. [Control Plane](/docs/core-concepts/control-plane) lists every API you can request and where each puts its credentials.

**Check:** follow the request down to what it produced.

```bash
kubectl get databases.platform.adhar.io orders-db -n dev      # the request: READY True
kubectl get clusters.postgresql.cnpg.io orders-db -n dev      # what it composed locally
kubectl get secret orders-db-app -n dev                       # the connection details
```

To use the Secret, reference it from your manifests in Git (`envFrom` or `secretKeyRef`) and push.

### `adhar application bind`

`bind` is a shortcut for workloads that run as a **Deployment** named after the application, such as one deployed with `--repo`:

```bash
adhar application bind my-app orders-db -n dev
```

```diagram
ds-bind-flow
```

It finds the connection Secret (`<service>-app` by default; override with `--secret`), adds it as `envFrom` on the Deployment's first container, and lets the Deployment roll. A second run reports that the app is already bound and changes nothing. `bind` patches the live Deployment only, so Git does not record it. Template services run as Argo Rollouts and declare their Secrets in Git instead.

**Check:** `kubectl get deploy my-app -n dev -o jsonpath='{.spec.template.spec.containers[0].envFrom}'` names the Secret.

## Other ways in

| You have | Command |
|---|---|
| Manifests or a chart already in Git | `adhar application deploy my-app --repo https://github.com/org/repo --path manifests/ --dest-namespace my-team --wait` |
| An `Application` manifest you wrote yourself | `adhar application deploy my-app --file my-app.yaml` |
| A repository in the platform's Gitea | Add a `.adhar/app.yaml` (see below) |

A `--repo` deploy creates the `Application` in the namespace given by `-n` (default `dev`), and a single ArgoCD Application syncs the path you name. The ArgoCD project must allow the destination namespace: the default `--project adhar` admits only `adhar`, `dev`, `test` and `prod`, so for a namespace of your own pass your team's project, or ArgoCD's unrestricted `default`. The CLI checks this before it creates anything.

### Adopting an existing repo

The `adhar-services` ApplicationSet scans the `adhar` organisation in the platform's Gitea and picks up any repository that contains **`.adhar/app.yaml`**. The repository then gets an ArgoCD Application named `<repo>-bootstrap`, synced from its `.adhar` directory with prune and self-heal on. There is no registration step.

### What `adhar push` does today

`adhar push` (and `adhar routes new`) runs a smaller Tekton pipeline called `new-service`:

```bash
adhar push api --git-url https://github.com/paketo-buildpacks/samples --subpath go/mod --wait
```

That pipeline creates a Deployment and a Service named `api` in `adhar-system`, running `harbor-core.adhar-system.svc.cluster.local/library/api:latest`. It does **not** build the image. The image appears only once `app-ci` has built and pushed it, so until then the pod cannot pull its image. `--wait` waits for the `new-service` run only, not for a healthy pod.

**Check:** `kubectl get deploy,pods -n adhar-system -l app=api`.

## Secrets, observability and previews

**Secrets** never go in Git. Commit an `ExternalSecret`, which is a pointer. At runtime, External Secrets fetches the value from the platform's secrets backend and creates an ordinary Kubernetes Secret:

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

You create the `SecretStore` (here named `openbao`; the name is your choice) once in your namespace. It authenticates to OpenBao as the ServiceAccount `adhar-secrets` through OpenBao's `tenant` role, which can read only `secret/tenants/<your namespace>/`. The platform's `vault` `ClusterSecretStore` serves `adhar-system` only. OpenBao ships with the production profile, so enable it (`adhar stack enable openbao`) before you use this pattern on a laptop. [Manage Secrets End to End](/docs/guides/manage-secrets) has the full setup.

**Observability** needs no wiring for the basics. Prometheus and Grafana are on in both profiles, so cluster metrics for your pods (CPU, memory, restarts) are there as soon as they run. Loki, Tempo and Hubble belong to the production profile; enable them locally with `adhar stack enable`. See [Observability](/docs/operations/observability).

**Preview environments** give every pull request its own deployment:

1. Add a `preview/kustomization.yaml` overlay to your default branch, once.
2. Label a pull request `preview`.

ArgoCD's pull-request generator re-checks every 60 seconds and deploys to `https://<repo>-pr-<number>.<host>` in namespace `preview-<repo>-<number>`. Closing or merging the pull request, or removing the label, deletes the deployment. Previews are unauthenticated, so use synthetic data only. The package (`adhar-preview-environments`) is on in the production profile and off locally. See [Preview Environments per Pull Request](/docs/guides/preview-environments).

## Manage a running application

```bash
adhar application list -A                 # inventory across all namespaces
adhar application status hello --detailed
```

`adhar application scale <name> --replicas <n>` and `adhar application restart <name>` act on a Deployment named after the application in `-n` (default `dev`). For a template service, change the replica count in `deploy/` and push.

## Troubleshooting

Work down the chain: intent → build → Freight → ArgoCD → workload → route. Fix the first layer that is wrong.

| Symptom | Cause | Fix |
|---|---|---|
| `repository adhar/hello already exists and is not empty` | An earlier run already scaffolded the repository | Delete the repository in Gitea, or choose another name |
| `--path …: template … renders nothing under …/envs/` | `--path` was passed with a template | Leave `--path` off |
| `project "…" does not exist in adhar-system` | `--project` names a project that is not there | `kubectl get projects.platform.adhar.io -n adhar-system`, then pass an existing one |
| `argo CD project "adhar" does not allow namespace …` on a `--repo` deploy | The project does not own the destination namespace | Pass `--project` with your team's project, or `default` |
| `application not found: hello in adhar-system or dev` | The Application is in another namespace | `adhar application list -A`, then pass the right `-n` |
| Application exists but nothing is deployed in `dev` | The build has not finished, or a gate failed | Check the `app-ci` run: `tkn -n adhar-system pipelinerun list` |
| No Freight appears | CI has not published an image yet, or Kargo is not healthy | `adhar stack status kargo`; check Harbor for `library/hello` |
| `test` or `prod` deploys nothing | Nothing has been promoted there yet | Expected: `test` waits for `dev` to verify a build; `prod` waits for a Release |
| Release does not reach `prod` | The Freight name is an alias, or `test` has not verified that Freight | `kubectl -n adhar logs job/release-hello-prod-1`; use the 40-character name of a Freight `test` has verified |
| Stuck `OutOfSync` | The manifest path is wrong, or the repository has no manifests there | Check the repository in Gitea. For `--repo`, re-deploy with the right `--path` |
| `Progressing` forever, pods `Pending` | The node is out of memory or CPU | `kubectl describe pod -n dev` and `kubectl top nodes`. Give the engine more RAM |
| `ImagePullBackOff` | The image is missing or not yet built | `kubectl describe pod -n dev`. Check that the build pipeline finished |
| Pod rejected at admission | The image is unsigned, so Kyverno blocks it | Build through the supply chain so the image gets signed |
| `Healthy` but the URL returns nothing | No `HTTPRoute`, or a hostname mismatch | `kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]` |
| `git clone` fails with `SSL certificate problem` | Git does not trust the local self-signed certificate | Set `http.<url>.sslCAInfo` to the platform CA, as in Step 5 |

[Troubleshooting](/docs/reference/troubleshooting) has deeper failure signatures.

## Clean up

```bash
adhar application delete hello            # asks first; --force skips the question
```

This deletes the `Application`, and Crossplane and ArgoCD remove what it composed in every environment. It does not delete the Gitea repository `adhar/hello`: delete that in Gitea before you reuse the name.

**Check:** `kubectl get applications.argoproj.io -n adhar-system | grep hello` returns nothing.

## Next steps

- **[Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service)**: a service and its database, in depth
- **[Promote Across Environments](/docs/guides/promote-across-environments)**: per-environment configuration, soak times and rollback
- **[Platform Services](/docs/core-concepts/platform-services)**: everything else your application can reach for
- **[CLI Reference](/docs/reference/cli)**: every command and flag
