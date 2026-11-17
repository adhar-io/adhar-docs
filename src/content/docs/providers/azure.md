---
title: "Azure"
section: "Cloud Providers"
order: 6
path: "/docs/providers/azure"
---

# Azure

Take an Azure subscription to a working Adhar platform on Azure VMs. This page is for platform engineers on an Azure estate. You register resource providers, raise two vCPU quotas, pick a VM size you can launch, delegate an Azure DNS zone, create one service principal, write one config file and run `adhar up`. Then you learn how to check, scale, upgrade and tear the cluster down.

> **Status:** `status:in-progress` — the Azure provider is built and passes config validation and `adhar up --dry-run`, and it shares its kubeadm path with the other clouds, but it has not yet been proven end to end. Treat a first run as a bring-up exercise.

On Azure, `adhar up` checks more before it starts than on any other cloud: the resource group, the in-cluster credential, resource-provider registration, VM-size availability and both vCPU limits. If a check fails, nothing is created.

## At a glance

| | |
|---|---|
| **Provider key** | `azure` |
| **Status** | `status:in-progress` |
| **Default model** | Azure VMs + kubeadm (`clusterMode: compute`; Canonical Ubuntu 22.04 LTS by default, containerd, Cilium from the bootstrap) |
| **Other modes** | `managed` = AKS (BYO CNI) · `provided` = an existing cluster |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **Credentials** | A service principal (`clientId` / `tenantId` / `clientSecretFile`), which compute mode always needs; `az login` is used only when no complete principal is configured |
| **DNS / trusted TLS** | Azure DNS DNS-01 wildcard; needs `subscriptionId` + `dnsResourceGroup` |
| **Key quota** | Total Regional vCPUs **and** the VM family: 44 vCPU on each for the shipped config |
| **Default StorageClass** | `adhar-local` (node-local); `adhar-block` (StandardSSD) is installed but not default |
| **Best for** | Teams standardized on Azure |

## Topology

```diagram
npb-azure-topology
```

Everything the cluster owns lives in **one resource group**:

- a VNet and subnet
- one network security group
- for each node: a NIC, a public IP and a VM with a 256 GiB OS disk

The Standard load balancer in front of the Gateway is created later, by `cloud-provider-azure` inside the cluster. Because everything sits in one group, Azure teardown is the simplest of the clouds.

### One principal, two jobs

```diagram
npb-azure-credentials
```

**`az login` can create a cluster, but it cannot run one.** The in-cluster controllers (`cloud-provider-azure`, the Azure Disk CSI driver, external-dns and the cert-manager DNS-01 solver) cannot use your CLI session. Adhar builds their `azure.json` from the service-principal fields, so compute mode **requires** a principal. Without one, the preflight fails and names the `az ad sp create-for-rbac` command to run.

When `clientId`, `tenantId` and a client secret are all set, Adhar also provisions with that principal, before it tries `az login`. So the principal needs:

| Role | Scope | For |
|---|---|---|
| Contributor | The cluster's resource group | Creating VMs, NICs and disks; the cloud-controller-manager creating the load balancer and public IPs |
| DNS Zone Contributor | The DNS zone | external-dns and DNS-01. Already covered by Contributor when the zone is in the same resource group, as in the example |

A principal scoped to the zone alone is not enough. Provisioning fails, or the Gateway Service sits at `EXTERNAL-IP <pending>`, which looks like a networking fault.

**Managed identity is for AKS only.** In compute mode Adhar assigns no identity to the VMs it creates, so `useManagedIdentity: true` without a client secret fails the preflight.

## Prerequisites

| # | Prerequisite | Fails as |
|---|---|---|
| 1 | The resource group named in `config.resourceGroup` exists, and a service principal has Contributor on it | Preflight `✖ resource group` / `✖ cloud-provider credential` |
| 2 | `Microsoft.Compute`, `Microsoft.Network` and `Microsoft.Storage` are registered | `MissingSubscriptionRegistration`, naming a namespace rather than the VM |
| 3 | vCPU quota for the cluster at **full** size, on both meters | Preflight `✖` |
| 4 | A VM size this subscription may launch in this region | `409 SkuNotAvailable … Capacity Restrictions` |
| 5 | A delegated Azure DNS zone for `defaultHost` | Self-signed certificates; the platform still runs |

`adhar up` checks 1–4 itself and refuses to create anything if one fails. Adhar creates a resource group only when `resourceGroup` is unset; it then makes `<cluster>-rg`.

You also need `adhar`, `kubectl`, `dig` and the `az` CLI on your PATH. The platform stack is built into the binary, so `adhar up` works from any directory; there is no repository to clone. See [Installation](/docs/getting-started/installation) to install the CLI. Then sign in:

```bash
az login
az account set --subscription <subscription-id>
```

### Resource providers

A fresh subscription has these unregistered. Registration is idempotent.

```bash
az provider register --namespace Microsoft.Compute
az provider register --namespace Microsoft.Network
az provider register --namespace Microsoft.Storage
```

**Check:** each prints `Registered`.

```bash
for ns in Microsoft.Compute Microsoft.Network Microsoft.Storage; do
  az provider show -n $ns --query registrationState -o tsv
done
```

### vCPU quota

Azure meters vCPU twice: **Total Regional vCPUs** and a per-family quota. For the `Standard_E4bds_v5` the example uses, the family is `standardEBDSv5Family`. A create can fail on either, and a new subscription defaults to 4 total regional vCPUs.

```bash
az vm list-usage --location centralindia -o table
```

Size the request for the cluster's **maximum**. The shipped config runs one `Standard_E4bds_v5` control plane plus up to ten `Standard_E4bds_v5` workers: 4 + (10 × 4) = **44 vCPU** on both meters. A lower `maxWorkers` needs less.

> **Note:** Do not size the quota for the starting node count. The cluster boots, the catalogue needs more, the autoscaler asks, and the limit refuses.

### VM size

"Supported in this region" and "available to your subscription" are different questions. A size with a capacity restriction fails at the first VM with `409 SkuNotAvailable … Capacity Restrictions`.

```bash
az vm list-skus --location centralindia --size Standard_E4bds_v5 -o table
```

**Check:** the `Restrictions` column reads `None`.

### DNS zone and service principal

Create the resource group and the zone:

```bash
az group create --name adhar-rg --location centralindia
az network dns zone create --resource-group adhar-rg --name platform.example.com
az network dns zone show --resource-group adhar-rg --name platform.example.com \
  --query nameServers --output tsv
```

At your registrar, add four NS records named `platform` in the `example.com` zone, with those values. The apex stays where it is.

Create the platform's service principal with Contributor on that resource group, and keep its secret in a file only you can read:

```bash
az ad sp create-for-rbac --name adhar-platform --role Contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/adhar-rg
mkdir -p ~/.adhar && install -m 600 /dev/null ~/.adhar/azure-client-secret
$EDITOR ~/.adhar/azure-client-secret        # paste the "password" value
```

Note `appId` (your `clientId`) and `tenant` (your `tenantId`). If the DNS zone is in a different resource group, also grant the principal `DNS Zone Contributor` on the zone.

**Check:**

```bash
dig +short NS platform.example.com      # the nameservers from above
dig +short NS example.com               # your registrar's, unchanged
dig +noall +comment CAA example.com     # status: NOERROR — an empty answer is correct
```

> **Warning:** Delegate the subdomain, not the whole domain, unless you also host the apex zone in Azure DNS. Let's Encrypt reads CAA records up the tree, so issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone for it, the order fails with a message naming CAA, while every app still resolves.

You can skip DNS. The platform comes up self-signed, and cert-manager issues a trusted certificate once the delegation is fixed.

## Configure

Start from the shipped example, then change `defaultHost`, `email`, the IDs and the region:

```bash
cp examples/azure-config.yaml config.yaml
```

```yaml
apiVersion: v1alpha1
kind: Config

globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com       # your delegated Azure DNS zone
  defaultHttpPort: 80
  defaultHttpsPort: 443                   # a real load balancer fronts the cloud path
  enableHAMode: false                     # platform-level HA only; one control plane either way
  email: admin@example.com                # Let's Encrypt expiry notices
  dnsProvider: azure                      # Azure DNS for external-dns + DNS-01; `none` = self-signed

providers:
  azure:
    type: azure
    region: centralindia
    primary: true                         # only Azure's Crossplane providers install
    useAzureCLI: true                     # fallback only: the complete principal below wins
    clientId: <client-id>                 # the platform principal (provisioning + in-cluster)
    tenantId: <tenant-id>
    clientSecretFile: /home/you/.adhar/azure-client-secret   # full path; never the secret itself
    clusterMode: compute                  # VMs + kubeadm; `managed` = AKS; `provided` = existing
    config:
      subscriptionId: <subscription-id>
      dnsResourceGroup: adhar-rg          # the group holding the DNS zone
      resourceGroup: adhar-rg             # where the cluster lives (here: with its zone); must exist
      location: centralindia              # must equal `region`
      vmSize: Standard_E4bds_v5           # the control-plane size: 4 vCPU / 32 GiB
      diskType: Premium_LRS
      diskSizeGb: 256                     # every VM's OS disk
      vnetCidr: 10.30.0.0/16              # must not overlap the pod CIDR
      subnetCidr: 10.30.1.0/24

environmentTemplates:
  dev-defaults:
    clusterConfig:
      - { key: autoScale, value: "true" }
    coreServices:                         # may not be empty; recorded, otherwise inert
      cilium:
        chart: { repoURL: https://helm.cilium.io/, name: cilium, version: 1.15.7 }

environments:                             # dev, test and prod as namespaces on ONE cluster
  dev:
    isolation: namespace
    type: non-production
    provider: azure
    region: centralindia
    template: dev-defaults
    clusterConfig:
      - { key: name,        value: adhar-dev }
      - { key: machineType, value: Standard_E4bds_v5 }   # the worker size: 4 vCPU / 32 GiB
      - { key: nodeCount,   value: "2" }
      - { key: diskSizeGb,  value: "100" }               # recorded; VM disks follow config.diskSizeGb
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 10 }
  # test: identical to dev except name: adhar-test
  # prod: as dev, but name: adhar-prod, type: production, nodeCount: "5",
  #       autoscaling minWorkers: 3
```

### Key fields

| Field | Meaning |
|---|---|
| `config.vmSize` / `clusterConfig.machineType` | Two sizes, set independently: `config.vmSize` is the control plane, `clusterConfig.machineType` is the workers. |
| `config.diskSizeGb`, `config.diskType` | Azure reads disk settings from the provider `config:` block only. A `diskSizeGb` in an environment's `clusterConfig` is recorded but never reaches a disk. |
| `config:` keys | Matched ignoring case and separators. |
| `clusterMode` | `compute`, `managed` or `provided`. `clusterMode: aks` and `useManagedK8s: true` are **rejected** with a message naming `managed`. |
| `clientSecretFile` | Write a **full path**. A leading `~` is not expanded. |

The client secret resolves in this order, strongest first:

| # | Source | Note |
|---|---|---|
| 1 | `clientSecret` inline in the config | Avoid: the file gets committed |
| 2 | `clientSecretFile` in the config | **Preferred.** It outranks the environment on purpose |
| 3 | `AZURE_CLIENT_SECRET` | Ambient |
| 4 | `AZURE_CLIENT_SECRET_FILE` | Ambient fallback |

The file outranks the environment because a stale or shell-truncated `AZURE_CLIENT_SECRET` looks exactly like a correct one and fails with `AADSTS7000215` ("invalid client secret"). When both are present, Adhar uses the file and says so.

### Node sizing

| Node | Size | Why |
|---|---|---|
| Control plane | 4 vCPU / 32 GiB (`Standard_E4bds_v5`) | The platform's CRD count makes a smaller API server unstable: with 2 vCPU the controllers lose leader election. Several platform DaemonSets and `adhar-controller-manager` also run on the control plane. |
| Workers | 4 vCPU / 32 GiB (`Standard_E4bds_v5`), at least two | With one worker, evictions and drains have nowhere to go. The kubeadm path raises kubelet `maxPods` to 250 so pod count is not the first limit. |
| OS disk | 256 GiB Premium SSD | The containerd image cache and every node-local PersistentVolume share this disk. Too small, and the node takes a `disk-pressure:NoSchedule` taint. `StandardSSD_LRS` is cheaper, but its IOPS ceiling shows up as etcd latency. |

### Storage

The default StorageClass is `adhar-local`: directories under `/opt/adhar-local-path` on the node, with no attach limit.

Block volumes are the alternative, and Azure caps data disks per VM: **4 on a `Standard_E2bds_v5`, 8 on an `E4bds_v5`, 16 only from 8 vCPU up**. The enabled packages ask for roughly 90 PersistentVolumeClaims, far more than a small cluster has slots. Pods then stay `Pending` with CPU to spare:

```text
0/5 nodes are available: 1 node(s) had untolerated taint(s),
                         4 node(s) exceed max volume count.
```

A node-local volume does **not** survive losing its node. Durability comes from CNPG replication plus base backups into object storage. To use a block volume for one claim, set `storageClassName: adhar-block`.

### Dry run

```bash
adhar up -f config.yaml --env dev --dry-run
```

`--dry-run` resolves the configuration and prints the environment, provider, region, type and merged `clusterConfig`. It creates nothing and **checks no permissions, quota or DNS**. Use it to catch schema mistakes before the preflight.

## Deploy

```bash
adhar up -f config.yaml --env dev
```

```diagram
npb-azure-sequence
```

The preflight runs first. Any `✖` stops the run before the first create call. `--verbose` prints the passing checks too:

```text
preflight ● resource group adhar-rg: exists and is readable
preflight ● cloud-provider credential: service principal configured
preflight ● resource provider Microsoft.Compute: Registered
preflight ● resource provider Microsoft.Network: Registered
preflight ● resource provider Microsoft.Storage: Registered
preflight ● VM size Standard_E4bds_v5: available to this subscription in
            centralindia, 4 vCPU each
preflight ● vCPU quota (Total Regional vCPUs): limit 64, cluster needs 44
            at full size
```

The preflight compares the regional total. The family quota is checked at the start of the create, still before any resource exists.

Then the CLI draws the same checklist as on every cloud, with `Cloud cluster` reading `adhar · azure · centralindia`. After the first nodes join, compute mode installs:

- `cloud-provider-azure`, which reads `kube-system/azure-cloud-provider`, and `/etc/kubernetes/azure.json` on the control plane
- the Azure Disk CSI driver
- the `adhar-block` StorageClass
- `adhar-local` as the default StorageClass

The CLI finishes with a panel of platform URLs and warns if TLS is still self-signed. **The catalogue keeps converging after the CLI returns**, and the autoscaler adds workers while it does. `--apps-timeout` (default 15m) limits only how long the CLI waits; ArgoCD keeps going either way.

> **Note:** Without `--env`, `adhar up -f config.yaml` builds **one** cluster for every `isolation: namespace` environment, sized from the production-type environment (`prod`, which starts at 5 workers), and creates the `dev`, `test` and `prod` namespaces on it. Each `isolation: cluster` environment gets a cluster of its own.

## Verify

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig     # or: kubectl config use-context adhar
kubectl get nodes                                        # all Ready
kubectl -n adhar-system get svc | grep -i gateway        # EXTERNAL-IP is an address, not <pending>
kubectl get storageclass                                 # adhar-local (default), adhar-block
kubectl -n adhar-system get certificate adhar-cert       # READY True once DNS-01 completes
adhar get status                                       # platform + per-package health
```

`EXTERNAL-IP <pending>` here is a credential fault, not a network one: the principal cannot create load balancers. See [One principal, two jobs](#one-principal-two-jobs).

## Access

Log in at `https://console.<defaultHost>`. Get credentials with:

```bash
adhar get secrets              # all platform credentials
adhar get secrets -p argocd    # one package
```

Your username is your email address, not a short name. For SSO, kubeconfig access and group-to-role mapping, see [Accessing the Platform](/docs/operations/accessing-the-platform).

## Operate

Always pass `--file` to `adhar cluster` commands. The cluster is named `adhar` unless you passed `--name` to `adhar up`; `clusterConfig.name` is not the cluster name.

```bash
adhar cluster list --file config.yaml
```

### Scale

```bash
adhar cluster scale adhar --workers 4 -p azure -f config.yaml
```

With autoscaling on, the worker count moves between `minWorkers` and `maxWorkers` on its own. Raise `autoscaling.maxWorkers`, and both vCPU quotas with it, before you enable more of the catalogue.

After you resize a VM, the CSI driver keeps the old attach limit until that node's `csi-azuredisk-node` pod restarts.

### Upgrade

```bash
adhar upgrade --name dev --diff-only                                 # preview the stack diff
adhar upgrade --name dev --yes                                       # converge foundation + stack
adhar cluster upgrade adhar --version 1.37.2 -p azure -f config.yaml # Kubernetes itself
```

On a cloud cluster the `AdharPlatform` resource is named after the environment you provisioned (`dev` here). `adhar upgrade` looks for one named `adhar` unless you pass `--name`. Find the name with `kubectl -n adhar-system get adharplatform`.

### Managed AKS

```yaml
providers:
  azure:
    type: azure
    clusterMode: managed     # AKS instead of VMs + kubeadm
```

