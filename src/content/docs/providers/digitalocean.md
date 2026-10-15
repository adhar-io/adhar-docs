---
title: "DigitalOcean"
section: "Cloud Providers"
order: 3
path: "/docs/providers/digitalocean"
---

# DigitalOcean

This page takes you from an empty DigitalOcean account to a working Adhar platform on a public domain with a trusted wildcard certificate. It is for anyone deploying Adhar to a cloud for the first time. DigitalOcean is Adhar's **live-verified reference provider**: the full 76-package production profile has been brought up on it end to end, then scaled, upgraded, backed up, restored and torn down clean. Every timing, limit and pitfall on this page came from that run on 2026-09-12 (region `blr1`, HA mode, 3 workers autoscaled to 9), not from a design document.

By the end you will have run one `adhar up`, watched the cluster serve in about five minutes and the platform become usable at about thirteen, and you will know how to check, scale, upgrade and tear it down.

## At a glance

| | |
|---|---|
| **Provider key** | `digitalocean` |
| **Default model** | Droplets + kubeadm (`clusterMode: compute`) |
| **Other modes** | `managed` = DOKS · `provided` = an existing cluster |
| **Credentials** | `DIGITALOCEAN_ACCESS_TOKEN` (`DIGITALOCEAN_TOKEN` also accepted) |
| **DNS / trusted TLS** | DigitalOcean DNS + ACME DNS-01 wildcard |
| **Verification** | Live-verified end to end (76/76 apps Healthy) |
| **Provision time** | Cluster serving ~5 min; usable platform ~13 min |
| **Cost shape** | 1 control plane + 2–10 workers, 1 load balancer, block volumes only where asked for |
| **Best for** | Your first cloud deployment — the proven reference path |

## What gets built

```diagram
dp-digitalocean-topology
```

Read it top to bottom. Your browser asks DigitalOcean DNS for `console.<defaultHost>`; the answer is the load balancer's IP, which external-dns wrote there. The load balancer was not created by Adhar's provisioning code — the **cloud-controller-manager** (CCM) running inside the cluster created it when the platform applied the Gateway as a `Service` of type `LoadBalancer`. It forwards 80 and 443 to the Gateway's node ports on the workers. Everything else lives in one VPC behind one cluster firewall.

That split matters at teardown time: the provider tracks what *it* created (droplets, VPC, firewall, SSH key), and teardown separately sweeps what the in-cluster controllers created (the load balancer and any block volumes).

## Step 1 — Prerequisites checklist

| ✓ | Item | How to check |
|---|---|---|
| ☐ | A DigitalOcean account with a payment method | Control panel loads **Droplets** |
| ☐ | Droplet limit covering 1 + `maxWorkers` droplets | Your account's droplet limit; a `422` on create usually means it is too low |
| ☐ | A domain you control, and access to its registrar | You can add NS records |
| ☐ | `adhar` built from the repository | `./adhar version` |
| ☐ | `kubectl` and `dig` on your PATH | `kubectl version --client` |
| ☐ | Optional: `doctl` for verifying and cleaning up | `doctl version` |

The GitOps stack is seeded from `platform/stack` in the repository checkout, so run `adhar` from inside it:

```bash
git clone https://github.com/adhar-io/adhar.git && cd adhar
make build                                       # produces ./adhar
```

## Step 2 — Create an API token

Create one under **API → Tokens** in the control panel. It needs read/write on:

| Scope | Why |
|---|---|
| Droplets | The control plane and workers |
| VPCs | The cluster network |
| Firewalls | API server, SSH, node ports, the Gateway |
| Load balancers | The CCM creates one for the Gateway |
| Block storage | The CSI driver's volumes |
| SSH keys | The per-cluster ed25519 key Adhar generates |
| DNS | external-dns records and ACME DNS-01 challenges |
| Kubernetes | **Only** for `clusterMode: managed` (DOKS) or Crossplane workload clusters |

```bash
export DIGITALOCEAN_ACCESS_TOKEN="dop_v1_…"   # DIGITALOCEAN_TOKEN also accepted
```

**Verify** with an endpoint the platform actually uses:

```bash
doctl --context default -t "$DIGITALOCEAN_ACCESS_TOKEN" compute droplet list   # a table, even if empty
```

> **Never judge a token by `doctl account get`.** A *scoped* token — which is what the verified run used — returns `401` on `/v2/account` and `/v2/projects` while working perfectly for droplets, volumes, load balancers, VPCs, DNS and Kubernetes. And `doctl` ignores both `-t` and `DIGITALOCEAN_ACCESS_TOKEN` when its config file has a `context:`, which is why the command above spells out `--context default`.

## Step 3 — Delegate a DNS zone

`globalSettings.defaultHost` drives every URL (`<app>.<defaultHost>`) and the wildcard certificate (`*.<defaultHost>`), so it must be a zone **hosted in DigitalOcean DNS**. Adhar never creates the zone — creating one means taking over a name you own, which a provisioning tool should not do behind your back.

1. Create a zone for exactly your `defaultHost`:

   ```bash
   doctl --context default -t "$DIGITALOCEAN_ACCESS_TOKEN" compute domain create platform.example.com
   ```

2. At your registrar, in the `example.com` zone, add **three NS records named `platform`** pointing at DigitalOcean's fixed nameservers: `ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com`. The apex stays exactly where it is.

3. **Verify** before `adhar up`:

   ```bash
   dig +short NS platform.example.com      # → ns1/2/3.digitalocean.com
   dig +short NS example.com               # → your registrar's, unchanged
   dig +noall +comment CAA example.com     # → status: NOERROR (empty answer is fine)
   ```

> **Delegate the subdomain, not the whole domain** — unless you also host the apex zone in DigitalOcean. Let's Encrypt walks *up* the tree reading CAA, so issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone for it, every lookup returns SERVFAIL and the order fails with a message naming CAA rather than delegation. Every app still resolves and works, which is what makes it hard to spot.

Skipping DNS is supported: the platform comes up on its self-signed certificate, `adhar up` says so in its closing summary, `adhar get status` raises it as a warning, and cert-manager issues a trusted certificate on its own once the zone is fixed.

## Step 4 — Write the configuration

Copy the shipped example and change three values — `defaultHost`, `email` and `region`:

```bash
cp examples/digitalocean-config.yaml config.yaml
```

This is `examples/digitalocean-config.yaml` with its comments condensed into annotations:

```yaml
globalSettings:
  adharContext: adhar-mgmt              # kube-context prefix and Cilium cluster name
  defaultHost: platform.example.com     # YOUR DigitalOcean-hosted zone (Step 3)
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
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 5 }
  test:
    isolation: namespace
    type: non-production
    provider: digitalocean
    template: nonprod-defaults
    clusterConfig:
      - { key: name,      value: adhar-test }
      - { key: nodeSize,  value: s-8vcpu-16gb }
      - { key: nodeCount, value: "2" }
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 5 }
  prod:
    isolation: namespace
    type: production                    # sizes the shared cluster when no --env is given
    provider: digitalocean
    template: nonprod-defaults
    clusterConfig:
      - { key: name,      value: adhar-prod }
      - { key: nodeSize,  value: s-8vcpu-16gb }
      - { key: nodeCount, value: "2" }
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 5 }
```

### Fields that change the outcome

| Field | Meaning |
|---|---|
| `defaultHost` | The zone. Every hostname is `<app>.<defaultHost>`; the certificate covers `*.<defaultHost>`. |
| `enableHAMode` | Selects the HA manifest variants: ArgoCD controller ×2, redis-ha ×3, CNPG at 2 instances, PDBs. It does **not** make the Kubernetes control plane HA — one control plane is the only shape today. |
| `primary` | Only this cloud's Crossplane provider packages install. All five clouds together are ≈3000 CRDs, which pushed one control plane into API-server timeouts. |
| `clusterMode` | `compute`, `managed` or `provided`. The old `useManagedK8s` and `cluster_mode: doks` spellings are **rejected**, not mapped. |
| `reuse_existing_vpc` / `vpc_cidr` | Reuse a VPC whose CIDR matches. **Required** if you intend to mesh two clusters; otherwise their CIDRs must not overlap. |
| `isolation` | `namespace` (default) puts the environment in a namespace on one shared cluster; `cluster` gives it its own cluster and platform. |
| `nodeCount` | Workers at **creation**. With autoscaling on, only the starting point. |
| `kubeVersion` (in `clusterConfig`) | Pins Kubernetes for this environment. `--kube-version` outranks it; the compiled default is v1.37.0. |
| `autoscaling.maxWorkers` | The spend ceiling. The verified 76-package run started at 3 and needed 10; the example's 2–5 keeps an idle platform cheap. |

`clusterConfig: []` and an empty `coreServices` are rejected outright. The chart coordinates in the template are recorded and printed by `--dry-run`, and otherwise inert — the foundation ships as embedded manifests.

## Step 5 — Dry run

```bash
./adhar up -f config.yaml --env dev --dry-run
```

`--dry-run` resolves the four config layers (`globalSettings` → `providers` → `environmentTemplates` → `environments`) and prints the result. It creates nothing and **checks no credentials, quota or DNS**:

```terminal
$ ./adhar up -f config.yaml --env dev --dry-run

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

Template entries come first, then the environment's own. The `Core Services` flags only report which chart blocks the config carries; ArgoCD, Gitea and the Gateway install regardless.

## Step 6 — Provision

```bash
./adhar up -f config.yaml --env dev
```

The CLI draws one checklist for the run. The first three stages are the CLI's own; from **Cilium & Gateway** onward the in-cluster `AdharPlatform` controller does the work and the CLI reports what it observes:

```terminal
$ ./adhar up -f config.yaml --env dev

Provisioning Adhar Platform

  ✓ Preflight                      credentials, quota and API access
  ✓ Cloud cluster                  adhar · digitalocean · blr1
  ✓ Kubeconfig & TLS               context adhar
  ✓ Cilium & Gateway               eBPF data path
  ✓ ArgoCD                         GitOps engine
  ✓ Gitea                          in-cluster Git server
  ✓ GitOps repos                   packages, environments
  ✓ Crossplane                     control plane + providers
  ◌ GitOps sync - platform stack   platform apps via ArgoCD
```

What happens underneath, measured on the 3-worker verified run:

```diagram
pv-digitalocean-sequence
```

**About 5 minutes** in, the cluster is serving: VPC, firewall and SSH key created, the droplets prepared in parallel, `kubeadm init` and `join` done (kube-proxy skipped — Cilium replaces it), and the DigitalOcean CCM and CSI installed over SSH. Nodes stay `NotReady` until Cilium arrives; that is by design. **About 13 minutes** in, the platform bootstrap has finished and the CLI hands over with the platform URLs.

During bootstrap the CLI also:

- writes the kubeconfig to `~/.adhar/clusters/adhar/kubeconfig` and merges it into `~/.kube/config` as context `adhar` (made current) — the cluster is named `adhar` unless you pass `--name`;
- creates the `adhar-dns-provider` Secret for external-dns and cert-manager;
- renders the stack for your domain — ClusterIssuers with the DigitalOcean DNS-01 solver, external-dns with `--provider=digitalocean --domain-filter=<host>` — and seeds it into Gitea;
- applies the cloud Gateway as a `Service` of type `LoadBalancer`.

The closing panel lists the Console, ArgoCD, Gitea, Keycloak, Grafana, Headlamp and Hubble URLs, plus `adhar get secrets`, `adhar get status` and the kube-context. If the zone was not delegated it ends with a `▲ Platform URLs will not resolve, and TLS is SELF-SIGNED` block naming the fix.

**The catalogue keeps converging for another 30–45 minutes after the CLI returns**, and the autoscaler adds workers while it does (3 → 9 on the verified run). `--apps-timeout` (default 15m) bounds only how long the CLI waits; ArgoCD keeps going either way. That is expected, not a hang.

> **Without `--env`.** `adhar up -f config.yaml` builds **one** cluster for every `isolation: namespace` environment, sized from the production-type one (`prod` here), and creates the `dev`, `test` and `prod` namespaces on it. Each `isolation: cluster` environment gets a cluster of its own.

## Step 7 — Verify

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig
kubectl get nodes                                       # all Ready
kubectl -n adhar-system get gateway adhar-gateway       # ADDRESS = the LB IP
dig +short console.platform.example.com                 # = the LB IP
kubectl get clusterissuer                               # adhar-letsencrypt-dns True
kubectl -n adhar-system get certificate adhar-cert      # READY True (~3 min)
curl -sI https://console.platform.example.com | head -1 # HTTP/2 200, trusted chain
./adhar get status                                      # platform + per-package health
./adhar get secrets -p argocd
```

Log in at `https://console.platform.example.com`. **Your username is your email** (`user1@noreply.com`, not `user1`) because the realm sets `registrationEmailAsUsername: true`; signing in as `user1` fails with a deliberately vague "Invalid username or password". Keycloak group → Kubernetes role:

| Group | Kubernetes role |
|---|---|
| `platform-admin` / `platform-engineer` | `cluster-admin` |
| `platform-developer` | `edit` |
| `platform-viewer` | `view` |
| `application-admin` | `admin` |

## Node sizing

The verified full profile ran on `s-8vcpu-16gb` workers. Sizing is about **memory and pod count**, not CPU:

| Profile | Workers | Notes |
|---|---|---|
| Curated (~30 packages) | 3–4 × `s-8vcpu-16gb` | Comfortable |
| Full production (76 packages) | 10 × `s-8vcpu-16gb` | 8 workers sat at ~55% requested memory but ~130% of limits |

**If you undersize**, this is what you see, in the order it bites:

- Pods `Pending` with `Insufficient cpu` / `Insufficient memory` / `Too many pods`. The kubeadm path raises kubelet `maxPods` to 250, so the pod ceiling arrives later than the 110 default suggests.
- `node(s) exceed max volume count` — a droplet attaches at most **7 block volumes**. The default StorageClass is node-local (`adhar-local`), so this only affects claims that explicitly ask for `adhar-block`. The autoscaler treats the message as a scale-up trigger.
- SystemOOM. The eBPF agents (Beyla, Tetragon, Pixie) are the first victims when a node saturates, which flaps the node `NotReady` and takes whatever stateful pod lives there with it.

The fix in every case is more workers, not bigger ones — which is what `autoscaling.maxWorkers` is for. Raise it **before** enabling the full profile.

## Day-2 operations

```bash
./adhar cluster list --file config.yaml                                   # --file is required
./adhar cluster scale adhar --workers 8 -p digitalocean -f config.yaml    # join / drain
./adhar upgrade --diff-only                                               # preview the stack diff
./adhar upgrade --yes                                                     # converge foundation + stack
./adhar cluster upgrade adhar --version 1.37.2 -p digitalocean -f config.yaml
./adhar up -f config.yaml --env dev --recreate --force                    # delete + fresh cluster
```

A worker added by `cluster scale` or the autoscaler takes its Kubernetes version from the running control plane, so a newer CLI cannot introduce skew.

> Pause the autoscaler before a manual capacity test. It treats an empty new node on an idle cluster as removable and will drain one within five minutes: `kubectl -n adhar-system patch adharplatform dev --type=merge -p '{"spec":{"autoscaling":{"enabled":false}}}'`. The `AdharPlatform` is named after the environment you provisioned.

Inspect autoscaler decisions at `.status.autoscaling` on the `AdharPlatform` — `workers`, `lastScaleUp`, `lastScaleDown`, `underutilizedSince`, `lastReason`.

