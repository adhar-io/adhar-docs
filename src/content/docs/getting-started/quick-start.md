---
title: "Quick Start"
section: "Getting Started"
order: 3
path: "/docs/getting-started/quick-start"
---

# Quick Start

One command turns your laptop into a complete Internal Developer Platform: GitOps delivery, identity, CI, a container registry, observability and a developer portal, behind one gateway and one sign-on. This page brings the platform up, shows you how to check it, and walks through your first change and your first infrastructure request.

By the end, you will have:

- a running, healthy platform
- signed in to its consoles
- changed it the GitOps way
- asked its control plane for a database

## At a glance

| | |
|---|---|
| **Command** | `adhar up` |
| **What you get** | A Kind node named `adhar` running the local platform profile |
| **Packages** | The *local profile*: a curated core of the 100+ catalogue packages. `adhar stack list --enabled` prints them |
| **Host ports** | `8443` → HTTPS, `8080` → HTTP, mapped to the Gateway's node ports `30443`/`30080`. If a port is taken, `adhar up` uses the next free one |
| **URLs** | `https://<service>.adhar.localtest.me:8443` |
| **Teardown** | `adhar down` |

## Prerequisites

Both are covered in [Installation](/docs/getting-started/installation):

- A container engine (Docker, Podman, nerdctl or Finch) that is running and has at least 8 GB of memory.
- The `adhar` CLI on your `PATH`.

The platform's package definitions (the *stack*) are built into the binary. There is no repository to clone, and every command on this page works from any directory.

> **Note:** This page uses the local path because it needs no account and no DNS. On a cloud, the command is `adhar up -f <config-file> --env <name>`, and the stages, status checks and GitOps workflow are the same. See [Set up a cloud platform](/docs/getting-started/installation#set-up-a-cloud-platform).

## 1. Start the platform

```bash
adhar up
```

A nine-stage checklist streams to your terminal under the heading *Provisioning Adhar platform*:

```diagram
nst-up-stages
```

The CLI runs the first three stages itself. From stage four on, the platform controller does the work. Locally, that controller runs inside the `adhar up` process, and the CLI tracks it by polling the `AdharPlatform` resource (the custom resource that describes your platform).

Three things are worth knowing about the bootstrap:

- **The foundation does not depend on chart repositories.** The manifests for the Gateway API CRDs, Cilium, the Gateway, ArgoCD, Gitea and Crossplane are compiled into the binary. Container images are still pulled.
- **Images come through pull-through caches.** Adhar starts one small registry container per upstream registry next to the node. The first run pulls roughly 90 images (about 10 GB); later runs read them from local disk.
- **After stage 7, Git is the source of truth.** ArgoCD reconciles continuously with self-heal on, so a manual `kubectl edit` on a managed object is reverted. To change the platform, you change Git (step 5).

The CLI stops waiting after `--apps-timeout` (default 15 minutes) and tells you so. ArgoCD keeps converging in the background either way.

On a cloud, the first three stages are **Preflight** (credentials, quota and API access), **Cloud cluster** and **Kubeconfig & TLS**. The production profile is much larger than the local one, so the catalogue keeps converging after the CLI returns while the autoscaler adds workers. That is expected.

**Check:** the run ends with a `✓  Platform ready` panel that lists the console URLs and three hints: `adhar get secrets`, `adhar get status` and `adhar down`.

### Useful variants

| Command | Effect |
|---|---|
| `adhar up --port 9443` | Use a different HTTPS host port. HTTP derives as port − 363, here `9080`. If either port is in use, the next free one is used |
| `adhar up --recreate` | **Destructive.** Delete the existing node and rebuild from scratch |
| `adhar up --dry-run` | Resolve everything and preview. Create nothing |
| `adhar up --kube-version v1.36.0` | Pin a Kubernetes version (default `v1.37.0`) |
| `adhar up --dev-password` | Set the ArgoCD and Gitea admin passwords to `developer` |
| `adhar up --ha` | Render the foundation in HA mode. Heavier, more production-like |
| `adhar up --apps-timeout 25m` | Wait longer before handing off to the background |
| `adhar up` (again) | **Safe.** Resumes an interrupted bootstrap from the gate that was pending |

## 2. Confirm it is healthy

```bash
adhar get status              # AdharPlatform conditions, core services, per-package health
adhar stack status            # how far the platform packages have converged
adhar stack list --problems   # only packages that are not Synced and Healthy
```

`adhar get status` prints an **Overall Status** of `● Healthy`, `▲ Degraded` or `✖ Critical`, with a health score out of 100. Sections follow for core services, cluster resources, platform conditions, platform packages and access URLs.

**Check:** the five conditions `GatewayReady`, `ArgoCDReady`, `GiteaReady`, `CrossplaneReady` and `GitOpsReady` are true. The aggregate `Ready` condition is true only when all five are.

For scripts, ask for JSON:

```bash
adhar get status -o json | jq -r '.OverallStatus'     # ● Healthy
```

> **Note:** Right after the first run, some packages sit at `Progressing` or `Degraded` while databases start and images pull. That is normal convergence, not a failure.

`adhar get apps` is a different command. It lists *your own* applications, not the platform's packages, and stays empty until you reach [Your First Service](/docs/getting-started/first-service).

## 3. Open the consoles

Every service is a subdomain of `adhar.localtest.me`, which resolves to `127.0.0.1` from public DNS. You do not edit `/etc/hosts`. If you used `--port`, or `adhar up` picked another free port, replace `8443` with that port.

| Service | URL | What it is for |
|---|---|---|
| **Adhar Console** | `https://console.adhar.localtest.me:8443` | Developer portal: catalogue, golden paths |
| **ArgoCD** | `https://argocd.adhar.localtest.me:8443` | Every package, as a GitOps Application |
| **Gitea** | `https://gitea.adhar.localtest.me:8443` | The platform's source of truth |
| **Keycloak** | `https://keycloak.adhar.localtest.me:8443` | Identity for every other service |
| **Grafana** | `https://grafana.adhar.localtest.me:8443` | Metrics and dashboards |
| **Headlamp** | `https://headlamp.adhar.localtest.me:8443` | A readable Kubernetes UI |
| **Harbor** | `https://harbor.adhar.localtest.me:8443` | Container registry, signed and scanned |

Every UI trusts the same Keycloak realm (`adhar`), so one sign-in covers them all. The certificate is the platform's own self-signed one: accept the browser warning, or trust the platform CA as shown in [Local (Kind)](/docs/providers/local-kind).

> **Note:** The ready panel prints a fixed set of URLs, including Hubble, which is disabled in the local profile. A URL works only if its package is enabled *and* ships an `HTTPRoute`. List the routes your platform actually serves:

```bash
kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]
```

## 4. Get credentials

The CLI reads the platform's labelled credential Secrets for you:

```bash
adhar get secrets                 # every credential the CLI knows about
adhar get secrets -p argocd       # only ArgoCD (user: admin)
adhar get secrets -p keycloak     # admin plus the seeded users
```

`-p` accepts `argocd`, `gitea`, `keycloak`, `adhar-console`, `openbao`, `vault`, `postgres`, `redis`, `harbor` and `rustfs`. It also works for any package that labels its credential Secret for the CLI.

> **Warning:** Gitea's day-0 login is `gitea_admin` / `r8sA8CPHD9!bt6d`, a published constant. Rotate it before anyone else can reach the platform. The production profile turns on the `adhar-credential-rotation` package, which rotates the Gitea and ArgoCD bootstrap credentials. It is off locally so these documented logins keep working.

## 5. Change the platform the GitOps way

You do not turn on a package with `kubectl apply`. You edit the stack, then converge.

```diagram
nst-change-loop
```

The stack built into the CLI is read-only. Write an editable copy once and point the CLI at it:

```bash
adhar stack export ./stack             # the stack this binary was built with
export ADHAR_STACK_DIR=$PWD/stack      # adhar now reads and edits this copy
```

Then the loop is always the same. For example, to add log collection with Loki:

```bash
adhar stack list                 # the catalogue, with enablement and live state
adhar stack conflicts            # packages that must never both be on
adhar stack enable loki          # edits the stack files in $ADHAR_STACK_DIR
adhar upgrade --diff-only        # preview exactly what would change
adhar upgrade                    # confirm, push to the in-cluster Gitea, let ArgoCD sync
adhar stack status loki          # the package's live state
```

`adhar stack enable` edits two files: the profile's ApplicationSet file and its mirrored environment config. Enabling a package locally also enables it in production. Nothing is committed or pushed until `adhar upgrade`.

**Check:** `adhar stack status loki` shows `Synced` and `Healthy`.

> **Warning:** A single Kind node cannot run the full catalogue; the full set runs the node out of memory. Check `kubectl top nodes` before you enable anything heavy. A few packages claim the same cluster-scoped objects and must not both be enabled, which is what `adhar stack conflicts` reports. See [Customization](/docs/operations/customization) for the full workflow.

## 6. Request infrastructure from the control plane

Teams request infrastructure as Kubernetes objects, and the control plane builds it. Ask for a PostgreSQL database in a namespace of your own:

```bash
kubectl create namespace demo
adhar database create --name demo-db --engine postgresql --version 16 --namespace demo
```

On `adhar database`, `-n` means `--name`, not namespace, so spell out `--namespace`. `--version` is required.

**Check:** follow the request down to what it produced:

```bash
kubectl get databases.platform.adhar.io -n demo     # the request: READY turns True
kubectl get clusters.postgresql.cnpg.io -n demo     # what it composed: a CNPG cluster
kubectl get secret demo-db-app -n demo              # the connection details, for your app
```

Locally, the request becomes an in-cluster CloudNativePG cluster. On a cloud, the same request can become a managed database. [Control Plane](/docs/core-concepts/control-plane) explains how, and lists every API you can request. Clean up with `kubectl delete namespace demo`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `adhar up` fails immediately | The container engine's daemon is not answering | Run `docker info`. Start the engine and retry |
| `the stack built into adhar is read-only` | `adhar stack enable` needs an editable copy | Run `adhar stack export ./stack` and set `ADHAR_STACK_DIR`, as in step 5 |
| Bootstrap stopped part-way | Ctrl-C, sleep or a timeout | Run `adhar up` again. It resumes from the pending gate |
| ArgoCD is up but shows no applications | The GitOps phase never finished | Run `adhar up` again |
| A URL returns nothing | The package is not enabled, not `Healthy`, or ships no `HTTPRoute` | Run `adhar stack status <package>` |
| Browser TLS warning | The local certificate is self-signed | Expected locally. Production uses cert-manager certificates |
| Pods `Pending`, node under pressure | The engine has too little memory | Give the engine more RAM, or run `adhar stack disable <package>` and then `adhar upgrade` |
| `demo-db` never turns `READY` | A composed piece is not ready | Run `kubectl describe databases.platform.adhar.io demo-db -n demo`. The events name it |
| Everything is stuck | — | `adhar up --recreate`, a destructive rebuild |

See [Troubleshooting](/docs/reference/troubleshooting) for deeper failure signatures.

### Why re-running `adhar up` is safe

- **No duplicates.** Every foundation manifest is applied with Server-Side Apply and force-ownership, so a re-run takes over the existing objects.
- **Gated phases.** Each phase is gated on a status flag. Satisfied gates are skipped, and the pending one runs.
- **Data survives.** Without `--recreate`, the existing healthy node is reused, so repos, data and running apps are kept.
- **A strict exit gate.** A run cannot report success while the repos are unseeded or the Gateway is not yet serving traffic.

## Clean up

```bash
adhar down                        # remove the Kind node and Adhar state
adhar down --purge-image-cache    # also drop the cached images
adhar up --recreate               # or destroy and rebuild in one step
```

By default, `adhar down` keeps the image cache volume, so the next `adhar up` does not pull the images again. You can rebuild the platform from the binary alone, plus your exported stack if you changed it. Anything you changed only inside the cluster (data, or commits pushed straight to the in-cluster Gitea) is lost.

## Next steps

- **[Your First Service](/docs/getting-started/first-service)** — put an application on the platform, from a template to a URL
- **[Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service)** — the control-plane request above, carried through to a running app
- **[Configuration](/docs/getting-started/configuration)** — the config file, for when you move off the laptop
- **[Architecture](/docs/core-concepts/architecture)** — how the bootstrap and the control plane fit together
