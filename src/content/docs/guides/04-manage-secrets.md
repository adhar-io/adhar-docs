---
title: "Manage Secrets End to End"
section: "Guides"
order: 4
path: "/docs/guides/manage-secrets"
---

# Manage Secrets End to End

This guide follows one secret through its whole life on Adhar: written once into OpenBao, pulled into a namespace by External Secrets, read by an application, rotated, and eventually removed — without the value ever touching Git. It is for developers who need an API key or password in a workload, and for platform engineers who own the backend. At the end you will know which object holds the value, which only points at it, which namespace may read it, how fast a change propagates, and what has to restart for a rotation to take effect.

## What you will build

An application `orders` in namespace `payments-dev` that reads a third-party API key and a webhook signing secret from OpenBao:

```diagram
ha-secret-flow
```

Five pieces, each with one job:

| Piece | Where it lives | What it holds |
|---|---|---|
| OpenBao KV v2 engine, mounted at `secret/` | `openbao-0` in `adhar-system` | The **values**, versioned, under `secret/tenants/payments-dev/` |
| `ServiceAccount` `adhar-secrets` | your namespace, **committed to Git** | The **identity** OpenBao checks — it proves which namespace is asking |
| `SecretStore` | your namespace, **committed to Git** | **How** to reach OpenBao and authenticate, as that ServiceAccount |
| `ExternalSecret` | your namespace, **committed to Git** | **Which** path and keys to fetch, how often |
| `Secret` | your namespace, created by External Secrets | A **copy** of the values for pods to read |

### Prerequisites

| You need | Check with |
|---|---|
| External Secrets (on in every profile) | `adhar stack status external-secrets` |
| OpenBao (on in the production profile, off locally) | `adhar stack status openbao` |
| The tenant role exists in OpenBao | `kubectl -n adhar-system logs job/openbao-bootstrap \| grep "role tenant"` shows `creating kubernetes auth role tenant` |
| A namespace your team can deploy to | See [Onboard a Team](/docs/guides/onboard-a-team) |

On a local platform, enable OpenBao first. It is mutually exclusive with the `vault` package — both claim `ClusterSecretStore/vault` and `Service/vault` — and the command offers to disable the other:

```bash
adhar stack enable openbao
adhar upgrade
```

> The namespace boundary described here ships with the current platform packages and takes effect once they are synced (`adhar upgrade`). A platform built from an earlier version still serves the `vault` store to every namespace and has no `tenant` role until it is upgraded.

## How it works

**OpenBao is the source of truth.** It is the Linux Foundation fork of Vault, API-compatible with it, and runs as a single-node persistent server. A bootstrap Job, re-run on every ArgoCD sync, initialises it, unseals it, and configures it idempotently:

- a **KV v2** secrets engine at `secret/` — every write is a new version, and old versions are kept;
- the **`kubernetes`** auth method, with two roles:
  - **`external-secrets`**, bound only to the External Secrets controller's ServiceAccount (`external-secrets` in `adhar-system`), with a policy that may **read** `secret/data/*` and `secret/metadata/*` — every path. It backs the platform's own store, which serves `adhar-system` only;
  - **`tenant`**, bound to a ServiceAccount named **`adhar-secrets` in any namespace**, with the templated policy **`tenant-secrets`**: read on `secret/data/tenants/<namespace>/*` and read/list on `secret/metadata/tenants/<namespace>/*`, where `<namespace>` is the namespace of the ServiceAccount that logged in;
- **OIDC** sign-in through Keycloak for people, with three group → policy mappings: `platform-admin` (everything), `platform-developer` (create, read, update, delete and list under `secret/*`), `platform-viewer` (read and list under `secret/*`). Both developer and viewer carry an explicit **deny** on the platform-owned paths `secret/data|metadata/adhar/*`, `adhar-ai/*` and `vllm/*`; a deny overrides the broad grant.

