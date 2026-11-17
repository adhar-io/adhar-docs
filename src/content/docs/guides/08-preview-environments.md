---
title: "Preview Environments per Pull Request"
section: "Guides"
order: 8
path: "/docs/guides/preview-environments"
---

# Preview Environments per Pull Request

A *preview environment* is a running copy of your service, built from one pull request (PR) and served at its own URL. It is created when the PR asks for one, updated on every push, and destroyed when the PR closes. This guide is for application teams who want previews and the platform engineers who support them. You opt a repository in, label a PR, and check every stage from the label to the pruned namespace.

## What you'll build

```diagram
hb-preview-lifecycle
```

- A repository opted in to previews with one file.
- A pull request labelled `preview` that gets its own image, namespace and hostname.
- A preview that follows every push to the PR.
- Automatic teardown on close, merge or unlabel, with nothing left behind.

## Prerequisites

- The `adhar-preview-environments` package enabled. It is on in the production and gitops profiles and **off** in the local core. Check with `kubectl -n adhar-system get applicationset preview-environments`.
- The guardrail package `adhar-preview-environments-kyverno` enabled. It needs `kyverno` and is on in production. Check with `kubectl get clusterpolicy preview-namespace-guardrails`.
- The paved-road CI (`adhar-supply-chain`), which builds PR heads: `kubectl -n adhar-system get eventlistener app-ci`.
- A service repository in the Gitea org `adhar`, ideally scaffolded from a golden path (see [Your First Service](/docs/getting-started/first-service)).

On a laptop, turn the packages on, and keep to one or two open previews on a single Kind node:

```bash
adhar stack enable adhar-preview-environments adhar-preview-environments-kyverno
adhar upgrade
```

## How it works

There is no preview operator, and no CI step creates or deletes environments. The whole mechanism is **one ArgoCD ApplicationSet** for the `adhar` org (`preview-environments` in `adhar-system`), plus one Kyverno policy.

### One Application per repository and PR

The ApplicationSet uses a **matrix generator** built from two Gitea generators:

```diagram
hb-preview-matrix
```

| Generator | Selects | Detail |
|---|---|---|
| `scmProvider` | Every repository in the org whose **default branch** contains `preview/kustomization.yaml` | That file is the opt-in |
| `pullRequest` | Each repository's **open** pull requests labelled `preview` | Re-queries every 60 seconds (`requeueAfterSeconds: 60`), which bounds how quickly a push or label change is noticed |

Each repository and PR pair becomes one ArgoCD Application named `<repo>-pr-<number>`.

### What the ApplicationSet sets for each PR

Your overlay names things once. The ApplicationSet fills in the PR number and head commit:

```diagram
ngb-preview-overrides
```

The template, abridged from the package's `20-preview-appset.yaml`:

```yaml
template:
  metadata:
    name: "{{ .repository }}-pr-{{ .number }}"            # e.g. orders-api-pr-42
    labels:
      adhar.io/preview: "true"
      adhar.io/preview-repo: "{{ .repository }}"
      adhar.io/preview-pr: "{{ .number }}"
    annotations:
      adhar.io/preview-url: "https://{{ .repository }}-pr-{{ .number }}.adhar.localtest.me:8443"
      adhar.io/preview-head-sha: "{{ .head_sha }}"
    finalizers:
      - resources-finalizer.argocd.argoproj.io          # deleting the Application prunes what it made
  spec:
    source:
      repoURL: "http://gitea-http.adhar-system.svc.cluster.local:3000/adhar/{{ .repository }}"
      targetRevision: "{{ .head_sha }}"                 # the PR head commit, not the branch name
      path: preview
      kustomize:
        namespace: "preview-{{ .repository }}-{{ .number }}"
        images:                                         # same image NAME, tag swapped to the head SHA
          - "harbor-core.adhar-system.svc.cluster.local/library/{{ .repository }}:{{ .head_sha }}"
        patches:                                        # every HTTPRoute gets the per-PR hostname
          - target: {group: gateway.networking.k8s.io, kind: HTTPRoute}
            patch: |-
              - op: replace
                path: /spec/hostnames
                value: ["{{ .repository }}-pr-{{ .number }}.adhar.localtest.me"]
    destination:
      server: https://kubernetes.default.svc
      namespace: "preview-{{ .repository }}-{{ .number }}"
    syncPolicy:
      automated: {prune: true, selfHeal: true}
      managedNamespaceMetadata:
        labels: {adhar.io/plane: preview, adhar.io/preview: "true"}
      syncOptions: [CreateNamespace=true, ServerSideApply=true, SkipDryRunOnMissingResource=true]
```

Two details matter:

- **The domain is rewritten.** When the stack is seeded into Gitea, the literal `adhar.localtest.me` becomes your platform host, as in every other package. The URL is `https://<repo>-pr-<number>.<your domain>` on a cloud platform and `https://<repo>-pr-<number>.adhar.localtest.me:8443` locally.
- **Deletion cascades.** The ApplicationSet sets `preserveResourcesOnDeletion: false`, so when the generator drops an Application, its resources go with it.

### Where the image comes from

The `app-ci` Tekton pipeline tags every build twice: `:latest` and `:<commit sha>`. A separate trigger, `pr-preview-build`, builds the head of any PR labelled `preview`. It fires on the `opened`, `synchronized`, `reopened` and `label_updated` actions, and writes nothing back to `main`.

So the SHA-pinned image the Application asks for is the one built from this PR. A preview never silently shows `:latest` from `main`.

### The guardrails

```diagram
ngb-preview-guardrails
```

The Kyverno ClusterPolicy `preview-namespace-guardrails` matches every Namespace labelled `adhar.io/preview: "true"` and generates two objects in it:

| ResourceQuota `preview-quota` | | LimitRange `preview-limits` (per container) | cpu | memory |
|---|---|---|---|---|
| `requests.cpu` | `2` | `default` | `250m` | `256Mi` |
| `requests.memory` | `4Gi` | `defaultRequest` | `50m` | `64Mi` |
| `limits.cpu` | `4` | `max` | `1` | `2Gi` |
| `limits.memory` | `8Gi` | | | |
| `pods` | `20` | | | |
| `persistentvolumeclaims` | `2` | | | |
| `services.nodeports` / `services.loadbalancers` | `0` | | | |

Both rules set:

- `synchronize: true`, so a PR author cannot widen them by editing the overlay.
- `generateExisting: true`, so previews that already exist when the policy lands get them too.

> **Warning:** The gitops profile enables the preview ApplicationSet but not the guardrail element. Without `adhar-preview-environments-kyverno`, previews run with no quota.

## Step 1 — Opt the repository in

Add `preview/kustomization.yaml` to the repository's **default branch**. The golden-path templates do not ship one, so add it yourself:

```yaml
# preview/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../manifests              # or ../deploy — wherever this repo's manifests live
patches:
  # 1. Pin the image NAME the ApplicationSet overrides. The repo name must equal the
  #    image name in Harbor; `latest` is only a stand-in for the head SHA.
  - patch: |-
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: orders-api
      spec:
        replicas: 1           # a preview does not need production's replica count
        template:
          spec:
            containers:
              - name: app
                image: harbor-core.adhar-system.svc.cluster.local/library/orders-api:latest
  # 2. Label the Namespace as a preview. The guardrail policy keys on adhar.io/preview.
  - target:
      kind: Namespace
    patch: |-
      - op: add
        path: /metadata/labels/adhar.io~1plane
        value: preview
      - op: add
        path: /metadata/labels/adhar.io~1preview
        value: "true"
```

The overlay must get three things right:

| Requirement | Why |
|---|---|
| **Declare the Namespace as a resource**, through `../manifests` or directly | Kustomize's `namespace:` renames it to `preview-<repo>-<number>`, and ArgoCD then manages it, so teardown prunes it. A namespace created only by `CreateNamespace=true` is unmanaged and outlives the preview |
| **Use the exact image name** `harbor-core.adhar-system.svc.cluster.local/library/<repo>` | The override matches on the name. Any other name keeps its original tag |
| **Include an HTTPRoute** if you want a URL | The hostname patch replaces whatever hostnames the route has. Without a route, the preview runs but nothing routes to it |

**Check:** `kustomize build preview/` (or `kubectl kustomize preview/`) renders without errors and shows the Namespace with both labels.

> **Note:** A PR that **adds** `preview/` does not preview itself, because the generator reads the default branch. The first preview starts after that change merges.

## Step 2 — Label a pull request

Open a pull request on the repository, then add the label **`preview`** in Gitea. If the label does not exist in the repository yet, create it first.

The label fires Gitea's `pull_request` webhook into the `app-ci` EventListener, which builds the PR head:

```bash
kubectl -n adhar-system get pipelineruns --sort-by=.metadata.creationTimestamp | tail -3
```

**Check:** a fresh `app-pr-ci-orders-api-…` run succeeds and pushes `library/orders-api:<head sha>` to Harbor.

> **Note:** Fork PRs get no preview. Their head branch cannot be cloned from the base repository, so the build fails at clone.

## Step 3 — Watch the Application appear

```bash
kubectl -n adhar-system get applications.argoproj.io -l adhar.io/preview=true
kubectl -n adhar-system get application orders-api-pr-42 \
  -o jsonpath='{.metadata.annotations.adhar\.io/preview-url}{"\n"}{.metadata.annotations.adhar\.io/preview-head-sha}{"\n"}'
```

**Check:** `orders-api-pr-42` appears within one poll interval of the label (60 seconds). The annotations give the preview URL and the SHA it is pinned to. The Application may sit `Degraded` until the image from Step 2 exists, then turn `Healthy`.

## Step 4 — Check the namespace and the guardrails

