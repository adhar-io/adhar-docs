---
title: "Custom / On-Prem"
section: "Cloud Providers"
order: 8
path: "/docs/providers/custom"
---

# Custom / On-Prem

Point Adhar at machines you already own — bare metal, VMs, or another cloud's instances — and it installs Kubernetes over SSH with kubeadm. The boundary is worth stating first: **Adhar owns the Kubernetes layer on these hosts and never owns the hosts themselves.** It builds, joins, drains, upgrades and resets nodes; it never creates, resizes or deletes a machine.

## At a glance

| | |
|---|---|
| **Provider key** | `custom` |
| **Model** | kubeadm over SSH on machines you own (BYO) |
| **Managed option** | Not applicable — `useManagedK8s` is rejected by name |
| **Control plane** | Exactly one host; HA needs an LB + stacked etcd and is not implemented |
| **Credentials** | A passphrase-less SSH key; root or passwordless sudo on every host |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **DNS / TLS** | You provide (LB or MetalLB + `dnsProvider`, or your own certificate) |
| **Storage** | local-path provisioner, node-local, not replicated |
| **Lifecycle** | No autoscaling; `adhar down` runs `kubeadm reset` and leaves your machines |
| **Verification** | Render-verified — the kubeadm flow is shared with the live-verified DigitalOcean path |
| **Best for** | Bare metal, on-prem, air-gapped, or hardware Adhar has no provider for |

## What "conformant" means here

On a cloud provider, conformance is a property of the cluster the cloud hands you. Here it is a property of **your hosts**, because Adhar builds the cluster itself. Nothing adopts a Kubernetes cluster somebody else created — an existing kubeconfig is not an input Adhar accepts, and `useManagedK8s: true` on `custom` fails with an explicit message rather than being ignored.

Re-running against hosts that already form the cluster *is* supported. Every step is idempotent: node prep is guarded by a completion marker, `kubeadm init` is skipped on an initialised master, and a worker already in the node list is skipped rather than re-joined. Retries are safe, and adding hosts to `workerIPs` grows the cluster rather than rebuilding it.

```text
  you own                          adhar owns
 ┌───────────────────────┐        ┌──────────────────────────────┐
 │ the machines          │        │ containerd + kubeadm on each │
 │ the network & firewall│  SSH   │ kubeadm init / join / reset  │
 │ DNS, certificates     │ ─────▶ │ Cilium (CNI + Gateway)       │
 │ load balancing        │        │ local-path StorageClass      │
 │ real (replicated)     │        │ the whole platform stack     │
 │   storage             │        │                              │
 └───────────────────────┘        └──────────────────────────────┘
```

### Host requirements

| Requirement | Why |
|---|---|
| **Ubuntu 24.04** | The node-prep script is written against it (apt, containerd, `pkgs.k8s.io`) |
| **Root, or passwordless `sudo`** | Every command runs as root; Adhar checks `id -u` on each host and refuses otherwise |
| **A passphrase-less SSH key, port 22** | Passphrase-protected keys are rejected by name; `sshPort` is legacy and only 22 is supported |
| **A kernel supporting the Cilium eBPF data path** | Cilium is both the CNI and the Gateway data path, with `kubeProxyReplacement` |
| **No conflicting CNI you cannot remove** | No CNI is installed at `kubeadm init`; a leftover `/etc/cni/net.d` competes with Cilium |
| **Outbound internet, or a mirror** | Node prep installs packages and pulls the platform's images |
| **Unrestricted host-to-host reachability** | etcd, the kubelet API and Cilium's VXLAN/Geneve and health traffic all run between nodes |

Swap, kernel modules, sysctls and resolver configuration are handled by node prep — do not pre-configure them.

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

No autoscaler can rescue an undersized cluster here, so size it up front. The measured cloud shapes transfer directly:

