---
title: "Quick Start"
section: "Getting Started"
order: 3
path: "/docs/getting-started/quick-start"
---

# Quick Start

By the end of this page you'll have a complete Internal Developer Platform running on your laptop — GitOps, identity, CI, a container registry, observability, and a developer portal — and you'll understand what's running and how to change it. It takes about **10 minutes**, most of it waiting for images to pull.

Make sure you've completed [Installation](/docs/getting-started/installation) first (a container engine and the `adhar` CLI).

## 1. Start the platform

```bash
adhar up
```

Progress streams to your terminal. When the success banner appears, the platform has converged and is ready to use.

### What `adhar up` actually does

Adhar bootstraps **imperatively** to lay a foundation, then hands off to **GitOps** to run everything else. The sequence is strictly ordered, idempotent, and resumable:

```text
adhar up
   │
   ├─ 1. Create the Kind node          (default CNI + kube-proxy disabled;
   │                                     host ports 8443/8080 → the Gateway)
   ├─ 2. Install Adhar CRDs + controller
   ├─ 3. Foundation (embedded manifests, no network fetch):
   │        Gateway API CRDs ─▶ Cilium ─▶ Cilium Gateway ─▶ ArgoCD ─▶ Gitea ─▶ Crossplane
   ├─ 4. Seed Git: create & fill the in-cluster repos under the `adhar` org
   │        packages · environments · templates
   ├─ 5. Apply the ArgoCD ApplicationSet  (94 entries / 91 packages; 32 enabled locally)
   ├─ 6. ArgoCD syncs every enabled package from Git   ◀── GitOps takes over here
   └─ 7. Platform Ready ─▶ the local controller exits
```

The key idea: after step 4, **Git is the source of truth**. ArgoCD continuously reconciles the cluster to match Git with self-heal on, so a manual `kubectl edit` on a managed object is reverted within a minute. To learn the full model, see [Architecture](/docs/core-concepts/architecture).

### Useful variants

| Command | Effect |
|---|---|
| `adhar up --port 9443` | Use a different HTTPS host port (HTTP auto-derives as port − 363, here `9080`) |
| `adhar up --recreate` | **Destructive** — delete the existing Kind node and rebuild from scratch |
| `adhar up --dry-run` | Preview what would happen without creating anything |
| `adhar up --kube-version v1.36.0` | Pin a specific Kubernetes version |
| `adhar up --dev-password` | Set the ArgoCD and Gitea admin passwords to `developer` (local convenience) |
| `adhar up --ha` | Render the foundation in HA mode (more realistic, heavier) |
| `adhar up` (again) | **Safe** — resumes an interrupted bootstrap from the pending gate (see below) |

## 2. Tour the consoles

Every service is a subdomain of `adhar.localtest.me`, which resolves to `127.0.0.1` — no `/etc/hosts` edits needed. The local TLS certificate is self-signed, so accept the browser warning (or trust the platform CA, shown in [Local (Kind)](/docs/providers/local-kind)).

| Service | URL | What it's for |
|---|---|---|
| **Adhar Console** | `https://console.adhar.localtest.me:8443` | The developer portal — catalog, golden paths, scorecards, cloud shell |
| **ArgoCD** | `https://argocd.adhar.localtest.me:8443` | Every deployed package, as a GitOps Application |
| **Gitea** | `https://gitea.adhar.localtest.me:8443` | The platform's source of truth (the three repos) |
| **Keycloak** | `https://keycloak.adhar.localtest.me:8443` | Identity for every other service |
| **Grafana** | `https://grafana.adhar.localtest.me:8443` | Metrics, logs (Loki), traces (Tempo), cost |
| **Headlamp** | `https://headlamp.adhar.localtest.me:8443` | A friendly Kubernetes UI |
| **Harbor** | `https://harbor.adhar.localtest.me:8443` | Container registry (signed + scanned images) |
| **Hubble** | `https://hubble.adhar.localtest.me:8443` | Live network flows |

The complete list for *your* platform is whatever ships an `HTTPRoute`:

```bash
kubectl get httproute -A -o custom-columns=NAME:.metadata.name,HOST:.spec.hostnames[*]
```

Every UI trusts the same **Keycloak realm** (`adhar`) — sign in once and the rest follow via SSO. Browse the full catalog on the [Integrations explorer](/integrations) and read what each tool does in [Platform Services](/docs/core-concepts/platform-services).

