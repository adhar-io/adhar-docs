---
title: "Promote Across Environments"
section: "Guides"
order: 2
path: "/docs/guides/promote-across-environments"
---

# Promote Across Environments

This guide moves one application through the platform's promotion chain: dev, then test, then prod. It also shows how to move back when a release goes wrong.

Promotion on Adhar is a **Git change**. Each environment is an overlay directory in the application's own repository. Promoting means committing an image digest into the next overlay. Kargo makes that commit, and ArgoCD applies it.

This guide is for developers and release owners whose application already builds through the platform's CI. By the end you will be able to see what is running where, promote by hand when policy requires it, and roll back without touching the cluster.

## What you will build

```diagram
ha-promotion-chain
```

One build produces one signed image. Kargo records it as **Freight**, a content-addressed record of the image digest. Kargo then moves that same Freight from stage to stage. Nothing is rebuilt between environments, so what you tested is byte-for-byte what you ship.

> **The environments are `dev`, `test` and `prod`.** These are the only names the `Project` schema accepts: its `environments[].name` and `tier` are enums of exactly those three. Adhar has no `staging` or `production` environment. If your organisation uses those words, map them to `test` and `prod`.

### Prerequisites

| You need | Why | Check with |
|---|---|---|
| Kargo and Argo Rollouts | Promotion engine, and the workload kind the overlays use | `adhar stack status kargo` · `adhar stack status argo-rollout` |
| A Project with environments | It owns the namespaces, the Kargo project and the promotion policy | `kubectl -n adhar-system get projects.platform.adhar.io` |
| An application repo in the `adhar` Gitea organisation, built by `app-ci` | Kargo's Warehouse watches the image CI publishes to Harbor | A green `app-ci` PipelineRun for the repo |
| Access to the Kargo UI or CLI | To inspect Freight and approve prod | `https://kargo.<host>` |

Kargo and Argo Rollouts are on in the **production** profile and off in the local one. On a laptop, turn them on.

`adhar stack enable` is a Git change, not a cluster call. It edits the profile's ApplicationSet file and its mirrored environment config, then stops. These live under `platform/stack` by default; use `--stack-dir` to point elsewhere. Review the diff, then converge:

```bash
adhar stack enable kargo argo-rollout
git diff -- platform/stack         # review what changed
adhar upgrade
```

See [Platform Services](/docs/core-concepts/platform-services) for how packages are enabled and delivered.

The rest of this guide uses a project called `payments` (see [Onboard a Team](/docs/guides/onboard-a-team)). It also uses an application called `checkout`, whose repository is `adhar/checkout` in Gitea.

## How promotion works

Three objects decide everything, and each has one job.

**The `Project` decides where environments live and who may promote into them.** It composes one `Environment` per entry. By default these are `dev`, `test` and `prod`, in namespaces `<project>-dev`, `<project>-test` and `<project>-prod`. It publishes the resolved list on `status.environments`.

The `Project` also creates the project's Kargo `Project` and a `ProjectConfig`. The promotion policy there is: dev and test auto-promote, prod never does. That rule lives in one object per project, not per application.

**The application `Application` decides what gets promoted.** Its multi-environment composition is `application-multienv`. It reads the project's `status.environments` through an observe-only object, so an application never guesses a namespace. For each environment it creates:

- an ArgoCD Application `<project>-<app>-<env>`. It deploys `deploy/envs/<env>` from your repository into that environment's namespace, auto-synced with self-heal.
- a Kargo Stage `<app>-<env>`, chained in the project's order. The first Stage takes Freight straight from the Warehouse. Each later Stage takes it only from its upstream Stage.

It also creates one Kargo Warehouse. The Warehouse watches the image repository `<project.imageRegistry>/<app>` (Harbor's `library` project by default).

**The overlay is the unit of change.** Each Stage's promotion runs five steps, and only one of them edits anything:

```diagram
ha-promotion-steps
```

`kustomize-set-image` rewrites the `images:` block of exactly one `kustomization.yaml`. So a promotion cannot disturb another environment's replica count, hostname or resource limits. It also never writes to a cluster. The cluster changes only because ArgoCD syncs the commit.

**Why the digest, not the tag.** CI pushes every build twice, as `:latest` and `:<commit sha>`, and cosign signs that artifact. The next build can move a tag, but it cannot move a digest. Pinning `sha256:…` makes the cluster run exactly the bytes that passed scanning and signing. It is also what the signature policy can verify.

## Step 1 — Put the overlays in the repository

The platform writes the overlay layout for you with the Tekton pipeline `app-onboard-environments` in `adhar-system`. It runs two tasks:

- `app-env-scaffold` writes `deploy/base` and one `deploy/envs/<env>` per environment of the project. It reads the namespaces from `Project.status.environments`.
- `app-env-register` applies the `Application` that composes everything above.

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

The scaffold is idempotent. It leaves a repository that already has `deploy/envs` alone, so you can safely run it again.

**Verify:**

```bash
kubectl -n adhar-system get pipelineruns | grep onboard-checkout
kubectl -n adhar-system get applications.platform.adhar.io checkout
kubectl -n adhar-system get applications.argoproj.io | grep payments-checkout
```

You should see:

- The PipelineRun reports `Succeeded`.
- The `Application` exists, and its status message counts healthy environments (`n/3 environments healthy`).
- ArgoCD lists `payments-checkout-dev`, `payments-checkout-test` and `payments-checkout-prod`.

The repository now looks like this:

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

## Step 2 — Own the per-environment configuration

Everything that differs between environments belongs in that environment's overlay. The scaffold starts you with different replica counts and canary pauses. Here is the generated prod overlay, with comments:

```yaml
# deploy/envs/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: payments-prod          # from Project.status.environments — never edit by hand
resources:
  - ../../base
images:                           # KARGO OWNS THIS BLOCK — it rewrites it on promotion
  - name: harbor-core.adhar-system.svc.cluster.local/library/checkout
    newTag: latest                # replaced by a digest on the first promotion
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

1. **Never edit the `images:` block.** It belongs to Kargo. A hand edit there makes you a second writer, and the next promotion overwrites it.
2. **Configuration changes are not promoted.** A patch you commit to `deploy/envs/prod` reaches prod as soon as ArgoCD syncs, because every environment's ArgoCD Application tracks `main`. Only the *image* moves through the chain. Review prod overlay changes as carefully as a release.

**Verify** that each environment renders what you expect, before you push:

```bash
kustomize build deploy/envs/prod | grep -E 'namespace:|replicas:|image:'
```

## Step 3 — Watch the first promotion

Push a change to the application's source. Then this happens:

1. `app-ci` builds, tests, scans, signs and publishes the image.
2. The Warehouse discovers the image and creates Freight.
3. The dev Stage auto-promotes it.
4. Once dev's Rollout is Healthy, test auto-promotes the same Freight.

**Verify** the Freight and where it has landed:

```bash
kargo get freight --project payments
kargo get stages --project payments
```

Or open `https://kargo.<host>` and choose project `payments`. The pipeline view shows the Warehouse, the three Stages, and which Freight each one holds.

Then find the commit that made the change, in the repository:

```bash
git pull
git log --oneline -3 -- deploy/envs/dev
grep -A3 'images:' deploy/envs/dev/kustomization.yaml
```

The log shows a `promote(dev): sha256:…` commit. The overlay now pins a `digest:` instead of `newTag: latest`. Check that the cluster agrees:

```bash
kubectl -n payments-dev get rollout checkout \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

The image ends in `@sha256:` followed by the same digest.

## Step 4 — Promote to prod with a Release

Production is never auto-promoted. By default, the owning team has only `view` in the prod namespace.

A prod change arrives as a **`Release`**: one promotion of one Freight into one environment, as an object you can review and list. It composes a Kargo `Promotion` against the Stage `<application>-<environment>`. Kargo fills in the steps from the Stage, so a Release cannot carry a pipeline that drifts from it.

Find the Freight that test is running:

```bash
kargo get freight --project payments
```

Use the Freight **name** (the 40-character content hash), not its alias. An alias looks like a name but resolves to nothing.

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
    application: checkout
    environment: prod               # → Stage checkout-prod
    freight: f7c9e2a1b4d8365f0a9c1e7b2d4f6a8c3e5b7d91
    reason: "CHANGE-1234 — approved by @release-owner"   # recorded on the Promotion
```

Commit it to the repository your platform team syncs for these objects. Or apply it directly, if your role allows. Check first rather than assume:

```bash
kubectl auth can-i create releases.platform.adhar.io -n adhar-system
kubectl apply -f release-checkout-prod.yaml
```

The Kargo CLI does the same in one line, but leaves no object to review:

```bash
kargo promote --project payments --stage checkout-prod --freight <freight-name>
```

**Verify:**

```bash
kubectl -n adhar-system get releases.platform.adhar.io checkout-prod-2026-10-15 \
  -o jsonpath='{.status.phase}{"  "}{.status.stage}{"\n"}'
kubectl -n payments get promotions
```

The Release's phase moves from `Pending` to `Succeeded`, with stage `checkout-prod`. The Promotion carries the labels `adhar.io/release` and the annotation `adhar.io/reason`.

Because of the `argocd-update` step, `Succeeded` appears only after ArgoCD has applied the commit and the prod Rollout is Healthy.

## Step 5 — Roll back

A rollback is a promotion of an **older** Freight. Nothing is rebuilt, and nothing is edited by hand.

```bash
kargo get freight --project payments      # pick the Freight prod ran before
```

Create a new Release that names it. It must be a new object, because Promotions are immutable:

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

**Verify** the same way as in Step 4. The Release reaches `Succeeded`, and the prod Rollout's image digest is the previous one.

**When Kargo itself is unavailable,** the fallback is still a Git change. Run `git revert` on the `promote(prod): …` commit on `main`, and push. ArgoCD syncs the previous digest.

Kargo's view of what prod holds will then disagree with Git until the next promotion. Treat this as an emergency-only (break-glass) step, and follow it with a proper Release.

> **Do not roll back with `kubectl`.** Every environment's ArgoCD Application runs with self-heal. ArgoCD reverts a `kubectl set image` or `kubectl edit` within a minute, and the record of what happened is lost with it.

## The platform's own promotion

The platform promotes its *own* configuration the same way. The `kargo` package creates a Kargo project called `adhar-environments` over the platform's environments repository. It has the same three stages and the same policy: dev and test automatic, prod manual.

The per-environment platform configuration lives in `platform/stack/environments/<env>/config.yaml` (`dev`, `test`, `prod`, plus `local`). You do not need it for application promotion. It is the reason the Kargo UI shows a second project.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Application` stuck `Pending`: `waiting for project "…" to publish its environments` | The Project is missing, in a different namespace, or not yet reconciled | Create the Project in the same namespace as the Application; `kubectl -n adhar-system get projects.platform.adhar.io` |
| `app-env-scaffold` fails: `Project … has not published its environments yet` | Same cause, seen from the pipeline | Wait for the Project's `READY=True`, then re-run |
| Schema error on `staging` or `production` | Only `dev`, `test`, `prod` are valid | Rename the environment |
| No Freight ever appears | Kargo is off, CI has not published an image, or the Warehouse watches a different repository | `adhar stack status kargo`; check Harbor for `library/<app>`; set `parameters.image.repository` if you publish elsewhere |
| Freight in dev never reaches test | dev's Rollout is not Healthy, so the upstream Stage has not verified it | `kubectl -n payments-dev get rollout checkout`; fix dev first |
| prod never moves on its own | By design — `autoPromote` is false for prod | Create a Release |
| Release `Failed`, Kargo rejects `.spec.freight` | An alias was used, or the Freight is not available to the prod Stage | Use the 40-hex Freight name that test has verified |
| ArgoCD rejects the sync: destination not permitted | The overlay's namespace is not one of the Project's environments, or the repo is outside the organisation | Do not hand-edit `namespace:`; add extra repos through `allowedSourceRepos` |
| A config patch hit prod without a promotion | Overlays are tracked on `main` for every environment | Review `deploy/envs/prod` changes like releases; protect the path in Gitea |
| Promotion commit fails to push | Kargo's Git credential cannot reach the repo | The Project's `kargo-git` ExternalSecret must be Ready: `kubectl -n payments get externalsecret kargo-git` |

## Next steps

- **[Onboard a Team](/docs/guides/onboard-a-team)** — the Project this guide assumes, and the RBAC behind "view in prod"
- **[Preview Environments per Pull Request](/docs/guides/preview-environments)** — a deployment per PR, before anything reaches dev
- **[The Paved Road to Production](/docs/platform-engineering/paved-road)** — why scanning, signing and promotion are ordered this way
- **[Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service)** — give the promoted service its state
- **[Upgrade the Platform](/docs/guides/upgrade-the-platform)** — the same Git-first discipline, applied to the platform itself