- **Control plane:** 2 vCPU / 16 GiB, dedicated. It stays tainted `NoSchedule`, but etcd and the API server need the memory at this object count.
- **Workers:** 4 vCPU / 32 GiB each, two minimum — one worker leaves drains and evictions nowhere to go. The full ~80-application catalogue was stable on six workers at 8 vCPU; a curated profile is comfortable on three or four.
- **Disk:** 256 GiB per node. The containerd image cache alone measures ~35 GiB, and with `local-path` as the default StorageClass every PersistentVolume is a directory on the same filesystem. Undersize it and the kubelet takes a `disk-pressure:NoSchedule` taint, which reads like a CPU shortage.

## What Adhar installs, and what it does not

| Installs on your hosts | Detail |
|---|---|
| containerd | systemd cgroup driver; `certs.d` host config enabled for both pull paths |
| kubeadm, kubelet, kubectl | From the pinned `pkgs.k8s.io` minor stream for the target version |
| Kernel and systemd tuning | `overlay`/`br_netfilter`, IP forwarding, raised inotify and file limits, swap off |
| Resolver hardening | `/etc/resolv.conf` pinned to real upstreams, so image pulls never depend on the local `systemd-resolved` stub |
| The cluster | `kubeadm init` with **kube-proxy skipped**, workers joined, kubelet `maxPods` raised to 250 |
| Cilium | Installed by the bootstrap with `kubeProxyReplacement`; also the Gateway data path on node ports 30080/30443 |
| Storage | The local-path provisioner (pinned), marked the default StorageClass |
| The platform | ArgoCD, Gitea, the GitOps stack and the package catalogue, as on every provider |

What it leaves alone: **your machines** (no creation, deletion or resize), **autoscaling** (`minWorkers`/`maxWorkers` have nothing to act on — Adhar cannot buy a host), **firewall and iptables rules** (untouched, including after a reset), **load balancers** (no cloud LB API), **block storage** (no cloud CSI, so node-local volumes are the default), **DNS zones and certificates** (nothing creates a zone), and **HA control planes** (more than one `masterIPs` entry is rejected at create time).

## Configuration

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: true
  email: admin@example.com
  # dnsProvider: cloudflare        # optional; see DNS and TLS below

providers:
  custom:
    type: custom
    region: on-prem            # a label only; nothing is looked up from it
    primary: true
    config:
      masterIPs:
        - 192.0.2.10           # exactly one control plane is supported today
      workerIPs:
        - 192.0.2.11
        - 192.0.2.12
        - 192.0.2.13
      sshUser: ubuntu          # root, or a passwordless-sudo user
      sshKeyPath: ~/.ssh/id_ed25519
      sshPort: 22

environmentTemplates:
  nonprod-defaults:
    clusterConfig:
      - key: autoScale
        value: "false"
    coreServices:
      cilium:
        chart:
          repoURL: https://helm.cilium.io/
          name: cilium
          version: 1.15.7

environments:
  dev:
    type: non-production
    provider: custom
    template: nonprod-defaults
    clusterConfig:
      - { key: name,      value: adhar-mgmt }
      - { key: nodeCount, value: "3" }   # must match the number of workerIPs
      # - { key: podCIDR, value: 10.244.0.0/16 }   # must not overlap your LAN
```

`nodeIPs` is a legacy alias for `workerIPs` (its first entry becomes the master) and `username` for `sshUser`. `coreServices` may not be empty; the schema rejects `{}`. Set `autoScale: "false"` — there is nothing for an autoscaler to provision.

## Verify readiness before `adhar up`

Adhar's own checks are exactly these two. Do them by hand first — a failure halfway through a bootstrap is more work to unpick:

```bash
for ip in 192.0.2.10 192.0.2.11 192.0.2.12 192.0.2.13; do
  ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes ubuntu@$ip 'echo connection-ok; sudo -n id -u'
done
# every host must print: connection-ok
#                        0
```

Also confirm `/etc/cni/net.d` is empty on every host and that the podCIDR does not overlap your LAN or any cluster you plan to mesh with.

## Provision

```bash
./adhar up -f config.yaml --env dev --dry-run   # resolves the config; touches nothing
./adhar up -f config.yaml --env dev
```

`--dry-run` prints the resolved environment, provider and cluster shape. The `custom` provider has no deep preflight, so `adhar up` says so and then relies on the SSH and root checks:

```text
preflight ● credentials and API access: the provider answered; note this provider
            has no deep preflight yet, so quota and per-action permissions are
            unverified
