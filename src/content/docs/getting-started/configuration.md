---
title: "Configuration"
section: "Getting Started"
order: 5
path: "/docs/getting-started/configuration"
---

# Configuration

A local platform needs no configuration at all — `adhar up` has working defaults for everything. A cloud platform needs a file, and **that file describes the cluster, not the platform**: where it runs, how big it starts, and how far it may grow. What gets installed on top — Cilium, the Gateway, ArgoCD, Gitea, Crossplane and the package catalogue — comes from the platform stack in Git, never from here.

Keeping that line clear is the whole point of the config file. Infrastructure shape is a CLI-time decision; platform content is a GitOps decision. Mixing them is the most common way to end up with a cluster nobody can reproduce.

## At a glance

| | |
|---|---|
| **File** | `config.yaml` (any name), passed as `adhar up -f <file> --env <name>` |
| **Layers** | `globalSettings` → `providers` → `environmentTemplates` → `environments` |
| **Required top-level keys** | `globalSettings`, `providers`, `environmentTemplates`, `environments` |
| **Provider limit** | At most **2** providers; with exactly 2, one must set `primary: true` |
| **Validate without provisioning** | `adhar config validate ./config.yaml` |
| **See the merged result** | `adhar config view` · `adhar up -f … --env dev --dry-run` |
| **Secrets** | Never in this file — environment variables, credential files, workload identity, or External Secrets |

## The four-layer model

Each layer answers a different question, and they resolve from the outside in when you name an environment with `--env`:

```diagram
config-layers
```

Only the bottom two layers overlap, so "precedence" is really one question: when a template and an environment both set something, which wins?

| Field | How `--env dev` resolves it |
|---|---|
| `provider` | `env.provider` → else the provider with `primary: true` → else the first provider in the map |
| `region` | `env.region` → else `providers.<name>.region` |
| `type` | `env.type` → else `"non-production"` |
| `clusterConfig` | `[ …template entries… , …environment entries… ]` — appended in that order, **both kept in the list** |
| `coreServices` | The environment's block per service; the template fills gaps |
| `addons` | `[ …template addons… , …environment addons… ]` |
| `autoscaling` | The environment's **whole block**, else the template's — no field-by-field merge (see the pitfall below) |

Inspect the result rather than guessing: `adhar config view` prints the fully resolved configuration, and `adhar up -f config.yaml --env dev --dry-run` prints the resolved provider, region, type and the whole `clusterConfig` list **in resolution order**, then exits without creating anything.

### Worked example: the same key at two layers

`clusterConfig` is a *list* of `{key, value}` pairs, not a map. Merging appends the environment's entries after the template's, so a duplicated key leaves two entries in the list:

```yaml
environmentTemplates:
  nonprod-defaults:
    clusterConfig:
      - key: nodeSize
        value: s-2vcpu-4gb        # the shared default

environments:
  dev:
    type: non-production
    provider: digitalocean
    template: nonprod-defaults
    clusterConfig:
      - key: nodeSize
        value: s-8vcpu-16gb       # this environment wants bigger workers
```

Resolved, the list is `[nodeSize=s-2vcpu-4gb, nodeSize=s-8vcpu-16gb]` — template first, environment second. Two different readers then disagree:

| Reader | How it reads the list | Winner here |
|---|---|---|
| The provisioner that builds the cluster spec | Walks the whole list in order, assigning each match — **last wins** | `s-8vcpu-16gb` (the environment) |
| The `adhar-cluster-spec` ConfigMap the in-cluster autoscaler reads | Takes the **first** match for the key | `s-2vcpu-4gb` (the template) |

The cluster is created with the size you asked for, and then the autoscaler adds replacement workers at the template's size. Nothing errors; the fleet quietly becomes inconsistent.

> **Set a given `clusterConfig` key at exactly one layer.** Put shared, genuinely-shared values in the template; put anything an environment overrides *only* in the environment, and delete it from the template. This is the single most valuable habit on this page.

The provisioner also folds key spellings — case and separators are ignored, so `node_count`, `nodeCount` and `NodeCount` are one key. The ConfigMap reader matches literally. Pick one spelling per file and keep it.

## globalSettings

Flat, and required. Validation rejects a config missing `adharContext`, `defaultHost` or `email`, or with a port outside 1–65535.

| Key | Meaning |
|---|---|
| `adharContext` | kube-context name prefix and Cilium cluster name (e.g. `adhar-mgmt`) |
| `defaultHost` | The DNS zone. Every URL is `<app>.<defaultHost>`, and the wildcard certificate covers `*.<defaultHost>` |
| `defaultHttpPort` / `defaultHttpsPort` | `80` / `443` behind a cloud load balancer, so URLs carry no port |
| `enableHAMode` | ArgoCD ×2 with HA Redis and PDBs, CNPG for Gitea, Crossplane HA |
| `email` | Let's Encrypt (ACME) account address — required, because certificates are |
| `dnsProvider` | Edge DNS backend for external-dns and DNS-01 wildcard certificates. Empty means the environment's cloud. One of `none`, `digitalocean`, `aws`, `gcp`, `azure`, `civo`, `cloudflare` |
| `productionProvider` / `nonProductionProvider` | Default provider per environment `type`, when an environment names none |

`dnsProvider: none` disables edge DNS and leaves TLS self-signed — correct for an air-gapped or internal cluster, wrong for anything a browser visits.

## providers

| Key | Meaning |
|---|---|
| `type` | One of `aws`, `azure`, `gcp`, `digitalocean`, `civo`, `custom`, `kind` |
| `region` | Required for every provider |
| `primary` | The management cluster's provider. Only the primary cloud's Crossplane providers are installed |
| `useEnvironment` | Read credentials from the provider's environment variables instead of the file |
| `credentials_file` | Path to an existing credentials file (`~/.aws/credentials`, a GCP service-account key, …) |
| `useManagedK8s` / `clusterMode` | Use the cloud's managed Kubernetes (EKS, AKS, GKE, DOKS, Civo k3s) instead of the default: raw compute with kubeadm. Everything above the cluster is identical |
| `config` | Provider-specific block — VPC CIDRs, machine images, disk and firewall settings. Shape varies per provider |

> **At most two providers, and the count changes the rules.** One provider handles everything and needs no `primary`. Exactly two requires precisely one `primary: true` — the other carries workloads. Three or more is rejected outright by validation.

## environmentTemplates

At least one template must exist, each must have a non-empty `clusterConfig`, and each must have a non-empty `coreServices`. Every environment must reference one by name.

> **`coreServices` here is recorded, not executed.** The foundation ships as manifests embedded in the binary, so the chart coordinates in this block are validated, echoed by `--dry-run`, and otherwise inert on the provisioning path. They exist because validation requires them. Do not spend time tuning versions here; change the foundation through the platform stack instead.

## environments

`--env <name>` picks one of these. Each needs a `type` of `production` or `non-production`, a `template` reference, and a non-empty `clusterConfig`.

### clusterConfig keys the provisioner reads

| Key (and accepted aliases) | Effect |
|---|---|
| `name`, `clusterName` | Platform/tag name. The cluster itself is named after the environment |
| `nodeCount`, `numNodes`, `workerReplicas` | Worker count at creation; the autoscaler grows from here |
| `nodeSize`, `machineType`, `instanceType`, `nodeInstanceType` | Worker machine type; overrides the provider's own default size |
| `controlPlaneReplicas` | Control-plane node count |
| `kubeVersion`, `version` | Pin Kubernetes for this environment |
| `podCIDR`, `podNetworkCIDR` | Move off the default `10.244.0.0/16` — required if the cluster will join a Cilium Cluster Mesh |
| `clusterMeshId`, `clusterMeshName`, `clusterMeshApiServer`, `clusterMeshServiceType`, `clusterMeshNodePort` | Cilium Cluster Mesh wiring |

Two keys behave in ways worth knowing before you hit them:

- **`oidcAuth` is rejected, deliberately.** Setting it would point the kube-apiserver at a Keycloak that does not exist yet during `kubeadm init`, and the apiserver then fails to start at all. Provisioning stops with an error saying so. Enable OIDC as a day-2 step instead.
- **`autoScale`, `minNodes` and `maxNodes` in `clusterConfig` are inert.** They appear in some scaffolded files but the provisioner never reads them. Autoscaling lives in the `autoscaling:` block below.

### autoscaling

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `false` | Turn the node autoscaler on |
| `minWorkers` | `1` | Floor — your availability baseline |
| `maxWorkers` | `5` | Ceiling — your spend limit |
| `nodeGroup` | `workers` | The provider node group to scale |
| `scaleDownUtilizationThreshold` | `"50%"` | Cluster CPU **and** memory must both stay under this before a worker is removed |
| `scaleDownDelay` | `"10m"` | How long it must stay under before a worker is drained |
| `scaleUpCooldown` | `"3m"` | Minimum gap between two node additions |

> **`autoscaling` does not merge field by field.** If the environment declares the block at all, the template's block is discarded whole — including fields the environment left out, which fall back to the built-in defaults rather than the template's values. Declare the complete block wherever you declare it.

## A minimal cloud config

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com   # a zone you delegate to this cloud, before you run
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: true
  email: admin@example.com

providers:
  digitalocean:
    type: digitalocean
    region: blr1
    primary: true
    useEnvironment: true              # token from DIGITALOCEAN_TOKEN
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
      - { key: nodeCount, value: "2" }
    autoscaling:
      enabled: true
      minWorkers: 2
      maxWorkers: 4
```

Scaffold, check and provision:

```bash
adhar config create --provider digitalocean --region blr1   # writes ./config.yaml
adhar config validate ./config.yaml                         # schema + provider rules
adhar up -f config.yaml --env dev --dry-run                 # resolve and preview only
adhar up -f config.yaml --env dev                           # provision
```

> **Always pass `--env <name>`.** Without it, `adhar up -f config.yaml` provisions *every* environment in the file — including a leftover sample block sized for another cloud, which will create an orphan machine and then fail. The same applies to `adhar down -f config.yaml`.

## Kubernetes version precedence

Highest wins: an explicit `adhar up --kube-version` → the environment's `kubeVersion`/`version` → the compiled-in default, **v1.37.0**. The flag carries the default as its own default value, so only an *explicitly passed* flag overrides what the environment configured. Nodes joining later take the running control plane's version, so a cluster cannot skew.

## Secrets do not belong in this file

`config.yaml` is meant to live in version control next to the code it provisions. Treat it as public. Credentials reach the platform by one of these routes instead:

| Need | Use |
|---|---|
| Cloud credentials at provisioning time | `useEnvironment: true` plus the provider's variables — `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, `AZURE_CLIENT_ID`/`AZURE_CLIENT_SECRET`/`AZURE_TENANT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `DIGITALOCEAN_TOKEN` (or `DIGITALOCEAN_ACCESS_TOKEN`), `CIVO_TOKEN`, `CLOUDFLARE_API_TOKEN` |
| Credentials already on disk | `credentials_file: ~/.aws/credentials` — a path, not a value |
| No long-lived credential at all | Workload identity: `useInstanceRole` (AWS), `useManagedIdentity` / `useAzureCLI` (Azure), `useApplicationDefault` / `useComputeMetadata` (GCP) |
| Anything your applications need at runtime | External Secrets reading from the platform's secrets backend — Git carries the pointer, the backend carries the value |

The inline credential fields (`token`, `accessKeyId`, `secretAccessKey`, `clientSecret`, …) exist for throwaway experiments only. They are also stripped before the provider settings are published in-cluster, along with credential *file paths* — a laptop path means nothing to a controller running in a pod, and a provider that preferred it over the credential it was given could never scale the cluster again.

## Changing what the platform ships

Cluster shape is this file. Platform content is not: enabling a package edits the stack and is converged by `adhar upgrade`.

```bash
adhar stack list                 # the catalogue, with enablement and live state
adhar stack enable harbor        # edits the stack files; nothing is pushed for you
adhar upgrade --diff-only        # review exactly what would change
adhar upgrade                    # converge
```

## Next steps

- **[Cloud Providers](/docs/providers/overview)** — per-cloud credentials, quotas, DNS and complete configs
- **[Customization](/docs/operations/customization)** — packages, chart values, and the platform's extension points
- **[Production](/docs/operations/production)** — HA sizing, TLS, backups and upgrades
