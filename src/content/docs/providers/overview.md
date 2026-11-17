---
title: "Providers Overview"
section: "Cloud Providers"
order: 1
path: "/docs/providers/overview"
---

# Providers Overview

A **provider** is the only part of Adhar that knows which cloud you are on. This page explains how `adhar up` uses one, how to pick one, and what every provider shares: cluster modes, environments, storage, DNS and commands. Read it before any single provider page.

Everything above the cluster is identical on every target: Cilium, the Gateway, ArgoCD, Gitea, Crossplane and the package catalogue. To move the platform to another cloud, you change the `provider:` in `config.yaml`.

```diagram
npa-provider-boundary
```

## Choosing a provider

| Provider | Key | Shipped `clusterMode` | Managed option | Credentials | Trusted wildcard TLS | Status |
|---|---|---|---|---|---|---|
| [Local (Kind)](/docs/providers/local-kind) | `kind` | local containers | n/a | none | self-signed only | `status:complete` |
| [DigitalOcean](/docs/providers/digitalocean) | `digitalocean` | `compute` (droplets) | DOKS | `DIGITALOCEAN_ACCESS_TOKEN` | DNS-01 | `status:complete` |
| [Google Cloud](/docs/providers/gcp) | `gcp` | `compute` (GCE) | GKE | service-account key / ADC | DNS-01 (needs a key file) | `status:complete` |
| [AWS](/docs/providers/aws) | `aws` | `compute` (EC2) | EKS | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (static keys recommended), or the default AWS credential chain | DNS-01 (static keys) | `status:in-progress` |
| [Azure](/docs/providers/azure) | `azure` | `compute` (VMs) | AKS | a service principal (required in compute mode); `az login` as a fallback | DNS-01 | `status:in-progress` |
| [Civo](/docs/providers/civo) | `civo` | **`managed`** (k3s) | k3s | `CIVO_TOKEN` | DNS-01 via a webhook solver | `status:in-progress` |
| [Custom / on-prem](/docs/providers/custom) | `custom` | `compute` (your hosts) | n/a (`provided` adopts an existing cluster) | SSH key to your machines | via another `dnsProvider`, or your own certificate | `status:in-progress` |

`status:complete` means the provider runs the platform end to end: create, scale, upgrade and tear down. `status:in-progress` means the provider is implemented and passes config validation and `--dry-run`, but has not yet been run end to end. Treat a first deployment there as a bring-up exercise.

**Pick by what you are doing:**

- Learning, developing, demoing, CI → **Kind**. Free, and it needs no credentials.
- First cloud deployment → **DigitalOcean**.
- Data/ML workloads or an existing GCP estate → **GCP**.
- Low-cost, short-lived dev and staging clusters → **Civo**, in managed mode.
- An existing AWS or Azure estate → **AWS** / **Azure**.
- Hardware you already own → **custom**.
- A cluster someone else already built → any provider with `clusterMode: provided`.

## What a provider is

`platform/providers/interface.go` declares one Go `Provider` interface. Each of `kind/`, `aws/`, `azure/`, `gcp/`, `digitalocean/`, `civo/` and `custom/` implements it:

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

Two capabilities are **optional interfaces**:

- **`NodeRemover`** removes one *named* worker. The autoscaler needs it, because it picks which node to retire: the emptiest one that is safe to drain. `ScaleNodeGroup` only sets a desired count and removes the highest-indexed instance. A provider without `NodeRemover` does not support automatic scale-down.
- **`Preflighter`** replaces the generic pre-create checks with ones that understand the cloud's own quotas and errors. AWS and Azure implement it. GCP and Civo run their quota checks inside the create, before anything is made.

A provider that cannot do something returns a clear "not supported" error, not partial behaviour.

### Two provisioning paths

Both paths share the same credentials and the same config file.

| Path | Mechanism | Used for |
|---|---|---|
| **Imperative** | The Go `Provider` interface | Day-0 creation (`adhar up`, `adhar cluster create`) and day-2 ops (`scale`, `upgrade`, `delete`) |
| **Declarative** | Crossplane Compositions | GitOps-managed infrastructure (`Cluster`, `Database`, …) |

The imperative path gives you a management cluster. The declarative path lets that cluster manage everything else. See [Control Plane](/docs/core-concepts/control-plane).

## How `adhar up` uses a provider

```diagram
pv-provider-up-sequence
```

Two steps deserve attention:

- **Step 4, preflight.** `--dry-run` validates the *config* and nothing else; it passes on an account that cannot create a single resource. Preflight probes what gates a create: credentials, quota, and whether the region offers the instance type you asked for. If a check fails, the run stops **before** anything bills. A failing check prints `✖` with the remedy. Passing checks fold into the `Preflight ✓` line; pass `--verbose` to see them. Kind skips preflight: it has no account, quota or permission model.
- **Step 5, reuse-or-create.** `adhar up` is the command you re-run after a failure. If a cluster of that name exists, the run reuses it. Pass `--recreate` for a fresh one.

Every cloud run draws the same nine-stage checklist. The CLI runs the first three stages. The in-cluster `AdharPlatform` controller drives the rest:

```terminal
$ adhar up -f config.yaml --env dev

  Provisioning Adhar Platform
  ✓  Preflight
  ✓  Cloud cluster
  ✓  Kubeconfig & TLS
  ✓  Cilium & Gateway
  ✓  ArgoCD
  ✓  Gitea
  ✓  GitOps repos
  ✓  Crossplane
  ⠋  GitOps sync - platform stack  26/75 apps Synced + Healthy
```

`--apps-timeout` (default 15m) limits how long the CLI waits on the last stage. The catalogue keeps converging after the CLI returns; that is expected.

## Cluster modes

`clusterMode` on the provider block says where the cluster comes from. Every cloud uses the same three words:

```diagram
dp-cluster-modes
```

| Provider | `compute` | `managed` |
|---|---|---|
| `digitalocean` | Droplets + kubeadm | DOKS |
| `civo` | Instances + kubeadm (host-network Gateway, no CCM) | k3s — **the shipped default**, because Civo's CCM only works on its managed clusters |
| `aws` | EC2 + kubeadm | EKS (needs the `aws` CLI for `eks get-token`) |
| `azure` | VMs + kubeadm | AKS (BYO CNI; Cilium from the bootstrap) |
| `gcp` | GCE + kubeadm | GKE (needs `gke-gcloud-auth-plugin`) |
| `custom` | Your machines + kubeadm | not applicable |
| `kind` | Local containers | not applicable |

`compute` is the default, for three reasons:

- It pays no managed control-plane charge.
- It keeps the node under Adhar's control: kubelet flags, and the containerd trust that lets nodes pull images built in the in-cluster Harbor.
- It is the only mode where the node autoscaler can add a worker. The autoscaler provisions an instance and runs `kubeadm join` on it, which a managed node pool does not allow.

`provided` installs onto a cluster that already exists, through your kubeconfig. It requires:

- Kubernetes ≥ 1.28 with cluster-admin.
- Either Cilium with `gatewayAPI.enabled=true`, or no CNI at all. A cluster running another CNI is refused; Adhar does not replace its networking.

**`adhar down` on a provided cluster deletes nothing.**

> **Note:** The per-cloud spellings (`eks`, `aks`, `gke`, `doks`, `k3s`, `cluster_mode: k3s`) and the `useManagedK8s` boolean are **rejected** with a message naming the replacement. They are not mapped.

## Select a provider in config

You set the provider in two places, and they must agree:

```yaml
providers:
  digitalocean:
    type: digitalocean
    region: blr1
    primary: true          # only this cloud's Crossplane providers install
    useEnvironment: true   # read the token from the environment
    clusterMode: compute   # the default; `managed` or `provided`

environments:
  dev:
    provider: digitalocean # ← the selection
    type: non-production
    isolation: namespace   # the default — see below
```

Keep exactly one provider `primary: true`. Only the primary cloud's Crossplane packages install. Each extra provider family registers hundreds of CRDs (AWS, Azure and GCP together are roughly 3000), which is enough to push a single control-plane node into API-server timeouts.

## Environments

Every shipped config declares `dev`, `test` and `prod`. `isolation` decides what each one physically is:

| `isolation` | The environment is | Cost |
|---|---|---|
| `namespace` (default) | A namespace on **one** shared platform cluster | One cluster, one platform install |
| `cluster` | A cluster of its own, with its own platform | One cluster per environment |

- `adhar up -f config.yaml` (no `--env`) builds **one** cluster for all the namespace environments, sized from the production-type environment. Adhar then creates the `dev`, `test` and `prod` namespaces on it. Each `isolation: cluster` environment gets its own cluster.
- `adhar up -f config.yaml --env dev` provisions only the cluster that `dev` describes.
- Give `prod` `isolation: cluster` when it needs its own API server, etcd and blast radius.

**Cluster name.** The cluster is named **`adhar`** unless you pass `--name`. `clusterConfig.name` does not rename it. When a run builds several `isolation: cluster` environments, each one becomes `adhar-<env>`.

**Kubeconfig.** It is written to `~/.adhar/clusters/<cluster>/kubeconfig` and merged into `~/.kube/config` as context `adhar` (or `adhar-<cluster>`).

## What every cloud shares

| Layer | Identical everywhere | The provider decides |
|---|---|---|
| Node preparation | containerd, pinned kubeadm stream, swap off, Cilium images pre-pulled | which image and size |
| CNI | Cilium with `kubeProxyReplacement` | nothing (Civo managed: Civo installs it, Adhar leaves it) |
| Cloud integration | one shared step runner, idempotent, named failures | which CCM and CSI driver, if any |
| Storage | `adhar-local` default, `adhar-block` secondary | the CSI driver and its attach limit |
| Kubernetes version | `--kube-version` > `clusterConfig.kubeVersion` > v1.37.0; new nodes copy the control plane | managed-mode version slugs |
| Autoscaling | one provider-agnostic controller | whether `NodeRemover` exists |
| Bootstrap and stack | everything | nothing |
| Teardown | in-cluster resources swept **before** the network | which resources exist |

## What every cloud needs from you

- **Credentials.** Supply them through environment variables, a file path or workload identity. Never commit them to `config.yaml`.
- **A delegated DNS zone** (recommended). `globalSettings.defaultHost` must be a subdomain you delegate to the cloud's DNS. If you skip this, the platform runs on a self-signed certificate, and cert-manager issues a trusted one automatically once DNS is fixed.
- **Quota.** You need enough vCPU and instances for `maxWorkers`, not only the starting size. New cloud accounts often ship with low defaults (AWS 5 vCPU, Azure 4, GCP 12 project-wide).

> **Warning: the apex must resolve.** Let's Encrypt reads CAA records up the tree, so issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers that hold no zone, orders fail with `SERVFAIL looking up CAA`. Check with `dig +short NS <host>` and `dig +noall +comment CAA <apex>`. An empty answer is correct; SERVFAIL is not.

| `dnsProvider` | Zone service | Trusted wildcard (DNS-01) | What the in-cluster solver needs |
|---|---|---|---|
| `digitalocean` | DigitalOcean DNS | yes | the provider token |
| `aws` | Route 53 | yes | **static** access keys — an instance profile is not enough |
| `gcp` | Cloud DNS | yes | a service-account key file **and** `projectId` |
| `azure` | Azure DNS | yes | client id/secret/tenant, `subscriptionId`, `dnsResourceGroup` |
| `civo` | Civo DNS | yes, through a third-party webhook solver | the Civo token |
| `cloudflare` | Cloudflare | yes | `cloudflareApiToken` (or `CLOUDFLARE_API_TOKEN`) |
| `none` / omitted | — | no — self-signed | nothing |

## Storage

Every self-managed cloud installs two StorageClasses. The default is node-local:

| Class | Provisioner | Default | For |
|---|---|---|---|
| `adhar-local` | `rancher.io/local-path` | yes | Everything that doesn't ask otherwise |
| `adhar-block` | the cloud's CSI driver | — | Volumes that must outlive their node |

Node-local is the default because a block volume takes one of the VM's data-disk attach slots, and that budget is small at every sensible node size. The enabled packages request roughly 90 claims. A node-local volume is a directory: it has no attach limit and needs no cloud API call per claim.

The trade-off: a node-local volume **does not survive its node**, and it cannot be expanded in place. Durability is the data owner's job, through CNPG replication plus backups into the object store. A workload that needs a network block device names `adhar-block` explicitly. Civo in compute mode and the custom provider have no cloud CSI, so node-local is all there is.

## Shared commands

```bash
adhar up -f config.yaml --env dev --dry-run   # validate config; create nothing
adhar up -f config.yaml --env dev             # provision one environment's cluster
adhar get status                              # platform + package health
adhar cluster list --file config.yaml         # --file is REQUIRED
adhar cluster scale adhar --workers 8 -p <provider> -f config.yaml
adhar cluster upgrade adhar --version 1.37.2 -p <provider> -f config.yaml
adhar down -f config.yaml --env dev [--purge-orphaned-volumes]
```

> **Warning:** `adhar down --env dev` removes the cluster, not only the `dev` namespace. With the default `isolation: namespace`, `dev`, `test` and `prod` all live on the one cluster `adhar`, so tearing down any of them deletes all three. If you passed `--name` to `adhar up`, pass the same `--name` to `adhar down`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `useManagedK8s has been removed` / `clusterMode "eks" names a cloud service` | An old config spelling | `clusterMode: managed` (or `compute`) |
| `No clusters found` on a cloud you know has one | `adhar cluster list` without `--file` loads the default config and queries no provider | Pass `--file <config>` to `list`, `scale`, `upgrade`, `delete` |
| `adhar down` deletes nothing on a cloud environment | With no `--file` it only inspects Kind | Pass `--file` and `--env` |
| `down` prints `Nothing was deleted.` and names providers | The file does not define the provider that built the cluster | Use the file you ran `up` with |
| `cluster "adhar-dev" not found in any configured provider` | `clusterConfig.name` is not the cluster name | Use `adhar`, or the `--name` you gave `adhar up` |
| `adhar down --env dev` removed `test` and `prod` too | With `isolation: namespace` all three share one cluster, and `down` deletes the cluster | Give an environment `isolation: cluster` if it must be torn down on its own |
| `adhar up -f` with no `--env` builds more clusters than expected | Each `isolation: cluster` environment gets its own | Leave environments as `namespace` unless they need their own cluster |
| `--dry-run` passed but the create failed on permissions | `--dry-run` validates config only | Read the preflight `✖` line; it names the limit and the remedy |
| Create stops on quota after a clean preflight | Quota sized for `nodeCount`; the autoscaler needs `maxWorkers` | Size every quota for `maxWorkers` |
| Control plane times out after adding a second cloud | Several Crossplane provider families ≈ 3000 CRDs | Keep one `primary: true` provider |

## Next steps

- [Local (Kind)](/docs/providers/local-kind) — run the platform with no credentials
- [DigitalOcean](/docs/providers/digitalocean) — a first cloud deployment
- [Configuration](/docs/getting-started/configuration) — the full config schema and the four resolution layers
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup when a provider misbehaves
