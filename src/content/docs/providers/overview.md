---
title: "Providers Overview"
section: "Cloud Providers"
order: 1
path: "/docs/providers/overview"
---

# Providers Overview

A **provider is the only part of Adhar that knows what cloud you are on.** Everything above the cluster — Cilium, the Gateway, ArgoCD, Gitea, Crossplane and the whole package catalogue — is byte-identical whether the cluster is a Kind node on your laptop or ten droplets in Bangalore. The provider exists so that the platform never has to care.

That is the problem this layer solves. Without it, "run the platform on Azure" would mean a second platform. With it, you change one word in `config.yaml`.

## At a glance

| | |
|---|---|
| **What it is** | A Go interface (`platform/providers/interface.go`) every cloud implements |
| **How you pick one** | `provider:` on an environment, plus a matching `providers:` block |
| **Two paths** | Imperative (CLI, day-0/day-2) and declarative (Crossplane, continuous) |
| **Default cluster shape** | Raw compute + kubeadm — managed Kubernetes is opt-in |
| **Common to all** | Bootstrap, stack, storage model, autoscaler, version rules, teardown order |
| **Provider-specific** | Instance/network APIs, CCM, CSI driver, DNS-01 solver, quotas |
| **Reference path** | [DigitalOcean](/docs/providers/digitalocean) — live-verified end to end |

## What a provider actually is

`platform/providers/interface.go` declares one `Provider` interface, and `kind/`, `aws/`, `azure/`, `gcp/`, `digitalocean/`, `civo/` and `custom/` each implement it. The method groups are the whole contract:

| Group | Methods | What it answers |
|---|---|---|
| Identity | `Name`, `Region` | Which cloud, which region |
| Authentication | `Authenticate`, `ValidatePermissions` | Can these credentials act here |
| Cluster lifecycle | `CreateCluster`, `Get`, `List`, `Update`, `Delete`, `GetKubeconfig` | Build and reach a cluster |
| Node groups | `AddNodeGroup`, `ScaleNodeGroup`, `RemoveNodeGroup`, `Get`, `List` | Grow and shrink the worker pool |
| Infrastructure | `CreateVPC`, `CreateLoadBalancer`, `CreateStorage` (+ get/delete) | The network and disks underneath |
| Lifecycle ops | `UpgradeCluster`, `BackupCluster`, `RestoreCluster` | Day-2 |
| Health & cost | `GetClusterHealth`, `GetClusterMetrics`, `GetClusterCost`, `GetCostBreakdown` | Reporting |
| Addons | `InstallAddon`, `UninstallAddon`, `ListAddons` | Cloud-native extras |

Two capabilities are deliberately **optional interfaces** rather than required methods:

- **`NodeRemover`** — removes one *named* worker. The autoscaler needs it because it picks which node to retire (the emptiest one that is safe to drain), and `ScaleNodeGroup` is a desired-count API that removes the highest-indexed instance. A provider without it does not support automatic scale-down at all.
- **`Preflighter`** — replaces the generic pre-create checks with ones that understand the cloud's own quotas and error vocabulary.

> A provider that cannot do something should return a clear "not supported" error, not partial behaviour. `useManagedK8s: true` on the `custom` provider is rejected by name rather than ignored.

## Two provisioning paths

Both share the same credentials and the same config file.

| Path | Mechanism | Used for |
|---|---|---|
| **Imperative** | The Go `Provider` interface | Day-0 creation (`adhar up`, `adhar cluster create`) and day-2 ops (`scale`, `upgrade`, `delete`) |
| **Declarative** | Crossplane Compositions | GitOps-managed infrastructure (`CompositeCluster`, `CompositeDatabase`, …) |

The imperative path gets you a management cluster. The declarative path lets that cluster manage everything else. See [Control Plane](/docs/core-concepts/control-plane).

## How `adhar up` flows through a provider

```text
adhar up -f config.yaml --env dev
       │
       ▼
 1. Resolve config       globalSettings → providers →
       │                 environmentTemplates → environments[dev]
       │                 (the environment block wins)
       ▼
 2. CreateProvider()     factory.go instantiates ONE Provider from
       │                 the resolved `type:` — unknown type = error
       ▼
 3. Authenticate()       token from env var / workload identity
       │
       ▼
 4. Preflight            credentials, quota, size availability
       │                 ✖ any fail → STOP. Nothing was created.
       ▼
 5. Reuse-or-create      a cluster of this name already there?
       │                 reuse it (--recreate asks for a fresh one)
       ▼
 6. CreateCluster()   ─── PROVIDER-SPECIFIC ───────────────────
       │                 network · firewall · SSH key · instances
       │                 kubeadm init/join · CCM + CSI
       │                 kubeconfig fetched over SSH
       ▼
 7. Platform bootstrap ── IDENTICAL EVERYWHERE ────────────────
       │                 Gateway API CRDs → Cilium → Gateway →
       │                 ArgoCD → Gitea → Crossplane → seed stack
       ▼
 8. GitOps sync          ArgoCD drives every package Synced+Healthy
```

Step 4 is the one worth internalising. `--dry-run` validates the *config* and nothing else, so it passes cleanly on an account that cannot create a single resource. Preflight probes the calls that actually gate a create — reads and writes, plus quota and whether the region really offers the instance type you asked for — and refuses **before** anything bills. Kind is exempt: no account, no quota, no permission model.

Step 5 exists because `adhar up` is the command you re-run after a failure. Without it, every re-run asked the cloud for a whole new cluster beside the half-built one, which on a quota-limited account fails with a message blaming your own previous attempt.

## Selecting a provider

Two places, and they must agree:

```yaml
providers:
  digitalocean:
    type: digitalocean
    region: blr1
    primary: true          # only this cloud's Crossplane providers install
    useEnvironment: true   # read the token from the environment

environments:
  dev:
    provider: digitalocean # ← the selection
    type: non-production
```

`primary: true` matters more than it looks. Each extra upjet provider family registers hundreds of CRDs — AWS, Azure and GCP together are roughly 3000 — and a single control-plane node went into API-server timeouts under all of them. Only the primary cloud's Crossplane packages install.

## Supported providers

| Provider | Key | Default model | Managed opt-in | Credentials | Trusted wildcard TLS | Verification | Cost model |
|---|---|---|---|---|---|---|---|
| [Local (Kind)](/docs/providers/local-kind) | `kind` | Local containers | n/a | none | self-signed only | Exercised continuously by CI | free |
| [DigitalOcean](/docs/providers/digitalocean) | `digitalocean` | Droplets + kubeadm | DOKS | `DIGITALOCEAN_ACCESS_TOKEN` | DNS-01 | Live-verified end to end | simple pricing |
| [Google Cloud](/docs/providers/gcp) | `gcp` | GCE + kubeadm | GKE | service-account key / ADC | DNS-01 | Live-verified (compute path) | pay-per-use |
| [AWS](/docs/providers/aws) | `aws` | EC2 + kubeadm | EKS | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | DNS-01 (static keys) | Render-verified | pay-per-use |
| [Azure](/docs/providers/azure) | `azure` | Azure VMs + kubeadm | AKS | client id / secret / tenant | DNS-01 | Render-verified | pay-per-use |
| [Civo](/docs/providers/civo) | `civo` | Instances + kubeadm | Civo k3s | `CIVO_TOKEN` | no Civo solver — use Cloudflare | Render-verified | transparent pricing |
| [Custom / on-prem](/docs/providers/custom) | `custom` | Your hosts + kubeadm | n/a | SSH key to your machines | via `cloudflare` or none | Render-verified | bring your own |

**Pick by what you are doing:**

- Learning, developing, demoing, CI → **Kind**. Free, no credentials, minutes.
- First cloud deployment, or anything you want to match a known-good run → **DigitalOcean**. It is the reference path; every timing and limit in these docs came off it.
- Cheap, fast, short-lived dev/staging clusters → **Civo**, accepting that certificates need Cloudflare.
- Data/ML workloads or an existing GCP estate → **GCP**, the second cloud with a live compute bring-up.
- An existing AWS or Azure estate, IRSA/managed-identity requirements → **AWS** / **Azure**, treating the first run as a bring-up exercise.
- Hardware you already own → **custom**.

## Two provisioning models

By default, every cloud provider builds a cluster from **raw compute + kubeadm** (Ubuntu instances, containerd, kube-proxy skipped, Cilium installed by the bootstrap). Managed Kubernetes is opt-in per provider:

```yaml
providers:
  aws:
    type: aws
    useManagedK8s: true      # EKS instead of EC2 + kubeadm
```

`useManagedK8s: true` selects EKS / AKS / GKE / DOKS / Civo k3s depending on the provider; `clusterMode: <service>` is the explicit spelling of the same switch, and `compute` is the default. Managed mode may need an extra CLI on your PATH (`aws` for `eks get-token`, `gke-gcloud-auth-plugin` for GKE) and, on AKS, ships `networkPlugin: none` so the bootstrap's Cilium is still the CNI.

## What every cloud shares, and what it does not

| Layer | Identical everywhere | The provider decides |
|---|---|---|
| Node preparation | containerd, pinned kubeadm stream, swap off, image pre-pull | which image and size |
| CNI | Cilium with `kubeProxyReplacement` | nothing |
| Cloud integration | one shared step runner, idempotent, named failures | which CCM chart and CSI driver |
| Storage | `adhar-local` default, `adhar-block` secondary | the CSI driver and its attach limit |
| Kubernetes version | precedence rules; new nodes copy the control plane | managed-mode version slugs |
| Autoscaling | one provider-agnostic controller | whether `NodeRemover` exists |
| Bootstrap and stack | everything | nothing |
| Teardown | in-cluster resources swept **before** the network | which resources exist |

## What every cloud needs from you

- **Credentials** — via environment variables or workload identity, never committed to `config.yaml`.
- **A delegated DNS zone** (recommended) — `globalSettings.defaultHost` must be a subdomain you delegate to the cloud's DNS. Skipping it is supported: the platform runs on a self-signed certificate and cert-manager issues a trusted one automatically once DNS is fixed.
- **Quota** — enough vCPU and instances for your node pool and `maxWorkers`. New cloud accounts often ship with low default quotas.

> **DNS caveat — the apex must resolve.** Let's Encrypt reads CAA up the tree, so issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone, orders fail with `SERVFAIL looking up CAA` — a message naming certificates for what is a delegation problem. Verify with `dig +short NS <host>` and `dig +noall +comment CAA <apex>` (an empty answer is correct; SERVFAIL is not).

## Storage

Every self-managed cloud installs two StorageClasses; the default is node-local:

| Class | Provisioner | Default | For |
|---|---|---|---|
| `adhar-local` | `rancher.io/local-path` | yes | Everything that doesn't ask otherwise |
| `adhar-block` | the cloud's CSI driver | — | Volumes that must outlive their node |

The reason is arithmetic. A block volume occupies one of the VM's data-disk attach slots, that budget is small at every size a platform cluster would sensibly use, and the enabled packages request roughly 90 claims. Sizing for attach slots meant buying vCPU nobody needed. A node-local volume is a directory: no attach limit, no per-claim cloud API call.

What it costs: a node-local volume **does not survive its node** and cannot be expanded in place. Durability is the data owner's job — CNPG replication plus backups into the object store — and a workload that genuinely needs a network block device names `adhar-block` explicitly.

## Shared commands

```bash
adhar up -f config.yaml --env dev --dry-run   # validate config; create nothing
adhar up -f config.yaml --env dev             # provision one environment
adhar get status                              # platform + package health
adhar cluster list --file config.yaml         # --file is REQUIRED
adhar cluster scale <cluster> --workers 8 -p <provider> -f config.yaml
adhar cluster upgrade <cluster> --version 1.37.2 -p <provider> -f config.yaml
adhar down -f config.yaml --env dev [--purge-orphaned-volumes]
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `adhar up` provisions clusters you did not ask for | `-f` with no `--env` provisions **every** environment in the file | Always pass `--env <name>`; keep only real environments in the file |
| `No clusters found` on a cloud you know has one | `adhar cluster list` without `--file` loads the default config and queries no provider | Pass `--file <config>` to `list`, `scale`, `upgrade`, `delete` |
| `adhar down` deletes nothing on a cloud environment | With no `--file` it only ever inspects Kind | Pass `--file` and `--env` |
| `cluster "…" not found in any configured provider` | The cluster is named after the **environment**, not `clusterConfig.name` | Use the environment name (`dev`) |
| `--dry-run` passed but the create failed on permissions | `--dry-run` validates config only | Read the preflight lines; they name the limit and the remedy |
| Control plane times out after adding a second cloud | Multiple upjet provider families ≈ 3000 CRDs | Keep one `primary: true` provider |

`KUBECONFIG` is written to `~/.adhar/clusters/<env>/kubeconfig` and merged into `~/.kube/config`.

## Next steps

- [Configuration](/docs/getting-started/configuration) — the full config schema and the four resolution layers
- [Local (Kind)](/docs/providers/local-kind) — run the platform with no credentials at all
- [DigitalOcean](/docs/providers/digitalocean) — the verified reference cloud path
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup when a provider misbehaves
