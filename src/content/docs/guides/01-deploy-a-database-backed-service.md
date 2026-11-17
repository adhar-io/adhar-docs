---
title: "Deploy a Database-Backed Service"
section: "Guides"
order: 1
path: "/docs/guides/deploy-a-database-backed-service"
---

# Deploy a Database-Backed Service

This guide takes one service from nothing to running against its own PostgreSQL database, then removes it again. It is for application developers who have finished [Your First Service](/docs/getting-started/first-service) and now need state. You will learn which files declare the database and its credentials, which objects the platform creates from them, and where to look when one of them is wrong.

## What you'll build

A service called `orders`, scaffolded from a golden-path template, with a PostgreSQL database called `orders-db` declared in the same Git repository:

```diagram
ha-db-binding
```

You run one command. The template writes the database and its wiring into the repository, and the platform delivers both to every environment.

| You run or edit | The platform creates |
|---|---|
| `adhar application deploy orders --template go-web-service --param withDatabase=true` | The Gitea repository `adhar/orders` and an `Application` `orders` in `adhar-system` |
| `deploy/base/database.yaml` (scaffolded) | In each environment: a CloudNativePG (CNPG) `Cluster` `orders-db`, its pod `orders-db-1`, the read-write Service `orders-db-rw` and the Secret `orders-db-app` |
| The `secretKeyRef` in `deploy/base/rollout.yaml` (scaffolded) | Nothing more: the pod reads the generated Secret as `DATABASE_URL` |

The guide has six steps, and each ends with a check:

```diagram
ha-db-guide-steps
```

## Prerequisites

- A running platform. The commands assume the local platform from [Quick Start](/docs/getting-started/quick-start); on a cloud platform only the host name changes. Check with `adhar get status`.
- `kubectl` pointed at it. `kubectl config current-context` shows `kind-adhar` on a laptop, or `adhar` (`adhar-<cluster>` with `--name`) on a cloud install.
- The `cnpg` package, which is on in both the local and production profiles. Check with `adhar stack status cnpg`.
- Gitea credentials to clone the scaffolded repository: `adhar get secrets -p gitea`.

> **Note:** ArgoCD also has an `Application` kind, so use the full resource name on the command line: `kubectl get applications.platform.adhar.io`.

## How it works

A template service is a multi-environment **`Application`** in `adhar-system`. It belongs to a project (`adhar` by default), and the project owns the environments: `dev`, `test` and `prod`. For each environment the platform composes one ArgoCD Application, `adhar-orders-dev`, `-test` and `-prod`, plus a Kargo Warehouse that turns each signed image into something to promote.

The database travels with the service because it is a file in the same repository:

1. `deploy/base/database.yaml` declares a CNPG `Cluster` named `orders-db`.
2. ArgoCD applies it to the environment's namespace along with the workload.
3. CNPG starts the instance pod `orders-db-1`, creates the Service `orders-db-rw`, and generates the Secret `orders-db-app` with the owner's credentials: `uri`, `host`, `port`, `dbname`, `username` and `password`.
4. The workload, an Argo Rollout, reads `uri` from that Secret as `DATABASE_URL`.

The `-app` Secret is the contract between the database and the application. It is generated in the cluster and never committed. Because the declaration is in Git, **each environment gets its own database**: `orders-db` in `dev` shares nothing with `orders-db` in `prod`.

> **Note:** The template declares the CNPG `Cluster` directly. To request a database through the platform's `Database` API, or to wire one into a workload you maintain yourself, see [Alternative: your own manifests](#alternative-your-own-manifests).

## Step 1 — Scaffold the service

A **golden-path template** is a ready-made starting project. Templates live in the `adhar/adhar-templates` repository in the platform's Gitea, a mirror of `github.com/adhar-io/adhar-templates`. The Console's create wizard reads the same collection.

List the templates, then inspect the one you will use:

```bash
adhar application templates
adhar application templates go-web-service
```

`go-web-service` scaffolds a Go HTTP service with its delivery manifests under `deploy/`. Its `withDatabase` parameter, off by default, adds the database. The other web-service templates accept the same parameter.

```bash
adhar application deploy orders --template go-web-service --param withDatabase=true
```

The CLI reports three things as it runs:

1. It renders the template's skeleton into a new Gitea repository, `adhar/orders`, as one commit on `main`.
2. It registers an `Application` named `orders` in `adhar-system`, in project `adhar`.
3. Crossplane composes the per-environment ArgoCD Applications and the Kargo Warehouse.

With a template, leave the placement flags off. The project's environments decide where the service runs.

| Flag | With `--template` |
|---|---|
| `--param key=value` | Sets a template parameter. Repeatable |
| `--project <name>` | Registers the application in another project. Default `adhar`. The project must exist |
| `--path <dir>` | Refused unless the template renders `<dir>/envs/`. Leave it off |
| `-n/--namespace`, `--dest-namespace`, `--dest-server`, `--version` | Ignored, with a warning |

**Check:**

```bash
kubectl get applications.platform.adhar.io orders -n adhar-system
```

The Application exists, and `adhar/orders` appears in Gitea.

## Step 2 — Read the wiring in Git

Everything that connects the service to its database is in the repository. Clone it (the URL below is the local one; use `https://gitea.<host>` on a cloud):

```bash
git clone https://gitea.adhar.localtest.me:8443/adhar/orders.git
cd orders
```

```text
deploy/
├── base/
│   ├── database.yaml        # the CNPG Cluster orders-db and its daily backup
│   ├── rollout.yaml         # the workload; reads orders-db-app
│   ├── service.yaml
│   ├── httproute.yaml
│   └── kustomization.yaml
└── envs/
    ├── dev/                 # one overlay per environment
    ├── test/
    └── prod/
```

`deploy/base/database.yaml` declares the database:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: orders-db            # also the prefix of orders-db-rw and orders-db-app
spec:
  instances: 1
  storage:
    size: 1Gi
  bootstrap:
    initdb:
      database: app          # the logical database
      owner: app             # its owner; the password lands in orders-db-app
```

The same file turns on WAL archiving to the platform object store with seven-day retention, and adds a `ScheduledBackup` named `orders-db-daily`. Both read the Secret `root-creds`, which the platform copies into every environment namespace.

`deploy/base/rollout.yaml` reads the generated Secret by key:

```yaml
      containers:
        - name: app
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: orders-db-app      # generated by CNPG, never committed
                  key: uri
```

**Check:**

```bash
grep -n "orders-db" deploy/base/database.yaml deploy/base/rollout.yaml
```

The output shows the `Cluster` name in `database.yaml` and the `orders-db-app` reference in `rollout.yaml`.

## Step 3 — Watch it land in dev

The scaffold commit is a push, so the `app-ci` pipeline starts by itself: it builds, scans and signs the image. Kargo then promotes the image into `dev`, and ArgoCD syncs `deploy/envs/dev` into the `dev` namespace.

```bash
adhar application status orders --detailed
```

**Check:** the database and the workload, in the `dev` namespace.

```bash
kubectl get applications.argoproj.io -n adhar-system | grep orders   # adhar-orders-dev, -test, -prod
kubectl -n dev get clusters.postgresql.cnpg.io orders-db
kubectl -n dev get secret orders-db-app -o jsonpath='{.data}' | jq 'keys'
kubectl -n dev get rollouts.argoproj.io orders
```

- `adhar-orders-dev` is `Synced` and `Healthy`.
- The CNPG cluster reports `Cluster in healthy state`.
- The Secret lists `dbname`, `host`, `password`, `port`, `uri` and `username` among its keys.
- The Rollout shows its desired replicas available.

The Rollout and the database arrive in the same sync, so the pod can report `CreateContainerConfigError` until CNPG writes the Secret. The kubelet retries, and the error clears on its own.

## Step 4 — Verify end to end

Check each hop separately, from the database outwards.

1. **Postgres answers, in the right database.** The CNPG instance pod's container is named `postgres`.

   ```bash
   kubectl -n dev exec orders-db-1 -c postgres -- \
     psql -d app -c 'select current_database(), version();'
   ```

   **Check:** one row naming `app` and the server version.

2. **The host resolves to the primary.** The `-rw` Service has the primary as its only endpoint.

   ```bash
   kubectl -n dev get endpoints orders-db-rw
   ```

   **Check:** one address on port `5432`.

3. **The workload references the Secret.** Never print the URL itself, because it contains the password.

   ```bash
   kubectl -n dev get rollouts.argoproj.io orders -o yaml | grep -B2 -A3 secretKeyRef
   ```

   **Check:** `DATABASE_URL` reads the key `uri` from `orders-db-app`.

4. **The service queries Postgres.** The scaffolded service exposes `/db`, which runs `SELECT now()`. A service's address is `<name>.<environment>.<host>`.

   ```bash
   curl -sk https://orders.dev.adhar.localtest.me:8443/db
   ```

   **Check:** `{"db":"ok","now":"…"}`.

## Step 5 — Change the wiring in Git

Git is the only place to change how the service reaches its database. As an example, expose discrete connection values next to the URL. In `deploy/base/rollout.yaml`, add entries below `DATABASE_URL`:

```yaml
            - name: PGHOST
              valueFrom: { secretKeyRef: { name: orders-db-app, key: host } }
            - name: PGUSER
              valueFrom: { secretKeyRef: { name: orders-db-app, key: username } }
            - name: PGPASSWORD
              valueFrom: { secretKeyRef: { name: orders-db-app, key: password } }
