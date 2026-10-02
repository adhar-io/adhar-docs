---
title: "Installation"
section: "Getting Started"
order: 2
path: "/docs/getting-started/installation"
---

# Installation

This page gets the Adhar CLI onto your machine and proves your environment can carry a platform. **The `adhar` binary is the only thing you install** — it creates the cluster, installs the foundation, seeds Git and hands off to GitOps, so there is no Kubernetes to set up by hand first.

The work splits into two parts: prepare a *host* for the platform to run on, then install the CLI that builds it. For a laptop the host is a container engine. For a cloud it is an account, credentials and a DNS zone.

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

```diagram
local-topology
```

The caches are ordinary containers on the `kind` network, so `docker ps` (or `podman ps`) lists them alongside the node and you can inspect them like anything else. `adhar down` stops them but keeps the shared volume — that is what makes the second install fast. Use `adhar down --purge-image-cache` when you want the containers and the volume gone as well.

## Install the CLI

Pick one method. All of them install the same released binary except the source build.

### Homebrew (macOS and Linux)

The recommended route. The formula lives in the `adhar-io/homebrew-tap` tap, which the release pipeline publishes on every tag.

**Step 1 — install.** One command does both the tap and the install:

```bash
brew install adhar-io/tap/adhar
```

That is shorthand. If you prefer to see the two steps, or you want the tap on disk before deciding:

```bash
brew tap adhar-io/tap          # clones github.com/adhar-io/homebrew-tap
brew install adhar
```

**Step 2 — trust the tap, if your Homebrew asks.** Homebrew can be configured to refuse third-party taps. If you have `HOMEBREW_REQUIRE_TAP_TRUST` set, the install stops until you vouch for the tap once:

```bash
brew trust --tap adhar-io/tap
```

If you have never set that variable this step does not apply, and `brew` will not mention it.

**Step 3 — confirm it resolved to the tap you expect.** Worth doing once, because a name collision with another tap is the one failure mode that installs the wrong binary silently:

```bash
brew info adhar-io/tap/adhar   # shows the version, tap and install path
which adhar                    # /opt/homebrew/bin/adhar on Apple silicon
adhar version --short          # the exact check the formula's own test runs
```

**What the formula actually does.** It downloads the prebuilt release archive for your platform and does `bin.install "adhar"` — nothing is compiled locally, so installs are fast and byte-identical to the published artifact. Supported combinations are macOS on Apple silicon and Intel, and Linux on `amd64` and `arm64`.

**Keeping it current:**

```bash
brew update && brew upgrade adhar
```

**Removing it:**

```bash
brew uninstall adhar
brew untap adhar-io/tap        # optional — drops the tap clone as well
```

Two limits worth knowing before you choose this route. Homebrew tracks **tagged releases only**, so unreleased `main` needs a source build. And **Windows is not published through Homebrew** — use the release archive.

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

```terminal
$ adhar version

╭────────────────────────────────────────────────────╮
│                                                    │
│  Version:     v0.1.0                               │
│  Git Commit:  9f3c1d4                              │
│  Build Date:  2026-09-18T11:04:22Z                 │
│  Go Version:  go1.26.0                             │
│  OS/Arch:     darwin/arm64                         │
│                                                    │
╰────────────────────────────────────────────────────╯

System Information:
  Docker:  ● Available  Docker version 27.3.1, build ce12230
  Kind:    ● Available  kind v0.30.0 go1.26.0 darwin/arm64
  Kubectl: ● Available  Client Version: v1.31.1
  Helm:    ● Available  v3.16.2+g13654a5
```

The box carries `Version`, `Git Commit`, `Build Date`, `Go Version` and `OS/Arch`. Under it, the **System Information** panel probes four tools and marks each `● Available` or `✖ Not found`:

| Probe | What it means |
|---|---|
| Container engine | Named for the engine actually detected — Docker, Podman, nerdctl, Finch. This is the one that must be `Available` |
| Kind | Informational: the node is created through Kind's library, not this binary |
| Kubectl | Reports the client version; wanted for inspection, not for bootstrap |
| Helm | Informational; the foundation ships as embedded manifests |

`adhar version --short` prints only the version string, with no banner — use it in scripts. `adhar --help` lists every command, grouped by the person who uses it: Develop, Observe, Operate, Administer, Utilities.

## Set up a local platform

With the engine answering and `adhar` on your `PATH`, a local platform is one command and no configuration file. This is the setup path; [Quick Start](/docs/getting-started/quick-start) narrates what each phase is doing while you wait.

### 1. Prove the host one last time

```bash
docker info >/dev/null && echo "engine responding"
adhar version                  # the container-engine row must read ● Available
```

If the engine is installed but not running, the probe says so plainly — and this is the single most common reason `adhar up` fails on the first try:

```terminal
$ adhar version

System Information:
  Docker:  ✖ Not found  Required for platform functionality
  Kind:    ● Available  kind v0.30.0 go1.26.0 darwin/arm64
  Kubectl: ● Available  Client Version: v1.31.1
  Helm:    ● Available  v3.16.2+g13654a5
```

`✖ Not found` against the engine means the daemon did not answer, not that the binary is missing. Start Docker Desktop (or `podman machine start`) and re-run.

### 2. Bring it up

```bash
adhar up
```

No `--file` and no `--env` means Kind. Adhar creates a cluster named `adhar`, maps host ports 8443 and 8080 to the Gateway, and prints a nine-stage checklist under the heading *Provisioning Adhar platform*. Each line shows `◌` while it runs, `✓` when it lands and `✖` if it fails. Mid-run it looks like this:

```terminal
$ adhar up

Provisioning Adhar platform

  ✓ Kind cluster                   local node · Cilium CNI · ports 8443/8080
  ✓ Platform CRDs                  AdharPlatform · GitRepository · CustomPackage
  ✓ Networking                     CoreDNS rewrite · self-signed TLS
  ✓ Cilium & Gateway               eBPF CNI + Cilium Gateway API
  ✓ ArgoCD                         GitOps engine
  ✓ Gitea                          in-cluster Git server
  ◌ GitOps repos                   seed packages · environments · templates into Gitea
  ◌ Crossplane                     control plane + providers
  ◌ GitOps sync - platform stack   curated platform apps via ArgoCD
```

The first three stages are driven by the CLI; from **Cilium & Gateway** onward the in-cluster `AdharPlatform` controller owns the work and the CLI is only reporting what it observes. That is why the back half can sit on one line for a while — it is watching, not stalled. `--apps-timeout` bounds only the final wait; when it expires ArgoCD keeps converging in the background and `adhar get status` is how you follow it.

Useful variations:

```bash
adhar up --port 9443           # 8443 taken, or rootless Podman; HTTP derives as 9080
adhar up --verbose             # per-stage logs instead of the compact checklist
```

### 3. Check what you got

```bash
adhar get status               # platform and package health, with a health score
adhar get secrets -p argocd    # the ArgoCD admin login
kubectl get nodes              # context is already adhar-adhar
```

### 4. Open the consoles

Every URL is a subdomain of `adhar.localtest.me`, which resolves to `127.0.0.1` from public DNS — nothing to add to `/etc/hosts`:

```text
https://console.adhar.localtest.me:8443
https://argocd.adhar.localtest.me:8443
https://gitea.adhar.localtest.me:8443
```

The local platform uses a self-signed certificate, so the first visit warns. [Local (Kind)](/docs/providers/local-kind) covers trusting the platform CA so the warning stops.

### 5. Tear down when finished

```bash
adhar down                     # keeps the image cache; the next up is much faster
adhar down --purge-image-cache # also drop the ~10 GB of cached images
```

## Set up a cloud platform

A cloud install differs in one structural way: **it needs a configuration file, and the account has to be prepared before the CLI can do anything useful.** Work through these in order — each one blocks the next, and DNS in particular cannot be fixed afterwards.

### 1. Credentials

Adhar reads credentials from the environment, never from the config file, so the file stays safe to commit:

| Provider | Environment | Preferred alternative |
|---|---|---|
| **DigitalOcean** | `DIGITALOCEAN_ACCESS_TOKEN` | — |
| **Civo** | `CIVO_TOKEN` | — |
| **AWS** | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (`AWS_REGION`) | `AWS_PROFILE`, or `useInstanceProfile: true` |
| **GCP** | `GOOGLE_APPLICATION_CREDENTIALS` pointing at a key file | `useApplicationDefault` / `useComputeMetadata` |
| **Azure** | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | `useManagedIdentity: true` |

Prefer the workload-identity option wherever your environment allows it — a long-lived key that lives in a shell profile is the credential most likely to leak. Note that once you set a `dnsProvider`, GCP still needs a mountable key file for the cert-manager DNS-01 solver even if the cluster itself uses metadata credentials.

### 2. DNS delegation — do this first

Every platform URL derives from `defaultHost`, and ACME solves DNS-01 challenges inside that zone. **The zone must exist and be delegated before you provision**, because certificates are issued during bootstrap. Nothing in the platform creates the zone for you.

```bash
# the zone exists at the provider (DigitalOcean shown)
doctl compute domain list

# and the internet agrees it is delegated there
dig NS do.example.com +short
```

If `dig` returns your registrar's nameservers rather than the cloud's, delegation has not taken effect yet — wait for propagation before continuing.

### 3. Quota

A fresh cloud account caps instances, vCPU, volumes and load balancers well below what the full catalogue wants. `adhar up` preflights this and names whatever is short, which is faster than discovering it halfway through a provision. Raise limits before your first run rather than during it.

### 4. Write the configuration file

Start from the example for your cloud in the platform repo — `examples/digitalocean-config.yaml`, `examples/aws-config.yaml`, and so on. The minimum shape:

```yaml
globalSettings:
  adharContext: adhar-mgmt        # kube-context prefix and Cilium cluster name
  defaultHost: do.example.com     # the delegated zone; every URL derives from it
  defaultHttpsPort: 443           # 443 behind a cloud load balancer, so URLs carry no port
  email: platform@example.com     # the Let's Encrypt (ACME) account
  enableHAMode: true              # ArgoCD x2, redis-ha x3, CNPG 2 instances, PDBs
```

The file describes the **cluster** — where it runs, how big it starts, how far it may grow. What gets installed on it comes from the repository, not from here. [Configuration](/docs/getting-started/configuration) covers the four-layer model and precedence rules in full.

### 5. Validate before you spend anything

`--dry-run` resolves the whole configuration and prints the provider, region, type and the merged `clusterConfig` in resolution order, then exits without creating a thing:

```bash
adhar up -f config.digitalocean.yaml --env dev --dry-run
```

Treat a clean dry run as the gate. It catches the mistakes that are expensive to find later — the wrong environment name, a provider that is not `primary`, a region your quota does not cover.

### 6. Provision, then verify

```bash
adhar up -f config.digitalocean.yaml --env dev
```

The stage checklist is the same shape as local, minus the Kind line and plus the provider's own machine provisioning. When it finishes:

```bash
kubectl config current-context                   # adhar-<cluster>
adhar get status
kubectl get gateway -n adhar-system              # note the LoadBalancer ADDRESS
dig +short console.do.example.com                # must resolve to that address
curl -sI https://console.do.example.com | head -1
```

DNS records and the wildcard certificate are published during bootstrap, but propagation and ACME issuance are not instant. A service that resolves but serves the self-signed certificate usually just needs a few more minutes.

### 7. Tear down

A cloud environment needs its file — `adhar down` with no `--file` only ever looks at Kind:

```bash
adhar down -f config.digitalocean.yaml --env dev
adhar down -f config.digitalocean.yaml --env dev --purge-orphaned-volumes
```

Check the provider console afterwards. Load balancers and volumes created by workloads rather than by Adhar are the two things most likely to outlive a teardown and keep billing.

Per-cloud detail — IAM permissions, machine sizes, cost and pitfalls — is on the provider pages: [AWS](/docs/providers/aws), [GCP](/docs/providers/gcp), [Azure](/docs/providers/azure), [DigitalOcean](/docs/providers/digitalocean), [Civo](/docs/providers/civo), [Custom / on-prem](/docs/providers/custom).

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
