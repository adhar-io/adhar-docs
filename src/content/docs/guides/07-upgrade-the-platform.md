---
title: "Upgrade the Platform"
section: "Guides"
order: 7
path: "/docs/guides/upgrade-the-platform"
---

# Upgrade the Platform

This guide is for whoever is responsible when an Adhar release lands. You move a staging platform to a new release, preview exactly what changes before anything is touched, bump one package's chart, and learn how to back out either change. It also explains what `adhar upgrade` does, in order, and why every ArgoCD Application re-syncs afterwards.

## What you'll build

```diagram
ngb-upgrade-phases
```

- A pre-flight record: versions, health and a backup you have checked.
- A reviewed diff of what the release changes in your GitOps repositories.
- A converged foundation and a pushed stack, with every Application back to `Synced`/`Healthy`.
- A package chart bump flowing through the same path.
- A rollback you have written down before you need it.

## Prerequisites

- A **staging** platform on the release you run in production: `kubectl -n adhar-system get adharplatform`.
- `kubectl` on the right context. `adhar upgrade` acts on the **current** context: `kubectl config current-context`.
- A checkout of the `adhar` repository at the target release tag, with your customizations: `git -C adhar describe --tags`.
- The matching CLI binary: `adhar version`.
- A recent backup that you have restored from. See [Backup and Restore](/docs/guides/backup-and-restore).

## Five streams, upgraded separately

An upgrade is several independent changes. Each moves differently and rolls back differently.

| Stream | What changes | Command | Rolls back by |
|---|---|---|---|
| **CLI** | The `adhar` binary on your machine, which carries the embedded foundation manifests | `brew upgrade adhar`, or a release archive | Installing the previous release archive |
| **Platform** | Foundation components and the package stack in Gitea | `adhar upgrade` | The previous binary's `adhar upgrade` plus a Git revert |
| **A package** | One chart's version or values | Edit, `./generate-manifests.sh`, `adhar upgrade` | Revert the commit, `adhar upgrade` |
| **Kubernetes** | Control plane and nodes of one cluster | `adhar cluster upgrade` | Per provider; plan forward, not back |
| **Fleet Kubernetes** | Every registered data plane, in waves | `adhar fleet upgrade` | `--rollback-on-failure` |

Keep them apart. Upgrading the platform and Kubernetes in one window doubles the number of things that could explain a failure.

## How `adhar upgrade` works

`adhar upgrade` converges a running platform to what the binary and the stack describe. The *stack* is the set of package definitions that ArgoCD syncs. The command has two phases.

### Phase 1: converge the foundation

The CLI first updates the platform's CRDs. It then re-applies its **embedded** manifests with server-side apply, in this order:

1. `gateway-api-crds`
2. `cilium`
3. `gateway`
4. `cnpg` (only with HA mode on)
5. `argocd`
6. `gitea`
7. `crossplane`
8. `controller-manager` (the in-cluster `adhar-controller-manager` Deployment)

Unchanged manifests are no-ops. Two behaviours are specific to an upgrade:

- **The control-plane configuration is re-applied.** XRDs, Compositions, Functions, provider packages and Operations are normally applied once in a platform's lifetime. An upgrade clears that gate, because rolling out a newer configuration is the point.
- **The controller image is preserved.** The Deployment's shape is converged, but the image stays whatever the live Deployment runs (see [Step 4](#step-4--upgrade-staging)).

### Phase 2: diff and push the stack

1. The CLI clones the `packages` and `environments` repositories from the in-cluster Gitea.
2. It stages the stack (the one built into the CLI, or the copy you named) exactly as it would be seeded: templates rendered, host rewritten.
3. It prints the files that differ, per repository.
4. After you confirm, it **force-pushes** the stack, re-applies the platform ApplicationSet and asks ArgoCD to refresh.

The diff is the whole safety model. Packages are pre-rendered manifests, so the Git diff *is* the cluster diff.

| Flag | Effect |
|---|---|
| `--diff-only` | Show the stack diff and exit. Skips the foundation phase; changes nothing |
| `--yes`, `-y` | Apply without the confirmation prompt (CI) |
| `--skip-foundation` | Skip phase 1; only diff and sync the stack |
| `--stack-dir <path>` | Use this stack directory |
| `--name <platform>` | The `AdharPlatform` resource to upgrade. Needed only when the cluster holds more than one |

### Why every Application re-syncs afterwards

```diagram
ngb-upgrade-resync
```

Every platform Application tracks the whole `packages` repository at `HEAD`. Any push to it, even a one-file change, gives every Application a new target revision, so all of them flip to `OutOfSync` at once. Applications with PostSync hooks stay `Progressing` until their Jobs finish. This is expected, not a fault.

The CLI warns you up front and counts your Applications, but only when `packages` actually changed:

- A push of identical content creates no commit, so nothing re-compares.
- A change to `environments` alone re-compares only the Kargo projects and AppProjects built from it.

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

**Check:**

- `adhar get status` is green.
- The `grep -v` prints only the header line, so every Application is `Synced`/`Healthy`.
- `adhar backup verify` reports `Completed`.

