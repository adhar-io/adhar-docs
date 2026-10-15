---
title: "Run a Multi-Cluster Fleet"
section: "Guides"
order: 6
path: "/docs/guides/run-a-fleet"
---

# Run a Multi-Cluster Fleet

This guide takes a single Adhar cluster to topology T3: one management cluster governing several workload clusters. It is for platform engineers who have outgrown one shared failure domain, whether because of environments, teams or compliance boundaries. It explains how the control plane and data planes split the work. You will provision a real workload cluster through GitOps and watch it register with ArgoCD on its own. Then you wire its telemetry to the hub and, where the network allows it, join it to a Cilium Cluster Mesh. Each step says plainly what is live-verified and what is built but not yet proven.

## What you will build

- A managed DOKS workload cluster provisioned from a `Cluster` resource in Git: apply to `Ready` in about 11 minutes on the verified run.
- Automatic ArgoCD registration, with the thin agent profile Healthy on the new cluster a few minutes later.
- Telemetry from the workload cluster flowing to the management cluster's Mimir, Loki and Tempo.
- Optionally, a Cilium Cluster Mesh between two self-managed Adhar clusters.
- A clean teardown that leaves no paid resources behind.

**Prerequisites**

| Requirement | How to check |
|---|---|
| A production management cluster (see [DigitalOcean](/docs/providers/digitalocean) or another [provider](/docs/providers/overview)) | `adhar get status` |
| Crossplane able to provision on your cloud | `kubectl get clusterproviderconfigs.digitalocean.m.crossplane.io` is **not empty** |
| The cluster compositions installed | `kubectl get compositions -l feature=cluster` |
| `doctl` with a token, for listing version slugs | `doctl kubernetes options versions` |

The examples use DigitalOcean because the workload-cluster path is live-verified there. EKS, GKE, AKS and Civo compositions carry the same ArgoCD registration step, but on those clouds it is verified by rendering only.

## Control plane and data planes

The rule is simple: **application workloads run only on data planes; the control plane runs only fleet and platform services.**

| | Management cluster (control plane) | Workload cluster (data plane) |
|---|---|---|
| Runs | Gitea, ArgoCD, Crossplane, Keycloak, OpenBao + External Secrets, Harbor, the DataPlane controller, the observability stores (Mimir, Loki, Tempo, Grafana) | The thin profile: `metrics-server`, `kyverno`, `kyverno-policies`, `alloy`, `external-secrets` — plus your applications |
| Holds state | Yes: Git, identity, secrets root, telemetry | Only what your apps hold; the cluster itself is rebuilt from Git |
| Recovery | Backups ([Backup and Restore](/docs/guides/backup-and-restore)) | Reprovision and resync, target ≤ 1 hour |

```diagram
hb-fleet-topology
```

Keep workload clusters thin. Everything multi-tenant and stateful stays on the management cluster. That is what lets a workload cluster be destroyed and rebuilt from Git in under an hour, and the platform ships a monthly drill to measure exactly that.

### Two APIs, one fleet

There are two ways to bring a cluster into the fleet. Pick **one per cluster**, because each writes its own ArgoCD cluster Secret.

| API | What it is | What it gives you | Status |
|---|---|---|---|
| `Cluster` (`platform.adhar.io/v1alpha1`, namespaced) | A Crossplane composite resource that builds a cloud cluster | Provisioning, kubeconfig Secret, ArgoCD registration (`cluster-<name>`), thin profile | **Live-verified** on DOKS |
| `DataPlane` (`platform.adhar.io/v1alpha1`, cluster-scoped) | The fleet API, reconciled by the DataPlane controller | ArgoCD registration (`dp-<name>-cluster`), observability-hub wiring, Cluster Mesh, Karmada membership, `adhar fleet` operations | `mode: vcluster` and `mode: adopt` **live-verified**. `mode: composite`, where the controller creates the `Cluster` for you, has its XR path proven, but the controller wrapper has not yet been exercised end to end |

The rest of this guide follows the verified route: a `Cluster` for a managed cloud cluster, and a `DataPlane` in `adopt` mode for mesh membership.

## Step 1 — Check that the control plane can provision

```bash
kubectl get clusterproviderconfigs.digitalocean.m.crossplane.io
kubectl get compositions -l feature=cluster,provider=digitalocean
```

**Expected:** at least one ClusterProviderConfig, and the composition `cluster-digitalocean-doks`. An empty ProviderConfig list means nothing can be provisioned, however healthy the platform looks. That was once a fresh-cluster bug and is fixed now, but it is still the first thing to rule out.

## Step 2 — Choose a version slug

DOKS wants the cloud's own version slug, not a bare semver, and **slugs expire**. Query the current ones rather than trusting an example:

```bash
doctl kubernetes options versions
```

**Expected:** a list of slugs such as `1.36.3-do.4`. Pick one. If you omit `version`, the composition falls back to a built-in default and says so in the XR's status message. That default can go stale too.

## Step 3 — Declare the cluster in Git

```diagram
hb-cluster-provisioning
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
    version: "1.36.3-do.4"          # a slug from Step 2
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

Commit it to a repository that an ArgoCD Application already syncs, so the cluster's existence is a reviewed change with history. The platform does not prescribe which repository. For a first trial, `kubectl apply -f clusters/wl-blr1.yaml` does the same thing, and the live verification ran that way.

```bash
kubectl create namespace fleet      # once, if you apply by hand
kubectl apply -f clusters/wl-blr1.yaml
```

**Verify:** `kubectl -n fleet get cluster wl-blr1` shows the resource with `SYNCED True` immediately. `READY` stays `False` while DigitalOcean builds the cluster.

## Step 4 — Wait for the cluster

```bash
kubectl -n fleet get cluster wl-blr1 -w
kubectl -n fleet get cluster wl-blr1 -o jsonpath='{.status.phase}{"  "}{.status.message}{"\n"}'
```

The composition reports its own phase: `Pending` while waiting for credentials, `Provisioning` once the cluster exists but is not running, and `Available` when DOKS says `running`.

**Expected:** `Available  DOKS cluster 'wl-blr1' is running` and `READY True`. The verified run took about 11 minutes.

## Step 5 — Confirm ArgoCD registration and the thin profile

Once credentials exist, the composition does two things. It republishes the kubeconfig as `wl-blr1-kubeconfig` in `adhar-system`, and it creates an ArgoCD cluster Secret. Both are re-rendered from live connection details on every reconcile, which matters because DOKS credentials expire after seven days.

```bash
kubectl -n adhar-system get secret cluster-wl-blr1 --show-labels
kubectl -n adhar-system get applications.argoproj.io -l adhar.io/cluster=wl-blr1
```

**Expected:** the Secret carries `argocd.argoproj.io/secret-type=cluster`, `adhar.io/cluster=wl-blr1`, `adhar.io/dataplane=wl-blr1` and `adhar.io/dataplane-mode=composite`. About three minutes later, five Applications are Healthy: `wl-blr1-metrics-server`, `wl-blr1-kyverno`, `wl-blr1-kyverno-policies`, `wl-blr1-alloy` and `wl-blr1-external-secrets`.

Those labels are the contract. The `adhar-workload-clusters` ApplicationSet uses a cluster generator that selects every registered cluster carrying `adhar.io/cluster`. The management cluster's own in-cluster destination has no such label, so it is never matched. Planes labelled `adhar.io/dataplane-mode: vcluster` get the same set minus `metrics-server`, because vcluster serves metrics through its host.

**Reach the cluster directly** when you need to:

```bash
kubectl -n adhar-system get secret wl-blr1-kubeconfig -o jsonpath='{.data.kubeconfig}' \
  | base64 -d > wl-blr1.kubeconfig
kubectl --kubeconfig wl-blr1.kubeconfig get nodes
```

**Expected:** three `Ready` nodes.

## Step 6 — Ship telemetry to the hub

The fleet uses hub-and-spoke observability. Spokes run only Alloy, and everything is stored on the management cluster under the spoke's cluster name, so one Grafana query spans the fleet. Alloy reads its destinations from the `observability-hub` ConfigMap in `adhar-system` on the spoke: `HUB_MIMIR_URL`, `HUB_LOKI_URL`, `HUB_TEMPO_URL` and `HUB_CLUSTER_NAME`. Shipped defaults point at the hub's **in-cluster** services. Those are correct on the management cluster and unreachable from a spoke.

- **On a `DataPlane`** the controller writes that ConfigMap onto the plane for you, with the hub's external Gateway URLs (`https://mimir.<host>/api/v1/push`, `https://loki.<host>/loki/api/v1/push`, `https://tempo.<host>`) and the plane's name. The workload ApplicationSet ignores those fields, so ArgoCD and the controller do not fight over them.
- **On a cluster registered only through a `Cluster`**, nothing overrides the defaults. Set the four keys yourself, as [Observability](/docs/operations/observability) shows.

Either way, the hub's ingestion routes sit behind Keycloak's oauth2-proxy in bearer mode. A spoke must present an access token obtained by `client_credentials` for the `mimir`, `loki` or `tempo` client, with secrets from the hub's `keycloak-clients` Secret. The shipped Alloy configuration does not perform that exchange, so add it before you rely on spoke data.

**Verify:** in Grafana on the management cluster, open Explore, pick the Mimir data source and filter on the spoke's cluster name. Recent series mean data is arriving. Nothing at all usually means the `HUB_*` keys still point in-cluster or no bearer token is being sent.

## Step 7 (optional) — Join a Cilium Cluster Mesh

Cluster Mesh is live-verified between two **self-managed** Adhar clusters, each brought up by `adhar up` with the platform's own Cilium. In the verified run, `adhar-mgmt` (cluster id 1, Pod CIDR `10.244.0.0/16`) joined `adhar-test` (id 2, `10.245.0.0/16`): `cilium clustermesh status` was green on both sides, and a global service carried traffic both ways. A managed cluster built by a `Cluster`, such as DOKS, runs the provider's CNI and is not part of that verified path.

Every requirement below is mandatory:

| Requirement | Why | Where to set it |
|---|---|---|
| Distinct cluster name **and** id (1–255) per cluster | Two clusters claiming id 1 cannot mesh; the management cluster is `adhar-mgmt`, id 1 | `clusterConfig.name`, `clusterConfig.clusterMeshId` |
| Non-overlapping Pod CIDRs | Routing | `clusterConfig.podCIDR` |
| One shared Cilium CA | mTLS between agents and the clustermesh apiserver; Adhar bakes the same CA into its embedded manifest, so this holds by default | — |
| **The same VPC**, or a LoadBalancer-typed apiserver | On DigitalOcean the platform's Cilium answers node ports only on the private NIC, so a peer outside the VPC cannot reach the apiserver | `reuse_existing_vpc: true` + matching `vpc_cidr` |
| Firewall open between peers | The platform opens the VPC CIDR for VXLAN 8472/udp; a tag-scoped rule covers one cluster and silently drops packets | — |
| clustermesh apiserver enabled on each side | Peers read each other's state through it | `clusterConfig.clusterMeshApiServer: "true"`, `clusterMeshServiceType: NodePort` or `LoadBalancer` |

With both clusters up, store the second cluster's kubeconfig on the management cluster and declare it as an adopted data plane with the mesh on:

```bash
kubectl -n adhar-system create secret generic adhar-test-kubeconfig \
  --from-file=kubeconfig=$HOME/.adhar/clusters/test/kubeconfig
```

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

**Expected:** conditions `InfraReady`, `Registered`, `AgentsReady`, `ObservabilityWired`, `MeshJoined` and `Ready` all `True`. `cilium clustermesh status` reports every node connected.

### What the mesh does not give you

**SPIFFE/SPIRE is deliberately absent.** Cilium's SPIRE-backed mutual authentication is **off** in the platform's Cilium values, for two reasons. Unregistered identities flooded the operator with retries and starved its Gateway API controller: the Gateway took about four minutes to reach `Programmed`. And Cilium marks the feature deprecated in 1.20 for removal in 1.21, while the platform runs 1.20. "Mesh-ready identity" therefore means exactly this: a unique cluster name and id, and one shared CA. **Workload-to-workload mutual authentication is not something this platform provides.** Use WireGuard or IPsec transparent encryption and network policy for confidentiality, and application-level mTLS where you need peer identity. See [Security Best Practices](/docs/security/security-best-practices).

## Step 8 — Operate the fleet

`adhar fleet` acts on every registered `DataPlane` at once. A cluster registered only through a `Cluster` does not appear there; `adhar get dataplanes` and `adhar fleet` list DataPlanes only.

```bash
adhar fleet list                                    # planes, mode, Ready, Kubernetes version, app count, labels
adhar fleet drift                                   # planes whose MINOR version differs from the hub
adhar fleet upgrade --to-version v1.37.2 --dry-run  # print the wave plan, change nothing
adhar fleet upgrade --to-version v1.37.2 --canary 1 --batch-size 3 --rollback-on-failure
```

`adhar fleet upgrade` never calls a cloud API. It edits `spec.infrastructure.version` on each DataPlane in waves: one canary, the least-loaded plane, first, then batches. Between waves it waits for health (`--wave-timeout`, default 20m). It stops when a plane that **was** Ready stops being Ready. A plane that was already unhealthy does not block the rollout. The planner is unit-tested, but a live multi-cluster run is still outstanding, so dry-run first and keep `--rollback-on-failure` on.

## Step 9 — Tear down cleanly

Deleting a `Cluster` removes the ArgoCD registration Secret at the same instant as the cluster. The Applications that targeted it then hang in `Terminating`, because their finalizer can no longer reach the API server. Remove the `Cluster` from Git (or `kubectl delete` it), then clear the leftovers:

```bash
kubectl -n fleet delete cluster wl-blr1
for app in $(kubectl -n adhar-system get applications.argoproj.io -l adhar.io/cluster=wl-blr1 -o name); do
  kubectl -n adhar-system patch "$app" --type merge -p '{"metadata":{"finalizers":[]}}'
done
```

**Expected:** after a few minutes, `doctl kubernetes cluster list` no longer shows `wl-blr1`, and its droplets are gone. The verified teardown left no paid resource. Deleting a `DataPlane` is gentler. Its finalizer first strips the selector labels from the ArgoCD cluster Secret so the ApplicationSet stops regenerating Applications, and then deletes them while the plane is still reachable.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cluster` never leaves `Pending`; nothing appears in DigitalOcean | No ClusterProviderConfigs, so Crossplane cannot provision | `kubectl get clusterproviderconfigs.digitalocean.m.crossplane.io`; fix the provider credentials |
| XR rejected: `region is required` / `nodePools ... is required` | CEL rules on the XRD: both are mandatory except for `VCLUSTER` | Add `region` and at least one node pool |
| Status message mentions a defaulted or invalid version slug | DOKS slugs expire | Set `version` from `doctl kubernetes options versions` |
| Cluster is up but no Applications target it | The registration Secret lacks `adhar.io/cluster`, or a second registration path conflicts | Check `kubectl -n adhar-system get secret -l argocd.argoproj.io/secret-type=cluster --show-labels`; use one path per cluster |
| Workload Applications hang `Terminating` after delete | The registration Secret vanished with the cluster | Clear their finalizers (Step 9) |
| Spoke invisible in Grafana | `HUB_*` still in-cluster, or no bearer token on the ingestion route | Override the ConfigMap; supply a `client_credentials` token |
| `MeshJoined` stays `False`; the connect Job fails | Overlapping Pod CIDRs, duplicate cluster id, apiserver unreachable (different VPC), or VXLAN blocked | Work through the requirements table; read `kubectl -n adhar-system logs job/clustermesh-connect-<name> --all-containers` |
| `cilium` CLI says Cilium is not installed | It looks in `kube-system` by default | Pass `-n adhar-system` |
| `adhar fleet list` shows "No workload clusters are registered" | The cluster was registered via `Cluster` only | Expected; fleet operations act on `DataPlane`s |

## Next steps

- **[Architecture](/docs/core-concepts/architecture)** — topologies T1 to T3 and the control/data-plane invariant
- **[Observability](/docs/operations/observability)** — hub-and-spoke details and the spoke ConfigMap
- **[Upgrade the Platform](/docs/guides/upgrade-the-platform)** — the management cluster goes last
- **[Backup and Restore](/docs/guides/backup-and-restore)** — what to back up when workload clusters are disposable
- **[DigitalOcean](/docs/providers/digitalocean)** — VPC, firewall and DOKS specifics
