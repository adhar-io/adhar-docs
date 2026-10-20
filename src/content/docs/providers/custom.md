---
title: "Custom / On-Prem"
section: "Cloud Providers"
order: 8
path: "/docs/providers/custom"
---

# Custom / On-Prem

This page takes you from a set of machines you already own to a working Adhar platform. The machines can be bare metal, VMs, or another cloud's instances. Adhar installs Kubernetes on them over SSH with kubeadm. This page is for teams on-prem, air-gapped or on hardware Adhar has no provider for.

First, the boundary: **Adhar owns the Kubernetes layer on these hosts and never owns the hosts themselves.** It builds, joins, drains, upgrades and resets nodes. It never creates, resizes or deletes a machine.

By the end you will have prepared the hosts, run one `adhar up`, and put a load balancer and DNS in front. You will also know what `adhar down` leaves behind.

> **Status: render-verified, not live-verified.** The kubeadm flow is shared with the live-verified DigitalOcean path. But no full run against bring-your-own hosts has been completed, and time to a usable platform is unmeasured. Node preparation dominates the runtime, with a 20-minute ceiling per host.

## At a glance

| | |
|---|---|
| **Provider key** | `custom` |
| **Model** | kubeadm over SSH on machines you own |
| **Cluster modes** | `compute` (this page) · `provided` = install onto a cluster that already exists · no `managed` |
| **Control plane** | Exactly one host; HA needs an LB + stacked etcd and is not implemented |
| **Credentials** | A passphrase-less SSH key; root or passwordless sudo on every host |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **DNS / TLS** | You provide (LB or MetalLB + `dnsProvider`, or your own certificate) |
| **Storage** | local-path provisioner, node-local, not replicated |
| **Lifecycle** | No autoscaling; `adhar down` runs `kubeadm reset` and leaves your machines |
| **Verification** | Render-verified |
| **Best for** | Bare metal, on-prem, air-gapped, or hardware Adhar has no provider for |

## What gets built

```diagram
dp-custom-topology
```

Compare it with any cloud page, and the difference is what is missing: no VPC, no load balancer API, no block storage, no DNS zone. The create step is the SSH bootstrap only.

Everything a cloud would hand the cluster is yours to supply. That means the load balancer in front of node ports 30080/30443, the DNS records pointing at it, and replicated storage.

```diagram
pv-custom-ownership
```

### Building a cluster versus adopting one

`clusterMode: compute` (the default, and the subject of this page) builds the cluster on your hosts.

The cluster may **already exist**: built by someone else, by another tool, or on a cloud Adhar does not cover. In that case, use `clusterMode: provided` instead. Adhar creates nothing. It reaches the cluster through your kubeconfig and installs the platform onto it. `adhar down` on a provided cluster deletes **nothing**, and tells you how to remove the platform (`kubectl delete adharplatform --all -n adhar-system`). See *Provided mode* below.

`useManagedK8s: true` on `custom` is rejected by name, because bring-your-own hosts are always self-managed.

You *can* re-run against hosts that already form the cluster. Every step is idempotent (safe to repeat):

- node prep is guarded by a completion marker
- `kubeadm init` is skipped on an initialised control plane
- a worker already in the node list is skipped rather than re-joined

Retries are safe. Adding hosts to `workerIPs` grows the cluster rather than rebuilding it.

## Step 1 — Prepare the hosts

| Requirement | Why |
|---|---|
| **Ubuntu 24.04** | The node-prep script is written against it (apt, containerd, `pkgs.k8s.io`) |
| **Root, or passwordless `sudo`** | Every command runs as root; Adhar checks `id -u` on each host and refuses otherwise |
| **A passphrase-less SSH key, port 22** | Passphrase-protected keys are rejected by name; `sshPort` is legacy and only 22 is supported |
| **A kernel supporting the Cilium eBPF data path** | Cilium is both the CNI and the Gateway data path, with `kubeProxyReplacement` |
| **No conflicting CNI you cannot remove** | No CNI is installed at `kubeadm init`; a leftover `/etc/cni/net.d` competes with Cilium |
| **Outbound internet, or a mirror** | Node prep installs packages and pulls the platform's images |
| **Unrestricted host-to-host reachability** | etcd, the kubelet API and Cilium's VXLAN/Geneve and health traffic run between nodes |

Node prep handles swap, kernel modules, sysctls and resolver configuration. Do not pre-configure them.

### Network

Mirror what the cloud providers open for themselves:

| Path | Ports |
|---|---|
| The machine running `adhar` → every host | TCP 22 |
| The machine running `adhar` and all nodes → control plane | TCP 6443 |
| Node ↔ node | all TCP/UDP/ICMP, unrestricted |
| Your load balancer or clients → any node | TCP/UDP 30000–32767 (the Gateway sits on 30080/30443) |
| Clients → your load balancer | TCP 80, 443 |

### Sizing

No autoscaler can rescue an undersized cluster here, so size it up front. The measured cloud shapes apply directly:

| Role | Shape | Why |
|---|---|---|
| Control plane | 2 vCPU / 16 GiB minimum, dedicated | Stays tainted `NoSchedule`, but etcd and the API server need the memory. On Azure a 2-vCPU control plane collapsed under the full platform; prefer 4 vCPU |
| Workers | 4 vCPU / 32 GiB each, at least two | With one worker, drains and evictions have nowhere to go. The ~80-application catalogue was stable on six 8-vCPU workers; a curated profile is comfortable on three or four |
| Disk | 256 GiB per node | The containerd image cache alone is ~35 GiB, and every PersistentVolume is a directory on the same filesystem. Too small, and the kubelet takes a `disk-pressure:NoSchedule` taint, which reads like a CPU shortage |

### Verify readiness by hand

Adhar's own checks are exactly these two. Run them yourself first, because a failure halfway through a bootstrap is more work to unpick:

```bash
for ip in 192.0.2.10 192.0.2.11 192.0.2.12 192.0.2.13; do
  ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes ubuntu@$ip 'echo connection-ok; sudo -n id -u'
done
# every host must print: connection-ok
#                        0
```

Also confirm two things:

- `/etc/cni/net.d` is empty on every host.
- The pod CIDR (default `10.244.0.0/16`) does not overlap your LAN or any cluster you plan to mesh with.

## Step 2 — Decide DNS and TLS

Point `*.<defaultHost>` at your load balancer. Two routes lead to a publicly trusted wildcard certificate:

1. **Delegate the platform host to a DNS service the platform can solve DNS-01 with**: `digitalocean`, `aws`, `gcp`, `azure`, `civo` or `cloudflare`. Set `globalSettings.dnsProvider` to it, with that provider's credentials. The cluster stays on your hosts; only the zone lives there. Cloudflare is the lightest (one API token). This is the only route that works for a cluster unreachable from the internet, because DNS-01 never contacts it.
2. **Bring your own certificate.** Leave `dnsProvider` unset and replace the platform certificate Secret with yours.

Either way, delegate **only the platform label** at your registrar and leave the apex where it is. Let's Encrypt reads CAA records up the tree. A registrable domain delegated to nameservers holding no zone makes every order fail with `SERVFAIL looking up CAA`, while every app still resolves perfectly.

**Verify:** `dig +short NS platform.example.com` returns the DNS provider's nameservers, and `dig +noall +comment CAA example.com` says `NOERROR`.

## Step 3 — Write the configuration

There is no `examples/custom-config.yaml`. This is the configuration from the repository's custom-provider guide, annotated:

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: true                 # platform HA (replicas), not control-plane HA
  email: admin@example.com
  # dnsProvider: cloudflare          # optional; see Step 2

providers:
  custom:
    type: custom
    region: on-prem                  # a label only; nothing is looked up from it
    primary: true
    config:
      masterIPs:
        - 192.0.2.10                 # exactly one control plane is supported today
      workerIPs:
        - 192.0.2.11
        - 192.0.2.12
        - 192.0.2.13
      sshUser: ubuntu                # root, or a passwordless-sudo user
      sshKeyPath: ~/.ssh/id_ed25519  # passphrase-less
      sshPort: 22                    # legacy; only 22 is supported

environmentTemplates:
  nonprod-defaults:
    clusterConfig:
      - { key: autoScale, value: "false" }   # nothing for an autoscaler to buy
    coreServices:                    # may not be empty; recorded, otherwise inert
      cilium:
        chart: { repoURL: https://helm.cilium.io/, name: cilium, version: 1.15.7 }

environments:
  dev:
    type: non-production
    provider: custom
    template: nonprod-defaults
    clusterConfig:
      - { key: name,      value: adhar-mgmt }
      - { key: nodeCount, value: "3" }       # must match the number of workerIPs
      # - { key: podCIDR, value: 10.244.0.0/16 }   # must not overlap your LAN
```

Two legacy aliases still work, but prefer the current names. `nodeIPs` is an alias for `workerIPs` (its first entry becomes the control plane). `username` is an alias for `sshUser`. More than one `masterIPs` entry is rejected at create time with `exactly one control-plane host is supported`.

## Step 4 — Dry run

```bash
./adhar up -f config.yaml --env dev --dry-run
```

This prints the resolved environment, provider, region and cluster shape. It touches no host.

## Step 5 — Provision

```bash
./adhar up -f config.yaml --env dev
```

The `custom` provider has no deep preflight. With `--verbose`, the first check says so. The run then relies on the SSH and root checks:

```text
preflight ● credentials and API access: the provider answered; note this provider
            has no deep preflight yet, so quota and per-action permissions are
            unverified
```

The `Cloud cluster` stage is the SSH bootstrap. It runs in three parts:

1. Node prep on every host in parallel (apt installs, containerd, the pinned kubeadm stream; 20-minute ceiling per host).
2. `kubeadm init` on the control plane, with kube-proxy skipped.
3. `kubeadm join` on the workers.

In `--verbose` output the lines look like this:

```text
Preparing host 192.0.2.10 (containerd + kubeadm 1.37)
Worker 192.0.2.11 is already part of the cluster; skipping join
Cluster "adhar-mgmt" is up: API https://192.0.2.10:6443 (3 workers).
Nodes stay NotReady until the platform bootstrap installs Cilium.
```

**`NotReady` at that point is correct, not a fault.** No CNI is installed at `kubeadm init`. The bootstrap installs Cilium immediately afterwards, and the nodes turn Ready. The rest of the checklist is identical to every cloud: Cilium & Gateway, ArgoCD, Gitea, GitOps repos, Crossplane, GitOps sync.

### What Adhar installs on your hosts

| Installs | Detail |
|---|---|
| containerd | systemd cgroup driver; `certs.d` host config enabled |
| kubeadm, kubelet, kubectl | From the pinned `pkgs.k8s.io` minor stream for the target version |
| Kernel and systemd tuning | `overlay`/`br_netfilter`, IP forwarding, raised inotify and file limits, swap off |
| Resolver hardening | `/etc/resolv.conf` pinned to real upstreams, so image pulls never depend on the local `systemd-resolved` stub |
| The cluster | `kubeadm init` with **kube-proxy skipped**, workers joined, kubelet `maxPods` raised to 250 |
| Cilium | `kubeProxyReplacement`; also the Gateway data path on node ports 30080/30443 |
| Storage | The local-path provisioner (pinned v0.0.31), marked the default StorageClass `local-path` |
| The platform | ArgoCD, Gitea, the GitOps stack and the package catalogue, as on every provider |

What it leaves alone:

- **your machines**
- **autoscaling** (`minWorkers`/`maxWorkers` have nothing to act on)
- **firewall and iptables rules** (untouched, including after a reset)
- **load balancers**
- **block storage**
- **DNS zones and certificates**
- **HA control planes**

## Step 6 — Put a load balancer in front, then verify

Point your load balancer (or MetalLB) at every worker: 80 → 30080 and 443 → 30443. Then:

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig     # context `adhar`
kubectl get nodes                                        # every host Ready
kubectl -n kube-system get pods -l k8s-app=cilium
kubectl get storageclass                                 # local-path (default)
kubectl get svc -A | grep -i gateway                     # node ports 30080/30443
curl -skI https://console.platform.example.com | head -1 # through your LB
./adhar get status                                       # platform conditions + per-package health
./adhar get apps                                         # application sync/health
```

The catalogue keeps converging for 30–45 minutes after the CLI returns.

## Day-2: scaling and upgrades

Scaling does not create machines. It moves the cluster boundary within `workerIPs`:

```bash
./adhar cluster scale adhar --workers 3 --node-group workers -p custom -f config.yaml
./adhar cluster upgrade adhar --version 1.37.2 -p custom -f config.yaml
```

Scaling joins the first N hosts that are not yet members (prep plus `kubeadm join`). It retires the ones beyond N (drain, delete the Node, `kubeadm reset`). To grow past the list, add hosts to `workerIPs` first.

Removing a node group outright is not supported. Instead, drain, reset, and drop the IPs from the list. Upgrades run on the control plane first, then the workers.

### You supply what a cloud otherwise provides

| Concern | What ships | What you add |
|---|---|---|
| **Ingress** | Cilium Gateway on node ports 30080/30443 | Your own LB and DNS in front of the nodes, or MetalLB |
| **Storage** | local-path provisioner (node-local, not replicated, no online expansion) | Longhorn, Rook/Ceph or your SAN's CSI before trusting it with data |
| **DNS / TLS** | A self-signed certificate | Step 2 |
| **Backups** | Velero and CNPG target object storage | An S3-compatible endpoint they can reach |

## Provided mode: an existing cluster

When the cluster exists already, `examples/provided-config.yaml` is the starting point:

```yaml
providers:
  custom:                            # or the cloud that hosts your DNS zone
    type: custom
    primary: true
    clusterMode: provided
    kubeconfig: ~/.kube/config       # default: $KUBECONFIG, then ~/.kube/config
    kubeContext: my-existing-cluster # default: the file's current context — name it explicitly
```

The preflight checks, before anything is installed:

| Requirement | If missing |
|---|---|
| Kubernetes ≥ 1.28, cluster-admin through that kubeconfig | **fail** |
| Cilium with `gatewayAPI.enabled=true`, **or no CNI at all** | **fail** — another CNI (Calico, Flannel, the AWS VPC CNI, kindnet, …) is refused rather than replaced |
| At least one node | **fail** |
| A default StorageClass | warn — this mode installs no provisioner |

An existing Cilium is left exactly as configured. `region:` is not required and sizing keys are inert. The autoscaler refuses to act, and `--recreate` is refused.

## Tear down

```bash
./adhar down -f config.yaml --env dev
```

On `compute`, this runs `kubeadm reset -f` and clears `/etc/cni/net.d` on every host. It does the workers first and the control plane last, so the control plane can still answer while the workers leave. Then it removes local state.

Your machines, disks and firewall rules are untouched. Node-local PersistentVolume data under `/opt/adhar-local-path` survives the reset. Delete it yourself if you want the hosts clean. There is no cloud bill to check, but your own load balancer and DNS records are yours to remove.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `SSH key … is passphrase-protected` | The provider supports passphrase-less keys only | Use a dedicated key held securely |
| `commands on host … do not run as root (got uid 1000)` | `sudo` needs a password | Configure passwordless `sudo` for `sshUser`, or use `root` |
| Nodes `NotReady` right after create | No CNI yet — expected | Wait for the bootstrap to install Cilium |
| Nodes still `NotReady` after Cilium installs | A leftover config in `/etc/cni/net.d`, or a kernel too old for the eBPF data path | Remove the stale config and re-run; check the Cilium agent logs |
| `exactly one control-plane host is supported` | More than one entry in `masterIPs` | Use one; HA control planes are not implemented yet |
| Node count does not match reality | `nodeCount` disagrees with the length of `workerIPs` | Keep them equal, or scale explicitly |
| Node prep times out | apt or registry access slow or blocked; the ceiling is 20 minutes per host | Use a local mirror, then re-run — prep is idempotent |
| Image pulls fail with `connection refused on 127.0.0.53` | The local resolver stub died | Node prep pins `/etc/resolv.conf` to real upstreams; re-run prep on that host |
| Pods Pending on `volume node affinity conflict` | A node-local volume is bound to a node that changed | Install a replicated CSI for stateful workloads |
| Provided mode refused: different CNI | The cluster runs Calico/Flannel/etc. | Remove it, or let Adhar build a cluster with `compute` |
| Certificates stay self-signed | No `dnsProvider`, or the apex does not resolve | Delegate the platform label to a DNS-01-capable provider, or supply your own certificate |

## Next steps

- [Providers Overview](/docs/providers/overview) — the shared model, cluster modes and the comparison table
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Production](/docs/operations/production) — hardening, HA and backups
- [Troubleshooting](/docs/reference/troubleshooting) — decoding node, volume and sync failures