**A namespace reads only its own path.** The namespace in the `tenant` policy is not something the caller supplies: OpenBao takes it from the ServiceAccount token it verified at login. A team can mint a token only for a ServiceAccount in a namespace it controls, so `payments-dev` can read `secret/tenants/payments-dev/…` and nothing else — not `payments-prod`, not another team, not the platform's paths.

**The platform's own stores serve the platform only.** The cluster-scoped stores that can reach everything are restricted by namespace **name**, which a tenant cannot create or rename:

| ClusterSecretStore | Reaches | Serves namespaces |
|---|---|---|
| `vault` | Every OpenBao path, through role `external-secrets` | `adhar-system` |
| `platform` | Every Secret in `adhar-system` | `adhar-system` |
| `keycloak` | Secrets in `adhar-system` | `adhar-system` |
| `argocd` | Secrets in `adhar-system` | `adhar-system` |
| `gitea` | Secrets in `adhar-system` | `adhar-system`, `adhar-environments` |

An `ExternalSecret` in any other namespace that names one of these stores is refused by External Secrets; it never reaches the backend. The `vault` store, for reference:

```yaml
# Shipped by the openbao package — shown for reference; do not copy it.
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: vault
spec:
  conditions:
    - namespaces: [adhar-system]   # platform-only
  provider:
    vault:
      server: "http://openbao.adhar-system.svc.cluster.local:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef: { name: "external-secrets", namespace: "adhar-system" }
```

**Two narrow stores carry what the platform itself puts in tenant namespaces.** A few compositions need one specific platform credential inside a tenant namespace. Each such credential goes through a store whose ServiceAccount may `get` only the named Secrets in `adhar-system` (RBAC `resourceNames`), and which serves only namespaces labelled `adhar.io/plane` = `workload` or `preview`. The platform's compositions set that label; tenant roles are namespace-scoped and cannot change a Namespace's labels.

| ClusterSecretStore | Can read (in `adhar-system`) | Used by |
|---|---|---|
| `platform-object-storage` | `root-creds` only | Database and pipeline backups to RustFS — the neo4j, MongoDB and OpenSearch compositions and the data-pipeline template |
| `platform-delivery` | `gitea-ci-creds` and `harbor-push` only | Kargo in a Project namespace (`kargo-git`, `kargo-image`) |

These are not for application secrets, and they are not a full boundary: see [What is enforced, and what is not](#what-is-enforced-and-what-is-not).

**External Secrets is the sync plane.** It watches `ExternalSecret` objects, reads the named paths through a store on a schedule, and writes an ordinary Kubernetes `Secret`. Pods never talk to OpenBao, and OpenBao never needs to know which pods exist.

**Git carries pointers, never values.** The ServiceAccount, the `SecretStore` and the `ExternalSecret` contain names and paths — nothing sensitive — so they are committed with the rest of the application. The paved-road CI enforces the other half: every `app-ci` run executes a **gitleaks** scan on the source with `--exit-code=1`, and the image is signed only when all checks pass, so a committed credential stops the build before anything deploys.

## Step 1 — Choose a path

A namespace can read only `secret/tenants/<namespace>/`, so the first part of the path is fixed. Below that, pick a convention before the first write. This guide uses `tenants/<namespace>/<app>/<purpose>`:

```text
secret/
├── adhar/              # platform — bootstrap break-glass credentials (denied to developers and viewers)
├── adhar-ai/           # platform — the AI layer's LLM credential (denied)
├── vllm/               # platform — the Hugging Face token (denied)
└── tenants/
    ├── payments-dev/   # readable only from namespace payments-dev
    │   └── orders/
    │       └── config  # api-key, webhook-secret
    └── payments-prod/  # readable only from namespace payments-prod
```

Each environment namespace has its own path, so a development namespace can never read production values. If the same key is needed in two namespaces, write it twice.

## Step 2 — Write the secret

**People, through the UI.** Open `https://openbao.<host>`, choose OIDC, and sign in with Keycloak. A member of `platform-developer` or `platform-admin` can create `tenants/payments-dev/orders/config` under the `secret` engine and add the keys `api-key` and `webhook-secret`. Developers may write anywhere under `secret/` except the platform paths `adhar/`, `adhar-ai/` and `vllm/`. Members of application-team groups (`ws-team-*`) get only OpenBao's `default` policy, which reads and writes no secrets: on the shipped configuration, writing secrets is a platform-team task, or you add a policy and group mapping for the team yourself.

**From the CLI.** Signed in as a developer, the equivalent is:

```bash
bao kv put secret/tenants/payments-dev/orders/config api-key=… webhook-secret=…
```

**Operators, break-glass.** The bootstrap stored the root token in the `openbao-keys` Secret. Use it sparingly — it can do anything:

```bash
ROOT=$(kubectl -n adhar-system get secret openbao-keys \
  -o jsonpath='{.data.init\.json}' | base64 -d | jq -r .root_token)

# Read the value from your terminal, not your shell history.
read -rs API_KEY; read -rs WEBHOOK_SECRET

kubectl -n adhar-system exec -i openbao-0 -- env BAO_TOKEN="$ROOT" \
  bao kv put secret/tenants/payments-dev/orders/config \
    api-key="$API_KEY" webhook-secret="$WEBHOOK_SECRET"
```

**Verify** — metadata only, never values:

```bash
kubectl -n adhar-system exec openbao-0 -- env BAO_TOKEN="$ROOT" \
  bao kv metadata get secret/tenants/payments-dev/orders/config
```

The output shows `current_version` `1` and a `created_time`.

> **Do not use `adhar secrets create` for this.** It creates a plain Kubernetes Secret directly in a namespace. That is fine for a throwaway on a laptop, but the value then lives only in etcd: it is not in OpenBao, has no versions, and is gone when the namespace is.

## Step 3 — Give the namespace its SecretStore

Once per namespace, create the ServiceAccount the `tenant` role is bound to and a namespaced `SecretStore` that logs in as it. Both go in the application's repository; neither contains anything secret.

```yaml
# deploy/envs/dev/secretstore.yaml  (or your manifest directory)
apiVersion: v1
kind: ServiceAccount
metadata:
  name: adhar-secrets                 # must be exactly this name: the tenant role is bound to it
  namespace: payments-dev
---
apiVersion: external-secrets.io/v1
kind: SecretStore                     # namespaced, not ClusterSecretStore
metadata:
  name: openbao
  namespace: payments-dev
spec:
  provider:
    vault:
      server: "http://openbao.adhar-system.svc.cluster.local:8200"
      path: "secret"                  # the KV mount; remoteRef keys are relative to it
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "tenant"
          serviceAccountRef:
            name: "adhar-secrets"     # in this namespace
```

The store can authenticate from any namespace, but what it can read is fixed by the namespace it is in: `secret/tenants/payments-dev/*` here.

**Verify:**

```bash
kubectl -n payments-dev get secretstore openbao
```

The store shows `READY True`. If it does not, see the first rows of [Troubleshooting](#troubleshooting).

## Step 4 — Commit the ExternalSecret

This file goes next to the Deployment. It names keys and a path; the values never appear.

```yaml
# deploy/envs/dev/externalsecret.yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: orders-config
  namespace: payments-dev
spec:
  secretStoreRef:
    kind: SecretStore
    name: openbao                      # the store from Step 3
  refreshInterval: 15m                 # how often to re-read OpenBao (0 = never)
  # refreshPolicy: Periodic            # default; OnChange = only when this object changes;
  #                                    # CreatedOnce = write once, never update
  target:
    name: orders-config                # the Kubernetes Secret to create
    creationPolicy: Owner              # the Secret is owned by this ExternalSecret
  data:
    - secretKey: API_KEY               # key in the Kubernetes Secret
      remoteRef:
        key: tenants/payments-dev/orders/config   # relative to the store's `secret` mount
        property: api-key              # one field of that KV entry
    - secretKey: WEBHOOK_SECRET
      remoteRef:
        key: tenants/payments-dev/orders/config
        property: webhook-secret
```

To take every field of the entry as-is instead of mapping keys one by one:

```yaml
  dataFrom:
    - extract:
        key: tenants/payments-dev/orders/config   # each KV field becomes a Secret key
```

Commit and push; ArgoCD applies it. The `edit` and `admin` roles include create rights on `ExternalSecret` and `SecretStore`, so a team that has `admin` in `payments-dev` can apply all three objects directly while testing. Pointing this `ExternalSecret` at `ClusterSecretStore/vault` instead does not work: that store does not serve `payments-dev`.

**Verify:**

```bash
kubectl -n payments-dev get externalsecret orders-config
kubectl -n payments-dev get secret orders-config -o jsonpath='{.data}' | jq 'keys'
```

The ExternalSecret shows `STATUS SecretSynced` and `READY True`; the Secret lists `API_KEY` and `WEBHOOK_SECRET`. The CLI shows the same across namespaces (its namespace flag is `-s`; `-n` is the name):

```bash
adhar secrets list --external -s payments-dev
```

## Step 5 — Consume it in the application

Pods read the Kubernetes Secret like any other. Choose by how the value should behave when it changes.

```yaml
# deploy/base/rollout.yaml — container section
      containers:
        - name: app
          env:
            - name: API_KEY                       # read once, at process start
              valueFrom:
                secretKeyRef: { name: orders-config, key: API_KEY }
          volumeMounts:
            - name: webhook
              mountPath: /var/run/secrets/orders  # file: /var/run/secrets/orders/WEBHOOK_SECRET
              readOnly: true
      volumes:
        - name: webhook
          secret:
            secretName: orders-config
            items:
              - { key: WEBHOOK_SECRET, path: WEBHOOK_SECRET }
```

| Consumption | Sees a change without a restart? | Use for |
|---|---|---|
| `env` / `envFrom` | **No** — read once when the process starts | Values that change rarely and where a restart is acceptable |
| Volume mount (no `subPath`) | Yes, once the kubelet resyncs the volume — if the app re-reads the file | Values you want to rotate without downtime |
| Volume mount with `subPath` | **No** | Avoid for rotating secrets |

**Verify** without printing the value:

```bash
kubectl -n payments-dev exec deploy/orders -- sh -c 'test -n "$API_KEY" && echo API_KEY set'
kubectl -n payments-dev exec deploy/orders -- ls /var/run/secrets/orders
```

You see `API_KEY set` and `WEBHOOK_SECRET`.

## Step 6 — Understand refresh

External Secrets re-reads OpenBao every `refreshInterval` and rewrites the Kubernetes Secret when the value differs. So a change in OpenBao reaches the Secret within one interval — 15 minutes in the example; the platform's own ExternalSecrets use between `1m` and `1h`. Shorter intervals mean more reads against OpenBao; across hundreds of ExternalSecrets, keep them in minutes, not seconds.

When you cannot wait, force a sync. Changing the annotation's value triggers an immediate refresh:

```bash
kubectl -n payments-dev annotate externalsecret orders-config \
  force-sync="$(date +%s)" --overwrite
```

**Verify:**

```bash
kubectl -n payments-dev get externalsecret orders-config \
  -o jsonpath='{.status.refreshTime}{"\n"}'
```

The timestamp is a few seconds old.

## Step 7 — Rotate

```diagram
ha-secret-rotation
```

**1. Write the new value.** KV v2 creates version 2 and keeps version 1:

```bash
read -rs API_KEY
kubectl -n adhar-system exec -i openbao-0 -- env BAO_TOKEN="$ROOT" \
  bao kv patch secret/tenants/payments-dev/orders/config api-key="$API_KEY"
```

`kv patch` changes one field and keeps the others; `kv put` replaces the whole entry. A `platform-developer` login can run the same `bao kv patch` without the root token.

**2. Let External Secrets pick it up,** or force it with the annotation from Step 6.

**3. Confirm the Kubernetes Secret changed** — compare a hash, not the value:

```bash
kubectl -n payments-dev get secret orders-config \
  -o jsonpath='{.data.API_KEY}' | sha256sum
```

The hash differs from the one you took before rotating.

**4. Restart the consumers.** No reloader is shipped with the platform, and environment variables never change in a running process:

```bash
kubectl -n payments-dev rollout restart deploy/orders      # or: kubectl argo rollouts restart … for a Rollout
kubectl -n payments-dev rollout status deploy/orders
```

**Verify** the application works with the new value through its own health check or a real request, then revoke the old credential at its issuer. Until you revoke it, rotation has only *added* a credential.

If the new value is wrong, roll back in OpenBao — the previous version is still there:

```bash
kubectl -n adhar-system exec openbao-0 -- env BAO_TOKEN="$ROOT" \
  bao kv rollback -version=1 secret/tenants/payments-dev/orders/config
```

**About `SecretRotation` and `adhar secrets rotate`.** The platform also offers a `SecretRotation` kind, and `adhar secrets rotate --name <secret> -s <ns>` creates one. Its in-cluster composition (`secretrotation-local`) renders a Job per referenced Secret that writes a random value into one key (`rotationKey`, default `password`) of the **Kubernetes** Secret, and annotates it `adhar.io/rotated-at`. It does not read `rotationSchedule` or restart `targetServices`. Two consequences:

- **Do not point it at a Secret owned by an ExternalSecret.** External Secrets overwrites the Kubernetes Secret with the OpenBao value on its next refresh, silently undoing the rotation.
- A random value written into a Secret does not change the credential at whatever issued it. Rotating a database password this way changes what the app *sends*, not what the database *accepts*.

For OpenBao-backed secrets, rotation is the four steps above.

## Step 8 — Remove it

Delete in the order that never leaves a pod pointing at nothing:

```bash
# 1. Remove the env/volume references from the Deployment, commit, let it roll.
# 2. Remove externalsecret.yaml from Git; ArgoCD prunes it, and with
#    creationPolicy: Owner the Kubernetes Secret goes with it.
#    Keep the SecretStore and ServiceAccount while other ExternalSecrets use them.
# 3. Delete the values (and their version history) from OpenBao:
kubectl -n adhar-system exec openbao-0 -- env BAO_TOKEN="$ROOT" \
  bao kv metadata delete secret/tenants/payments-dev/orders/config
```

**Verify:**

```bash
kubectl -n payments-dev get externalsecret,secret | grep orders-config
```

Nothing is returned.

## What is enforced, and what is not

**Enforced by the shipped configuration:**

| Boundary | How |
|---|---|
| A tenant namespace cannot use the platform's stores (`vault`, `platform`, `keycloak`, `argocd`, `gitea`) | Each store's `conditions` list namespaces by name; External Secrets refuses the ExternalSecret |
| A namespace reads only `secret/tenants/<its own name>/` | The `tenant-secrets` policy takes the namespace from the verified ServiceAccount token |
| Developers and viewers in OpenBao cannot read or overwrite the break-glass credentials | Explicit `deny` on `secret/data\|metadata/adhar/*`, `adhar-ai/*`, `vllm/*` |
| Only platform-labelled namespaces get the narrow stores | `adhar.io/plane` in `workload`/`preview`, set by compositions, not changeable by tenant roles |

**Residual risks you should know about:**

- **The narrow stores are narrow, not private.** Any `workload` or `preview` namespace — including every PR preview — can write its own `ExternalSecret` against `platform-object-storage` or `platform-delivery` and read `root-creds`, `gitea-ci-creds` or `harbor-push`. `root-creds` is the RustFS **root** credential. Scoped object-storage users per database, instead of the root key, are the recommended follow-up.
- **OpenBao people-groups are broad.** `platform-developer` and `platform-viewer` still read every path under `secret/` other than the denied platform paths — every team's `tenants/…` included. `platform-admin` is unchanged and reads everything.
- **Cluster-wide `edit` is outside this boundary.** `platform-developer` is bound to `edit` cluster-wide, which already reads Secrets in `adhar-system` and may create External Secrets objects there. Namespace conditions keep tenants out; they do not constrain cluster-wide roles.
- **Anyone who administers a namespace reads its secrets.** The trust unit is the namespace: whoever can create the `adhar-secrets` ServiceAccount and a `SecretStore` in `payments-dev` can read everything under `secret/tenants/payments-dev/`.
- **Auto-unseal.** The bootstrap keeps the unseal key and root token in the `openbao-keys` Secret. In production, configure cloud-KMS auto-unseal and revoke the root token after creating scoped admin tokens. See [Security Best Practices](/docs/security/security-best-practices).
- **etcd encryption at rest.** The last hop is a Kubernetes Secret; protect etcd accordingly.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `SecretStore` not Ready, OpenBao says the role does not exist | The platform predates the `tenant` role, or the bootstrap could not find the kubernetes auth accessor | `adhar upgrade`, or `adhar stack sync openbao`; the bootstrap log then shows `creating kubernetes auth role tenant` |
| `SecretStore` not Ready, the ServiceAccount is not found or login is denied | No ServiceAccount named exactly `adhar-secrets` in the store's namespace, or `serviceAccountRef` names another one | Create `ServiceAccount/adhar-secrets` in that namespace; the role is bound to that name only |
| ExternalSecret refused: the store does not serve this namespace | It names a platform `ClusterSecretStore` (`vault`, `platform`, …) from a tenant namespace, or a narrow store from a namespace not labelled `adhar.io/plane` `workload`/`preview` | Use your namespace's own `SecretStore` (`kind: SecretStore`) |
| `permission denied` from OpenBao in the ExternalSecret events | The key is outside `tenants/<this namespace>/` — another namespace's path, or a platform path | Write the value under `secret/tenants/<this namespace>/` and point `remoteRef.key` there |
| `ClusterSecretStore vault` not Ready | OpenBao off, sealed, or the bootstrap Job has not finished | `adhar stack status openbao`; `kubectl -n adhar-system logs job/openbao-bootstrap` |
| `ExternalSecret` `SecretSyncedError`, events say the secret does not exist | The path or property is wrong, or nothing has been written yet | `bao kv get` the exact path; remember keys are relative to `secret/` |
| Same error with `secret/tenants/…` as the key | The mount was included twice | Use `tenants/payments-dev/orders/config`, not `secret/tenants/payments-dev/orders/config` |
| A developer gets `permission denied` writing `secret/adhar/…` | Platform paths are denied to `platform-developer` and `platform-viewer` | Use a `tenants/…` or team path; platform paths need `platform-admin` |
| An ExternalSecret with a missing path stalls an ArgoCD sync wave | It reports Degraded and the wave never advances | Seed the path first, or move the ExternalSecret to a later wave |
| Value changed in OpenBao, app still uses the old one | Env vars are read at start; or refresh has not run | Force-sync, then `rollout restart` |
| Value reverted after `adhar secrets rotate` | External Secrets overwrote the rotated Secret from OpenBao | Rotate in OpenBao instead |
| Team member cannot see the secret in the OpenBao UI | `ws-team-*` groups map only to the `default` policy | Platform team writes it, or adds a team policy |
| Both `vault` and `openbao` enabled; stores flap | They claim the same `ClusterSecretStore` and `Service` | Disable one: `adhar stack disable vault` |
| CI fails at the gitleaks stage | A credential is in the source tree | Remove it, rotate it at the issuer (it is already exposed), and reference it through an ExternalSecret |

## Next steps

- **[Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service)** — generated database credentials, which need no OpenBao entry at all
- **[Onboard a Team](/docs/guides/onboard-a-team)** — the groups that decide who can write secrets
- **[Security Best Practices](/docs/security/security-best-practices)** — auto-unseal, etcd encryption and the rest of the hardening list
- **[Accessing the Platform](/docs/operations/accessing-the-platform)** — the OpenBao UI and the platform's own credentials
- **[Backup and Restore](/docs/guides/backup-and-restore)** — OpenBao's data is state; back it up like any other
