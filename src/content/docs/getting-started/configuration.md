---
title: "Configuration"
section: "Getting Started"
order: 5
path: "/docs/getting-started/configuration"
---

# Configuration

Locally, Adhar needs no configuration — `adhar up` just works. For clouds and production you describe the target in an `adhar-config.yaml` and pass it with `-f`. This page covers the CLI flags you'll use most and the shape of the config file. For the full per-cloud detail, see [Cloud Providers](/docs/providers/overview).

## Common `adhar up` flags

| Flag | Purpose |
|---|---|
| `-f, --file <cfg>` | Provision from a config file (cloud / production) |
| `--env <name>` | Target one environment in that file (always pass this) |
| `--recreate` | **Destructive** — delete the existing cluster first |
| `--port <n>` | HTTPS host port (default 8443); HTTP derives as n − 363 |
| `--host <name>` | Platform host name (default `adhar.localtest.me`) |
| `--kube-version <v>` | Kubernetes version for any provider (default v1.37.0) |
| `--ha` | Render the foundation in HA mode |
| `-d, --dry-run` | Validate config and preview — create nothing |
| `--dev-password` | Set ArgoCD and Gitea admin passwords to `developer` |

> **Always pass `--env <name>`** with a config file. Without it, `adhar up -f config.yaml` provisions *every* environment in the file.

## The config file, layer by layer

Configuration resolves through four layers, each overriding the previous. Never put secrets in `config.yaml` — reference them through External Secrets, environment variables, or workload identity.

```text
globalSettings          # context, default host, ports, HA mode, ACME email
  └─ providers          # per-cloud credentials & infrastructure
      └─ environmentTemplates   # reusable defaults (prod-defaults, nonprod-defaults)
          └─ environments       # named instances (dev, staging, production)
```

### globalSettings

| Key | Meaning |
|---|---|
| `adharContext` | kube-context prefix and Cilium cluster name (e.g. `adhar-mgmt`) |
| `defaultHost` | The DNS zone — every hostname is `<app>.<defaultHost>`; the wildcard cert covers `*.<defaultHost>` |
| `defaultHttpPort` / `defaultHttpsPort` | e.g. `80` / `443` |
| `enableHAMode` | ArgoCD ×2 + HA Redis + PDBs, CNPG for Gitea, Crossplane HA |
| `email` | ACME (Let's Encrypt) registration address |
| `dnsProvider` | Usually derived from the provider; set to override (`digitalocean`, `aws`, `gcp`, `azure`, `cloudflare`, `civo`, `none`) |

### A minimal cloud config

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com   # a DNS zone you delegate to this cloud
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: true
  email: admin@example.com

providers:
  digitalocean:
    type: digitalocean
    region: blr1
    primary: true
    useEnvironment: true              # token from DIGITALOCEAN_ACCESS_TOKEN
    config:
      droplet_size: s-8vcpu-16gb
      image: ubuntu-24-04-x64

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
      - { key: name,      value: adhar-mgmt }
      - { key: nodeSize,  value: s-8vcpu-16gb }
      - { key: nodeCount, value: "3" }
    autoscaling:
      enabled: true
      minWorkers: 3
      maxWorkers: 10
```

Provision it:

```bash
adhar up -f config.yaml --env dev --dry-run   # validate, create nothing
adhar up -f config.yaml --env dev             # provision
```

### clusterConfig keys

Matched ignoring case and separators (`node_count` ≡ `nodeCount`): `name`, `nodeSize` (or the provider's `machineType`/`vmSize`/`droplet_size`/`instance_type`), `nodeCount`, `kubeVersion`/`version`, `podCIDR`, `autoScale`, and Cilium cluster-mesh keys.

### autoscaling

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `false` | Turn the autoscaler on |
| `minWorkers` | `1` | Floor (your HA baseline) |
| `maxWorkers` | `5` | Ceiling — your spend limit |
| `scaleUpUtilizationThreshold` | `"90%"` | CPU or memory at/above this adds a worker |
| `scaleDownUtilizationThreshold` | `"50%"` | CPU and memory must both stay under this |
| `scaleDownDelay` | `"10m"` | Time under threshold before draining |
| `scaleUpCooldown` | `"3m"` | Minimum gap between additions |

## Kubernetes version precedence

Highest wins: `adhar up --kube-version` → the environment's `kubeVersion`/`version` → the compiled-in default (**v1.37.0**). Nodes added later take the running control plane's version, so a cluster can't skew.

## Enabling more packages

Turning a package on is a platform change — edit the stack and run `adhar upgrade`. See [Customization](/docs/operations/customization) for the full workflow, or use the CLI:

```bash
adhar stack list             # the catalogue: enabled or not
adhar stack enable harbor    # edit the stack
adhar upgrade --diff-only    # preview
adhar upgrade                # apply
```

## Next steps

- **[Cloud Providers](/docs/providers/overview)** — per-cloud credentials, quotas, and full configs
- **[Customization](/docs/operations/customization)** — packages, values, environments, and extension points
- **[Production](/docs/operations/production)** — HA sizing, DNS/TLS, backups
