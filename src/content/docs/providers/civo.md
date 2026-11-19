---
title: "Civo"
section: "Cloud Providers"
order: 7
path: "/docs/providers/civo"
---

# Civo

Take a Civo account to a working Adhar platform: token, quota, a Civo DNS zone, one config file, `adhar up`, verification and teardown. This page is for teams who want low-cost dev and staging clusters.

Civo differs from the other clouds in one way that decides the mode you run: **Civo's cloud-controller-manager (CCM) only works on Civo's own managed Kubernetes.** So Civo is the one cloud whose shipped config uses `clusterMode: managed`.

> **Status:** `status:in-progress` — the provider is implemented and passes config validation and `--dry-run`, but has not yet been run end to end. Treat a first deployment as a bring-up exercise, and use [DigitalOcean](/docs/providers/digitalocean) as the reference for everything that is not Civo-specific.

## At a glance

| | |
|---|---|
| **Provider key** | `civo` |
| **Status** | `status:in-progress` |
| **Shipped mode** | `clusterMode: managed` — Civo k3s, built with Cilium |
| **Other modes** | `compute` = instances + kubeadm, host-network Gateway · `provided` = an existing cluster |
| **Credentials** | `CIVO_TOKEN` with `useEnvironment: true` (or `token` on the provider block) |
| **DNS / trusted TLS** | Civo DNS via external-dns; DNS-01 wildcard through a webhook solver when `dnsProvider: civo` |
| **Quota check** | At the start of the create, before anything exists: instances, CPU, RAM, disk, volumes, networks |
| **Default StorageClass** | `adhar-local` (node-local); block volumes only in `managed` mode |
| **Best for** | Low-cost dev and staging clusters |

## Topology

```diagram
dp-civo-topology
```

In the shipped **managed** mode, Civo builds the cluster: a k3s control plane you never see as an instance, a node pool, and Civo's own CCM and CSI driver. Adhar asks for the cluster with Cilium as its CNI and without Civo's default marketplace applications, because Traefik would claim node ports and hostnames that the Cilium Gateway owns. Since Civo installed Cilium, the platform bootstrap **does not** install its own over it. The Gateway Service gets a Civo load balancer, and external-dns publishes its address.

### Managed versus compute

On plain instances there is no Civo cluster record, so the Civo CCM cannot initialise nodes, and the Civo CSI plugin cannot work without the `providerID` the CCM sets. Compute mode therefore installs **neither**, and serves the platform from the nodes themselves:

| | `managed` (shipped) | `compute` |
|---|---|---|
| Control plane | Run by Civo (k3s) | A `g3.large` instance you pay for |
| Edge | Civo load balancer from Civo's CCM | Host-network Gateway: Envoy binds :80/:443 on every node |
| DNS A records | The load balancer's IP | Every instance's public IP (round-robin) |
| Storage | `adhar-local` default + Civo volumes | `adhar-local` only |
| Node autoscaler | Not supported (Civo owns the pool; size it yourself) | Adds and removes instances |
| Node SSH | No | Yes |

In compute mode the platform configures the pieces a host-network Gateway needs:

- Cilium: `gateway-api-hostnetwork-enabled: "true"`, `NET_BIND_SERVICE` on `cilium-envoy`, and `--keep-cap-net-bind-service` on `cilium-envoy-starter`.
- The cluster firewall opens 80 and 443.
- external-dns publishes the instances' public IPs.
- CoreDNS points `*.<host>` at a shim Service that lists the nodes' internal addresses, so pods reach `https://keycloak.<host>` without hairpinning through NAT.

The trade-off is one Envoy per node with DNS round-robin. Losing a node removes one A record's worth of capacity until the next reconcile. A cloud load balancer health-checks instead.

## Prerequisites

| Requirement | Check |
|---|---|
| A Civo account and API token | `civo apikey list` |
| Quota for the cluster at `maxWorkers` | The Civo dashboard quota page; `adhar up` checks the starting size too |
| A size that exists in your region **for your mode** | `civo size ls` — managed uses the `*.kube.*` / `*.k3s.*` rows |
| A domain and access to its registrar | You can add NS records |
| `adhar` ([Installation](/docs/getting-started/installation)), `kubectl`, `dig`, the `civo` CLI | `adhar version` |

### API token

Create a token in the Civo dashboard under **Settings → Profile → Security**. It must be able to create and delete instances or Kubernetes clusters, networks, firewalls, SSH keys, load balancers, volumes and DNS records.

```bash
export CIVO_TOKEN="…"
civo apikey list          # the token works
civo region ls            # LON1 / NYC1 / FRA1 / PHX1 …
```

Adhar reads `CIVO_TOKEN` only when the provider block says `useEnvironment: true`, as the shipped example does. Without that, and without an inline `token`, the run stops with `Civo token is required`.

In compute mode, Adhar also writes the token to the `kube-system/civo-api-access` Secret (API key, region, cluster id) for in-cluster components that call Civo.

### Sizes

Managed mode draws from a **different size family** (`g4s.kube.*`, `g3.k3s.*`, `g4m.kube.*`) than the instance list (`g3.*`). A `g3.*` size fails at create in managed mode.

The shipped `g4s.kube.large` is 4 vCPU / 8 GB with a 60 GB disk. The disk size matters because `adhar-local` keeps platform volumes on the node filesystem; the `g3.k3s.*` sizes carry only 15 GB.

> **Warning:** Confirm the size and image for your region before the first run. A size that does not exist there fails at create time, *after* the network and firewall exist. The quota check cannot catch it: an unknown size adds nothing to the check.

### Quota

Civo accounts start with modest limits, and the full platform exceeds a default account. At the start of the create, `adhar up` reads the account's quota. If the cluster does not fit, it **refuses before provisioning anything** and names each limit, for example `instances: need 4, 8 of 10 already in use`.

| Checked | Blocking |
|---|---|
| Instances | yes |
| CPU cores | yes |
| RAM (MB) | yes |
| Disk (GB) | yes |
| Disk volumes (at least 3 free, for bootstrap) | yes |
| Networks (one per cluster) | yes |
| Load balancers | **no** |

- The check sizes the **starting** cluster. Leave headroom for `maxWorkers` yourself.
- An exhausted load-balancer quota leaves the Gateway Service `Pending`, but the platform still comes up, so it does not block.
- A token that cannot read the quota logs a warning and proceeds.

### DNS zone

```bash
civo domain create platform.example.com
civo domain list                          # read the nameservers Civo assigns
```

At your registrar, in the `example.com` zone, add **NS records named `platform`** pointing at those nameservers. Leave the apex where it is.

**Check:**

```bash
dig +short NS platform.example.com      # → the nameservers from above
dig +short NS example.com               # → your registrar's, unchanged
dig +noall +comment CAA example.com     # → status: NOERROR (empty answer is fine)
```

> **Warning:** Do not delegate the whole registered domain unless you also host its apex zone in Civo. Let's Encrypt reads CAA records up the tree, so issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone, the order fails with a message naming CAA.

You can skip DNS. The platform then comes up self-signed, and `adhar up` says so in its closing summary. cert-manager issues a trusted certificate on its own once a usable zone exists.

### Certificates

cert-manager has no built-in Civo solver. With `dnsProvider: civo`, the cert-manager package renders:

- a webhook solver: `okteto/cert-manager-webhook-civo` 0.5.4 (image `okteto/civo-webhook:0.5.4`, pinned), registered as an aggregated APIService in `adhar-system`. Its secret-reader Role is narrowed to the one `adhar-dns-provider` Secret.
- a `civo` branch of the `adhar-letsencrypt-dns` ClusterIssuer that uses it.

DNS-01 needs no public A record, so this works in both modes, and `*.<host>` is a Let's Encrypt wildcard.

The solver is a **third-party component in the certificate path**. If that is not acceptable, host the platform zone at a provider cert-manager supports natively and point `dnsProvider` there while the cluster stays on Civo. Cloudflare is the lightest option: one API token with `Zone:Read` + `DNS:Edit`.

```yaml
globalSettings:
  dnsProvider: cloudflare      # certificates + records; the cluster is still Civo
providers:
  civo:
    config:
      cloudflareApiToken: "…"  # or CLOUDFLARE_API_TOKEN in the environment
```

## Configure

```bash
cp examples/civo-config.yaml config.yaml    # change defaultHost, email, region
```

The file, condensed and annotated. `test` is identical to `dev` except for its name:

```yaml
globalSettings:
  adharContext: adhar-mgmt              # kube-context prefix and Cilium cluster name
  defaultHost: platform.example.com     # YOUR Civo DNS zone
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: true                    # ArgoCD x2 + redis-ha x3, CNPG 2 instances, PDBs
  email: admin@example.com              # Let's Encrypt (ACME) account
  dnsProvider: civo                     # Civo DNS records + the DNS-01 webhook solver

providers:
  civo:
    type: civo
    region: LON1                        # see `civo region ls`
    primary: true                       # only Civo's Crossplane providers install
    useEnvironment: true                # REQUIRED for CIVO_TOKEN to be read
    # token: "…"                        # or inline — avoid in a committed file
    clusterMode: managed                # Civo k3s; `compute` = instances + kubeadm
    config:
      network_label: adhar-network      # compute: reuse the network with this label, or create it
      reuse_existing_network: true      # recorded; reuse is by label
      cidr: 10.7.0.0/16                 # recorded; not currently applied
      size: g4s.kube.large              # 4 vCPU / 8 GB / 60 GB — the managed size family
      disk_image: ubuntu-24.04          # recorded; compute mode boots Civo's ubuntu-jammy (22.04)
      default_node_count: 3             # recorded; nodeCount below decides
      tags: [adhar, adhar-mgmt]         # managed: tags on the Civo cluster

environmentTemplates:
  nonprod-defaults:                     # REQUIRED by validation; inert on this path
    clusterConfig:
      - { key: autoScale, value: "true" }
    coreServices:
      cilium:
        chart: { repoURL: https://helm.cilium.io/, name: cilium, version: 1.15.7 }

environments:                           # dev, test, prod as namespaces on ONE cluster
  dev:
    isolation: namespace
    type: non-production
    provider: civo
    template: nonprod-defaults
    clusterConfig:
      - { key: name,                    value: adhar-dev }
      - { key: controlPlaneMachineType, value: g3.large }        # COMPUTE MODE ONLY
      - { key: nodeSize,                value: g4s.kube.large }  # overrides config.size
      - { key: nodeCount,               value: "3" }
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 10 }
  # test: same as dev, with name adhar-test
  prod:
    isolation: namespace
    type: production                    # sizes the shared cluster
    provider: civo
    template: nonprod-defaults
    clusterConfig:
      - { key: name,                    value: adhar-prod }
      - { key: controlPlaneMachineType, value: g3.large }
      - { key: nodeSize,                value: g4s.kube.large }
      - { key: nodeCount,               value: "3" }
    autoscaling: { enabled: true, minWorkers: 3, maxWorkers: 10 }
```

### Key fields

| Field | Meaning |
|---|---|
| `clusterMode` | `managed` (shipped), `compute` or `provided`. The old value `k3s` is **rejected** with a message naming `managed`. |
| `size` / `nodeSize` | Provider default and per-environment override; the environment value wins. It must come from the family your mode uses. |
| `controlPlaneMachineType` | Compute mode only; inert under managed, where Civo runs the control plane. Use `g3.large` (4 vCPU / 8 GB), **not** `g3.medium`: etcd and the API server run out of RAM on a smaller control plane once ArgoCD reconciles the full profile. |
| `network_label` | Compute mode reuses the network with this label, or creates it. Accounts cap networks, so reuse helps. Clusters you mesh must share a network. |
| `nodeCount` | Workers at creation. (`default_node_count` is recorded but not used.) |
| `autoscaling` | Acts in compute mode only; a managed node pool is Civo's to size. |

### Dry run

```bash
adhar up -f config.yaml --env dev --dry-run
```

This prints the resolved environment, provider, region, type and merged `clusterConfig`. It validates the **config** only: no token, quota or size check.

## Deploy

```bash
adhar up -f config.yaml --env dev
```

```diagram
npa-civo-sequence
```

The `Preflight` stage confirms the token works. The quota check runs next, before the network is created. The checklist then reads `Cloud cluster · adhar · civo · LON1` and continues through the same stages as every cloud. In managed mode the `Cilium & Gateway` stage finds Cilium present and leaves it as Civo configured it.

In **compute mode**, the create instead builds a network, firewall, SSH key and instances, then runs `kubeadm init` and `join`. The cloud-integration step installs no Civo CCM or CSI. It writes `kube-system/civo-api-access` and makes `adhar-local` the only, default StorageClass.

The catalogue keeps converging after the CLI returns; that is expected. `--apps-timeout` (default 45m on a cloud) limits only how long the CLI waits.

## Verify

```bash
kubectl config use-context adhar                         # merged into ~/.kube/config by adhar up
kubectl get nodes                                        # all Ready
kubectl -n kube-system get pods -l k8s-app=cilium        # Cilium agents Running
kubectl -n adhar-system get svc | grep -i gateway        # managed: a Civo LB address
dig +short console.platform.example.com                  # managed: the LB IP; compute: node IPs
kubectl get clusterissuer adhar-letsencrypt-dns          # READY True
kubectl -n adhar-system get pods | grep civo-dns-webhook # the DNS-01 solver
adhar get status
```

## Access

Log in at `https://console.<defaultHost>`. Your username is your email. Get credentials with:

```bash
adhar get secrets
```

The kubeconfig is at `~/.adhar/clusters/adhar/kubeconfig`, also merged into `~/.kube/config` as context `adhar`. Login, groups and roles are the same on every cloud; see [Accessing the Platform](/docs/operations/accessing-the-platform).

## Operate

### Scale

The shipped shape is three `g4s.kube.large` workers. The binding constraints are memory and pod count, not CPU.

- **Managed mode:** Civo owns the node pool. Resize it yourself; the Adhar node autoscaler does not act.
- **Compute mode:** the autoscaler adds and removes instances between `minWorkers` and `maxWorkers`, or scale by hand:

  ```bash
  adhar cluster scale adhar --workers 5 -p civo -f config.yaml
  ```

If you undersize, expect, in order:

- Pods `Pending` with `Insufficient cpu`, `Insufficient memory` or `Too many pods`. In compute mode the autoscaler treats all three as scale-up triggers.
- `RAM MB quota limit exceeded` from Civo, when the account (not the cluster) runs out.
- Node saturation. The eBPF observability agents are the first SystemOOM victims, and the node flaps `NotReady`.

### Upgrade

```bash
adhar upgrade --name dev --diff-only                                  # preview the stack diff
adhar upgrade --name dev --yes                                        # converge foundation + stack
adhar cluster upgrade adhar --version 1.37.2 -p civo -f config.yaml   # Kubernetes itself
```

The `AdharPlatform` resource is named after the environment you provisioned. Find it with `kubectl -n adhar-system get adharplatform`.

### Tear down

```bash
adhar down -f config.yaml --env dev
adhar down -f config.yaml --env dev --purge-orphaned-volumes
```

`adhar down` shows what it will delete and asks you to type `yes` (skip with `--force`).

> **Warning:** `--env dev` removes the whole cluster. With `isolation: namespace`, `dev`, `test` and `prod` share the one cluster `adhar`, so tearing down any of them deletes all three. If you passed `--name` to `adhar up`, pass the same `--name` to `adhar down`.

| Created by | Resource | Removed by teardown |
|---|---|---|
| provider (compute) | instances, firewall, network, SSH key | yes |
| provider (managed) | the Civo Kubernetes cluster | yes, **after** the sweeps below |
| Civo CCM | one load balancer per `LoadBalancer` Service | yes |
| Civo CSI (managed) | volumes attributed to the cluster | yes — no flag needed |
| CSI driver | unattached `pvc-*` volumes claimed by nobody | only with `--purge-orphaned-volumes` |
| anything | a volume attached elsewhere, or tagged for another cluster | never |

Teardown sweeps what the in-cluster controllers created **before** it deletes the cluster or network, because those resources are attributed through the cluster record. Volumes left behind count against the account's volume quota and can block the next create.

Load balancers are matched by **identity, not by name prefix**: the cluster's instance tag, an instance name or IP, its Civo cluster id, or a name exactly equal to the cluster's. A load balancer that belongs to a cluster with a similar name is never touched.

**Check** that nothing is still billing:

```bash
civo kubernetes list
civo instance list
civo loadbalancer list
civo volume list
civo network list
```

### Cost

While the cluster runs you pay for nodes (in compute mode also the control-plane instance), volumes, and the load balancer Civo's CCM creates. The levers that matter are `maxWorkers`, `nodeCount`, and running `adhar down` when you are finished.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Managed create fails on the size | A `g3.*` instance size in managed mode | Use `g4s.kube.*` / `g3.k3s.*` / `g4m.kube.*` |
| Create fails after the network exists, on `invalid size` | The size or image does not exist in that region | `civo size ls` and `civo diskimage ls` **before** the run |
| `clusterMode "k3s" names a cloud service` | An old config spelling | `clusterMode: managed` |
| `CIVO_TOKEN environment variable is not set` / `Civo token is required` | Token not exported, or `useEnvironment: true` missing | Export `CIVO_TOKEN` and set `useEnvironment: true` |
| `adhar up` refuses at the start, naming a limit | The quota check found a shortfall | Raise the limit, lower `nodeCount`, or pick a smaller size |
| Compute: nodes keep `…/uninitialized`, or no URL answers | An older build installed the Civo CCM, or ran without the host-network Gateway | Use a current build, or switch to `clusterMode: managed` |
| Compute control plane stops answering API and SSH mid-sync | A `g3.medium` (4 GB) control plane | `controlPlaneMachineType: g3.large` |
| Gateway Service stuck `Pending`, platform otherwise fine | Load-balancer quota exhausted (not a blocking check) | Free or raise the LB quota |
| Create fails on `Requested volume would exceed volume count limit quota` | Unattached volumes left on the account | `civo volume list`; delete unattached `pvc-*` volumes, or `adhar down --purge-orphaned-volumes` |
| Browsers warn on every URL | `dnsProvider` is not `civo`/`cloudflare`, or the delegation is not live | Fix the zone; cert-manager retries on its own |

## Next steps

- [Providers Overview](/docs/providers/overview) — the provider model, cluster modes and the comparison table
- [DigitalOcean](/docs/providers/digitalocean) — the reference for everything not Civo-specific
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup
