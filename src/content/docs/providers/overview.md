---
title: "Providers Overview"
section: "Cloud Providers"
order: 1
path: "/docs/providers/overview"
---

# Cloud Providers

The same Adhar binary and package stack target your laptop or any major cloud. You pick a target with a `provider:` in your [config file](/docs/getting-started/configuration) and run `adhar up -f config.yaml --env <name>`.

## Supported providers

| Provider | Key | Default model | Status |
|---|---|---|---|
| [Local (Kind)](/docs/providers/local-kind) | `kind` | Local containers | Exercised continuously by CI |
| [DigitalOcean](/docs/providers/digitalocean) | `digitalocean` | Droplets + kubeadm | Live-verified end to end |
| [AWS](/docs/providers/aws) | `aws` | EC2 + kubeadm | Render-verified |
| [Google Cloud](/docs/providers/gcp) | `gcp` | GCE + kubeadm | Live-verified (compute path) |
| [Azure](/docs/providers/azure) | `azure` | Azure VMs + kubeadm | Render-verified |
| [Civo](/docs/providers/civo) | `civo` | Instances + kubeadm | Render-verified |
| [Custom / on-prem](/docs/providers/custom) | `custom` | Your hosts + kubeadm | Render-verified |

New to clouds? Start with [DigitalOcean](/docs/providers/digitalocean) — it's the fully verified reference path.

## Two provisioning models

By default, every cloud provider builds a cluster from **raw compute + kubeadm** (Ubuntu instances, containerd, Cilium installed by the bootstrap). Managed Kubernetes is opt-in per provider:

```yaml
providers:
  aws:
    type: aws
    useManagedK8s: true      # EKS instead of EC2 + kubeadm
```

`useManagedK8s: true` selects EKS / AKS / GKE / DOKS / Civo k3s depending on the provider (`clusterMode: <service>` is the explicit spelling). Managed mode may require an extra CLI on your PATH (e.g. `aws`, `gke-gcloud-auth-plugin`).

## What every cloud needs

- **Credentials** — supplied via environment variables or workload identity, never committed to `config.yaml`.
- **A delegated DNS zone** (recommended) — `globalSettings.defaultHost` must be a subdomain you delegate to the cloud's DNS. Skipping DNS is supported: the platform runs on a self-signed certificate and cert-manager issues a trusted one automatically once DNS is fixed.
- **Quota** — enough vCPU/instances for your node pool and `maxWorkers`. New cloud accounts often ship with low default quotas.

> **DNS caveat — the apex must resolve.** Let's Encrypt reads CAA up the tree, so issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone, orders fail with `SERVFAIL looking up CAA`. Verify with `dig +short NS <host>` and `dig CAA <apex>`.

## Storage

Every self-managed cloud installs two StorageClasses; the default is node-local:

| Class | Provisioner | Default | For |
|---|---|---|---|
| `adhar-local` | `rancher.io/local-path` | ✅ | Everything that doesn't ask otherwise |
| `adhar-block` | the cloud's CSI driver | — | Volumes that must outlive their node |

The enabled packages request ~90 PVCs, which exceeds per-VM disk-attach limits on most clouds — hence the node-local default. Node-local volumes don't survive node loss. The per-VM volume-attach limit is usually the first capacity wall; add workers to relieve it.

## Shared commands

```bash
adhar up -f config.yaml --env dev --dry-run   # validate config; create nothing
adhar up -f config.yaml --env dev             # provision one environment
adhar get status                              # platform + package health
adhar cluster list --file config.yaml         # --file is REQUIRED
adhar cluster scale <cluster> --workers 8 -p <provider> -f config.yaml
adhar cluster upgrade <cluster> --version 1.37.2 -p <provider> -f config.yaml
adhar down -f config.yaml --env dev [--purge-orphaned-volumes]
```

> Always pass `--env <name>` — without it, `adhar up -f` provisions *every* environment in the file. `adhar cluster list/scale/upgrade/delete` and `down` require `--file` to reach the cloud at all. `KUBECONFIG` is written to `~/.adhar/clusters/<env>/kubeconfig`.

See [Configuration](/docs/getting-started/configuration) for the full config schema, then open your provider's page for credentials, a complete config, and the caveats that bite.