### Managed DOKS instead

```yaml
providers:
  digitalocean:
    type: digitalocean
    clusterMode: managed     # DOKS; the token also needs the Kubernetes scope
```

DOKS moves the control plane to DigitalOcean's free managed one. You give up SSH to the nodes and the Adhar node autoscaler, which can only add workers it provisions and `kubeadm join`s itself.

## Tear down, then check the bill

```bash
./adhar down -f config.yaml --env dev --purge-orphaned-volumes
# or one cluster by name:
./adhar cluster delete adhar --force --file config.yaml --purge-orphaned-volumes
```

`adhar down` asks you to type `yes` (skip with `--force`), then removes, in order: the CCM load balancer(s), every droplet, block volumes tagged `adhar-cluster-<cluster>`, the firewall, the VPC, the SSH key and local state. `--purge-orphaned-volumes` additionally sweeps unattached `pvc-*` volumes in the region carrying no other cluster's tag — use it only when no other Kubernetes cluster lives in that account and region.

**DNS records are left in place** (external-dns is upsert-only and never deletes). Verify the teardown rather than assuming it — a half-succeeded teardown keeps billing:

```bash
T="$DIGITALOCEAN_ACCESS_TOKEN"
doctl --context default -t "$T" compute droplet list --format Name,Status --no-header
doctl --context default -t "$T" compute volume list --format Name,Region --no-header
doctl --context default -t "$T" compute load-balancer list --format Name,IP --no-header
doctl --context default -t "$T" compute firewall list --format Name --no-header
doctl --context default -t "$T" vpcs list --format Name --no-header
```

All five empty (or listing only resources that are not Adhar's) means nothing is billing.

**What you pay for while it runs:** the control-plane droplet, each worker droplet, one load balancer, and any block volumes that remain after the node-local default. Worker disks are 256 GiB, shared with the containerd image cache. DNS records and the VPC are not billed. The levers, in order of effect: `maxWorkers` (the ceiling you actually pay), `nodeCount` (what an idle cluster costs), and the enabled package set.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `doctl account get` returns 401, so the token "looks broken" | Scoped tokens 401 on `/v2/account` by design | Probe `doctl compute droplet list` instead |
| `-t`/`DIGITALOCEAN_ACCESS_TOKEN` appear to be ignored by `doctl` | `doctl`'s config has a `context:` | `doctl --context default -t "$TOKEN" …` |
| `useManagedK8s has been removed` / `clusterMode "doks" names a cloud service` | An old config spelling | `clusterMode: managed` (or `compute`) |
| `cluster "adhar-dev" not found in any configured provider` | `clusterConfig.name` is not the cluster's name; the cluster is `adhar` unless `--name` was given | Use `adhar` (or your `--name`), and always pass `--file` |
| Certificate never issues; every app reachable | The apex is delegated to nameservers holding no zone → `SERVFAIL looking up CAA` | Delegate the subdomain only, or host the apex zone too |
| StatefulSets `Pending` on `exceed max volume count` | Something asked for `adhar-block`; 7 volumes per droplet | Raise `maxWorkers`, or leave those PVCs on `adhar-local` |
| `422` on droplet create | Account droplet limit, or a size that does not exist in the region | Ask DigitalOcean to raise the limit; check the size |
| `--workers <current>` is a no-op and billing continues | A droplet was created but never joined, so the provider's count and `kubectl get nodes` disagree | Compare `adhar cluster status` with `kubectl get nodes`, delete the stray |
| Browser shows a stranger's certificate after a recreate | A manual `*.<host>` wildcard record shadows hostnames and points at a recycled LB IP | Never keep a manual wildcard in the platform zone |

## Next steps

- [Providers Overview](/docs/providers/overview) — the provider model and the comparison table
- [Accessing the Platform](/docs/operations/accessing-the-platform) — SSO, kubeconfig, and platform identity
- [Production](/docs/operations/production) — HA posture, backups, hardening
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup
