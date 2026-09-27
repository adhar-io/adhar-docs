---
title: "Custom / On-Prem"
section: "Cloud Providers"
order: 8
path: "/docs/providers/custom"
---

# Custom / On-Prem

Point Adhar at machines you already own — bare metal, VMs, or another cloud's instances — and it installs Kubernetes over SSH with kubeadm.

## At a glance

| | |
|---|---|
| **Provider key** | `custom` |
| **Model** | kubeadm over SSH on machines you own (BYO) |
| **Managed option** | Not applicable |
| **Credentials** | SSH key to your hosts |
| **DNS / TLS** | You provide (LB/MetalLB + `dnsProvider`, or bring your own cert) |
| **Lifecycle** | Adhar never creates or deletes your machines; no autoscaling |
| **Verification** | ⚙️ Render-verified |
| **Best for** | Bare metal, on-prem, air-gapped, or existing clusters |

## Host requirements

- Ubuntu 24.04, reachable over SSH with a key you hold.
- A user with passwordless `sudo`.
- Hosts can reach each other on the cluster network and reach the internet for image pulls.
- Swap off; a Cilium-capable eBPF kernel.

Adhar **never creates or deletes these machines** — there's no autoscaling, and `adhar down` removes only the Kubernetes layer and local state.

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
  custom:
    type: custom
    region: on-prem            # a label only
    primary: true
    config:
      masterIPs:
        - 192.0.2.10           # exactly one control plane is supported today
      workerIPs:
        - 192.0.2.11
        - 192.0.2.12
        - 192.0.2.13
      sshUser: ubuntu
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
```

`nodeIPs` is a legacy alias for `workerIPs`; `username` for `sshUser`.

## Provision

```bash
./adhar up -f config.yaml --env dev --dry-run
./adhar up -f config.yaml --env dev
```

Create is the SSH bootstrap only — no VPC, load balancer, or volumes. Scaling moves the boundary within `workerIPs`:

```bash
adhar cluster scale dev --workers N     # joins the first N hosts, retires the rest
```

Add hosts to `workerIPs` first to grow past the list.

## Access & tear down

```bash
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
./adhar get status

./adhar down -f config.yaml --env dev   # runs kubeadm reset; your machines are never deleted
```

## You supply what a cloud otherwise provides

| Concern | What ships | What you add |
|---|---|---|
| **Ingress** | Cilium Gateway on node ports 30080/30443 | Your own LB/DNS in front, or MetalLB |
| **Storage** | local-path provisioner (node-local, not replicated) | Longhorn / Rook-Ceph / your SAN CSI before trusting the full catalogue with data |
| **DNS/TLS** | self-signed cert | Point `*.<defaultHost>` at your LB; for a trusted wildcard, delegate the platform host to a DNS-01 provider (`globalSettings.dnsProvider`) or bring your own cert |

Delegate only the platform label; leave the apex where it is (the CAA-up-the-tree caveat from the [Providers Overview](/docs/providers/overview) applies).
