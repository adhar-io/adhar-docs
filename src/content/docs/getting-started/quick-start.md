---
title: "Quick Start"
section: "Getting Started"
order: 3
path: "/docs/getting-started/quick-start"
---

# Quick Start

One command turns your laptop into a complete Internal Developer Platform. You get GitOps delivery, identity, CI, a container registry, observability and a developer portal, all behind one gateway and one sign-on. **The interesting part is not that it is one command. It is that after the first two minutes, Git is in charge.** This page explains what each phase is doing, so you know what is happening while you wait.

You need a container engine and the `adhar` CLI from [Installation](/docs/getting-started/installation). Nothing else. By the end of this page, you will:

- have a running platform
- know how to tell that it is healthy
- be signed in to its consoles
- have changed it the GitOps way
- have asked its control plane for a database

## Ten minutes, on a laptop or a cloud

**One `adhar up` brings up the whole platform, on your laptop or on any supported cloud.** Locally, that takes about ten minutes. On a cloud, the provider's machine provisioning sets the pace. DigitalOcean is serving in about 5 minutes and usable at about 13. AWS first runs take 25–40 minutes. The command has the same shape either way:

```bash
adhar up                                              # local: Kind, no config file
adhar up -f config.digitalocean.yaml --env dev        # cloud: a config file and an environment
```

This page uses the local path, because it needs no account and no DNS. Everything you learn here works the same on a cloud: the stages, the status checks and the GitOps workflow. [Installation](/docs/getting-started/installation#set-up-a-cloud-platform) covers the cloud preparation.

## At a glance

| | |
|---|---|
| **Command** | `adhar up` |
| **Time** | About 10 minutes locally on a warm machine. The first run also pulls ~10 GB. On a cloud, provisioning sets the pace |
| **What you get** | A Kind node named `adhar` running the curated local platform profile |
| **Packages** | A curated core of the 100+ wired catalogue entries. `adhar stack list --enabled` prints them |
| **Host ports** | `8443` → HTTPS, `8080` → HTTP, mapped to the Gateway's node ports `30443`/`30080` |
| **URLs** | `https://<service>.adhar.localtest.me:8443` |
| **Teardown** | `adhar down` |

## 1. Start the platform

```bash
adhar up
```

A nine-stage checklist streams to your terminal. The first three stages run in the CLI. From stage four on, the controller does the work, and the CLI polls the `AdharPlatform` resource to track it:

| Stage | What it is doing |
|---|---|
| Kind cluster | Creates the node. Kind's default CNI and kube-proxy are **disabled**, because Cilium replaces both |
| Platform CRDs | Installs `AdharPlatform`, `GitRepository`, `CustomPackage` |
| Networking | CoreDNS rewrite plus the self-signed platform certificate |
| Cilium & Gateway | eBPF CNI and the Cilium Gateway API implementation |
| ArgoCD | The GitOps engine |
| Gitea | The in-cluster Git server |
| GitOps repos | Seeds the platform stack into Gitea |
| Crossplane | Control plane and providers |
| GitOps sync | Counts up as `n/m apps Synced + Healthy` |

### What is actually happening

Adhar installs things directly (**imperatively**) only until it has a place to put Git. Then it hands everything else to **GitOps**:

```diagram
gd-adhar-up-stages
```

Two points in that diagram are easy to miss, and both matter.

**The foundation never touches the network.** Those six components ship as manifests compiled into the binary. So an upstream chart repository that is down or has moved cannot break the bootstrap.

**After step 4, Git is the source of truth.** ArgoCD reconciles continuously with self-heal on. So if you run a manual `kubectl edit` on a managed object, it is reverted within about a minute. To change the platform, you change Git. Step 5 below and [Architecture](/docs/core-concepts/architecture) cover how.

### How long each phase takes

```diagram
ds-up-timeline
```

These times were measured on one machine (Docker Desktop, 11 CPUs) with a warm image cache. The foundation completes in about **2m40s**. The GitOps sync of the curated core takes about another **6m40s**. That is roughly **ten minutes** until every application is `Synced` and `Healthy`.

The first run on a cold machine is slower. It pulls roughly 90 images from eight registries. They come through per-registry pull-through caches that Adhar starts next to the node. Every later run reads them from local disk.

The CLI stops waiting after `--apps-timeout` (default **15 minutes**) and tells you so. ArgoCD keeps converging in the background either way.

On a cloud, the foundation and GitOps phases take about as long as they do locally. What changes is the time before them. The checklist adds **Preflight** (credentials, quota and API access), **Cloud cluster** and **Kubeconfig & TLS** stages, and the provider's machine provisioning takes most of the time. On AWS, GCP and Azure, the catalogue keeps converging for another 30–45 minutes after the CLI returns, while the autoscaler adds workers. The provider pages have the measured numbers.

### Useful variants

| Command | Effect |
|---|---|
| `adhar up --port 9443` | Different HTTPS host port. HTTP derives as port − 363, here `9080` |
| `adhar up --recreate` | **Destructive.** Delete the existing node and rebuild from scratch |
| `adhar up --dry-run` | Resolve everything and preview. Create nothing |
| `adhar up --kube-version v1.36.0` | Pin a Kubernetes version (default `v1.37.0`) |
| `adhar up --dev-password` | Set the ArgoCD and Gitea admin passwords to `developer` |
| `adhar up --ha` | Render the foundation in HA mode. Heavier, more production-like |
| `adhar up --apps-timeout 25m` | Wait longer before handing off to the background |
| `adhar up` (again) | **Safe.** Resumes an interrupted bootstrap from the gate that was pending |

## 2. Confirm it came up

When it succeeds, you see a `✓  Platform ready` panel. It lists the console URLs and three hints: `adhar get secrets`, `adhar get status`, `adhar down`. Check health at any time:

```bash
adhar get status      # AdharPlatform conditions + core services + per-package health
adhar get apps        # every application's sync and health state
```

`adhar get status` first prints an **Overall Status** of `● Healthy`, `▲ Degraded` or `✖ Critical`, with a health score out of 100. Then it prints sections for core services, cluster resources, platform conditions, packages and access URLs. The five conditions to read are `GatewayReady`, `ArgoCDReady`, `GiteaReady`, `CrossplaneReady` and `GitOpsReady`. Also read the aggregate `Ready` condition.

```bash
adhar get status -o json | jq -r '.OverallStatus'
adhar get apps --include-system        # also show kube-system and friends
```

> In the first few minutes, some applications sit at `Progressing` or `Degraded` while databases start up and images pull. That is normal for a first run, not a failure. Give it three to five minutes before you investigate.

## 3. Reach the consoles

Every service is a subdomain of `adhar.localtest.me`, which resolves to `127.0.0.1` from public DNS. You do not edit `/etc/hosts`, and no DNS setup is possible locally. The certificate is the platform's own self-signed one. Accept the browser warning, or trust the platform CA as shown in [Local (Kind)](/docs/providers/local-kind).

| Service | URL | What it is for |
|---|---|---|
| **Adhar Console** | `https://console.adhar.localtest.me:8443` | Developer portal: catalog, golden paths, scorecards |
| **ArgoCD** | `https://argocd.adhar.localtest.me:8443` | Every package, as a GitOps Application |
| **Gitea** | `https://gitea.adhar.localtest.me:8443` | The platform's source of truth |
| **Keycloak** | `https://keycloak.adhar.localtest.me:8443` | Identity for every other service |
| **Grafana** | `https://grafana.adhar.localtest.me:8443` | Metrics and dashboards |
| **Headlamp** | `https://headlamp.adhar.localtest.me:8443` | A readable Kubernetes UI |
| **Harbor** | `https://harbor.adhar.localtest.me:8443` | Container registry, signed and scanned |

> **The ready panel lists Hubble too, but it is disabled in the local profile.** The panel prints a fixed set of URLs, and the local package set is smaller. A URL only works if its package is enabled *and* ships an `HTTPRoute`. To get the definitive list for your platform, run:

```bash
kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]
```

Every UI trusts the same Keycloak realm (`adhar`), so one sign-in covers them all. [Platform Services](/docs/core-concepts/platform-services) describes what each tool does.

## 4. Get credentials

Do not dig secrets out of pods. The CLI reads the platform's labelled credential secrets for you:

```bash
adhar get secrets                 # every credential the CLI knows about
adhar get secrets -p argocd       # only ArgoCD (user: admin)
adhar get secrets -p keycloak     # admin plus the seeded users
```

`-p` accepts `argocd`, `gitea`, `keycloak`, `adhar-console`, `openbao`, `vault`, `postgres`, `redis`, `harbor`, `rustfs`. It also works for any package that labels its credential Secret for the CLI.

> Gitea's day-0 login is `gitea_admin` / `r8sA8CPHD9!bt6d`. This is a published constant. Rotate it before anyone else can reach the platform. In production, enable the `credential-rotation` package.

## 5. Change the platform the GitOps way

Git is the source of truth, so you do not turn on a package with `kubectl apply`. Instead, you edit the stack and then run a convergence. The CLI edits two files: the profile's ApplicationSet file *and* its mirrored environment config. A parity test requires them to agree. The CLI leaves the diff for you to review. Nothing is pushed for you.

```bash
adhar stack list                 # the catalogue, with enablement and live state
adhar stack list --problems      # only what is not Synced and Healthy
adhar stack conflicts            # packages that must never both be on
adhar stack enable harbor        # edits the stack
adhar upgrade --diff-only        # preview exactly what would change
adhar upgrade                    # converge
```

> A single Kind node cannot run the full catalogue. The local profile exists because the full set OOM-kills the node (runs it out of memory). Before you enable anything heavy, check `kubectl top nodes`. Also check `adhar stack conflicts` first. A few packages claim the same cluster-scoped objects and must not both be enabled. See [Customization](/docs/operations/customization) for the full workflow.

## 6. Ask the control plane for something

The platform is more than consoles. Teams request infrastructure as Kubernetes objects, and the control plane builds it. Ask for a PostgreSQL database in a namespace of your own:

```bash
kubectl create namespace demo
adhar database create --name demo-db --engine postgresql --version 16 --namespace demo
```

On `adhar database`, `-n` means `--name`, not namespace. So spell out `--namespace` in full. Then follow the request down to what it produced:

```bash
kubectl get databases.platform.adhar.io -n demo     # the request: READY turns True
kubectl get clusters.postgresql.cnpg.io -n demo     # what it composed: a CNPG cluster
kubectl get secret demo-db-app -n demo              # the connection details, for your app
```

Locally, the request becomes an in-cluster CloudNativePG cluster. On a cloud, the same request can become a managed database. [Control Plane](/docs/core-concepts/control-plane) explains how this works and lists every API you can ask for. Clean up with `kubectl delete namespace demo`.

## 7. If something goes wrong

| Symptom | First move |
|---|---|
| `adhar up` fails immediately | Run `docker info`. Is the engine answering? Port taken? Try `adhar up --port 9443` |
| Bootstrap stopped part-way (Ctrl-C, sleep, timeout) | Run `adhar up` again. It resumes from the pending gate |
| ArgoCD is up but shows no applications at all | The GitOps phase never finished. Re-run `adhar up` |
| A URL returns nothing | Run `adhar get apps`. The package must be enabled, `Healthy`, and ship an `HTTPRoute` |
| Browser TLS warning | Expected locally. Production uses cert-manager certificates |
| Pods `Pending`, node under pressure | Give the engine more RAM, or disable packages you enabled |
| `demo-db` never turns `READY` | Run `kubectl describe databases.platform.adhar.io demo-db -n demo`. The events name the piece that is not ready |
| Everything stuck | `adhar up --recreate`, a destructive rebuild |

### Why re-running `adhar up` is safe

Every foundation manifest is applied with Server-Side Apply and force-ownership. So a re-run takes over the existing objects instead of duplicating them.

Each phase is gated on a status flag. Gates that are already satisfied are skipped, and the pending one runs. Without `--recreate`, the existing healthy node is reused, so repos, data and running apps survive.

The exit gate is honest. A run cannot report success while the repos are unseeded or the Gateway is unprogrammed. See [Troubleshooting](/docs/reference/troubleshooting) for deeper failure signatures.

## 8. Tear it down

```bash
adhar down                        # remove the Kind node and Adhar state
adhar down --purge-image-cache    # also drop the cached images
adhar up --recreate               # or destroy and rebuild in one step
```

By default, `adhar down` keeps the image cache volume, so the next `adhar up` is fast. You can fully rebuild the platform from the binary plus your config. That makes rebuilding a routine step, not a last resort.

## Next steps

You have a platform. The next page puts an application on it. It follows the change all the way from a template to a URL.

- **[Your First Service](/docs/getting-started/first-service)** — the full GitOps loop, end to end
- **[Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service)** — the control-plane request above, carried through to a running app
- **[Configuration](/docs/getting-started/configuration)** — the config file, for when you move off the laptop
- **[Architecture](/docs/core-concepts/architecture)** — how the bootstrap and control plane actually fit together
- **[CLI Reference](/docs/reference/cli)** — every command and flag