## 3. Get credentials

Never scrape secrets out of pods — the CLI reads the platform's labelled credential secrets for you:

```bash
adhar get secrets                 # every service credential the CLI knows about
adhar get secrets -p argocd       # just ArgoCD (user: admin)
adhar get secrets -p keycloak     # admin + first user
```

`-p` accepts `argocd`, `gitea`, `keycloak`, `adhar-console`, `vault`, `postgres`, `redis`, `harbor`, `rustfs`.

> Gitea's day-0 default login is `gitea_admin` / `r8sA8CPHD9!bt6d`. It's well-known — rotate it before anyone else can reach the platform (in production, enable the `credential-rotation` package).

## 4. Check platform health

```bash
adhar get status      # AdharPlatform conditions + per-package health
adhar get apps        # ArgoCD application sync/health states
```

`adhar get status` shows the foundation conditions (`GatewayReady`, `ArgoCDReady`, `GiteaReady`, `CrossplaneReady`, `GitOpsReady`) plus an aggregate. `adhar get apps` lists your platform packages and your own workloads. During the first few minutes some apps show `Progressing` or `Degraded` while databases initialize and images pull — that's normal; give it 3–5 minutes.

Both commands support `-o json` / `-o yaml` for scripting:

```bash
adhar get status -o json | jq -r '.OverallStatus'
```

## 5. Deploy your first service

The quickest real deployment uses a template from the Gitea `templates` repo:

```bash
adhar application deploy hello --template microservice --namespace hello
adhar application status hello
```

Once healthy, it's live at `https://hello.adhar.localtest.me:8443`. There are four deployment paths (template, existing repo, build-from-source, and Console golden paths), plus backing services and per-PR previews — all covered in [Your First Service](/docs/getting-started/first-service).

## 6. Make a change the GitOps way

Because Git is the source of truth, "changing the platform" means editing the stack and running `adhar upgrade` — not `kubectl apply`. To turn on another package (62 of the 94 wired entries are off locally):

```bash
adhar stack list             # see the catalogue: enabled or not
adhar stack enable harbor    # edit the stack (in Git)
adhar upgrade --diff-only    # preview exactly what will change
adhar upgrade                # converge: re-apply the ApplicationSet, re-push the stack
```

ArgoCD picks up the change and deploys it; when it reports `Healthy` it's live. A single Kind node can't run everything — check `kubectl top nodes` before enabling anything heavy. Full details in [Customization](/docs/operations/customization).

## 7. If something goes wrong

| Symptom | First thing to try |
|---|---|
| `adhar up` fails immediately | `docker ps` — is the engine running? Port taken? `adhar up --port 9443` |
| Bootstrap stopped part-way (Ctrl-C, sleep, timeout) | Run `adhar up` again — it **resumes** from the pending gate |
| A URL doesn't load | `adhar get apps` — the app must be `Healthy` and ship an `HTTPRoute` |
| Browser TLS warning | Expected locally (self-signed); production uses cert-manager |
| Pods `Pending`, node under pressure | Give Docker more RAM, or disable packages you enabled |
| Everything wedged | `adhar up --recreate` (destructive rebuild) |

Deeper failure signatures are in [Troubleshooting](/docs/reference/troubleshooting).

### Why re-running `adhar up` is safe

Bootstrap is idempotent and status-gated. The local controller is ephemeral — it exits once the platform converges — so if a run is interrupted, nothing is left retrying in the background. Re-running `adhar up` (without `--recreate`) reuses the existing node and resumes from whichever gate was pending. Reach for `--recreate` only when you want a clean rebuild.

## 8. Tear it down

```bash
adhar down              # remove the local Kind node and Adhar state
adhar up --recreate     # or: destroy and rebuild in one step
```

The platform is fully reconstructable from the binary plus your config, so rebuilding is routine, not a last resort.

## Where to go next

| You want to… | Read |
|---|---|
| Deploy your own app (all four paths) | [Your First Service](/docs/getting-started/first-service) |
| Change what the platform ships | [Configuration](/docs/getting-started/configuration) · [Customization](/docs/operations/customization) |
| Understand how it works | [Architecture](/docs/core-concepts/architecture) · [Control Plane](/docs/core-concepts/control-plane) |
| Run it on a cloud | [Cloud Providers](/docs/providers/overview) |
| Look up a command | [CLI Reference](/docs/reference/cli) |
