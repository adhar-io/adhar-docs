---
title: "Deploy a Database-Backed Service"
section: "Guides"
order: 1
path: "/docs/guides/deploy-a-database-backed-service"
---

# Deploy a Database-Backed Service

This guide takes one service from nothing to running against its own PostgreSQL database. Then it removes everything again. You will:

- scaffold the service from a golden-path template (a ready-made starting project)
- request the database through the platform's self-service API
- wire the database credentials into the service through Git
- verify every layer
- tear the whole thing down

It is for application developers who have finished [Your First Service](/docs/getting-started/first-service) and now need state. By the end you will know which objects you own and which the platform composes for you. You will also know where to look when one of them is wrong.

## What you will build

A service called `orders` in its own namespace, backed by a PostgreSQL database called `orders-db`:

```diagram
ha-db-binding
```

You write two things: a `Database` request and the `env` block of the service's Deployment. The platform produces everything in between: the composition, the CloudNativePG cluster and the generated credentials Secret.

```diagram
ha-db-guide-steps
```

### Prerequisites

| You need | Check with |
|---|---|
| A running platform (local Kind is fine) | `adhar get status` |
| `kubectl` pointed at it | `kubectl config current-context` shows `kind-adhar` on a laptop, or `adhar` (`adhar-<cluster>` with `--name`) on a cloud install |
| The `cnpg` package (on in both the local and production profiles) | `adhar stack status cnpg` |
| Gitea credentials to clone the scaffolded repo | `adhar get secrets -p gitea` |

> **Kinds were renamed.** The self-service kinds are named after the thing they create: `Database` and `Application` in `platform.adhar.io/v1alpha1`. The API server rejects the older `CompositeDatabase` and `CompositeApplication` names; they are not aliases. ArgoCD also has an `Application` kind, so use the full name on the command line: `kubectl get applications.platform.adhar.io`.

## How the pieces fit

**A `Database` is a namespaced Crossplane v2 composite resource.** You create it in the namespace where the service will run. Crossplane picks a composition (the template that turns your request into real resources) by label. `provider: local` plus `engine: postgresql` selects `database-local-cnpg`. That is also the XRD's default, so a bare request never reaches for a cloud composition that has no credentials.

On a cloud platform, set `provider: aws` (or `gcp`, `azure`) to select the managed-database composition instead. The rest of the request does not change.

**`database-local-cnpg` renders a CloudNativePG `Cluster`** in your namespace. It has the same name as the `Database`. CNPG then does three things you rely on:

1. It starts the Postgres instance pods (`orders-db-1`, and more if you ask for replicas).
2. It creates the read-write Service `orders-db-rw`, which is the host your app connects to.
3. It **generates a Secret named `<name>-app`** (here, `orders-db-app`). The Secret holds the owner's credentials and a ready-made connection string: `uri`, plus `host`, `port`, `dbname`, `username` and `password`.

That `-app` Secret is the contract between the database and the application. `adhar application bind` expects it by name, and the manifests below reference it directly.

> **One trap in that contract.** If you set `credentialsSecret` on the `Database`, CNPG creates the owner from your Secret and **stops generating `<name>-app`**. Anything that mounts `orders-db-app` then fails with `secret "orders-db-app" not found`. Leave `credentialsSecret` unset unless you mean it.

## Step 1 — Create the namespace

`Database` and `Application` are namespaced. Neither the CLI nor the control plane creates the namespace for you, so create it first:

```bash
kubectl create namespace orders
```

**Verify:**

```bash
kubectl get namespace orders
```

`STATUS` is `Active`.

If your team will run more than one service, use a Project instead. It gives you a namespace with quota, network policy and team RBAC already attached. See [Onboard a Team](/docs/guides/onboard-a-team).

## Step 2 — Request the database

Write the request to a file. Every field below is checked against the XRD schema. The API server does not reject an unknown field; it silently drops it. So a typo applies cleanly and configures nothing.

