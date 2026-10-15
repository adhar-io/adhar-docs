---
title: "Providers Overview"
section: "Cloud Providers"
order: 1
path: "/docs/providers/overview"
---

# Providers Overview

This page explains what a provider is in Adhar, how `adhar up` uses one, and how to pick one. Read it before any single provider page: it covers the parts every cloud shares — cluster modes, environments, storage, DNS, commands — so the provider pages can stick to what is specific. At the end you will know which provider fits your situation, how far each one is proven, and how long each takes to a usable platform where that has actually been measured.

A **provider is the only part of Adhar that knows what cloud you are on.** Everything above the cluster — Cilium, the Gateway, ArgoCD, Gitea, Crossplane and the whole package catalogue — is byte-identical whether the cluster is a Kind node on your laptop or ten droplets in Bangalore. The provider exists so that the platform never has to care. Without it, "run the platform on Azure" would mean a second platform. With it, you change one word in `config.yaml`.

> One `adhar up` brings up the whole platform — on your laptop or on any supported cloud. Locally that takes about ten minutes; on a cloud, the provider's machine provisioning sets the pace (DigitalOcean serves in ~5 min and is usable at ~13; AWS first runs take 25–40).

## Choosing a provider

| Provider | Key | Shipped `clusterMode` | Managed option | Credentials | Trusted wildcard TLS | Verification | Measured time to usable |
|---|---|---|---|---|---|---|---|
| [Local (Kind)](/docs/providers/local-kind) | `kind` | local containers | n/a | none | self-signed only | Exercised continuously by CI | **~10 min** (warm image cache) |
| [DigitalOcean](/docs/providers/digitalocean) | `digitalocean` | `compute` (droplets) | DOKS | `DIGITALOCEAN_ACCESS_TOKEN` | DNS-01 | Live-verified end to end | **~5 min serving, ~13 min usable** |
| [Google Cloud](/docs/providers/gcp) | `gcp` | `compute` (GCE) | GKE | service-account key / ADC | DNS-01 (needs a key file) | Live-verified (compute path) | Unmeasured |
| [AWS](/docs/providers/aws) | `aws` | `compute` (EC2) | EKS | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, profile, role, instance profile | DNS-01 (static keys) | Render-verified | Unmeasured — 25–40 min first-run estimate |
| [Azure](/docs/providers/azure) | `azure` | `compute` (VMs) | AKS | `az login` + a service principal or managed identity | DNS-01 | Render-verified; a partial live bring-up reached working TLS | Unmeasured |
| [Civo](/docs/providers/civo) | `civo` | **`managed`** (k3s) | k3s | `CIVO_TOKEN` | DNS-01 via a webhook solver | Render-verified | Unmeasured |
| [Custom / on-prem](/docs/providers/custom) | `custom` | `compute` (your hosts) | n/a (`provided` adopts an existing cluster) | SSH key to your machines | via another `dnsProvider`, or your own certificate | Render-verified | Unmeasured |

"Usable" means the CLI has handed over with the console serving; the rest of the catalogue keeps converging for another 30–45 minutes on every cloud, which is expected. "Render-verified" means provider registration, config validation and `--dry-run` pass and the code paths are unit-tested, but no complete run on that cloud has been recorded.

**Pick by what you are doing:**

- Learning, developing, demoing, CI → **Kind**. Free, no credentials, about ten minutes.
- First cloud deployment, or anything you want to match a known-good run → **DigitalOcean**. It is the reference path; every cloud timing in these docs came off it.
- Data/ML workloads or an existing GCP estate → **GCP**, the second cloud with a live compute bring-up.
- Cheap, fast, short-lived dev/staging clusters → **Civo**, in managed mode.
- An existing AWS or Azure estate → **AWS** / **Azure**, treating the first run as a bring-up exercise.
- Hardware you already own → **custom**. A cluster someone else already built → any provider with `clusterMode: provided`.

## At a glance

| | |
|---|---|
| **What it is** | A Go interface (`platform/providers/interface.go`) every cloud implements |
| **How you pick one** | `provider:` on an environment, plus a matching `providers:` block |
| **Two paths** | Imperative (CLI, day-0/day-2) and declarative (Crossplane, continuous) |
| **Three cluster modes** | `compute` (default), `managed`, `provided` — the same three words everywhere |
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

- **`NodeRemover`** — removes one *named* worker. The autoscaler needs it because it picks which node to retire (the emptiest one that is safe to drain), and `ScaleNodeGroup` is a desired-count API that removes the highest-indexed instance. A provider without it does not support automatic scale-down.
- **`Preflighter`** — replaces the generic pre-create checks with ones that understand the cloud's own quotas and error vocabulary. AWS and Azure implement it; GCP and Civo run their own quota checks inside the create, before anything is made.

> A provider that cannot do something returns a clear "not supported" error, not partial behaviour.

## Two provisioning paths

Both share the same credentials and the same config file.

| Path | Mechanism | Used for |
|---|---|---|
| **Imperative** | The Go `Provider` interface | Day-0 creation (`adhar up`, `adhar cluster create`) and day-2 ops (`scale`, `upgrade`, `delete`) |
| **Declarative** | Crossplane Compositions | GitOps-managed infrastructure (`Cluster`, `Database`, …) |

The imperative path gets you a management cluster. The declarative path lets that cluster manage everything else. See [Control Plane](/docs/core-concepts/control-plane).

## How `adhar up` flows through a provider

```diagram
pv-provider-up-sequence
```

Step 4 is the one worth internalising. `--dry-run` validates the *config* and nothing else, so it passes cleanly on an account that cannot create a single resource. Preflight probes the calls that actually gate a create — reads and dry-run writes, quota, and whether the region really offers the instance type you asked for — and refuses **before** anything bills. A failing check prints `✖` with the remedy; passing checks are folded into the `Preflight ✓` line and shown in full with `--verbose`. Kind is exempt: no account, no quota, no permission model.

Step 5 exists because `adhar up` is the command you re-run after a failure. Without it, every re-run asked the cloud for a whole new cluster beside the half-built one, which on a quota-limited account fails with a message blaming your own previous attempt.

On screen, every cloud run draws the same nine-stage checklist. The first three stages are the CLI's; the rest are driven by the in-cluster `AdharPlatform` controller and are identical on every provider:

```terminal
$ adhar up -f config.yaml --env dev

Provisioning Adhar Platform

  ✓ Preflight                      credentials, quota and API access
  ✓ Cloud cluster                  adhar · digitalocean · blr1
  ✓ Kubeconfig & TLS               context adhar
  ✓ Cilium & Gateway               eBPF data path
  ✓ ArgoCD                         GitOps engine
  ✓ Gitea                          in-cluster Git server
  ✓ GitOps repos                   packages, environments
  ✓ Crossplane                     control plane + providers
  ◌ GitOps sync - platform stack   platform apps via ArgoCD
```

## Three cluster modes

`clusterMode` on the provider block says where the cluster comes from. The same three words on every cloud, with the service implied by the provider:

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

`compute` is the default on purpose: it pays no managed control-plane charge, keeps the node under Adhar's control (kubelet flags, the containerd trust that lets nodes pull images built in the in-cluster Harbor), and is the only mode where the node autoscaler can add a worker — it provisions an instance and `kubeadm join`s it, which a managed node pool does not allow.

`provided` installs onto a cluster that already exists, through your kubeconfig. It requires Kubernetes ≥ 1.28 with cluster-admin, and either Cilium with `gatewayAPI.enabled=true` or no CNI at all — a cluster running another CNI is refused rather than having its networking replaced. **`adhar down` on a provided cluster deletes nothing.**

> The per-cloud spellings (`eks`, `aks`, `gke`, `doks`, `k3s`, `cluster_mode: k3s`) and the `useManagedK8s` boolean were removed and are now **rejected** with a message naming the replacement. Mapping them silently would have built a kubeadm cluster for someone who asked for GKE, discovered only on the bill.

## Selecting a provider in config

Two places, and they must agree:

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

`primary: true` matters more than it looks. Each extra upjet provider family registers hundreds of CRDs — AWS, Azure and GCP together are roughly 3000 — and a single control-plane node went into API-server timeouts under all of them. Only the primary cloud's Crossplane packages install.

## Environments are namespaces by default

Every shipped config declares `dev`, `test` and `prod`. `isolation` decides what each one physically is:

| `isolation` | The environment is | Cost |
|---|---|---|
| `namespace` (default) | A namespace on **one** shared platform cluster | One cluster, one platform install |
| `cluster` | A cluster of its own, with its own platform | One cluster per environment |

So `adhar up -f config.yaml` with no `--env` builds **one** cluster for all the namespace environments, sized from the production-type one, and creates the `dev`, `test` and `prod` namespaces on it. Three clusters used to mean three installs and three bills, and on a default GCP quota did not even fit. Give `prod` `isolation: cluster` when it needs its own API server, etcd and blast radius. `adhar up -f config.yaml --env dev` provisions just the cluster that `dev` describes.

The cluster itself is named **`adhar`** unless you pass `--name`; `clusterConfig.name` does not rename it. When a run builds several `isolation: cluster` environments, each becomes `adhar-<env>`. The kubeconfig is written to `~/.adhar/clusters/<cluster>/kubeconfig` and merged into `~/.kube/config` as context `adhar` (or `adhar-<cluster>`).

## What every cloud shares, and what it does not

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

- **Credentials** — via environment variables, a file path or workload identity, never committed to `config.yaml`.
- **A delegated DNS zone** (recommended) — `globalSettings.defaultHost` must be a subdomain you delegate to the cloud's DNS. Skipping it is supported: the platform runs on a self-signed certificate and cert-manager issues a trusted one automatically once DNS is fixed.
- **Quota** — enough vCPU and instances for `maxWorkers`, not just the starting size. New cloud accounts often ship with low defaults (AWS 5 vCPU, Azure 4, GCP 12 project-wide).

> **DNS caveat — the apex must resolve.** Let's Encrypt reads CAA up the tree, so issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone, orders fail with `SERVFAIL looking up CAA` — a message naming certificates for what is a delegation problem. Verify with `dig +short NS <host>` and `dig +noall +comment CAA <apex>` (an empty answer is correct; SERVFAIL is not).

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

Every self-managed cloud installs two StorageClasses; the default is node-local:

| Class | Provisioner | Default | For |
|---|---|---|---|
| `adhar-local` | `rancher.io/local-path` | yes | Everything that doesn't ask otherwise |
| `adhar-block` | the cloud's CSI driver | — | Volumes that must outlive their node |

The reason is arithmetic. A block volume occupies one of the VM's data-disk attach slots, that budget is small at every size a platform cluster would sensibly use, and the enabled packages request roughly 90 claims. Sizing for attach slots meant buying vCPU nobody needed. A node-local volume is a directory: no attach limit, no per-claim cloud API call.

What it costs: a node-local volume **does not survive its node** and cannot be expanded in place. Durability is the data owner's job — CNPG replication plus backups into the object store — and a workload that genuinely needs a network block device names `adhar-block` explicitly. Civo in compute mode and the custom provider have no cloud CSI, so node-local is all there is.

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

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `useManagedK8s has been removed` / `clusterMode "eks" names a cloud service` | An old config spelling | `clusterMode: managed` (or `compute`) |
| `No clusters found` on a cloud you know has one | `adhar cluster list` without `--file` loads the default config and queries no provider | Pass `--file <config>` to `list`, `scale`, `upgrade`, `delete` |
| `adhar down` deletes nothing on a cloud environment | With no `--file` it only ever inspects Kind | Pass `--file` and `--env` |
| `down` prints `Nothing was deleted.` and names providers | The file does not define the provider that built the cluster | Use the file you ran `up` with |
| `cluster "adhar-dev" not found in any configured provider` | `clusterConfig.name` is not the cluster name | Use `adhar`, or the `--name` you gave `adhar up` |
| `adhar up -f` with no `--env` builds more clusters than expected | Each `isolation: cluster` environment gets its own | Leave environments as `namespace` unless they need their own cluster |
| `--dry-run` passed but the create failed on permissions | `--dry-run` validates config only | Read the preflight `✖` line; it names the limit and the remedy |
| Create stops on quota after a clean preflight | Quota sized for `nodeCount`, autoscaler needs `maxWorkers` | Size every quota for `maxWorkers` |
| Control plane times out after adding a second cloud | Multiple upjet provider families ≈ 3000 CRDs | Keep one `primary: true` provider |

## Next steps

- [Configuration](/docs/getting-started/configuration) — the full config schema and the four resolution layers
- [Local (Kind)](/docs/providers/local-kind) — run the platform with no credentials at all
- [DigitalOcean](/docs/providers/digitalocean) — the verified reference cloud path
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup when a provider misbehaves
