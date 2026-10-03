---
title: "Civo"
section: "Cloud Providers"
order: 7
path: "/docs/providers/civo"
---

# Civo

Civo is the **closest analogue to DigitalOcean** in this platform — a small, flat API and cheap instances — and it runs the same kubeadm code path that is live-verified there. Pick it when you want fast, low-cost clusters and can live with one real asymmetry: cert-manager has no Civo DNS-01 solver, so a publicly trusted wildcard certificate needs a second DNS provider.

> **Status: render-verified, not live-verified.** Provider registration, config-schema validation and `adhar up --dry-run` pass, and the provisioning, scaling, upgrade and teardown code is shared with the DigitalOcean path that has run end to end. **No full run on Civo has been completed.** Treat a first bring-up as an exercise, and keep [DigitalOcean](/docs/providers/digitalocean) open for everything that is not cloud-specific.

## At a glance

| | |
|---|---|
| **Provider key** | `civo` |
| **Default model** | Instances + kubeadm (`cluster_mode: compute`) |
| **Managed option** | Civo k3s (`useManagedK8s: true` / `cluster_mode: k3s`) |
| **Credentials** | `CIVO_TOKEN` |
| **DNS records** | Civo DNS, via external-dns |
| **Trusted wildcard TLS** | No Civo DNS-01 solver — use `dnsProvider: cloudflare`, or self-signed |
| **Preflight** | Quota-aware: instances, CPU, RAM, disk, networks |
| **Default StorageClass (compute)** | `adhar-local`; `civo-volume` ships from the CSI manifest |
| **Verification** | Render-verified |
| **Best for** | Fast, low-cost dev and staging clusters |

## Prerequisites and credentials

### 1. An API token

Create one in the Civo dashboard under **Settings → Profile → Security**. It needs to be able to create and delete instances, networks, firewalls, SSH keys, load balancers, volumes and DNS records — the same surface the platform touches on any cloud. The token is also what the in-cluster cloud-controller-manager and CSI driver read, from `kube-system/civo-api-access`.

```bash
export CIVO_TOKEN="…"
```

Check it works independently before blaming Adhar:

```bash
civo apikey list
civo instance size          # sizes differ per region
civo diskimage ls           # image names differ per region
civo region ls              # LON1 / NYC1 / FRA1 / PHX1 …
```

> **Confirm the size and image for your region before the first run.** A size that does not exist there fails at create time — *after* the network and firewall already exist, leaving you a half-built cluster to clean up. The quota preflight cannot help here: an unknown size contributes nothing to the check rather than a made-up number, precisely so a newly released size never blocks a create.

### 2. Account quota

Civo accounts start with modest limits, and the full platform profile will exceed a default one. `adhar up` reads the account's own quota (`GetQuota`) and **refuses before provisioning anything** if the cluster will not fit, naming each exhausted limit:

| Checked | Blocking |
|---|---|
| Instances | yes |
| CPU cores | yes |
| RAM (MB) | yes |
| Disk (GB) | yes |
| Networks (one per cluster) | yes |
| Load balancers | **no, deliberately** |

The load-balancer quota is not a blocker because an exhausted one leaves the Gateway Service `Pending` while the platform still comes up and is reachable on its node ports — refusing to build the cluster over that would trade a recoverable inconvenience for a hard failure. A token that cannot read the quota logs a warning and proceeds.

A shortfall reads like `instances: need 4, 8 of 10 already in use`, with a pointer to the Civo quota page. Raise the limit, lower `nodeCount`, or choose a smaller size.

### 3. A delegated DNS zone

```bash
civo domain create platform.example.com
civo domain list                          # read the nameservers Civo assigns
```

Then, at your registrar in the `example.com` zone, add **NS records named `platform`** pointing at those nameservers. The apex stays where it is. Verify:

```bash
dig +short NS platform.example.com      # → the nameservers from above
dig +short NS example.com               # → your registrar's, unchanged
dig +noall +comment CAA example.com     # → status: NOERROR (empty answer is fine)
```

> **Do not delegate the whole registered domain here unless you also host its apex zone here.** Let's Encrypt reads CAA up the tree, so issuance for `*.platform.example.com` also queries CAA for `example.com`; if that name is delegated to nameservers holding no zone, every lookup SERVFAILs and the order fails with a message naming CAA rather than delegation.

## Certificates: the one thing Civo cannot do

external-dns publishes records through the Civo API, but **cert-manager ships no Civo DNS-01 solver**. Without a solver there is no ACME challenge, so the platform keeps its self-signed certificate and browsers warn. Two ways out:

1. **Host the platform zone at a DNS-01-capable provider** and point `dnsProvider` there, while the cluster itself stays on Civo. Cloudflare is the lightest option — one API token with `Zone:Read` + `DNS:Edit` on the zone.
2. **Accept the self-signed certificate** and distribute the platform CA to browsers and strict clients.

```yaml
globalSettings:
  defaultHost: platform.example.com
  dnsProvider: cloudflare      # certificates + records; the cluster is still Civo
providers:
  civo:
    token: "…"
    config:
      cloudflareApiToken: "…"  # Zone:Read + DNS:Edit on the zone
```

Either way, this is not a blocker for coming up. `adhar up` says so in its closing summary, `adhar get status` raises it as a warning quoting cert-manager's own reason, and cert-manager issues a trusted certificate on its own within minutes once a usable solver exists.

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
  civo:
    type: civo
    region: LON1
    primary: true
    useEnvironment: true               # read the token from CIVO_TOKEN
    # token: "…"                       # or inline — avoid in a committed file
    # tokenFile: /path/to/token        # or from disk
    config:
      cluster_mode: compute            # kubeadm on instances; "k3s" = Civo managed
      network_label: adhar-network
      reuse_existing_network: true
      cidr: 10.7.0.0/16
      size: g3.xlarge                  # check `civo instance size`
      disk_image: ubuntu-noble         # check `civo diskimage ls`
      default_node_count: 3
      tags: [adhar, adhar-mgmt]

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
    provider: civo
    template: nonprod-defaults
    clusterConfig:
      - { key: name,      value: adhar-mgmt }
      - { key: nodeSize,  value: g3.xlarge }
      - { key: nodeCount, value: "3" }
    autoscaling:
      enabled: true
      minWorkers: 3
      maxWorkers: 10
```

| Field | Meaning |
|---|---|
| `cluster_mode` | `compute` is the Adhar-managed kubeadm path this page describes. `k3s` hands cluster lifecycle to Civo and behaves differently — do not mix expectations between the two. |
| `reuse_existing_network` / `cidr` | Reuse a network whose CIDR matches. Clusters you intend to mesh must share it; clusters you do not must not overlap. |
| `size` / `nodeSize` | Provider default and per-environment override. The environment value wins. |
| `default_node_count` / `nodeCount` | Workers at creation. With autoscaling on, only the starting point. |
| `primary` | Only this cloud's Crossplane provider packages install. |

Both `environmentTemplates` keys are required by config validation and install nothing on this path — the foundation ships as embedded manifests, so the chart coordinates are recorded, printed by `--dry-run`, and otherwise inert.

## A worked `adhar up`

```bash
export CIVO_TOKEN="…"
./adhar up -f config.yaml --env dev --dry-run   # resolves config, creates nothing
./adhar up -f config.yaml --env dev
```

```diagram
pv-civo-sequence
```

Then:

```bash
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
kubectl get nodes
./adhar get status
./adhar get secrets
```

`--dry-run` validates the **config** only; the quota and permission checks above run on the real command. The platform catalogue keeps converging well after the CLI returns — that is expected on every cloud.

## Node sizing

The platform's binding constraints are memory and pod count, not CPU. Because Civo has not had a live full-profile run, size against the DigitalOcean reference shape — 8–16 GiB and 4–8 vCPU per worker — and use `civo instance size` to find the nearest equivalent in your region.

**If you undersize**, expect, in order:

- Pods `Pending` with `Insufficient cpu` / `Insufficient memory` / `Too many pods`. The autoscaler treats all three as scale-up triggers.
- `node(s) exceed max volume count` — the per-instance volume-attach cap is the analogue of DigitalOcean's 7-per-droplet limit and is the most likely capacity wall. This message is **always** an attach-slot shortage, never a CPU one; something asked for a block StorageClass rather than the node-local default.
- Node saturation, where the eBPF observability agents are the first SystemOOM victims and flap the node `NotReady`.

The remedy is more workers, not bigger ones. Raise `autoscaling.maxWorkers` before enabling the full catalogue, and remember it is also your spend ceiling.

## Cost considerations

You pay for instances, attached volumes, and any load balancer the cloud-controller-manager creates for a `LoadBalancer` Service. Networks, firewalls, SSH keys and DNS records are not the expensive part. Civo's appeal is exactly here — cheap instances and fast creation make it a good fit for clusters that exist for a sprint rather than a year — so the levers that matter are `maxWorkers`, `nodeCount`, and actually running `adhar down` when you are finished.

## Tear down

```bash
./adhar down -f config.yaml --env dev
./adhar down -f config.yaml --env dev --purge-orphaned-volumes
```

| Created by | Resource | Removed by teardown |
|---|---|---|
| provider | instances, firewall, network, SSH key | yes |
| cloud-controller-manager | one load balancer per `LoadBalancer` Service | yes |
| CSI driver | volumes attached to this cluster's instances | yes (detached first) |
| CSI driver | unattached `pvc-*` volumes claimed by nobody | only with `--purge-orphaned-volumes` |
| anything | a volume attached elsewhere, or tagged for another cluster | never |

**Ordering matters and is not cosmetic.** The two things the in-cluster controllers created are invisible to the resource tracker and are swept **before** the network is deleted: a load balancer holds a reference to the network, so leaving one behind makes the network deletion fail and the next run inherits it.

Load balancers are matched by **identity, not by name** — the cluster's instance tag, one of its instance names, one of its instance IPs, or its Civo cluster id. Prefix matching was tried and is wrong in a way that matters: a load balancer called `adhar-mgmt-gateway` is indistinguishable from cluster `adhar` fronting a service called `mgmt-gateway`, so tearing down `adhar` would have deleted cluster `adhar-mgmt`'s load balancer and taken its traffic down with it.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Browsers warn on every platform URL | cert-manager has no Civo DNS-01 solver, so the platform keeps its self-signed certificate | Set `dnsProvider: cloudflare` with `cloudflareApiToken`, or distribute the platform CA |
| Create fails after the network exists, on `invalid size` | The size or image name does not exist in that region | `civo instance size` / `civo diskimage ls` **before** the run |
| `adhar up` refuses in the first seconds naming a limit | The quota preflight did its job | Raise the limit at the Civo quota page, lower `nodeCount`, or pick a smaller size |
| Gateway Service stuck `Pending`, platform otherwise fine | Load-balancer quota exhausted — deliberately not a blocking check | Free or raise the LB quota; the platform is reachable on node ports meanwhile |
| `node(s) exceed max volume count` on Pending pods | Per-instance volume-attach cap; something requested a block StorageClass | Let those PVCs use the node-local default, or add workers |
| Network deletion fails during teardown | A load balancer still references it | Re-run `adhar down`; the sweep runs before the network delete |
| Cluster behaves nothing like this page | `cluster_mode: k3s` hands lifecycle to Civo | Use `compute` for the documented path |
| `cluster "adhar-mgmt" not found in any configured provider` | The cluster is named after the **environment** (`dev`) | Use `dev` in `cluster list/scale/delete`, and always pass `--file` |

## Next steps

- [Providers Overview](/docs/providers/overview) — the provider model and the comparison table
- [DigitalOcean](/docs/providers/digitalocean) — the live-verified reference for everything not Civo-specific
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup
