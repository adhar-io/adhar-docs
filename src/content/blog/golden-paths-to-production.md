---
title: "From template to production on a golden path"
excerpt: "Follow one service from a golden-path template through Buildpacks, Trivy, Cosign, Harbor, Kyverno admission and ArgoCD, with a preview environment on the way."
category: "DevOps"
author: "Adhar Team"
date: "2026-09-11"
featured: false
tags: ["Golden Paths", "Supply Chain", "Tekton", "Kyverno", "ArgoCD", "GitOps"]
---

A golden path is easy to describe and hard to judge from the outside. "Scaffold a service and ship it" sounds like every template generator ever written. The difference shows up after the scaffold: what builds the image, what checks it, what signs it, what refuses to run it if something is wrong, and what keeps the cluster matching Git.

This post follows one service, `orders-api`, from a template to a running workload on Adhar. At each stage we show the command, what the platform does, and why the stage exists. Everything here runs on a local Kind platform from `adhar up`. The commands are the same on a cloud; only the host name changes.

## The route at a glance

| Stage | What runs | What it guarantees |
|---|---|---|
| Scaffold | Golden-path template, new Gitea repository | A known-good starting shape |
| Declare | An `Application` resource | Intent lives in Git, not in someone's terminal |
| Build | Tekton with Cloud Native Buildpacks | No hand-written Dockerfile; base images are a platform concern |
| Scan | Trivy, gated by policy | Known vulnerabilities are caught before signing |
| Sign | Cosign | The image provably came out of this pipeline |
| Store | Harbor | One registry, with every build tagged by commit |
| Admit | Kyverno | The cluster refuses images that fail policy |
| Deliver | ArgoCD, reconciling from Gitea | The cluster is a copy of Git |

The order matters. Each stage adds a guarantee the next one relies on. By the time a Pod is admitted, the platform can say where its image came from and that nothing has changed it since.

## Step 1: Scaffold from a template

Templates are the platform's golden paths. They live in the `adhar/adhar-templates` repository in the in-cluster Gitea, and the Console's create wizard offers the same collection. A service scaffolded from the CLI and one scaffolded from the portal are the same service.

Start by asking the platform which paths it offers, and what a chosen one needs:

```bash
adhar application templates                  # the templates on your platform
adhar application templates microservice     # the parameters this one accepts
```

Check the parameters before you deploy. A missing required parameter produces a failure that looks random.

The `Application` is namespaced, and nothing creates the namespace for you:

```bash
kubectl create namespace orders
adhar application deploy orders-api --template microservice -n orders \
  --path manifests --project default --wait
```

`--path manifests` tells ArgoCD which directory of the new repository to deploy; the shipped skeletons keep their manifests there. `--project default` uses ArgoCD's unrestricted `default` project, because the CLI's own default (`--project adhar`) only admits the platform Project's namespaces. In a team Project, pass the team's project instead.

Three things happen, in order:

1. **Scaffold.** The CLI fills in the template and commits the result to a new Gitea repository, `adhar/orders-api`, as a single commit on `main`.
2. **Declare.** It creates an `Application` named `orders-api` that points at that repository.
3. **Reconcile.** Crossplane selects a composition and produces an ArgoCD Application. ArgoCD syncs the manifests.

The resource it creates is exactly what you would write by hand:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Application
metadata:
  name: orders-api
  namespace: orders
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local          # chosen for you on Kind
        feature: application
  parameters:
    project: default
    source:
      repoURL: <platform Gitea URL>/adhar/orders-api.git
      path: <the template's manifest path>
      targetRevision: main
    destination:
      namespace: orders
      server: https://kubernetes.default.svc
```

**Why this stage exists.** The template removes choices on purpose: one build system, one deployment shape, one way to expose the service. The `Application` records intent in a form the platform can reconcile, so the same request behaves identically on Kind and on a cloud.

## Step 2: Push code, and the pipeline takes over

From here, the developer's job is to push commits. On every push to `main`, a Gitea webhook starts the platform's `app-ci` Tekton pipeline. The pipeline is sequential where there is a real dependency and parallel everywhere else:

1. **Clone** the repository and detect the toolchain.
2. **Build** with Cloud Native Buildpacks, which detect Java, Go, Node and Python. There is no Dockerfile in the repository.
3. In parallel: **test** with the detected toolchain, scan the source for leaked secrets with **gitleaks**, scan dependencies, scan the built image with **Trivy**, and generate an **SBOM** with Syft.
4. A **scan gate** judges the scanner results against the project's scan policy and any approved waivers.
5. **Sign** with Cosign, only once every gate has passed. Then attest the SBOM and verify the signature.
6. **Write back** to Git, which is how the change reaches the cluster.

Watch it run:

```bash
kubectl -n adhar-system get pipelineruns --sort-by=.metadata.creationTimestamp | tail -3
```

**Why Buildpacks.** A Dockerfile in every repository means every team owns its base image, and every base image ages at its own pace. Buildpacks move that responsibility to the platform. Patching the base becomes one change, not a pull request per service.

**Why scan before signing.** A signature is a claim. If you sign first and scan later, a vulnerable image already carries the platform's endorsement. Scanning first means only an image that passed the gate ever gets a signature.

## Step 3: Harbor, and why tags are not enough

Each build lands in Harbor under two tags: `:latest` and `:<commit sha>`. The commit tag makes every image traceable to the exact source it came from.

Tags can still move, though. `orders-api:v1.4.2` can point at different bytes tomorrow. A digest (`sha256:…`) cannot. That is why signing, admission and promotion all work on digests. When a later environment receives this build, it receives the same digest. Nothing is rebuilt between environments, so what you tested is byte-for-byte what you ship.

## Step 4: Kyverno admission

Signing only matters if something checks the signature. On Adhar that check happens at admission, when a Pod is created. The supply-chain policy pack contains three Kyverno ClusterPolicies:

| Policy | What it checks |
|---|---|
| `verify-image-signatures` | Platform-built Harbor `library/*` images carry a valid Cosign signature |
| `disallow-latest-tag` | Workload images carry an explicit tag, not `:latest` |
| `restrict-image-registries` | Workload images come from Harbor or a trusted registry |

The pack ships twice: once in audit mode and once in enforce mode. The two differ only in their failure action, so what audit reports is exactly what enforce would block. Audit runs everywhere. Enforce is live in the production profile. An abridged view of the signature rule in enforce mode:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures-enforce
spec:
  rules:
    - name: verify-platform-built-images
      match:
        any:
          - resources:
              kinds: ["Pod"]
      verifyImages:
        - failureAction: Enforce
          imageReferences:
            - "harbor-core.adhar-system.svc.cluster.local/library/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    secret:
                      name: cosign-key       # the platform signing key
                      namespace: adhar-system
                    rekor:
                      ignoreTlog: true
```

The policies exclude the platform's own namespaces, so turning on enforce cannot block the control plane.

**Why admission, and not review.** A reviewer under deadline pressure can skip a check. An admission webhook cannot. An image built on a laptop and pushed by hand does not run, not because someone noticed, but because the cluster refused it. You can see what the policies report today:

```bash
adhar policy status                  # pass, fail and warn per PolicyReport
adhar compliance --failures-only     # what enforce would block
```

**Why audit first.** If you enforce a new policy on an existing estate, it blocks a deploy nobody expected, usually during an incident. Running audit first gives you the violation list before it becomes an outage.

## Step 5: ArgoCD delivers the commit

CI does not deploy. The write-back step stamps the built commit into the application's manifests and pushes that change to Git, marked so it does not trigger another build. ArgoCD sees the commit and rolls the workload to the new, signed image.

```bash
adhar application status orders-api --detailed -n orders
adhar gitops status -a orders-api
```

Learn three states. `OutOfSync` means Git and the cluster differ, which is expected right after a commit. `Progressing` means applied and waiting for pods. `Healthy` plus `Synced` means done.

ArgoCD runs with self-heal on. If someone runs `kubectl edit` against a managed object, ArgoCD reverts it within about a minute. That surprises people once. After that, it is the reason the cluster matches the repository. Your deployment history is your Git history, and a rollback is a revert.

## Step 6: A preview environment per pull request

Before a change reaches `main`, reviewers often want to see it running. Adhar's preview environments give a pull request its own deployment, without a preview operator. One ArgoCD ApplicationSet watches the `adhar` organisation in Gitea.

The `microservice`, `frontend`, `data-pipeline` and `ml` skeletons already ship the opt-in file, `preview/kustomization.yaml`. With that file on the default branch, label a pull request `preview`. The pipeline builds the PR head, tags the image with the head commit, scans and signs it, and skips the write-back so the PR cannot move `main`. Within about a minute of that build finishing, ArgoCD deploys it:

| Item | Value |
|---|---|
| Application | `orders-api-pr-42` |
| Namespace | `preview-orders-api-42` |
| URL (local) | `https://orders-api-pr-42.adhar.localtest.me:8443` |
| Guardrails | A ResourceQuota and LimitRange stamped by Kyverno |

Every push to the PR updates the preview. Closing, merging or unlabelling the PR deletes the Application and prunes the namespace.

```bash
kubectl -n adhar-system get applications.argoproj.io -l adhar.io/preview=true
```

Previews are not behind SSO, so give them synthetic data only. The preview packages are on in the production profile and off locally; enable them with `adhar stack enable adhar-preview-environments adhar-preview-environments-kyverno` and then `adhar upgrade`.

## What about `adhar push`?

You may see `adhar push` described as a one-command build from a Git URL. Today it is narrower than that. It starts a small Tekton pipeline, `new-service`, which creates a Deployment and Service in `adhar-system` that run `library/<name>:latest` from Harbor. It does **not** build the image. The image exists only once `app-ci` has built it, which happens when the source lives in an `adhar/<name>` repository in the platform's Gitea and something is pushed to `main`.

So for a new service, the golden path above is the route that works end to end: the template creates the Gitea repository, and every push to it runs the full build, scan, sign and write-back. Whatever the entry point, a workload faces the same admission policies. The paved road's guarantees don't depend on how a commit got onto it.

## What a template alone would not give you

| Concern | Template only | Golden path on Adhar |
|---|---|---|
| Base image patching | Each repository's Dockerfile | Buildpacks, owned by the platform |
| Vulnerability scanning | Whatever the team set up | Trivy and a scan gate on every build |
| Provenance | Trust the tag | Cosign signature on the digest |
| Enforcement | Review checklist | Kyverno admission, audit then enforce |
| Deployment | A CI job with cluster credentials | A Git commit that ArgoCD applies |
| Review | Screenshots | A preview URL per pull request |

The escape hatch stays open. Everything the template generates is ordinary Kubernetes and ordinary Git. A team can stop using the template and own its manifests. What it cannot do is skip admission, because that is a property of the cluster, not of the path.

## Next steps

- [Your First Service](/docs/getting-started/first-service) walks this route step by step, with checks at every layer.
- [Preview Environments per Pull Request](/docs/guides/preview-environments) covers the opt-in overlay and teardown in detail.
- [Promote Across Environments](/docs/guides/promote-across-environments) shows what happens after merge: one digest moving from dev to test to prod.
- [The Paved Road to Production](/docs/platform-engineering/paved-road) explains why the stages are ordered this way.
- [CLI Reference](/docs/reference/cli) lists every command used above.
