---
title: "Installation"
section: "Getting Started"
order: 2
path: "/docs/getting-started/installation"
---

# Installation

This page is the reference for what Adhar needs: the CLI, every way to install it, and how to prepare a *host*, either a container engine on a laptop or an account, credentials and a DNS zone on a cloud. To go straight from nothing to a running local platform, follow [Quick Start](/docs/getting-started/quick-start) and come back here only if a check fails.

**The `adhar` binary is the only thing you install.** It creates the cluster, installs the foundation, seeds Git and hands off to GitOps. The platform's package definitions, environments and ApplicationSets (together, the *stack*) are built into the binary, so a given CLI version always installs the same platform, from any directory.

```diagram
nst-install-paths
```

## Prerequisites

| You need | For | Notes |
|---|---|---|
| A container engine | Local platforms | Docker, Podman, nerdctl or Finch, with its daemon running |
| 8 GB RAM, 4 CPU cores, 20 GB free disk | Local platforms | Given to the engine, not only to the machine |
| kubectl v1.24 or newer | Inspecting the platform | Not needed to bootstrap. The CLI talks to the Kubernetes API directly |
| Go 1.26.5 or newer | Building from source only | Released binaries need nothing |
| A cloud account, credentials and a delegated DNS zone | Cloud platforms | See [Set up a cloud platform](#set-up-a-cloud-platform). No container engine needed |

### Container engine

Adhar runs a local platform on Kind, which runs Kubernetes nodes **as containers**. The engine runs the node and the pull-through image caches, and removes both on teardown. Adhar picks the engine exactly as Kind does:

1. If `KIND_EXPERIMENTAL_PROVIDER` is set, it wins, even if that engine is not responding. You get a clear error instead of a silent swap.
2. Otherwise, Adhar uses the first engine that is installed **and answering**, in the order `docker`, `podman`, `nerdctl`, `finch`, `nerdctl.lima`.

```bash
docker info                                # must succeed; `docker --version` alone proves nothing
export KIND_EXPERIMENTAL_PROVIDER=podman   # optional: force a specific engine
```

**Check:** `docker info` (or `podman info`) prints server details, not `Cannot connect to the Docker daemon`.

### Memory, CPU and disk

| Resource | Minimum | Comfortable | Why |
|---|---|---|---|
| RAM | 8 GB | 16 GB | The local profile plus your own workloads |
| CPU | 4 cores | 6–8 cores | Bootstrap and continuous reconciliation |
| Disk | 20 GB free | 40 GB+ | Images, volumes and the image cache |

> **Warning:** Give the memory to the engine, not only to the machine. On Docker Desktop, set it under Settings → Resources; its default is well below 8 GB. On Podman, set it on the VM: `podman machine init --cpus 6 --memory 12288` is a reasonable floor. An under-sized engine is the most common cause of pods stuck `Pending`.

### How a local install fits together

```diagram
local-topology
```

The image caches are ordinary containers on the `kind` network, one per upstream registry; `docker ps` lists them next to the node. `adhar down` stops them but keeps the shared volume, so the next install reads images from local disk. `adhar down --purge-image-cache` removes the containers and the volume.

## Install the CLI

Pick one method. All of them install the same released binary, except the source build.

| Method | Platforms | Use it when |
|---|---|---|
| [Homebrew](#homebrew) | macOS (Apple silicon, Intel), Linux (`amd64`, `arm64`) | You want the recommended route and easy upgrades |
| [Install script](#install-script) | macOS, Linux | You do not use Homebrew |
| [Release archive](#release-archive) | macOS, Linux, Windows (`amd64`) | You want to unpack by hand, or you are on Windows |
| [From source](#from-source) | Anywhere Go runs | You need unreleased `main`, or you are changing Adhar |

### Homebrew

The formula lives in the `adhar-io/homebrew-tap` tap and is published on every stable release; pre-releases are not published. It downloads the prebuilt archive for your platform.

```bash
brew install adhar-io/tap/adhar        # shorthand for: brew tap adhar-io/tap && brew install adhar
brew trust --tap adhar-io/tap          # only if you set HOMEBREW_REQUIRE_TAP_TRUST
```

**Check:** the binary came from the tap you expect. A name clash with another tap would install the wrong binary.

```bash
brew info adhar-io/tap/adhar   # the tap and install path
which adhar                    # /opt/homebrew/bin/adhar on Apple silicon
```

### Install script

The script finds the latest stable tag, downloads the archive for your OS and architecture, and installs to `/usr/local/bin`, using `sudo` only if that directory is not writable. Override the directory with `INSTALL_DIR`.

```bash
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/scripts/install.sh | bash

# somewhere on your PATH that you own, no sudo:
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/scripts/install.sh | INSTALL_DIR="$HOME/.local/bin" bash
```

**Check:** the script ends by running `adhar version`, then prints `Successfully installed Adhar CLI!`.

### Release archive

Download and unpack an archive from [the releases page](https://github.com/adhar-io/adhar/releases): `.tar.gz` for Linux and macOS on `amd64` and `arm64`, `.zip` for Windows on `amd64`. Windows is archive-only.

**Check:** `adhar version` runs from a new shell.

### From source

This needs Go 1.26.5 or newer, and builds exactly what is in your working tree, stack included:

```bash
git clone https://github.com/adhar-io/adhar.git
cd adhar
make build          # builds ./adhar with version metadata, and warms the local image cache
```

Two things differ from a released binary:

- The binary is left in the repository root, **not** on your `PATH`. Every command in these docs becomes `./adhar up`, `./adhar get status`, and so on.
- **The binary uses the stack it was built with, even inside the checkout.** `make build` embeds your working tree, so rebuild after editing a package. To run against the tree without rebuilding, name it: `--stack-dir platform/stack` (or `export ADHAR_STACK_DIR=$PWD/platform/stack`).

**Check:** `./adhar version` prints the commit you built.

## Verify the install

`adhar version` prints the build metadata, then checks your environment. Run it before `adhar up`.

```terminal
$ adhar version

╭──────────────────────────────────────────────────╮
│                                                  │
│   Version: <version>                             │
│   Git Commit: e0e2af9                            │
│   Build Date: 2026-10-21T04:50:56Z               │
│   Go Version: go1.27.1                           │
│   OS/Arch: darwin/arm64                          │
│                                                  │
╰──────────────────────────────────────────────────╯

System Information:
  Docker: ● Available Docker version 29.7.2, build a7dcaa6
  Kind: ● Available kind version 0.31.0
  Kubectl: ● Available Client Version: v1.27.4
  Helm: ● Available v3.13.1+g3547a4b
```

Your values will differ. The **System Information** panel marks four tools `● Available` or `✖ Not found`:

| Probe | What it means |
|---|---|
| Container engine | Named for the engine detected: Docker, Podman, nerdctl or Finch. Its CLI must be installed |
| Kind | Information only. The node is created through Kind's library, not this binary |
| Kubectl | Shows the client version. Needed for inspection, not for bootstrap |
| Helm | Information only. The foundation ships as embedded manifests |

> **Warning:** `● Available` does not prove the engine's daemon is running. The row runs the engine's `--version`, which succeeds even when the daemon is stopped. Use `docker info` (or `podman info`) for the daemon.

`adhar version --short` prints only the version string, for scripts. `adhar --help` lists every command, grouped as Develop, Observe, Operate, Administer and Utilities.

## Set up a local platform

A local platform needs no configuration file and nothing beyond the prerequisites above. Run `adhar up` from any directory; with no `--file` and no `--env`, Adhar uses Kind. [Quick Start](/docs/getting-started/quick-start) walks through the run, the health checks, the consoles and the credentials.

## Set up a cloud platform

A cloud install needs a configuration file, and an account prepared before the CLI can do anything useful. Work through the steps in order: each one blocks the next.

```diagram
nst-cloud-prep
```

The examples use DigitalOcean. The provider pages cover per-cloud IAM permissions, machine sizes, cost and pitfalls: [AWS](/docs/providers/aws), [GCP](/docs/providers/gcp), [Azure](/docs/providers/azure), [DigitalOcean](/docs/providers/digitalocean), [Civo](/docs/providers/civo), [Custom / on-prem](/docs/providers/custom).

### 1. Export credentials

Keep credentials out of the config file, so the file is safe to commit. Set `useEnvironment: true` on the provider and export its variables, or use the alternative listed:

| Provider | Environment variables | Alternative |
|---|---|---|
| **DigitalOcean** | `DIGITALOCEAN_TOKEN` (or `DIGITALOCEAN_ACCESS_TOKEN`) | — |
| **Civo** | `CIVO_TOKEN` | — |
| **AWS** | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (`AWS_REGION`) | `AWS_PROFILE`, or an instance role picked up by the AWS SDK's default credential chain |
| **GCP** | `GOOGLE_APPLICATION_CREDENTIALS` pointing at a key file | `useApplicationDefault` / `useComputeMetadata` |
| **Azure** | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | `useManagedIdentity: true` |

Prefer the workload-identity alternative wherever your environment allows it. A long-lived key in a shell profile is the credential most likely to leak.

> **Note:** Whenever edge DNS runs on GCP (an empty `dnsProvider` on a GCP environment counts), the cert-manager DNS-01 solver needs a service-account key, as a key file or an inline `serviceAccountKey`, even if the cluster itself uses metadata credentials.

**Check:** `doctl account get` (or your cloud's equivalent) answers with the account you mean.

### 2. Delegate a DNS zone

Every platform URL is `<app>.<defaultHost>`, and ACME (the protocol that issues TLS certificates) solves DNS-01 challenges inside that zone. **The zone must exist and be delegated to the cloud before you provision**, because certificates are issued during bootstrap. Nothing in the platform creates the zone for you.

```bash
doctl compute domain list          # the zone exists at the provider
dig NS do.example.com +short       # and public DNS agrees it is delegated there
```

**Check:** `dig` returns the cloud's nameservers. If it returns your registrar's, delegation has not propagated yet; wait before you continue.

### 3. Check quota

A new cloud account limits instances, vCPU, volumes and load balancers well below what the production profile needs. On AWS, Azure, GCP and Civo, `adhar up` checks quota up front and names whatever is short. DigitalOcean has no such check, and `--dry-run` never checks quota.

**Check:** the limits in the provider console cover the machines your config asks for, plus room for the autoscaler's `maxWorkers`.

### 4. Write the configuration file and provision

The file describes the **cluster**: where it runs, how big it starts and how far it may grow. What gets installed on it is the platform stack, not anything in this file. Scaffold it, then follow [From a file to a cluster](/docs/getting-started/configuration#from-a-file-to-a-cluster) to set the keys a cloud needs, validate, dry-run and provision:

```bash
adhar config create --provider digitalocean --region sgp1 --name config.digitalocean.yaml
adhar config validate config.digitalocean.yaml
adhar up -f config.digitalocean.yaml --env dev --dry-run
adhar up -f config.digitalocean.yaml --env dev
```

The checklist has the same shape as the local one, with cloud stages in place of the first three: **Preflight**, **Cloud cluster** and **Kubeconfig & TLS**. On a cloud, `adhar up` waits up to `45m` for the console unless you pass `--apps-timeout`, because the production profile is much larger. The catalogue keeps converging after the CLI returns while the autoscaler adds workers.

**Check:** the run ends with the `✓  Platform ready` panel, and `kubectl config current-context` reads `adhar` (or `adhar-<name>` if you passed `--name`).

### 5. Verify DNS and TLS

```bash
adhar get status
kubectl get gateway -n adhar-system              # note the LoadBalancer ADDRESS
dig +short console.do.example.com                # must resolve to that address
curl -sI https://console.do.example.com | head -1
```

**Check:** the console host name resolves to the Gateway's address and answers over HTTPS with a trusted certificate. DNS records and the wildcard certificate are published during bootstrap. If a service resolves but still serves the self-signed certificate, ACME issuance has not finished yet.

### 6. Tear down

Pass the config file to tear down a cloud environment. `adhar down` with no `--file` only ever looks at Kind.

```bash
adhar down -f config.digitalocean.yaml --env dev
```

`--purge-orphaned-volumes` also deletes unattached `pvc-*` volumes in the region that carry no other cluster's tag. Use it only when no other Kubernetes cluster runs in that region. `--keep-volumes` keeps the cluster's block volumes and their data instead.

**Check:** the provider console shows no load balancers or volumes left behind. Ones created by workloads (not by Adhar) are the two things most likely to survive a teardown and keep billing you.

## Where the platform stack comes from

You need this section only if you plan to change what the platform installs.

Each command that needs the stack uses the first source that matches:

| Order | Source | When it applies |
|---|---|---|
| 1 | `--stack-dir <dir>` (on `adhar stack` and `adhar upgrade`), or `-p <dir>` (on `adhar up`) | You named a directory on the command line |
| 2 | `ADHAR_STACK_DIR` | You set it for the shell session |
| 3 | **The stack built into the binary** | Everything else, which is the normal case — in every working directory, the Adhar repository included |

A directory you name must be a real stack. If it is missing, the command stops; it never falls back to another stack silently.

**The built-in stack is read-only.** To enable a package, edit a manifest or keep the stack in your own Git repository, write an editable copy into a new directory and point the CLI at it. [Quick Start, step 6](/docs/getting-started/quick-start#6-change-the-platform-the-gitops-way) shows the edit-and-converge loop.

```bash
adhar stack export ./stack             # every package, environment and ApplicationSet
export ADHAR_STACK_DIR=$PWD/stack      # every adhar command in this shell now uses it
```

> **Warning:** An exported copy belongs to the CLI version that wrote it. After you upgrade the CLI, export again (or merge the new export into your repository) before you run `adhar upgrade`. Otherwise you push the older stack.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `adhar: command not found` | The install directory is not on your `PATH` | Add it and open a new shell, or re-run the script with `INSTALL_DIR` pointing somewhere already on `PATH` |
| Engine shows `✖ Not found` | The engine's CLI is not installed, or not on your `PATH` | Install the engine, then re-check with `adhar version` |
| `adhar up` fails immediately | The engine's daemon is not answering | Start Docker Desktop, or run `podman machine start`. Confirm with `docker info` (or `podman info`) |
| Wrong engine picked on a machine with two | The first responding engine wins | `export KIND_EXPERIMENTAL_PROVIDER=podman` and re-check with `adhar version` |
| `… is not a platform stack directory (no packages/ inside)` | `--stack-dir`, `-p` or `ADHAR_STACK_DIR` names a directory that is not a stack | Fix the path, or unset it to use the built-in stack. `adhar stack export <dir>` writes a valid one |
| Rootless Podman cannot bind `8443` | The host refuses that port to a rootless user | Use another port, for example `adhar up --port 9443` (HTTP derives as port − 363, here `9080`) |
| Pods stay `Pending`, node under memory pressure | The engine's memory limit is too low | Raise it to 8 GB or more and re-run `adhar up`. The bootstrap resumes |
| `*.adhar.localtest.me` will not resolve | No DNS egress, or DNS-rebinding protection | `localtest.me` resolves to `127.0.0.1` from public DNS. Allow it, or use a resolver that does not block loopback answers |

## Upgrade and uninstall

To upgrade the CLI, re-run the method you installed with:

```bash
brew update && brew upgrade adhar
# or re-run the install script, which always fetches the latest stable release
```

Upgrading the CLI does **not** change a running platform. The new binary carries the new stack, and moving a live platform onto it is a separate step: `adhar upgrade --diff-only` to see what would change, then `adhar upgrade`. See [Upgrade the Platform](/docs/guides/upgrade-the-platform).

To remove everything, tear the platform down first so the CLI can clean up its containers, volumes and network:

```bash
adhar down --purge-image-cache                    # local platform and its cached images
brew uninstall adhar && brew untap adhar-io/tap   # untap is optional
```

The CLI keeps one extracted copy of its built-in stack in your user cache directory (`~/Library/Caches/adhar/stack` on macOS, `~/.cache/adhar/stack` on Linux). It is rebuilt whenever it is missing or differs from the binary, so it is safe to delete.

## Next steps

- **[Quick Start](/docs/getting-started/quick-start)**: `adhar up`, the consoles, credentials and your first change
- **[Configuration](/docs/getting-started/configuration)**: the config file a cloud install needs, layer by layer
- **[Local (Kind)](/docs/providers/local-kind)**: engine specifics, the image cache, and trusting the platform CA
- **[Cloud Providers](/docs/providers/overview)**: credentials, quotas and DNS for each cloud
