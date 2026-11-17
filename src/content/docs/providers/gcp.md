---
title: "Google Cloud"
section: "Cloud Providers"
order: 5
path: "/docs/providers/gcp"
---

# Google Cloud

Take a new Google Cloud project to a working Adhar platform on Compute Engine. This page is for platform engineers on GCP. You enable billing and six APIs, create a service account with four roles, raise three quotas, delegate a Cloud DNS zone, write one config file and run `adhar up`. Then you learn how to check, scale, upgrade and tear the cluster down.

Most of the setup effort is in the project itself. A new project has every API switched off and a service account with no permissions, and the resulting errors rarely name their cause.

## At a glance

| | |
|---|---|
| **Provider key** | `gcp` |
| **Status** | `status:complete` for compute mode · `status:in-progress` for managed GKE |
| **Default model** | GCE + kubeadm (`clusterMode: compute`; Ubuntu 24.04 with the shipped config, containerd, Cilium from the bootstrap) |
| **Other modes** | `managed` = GKE (needs `gke-gcloud-auth-plugin`) · `provided` = an existing cluster |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **Credentials** | A service-account key file (needed for DNS), or Application Default Credentials for provisioning only |
| **DNS / trusted TLS** | Cloud DNS DNS-01 wildcard; the solver needs a mountable key file |
| **Key quotas** | Regional `CPUS`, project-wide `CPUS_ALL_REGIONS`, and `SSD_TOTAL_GB` or `DISKS_TOTAL_GB` |
| **Default StorageClass** | `adhar-local` (node-local); `adhar-block` (Persistent Disk) is installed but not default |
| **Best for** | Teams standardized on GCP |

## Topology

```diagram
dp-gcp-topology
```

The provider creates a VPC network and subnet, tag-scoped firewall rules, and the instances. Each instance gets an **ephemeral external IP**, so there is no Cloud NAT and no NAT charge, but the nodes are internet-facing.

The forwarding rule and target pool in front of the Gateway are created later, by `cloud-provider-gcp` inside the cluster. The provider's own resource tracker never sees them, which is why teardown sweeps them explicitly.

### Which credential does what

```diagram
pv-gcp-ownership
```

| Component | Credential |
|---|---|
| `adhar up` on your machine | The key file, or Application Default Credentials (`useApplicationDefault: true`), which also cover the GCE metadata server |
| Cloud-controller-manager | The nodes' own service account, which carries the `cloud-platform` scope. No Secret |
| Persistent Disk CSI driver | `gce-pd-csi-driver/cloud-sa`, from the key file, else Application Default Credentials |
| external-dns and the cert-manager DNS-01 solver | A **mounted** service-account key |

**Use a key file unless you skip DNS.** The DNS components run inside the cluster and need a key they can mount. With a real `defaultHost`, a deployment fails at `configuring edge DNS (gcp)` unless you supply `serviceAccountKeyFile` (or `GOOGLE_APPLICATION_CREDENTIALS`) **and** the provider-level `projectId` (or `GOOGLE_PROJECT`). `config.project_id` alone is not enough for this step. Treat the key as a DNS credential and keep it out of Git.

`useComputeMetadata` is accepted but behaves like the default chain. `useWorkloadIdentity` is not read from `config.yaml`.

## Prerequisites

| Requirement | Check |
|---|---|
| A project with billing enabled | `gcloud billing projects describe $PROJECT --format='value(billingEnabled)'` prints `True` |
| A service account with four roles and a key file | `gcloud services list --project $PROJECT` works as that account |
| Six APIs enabled, Service Usage first | `gcloud compute zones list --project $PROJECT` succeeds |
| `CPUS`, `CPUS_ALL_REGIONS` and disk quota for the full cluster | See [Quotas](#quotas) |
| A Cloud DNS zone delegated from your registrar | `dig +short NS $HOST` |
| `adhar`, `kubectl`, `gcloud` and `dig` on your PATH | `adhar version` |

The platform stack is built into the binary, so `adhar up` works from any directory; there is no repository to clone. See [Installation](/docs/getting-started/installation) to install the CLI. Set two shell variables the commands below use:

```bash
PROJECT=<project-id>
REGION=asia-southeast1
```

Billing is not only about cost. The Cloud DNS and Compute APIs refuse to serve a project without it, and the error only sometimes names billing, so it can look like a permissions problem.

### Service account

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
| `roles/iam.serviceAccountUser` | The nodes themselves run as a service account |
| `roles/serviceusage.serviceUsageAdmin` | Enables and reads the APIs below |

The last role is the one most often missed, and when it is missing the error blames the API rather than the role. Tell the two apart:

```bash
gcloud services list --project $PROJECT        # AUTH_PERMISSION_DENIED → the role is missing
gcloud compute zones list --project $PROJECT   # SERVICE_DISABLED       → an API is off
```

### APIs

```bash
gcloud services enable \
  serviceusage.googleapis.com cloudresourcemanager.googleapis.com \
  compute.googleapis.com container.googleapis.com \
  dns.googleapis.com iam.googleapis.com --project $PROJECT
```

- **Enable `container.googleapis.com` even for compute mode.** Managed mode needs it, and the provider lists GKE clusters when it rediscovers clusters.
- **Service Usage cannot bootstrap itself.** On a project where it has never been used, the API that turns APIs on is itself off. Enable it once from the console with a user account.

### Quotas

| Metric | Scope | Typical default | What it stops |
|---|---|---|---|
| `CPUS` | Per region | Varies by project | Node creation in that region |
| `CPUS_ALL_REGIONS` | **Project-wide** | 12 on a new project | The last worker of a first deployment. It is not on the region object, so a regional-only check misses it |
| `SSD_TOTAL_GB` | Per region | 250 GB | Any cluster on `pd-balanced` or `pd-ssd`. `pd-standard` counts against `DISKS_TOTAL_GB` (2 TB) instead |

```bash
gcloud compute regions describe $REGION --project $PROJECT \
  --format='table(quotas.metric,quotas.limit,quotas.usage)' | grep -E 'CPUS|DISKS|SSD'
gcloud compute project-info describe --project $PROJECT \
  --format='table(quotas.metric,quotas.limit)' | grep CPUS_ALL_REGIONS
```

Size the CPU quotas for the full cluster: control plane + (`maxWorkers` × worker vCPU), on both `CPUS` and `CPUS_ALL_REGIONS`. With the shipped file every node is an `e2-standard-8`, because an environment's `machineType` overrides the provider's `machine_type` for the control plane too. So one control plane plus up to ten workers is 8 + (10 × 8) = **88 vCPU**. To bring that down:

- lower `autoscaling.maxWorkers` (six workers, 48 vCPU of workers, carry the full production catalogue), or
- add `- { key: controlPlaneMachineType, value: e2-standard-4 }` to the environment.

For disks, a few 100 GB `pd-balanced` nodes already exceed a default `SSD_TOTAL_GB`, and the create fails partway with `QUOTA_EXCEEDED`. That is why the shipped config uses `pd-standard`. For better etcd and image-pull latency, raise `SSD_TOTAL_GB` and switch to `pd-balanced`.

### DNS zone

```bash
HOST=cloud.example.com        # must equal globalSettings.defaultHost
gcloud dns managed-zones create adhar-platform --project $PROJECT \
  --dns-name "$HOST." --description "Adhar platform zone for $HOST"
gcloud dns managed-zones describe adhar-platform --project $PROJECT \
  --format='value(nameServers)'
```

That prints four `ns-cloud-XX.googledomains.com.` nameservers. At your registrar, in the **parent** zone, add one NS record per nameserver for the subdomain label only (`cloud` for `cloud.example.com`). The parent apex and its records stay untouched.

**Check:**

```bash
dig +short NS $HOST                     # the four googledomains nameservers
dig +noall +comment CAA "${HOST#*.}"    # status: NOERROR, not SERVFAIL
```

> **Warning:** The apex must resolve, even though nothing of yours lives there. Let's Encrypt reads CAA records up the tree, so issuing `*.cloud.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone for it, the order fails with a message naming CAA, while every app still resolves. It is a delegation fault, not a certificate fault.

You can skip DNS. The platform comes up self-signed, and cert-manager issues a trusted certificate once the delegation is fixed. To skip it permanently, set `dnsProvider: none`; then, once the Gateway has its external IP, add a wildcard `A` record for `*.<host>` by hand.

## Configure

Start from the shipped example, then change `defaultHost`, `email`, `projectId` and the key path:

```bash
cp examples/gcp-config.yaml config.yaml
```

```yaml
apiVersion: v1alpha1
kind: Config

globalSettings:
  adharContext: adhar-mgmt
  defaultHost: cloud.example.com         # your Cloud DNS zone
  defaultHttpPort: 80
  defaultHttpsPort: 443                  # a real load balancer fronts the cloud path
  enableHAMode: false
  email: admin@example.com               # Let's Encrypt expiry notices
  dnsProvider: gcp                       # Cloud DNS for external-dns + DNS-01; `none` = self-signed

providers:
  gcp:
    type: gcp
    region: asia-southeast1
    primary: true                        # only GCP's Crossplane providers install
    projectId: <project-id>              # needed by the DNS-01 issuer and DNS secret
    serviceAccountKeyFile: /home/you/.config/gcloud/<project-id>-adhar.json   # full path
    # useApplicationDefault: true        # provisioning-only alternative
    clusterMode: compute                 # GCE + kubeadm; `managed` = GKE; `provided` = existing
    config:
      project_id: <project-id>           # no default; required unless projectId is set
      zone: asia-southeast1-a            # must lie in the provider region
      vpc_name: adhar-vpc
      subnet_name: adhar-subnet
      subnet_cidr: 10.20.0.0/16          # the firewall rules are built from this
      machine_type: e2-standard-4        # overridden by an environment's machineType
      disk_type: pd-standard             # counts against DISKS_TOTAL_GB, not SSD_TOTAL_GB
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

environments:                            # dev, test and prod as namespaces on ONE cluster
  dev:
    isolation: namespace
    type: non-production
    provider: gcp
    region: asia-southeast1
    template: prod-defaults
    clusterConfig:
      - { key: name,        value: adhar-dev }
      - { key: machineType, value: e2-standard-8 }   # 8 vCPU / 32 GiB
      - { key: nodeCount,   value: "2" }
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 10 }
  # test: identical to dev except name: adhar-test
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
    autoscaling: { enabled: true, minWorkers: 3, maxWorkers: 10 }
```

### Key fields

| Field | Meaning |
|---|---|
| `projectId` / `config.project_id` | The project has **no default**. Set `projectId` on the provider block (it wins, and the DNS step needs it) and keep `project_id` the same. The preflight stops on a missing or placeholder value before anything is created. |
| `serviceAccountKeyFile` | Write a **full path**. Provider authentication expands a leading `~`, but the steps that copy the key into the cluster (the PD CSI driver and the DNS secret) read the path as written. |
| `image_family` | The shipped file sets `ubuntu-2404-lts-amd64`. Without it, the provider defaults to `ubuntu-2204-lts`. |
| `subnet_cidr` | The firewall rules are built from it: SSH (22), the API server (6443), all internal traffic from the subnet, HTTP/HTTPS plus the NodePort range, and Google's load-balancer health-check ranges. Without the last rule, a `LoadBalancer` Service has backends that never turn healthy. |
| `admin_source_ranges` | Who may reach SSH and the API server. Omitted, both are open to the internet. A range that excludes the machine running `adhar` also blocks scaling and upgrades. |
| `machineType` / `controlPlaneMachineType` | An environment's `machineType` sizes **every** node, the control plane included, unless you also set `controlPlaneMachineType`. |
| `clusterConfig` keys | Matched ignoring case and separators. |
| `clusterMode` | `compute`, `managed` or `provided`. `clusterMode: gke` and `useManagedK8s: true` are **rejected** with a message naming `managed`. |

### Node sizing

The catalogue is CPU-bound on `e2-standard-8` workers:

| Workers (`e2-standard-8`) | vCPU | Full production catalogue |
|---|---|---|
| 2 | 16 | Pods unschedulable; platform unusable |
| 4 | 32 | Nodes saturate; a kubelet can go `NotReady` and Services lose endpoints |
| 6 | 48 | Stable |

The shipped `prod` starts at 4 workers and lets the autoscaler add more as pods go `Pending`, up to `maxWorkers`. Keep the quotas in step with `maxWorkers`.

### Dry run

```bash
gcloud auth activate-service-account --key-file ~/.config/gcloud/$PROJECT-adhar.json
gcloud config set project $PROJECT

adhar up -f config.yaml --env prod --dry-run
```

Activating the key makes the `gcloud` CLI act as the identity the provisioner uses, so your checks see the same permissions. `--dry-run` resolves the config and prints the cluster shape. It creates nothing and **checks no permissions, quota or DNS**.

## Deploy

```bash
adhar up -f config.yaml --env prod
```

```diagram
npb-gcp-sequence
```

GCP has no per-action preflight, and the first check says so (shown with `--verbose`):

```text
preflight ● credentials and API access: the provider answered; note this provider
            has no deep preflight yet, so quota and per-action permissions are
            unverified
```

Before creating anything, the provider then runs its own quota check against `CPUS`, `CPUS_ALL_REGIONS` and `SSD_TOTAL_GB` / `DISKS_TOTAL_GB`. A shortfall stops the run and names the metric, the shortfall and the remedy.

> **Warning:** The quota check counts the **starting** nodes, not `maxWorkers`. A clean pass does not mean the autoscaler has room. Size the quotas yourself, as in [Quotas](#quotas).

The CLI then draws the same checklist as on every cloud, with `Cloud cluster` reading `adhar · gcp · asia-southeast1`. After the first nodes join, compute mode installs:

- the `cloud-provider-gcp` manifest
- the Persistent Disk CSI driver
- the `adhar-block` StorageClass, on the same disk type as the nodes (`pd-standard` with the shipped file)
- the CSI startup-taint toleration

The CLI finishes with a panel of platform URLs and warns if TLS is still self-signed. **The catalogue keeps converging after the CLI returns**, and the autoscaler adds workers while it does. `--apps-timeout` (default 15m) limits only how long the CLI waits; ArgoCD keeps going either way.

> **Note:** Without `--env`, `adhar up -f config.yaml` builds **one** cluster for every `isolation: namespace` environment, sized from the production-type environment, and creates the `dev`, `test` and `prod` namespaces on it. Each `isolation: cluster` environment gets a cluster of its own.

## Verify

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig     # or: kubectl config use-context adhar
kubectl get nodes                                        # all Ready
kubectl -n adhar-system get svc | grep -i gateway        # an external IP, not <pending>
gcloud compute firewall-rules list --project $PROJECT --format='value(name)' | grep health-checks
kubectl -n adhar-system get certificate adhar-cert       # READY True once DNS-01 completes
adhar get status                                       # platform + per-package health
```

## Access

Log in at `https://console.<defaultHost>`. Get credentials with:

```bash
adhar get secrets              # all platform credentials
adhar get secrets -p argocd    # one package
```

Your username is your email address, not a short name. For SSO, kubeconfig access and group-to-role mapping, see [Accessing the Platform](/docs/operations/accessing-the-platform).

## Operate

Always pass `--file` to `adhar cluster` commands. The cluster is named `adhar` unless you passed `--name` to `adhar up`; `clusterConfig.name` is not the cluster name.

```bash
adhar cluster list --file config.yaml
```

### Scale

```bash
adhar cluster scale adhar --workers 6 -p gcp -f config.yaml
```

With autoscaling on, the worker count moves between `minWorkers` and `maxWorkers` on its own. Raise `autoscaling.maxWorkers`, and the CPU quotas with it, before you enable more of the catalogue.

### Upgrade

```bash
adhar upgrade --name prod --diff-only                              # preview the stack diff
adhar upgrade --name prod --yes                                    # converge foundation + stack
adhar cluster upgrade adhar --version 1.37.2 -p gcp -f config.yaml # Kubernetes itself
```

On a cloud cluster the `AdharPlatform` resource is named after the environment you provisioned (`prod` here). `adhar upgrade` looks for one named `adhar` unless you pass `--name`. Find the name with `kubectl -n adhar-system get adharplatform`.

### Managed GKE

`status:in-progress`

```yaml
providers:
  gcp:
    type: gcp
    clusterMode: managed     # GKE instead of GCE + kubeadm
```

Managed mode creates the VPC and subnet as compute mode does. Then it creates a zonal GKE cluster in the provider's `zone`, with one node pool per node group (VPC-native, REGULAR release channel unless pinned).

The kubeconfig authenticates through `gke-gcloud-auth-plugin`, so the plugin must be on PATH wherever that kubeconfig is used:

```bash
gcloud components install gke-gcloud-auth-plugin
```

GKE adds a cluster-management charge. Installing Cilium on a managed control plane that ships its own CNI is the least-proven part of managed mode.

### Tear down

```bash
adhar down -f config.yaml --env prod
adhar down -f config.yaml --env prod --purge-orphaned-volumes
```

`adhar down` shows what it will delete and asks you to type `yes` (skip with `--force`).

> **Warning:** `--env prod` removes the whole cluster. With `isolation: namespace`, `dev`, `test` and `prod` share the one cluster `adhar`, so tearing down any of them deletes all three. If you passed `--name` to `adhar up`, pass the same `--name` to `adhar down`.

| Resource | Removed by teardown |
|---|---|
| Instances, firewall rules, subnet, VPC | Yes |
| The forwarding rule, target pool and `k8s-*` firewall rules that the cloud-controller-manager created | Always. They hold no data, and the firewall rule pins the VPC |
| Unattached `pvc-*` disks | Only with `--purge-orphaned-volumes`, because a disk may hold data worth keeping. Without the flag, the output names them |

Teardown rediscovers the cluster from the project by network tag and naming convention, so a missing local state file does not block it.

**Check** that nothing is still billing:

```bash
gcloud compute instances list --project $PROJECT
gcloud compute forwarding-rules list --project $PROJECT
gcloud compute disks list --project $PROJECT --filter='-users:*'    # unattached disks
```

### Cost

While the cluster runs you pay for:

- node hours: `maxWorkers` is your spend ceiling as much as your quota ceiling
- the Gateway's forwarding rule and target pool
- each node's boot disk, plus one persistent disk per `adhar-block` PersistentVolume

No Cloud NAT is created. GKE adds a cluster-management charge.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `SERVICE_DISABLED` on a compute call | An API is off | `gcloud services enable …`; enable Service Usage from the console first |
| `AUTH_PERMISSION_DENIED` from `gcloud services list` | `roles/serviceusage.serviceUsageAdmin` is missing | Grant the role; this is not an API problem |
| Managed mode fails calling the Container API | `container.googleapis.com` is disabled | Enable it |
| The run fails early naming the project | `projectId` / `project_id` is unset or a placeholder | Set both to your project ID |
| Fails at the CSI step or `configuring edge DNS (gcp)` reading the key | `serviceAccountKeyFile` is written with `~` | Use the full path |
| Fails at `configuring edge DNS (gcp)` | Application Default Credentials alone, or no provider-level `projectId` | Set `serviceAccountKeyFile` **and** `projectId` |
| The DNS-01 ClusterIssuer is rejected outright | The cert-manager `cloudDNS` solver requires a `project` field | Supply `projectId` so the issuer renders with it |
| Create fails partway with `QUOTA_EXCEEDED` on disks | `pd-balanced` / `pd-ssd` against a 250 GB `SSD_TOTAL_GB` | Use `disk_type: pd-standard`, or raise `SSD_TOTAL_GB` |
| The last worker of a first deployment fails while the regional quota looks fine | Project-wide `CPUS_ALL_REGIONS` (default 12) | Raise the project-wide cap, not only the regional one |
| Workers never finish joining | Node-to-node traffic is dropped by a firewall source range that does not match `subnet_cidr` | Set `subnet_cidr` to the range the nodes use |
| `LoadBalancer` Service stays `<pending>` | Health-check ranges or CCM RBAC are missing, so the address is never written back | Confirm the `*-allow-health-checks` rule exists and the CCM pod is running |
| Order fails with `SERVFAIL looking up CAA` | The apex is delegated to nameservers holding no zone | Delegate only the platform label |
| `useManagedK8s has been removed` / `clusterMode "gke" names a cloud service` | An old config spelling | `clusterMode: managed` |

## Next steps

- [Providers Overview](/docs/providers/overview) — the shared model, storage classes and the comparison table
- [Accessing the Platform](/docs/operations/accessing-the-platform) — SSO, kubeconfig and platform identity
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Troubleshooting](/docs/reference/troubleshooting) — autoscaler and volume failures
