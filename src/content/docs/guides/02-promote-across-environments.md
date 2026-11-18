---
title: "Promote Across Environments"
section: "Guides"
order: 2
path: "/docs/guides/promote-across-environments"
---

# Promote Across Environments

This guide moves one application through the platform's promotion chain, dev → test → prod, and back again when a release goes wrong. It is for developers and release owners whose application already builds through the platform's CI. You will see what runs where, promote to prod with a reviewable object, and roll back without touching the cluster.

## What you'll build

```diagram
ha-promotion-chain
```

Promotion on Adhar is a **Git change**. One build produces one signed image. [Kargo](https://kargo.io), the promotion engine, records it as **Freight**, a content-addressed record of the image digest. Kargo then moves that same Freight from **Stage** to Stage (a Stage is Kargo's name for one environment in the chain). Each promotion renders the environment's Kustomize overlay with the digest pinned and commits the result to that environment's branch. ArgoCD, the GitOps sync engine, applies the commit.

Nothing is rebuilt between environments, so what you tested is byte-for-byte what you ship.

> **Note:** The environments are `dev`, `test` and `prod`. The `Project` schema accepts only those names for `environments[].name` and `tier`. If your organisation says `staging` and `production`, map them to `test` and `prod`.

## Prerequisites

- **Kargo, Argo Rollouts and cert-manager.** Kargo is the promotion engine, the overlays use Argo Rollouts as the workload kind, and Kargo's webhook needs cert-manager certificates. Check with `adhar stack status kargo`, `adhar stack status argo-rollout` and `adhar stack status cert-manager`.
- **A Project with environments, in `adhar-system`.** It owns the namespaces, the Kargo project, the Stages and the promotion policy. Check with `kubectl -n adhar-system get projects.platform.adhar.io`. This guide uses a project called `payments`; see [Onboard a Team](/docs/guides/onboard-a-team).
- **An application repository in the `adhar` Gitea organisation, built by `app-ci`.** This guide uses `adhar/checkout`. You need a green `app-ci` PipelineRun for it, because Kargo watches the image CI publishes to Harbor.
- **Access to the Kargo UI (`https://kargo.<host>`) or the `kargo` CLI**, to inspect Freight.

All three packages are on in both the local and the production profile, so a fresh platform, including one on a laptop, can promote with no extra setup.

## How it works

Two objects create everything promotion needs:

```diagram
nga-promotion-objects
```

**The `Project` decides where environments live, who may promote into them, and the chain.** It composes one `Environment` per entry (by default `dev`, `test` and `prod`, in namespaces `<project>-dev`, `<project>-test` and `<project>-prod`) and publishes the resolved list on `status.environments`. In its home namespace `<project>` it also creates:

- the Kargo `Project`;
- a `ProjectConfig` holding the promotion policy: dev and test auto-promote, prod never does;
- the shared Stages `dev`, `test` and `prod`, chained in that order. The `dev` Stage takes Freight from each application's Warehouse; each later Stage takes it only from its upstream Stage.

Stages belong to the project, not the application. Every application in the project is promoted through the same three.

**The `Application` decides what gets promoted.** Its default composition, `application-multienv`, reads the project's `status.environments`, so an application never guesses a namespace. It creates:

- one ArgoCD Application `<project>-<app>-<env>` per environment. It syncs the **rendered branch** `stage/<env>` of your repository into that environment's namespace, with automatic sync, prune and self-heal. Its annotation `kargo.akuity.io/authorized-stage: <project>:<env>` names the only Stage allowed to update it.
- one Kargo Warehouse `<app>` in namespace `<project>`. It watches the image repository `<imageRegistry>/<app>` (Harbor's `library` project by default) and accepts only tags that are a full 40-character commit SHA, which is what `app-ci` signs.
- a one-off Job that seeds each `stage/<env>` branch from `main`, so ArgoCD has something to sync before the first promotion.

**A promotion is a commit on `stage/<env>`.** Each promotion into an environment runs these steps for the application whose Freight is moving:

```diagram
ha-promotion-steps
```

| Step | What it does |
|---|---|
| `git-clone` | Checks out `main` into `./src` and `stage/<env>` into `./out` |
| `kustomize-set-image` | Pins the image **digest** in `./src/deploy/envs/<env>/kustomization.yaml`. The edit stays in Kargo's working copy and never reaches `main` |
| `git-clear` | Empties `./out` |
| `kustomize-build` | Renders the overlay into `./out/manifests.yaml` |
| `git-commit` | Records `promote(<env>): <app> <image>@sha256:… [skip ci]`. `[skip ci]` stops the commit from triggering another build |
| `git-push` | Pushes to `stage/<env>` |
| `argocd-update` | Waits until ArgoCD has applied that commit and the application is Healthy |

Two consequences follow:

- Only promotions into an environment write to its branch, so a promotion cannot disturb another environment's replica count, hostname or resource limits.
- Kargo never writes to the cluster. The cluster changes only because ArgoCD syncs the commit.

**Why the digest, not the tag.** CI pushes every build as `:latest` and `:<commit sha>`, and cosign signs that artifact. A later build can move a tag but not a digest. Pinning `sha256:…` makes the cluster run exactly the bytes that passed scanning and signing, and it is what the signature policy can verify.

## Step 1 — Put the overlays in the repository

The Tekton pipeline `app-onboard-environments` in `adhar-system` writes the overlay layout for you. It runs two tasks:

| Task | What it does |
|---|---|
| `app-env-scaffold` | Writes `deploy/base` and one `deploy/envs/<env>` per environment of the project, and pushes them to `main`. It reads the namespaces and the image registry from the Project's `status`. |
| `app-env-register` | Applies an `Application` named after the repository, in `adhar-system`, which composes the objects described above. |

```yaml
# onboard-checkout.yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: onboard-checkout-
  namespace: adhar-system
spec:
  pipelineRef:
    name: app-onboard-environments
  taskRunTemplate:
    serviceAccountName: adhar-pipeline   # may read projects and write applications
  params:
    - { name: repo-name, value: checkout }   # the Gitea repo adhar/checkout
    - { name: project,   value: payments }   # read from adhar-system
    - { name: port,      value: "8080" }     # the container port
```

```bash
kubectl create -f onboard-checkout.yaml
```

Use `kubectl create`, not `apply`: `generateName` gives each run a fresh name, and `apply` refuses objects without a fixed name. The scaffold is idempotent. It leaves a repository that already has `deploy/envs` alone, so you can run it again.

The `main` branch now looks like this:

```text
deploy/
├── base/
│   ├── kustomization.yaml
│   ├── rollout.yaml        # an Argo Rollout, canary 25% → 50% with pauses
│   └── service.yaml
└── envs/
    ├── dev/kustomization.yaml
    ├── test/kustomization.yaml
    └── prod/kustomization.yaml
```

**Check:**

```bash
kubectl -n adhar-system get pipelineruns | grep onboard-checkout
kubectl -n adhar-system get applications.platform.adhar.io checkout
kubectl -n adhar-system get applications.argoproj.io | grep payments-checkout
git ls-remote https://gitea.<host>/adhar/checkout.git 'refs/heads/stage/*'
```

- The PipelineRun reports `Succeeded`.
- The `Application` exists, and its status message counts healthy environments (`n/3 environments healthy`).
- ArgoCD lists `payments-checkout-dev`, `payments-checkout-test` and `payments-checkout-prod`.
- The seed Job created the branches `stage/dev`, `stage/test` and `stage/prod`.

## Step 2 — Own the per-environment configuration

Everything that differs between environments belongs in that environment's overlay on `main`. The scaffold starts you with different replica counts and canary pauses (`10s` in dev, `30s` in test, `120s` in prod). This is the generated prod overlay:

```yaml
# deploy/envs/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: payments-prod          # from Project.status.environments — never edit by hand
resources:
  - ../../base
images:                           # KARGO OWNS THIS BLOCK — it overrides it on every promotion
  - name: harbor-core.adhar-system.svc.cluster.local/library/checkout
    newTag: latest                # a placeholder; the rendered branch always pins a digest
patches:                          # YOU OWN THESE — environment-specific settings
  - target: { kind: Rollout, name: checkout }
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 2
      - op: replace
        path: /spec/strategy/canary/steps/1/pause/duration
        value: 120s
      - op: replace
        path: /spec/strategy/canary/steps/3/pause/duration
        value: 120s
```

Add your own patches here: resource limits, a feature flag in a ConfigMap, a different hostname. Two rules keep promotion clean:

1. **Never edit the `images:` block.** Every promotion sets the digest there before rendering, so a hand edit has no effect on what deploys and only misleads the next reader.
2. **Configuration changes travel with the next promotion.** ArgoCD syncs `stage/<env>`, not `main`. A patch you commit to `deploy/envs/prod` on `main` reaches prod only when the next promotion into prod renders the overlay again. Review prod overlay changes as carefully as a release.

**Check:** each environment renders what you expect, before you push.

```bash
kustomize build deploy/envs/prod | grep -E 'namespace:|replicas:|image:'
```

## Step 3 — Watch the first promotion

Push a change to the application's source. Then:

1. `app-ci` builds, tests, scans, signs and publishes the image.
2. The Warehouse discovers the image and creates Freight.
3. The dev Stage auto-promotes it.
4. Once dev's Rollout is Healthy, test auto-promotes the same Freight.

See the Freight and where it has landed:

```bash
kargo get freight --project payments
kargo get stages --project payments
```

Or open `https://kargo.<host>` and choose project `payments`. The pipeline view shows the Warehouse, the three Stages, and the Freight each one holds.

**Check:** the promotion commit is on the rendered branch `stage/dev`, not on `main`, and the cluster runs the digest it pins.

```bash
git fetch origin
git log --oneline -3 origin/stage/dev
git show origin/stage/dev:manifests.yaml | grep 'image:'
kubectl -n payments-dev get rollout checkout \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

- The log shows a `promote(dev): checkout …@sha256:… [skip ci]` commit.
- The rendered manifest and the live Rollout both end in `@sha256:` with the same digest.

## Step 4 — Promote to prod with a Release

Production is never auto-promoted, and by default the owning team has only `view` in the prod namespace. A prod change arrives as a **`Release`**: one promotion of one Freight into one environment, as an object you can review and list.

```diagram
nga-release-flow
```

The Release's composition runs a one-off Job, as the ServiceAccount `adhar-release` in the project namespace. The Job creates a Kargo `Promotion` against the project's Stage named after the environment, here `prod`. Kargo fills in the steps from the Stage, so a Release cannot carry a pipeline that drifts from it.

1. Find the Freight that test is running:

   ```bash
   kargo get freight --project payments
   ```

   Use the Freight **name** (the 40-character content hash), not its alias. An alias looks like a name but resolves to nothing.

2. Write the Release:

   ```yaml
   # release-checkout-prod.yaml
   apiVersion: platform.adhar.io/v1alpha1
   kind: Release
   metadata:
     name: checkout-prod-2026-10-15   # a new Release per promotion; Promotions are immutable
     namespace: adhar-system           # alongside the Project and Application
   spec:
     crossplane:
       compositionSelector:
         matchLabels:
           provider: kargo
     parameters:
       project: payments               # the Kargo project namespace the Stage lives in
       application: checkout           # whose Warehouse produced the Freight
       environment: prod               # dev | test | prod → the project's Stage `prod`
       freight: f7c9e2a1b4d8365f0a9c1e7b2d4f6a8c3e5b7d91
       reason: "CHANGE-1234 — approved by @release-owner"   # recorded on the Promotion
   ```

3. Commit it to the repository your platform team syncs for these objects. Or apply it directly, if your role allows:

   ```bash
   kubectl auth can-i create releases.platform.adhar.io -n adhar-system
   kubectl apply -f release-checkout-prod.yaml
   ```

The Kargo CLI does the same in one line, but leaves no object to review:

```bash
kargo promote --project payments --stage prod --freight <freight-name>
```

**Check:**

```bash
kubectl -n adhar-system get releases.platform.adhar.io checkout-prod-2026-10-15 \
  -o jsonpath='{.status.phase}{"  "}{.status.stage}{"\n"}'
kubectl -n payments get promotions -l adhar.io/release=checkout-prod-2026-10-15
```

- The Release's phase moves from `Pending` to `Submitted`, with stage `prod`. `Submitted` means the Promotion was handed to Kargo; it does not yet mean prod runs the new image.
- The Promotion carries the labels `adhar.io/project`, `adhar.io/application`, `adhar.io/environment` and `adhar.io/release`, and the annotations `adhar.io/reason` and `adhar.io/released-by`.
- The Promotion's phase reaches `Succeeded`. Because of the `argocd-update` step, that happens only after ArgoCD has applied the commit and the prod Rollout is Healthy.

If the Release shows `Failed`, read the logs of its Job, `release-<release-name>`, in the project namespace:

```bash
kubectl -n payments logs job/release-checkout-prod-2026-10-15
```

## Step 5 — Roll back

A rollback is a promotion of **older** Freight. Nothing is rebuilt, and nothing is edited by hand.

1. Pick the Freight prod ran before:

   ```bash
   kargo get freight --project payments
   ```

2. Create a new Release that names it. It must be a new object, because Promotions are immutable:

   ```yaml
   apiVersion: platform.adhar.io/v1alpha1
   kind: Release
   metadata:
     name: checkout-prod-2026-10-15-rollback
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
       freight: <previous-freight-name>
       reason: "INC-88 — roll back checkout to the previous release"
   ```

**Check:** as in Step 4. The Release reaches `Submitted`, its Promotion reaches `Succeeded`, and the prod Rollout's image digest is the previous one.

**If Kargo itself is unavailable,** the fallback is still a Git change. Run `git revert` on the latest `promote(prod): …` commit on `stage/prod` and push. ArgoCD syncs the previous rendered manifests. Kargo's view of what prod holds then disagrees with Git until the next promotion, so treat this as break-glass and follow it with a proper Release.

> **Warning:** Do not roll back with `kubectl`. Every environment's ArgoCD Application runs with self-heal, so ArgoCD reverts a `kubectl set image` or `kubectl edit`, and the record of what happened is lost with it.

## The platform's own promotion

The Kargo UI shows a second project, `adhar-environments`. The `kargo` package creates it over the platform's environments repository to promote the platform's *own* configuration, with the same three stages and the same policy: dev and test automatic, prod manual. That configuration lives in `platform/stack/environments/<env>/config.yaml` (`dev`, `test`, `prod`, plus `local`). You do not need it for application promotion.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Application` stuck `Pending`: `waiting for project "…" to publish its environments` | The Project is missing, in a different namespace, or not yet reconciled | Create the Project in the same namespace as the Application; `kubectl -n adhar-system get projects.platform.adhar.io` |
| `app-env-scaffold` fails: `Project … has not published its environments yet` | Same cause, seen from the pipeline | Wait for the Project's `READY=True`, then re-run |
| Schema error on `staging` or `production` | Only `dev`, `test` and `prod` are valid | Rename the environment |
| No Freight ever appears | Kargo is off, CI has not published an image, or the Warehouse watches a different repository | `adhar stack status kargo`; check Harbor for `library/<app>`; set `parameters.image.repository` if you publish elsewhere |
| Warehouse finds no Freight although images exist in Harbor | It accepts only full 40-character commit-SHA tags | Publish through `app-ci`; `latest` and other tags are ignored by design |
| Freight in dev never reaches test | dev's Rollout is not Healthy, so the upstream Stage has not verified it | `kubectl -n payments-dev get rollout checkout`; fix dev first |
| prod never moves on its own | By design: `autoPromote` is false for prod | Create a Release |
| Release `Failed` | The Release Job could not create the Promotion: an alias was used, or the Freight is not available to the prod Stage | `kubectl -n payments logs job/release-<name>`; use the 40-hex Freight name that test has verified |
| Release `Submitted` but prod has not changed | The Promotion is still running, or failed inside Kargo | `kubectl -n payments get promotions -l adhar.io/release=<name>`; open the Stage in the Kargo UI |
| ArgoCD rejects the sync: destination not permitted | The overlay's namespace is not one of the Project's environments, or the repository is outside the organisation | Do not hand-edit `namespace:`; add extra repositories through `allowedSourceRepos` |
| A config patch on `main` has not reached prod | ArgoCD syncs `stage/prod`, which only a promotion into prod rewrites | Create a new Release; it may name the Freight prod already runs |
| `argocd-update` fails with "not authorized" | The ArgoCD Application lacks the `kargo.akuity.io/authorized-stage` annotation, usually after a hand edit | Let the `Application` re-compose it; do not edit the ArgoCD Application directly |
| Promotion commit fails to push | Kargo's Git credential cannot reach the repository | The Project's `kargo-git` ExternalSecret must be Ready: `kubectl -n payments get externalsecret kargo-git` |

## Next steps

- **[Onboard a Team](/docs/guides/onboard-a-team)** — the Project this guide assumes, and the RBAC behind "view in prod"
- **[Preview Environments per Pull Request](/docs/guides/preview-environments)** — a deployment per PR, before anything reaches dev
- **[The Paved Road to Production](/docs/platform-engineering/paved-road)** — why scanning, signing and promotion are ordered this way
- **[Upgrade the Platform](/docs/guides/upgrade-the-platform)** — the same Git-first discipline, applied to the platform itself
