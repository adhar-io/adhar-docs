---
title: "Local (Kind)"
section: "Cloud Providers"
order: 2
path: "/docs/providers/local-kind"
---

# Local (Kind)

Run the entire platform on your laptop in a single Kind (Kubernetes-in-Docker) node. This is the default `adhar up` path, exercised continuously by CI, and the fastest way to learn Adhar.

## At a glance

| | |
|---|---|
| **Provider key** | `kind` |
| **Model** | Local containers (Kubernetes-in-Docker) |
| **Credentials** | None |
| **DNS / TLS** | `*.adhar.localtest.me` → `127.0.0.1`; self-signed cert |
| **Profile** | Curated local core (~32 packages) |
| **Verification** | ✅ Exercised continuously by CI |
| **Cost** | Free |
| **Best for** | Learning Adhar, development, demos, CI |

## Prerequisites

| Requirement | Notes |
|---|---|
| Container engine | Docker 20.10+, Podman 4+, nerdctl, or Finch |
| kubectl | On your PATH |
| Resources | ~8 CPU / 16 GiB free (the curated local profile runs 32 apps) |

Engine selection: `KIND_EXPERIMENTAL_PROVIDER` wins if set, otherwise the first of `docker, podman, nerdctl, finch` that responds. On macOS/Windows with Podman, give the machine enough resources first:

```bash
podman machine init --cpus 6 --memory 12288
podman machine start
```

## Provision

No config file is needed — `adhar up` does everything:

```bash
adhar up                 # create the platform
adhar up --port 9443     # different HTTPS host port (HTTP derives as 9080)
adhar up --recreate      # delete the existing node and rebuild (destructive)
adhar up --dry-run       # preview only
```

You can supply an explicit config if you want to name things, but it's optional:

```yaml
environments:
  local:
    provider: kind
    name: adhar-local
    type: development
```

## Access

Every service is a subdomain of `adhar.localtest.me`, which resolves to `127.0.0.1`:

```text
https://console.adhar.localtest.me:8443
https://argocd.adhar.localtest.me:8443
https://gitea.adhar.localtest.me:8443
```

```bash
adhar get secrets           # platform credentials
adhar get status            # health
```

The local TLS certificate is self-signed. To make your browser and tools trust it, add the platform CA:

```bash
kubectl -n default get secret adhar-cert -o jsonpath='{.data.ca\.crt}' | base64 -d > adhar-ca.crt
# macOS:
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain adhar-ca.crt
```

## Tear down

```bash
adhar down                       # remove the Kind node and Adhar state
adhar down --purge-image-cache   # also remove the registry cache container + volume
```

## Notes & gotchas

- The local profile enables a **curated ~32 packages**, not the full catalogue — the full set doesn't fit one Kind node. See [Customization](/docs/operations/customization) to enable more (watch `kubectl top nodes` first).
- No DNS setup is possible or required locally.
- Rootless Podman may not bind `8443` — use `adhar up --port 9443`.
- `adhar down` with no `--file` only ever touches Kind, never a cloud.
- A local pull-through registry cache (`adhar-registry-cache-*`) speeds up later runs.

Ready for a real cluster? See the [Providers Overview](/docs/providers/overview) and pick a cloud.
