---
title: "Installation"
section: "Getting Started"
order: 2
path: "/docs/getting-started/installation"
---

# Installation

This page gets the Adhar CLI onto your machine and proves your environment can carry a platform. **The `adhar` binary is the only thing you install** — it creates the cluster, installs the foundation, seeds Git and hands off to GitOps, so there is no Kubernetes to set up by hand first.

The work splits into two parts: prepare a *host* for the platform to run on, then install the CLI that builds it. For a laptop the host is a container engine. For a cloud it is an account, credentials and a DNS zone.

## At a glance

| | |
|---|---|
| **What you install** | One static binary, `adhar` |
| **What you do not install** | Kubernetes, Kind, Helm, ArgoCD, Crossplane — all supplied by the CLI |
| **Local host requirement** | A container engine: Docker, Podman, nerdctl or Finch |
| **Cloud host requirement** | Provider credentials plus a delegated DNS zone |
| **Kubernetes version** | `v1.37.0` by default, on every provider |
| **Install methods** | Homebrew tap, install script, release archive, build from source |
| **Verify with** | `adhar version` — prints build info and probes your dependencies |

## Prerequisites, and why each one matters

### A container engine (local platforms only)

Adhar runs a local platform on Kind, which runs Kubernetes nodes **as containers**. The engine is therefore the machine the whole platform sits on: it creates the node, runs the pull-through image caches, and removes both on teardown.

Any one of Docker, Podman, nerdctl or Finch is enough — there is no Docker-specific code path. Adhar resolves the engine exactly as Kind does, so the engine that creates the cluster is always the one that manages it:

1. `KIND_EXPERIMENTAL_PROVIDER`, if set, wins — even if that engine is not responding, because overriding it is deliberate and a silent substitution would be worse than a clear error.
2. Otherwise the first engine installed **and answering**, in the order `docker`, `podman`, `nerdctl`, `finch`, `nerdctl.lima`.

Verify by proving the daemon answers, not merely that the CLI is on your `PATH` — a Docker CLI with no running daemon is the most common broken state:

```bash
docker info                                # must succeed — `docker --version` alone proves nothing
export KIND_EXPERIMENTAL_PROVIDER=podman   # force a specific engine
```

Cloud targets need no container engine at all; they provision real machines.

### Memory, CPU and disk

The curated local profile enables a representative core of the package catalogue — 17 of the 101 wired entries — and those pull roughly 90 images from eight public registries on a cold machine. Size the engine for that, not for an empty cluster:

| Resource | Minimum | Comfortable | Why |
|---|---|---|---|
| RAM | 8 GB | 16 GB | The curated core plus your own workloads |
| CPU | 4 cores | 6–8 cores | Bootstrap and continuous reconciliation |
| Disk | 20 GB free | 40 GB+ | ~10 GB of images, plus volumes and the image cache |

> **Give the engine the memory, not only the machine.** On Docker Desktop the limit is set under Settings → Resources and defaults well below 8 GB. An under-provisioned engine is the single most common cause of pods stuck `Pending` and of a Kind node that never converges. On Podman the equivalent is the VM: `podman machine init --cpus 6 --memory 12288` is a reasonable floor.

### kubectl

Not required to bootstrap — the CLI drives the cluster through the Kubernetes API directly — but you will want it the moment you start inspecting things. v1.24 or newer.

```bash
kubectl version --client
```

### Go (only to build from source)

Go 1.26+ is needed for `make build`. Released binaries need nothing.

### Cloud accounts and DNS (cloud platforms only)

For AWS, Azure, GCP, DigitalOcean, Civo or your own hosts you need an account with quota, credentials the CLI can read, and — before you run anything — **a DNS zone delegated to that cloud**. Every platform URL is `<app>.<your-domain>`, and ACME solves DNS-01 challenges in that zone, so the delegation cannot be done afterwards. Per-provider detail is in [Cloud Providers](/docs/providers/overview).

## How the pieces fit together

```text
  your machine
  ┌──────────────────────────────────────────────────────────┐
  │  adhar CLI  ──drives──▶  container engine                │
  │                          ┌─────────────────────────────┐ │
  │                          │ Kind node  (Kubernetes)     │ │
  │                          │   Cilium · Gateway · ArgoCD │ │
  │                          │   Gitea · Crossplane · …    │ │
  │                          └─────────────────────────────┘ │
  │                          registry cache containers       │
  │                          (one per upstream registry)     │
  └──────────────────────────────────────────────────────────┘
        host ports 8443 / 8080  ──▶  the platform Gateway
```

Adhar creates the node through Kind's Go library rather than a `kind` binary, so there is nothing else to install. The registry caches are small `registry` containers on the `kind` network that make every run after the first pull images from local disk instead of the internet; `adhar down` stops them and keeps their volume.

## Install the CLI

Pick one method. All of them install the same released binary except the source build.

**Homebrew (macOS and Linux)** — from the `adhar-io/homebrew-tap` tap:

```bash
brew install adhar-io/tap/adhar
```

That is shorthand for tapping first, which you can also do explicitly:

```bash
brew tap adhar-io/tap
brew install adhar
```

If your Homebrew gates third-party taps (you have `HOMEBREW_REQUIRE_TAP_TRUST` set), trust the tap once before installing:

```bash
brew trust --tap adhar-io/tap
```

Homebrew tracks *tagged releases* only. For unreleased `main`, build from source.

**Install script** — the same release archives, without Homebrew. It resolves the latest stable tag, downloads the archive for your OS and architecture, and installs to `/usr/local/bin` (override with `INSTALL_DIR`), using `sudo` only if that directory is not writable:

```bash
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/scripts/install.sh | bash

# install somewhere on your PATH that you own, no sudo:
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/scripts/install.sh | INSTALL_DIR="$HOME/.local/bin" bash
```

**Release archive** — download and unpack by hand from [the releases page](https://github.com/adhar-io/adhar/releases). Published targets are Linux and macOS on `amd64` and `arm64` as `.tar.gz`, and Windows on `amd64` as `.zip`. Windows is archive-only; it is not published through Homebrew.

**From source** — needs Go 1.26+, and gives you exactly the working tree:

```bash
git clone https://github.com/adhar-io/adhar.git
cd adhar
make build          # builds ./adhar with version metadata
```

> A source build leaves the binary in the repo root and does **not** put it on your `PATH`. Every command elsewhere in these docs becomes `./adhar up`, `./adhar get status`, and so on.

## Verify the install

`adhar version` does double duty: it prints the build metadata and then probes your environment, so it is the single check to run before `adhar up`.

```bash
adhar version
```

You get a box with `Version`, `Git Commit`, `Build Date`, `Go Version` and `OS/Arch`, followed by a **System Information** panel that probes four tools and marks each `● Available` or `✖ Not found`:

| Probe | What it means |
|---|---|
| Container engine | Named for the engine actually detected — Docker, Podman, nerdctl, Finch. This is the one that must be `Available` |
| Kind | Informational: the node is created through Kind's library, not this binary |
| Kubectl | Reports the client version; wanted for inspection, not for bootstrap |
| Helm | Informational; the foundation ships as embedded manifests |

`adhar version --short` prints only the version string, with no banner — use it in scripts. `adhar --help` lists every command, grouped by the person who uses it: Develop, Observe, Operate, Administer, Utilities.

## When a prerequisite check fails

| Symptom | Cause | Fix |
|---|---|---|
| `adhar: command not found` | Install directory is not on your `PATH` | Add it and open a new shell; or re-run the script with `INSTALL_DIR` pointing somewhere already on `PATH` |
| Engine shows `✖ Not found` but the CLI is installed | The daemon is not answering — presence on `PATH` is not enough | Start Docker Desktop, or `podman machine start`; confirm with `docker info` |
| Wrong engine picked on a machine with two | First-responding engine wins | `export KIND_EXPERIMENTAL_PROVIDER=podman` and re-check with `adhar version` |
| `adhar up` fails immediately | Engine down, or host port 8443 already taken | `docker info`, then `adhar up --port 9443` (HTTP derives as port − 363, here `9080`) |
| Rootless Podman cannot bind `8443` | Privileged port under a rootless user | Use `adhar up --port 9443` rather than loosening system limits |
| Pods stay `Pending`, node under memory pressure | Engine memory limit too low | Raise it to 8 GB or more and re-run `adhar up` — the bootstrap resumes |
| `*.adhar.localtest.me` will not resolve | No DNS egress, or DNS-rebinding protection | `localtest.me` resolves to `127.0.0.1` from public DNS; allow it, or use a resolver that does not block loopback answers |

## Upgrade and uninstall

Re-run whichever method you installed with:

```bash
brew upgrade adhar
# or re-run the install script — it always fetches the latest stable release
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/scripts/install.sh | bash
```

Upgrading the CLI does **not** change a running platform. Converging a live platform onto a newer stack is a separate, deliberate operation — see [Production](/docs/operations/production).

To remove everything, tear the platform down first so the CLI can clean up its containers, volumes and network:

```bash
adhar down                      # local platform
adhar down --purge-image-cache  # also drop the cached images (next run re-pulls ~10 GB)
brew uninstall adhar && brew untap adhar-io/tap
```

A cloud environment needs its configuration file — `adhar down` with no `--file` only ever looks at Kind.

## Next steps

Your machine is ready. The next page brings a platform up on it and explains what each phase is doing while you wait.

- **[Quick Start](/docs/getting-started/quick-start)** — `adhar up`, the consoles, credentials, and teardown
- **[Local (Kind)](/docs/providers/local-kind)** — engine specifics, the image cache, and trusting the platform CA
- **[Cloud Providers](/docs/providers/overview)** — credentials, quotas and DNS for a real cloud
