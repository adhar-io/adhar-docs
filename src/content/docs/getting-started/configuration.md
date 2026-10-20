---
title: "Configuration"
section: "Getting Started"
order: 5
path: "/docs/getting-started/configuration"
---

# Configuration

A local platform needs no configuration at all. `adhar up` has working defaults for everything. A cloud platform needs a file, and **that file describes the cluster, not the platform**. It says where the cluster runs, how big it starts, and how far it may grow. What gets installed on top comes from the platform stack in Git, never from this file. That includes Cilium, the Gateway, ArgoCD, Gitea, Crossplane and the package catalogue.

Keeping that line clear is the whole point of the config file. You decide the infrastructure shape when you run the CLI. You decide the platform content through GitOps. Mixing the two is the most common way to end up with a cluster nobody can reproduce.

```diagram
ds-config-boundary
```

This page is for anyone moving a platform off the laptop. It explains:

- the four layers of the file and how they merge
- every key the provisioner actually reads (and the ones it silently ignores)
- where secrets go instead

By the end, you will be able to write a config for your cloud, prove it is valid, see exactly what it resolves to, and provision from it.

## At a glance

| | |
|---|---|
| **File** | `config.yaml` (any name), passed as `adhar up -f <file> --env <name>` |
| **Layers** | `globalSettings` → `providers` → `environmentTemplates` → `environments` |
| **Required top-level keys** | `globalSettings`, `providers`, `environmentTemplates`, `environments` |
| **Provider limit** | At most **2** providers. With exactly 2, one must set `primary: true` |
| **Validate without provisioning** | `adhar config validate ./config.yaml` |
| **See the merged result** | `adhar config view` · `adhar up -f … --env dev --dry-run` |
| **Secrets** | Never in this file. Use environment variables, credential files, workload identity, or External Secrets |

## The four-layer model

Each layer answers a different question. When you name an environment with `--env`, the layers resolve from the outside in:

```diagram
config-layers
```

Only the bottom two layers overlap. So "precedence" comes down to one question: when a template and an environment both set something, which wins?

| Field | How `--env dev` resolves it |
|---|---|
| `provider` | `env.provider` → else the provider with `primary: true` → else the first provider in the map |
| `region` | `env.region` → else `providers.<name>.region` |
| `type` | `env.type` → else `"non-production"` |
| `clusterConfig` | `[ …template entries… , …environment entries… ]`. Appended in that order, **both kept in the list** |
| `coreServices` | The environment's block per service; the template fills gaps |
| `addons` | `[ …template addons… , …environment addons… ]` |
| `autoscaling` | The environment's **whole block**, else the template's. No field-by-field merge (see the pitfall below) |

Check the result instead of guessing:

- `adhar config view` prints the fully resolved configuration.
- `adhar up -f config.yaml --env dev --dry-run` prints the resolved provider, region, type and the whole `clusterConfig` list **in resolution order**. Then it exits without creating anything.

### Worked example: the same key at two layers

`clusterConfig` is a *list* of `{key, value}` pairs, not a map. Merging adds the environment's entries after the template's. So if both set the same key, the list ends up with two entries for it:

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

Resolved, the list is `[nodeSize=s-2vcpu-4gb, nodeSize=s-8vcpu-16gb]`: template first, environment second. Two different readers then disagree:

| Reader | How it reads the list | Winner here |
|---|---|---|
| The provisioner that builds the cluster spec | Walks the whole list in order, assigning each match. **Last wins** | `s-8vcpu-16gb` (the environment) |
| The `adhar-cluster-spec` ConfigMap the in-cluster autoscaler reads | Takes the **first** match for the key | `s-2vcpu-4gb` (the template) |

The cluster is created with the size you asked for. Then the autoscaler adds replacement workers at the template's size. Nothing errors. The fleet quietly becomes inconsistent.

> **Set each `clusterConfig` key at exactly one layer.** Put values that are truly shared in the template. Put anything an environment overrides *only* in the environment, and delete it from the template. This is the most valuable habit on this page.

The provisioner also treats different spellings of a key as the same key. It ignores case and separators, so `node_count`, `nodeCount` and `NodeCount` are one key. The ConfigMap reader matches the exact spelling. Pick one spelling per file and stick to it.

## globalSettings

This block is flat and required. Validation rejects a config that is missing `adharContext`, `defaultHost` or `email`, or that has a port outside 1–65535.

| Key | Meaning |
|---|---|
| `adharContext` | kube-context name prefix and Cilium cluster name (e.g. `adhar-mgmt`) |
| `defaultHost` | The DNS zone. Every URL is `<app>.<defaultHost>`, and the wildcard certificate covers `*.<defaultHost>` |
| `defaultHttpPort` / `defaultHttpsPort` | `80` / `443` behind a cloud load balancer, so URLs carry no port |
| `enableHAMode` | ArgoCD ×2 with HA Redis and PDBs, CNPG for Gitea, Crossplane HA |
| `email` | Let's Encrypt (ACME) account address. Required, because certificates are |
| `dnsProvider` | Edge DNS backend for external-dns and DNS-01 wildcard certificates. Empty means the environment's cloud. One of `none`, `digitalocean`, `aws`, `gcp`, `azure`, `civo`, `cloudflare` |
| `productionProvider` / `nonProductionProvider` | Default provider per environment `type`, when an environment names none |

`dnsProvider: none` turns off edge DNS and leaves TLS self-signed. That is right for an air-gapped or internal cluster. It is wrong for anything a browser visits.

## providers

| Key | Meaning |
|---|---|
| `type` | One of `aws`, `azure`, `gcp`, `digitalocean`, `civo`, `custom`, `kind` |
| `region` | Required for every provider |
| `primary` | The management cluster's provider. Only the primary cloud's Crossplane providers are installed |
| `useEnvironment` | Read credentials from the provider's environment variables instead of the file |
| `credentials_file` | Path to an existing credentials file (`~/.aws/credentials`, a GCP service-account key, …) |
| `useManagedK8s` / `clusterMode` | Use the cloud's managed Kubernetes (EKS, AKS, GKE, DOKS, Civo k3s) instead of the default: raw compute with kubeadm. Everything above the cluster is identical |
| `config` | Provider-specific block: VPC CIDRs, machine images, disk and firewall settings. Shape varies per provider |

> **At most two providers, and the count changes the rules.** One provider handles everything and needs no `primary`. With exactly two, exactly one must set `primary: true`, and the other carries workloads. Validation rejects three or more outright.

## environmentTemplates

The rules for templates:

- At least one template must exist.
- Each template must have a non-empty `clusterConfig`.
- Each template must have a non-empty `coreServices`.
- Every environment must reference a template by name.

> **`coreServices` here is recorded, not executed.** The foundation ships as manifests embedded in the binary. So the chart coordinates in this block are validated and echoed by `--dry-run`, but otherwise do nothing on the provisioning path. They exist because validation requires them. Do not spend time tuning versions here. Change the foundation through the platform stack instead.

## environments

`--env <name>` picks one of these. Each environment needs a `type` of `production` or `non-production`, a `template` reference, and a non-empty `clusterConfig`.

### clusterConfig keys the provisioner reads

| Key (and accepted aliases) | Effect |
|---|---|
| `name`, `clusterName` | Platform/tag name. The cluster itself is named after the environment |
| `nodeCount`, `numNodes`, `workerReplicas` | Worker count at creation. The autoscaler grows from here |
| `nodeSize`, `machineType`, `instanceType`, `nodeInstanceType` | Worker machine type. Overrides the provider's own default size |
| `controlPlaneReplicas` | Control-plane node count |
| `kubeVersion`, `version` | Pin Kubernetes for this environment |
| `podCIDR`, `podNetworkCIDR` | Move off the default `10.244.0.0/16`. Required if the cluster will join a Cilium Cluster Mesh |
| `clusterMeshId`, `clusterMeshName`, `clusterMeshApiServer`, `clusterMeshServiceType`, `clusterMeshNodePort` | Cilium Cluster Mesh wiring |

Know how these keys behave before you run into them:

- **`oidcAuth` is rejected, on purpose.** During `kubeadm init`, it would point the kube-apiserver at a Keycloak that does not exist yet. The apiserver would then fail to start at all. Provisioning stops with an error that says so. Enable OIDC as a day-2 step instead.
- **`autoScale`, `minNodes` and `maxNodes` in `clusterConfig` do nothing.** They appear in some scaffolded files, but the provisioner never reads them. Autoscaling is set in the `autoscaling:` block below.

### autoscaling

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `false` | Turn the node autoscaler on |
| `minWorkers` | `1` | Floor: your availability baseline |
| `maxWorkers` | `5` | Ceiling: your spend limit |
| `nodeGroup` | `workers` | The provider node group to scale |
| `scaleDownUtilizationThreshold` | `"50%"` | Cluster CPU **and** memory must both stay under this before a worker is removed |
| `scaleDownDelay` | `"10m"` | How long it must stay under before a worker is drained |
| `scaleUpCooldown` | `"3m"` | Minimum gap between two node additions |

> **`autoscaling` does not merge field by field.** If the environment declares the block at all, the whole template block is discarded. Fields the environment left out fall back to the built-in defaults, not to the template's values. Wherever you declare the block, declare all of it.

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
    clusterConfig:                    # must be non-empty; this key is inert (see above)
      - key: autoScale
        value: "true"
    coreServices:                     # required by validation, recorded but not executed —
      cilium:                         # the real Cilium version is compiled into the binary
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

## From nothing to a provisioned cluster

Work through these steps in order. Each step has a check, and none of the first four costs money.

**1. Scaffold a file for your cloud.** `adhar config create` writes a starting point with the `nonprod-defaults` template already filled in. It will not overwrite an existing file unless you pass `--force`.

```bash
adhar config create --provider digitalocean --region blr1   # writes ./config.yaml
```

Then edit `defaultHost` (a zone you have delegated), `email`, and the environment's `clusterConfig`. For fuller starting points, see the examples in the platform repo, such as `examples/digitalocean-config.yaml` and `examples/aws-config.yaml`.

**2. Validate it.** This runs the same schema validator and provider rules the platform applies on load. It lists every problem at once:

```terminal
$ adhar config validate ./config.yaml
▸ Validating configuration: ./config.yaml
● Configuration is valid
```

A failure prints `✖ invalid configuration:` followed by each problem. Examples: a missing `email`, three providers, two providers with no `primary`, or an environment naming a template that does not exist.

**3. Read what it resolves to.** Merging is where surprises happen, so look at the result, not the input:

```bash
adhar config view --file ./config.yaml                  # the resolved configuration, YAML
adhar config view --file ./config.yaml -o json         # the same, for jq
adhar config export --file ./config.yaml --resolve      # templates folded into each environment
```

**4. Dry-run the environment you will provision.** Do not continue until this is clean. It prints the provider, region, type and the merged `clusterConfig` list in resolution order. Then it exits without creating anything:

```bash
adhar up -f config.yaml --env dev --dry-run
```

Check three things in its output:

- The provider is the one you meant.
- The region is one your quota covers.
- No `clusterConfig` key appears twice.

**5. Provision.**

```bash
adhar up -f config.yaml --env dev
```

**6. Verify the cluster matches the file.** The CLI publishes the provider facts it used into the cluster. The in-cluster autoscaler reads the same facts. So this is where you confirm that the size you asked for is the size the cluster will grow with:

```bash
kubectl config current-context                                   # adhar-<cluster>
kubectl get nodes -o wide                                        # node count and versions
kubectl -n adhar-system get configmap adhar-cluster-spec -o yaml # provider, region, size, version
```

> **Always pass `--env <name>`.** Without it, `adhar up -f config.yaml` provisions *every* environment in the file. That includes any leftover sample block sized for another cloud, which will create an orphan machine and then fail. The same applies to `adhar down -f config.yaml`.

## Kubernetes version precedence

The highest wins: an explicit `adhar up --kube-version` → the environment's `kubeVersion`/`version` → the compiled-in default, **v1.37.0**.

The flag uses the compiled-in default as its own default value. So only a flag you *pass explicitly* overrides what the environment set. Nodes that join later take the running control plane's version, so versions in a cluster cannot drift apart.

## Secrets do not belong in this file

`config.yaml` is meant to live in version control next to the code it provisions. Treat it as public. Credentials reach the platform by one of these routes instead:

| Need | Use |
|---|---|
| Cloud credentials at provisioning time | `useEnvironment: true` plus the provider's variables: `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, `AZURE_CLIENT_ID`/`AZURE_CLIENT_SECRET`/`AZURE_TENANT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `DIGITALOCEAN_TOKEN` (or `DIGITALOCEAN_ACCESS_TOKEN`), `CIVO_TOKEN`, `CLOUDFLARE_API_TOKEN` |
| Credentials already on disk | `credentials_file: ~/.aws/credentials`. A path, not a value |
| No long-lived credential at all | Workload identity: `useInstanceRole` (AWS), `useManagedIdentity` / `useAzureCLI` (Azure), `useApplicationDefault` / `useComputeMetadata` (GCP) |
| Anything your applications need at runtime | External Secrets reading from the platform's secrets backend. Git holds the pointer, the backend holds the value |

The inline credential fields (`token`, `accessKeyId`, `secretAccessKey`, `clientSecret`, …) are for throwaway experiments only. They are stripped before the provider settings are published in-cluster. Credential *file paths* are stripped too. A laptop path means nothing to a controller running in a pod. A provider that preferred that path over the credential it was given could never scale the cluster again.

## Changing what the platform ships

This file sets the cluster shape. It does not set platform content. To enable a package, you edit the stack, and `adhar upgrade` converges the change.

```bash
adhar stack list                 # the catalogue, with enablement and live state
adhar stack enable harbor        # edits the stack files; nothing is pushed for you
adhar upgrade --diff-only        # review exactly what would change
adhar upgrade                    # converge
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `adhar up -f` created machines for an environment you did not mean | `--env` was omitted, so every environment in the file was provisioned | Always pass `--env <name>`. Tear the extras down with `adhar down -f … --env <name>` |
| New workers come up a different size from the first ones | The same `clusterConfig` key is set in the template and the environment. The autoscaler reads the first, the provisioner the last | Set each key at exactly one layer. Check `adhar-cluster-spec` |
| Autoscaler ignores `minWorkers` you set in the template | The environment declared its own `autoscaling` block, which replaces the template's entirely | Declare the complete block wherever you declare it |
| `autoScale: "true"` in `clusterConfig` does nothing | That key is never read | Use the `autoscaling:` block |
| Provisioning stops with an error about `oidcAuth` | Rejected on purpose. The apiserver would point at a Keycloak that does not exist yet | Remove it. Enable OIDC as a day-2 step |
| Validation rejects a file with three providers | At most two are allowed | Split into two files, or drop one |
| Certificates never issue; URLs serve the self-signed certificate | `defaultHost` is not a zone delegated to the cloud (or `dnsProvider: none`) | Delegate the zone before provisioning. Check with `dig NS <zone> +short` |
| Editing `coreServices` versions changes nothing | That block is recorded, not executed | Change the foundation through the platform stack or a newer CLI |

## Next steps

- **[Cloud Providers](/docs/providers/overview)** — per-cloud credentials, quotas, DNS and complete configs
- **[Customization](/docs/operations/customization)** — packages, chart values, and the platform's extension points
- **[Production](/docs/operations/production)** — HA sizing, TLS, backups and upgrades
