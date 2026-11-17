---
title: "Production"
section: "Operations"
order: 1
path: "/docs/operations/production"
---

# Production

This page is for the platform engineer who has run Adhar on a laptop and now has to put it in front of real teams. It covers choosing a topology, what HA mode changes, sizing, the edge, hardening, backup and upgrades. By the end you can write a production `config.yaml`, bring it up, and prove it is ready with the go-live checklist.

> **Status:** Adhar is in active development (v0.1.x). Validate each control in your own environment before you rely on it. See the [Roadmap](/docs/reference/roadmap).

## At a glance

| | |
|---|---|
| **Topologies** | T1 local → T2 single production cluster → T3 management + workload clusters |
| **Turn HA on** | `globalSettings.enableHAMode: true` in the config (`--ha` exists for local Kind runs) |
| **HA does not change** | The control-plane node count, or Gitea's single replica |
| **Capacity watch-out** | Per-VM block-volume attach limits (7 per droplet on DigitalOcean) for volumes that use the cloud's block storage |
| **Edge** | Cilium Gateway + cloud LoadBalancer + `external-dns` + cert-manager (DNS-01 wildcard) |
| **Secrets** | OpenBao; add cloud-KMS auto-unseal; `adhar-credential-rotation` (on in the production profile) |
| **Backup/DR** | Velero (cluster state) + CNPG WAL archiving (database data); repoint both at off-cluster object storage |
| **Upgrades** | `adhar upgrade --diff-only` → `adhar upgrade`, staging first |

## Choose a topology

The same architecture deploys at three sizes. All platform state lives in Git, so moving from one size to the next is a configuration change.

```diagram
do-topologies
```

| Topology | Shape | Choose it for | Trade-off | Status |
|---|---|---|---|---|
| **T1 — Local** | One Kind node; the manager runs inside the CLI and exits when apps converge | Evaluation, development, CI | Not production | `status:complete` |
| **T2 — Single production cluster** | One cloud cluster runs the platform and the workloads; the controller manager runs in-cluster | One team, one or two environments, getting to production fast | Platform and workloads share a failure domain and an upgrade window | `status:complete` |
| **T3 — Management + workload clusters** | A management cluster provisions workload clusters with a `Cluster` XR and deploys to them with ApplicationSets | Several teams or environments, compliance boundaries, cluster-level blast-radius isolation | More clusters to pay for and operate | `status:complete` |

**Start with T2.** The move to T3 is additive: you provision workload clusters from the management cluster with a `Cluster` resource, then shift applications over. Each `Cluster` registers itself with ArgoCD (labels `adhar.io/cluster`, `adhar.io/dataplane`, `adhar.io/dataplane-mode`) and receives the thin workload profile. See [Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet).

### What an environment is

Inside T2 there is a finer choice. Each entry under `environments:` has an `isolation` field:

```yaml
environments:
  dev:
    isolation: namespace     # the default: a namespace on ONE shared platform cluster
    type: non-production
    provider: digitalocean
  prod:
    isolation: cluster       # a cluster of its own: its own API server, etcd, blast radius
    type: production
    provider: digitalocean
```

| `isolation` | What `adhar up -f config.yaml` builds |
|---|---|
| `namespace` (default) | One cluster, with the `dev`, `test` and `prod` namespaces on it. One platform install and one bill. The cluster is sized from the production-type environment |
| `cluster` | A separate cluster for that environment. Use it for the environment that needs hard isolation, usually `prod` only |

## HA mode

`enableHAMode` is one boolean. It selects a different, pre-rendered **variant** of the foundation manifests that the controller applies.

### How the flag flows

```diagram
nop-ha-flag
```

1. You set `globalSettings.enableHAMode: true` in `config.yaml` (or run `adhar config set enableHAMode true`).
2. `adhar up` copies it onto the `AdharPlatform` resource as `spec.buildCustomization.enableHAMode`.
3. The reconcilers read that field. ArgoCD, Gitea and Crossplane each load `install-ha.yaml` instead of `install.yaml`. The CNPG operator is installed in the foundation **before** ArgoCD and Gitea, because Gitea's database now depends on it.
4. At seed time the stack templates read the same flag. The Keycloak package uses it to ask for a second database instance.
5. `adhar upgrade` reads the same field, so an upgrade keeps the variant you chose.

```yaml
globalSettings:
  defaultHost: platform.example.com
  defaultHttpsPort: 443
  enableHAMode: true      # ArgoCD x2 + redis-ha x3, CNPG 2 instances, PDBs
  email: admin@platform.example.com
```

The `--ha` flag on `adhar up` sets the same field for the **local Kind** path. On a cloud bring-up (`adhar up -f config.yaml`), the config value is what counts.

### What changes

```diagram
do-ha-mode
```

| Component | `enableHAMode: false` | `enableHAMode: true` |
|---|---|---|
| ArgoCD application controller | 1 replica | StatefulSet × 2, PDB `minAvailable: 1` |
| ArgoCD server and repo-server | 1 replica each | HPA `minReplicas: 2`, `maxReplicas: 5`, each with a PDB |
| ArgoCD Redis | One Redis pod | `redis-ha` StatefulSet × 3 + HAProxy × 3 |
| Gitea database | Chart-bundled PostgreSQL | CNPG `Cluster` `gitea-db`, `instances: 2` (services `gitea-db-rw` / `gitea-db-ro`) |
| CNPG operator | Arrives later, from the stack | Installed in the foundation, ahead of ArgoCD and Gitea |
| Crossplane | 1 replica | 2 replicas (`install-ha.yaml`) |
| Keycloak database | 1 instance | `keycloak-db`, 2 instances |

### What does not change

- **The control-plane node count.** Compute-mode clusters (`clusterMode: compute`, the default, where Adhar builds the cluster with kubeadm on instances it creates) bootstrap **one** control-plane node. The provider code rejects more than one; a multi-master control plane is not implemented. For a highly available control plane, use `clusterMode: managed` (the cloud runs the control plane) and rely on the provider's SLA, or `clusterMode: provided` to install onto a cluster you already run.
- **Gitea's replica count.** Gitea runs one replica behind a PodDisruptionBudget. HA mode moves its *database* onto a replicated CNPG cluster, not the Gitea process.
- **Your workloads and most stack packages.** HA mode covers the foundation. Package replica counts come from each package's `values.yaml` (see [Customization](/docs/operations/customization)).

### Verify HA mode

Run these after the first HA bring-up:

```bash
# 1. The flag reached the platform resource
kubectl -n adhar-system get adharplatform \
  -o jsonpath='{.items[0].spec.buildCustomization.enableHAMode}{"\n"}'
# want: true

# 2. ArgoCD runs the HA variant
kubectl -n adhar-system get statefulset argo-cd-argocd-application-controller argo-cd-redis-ha-server
kubectl -n adhar-system get hpa argo-cd-argocd-server argo-cd-argocd-repo-server
kubectl -n adhar-system get pdb

# 3. Gitea and Keycloak sit on two-instance CNPG clusters
kubectl -n adhar-system get clusters.postgresql.cnpg.io gitea-db keycloak-db
```

Then **log into ArgoCD through Keycloak as a non-admin** and confirm you see the full application list. This catches the two failures specific to the HA variant: `Invalid redirect URL` on login, and an empty application list after a successful SSO login. Both are covered in [Troubleshooting](/docs/reference/troubleshooting).

## Sizing

### Management / platform cluster baseline

