---
title: "Local (Kind)"
section: "Cloud Providers"
order: 2
path: "/docs/providers/local-kind"
---

# Local (Kind)

Run the whole platform on your laptop in a single **Kind** node. Kind is Kubernetes-in-Docker: each Kubernetes node is a container on your machine. This is the default `adhar up` path, and it needs no credentials, cloud account, DNS setup or bill. Use it to learn Adhar, develop against it, demo it, or run it in CI.

Everything above the cluster is the same code that runs on a cloud: ArgoCD, Gitea, Crossplane, the Gateway and SSO. Only the size of the box differs.

## At a glance

| | |
|---|---|
| **Provider key** | `kind` |
| **Status** | `status:complete` |
| **Model** | Local containers (Kubernetes-in-Docker) |
| **Credentials** | None |
| **DNS / TLS** | `*.adhar.localtest.me` → `127.0.0.1`; self-signed certificate |
| **Cluster name** | `adhar` (kube-context `kind-adhar`) |
| **Profile** | A curated local core, not the full catalogue — `adhar stack list` shows what is enabled |
| **Preflight** | Skipped — no account, quota or permission model |
| **Cost** | Free |
| **Best for** | Learning Adhar, development, demos, CI |

## Topology

```diagram
dp-kind-topology
```

Three things run on your machine, all inside your container engine:

1. **One Kind node container** for cluster `adhar`. It is both control plane and worker. Kind's default CNI (kindnet) and kube-proxy are disabled; Cilium replaces both, as on a cloud.
2. **Nine pull-through registry caches**, one per upstream registry, beside the node on the engine's `kind` network.
3. **Host port mappings.** HTTPS 8443 and HTTP 8080 on your machine forward to the Gateway's node ports 30443 and 30080.

Your browser resolves `console.adhar.localtest.me` through **public DNS** to `127.0.0.1`, lands on port 8443 and reaches the Gateway. You add nothing to `/etc/hosts`.

## Prerequisites

| Requirement | Check |
|---|---|
| A container engine: Docker 20.10+, Podman 4+, nerdctl, or Finch | `adhar version` shows the engine as `● Available` |
| `kubectl` on your PATH | `kubectl version --client` |
| About 8 CPU / 16 GiB free for the curated core | Your engine's resource settings |
| Room for about 10 GB of images plus the registry cache volume | `docker system df` (or your engine's equivalent) |
| DNS egress, with no rebinding protection dropping `127.0.0.1` answers | `dig +short console.adhar.localtest.me` → `127.0.0.1` |
| The `adhar` CLI: `brew install adhar-io/tap/adhar`, the install script, or `make build` from a clone | `adhar version` prints a version |

### Container engine

Adhar follows Kind's own rule: the engine that **creates** the cluster is the one that manages it.

1. If `KIND_EXPERIMENTAL_PROVIDER` is set, it wins, even if that engine is not responding. You get a clear error instead of a silent substitution.
2. Otherwise, Adhar uses the first engine that is installed and answering, in this order: `docker`, `podman`, `nerdctl`, `finch`, `nerdctl.lima`.

```bash
adhar version                              # reports the engine in use
export KIND_EXPERIMENTAL_PROVIDER=podman   # force one
```

That engine is used for the whole lifecycle: creating nodes, running the image cache, and removing leftover containers and the `kind` network on teardown.

### Podman

On macOS and Windows, give the VM enough headroom **before** the first run:

```bash
podman machine init --cpus 6 --memory 12288
podman machine start
```

Rootless Podman works. It needs `/etc/subuid` and `/etc/subgid` entries for your user, and cgroups v2 with the delegation controllers enabled. If a rootless user may not bind port 8443, use `adhar up --port 9443` instead of loosening system limits.

## Configure

No config file is needed. Write one only to keep Kind alongside cloud providers in the same file:

```yaml
environments:
  dev:
    provider: kind
    type: non-production      # `production` or `non-production`

providers:
  kind:
    type: kind
    region: local
    primary: false            # a cloud provider in the same file keeps `primary`
    config:
      kindPath: kind          # only needed when the binaries
      kubectlPath: kubectl    # are not on PATH
```

Adhar reads only those two tool paths from the `kind` provider's `config:` block. `isolation` has no effect locally: a Kind cluster is one cluster by definition.

## Deploy

```bash
adhar up
```

`adhar up` shows a live checklist of nine stages. The CLI runs stages 1–3. The in-cluster `AdharPlatform` controller drives stages 4–9:

```terminal
$ adhar up

  Provisioning Adhar platform
  ✓  Kind cluster
  ✓  Platform CRDs
  ✓  Networking
  ✓  Cilium & Gateway
  ✓  ArgoCD
  ✓  Gitea
  ✓  GitOps repos
  ✓  Crossplane
  ⠋  GitOps sync - platform stack  9/20 apps Synced + Healthy
```

A spinner marks the running stage, `✓` a finished one, `○` one still waiting, and `✖` a failure. The last stage reports `n/m` apps as ArgoCD drives them to Synced + Healthy. `--apps-timeout` (default 15m) limits how long the CLI waits; ArgoCD keeps converging after the CLI returns.

Useful flags:

| Flag | Effect |
|---|---|
| `--port 9443` | Use a different HTTPS host port (HTTP derives as 9080) |
| `--recreate` | Delete the existing node and rebuild (destructive) |
| `--dry-run` | Preview only |
| `--verbose` | Stream the bootstrap controller logs instead of the checklist |

### The image cache

The curated core pulls roughly 90 images (about 10 GB) from public registries, and a fresh Kind node has none of them. So `adhar up` runs one small `registry:3.0.0` container per upstream registry as a **pull-through cache**. Each is named `adhar-registry-cache-<host>`, and all share the engine volume `adhar-registry-cache`.

```diagram
npa-kind-image-cache
```

Mirrored registries: `docker.io`, `quay.io`, `ghcr.io`, `registry.k8s.io`, `xpkg.upbound.io`, `xpkg.crossplane.io`, `reg.kyverno.io`, `docker.gitea.com`, `public.ecr.aws`.

- **First run on a machine:** images come from the internet through the caches, which keep them.
- **Later runs:** images come from local disk. When the upstream is reachable, tags are re-resolved there, so `:latest` stays current. Offline, the cached copy is served.
- **Teardown:** `adhar down` stops the caches and keeps the volume. The next `adhar up` restarts them.

## Verify

```bash
kubectl config current-context        # kind-adhar
kubectl get nodes                     # one node, Ready
adhar get status                    # platform conditions + per-package health
adhar get apps                      # ArgoCD sync / health per application
```

## Access

Every service is a subdomain of `adhar.localtest.me` on the port you chose:

```text
https://console.adhar.localtest.me:8443
https://argocd.adhar.localtest.me:8443
https://gitea.adhar.localtest.me:8443
```

Get the platform credentials with:

```bash
adhar get secrets
```

The local certificate is the platform's own **self-signed** one. `localtest.me` is not yours to delegate, so no ACME challenge is possible, and your browser warns on the first visit. To trust the certificate, add the platform CA:

```bash
kubectl -n default get secret adhar-cert -o jsonpath='{.data.ca\.crt}' | base64 -d > adhar-ca.crt
# macOS:
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain adhar-ca.crt
```

## Operate

### Scale

A Kind cluster is one node. There are no workers to add and no autoscaler. Capacity is whatever your container engine allows.

The curated core exists because the full catalogue does not fit on one Kind node: it wants far more PersistentVolumes and memory than a laptop has. Some packages stay wired but disabled: production delivery, CI infrastructure and the heavy JVM services (Kafka, Nexus, Dapr, the Loki/Tempo/Mimir pipelines, preview environments).

You can enable extra packages locally, but doing so is the usual cause of a Kind cluster that never converges. Check `kubectl top nodes` before and after, and see [Customization](/docs/operations/customization).

### Upgrade

Upgrade the platform in place, on the `kind-adhar` context:

```bash
adhar upgrade --diff-only   # preview the stack diff; change nothing
adhar upgrade               # converge the foundation, then sync the stack
```

For a clean rebuild instead, run `adhar up --recreate`. It deletes the existing node. The image cache survives, so images are served from local disk.

### Tear down

```bash
adhar down                       # remove the Kind node and Adhar state; keep the image cache
adhar down --purge-image-cache   # also remove the cache containers + volume
adhar down --force               # skip the confirmation prompt
```

**Check:** `kind get clusters` no longer lists `adhar`, and `docker ps -a --filter name=adhar-registry-cache` shows the caches stopped (or gone with `--purge-image-cache`).

> **Note:** `adhar down` with no `--file` only looks at Kind. To tear down a cloud environment, pass `--file config.yaml --env <name>`.

### How a local run differs from a cloud run

| | Kind | Cloud |
|---|---|---|
| Packages enabled | A curated local-safe core | The full production set |
| TLS | Self-signed platform certificate | Let's Encrypt wildcard via DNS-01 |
| Ingress | Host ports 8443/8080 mapped to node ports 30443/30080 | Cloud load balancer from the in-cluster CCM |
| Storage | Kind's local-path provisioner | `adhar-local` default, `adhar-block` via CSI |
| Autoscaling | Not applicable | Adds and removes real machines (compute mode) |
| Preflight | Skipped | Credentials, quota, instance availability |
| Image cache | Per-registry pull-through cache on the host | Node prep pre-pulls the Cilium images |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `adhar up` fails binding port 8443 | Another process holds it, or rootless Podman may not bind it | `adhar up --port 9443` (HTTP derives as 9080) |
| `adhar version` shows the engine `✖ Not found` | The daemon or Podman machine is not answering | Start Docker Desktop, or `podman machine start` |
| `KIND_EXPERIMENTAL_PROVIDER` names an engine that is not running | The override is always honoured, so you get an error, not a substitution | Unset it, or start that engine |
| `*.adhar.localtest.me` does not resolve | No DNS egress, or DNS-rebinding protection dropping `127.0.0.1` answers | Allow the resolver, or use one that returns loopback answers |
| Browser warns about the certificate | The local certificate is self-signed | Trust the platform CA (see [Access](#access)), or accept the warning |
| Apps never reach Healthy; node pegged | Extra packages enabled beyond the curated core | Disable them again, or move to a cloud provider |
| Every run pulls all images again | `--purge-image-cache` was used, or the cache volume was removed | Leave the cache volume in place between runs |

## Next steps

- [Quick Start](/docs/getting-started/quick-start) — the guided first run on this provider
- [Your First Service](/docs/getting-started/first-service) — deploy something onto it
- [Providers Overview](/docs/providers/overview) — the provider model, and picking a cloud
- [DigitalOcean](/docs/providers/digitalocean) — move off your laptop
