---
title: "Google Cloud"
section: "Cloud Providers"
order: 5
path: "/docs/providers/gcp"
---

# Google Cloud

This page takes you from a new Google Cloud project to a working Adhar platform on Compute Engine: billing, a service account with the right roles, APIs, three quotas, a Cloud DNS zone, a complete config file, `adhar up`, verification and a teardown that leaves nothing billing. It is for platform engineers on GCP. This is the **most thoroughly exercised cloud path after DigitalOcean** — taken end to end on a real project, including autoscaling, the full catalogue and a clean teardown. The setup cost sits in one place: a brand-new project has every API switched off and a service account with no permissions, and the failures that follow point almost anywhere except their cause.

## At a glance

| | |
|---|---|
| **Provider key** | `gcp` |
| **Default model** | GCE + kubeadm (`clusterMode: compute`; Ubuntu 24.04, containerd, Cilium from the bootstrap) |
| **Other modes** | `managed` = GKE (needs `gke-gcloud-auth-plugin`) · `provided` = an existing cluster |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **Credentials** | Service-account key file, ADC, compute metadata or workload identity |
| **DNS / trusted TLS** | Cloud DNS DNS-01 wildcard; the solver needs a mountable key file |
| **Key quotas** | Regional `CPUS`, project-wide `CPUS_ALL_REGIONS`, and `SSD_TOTAL_GB` vs `DISKS_TOTAL_GB` |
| **Default StorageClass** | `adhar-local` (node-local); `adhar-block` PD is installed but not default |
| **Verification** | Live-verified (compute path) |
| **Time to usable** | Unmeasured — the live run recorded behaviour, not timings |
| **Best for** | Teams standardized on GCP |

## What gets built

```diagram
dp-gcp-topology
```

The provider creates a VPC network and subnet, tag-scoped firewall rules, and the instances — each with an **ephemeral external IP**, so there is no Cloud NAT and no NAT charge, but nodes are internet-facing. The forwarding rule and target pool in front of the Gateway come later from `cloud-provider-gcp` inside the cluster. On the live teardown that mattered: a load balancer and 41 CSI disks survived the first `adhar down`, which is why teardown now sweeps them explicitly.

## Which credential does what

```diagram
pv-gcp-ownership
```

**Workload identity where it works, a key file where it does not.** For provisioning, prefer the ambient identity: `useApplicationDefault: true`, `useComputeMetadata: true` when Adhar runs on a GCE instance, or `useWorkloadIdentity: true` when it runs inside a cluster. The nodes Adhar creates carry a service account with `cloud-platform` scope, which is how the cloud-controller-manager authenticates without a Secret.

**Application Default Credentials are not enough once `dnsProvider` is set.** external-dns and the cert-manager DNS-01 solver run inside the cluster and need a key they can mount, so a deployment with a real `defaultHost` fails at `configuring edge DNS (gcp)` unless you also supply `serviceAccountKeyFile` (or `GOOGLE_APPLICATION_CREDENTIALS`) together with `projectId`. Treat that key as a DNS credential and keep it out of Git.

## Step 1 — Prerequisites checklist

| ✓ | Item | Verify |
|---|---|---|
| ☐ | A project with billing enabled | `gcloud billing projects describe $PROJECT --format='value(billingEnabled)'` prints `True` |
| ☐ | A service account with four roles and a key file | `gcloud services list --project $PROJECT` works as that account |
| ☐ | Six APIs enabled, Service Usage first | `gcloud compute zones list --project $PROJECT` succeeds |
| ☐ | `CPUS`, `CPUS_ALL_REGIONS` and disk quota for the full cluster | Step 4 below |
| ☐ | A Cloud DNS zone delegated from your registrar | `dig +short NS $HOST` |
| ☐ | `adhar` (`make build`), `kubectl`, `gcloud`, `dig` | — |

```bash
PROJECT=adhar-cloud
REGION=asia-southeast1
```

Billing is not only about cost: the Cloud DNS and Compute APIs refuse to serve a project without it, and the error names billing only sometimes — so a provisioning run can fail in a way that looks like a permissions problem.

## Step 2 — Service account, roles and key

```bash
SA=adhar@$PROJECT.iam.gserviceaccount.com
gcloud iam service-accounts create adhar --project $PROJECT \
  --display-name "Adhar platform provisioner"
for role in roles/compute.admin roles/dns.admin roles/iam.serviceAccountUser \
            roles/serviceusage.serviceUsageAdmin; do
  gcloud projects add-iam-policy-binding $PROJECT --member "serviceAccount:$SA" --role $role
done
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

## Step 3 — Enable the APIs

```bash
gcloud services enable \
  serviceusage.googleapis.com cloudresourcemanager.googleapis.com \
  compute.googleapis.com container.googleapis.com \
  dns.googleapis.com iam.googleapis.com --project $PROJECT
```

Two traps. **`container.googleapis.com` is required even in compute mode** — the provider constructs its GKE client unconditionally, so a disabled Container API fails provider construction before any instance exists. And **Service Usage cannot bootstrap itself**: on a project where it has never been used, the API needed to turn APIs on is itself off. Break the cycle once from the console with a user account.

## Step 4 — Quotas: three of them, and they are not the same quota

| Metric | Scope | Default that bites | What it stops |
|---|---|---|---|
| `CPUS` | per region | commonly 8–24 on a new project | Node creation in that region |
| `CPUS_ALL_REGIONS` | **project-wide** | 12 on a new project | The last worker of a first deployment — it is not on the region object, so a regional-only check misses it |
| `SSD_TOTAL_GB` | per region | 250 GB | Any cluster on `pd-balanced` or `pd-ssd`; `pd-standard` counts against `DISKS_TOTAL_GB` (2 TB) instead |

```bash
gcloud compute regions describe $REGION --project $PROJECT \
  --format='table(quotas.metric,quotas.limit,quotas.usage)' | grep -E 'CPUS|DISKS|SSD'
gcloud compute project-info describe --project $PROJECT \
  --format='table(quotas.metric,quotas.limit)' | grep CPUS_ALL_REGIONS
```

Size for the full cluster: the shipped `prod` environment is an `e2-standard-4` control plane plus up to five `e2-standard-8` workers — 4 + (5 × 8) = **44 vCPU** on both `CPUS` and `CPUS_ALL_REGIONS`. The disk quota is the subtle one: three 100 GB `pd-balanced` workers plus a control plane already exceed a default `SSD_TOTAL_GB`, and the create fails partway with `QUOTA_EXCEEDED`. The shipped config chooses `pd-standard` for that reason; raise `SSD_TOTAL_GB` and switch to `pd-balanced` for better etcd and image-pull latency.

## Step 5 — Cloud DNS zone and delegation

```bash
HOST=cloud.example.com        # must equal globalSettings.defaultHost
gcloud dns managed-zones create adhar-platform --project $PROJECT \
  --dns-name "$HOST." --description "Adhar platform zone for $HOST"
gcloud dns managed-zones describe adhar-platform --project $PROJECT \
  --format='value(nameServers)'
```

That prints four `ns-cloud-XX.googledomains.com.` nameservers. At your registrar, in the **parent** zone, add one `NS` record per nameserver for the subdomain **label only** (`cloud` for `cloud.example.com`). The parent apex and its records are untouched, so a mistake here cannot take your main site down. **Verify:**

```bash
dig +short NS $HOST                     # the four googledomains nameservers
dig +noall +comment CAA "${HOST#*.}"    # status: NOERROR — NOT SERVFAIL
```

> **The apex must resolve, even though nothing of yours lives there.** Let's Encrypt reads CAA up the tree, so issuing `*.cloud.example.com` also queries CAA for `example.com`. The first live GCP bring-up hit exactly this: the subdomain resolved perfectly, every app was reachable, and issuance could never succeed because the apex had been delegated to nameservers holding no zone. The error names CAA, so it reads as a certificate fault; it is a delegation fault.

Skipping DNS is supported — the platform runs self-signed and cert-manager issues a trusted certificate once the delegation is fixed. To skip it permanently, set `dnsProvider: none` and add a wildcard `A` record for `*.<host>` by hand once the Gateway has its external IP.

## Step 6 — Write the configuration

```bash
cp examples/gcp-config.yaml config.yaml    # change defaultHost, email, projectId, key path
```

The shipped file, annotated:

```yaml
apiVersion: v1alpha1
kind: Config

globalSettings:
  adharContext: adhar-mgmt
  defaultHost: cloud.example.com         # YOUR Cloud DNS zone (Step 5)
  defaultHttpPort: 80
  defaultHttpsPort: 443                  # a real LB fronts the cloud path
  enableHAMode: false
  email: admin@example.com               # Let's Encrypt expiry notices
  dnsProvider: gcp                       # Cloud DNS for external-dns + DNS-01; `none` = self-signed

providers:
  gcp:
    type: gcp
    region: asia-southeast1
    primary: true                        # only GCP's Crossplane providers install
    projectId: your-gcp-project          # needed by the DNS-01 issuer
    serviceAccountKeyFile: ~/.config/gcloud/your-service-account.json  # mountable key; ~ expanded
    # useApplicationDefault: true        # provisioning-only alternative
    # useComputeMetadata: true           # when adhar runs on a GCE instance
    # useWorkloadIdentity: true          # when adhar runs inside a cluster
    clusterMode: compute                 # GCE + kubeadm; `managed` = GKE; `provided` = existing
    config:
      project_id: your-gcp-project       # REQUIRED — no default
      zone: asia-southeast1-a
      vpc_name: adhar-vpc
      subnet_name: adhar-subnet
      subnet_cidr: 10.20.0.0/16          # the firewall rules are built from this
      machine_type: e2-standard-4        # provider default; sizes the control plane
      disk_type: pd-standard             # DISKS_TOTAL_GB, not SSD_TOTAL_GB (Step 4)
      disk_size_gb: 100
      image_family: ubuntu-2404-lts-amd64
      image_project: ubuntu-os-cloud
      # admin_source_ranges:             # who may reach SSH (22) and the API (6443);
      #   - 203.0.113.4/32               # omitted = open to the internet, with a warning
      labels:
        environment: production
        project: adhar