> **Warning:** Do not start an upgrade on an unhealthy platform. If an Application is broken before the push, you cannot tell it apart from one the push broke.

Work through this checklist:

- [ ] Release notes read; breaking changes noted
- [ ] The same release already upgraded and soaked on staging
- [ ] Every Application `Synced`/`Healthy`, with nothing stuck in a running sync operation
- [ ] A pre-upgrade Velero backup checked, and the CNPG `lastFailedBackup` empty on platform databases
- [ ] Object-store PVC usage under 80%
- [ ] `kubectl get clusterproviderconfigs.<provider-group>` not empty; a healthy-looking platform can still have none
- [ ] `kubectl config current-context` is the cluster you mean
- [ ] Your stack contains **every** customization you have made: values, enabled packages, your own packages
- [ ] A rollback owner, and the previous release's binary at hand

## Step 2 — Install the new CLI and check out the release

```bash
brew update && brew upgrade adhar         # or unpack the release archive for your platform
adhar version
git -C adhar fetch --tags && git -C adhar checkout <target-tag>   # the release you are moving to
```

`adhar upgrade` uses the stack built into the binary, so upgrading the CLI is what brings the new stack. If you work on an exported copy (`ADHAR_STACK_DIR` or `--stack-dir`), export the new version and carry your changes across first. Otherwise you push the older stack.

If your customizations live on a branch, rebase that branch onto the release tag instead of checking out the tag directly.

> **Warning:** Anything missing from your stack shows up in the next step as a difference, and the push overwrites it.

**Check:** `adhar version` reports the target release. The first line of `adhar upgrade` output, `Platform stack: …`, says which stack is in use.

## Step 3 — Preview with `--diff-only`

```bash
cd adhar
adhar upgrade --diff-only
```

`--diff-only` skips the foundation phase. It clones both repositories, prints the per-repository summary and exits.

```text
▸ Comparing local stack against in-cluster GitOps repositories…
   packages: 3 file(s) differ
      M  core/velero/manifests/install.yaml
      M  security/cert-manager/manifests/install.yaml
      A  application/new-tool/manifests/install.yaml
   environments: no changes
```

Read every line:

| Line | Meaning | What to do |
|---|---|---|
| `M` in `packages` | A release change, or one of yours | Open the file in the release diff if you do not recognise it |
| `A` in `packages` | A file the push adds | Confirm it is a package you expect |
| `D` (deleted) | Something present in Gitea that is not in your stack, usually a customization committed straight to Gitea | Copy it into your stack first, **or the push removes it** |
| Anything in `environments` | This repository holds team environment and promotion configuration | Assume you would overwrite someone's change until you have shown otherwise |

**Check:** you can explain the list line by line.

## Step 4 — Upgrade staging

```bash
adhar upgrade             # interactive: shows the diff, asks "Push these changes and sync? [y/N]"
# adhar upgrade --yes     # non-interactive, for CI
```

The foundation phase prints a checklist with one line per component, each marked done or failed. A failure names the component it belongs to. After you fix the cause, re-run `adhar upgrade`; every apply is idempotent.

**Check:** every foundation component is marked done, then the stack summary, then the push. The closing lines depend on what was pushed:

| What changed | The CLI reports |
|---|---|
| `packages` | ArgoCD is re-comparing all N applications |
| `environments` only | Pushed; the application fleet is not re-comparing |
| Nothing | Nothing to push; the stack is already in sync |

### Move the controller to the new image

Phase 1 keeps whatever image the live `adhar-controller-manager` runs, because an operator who pinned a tag did so on purpose. The exception is an image that can no longer be pulled. To move the in-cluster controller to the release you installed, set the image explicitly:

```bash
kubectl -n adhar-system set image deploy/adhar-controller-manager \
  manager=ghcr.io/adhar-io/adhar:<target-tag>   # the tag adhar version reports
kubectl -n adhar-system rollout status deploy/adhar-controller-manager
```

**Check:** the rollout completes, and the image query from Step 1 prints the target tag.

## Step 5 — Wait for the re-sync to settle

```bash
watch -n 15 'kubectl -n adhar-system get applications.argoproj.io | grep -vc "Synced *Healthy"'
adhar get status
```

**Check:** the count of not-yet-healthy Applications jumps to roughly every Application right after the push, then falls to `1` (the header line). Judge health only after that. Investigate an Application that is still `Degraded` once the rest have settled.

One case does not settle on its own. If an Application's sync operation was already waiting on a resource when you pushed, it keeps re-applying the **old** revision until the operation is terminated. Pushing fixes changes nothing, and manual patches are reverted. Terminate the operation through the ArgoCD API, then hard-refresh. [Troubleshooting](/docs/reference/troubleshooting) has the exact commands, including the mandatory `content-type` header.

## Step 6 — Promote to production

Repeat Steps 1–5 against production with the same binary and the same stack.

If you run workload clusters, order depends on the stream:

- **Platform releases** go to the management cluster, because that is where the platform runs.
- **Kubernetes versions** go to the management cluster **last**, after the workload clusters have proven the version.

**Check:** the same checks as Steps 4 and 5, on the production context.

## Bump one package

Packages are pre-rendered Helm charts. Each package directory holds three things:

| File | Role |
|---|---|
| `values.yaml` | Your configuration surface |
| `generate-manifests.sh` | Pins `CHART_VERSION` and renders the chart |
| `manifests/install.yaml` | The generated output that ArgoCD syncs. **Never hand-edit it** |

```diagram
do-package-change
```

1. **Change the version and re-render.**

   ```bash
   cd platform/stack/packages/core/velero
   vi generate-manifests.sh                     # set CHART_VERSION to the chart version you are moving to
   ./generate-manifests.sh                      # helm template … -f values.yaml > manifests/install.yaml
   git diff --stat manifests/install.yaml       # the size of the change
   git diff manifests/install.yaml | less       # the change itself: this is what the cluster gets
   ```

2. **Check the render before you commit.**

   ```bash
   grep -c 'kind: CustomResourceDefinition' manifests/install.yaml   # chart ships crds/? keep --include-crds in the script
   grep -n '^  namespace:' manifests/install.yaml | grep -v adhar-system   # every package installs into adhar-system
   ```

   **Check:** the CRD count matches what the chart ships, and the namespace grep prints nothing. The one exception is `buildpack`, which keeps `kpack-system`.

3. **Commit, then run Steps 3–5.** `adhar upgrade --diff-only` shows this package's files, and `adhar upgrade` pushes them.

A CI job that re-renders and opens a pull request per bump turns this into routine review.

Enabling or disabling a package follows the same path: `adhar stack enable <package>` edits the stack, and you review and push with `adhar upgrade`. See [Customization](/docs/operations/customization).

## Upgrade Kubernetes

Kubernetes upgrades in place, control plane first, then workers:

```bash
adhar cluster upgrade prod --version 1.37.2 -p digitalocean -f config.yaml
```

- The cluster name is the **environment name** from your config, not `clusterConfig.name`.
- On managed clusters (`clusterMode: managed`), use the provider's managed-upgrade process instead.
- Nodes added later by `adhar cluster scale` or the autoscaler join on the minor version that the running control plane reports, so a scale-out during the window cannot skew the cluster.
- For many workload clusters at once, use `adhar fleet upgrade` in canary waves. See [Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet).

## Roll back

Before you start, decide what triggers a rollback and who performs it. A trigger might be "any platform Application still `Degraded` after the re-sync has settled".

**A package change.** Revert the commit in your stack checkout and run `adhar upgrade`. ArgoCD syncs the previous manifests. Every Application re-syncs again, which is expected.

**A platform release.** Use the previous binary's `adhar upgrade` plus a Git revert. Its foundation phase server-side-applies the older embedded manifests.

```bash
git -C adhar checkout <previous-tag>       # the release you came from, with your customizations
# install the <previous-tag> binary from its release archive, then:
adhar version                              # confirm the old CLI
adhar upgrade --diff-only                  # the reverse diff: review it like a forward one
adhar upgrade
```

> **Warning:** How individual foundation components behave when moved back a version, especially across CRD changes, is not documented. Rehearse a platform rollback on staging, and keep the pre-upgrade backup from Step 1 until production has soaked.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `… is not a platform stack directory` | `--stack-dir` or `ADHAR_STACK_DIR` names a directory with no `packages/` inside | Fix the path, or drop it to use the built-in stack |
| `reading AdharPlatform adhar-system/…` | Wrong kubeconfig context, or a non-default platform name with more than one platform | Check `kubectl config current-context`; pass `--name` |
| `cloning gitea repo "packages": … Failed to connect` | The CLI clones over the Gitea route; stale DNS points at an old load balancer | The CLI dials the Gateway's load-balancer IP directly when it can find one; otherwise fix DNS or the `cilium-gateway-*` Service |
| Clone fails with `403` on one machine only | A local Git credential helper returned a stale Gitea password after rotation | The CLI disables helpers for its clone; update the CLI |
| Every Application `OutOfSync` right after the push | Expected: all Applications track the `packages` repository | Wait for the re-sync to settle before judging |
| One Application keeps applying old manifests | A sync operation pinned to the previous revision | Terminate the operation via the ArgoCD API, then hard-refresh |
| Diff shows `D` lines you did not expect | Customizations exist in Gitea but not in your stack | Copy them into the stack before pushing |
| Controller still on the old image after upgrade | By design: the live image is preserved | `kubectl set image` as in Step 4 |
| Re-rendered package crash-loops on an unknown kind | CRDs dropped from the render | Keep `--include-crds` in `generate-manifests.sh` |
| `adhar cluster upgrade` reports cluster not found | Used `clusterConfig.name` instead of the environment name, or omitted `-f` | Pass the environment name and `-f config.yaml` |

## Next steps

- [Backup and Restore](/docs/guides/backup-and-restore) — the pre-upgrade backup, and how to prove it.
- [Customization](/docs/operations/customization) — values, packages and your own additions to the stack.
- [Run a Multi-Cluster Fleet](/docs/guides/run-a-fleet) — `adhar fleet upgrade` across workload clusters.
- [CLI Reference](/docs/reference/cli) — every flag of `upgrade`, `cluster upgrade` and `fleet upgrade`.
