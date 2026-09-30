---
title: "DigitalOcean"
section: "Cloud Providers"
order: 3
path: "/docs/providers/digitalocean"
---

# DigitalOcean

DigitalOcean is Adhar's **live-verified reference provider** — the full 76-package production profile has been brought up on it end to end, scaled, upgraded, backed up, restored and torn down clean. Every timing, limit and pitfall on this page came off that run rather than from a design document. If you are deploying to a cloud for the first time, start here.

## At a glance

| | |
|---|---|
| **Provider key** | `digitalocean` |
| **Default model** | Droplets + kubeadm |
| **Managed option** | DOKS (`useManagedK8s: true`, or `cluster_mode: doks`) |
| **Credentials** | `DIGITALOCEAN_ACCESS_TOKEN` (`DIGITALOCEAN_TOKEN` also accepted) |
| **DNS / trusted TLS** | DigitalOcean DNS + ACME DNS-01 wildcard |
| **Verification** | Live-verified end to end (76/76 apps Healthy) |
| **Provision time** | Cluster serving ~5 min; usable platform ~13 min |
| **Cost shape** | 1 control plane + 3–10 workers, 1 load balancer, ~55 volumes |
| **Best for** | Your first cloud deployment — the proven reference path |

## Prerequisites and credentials

### 1. An API token

Create one under **API → Tokens** in the DigitalOcean control panel. It needs read/write on:

| Scope | Why |
|---|---|
| Droplets | The control plane and workers |
| VPCs | The cluster network |
| Firewalls | API server, node ports, VXLAN for a mesh |
| Load balancers | The cloud-controller-manager creates one for the Gateway |
| Block storage | The CSI driver's volumes |
| SSH keys | The per-cluster ed25519 key Adhar generates |
| DNS | external-dns records and ACME DNS-01 challenges |
| Kubernetes | **Only** for DOKS mode or Crossplane workload clusters |

```bash
export DIGITALOCEAN_ACCESS_TOKEN="dop_v1_…"   # DIGITALOCEAN_TOKEN also accepted
```

> **Never judge a token by `doctl account get`.** A *scoped* token — which is what the verified run used — returns `401` on `/v2/account` and `/v2/projects` while working perfectly for droplets, volumes, load balancers, VPCs, DNS and Kubernetes. Probe an endpoint the platform actually uses: `doctl compute droplet list`. And `doctl` ignores both `-t` and `DIGITALOCEAN_ACCESS_TOKEN` when its config file has a `context:`, so spell it out: `doctl --context default -t "$TOKEN" …`.

### 2. A delegated DNS zone

`globalSettings.defaultHost` drives every URL and the wildcard certificate, so it must be a zone **hosted in DigitalOcean DNS**. Adhar never creates the zone — creating one means taking over a name you own, which is not something a provisioning tool should do behind your back.

```bash
# 1. a zone for exactly your defaultHost
doctl --context default -t "$TOKEN" compute domain create platform.example.com

# 2. DigitalOcean's nameservers are a fixed set:
#    ns1.digitalocean.com, ns2.digitalocean.com, ns3.digitalocean.com
```

3. At your registrar, in the `example.com` zone, add **three NS records named `platform`** pointing at those nameservers. The apex stays exactly where it is.

Verify before `adhar up`:

```bash
dig +short NS platform.example.com      # → ns1/2/3.digitalocean.com
dig +short NS example.com               # → your registrar's, unchanged
dig +noall +comment CAA example.com     # → status: NOERROR (empty answer is fine)
```

> **Delegate the subdomain, not the whole domain** — unless you also host the apex zone in DigitalOcean. Let's Encrypt walks *up* the tree reading CAA, so issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone for it, every lookup returns SERVFAIL and the order fails with a message naming CAA rather than delegation. Every app still resolves and works, which is what makes it hard to spot.

Skipping DNS entirely is supported: the platform comes up on its self-signed certificate, `adhar up` says so in its closing summary, `adhar get status` raises it as a warning, and cert-manager issues a trusted certificate on its own once the zone is fixed.

### 3. Local tooling

`adhar` (built from the repository with `make build`), `kubectl`, and the repository checkout — the GitOps stack is seeded from `platform/stack`.

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

### Fields that change the outcome

| Field | Meaning |
|---|---|
| `defaultHost` | The zone. Every hostname is `<app>.<defaultHost>`; the certificate covers `*.<defaultHost>`. |
| `enableHAMode` | Selects the HA manifest variants: ArgoCD controller ×2, redis-ha ×3, CNPG at 2 instances, PDBs. It does **not** make the Kubernetes control plane HA. |
| `primary` | Only this cloud's Crossplane provider packages install. All five clouds together are ≈3000 CRDs, which pushed one control plane into API-server timeouts. |
| `reuse_existing_vpc` / `vpc_cidr` | Reuse a VPC whose CIDR matches. **Required** if you intend to mesh two clusters; their CIDRs must not overlap otherwise. |
| `nodeCount` | Workers at **creation**. With autoscaling on it is only the starting point. |
| `kubeVersion` (in `clusterConfig`) | Pins Kubernetes for this environment. CLI `--kube-version` outranks it; the compiled default is v1.37.0. |
| `autoscaling.maxWorkers` | The spend ceiling. Check it before provisioning the full profile. |

The two `environmentTemplates` keys are **required by config validation** and install nothing on this path — the foundation ships as embedded manifests, so the chart coordinates are recorded, printed by `--dry-run`, and otherwise inert. `clusterConfig: []` and an empty `coreServices` are rejected outright.

## A worked `adhar up`

```bash
git clone https://github.com/adhar-io/adhar.git && cd adhar
make build                                       # produces ./adhar
cp examples/digitalocean-config.yaml config.yaml
# edit three fields: defaultHost, email, region

export DIGITALOCEAN_ACCESS_TOKEN="dop_v1_…"
./adhar up -f config.yaml --env dev --dry-run    # resolves config, creates nothing
./adhar up -f config.yaml --env dev              # ~13 min to a usable platform
```

What happens, measured on the 3-worker verified run:

```text
  preflight ● credentials and API access
       │
       ▼
  VPC + firewall + SSH key
       │
       ▼
  4 droplets created and PREPARED IN PARALLEL
  (containerd, pinned kubeadm stream, swap off,
   Cilium data-path images pre-pulled in the background)
       │
       ▼
  kubeadm init  (kube-proxy SKIPPED — Cilium replaces it)
  kubeadm join  (nodes stay NotReady: no CNI yet, by design)
       │
       ▼
  DO cloud-controller-manager + CSI installed over SSH
       │
       ▼  ~5 min: cluster serving, kubeconfig fetched over SSH
  Gateway API CRDs → Cilium → Gateway → ArgoCD → Gitea →
  Crossplane → seed platform/stack into Gitea
       │
       ▼  ~13 min: Completed Environment Provisioning
```

During bootstrap the CLI also writes the kubeconfig to `~/.adhar/clusters/dev/kubeconfig` and merges it into `~/.kube/config` as context `adhar-dev`, creates the `adhar-dns-provider` Secret for external-dns and cert-manager, renders the stack for your domain (ClusterIssuers with the DigitalOcean DNS-01 solver; external-dns with `--provider=digitalocean --domain-filter=<host> --txt-owner-id=adhar-dev`), and applies the cloud Gateway as a `Service` of type LoadBalancer.

**The catalogue keeps converging for another 30–45 minutes after the CLI returns**, and the autoscaler adds workers while it does (3 → 9 on the verified run). That is expected, not a hang.

## Verify

```bash
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
kubectl get nodes                                       # all Ready
kubectl -n adhar-system get gateway adhar-gateway       # ADDRESS = the LB IP
dig +short console.platform.example.com                 # = the LB IP
kubectl get clusterissuer                               # adhar-letsencrypt-dns True
kubectl -n adhar-system get certificate adhar-cert      # READY True (~3 min)
curl -sI https://console.platform.example.com | head -1 # HTTP/2 200, trusted chain
./adhar get status                                      # per-package health
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

- Pods `Pending` with `Insufficient cpu` / `Insufficient memory` / `Too many pods`. The kubeadm path raises kubelet `maxPods` to 250, so the pod ceiling arrives later than the 110 default would suggest.
- `node(s) exceed max volume count` — a droplet attaches at most **7 block volumes**. The default StorageClass is node-local (`adhar-local`), so this only affects volumes that explicitly ask for `adhar-block`. The autoscaler treats the message as a scale-up trigger.
- SystemOOM. The eBPF agents (Beyla, Tetragon, Pixie) are the first victims when a node saturates, which flaps the node `NotReady` and takes whatever stateful pod lives there with it.

The fix in every case is more workers, not bigger ones — which is what `autoscaling.maxWorkers` is for. Raise it **before** provisioning the full profile; the shipped example deliberately uses small values so an idle platform costs little.

## Cost considerations

You pay for: the control-plane droplet, each worker droplet, one load balancer (created by the cloud-controller-manager for the Gateway Service), and the block volumes that remain after the node-local default. Worker disks are 256 GiB, shared with the containerd image cache. DNS records and the VPC are not billed.

Three levers, in order of effect: `autoscaling.maxWorkers` (the ceiling you actually pay), `nodeCount` (what an idle cluster costs), and the enabled package set. DOKS mode moves the control plane to DigitalOcean's free managed one, at the price of losing SSH access to nodes and the Adhar node autoscaler.

## Day-2 operations

```bash
adhar cluster scale dev --workers 10 -p digitalocean -f config.yaml
adhar upgrade --diff-only                              # preview the stack diff
adhar upgrade --yes                                    # converge foundation + stack
adhar cluster upgrade dev --version 1.37.2 -p digitalocean -f config.yaml
adhar up -f config.yaml --env dev --recreate --force   # delete + fresh cluster
```

> Pause the autoscaler before a manual capacity test. It treats an empty new node on an idle cluster as removable and will drain one within five minutes: `kubectl -n adhar-system patch adharplatform dev --type=merge -p '{"spec":{"autoscaling":{"enabled":false}}}'`.

Inspect autoscaler decisions at `.status.autoscaling` on the `AdharPlatform` — `workers`, `lastScaleUp`, `lastScaleDown`, `underutilizedSince`, `lastReason`.

## Tear down

```bash
adhar down -f config.yaml --env dev --purge-orphaned-volumes
# or a single cluster:
adhar cluster delete dev --force -f config.yaml --purge-orphaned-volumes
```

Removes, in order: the CCM LoadBalancer(s), every droplet, block volumes tagged `adhar-cluster-dev`, the firewall, the VPC, the SSH key, and local state. `--purge-orphaned-volumes` additionally sweeps unattached `pvc-*` volumes in the region carrying no other cluster's tag — use it only when the account has no other Kubernetes cluster there.

**DNS records are left in place** (external-dns is upsert-only and never deletes). Verify the teardown rather than assuming it — a half-succeeded teardown keeps billing:

```bash
doctl --context default -t "$TOKEN" compute droplet list --format Name,Status --no-header
doctl --context default -t "$TOKEN" compute volume list --format Name,Region --no-header
doctl --context default -t "$TOKEN" compute load-balancer list --format Name,IP --no-header
doctl --context default -t "$TOKEN" compute firewall list --format Name --no-header
doctl --context default -t "$TOKEN" vpcs list --format Name --no-header
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `doctl account get` returns 401, so the token "looks broken" | Scoped tokens 401 on `/v2/account` by design | Probe `doctl compute droplet list` instead |
| `-t`/`DIGITALOCEAN_ACCESS_TOKEN` appear to be ignored by `doctl` | `doctl`'s config has a `context:` | `doctl --context default -t "$TOKEN" …` |
| `cluster "adhar-mgmt" not found in any configured provider` | The cluster is named after the **environment** (`dev`), not `clusterConfig.name` | Use `dev` in `cluster list/scale/delete` |
| Certificate never issues; every app reachable | The apex is delegated to nameservers holding no zone → `SERVFAIL looking up CAA` | Delegate the subdomain only, or host the apex zone too |
| StatefulSets `Pending` on `exceed max volume count` | Something asked for `adhar-block`; 7 volumes per droplet | Raise `maxWorkers`, or leave those PVCs on `adhar-local` |
| `422` on droplet create | Account droplet limit, or a size that does not exist in the region | Ask DigitalOcean to raise the limit; check the size |
| An orphan droplet appears then the run fails | A leftover sample environment block sized for another cloud | Keep only real environments in the file, and always pass `--env` |
| `--workers <current>` is a no-op and billing continues | A droplet was created but never joined, so the provider's count and `kubectl get nodes` disagree | Compare `adhar cluster status` with `kubectl get nodes`, delete the stray |
| Browser shows a stranger's certificate after a recreate | A manual `*.<host>` wildcard record shadows hostnames and points at a recycled LB IP | Never keep a manual wildcard in the platform zone |

## Next steps

- [Providers Overview](/docs/providers/overview) — the provider model and the comparison table
- [Accessing the Platform](/docs/operations/accessing-the-platform) — SSO, kubeconfig, and platform identity
- [Production](/docs/operations/production) — HA posture, backups, hardening
- [Troubleshooting](/docs/reference/troubleshooting) — symptom-to-section lookup