environmentTemplates:
  prod-defaults:
    clusterConfig:
      - { key: autoScale, value: "true" }
    coreServices:                        # may not be empty; recorded, otherwise inert
      cilium:
        chart: { repoURL: https://helm.cilium.io/, name: cilium, version: 1.15.7 }

environments:                            # dev, test, prod as namespaces on ONE cluster
  dev:
    isolation: namespace
    type: non-production
    provider: gcp
    region: asia-southeast1
    template: prod-defaults
    clusterConfig:
      - { key: name,        value: adhar-dev }
      - { key: machineType, value: e2-standard-8 }   # workers: 8 vCPU / 32 GiB
      - { key: nodeCount,   value: "2" }
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 5 }
  test:                                  # identical to dev except name: adhar-test
    isolation: namespace
    type: non-production
    provider: gcp
    region: asia-southeast1
    template: prod-defaults
    clusterConfig:
      - { key: name,        value: adhar-test }
      - { key: machineType, value: e2-standard-8 }
      - { key: nodeCount,   value: "2" }
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 5 }
  prod:
    isolation: namespace
    type: production                     # sizes the shared cluster
    provider: gcp
    region: asia-southeast1
    template: prod-defaults
    clusterConfig:
      - { key: name,        value: adhar-prod }
      - { key: machineType, value: e2-standard-8 }
      - { key: nodeCount,   value: "4" }
    autoscaling: { enabled: true, minWorkers: 3, maxWorkers: 5 }
```

`project_id` has **no default** — a missing or placeholder value is the most common first-run failure, and it creates an orphan instance before failing. `subnet_cidr` is genuinely used: the firewall rules cover SSH (22), the API server (6443), all internal traffic from the subnet, HTTP/HTTPS plus the NodePort range, and Google's load-balancer health-check ranges — without that last rule a `LoadBalancer` Service has backends that never turn healthy. `clusterConfig` keys match ignoring case and separators. `clusterMode: gke` and `useManagedK8s: true` are rejected with a message naming `managed`.

### Node sizing, from measurement

Observed on a real cluster running the ~80-application production catalogue (340+ pods):

| Workers (`e2-standard-8`) | vCPU | Result |
|---|---|---|
| 2 | 16 | 58 pods unschedulable; platform unusable |
| 4 | 32 | One node at 88% CPU, a kubelet went NotReady, 106 pods lost Ready and Services lost endpoints |
| 6 | 48 | Stable |

The catalogue is CPU-bound here. The shipped `prod` starts at 4 and stops at 5 to fit a default-sized quota grant; if you enable the full catalogue, raise `maxWorkers` to 6–7 and the quotas with it, and let the autoscaler buy capacity when pods go Pending.

## Step 7 — Dry run

```bash
gcloud auth activate-service-account --key-file ~/.config/gcloud/$PROJECT-adhar.json
gcloud config set project $PROJECT

./adhar up -f config.yaml --env prod --dry-run
```

Activating the key makes the CLI act as the identity the provisioner will use, so a permissions problem surfaces here rather than halfway through a create. `--dry-run` resolves the config and prints the cluster shape; it checks no permissions, no quota and no DNS.

## Step 8 — Provision

```bash
./adhar up -f config.yaml --env prod
```

GCP has no deep per-action preflight yet, so the first check is honest about it (shown with `--verbose`):

```text
preflight ● credentials and API access: the provider answered; note this provider
            has no deep preflight yet, so quota and per-action permissions are
            unverified
```

Before creating anything the provider then runs its own quota check against `CPUS_ALL_REGIONS` and `SSD_TOTAL_GB`/`DISKS_TOTAL_GB`. A shortfall stops the run and names the metric, the shortfall and the remedy — including the `pd-standard` escape hatch when the problem is `SSD_TOTAL_GB`. The checklist then reads `Cloud cluster · adhar · gcp · asia-southeast1` and runs through the same stages as every cloud.

After the first joins, compute mode installs the `cloud-provider-gcp` manifest, the Persistent Disk CSI driver (`gce-pd-csi-driver/cloud-sa` from the key file, or ADC when none is configured), the `adhar-block` pd-balanced StorageClass and the CSI startup-taint toleration. The catalogue keeps converging for 30–45 minutes after the CLI returns.

## Step 9 — Verify

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig     # context `adhar`
kubectl get nodes                                        # all Ready
kubectl -n adhar-system get svc | grep -i gateway        # an external IP, not <pending>
gcloud compute firewall-rules list --project $PROJECT --format='value(name)' | grep health-checks
./adhar get status      # platform conditions + per-package health
./adhar get apps        # application sync/health
./adhar get secrets     # service credentials
```

## Day-2 operations

```bash
./adhar cluster list --file config.yaml
./adhar cluster scale adhar --workers 6 -p gcp -f config.yaml
./adhar cluster upgrade adhar --version 1.37.2 -p gcp -f config.yaml
./adhar upgrade --diff-only && ./adhar upgrade --yes
```

### Managed GKE instead

```yaml
providers:
  gcp:
    type: gcp
    clusterMode: managed     # GKE instead of GCE + kubeadm
```

Creates the VPC and subnet with the same helpers as compute mode, then a zonal GKE cluster in the provider's `zone` with one node pool per node group (VPC-native, REGULAR release channel unless pinned). The kubeconfig authenticates through `gke-gcloud-auth-plugin`, so it **must be on PATH** (`gcloud components install gke-gcloud-auth-plugin`) wherever that kubeconfig is used. GKE adds a cluster-management charge, and installing Cilium on a managed plane that ships its own CNI is the least-verified part of managed mode.

## Tear down, then check the bill

```bash
./adhar down -f config.yaml --env prod
./adhar down -f config.yaml --env prod --purge-orphaned-volumes
```

Teardown deletes the forwarding rule, target pool and `k8s-*` firewall rules unconditionally — they hold no data, nothing else records them, and the firewall rule pins the VPC so the network cannot be removed while it exists. Unattached `pvc-*` disks go only with `--purge-orphaned-volumes`, because a disk may still hold data worth keeping; without the flag they are named in the output. Teardown rediscovers the cluster from the project by network tag and naming convention, so a missing local state file does not block it. On the live run this removed every instance, the forwarding rule, the target pool, the firewall rules and 41 `pvc-*` disks with no manual step. **Check:**

```bash
gcloud compute instances list --project $PROJECT
gcloud compute forwarding-rules list --project $PROJECT
gcloud compute disks list --project $PROJECT --filter='-users:*'    # unattached disks
```

**What you pay for while it runs:** node hours (`maxWorkers` is the spend ceiling), the Gateway's forwarding rule and target pool, and one persistent disk per `adhar-block` PersistentVolume on top of each node's boot disk. No Cloud NAT is created — set `admin_source_ranges` unless you mean to leave SSH and the API server open. GKE adds a cluster-management charge.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `SERVICE_DISABLED` on a compute call | An API is off | `gcloud services enable …` — and enable Service Usage from the console first |
| `AUTH_PERMISSION_DENIED` from `gcloud services list` | `roles/serviceusage.serviceUsageAdmin` is missing | Grant the role; this is not an API problem |
| Provider construction fails before any instance exists | `container.googleapis.com` disabled | Enable it even in compute mode |
| An orphan instance is created, then the run fails | `project_id` unset or a placeholder | Set `config.project_id`; delete the orphan |
| Create fails partway with `QUOTA_EXCEEDED` on disks | `pd-balanced`/`pd-ssd` against a 250 GB `SSD_TOTAL_GB` | Use `disk_type: pd-standard`, or raise `SSD_TOTAL_GB` |
| Last worker of a first deployment fails while the regional quota looks fine | Project-wide `CPUS_ALL_REGIONS` (default 12) | Raise the project-wide cap, not only the regional one |
| Workers never finish joining | Node-to-node traffic dropped by a firewall source range that does not match `subnet_cidr` | Set `subnet_cidr` to the range the nodes actually use |
| `LoadBalancer` Service stays `<pending>` | Health-check ranges or CCM RBAC missing, so the address is never written back | Confirm the `*-allow-health-checks` rule exists and the CCM pod is running |
| Fails at `configuring edge DNS (gcp)` | ADC alone; no mountable key | Set `serviceAccountKeyFile` **and** `projectId` |
| The DNS-01 ClusterIssuer is rejected outright | The cert-manager `cloudDNS` solver requires a `project` field | Supply `projectId` so the issuer renders with it |
| `useManagedK8s has been removed` / `clusterMode "gke" names a cloud service` | An old config spelling | `clusterMode: managed` |

## Next steps

- [Providers Overview](/docs/providers/overview) — the shared model, storage classes and the comparison table
- [DigitalOcean](/docs/providers/digitalocean) — the measured reference run
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Troubleshooting](/docs/reference/troubleshooting) — decoding autoscaler and volume failures
