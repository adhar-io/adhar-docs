---
title: "Custom / On-Prem"
section: "Cloud Providers"
order: 8
path: "/docs/providers/custom"
---

# Custom / On-Prem

Run Adhar on machines you already own: bare metal, VMs, or another cloud's instances. Adhar installs Kubernetes on them over SSH with kubeadm, then installs the platform. This page is for teams on-prem, air-gapped, or on hardware Adhar has no provider for.

**Adhar owns the Kubernetes layer on these hosts and never the hosts themselves.** It builds, joins, drains, upgrades and resets nodes. It never creates, resizes or deletes a machine.

> **Status:** `status:in-progress` — the provider is implemented and shares its kubeadm flow with the cloud providers, but has not yet been run end to end on bring-your-own hosts. Treat a first deployment as a bring-up exercise.

## At a glance

| | |
|---|---|
| **Provider key** | `custom` |
| **Status** | `status:in-progress` |
| **Model** | kubeadm over SSH on machines you own |
| **Cluster modes** | `compute` (this page) · `provided` = install onto a cluster that already exists · no `managed` |
| **Control plane** | Exactly one host; HA control planes are not implemented |
| **Credentials** | A passphrase-less SSH key; root or passwordless sudo on every host |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **Edge** | Host-network Gateway: Envoy binds :80/:443 on every host |
| **DNS / TLS** | A `dnsProvider` publishes every host's IP and issues a DNS-01 wildcard; or your own DNS and certificate |
| **Default StorageClass** | `local-path` (node-local, not replicated) |
| **Lifecycle** | No autoscaling; `adhar down` runs `kubeadm reset` and leaves your machines |
| **Best for** | Bare metal, on-prem, air-gapped, or hardware Adhar has no provider for |

## Topology

```diagram
npa-custom-topology
```

Compared with a cloud, the difference is what is missing: no VPC, no load-balancer API, no block storage, no DNS zone. Creating the cluster is the SSH bootstrap only.

Nothing can hand the Gateway a load-balancer address, so the platform runs it on the **host network**: Envoy binds ports 80 and 443 on every node, and no Gateway `Service` is created. With a `dnsProvider` set, external-dns publishes the IP of every host (control plane included) as the platform's A records.

```diagram
pv-custom-ownership
```

### Build a cluster, or adopt one

