---
title: "DigitalOcean"
section: "Cloud Providers"
order: 3
path: "/docs/providers/digitalocean"
---

# DigitalOcean

Take an empty DigitalOcean account to a working Adhar platform on a public domain with a trusted wildcard certificate. This page is for anyone deploying Adhar to a cloud for the first time. You create a token and a DNS zone, write one config file, run `adhar up`, and learn how to check, scale, upgrade and tear the cluster down.

## At a glance

| | |
|---|---|
| **Provider key** | `digitalocean` |
| **Status** | `status:complete` |
| **Default model** | Droplets + kubeadm (`clusterMode: compute`) |
| **Other modes** | `managed` = DOKS · `provided` = an existing cluster |
| **Credentials** | `DIGITALOCEAN_ACCESS_TOKEN` (`DIGITALOCEAN_TOKEN` also accepted) |
| **DNS / trusted TLS** | DigitalOcean DNS + ACME DNS-01 wildcard |
| **Default StorageClass** | `adhar-local` (node-local); `adhar-block` = DigitalOcean volumes, 7 per droplet |
| **Cost shape** | 1 control plane + 2–10 workers, 1 load balancer, block volumes only where asked for |
| **Best for** | Your first cloud deployment |

## Topology

```diagram
dp-digitalocean-topology
```

Your browser asks DigitalOcean DNS for `console.<defaultHost>`. The answer is the load balancer's IP, which external-dns wrote there. The load balancer forwards 80 and 443 to the Gateway's node ports on the workers. Everything else lives in one VPC behind one cluster firewall.

Two parties create resources, and teardown handles each separately:

| Created by | Resources |
|---|---|
| The provider | Droplets, VPC, firewall, per-cluster SSH key |
| In-cluster controllers | The load balancer (the cloud-controller-manager, or CCM, creates it for the Gateway `Service`) and any block volumes (the CSI driver) |

## Prerequisites

| Requirement | Check |
|---|---|
| A DigitalOcean account with a payment method | The control panel loads **Droplets** |
| A droplet limit covering 1 + `maxWorkers` droplets | Your account's droplet limit. Adhar does not pre-check it; a `422` on create usually means it is too low |
| A domain you control, and access to its registrar | You can add NS records |
| `adhar` ([Installation](/docs/getting-started/installation)) | `adhar version` |
| `kubectl` and `dig` on your PATH | `kubectl version --client` |
| Optional: `doctl`, for verifying and cleaning up | `doctl version` |

The platform stack is built into the binary, so `adhar up` works from any directory; there is no repository to clone. See [Installation](/docs/getting-started/installation) to install the CLI.

### API token

Create a token under **API → Tokens** in the control panel. It needs read/write on:

| Scope | Why |
|---|---|
| Droplets | The control plane and workers |
| VPCs | The cluster network |
| Firewalls | API server, SSH, node ports, the Gateway |
| Load balancers | The CCM creates one for the Gateway |
| Block storage | The CSI driver's volumes |
| SSH keys | The per-cluster ed25519 key Adhar generates |
| DNS | external-dns records and ACME DNS-01 challenges |
| Kubernetes | **Read access in every mode**: preflight lists Kubernetes clusters and VPCs to prove the token works. Full access for `clusterMode: managed` (DOKS) or Crossplane workload clusters |

```bash
export DIGITALOCEAN_ACCESS_TOKEN="dop_v1_…"   # DIGITALOCEAN_TOKEN also accepted, and wins if both are set
```

**Check:** probe an endpoint the platform uses. It prints a table, even if empty:

```bash
doctl --context default -t "$DIGITALOCEAN_ACCESS_TOKEN" compute droplet list
```

> **Note:** Do not judge a token by `doctl account get`. A scoped token returns `401` on `/v2/account` and `/v2/projects`, yet works for droplets, volumes, load balancers, VPCs, DNS and Kubernetes. Also, `doctl` ignores both `-t` and `DIGITALOCEAN_ACCESS_TOKEN` when its config file has a `context:`, which is why the command spells out `--context default`.

### DNS zone

`globalSettings.defaultHost` drives every URL (`<app>.<defaultHost>`) and the wildcard certificate (`*.<defaultHost>`). It must be a zone **hosted in DigitalOcean DNS**. Adhar never creates the zone.

