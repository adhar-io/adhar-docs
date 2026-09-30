---
title: "Local (Kind)"
section: "Cloud Providers"
order: 2
path: "/docs/providers/local-kind"
---

# Local (Kind)

Run the entire platform on your laptop in a single **Kind** node — Kubernetes-in-Docker, where each Kubernetes node is a container on your own machine. This is the default `adhar up` path, the only one exercised continuously by CI, and the fastest way to learn Adhar: **no credentials, no cloud account, no DNS, no bill.**

It is also the honest one. Everything above the cluster — ArgoCD, Gitea, Crossplane, the Gateway, SSO — is the same code that runs on a cloud. What differs is the size of the box it runs in, and that difference is the subject of this page.

## At a glance

| | |
|---|---|
| **Provider key** | `kind` |
| **Model** | Local containers (Kubernetes-in-Docker) |
| **Credentials** | None |
| **DNS / TLS** | `*.adhar.localtest.me` → `127.0.0.1`; self-signed cert |
| **Cluster name** | `adhar` |
| **Profile** | Curated local core (~32 packages, not the full catalogue) |
| **Preflight** | Skipped — no account, no quota, no permission model |
| **Verification** | Exercised continuously by CI (`make e2e`) |
| **Cost** | Free |
| **Best for** | Learning Adhar, development, demos, CI |

## Prerequisites

| Requirement | Notes |
|---|---|
| Container engine | Docker 20.10+, Podman 4+, nerdctl, or Finch |
| kubectl | On your PATH |
| Resources | ~8 CPU / 16 GiB free (the curated local profile runs 32 apps) |
| Disk | Room for ~10 GB of images plus the registry cache volume |

### Which engine gets used

Adhar follows Kind's own rule, so the engine that **creates** the cluster is always the one that manages it:

1. `KIND_EXPERIMENTAL_PROVIDER`, if set, wins — even if that engine is not responding. Overriding it is deliberate, and a silent substitution would be worse than a clear error.
2. Otherwise the first engine installed and answering, in the order `docker`, `podman`, `nerdctl`, `finch`, `nerdctl.lima`.

```bash
adhar version                              # reports the engine actually in use
export KIND_EXPERIMENTAL_PROVIDER=podman   # force one
```

The engine is used for the whole lifecycle: creating nodes, running the image cache, removing leftover containers and the `kind` network on teardown. Earlier versions shelled out to `docker` for those last steps, so on a Podman-only machine the cluster came up and then teardown and image preloading silently did nothing.

### Podman specifics

On macOS and Windows, give the VM enough headroom **before** the first run:

```bash
podman machine init --cpus 6 --memory 12288
podman machine start
```

Rootless Podman works, and needs the usual prerequisites: `/etc/subuid` and `/etc/subgid` entries for your user, and cgroups v2 with the delegation controllers enabled. A rootless user may not be allowed to bind port 8443 — use `adhar up --port 9443` rather than loosening system limits.

## The local image cache — why the second run is much faster

The curated core pulls roughly 90 images (~10 GB) from nine public registries, and a fresh Kind node has none of them. `adhar up` therefore runs one small `registry:3.0.0` container per upstream registry — named `adhar-registry-cache-<host>`, all sharing the engine volume `adhar-registry-cache` — on the `kind` network as a **pull-through cache**, and points the node's containerd at them through `certs.d` mirrors with the upstream as fallback.

Mirrored registries: `docker.io`, `quay.io`, `ghcr.io`, `registry.k8s.io`, `xpkg.upbound.io`, `xpkg.crossplane.io`, `reg.kyverno.io`, `docker.gitea.com`, `public.ecr.aws`.

- **First run on a machine**: images come from the internet through the caches, which keep them. Expect normal pull times.
- **Every later run**: images come from local disk at LAN speed.
- **A cache that is down** is skipped by containerd, which falls back to the upstream server. It can never break a pull.
- `adhar down` **stops** the caches and keeps the volume; the next `adhar up` restarts them.

Measured on one machine (Docker Desktop, 11 CPUs), `adhar up --recreate` before and after, warm cache:

| Stage | Before | After |
|---|---|---|
| Kind cluster create | 3m30s | 37s–1m03s |
| GitOps repos seeded into Gitea | ~60s | 16s |
| Crossplane | 1m38s | 12s |
| Total to "GitOps sync" | > 7 min | 3m24s |
| Every app Synced + Healthy | 18m50s, still only 18 of 31 | **10m13s, all of them** |

## Provision

No config file is needed — `adhar up` does everything:

```bash
adhar up                 # create the platform
adhar up --port 9443     # different HTTPS host port (HTTP derives as 9080)
adhar up --recreate      # delete the existing node and rebuild (destructive)
adhar up --dry-run       # preview only
adhar up --verbose       # stream the bootstrap controller logs
```

That creates a Kind cluster named `adhar` with host ports 8080 and 8443 mapped to the Gateway node ports, disables Kind's default CNI **and kube-proxy** (Cilium replaces both, exactly as on a cloud), and seeds the GitOps stack from `platform/stack`.

### What you should see

`adhar up` renders a live checklist of the nine real provisioning stages. Steps 1–3 run in the CLI; stages 4–9 are owned by the `AdharPlatform` controller and advance as its status changes:

```text
Provisioning Adhar platform
  ✓ Kind cluster              local node · Cilium CNI · ports 8443/8080
  ✓ Platform CRDs             AdharPlatform · GitRepository · CustomPackage
  ✓ Networking                CoreDNS rewrite · self-signed TLS
  ✓ Cilium & Gateway          eBPF CNI + Cilium Gateway API
  ✓ ArgoCD                    GitOps engine
  ✓ Gitea                     in-cluster Git server
  ✓ GitOps repos              seed packages · environments · templates
  ✓ Crossplane                control plane + providers
  ◌ GitOps sync - platform stack   curated platform apps via ArgoCD
```

`◌` means progressing, `✓` ready, `✖` failed. The last stage reports `n/m` apps as ArgoCD drives them to Synced + Healthy; `--apps-timeout` bounds how long the CLI waits, and ArgoCD keeps going afterwards either way.

An explicit config is optional, and only useful if you want to name things or keep Kind alongside cloud providers in one file:

```yaml
environments:
  local:
    provider: kind
    name: adhar-local
    type: development

providers:
  kind:
    type: kind
    region: local
    primary: false
    config:
      kindPath: kind          # only needed when the binaries
      kubectlPath: kubectl    # are not on PATH
```

Only those two tool paths are read from the `kind` provider's `config:` block.

## Access

Every service is a subdomain of `adhar.localtest.me`, which resolves to `127.0.0.1` from **public DNS** — nothing goes in `/etc/hosts`:

```text
https://console.adhar.localtest.me:8443
https://argocd.adhar.localtest.me:8443
https://gitea.adhar.localtest.me:8443
```

```bash
adhar get secrets           # platform credentials
adhar get status            # per-package health
```

Because `localtest.me` resolves through public DNS, a machine with no DNS egress — or with DNS-rebinding protection that drops answers pointing at `127.0.0.1` — will fail to resolve it. That is the one network dependency of a "local" run.

### TLS

The local certificate is the platform's own **self-signed** one, by design: `localtest.me` is not yours to delegate, so no ACME challenge is possible. The browser warning on first visit is expected. To make your browser and tools trust it, add the platform CA:

```bash
kubectl -n default get secret adhar-cert -o jsonpath='{.data.ca\.crt}' | base64 -d > adhar-ca.crt
# macOS:
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain adhar-ca.crt
```

## Tear down

```bash
adhar down                       # remove the Kind node and Adhar state
adhar down --purge-image-cache   # also remove the registry cache containers + volume
adhar down --force               # skip the confirmation prompt
```

`adhar down` with no `--file` only ever looks at Kind. That is correct here, and it is exactly why a cloud environment must be torn down with `--file config.yaml --env <name>` — otherwise the command inspects your laptop and reports success having deleted nothing in the cloud.

## How a local run differs from a cloud run

| | Kind | Cloud |
|---|---|---|
| Packages enabled | ~32 (curated local-safe core) | 76 (full production set) |
| TLS | Self-signed platform certificate | Let's Encrypt wildcard via DNS-01 |
| Ingress | Host ports mapped to node ports 30080/30443 | Cloud load balancer |
| Storage | Kind's local-path provisioner | `adhar-local` default, `adhar-block` via CSI |
| Autoscaling | Not applicable | Adds and removes real machines |
| Preflight | Skipped | Credentials, quota, instance availability |
| Image cache | Per-registry pull-through cache on the host | Node-prep pre-pull during `kubeadm join` |

The curated core exists because the full catalogue does not fit on one Kind node — it wants far more PersistentVolumes and memory than a laptop has. Production delivery, CI infrastructure and the heavy JVM services (Kafka, Nexus, Dapr, the Loki/Tempo/Mimir pipelines, preview environments) stay wired but disabled.

Enabling extra packages locally is possible and is the usual cause of a Kind cluster that never converges. Check `kubectl top nodes` before and after, and see [Customization](/docs/operations/customization).

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `adhar up` fails binding port 8443 | Another process holds it, or rootless Podman may not bind privileged-adjacent ports | `adhar up --port 9443` (HTTP derives as 9080) |
| Cluster comes up but teardown leaves containers behind | An older build shelled out to `docker` on a Podman-only machine | Use a current build; confirm the engine with `adhar version` |
| `*.adhar.localtest.me` does not resolve | No DNS egress, or DNS-rebinding protection dropping `127.0.0.1` answers | Allow the resolver, or use a resolver that returns loopback answers |
| Browser warns about the certificate | The local cert is self-signed and always will be | Trust the platform CA (above), or accept the warning |
| Apps never reach Healthy; nodes pegged | Extra packages enabled beyond the curated core | Disable them again, or move to a cloud provider |
| First run is slow, later runs are not faster | `--purge-image-cache` was used, or the cache volume was removed | Leave the cache volume in place between runs |
| `KIND_EXPERIMENTAL_PROVIDER` set to an engine that is not running | The override is honoured deliberately, so you get an error not a substitution | Unset it, or start that engine |

## Next steps

- [Quick Start](/docs/getting-started/quick-start) — the guided first run on this provider
- [Your First Service](/docs/getting-started/first-service) — deploy something onto it
- [Providers Overview](/docs/providers/overview) — the provider model, and picking a cloud
- [DigitalOcean](/docs/providers/digitalocean) — the verified path off your laptop
