---
title: "Civo"
section: "Cloud Providers"
order: 7
path: "/docs/providers/civo"
---

# Civo

Run Adhar on Civo with instances + kubeadm (default) or managed **Civo k3s** (opt-in). Civo is a fast, low-cost option.

## At a glance

| | |
|---|---|
| **Provider key** | `civo` |
| **Default model** | Instances + kubeadm (`cluster_mode: compute`) |
| **Managed option** | Civo k3s (`useManagedK8s: true` / `cluster_mode: k3s`) |
| **Credentials** | `CIVO_TOKEN` |
| **DNS / trusted TLS** | Civo DNS records only — no DNS-01 solver (use Cloudflare for a trusted wildcard) |
| **Verification** | ⚙️ Render-verified |
| **Best for** | Fast, low-cost clusters |

## Prerequisites

- A Civo **API token**.
- A Civo DNS zone for `defaultHost` — but note cert-manager has **no Civo DNS-01 solver**, so for a trusted wildcard use `dnsProvider: cloudflare`, or accept self-signed.
- Instance sizes/images differ per region — confirm with `civo instance size`.

```bash
export CIVO_TOKEN="…"
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
  civo:
    type: civo
    region: LON1
    primary: true
    useEnvironment: true
    config:
      cluster_mode: compute            # kubeadm on instances; "k3s" = Civo managed
      network_label: adhar-network
      reuse_existing_network: true
      cidr: 10.7.0.0/16
      size: g3.xlarge                  # check `civo instance size`
      disk_image: ubuntu-noble
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
      - { key: name,     value: adhar-mgmt }
      - { key: nodeSize, value: g3.xlarge }
      - { key: nodeCount, value: "3" }
    autoscaling:
      enabled: true
      minWorkers: 3
      maxWorkers: 10
```

### Trusted certificates on Civo

Because there's no Civo DNS-01 solver, delegate certificate + DNS duties to Cloudflare while the cluster stays on Civo:

```yaml
globalSettings:
  defaultHost: platform.example.com
  dnsProvider: cloudflare
providers:
  civo:
    token: "…"
    config:
      cloudflareApiToken: "…"  # Zone:Read + DNS:Edit on the zone
```

## Provision

```bash
export CIVO_TOKEN="…"
./adhar up -f config.yaml --env dev --dry-run
./adhar up -f config.yaml --env dev
```

## Access & tear down

```bash
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
./adhar get status

./adhar down -f config.yaml --env dev --purge-orphaned-volumes
```

Teardown removes instances, firewall, network, SSH key; CCM load balancers (matched by identity) and CSI volumes are swept before the network.

## Notes & gotchas

- Certificates are the one exception — no DNS-01 solver (use Cloudflare or self-signed).
- The volume-attach cap per instance is the likely capacity wall (`exceed max volume count`).
- Compute-mode cloud integration reads the API key from `kube-system/civo-api-access`; `civo-volume` is the default StorageClass.