1. Create a zone for exactly your `defaultHost`:

   ```bash
   doctl --context default -t "$DIGITALOCEAN_ACCESS_TOKEN" compute domain create platform.example.com
   ```

2. At your registrar, in the `example.com` zone, add **three NS records named `platform`** pointing at `ns1.digitalocean.com`, `ns2.digitalocean.com` and `ns3.digitalocean.com`. Leave the apex where it is.

3. **Check** before `adhar up`:

   ```bash
   dig +short NS platform.example.com      # → ns1/2/3.digitalocean.com
   dig +short NS example.com               # → your registrar's, unchanged
   dig +noall +comment CAA example.com     # → status: NOERROR (empty answer is fine)
   ```

> **Warning:** Delegate the subdomain, not the whole domain, unless you also host the apex zone in DigitalOcean. Let's Encrypt reads CAA records up the tree, so issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone for it, the order fails with a message naming CAA, while every app still resolves.

You can skip DNS. The platform then comes up on its self-signed certificate, `adhar up` says so in its closing summary, and `adhar get status` raises a warning. cert-manager issues a trusted certificate on its own once the zone is fixed.

## Configure

Copy the shipped example and change three values: `defaultHost`, `email` and `region`.

```bash
cp examples/digitalocean-config.yaml config.yaml
```

The file, condensed and annotated. `test` is identical to `dev` except for its name:

```yaml
globalSettings:
  adharContext: adhar-mgmt              # recorded and validated; the kube-context comes from the cluster name
  defaultHost: platform.example.com     # YOUR DigitalOcean-hosted zone
  defaultHttpPort: 80
  defaultHttpsPort: 443                 # behind a cloud LB, so URLs carry no port
  enableHAMode: true                    # ArgoCD 2x + redis-ha 3x, CNPG 2 instances, PDBs
  email: admin@example.com              # Let's Encrypt (ACME) account
  dnsProvider: digitalocean             # external-dns + the DNS-01 solver; `none` = self-signed

providers:
  digitalocean:
    type: digitalocean
    region: blr1                        # nyc3, fra1, sgp1, … — your region
    primary: true                       # only this cloud's Crossplane providers install
    useEnvironment: true                # token from DIGITALOCEAN_ACCESS_TOKEN
    clusterMode: compute                # droplets + kubeadm; `managed` = DOKS
    config:
      reuse_existing_vpc: true          # reuse a VPC whose CIDR matches
      vpc_cidr: 10.3.0.0/16             # must not overlap a cluster you will mesh with
      droplet_size: s-8vcpu-16gb        # default size for droplets this provider creates
      image: ubuntu-24-04-x64
      tags: [adhar, adhar-mgmt]         # on every droplet, plus the per-cluster tag

environmentTemplates:                   # REQUIRED by validation; inert on this path
  nonprod-defaults:
    clusterConfig:
      - { key: autoScale, value: "true" }
    coreServices:
      cilium:
        chart: { repoURL: https://helm.cilium.io/, name: cilium, version: 1.15.7 }

environments:                           # dev, test, prod — namespaces on ONE cluster
  dev:
    isolation: namespace                # the default; `cluster` = a cluster of its own
    type: non-production
    provider: digitalocean
    template: nonprod-defaults
    clusterConfig:
      - { key: name,      value: adhar-dev }
      - { key: nodeSize,  value: s-8vcpu-16gb }   # worker droplet size
      - { key: nodeCount, value: "2" }            # workers at creation
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 10 }
  # test: same as dev, with name adhar-test
  prod:
    isolation: namespace
    type: production                    # sizes the shared cluster when no --env is given
    provider: digitalocean
    template: nonprod-defaults
    clusterConfig:
      - { key: name,      value: adhar-prod }
      - { key: nodeSize,  value: s-8vcpu-16gb }
      - { key: nodeCount, value: "4" }
    autoscaling: { enabled: true, minWorkers: 3, maxWorkers: 10 }
```

### Key fields

| Field | Meaning |
|---|---|
| `defaultHost` | The zone. Every hostname is `<app>.<defaultHost>`; the certificate covers `*.<defaultHost>`. |
| `enableHAMode` | Selects the HA manifest variants: ArgoCD controller ×2, redis-ha ×3, CNPG at 2 instances, PDBs. It does **not** make the Kubernetes control plane HA; one control plane is the only shape. |
| `primary` | Only this cloud's Crossplane provider packages install. All clouds together are about 3000 CRDs, enough to push one control plane into API-server timeouts. |
| `clusterMode` | `compute`, `managed` or `provided`. The old `useManagedK8s` and `cluster_mode: doks` spellings are **rejected**, not mapped. |
| `reuse_existing_vpc` / `vpc_cidr` | Reuse a VPC whose CIDR matches. **Required** if you intend to mesh two clusters; otherwise their CIDRs must not overlap. |
| `isolation` | `namespace` (default) puts the environment in a namespace on one shared cluster; `cluster` gives it its own cluster and platform. |
| `nodeCount` | Workers at **creation**. With autoscaling on, only the starting point. With `--env dev` the cluster starts at 2 workers; without `--env` it is sized from `prod` and starts at 4. |
| `kubeVersion` (in `clusterConfig`) | Pins Kubernetes for this environment. `--kube-version` outranks it; the compiled default is v1.37.0. |
| `autoscaling.maxWorkers` | The spend ceiling. The full production profile needs up to 10 workers; lower it to keep a curated platform cheap. |

`clusterConfig: []` and an empty `coreServices` are rejected. The chart coordinates in the template are recorded and printed by `--dry-run`; otherwise they are inert, because the foundation ships as embedded manifests.

### Dry run

```bash
adhar up -f config.yaml --env dev --dry-run
```

`--dry-run` resolves the four config layers (`globalSettings` → `providers` → `environmentTemplates` → `environments`) and prints the result. It creates nothing and **checks no credentials, quota or DNS**:

```terminal
$ adhar up -f config.yaml --env dev --dry-run

▸ Dry Run - Configuration Preview
┌─────────────────────────────────────────────┐
│ Environment: dev                            │
│ Provider:    digitalocean                   │
│ Region:      blr1                           │
│ Type:        non-production                 │
└─────────────────────────────────────────────┘

Cluster Configuration:
  autoScale: true
  name: adhar-dev
  nodeSize: s-8vcpu-16gb
  nodeCount: 2

Core Services:
  ArgoCD:    false
  Gitea:     false
  Gateway:   false
  Cilium:    true

No changes will be made in dry-run mode
```

Template entries come first, then the environment's own. The `Core Services` flags only report which chart blocks the config carries. ArgoCD, Gitea and the Gateway install regardless.

## Deploy

```bash
adhar up -f config.yaml --env dev
```

The CLI draws one checklist for the run. It runs the first three stages itself. From **Cilium & Gateway** onward, the in-cluster `AdharPlatform` controller does the work and the CLI reports what it observes:

```terminal
$ adhar up -f config.yaml --env dev

  Provisioning Adhar Platform
  ✓  Preflight
  ✓  Cloud cluster
  ✓  Kubeconfig & TLS
  ✓  Cilium & Gateway
  ✓  ArgoCD
  ✓  Gitea
  ✓  GitOps repos
  ✓  Crossplane
  ⠋  GitOps sync - platform stack  26/75 apps Synced + Healthy
```

What happens underneath:

```diagram
npa-digitalocean-sequence
```

Nodes stay `NotReady` until Cilium arrives. That is by design: `kubeadm init` installs no CNI and skips kube-proxy.

During bootstrap the CLI also:

- writes the kubeconfig to `~/.adhar/clusters/adhar/kubeconfig` and merges it into `~/.kube/config` as context `adhar`, made current. With `--name`, the context is `adhar-<name>`;
- creates the `adhar-dns-provider` Secret for external-dns and cert-manager;
- renders the stack for your domain (ClusterIssuers with the DigitalOcean DNS-01 solver, external-dns with `--provider=digitalocean --domain-filter=<host>`) and seeds it into Gitea;
- applies the cloud Gateway as a `Service` of type `LoadBalancer`.

The closing panel lists the Console, ArgoCD, Gitea, Keycloak, Grafana, Headlamp and Hubble URLs, the `adhar get secrets` and `adhar get status` commands, and the kube-context. If the zone was not delegated, the panel ends with a `▲ Platform URLs will not resolve, and TLS is SELF-SIGNED` block naming the fix.

**The catalogue keeps converging after the CLI returns**, and the autoscaler adds workers while it does. `--apps-timeout` (default 15m) limits only how long the CLI waits; ArgoCD keeps going either way.

> **Note:** Without `--env`, `adhar up -f config.yaml` builds **one** cluster for every `isolation: namespace` environment. It sizes that cluster from the production-type environment (`prod` here) and creates the `dev`, `test` and `prod` namespaces on it. Each `isolation: cluster` environment gets a cluster of its own.

## Verify

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig
kubectl get nodes                                       # all Ready
kubectl -n adhar-system get gateway adhar-gateway       # ADDRESS = the LB IP
dig +short console.platform.example.com                 # = the LB IP
kubectl get clusterissuer                               # adhar-letsencrypt-dns True
kubectl -n adhar-system get certificate adhar-cert      # READY True
curl -sI https://console.platform.example.com | head -1 # HTTP/2 200, trusted chain
adhar get status                                      # platform + per-package health
```

## Access

Log in at `https://console.platform.example.com`. Get credentials with:

```bash
adhar get secrets              # all platform credentials
adhar get secrets -p argocd    # one package
```

**Your username is your email** (`user1@noreply.com`, not `user1`), because the realm sets `registrationEmailAsUsername: true`. Signing in as `user1` fails with "Invalid username or password".

Keycloak groups map to Kubernetes roles:

| Group | Kubernetes role |
|---|---|
| `platform-admin` / `platform-engineer` | `cluster-admin` |
| `platform-developer` | `edit` |
| `platform-viewer` | `view` |

Application teams get no cluster-wide role. Onboarding a team grants its `oidc:ws-team-<organisation>.<team>` group `admin` in that team's own namespaces only. See [Accessing the Platform](/docs/operations/accessing-the-platform).

## Operate

Always pass `--file` to `adhar cluster` commands:

```bash
adhar cluster list --file config.yaml
```

### Scale

```bash
adhar cluster scale adhar --workers 8 -p digitalocean -f config.yaml    # join or drain workers
```

A worker added by `cluster scale` or the autoscaler takes its Kubernetes version from the running control plane, so a newer CLI cannot introduce version skew.

Sizing is about **memory and pod count**, not CPU:

| Profile | Workers |
|---|---|
| Curated (about 30 packages) | 3–4 × `s-8vcpu-16gb` |
| Full production | up to 10 × `s-8vcpu-16gb` |

If you undersize, you see these symptoms, in the order they appear:

- Pods `Pending` with `Insufficient cpu`, `Insufficient memory` or `Too many pods`. The kubeadm path raises kubelet `maxPods` to 250.
- `node(s) exceed max volume count`. A droplet attaches at most **7 block volumes**. This only affects claims that ask for `adhar-block`; the default `adhar-local` has no attach limit. The autoscaler treats the message as a scale-up trigger.
- SystemOOM. The eBPF agents (Beyla, Tetragon, Pixie) are the first victims when a node saturates. The node flaps `NotReady` and takes down whatever stateful pod lives there.

The fix in every case is more workers, not bigger ones. Raise `autoscaling.maxWorkers` **before** you enable the full profile.

**Autoscaler.** Inspect its decisions in `.status.autoscaling` on the `AdharPlatform`: `workers`, `lastScaleUp`, `lastScaleDown`, `underutilizedSince`, `lastReason`. Pause it before a manual capacity test. Otherwise it treats an empty new node on an idle cluster as removable and drains it once the scale-down delay passes (10 minutes by default):

```bash
kubectl -n adhar-system patch adharplatform dev --type=merge -p '{"spec":{"autoscaling":{"enabled":false}}}'
```

### Upgrade

```bash
adhar upgrade --name dev --diff-only                                    # preview the stack diff
adhar upgrade --name dev --yes                                          # converge foundation + stack
adhar cluster upgrade adhar --version 1.37.2 -p digitalocean -f config.yaml   # Kubernetes itself
```

On a cloud cluster the `AdharPlatform` resource is named after the environment you provisioned (`dev` here; `prod` for a shared cluster built without `--env`). `adhar upgrade` looks for one named `adhar` unless you pass `--name`. Find the name with `kubectl -n adhar-system get adharplatform`.

To replace the cluster with a fresh one, run `adhar up -f config.yaml --env dev --recreate --force`.

### Managed DOKS

```yaml
providers:
  digitalocean:
    type: digitalocean
    clusterMode: managed     # DOKS; the token also needs the Kubernetes scope
```

DOKS moves the control plane to DigitalOcean's managed one. You give up SSH to the nodes, and the Adhar node autoscaler, which can only add workers it provisions and joins itself.

### Tear down

```bash
adhar down -f config.yaml --env dev --purge-orphaned-volumes
# or one cluster by name:
adhar cluster delete adhar --force --file config.yaml --purge-orphaned-volumes
```

`adhar down` shows what it will delete and asks you to type `yes` (skip with `--force`). It then removes, in order:

1. every droplet (and waits for them to go)
2. the CCM load balancers in the cluster's VPC
3. block volumes tagged `adhar-cluster-<cluster>`
4. the firewall
5. the VPC
6. the per-cluster tag
7. the SSH key
8. local state

> **Warning:** `--env dev` removes the whole cluster. With `isolation: namespace`, `dev`, `test` and `prod` share the one cluster `adhar`, so tearing down any of them deletes all three. If you passed `--name` to `adhar up`, pass the same `--name` to `adhar down`.

`--purge-orphaned-volumes` also sweeps unattached `pvc-*` volumes in the region that carry no other cluster's tag. Use it only when no other Kubernetes cluster lives in that account and region.

**DNS records are left in place**: external-dns is upsert-only and never deletes.

**Check** that nothing is still billing:

```bash
T="$DIGITALOCEAN_ACCESS_TOKEN"
doctl --context default -t "$T" compute droplet list --format Name,Status --no-header
doctl --context default -t "$T" compute volume list --format Name,Region --no-header
doctl --context default -t "$T" compute load-balancer list --format Name,IP --no-header
doctl --context default -t "$T" compute firewall list --format Name --no-header
doctl --context default -t "$T" vpcs list --format Name --no-header
```

If all five are empty, or list only resources that are not Adhar's, nothing is billing.

### Cost

While the cluster runs you pay for the control-plane droplet, each worker droplet, one load balancer, and any block volumes beyond the node-local default. Each droplet's disk is the one its size slug includes; it holds the containerd image cache and every node-local volume. DNS records and the VPC are not billed.

The cost levers, in order of effect:

1. `maxWorkers`: the ceiling you pay
2. `nodeCount`: what an idle cluster costs
3. the enabled package set

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `doctl account get` returns 401, so the token "looks broken" | Scoped tokens return 401 on `/v2/account` by design | Probe `doctl compute droplet list` instead |
| `-t` / `DIGITALOCEAN_ACCESS_TOKEN` appear to be ignored by `doctl` | `doctl`'s config has a `context:` | `doctl --context default -t "$TOKEN" …` |
| `useManagedK8s has been removed` / `clusterMode "doks" names a cloud service` | An old config spelling | `clusterMode: managed` (or `compute`) |
| `cluster "adhar-dev" not found in any configured provider` | `clusterConfig.name` is not the cluster's name; the cluster is `adhar` unless `--name` was given | Use `adhar` (or your `--name`), and always pass `--file` |
| Certificate never issues; every app reachable | The apex is delegated to nameservers holding no zone → `SERVFAIL looking up CAA` | Delegate the subdomain only, or host the apex zone too |
| StatefulSets `Pending` on `exceed max volume count` | Something asked for `adhar-block`; 7 volumes per droplet | Raise `maxWorkers`, or leave those PVCs on `adhar-local` |
| `422` on droplet create | Account droplet limit, or a size that does not exist in the region | Ask DigitalOcean to raise the limit; check the size |
| `--workers <current>` is a no-op and billing continues | A droplet was created but never joined, so the provider's count and `kubectl get nodes` disagree | Compare `adhar cluster status` with `kubectl get nodes`; delete the stray |
| Browser shows a stranger's certificate after a recreate | A manual `*.<host>` wildcard record shadows hostnames and points at a recycled LB IP | Never keep a manual wildcard in the platform zone |

## Next steps

- [Accessing the Platform](/docs/operations/accessing-the-platform) — SSO, kubeconfig, and platform identity
- [Production](/docs/operations/production) — HA posture, backups, hardening
- [Providers Overview](/docs/providers/overview) — the provider model and the comparison table
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup
