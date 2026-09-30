---
title: "Google Cloud"
section: "Cloud Providers"
order: 5
path: "/docs/providers/gcp"
---

# Google Cloud

Run Adhar on Google Cloud (GCP) with GCE instances + kubeadm (default) or managed **GKE** (opt-in). This is the **most thoroughly exercised cloud path after DigitalOcean** — taken end to end on a real project, including autoscaling, the full catalogue and a teardown that left nothing billing. The setup cost sits in one place: a brand-new project has every API switched off and a service account with no permissions, and the failures that follow point almost anywhere except their cause.

## At a glance

| | |
|---|---|
| **Provider key** | `gcp` |
| **Default model** | GCE + kubeadm (Ubuntu 24.04, containerd, Cilium from the bootstrap) |
| **Managed option** | GKE (`useManagedK8s: true` / `clusterMode: gke`; needs `gke-gcloud-auth-plugin`) |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **Credentials** | Service-account key file, ADC, compute metadata or workload identity |
| **DNS / trusted TLS** | Cloud DNS DNS-01 wildcard; the solver needs a mountable key file |
| **Key quotas** | Regional `CPUS`, project-wide `CPUS_ALL_REGIONS`, and `SSD_TOTAL_GB` vs `DISKS_TOTAL_GB` |
| **Default StorageClass** | `adhar-local` (node-local); `adhar-block` PD is installed but not default |
| **Verification** | Live-verified (compute path) |
| **Best for** | Teams standardized on GCP |

## Which credential does what

```text
  your machine                          Google Cloud project
 ┌──────────────┐  compute / serviceusage / resourcemanager
 │ adhar up     │ ──────────────────────────────────────▶  VPC, subnet,
 │ ADC, key, or │                                          firewall, GCE
 │ metadata     │
 └──────────────┘
         │ kubeadm over SSH, then Helm/kustomize on the control plane
         ▼
 ┌────────────────────────── cluster ──────────────────────────┐
 │ cloud-provider-gcp CCM   ← the NODES' own service account   │
 │                             (cloud-platform scope)          │
 │ PD CSI driver            ← gce-pd-csi-driver/cloud-sa, from │
 │                             the key file, else ADC          │
 │ external-dns + cert-manager DNS-01                          │
 │                          ← a MOUNTED service-account key    │
 └─────────────────────────────────────────────────────────────┘
```

**Workload identity where it works, a key file where it does not.** For provisioning, prefer the ambient identity: `useApplicationDefault: true`, `useComputeMetadata: true` when Adhar runs on a GCE instance, or `useWorkloadIdentity: true` when it runs inside a cluster — nothing long-lived is stored and nothing needs rotating. The nodes Adhar creates follow the same principle: they carry a service account with `cloud-platform` scope, which is how the cloud-controller-manager authenticates without a Secret.

**Application Default Credentials are not enough once `dnsProvider` is set.** external-dns and the cert-manager DNS-01 solver run inside the cluster and need a key they can mount, so a deployment with a real `defaultHost` fails at `configuring edge DNS (gcp)` unless you also supply `serviceAccountKeyFile` (or `GOOGLE_APPLICATION_CREDENTIALS`) together with `projectId`. Treat that key as a DNS credential and keep it out of Git.

## One-time project setup

### 1. Project and billing

Billing is not only about cost: the Cloud DNS and Compute APIs refuse to serve a project without it, and the error names billing only sometimes — so a provisioning run can fail in a way that looks like a permissions problem.

```bash
PROJECT=adhar-cloud
REGION=asia-southeast1
gcloud billing projects describe $PROJECT --format='value(billingEnabled)'   # must print True
```

### 2. Service account, key and roles

```bash
SA=adhar@$PROJECT.iam.gserviceaccount.com
gcloud iam service-accounts create adhar --project $PROJECT \
  --display-name "Adhar platform provisioner"
gcloud iam service-accounts keys create ~/.config/gcloud/$PROJECT-adhar.json \
  --iam-account $SA --project $PROJECT
```

| Role | Why it is needed |
|---|---|
| `roles/compute.admin` | Instances, disks, networks, subnets, firewall rules, addresses, forwarding rules, health checks, backend services |
| `roles/dns.admin` | external-dns writes one record per app; cert-manager writes the ACME TXT records |
| `roles/iam.serviceAccountUser` | Required because the nodes themselves run as a service account |
| `roles/serviceusage.serviceUsageAdmin` | Enables and reads the APIs below |

The last one is the most often missed and the hardest to read, because its absence blames the API rather than the role. Tell the two apart:

```bash
gcloud services list --project $PROJECT        # AUTH_PERMISSION_DENIED -> role missing
gcloud compute zones list --project $PROJECT   # SERVICE_DISABLED       -> API off
```

### 3. Enable the APIs

```bash
gcloud services enable \
  serviceusage.googleapis.com cloudresourcemanager.googleapis.com \
  compute.googleapis.com container.googleapis.com \
  dns.googleapis.com iam.googleapis.com --project $PROJECT
```

Two traps. **`container.googleapis.com` is required even in kubeadm mode** — the provider constructs its GKE client unconditionally, so a disabled Container API fails provider construction before any instance exists. And **Service Usage cannot bootstrap itself**: on a project where it has never been used, the API needed to turn APIs on is itself off. Break the cycle once from the console with a user account.

### 4. Quotas — three of them, and they are not the same quota

| Metric | Scope | Default that bites | What it stops |
|---|---|---|---|
| `CPUS` | per region | commonly 8–24 on a new project | Node creation in that region |
| `CPUS_ALL_REGIONS` | **project-wide** | 12 on a new project | The last worker of a first deployment — it is not on the region object, so a regional-only check misses it |
| `SSD_TOTAL_GB` | per region | 250 GB | Any cluster on `pd-balanced` or `pd-ssd`; `pd-standard` counts against `DISKS_TOTAL_GB` (2 TB) instead |

```bash
gcloud compute regions describe $REGION --project $PROJECT \
  --format='table(quotas.metric,quotas.limit,quotas.usage)' | grep -E 'CPUS|DISKS|SSD'
```

The disk quota is the subtle one: three 100 GB `pd-balanced` workers plus a control plane already exceed a default `SSD_TOTAL_GB`, and the create fails partway with `QUOTA_EXCEEDED`. The shipped `config.gcp.yaml` chooses `pd-standard` for that reason; raise `SSD_TOTAL_GB` and switch to `pd-balanced` for better etcd and image-pull latency.

### 5. Cloud DNS zone and registrar delegation

```bash
HOST=cloud.example.com        # must equal globalSettings.defaultHost
gcloud dns managed-zones create adhar-platform --project $PROJECT \
  --dns-name "$HOST." --description "Adhar platform zone for $HOST"
gcloud dns managed-zones describe adhar-platform --project $PROJECT \
  --format='value(nameServers)'
```

That prints four `ns-cloud-XX.googledomains.com.` nameservers. At your registrar, in the **parent** zone, add one `NS` record per nameserver for the subdomain **label only** (`cloud` for `cloud.example.com`). The parent apex and its existing records are untouched, so a mistake here cannot take your main site down.

```bash
dig +short NS $HOST                     # the four googledomains nameservers
dig +noall +comment CAA "${HOST#*.}"    # status: NOERROR — NOT SERVFAIL
```

> **The apex must resolve, even though nothing of yours lives there.** Let's Encrypt reads CAA up the tree, so issuing `*.cloud.example.com` also queries CAA for `example.com`. This platform hit it: the subdomain resolved perfectly, every app was reachable, and issuance could never succeed because the apex had been delegated to nameservers holding no zone. The error names CAA, so it reads as a certificate fault; it is a delegation fault.

Skipping DNS is supported — the platform runs self-signed and cert-manager issues a trusted certificate once the delegation is fixed. To skip it permanently, set `dnsProvider: none` and add a wildcard `A` record for `*.<host>` by hand once the Gateway has its external IP.

## Configuration

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: cloud.example.com
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: false
  email: admin@example.com
  dnsProvider: gcp

providers:
  gcp:
    type: gcp
    region: asia-southeast1
    primary: true
    projectId: adhar-cloud
    serviceAccountKeyFile: ~/.config/gcloud/adhar-cloud-adhar.json   # needed for edge DNS
    # useApplicationDefault: true    # provisioning-only alternative
    # useComputeMetadata: true       # when Adhar runs on a GCE instance
    # useWorkloadIdentity: true      # when Adhar runs inside a cluster
    config:
      project_id: adhar-cloud        # REQUIRED — no default
      zone: asia-southeast1-a
      vpc_name: adhar-vpc
      subnet_name: adhar-subnet
      subnet_cidr: 10.20.0.0/16      # the firewall rules are built from this
      machine_type: e2-standard-8    # 8 vCPU / 32 GiB
      disk_type: pd-standard         # see the SSD_TOTAL_GB trap above
      disk_size_gb: 100
      image_family: ubuntu-2404-lts-amd64
      image_project: ubuntu-os-cloud
      # Who may reach SSH (22) and the API server (6443). Omitting it opens both
      # to the internet and logs a warning at provisioning time.
      # admin_source_ranges: ["203.0.113.4/32"]

environmentTemplates:
  prod-defaults:
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
  production:
    type: production
    provider: gcp
    region: asia-southeast1
    template: prod-defaults
    clusterConfig:
      - { key: name,        value: adhar-mgmt }
      - { key: machineType, value: e2-standard-8 }
      - { key: nodeCount,   value: "4" }
    autoscaling:
      enabled: true
      minWorkers: 3
      maxWorkers: 7
```

`project_id` has **no default** — set it. A missing or placeholder value is the most common first-run failure, and it creates an orphan instance before failing. `clusterConfig` keys match ignoring case and separators, so `machineType`, `machine_type` and `MACHINE_TYPE` are one key.

`subnet_cidr` is genuinely used: the internal firewall rule is built from it. Rules are scoped to a per-cluster network tag and cover SSH (22), the API server (6443), all internal traffic, HTTP/HTTPS plus the NodePort range, and Google's load-balancer health-check ranges — without that last rule a `LoadBalancer` Service has backends that never turn healthy.

### Node sizing, from measurement

Observed on a real cluster running the ~80-application production catalogue (340+ pods):

| Workers | vCPU | Result |
|---|---|---|
| 2 | 16 | 58 pods unschedulable; platform unusable |
| 4 | 32 | One node at 88% CPU, a kubelet went NotReady, 106 pods lost Ready and Services lost endpoints |
| 6 | 48 | Stable |

Hence a floor of 3, a start of 4 and a ceiling of 7 — 60 vCPU, inside a 64-vCPU `CPUS_ALL_REGIONS` grant. Start small and let the autoscaler buy capacity when pods go Pending; the catalogue is CPU-bound here.

### Managed GKE

```yaml
providers:
  gcp:
    type: gcp
    useManagedK8s: true      # or clusterMode: gke
```

Creates the VPC and subnet with the same helpers as compute mode, then a zonal GKE cluster in the provider's `zone` with one node pool per `nodeGroups` entry (VPC-native, REGULAR release channel unless pinned). The kubeconfig authenticates through `gke-gcloud-auth-plugin`, so it **must be on PATH** (`gcloud components install gke-gcloud-auth-plugin`) wherever that kubeconfig is used.

## A full run

```bash
# Activate the key file rather than only `gcloud auth application-default login`:
# it makes the CLI act as the identity the provisioner will use, so a permissions
# problem surfaces here rather than halfway through a create.
gcloud auth activate-service-account --key-file ~/.config/gcloud/$PROJECT-adhar.json
gcloud config set project $PROJECT

./adhar up -f config.gcp.yaml --env production --dry-run   # validates config; creates nothing
./adhar up -f config.gcp.yaml --env production
```

`--dry-run` resolves the configuration and prints the cluster shape. It checks no permissions, no quota and no DNS. The GCP provider has no deep per-action preflight yet, so `adhar up` reports honestly and then applies its own quota check before creating anything:

```text
preflight ● credentials and API access: the provider answered; note this provider
            has no deep preflight yet, so quota and per-action permissions are
            unverified
