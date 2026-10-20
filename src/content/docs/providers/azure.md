---
title: "Azure"
section: "Cloud Providers"
order: 6
path: "/docs/providers/azure"
---

# Azure

This page takes you from an Azure subscription to a working Adhar platform on Azure VMs. It covers resource providers, both vCPU quotas, a VM size you can actually launch, Azure DNS, a complete config file, `adhar up`, verification and teardown. It is for platform engineers on an Azure estate.

Azure is the cloud where **`adhar up` refuses to start most often, and that is deliberate**. Before anything is created, a preflight checks resource-provider registration, VM-size availability and *both* vCPU limits. Without it, each of those failures would arrive after a resource group, a virtual network and some VMs already exist.

> **Status: render-verified, not live-verified.** Provider registration, config validation and `--dry-run` pass. The kubeadm path is shared with the live-verified DigitalOcean provider. A live bring-up on Azure reached a working cluster with real Let's Encrypt TLS, a CCM load balancer and CSI provisioning. It then stalled on data-disk attach slots, which is why the default StorageClass is now node-local. **No full run has completed and time to a usable platform is unmeasured.**

## At a glance

| | |
|---|---|
| **Provider key** | `azure` |
| **Default model** | Azure VMs + kubeadm (`clusterMode: compute`; Ubuntu 24.04, containerd, Cilium from the bootstrap) |
| **Other modes** | `managed` = AKS (BYO CNI) · `provided` = an existing cluster |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **Credentials** | `az login`, managed identity, or a service principal; the in-cluster half always needs a principal or managed identity |
| **DNS / trusted TLS** | Azure DNS DNS-01 wildcard; needs `subscriptionId` + `dnsResourceGroup` |
| **Key quota** | Regional `cores` **and** the VM family (Azure meters vCPU twice) — 24 vCPU on each for the shipped config |
| **Default StorageClass** | `adhar-local` (node-local); `adhar-block` StandardSSD is not default |
| **Verification** | Render-verified; a live bring-up reached a working cluster with real Let's Encrypt TLS |
| **Time to usable** | Unmeasured |
| **Best for** | Teams standardized on Azure |

## What gets built

```diagram
dp-azure-topology
```

Everything the cluster owns lives in **one resource group**:

- a VNet and subnet
- one network security group
- for each node: a NIC, a public IP and a VM with a 256 GiB OS disk

The Standard load balancer in front of the Gateway comes later. `cloud-provider-azure`, running inside the cluster, creates it. Because everything sits in one group, Azure teardown is the simplest of the clouds.

## Two halves, two credentials

```diagram
pv-azure-ownership
```

**`az login` is enough to create the cluster, but not enough to run it.** The in-cluster controllers cannot use your CLI session. So Adhar builds `azure.json` from the service-principal fields.

Suppose you give a `clientId` with an empty secret and no managed identity. `cloud-provider-azure` falls back to a default credential chain and finds no identity on a plain VM. It then dies inside the Azure SDK without mentioning credentials. The visible symptom is a Gateway Service stuck at `EXTERNAL-IP <pending>`, which looks like a networking fault. Adhar refuses to write that config and names the remedy instead.

**Prefer `useManagedIdentity: true` over a client secret** where it fits. It sets `useManagedIdentityExtension` in `azure.json`, so no long-lived secret is written into the cluster. Sometimes a service principal is unavoidable, notably for the DNS credential. Then scope it to the **zone**, not the subscription.

## Step 1 — Prerequisites, in order

| # | Prerequisite | Fails as |
|---|---|---|
| 1 | `Microsoft.Compute`, `Microsoft.Network`, `Microsoft.Storage` registered | `MissingSubscriptionRegistration`, naming a namespace rather than the VM |
| 2 | vCPU quota for the cluster at **full** size, on both meters | Preflight `✖`; without it, a create that stops partway |
| 3 | A VM size this subscription may launch in this region | `409 SkuNotAvailable … Capacity Restrictions`, after the network and NIC exist |
| 4 | A delegated Azure DNS zone for `defaultHost` | Self-signed certificates; the platform still runs |

`adhar up` checks 1–3 itself. If one fails, it refuses to create anything. Locally you need `adhar` (`make build`), `kubectl`, `dig` and the `az` CLI.

### 1. Register the resource providers

A fresh subscription has these unregistered. On the subscription the example was built against, both `Microsoft.Compute` and `Microsoft.Storage` were unregistered. Registration is idempotent and takes a few minutes.

```bash
for ns in Microsoft.Compute Microsoft.Network Microsoft.Storage; do
  az provider show -n $ns --query registrationState -o tsv     # want: Registered
done
az provider register --namespace Microsoft.Compute
az provider register --namespace Microsoft.Storage
```

### 2. Raise the vCPU quota, on both meters

Azure enforces **Total Regional vCPUs** *and* a per-family quota. For the `Standard_E4bds_v5` the example uses, the family is `standardEBDSv5Family`. A create can fail on either.

```bash
az vm list-usage --location centralindia -o table
```

**A new subscription defaults to 4 total regional vCPUs, in every region.** This was measured across eleven regions. Four cannot host this platform.

Size the request against the cluster's **maximum**. The shipped config is one `Standard_E4bds_v5` control plane plus up to five `Standard_E4bds_v5` workers: 4 + (5 × 4) = **24 vCPU** on both meters. Ask for more if you will raise `maxWorkers`. Measured on GCP, the full catalogue was stable at ~48 vCPU of workers.

Sizing to the floor is the subtle version of this mistake. The cluster boots, the catalogue needs more, the autoscaler asks, and a limit nobody checked refuses.

### 3. Pick a size the subscription can launch

"Supported in this region" and "available to you" are different questions. A live run chose `Standard_D4s_v3`. It was supported in its region, but had no capacity for that subscription. The create failed at the first VM with `409 SkuNotAvailable … Capacity Restrictions`, after the network, NSG, public IP and NIC already existed. **Verify** by filtering for entries with **no restrictions**:

```bash
az vm list-skus --location centralindia --size Standard_E4bds_v5 -o table   # Restrictions: None
```

### 4. Delegate the DNS zone

```bash
az group create --name adhar-rg --location centralindia
az network dns zone create --resource-group adhar-rg --name platform.example.com
az network dns zone show --resource-group adhar-rg --name platform.example.com \
  --query nameServers --output tsv
```

At your registrar, add **four NS records named `platform`** in the `example.com` zone. The apex stays where it is. Then create the in-cluster DNS principal, scoped to the zone alone, and keep its secret in a file:

```bash
az ad sp create-for-rbac --name adhar-dns --role "DNS Zone Contributor" \
  --scopes /subscriptions/<sub>/resourceGroups/adhar-rg/providers/Microsoft.Network/dnszones/platform.example.com
# copy "password" from the output into a file only you can read:
install -m 600 /dev/null ~/.adhar/azure-client-secret && $EDITOR ~/.adhar/azure-client-secret
```

**Verify:**

```bash
dig +short NS platform.example.com      # the nameservers from above
dig +short NS example.com               # your registrar's, unchanged
dig +noall +comment CAA example.com     # status: NOERROR — an empty answer is correct
```

> **Do not delegate the whole registered domain here unless you also host its apex zone here.** Let's Encrypt reads CAA records up the tree. So issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers that hold no zone, every lookup SERVFAILs. The order then fails with a message that names CAA, not delegation. You can skip DNS. The platform comes up self-signed, and cert-manager issues a trusted certificate once the delegation is fixed.

## Step 2 — Credentials

The shipped example provisions with your `az login` session. It gives the in-cluster half a service principal:

```bash
az login
az account set --subscription <subscription-id>
```

The client secret resolves in this order, strongest first:

| # | Source | Note |
|---|---|---|
| 1 | `clientSecret` inline in the config | Avoid — the file gets committed |
| 2 | `clientSecretFile` in the config | **Preferred.** Beats the environment on purpose |
| 3 | `AZURE_CLIENT_SECRET` | Ambient |
| 4 | `AZURE_CLIENT_SECRET_FILE` | Ambient fallback |

Why does the file outrank the environment? A stale `export AZURE_CLIENT_SECRET=…` from another terminal looks exactly like a correct one; both are about 40 characters. Also, double quotes let the shell expand an unescaped `$` and truncate the value. A live run failed with `AADSTS7000215` ("invalid client secret") for exactly that reason. When both are present, Adhar uses the file and says so.

## Step 3 — Write the configuration

```bash
cp examples/azure-config.yaml config.yaml    # change defaultHost, email, ids, region
```

The shipped file, annotated:

```yaml
apiVersion: v1alpha1
kind: Config

globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com       # YOUR delegated Azure DNS zone
  defaultHttpPort: 80
  defaultHttpsPort: 443                   # a real LB fronts the cloud path
  enableHAMode: false                     # platform-level HA only; one control plane either way
  email: admin@example.com                # Let's Encrypt expiry notices
  dnsProvider: azure                      # Azure DNS for external-dns + DNS-01; `none` = self-signed

providers:
  azure:
    type: azure
    region: centralindia
    primary: true                         # only Azure's Crossplane providers install
    useAzureCLI: true                     # provisioning uses `az login`
    # useManagedIdentity: true            # when adhar runs on an Azure VM
    clientId: 00000000-0000-0000-0000-000000000000    # the DNS / in-cluster principal
    tenantId: 11111111-1111-1111-1111-111111111111
    clientSecretFile: /path/to/azure-client-secret      # never the secret itself
    clusterMode: compute                  # VMs + kubeadm; `managed` = AKS; `provided` = existing
    config:
      subscriptionId: 22222222-2222-2222-2222-222222222222
      dnsResourceGroup: adhar-rg          # the group holding the DNS ZONE
      resourceGroup: adhar-rg             # where the cluster lives (here: with its zone)
      location: centralindia              # must equal `region`
      vmSize: Standard_E4bds_v5           # the CONTROL PLANE size: 4 vCPU / 32 GiB
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

environments:                             # dev, test, prod as namespaces on ONE cluster
  dev:
    isolation: namespace
    type: non-production
    provider: azure
    region: centralindia
    template: dev-defaults
    clusterConfig:
      - { key: name,        value: adhar-dev }
      - { key: machineType, value: Standard_E4bds_v5 }   # the WORKER size, 4 vCPU / 32 GiB
      - { key: nodeCount,   value: "2" }
      - { key: diskSizeGb,  value: "100" }               # recorded; VM disks follow config.diskSizeGb
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 5 }
  # test: identical to dev except name: adhar-test
  # prod: identical to dev except name: adhar-prod and type: production
```

You set two sizes independently: **`config.vmSize` is the control plane; `clusterConfig.machineType` is the workers.**

Provider `config:` keys are matched ignoring case and separators. They used to be matched literally, and five of seven settings on a real config were silently dropped. `clusterMode: aks` and `useManagedK8s: true` are rejected with a message naming `managed`.

### Node sizing, from measurement

- **Control plane: 4 vCPU / 32 GiB.** This was raised from 2 vCPU on 2026-10-11, after a 2-vCPU control plane collapsed under the platform's own footprint. `kube-apiserver` alone used 1383m of 2000m, with 5.2 GiB resident. A `kubectl get crd` over the platform's 616 CRDs took 33.8 seconds. Controller-manager, scheduler and CCM crashlooped on lease renewal. The `NoSchedule` taint is real, but nine pods tolerate it and belong there: Cilium, cilium-envoy, the operator, Falco, Tetragon, node-exporter, the Harbor trust DaemonSet, the OIDC loopback proxy and `adhar-controller-manager`.
- **Workers: 4 vCPU / 32 GiB, at least two.** With one worker, evictions and drains have nowhere to go. It also hits the kubelet's 110-pod ceiling before CPU runs out. This was measured as "Too many pods", with 105 pods Pending on one 4-vCPU worker. The kubeadm path raises `maxPods` to 250.
- **Disks: 256 GiB Premium SSD.** The containerd image cache alone measured 35 GiB. At 50 GiB, the node crossed the kubelet's eviction threshold and took a `disk-pressure:NoSchedule` taint. Node-local PersistentVolumes share this disk. `StandardSSD_LRS` is cheaper, but its IOPS ceiling shows up as etcd latency.

### Why the default StorageClass is node-local

An Azure VM accepts a fixed number of attached data disks: **4 on a `Standard_E2bds_v5`, 8 on an `E4bds_v5`, 16 only from 8 vCPU up**. The enabled packages ask for roughly **90 PersistentVolumeClaims**. A 1 + 4 cluster of `E4bds_v5` workers offers only 32 slots. A live bring-up stalled at **39 of 75 apps** this way. Every worker was at its ceiling, while the unschedulable pods between them asked for only 1.6 CPU cores:

```text
0/5 nodes are available: 1 node(s) had untolerated taint(s),
                         4 node(s) exceed max volume count.
```

So the default is `adhar-local`: directories under `/opt/adhar-local-path`, with no attach limit. A node-local volume does **not** survive losing its node. Durability comes from CNPG replication plus base backups into object storage. `adhar-block` is still installed. To use it, set `storageClassName: adhar-block`.

## Step 4 — Dry run

```bash
./adhar up -f config.yaml --env dev --dry-run
```

This prints the resolved environment, provider, region, type and merged `clusterConfig`. It checks **no** permissions, quota or DNS. Its job is to catch schema mistakes before the preflight.

## Step 5 — Provision

```bash
./adhar up -f config.yaml --env dev
```

The preflight runs first. Any `✖` stops the run before the first create call. A subscription at the 4-vCPU default is caught in under a second. With `--verbose`, the passing checks are printed too. For a subscription with a 32-vCPU grant, they read:

```text
preflight ● resource group adhar-rg: exists and is readable
preflight ● resource provider Microsoft.Compute: Registered
preflight ● resource provider Microsoft.Network: Registered
preflight ● resource provider Microsoft.Storage: Registered
preflight ● VM size Standard_E4bds_v5: available to this subscription in
            centralindia, 4 vCPU each
preflight ● vCPU quota: 32 vCPU available, 24 needed at full size
```

Then comes the checklist every cloud draws, with `Cloud cluster` reading `adhar · azure · centralindia`. After the first joins, compute mode installs:

- `cloud-provider-azure`, which reads `kube-system/azure-cloud-provider`, and `/etc/kubernetes/azure.json` on the control plane
- the Azure Disk CSI driver
- the `adhar-block` StorageClass
- `adhar-local` as the default

After the CLI returns, the catalogue keeps converging for 30–45 minutes while the autoscaler adds workers.

## Step 6 — Verify

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig     # context `adhar`
kubectl get nodes                                        # all Ready
kubectl -n adhar-system get svc | grep -i gateway        # EXTERNAL-IP is an address, not <pending>
kubectl get storageclass                                 # adhar-local (default), adhar-block
kubectl -n adhar-system get certificate adhar-cert       # READY True once DNS-01 completes
./adhar get status
./adhar get secrets -p argocd
```

If you see `EXTERNAL-IP <pending>` here, it is the credentials fault described above, not a network one.

## Day-2 operations

```bash
./adhar cluster list --file config.yaml
./adhar cluster scale adhar --workers 4 -p azure -f config.yaml
./adhar cluster upgrade adhar --version 1.37.2 -p azure -f config.yaml
./adhar upgrade --diff-only && ./adhar upgrade --yes
```

After resizing a VM, the CSI driver keeps the old attach limit until that node's `csi-azuredisk-node` pod restarts.

### Managed AKS instead

```yaml
providers:
  azure:
    type: azure
    clusterMode: managed     # AKS instead of VMs + kubeadm
```

This creates the resource group (or uses the configured one). Then it creates:

- an AKS cluster with `networkPlugin: none`. This is BYO CNI, so the bootstrap installs Cilium exactly as elsewhere.
- a system-assigned identity
- one agent pool per node group. The first is the System pool. Names are squeezed to AKS's 12 lowercase alphanumerics.

The kubeconfig is the cluster-admin credential AKS issues. AKS adds its own control-plane pricing tier.

## Tear down, then check the bill

```bash
./adhar down -f config.yaml --env dev
./adhar down -f config.yaml --env dev --purge-orphaned-volumes
```

| Case | Behaviour |
|---|---|
| The group carries `managedBy=adhar-platform` | The whole group is deleted |
| The group was **not** created by Adhar (as in the example, which reuses the DNS group) | The group stays; this cluster's VMs, NICs, load balancers, public IPs, disks, NSGs and VNet are deleted individually |
| No local state for the cluster | The tracker is rebuilt from Azure — VMs tagged `managedBy=adhar-platform` matching `<cluster>-master-N` / `-worker-N` |
| `pvc-*` disks outside the group | Only with `--purge-orphaned-volumes`, and only in the cluster's own location |

An attached disk is never deleted, whatever flags you pass.

**Check nothing is billing:**

```bash
az resource list --resource-group adhar-rg -o table      # only the DNS zone should remain
az disk list --query "[?diskState=='Unattached'].name" -o tsv
```

**What you pay for while it runs:**

- VM hours. `maxWorkers` is your spend ceiling as much as your quota ceiling.
- One Standard load balancer per `LoadBalancer` Service.
- A public IP per node.
- 256 GiB of Premium SSD per node. This costs noticeably more per GiB than StandardSSD.

Node-local volumes add nothing beyond that OS disk.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `MissingSubscriptionRegistration` naming a namespace | A resource provider is unregistered | `az provider register --namespace …` |
| Preflight `✖` on vCPU | Quota sized to the start, or only one meter raised | Raise both the regional total and the family quota to cover `maxWorkers` |
| `409 SkuNotAvailable … Capacity Restrictions` | The size is supported in the region but unavailable to this subscription | Choose from `az vm list-skus` entries with no restrictions |
| Gateway Service stuck at `EXTERNAL-IP <pending>` | `azure.json` has a `clientId` with no secret and no managed identity | Set `clientSecretFile`, or `useManagedIdentity: true` |
| `AADSTS7000215` invalid client secret | A stale or truncated `AZURE_CLIENT_SECRET` | Use `clientSecretFile`; it outranks the environment |
| API server slow, controllers crashloop on lease renewal | A 2-vCPU control plane | `config.vmSize` with 4 vCPU (`Standard_E4bds_v5`) |
| Pods Pending with `exceed max volume count` while CPU is idle | Per-VM data-disk attach limit | Use `adhar-local`, add workers, or a larger size |
| After resizing a VM the attach limit does not change | The CSI driver caches it at startup | Delete that node's `csi-azuredisk-node` pod |
| Node tainted `disk-pressure` soon after boot | OS disk too small for the image cache plus node-local volumes | `config.diskSizeGb: 256` |
| Order fails `SERVFAIL looking up CAA` | The apex is delegated to nameservers holding no zone | Delegate only the platform label |
| external-dns writes nothing | `subscriptionId`/`dnsResourceGroup` missing, or no DNS Zone Contributor on the zone | Set both keys and scope the role to the zone |

## Next steps

- [Providers Overview](/docs/providers/overview) — the shared model, storage classes and the comparison table
- [DigitalOcean](/docs/providers/digitalocean) — the live-verified reference for everything not Azure-specific
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Troubleshooting](/docs/reference/troubleshooting) — decoding autoscaler and volume failures
