---
title: "Upgrade the Platform"
section: "Guides"
order: 7
path: "/docs/guides/upgrade-the-platform"
---

# Upgrade the Platform

This guide is for whoever is on the hook when an Adhar release lands. An upgrade is several independent changes: the CLI on your machine, the foundation components inside the cluster, the package stack ArgoCD syncs, individual chart versions, and Kubernetes itself. Each moves differently and rolls back differently. The guide explains what `adhar upgrade` actually does, in order, and why ArgoCD looks alarming for ten minutes afterwards. You will move a staging platform to a new release, bump one package's chart, and know how to back either change out.

## What you will build

- A pre-flight record: versions, health, a verified backup.
- A reviewed diff of exactly what the release changes in your GitOps repositories, produced before anything is touched.
- A converged foundation and a pushed stack, with every application back to `Healthy`/`Synced`.
- A package chart bump flowing through the same path.
- A rollback you have written down before you needed it.

**Prerequisites**

| Requirement | How to check |
|---|---|
| A **staging** platform on the release you run in production | `kubectl -n adhar-system get adharplatform` |
| `kubectl` on the right context — `adhar upgrade` acts on the **current** context | `kubectl config current-context` |
| A checkout of the `adhar` repository at the target release tag, which is where the stack lives | `git -C adhar describe --tags` |
| The matching CLI binary | `adhar version` |
| A recent, verified backup | [Backup and Restore](/docs/guides/backup-and-restore) |

## Five streams, upgraded separately

| Stream | What changes | Command | Rolls back by |
|---|---|---|---|
| **CLI** | The `adhar` binary on your machine, which carries the embedded foundation manifests | `brew upgrade adhar`, or a release archive | Installing the previous release archive |
| **Platform** | Foundation components and the package stack in Gitea | `adhar upgrade` | The previous binary's `adhar upgrade` plus a Git revert |
| **A package** | One chart's version or values | edit, `./generate-manifests.sh`, `adhar upgrade` | Revert the commit, `adhar upgrade` |
| **Kubernetes** | Control plane and nodes of one cluster | `adhar cluster upgrade` | Per provider; plan forward, not back |
| **Fleet Kubernetes** | Every registered data plane, in waves | `adhar fleet upgrade` | `--rollback-on-failure` |

Keep them apart. Upgrading the platform and Kubernetes in one window doubles the number of things that can explain a failure.

## How `adhar upgrade` works

`adhar upgrade` converges a running platform to whatever the binary and your local stack directory describe. It has two phases.

**Phase 1: converge the foundation.** The CLI re-applies its **embedded** manifests with server-side apply, in this order:

1. `gateway-api-crds`
2. `cilium`
3. `gateway`
4. `cnpg` (only with HA mode on)
5. `argocd`
6. `gitea`
7. `crossplane`

Before the list runs, it updates the platform's CRDs. It also clears the gate that normally stops the control-plane configuration (XRDs, Compositions, Functions, provider packages and Operations) from being re-applied more than once in a platform's lifetime, because rolling out a newer configuration is the point of an upgrade. Last, it converges the in-cluster `adhar-controller-manager` Deployment. Unchanged manifests are no-ops.

**Phase 2: diff and push the stack.** The CLI clones the `packages` and `environments` repositories from the in-cluster Gitea. It stages your local `platform/stack` exactly as it would be seeded, with templates rendered and the host rewritten, and prints the files that differ per repository. After you confirm, it **force-pushes** the stack, re-applies the platform ApplicationSet and asks ArgoCD to refresh.

The diff is the whole safety model. The packages are pre-rendered manifests, so the Git diff *is* the cluster diff.

```diagram
hb-upgrade-phases
```

**Why ArgoCD storms afterwards.** Every platform Application tracks the whole `packages` monorepo at `HEAD`. Any push to it, even a one-file change, gives every Application a new target revision, and every one flips `OutOfSync` at once. Applications with PostSync hooks stay `Progressing` until their Jobs finish. Expect roughly 5–15 minutes, about 10 typically on a cloud cluster, before the fleet settles. That churn is normal, not a fault. The CLI states it up front and counts your Applications. It warns only when the `packages` repository actually changed. A push of identical content creates no commit, and a change to `environments` alone re-compares nothing but the Kargo projects and AppProjects built from it.

## Step 1 — Pre-flight

Run this against staging first, then against production in a later window.

```bash
adhar version                                         # the CLI you are about to replace
kubectl -n adhar-system get deploy adhar-controller-manager \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="manager")].image}{"\n"}'
adhar get status                                      # conditions + per-package health
kubectl -n adhar-system get applications.argoproj.io | grep -v 'Synced *Healthy'
adhar backup create pre-upgrade-$(date +%Y%m%d) --ttl 720h
adhar backup verify pre-upgrade-$(date +%Y%m%d)
```

**Expected:** `adhar get status` is green. The `grep -v` shows only the header line, which means no Application is anything other than `Synced`/`Healthy`. The backup verifies as `Completed`.

Do not start an upgrade on an unhealthy platform. A broken app before the push becomes indistinguishable from one the push broke. Pre-flight checklist:

- [ ] Release notes read; breaking changes noted
- [ ] The same release already upgraded and soaked on staging
- [ ] Every Application `Synced`/`Healthy`, with nothing stuck in a running sync operation
- [ ] A pre-upgrade Velero backup verified, and the CNPG `lastFailedBackup` empty on platform databases
- [ ] Object-store PVC usage under 80%
- [ ] `kubectl get clusterproviderconfigs.<provider-group>` not empty, because a healthy-looking platform can still have none
- [ ] `kubectl config current-context` is the cluster you mean
- [ ] Your local stack directory contains **every** customization you have made: values, enabled packages, your own packages
- [ ] A rollback owner and the previous release's binary at hand

## Step 2 — Install the new CLI and check out the release

```bash
brew update && brew upgrade adhar         # or unpack the release archive for your platform
adhar version
git -C adhar fetch --tags && git -C adhar checkout <target-tag>   # the release you are moving to
```

**Expected:** `adhar version` reports the target release. `adhar upgrade` reads the stack from `platform/stack` relative to where you run it, so run it from the repository root or pass `--stack-dir`.

If your customizations live on a branch, rebase that branch onto the release tag instead of checking out the tag directly. Anything missing from your local stack shows up in the next step as a difference, and the push would overwrite it.

## Step 3 — Preview with `--diff-only`

```bash
cd adhar
adhar upgrade --diff-only
```

`--diff-only` skips the foundation phase entirely, clones both repositories, prints the per-repository summary and exits. It changes nothing.

```text
▸ Comparing local stack against in-cluster GitOps repositories…
   packages: 3 file(s) differ
      M  core/velero/manifests/install.yaml
      M  security/cert-manager/manifests/install.yaml
      A  application/new-tool/manifests/install.yaml
   environments: no changes
```

Read every line:

- **`M` in `packages`**: a release change, or one of yours. Open the file in the release diff if you do not recognise it.
- **`D` (deleted)**: something present in Gitea that is not in your local stack. That is usually a customization committed straight to Gitea that your checkout lacks. Copy it into your stack before going further, or the push removes it.
- **Anything in `environments`**: this repository carries team environment and promotion configuration. A difference here is either intended or a change you would be overwriting. Treat it as the latter until proven otherwise.

**Expected:** a list you can explain line by line.

## Step 4 — Upgrade staging

```bash
adhar upgrade             # interactive: shows the diff, asks "Push these changes and sync? [y/N]"
# adhar upgrade --yes     # non-interactive, for CI
```

The foundation phase prints a checklist, one line per component, marked done or failed with its own duration. A failure names the component it belongs to. Re-running `adhar upgrade` after fixing the cause is safe, because every apply is idempotent.

**Expected:** every foundation component marked done, then the stack summary, then the push. The closing line depends on what was pushed: `Upgrade applied — ArgoCD is re-comparing all N applications.` when the packages repository changed, or a note that nothing is re-comparing when it did not.

**The controller image is deliberately preserved.** Phase 1 keeps whatever image the live `adhar-controller-manager` runs, because an operator who pinned a tag did so on purpose. The exception is an image that can no longer be pulled. To move the in-cluster controller to the release you just installed, set the image explicitly:

```bash
kubectl -n adhar-system set image deploy/adhar-controller-manager \
  manager=ghcr.io/adhar-io/adhar:<target-tag>   # the tag adhar version reports
kubectl -n adhar-system rollout status deploy/adhar-controller-manager
```

## Step 5 — Watch the storm drain

```bash
watch -n 15 'kubectl -n adhar-system get applications.argoproj.io | grep -vc "Synced *Healthy"'
adhar get status
```

**Expected:** the count of not-yet-healthy Applications jumps to roughly the whole fleet right after the push, then falls to `1` (the header line) within about 10 minutes. Judge health only after that. Investigate an Application that is still `Degraded` once the rest have settled.

One case does not drain on its own. An Application whose sync operation was already waiting on a resource keeps re-applying the **old** revision until that operation is terminated. Pushing fixes changes nothing, and manual patches are reverted within a minute. Terminate it through the ArgoCD API, then hard-refresh. [Troubleshooting](/docs/reference/troubleshooting) has the exact commands, including the mandatory `content-type` header.

## Step 6 — Promote to production

Repeat Steps 1–5 against production with the same binary and the same stack checkout. If you run workload clusters, upgrade the management cluster **last** for Kubernetes version changes, after the workload clusters have proven the version. Platform releases, though, go to the management cluster, because that is where the platform runs.

## Bump one package

Packages are pre-rendered Helm charts. Each directory holds `values.yaml`, a `generate-manifests.sh` that pins `CHART_VERSION`, and the generated `manifests/install.yaml` that ArgoCD syncs. Never hand-edit the generated file.

```bash
cd platform/stack/packages/core/velero
# set CHART_VERSION in generate-manifests.sh to the chart version you are moving to
vi generate-manifests.sh
./generate-manifests.sh                      # helm template … -f values.yaml > manifests/install.yaml
git diff --stat manifests/install.yaml       # the size of the change
git diff manifests/install.yaml | less       # the change itself — this is what the cluster will get
```

Two checks before you commit, both from incidents that cost real time:

```bash
grep -c 'kind: CustomResourceDefinition' manifests/install.yaml   # chart ships crds/? keep --include-crds in the script
grep -n '^  namespace:' manifests/install.yaml | grep -v adhar-system   # every package installs into adhar-system
```

**Expected:** the CRD count matches what the chart ships, and the namespace grep prints nothing, except for `buildpack`, which keeps `kpack-system`. Then commit and run Steps 3–5: `adhar upgrade --diff-only` shows exactly this package's files, and `adhar upgrade` pushes them. A CI job that re-renders and opens a pull request per bump turns this into routine review.

Enabling or disabling a package follows the same path: `adhar stack enable <package>` edits the stack, and you review and push with `adhar upgrade`. See [Customization](/docs/operations/customization).

## Upgrade Kubernetes

Kubernetes upgrades in place, control plane first, then workers:

```bash
adhar cluster upgrade prod --version 1.37.2 -p digitalocean -f config.yaml
```

The cluster name is the **environment name** from your config, not `clusterConfig.name`. On managed clusters (`clusterMode: managed`), use the provider's managed-upgrade process instead. Nodes added later by `adhar cluster scale` or the autoscaler join on the minor version the running control plane reports, so a scale-out during the window cannot skew the cluster. For many workload clusters at once, use `adhar fleet upgrade` in canary waves; see [Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet).

## Roll back

Decide the trigger before you start, for example "any platform Application `Degraded` 30 minutes after the storm drains", and who pulls it.

**A package change:** revert the commit in your stack checkout and run `adhar upgrade`. ArgoCD syncs the previous manifests. The storm happens again; that is expected.

**A platform release:**

```bash
git -C adhar checkout <previous-tag>       # the release you came from, with your customizations
# install the <previous-tag> binary from its release archive, then:
adhar version                              # confirm the old CLI
adhar upgrade --diff-only                  # the reverse diff — review it like a forward one
adhar upgrade
```

That is the documented rollback: the previous binary's `adhar upgrade` plus a Git revert. Its foundation phase server-side-applies the older embedded manifests. The repository does not document how individual foundation components behave when moved back a version, especially CRD changes. Treat a platform rollback as something to rehearse on staging, and keep the pre-upgrade backup from Step 1 until production has soaked.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `platform stack directory not found at …` | Not run from the repository root | `cd` to the `adhar` checkout or pass `--stack-dir` |
| `reading AdharPlatform adhar-system/…` | Wrong kubeconfig context, or a non-default platform name with more than one platform | Check `kubectl config current-context`; pass `--name` |
| `cloning gitea repo "packages": … Failed to connect` | The CLI clones over the Gitea route; stale DNS pointing at an old load balancer | The CLI dials the Gateway's load-balancer IP directly when it can find one; otherwise fix DNS or the `cilium-gateway-*` Service |
| Clone fails with `403` on one machine only | A local Git credential helper returned a stale Gitea password after rotation | The CLI disables helpers for its clone; update the CLI |
| Every Application `OutOfSync` right after the push | Expected: all apps track the packages monorepo | Wait 5–15 minutes before judging |
| One Application keeps applying old manifests | A sync operation pinned to the previous revision | Terminate the operation via the ArgoCD API, then hard-refresh |
| Diff shows `D` lines you did not expect | Customizations exist in Gitea but not in your stack | Copy them into the stack before pushing |
| Controller still on the old image after upgrade | By design: the live image is preserved | `kubectl set image` as in Step 4 |
| Re-rendered package crash-loops on an unknown kind | CRDs dropped from the render | Keep `--include-crds` in `generate-manifests.sh` |
| `adhar cluster upgrade` reports cluster not found | Used `clusterConfig.name` instead of the environment name, or omitted `-f` | Pass the environment name and `-f config.yaml` |

## Next steps

- **[Backup and Restore](/docs/guides/backup-and-restore)** — the pre-upgrade backup, and how to prove it
- **[Customization](/docs/operations/customization)** — values, packages and your own additions to the stack
- **[Production](/docs/operations/production)** — sizing, HA and the hardening checklist
- **[Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet)** — `adhar fleet upgrade` across workload clusters
- **[CLI Reference](/docs/reference/cli)** — every flag of `upgrade`, `cluster upgrade` and `fleet upgrade`