```bash
kubectl get namespace preview-orders-api-42 --show-labels
kubectl -n preview-orders-api-42 get resourcequota,limitrange
kubectl -n preview-orders-api-42 get deploy,svc,httproute
kubectl -n preview-orders-api-42 get deploy orders-api \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

**Check:**

- The namespace carries `adhar.io/plane=preview` and `adhar.io/preview=true`.
- `preview-quota` and `preview-limits` exist.
- The Deployment's image ends in `:<head sha>`.
- The HTTPRoute's hostname is `orders-api-pr-42.<your domain>`.

## Step 5 — Open the preview

```bash
curl -sk https://orders-api-pr-42.platform.example.com/healthz     # cloud
curl -sk https://orders-api-pr-42.adhar.localtest.me:8443/healthz  # local
```

**Check:** HTTP 200.

> **Warning:** Previews are not behind SSO. They are unauthenticated and reachable through the platform Gateway: `localhost:8443` locally, or whatever fronts the Gateway in the cloud (typically a private load balancer or VPN). Give previews **synthetic data only**, and never point one at a production database.

This is by design. Every other platform UI sits behind a Keycloak oauth2-proxy, which needs a Keycloak client per hostname. Preview hostnames come and go with pull requests, so a per-PR client would need a controller of its own, which is the operator this design avoids.

## Step 6 — Push, and see it follow

Push another commit to the PR branch. Three things happen:

1. `app-ci` builds the new head (`synchronized` action).
2. The generator sees the new `head_sha` on its next poll.
3. ArgoCD re-syncs the same Application to the new revision and image tag.

**Check:** re-run the `preview-head-sha` query from Step 3. It shows the new commit, and the Deployment rolls to the matching image. The URL stays the same.

## Step 7 — Close the PR and confirm teardown

Close or merge the PR, or remove the `preview` label. Then:

1. The PR drops out of the generator's results, and the ApplicationSet controller deletes the Application.
2. The `resources-finalizer.argocd.argoproj.io` finalizer cascades the deletion. Every resource the Application owned is pruned, including the declared Namespace.
3. The Kyverno-generated quota and limit range go with the namespace.

```bash
kubectl -n adhar-system get application orders-api-pr-42          # NotFound
kubectl get namespace preview-orders-api-42                        # NotFound, or Terminating briefly
```

**Check:** both are gone after the next poll and the prune. There is no reaper job and nothing to clean up by hand.

## What previews do not do

| Not provided | What to do instead |
|---|---|
| Teardown of an **abandoned but still open** PR | The preview lives as long as the PR is open and labelled; the quota bounds its cost. Close stale PRs or remove the label. No stale-PR reaper ships |
| A database per preview | Previews get only what the overlay declares. For an ephemeral CNPG database or other per-repo mechanics, copy the single-repo ApplicationSet in `examples/preview-environments-appset.yaml` into the `environments` repo and extend it |
| Authentication on preview URLs | By design (Step 5); keep previews internal |
| Previews for fork PRs | The build cannot clone a fork's branch; push the branch into the org repository |
| vcluster-backed previews | Previews are namespace-scoped only |
| Network policy, TTL labels or Pod Security labels on preview namespaces | The guardrail policy stamps exactly a ResourceQuota and a LimitRange. Add further policy through your own Kyverno rules |
| Previews for the platform's own repos | `app-ci` ignores `adhar`, `adhar-ui`, `adhar-kit`, `packages`, `environments`, `templates`, `adhar-templates` and `performance-tests` |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No Application after labelling | `preview/kustomization.yaml` exists only on the PR branch | Merge it to the default branch first |
| No Application, and the overlay is on the default branch | Label name is not exactly `preview`, the repo is outside the `adhar` org, or the package is disabled | Check the label; `kubectl -n adhar-system get applicationset preview-environments -o yaml` and read its status conditions |
| Application `Degraded` with `ImagePullBackOff` | No image for the head SHA: the build failed, it is a fork PR, or the image name differs from the repo name | Check the PipelineRun; align the image name with `library/<repo>` |
| Pods rejected with `exceeded quota` or `must specify requests` | The preview quota; the LimitRange supplies defaults only up to its `max` | Lower replicas and requests in the overlay; stay within the quota table |
| Preview serves but has no URL | No HTTPRoute in the overlay's resources | Add the route to `../manifests` or the overlay |
| Namespace left behind after close | The overlay does not declare the Namespace, so ArgoCD never managed it | Declare it as a resource; delete the orphan by hand once |
| Preview shows old code after a push | The generator has not polled yet, or the new build is still running | Wait one poll interval (60 s) after the build finishes; check the `preview-head-sha` annotation |
| No ResourceQuota in the preview namespace | `adhar-preview-environments-kyverno` or `kyverno` disabled (the gitops profile omits the guardrail element) | Enable both packages |
| Many previews `Pending` | Preview capacity is real capacity: N previews × the quota must fit the cluster | Close stale PRs; add nodes |

## Next steps

- [Your First Service](/docs/getting-started/first-service) — scaffold a service whose skeleton already ships `preview/`.
- [Promote Across Environments](/docs/guides/promote-across-environments) — what happens after the PR merges.
- [Customization](/docs/operations/customization) — enable the preview packages, or add your own guardrail policies.
- [Security Best Practices](/docs/security/security-best-practices) — why unauthenticated previews must stay internal.
