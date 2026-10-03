---
title: "Quick Start"
section: "Getting Started"
order: 3
path: "/docs/getting-started/quick-start"
---

# Quick Start

One command turns your laptop into a complete Internal Developer Platform: GitOps delivery, identity, CI, a container registry, observability and a developer portal, all behind one gateway and one sign-on. **The interesting part is not that it is one command — it is that after the first two minutes, Git is in charge.** This page narrates what each phase is doing so the wait is informative rather than opaque.

You need a container engine and the `adhar` CLI from [Installation](/docs/getting-started/installation). Nothing else.

## At a glance

| | |
|---|---|
| **Command** | `adhar up` |
| **Time** | Roughly 10 minutes on a warm machine; longer on the first run, which pulls ~10 GB |
| **What you get** | A Kind node named `adhar` running the curated local platform profile |
| **Packages** | 17 of the 101 wired catalogue entries are enabled locally |
| **Host ports** | `8443` → HTTPS, `8080` → HTTP, mapped to the Gateway's node ports `30443`/`30080` |
| **URLs** | `https://<service>.adhar.localtest.me:8443` |
| **Teardown** | `adhar down` |

## 1. Start the platform

```bash
adhar up
```

A nine-stage checklist streams to your terminal. The first three stages run in the CLI; from stage four on, the CLI is polling the `AdharPlatform` resource while the controller does the work:

| Stage | What it is doing |
|---|---|
| Kind cluster | Creates the node — Kind's default CNI and kube-proxy are **disabled**, because Cilium replaces both |
| Platform CRDs | Installs `AdharPlatform`, `GitRepository`, `CustomPackage` |
| Networking | CoreDNS rewrite plus the self-signed platform certificate |
| Cilium & Gateway | eBPF CNI and the Cilium Gateway API implementation |
| ArgoCD | The GitOps engine |
| Gitea | The in-cluster Git server |
| GitOps repos | Seeds the platform stack into Gitea |
| Crossplane | Control plane and providers |
| GitOps sync | Counts up as `n/m apps Synced + Healthy` |

### What is actually happening

Adhar bootstraps **imperatively** only far enough to have a place to put Git, then hands everything else to **GitOps**:

```diagram
gd-adhar-up-stages
```

Two things about that diagram are quick to skip past, and both are worth internalising.

**The foundation never touches the network.** Those six components ship as manifests compiled into the binary, so the bootstrap cannot be broken by an upstream chart repository being down or having moved.

**After step 4, Git is the source of truth.** ArgoCD reconciles continuously with self-heal on, so a manual `kubectl edit` on a managed object is reverted within about a minute. Changing the platform means changing Git — covered in step 6 below and in [Architecture](/docs/core-concepts/architecture).

### How long each phase takes

Measured on one machine (Docker Desktop, 11 CPUs) with a warm image cache: the foundation completes in about **2m40s** and the GitOps sync of the curated core in about another **6m40s**, so roughly **ten minutes** to every application `Synced` and `Healthy`. The first run on a cold machine is slower — it pulls roughly 90 images from eight registries through per-registry pull-through caches that Adhar starts alongside the node. Every later run reads them from local disk.

The CLI stops waiting after `--apps-timeout` (default **15 minutes**) and says so; ArgoCD keeps converging in the background either way.

### Useful variants

| Command | Effect |
|---|---|
| `adhar up --port 9443` | Different HTTPS host port. HTTP derives as port − 363, here `9080` |
| `adhar up --recreate` | **Destructive.** Delete the existing node and rebuild from scratch |
| `adhar up --dry-run` | Resolve everything and preview; create nothing |
| `adhar up --kube-version v1.36.0` | Pin a Kubernetes version (default `v1.37.0`) |
| `adhar up --dev-password` | Set the ArgoCD and Gitea admin passwords to `developer` |
| `adhar up --ha` | Render the foundation in HA mode — heavier, more production-like |
| `adhar up --apps-timeout 25m` | Wait longer before handing off to the background |
| `adhar up` (again) | **Safe.** Resumes an interrupted bootstrap from the gate that was pending |

## 2. Confirm it came up

Success ends with a `✓  Platform ready` panel listing the console URLs and three hints — `adhar get secrets`, `adhar get status`, `adhar down`. Check health at any time:

```bash
adhar get status      # AdharPlatform conditions + core services + per-package health
adhar get apps        # every application's sync and health state
```

`adhar get status` prints an **Overall Status** of `● Healthy`, `▲ Degraded` or `✖ Critical` with a health score out of 100, then sections for core services, cluster resources, platform conditions, packages and access URLs. The five conditions to read are `GatewayReady`, `ArgoCDReady`, `GiteaReady`, `CrossplaneReady`, `GitOpsReady`, plus the aggregate `Ready`.

```bash
adhar get status -o json | jq -r '.OverallStatus'
adhar get apps --include-system        # also show kube-system and friends
```

> During the first few minutes some applications sit at `Progressing` or `Degraded` while databases initialise and images pull. That is normal first-convergence churn, not a failure. Give it three to five minutes before investigating.

## 3. Reach the consoles

