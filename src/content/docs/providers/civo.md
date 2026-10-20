---
title: "Civo"
section: "Cloud Providers"
order: 7
path: "/docs/providers/civo"
---

# Civo

This page takes you from a Civo account to a working Adhar platform. It covers the token, quota, a Civo DNS zone, a complete config file, `adhar up`, verification and teardown. It is for teams who want fast, low-cost dev and staging clusters.

Civo is the **closest analogue to DigitalOcean** in this platform: a small, flat API and cheap instances. But there is one structural difference to understand before you choose a mode. **Civo's cloud-controller-manager only works on Civo's own managed Kubernetes.** That is why Civo is the one cloud whose shipped config uses `clusterMode: managed`.

> **Status: render-verified.** Provider registration, config validation and `adhar up --dry-run` pass. The kubeadm code is shared with the live-verified DigitalOcean path. Partial live bring-ups shaped the defaults below (node sizes, the volume sweep, the host-network edge). But **no complete measured run exists**, so time to a usable platform is unmeasured. Treat a first bring-up as an exercise. Keep [DigitalOcean](/docs/providers/digitalocean) open for everything that is not cloud-specific.

## At a glance

| | |
|---|---|
| **Provider key** | `civo` |
| **Shipped mode** | `clusterMode: managed` — Civo k3s, built with Cilium |
| **Other modes** | `compute` = instances + kubeadm, host-network Gateway · `provided` = an existing cluster |
| **Credentials** | `CIVO_TOKEN` (or `token` / `tokenFile` on the provider block) |
| **DNS records** | Civo DNS, via external-dns |
| **Trusted wildcard TLS** | DNS-01 through a webhook solver, rendered when `dnsProvider: civo` |
| **Preflight** | Quota-aware: instances, CPU, RAM, disk, networks |
| **Default StorageClass** | `adhar-local` (node-local); block volumes only in `managed` mode |
| **Verification** | Render-verified |
| **Time to usable** | Unmeasured |
| **Best for** | Fast, low-cost dev and staging clusters |

## What gets built

```diagram
dp-civo-topology
```

In the shipped **managed** mode, Civo builds the cluster. That means a k3s control plane you never see as an instance, a node pool, and Civo's own CCM and CSI driver.

Adhar asks for the cluster with Cilium as its CNI (the platform's data path). It also opts out of Civo's default marketplace applications, because Traefik would claim node ports and hostnames that the Cilium Gateway is supposed to own. Since Civo installed Cilium, the platform bootstrap deliberately **does not** install its own over it. The Gateway Service gets a real Civo load balancer, and external-dns publishes its address.

### Why not compute mode by default

On plain instances there is no Civo cluster record. The Civo CCM resolves `CIVO_CLUSTER_ID` against the **managed** Kubernetes API. So on a kubeadm cluster it nil-panics and never clears `node.cloudprovider.kubernetes.io/uninitialized`.

The Civo CSI plugin then cannot work either. It needs `.spec.providerID`, and only the CCM sets that. So compute mode installs **neither**, and gets its edge from the nodes:

| | `managed` (shipped) | `compute` |
|---|---|---|
| Control plane | Run by Civo (k3s) | A `g3.large` instance you pay for |
| Edge | Civo load balancer from Civo's CCM | Host-network Gateway: Envoy binds :80/:443 on every node |
| DNS A records | The load balancer's IP | Every instance's public IP (round-robin) |
| Storage | `adhar-local` default + Civo volumes | `adhar-local` only |
| Node autoscaler | Not available (Civo owns the pool) | Adds and removes instances |
| Node SSH | No | Yes |
| Maturity | The exercised path | Built 2026-10-07, not yet live-verified |

In compute mode, three Cilium settings must agree for the host-network Gateway to listen. The platform sets all three:

- `gateway-api-hostnetwork-enabled: "true"`
- `NET_BIND_SERVICE` on `cilium-envoy`
- `--keep-cap-net-bind-service` on `cilium-envoy-starter`

The first attempt set only the first one. It produced a Gateway that reported `Programmed` while nothing listened on 443.

Inside the cluster, CoreDNS points `*.<host>` at a shim Service that lists the nodes' internal addresses. This is needed because a pod sent to a node's public address hairpins back through NAT, and every oauth2-proxy resolves `https://keycloak.<host>` at start-up.

The trade-off is one Envoy per node with DNS round-robin. Losing a node removes one A record's worth of capacity until the next reconcile. A cloud load balancer health-checks instead.

## Step 1 — Prerequisites checklist

| ✓ | Item | Verify |
|---|---|---|
| ☐ | A Civo account and API token | `civo apikey list` |
| ☐ | Quota for the cluster at `maxWorkers` | Civo dashboard quota page; `adhar up` checks too |
| ☐ | A size that exists in your region **for your mode** | `civo size ls` — managed uses the `*.kube.*` / `*.k3s.*` rows |
| ☐ | A domain and access to its registrar | You can add NS records |
| ☐ | `adhar` (`make build`), `kubectl`, `dig`, the `civo` CLI | — |

### Sizes differ by mode, and by region

Managed mode draws from a **different size family** (`g4s.kube.*`, `g3.k3s.*`, `g4m.kube.*`), not the instance list (`g3.*`). A `g3.*` size fails at create in managed mode.

The shipped `g4s.kube.large` is 4 vCPU / 8 GB with a 60 GB disk. The 60 GB matters because `adhar-local` keeps platform volumes on the node filesystem. The `g3.k3s.*` sizes carry only 15 GB.

> **Confirm the size and image for your region before the first run.** A size that does not exist there fails at create time, *after* the network and firewall already exist. The quota preflight cannot help. An unknown size adds nothing to the check rather than a made-up number, so a newly released size never blocks a create.

## Step 2 — Token and quota

Create a token in the Civo dashboard under **Settings → Profile → Security**. It must be able to create and delete instances or Kubernetes clusters, networks, firewalls, SSH keys, load balancers, volumes and DNS records.

In compute mode, Adhar also writes the token to `kube-system/civo-api-access` (API key, region, cluster id). Anything in-cluster that needs to call Civo reads it from there.

```bash
export CIVO_TOKEN="…"
civo apikey list          # the token works
civo region ls            # LON1 / NYC1 / FRA1 / PHX1 …
```

Civo accounts start with modest limits, and the full platform will exceed a default one. `adhar up` reads the account's own quota (`GetQuota`). If the cluster will not fit, it **refuses before provisioning anything**:

| Checked | Blocking |
|---|---|
| Instances | yes |
| CPU cores | yes |
| RAM (MB) | yes |
| Disk (GB) | yes |
| Networks (one per cluster) | yes |
| Load balancers | **no, deliberately** |

A shortfall reads like `instances: need 4, 8 of 10 already in use`.

The load-balancer quota is not a blocker. An exhausted one leaves the Gateway Service `Pending`, but the platform still comes up. Refusing to build over that would trade a recoverable inconvenience for a hard failure. A token that cannot read the quota logs a warning and proceeds.

For scale: the shipped sizes were chosen against an account measured at 63 GB RAM and 50 cores in total. There, three 8 GB nodes use 24 GB and five use 40 GB. A compute-mode cluster hit `RAM MB quota limit exceeded` when reaching for a fourth 16 GB node. Volumes are capped too (40 on the account that hit it).

## Step 3 — Delegate a DNS zone

```bash
civo domain create platform.example.com
civo domain list                          # read the nameservers Civo assigns
```

At your registrar, in the `example.com` zone, add **NS records named `platform`** pointing at those nameservers. The apex stays where it is. **Verify:**

```bash
dig +short NS platform.example.com      # → the nameservers from above
dig +short NS example.com               # → your registrar's, unchanged
dig +noall +comment CAA example.com     # → status: NOERROR (empty answer is fine)
```

> **Do not delegate the whole registered domain here unless you also host its apex zone here.** Let's Encrypt reads CAA records up the tree. So issuance for `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone, every lookup SERVFAILs. The order then fails with a message naming CAA rather than delegation.

### Certificates

cert-manager has no **built-in** Civo solver. So with `dnsProvider: civo`, the cert-manager package renders two things:

- a webhook solver: `okteto/cert-manager-webhook-civo` 0.5.4, image `okteto/civo-webhook:0.5.4`, registered as an aggregated APIService in `adhar-system`
- a `civo` branch of the `adhar-letsencrypt-dns` ClusterIssuer that uses it

The solver's secret-reader Role is narrowed to the one `adhar-dns-provider` Secret. DNS-01 never needs a public A record. So this works in both modes, and `*.<host>` is a real Let's Encrypt wildcard.

It is a **third-party component in the certificate path** (a small project, last released March 2024). That is why its image tag is pinned. If that is not acceptable, host the platform zone at a provider that cert-manager supports natively. Point `dnsProvider` there while the cluster stays on Civo. Cloudflare is the lightest option: one API token with `Zone:Read` + `DNS:Edit`.

```yaml
globalSettings:
  dnsProvider: cloudflare      # certificates + records; the cluster is still Civo
providers:
  civo:
    config:
      cloudflareApiToken: "…"  # or CLOUDFLARE_API_TOKEN in the environment
```

You can skip DNS. The platform then comes up self-signed, and `adhar up` says so in its closing summary. cert-manager issues a trusted certificate on its own once a usable zone exists.

## Step 4 — Write the configuration

```bash
cp examples/civo-config.yaml config.yaml    # change defaultHost, email, region
```

The shipped file, annotated:

```yaml
globalSettings:
  adharContext: adhar-mgmt              # kube-context prefix and Cilium cluster name
  defaultHost: platform.example.com     # YOUR Civo DNS zone (Step 3)
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
    useEnvironment: true                # token from CIVO_TOKEN
    # token: "…"                        # or inline — avoid in a committed file
    # tokenFile: /path/to/token         # or from disk
    clusterMode: managed                # Civo k3s; `compute` = instances + kubeadm
    config:
      network_label: adhar-network
      reuse_existing_network: true      # reuse a network whose CIDR matches
      cidr: 10.7.0.0/16                 # must not overlap a cluster you will mesh with
      size: g4s.kube.large              # 4 vCPU / 8 GB / 60 GB — the managed size family
      disk_image: ubuntu-24.04          # used in compute mode
      default_node_count: 3
      tags: [adhar, adhar-mgmt]         # on every instance, plus the per-cluster tag
      # purge_orphaned_volumes: true    # prefer the flag on `adhar down`

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
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 5 }
  test:                                 # identical to dev except name: adhar-test
    isolation: namespace
    type: non-production
    provider: civo
    template: nonprod-defaults
    clusterConfig:
      - { key: name,                    value: adhar-test }
      - { key: controlPlaneMachineType, value: g3.large }
      - { key: nodeSize,                value: g4s.kube.large }
      - { key: nodeCount,               value: "3" }
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 5 }
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
    autoscaling: { enabled: true, minWorkers: 3, maxWorkers: 5 }
```

| Field | Meaning |
|---|---|
| `clusterMode` | `managed` (shipped), `compute` or `provided`. The old `cluster_mode: k3s` and `useManagedK8s: true` spellings are **rejected**, not mapped. |
| `size` / `nodeSize` | Provider default and per-environment override; the environment value wins. Must come from the family your mode uses. |
| `controlPlaneMachineType` | Compute mode only; inert under managed, where Civo runs the control plane. Use `g3.large` (4 vCPU / 8 GB), **not** `g3.medium`. A `g3.medium` control plane bootstrapped, then stopped answering its API and SSH once Argo CD reconciled the full profile: etcd plus the API server's watch cache ran out of RAM. |
| `reuse_existing_network` / `cidr` | Reuse a network whose CIDR matches. Clusters you mesh must share it; clusters you do not must not overlap. Accounts cap networks, so reuse helps. |
| `nodeCount` / `default_node_count` | Workers at creation. |
| `autoscaling` | Acts in compute mode only; a managed node pool is Civo's to size. |

## Step 5 — Dry run

```bash
./adhar up -f config.yaml --env dev --dry-run
```

This prints the resolved environment, provider, region, type and merged `clusterConfig`. It validates the **config** only. It does no token, quota or size check.

## Step 6 — Provision

```bash
./adhar up -f config.yaml --env dev
```

The quota preflight runs before the network is created. A shortfall stops the run and names each exhausted limit. The checklist then reads `Cloud cluster · adhar · civo · LON1` and continues through the same stages as every cloud. In managed mode the `Cilium & Gateway` stage finds Cilium already present and leaves it as Civo configured it.

For compute mode, the sequence looks like this:

```diagram
pv-civo-sequence
```

In compute mode, the cloud-integration step installs **no** Civo CCM or CSI. The pinned manifests were removed on 2026-10-06. Instead, the step:

- writes `kube-system/civo-api-access`
- makes `adhar-local` the only and default StorageClass
- does not request the CSI startup taint

With no CSI driver to lift that taint, it cost every bring-up a flat ten minutes until it was dropped.

The platform catalogue keeps converging well after the CLI returns. That is expected on every cloud.

## Step 7 — Verify

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig     # context `adhar`
kubectl get nodes                                        # all Ready
kubectl -n kube-system get pods -l k8s-app=cilium        # Cilium agents Running
kubectl -n adhar-system get svc | grep -i gateway        # managed: a Civo LB address
dig +short console.platform.example.com                 # managed: the LB IP; compute: node IPs
kubectl get clusterissuer adhar-letsencrypt-dns          # READY True
kubectl -n adhar-system get pods | grep civo-dns-webhook # the DNS-01 solver
./adhar get status
./adhar get secrets
```

## Node sizing

The binding constraints are memory and pod count, not CPU. The shipped shape is three `g4s.kube.large` workers growing to five. If you undersize, expect, in order:

- Pods `Pending` with `Insufficient cpu` / `Insufficient memory` / `Too many pods`. In compute mode the autoscaler treats all three as scale-up triggers. In managed mode, raise the pool yourself.
- `RAM MB quota limit exceeded` from Civo, when the account (not the cluster) runs out.
- Node saturation. The eBPF observability agents are the first SystemOOM victims, and they flap the node `NotReady`.

## Tear down, then check the bill

```bash
./adhar down -f config.yaml --env dev
./adhar down -f config.yaml --env dev --purge-orphaned-volumes
```

| Created by | Resource | Removed by teardown |
|---|---|---|
| provider (compute) | instances, firewall, network, SSH key | yes |
| provider (managed) | the Civo Kubernetes cluster | yes, **after** the sweeps below |
| Civo CCM | one load balancer per `LoadBalancer` Service | yes |
| Civo CSI (managed) | volumes attributed to the cluster | yes — no flag needed |
| CSI driver | unattached `pvc-*` volumes claimed by nobody | only with `--purge-orphaned-volumes` |
| anything | a volume attached elsewhere, or tagged for another cluster | never |

**Ordering is not cosmetic.** Teardown sweeps what the in-cluster controllers created **before** it deletes the cluster or network, because those resources are attributed through the cluster record. A managed teardown that deleted the cluster first left 36 volumes / 317 GB on the account. It then stalled the next bring-up with `Requested volume would exceed volume count limit quota of 40`.

Load balancers are matched by **identity, not by name**: the cluster's instance tag, an instance name or IP, or its Civo cluster id. Prefix matching was tried and is wrong. A load balancer called `adhar-mgmt-gateway` is indistinguishable from cluster `adhar` fronting a service called `mgmt-gateway`.

**Check nothing is billing:**

```bash
civo kubernetes list
civo instance list
civo loadbalancer list
civo volume list
civo network list
```

**What you pay for while it runs:** nodes (in compute mode also the control-plane instance), volumes, and the load balancer Civo's CCM creates. Networks, firewalls, SSH keys and DNS records are not the expensive part. This is where Civo appeals: cheap nodes and fast creation suit clusters that exist for a sprint. So the levers that matter are `maxWorkers`, `nodeCount`, and running `adhar down` when you are finished.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Managed create fails on the size | A `g3.*` instance size in managed mode | Use `g4s.kube.*` / `g3.k3s.*` / `g4m.kube.*` |
| Create fails after the network exists, on `invalid size` | The size or image does not exist in that region | `civo size ls` and `civo diskimage ls` **before** the run |
| `clusterMode "k3s" names a cloud service` / `useManagedK8s has been removed` | An old config spelling | `clusterMode: managed` |
| `adhar up` refuses in the first seconds naming a limit | The quota preflight did its job | Raise the limit, lower `nodeCount`, or pick a smaller size |
| Compute: nodes keep `…/uninitialized`, or no URL answers | An older build installed the Civo CCM, or ran without the host-network Gateway | Use a current build; or switch to `clusterMode: managed` |
| Compute control plane stops answering API and SSH mid-sync | `g3.medium` (4 GB) control plane | `controlPlaneMachineType: g3.large` |
| Gateway Service stuck `Pending`, platform otherwise fine | Load-balancer quota exhausted — deliberately not blocking | Free or raise the LB quota |
| Next bring-up fails on volume count quota | Volumes left by an older managed teardown | `civo volume list`; delete unattached `pvc-*` volumes |
| Browsers warn on every URL | `dnsProvider` not `civo`/`cloudflare`, or the delegation is not live | Fix the zone; cert-manager retries on its own |

## Next steps

- [Providers Overview](/docs/providers/overview) — the provider model, cluster modes and the comparison table
- [DigitalOcean](/docs/providers/digitalocean) — the live-verified reference for everything not Civo-specific
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup
