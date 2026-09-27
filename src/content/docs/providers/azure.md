---
title: "Azure"
section: "Cloud Providers"
order: 6
path: "/docs/providers/azure"
---

# Azure

Run Adhar on Azure with VMs + kubeadm (default) or managed **AKS** (opt-in).

## At a glance

| | |
|---|---|
| **Provider key** | `azure` |
| **Default model** | Azure VMs + kubeadm |
| **Managed option** | AKS (`useManagedK8s: true` / `clusterMode: aks`; BYO CNI) |
| **Credentials** | `az login` or service principal (`AZURE_CLIENT_ID`/`SECRET`/`TENANT_ID`) |
| **DNS / trusted TLS** | Azure DNS + DNS-01 wildcard ✅ |
| **Key quota** | ≥ 56 regional vCPU (Azure meters cores **and** VM family) |
| **Verification** | ⚙️ Render-verified |
| **Best for** | Teams standardized on Azure |

## Prerequisites (in order)

1. **Resource providers registered:** `Microsoft.Compute`, `Microsoft.Network`, `Microsoft.Storage`.
2. **vCPU quota** at full cluster size — new subscriptions default to **4 total regional vCPUs**; the shipped config needs **56 vCPU** (ask for 64). Azure meters twice: regional `cores` **and** the VM family (e.g. `standardDSv3Family`).
3. A delegated **Azure DNS zone** for `defaultHost`.

`adhar up` runs a preflight for all three.

```bash
for ns in Microsoft.Compute Microsoft.Network Microsoft.Storage; do
  az provider show -n $ns --query registrationState -o tsv
done
az provider register --namespace Microsoft.Compute

az login
# or:
export AZURE_CLIENT_ID="…" AZURE_CLIENT_SECRET="…" AZURE_TENANT_ID="…"
```

## Configuration

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: true
  email: admin@example.com

providers:
  azure:
    type: azure
    region: eastus
    primary: true
    useAzureCLI: true
    # subscriptionId / tenantId / clientId / clientSecret for a service principal
    config:
      resource_group: adhar-platform
      location: eastus              # must equal `region`
      vnet_cidr: 10.5.0.0/16
      subnet_cidr: 10.5.1.0/24
      vm_size: Standard_D8s_v5      # 8 vCPU / 32 GiB
      disk_type: Premium_LRS

environmentTemplates:
  nonprod-defaults:
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
    template: nonprod-defaults
    clusterConfig:
      - { key: name,     value: adhar-mgmt }
      - { key: nodeSize, value: Standard_D8s_v5 }
      - { key: nodeCount, value: "3" }
    autoscaling:
      enabled: true
      minWorkers: 3
      maxWorkers: 10
```

For trusted DNS/TLS, Azure also needs `config.subscriptionId` and `config.dnsResourceGroup` (the RG holding the DNS zone), and the service principal needs **DNS Zone Contributor**.

### Managed AKS

```yaml
providers:
  azure:
    type: azure
    useManagedK8s: true      # or clusterMode: aks
```

AKS is created with `networkPlugin: none` (BYO CNI — Cilium comes from the bootstrap).

## Provision

```bash
az login                                    # if using useAzureCLI
./adhar up -f config.yaml --env dev --dry-run
./adhar up -f config.yaml --env dev
```

## Access

```bash
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
./adhar get status
```

## Tear down

```bash
./adhar down -f config.yaml --env dev
./adhar down -f config.yaml --env dev --purge-orphaned-volumes
```

If the resource group carries `managedBy=adhar-platform`, the whole group is deleted; otherwise this cluster's resources are deleted individually.

## Notes & gotchas

- `location` and provider `region` mean the same thing — set both equal.
- The default StorageClass is node-local (`adhar-local`). An Azure VM's **data-disk attach limit** (4 on `Standard_E2bds_v5`, 8 on `E4bds_v5`, 16 from 8 vCPU) reads exactly like a CPU shortage (`exceed max volume count`) but isn't — add workers or use larger VMs.
- After resizing a VM, delete its `csi-azuredisk-node` pod (the CSI limit is cached at startup).