Every service is a subdomain of `adhar.localtest.me`, which resolves to `127.0.0.1` from public DNS — no `/etc/hosts` editing, and no DNS setup is possible locally. The certificate is the platform's own self-signed one, so accept the browser warning, or trust the platform CA as shown in [Local (Kind)](/docs/providers/local-kind).

| Service | URL | What it is for |
|---|---|---|
| **Adhar Console** | `https://console.adhar.localtest.me:8443` | Developer portal — catalog, golden paths, scorecards |
| **ArgoCD** | `https://argocd.adhar.localtest.me:8443` | Every package, as a GitOps Application |
| **Gitea** | `https://gitea.adhar.localtest.me:8443` | The platform's source of truth |
| **Keycloak** | `https://keycloak.adhar.localtest.me:8443` | Identity for every other service |
| **Grafana** | `https://grafana.adhar.localtest.me:8443` | Metrics and dashboards |
| **Headlamp** | `https://headlamp.adhar.localtest.me:8443` | A readable Kubernetes UI |
| **Harbor** | `https://harbor.adhar.localtest.me:8443` | Container registry, signed and scanned |

> **The ready panel lists Hubble too, but it is disabled in the local profile.** The panel prints a fixed set of URLs; the local package set is smaller. A URL only works if its package is enabled *and* ships an `HTTPRoute`. The authoritative list for your platform is:

```bash
kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]
```

Every UI trusts the same Keycloak realm (`adhar`), so one sign-in covers the rest. What each tool does is catalogued in [Platform Services](/docs/core-concepts/platform-services).

## 4. Get credentials

Do not scrape secrets out of pods. The CLI reads the platform's labelled credential secrets for you:

```bash
adhar get secrets                 # every credential the CLI knows about
adhar get secrets -p argocd       # only ArgoCD (user: admin)
adhar get secrets -p keycloak     # admin plus the seeded users
```

`-p` accepts `argocd`, `gitea`, `keycloak`, `adhar-console`, `openbao`, `vault`, `postgres`, `redis`, `harbor`, `rustfs`. Any package that labels its credential Secret for the CLI is served here too.

> Gitea's day-0 login is `gitea_admin` / `r8sA8CPHD9!bt6d`. It is a published constant — rotate it before anyone else can reach the platform, and in production enable the `credential-rotation` package.

## 5. Change the platform the GitOps way

Because Git is the source of truth, turning on a package is not a `kubectl apply` — it is an edit to the stack followed by a convergence run. The CLI edits the profile's ApplicationSet file *and* its mirrored environment config (a parity test requires them to agree) and leaves the diff for you to review; nothing is pushed on your behalf.

```bash
adhar stack list                 # the catalogue, with enablement and live state
adhar stack list --problems      # only what is not Synced and Healthy
adhar stack conflicts            # packages that must never both be on
adhar stack enable harbor        # edits the stack
adhar upgrade --diff-only        # preview exactly what would change
adhar upgrade                    # converge
```

> A single Kind node cannot run the full catalogue — the local profile exists precisely because the full set OOM-kills the node. Check `kubectl top nodes` before enabling anything heavy, and check `adhar stack conflicts` first: a few packages claim the same cluster-scoped objects and must not both be enabled. Full workflow in [Customization](/docs/operations/customization).

## 6. If something goes wrong

| Symptom | First move |
|---|---|
| `adhar up` fails immediately | `docker info` — is the engine answering? Port taken? `adhar up --port 9443` |
| Bootstrap stopped part-way (Ctrl-C, sleep, timeout) | Run `adhar up` again — it resumes from the pending gate |
| ArgoCD is up but shows no applications at all | The GitOps phase never finished; re-run `adhar up` |
| A URL returns nothing | `adhar get apps` — the package must be enabled, `Healthy`, and ship an `HTTPRoute` |
| Browser TLS warning | Expected locally; production uses cert-manager certificates |
| Pods `Pending`, node under pressure | Give the engine more RAM, or disable packages you enabled |
| Everything wedged | `adhar up --recreate` — destructive rebuild |

### Why re-running `adhar up` is safe

Every foundation manifest is applied with Server-Side Apply and force-ownership, so re-applying re-adopts the existing objects instead of duplicating them. Each phase is gated on a status flag — satisfied gates short-circuit and the pending one runs — and without `--recreate` the existing healthy node is reused, so repos, data and running apps survive. The exit gate is honest: a run cannot report success while the repos are unseeded or the Gateway is unprogrammed. Deeper failure signatures are in [Troubleshooting](/docs/reference/troubleshooting).

## 7. Tear it down

```bash
adhar down                        # remove the Kind node and Adhar state
adhar down --purge-image-cache    # also drop the cached images
adhar up --recreate               # or destroy and rebuild in one step
```

`adhar down` keeps the image cache volume by default, so the next `adhar up` is the fast kind. The platform is fully reconstructable from the binary plus your config, which makes rebuilding routine rather than a last resort.

## Next steps

You have a platform. The next page puts an application on it and follows the change all the way from a template to a URL.

- **[Your First Service](/docs/getting-started/first-service)** — the full GitOps loop, end to end
- **[Configuration](/docs/getting-started/configuration)** — the config file, for when you move off the laptop
- **[Architecture](/docs/core-concepts/architecture)** — how the bootstrap and control plane actually fit together
- **[CLI Reference](/docs/reference/cli)** — every command and flag