Managed mode creates the resource group (or uses the configured one), then:

- an AKS cluster with `networkPlugin: none`. This is BYO CNI, so the bootstrap installs Cilium as elsewhere
- a system-assigned identity
- one agent pool per node group. The first is the System pool. Names are squeezed to AKS's 12 lowercase alphanumerics

The kubeconfig is the cluster-admin credential AKS issues. Adhar requests no paid AKS tier, so the cluster uses AKS's default tier; check current AKS pricing before you rely on it.

### Tear down

```bash
adhar down -f config.yaml --env dev
adhar down -f config.yaml --env dev --purge-orphaned-volumes
```

`adhar down` shows what it will delete and asks you to type `yes` (skip with `--force`).

> **Warning:** `--env dev` removes the whole cluster. With `isolation: namespace`, `dev`, `test` and `prod` share the one cluster `adhar`, so tearing down any of them deletes all three. If you passed `--name` to `adhar up`, pass the same `--name` to `adhar down`.

| Case | Behaviour |
|---|---|
| The group carries `managedBy=adhar-platform` | The whole group is deleted |
| The group was **not** created by Adhar (as in the example, which reuses the DNS group) | The group stays; this cluster's VMs, NICs, load balancers, public IPs, disks, NSGs and VNet are deleted individually |
| No local state for the cluster | The tracker is rebuilt from Azure: VMs tagged `managedBy=adhar-platform` whose names start `<cluster>-master-` or `<cluster>-worker-` |
| `pvc-*` disks outside the group | Only with `--purge-orphaned-volumes`, and only in the cluster's own location |

An attached disk is never deleted, whatever flags you pass.

**Check** that nothing is still billing:

```bash
az resource list --resource-group adhar-rg -o table      # only the DNS zone should remain
az disk list --query "[?diskState=='Unattached'].name" -o tsv
```

### Cost

While the cluster runs you pay for:

- VM hours: `maxWorkers` is your spend ceiling as much as your quota ceiling
- the Standard load balancer `cloud-provider-azure` creates for the Gateway
- a public IP per node
- 256 GiB of Premium SSD per node, which costs more per GiB than StandardSSD

Node-local volumes add nothing beyond that OS disk.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `MissingSubscriptionRegistration` naming a namespace | A resource provider is unregistered | `az provider register --namespace <namespace>` |
| Preflight `✖` on vCPU | The quota is sized for the starting node count, or only one meter was raised | Raise both the regional total and the family quota to cover `maxWorkers` |
| `409 SkuNotAvailable … Capacity Restrictions` | The size is supported in the region but unavailable to this subscription | Choose from `az vm list-skus` entries with no restrictions |
| Preflight `✖ cloud-provider credential` | No service principal, or `useManagedIdentity` in compute mode | Set `clientId`, `tenantId` and `clientSecretFile` |
| Gateway Service stuck at `EXTERNAL-IP <pending>` | The principal cannot create load balancers (for example, it is scoped to the DNS zone only) | Grant it Contributor on the cluster's resource group |
| `AADSTS7000215` invalid client secret | A stale or truncated `AZURE_CLIENT_SECRET` | Use `clientSecretFile`; it outranks the environment |
| API server slow; controllers crashloop on lease renewal | A 2-vCPU control plane | Set `config.vmSize` to a 4-vCPU size (`Standard_E4bds_v5`) |
| Pods `Pending` with `exceed max volume count` while CPU is idle | The per-VM data-disk attach limit | Use `adhar-local`, add workers, or choose a larger size |
| After resizing a VM the attach limit does not change | The CSI driver caches it at startup | Delete that node's `csi-azuredisk-node` pod |
| Node tainted `disk-pressure` soon after boot | The OS disk is too small for the image cache plus node-local volumes | `config.diskSizeGb: 256` |
| Order fails with `SERVFAIL looking up CAA` | The apex is delegated to nameservers holding no zone | Delegate only the platform label |
| external-dns writes nothing | `subscriptionId` / `dnsResourceGroup` missing, or the principal has no access to the zone | Set both keys and grant DNS Zone Contributor on the zone |

## Next steps

- [Providers Overview](/docs/providers/overview) — the shared model, storage classes and the comparison table
- [Accessing the Platform](/docs/operations/accessing-the-platform) — SSO, kubeconfig and platform identity
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Troubleshooting](/docs/reference/troubleshooting) — autoscaler and volume failures
