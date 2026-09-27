---
title: "Your First Service"
section: "Getting Started"
order: 4
path: "/docs/getting-started/first-service"
---

# Your First Service

This guide takes you from a running platform to a live application, and explains what happens under the hood at each step. Adhar gives you four ways to deploy — from "point at a repo" to "build from source through a signed supply chain" — and they all end the same way: an ArgoCD Application reconciling your workload from Git, observability wired in automatically, and a URL at `https://<name>.<host>`.

## The application model

Whichever path you choose, your app becomes a **`CompositeApplication`** — the platform's own application API (a Crossplane composite resource). Adhar expands it into an ArgoCD Application, which deploys your manifests and keeps them in sync with Git:

```text
  you ──▶ CompositeApplication ──▶ ArgoCD Application ──▶ your workload
          (platform app API)       (GitOps sync)          (Deployment, Service,
                                                            HTTPRoute, …)
                                          ▲
                                          └── reconciled from Git, self-healing
```

Because delivery is GitOps, your app is reconstructable, auditable, and self-healing by default — the same guarantees the platform gives itself.

## Path 1 — Deploy from a template

The fastest real deployment. The CLI fetches `<template>.yaml` from the Gitea `templates` repo, substitutes the name and namespace, and creates the `CompositeApplication`:

```bash
adhar application deploy hello --template microservice --namespace hello
adhar application status hello
```

Available templates for `--template`: `basic-git`, `microservice`, `frontend`. (Run with an unknown name to list what's available.) Once healthy, the service is reachable at `https://hello.adhar.localtest.me:8443`.

## Path 2 — Point at an existing repo

Already have Kubernetes manifests or a Helm chart in Git? Point ArgoCD straight at them — no build step, no platform-specific files:

```bash
adhar application deploy my-app \
  --repo https://github.com/org/repo \
  --path manifests/ \
  --dest-namespace my-team \
  --wait
```

`--wait` blocks until the app is healthy. Use this when your build already produces images and you just want the platform to run them.

## Path 3 — Build from source (signed supply chain)

Ship straight from source in one command. Adhar runs the whole paved-road supply chain for you:

```bash
adhar push my-app --git-url https://github.com/org/repo --wait
```

```text
  source ──▶ buildpacks ──▶ Trivy scan ──▶ Cosign sign ──▶ Harbor ──▶ GitOps deploy
   (no        (build an       (block on      (sign the      (registry)   (ArgoCD)
   Dockerfile) OCI image)     vulns)         image)
```

The result is a signed, scanned image in Harbor and a running workload — with Kyverno admission ensuring only signed images from Harbor can run. This is the recommended path for first-party code.

## Path 4 — Console golden paths

The Adhar Console (`https://console.<host>`) offers scaffolded **golden paths** that create a real Gitea repo, wire ArgoCD, and set up CI for you. Four ship by default:

- **`microservice`** — a backend service with the full supply chain
- **`frontend`** — a static/SPA frontend
- **`data-pipeline`** — a data processing workflow
- **`ml`** — a machine-learning workflow

Each scaffolded service is reachable at `https://<name>.<host>` once its first image is built. Golden paths are the best way for a whole team to start new services consistently. Add your own — see [Customization](/docs/operations/customization#add-a-golden-path).

## Manage a running application

```bash
adhar application list [-A]                 # inventory (all namespaces with -A)
adhar application status <name> [--detailed]
adhar application scale <name> --replicas 3
adhar application restart <name>
adhar application delete <name> [--force]
```

## Give your app a backing service

Developers request infrastructure as ordinary Kubernetes resources — no tickets. Create a database, cache, or bucket, then **bind** its generated connection Secret into your app:

```bash
adhar database create --name orders-db --engine postgresql   # durable storage
adhar cache create sessions --replicas 2                     # Valkey/Redis cache
adhar bucket create uploads                                  # S3 object storage

adhar application bind my-app orders-db     # mounts the connection Secret
adhar application bind my-app sessions
```

Or declare the same thing in YAML — a namespaced Crossplane composite resource, governed by ordinary RBAC and quotas:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: CompositeDatabase
metadata:
  name: orders-db
  namespace: team-orders
spec:
  parameters:
    engine: postgresql
    engineVersion: "16"
    storageSize: 50Gi
```

The same manifest lands on RDS, Cloud SQL, or an in-cluster CNPG database depending on where you run — your app never changes. See [Control Plane](/docs/core-concepts/control-plane) for how this works.

## Observe your app

Nothing to configure — the moment your workload runs, its metrics, logs, and traces flow into the platform's observability stack:

```text
https://grafana.<host>     # dashboards, logs (Loki), traces (Tempo)
https://hubble.<host>      # live network flows to/from your pods
```

See [Observability](/docs/operations/observability).

## Handle secrets

Never commit secrets to Git. Reference an `ExternalSecret`; External Secrets fetches the value from OpenBao at runtime and materializes a normal Kubernetes Secret your app can mount:

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata: { name: myapp-config, namespace: my-team }
spec:
  secretStoreRef: { name: vault, kind: ClusterSecretStore }
  target: { name: myapp-config }
  data:
    - secretKey: password
      remoteRef: { key: myapp/config, property: password }
```

## Preview environments per pull request

Give every PR a full, isolated deployment. Add a Kustomize overlay at `preview/kustomization.yaml` on your default branch **once**, then label any PR `preview`:

- ArgoCD's pull-request generator (polling every ~60s) deploys the PR to `https://<repo>-pr-<number>.<host>` in namespace `preview-<repo>-<number>`.
- Closing or merging the PR — or removing the label — deletes the Application and prunes the namespace.
- Previews are unauthenticated: use synthetic data only.

## The paved-road CI loop

A repo carrying a `.adhar/app.yaml` is adopted automatically by the platform's `adhar-services` ApplicationSet. From then on, a `git push` triggers the Tekton `app-ci` pipeline via a Gitea webhook:

```text
git push ─▶ Tekton app-ci ─▶ build (buildpacks) ─▶ Cosign sign ─▶ Trivy scan
         ─▶ push to Harbor (:latest and :<sha>) ─▶ open a version-bump PR
            against the environments repo ─▶ report status back to the commit
```

## Next steps

- **[CLI Reference](/docs/reference/cli)** — every `adhar` command and flag
- **[Platform Services](/docs/core-concepts/platform-services)** — what else your app can use
- **[Customization](/docs/operations/customization)** — enable more packages, add golden paths, extend the platform APIs
