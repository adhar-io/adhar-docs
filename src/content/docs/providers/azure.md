---
title: "Azure"
section: "Cloud Providers"
order: 6
path: "/docs/providers/azure"
---

# Azure

Run Adhar on Azure with VMs + kubeadm (default) or managed **AKS** (opt-in). Azure is the cloud where **`adhar up` refuses to start most often, and that is deliberate** — a preflight checks resource-provider registration, VM-size availability and *both* vCPU limits before anything is created, because each of those failures otherwise arrives after a resource group, a virtual network and some VMs already exist.

## At a glance

| | |
|---|---|
| **Provider key** | `azure` |
| **Default model** | Azure VMs + kubeadm (Ubuntu 24.04, containerd, Cilium from the bootstrap) |
| **Managed option** | AKS (`useManagedK8s: true` / `clusterMode: aks`; BYO CNI) |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **Credentials** | Managed identity (preferred), service principal, `az login`, or `AZURE_*` |
| **DNS / trusted TLS** | Azure DNS DNS-01 wildcard; needs `subscriptionId` + `dnsResourceGroup` |
| **Key quota** | Regional `cores` **and** the VM family (Azure meters vCPU twice) |
| **Default StorageClass** | `adhar-local` (node-local); `adhar-block` StandardSSD is not default |
| **Verification** | Render-verified; a live bring-up reached a working cluster with real Let's Encrypt TLS |
| **Best for** | Teams standardized on Azure |

## Two halves, two credentials

```diagram
pv-azure-ownership
```

**`az login` is enough to create the cluster and not enough to run it.** The in-cluster controllers cannot use your CLI session, so Adhar builds `azure.json` from the service-principal fields. Given a `clientId` with an empty `clientSecret` and no managed identity, `cloud-provider-azure` falls back to a default credential chain, finds no identity on a plain VM, and dies inside the Azure SDK without mentioning credentials — the visible symptom is a Gateway Service stuck at `EXTERNAL-IP <pending>`, which reads as a networking fault. Adhar refuses to write that config and names the remedy instead.

**Prefer `useManagedIdentity: true` over a client secret.** It sets `useManagedIdentityExtension` in `azure.json`, so no long-lived secret is written into the cluster and there is nothing to rotate. Where a service principal is unavoidable — notably the DNS credential — scope it to the **zone**, not the subscription, and pass the secret through the environment (`AZURE_CLIENT_SECRET`) rather than the config file.

## Prerequisites (in order)

| # | Prerequisite | Fails as |
|---|---|---|
| 1 | `Microsoft.Compute`, `Microsoft.Network`, `Microsoft.Storage` registered | `MissingSubscriptionRegistration`, naming a namespace rather than the VM |
| 2 | vCPU quota for the cluster at **full** size, on both meters | A create that stops partway, or a cluster that boots and then cannot autoscale |
| 3 | A VM size this subscription may actually launch in this region | `409 SkuNotAvailable … Capacity Restrictions`, after the network and NIC exist |
| 4 | A delegated Azure DNS zone for `defaultHost` | Self-signed certificates; the platform still runs |

`adhar up` checks 1–3 itself and refuses to create anything when one fails.

### 1. Register the resource providers

A fresh subscription has these unregistered. Registration is idempotent and takes a few minutes.

```bash
for ns in Microsoft.Compute Microsoft.Network Microsoft.Storage; do
  az provider show -n $ns --query registrationState -o tsv
done
az provider register --namespace Microsoft.Compute
az provider register --namespace Microsoft.Storage
```

### 2. Raise the vCPU quota, on both meters

Azure enforces **Total Regional vCPUs** *and* a per-family quota (`standardEBDSv5Family` for `Standard_E4bds_v5`, `standardDSv3Family` for `Standard_D8s_v3`), and a create can fail on either.

```bash
az vm list-usage --location centralindia -o table
```

**A new subscription defaults to 4 total regional vCPUs, in every region** — measured across eleven regions. Four vCPUs cannot host this platform. Size the request against the cluster's **maximum**, not its starting node count: the shipped `config.azure.yaml` is one `Standard_E2bds_v5` control plane plus up to four `Standard_E4bds_v5` workers, which is 2 + (4 × 4) = **18 vCPU** on both meters. An 8-vCPU-per-worker shape with six workers needs 56; ask for 64. Sizing to the floor is the subtle version of this mistake — the cluster boots, the catalogue needs more, the autoscaler asks, and a limit nobody checked refuses.

### 3. Pick a size the subscription can actually launch

"Supported in this region" and "available to you" are different questions. A live run chose `Standard_D4s_v3`, supported in its region with no capacity for that subscription; the create failed at the first VM with `409 SkuNotAvailable … Capacity Restrictions` after the network, NSG, public IP and NIC existed. Filter for entries with **no restrictions**:

```bash
az vm list-skus --location centralindia --size Standard_E4bds_v5 -o table
```

### 4. Delegate the DNS zone

```bash
az group create --name adhar-dns --location eastus
az network dns zone create --resource-group adhar-dns --name platform.example.com
az network dns zone show --resource-group adhar-dns --name platform.example.com \
  --query nameServers --output tsv
```

Add **four NS records named `platform`** in the `example.com` zone at your registrar. The apex stays where it is. Azure DNS then needs five configuration values — `clientId`, `tenantId`, `clientSecret`, `config.subscriptionId` and `config.dnsResourceGroup`, the last being the group holding the **zone**, which need not be the cluster's group. Create the principal scoped to the zone alone, then verify:

```bash
az ad sp create-for-rbac --name adhar-dns --role "DNS Zone Contributor" \
  --scopes /subscriptions/<sub>/resourceGroups/adhar-dns/providers/Microsoft.Network/dnszones/platform.example.com

dig +short NS platform.example.com      # the nameservers from above
dig +short NS example.com               # your registrar's, unchanged
dig +noall +comment CAA example.com     # status: NOERROR — an empty answer is correct
```

> **Do not delegate the whole registered domain here unless you also host its apex zone here.** Let's Encrypt reads CAA up the tree, so issuing `*.platform.example.com` also queries CAA for `example.com`; delegated to nameservers holding no zone, every lookup SERVFAILs and the order fails with a message naming CAA rather than delegation.

Skipping DNS is supported — the platform comes up self-signed and cert-manager issues a trusted certificate on its own once the delegation is fixed.

## Configuration

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: false
  email: admin@example.com
  dnsProvider: azure

providers:
  azure:
    type: azure
    region: centralindia
    primary: true
    useAzureCLI: true              # creates the cluster; see the note below
    # useManagedIdentity: true     # preferred where available
    clientId: "…"                  # for the in-cluster half (secret via AZURE_CLIENT_SECRET)
    tenantId: "…"
    config:
      subscriptionId: "…"
      resourceGroup: adhar-rg
      dnsResourceGroup: adhar-rg   # the group holding the DNS zone
      location: centralindia       # must equal `region`
      vmSize: Standard_E2bds_v5    # the CONTROL PLANE size, 2 vCPU / 16 GiB
      diskType: Premium_LRS
      diskSizeGb: 256
      vnetCidr: 10.30.0.0/16
      subnetCidr: 10.30.1.0/24

environmentTemplates:
  dev-defaults:
    clusterConfig:
      - key: autoScale
        value: "true"
    coreServices:
      cilium:
        chart:
          repoURL: https://helm.cilium.io/
          name: cilium
          version: 1.15.7

environments:
  dev:
    type: non-production
    provider: azure
    region: centralindia
    template: dev-defaults
    clusterConfig:
      - { key: name,        value: adhar-mgmt }
      - { key: machineType, value: Standard_E4bds_v5 }   # WORKER size, 4 vCPU / 32 GiB
      - { key: nodeCount,   value: "2" }
      - { key: diskSizeGb,  value: "256" }
    autoscaling:
      enabled: true
      minWorkers: 2
      maxWorkers: 4
```

Two sizes, set independently: **`config.vmSize` is the control plane; `clusterConfig.machineType` is the workers.** That separation is what makes a tight vCPU budget usable. `location` and the provider-level `region` mean the same thing; set both equal. `clusterConfig` keys match ignoring case and separators.

### Node sizing, from measurement

- **Control plane: 2 vCPU / 16 GiB.** It stays tainted `NoSchedule` and carries no workload, but etcd and the API server need the memory at this object count.
- **Workers: 4 vCPU / 32 GiB.** Two is the smallest shape that is really a cluster: one worker leaves evictions and drains nowhere to go and hits the kubelet's 110-pod ceiling before it runs out of CPU (measured here as "Too many pods" with 105 pods Pending on a single 4-vCPU worker). The kubeadm path raises `maxPods` to 250.
- **Disks: 256 GiB Premium SSD.** The containerd image cache alone measured 35 GiB; at 50 GiB the node crossed the kubelet disk-eviction threshold and took a `disk-pressure:NoSchedule` taint. Node-local PersistentVolumes share this disk. `StandardSSD_LRS` is cheaper but its IOPS ceiling shows up as etcd latency.

### Storage: why the default class is node-local

An Azure VM accepts a fixed number of attached data disks, scaling with size — **4 on a `Standard_E2bds_v5`, 8 on an `E4bds_v5`, 16 only from 8 vCPU up**. The enabled packages ask for roughly **90 PersistentVolumeClaims**, and one `adhar-block` volume costs one attach slot, so a 1 + 4 cluster of `E4bds_v5` workers offers 32 slots against ~90 claims. A live bring-up stalled at **39 of 75 apps** that way, with every worker at its attach ceiling while the unschedulable pods between them asked for 1.6 CPU cores. It reads exactly like a CPU shortage:

```text
0/5 nodes are available: 1 node(s) had untolerated taint(s),
                         4 node(s) exceed max volume count.
```

So the default StorageClass is `adhar-local`: node-local directories under `/opt/adhar-local-path`, with no attach limit and no quota to raise. A node-local volume does **not** survive losing its node — durability comes from the data owner (CNPG streaming replication plus barman base backups into object storage). `adhar-block` is still installed for workloads needing a network block device or online expansion; name it with `storageClassName: adhar-block`.

### Managed AKS

```yaml
providers:
  azure:
    type: azure
    useManagedK8s: true      # or clusterMode: aks
```

Creates the resource group (or uses the configured one), then an AKS cluster with `networkPlugin: none` — BYO CNI, so the platform bootstrap installs Cilium exactly as elsewhere — a system-assigned identity, and one agent pool per `nodeGroups` entry (the first is the System pool; names are squeezed to AKS's 12 lowercase alphanumerics). The kubeconfig is the cluster-admin credential AKS issues.

## A full run

```bash
az login                                     # if using useAzureCLI
export AZURE_CLIENT_SECRET='…'               # for the in-cluster DNS principal

./adhar up -f config.azure.yaml --env dev --dry-run   # config only, no spend
./adhar up -f config.azure.yaml --env dev
```

`--dry-run` resolves the configuration and prints the cluster shape; it checks no permissions, quota or DNS. The preflight inside `adhar up` is what proves the subscription can build this:

```text
preflight ● resource group adhar-rg: exists and is readable
preflight ● resource provider Microsoft.Compute: Registered
preflight ● resource provider Microsoft.Network: Registered
preflight ● resource provider Microsoft.Storage: Registered
preflight ● VM size Standard_E4bds_v5: available to this subscription in
            centralindia, 4 vCPU each
preflight ● vCPU quota: 20 vCPU available, 18 needed at full size
```

Any `✖` stops the run before the first create call — a subscription at the 4-vCPU default is caught in under a second. Then verify:

```bash
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
kubectl get nodes
./adhar get status
./adhar get secrets -p argocd
```

Always pass `--env`. Without it, `adhar up -f` provisions **every** environment in the file. The catalogue keeps converging for 30–45 minutes after the CLI returns while the autoscaler adds workers.

## Cost

Node hours dominate and `maxWorkers` is the spend ceiling as much as the quota ceiling. Beyond that: one Standard-SKU load balancer per `LoadBalancer` Service, created by the in-cluster cloud-controller-manager rather than the provider; a public IP per node; and 256 GiB of Premium SSD per node, which costs meaningfully more per GiB than StandardSSD. Node-local volumes add nothing beyond that OS disk, part of why they are the default. AKS adds its own control-plane pricing tier.

## Tear down

```bash
./adhar down -f config.azure.yaml --env dev
./adhar down -f config.azure.yaml --env dev --purge-orphaned-volumes
```

Azure makes this simpler than the other clouds: everything a cluster owns lives in one resource group.

| Case | Behaviour |
|---|---|
| The group carries `managedBy=adhar-platform` | The whole group is deleted |
| The group was **not** created by Adhar | The group stays; this cluster's VMs, NICs, load balancers, public IPs, disks, NSGs and VNet are deleted individually |
| No local state for the cluster | The tracker is rebuilt from Azure — VMs tagged `managedBy=adhar-platform` matching `<cluster>-master-N` / `-worker-N` — so a cluster created elsewhere is still deletable |
| `pvc-*` disks outside the group | Only with `--purge-orphaned-volumes`, and only in the cluster's own location |

An attached disk is never deleted, whatever flags are passed. If you pointed Adhar at a pre-existing group holding other resources, check it afterwards rather than assuming.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `MissingSubscriptionRegistration` naming a namespace | A resource provider is unregistered | `az provider register --namespace …` |
| Create stops partway on vCPU | Quota sized to the start, or only one meter raised | Raise both the regional total and the family quota to cover `maxWorkers` |
| `409 SkuNotAvailable … Capacity Restrictions` | The size is supported in the region but unavailable to this subscription | Choose from `az vm list-skus` entries with no restrictions |
| Gateway Service stuck at `EXTERNAL-IP <pending>` | `azure.json` has a `clientId` with an empty secret and no managed identity | Set `useManagedIdentity: true`, or supply `AZURE_CLIENT_SECRET` |
| Pods Pending with `exceed max volume count` while CPU is idle | Per-VM data-disk attach limit, not CPU | Use `adhar-local`, add workers, or move to a larger size |
| After resizing a VM the attach limit does not change | The CSI driver caches it at startup | Delete that node's `csi-azuredisk-node` pod |
| Node tainted `disk-pressure` soon after boot | OS disk too small for the image cache plus node-local volumes | Set `diskSizeGb: 256` |
| Order fails `SERVFAIL looking up CAA` | The apex is delegated to nameservers holding no zone | Delegate only the platform label |
| external-dns writes nothing | `subscriptionId`/`dnsResourceGroup` missing, or no DNS Zone Contributor on the zone | Set both keys and scope the role to the zone |

## See also

- [Providers Overview](/docs/providers/overview) — the shared model, storage classes and commands
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Production](/docs/operations/production) — hardening, HA and backups
- [Troubleshooting](/docs/reference/troubleshooting) — decoding autoscaler and volume failures