| Component | Minimum production shape |
|---|---|
| Control plane | Compute mode: one node (see above). Managed mode: the provider's control plane and SLA |
| Platform node pool | 3× 4 vCPU / 16 GB across ≥ 2 zones, autoscaling on |
| ArgoCD | HA variant (above) |
| Gitea | 1 replica + PDB; database on CNPG (`gitea-db`) |
| Gateway (Cilium Envoy) | Behind the cloud LoadBalancer |
| Keycloak | Database on CNPG (`keycloak-db`) |
| Observability | Mimir and Loki on object storage; Tempo ships with 24-hour local retention (see [Observability](/docs/operations/observability#retention-and-object-storage-sizing)) |

### Storage is the constraint

The production profile enables most of the 100+ packages in the catalogue (`adhar stack list` prints the live number and state). That is a few hundred pods and dozens of PersistentVolumes, so plan storage as carefully as CPU and memory.

Many clouds limit **how many block volumes one VM may attach**. On DigitalOcean the limit is 7 per droplet. When pods need more cloud block volumes than the nodes can attach, the scheduler reports:

```text
0/3 nodes are available: 3 node(s) exceed max volume count
```

Add workers to fix it, because each one brings its own attach slots. Enlarging nodes does not help. The autoscaler treats this message as a scale-up signal.

On DigitalOcean compute-mode clusters, Adhar makes a node-local StorageClass (`adhar-local`) the default and marks `do-block-storage` as non-default. The 7-volume limit therefore applies only to claims that explicitly ask for `do-block-storage`.

### Node autoscaling

Autoscaling turns the worker count into a range. A controller in the Adhar controller manager drives it, because the upstream cluster-autoscaler has no provider for self-managed kubeadm clusters.

```diagram
nop-autoscaler
```

It is built for `clusterMode: compute`. It refuses to act on a `provided` cluster, because the platform did not create those nodes.

```yaml
environments:
  prod:
    provider: digitalocean
    type: production
    autoscaling:
      enabled: true
      minWorkers: 3        # your HA floor — an idle night cannot drop below it
      maxWorkers: 10       # the spend ceiling; the only limit it will never cross
      # scaleDownDelay: 10m  # minimum gap between moves (default 10m)
```

| Field | Default | Meaning |
|---|---|---|
| `minWorkers` | 1 | The floor a scale-down stops at |
| `maxWorkers` | 5 | The ceiling a scale-up stops at |
| `scaleDownDelay` | `10m` | At most one node is removed per window |

Watch `.status.autoscaling.lastReason` on the `AdharPlatform`. If it ends in `… but maxWorkers=N reached`, the platform wanted capacity you have not allowed it to buy.

Manual scaling uses the same code path:

```bash
adhar cluster scale <cluster> --workers 10 --node-group workers -p digitalocean -f config.yaml
```

> **Warning:** The autoscaler can undo a manual `adhar cluster scale`, because pods pending for capacity are its scale-up trigger. Before scaling by hand, adjust `maxWorkers` or set `autoscaling.enabled: false`.

### Kubernetes version

The compiled-in default is **v1.37.0**. The version is chosen in this order:

1. an explicit `adhar up --kube-version` flag
2. `kubeVersion` in the environment's `clusterConfig`
3. the default

A newer CLI therefore never silently repins your clusters. A node added later by `adhar cluster scale` or the autoscaler is prepared against the version the **running** control plane reports, so it cannot introduce skew.

### Workload clusters (T3)

Keep them thin: Cilium, Alloy collectors, Kyverno and its policies, External Secrets, metrics-server, plus your applications. Everything multi-tenant and stateful stays on the management cluster.

A workload cluster should be reconstructable from Git and Crossplane within one hour. The monthly [reconstructability drill](#routine) measures that target, so you do not have to assume it.

## The edge: DNS, TLS and load balancing

On cloud and on-prem, the Gateway deploys its production variant automatically: a LoadBalancer Service (instead of Kind's pinned NodePorts), an HTTPS listener on the platform wildcard hostname, and TLS from cert-manager.

```diagram
gd-request-path
```

Set the base domain once and every URL derives from it:

```yaml
globalSettings:
  defaultHost: platform.example.com    # a zone you have delegated to your DNS provider
  defaultHttpsPort: 443
  email: admin@platform.example.com    # the ACME registration address
  # dnsProvider: cloudflare            # only when it differs from the environment's cloud
```

| Concern | What ships | To be publicly trusted |
|---|---|---|
| DNS | `external-dns`, `--domain-filter=<defaultHost>`, `--txt-owner-id` per cluster | Delegate `<defaultHost>` to the provider **before** `adhar up`; the platform does not create the zone |
| TLS | cert-manager: `adhar-selfsigned`, `adhar-letsencrypt-staging`, `adhar-letsencrypt-prod` (HTTP-01), `adhar-letsencrypt-dns` (DNS-01) | The wildcard `*.<defaultHost>` needs DNS-01; it lands in `Secret/adhar-cert` |
| Ingress | Cilium Gateway API, one cloud LoadBalancer on 80/443 | — |

The CLI writes DNS credentials into the `adhar-dns-provider` Secret. They never enter Git. For the full request path and how to test each layer, see [Accessing the Platform](/docs/operations/accessing-the-platform).

## Security hardening

A control that ships is not necessarily switched on. Apply these in order; later steps assume earlier ones. [Security Best Practices](/docs/security/security-best-practices) explains each control, its defaults and how to verify it.

1. **Verify SSO for a non-admin user** in ArgoCD, Gitea, Grafana and the Console. If group mapping is broken, step 2 locks you out.
2. **Rotate the bootstrap credentials.** `adhar-credential-rotation` (on in the production profile) replaces the `gitea_admin` and ArgoCD `admin` passwords and writes break-glass copies to `secret/adhar/bootstrap-credentials`. Confirm the marker: `kubectl -n adhar-system get secret bootstrap-credentials-rotated`.
3. **Add cloud-KMS auto-unseal to OpenBao** (`seal "awskms"` / `"azurekeyvault"` / `"gcpckms"` in the package values). Until then the bootstrap Job keeps the unseal key and root token in the `openbao-keys` Secret.
4. **Enable etcd encryption at rest**, or verify the managed provider's default.
5. **Enable API-server OIDC as a day-2 change**, never at provisioning time, and test with a token-only kubeconfig.
6. **Give Crossplane cloud access through workload identity** (IRSA, Workload Identity, Managed Identity), never long-lived keys in Secrets.
7. **Author network policy.** A pod that no policy selects is unrestricted, and nothing that ships restricts egress. Add egress policy for workload namespaces from Hubble flow data, and turn on WireGuard node-to-node encryption.
8. **Run the supply-chain drill** (`hack/verify-supply-chain.sh`) and know which image policies are enforced. Tighten the registry allowlist if your threat model needs Harbor-only.
9. **Promote the Pod Security policies from Audit to Enforce** one at a time, reading PolicyReports between each.
10. **Restrict API-server access** to a VPN or allowlist; keep the Gateway as the only public entry.

## Backup and disaster recovery

**Git holds the configuration, Velero holds cluster state, and CNPG holds database data.** Everything else reconverges. The full procedure, including restore drills, is in [Backup and Restore](/docs/guides/backup-and-restore).

```diagram
hb-backup-coverage
```

| Data | How it is protected | What ships |
|---|---|---|
| Configuration, packages, environments | Git (the in-cluster Gitea repos) | Both Gitea manifests (standard and HA) opt the `data` volume into Velero file backup. Mirror to an external forge as well |
| Cluster objects | Velero | `adhar-platform-daily` (02:00 UTC, `adhar-system` + cluster-scoped, 30-day TTL) and `adhar-cluster-weekly` (Sunday 03:00 UTC, all namespaces, 90-day TTL) |
| Platform databases | CNPG WAL archiving + scheduled base backups | WAL continuous, base backups daily |
| Other volume data | Velero node agent, **opt-in per pod** | Annotate the pod with `backup.velero.io/backup-volumes: <volume>` |
| Crossplane-managed infrastructure | Nothing extra | Managed resources reconverge from the Git-declared XRs |

> **Warning:** Repoint the BackupStorageLocation at off-cluster object storage. The default target is the in-cluster object store (RustFS, bucket `adhar-backups`), and a backup inside the cluster it protects does not survive that cluster. A full object store also stops WAL archiving for **every** database at once; Postgres volumes then fill and SSO goes down. Set a CNPG `retentionPolicy` on every database as well.

### Recovery targets

| Scenario | RPO | RTO |
|---|---|---|
| Package or app misconfiguration | 0 (Git revert) | Minutes |
| Platform service data loss | ≤ 15 min (WAL) | ≤ 1 h |
| Workload cluster loss (T3) | 0 for config; app data per its own backups | ≤ 1 h |
| Management cluster loss | ≤ 1 h | ≤ 4 h |

### Recover a lost management cluster

1. Run `adhar up -f config.yaml --env <name>` against a fresh cluster.
2. Restore the databases from object storage with a CNPG `bootstrap.recovery` section.
3. Run `velero restore create --from-backup adhar-platform-daily-<timestamp>` for objects that live outside Git.
4. Let ArgoCD and Crossplane reconverge.
5. Verify with `adhar get status`, an SSO login, a golden-path deploy and `kubectl get clusterproviderconfigs.<group>`.

## Upgrades

There are three independent upgrade streams. The step-by-step guide is [Upgrade the Platform](/docs/guides/upgrade-the-platform).

| Stream | What changes | How |
|---|---|---|
| **Platform** (an Adhar release) | Foundation manifests embedded in the binary, and the stack | `adhar upgrade --diff-only`, then `adhar upgrade` |
| **Packages** (chart bumps) | One package's rendered manifests | Bump `CHART_VERSION` in `generate-manifests.sh`, re-render, review, merge |
| **Kubernetes** | The cluster version, control plane first, then workers | `adhar cluster upgrade` (compute mode) or the provider's process (managed mode) |

```diagram
hb-upgrade-phases
```

```bash
# Platform: always preview, always staging first, always with a fresh backup
adhar upgrade --diff-only          # what the release would change; touches nothing
adhar upgrade                      # converge foundation, show the stack diff, confirm, push
adhar upgrade --yes                # the same, non-interactive (CI)
adhar upgrade --skip-foundation    # only diff and sync the stack

# Kubernetes: workload clusters first, the management cluster last
adhar cluster upgrade <cluster> --version 1.37.2 -p digitalocean -f config.yaml
```

After a platform upgrade, many Applications flip `OutOfSync` and then settle. Every platform Application tracks the `main` branch of the same in-cluster `adhar/packages` repository, so one push moves the target revision for all of them at once. That is expected. Investigate only what stays `Degraded`.

## Go-live checklist

Confirm each item with the command beside it before the first team deploys.

1. **The platform is converged.** `adhar get status` shows `Ready`, and `adhar get apps` shows every application `Synced` and `Healthy`.
2. **HA is real.** The commands in [Verify HA mode](#verify-ha-mode) pass, and a non-admin Keycloak user sees the full ArgoCD application list.
3. **The edge is public and trusted.** `curl -sI https://console.<defaultHost> | head -1` returns `HTTP/2 200` with no `-k`, and `kubectl -n adhar-system get certificate` shows `READY True`.
4. **Crossplane can provision.** `kubectl get clusterproviderconfigs.kubernetes.m.crossplane.io` returns at least one row. `adhar get status` does not check this.
5. **Capacity has headroom.** `kubectl get pods -A --field-selector=status.phase=Pending` is empty, and `minWorkers` and `maxWorkers` are set deliberately.
6. **Credentials are rotated.** `kubectl -n adhar-system get secret bootstrap-credentials-rotated` exists.
7. **Backups leave the cluster.** `velero backup get` (or `adhar backup list`) shows completed backups against an off-cluster BackupStorageLocation, and no CNPG cluster reports a `lastFailedBackup`.
8. **A restore has been rehearsed.** At least one restore into a scratch namespace has succeeded ([Backup and Restore](/docs/guides/backup-and-restore)).
9. **Policy posture is known.** You have read `adhar compliance --failures-only`, and `hack/verify-supply-chain.sh` prints `SUPPLY-CHAIN ENFORCEMENT DRILL PASSED`.
10. **Alerts reach a human.** A test alert fired and appeared in the Console's Notification Center. If you page through Grafana OnCall, you have added the Alertmanager receiver for it (none ships by default) and a test page arrived.
11. **A golden path works end to end.** One service went from push to a URL through the supply chain ([Your First Service](/docs/getting-started/first-service)).

## Day-2 operations

### Alert on these

| Area | Alert on |
|---|---|
| ArgoCD | Apps `Degraded`/`OutOfSync` for more than 15 minutes; sync failures |
| Controllers | Reconcile error rate, workqueue depth |
| Gitea, Keycloak, CNPG | Availability, replication lag, **`lastFailedBackup` on any CNPG cluster** |
| Gateway | 5xx rate, certificate expiry under 21 days, LoadBalancer health |
| Cilium | Agent health, policy-drop anomalies in Hubble |
| Capacity | Node memory pressure, **PVC usage above 80% — especially the object store's claim**, pods `Pending` for capacity, autoscaler at `maxWorkers` |

[Observability](/docs/operations/observability#alerts-that-predict-outages) explains why each of these leads an outage.

### Routine

| Cadence | Action |
|---|---|
| Daily | Review ArgoCD drift and failed syncs — steady state is zero |
| Weekly | Triage scan reports; review pending package updates |
| Monthly | Reconstructability drill verdict; workload-cluster rebuild test (T3); Keycloak access review |
| Quarterly | Full DR restore into an isolated network; capacity and cost review; supply-chain enforcement drill |

The monthly reconstructability drill ships as a Crossplane CronOperation (`platform/controlplane/configuration/operations/reconstructability-drill.yaml`). The platform's Crossplane already runs with the `--enable-operations` flag it needs. At 04:00 on the 1st of each month, the drill creates a `Cluster` named `drill-reconstructability` and records its time-to-Ready against a one-hour SLO. Review the verdict, then delete the drill cluster:

```bash
kubectl -n adhar-system delete cluster drill-reconstructability
```

### Everyday commands

```bash
adhar get status                                    # platform conditions + per-package health
adhar get apps                                      # ArgoCD application states
adhar get secrets -p argocd                         # platform credentials
adhar cluster list --file config.yaml               # --file is required for cloud clusters
kubectl -n adhar-system get adharplatform -o yaml   # component conditions + autoscaling status
cilium status && cilium connectivity test           # network layer
hubble observe --namespace <ns>                     # live flow debugging
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `adhar up -f config.yaml` built every environment | Without `--env`, every environment in the file is provisioned | Always pass `--env <name>` |
| "HA" platform loses its API server with one node | HA mode does not change the control-plane count; compute mode runs one | Plan for it, or use `clusterMode: managed` for a provider-run control plane |
| `exceed max volume count` while CPU is idle | Per-VM volume-attach limit | Add workers (`adhar cluster scale` or raise `maxWorkers`) |
| Autoscaler adds nothing | `maxWorkers` reached, or not in compute mode | Read `.status.autoscaling.lastReason` |
| Certificates stay self-signed | Zone not delegated, or no DNS-01-capable provider | Delegate `<defaultHost>`; check `adhar-dns-provider` and cert-manager logs |
| SSO returns 503 everywhere | The in-cluster object store filled; WAL archiving stopped; Keycloak's database filled | Grow the store, set `retentionPolicy`, move backups off-cluster |
| SSO works, ArgoCD list is empty (HA) | Empty `argocd-rbac-cm` policy | See [Troubleshooting](/docs/reference/troubleshooting) |
| `adhar cluster list` says "No clusters found" | Without `--file` it knows no cloud provider (only local Kind clusters are listed) | `adhar cluster list --file config.yaml` |

## Next steps

- [Backup and Restore](/docs/guides/backup-and-restore) — the full backup model and restore drills.
- [Upgrade the Platform](/docs/guides/upgrade-the-platform) — each upgrade stream, step by step.
- [Security Best Practices](/docs/security/security-best-practices) — every control behind the hardening checklist.
- [Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet) — moving from T2 to T3.