- **`clusterMode: compute`** (the default, and the subject of this page) builds the cluster on your hosts.
- **`clusterMode: provided`** installs onto a cluster that **already exists**, through your kubeconfig. Adhar creates nothing, and `adhar down` deletes nothing. See [Provided mode](#provided-mode-an-existing-cluster).
- There is no `managed` mode. Do not set `clusterMode: managed` here: it is not rejected, and builds a kubeadm cluster as `compute` does.

## Prerequisites

### Hosts

| Requirement | Why |
|---|---|
| **Ubuntu 24.04** | The node-prep script is written against it (apt, containerd, `pkgs.k8s.io`) |
| **Root, or passwordless `sudo`** | Every command runs as root; Adhar checks `id -u` on each host and refuses otherwise |
| **A passphrase-less SSH key, port 22** | Passphrase-protected keys are rejected; `sshPort` is legacy and only 22 is supported |
| **A kernel supporting the Cilium eBPF data path** | Cilium is the CNI and the Gateway data path, with `kubeProxyReplacement` |
| **An empty `/etc/cni/net.d`** | No CNI is installed at `kubeadm init`; a leftover config competes with Cilium |
| **Outbound internet, or a mirror** | Node prep installs packages and pulls the platform's images |
| **Unrestricted host-to-host reachability** | etcd, the kubelet API and Cilium's VXLAN/Geneve and health traffic run between nodes |

Node prep handles swap, kernel modules, sysctls and resolver configuration. Do not pre-configure them.

### Network

| Path | Ports |
|---|---|
| The machine running `adhar` → every host | TCP 22 |
| The machine running `adhar` and all nodes → control plane | TCP 6443 |
| Node ↔ node | all TCP/UDP/ICMP, unrestricted |
| Clients, or your load balancer → every node | TCP 80, 443 (the host-network Gateway) |

The pod CIDR (default `10.244.0.0/16`) must not overlap your LAN or any cluster you plan to mesh with.

### Sizing

No autoscaler can rescue an undersized cluster here, so size it up front:

| Role | Shape | Why |
|---|---|---|
| Control plane | 2 vCPU / 16 GiB minimum, dedicated; prefer 4 vCPU | It stays tainted `NoSchedule`, but etcd and the API server need the memory |
| Workers | 4 vCPU / 32 GiB each, at least two | With one worker, drains and evictions have nowhere to go. A curated profile is comfortable on three or four workers; the full catalogue needs about six 8-vCPU workers |
| Disk | 256 GiB per node | The containerd image cache alone is about 35 GiB, and every PersistentVolume is a directory on the same filesystem. Too small, and the kubelet takes a `disk-pressure:NoSchedule` taint |

### Check readiness

Adhar checks SSH access and root on every host. Run the same checks yourself first:

```bash
for ip in 192.0.2.10 192.0.2.11 192.0.2.12 192.0.2.13; do
  ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes ubuntu@$ip 'echo connection-ok; sudo -n id -u'
done
```

**Check:** every host prints `connection-ok` and `0`.

### DNS and TLS

`*.<defaultHost>` must resolve to the hosts, or to your load balancer in front of them. Two routes lead to a publicly trusted wildcard certificate:

1. **Delegate the platform host to a DNS service the platform can solve DNS-01 with**: `digitalocean`, `aws`, `gcp`, `azure`, `civo` or `cloudflare`. Set `globalSettings.dnsProvider` to it, with that provider's credentials. The cluster stays on your hosts; only the zone lives there. Cloudflare is the lightest (one API token). external-dns then publishes every host's IP. DNS-01 never contacts the cluster, so this also works for a cluster unreachable from the internet.
2. **Bring your own certificate.** Leave `dnsProvider` unset, point the records at the hosts or your load balancer yourself, and replace the platform certificate Secret with yours.

If your hosts sit behind NAT or your own load balancer, the host IPs are not the addresses clients should use. Manage the records yourself in that case.

Either way, delegate **only the platform label** at your registrar and leave the apex where it is. Let's Encrypt reads CAA records up the tree; a registrable domain delegated to nameservers holding no zone makes every order fail with `SERVFAIL looking up CAA`.

**Check:** `dig +short NS platform.example.com` returns the DNS provider's nameservers, and `dig +noall +comment CAA example.com` says `NOERROR`.

## Configure

There is no shipped example file for compute mode. Start from this configuration:

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: true                 # platform HA (replicas), not control-plane HA
  email: admin@example.com
  # dnsProvider: cloudflare          # optional; see DNS and TLS

providers:
  custom:
    type: custom
    region: on-prem                  # a label only; nothing is looked up from it
    primary: true
    config:
      masterIPs:
        - 192.0.2.10                 # exactly one control plane is supported
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
      - { key: name,      value: adhar-mgmt }   # recorded; the cluster is named `adhar` unless --name
      - { key: nodeCount, value: "3" }          # keep equal to the number of workerIPs
      # - { key: podCIDR, value: 10.244.0.0/16 }   # must not overlap your LAN
```

### Key fields

| Field | Meaning |
|---|---|
| `masterIPs` | The control-plane host. More than one entry is rejected with `exactly one control-plane host is supported`. |
| `workerIPs` | The worker hosts. Create joins every host in the list, whatever `nodeCount` says. `nodeIPs` is a legacy alias (its first entry becomes the control plane). |
| `sshUser` | `root`, or a user with passwordless sudo. `username` is a legacy alias. |
| `sshKeyPath` | Path to a passphrase-less private key. Required. |

### Dry run

```bash
adhar up -f config.yaml --env dev --dry-run
```

This prints the resolved environment, provider, region and cluster shape. It validates the config only and touches no host.

## Deploy

```bash
adhar up -f config.yaml --env dev
```

```diagram
npa-custom-sequence
```

The `custom` provider has no deep preflight, so quota and permissions are not checked; the run relies on the SSH and root checks. The `Cloud cluster` stage is then the SSH bootstrap:

1. **Node prep** on each host in turn: apt installs, containerd, the pinned kubeadm stream. Each host has a 20-minute timeout.
2. **`kubeadm init`** on the control plane, with kube-proxy skipped.
3. **`kubeadm join`** on the workers.

With `--verbose`, the lines look like this:

```text
Preparing host 192.0.2.10 (containerd + kubeadm 1.37)
Worker 192.0.2.11 is already part of the cluster; skipping join
Cluster "adhar" is up: API https://192.0.2.10:6443 (3 workers).
Nodes stay NotReady until the platform bootstrap installs Cilium.
```

`NotReady` at that point is correct: no CNI is installed at `kubeadm init`. The bootstrap installs Cilium next, and the nodes turn Ready. The rest of the checklist is the same as on every cloud: Cilium & Gateway, ArgoCD, Gitea, GitOps repos, Crossplane, GitOps sync.

The catalogue keeps converging after the CLI returns; that is expected. `--apps-timeout` (default 15m) limits only how long the CLI waits.

**Re-running is safe.** Node prep is guarded by a completion marker, `kubeadm init` is skipped on an initialised control plane, and a worker already in the node list is not re-joined. Adding hosts to `workerIPs` and re-running grows the cluster.

### What Adhar installs on your hosts

| Installs | Detail |
|---|---|
| containerd | systemd cgroup driver; `certs.d` host config enabled |
| kubeadm, kubelet, kubectl | From the pinned `pkgs.k8s.io` minor stream for the target version |
| Kernel and systemd tuning | `overlay`/`br_netfilter`, IP forwarding, raised inotify and file limits, swap off |
| Resolver hardening | `/etc/resolv.conf` pinned to real upstreams, so image pulls do not depend on the local `systemd-resolved` stub |
| The cluster | `kubeadm init` with **kube-proxy skipped**, workers joined, kubelet `maxPods` raised to 250 |
| Cilium | `kubeProxyReplacement`; also the Gateway data path, on the host network at :80/:443 |
| Storage | The local-path provisioner, with `local-path` as the default StorageClass |
| The platform | ArgoCD, Gitea, the GitOps stack and the package catalogue, as on every provider |

It leaves alone your machines, firewall and iptables rules (including after a reset), load balancers, block storage, DNS zones and certificates.

### What you supply

| Concern | What ships | What you add |
|---|---|---|
| **Ingress** | Cilium Gateway on the host network, :80/:443 on every node | Optionally your own load balancer in front of the nodes |
| **Storage** | local-path provisioner (node-local, not replicated, no online expansion) | Longhorn, Rook/Ceph or your SAN's CSI before trusting it with data |
| **DNS / TLS** | A self-signed certificate | A `dnsProvider`, or your own records and certificate |
| **Backups** | Velero and CNPG target object storage | An S3-compatible endpoint they can reach |

## Verify

If you use a load balancer, point it at ports 80 and 443 on every node first. Then:

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig     # or: kubectl config use-context adhar
kubectl get nodes                                        # every host Ready
kubectl -n kube-system get pods -l k8s-app=cilium        # Cilium agents Running
kubectl get storageclass                                 # local-path (default)
curl -skI https://console.platform.example.com | head -1 # through DNS or your LB
adhar get status                                       # platform conditions + per-package health
adhar get apps                                         # application sync/health
```

## Access

Log in at `https://console.<defaultHost>`. Your username is your email. Get credentials with:

```bash
adhar get secrets
```

Without a `dnsProvider` or your own certificate, the platform serves a self-signed certificate and browsers warn. Login, groups and roles are the same on every provider; see [Accessing the Platform](/docs/operations/accessing-the-platform).

## Operate

```bash
adhar cluster list --file config.yaml     # the cluster is `adhar` unless you passed --name
```

### Scale

Scaling does not create machines. It moves the cluster boundary within `workerIPs`:

```bash
adhar cluster scale adhar --workers 3 --node-group workers -p custom -f config.yaml
```

- **Up:** joins the first N hosts that are not yet members (node prep plus `kubeadm join`).
- **Down:** retires the hosts beyond N (drain, delete the Node, `kubeadm reset`).
- **Past the list:** add hosts to `workerIPs` first.

Removing a node group outright is not supported. Drain and reset the nodes, then drop their IPs from the list. `minWorkers` and `maxWorkers` have no effect: there is no autoscaling.

### Upgrade

```bash
adhar upgrade --name dev --diff-only                                    # preview the stack diff
adhar upgrade --name dev --yes                                          # converge foundation + stack
adhar cluster upgrade adhar --version 1.37.2 -p custom -f config.yaml   # Kubernetes itself
```

The Kubernetes upgrade runs on the control plane first, then the workers. The `AdharPlatform` resource is named after the environment you provisioned; find it with `kubectl -n adhar-system get adharplatform`.

### Tear down

```bash
adhar down -f config.yaml --env dev
```

`adhar down` shows what it will delete and asks you to type `yes` (skip with `--force`). If you passed `--name` to `adhar up`, pass the same `--name` here.

> **Warning:** With `isolation: namespace`, every environment shares this one cluster, so tearing down `dev` removes the platform for `test` and `prod` too.

On `compute`, teardown runs `kubeadm reset -f` and clears `/etc/cni/net.d` on every host: workers first, the control plane last. Then it removes local state.

Your machines, disks and firewall rules are untouched. Node-local PersistentVolume data written by the local-path provisioner (by default under `/opt/local-path-provisioner`) survives the reset; delete it yourself if you want the hosts clean. Your own load balancer and DNS records are yours to remove.

### Provided mode: an existing cluster

When the cluster already exists, start from `examples/provided-config.yaml`:

```yaml
providers:
  custom:                            # or the cloud that hosts your DNS zone
    type: custom
    primary: true
    clusterMode: provided
    kubeconfig: ~/.kube/config       # default: $KUBECONFIG, then ~/.kube/config
    kubeContext: my-existing-cluster # default: the file's current context — name it explicitly
```

Preflight checks the cluster before anything is installed:

| Requirement | If missing |
|---|---|
| Kubernetes ≥ 1.28, cluster-admin through that kubeconfig | **fail** |
| Cilium with `gatewayAPI.enabled=true`, **or no CNI at all** | **fail** — another CNI (Calico, Flannel, the AWS VPC CNI, kindnet, …) is refused, not replaced |
| At least one node | **fail** |
| A default StorageClass | warn — this mode installs no provisioner |

In provided mode:

- An existing Cilium is left as configured.
- `region:` is not required, and sizing keys are inert.
- The autoscaler does not act, and `--recreate` is refused.
- `adhar down` deletes nothing. To remove the platform, run `kubectl delete adharplatform --all -n adhar-system`.

> **Note:** With the provider key `custom`, the Gateway runs on the host network (:80/:443 on every node) in provided mode too. Check that those ports are free, or use the key of the cloud that hosts your DNS zone.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `SSH key … is passphrase-protected` | The provider supports passphrase-less keys only | Use a dedicated passphrase-less key, held securely |
| `root access check failed on host … (is passwordless sudo configured …?)` | `sudo` needs a password | Configure passwordless `sudo` for `sshUser`, or use `root` |
| `at least one control-plane host IP is required (masterIPs)` | `masterIPs` is missing or empty | Set `masterIPs` under the provider's `config:` block |
| `exactly one control-plane host is supported` | More than one entry in `masterIPs` | Use one; HA control planes are not implemented |
| Nodes `NotReady` right after create | No CNI yet — expected | Wait for the bootstrap to install Cilium |
| Nodes still `NotReady` after Cilium installs | A leftover config in `/etc/cni/net.d`, or a kernel too old for the eBPF data path | Remove the stale config and re-run; check the Cilium agent logs |
| Node count does not match `nodeCount` | Create joins every host in `workerIPs` | Keep them equal, or scale explicitly |
| Node prep times out | apt or registry access is slow or blocked; the timeout is 20 minutes per host | Use a local mirror, then re-run — prep is idempotent |
| Image pulls fail with `connection refused on 127.0.0.53` | The local resolver stub died | Node prep pins `/etc/resolv.conf` to real upstreams; re-run prep on that host |
| Pods `Pending` on `volume node affinity conflict` | A node-local volume is bound to a node that changed | Install a replicated CSI for stateful workloads |
| Provided mode refused: different CNI | The cluster runs Calico, Flannel or another CNI | Remove it, or let Adhar build a cluster with `compute` |
| Certificates stay self-signed | No `dnsProvider`, or the apex does not resolve | Delegate the platform label to a DNS-01-capable provider, or supply your own certificate |

## Next steps

- [Providers Overview](/docs/providers/overview) — the shared model, cluster modes and the comparison table
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Production](/docs/operations/production) — hardening, HA and backups
- [Troubleshooting](/docs/reference/troubleshooting) — decoding node, volume and sync failures
