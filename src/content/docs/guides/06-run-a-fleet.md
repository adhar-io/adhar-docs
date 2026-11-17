---
title: "Run a Multi-Cluster Fleet"
section: "Guides"
order: 6
path: "/docs/guides/run-a-fleet"
---

# Run a Multi-Cluster Fleet

This guide takes a single Adhar cluster to topology T3: one management cluster governing several workload clusters. It is for platform engineers who need more than one failure domain, whether for environments, teams or compliance boundaries. You provision a workload cluster from Git, watch it register with ArgoCD, send its telemetry to the hub, and optionally join it to a Cilium Cluster Mesh.

## What you'll build

```diagram
hb-fleet-topology
```

- A managed DigitalOcean Kubernetes (DOKS) workload cluster, provisioned from a `Cluster` resource in Git.
- Automatic ArgoCD registration, with the thin agent profile Healthy on the new cluster.
- Telemetry from the workload cluster stored on the management cluster's Mimir, Loki and Tempo.
- Optionally, a Cilium Cluster Mesh between two self-managed Adhar clusters.
- A teardown that leaves no paid resources behind.

> **Status:** `status:complete` on DigitalOcean (DOKS), which the examples use. The EKS, GKE, AKS and Civo compositions carry the same ArgoCD registration step and are `status:in-progress`.

## Prerequisites

- A production management cluster (see [DigitalOcean](/docs/providers/digitalocean) or another [provider](/docs/providers/overview)). `adhar get status` is green.
- Crossplane able to provision on your cloud: `kubectl get clusterproviderconfigs.digitalocean.m.crossplane.io` is **not empty**.
- The cluster compositions installed: `kubectl get compositions -l feature=cluster`.
- `doctl` with a token, for listing version slugs: `doctl kubernetes options versions`.

## Control plane and data planes

One rule governs the fleet: **application workloads run only on data planes; the control plane runs only fleet and platform services.**

| | Management cluster (control plane) | Workload cluster (data plane) |
|---|---|---|
| Runs | Gitea, ArgoCD, Crossplane, Keycloak, OpenBao + External Secrets, Harbor, the DataPlane controller, the observability stores (Mimir, Loki, Tempo, Grafana) | The *thin profile*: `metrics-server`, `kyverno`, `kyverno-policies`, `alloy`, `external-secrets`, plus your applications |
| Holds state | Yes: Git, identity, secrets root, telemetry | Only what your apps hold; the cluster itself is rebuilt from Git |
| Recovery | Backups ([Backup and Restore](/docs/guides/backup-and-restore)) | Reprovision and resync, target ≤ 1 hour |

Keep workload clusters thin. Everything multi-tenant and stateful stays on the management cluster, which is what lets you destroy a workload cluster and rebuild it from Git. The platform ships a monthly drill that measures exactly that.

### Two APIs, one fleet

You can bring a cluster into the fleet in two ways. Pick **one per cluster**, because each writes its own ArgoCD cluster Secret.

```diagram
ngb-fleet-two-apis
```

| API | What it is | What it gives you | Status |
|---|---|---|---|
| `Cluster` (`platform.adhar.io/v1alpha1`, namespaced) | A Crossplane composite resource that builds a cloud cluster | Provisioning, kubeconfig Secret, ArgoCD registration (`cluster-<name>`), thin profile | `status:complete` on DOKS |
| `DataPlane` (`platform.adhar.io/v1alpha1`, cluster-scoped) | The fleet API, reconciled by the DataPlane controller | ArgoCD registration (`dp-<name>-cluster`), observability-hub wiring, Cluster Mesh, Karmada membership, `adhar fleet` operations | `mode: vcluster` and `mode: adopt` `status:complete`. `mode: composite` (the controller creates the `Cluster` for you) `status:in-progress` |

This guide uses a `Cluster` for a managed cloud cluster, and a `DataPlane` in `adopt` mode for mesh membership.

## Step 1 — Check that the control plane can provision

```bash
kubectl get clusterproviderconfigs.digitalocean.m.crossplane.io
kubectl get compositions -l feature=cluster,provider=digitalocean
```

**Check:** at least one ClusterProviderConfig, and the composition `cluster-digitalocean-doks`. An empty ProviderConfig list means nothing can be provisioned, however healthy the platform looks. Rule it out first.

## Step 2 — Choose a version slug

DOKS needs the cloud's own version slug, not a bare semver, and **slugs expire**. Query the current ones:

```bash
doctl kubernetes options versions
```

**Check:** a list of slugs such as `1.36.3-do.4`. Pick one. The `Cluster` schema requires `version`, so a request without it is rejected before the composition sees it.

## Step 3 — Declare the cluster in Git

```diagram
ngb-cluster-provisioning
```

```yaml
# clusters/wl-blr1.yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Cluster
metadata:
  name: wl-blr1                     # becomes the ArgoCD cluster name and the adhar.io/cluster label
  namespace: fleet                  # any namespace you govern with RBAC
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: digitalocean      # picks cluster-digitalocean-doks
  parameters:
    displayName: "Workload — blr1"
    provider: DIGITALOCEAN_DOKS     # XRD enum: AWS_EKS GCP_GKE AZURE_AKS DIGITALOCEAN_DOKS CIVO_K3S KIND VCLUSTER
    region: blr1                    # required for every provider except VCLUSTER
    version: "1.36.3-do.4"          # required; a slug from Step 2
    controlPlane:
      highAvailability: false
      endpointAccess: Public
    nodePools:                      # required for every provider except VCLUSTER
      - name: workers
        instanceType: s-4vcpu-8gb   # the droplet size slug
        count: 3
    addons:
      enableMetricsServer: true
      enableClusterAutoscaler: false  # the platform brings its own
      enableIngress: false            # the platform brings the Cilium Gateway
```

Commit the file to a repository that an ArgoCD Application already syncs, so the cluster exists as a reviewed change with history. The platform does not prescribe which repository. For a first trial, apply it by hand:

```bash
kubectl create namespace fleet      # once, if you apply by hand
kubectl apply -f clusters/wl-blr1.yaml
```

**Check:** the resource shows `SYNCED True` immediately. `READY` stays `False` while DigitalOcean builds the cluster.

```bash
kubectl -n fleet get clusters.platform.adhar.io wl-blr1
```

> **Note:** Use the full resource name. CloudNativePG also defines a `Cluster` kind, and it is on in the production profile. A bare `kubectl get cluster` may resolve to the CNPG kind.

## Step 4 — Wait for the cluster

```bash
kubectl -n fleet get clusters.platform.adhar.io wl-blr1 -w
kubectl -n fleet get clusters.platform.adhar.io wl-blr1 -o jsonpath='{.status.phase}{"  "}{.status.message}{"\n"}'
```

The composition reports its own phase:

| Phase | Meaning |
|---|---|
| `Pending` | Waiting for credentials |
| `Provisioning` | The cluster exists but is not running |
| `Available` | DOKS reports `running` |

**Check:** `Available  DOKS cluster 'wl-blr1' is running` and `READY True`.

## Step 5 — Confirm ArgoCD registration and the thin profile

Once credentials exist, the composition republishes the kubeconfig as `wl-blr1-kubeconfig` in `adhar-system` and creates an ArgoCD cluster Secret. Both are re-rendered from live connection details on every reconcile, because DOKS credentials expire after seven days.

```bash
kubectl -n adhar-system get secret cluster-wl-blr1 --show-labels
kubectl -n adhar-system get applications.argoproj.io -l adhar.io/cluster=wl-blr1
```

**Check:**

- The Secret carries `argocd.argoproj.io/secret-type=cluster`, `adhar.io/cluster=wl-blr1`, `adhar.io/dataplane=wl-blr1` and `adhar.io/dataplane-mode=composite`.
- Five Applications become Healthy: `wl-blr1-metrics-server`, `wl-blr1-kyverno`, `wl-blr1-kyverno-policies`, `wl-blr1-alloy` and `wl-blr1-external-secrets`.

Those labels are the contract. The `adhar-workload-clusters` ApplicationSet uses a cluster generator that selects every registered cluster with the `adhar.io/cluster` label. The management cluster's own in-cluster destination has no such label, so it never matches. Planes labelled `adhar.io/dataplane-mode: vcluster` get the same set minus `metrics-server`, because a vcluster serves metrics through its host.

To reach the cluster directly:

```bash
kubectl -n adhar-system get secret wl-blr1-kubeconfig -o jsonpath='{.data.kubeconfig}' \
  | base64 -d > wl-blr1.kubeconfig
kubectl --kubeconfig wl-blr1.kubeconfig get nodes
```

**Check:** three `Ready` nodes.

## Step 6 — Ship telemetry to the hub

The fleet uses hub-and-spoke observability. Spokes (workload clusters) run only Alloy. Everything is stored on the management cluster under the spoke's cluster name, so one Grafana query spans the fleet.

```diagram
ngb-fleet-telemetry
```

A spoke needs two things: the hub's addresses, and a token.

**1. Addresses.** Alloy reads its destinations from the `observability-hub` ConfigMap in `adhar-system` on the spoke: `HUB_MIMIR_URL`, `HUB_LOKI_URL`, `HUB_TEMPO_URL` and `HUB_CLUSTER_NAME`. The shipped defaults point at the hub's **in-cluster** services, which are unreachable from a spoke.

| The cluster was registered by | Who sets the `HUB_*` keys |
|---|---|
| A `DataPlane` | The controller writes the ConfigMap onto the plane, with the hub's external Gateway URLs (`https://mimir.<host>/api/v1/push`, `https://loki.<host>/loki/api/v1/push`, `https://tempo.<host>`) and the plane's name. The workload ApplicationSet ignores those fields, so ArgoCD and the controller do not fight over them |
| A `Cluster` only | You do. Nothing overrides the defaults; set the four keys as [Observability](/docs/operations/observability) shows |

**2. A token.** The hub's ingestion routes sit behind oauth2-proxy in bearer mode. A spoke must present a Keycloak access token for the `mimir`, `loki` or `tempo` client, obtained by `client_credentials` with secrets from the hub's `keycloak-clients` Secret.

> **Warning:** The shipped Alloy configuration does not perform that token exchange. Add it before you rely on spoke data.

**Check:** in Grafana on the management cluster, open Explore, pick the Mimir data source and filter on the spoke's cluster name. Recent series mean data is arriving. No data usually means the `HUB_*` keys still point in-cluster, or no bearer token is being sent.

## Step 7 (optional) — Join a Cilium Cluster Mesh

Cluster Mesh is `status:complete` between two **self-managed** Adhar clusters, each brought up by `adhar up` with the platform's own Cilium. A managed cluster built by a `Cluster`, such as DOKS, runs the provider's CNI and is not covered.

Every requirement below is mandatory.

| Requirement | Why | Where to set it |
|---|---|---|
| Distinct cluster name **and** id (1–255) per cluster | Two clusters claiming id 1 cannot mesh; the management cluster is `adhar-mgmt`, id 1 | `clusterConfig.name`, `clusterConfig.clusterMeshId` |
| Non-overlapping Pod CIDRs | Routing. For example `10.244.0.0/16` and `10.245.0.0/16` | `clusterConfig.podCIDR` |
| One shared Cilium CA | mTLS between agents and the clustermesh apiserver. Adhar bakes the same CA into its embedded manifest, so this holds by default | — |
| **The same VPC**, or a LoadBalancer-typed apiserver | On DigitalOcean the platform's Cilium answers node ports only on the private NIC, so a peer outside the VPC cannot reach the apiserver | `reuse_existing_vpc: true` + matching `vpc_cidr` |
| Firewall open between peers | The platform opens the VPC CIDR for VXLAN 8472/udp; a tag-scoped rule covers one cluster and silently drops packets | — |
| clustermesh apiserver enabled on each side | Peers read each other's state through it | `clusterConfig.clusterMeshApiServer: "true"`, `clusterMeshServiceType: NodePort` or `LoadBalancer` |

With both clusters up, store the second cluster's kubeconfig on the management cluster:

```bash
kubectl -n adhar-system create secret generic adhar-test-kubeconfig \
  --from-file=kubeconfig=$HOME/.adhar/clusters/test/kubeconfig
```

Then declare it as an adopted data plane with the mesh turned on:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: DataPlane
metadata:
  name: adhar-test                  # cluster-scoped: no namespace
spec:
  infrastructure:
    mode: adopt                     # the cluster already exists
    kubeconfigSecretRef:
      name: adhar-test-kubeconfig
      namespace: adhar-system
  profile: standard                 # standard | edge | gpu | isolated
  mesh:
    enabled: true                   # only after the requirements above hold
  observability:
    hub: adhar-mgmt                 # the mesh identity that stores telemetry
  placement:
    labels:                         # stamped on the ArgoCD cluster Secret (and the Karmada member)
      adhar.io/environment: test
      region: blr1
```

The controller writes each side's coordinates into the other's clustermesh configuration. It then runs a Job, `clustermesh-connect-<name>`, that waits for `cilium clustermesh status` to converge on **both** sides. `MeshJoined` turns `True` only after that Job succeeds.

```bash
kubectl get dataplane adhar-test
kubectl get dataplane adhar-test -o jsonpath='{range .status.conditions[*]}{.type}={.status} {end}{"\n"}'
cilium clustermesh status -n adhar-system      # Cilium runs in adhar-system, not kube-system
```

**Check:** conditions `InfraReady`, `Registered`, `AgentsReady`, `ObservabilityWired`, `MeshJoined` and `Ready` are all `True`, and `cilium clustermesh status` reports every node connected.

### What the mesh does not give you

**Workload-to-workload mutual authentication is not something this platform provides.** Cilium's SPIRE-backed mutual authentication is off in the platform's Cilium values, for two reasons:

- Unregistered identities flood the Cilium operator with retries and starve its Gateway API controller, which delays the Gateway reaching `Programmed`.
- Cilium marks the feature deprecated in 1.20, for removal in 1.21. The platform runs 1.20.

So "mesh-ready identity" means a unique cluster name and id, and one shared CA. Use WireGuard or IPsec transparent encryption and network policy for confidentiality, and application-level mTLS where you need peer identity. See [Security Best Practices](/docs/security/security-best-practices).

## Step 8 — Operate the fleet

`adhar fleet` acts on every registered `DataPlane` at once. A cluster registered only through a `Cluster` does not appear there; `adhar get dataplanes` and `adhar fleet` list DataPlanes only.

```bash
adhar fleet list                                    # planes, mode, Ready, Kubernetes version, app count, labels
adhar fleet drift                                   # planes whose MINOR version differs from the hub
adhar fleet upgrade --to-version v1.37.2 --dry-run  # print the wave plan, change nothing
adhar fleet upgrade --to-version v1.37.2 --canary 1 --batch-size 3 --rollback-on-failure
```

```diagram
ngb-fleet-upgrade-waves
```

`adhar fleet upgrade` never calls a cloud API. It edits `spec.infrastructure.version` on each DataPlane, in waves:

| Flag | Default | Effect |
|---|---|---|
| `--to-version` | required | Target Kubernetes version |
| `--canary` | `1` | Planes in the first wave; the least-loaded plane goes first |
| `--batch-size` | a quarter of the fleet | Planes per wave after the canary |
| `--wave-timeout` | `20m` | How long to wait for a wave to become Ready |
| `--include-not-ready` | off | Also upgrade planes that are not Ready. By default they are skipped, so they do not block the rollout |
| `--rollback-on-failure` | off | Restore the previous version on planes that regressed |
| `--dry-run` | off | Print the wave plan and exit |

The rollout stops when a plane that **was** Ready stops being Ready.

> **Status:** `status:in-progress` — the wave planner is unit-tested; it has not been run across a live multi-cluster fleet. Always dry-run first, and pass `--rollback-on-failure`.

**Check:** `adhar fleet list` shows every plane Ready on the target version.

## Step 9 — Tear down

Deleting a `Cluster` removes the ArgoCD registration Secret at the same instant as the cluster. The Applications that targeted it then hang in `Terminating`, because their finalizer can no longer reach the API server. Remove the `Cluster` from Git (or `kubectl delete` it), then clear the leftover finalizers:

```bash
kubectl -n fleet delete clusters.platform.adhar.io wl-blr1
for app in $(kubectl -n adhar-system get applications.argoproj.io -l adhar.io/cluster=wl-blr1 -o name); do
  kubectl -n adhar-system patch "$app" --type merge -p '{"metadata":{"finalizers":[]}}'
done
```

**Check:** `doctl kubernetes cluster list` no longer shows `wl-blr1`, and its droplets are gone.

Deleting a `DataPlane` is gentler. Its finalizer first strips the selector labels from the ArgoCD cluster Secret, so the ApplicationSet stops regenerating Applications. It then deletes those Applications while the plane is still reachable.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cluster` never leaves `Pending`; nothing appears in DigitalOcean | No ClusterProviderConfigs, so Crossplane cannot provision | `kubectl get clusterproviderconfigs.digitalocean.m.crossplane.io`; fix the provider credentials |
| Resource rejected: `region is required` / `nodePools ... is required` | CEL rules on the XRD: both are mandatory except for `VCLUSTER` | Add `region` and at least one node pool |
| Status message mentions a defaulted or invalid version slug | DOKS slugs expire | Set `version` from `doctl kubernetes options versions` |
| Cluster is up but no Applications target it | The registration Secret lacks `adhar.io/cluster`, or a second registration path conflicts | Check `kubectl -n adhar-system get secret -l argocd.argoproj.io/secret-type=cluster --show-labels`; use one path per cluster |
| Workload Applications hang `Terminating` after delete | The registration Secret vanished with the cluster | Clear their finalizers (Step 9) |
| Spoke invisible in Grafana | `HUB_*` still in-cluster, or no bearer token on the ingestion route | Override the ConfigMap; supply a `client_credentials` token |
| `MeshJoined` stays `False`; the connect Job fails | Overlapping Pod CIDRs, duplicate cluster id, apiserver unreachable (different VPC), or VXLAN blocked | Work through the requirements table; read `kubectl -n adhar-system logs job/clustermesh-connect-<name> --all-containers` |
| `cilium` CLI says Cilium is not installed | It looks in `kube-system` by default | Pass `-n adhar-system` |
| `adhar fleet list` shows "No workload clusters are registered" | The cluster was registered via `Cluster` only | Expected; fleet operations act on `DataPlane`s |

## Next steps

- [Architecture](/docs/core-concepts/architecture) — topologies T1 to T3 and the control/data-plane rule.
- [Observability](/docs/operations/observability) — hub-and-spoke details and the spoke ConfigMap.
- [Upgrade the Platform](/docs/guides/upgrade-the-platform) — where fleet upgrades fit among the other upgrade streams.
- [Backup and Restore](/docs/guides/backup-and-restore) — what to back up when workload clusters are disposable.
