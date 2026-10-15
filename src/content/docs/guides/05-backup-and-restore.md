---
title: "Backup and Restore"
section: "Guides"
order: 5
path: "/docs/guides/backup-and-restore"
---

# Backup and Restore

This guide is for the platform engineer who owns recovery. It explains what Adhar backs up out of the box, which component does each part and where the data lands. It then walks through two restore drills: a whole namespace with Velero, and a PostgreSQL database with CloudNativePG point-in-time recovery. By the end you will have a backup you have proved, not one you assume works.

> A backup that has never been restored is a hope, not a backup. The platform's own history says so: Velero once reported Healthy in ArgoCD for weeks while every scheduled backup failed validation, because the credential Secret it referenced did not exist. Nothing surfaced it except the Backup objects themselves.

## What you will build

- A verified on-demand Velero backup of one application namespace.
- A restore of that namespace **into a scratch namespace**, checked and then deleted, without touching the live one.
- A point-in-time recovery of a CloudNativePG database into a new cluster, checked against a marker row.
- The commands you will run, by hand or in CI, to keep proving that backups work.

**Prerequisites**

| Requirement | How to check |
|---|---|
| A running platform with the `velero` package enabled (it is on in the production profile and off in the local core) | `kubectl -n adhar-system get deploy velero` |
| `kubectl` pointed at the platform cluster | `kubectl config current-context` |
| The `adhar` CLI | `adhar version` |
| An application namespace to practise on (this guide uses `orders`) and a `Database` (this guide uses `payments-db` in `team-payments`) | `kubectl get ns orders`, `kubectl -n team-payments get database payments-db` |

On a laptop, enable Velero first with `adhar stack enable velero` and then `adhar upgrade`. See [Customization](/docs/operations/customization).

## What is backed up, and by what

Two tools do two different jobs, and nothing else needs to be backed up.

**Velero backs up cluster state.** It records Kubernetes objects: namespaced resources, custom resources and cluster-scoped objects. These are the things no other system holds. The platform ships two Velero `Schedule`s, enabled by default:

| Schedule | When (UTC) | Scope | Kept |
|---|---|---|---|
| `adhar-platform-daily` | 02:00 daily | `adhar-system` plus cluster-scoped resources | 30 days (`720h`) |
| `adhar-cluster-weekly` | Sunday 03:00 | every namespace plus cluster-scoped resources | 90 days (`2160h`) |

Both write to the `default` BackupStorageLocation with `snapshotVolumes: false`. The Velero node agent is deployed, but **file backup of volume data is opt-in per pod volume** through the `backup.velero.io/backup-volumes` annotation. Gitea's `data` volume ships opted in, because it holds the GitOps repositories and every user repository. The default is opt-in, not opt-out, for a reason. The opt-out setting once made Velero copy the object store's own 100 GiB volume into the object store. One run wrote 62.8 GB, filled the disk and took WAL archiving, Loki and Mimir down with it.

**CloudNativePG backs up database data.** Every PostgreSQL the platform runs, its own and yours, is a CNPG cluster with two backup paths. WAL is archived continuously and a base backup is taken daily at 01:30 UTC through a `ScheduledBackup`. A `Database` you request gets the same pair by default. The local composition adds a 7-day `retentionPolicy`, gzip-compressed WAL and a `<name>-daily` ScheduledBackup.

**Some state is deliberately not backed up.** Git content is the source of truth, so it is recovered, not restored. Crossplane state is not backed up either: managed resources reconverge from the XRs declared in Git. Caches such as scanner databases, registry layers and Prometheus TSDB can all be rebuilt.

```diagram
hb-backup-coverage
```

Both tools share one bucket, `adhar-backups`, with separate prefixes. Velero owns only `velero/`, and CNPG writes `cnpg/<cluster>/`. The prefix matters: Velero refuses a store whose root holds directories it did not create (`Backup store contains invalid top-level directories: [cnpg]`). By default the bucket lives on the in-cluster object store, RustFS, which also publishes the `root-creds` Secret that both tools authenticate with.

> **In production, repoint both tools at off-cluster object storage.** A backup stored inside the cluster it protects does not survive losing that cluster. A full in-cluster store also stops WAL archiving for **every** database at once, which then fills the Postgres volumes and takes SSO down. See [Production](/docs/operations/production).

## Targets

These are the platform's documented recovery objectives. Treat them as goals to prove with the drills below, not as guarantees.

| Scenario | RPO | RTO |
|---|---|---|
| Package or app misconfiguration | 0 (Git revert) | Minutes |
| Platform service data loss | ≤ 15 min (WAL) | ≤ 1 h |
| Workload cluster loss (T3) | 0 for config; app data per its own backups | ≤ 1 h (reprovision + resync) |
| Management cluster loss | ≤ 1 h | ≤ 4 h |

## Step 1 — Confirm the backup store is reachable

Every Velero backup is validated against its BackupStorageLocation first. An `Unavailable` store means every backup lands in `FailedValidation`, even while the Velero Deployment looks healthy.

```bash
adhar restore config                                     # BSLs: provider, phase, bucket, default
kubectl -n adhar-system get backupstoragelocation default
kubectl -n adhar-system get schedules.velero.io
```

**Expected:** `default` reports phase `Available` against bucket `adhar-backups`, and both `adhar-platform-daily` and `adhar-cluster-weekly` are listed. If the store is `Unavailable`, check that the `velero-s3-credentials` ExternalSecret has produced its Secret: `kubectl -n adhar-system get externalsecret velero-s3-credentials`.

The `adhar backup` and `adhar restore` commands find Velero by looking for its Deployment in `adhar-system`, falling back to the upstream `velero` namespace. Set `ADHAR_VELERO_NAMESPACE` to override the lookup.

## Step 2 — Opt in the volumes whose files matter

Velero restores objects. It restores a volume's **files** only if that pod volume was opted in when the backup ran. If your namespace holds data that is not in a CNPG database, for example uploads on a PVC, annotate the pod template in Git:

```yaml
# deploy/deployment.yaml (in your application repo)
spec:
  template:
    metadata:
      annotations:
        # Comma-separated pod VOLUME names (not PVC names) to file-copy into the backup.
        backup.velero.io/backup-volumes: uploads
```

Leave database volumes out: CNPG covers them, with point-in-time recovery Velero cannot give you. The platform's default StorageClass can also be node-local, and no volume snapshotter can snapshot that. File backup is the only Velero path for such data.

**Verify:** `kubectl -n orders get pod -l app=orders-api -o jsonpath='{.items[0].metadata.annotations}'` shows the annotation once ArgoCD has synced the change.

## Step 3 — Take and verify an on-demand backup

```bash
adhar backup create orders-drill --include-namespaces orders --ttl 24h \
  --description "restore drill"
adhar backup status orders-drill        # repeat until the phase settles
adhar backup verify orders-drill        # exits non-zero unless the phase is Completed
```

`adhar backup create` writes a `velero.io/v1 Backup` into Velero's namespace with `ttl` set from `--ttl` (default 30 days). Give drill backups a short TTL so Velero's garbage collection removes them. `adhar backup verify` prints warnings and errors and fails on anything other than `Completed`, which makes it safe to call from CI.

**Expected:** `Phase: ● Completed` with `Errors: 0`. A `PartiallyFailed` phase means some items failed; read them with `kubectl -n adhar-system describe backup.velero.io orders-drill`.

## Step 4 — Restore into a scratch namespace

```diagram
hb-restore-drill
```

Do not restore over the live namespace to test a backup. Velero skips objects that already exist, so an in-place restore of a healthy namespace proves almost nothing. ArgoCD also reconciles that namespace from Git regardless. Map the backup into a scratch namespace instead. The `adhar restore` subcommands do not expose namespace mapping, so write the Velero `Restore` directly. This is the same shape the platform's live drill used.

```yaml
# orders-drill-restore.yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: orders-drill-restore
  namespace: adhar-system          # Velero's namespace on this platform
spec:
  backupName: orders-drill
  namespaceMapping:
    orders: orders-drill           # restore beside the live namespace, never over it
  restorePVs: true                 # bring back opted-in volume files
  excludedResources:
    # A restored HTTPRoute claims the SAME hostname as the live one and would
    # start taking a share of real traffic. Leave routes out of a drill.
    - httproutes.gateway.networking.k8s.io
```

```bash
kubectl create -f orders-drill-restore.yaml
adhar restore status orders-drill-restore
adhar restore verify orders-drill-restore   # non-zero unless Completed
```

**Verify the contents**, not just the phase:

```bash
kubectl -n orders-drill get deploy,svc,cm,secret,pvc
kubectl -n orders-drill rollout status deploy/orders-api --timeout=5m
kubectl -n orders-drill exec deploy/orders-api -- ls /data/uploads | head   # opted-in volume files
```

**Expected:** the same Deployments, Services, ConfigMaps, Secrets and PVCs as in `orders`. Pods become Ready, and opted-in volumes contain their files. The platform's recorded drill restored the `adhar-environments` namespace into `adhar-restore-drill` the same way and recreated the Kargo project intact.

## Step 5 — Clean up the drill

```bash
kubectl delete namespace orders-drill
kubectl -n adhar-system delete restore.velero.io orders-drill-restore
```

Leave the `orders-drill` Backup alone. Its 24-hour TTL expires it, and Velero deletes the data in the object store along with the object.

## Step 6 — Recover a database to a point in time

Velero can restore a CNPG `Cluster` object and its PVCs: `adhar restore database <backup> --namespace team-payments` does exactly that. It can only restore volume data that was file-backed, though, and it cannot pick a moment in time. To restore **data**, use CNPG's own recovery, which replays the base backup and WAL from the bucket.

```diagram
hb-cnpg-recovery
```

**6a. Confirm the database is archiving.**

```bash
kubectl -n team-payments get cluster payments-db \
  -o jsonpath='{.status.lastSuccessfulBackup}{"\n"}{.status.lastFailedBackup}{"\n"}'
kubectl -n team-payments get cluster payments-db \
  -o jsonpath='{.status.conditions[?(@.type=="ContinuousArchiving")].status}{"\n"}'
kubectl -n team-payments get scheduledbackup,backups.postgresql.cnpg.io
```

**Expected:** a recent `lastSuccessfulBackup`, no `lastFailedBackup`, and `ContinuousArchiving` set to `True`. If no base backup exists yet, take one now. PITR needs a base backup older than the target time.

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: payments-db-predrill
  namespace: team-payments
spec:
  cluster:
    name: payments-db
```

**6b. Write a marker, note the time, then change the data.** The marker tells you exactly which moment you recovered to.

```bash
kubectl -n team-payments exec payments-db-1 -c postgres -- \
  psql -d payments -c "create table if not exists drill(at timestamptz); insert into drill values (now()); select now();"
# ...wait a minute, then simulate the mistake you want to undo:
kubectl -n team-payments exec payments-db-1 -c postgres -- psql -d payments -c "delete from drill;"
```

**6c. Recover into a new cluster.** Recover beside the original, under a new name, with **no** `backup` section. CNPG refuses to archive into a path that already holds another cluster's WAL. The connection details below are exactly what the platform's composition writes, so the recovery reads from the same place.

```yaml
# payments-db-restore.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: payments-db-restore
  namespace: team-payments
spec:
  instances: 1
  storage:
    size: 20Gi                      # at least the original's size
  bootstrap:
    recovery:
      source: payments-db           # names the externalClusters entry below
      recoveryTarget:
        targetTime: "2026-10-15 09:31:00+00"   # just after the marker, before the delete
  externalClusters:
    - name: payments-db             # must equal the ORIGINAL cluster name (the archive's server name)
      barmanObjectStore:
        destinationPath: s3://adhar-backups/cnpg/payments-db
        endpointURL: http://rustfs.adhar-system.svc.cluster.local:9000
        s3Credentials:
          accessKeyId: {name: root-creds, key: rootUser}
          secretAccessKey: {name: root-creds, key: rootPassword}
        wal:
          compression: gzip
```

Omit `recoveryTarget` to replay to the end of the archived WAL. Use that after losing a database outright.

```bash
kubectl apply -f payments-db-restore.yaml
kubectl -n team-payments get cluster payments-db-restore -w
kubectl -n team-payments exec payments-db-restore-1 -c postgres -- \
  psql -d payments -c "select * from drill;"
```

**Expected:** the cluster reports a healthy state and the marker row is back, even though it was deleted on the original. Delete `payments-db-restore` when the drill is done.

Pointing a live application at a recovered cluster means changing its connection Secret and Service name (`payments-db-restore-rw`). Rehearse that switch in staging; the platform does not automate it.

## Prove it keeps working

A one-off drill ages quickly. Build these into routine:

| Cadence | Action | Command or signal |
|---|---|---|
| Continuously | Alert on any CNPG cluster with a `lastFailedBackup` and on object-store PVC usage above 80% | kube-prometheus ships a Velero dashboard; see [Observability](/docs/operations/observability) |
| Daily, in CI | Fail the pipeline if last night's platform backup did not complete | `adhar backup list --detailed --limit 5` then `adhar backup verify <name>` |
| Monthly | Namespace drill (Steps 3–5) and a PITR drill (Step 6) on non-production | — |
| Monthly | Reconstructability drill: the platform creates a drill `Cluster` on the 1st and records time-to-Ready against a 1-hour SLO | requires Crossplane's `--enable-operations`; review the verdict, then `kubectl -n adhar-system delete cluster drill-reconstructability` |
| Quarterly | Full management-cluster restore into an isolated VPC | runbook in [Production](/docs/operations/production) |

To trigger the reconstructability drill now instead of waiting for the 1st, run the CronOperation's template once:

```bash
kubectl get cronoperation adhar-reconstructability-drill -o jsonpath='{.spec.operationTemplate}' | \
  jq '{apiVersion:"ops.crossplane.io/v1alpha1",kind:"Operation",metadata:{generateName:"drill-manual-"},spec:.spec}' | \
  kubectl create -f -
kubectl get operations -o jsonpath='{range .items[*]}{.status.pipeline[*].output.verdict}{"\n"}{end}'   # pass
```

## Schedules for your own namespaces

The weekly schedule already covers every namespace's objects. For a tighter RPO on a team namespace, add a daily Schedule in Velero's namespace:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: orders-daily
  namespace: adhar-system           # Velero only acts on Schedules in its own namespace
spec:
  schedule: "30 2 * * *"            # five-field cron, UTC
  template:
    includedNamespaces: [orders]
    snapshotVolumes: false
    defaultVolumesToFsBackup: false # keep file backup opt-in
    storageLocation: default
    ttl: 336h0m0s                   # 14 days
```

`adhar backup schedule create orders-daily --interval daily --time 02:30` also creates a Schedule, with an empty template, which means every namespace. Prefer the manifest when you want a scoped one. Velero cron has five fields. A CNPG `ScheduledBackup` has **six**, and the first is seconds. A five-field string there is accepted and runs at a different time than it reads.

The `BackupPolicy` XR (`examples/backup-policy.yaml`) is not yet a reliable alternative. Its composition currently writes its Schedule and BackupStorageLocation into a `velero` namespace, while this platform runs Velero in `adhar-system`. Its `verification` and `notifications` fields are accepted by the schema but not rendered into anything. Use plain Velero Schedules until that changes.

## Moving backups off-cluster

| Tool | Where to change it | Note |
|---|---|---|
| Velero | `platform/stack/packages/core/velero/values.yaml` → `configuration.backupStorageLocation` (`bucket`, `prefix`, `config.s3Url`, `config.region`, `credential`), then `./generate-manifests.sh` and `adhar upgrade` | Keep `prefix: velero`; supply a credential Secret holding an AWS-INI profile under the key `cloud` |
| Team databases | `Database` parameter `backupBucket` changes only the bucket | The local composition hard-codes the in-cluster RustFS endpoint, so a different endpoint means changing `compositions/database/local-cnpg.yaml` |
| Platform databases | Each database's `barmanObjectStore` | Same `destinationPath` / `endpointURL` / `s3Credentials` shape as above |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every backup is `FailedValidation`; Velero itself looks Healthy | BackupStorageLocation `Unavailable`, usually because its credential Secret is missing | Check `kubectl -n adhar-system get bsl default` and the `velero-s3-credentials` ExternalSecret |
| BSL `Unavailable: invalid top-level directories: [cnpg]` | The Velero `prefix` was removed, so Velero sees CNPG's directories at the root | Restore `prefix: velero` in the package values |
| `namespaces "velero" not found` from `adhar backup` | An older CLI assumed upstream's namespace | Upgrade the CLI, or set `ADHAR_VELERO_NAMESPACE=adhar-system` |
| Every CNPG database logs `barman-cloud-wal-archive: exit status 4` | Object store full, so WAL archiving stops everywhere at once | Expand the store's PVC, keep `retentionPolicy: 7d`, move off-cluster |
| A backup is `PartiallyFailed` and the object store is filling | File backup turned on for all volumes (`defaultVolumesToFsBackup: true`) | Keep it `false`; opt volumes in by annotation |
| Restore `Completed` but volumes are empty | The pod volume was not opted in, or node-local storage that cannot be snapshotted | Annotate with `backup.velero.io/backup-volumes`; use CNPG for databases |
| Restore `Completed` but objects missing in place | Velero skips objects that already exist | Restore into a mapped namespace, or delete the objects first |
| Drill pods take live traffic | A restored HTTPRoute claims the live hostname | Exclude `httproutes.gateway.networking.k8s.io` from drill restores |
| Recovery cluster fails its WAL archive check | The new cluster has a `backup` section pointing at an archive that already has data | Recover with no `backup` section, or a fresh `destinationPath` |
| Base backups run at an odd hour | Five-field cron in a CNPG `ScheduledBackup` | Use six fields: `"0 30 1 * * *"` |

## Next steps

- **[Production](/docs/operations/production)** — topology, hardening and the management-cluster recovery runbook
- **[Upgrade the Platform](/docs/guides/upgrade-the-platform)** — take a verified backup before every upgrade
- **[Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet)** — workload clusters you rebuild from Git instead of restoring
- **[Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service)** — the `Database` request whose backups you just drilled
- **[Troubleshooting](/docs/reference/troubleshooting)** — more failure signatures
