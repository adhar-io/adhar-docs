---
title: "Quick Start"
section: "Getting Started"
order: 3
path: "/docs/getting-started/quick-start"
---

# Quick Start

This page takes you from nothing to a running Adhar platform on your laptop: GitOps delivery, identity, CI, a container registry, promotion, observability and a developer portal, behind one gateway and one sign-on. You install the CLI, bring the platform up, check it, sign in, and make your first change to it.

Read the Getting Started pages in this order:

| Page | Use it for |
|---|---|
| **Quick Start** (this page) | A running local platform |
| [Your First Service](/docs/getting-started/first-service) | Your first application, from a template to `dev`, `test` and `prod` |
| [Installation](/docs/getting-started/installation) | The reference for prerequisites, every install method, and preparing a cloud account |
| [Configuration](/docs/getting-started/configuration) | The config file a cloud platform needs |

## At a glance

| | |
|---|---|
| **Command** | `adhar up` |
| **What you get** | A Kind cluster named `adhar` running the *local profile*: the packages the local stack enables. `adhar stack list --enabled` prints them |
| **Host ports** | `8443` (HTTPS) and `8080` (HTTP), mapped to the Gateway's node ports `30443` and `30080`. If a port is taken, `adhar up` uses the next free one |
| **URLs** | `https://<service>.adhar.localtest.me:8443` |
| **Teardown** | `adhar down` |

## Before you start

You need a container engine (Docker, Podman, nerdctl or Finch) that is running and has at least 8 GB of memory, 4 CPUs and 20 GB of free disk. [Installation](/docs/getting-started/installation#prerequisites) explains the requirements and how to size the engine.

You do not install Kubernetes and you do not clone a repository. The platform's package definitions (the *stack*) are built into the `adhar` binary, so every command on this page works from any directory.

## 1. Install the CLI

```bash
brew install adhar-io/tap/adhar
```

No Homebrew, or on Windows? Use one of the other methods in [Install the CLI](/docs/getting-started/installation#install-the-cli).

**Check:** the engine's daemon answers and the CLI sees it.

```bash
docker info >/dev/null && echo "engine responding"   # or: podman info
adhar version                                         # the container-engine row reads ● Available
```

## 2. Start the platform

```bash
adhar up
```

A nine-stage checklist streams to your terminal under the heading *Provisioning Adhar platform*:

```diagram
nst-up-stages
```

The CLI runs the first three stages itself. From stage four on, the `AdharPlatform` controller (the controller for the custom resource that describes your platform) does the work. Locally, that controller runs inside the `adhar up` process.

- **The foundation needs no chart repositories.** The manifests for the Gateway API CRDs, Cilium, the Gateway, ArgoCD, Gitea and Crossplane are compiled into the binary. Container images are still pulled.
- **Images come through pull-through caches.** Adhar runs one small registry container per upstream registry next to the node. Later runs read images from local disk.
- **After stage 7, Git is the source of truth.** ArgoCD reconciles with self-heal on, so a `kubectl edit` on a managed object is reverted. To change the platform, change Git ([step 6](#6-change-the-platform-the-gitops-way)).

`adhar up` finishes as soon as the Adhar Console is Synced, Healthy and serving. The rest of the packages keep converging in the background, so the last stage can read `n/m ready — ArgoCD continues in the background`. If the console is not serving when `--apps-timeout` (default `15m`) runs out, the run ends with `adhar up did not complete`; run `adhar up` again to resume the wait.

**Check:** the run ends with a `✓  Platform ready` panel that lists the console URLs and three next steps: `adhar get secrets`, `adhar get status` and `adhar down`.

### Useful variants

| Command | Effect |
|---|---|
| `adhar up --port 9443` | Use another HTTPS host port. HTTP derives as port − 363, here `9080` |
| `adhar up --verbose` | Per-stage logs instead of the compact checklist |
| `adhar up --dry-run` | Resolve everything and preview. Create nothing |
| `adhar up --kube-version v1.36.0` | Pin a Kubernetes version (default `v1.37.0`) |
| `adhar up --dev-password` | Set the ArgoCD and Gitea admin passwords to `developer` |
| `adhar up --ha` | Render the foundation in HA mode. Heavier, more production-like |
| `adhar up --in-cluster` | Also install the long-running controller manager, which keeps reconciling the platform after the CLI exits. A cloud platform always has it |
| `adhar up --apps-timeout 25m` | Wait longer for the console |
| `adhar up --recreate` | **Destructive.** Delete the existing cluster and rebuild from scratch |
| `adhar up` (again) | **Safe.** Resumes an interrupted bootstrap from the stage that was pending |

## 3. Confirm it is healthy

```bash
adhar get status              # AdharPlatform conditions, core services, per-package health
adhar stack status            # how far the platform packages have converged
adhar stack list --problems   # only packages that are not Synced and Healthy
```

`adhar get status` prints an **Overall Status** of `● Healthy`, `▲ Degraded` or `✖ Critical` with a health score out of 100, then sections for core services, cluster resources, platform conditions, platform packages and access URLs. For scripts, use `adhar get status -o json | jq -r '.OverallStatus'`.

**Check:** the five conditions `GatewayReady`, `ArgoCDReady`, `GiteaReady`, `CrossplaneReady` and `GitOpsReady` are true. The aggregate `Ready` condition is true only when all five are.

> **Note:** Right after the first run, some packages sit at `Progressing` or `Degraded` while databases start and images pull. That is convergence, not failure. `adhar stack list --problems` shrinks as they settle.

`adhar get apps` lists *your* applications, not the platform's packages. It stays empty until [Your First Service](/docs/getting-started/first-service).

## 4. Open the consoles

Every service is a subdomain of `adhar.localtest.me`, which resolves to `127.0.0.1` from public DNS, so you do not edit `/etc/hosts`. If `adhar up` used another port, replace `8443` with it.

```diagram
nst-local-access
```

| Service | URL | What it is for |
|---|---|---|
| **Adhar Console** | `https://console.adhar.localtest.me:8443` | Developer portal: catalogue, golden paths, Marketplace |
| **ArgoCD** | `https://argocd.adhar.localtest.me:8443` | Every package, as a GitOps Application |
| **Gitea** | `https://gitea.adhar.localtest.me:8443` | The platform's Git server and source of truth |
| **Keycloak** | `https://keycloak.adhar.localtest.me:8443` | Identity for every other service |
| **Grafana** | `https://grafana.adhar.localtest.me:8443` | Metrics and dashboards |
| **Headlamp** | `https://headlamp.adhar.localtest.me:8443` | A readable Kubernetes UI |
| **Harbor** | `https://harbor.adhar.localtest.me:8443` | Container registry, signed and scanned images |
| **Kargo** | `https://kargo.adhar.localtest.me:8443` | Promotion of builds from `dev` to `test` to `prod` |
| **Nexus** | `https://nexus.adhar.localtest.me:8443` | Maven, npm and PyPI artifact repository (Harbor holds images) |

Every UI trusts the same Keycloak realm (`adhar`), so one sign-in covers them all. The certificate is the platform's own self-signed one: accept the browser warning, or trust the platform CA as shown in [Local (Kind)](/docs/providers/local-kind).

The ready panel prints a fixed list of URLs, including Hubble, which the local profile does not enable. A URL works only if its package is enabled and ships an `HTTPRoute`.

**Check:** list the host names your platform actually serves.

```bash
kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]
```

## 5. Get credentials

The CLI reads the platform's labelled credential Secrets for you:

```bash
adhar get secrets                 # every credential the CLI knows about
adhar get secrets -p argocd       # only ArgoCD (user: admin)
adhar get secrets -p keycloak     # admin plus the seeded users
```

`-p` accepts `argocd`, `gitea`, `keycloak`, `adhar-console`, `openbao`, `vault`, `postgres`, `redis`, `harbor` and `rustfs`, and any package that labels its credential Secret for the CLI.

**Check:** sign in to ArgoCD as `admin` with the password `adhar get secrets -p argocd` prints. The Applications list shows the platform's packages.

> **Warning:** Gitea's day-0 login is `gitea_admin` / `r8sA8CPHD9!bt6d`, a published constant. Rotate it before anyone else can reach the platform. The production profile enables the `adhar-credential-rotation` package, which rotates the Gitea and ArgoCD bootstrap credentials. It is off locally, so these documented logins keep working.

## 6. Change the platform the GitOps way

You do not turn on a package with `kubectl apply`. You edit the stack, then converge it.

```diagram
nst-change-loop
```

The stack built into the CLI is read-only. Write an editable copy into a new, empty directory once, and point the CLI at it:

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
```

`adhar stack enable` edits two files, the profile's ApplicationSet file and its mirrored environment config, and stops. Enabling a package locally also enables it in production, because the local profile must stay a subset of production. Nothing is committed or pushed until `adhar upgrade`. You can also toggle packages in the Console's Marketplace, which needs no copy.

**Check:** `adhar stack status loki` shows `Synced` and `Healthy`.

> **Warning:** A single Kind node cannot run the full catalogue. Check `kubectl top nodes` before you enable anything heavy. See [Customization](/docs/operations/customization) for chart values, your own packages and keeping the stack in your own Git repository.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `adhar up` fails immediately | The container engine's daemon is not answering | Run `docker info`. Start the engine and retry. More host problems: [Installation](/docs/getting-started/installation#troubleshooting) |
| `adhar up did not complete: adhar-console is …` | The console was not serving when the wait ended | Run `adhar up` again to resume the wait, or `--apps-timeout 25m`. `adhar stack list --problems` names what is still converging |
| Bootstrap stopped part-way | Ctrl-C, sleep or a timeout | Run `adhar up` again. It resumes from the pending stage |
| ArgoCD is up but shows no applications | The GitOps stage never finished | Run `adhar up` again |
| A URL returns nothing | The package is not enabled, not `Healthy`, or ships no `HTTPRoute` | Run `adhar stack status <package>` |
| Browser TLS warning | The local certificate is self-signed | Expected locally. Trust the platform CA, see [Local (Kind)](/docs/providers/local-kind) |
| Pods `Pending`, node under pressure | The engine has too little memory | Give the engine more RAM, or `adhar stack disable <package>` and `adhar upgrade` |
| `the stack built into adhar is read-only` | `adhar stack enable` needs an editable copy | `adhar stack export ./stack` and set `ADHAR_STACK_DIR`, as in step 6 |
| `… is not empty; export the stack into a new directory` | `adhar stack export` never writes into a directory that has files | Pick a new directory |
| Everything is stuck | — | `adhar up --recreate`, a destructive rebuild |

See [Troubleshooting](/docs/reference/troubleshooting) for deeper failure signatures.

### Why re-running `adhar up` is safe

- **No duplicates.** Every foundation manifest is applied with Server-Side Apply and force-ownership, so a re-run takes over the existing objects.
- **Gated stages.** Each stage is gated on a status flag. Satisfied gates are skipped and the pending one runs.
- **Data survives.** Without `--recreate`, the existing healthy cluster is reused, so repositories, data and running apps are kept.
- **A strict exit gate.** A run cannot report success while the repositories are unseeded or the console is not serving.

## Clean up

```bash
adhar down                        # remove the Kind cluster and Adhar state; keep the image cache
adhar down --purge-image-cache    # also remove the cache containers and volume
```

The next `adhar up` reads images from the kept cache. You can rebuild the platform from the binary alone, plus your exported stack if you changed it. Anything you changed only inside the cluster (data, or commits pushed straight to the in-cluster Gitea) is lost.

## Next steps

- **[Your First Service](/docs/getting-started/first-service)**: put an application on the platform and promote it from `dev` to `prod`
- **[Installation](/docs/getting-started/installation)**: other install methods, engine sizing, and preparing a cloud account
- **[Configuration](/docs/getting-started/configuration)**: the config file, for when you move off the laptop
- **[Architecture](/docs/core-concepts/architecture)**: how the bootstrap and the control plane fit together
