---
title: "Installation"
section: "Getting Started"
order: 2
path: "/docs/getting-started/installation"
---

# Installation

This page installs the Adhar CLI on your machine and checks that your environment can run a platform. **The `adhar` binary is the only thing you install.** It creates the cluster, installs the foundation, seeds Git and hands off to GitOps. You do not need to set up Kubernetes by hand first.

**One `adhar up` brings up the whole platform, on your laptop or on any supported cloud.** Locally, that takes about ten minutes. On a cloud, the provider's machine provisioning sets the pace. DigitalOcean is serving in about 5 minutes and usable at about 13. AWS first runs take 25–40. What differs is the preparation, and that is what this page covers.

The work has two parts:

1. Prepare a *host* for the platform to run on. For a laptop, the host is a container engine. For a cloud, it is an account, credentials and a DNS zone.
2. Install the CLI that builds the platform.

By the end of this page, you will have the CLI installed and verified. You will also know exactly what your host needs before your first `adhar up`.

```diagram
ds-install-paths
```

## Prerequisites, and why each one matters

### A container engine (local platforms only)

Adhar runs a local platform on Kind, a tool that runs Kubernetes nodes **as containers**. So the container engine is the machine the whole platform sits on. It creates the node, runs the pull-through image caches, and removes both on teardown.

Any one of Docker, Podman, nerdctl or Finch is enough. There is no Docker-specific code path. Adhar picks the engine exactly as Kind does, so the engine that creates the cluster is always the one that manages it:

1. If `KIND_EXPERIMENTAL_PROVIDER` is set, it wins. This holds even if that engine is not responding. Setting it is a deliberate choice, and a silent swap would be worse than a clear error.
2. Otherwise, Adhar uses the first engine that is installed **and answering**, in the order `docker`, `podman`, `nerdctl`, `finch`, `nerdctl.lima`.

To verify, check that the daemon answers, not only that the CLI is on your `PATH`. A Docker CLI with no running daemon is the most common broken state:

```bash
docker info                                # must succeed — `docker --version` alone proves nothing
export KIND_EXPERIMENTAL_PROVIDER=podman   # force a specific engine
```

Cloud targets need no container engine at all. They provision real machines.

### Memory, CPU and disk

The curated local profile enables a representative core of the 100+ wired catalogue entries. Run `adhar stack list --enabled` to see exactly which. On a cold machine, those pull roughly 90 images from eight public registries. Size the engine for that, not for an empty cluster:

| Resource | Minimum | Comfortable | Why |
|---|---|---|---|
| RAM | 8 GB | 16 GB | The curated core plus your own workloads |
| CPU | 4 cores | 6–8 cores | Bootstrap and continuous reconciliation |
| Disk | 20 GB free | 40 GB+ | ~10 GB of images, plus volumes and the image cache |

> **Give the engine the memory, not only the machine.** On Docker Desktop, you set the limit under Settings → Resources. Its default is well below 8 GB. An engine without enough resources is the most common cause of pods stuck `Pending` and of a Kind node that never converges. On Podman, the limit is set on the VM. `podman machine init --cpus 6 --memory 12288` is a reasonable floor.

### kubectl

You do not need kubectl to bootstrap, because the CLI talks to the Kubernetes API directly. But you will want it as soon as you start inspecting things. Use v1.24 or newer.

```bash
kubectl version --client
```

### Go (only to build from source)

You need Go 1.26+ to run `make build`. Released binaries need nothing.

### Cloud accounts and DNS (cloud platforms only)

For AWS, Azure, GCP, DigitalOcean, Civo or your own hosts, you need:

- an account with enough quota
- credentials the CLI can read
- **a DNS zone delegated to that cloud**, set up before you run anything

Every platform URL is `<app>.<your-domain>`. ACME (the protocol that issues TLS certificates) solves DNS-01 challenges in that zone, so you cannot delegate it afterwards. See [Cloud Providers](/docs/providers/overview) for per-provider detail.

## How the pieces fit together

```diagram
local-topology
```

The caches are ordinary containers on the `kind` network. `docker ps` (or `podman ps`) lists them next to the node, and you can inspect them like anything else. `adhar down` stops them but keeps the shared volume, which is what makes the second install fast. To remove the containers and the volume as well, use `adhar down --purge-image-cache`.

## Install the CLI

Pick one method. All of them install the same released binary, except the source build.

### Homebrew (macOS and Linux)

This is the recommended route. The formula lives in the `adhar-io/homebrew-tap` tap. The release pipeline publishes it on every tag.

**Step 1 — install.** One command adds the tap and installs the CLI:

```bash
brew install adhar-io/tap/adhar
```

That is shorthand. If you want to see the two steps, or want the tap on disk before you decide, run:

```bash
brew tap adhar-io/tap          # clones github.com/adhar-io/homebrew-tap
brew install adhar
```

**Step 2 — trust the tap, if your Homebrew asks.** Homebrew can be set to refuse third-party taps. If you have `HOMEBREW_REQUIRE_TAP_TRUST` set, the install stops until you trust the tap once:

```bash
brew trust --tap adhar-io/tap
```

If you have never set that variable, skip this step. `brew` will not mention it.

**Step 3 — confirm it came from the tap you expect.** Do this once. A name clash with another tap is the one failure that silently installs the wrong binary:

```bash
brew info adhar-io/tap/adhar   # shows the version, tap and install path
which adhar                    # /opt/homebrew/bin/adhar on Apple silicon
adhar version --short          # the exact check the formula's own test runs
```

**What the formula actually does.** It downloads the prebuilt release archive for your platform and runs `bin.install "adhar"`. Nothing is compiled locally, so installs are fast and byte-identical to the published artifact. Supported platforms are macOS on Apple silicon and Intel, and Linux on `amd64` and `arm64`.

**Keeping it current:**

```bash
brew update && brew upgrade adhar
```

**Removing it:**

```bash
brew uninstall adhar
brew untap adhar-io/tap        # optional — drops the tap clone as well
```

Know two limits before you choose this route:

- Homebrew tracks **tagged releases only**. For unreleased `main`, build from source.
- **Windows is not published through Homebrew.** Use the release archive.

### Install script

This installs the same release archives, without Homebrew. The script finds the latest stable tag and downloads the archive for your OS and architecture. It installs to `/usr/local/bin`, which you can override with `INSTALL_DIR`. It uses `sudo` only if that directory is not writable:

```bash
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/scripts/install.sh | bash

# install somewhere on your PATH that you own, no sudo:
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/scripts/install.sh | INSTALL_DIR="$HOME/.local/bin" bash
```

### Release archive

Download and unpack an archive by hand from [the releases page](https://github.com/adhar-io/adhar/releases). Published targets are:

- Linux and macOS on `amd64` and `arm64`, as `.tar.gz`
- Windows on `amd64`, as `.zip`

Windows is archive-only. It is not published through Homebrew.

### From source

This needs Go 1.26+. It builds exactly what is in your working tree:

```bash
git clone https://github.com/adhar-io/adhar.git
cd adhar
make build          # builds ./adhar with version metadata
```

> A source build leaves the binary in the repo root. It does **not** put it on your `PATH`. So every command elsewhere in these docs becomes `./adhar up`, `./adhar get status`, and so on.

## Verify the install

`adhar version` does two jobs. It prints the build metadata, then checks your environment. That makes it the one check to run before `adhar up`.

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

The box shows `Version`, `Git Commit`, `Build Date`, `Go Version` and `OS/Arch`. Below it, the **System Information** panel checks four tools. It marks each one `● Available` or `✖ Not found`:

| Probe | What it means |
|---|---|
| Container engine | Named for the engine detected: Docker, Podman, nerdctl or Finch. This one must be `Available` |
| Kind | Information only. The node is created through Kind's library, not this binary |
| Kubectl | Shows the client version. Needed for inspection, not for bootstrap |
| Helm | Information only. The foundation ships as embedded manifests |

`adhar version --short` prints only the version string, with no banner. Use it in scripts. `adhar --help` lists every command, grouped by who uses it: Develop, Observe, Operate, Administer, Utilities.

## Set up a local platform

Once the engine is answering and `adhar` is on your `PATH`, a local platform takes one command and no configuration file. This section is the setup path. [Quick Start](/docs/getting-started/quick-start) explains what each phase is doing while you wait.

### 1. Check the host one last time

```bash
docker info >/dev/null && echo "engine responding"
adhar version                  # the container-engine row must read ● Available
```

If the engine is installed but not running, the check says so plainly. This is the most common reason `adhar up` fails on the first try:

```terminal
$ adhar version

System Information:
  Docker:  ✖ Not found  Required for platform functionality
  Kind:    ● Available  kind v0.30.0 go1.26.0 darwin/arm64
  Kubectl: ● Available  Client Version: v1.31.1
  Helm:    ● Available  v3.16.2+g13654a5
```

`✖ Not found` next to the engine means the daemon did not answer. It does not mean the binary is missing. Start Docker Desktop (or run `podman machine start`), then run the check again.

### 2. Bring it up

```bash
adhar up
```

With no `--file` and no `--env`, Adhar uses Kind. On a warm machine this is the ten-minute path. It takes about 2m40s to reach the foundation, then another 6m40s for the GitOps sync of the curated core.

Adhar creates a cluster named `adhar` and maps host ports 8443 and 8080 to the Gateway. It prints a nine-stage checklist under the heading *Provisioning Adhar platform*. Each line shows `◌` while it runs, `✓` when it finishes and `✖` if it fails. Mid-run, it looks like this:

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

The CLI drives the first three stages. From **Cilium & Gateway** onward, the in-cluster `AdharPlatform` controller owns the work, and the CLI only reports what it sees. That is why the second half can sit on one line for a while. It is watching, not stalled.

`--apps-timeout` limits only the final wait. When it runs out, ArgoCD keeps converging in the background. Use `adhar get status` to follow it.

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

Here is what success looks like:

- `adhar get status` shows an **Overall Status** of `● Healthy`.
- The `GatewayReady`, `ArgoCDReady`, `GiteaReady`, `CrossplaneReady` and `GitOpsReady` conditions are all true.
- There is one `Ready` node.

A few packages at `Progressing` in the first minutes is normal convergence, not failure.

### 4. Open the consoles

Every URL is a subdomain of `adhar.localtest.me`. It resolves to `127.0.0.1` from public DNS, so you have nothing to add to `/etc/hosts`:

```text
https://console.adhar.localtest.me:8443
https://argocd.adhar.localtest.me:8443
https://gitea.adhar.localtest.me:8443
```

The local platform uses a self-signed certificate, so your browser warns you on the first visit. To stop the warning, trust the platform CA as described in [Local (Kind)](/docs/providers/local-kind).

### 5. Tear down when finished

```bash
adhar down                     # keeps the image cache; the next up is much faster
adhar down --purge-image-cache # also drop the ~10 GB of cached images
```

## Set up a cloud platform

A cloud install differs in one key way: **it needs a configuration file, and you must prepare the account before the CLI can do anything useful.** Work through these steps in order. Each one blocks the next, and DNS in particular cannot be fixed afterwards.

### 1. Credentials

Adhar reads credentials from the environment, never from the config file. That keeps the file safe to commit:

| Provider | Environment | Preferred alternative |
|---|---|---|
| **DigitalOcean** | `DIGITALOCEAN_ACCESS_TOKEN` | — |
| **Civo** | `CIVO_TOKEN` | — |
| **AWS** | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (`AWS_REGION`) | `AWS_PROFILE`, or `useInstanceProfile: true` |
| **GCP** | `GOOGLE_APPLICATION_CREDENTIALS` pointing at a key file | `useApplicationDefault` / `useComputeMetadata` |
| **Azure** | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | `useManagedIdentity: true` |

Use the workload-identity option wherever your environment allows it. A long-lived key stored in a shell profile is the credential most likely to leak.

One GCP exception: once you set a `dnsProvider`, GCP still needs a mountable key file for the cert-manager DNS-01 solver. This applies even if the cluster itself uses metadata credentials.

### 2. DNS delegation — do this first

Every platform URL is built from `defaultHost`, and ACME solves DNS-01 challenges inside that zone. **The zone must exist and be delegated before you provision**, because certificates are issued during bootstrap. Nothing in the platform creates the zone for you.

```bash
# the zone exists at the provider (DigitalOcean shown)
doctl compute domain list

# and the internet agrees it is delegated there
dig NS do.example.com +short
```

If `dig` returns your registrar's nameservers instead of the cloud's, delegation has not taken effect yet. Wait for it to propagate before you continue.

### 3. Quota

A new cloud account limits instances, vCPU, volumes and load balancers well below what the full catalogue needs. `adhar up` checks this up front and names whatever is short. That is faster than finding out halfway through a provision. Raise your limits before your first run, not during it.

### 4. Write the configuration file

Start from the example for your cloud in the platform repo, such as `examples/digitalocean-config.yaml` or `examples/aws-config.yaml`. The minimum shape is:

```yaml
globalSettings:
  adharContext: adhar-mgmt        # kube-context prefix and Cilium cluster name
  defaultHost: do.example.com     # the delegated zone; every URL derives from it
  defaultHttpsPort: 443           # 443 behind a cloud load balancer, so URLs carry no port
  email: platform@example.com     # the Let's Encrypt (ACME) account
  enableHAMode: true              # ArgoCD x2, redis-ha x3, CNPG 2 instances, PDBs
```

The file describes the **cluster**: where it runs, how big it starts, and how far it may grow. What gets installed on it comes from the repository, not from this file. [Configuration](/docs/getting-started/configuration) covers the four-layer model and precedence rules in full.

### 5. Validate before you spend anything

`--dry-run` resolves the whole configuration and prints the provider, region, type and the merged `clusterConfig` in resolution order. Then it exits without creating anything:

```bash
adhar up -f config.digitalocean.yaml --env dev --dry-run
```

Do not continue until the dry run is clean. It catches mistakes that are expensive to find later, such as the wrong environment name, a provider that is not `primary`, or a region your quota does not cover.

### 6. Provision, then verify

```bash
adhar up -f config.digitalocean.yaml --env dev
```

The stage checklist has the same shape as the local one. Cloud stages replace the first three: **Preflight**, **Cloud cluster** and **Kubeconfig & TLS**. From **Cilium & Gateway** onward, it is the same controller-driven sequence. Mid-run, it looks like this:

```terminal
$ adhar up -f config.digitalocean.yaml --env dev

Provisioning Adhar Platform

  ✓ Preflight                      credentials, quota and API access
  ✓ Cloud cluster                  dev · digitalocean · blr1
  ✓ Kubeconfig & TLS               context, certificates, edge DNS
  ✓ Cilium & Gateway               eBPF data path
  ✓ ArgoCD                         GitOps engine
  ◌ Gitea                          in-cluster Git server
  ◌ GitOps repos                   packages, environments
  ◌ Crossplane                     control plane + providers
  ◌ GitOps sync - platform stack   platform apps via ArgoCD
```

The provider sets the time here, not Adhar. On DigitalOcean, the cluster is serving in about 5 minutes and the platform is usable at about 13. AWS first runs take 25–40 minutes. On AWS, GCP and Azure, the catalogue keeps converging for another 30–45 minutes after the CLI returns, while the autoscaler adds workers. When it finishes, run:

```bash
kubectl config current-context                   # adhar-<cluster>
adhar get status
kubectl get gateway -n adhar-system              # note the LoadBalancer ADDRESS
dig +short console.do.example.com                # must resolve to that address
curl -sI https://console.do.example.com | head -1
```

DNS records and the wildcard certificate are published during bootstrap, but propagation and ACME issuance take time. If a service resolves but serves the self-signed certificate, it usually needs a few more minutes.

### 7. Tear down

Pass the config file to tear down a cloud environment. `adhar down` with no `--file` only ever looks at Kind:

```bash
adhar down -f config.digitalocean.yaml --env dev
adhar down -f config.digitalocean.yaml --env dev --purge-orphaned-volumes
```

Check the provider console afterwards. Load balancers and volumes created by workloads (not by Adhar) are the two things most likely to survive a teardown and keep billing you.

The provider pages cover per-cloud detail, including IAM permissions, machine sizes, cost and pitfalls: [AWS](/docs/providers/aws), [GCP](/docs/providers/gcp), [Azure](/docs/providers/azure), [DigitalOcean](/docs/providers/digitalocean), [Civo](/docs/providers/civo), [Custom / on-prem](/docs/providers/custom).

## When a prerequisite check fails

| Symptom | Cause | Fix |
|---|---|---|
| `adhar: command not found` | Install directory is not on your `PATH` | Add it and open a new shell. Or re-run the script with `INSTALL_DIR` pointing somewhere already on `PATH` |
| Engine shows `✖ Not found` but the CLI is installed | The daemon is not answering. Being on `PATH` is not enough | Start Docker Desktop, or `podman machine start`; confirm with `docker info` |
| Wrong engine picked on a machine with two | First-responding engine wins | `export KIND_EXPERIMENTAL_PROVIDER=podman` and re-check with `adhar version` |
| `adhar up` fails immediately | Engine down, or host port 8443 already taken | `docker info`, then `adhar up --port 9443` (HTTP derives as port − 363, here `9080`) |
| Rootless Podman cannot bind `8443` | Privileged port under a rootless user | Use `adhar up --port 9443` rather than loosening system limits |
| Pods stay `Pending`, node under memory pressure | Engine memory limit too low | Raise it to 8 GB or more and re-run `adhar up`. The bootstrap resumes |
| `*.adhar.localtest.me` will not resolve | No DNS egress, or DNS-rebinding protection | `localtest.me` resolves to `127.0.0.1` from public DNS. Allow it, or use a resolver that does not block loopback answers |

## Upgrade and uninstall

To upgrade, re-run the method you installed with:

```bash
brew upgrade adhar
# or re-run the install script — it always fetches the latest stable release
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/scripts/install.sh | bash
```

Upgrading the CLI does **not** change a running platform. Moving a live platform onto a newer stack is a separate, deliberate operation. See [Production](/docs/operations/production).

To remove everything, tear the platform down first. That lets the CLI clean up its containers, volumes and network:

```bash
adhar down                      # local platform
adhar down --purge-image-cache  # also drop the cached images (next run re-pulls ~10 GB)
brew uninstall adhar && brew untap adhar-io/tap
```

To tear down a cloud environment, pass its configuration file. `adhar down` with no `--file` only ever looks at Kind.

## Next steps

Your machine is ready. The next page brings a platform up on it and explains each phase while you wait.

- **[Quick Start](/docs/getting-started/quick-start)** — `adhar up`, the consoles, credentials, and teardown
- **[Local (Kind)](/docs/providers/local-kind)** — engine specifics, the image cache, and trusting the platform CA
- **[Cloud Providers](/docs/providers/overview)** — credentials, quotas and DNS for a real cloud
- **[Configuration](/docs/getting-started/configuration)** — the config file a cloud install needs, layer by layer
