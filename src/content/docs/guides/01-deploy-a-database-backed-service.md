---
title: "Deploy a Database-Backed Service"
section: "Guides"
order: 1
path: "/docs/guides/deploy-a-database-backed-service"
---

# Deploy a Database-Backed Service

This guide takes one service from nothing to running against its own PostgreSQL database, then removes it again. You will scaffold the service from a golden-path template, request the database through the platform's self-service API, wire its credentials into the service through Git, verify every layer, and tear the whole thing down. It is written for an application developer who has finished [Your First Service](/docs/getting-started/first-service) and now needs state. At the end you will know which objects you own, which the platform composes for you, and where to look when one of them is wrong.

## What you will build

A service called `orders` in its own namespace, backed by a PostgreSQL database called `orders-db`:

```diagram
ha-db-binding
```

You write two things: a `Database` request and the `env` block of the service's Deployment. Everything between them — the composition, the CloudNativePG cluster, the generated credentials Secret — is produced by the platform.

```diagram
ha-db-guide-steps
```

### Prerequisites

| You need | Check with |
|---|---|
| A running platform (local Kind is fine) | `adhar get status` |
| `kubectl` pointed at it | `kubectl config current-context` shows `adhar-<cluster>` |
| The `cnpg` package (on in both the local and production profiles) | `adhar stack status cnpg` |
| Gitea credentials to clone the scaffolded repo | `adhar get secrets -p gitea` |

> **Kinds were renamed.** The self-service kinds are named after the thing: `Database` and `Application` in `platform.adhar.io/v1alpha1`. The older `CompositeDatabase` and `CompositeApplication` names are rejected by the API server, not aliased. Because `Application` also exists in ArgoCD, qualify it on the command line: `kubectl get applications.platform.adhar.io`.

## How the pieces fit

**A `Database` is a namespaced Crossplane v2 composite resource.** You create it in the namespace where the service will run. Crossplane picks a composition by label: `provider: local` plus `engine: postgresql` selects `database-local-cnpg`, which is also the XRD's default, so a bare request never reaches for a cloud composition that has no credentials. On a cloud platform the same request with `provider: aws` (or `gcp`, `azure`) selects the managed-database composition instead; the request itself does not change.

**`database-local-cnpg` renders a CloudNativePG `Cluster`** in your namespace, with the same name as the `Database`. CNPG then does three things you rely on:

1. It starts the Postgres instance pods (`orders-db-1`, and more if you ask for replicas).
2. It creates the read-write Service `orders-db-rw`, which is the host your app connects to.
3. It **generates a Secret named `<name>-app`** — here `orders-db-app` — holding the owner's credentials and a ready-made connection string (`uri`, plus `host`, `port`, `dbname`, `username`, `password`).

That `-app` Secret is the contract between the database and the application. `adhar application bind` assumes it by name, and the manifests below reference it directly.

> **One trap in that contract.** If you set `credentialsSecret` on the `Database`, CNPG bootstraps the owner from your Secret and **stops generating `<name>-app`**. Anything mounting `orders-db-app` then fails with `secret "orders-db-app" not found`. Leave `credentialsSecret` unset unless you mean it.

## Step 1 — Create the namespace

`Database` and `Application` are namespaced, and neither the CLI nor the control plane creates the namespace they are written into. Create it first:

```bash
kubectl create namespace orders
```

**Verify:**

```bash
kubectl get namespace orders
```

`STATUS` is `Active`. For a team that will run more than one service, prefer a Project — it gives you a namespace with quota, network policy and team RBAC already attached. See [Onboard a Team](/docs/guides/onboard-a-team).

## Step 2 — Request the database

Write the request to a file. Every field below is checked against the XRD schema; an unknown field is pruned silently by the API server rather than rejected, so a typo applies cleanly and configures nothing.

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

The CLI produces an equivalent object if you prefer one line. Note that on `adhar database`, `-n` means `--name`; the namespace flag has no short form:

```bash
adhar database create --name orders-db --engine postgresql --version 16 \
  --size 5Gi --namespace orders
```

The CLI route leaves backup at its default (on), so in a fresh namespace you will meet the `root-creds` issue in the troubleshooting table. The manifest is the version to keep, because you will commit it in Step 4.

**Verify** — the request, the cluster it composed, and the Secret CNPG generated:

```bash
kubectl -n orders get databases.platform.adhar.io orders-db
kubectl -n orders get clusters.postgresql.cnpg.io orders-db
kubectl -n orders get secret orders-db-app -o jsonpath='{.data}' | jq 'keys'
```

`SYNCED` and `READY` on the `Database` both become `True`, the CNPG cluster reports `Cluster in healthy state`, and the Secret lists keys including `dbname`, `host`, `password`, `port`, `uri` and `username`. The first start pulls the Postgres image, so allow a few minutes on a laptop.

> `adhar database status orders-db --namespace orders` prints the request's engine, version and size. The `Phase` and `Endpoint` fields are filled by the cloud compositions; for the in-cluster one, readiness is the `READY` column above and the endpoint is the `orders-db-rw` Service.

If `READY` stays `False`, the event stream on the XR names the failing layer:

```bash
kubectl -n orders describe databases.platform.adhar.io orders-db
```

## Step 3 — Scaffold the service

Golden-path templates live in the `adhar/adhar-templates` repository in the platform's Gitea, the same collection the Console's create wizard reads. List them, and inspect the one you will use for its parameters:

```bash
adhar application templates
adhar application templates basic
```

`basic` scaffolds a plain Deployment, which is the smallest thing that shows the database wiring clearly. Deploy it into the same namespace as the database:

```bash
adhar application deploy orders --template basic -n orders --wait
```

Three things happen, and the CLI narrates each: the template's skeleton is rendered into a **new Gitea repository `adhar/orders`** as one commit on `main`; an `Application` named `orders` is created in namespace `orders` pointing at that repository; Crossplane composes an ArgoCD Application from it, and ArgoCD syncs the manifests. `--wait` blocks until the application reports healthy, up to the default 10-minute `--timeout`.

The resulting `Application` is the declarative equivalent of what you just ran:

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
    project: default             # the ArgoCD project
    source:
      repoURL: http://gitea-http.adhar-system.svc.cluster.local:3000/adhar/orders
      path: <the template's manifest directory>
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

The status shows `Synced` and `Healthy`; `kubectl get deploy` lists the Deployment (note its name — `bind` and Step 4 need it); the last command prints the directory in the repository that ArgoCD deploys from.

## Step 4 — Bind the credentials, in Git

There are two ways to get `orders-db-app` into the service. Pick by whether the change should outlive the afternoon.

**The shortcut: `adhar application bind`.** It finds the Deployment named after the app, checks that `orders-db-app` exists, appends it as `envFrom` on the **first container**, and lets the Deployment roll. It is idempotent — binding twice reports "already bound" and changes nothing.

```bash
adhar application bind orders orders-db -n orders
```

`bind` patches the **live** Deployment. Git does not know about it, so the next person to read the repository will not see where the credentials come from. Use it for a spike.

**The GitOps way: commit the reference.** Clone the repository (credentials from `adhar get secrets -p gitea`):

```bash
git clone https://gitea.adhar.localtest.me:8443/adhar/orders.git
cd orders
```

In the directory Step 3 printed, edit the Deployment's container to read the values it needs by key. Naming keys explicitly is clearer than `envFrom`, and it lets you rename them to what your code expects:

```yaml
# <manifest-dir>/deployment.yaml  (only the container section shown)
      containers:
        - name: app                       # whatever the template named it
          image: <your image>
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

Then move `database.yaml` from Step 2 into the same directory, so the database is declared next to the code that needs it and ArgoCD owns both:

```bash
cp ../database.yaml <manifest-dir>/database.yaml
git add -A
git commit -m "orders: declare orders-db and read its credentials"
git push origin main
```

ArgoCD adopts the `Database` you already applied — the object is identical, so nothing is recreated — and rolls the Deployment with the new environment.

> **Check the namespace in the rendered manifests.** A `metadata.namespace` hard-coded in a skeleton wins over the Application's destination. If the Deployment declares a namespace other than `orders`, it lands somewhere the Secret is not, and the pod fails with `secret "orders-db-app" not found`.

**Verify:**

```bash
adhar application status orders -n orders
kubectl -n orders get pods
kubectl -n orders get deploy -o yaml | grep -A3 secretKeyRef | head -8
```

The application returns to `Synced` / `Healthy`, the pod has restarted (new `AGE`), and the live spec shows the `secretKeyRef` entries you committed. If the Deployment and the database arrive in the same sync, the pod may sit in `CreateContainerConfigError` for a moment until CNPG writes the Secret; the kubelet retries and it clears on its own.

## Step 5 — Verify end to end

Prove each hop separately, from the database outwards.

**Postgres answers, as the owner, in the right database.** The CNPG instance pod's container is named `postgres`:

```bash
kubectl -n orders exec orders-db-1 -c postgres -- \
  psql -d orders -c 'select current_database(), version();'
```

You get one row naming `orders` and the server version.

**The app sees the variables.** Use the container name from your Deployment:

```bash
kubectl -n orders exec deploy/orders -- sh -c 'echo "$PGHOST"; test -n "$DATABASE_URL" && echo DATABASE_URL set'
```

The output is `orders-db-rw` followed by `DATABASE_URL set`. Never echo the URL itself; it contains the password.

**The app can reach the host.** The `-rw` Service has the primary as its only endpoint:

```bash
kubectl -n orders get endpoints orders-db-rw
```

One address on port `5432`.

**Git is the source of truth.** Restart the workload and watch the new pod come back with the same environment — nothing about the wiring lives anywhere but the repository and the generated Secret:

```bash
kubectl -n orders rollout restart deploy/orders
kubectl -n orders rollout status deploy/orders
```

`rollout status` ends with `successfully rolled out`.

## Step 6 — Tear down

Delete in the reverse order of dependency, and remove the repository explicitly: deleting the application does not delete its Gitea repo.

```bash
# 1. Stop ArgoCD reconciling the app (and through it, the Database you committed).
adhar application delete orders -n orders --force

# 2. Delete the database request. ArgoCD prunes it with the app if you
#    committed it in Step 4 — then this reports "not found", which is fine.
#    CNPG removes the Cluster, its pods, its volumes and orders-db-app with it.
adhar database delete orders-db --namespace orders --force

# 3. The namespace.
kubectl delete namespace orders
```

Finally, delete the `adhar/orders` repository in the Gitea UI (Settings → Danger Zone), or the next `adhar application deploy orders --template …` refuses to scaffold into a non-empty repository.

**Verify:**

```bash
kubectl get applications.platform.adhar.io -A | grep orders
kubectl get databases.platform.adhar.io -A | grep orders
kubectl get namespace orders
```

All three return nothing, the last with `NotFound`.

> **Data does not survive this.** The in-cluster composition does not act on `deletionPolicy`; deleting the `Database` deletes the CNPG cluster and its volumes. On anything you care about, take a backup first — see [Backup and Restore](/docs/guides/backup-and-restore).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `namespaces "orders" not found` on create | The namespace does not exist; nothing creates it for you | Step 1, or create a Project |
| `no matches for kind "CompositeDatabase"` | The old kind name | Use `kind: Database` |
| `Database` `SYNCED=False` | Composition selection or pipeline failure | `kubectl -n orders describe databases.platform.adhar.io orders-db` — the events name the layer |
| `READY=False`, CNPG cluster never healthy, events mention `root-creds` | Backup is on and its credential Secret is not in this namespace | Set `enableBackup: false`, or provide backup credentials deliberately |
| CNPG pods `Pending` | Not enough memory or CPU on the node | `kubectl -n orders describe pod orders-db-1`; lower `resources` or add capacity |
| `secret "orders-db-app" not found` | `credentialsSecret` was set, the Deployment is in another namespace, or the cluster is not ready yet | Unset `credentialsSecret`; check `metadata.namespace`; wait for `READY=True` |
| `adhar application bind` says the deployment was not found | `bind` looks for a Deployment named after the app, in `-n` (default `default`) | Pass `-n orders`; check `kubectl -n orders get deploy` |
| `bind` worked but the variable is missing | `bind` injects into the **first** container only | Use explicit `secretKeyRef` in the container that needs it |
| App connects, then authentication fails after a restore or credential change | The app cached the old password | `kubectl -n orders rollout restart deploy/orders` |
| `scaffold` refuses: repository not empty | The Gitea repo from a previous run still exists | Delete `adhar/orders` in Gitea, or choose another name |
| Edits with `kubectl edit` disappear | ArgoCD self-heal reverts changes to objects it manages | Commit the change instead |

## Next steps

- **[Manage Secrets End to End](/docs/guides/manage-secrets)** — credentials that are not generated by a database: API keys, tokens, third-party passwords
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — take this service from dev to prod by digest
- **[Onboard a Team](/docs/guides/onboard-a-team)** — a guard-railed home for the service instead of a bare namespace
- **[Control Plane](/docs/core-concepts/control-plane)** — how compositions are selected, and how to add your own database flavour
- **[Backup and Restore](/docs/guides/backup-and-restore)** — before you put real data in it
