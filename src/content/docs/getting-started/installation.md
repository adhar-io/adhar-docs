---
title: "Installation"
section: "Getting Started"
order: 2
path: "/docs/getting-started/installation"
---

# Installation

This guide gets the Adhar CLI onto your machine and confirms your environment can run a platform. The CLI is the single tool you need — it creates and drives the cluster for you, so you don't have to pre-install or configure Kubernetes yourself.

There are two things to prepare:

1. A **container engine** (for a local platform) or **cloud credentials** (for a cloud platform).
2. The **`adhar` CLI**.

## System requirements

For a **local** platform on Kind, the curated local profile runs ~32 applications, so give your machine room:

| Resource | Minimum | Recommended | Why |
|---|---|---|---|
| **Docker** (or Podman/nerdctl/Finch) | v20.10+ | latest | Runs the Kind node |
| **RAM** | 8 GB | 16 GB | 32 apps + your workloads |
| **CPU** | 4 cores | 6–8 cores | Bootstrap and reconciliation |
| **Disk** | 20 GB free | 40 GB+ | Container images and volumes |
| **kubectl** | v1.24+ | latest | Not required to bootstrap, but you'll want it |

> **Give Docker enough memory.** On Docker Desktop, raise the memory limit to at least 8 GB (Settings → Resources). An under-provisioned engine is the most common cause of pods stuck `Pending`.

Adhar provisions Kubernetes **v1.37.0** by default. Override it for any provider with `adhar up --kube-version <version>`.

For a **cloud** platform (AWS, GCP, Azure, DigitalOcean, Civo, or your own hosts), the requirements are per-provider — accounts, credentials, quota, and usually a delegated DNS zone. See [Cloud Providers](/docs/providers/overview).

## Prepare a container engine (local)

Adhar auto-detects the engine, preferring in this order: `docker`, `podman`, `nerdctl`, `finch`. Set `KIND_EXPERIMENTAL_PROVIDER` to force a specific one.

**Docker** — install Docker Desktop or Docker Engine and make sure it's running:

```bash
docker ps        # should succeed without error
```

**Podman** (macOS/Windows) — start a machine with enough resources:

```bash
podman machine init --cpus 6 --memory 12288
podman machine start
```

## Install the CLI

Choose whichever fits your workflow:

```bash
# Linux / macOS — install script (recommended)
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/scripts/install.sh | bash

# Homebrew
brew install adhar-io/tap/adhar
#   equivalently: brew tap adhar-io/tap && brew install adhar

# Or download a prebuilt archive from the releases page:
#   https://github.com/adhar-io/adhar/releases
```

Building from source (contributors, or to run the very latest):

```bash
git clone https://github.com/adhar-io/adhar.git && cd adhar
make build        # produces ./adhar
```

## Verify

```bash
adhar version                 # prints the CLI version
adhar --help                  # lists all commands, grouped by area
```

A quick environment sanity check:

```bash
docker ps                     # engine is running
kubectl version --client      # kubectl is on PATH (optional but handy)
```

## Upgrade the CLI

Re-run the same method you installed with:

```bash
# install script — re-run it
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/scripts/install.sh | bash
# Homebrew
brew upgrade adhar
```

Upgrading the CLI does not change a running platform. To converge a running platform onto a newer release, use `adhar upgrade` (see [Production](/docs/operations/production#upgrades)).

## Uninstall

```bash
adhar down                    # remove any local platform first
# then remove the binary (path depends on how you installed):
brew uninstall adhar          # Homebrew
# or delete the binary the install script placed on your PATH
```

## Install troubleshooting

| Symptom | Fix |
|---|---|
| `adhar: command not found` after install | Ensure the install directory is on your `PATH`; open a new shell |
| `adhar up` fails immediately | `docker ps` — is the engine running? Is a port taken? Try `adhar up --port 9443` |
| Rootless Podman can't bind `8443` | Use a higher port: `adhar up --port 9443` |
| Pods `Pending`, node under pressure | Give Docker more RAM, or enable fewer packages |

## Next steps

You're ready to bring up a platform.

- **[Quick Start](/docs/getting-started/quick-start)** — `adhar up`, a full tour of the consoles, your first GitOps change, and teardown
- **[Your First Service](/docs/getting-started/first-service)** — deploy an application onto the platform
- **[Cloud Providers](/docs/providers/overview)** — run it on a real cloud