```

Node preparation dominates the runtime (apt installs, 20-minute ceiling per host), and the create step is the SSH bootstrap only: no VPC, no load balancer, no volumes. Expect log lines of the shape:

```text
Preparing host 192.0.2.10 (containerd + kubeadm 1.37)
Worker 192.0.2.11 is already part of the cluster; skipping join
Cluster "adhar-mgmt" is up: API https://192.0.2.10:6443 (3 workers).
Nodes stay NotReady until the platform bootstrap installs Cilium.
```

**`NotReady` at that point is correct, not a fault.** No CNI is installed at `kubeadm init`; the bootstrap installs Cilium immediately afterwards and the nodes turn Ready.

## Verify after

```bash
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
kubectl get nodes                       # every host Ready
kubectl -n kube-system get pods -l k8s-app=cilium
kubectl get storageclass                # local-path marked (default)
kubectl get svc -A | grep -i gateway    # node ports 30080/30443
./adhar get status                      # platform conditions + per-package health
./adhar get apps                        # application sync/health
```

Then point a browser at your load balancer. The catalogue keeps converging for 30–45 minutes after the CLI returns.


## Scaling

Scaling moves the cluster boundary within `workerIPs` rather than creating machines:

```bash
adhar cluster scale dev --workers 3 --node-group workers -p custom -f config.yaml
```

That joins the first N hosts not yet members (prep plus `kubeadm join`) and retires the ones beyond N (drain, delete the Node, `kubeadm reset`). To grow past the list, add hosts to `workerIPs` first. Removing a node group outright is not supported — drain, reset, and drop the IPs from the list.

## You supply what a cloud otherwise provides

| Concern | What ships | What you add |
|---|---|---|
| **Ingress** | Cilium Gateway on node ports 30080/30443 | Your own LB and DNS in front of the nodes, or MetalLB |
| **Storage** | local-path provisioner (node-local, not replicated, no online expansion) | Longhorn, Rook/Ceph or your SAN's CSI before trusting it with data |
| **DNS / TLS** | A self-signed certificate | See below |
| **Backups** | Velero and CNPG barman target object storage | An S3-compatible endpoint they can reach |

### DNS and TLS

Point `*.<defaultHost>` at your load balancer. Two routes lead to a publicly trusted wildcard certificate:

1. **Delegate the platform host to a DNS service the platform can solve DNS-01 with** — `digitalocean`, `aws`, `gcp`, `azure` or `cloudflare` — and set `globalSettings.dnsProvider` to it with that provider's credentials. The cluster stays on your hosts; only the zone lives there. Cloudflare is the lightest (one API token), and this is the only route that works for a cluster unreachable from the internet, because DNS-01 never contacts it.
2. **Bring your own certificate**: leave `dnsProvider` unset and replace the platform certificate Secret with yours.

Either way, delegate **only the platform label** at your registrar and leave the apex where it is. Let's Encrypt reads CAA up the tree, so a registrable domain delegated to nameservers holding no zone makes every order fail with `SERVFAIL looking up CAA` while every app still resolves perfectly.

## Tear down

```bash
./adhar down -f config.yaml --env dev
```

This runs `kubeadm reset -f` and clears `/etc/cni/net.d` on every host — workers first, the master last, so the control plane can still answer while the workers leave — and removes local state. Your machines, disks and firewall rules are untouched. Node-local PersistentVolume data under `/opt/adhar-local-path` survives the reset; delete it yourself if you want the hosts clean.

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
| Certificates stay self-signed | No `dnsProvider`, or the apex does not resolve | Delegate the platform label to a DNS-01-capable provider, or supply your own certificate |

## See also

- [Providers Overview](/docs/providers/overview) — the shared model, storage classes and commands
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Production](/docs/operations/production) — hardening, HA and backups
- [Troubleshooting](/docs/reference/troubleshooting) — decoding node, volume and sync failures
