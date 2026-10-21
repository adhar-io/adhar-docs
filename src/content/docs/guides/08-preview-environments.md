---
title: "Preview Environments per Pull Request"
section: "Guides"
order: 8
path: "/docs/guides/preview-environments"
---

# Preview Environments per Pull Request

A preview environment is a running copy of your service, built from one pull request (PR) and served at its own URL. It is created when the PR asks for one, updated on every push, and destroyed when the PR closes.

This guide is for application teams who want previews and for platform engineers who support them. It explains how the platform's `adhar-preview-environments` package works, from the label on the PR to the pruned namespace. It shows how to opt a repository in and how to check every stage. It also says plainly what the package does not do.

## What you will build

- A repository opted in to previews with one file.
- A pull request labelled `preview` that gets its own image, namespace and hostname within about a minute of its build finishing.
- A preview that follows every push to the PR.
- Automatic teardown on close, merge or unlabel, with nothing left behind.

**Prerequisites**

| Requirement | How to check |
|---|---|
| The `adhar-preview-environments` package enabled. It is on in the production and gitops profiles and **off** in the local core | `kubectl -n adhar-system get applicationset preview-environments` |
| The guardrail package `adhar-preview-environments-kyverno` enabled; it needs `kyverno` and is on in production | `kubectl get clusterpolicy preview-namespace-guardrails` |
| The paved-road CI (`adhar-supply-chain`), which builds PR heads | `kubectl -n adhar-system get eventlistener app-ci` |
| A service repository in the Gitea org `adhar`, ideally scaffolded from a golden path ([Your First Service](/docs/getting-started/first-service)) | it is listed under `adhar/` in Gitea |

On a laptop, turn the packages on with `adhar stack enable adhar-preview-environments adhar-preview-environments-kyverno` and then `adhar upgrade`. Keep to one or two open previews on a single Kind node.

## How it works

There is no preview operator, and no CI step creates or deletes environments. The whole mechanism is **one ArgoCD ApplicationSet** for the entire `adhar` org (`preview-environments` in `adhar-system`), plus a Kyverno policy.

The ApplicationSet uses a **matrix generator** built from two Gitea generators:

```diagram
hb-preview-matrix
```

1. **`scmProvider`** lists every repository in the org whose **default branch** contains `preview/kustomization.yaml`. That file is the opt-in.
2. **`pullRequest`**, run per repository, lists its **open** pull requests labelled `preview`. It re-queries every **60 seconds** (`requeueAfterSeconds: 60`). That interval sets how quickly a push or a label change can be noticed.

Each repository and PR pair becomes one ArgoCD Application, built from this template (abridged from the package's `20-preview-appset.yaml`):

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

When the stack is seeded into Gitea, the literal `adhar.localtest.me` domain is rewritten to your platform host, as in every other package. So on a cloud platform the URL is `https://<repo>-pr-<number>.<your domain>`. Locally it is `https://<repo>-pr-<number>.adhar.localtest.me:8443`. The ApplicationSet sets `preserveResourcesOnDeletion: false`, so when the generator deletes an Application, its resources go with it.

**Where the image comes from.** The `app-ci` Tekton pipeline tags every build twice: `:latest` and `:<commit sha>`. A separate trigger, `pr-preview-build`, builds the head of any PR labelled `preview`. It fires on the `opened`, `synchronized`, `reopened` and `label_updated` actions, and writes nothing back to `main`. So the SHA-pinned image the Application asks for is the one built from this PR. A preview never silently shows `:latest` from `main`.

**The guardrails.** The Kyverno ClusterPolicy `preview-namespace-guardrails` matches every Namespace labelled `adhar.io/preview: "true"`. It generates two objects in each one, with two settings:

- `synchronize: true`, so a PR author cannot widen them by editing their overlay.
- `generateExisting: true`, so previews that already exist when the policy lands get them too.

| ResourceQuota `preview-quota` | | LimitRange `preview-limits` (per container) | cpu | memory |
|---|---|---|---|---|
| `requests.cpu` | `2` | `default` | `250m` | `256Mi` |
| `requests.memory` | `4Gi` | `defaultRequest` | `50m` | `64Mi` |
| `limits.cpu` | `4` | `max` | `1` | `2Gi` |
| `limits.memory` | `8Gi` | | | |
| `pods` | `20` | | | |
| `persistentvolumeclaims` | `2` | | | |
| `services.nodeports` / `services.loadbalancers` | `0` | | | |

The gitops profile enables the preview ApplicationSet but not the guardrail element. **Without `adhar-preview-environments-kyverno`, previews run with no quota.**

## Step 1 — Opt the repository in

Add `preview/kustomization.yaml` to the repository's **default branch**. The four golden-path skeletons (`microservice`, `frontend`, `data-pipeline`, `ml`) already ship it. For any other repository:

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

- **Declare the Namespace as a resource**, through `../manifests` or directly. Kustomize's `namespace:` renames it to `preview-<repo>-<number>`. Because ArgoCD then manages it, the namespace is pruned on teardown. A namespace created only by `CreateNamespace=true` is unmanaged and would outlive the preview.
- **Use the exact image name** `harbor-core.adhar-system.svc.cluster.local/library/<repo>`. The override matches on the name. Any other name keeps its original tag.
- **Include an HTTPRoute** if you want a URL. The hostname patch replaces whatever hostnames the route has. Without a route, the preview runs but nothing routes to it.

**Verify:** `kustomize build preview/` (or `kubectl kustomize preview/`) renders without errors and shows the Namespace with both labels.

A PR that **adds** `preview/` does not preview itself, because the generator reads the default branch. The first preview starts after that change merges.

## Step 2 — Label a pull request

Open a pull request on the repository, then add the label **`preview`** in Gitea. If the label does not exist in the repository yet, create it first.

```diagram
hb-preview-lifecycle
```

**Verify the build.** The label fires Gitea's `pull_request` webhook into the `app-ci` EventListener:

```bash
kubectl -n adhar-system get pipelineruns --sort-by=.metadata.creationTimestamp | tail -3
```

**Expected:** a fresh `app-pr-ci-orders-api-…` run that succeeds and pushes `library/orders-api:<head sha>` to Harbor.

Fork PRs are the exception. Their head branch cannot be cloned from the base repository, so the build fails at clone and the PR gets no preview.

## Step 3 — Watch the Application appear

```bash
kubectl -n adhar-system get applications.argoproj.io -l adhar.io/preview=true
kubectl -n adhar-system get application orders-api-pr-42 \
  -o jsonpath='{.metadata.annotations.adhar\.io/preview-url}{"\n"}{.metadata.annotations.adhar\.io/preview-head-sha}{"\n"}'
```

**Expected:** `orders-api-pr-42` within one poll interval of the label, at most about 60 seconds. On the verified run it appeared in under 30 seconds. The annotations give the preview URL and the SHA it is pinned to. The Application may sit `Degraded` until the image from Step 2 exists, then go `Healthy`.

## Step 4 — Check the namespace and the guardrails

```bash
kubectl get namespace preview-orders-api-42 --show-labels
kubectl -n preview-orders-api-42 get resourcequota,limitrange
kubectl -n preview-orders-api-42 get deploy,svc,httproute
kubectl -n preview-orders-api-42 get deploy orders-api \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

**Expected:**

- The namespace carries `adhar.io/plane=preview` and `adhar.io/preview=true`.
- `preview-quota` and `preview-limits` exist.
- The Deployment's image ends in `:<head sha>`.
- The HTTPRoute's hostname is `orders-api-pr-42.<your domain>`.

## Step 5 — Open the preview

```bash
curl -sk https://orders-api-pr-42.platform.example.com/healthz     # cloud
curl -sk https://orders-api-pr-42.adhar.localtest.me:8443/healthz  # local
```

**Expected:** HTTP 200. On the verified run, `preview-demo-pr-1.platform.adhar.io` answered 200 once the overlay carried an HTTPRoute.

**Previews are not behind SSO.** Every other platform UI sits behind a Keycloak oauth2-proxy, which needs a Keycloak client per hostname. Preview hostnames are created and destroyed with pull requests. A per-PR OIDC client would therefore need a controller of its own, and that is exactly the operator the design rejected.

Previews are unauthenticated and reachable only through the platform Gateway. Locally that is `localhost:8443`. In the cloud it is whatever fronts the Gateway, typically a private load balancer or VPN. Give previews **synthetic data only**. **Never point one at a production database.**

## Step 6 — Push, and see it follow

Push another commit to the PR branch. Three things then happen:

1. `app-ci` builds the new head (`synchronized` action).
2. The generator sees the new `head_sha` on its next poll.
3. ArgoCD re-syncs the same Application to the new revision and image tag.

**Verify:** re-run the `preview-head-sha` query from Step 3. It shows the new commit, and the Deployment rolls to the matching image. The URL stays the same.

## Step 7 — Close the PR and confirm teardown

Close or merge the PR, or remove the `preview` label. The PR drops out of the generator's results, and the ApplicationSet controller deletes the Application. The `resources-finalizer.argocd.argoproj.io` finalizer then cascades the deletion. Every resource the Application owned is pruned, including the declared Namespace. The Kyverno-generated quota and limit range go with the namespace.

```bash
kubectl -n adhar-system get application orders-api-pr-42          # NotFound
kubectl get namespace preview-orders-api-42                        # NotFound, or Terminating briefly
```

**Expected:** both gone within a poll interval plus the time pruning takes. There is no reaper job and nothing to clean up by hand.

## What is not implemented

| Not provided | What to do instead |
|---|---|
| Teardown of an **abandoned but still open** PR | The preview lives as long as the PR is open and labelled; the quota bounds its cost. Close stale PRs or remove the label. No stale-PR reaper ships |
| A database per preview | Previews get only what the overlay declares. For an ephemeral CNPG database or other per-repo mechanics, copy the single-repo ApplicationSet in `examples/preview-environments-appset.yaml` into the `environments` repo and extend it |
| Authentication on preview URLs | By design, see Step 5; keep previews internal |
| Previews for fork PRs | The build cannot clone a fork's branch; push the branch into the org repository |
| vcluster-backed previews | Previews are namespace-scoped only |
| Network policy, TTL labels or Pod Security labels on preview namespaces | The guardrail policy stamps exactly a ResourceQuota and a LimitRange. Add further policy through your own Kyverno rules if you need it |
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
| Preview shows old code after a push | The generator has not polled yet, or the new build is still running | Wait up to 60 s after the build finishes; check the `preview-head-sha` annotation |
| No ResourceQuota in the preview namespace | `adhar-preview-environments-kyverno` or `kyverno` disabled (the gitops profile omits the guardrail element) | Enable both packages |
| Many previews `Pending` | Preview capacity is real capacity: N previews × the quota must fit the cluster | Close stale PRs; add nodes |

## Next steps

- **[Your First Service](/docs/getting-started/first-service)** — scaffold a service whose skeleton already ships `preview/`
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — what happens after the PR merges
- **[Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service)** — databases for the long-lived environments
- **[Customization](/docs/operations/customization)** — enable the preview packages, or add your own guardrail policies
- **[Security Best Practices](/docs/security/security-best-practices)** — why unauthenticated previews must stay internal
