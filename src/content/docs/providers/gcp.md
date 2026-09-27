---
title: "Google Cloud"
section: "Cloud Providers"
order: 5
path: "/docs/providers/gcp"
---

# Google Cloud (GCP)

Run Adhar on GCP with GCE instances + kubeadm (default) or managed **GKE** (opt-in).

## At a glance

| | |
|---|---|
| **Provider key** | `gcp` |
| **Default model** | GCE + kubeadm |
| **Managed option** | GKE (`useManagedK8s: true` / `clusterMode: gke`; needs `gke-gcloud-auth-plugin`) |
| **Credentials** | Service-account key file / ADC |
| **DNS / trusted TLS** | Cloud DNS + DNS-01 wildcard ✅ |
| **Key quota** | `CPUS` per region ≥ 24; `container.googleapis.com` enabled |
| **Verification** | ✅ Live-verified (compute path) |
| **Best for** | Teams standardized on GCP |

## Prerequisites (one-time per project)

- A project with **billing attached**.
- A service-account **key file** (ADC alone is not enough for Cloud DNS).
- IAM roles: `roles/compute.admin`, `roles/dns.admin`, `roles/iam.serviceAccountUser`, `roles/serviceusage.serviceUsageAdmin`.
- Enabled APIs: `serviceusage`, `cloudresourcemanager`, `compute`, `container` (**required even in kubeadm mode**), `dns`, `iam`.
- Quota `CPUS` per region ≥ 24.
- A Cloud DNS zone + registrar delegation for `defaultHost`.

```bash
gcloud auth application-default login
# or:
export GOOGLE_APPLICATION_CREDENTIALS="path-to-service-account.json"
```

## Configuration

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: true
  email: admin@example.com

providers:
  gcp:
    type: gcp
    region: us-central1
    primary: true
    useApplicationDefault: true
    config:
      project_id: my-gcp-project        # REQUIRED — no default
      zone: us-central1-a
      vpc_name: adhar-vpc
      subnet_name: adhar-subnet
      subnet_cidr: 10.6.0.0/16
      machine_type: n2-standard-8       # 8 vCPU / 32 GiB
      disk_type: pd-balanced
      disk_size_gb: 100
      image_family: ubuntu-2404-lts-amd64
      image_project: ubuntu-os-cloud
      # admin_source_ranges: ["203.0.113.4/32"]

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
  production:
    type: non-production
    provider: gcp
    template: nonprod-defaults
    clusterConfig:
      - { key: name,        value: adhar-mgmt }
      - { key: machineType, value: n2-standard-8 }
      - { key: nodeCount,   value: "3" }
    autoscaling:
      enabled: true
      minWorkers: 3
      maxWorkers: 10
```

### Managed GKE

```yaml
providers:
  gcp:
    type: gcp
    useManagedK8s: true      # or clusterMode: gke
```

GKE needs `gke-gcloud-auth-plugin` on your PATH (`gcloud components install gke-gcloud-auth-plugin`).

## Provision

```bash
gcloud auth activate-service-account --key-file ~/.config/gcloud/$PROJECT-adhar.json
gcloud config set project $PROJECT
./adhar up -f config.yaml --env production --dry-run
./adhar up -f config.yaml --env production
```

## Access

```bash
export KUBECONFIG=~/.adhar/clusters/production/kubeconfig
./adhar get status
./adhar get apps
./adhar get secrets
```

## Tear down

```bash
./adhar down -f config.yaml --env production
./adhar down -f config.yaml --env production --purge-orphaned-volumes
```

Deletes the forwarding rule, target pool, and `k8s-*` firewall rules unconditionally; `pvc-*` disks only with `--purge-orphaned-volumes`. It rediscovers the cluster from the project (no local-state dependency). Inspect leftovers:

```bash
gcloud compute forwarding-rules list --project <PROJECT>
gcloud compute disks list --project <PROJECT> --filter='-users:*'
```

## Notes & gotchas

- `project_id` has **no default** — set it (a placeholder creates orphaned resources).
- `container.googleapis.com` must be enabled even in kubeadm mode.
- No Cloud NAT — nodes get ephemeral external IPs, so set `admin_source_ranges`.
- The cert-manager `cloudDNS` solver requires a `project` field; verify the apex CAA resolves (`SERVFAIL` = broken delegation).