```

A quota shortfall stops the run and names the metric, the shortfall and the remedy — including the `pd-standard` escape hatch when the problem is `SSD_TOTAL_GB`. On success the CLI prints the provisioning summary and the platform URLs. Then:

```bash
export KUBECONFIG=~/.adhar/clusters/production/kubeconfig
kubectl get nodes
./adhar get status      # platform conditions + per-package health
./adhar get apps        # application sync/health
./adhar get secrets     # service credentials
```

Always pass `--env`. Without it, `adhar up -f` provisions **every** environment in the file, and a leftover sample block sized for another cloud creates an orphan instance and then fails. The catalogue keeps converging for 30–45 minutes after the CLI returns while the autoscaler adds workers.

## Cost

Node hours dominate and `maxWorkers` is the spend ceiling. **No Cloud NAT is created** — every node gets an ephemeral external IP instead, which avoids the NAT gateway's hourly and per-GB charges but makes nodes internet-facing, so set `admin_source_ranges` unless you mean to leave SSH and the API server open. Beyond node hours you pay for the Gateway's load balancer (forwarding rule and target pool, created by the in-cluster cloud-controller-manager and invisible to Adhar's state file until teardown) and one persistent disk per `adhar-block` PersistentVolume. Node-local volumes add nothing beyond the node disk. GKE adds a cluster-management charge.

## Tear down

```bash
./adhar down -f config.gcp.yaml --env production
./adhar down -f config.gcp.yaml --env production --purge-orphaned-volumes
```

Teardown deletes the forwarding rule, target pool and `k8s-*` firewall rules unconditionally — they hold no data, nothing else records them, and the firewall rule pins the VPC so the network cannot be removed while it exists. Unattached `pvc-*` disks go only with `--purge-orphaned-volumes`, because a disk may still hold data worth keeping; without the flag they are named in the output. Teardown rediscovers the cluster from the project by network tag and naming convention, so a missing local state file no longer blocks it.

```bash
gcloud compute forwarding-rules list --project <PROJECT>
gcloud compute disks list --project <PROJECT> --filter='-users:*'
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `SERVICE_DISABLED` on a compute call | An API is off | `gcloud services enable …` — and enable Service Usage from the console first |
| `AUTH_PERMISSION_DENIED` from `gcloud services list` | `roles/serviceusage.serviceUsageAdmin` is missing | Grant the role; this is not an API problem |
| Provider construction fails before any instance exists | `container.googleapis.com` disabled | Enable it even in kubeadm mode |
| An orphan instance is created, then the run fails | `project_id` unset or a placeholder | Set `config.project_id`; delete the orphan |
| Create fails partway with `QUOTA_EXCEEDED` on disks | `pd-balanced`/`pd-ssd` against a 250 GB `SSD_TOTAL_GB` | Use `disk_type: pd-standard`, or raise `SSD_TOTAL_GB` |
| Last worker of a first deployment fails while the regional quota looks fine | Project-wide `CPUS_ALL_REGIONS` (default 12) | Raise the project-wide cap, not only the regional one |
| Workers never finish joining | Node-to-node traffic dropped by a firewall source range that does not match `subnet_cidr` | Set `subnet_cidr` to the range the nodes actually use |
| `LoadBalancer` Service stays `<pending>` | Health-check ranges or CCM RBAC missing, so the address is never written back | Confirm the `*-allow-health-checks` rule exists and the CCM pod is running |
| Fails at `configuring edge DNS (gcp)` | ADC alone; no mountable key | Set `serviceAccountKeyFile` **and** `projectId` |
| The DNS-01 ClusterIssuer is rejected outright | The cert-manager `cloudDNS` solver requires a `project` field | Supply `projectId` so the issuer renders with it |
| Scale-up fails with `credentials file not found` | An in-cluster controller inherited a credential **path** from the machine that ran `adhar up` | Fixed — credential paths are stripped from the recorded config; re-run on a current build |

## See also

- [Providers Overview](/docs/providers/overview) — the shared model, storage classes and commands
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Production](/docs/operations/production) — hardening, HA and backups
- [Troubleshooting](/docs/reference/troubleshooting) — decoding autoscaler and volume failures