```yaml
# database.yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Database
metadata:
  name: orders-db          # also the CNPG Cluster name, and the prefix of orders-db-app
  namespace: orders        # must be the namespace the service runs in
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local      # in-cluster CNPG; aws | gcp | azure on a cloud
        feature: database
        engine: postgresql
  parameters:
    engine: postgresql
    # Required by the schema. The CLOUD compositions provision this version;
    # the in-cluster one ignores it and lets the CNPG operator choose its image.
    # Pin `imageName` if you need a specific build.
    engineVersion: "16"
    storageSize: 5Gi
    replicas: 0              # 0 = a single instance; 1–5 adds streaming replicas
    databaseName: orders     # the logical database created at bootstrap
    credentials:
      masterUsername: orders # the owner; its password lands in orders-db-app
    # Requests are NOT defaulted: set them, or the pod runs best-effort.
    resources:
      cpu: 100m
      memory: 256Mi
      memoryLimit: 512Mi
    # The in-cluster backup stanza reads a Secret named `root-creds` from THIS
    # namespace and writes to the platform object store. A fresh team namespace
    # does not have that Secret, so this guide turns backup off.
    enableBackup: false
```

Apply it:

```bash
kubectl apply -f database.yaml
```

If you prefer one line, the CLI creates an equivalent object. On `adhar database`, `-n` means `--name`. The namespace flag has no short form:

```bash
adhar database create --name orders-db --engine postgresql --version 16 \
  --size 5Gi --namespace orders
```

The CLI leaves backup at its default (on). In a fresh namespace you will then hit the `root-creds` issue in the troubleshooting table. Keep the manifest version, because you will commit it in Step 4.

**Verify** — the request, the cluster it composed, and the Secret CNPG generated:

```bash
kubectl -n orders get databases.platform.adhar.io orders-db
kubectl -n orders get clusters.postgresql.cnpg.io orders-db
kubectl -n orders get secret orders-db-app -o jsonpath='{.data}' | jq 'keys'
```

You should see:

- `SYNCED` and `READY` on the `Database` both become `True`.
- The CNPG cluster reports `Cluster in healthy state`.
- The Secret lists keys including `dbname`, `host`, `password`, `port`, `uri` and `username`.

The first start pulls the Postgres image, so allow a few minutes on a laptop.

> `adhar database status orders-db --namespace orders` prints the request's engine, version and size. Only the cloud compositions fill the `Phase` and `Endpoint` fields. For the in-cluster composition, readiness is the `READY` column above, and the endpoint is the `orders-db-rw` Service.

If `READY` stays `False`, the events on the XR (the composite resource) name the failing layer:

```bash
kubectl -n orders describe databases.platform.adhar.io orders-db
```

## Step 3 — Scaffold the service

Golden-path templates live in the `adhar/adhar-templates` repository in the platform's Gitea (a mirror of `github.com/adhar-io/adhar-templates`). The Console's create wizard reads the same collection. List the templates, then inspect the one you will use to see its parameters:

```bash
adhar application templates
adhar application templates microservice
```

`microservice` scaffolds a hardened Go HTTP service: a Namespace, Deployment, Service, HTTPRoute and ServiceMonitor under `manifests/`. Every object is placed in a namespace **named after the application**, so an app called `orders` lands in `orders`, next to the database. Until your own CI builds an image, the Deployment runs a placeholder (`podinfo`) that answers on port 8080. Its container is named `app`.

> **Pick the template carefully.** The older `basic` template hard-codes `namespace: default` in its Deployment. That overrides the destination, so the pod would run in `default`, where `orders-db-app` does not exist.

Deploy it into the same namespace as the database:

```bash
adhar application deploy orders --template microservice -n orders \
  --path manifests --project default --wait
```

Two flags need explaining:

- `--path manifests` tells ArgoCD which directory of the new repository to deploy. Pass it explicitly: when a template does not declare its path in a form the CLI recognises, the CLI falls back to `deploy`, which the shipped skeletons do not have.
- `--project default` uses ArgoCD's unrestricted `default` project. The CLI's own default, `--project adhar`, is the platform's Project, and its ArgoCD AppProject admits only that project's namespaces (`adhar`, `dev`, `test` and `prod`). A stand-alone namespace such as `orders` is not among them. In a team Project, pass the team's project instead (see [Onboard a Team](/docs/guides/onboard-a-team)).

Three things happen, and the CLI reports each one:

1. The template's skeleton is rendered into a **new Gitea repository `adhar/orders`** as one commit on `main`.
2. An `Application` named `orders` is created in namespace `orders`, pointing at that repository.
3. Crossplane composes an ArgoCD Application from it, and ArgoCD syncs the manifests.

`--wait` blocks until the application reports healthy, up to the default 10-minute `--timeout`.

The resulting `Application` is the declarative version of the command you just ran:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Application
metadata:
  name: orders
  namespace: orders
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local          # set by the CLI → application-local-argocd
        feature: application
  parameters:
    project: default             # the ArgoCD project, from --project
    source:
      repoURL: <the platform Gitea URL>/adhar/orders.git
      path: manifests
      targetRevision: main
    destination:
      namespace: orders
      server: https://kubernetes.default.svc
