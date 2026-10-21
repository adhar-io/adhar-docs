---
title: "Local (Kind)"
section: "Cloud Providers"
order: 2
path: "/docs/providers/local-kind"
---

# Local (Kind)

This page runs the entire platform on your laptop in a single **Kind** node. Kind is Kubernetes-in-Docker: each Kubernetes node is a container on your own machine. Use it to learn Adhar, develop against it, demo it, or run it in CI.

> **Status: tested continuously.** This is the only path CI exercises on every push: `make e2e` runs a full `adhar up` → verify → `adhar down` cycle, on both Docker and Podman. On a warm machine, one `adhar up` gets every app to Synced and Healthy in about ten minutes.

This is the default `adhar up` path. It needs **no credentials, no cloud account, no DNS and no bill**.

It is also the honest one. Everything above the cluster is the same code that runs on a cloud: ArgoCD, Gitea, Crossplane, the Gateway, SSO. Only the size of the box differs. The last section covers that difference.

## At a glance

| | |
|---|---|
| **Provider key** | `kind` |
| **Model** | Local containers (Kubernetes-in-Docker) |
| **Credentials** | None |
| **DNS / TLS** | `*.adhar.localtest.me` → `127.0.0.1`; self-signed certificate |
| **Cluster name** | `adhar` (kube-context `kind-adhar`) |
| **Profile** | A curated local core, not the full catalogue — `adhar stack list` shows what is enabled |
| **Preflight** | Skipped — no account, no quota, no permission model |
| **Verification** | Exercised continuously by CI (`make e2e`) |
| **Time to usable** | ~10 min, every app Synced + Healthy (measured, warm image cache) |
| **Cost** | Free |
| **Best for** | Learning Adhar, development, demos, CI |

## What gets built

```diagram
dp-kind-topology
```

Three things run on your machine, all inside your container engine:

1. **One Kind node container** for cluster `adhar`. It acts as both control plane and worker. Kind's default CNI (kindnet) **and kube-proxy** are disabled. Cilium replaces both, exactly as on a cloud.
2. **Nine pull-through registry caches**, one per upstream registry. They sit beside the node on the engine's `kind` network. The node's containerd uses them as `certs.d` mirrors, and falls back to the upstream.
3. **Host port mappings.** HTTPS 8443 and HTTP 8080 on your machine forward into the node, to the Gateway's node ports 30443 and 30080.

Your browser resolves `console.adhar.localtest.me` through **public DNS** to `127.0.0.1`. It lands on port 8443 and reaches the Gateway. You add nothing to `/etc/hosts`.

## Step 1 — Prerequisites checklist

| ✓ | Requirement | Verify |
|---|---|---|
| ☐ | A container engine: Docker 20.10+, Podman 4+, nerdctl, or Finch | `adhar version` shows the engine as `● Available` |
| ☐ | `kubectl` on your PATH | `kubectl version --client` |
| ☐ | ~8 CPU / 16 GiB free for the curated core | Your engine's resource settings |
| ☐ | Room for ~10 GB of images plus the registry cache volume | `docker system df` (or your engine's equivalent) |
| ☐ | DNS egress, with no rebinding protection dropping `127.0.0.1` answers | `dig +short console.adhar.localtest.me` → `127.0.0.1` |
| ☐ | The `adhar` CLI: `brew install adhar-io/tap/adhar`, the install script, or `make build` from a clone | `adhar version` prints a version (a source build is `./adhar` in the repository root) |

### Which engine gets used

Adhar follows Kind's own rule. The engine that **creates** the cluster is always the one that manages it:

1. If `KIND_EXPERIMENTAL_PROVIDER` is set, it wins, even if that engine is not responding. Setting it is a deliberate choice, and a silent substitution would be worse than a clear error.
2. Otherwise, Adhar uses the first engine that is installed and answering, in this order: `docker`, `podman`, `nerdctl`, `finch`, `nerdctl.lima`.

```bash
adhar version                              # reports the engine actually in use
export KIND_EXPERIMENTAL_PROVIDER=podman   # force one
```

That engine is used for the whole lifecycle: creating nodes, running the image cache, and removing leftover containers and the `kind` network on teardown. Earlier versions shelled out to `docker` for those last steps. On a Podman-only machine, the cluster came up, but teardown and image preloading silently did nothing.

### Podman specifics

On macOS and Windows, give the VM enough headroom **before** the first run:

```bash
podman machine init --cpus 6 --memory 12288
podman machine start
```

Rootless Podman works. It needs the usual prerequisites: `/etc/subuid` and `/etc/subgid` entries for your user, and cgroups v2 with the delegation controllers enabled. A rootless user may not be allowed to bind port 8443. If so, use `adhar up --port 9443` rather than loosening system limits.

## Step 2 — Bring it up

No config file is needed. The examples below use `./adhar`, as a source build leaves it. If you installed with Homebrew or the install script, drop the `./`.

```bash
./adhar up
```

`adhar up` shows a live checklist of the nine provisioning stages. Stages 1–3 run in the CLI. Stages 4–9 belong to the in-cluster `AdharPlatform` controller, and they advance as its status changes:

```terminal
$ ./adhar up

Provisioning Adhar platform

  ✓ Kind cluster                   local node · Cilium CNI · ports 8443/8080
  ✓ Platform CRDs                  AdharPlatform · GitRepository · CustomPackage
  ✓ Networking                     CoreDNS rewrite · self-signed TLS
  ✓ Cilium & Gateway               eBPF CNI + Cilium Gateway API
  ✓ ArgoCD                         GitOps engine
  ✓ Gitea                          in-cluster Git server
  ✓ GitOps repos                   seed packages · environments · templates into Gitea
  ✓ Crossplane                     control plane + providers
  ◌ GitOps sync - platform stack   curated platform apps via ArgoCD
```

`◌` means progressing, `✓` ready, `✖` failed. The last stage reports `n/m` apps as ArgoCD drives them to Synced + Healthy. `--apps-timeout` (default 15m) limits how long the CLI waits. Either way, ArgoCD keeps going afterwards.

Useful variations:

```bash
./adhar up --port 9443     # different HTTPS host port (HTTP derives as 9080)
./adhar up --recreate      # delete the existing node and rebuild (destructive)
./adhar up --dry-run       # preview only
./adhar up --verbose       # stream the bootstrap controller logs instead of the checklist
```

### Why the second run is much faster

The curated core pulls roughly 90 images (~10 GB) from public registries. A fresh Kind node has none of them. So `adhar up` runs one small `registry:3.0.0` container per upstream registry as a **pull-through cache**. Each is named `adhar-registry-cache-<host>`, and they all share the engine volume `adhar-registry-cache`.

Mirrored registries: `docker.io`, `quay.io`, `ghcr.io`, `registry.k8s.io`, `xpkg.upbound.io`, `xpkg.crossplane.io`, `reg.kyverno.io`, `docker.gitea.com`, `public.ecr.aws`.

- **First run on a machine**: images come from the internet through the caches, which keep them. Expect normal pull times.
- **Every later run**: images come from local disk at LAN speed. When the upstream is reachable, tags are re-resolved there, so `:latest` stays current. Offline, the cached copy is served.
- **A cache that is down** is skipped. containerd falls back to the upstream, so a cache can never break a pull.
- `adhar down` **stops** the caches and keeps the volume. The next `adhar up` restarts them.

These numbers were measured on one machine (Docker Desktop, 11 CPUs), running `adhar up --recreate` before and after the cache, with a warm cache:

| Stage | Before | After |
|---|---|---|
| Kind cluster create | 3m30s | 37s–1m03s |
| GitOps repos seeded into Gitea | ~60s | 16s |
| Crossplane | 1m38s | 12s |
| Total to "GitOps sync" | > 7 min | 3m24s |
| Every app Synced + Healthy | 18m50s, still only 18 of 31 | **10m13s, all of them** |

The ten-minute figure comes from that last row. The foundation is up in under four minutes, and the curated core syncs in the rest. A first run on a cold cache spends longer pulling.

## Step 3 — Verify and log in

```bash
kubectl config current-context        # kind-adhar
kubectl get nodes                     # one node, Ready
./adhar get status                    # platform conditions + per-package health
./adhar get apps                      # ArgoCD sync / health per application
./adhar get secrets                   # platform credentials
```

Every service is a subdomain of `adhar.localtest.me` on the port you chose:

```text
https://console.adhar.localtest.me:8443
https://argocd.adhar.localtest.me:8443
https://gitea.adhar.localtest.me:8443
```

### Trust the local certificate

The local certificate is the platform's own **self-signed** one, by design. `localtest.me` is not yours to delegate, so no ACME challenge is possible. Expect a browser warning on your first visit. To make your browser and tools trust the certificate, add the platform CA:

```bash
kubectl -n default get secret adhar-cert -o jsonpath='{.data.ca\.crt}' | base64 -d > adhar-ca.crt
# macOS:
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain adhar-ca.crt
```

## Optional: a config file

You only need an explicit config if you want to name things, or keep Kind alongside cloud providers in one file:

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

Adhar reads only those two tool paths from the `kind` provider's `config:` block. Environment names are the platform's tiers: `dev`, `test` and `prod`. The environments' `isolation` setting has no effect locally. A Kind cluster is one cluster by definition.

## Tear down

```bash
./adhar down                       # remove the Kind node and Adhar state; keep the image cache
./adhar down --purge-image-cache   # also remove the cache containers + volume
./adhar down --force               # skip the confirmation prompt
```

**Verify:** `kind get clusters` no longer lists `adhar`, and `docker ps -a --filter name=adhar-registry-cache` shows the caches stopped (or gone with `--purge-image-cache`).

`adhar down` with no `--file` only ever looks at Kind. That is correct here. It is also why you must tear down a cloud environment with `--file config.yaml --env <name>`. Without it, the command inspects your laptop and reports success, having deleted nothing in the cloud.

## How a local run differs from a cloud run

| | Kind | Cloud |
|---|---|---|
| Packages enabled | A curated local-safe core | The full production set (76 on the verified DigitalOcean run) |
| TLS | Self-signed platform certificate | Let's Encrypt wildcard via DNS-01 |
| Ingress | Host ports 8443/8080 mapped to node ports 30443/30080 | Cloud load balancer from the in-cluster CCM |
| Storage | Kind's local-path provisioner | `adhar-local` default, `adhar-block` via CSI |
| Autoscaling | Not applicable | Adds and removes real machines (compute mode) |
| Preflight | Skipped | Credentials, quota, instance availability |
| Image cache | Per-registry pull-through cache on the host | Node-prep pre-pull of the Cilium images during `kubeadm join` |
| Time to usable | ~10 min (warm cache) | ~13 min on DigitalOcean; unmeasured or longer elsewhere |

The curated core exists because the full catalogue does not fit on one Kind node. It wants far more PersistentVolumes and memory than a laptop has. Some packages stay wired but disabled: production delivery, CI infrastructure and the heavy JVM services (Kafka, Nexus, Dapr, the Loki/Tempo/Mimir pipelines, preview environments).

You can enable extra packages locally. It is also the usual cause of a Kind cluster that never converges. Check `kubectl top nodes` before and after, and see [Customization](/docs/operations/customization).

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `adhar up` fails binding port 8443 | Another process holds it, or rootless Podman may not bind it | `adhar up --port 9443` (HTTP derives as 9080) |
| `adhar version` shows the engine `✖ Not found` | The daemon or Podman machine is not answering | Start Docker Desktop, or `podman machine start` |
| Cluster comes up but teardown leaves containers behind | An older build shelled out to `docker` on a Podman-only machine | Use a current build; confirm the engine with `adhar version` |
| `*.adhar.localtest.me` does not resolve | No DNS egress, or DNS-rebinding protection dropping `127.0.0.1` answers | Allow the resolver, or use one that returns loopback answers |
| Browser warns about the certificate | The local cert is self-signed and always will be | Trust the platform CA (above), or accept the warning |
| Apps never reach Healthy; node pegged | Extra packages enabled beyond the curated core | Disable them again, or move to a cloud provider |
| First run is slow, later runs are not faster | `--purge-image-cache` was used, or the cache volume was removed | Leave the cache volume in place between runs |
| `KIND_EXPERIMENTAL_PROVIDER` set to an engine that is not running | The override is honoured deliberately, so you get an error not a substitution | Unset it, or start that engine |

## Next steps

- [Quick Start](/docs/getting-started/quick-start) — the guided first run on this provider
- [Your First Service](/docs/getting-started/first-service) — deploy something onto it
- [Providers Overview](/docs/providers/overview) — the provider model, and picking a cloud
- [DigitalOcean](/docs/providers/digitalocean) — the verified path off your laptop
