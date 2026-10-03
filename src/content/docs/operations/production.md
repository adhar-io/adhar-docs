---
title: "Production"
section: "Operations"
order: 1
path: "/docs/operations/production"
---

# Production

Running Adhar as real infrastructure. This page covers topology, sizing, HA, the edge (DNS/TLS/LB), hardening, upgrades, and backup/DR.

> Adhar is in active development (v0.1.x). Validate each control in your own environment.

## At a glance

| | |
|---|---|
| **Topologies** | T2 (single production cluster) → T3 (management + workload clusters) |
| **Enable HA** | `globalSettings.enableHAMode: true` (or `adhar up --ha`) |
| **Binding constraint** | Per-VM volume-attach limits — usually needs ≥ 10 workers, not more CPU |
| **Edge** | Cilium Gateway + `external-dns` + cert-manager (DNS-01 wildcard) |
| **Secrets** | OpenBao (enable `credential-rotation`; KMS auto-unseal) |
| **Upgrades** | `adhar upgrade --diff-only` → `adhar upgrade` (staging first) |
| **Backup/DR** | Velero + CNPG WAL to **real object storage** (not in-cluster MinIO) |

## Choose a topology

| Topology | When | Trade-off |
|---|---|---|
| **T2 — single production cluster** | One team, fast to production | Platform and workloads share a failure domain |
| **T3 — management + workload clusters** | Multiple environments/teams, compliance boundaries | More clusters to run (the management cluster automates most of it) |

Start with T2; moving to T3 is additive (provision workload clusters via a `CompositeCluster`) because all platform state is already in Git.

## Sizing & HA

Baseline for the management / platform cluster:

| Component | Minimum production shape |
|---|---|
| Control plane | 3 nodes |
| Platform node pool | 3× 4 vCPU / 16 GB across ≥ 2 zones, autoscaling on |
| ArgoCD | ≥ 2 replicas (server/repo-server); HA Redis |
| Gitea | ≥ 2 replicas; external PostgreSQL via CNPG (3 instances) |
| Gateway (Cilium Envoy) | ≥ 2 replicas behind the cloud LB; PDB |
| Keycloak | ≥ 2 replicas + CNPG PostgreSQL |
| Observability | Mimir/Loki/Tempo on object storage |

Turn HA on so environment templates apply replicas, PDBs, and topology-spread constraints:

```yaml
globalSettings:
  enableHAMode: true
```

Or pass `--ha` to `adhar up`. **What constrains size:** the production profile enables most of the catalogue (`adhar stack list` prints the live count); the full profile creates ~55–60 PersistentVolumes and ~300 pods. The binding constraint is usually per-node **volume attachment limits**, not CPU — on DigitalOcean that's 7 block volumes per droplet, so the full catalogue needs ≥ 10 workers.

## The edge: DNS, TLS, load balancing

On cloud/on-prem the Gateway deploys in its production variant automatically: a LoadBalancer Service, an HTTPS listener on the platform wildcard hostname, and cert-manager-issued TLS. Set the base domain once and every URL derives from it:

```yaml
globalSettings:
  defaultHost: platform.example.com
  defaultHttpsPort: 443
  email: admin@platform.example.com
  # dnsProvider: cloudflare   # only when it differs from the environment's cloud
```

| Concern | What ships | Publicly trusted |
|---|---|---|
| DNS | `external-dns` (`--domain-filter`, `--txt-owner-id`) | Delegate `<defaultHost>` to the provider |
| TLS | cert-manager (`adhar-selfsigned`, `-letsencrypt-staging/prod/dns`) | The wildcard needs DNS-01 |
| Ingress | Cilium Gateway, one cloud LoadBalancer on 80/443 | — |

See [Accessing the Platform](/docs/operations/accessing-the-platform) for the full access + credentials flow.

## Security hardening checklist

- **Identity:** Keycloak OIDC for all services; no local admin accounts after bootstrap. Rotate the day-0 `gitea_admin` / ArgoCD `admin` passwords (enable the `credential-rotation` package). Kubernetes API via OIDC group claims; per-namespace RBAC.
- **Secrets:** OpenBao is the production backend (the `vault` package ships disabled — exactly one may be enabled). Harden with cloud-KMS auto-unseal; enable etcd encryption at rest; no secrets in Git.
- **Network:** default-deny Cilium network policies; WireGuard node-to-node encryption; the Gateway is the only public entry.
- **Supply chain:** Kyverno in `Enforce` (Pod Security restricted, no `:latest`, resource requests required); Harbor the only allowed registry with Trivy + Cosign. Prove enforcement with `hack/verify-supply-chain.sh` before switching to Enforce.

## Upgrades

**Platform (an Adhar release):**

1. Read the release notes; upgrade a staging platform first.
2. Take a pre-upgrade backup.
3. `adhar upgrade --diff-only` — preview.
4. `adhar upgrade` (`--yes` for CI, `--skip-foundation` to touch only the stack).
5. Watch until all apps are `Healthy/Synced` (`adhar get status`). Expect a ~10-minute OutOfSync storm first (normal).

**Kubernetes (in-place, control plane first, then workers):**

```bash
adhar cluster upgrade <cluster> --version 1.37.2 -p digitalocean -f config.yaml
```

Do the management cluster last. On `useManagedK8s` clusters, follow the provider's managed-upgrade process.

## Backup & disaster recovery

Velero ships two Schedules (`adhar-platform-daily` 02:00 UTC / 30-day, `adhar-cluster-weekly` Sunday 03:00 / 90-day); platform CNPG databases have WAL archiving + a daily base backup.

> **Repoint the BackupStorageLocation at real object storage in production.** The default is the in-cluster MinIO bucket `adhar-backups`; a full MinIO stops WAL archiving for every database at once. Set a CNPG `retentionPolicy` (7d) on every database.

**Management-cluster recovery, in short:** re-run `adhar up` against a fresh cluster with the same config → restore databases from object storage (CNPG `bootstrap.recovery`) → `velero restore create --from-backup adhar-platform-daily-<ts>` → ArgoCD reconciles packages, Crossplane reconverges infrastructure → verify with `adhar get status` and a golden-path deploy.

**Practice:** quarterly full restore into an isolated VPC; a monthly reconstructability drill ships as a control-plane operation.

## Everyday commands

```bash
adhar get status                                    # platform + package health
adhar get apps                                      # ArgoCD application states
adhar cluster list --file config.yaml               # --file is REQUIRED
adhar cluster scale <cluster> --workers 10 -p <provider> -f config.yaml
kubectl -n adhar-system get adharplatform -o yaml   # component conditions + autoscaling
cilium status && cilium connectivity test           # network layer
```

See [Troubleshooting](/docs/reference/troubleshooting) for failure signatures and fixes.
