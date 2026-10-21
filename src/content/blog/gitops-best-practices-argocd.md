---
title: "GitOps in practice with ArgoCD"
excerpt: "How Adhar uses ArgoCD and an in-cluster Gitea repository as the only write path: reconciliation, drift, rollback, promotion with Kargo, platform upgrades and the pitfalls that catch people."
category: "DevOps"
author: "Adhar Team"
date: "2026-09-18"
featured: false
tags: ["GitOps", "ArgoCD", "Gitea", "Kargo", "Kubernetes"]
---

GitOps is easy to describe and easy to get half right. "Git is the source of truth" means little if people can still change the cluster another way. On Adhar, after bootstrap, Git is the **only** write path. Every change goes through a commit, and ArgoCD makes the cluster match it.

This post explains how that works in practice. It covers where the repositories live, what reconciliation does to hand edits, how to sync and roll back, how releases move between environments, and the mistakes that cost teams real time.

## Why Git, and why only Git

A pure GitOps system cannot bootstrap itself. ArgoCD cannot install the network plugin it needs, and the Git server does not exist yet. So `adhar up` runs a fixed bootstrap: Cilium, then ArgoCD, then Gitea, then Crossplane. After that it hands off to GitOps for good.

From then on, the rule is simple. If a change did not come from a commit, it does not survive. That gives you three things a deployment tool cannot:

- **An audit trail.** "What is in production, and how did it get there?" is answered by Git history, not a chat log.
- **Reproducibility.** The cluster's desired state is a set of files. You can rebuild it.
- **Rollback as a revert.** Undoing a change is an ordinary Git operation.

## The in-cluster Gitea repository

ArgoCD on Adhar does not read from GitHub. It reads from a Gitea server running inside the management cluster. The controller seeds these repositories under the `adhar` organisation:

| Repository | Holds | Read by |
|---|---|---|
| `adhar/packages` | One directory per package: pre-rendered manifests, `values.yaml`, marketplace contract | The platform ApplicationSets |
| `adhar/environments` | Per-environment package sets and promotion configuration | ApplicationSet generators, Kargo |
| `adhar/adhar-templates` | Golden-path templates, mirrored from GitHub | The CLI and the Console's create wizard |
| `adhar/adhar` | A read-only mirror of the platform source | The in-cluster AI knowledge base |

Keeping the source in-cluster is a deliberate choice. What ArgoCD applies is always what the platform's own Git server holds. An outage at an external forge, or a laptop being switched off, cannot change what the cluster converges to.

Packages are **pre-rendered** Helm charts. There is no in-cluster Helm templating, so the Git diff is the cluster diff. When you review a change, you are reviewing exactly what will be applied.

## Reconciliation: drift is removed, not reported

Every platform package is one element of an ArgoCD ApplicationSet. The sync policy is the part that matters:

```yaml
syncPolicy:
  automated:
    prune: true        # a resource removed from Git is removed from the cluster
    selfHeal: true     # a hand edit is reverted
  syncOptions:
    - ServerSideApply=true
    - SkipDryRunOnMissingResource=true
```

ArgoCD continuously compares live state with the path in Gitea. With self-heal on, anything that differs is overwritten, typically within a minute. Try it on a local cluster with Headlamp, a package the local profile enables:

```bash
kubectl -n adhar-system scale deploy/headlamp --replicas=3
kubectl -n adhar-system get deploy headlamp -w   # returns to the declared replica count
```

This applies to packages ArgoCD delivers. The foundation itself (Cilium, ArgoCD, Gitea, Crossplane) is applied by the Adhar controller and converged by `adhar up` or `adhar upgrade`, not by ArgoCD.

There is no error and no alert. The cluster simply restores what Git declares. That is the point. A control that depends on people avoiding manual changes is a hope. A loop that keeps undoing them is a property of the system.

The ApplicationSets also carry a long `ignoreDifferences` list. These are fields that controllers and admission webhooks add after ArgoCD applies an object. Without them, packages would flap between `Synced` and `OutOfSync` for ever.

## Day-to-day commands

The `adhar gitops` group wraps the ArgoCD operations you use most:

```bash
adhar gitops status -a orders-api                      # sync and health for one app
adhar gitops sync -a orders-api --prune                # sync now, removing untracked resources
adhar gitops rollback -a orders-api --revision <rev>   # point the app at an earlier revision
adhar gitops repo                                      # the repositories ArgoCD uses
```

For platform packages, `adhar stack sync [pkg]` asks ArgoCD to re-compare now instead of at the next resync. That is useful straight after a push.

A note on `rollback`. It patches the ArgoCD Application's `targetRevision` to the revision you name and requests a sync. That is fast, but it is a pin on the cluster object, not a change in Git. Treat it as a break-glass step. The durable rollback is a `git revert` on the offending commit, which ArgoCD then syncs like any other change.

Never roll back with `kubectl set image` or `kubectl edit`. Self-heal reverts it within a minute, and the record of what happened is lost with it.

## Application repositories

Team applications follow the same loop. The `adhar-services` ApplicationSet scans the `adhar` organisation in Gitea. Any repository containing a `.adhar/app.yaml` is adopted automatically, with prune and self-heal on. There is no registration ticket.

When an application is onboarded for multiple environments, the platform scaffolds this layout:

```text
deploy/
├── base/
│   ├── kustomization.yaml
│   ├── rollout.yaml
│   └── service.yaml
└── envs/
    ├── dev/kustomization.yaml
    ├── test/kustomization.yaml
    └── prod/kustomization.yaml
```

Everything that differs between environments lives in that environment's overlay: replica counts, resource limits, a feature flag. CI never deploys. It builds, scans, signs, and then **commits** a write-back. ArgoCD deploys the commit. Your deployment history is your Git history.

## Promotion with Kargo

Promotion on Adhar is a Git change too. One build produces one signed image. Kargo records it as **Freight**, a content-addressed record of the image digest, and moves that same Freight from stage to stage. Nothing is rebuilt between environments.

The environments are `dev`, `test` and `prod`. These are the only names the `Project` schema accepts. Dev and test auto-promote. Prod never does.

A prod change arrives as a `Release`, an object you can review and list:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Release
metadata:
  name: checkout-prod-2026-10-15   # a new Release per promotion; Promotions are immutable
  namespace: adhar-system
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: kargo
  parameters:
    project: payments
    application: checkout
    environment: prod
    freight: f7c9e2a1b4d8365f0a9c1e7b2d4f6a8c3e5b7d91
    reason: "CHANGE-1234, approved by the release owner"
```

Each environment deploys from its own **rendered branch**, `stage/<env>`, not from `main`. A promotion checks out `main`, pins the image digest in that environment's overlay (`deploy/envs/<env>/kustomization.yaml`) in Kargo's working copy only, renders the overlay with `kustomize build`, and pushes the result to `stage/<env>`. ArgoCD then syncs that branch. Kargo never writes to the cluster, and the digest edit is never pushed back to `main`. A rollback is a new `Release` that names an older Freight.

Why a digest and not a tag? CI pushes each build as `:latest` and `:<commit sha>`. The next build can move a tag, but it cannot move a digest. Pinning the digest means the cluster runs exactly the bytes that passed scanning and signing.

Kargo and Argo Rollouts are on in the production profile and off locally. To try promotion on a laptop:

```bash
adhar stack enable cert-manager kargo argo-rollout   # Kargo's webhook needs cert-manager
adhar upgrade
```

## Changing the platform itself

The platform follows the same discipline. You never `kubectl apply` against a managed object. You change the stack in your checkout and push it with `adhar upgrade`:

```bash
adhar stack conflicts            # mutual-exclusion rules, and any you violate
adhar stack enable harbor        # edits the ApplicationSet and environment config; commits nothing
adhar upgrade --diff-only        # per-repository file diff; touches nothing
adhar upgrade                    # converge the foundation, then push the stack
```

`adhar upgrade` has two phases. First it re-applies the foundation components embedded in the binary. Then it clones `packages` and `environments` from Gitea, diffs them against your local stack and, after you confirm, **force-pushes** the stack.

Read the `--diff-only` output line by line. A `D` means something is in Gitea but missing from your local stack. Usually that is a customisation someone committed straight to Gitea. If you push without copying it into your stack first, it is removed.

Expect a burst of `OutOfSync` afterwards. Every platform Application tracks the whole `packages` repository at `HEAD`, so any push gives all of them a new target revision. The fleet typically settles in 5 to 15 minutes. Judge health after that, not during.

## Common pitfalls

| Symptom | Cause | What to do |
|---|---|---|
| A package vanished after `adhar stack disable` | `prune: true` — ArgoCD **uninstalls** a disabled package | Treat disable as destructive; back up any state first |
| `adhar stack enable` refuses | A hard exclusion, such as `vault` with `openbao`, or `vllm-cpu` with `vllm-gpu` | Run `adhar stack conflicts` and disable one side |
| Two packages flap `Degraded` with no reason | Both claim the same object in `adhar-system` | `adhar stack conflicts` |
| Your `kubectl edit` keeps disappearing | Self-heal | Change `values.yaml`, re-render, `adhar upgrade` |
| Editing the ApplicationSet in Gitea does nothing | The controller applies it from the stack, not from Gitea | Edit it in your checkout |
| A customisation disappeared after an upgrade | It existed in Gitea but not in your local stack | Check for `D` lines in `--diff-only` before every push |
| A config patch on `main` hasn't reached prod | Environments sync their rendered `stage/<env>` branch, so overlay changes on `main` travel with the next promotion | Promote to roll the change out; review `deploy/envs/prod` changes like releases |
| Your edit to `stage/<env>` disappeared | The rendered branch is rewritten on every promotion | Change the overlay on `main` and promote, never edit `stage/<env>` by hand |
| Schema error on `staging` | Only `dev`, `test` and `prod` are valid | Map your names to those three |
| `kubectl get applications` shows the wrong objects | Argo CD and Adhar both define `Application` | Use `applications.platform.adhar.io` |

The pattern behind most of these is the same. Someone tried to change the system somewhere other than Git, or two writers ended up owning the same thing. Keep one writer per field, and keep that writer in Git.

## Next steps

- [Architecture](/docs/core-concepts/architecture) explains the GitOps write path and the package model in depth.
- [Promote Across Environments](/docs/guides/promote-across-environments) walks through Kargo promotion and rollback step by step.
- [Upgrade the Platform](/docs/guides/upgrade-the-platform) covers `adhar upgrade`, the post-push churn and how to back out.
- The [CLI Reference](/docs/reference/cli) lists every `adhar gitops`, `adhar stack` and `adhar upgrade` flag.