```

Database settings change the same way: edit `storage.size` or `instances` in `deploy/base/database.yaml`.

```bash
git add -A
git commit -m "orders: expose discrete database connection values"
git push origin main
```

The same loop runs again: `app-ci` builds and signs a new image, Kargo promotes it into `dev`, and ArgoCD applies the manifests from that commit.

> **Warning:** Do not patch the running workload. ArgoCD reconciles with self-heal on, so a `kubectl edit` is reverted. `adhar application bind`, `scale` and `restart` act on a Deployment named after the application, and a template service runs as a Rollout, so they do not apply here.

**Check:**

```bash
adhar application status orders --detailed
kubectl -n dev get rollouts.argoproj.io orders -o yaml | grep -A1 "name: PGHOST"
```

The application returns to `Synced` / `Healthy`, and the live Rollout carries the entries you committed.

### Test and prod

Promotion follows the project's chain, `dev` → `test` → `prod`. `test` promotes automatically once `dev` passes its checks, and gets its own `orders-db` in the `test` namespace. `prod` is never promoted automatically: it changes through a Release. [Promote Across Environments](/docs/guides/promote-across-environments) walks through it.

## Step 6 — Clean up

> **Warning:** Data does not survive this. Deleting the application prunes the CNPG cluster and its volumes in every environment. If you care about the data, take a backup first. See [Backup and Restore](/docs/guides/backup-and-restore).

```bash
adhar application delete orders --force
```

Without `-n`, the CLI looks for the Application in `adhar-system` first. Deleting it removes the composed ArgoCD Applications, and each prunes what it deployed: the Rollout, the Service, the route and the database.

Then delete the `adhar/orders` repository in the Gitea UI (**Settings → Danger Zone**). Deleting the application does not delete its repository, and the next `adhar application deploy orders --template …` refuses to scaffold into a non-empty one.

**Check:**

```bash
kubectl get applications.platform.adhar.io -A | grep orders
kubectl get clusters.postgresql.cnpg.io -A | grep orders-db
```

Both return nothing.

## Alternative: your own manifests

Use this path when you maintain the manifests yourself and the workload is a **Deployment**: a service that does not come from a template, in a repository of your own. You request the database through the platform's `Database` API, deploy the repository with `--repo`, and wire the Secret in yourself.

A **`Database`** is a namespaced Crossplane composite resource (XR) in `platform.adhar.io/v1alpha1`. Crossplane picks a **composition**, the template that turns your request into real resources, by label:

| Labels on the request | Composition | Result |
|---|---|---|
| `provider: local`, `engine: postgresql` (the default) | `database-local-cnpg` | A CNPG `Cluster` inside the platform cluster |
| `provider: aws` (or `gcp`, `azure`) | The cloud's managed-database composition | A managed database; the rest of the request is unchanged |

`database-local-cnpg` renders a CNPG `Cluster` with the same name as the `Database`, so the Service is again `<name>-rw` and the Secret `<name>-app`.

> **Warning:** If you set `credentialsSecret` on the `Database`, CNPG creates the owner from your Secret and stops generating `<name>-app`. Anything that reads `orders-db-app` then fails with `secret "orders-db-app" not found`. Leave `credentialsSecret` unset unless you mean it.

### 1. Create the namespace

`Database` and a `--repo` `Application` are namespaced, and neither the CLI nor the control plane creates the namespace for you.

```bash
kubectl create namespace orders
```

**Check:** `kubectl get namespace orders` shows `STATUS` `Active`.

> **Tip:** If your team runs more than one service, use a Project instead. It gives you namespaces with quota, network policy and team RBAC attached. See [Onboard a Team](/docs/guides/onboard-a-team).

### 2. Request the database

The API server silently drops unknown fields, so a typo applies cleanly and configures nothing. Copy the field names exactly.

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
    # Required by the schema. The cloud compositions provision this version;
    # the in-cluster one ignores it and lets the CNPG operator choose its image.
    # Pin `imageName` if you need a specific build.
    engineVersion: "16"
    storageSize: 5Gi
    replicas: 0              # 0 = a single instance; 1–5 adds streaming replicas
    databaseName: orders     # the logical database created at bootstrap
    credentials:
      masterUsername: orders # the owner; its password lands in orders-db-app
    # Requests are not defaulted: set them, or the pod runs best-effort.
    resources:
      cpu: 100m
      memory: 256Mi
      memoryLimit: 512Mi
    # The in-cluster backup stanza reads a Secret named `root-creds` from this
    # namespace. A namespace you created by hand does not have it, so turn backup off.
    enableBackup: false
```

```bash
kubectl apply -f database.yaml
```

The CLI creates an equivalent object in one line. On `adhar database`, `-n` means `--name`; the namespace flag has no short form.

```bash
adhar database create --name orders-db --engine postgresql --version 16 \
  --size 5Gi --namespace orders
```

The CLI leaves backup at its default (on), which fails in a namespace without `root-creds`. Prefer the manifest: you can commit it.

**Check:**

```bash
kubectl -n orders get databases.platform.adhar.io orders-db
kubectl -n orders get clusters.postgresql.cnpg.io orders-db
kubectl -n orders get secret orders-db-app -o jsonpath='{.data}' | jq 'keys'
```

- `SYNCED` and `READY` on the `Database` both become `True`. `READY` is `False` until the instance is up.
- The CNPG cluster reports `Cluster in healthy state`.
- The Secret lists `dbname`, `host`, `password`, `port`, `uri` and `username` among its keys.

If `READY` stays `False`, the events on the XR name the failing layer: `kubectl -n orders describe databases.platform.adhar.io orders-db`.

> **Note:** `adhar database status orders-db --namespace orders` prints the request's engine, version and size. Only the cloud compositions fill its `Phase` and `Endpoint` fields. For the in-cluster composition, readiness is the `READY` column and the endpoint is the `orders-db-rw` Service.

### 3. Deploy your repository

Your repository holds a Deployment named `orders` and its Service under `manifests/`.

```bash
adhar application deploy orders --repo <repo-url> --path manifests \
  -n orders --project default --wait
```

| Flag | Why you pass it |
|---|---|
| `--path manifests` | The directory ArgoCD deploys |
| `-n orders` | The namespace of the `Application`, and of the workload unless `--dest-namespace` says otherwise. Default `dev` |
| `--project default` | ArgoCD's unrestricted `default` project. The CLI's default, `--project adhar`, admits only the namespaces `adhar`, `dev`, `test` and `prod`. In a team Project, pass the team's project instead |
| `--wait` | Blocks until the application reports healthy, up to `--timeout` (default `10m`) |

A `--repo` deploy composes a single ArgoCD Application that syncs the path you name. It has no environments and no promotion chain. The declarative form of the command:

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
      repoURL: <repo-url>
      path: manifests
    destination:
      namespace: orders
      server: https://kubernetes.default.svc
```

**Check:**

```bash
adhar application status orders -n orders --detailed
kubectl -n orders get deploy
```

The status shows `Synced` and `Healthy`, and `kubectl get deploy` lists the Deployment `orders`.

### 4. Wire in the credentials

There are two ways to get `orders-db-app` into the Deployment:

```diagram
nga-bind-vs-commit
```

**The shortcut: `adhar application bind`.**

```bash
adhar application bind orders orders-db -n orders
```

`bind` finds the Deployment named after the app, checks that `orders-db-app` exists, appends the Secret as `envFrom` on the first container, and lets the Deployment roll. It is idempotent: a second run reports "already bound" and changes nothing. Pass `--secret <name>` if the connection Secret is not `<service>-app`.

`bind` patches the live Deployment only. Git does not record the change, so use it for experiments.

**The GitOps way: commit the reference.** In `manifests/deployment.yaml`, make the container read each value by key. Naming keys explicitly is clearer than `envFrom`, and lets you rename them to what your code expects.

```yaml
# manifests/deployment.yaml — container section only
      containers:
        - name: app
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

Commit `database.yaml` to the same directory, so the database is declared next to the code that needs it and ArgoCD owns both:

```bash
cp ../database.yaml manifests/database.yaml
git add -A
git commit -m "orders: declare orders-db and read its credentials"
git push origin main
```

ArgoCD adopts the `Database` you already applied. The object is identical, so nothing is recreated. ArgoCD then rolls the Deployment with the new environment.

> **Warning:** A `metadata.namespace` hard-coded in a manifest overrides the Application's destination. If the Deployment declares a namespace other than `orders`, the pod fails with `secret "orders-db-app" not found`.

**Check:**

```bash
adhar application status orders -n orders
kubectl -n orders get deploy orders -o yaml | grep -A3 secretKeyRef | head -8
kubectl -n orders rollout status deploy/orders
```

The application returns to `Synced` / `Healthy`, the live spec shows the `secretKeyRef` entries you committed, and `rollout status` ends with `successfully rolled out`.

### 5. Clean up

Delete in reverse order of dependency. The in-cluster composition ignores `deletionPolicy`: deleting the `Database` deletes the CNPG cluster and its volumes.

```bash
# 1. Stop ArgoCD reconciling the app (and through it, the Database you committed).
adhar application delete orders -n orders --force

# 2. Delete the database request. If you committed it, ArgoCD prunes it with
#    the app and this reports "not found", which is fine.
adhar database delete orders-db --namespace orders --force

# 3. Delete the namespace.
kubectl delete namespace orders
```

**Check:** `kubectl get namespace orders` reports `NotFound`.

## Troubleshooting

Template service:

| Symptom | Cause | Fix |
|---|---|---|
| `repository adhar/orders already exists and is not empty` | The Gitea repository from a previous run still exists | Delete `adhar/orders` in Gitea, or choose another name |
| `--path …: template … renders nothing under …/envs/` | `--path` was passed with a template | Leave `--path` off |
| `project "…" does not exist in adhar-system` | `--project` names a project that is not there | `kubectl get projects.platform.adhar.io -n adhar-system`, then pass an existing one |
| No `orders-db` or Rollout in `dev` | The build has not finished, or a gate failed | Check the `app-ci` run: `tkn -n adhar-system pipelinerun list` |
| Pod in `CreateContainerConfigError`, `secret "orders-db-app" not found` | The database is not ready yet | Wait for the CNPG cluster to report healthy; the kubelet retries |
| CNPG pods `Pending` | Not enough memory or CPU on the node | `kubectl -n dev describe pod orders-db-1`; add capacity |
| `/db` returns `{"db":"error",…}` | The service cannot reach or authenticate to Postgres | Read the `error` field; check `kubectl -n dev get clusters.postgresql.cnpg.io orders-db` |
| `adhar application bind` says the deployment was not found | A template service runs as a Rollout, not a Deployment | Declare the Secret reference in `deploy/base/rollout.yaml` and push |
| `test` or `prod` has no database | The environment has not been promoted into yet | `test` follows `dev`; `prod` needs a Release |
| Edits made with `kubectl edit` disappear | ArgoCD self-heal reverts changes to objects it manages | Commit the change instead |

Your own manifests:

| Symptom | Cause | Fix |
|---|---|---|
| `namespaces "orders" not found` on create | The namespace does not exist; nothing creates it for you | Create it, or create a Project |
| `no matches for kind "CompositeDatabase"` | The old kind name | Use `kind: Database` |
| `Database` `SYNCED=False` | Composition selection or pipeline failure | `kubectl -n orders describe databases.platform.adhar.io orders-db`; the events name the layer |
| `READY=False`, CNPG cluster never healthy, events mention `root-creds` | Backup is on and its credential Secret is not in this namespace | Set `enableBackup: false`, or provide backup credentials deliberately |
| `secret "orders-db-app" not found` | `credentialsSecret` is set, the Deployment is in another namespace, or the cluster is not ready yet | Unset `credentialsSecret`; check `metadata.namespace`; wait for `READY=True` |
| `argo CD project "adhar" does not allow namespace "orders"` | The deploy used the default `--project adhar`, which admits only the platform project's namespaces | Pass `--project default`, or your team's project |
| `adhar application bind` says the deployment was not found | `bind` looks for a Deployment named after the app, in `-n` (default `dev`) | Pass `-n orders`; check `kubectl -n orders get deploy` |
| `bind` worked but the variable is missing | `bind` injects into the first container only | Use explicit `secretKeyRef` in the container that needs it |
| App connects, then authentication fails after a restore or credential change | The app cached the old password | `kubectl -n orders rollout restart deploy/orders` |
| ArgoCD reports `app path does not exist` | The Application points at a directory the repository does not have | Redeploy with the right `--path`, or fix `spec.parameters.source.path` |

## Next steps

- **[Manage Secrets End to End](/docs/guides/manage-secrets)** — credentials a database does not generate: API keys, tokens, third-party passwords
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — take this service from dev to prod by digest
- **[Onboard a Team](/docs/guides/onboard-a-team)** — a project and environments of the team's own
- **[Backup and Restore](/docs/guides/backup-and-restore)** — before you put real data in it