```

**Verify:**

```bash
adhar application status orders -n orders --detailed
kubectl -n orders get deploy
kubectl get applications.platform.adhar.io -n orders orders \
  -o jsonpath='{.spec.parameters.source.path}{"\n"}'
```

You should see:

- The status shows `Synced` and `Healthy`.
- `kubectl get deploy` lists the Deployment `orders`. `bind` and Step 4 rely on that name.
- The last command prints `manifests`, the repository directory that ArgoCD deploys from.

## Step 4 — Bind the credentials, in Git

There are two ways to get `orders-db-app` into the service. Choose based on whether the change should last beyond the afternoon.

**The shortcut: `adhar application bind`.** It finds the Deployment named after the app and checks that `orders-db-app` exists. It then appends the Secret as `envFrom` on the **first container** and lets the Deployment roll. It is idempotent: binding twice reports "already bound" and changes nothing.

```bash
adhar application bind orders orders-db -n orders
```

`bind` patches the **live** Deployment. Git does not know about the change, so the next person to read the repository will not see where the credentials come from. Use it for a quick experiment (a spike).

**The GitOps way: commit the reference.** Clone the repository (credentials from `adhar get secrets -p gitea`):

```bash
git clone https://gitea.adhar.localtest.me:8443/adhar/orders.git
cd orders
```

In `manifests/deployment.yaml`, edit the Deployment's container so it reads each value it needs by key. Naming keys explicitly is clearer than `envFrom`. It also lets you rename them to what your code expects:

```yaml
# manifests/deployment.yaml  (only the container section shown; keep the
# probes, ports and securityContext the template generated)
      containers:
        - name: app                       # the microservice template's container name
          image: ghcr.io/stefanprodan/podinfo:6.7.1   # the placeholder, until CI builds yours
          env:
            - name: DATABASE_URL           # what your code reads
              valueFrom:
                secretKeyRef:
                  name: orders-db-app      # generated by CNPG, never committed
                  key: uri                 # postgresql://orders:…@orders-db-rw.orders:5432/orders
            - name: PGHOST
              valueFrom: { secretKeyRef: { name: orders-db-app, key: host } }
            - name: PGUSER
              valueFrom: { secretKeyRef: { name: orders-db-app, key: username } }
            - name: PGPASSWORD
              valueFrom: { secretKeyRef: { name: orders-db-app, key: password } }
```

Then move `database.yaml` from Step 2 into the same directory. Now the database is declared next to the code that needs it, and ArgoCD owns both:

```bash
cp ../database.yaml manifests/database.yaml
git add -A
git commit -m "orders: declare orders-db and read its credentials"
git push origin main
```

ArgoCD adopts the `Database` you already applied. The object is identical, so nothing is recreated. ArgoCD then rolls the Deployment with the new environment.

> **Check the namespace in the rendered manifests.** A `metadata.namespace` hard-coded in a skeleton overrides the Application's destination. If the Deployment declares a namespace other than `orders`, it lands where the Secret is not. The pod then fails with `secret "orders-db-app" not found`.

**Verify:**

```bash
adhar application status orders -n orders
kubectl -n orders get pods
kubectl -n orders get deploy -o yaml | grep -A3 secretKeyRef | head -8
```

You should see:

- The application returns to `Synced` / `Healthy`.
- The pod has restarted (it has a new `AGE`).
- The live spec shows the `secretKeyRef` entries you committed.

If the Deployment and the database arrive in the same sync, the pod may sit in `CreateContainerConfigError` for a moment until CNPG writes the Secret. The kubelet retries, and the error clears on its own.

## Step 5 — Verify end to end

Check each hop separately, starting at the database and working outwards.

**Check that Postgres answers, as the owner, in the right database.** The CNPG instance pod's container is named `postgres`:

```bash
kubectl -n orders exec orders-db-1 -c postgres -- \
  psql -d orders -c 'select current_database(), version();'
