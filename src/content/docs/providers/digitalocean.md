---
title: "DigitalOcean"
section: "Cloud Providers"
order: 3
path: "/docs/providers/digitalocean"
---

# DigitalOcean

DigitalOcean is Adhar's **live-verified reference provider** — the full 76-package production profile has been brought up end to end on it. If you're deploying to a cloud for the first time, start here.

## At a glance

| | |
|---|---|
| **Provider key** | `digitalocean` |
| **Default model** | Droplets + kubeadm |
| **Managed option** | DOKS (`useManagedK8s: true`) |
| **Credentials** | `DIGITALOCEAN_ACCESS_TOKEN` |
| **DNS / trusted TLS** | DigitalOcean DNS + DNS-01 wildcard ✅ |
| **Verification** | ✅ Live-verified end to end (76/76 apps healthy) |
| **Provision time** | ~13 min |
| **Best for** | Your first cloud deployment — the proven reference path |

## Prerequisites

- A DigitalOcean **API token** with read/write on droplets, VPCs, firewalls, load balancers, block storage, SSH keys, and DNS (plus Kubernetes if you'll use DOKS or Crossplane workload clusters).
- A **DNS zone hosted in DigitalOcean DNS** for your `defaultHost` (nameservers `ns1/ns2/ns3.digitalocean.com`). Optional — skip it to run on a self-signed cert.
- `adhar`, `kubectl`, and a repo checkout.

```bash
export DIGITALOCEAN_ACCESS_TOKEN="dop_v1_…"   # DIGITALOCEAN_TOKEN also accepted
```

## Configuration

```yaml
globalSettings:
  adharContext: adhar-mgmt              # kube-context prefix and Cilium cluster name
  defaultHost: platform.example.com     # your DigitalOcean-hosted zone
  defaultHttpPort: 80
  defaultHttpsPort: 443                 # behind a cloud LB, so URLs carry no port
  enableHAMode: true                    # ArgoCD 2x + redis-ha 3x, CNPG 2 instances, PDBs
  email: admin@example.com              # Let's Encrypt (ACME) account

providers:
  digitalocean:
    type: digitalocean
    region: blr1
    primary: true                       # only the primary cloud's Crossplane providers install
    useEnvironment: true                # token from DIGITALOCEAN_ACCESS_TOKEN
    # useManagedK8s: true               # opt-in DOKS instead of kubeadm on droplets
    config:
      reuse_existing_vpc: true
      vpc_cidr: 10.3.0.0/16
      droplet_size: s-8vcpu-16gb
      image: ubuntu-24-04-x64
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
    provider: digitalocean
    template: nonprod-defaults
    clusterConfig:
      - { key: name,      value: adhar-mgmt }     # droplets are adhar-<env>-<role>-<n>
      - { key: nodeSize,  value: s-8vcpu-16gb }
      - { key: nodeCount, value: "3" }
    autoscaling:
      enabled: true
      minWorkers: 3
      maxWorkers: 10
```

## Provision

```bash
git clone https://github.com/adhar-io/adhar.git && cd adhar
make build                                       # produces ./adhar
cp examples/digitalocean-config.yaml config.yaml
./adhar up -f config.yaml --env dev --dry-run    # resolves config, creates nothing
./adhar up -f config.yaml --env dev              # ~13 min to a usable platform
```

## Access

```bash
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
kubectl get nodes
./adhar get status
./adhar get secrets -p argocd
```

Log in at `https://console.platform.example.com`. **Your username is your email** (e.g. `user1@noreply.com`, not `user1`) because the realm sets `registrationEmailAsUsername: true`. Keycloak group → Kubernetes role:

| Group | Kubernetes role |
|---|---|
| `platform-admin` / `platform-engineer` | `cluster-admin` |
| `platform-developer` | `edit` |
| `platform-viewer` | `view` |
| `application-admin` | `admin` |

## Day-2 operations

```bash
adhar cluster scale dev --workers 10 -p digitalocean -f config.yaml
adhar upgrade --diff-only
adhar upgrade --yes
adhar up -f config.yaml --env dev --recreate --force
```

## Tear down

```bash
adhar down -f config.yaml --env dev --purge-orphaned-volumes
# or a single cluster:
adhar cluster delete dev --force -f config.yaml --purge-orphaned-volumes
```

Removes, in order: CCM LoadBalancer(s), droplets, block volumes tagged `adhar-cluster-<env>`, firewall, VPC, SSH key, local state. DNS records are left in place (external-dns is upsert-only). Verify with `doctl`.

## Notes & gotchas

- The cluster is named after the **environment** (`dev`), not `clusterConfig.name`.
- A **scoped** DO token returns 401 on `/v2/account` and `/v2/projects` — never judge a token by `doctl account get`; probe droplets instead.
- `doctl` ignores `-t`/`DIGITALOCEAN_ACCESS_TOKEN` when its config has a `context:` — use `doctl --context default -t "$TOKEN"`.
- Historic **7 block volumes per droplet** limit; node-local storage is the default to avoid it, and the autoscaler treats `exceed max volume count` as a scale-up trigger.
- Only the primary cloud's Crossplane providers install (all five clouds ≈ 3000 CRDs would overwhelm one control plane).