```

You get one row naming `orders` and the server version.

**Check that the app sees the variables.** The template's container is named `app`:

```bash
kubectl -n orders exec deploy/orders -c app -- sh -c 'echo "$PGHOST"; test -n "$DATABASE_URL" && echo DATABASE_URL set'
```

The output is `orders-db-rw`, then `DATABASE_URL set`. Never echo the URL itself, because it contains the password.

**Check that the app can reach the host.** The `-rw` Service has the primary as its only endpoint:

```bash
kubectl -n orders get endpoints orders-db-rw
```

You see one address on port `5432`.

**Check that Git is the source of truth.** Restart the workload and watch the new pod come back with the same environment. The wiring lives only in the repository and the generated Secret:

```bash
kubectl -n orders rollout restart deploy/orders
kubectl -n orders rollout status deploy/orders
```

`rollout status` ends with `successfully rolled out`.

## Step 6 — Tear down

Delete things in reverse order of dependency. Remove the repository yourself, because deleting the application does not delete its Gitea repo.

```bash
# 1. Stop ArgoCD reconciling the app (and through it, the Database you committed).
adhar application delete orders -n orders --force

# 2. Delete the database request. ArgoCD prunes it with the app if you
#    committed it in Step 4 — then this reports "not found", which is fine.
#    CNPG removes the Cluster, its pods, its volumes and orders-db-app with it.
adhar database delete orders-db --namespace orders --force

# 3. The namespace. The template's manifests include the Namespace, so ArgoCD
#    may already have pruned it; "not found" is fine here too.
kubectl delete namespace orders
```

Finally, delete the `adhar/orders` repository in the Gitea UI (Settings → Danger Zone). If you skip this, the next `adhar application deploy orders --template …` refuses to scaffold into a non-empty repository.

**Verify:**

```bash
kubectl get applications.platform.adhar.io -A | grep orders
kubectl get databases.platform.adhar.io -A | grep orders
kubectl get namespace orders
```

All three return nothing. The last one reports `NotFound`.

> **Data does not survive this.** The in-cluster composition ignores `deletionPolicy`. Deleting the `Database` deletes the CNPG cluster and its volumes. If you care about the data, take a backup first. See [Backup and Restore](/docs/guides/backup-and-restore).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `namespaces "orders" not found` on create | The namespace does not exist; nothing creates it for you | Step 1, or create a Project |
| `no matches for kind "CompositeDatabase"` | The old kind name | Use `kind: Database` |
| `Database` `SYNCED=False` | Composition selection or pipeline failure | `kubectl -n orders describe databases.platform.adhar.io orders-db` — the events name the layer |
| `READY=False`, CNPG cluster never healthy, events mention `root-creds` | Backup is on and its credential Secret is not in this namespace | Set `enableBackup: false`, or provide backup credentials deliberately |
| CNPG pods `Pending` | Not enough memory or CPU on the node | `kubectl -n orders describe pod orders-db-1`; lower `resources` or add capacity |
| `secret "orders-db-app" not found` | `credentialsSecret` was set, the Deployment is in another namespace, or the cluster is not ready yet | Unset `credentialsSecret`; check `metadata.namespace`; wait for `READY=True` |
| ArgoCD reports the destination namespace `orders` is not permitted in project `adhar` | The deploy used the CLI's default `--project adhar`, whose AppProject admits only the platform project's namespaces | Redeploy with `--project default`, or deploy into a namespace of your own Project |
| `adhar application bind` says the deployment was not found | `bind` looks for a Deployment named after the app, in `-n` (default `dev`) | Pass `-n orders`; check `kubectl -n orders get deploy` |
| `bind` worked but the variable is missing | `bind` injects into the **first** container only | Use explicit `secretKeyRef` in the container that needs it |
| App connects, then authentication fails after a restore or credential change | The app cached the old password | `kubectl -n orders rollout restart deploy/orders` |
| `repository adhar/orders already exists and is not empty` | The Gitea repo from a previous run still exists | Delete `adhar/orders` in Gitea, or choose another name |
| ArgoCD reports `app path does not exist` | The Application points at a directory the repo does not have (the CLI's fallback is `deploy`) | Redeploy with `--path manifests`, or fix `spec.parameters.source.path` |
| Edits with `kubectl edit` disappear | ArgoCD self-heal reverts changes to objects it manages | Commit the change instead |

## Next steps

- **[Manage Secrets End to End](/docs/guides/manage-secrets)** — credentials that are not generated by a database: API keys, tokens, third-party passwords
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — take this service from dev to prod by digest
- **[Onboard a Team](/docs/guides/onboard-a-team)** — a guard-railed home for the service instead of a bare namespace
- **[Control Plane](/docs/core-concepts/control-plane)** — how compositions are selected, and how to add your own database flavour
- **[Backup and Restore](/docs/guides/backup-and-restore)** — before you put real data in it
