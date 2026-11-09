---
title: "Introducing Adhar: Open Cloud-Native Foundation"
excerpt: "Adhar is an open-source Internal Developer Platform. One command, adhar up, brings up 100+ curated packages on a laptop or your cloud, wired together and delivered by GitOps."
category: "Platform Updates"
author: "Tapas Jena"
authorRole: "Adhar Maintainer"
authorBio: "Tapas Jena is the Adhar Maintainer, building an open foundation for platform engineering."
date: "2026-08-28"
featured: true
tags: ["Adhar", "Platform Engineering", "IDP", "GitOps", "Kubernetes"]
---

Adhar is an open-source Internal Developer Platform (IDP). It is a ready-made set of tools your teams use to build, ship and run software on Kubernetes. One command, `adhar up` sets up the whole platform: GitOps delivery, identity, CI, a container registry, observability, self-service infrastructure and a developer portal. It runs on your laptop or on your own cloud account.

The name comes from the Sanskrit word *Adhāra*, which means "foundation". That is the goal. Adhar is not a hosted service you rent. It is a foundation you own, licensed under Apache 2.0, with no proprietary tier and no managed-only features.

This post explains the problem Adhar is built for, what ships today, how `adhar up` works, and where the project is honest about what is still maturing.

## The problem: freedom or governance

Once an engineering organisation grows past a handful of teams, it usually reaches a fork in the road. Both directions hurt.

| You choose | You get | It costs you |
|---|---|---|
| **Developer freedom** | Teams ship fast and own their stack | Many ways to deploy, unpatched images, no shared observability, an audit you cannot answer |
| **Central governance** | Consistency and compliance | A ticket queue between an engineer and a database, and a platform team that becomes a bottleneck |

This trade-off only exists when standards are enforced after the fact, through review gates, checklists and people saying no. Adhar takes a different position: put the standards into the road itself. Security, compliance and observability become properties of the default route to production. If that route is also the fastest one, teams take it by choice.

Here is a concrete example. A developer needs a PostgreSQL database and wants to bind it to an application. On Adhar, they declare both resources as Kubernetes manifests in Git. The platform returns a quota-bounded database, and its connection details land in a Secret. There is no ticket, and nobody on the platform team has to approve that specific request.

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Database
metadata:
  name: orders
  namespace: team-payments
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local
        engine: postgresql
  parameters:
    engine: postgresql
    engineVersion: "16"
    storageSize: 20Gi
---
apiVersion: platform.adhar.io/v1alpha1
kind: Application
metadata:
  name: orders-api
  namespace: team-payments
spec:
  bindings:
    databases:
      - name: orders
```

Apply the manifests:

```bash
kubectl apply -f orders-database-and-binding.yaml
```

## What ships

Adhar curates 100+ open-source packages. Each one arrives already wired into identity, the Gateway, policy and the telemetry pipeline. That wiring is the product. You do not get a shelf of separate tools; you get one platform.

| Capability | What ships |
|---|---|
| **GitOps delivery** | ArgoCD, reconciling against an in-cluster Gitea repository |
| **Self-service infrastructure** | Crossplane APIs: databases, caches, buckets and clusters as namespaced Kubernetes resources |
| **Identity and SSO** | Keycloak (OIDC) across every platform UI |
| **Secrets** | OpenBao and External Secrets; secrets never go in Git |
| **Secure supply chain** | Tekton and Buildpacks build, Trivy scans, Cosign signs, Harbor stores, Kyverno admits |
| **Observability** | Prometheus, Grafana, Loki, Tempo, Mimir and Hubble |
| **Developer portal** | The Adhar Console, built on Backstage: catalogue, golden paths, scorecards |
| **Where it runs** | Local Kind, AWS, Azure, GCP, DigitalOcean, Civo and on-prem |

The platform has its own resource kinds in `platform.adhar.io/v1alpha1`. The four you meet first are `Application`, `Database`, `Project` and `Cluster`. A developer declares intent with them; Crossplane and ArgoCD turn that intent into running infrastructure.

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Database
metadata:
  name: orders-db
  namespace: team-payments
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local        # aws or gcp on a cloud
        engine: postgresql
  parameters:
    engine: postgresql
    engineVersion: "16"
    storageSize: 20Gi
```

The same manifest becomes an in-cluster CloudNativePG database locally, or a managed database on a cloud. The application that uses it does not change.

## How `adhar up` works

`adhar up` builds the platform in two moves.

First, it bootstraps a minimal foundation in a fixed order: Cilium for networking and the Gateway API, then ArgoCD to reconcile, then Gitea to hold the source of truth. These foundation manifests are compiled into the binary, so an upstream chart repository that is down cannot break the bootstrap.

Second, it steps out of the way. It seeds the in-cluster Gitea with the platform's own definition. A single ArgoCD ApplicationSet then reads that repository and deploys every enabled package. From that point, Git is in charge. ArgoCD runs with self-heal on, so a manual `kubectl edit` on a managed object is soon reverted. To change the platform, you change Git.

Locally, use the same kind of simple flow:

1. Install the CLI.
2. Verify your installation.
3. Bring up the local platform.
4. Check health and fetch initial credentials.

```bash
# 1) Install the CLI
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/install.sh | bash
# or, on macOS with Homebrew:
brew install adhar

# 2) Verify installation
adhar version

# 3) Bootstrap a local platform (Kind)
adhar up

# 4) Check status and get access credentials
adhar get status
adhar get secrets -p argocd
```

For first-time local runs:

- Ensure your container runtime is running before `adhar up`.
- Keep the first run focused on one environment and default settings.
- Re-run `adhar up` after interruptions; it resumes from pending phases.

On a cloud, use a short four-step flow:

1. Create a starter config for your provider and region.
2. Validate it before provisioning anything.
3. Dry-run to preview exactly what Adhar will create.
4. Run the real apply for your target environment.

```bash
# 1) Generate a starter config
adhar config create --provider digitalocean --region blr1 --name config.yaml

# 2) Validate inputs (credentials, required fields, schema)
adhar config validate config.yaml

# 3) Preview only — no infrastructure changes
adhar up -f config.yaml --env dev --dry-run

# 4) Provision the environment
adhar up -f config.yaml --env dev
```

A practical way to treat this file:

- Keep `config.yaml` in Git for reviewability.
- Use one `--env` per stage (`dev`, `stage`, `prod`) in the same file.
- Start with the smallest environment first, then promote the same model.
- Re-run the same command after edits; Adhar reconciles toward desired state.

How long a cloud run takes depends on how fast the cloud provisions machines. The foundation and GitOps phases take about as long as they do locally. What changes is the time before them. On DigitalOcean, the verified run had the cluster serving in about five minutes and the platform usable in about thirteen. Always pass `--env` with `-f`; without it, every environment in the file is provisioned.

Re-running `adhar up` is safe. Each phase is gated on a status flag, and every foundation manifest is applied with Server-Side Apply. An interrupted run resumes from the phase that was pending.

## The 6 D's: one lifecycle, not a pile of tools

A catalogue of 100+ packages raises a fair question: which of these do I need? Adhar answers it with a lifecycle model called the 6 D's. Every package serves at least one stage, and every handoff between stages should be a reviewable artifact in Git.

| Stage | The question it answers | What Adhar provides |
|---|---|---|
| **Define** | What are we building, and who owns it? | `Project`, the Console catalogue, golden-path templates |
| **Design** | How will it be built, within which limits? | Crossplane XRDs and Compositions, Kyverno policies, quotas |
| **Develop** | Does the code work against the real platform? | `adhar dev`, golden-path templates, preview environments |
| **Deliver** | How does a commit become production, safely? | Tekton, Trivy, Cosign, Harbor, Kyverno admission, ArgoCD, Kargo |
| **Discover** | What is it doing in production? | Prometheus, Loki, Tempo, Mimir, Grafana, Hubble, OpenCost, scorecards |
| **Decide** | What should we do next, and why? | Cost budgets, `adhar compliance export`, scorecard summaries |

Decide feeds back into Define, so it is a loop rather than a pipeline. The model matters because most delivery pain sits at the boundaries between stages: a design nobody encoded, or a deployment nobody can trace to a commit.

## Governed AI, not an AI with root

Adhar includes an agentic AI layer. The design rule is simple: the agent works through the platform's existing controls, never around them.

- **One governed endpoint.** Model calls and tool calls go through agentgateway. It validates the Keycloak JWT, applies RBAC, masks credentials in prompts, meters token budgets per group and emits OpenTelemetry traces.
- **Writes are pull requests.** When an agent wants to change something, it opens a pull request in Gitea. A human merges it, and ArgoCD applies it. The agent's own ServiceAccount has read-only access to the cluster.
- **An autonomy ladder.** Runs operate at one of four levels: `read-only`, `suggest`, `approve-to-apply` and `scoped`. The ceiling lives in Git, in the `adhar-ai-config` ConfigMap. On the CLI, `--autonomy` can only lower it; a request above the ceiling is refused.
- **Explanations.** K8sGPT explains unhealthy objects, and `adhar ai diagnose` walks pods, logs and events for a package.
- **Optional self-hosted models.** You can run inference in-cluster with vLLM or llm-d instead of a hosted provider.

```bash
adhar ai status                # what is installed, keyed and reachable
adhar ai autonomy              # the ladder, and the ceiling this platform grants
adhar ai diagnose keycloak     # agentic triage: pods, logs, events
```

The AI layer is on in the production profile and off in the local profile.

## Current readiness and maturity

Adhar is in active development (v0.1.x), with a strict definition of "verified": a capability is marked verified only after an end-to-end run on a real cluster. A green ArgoCD tree alone is not enough.

| Area | Status today | What it means in practice |
|---|---|---|
| Local Kind platform | Continuously exercised | Bootstrap and core platform paths are tested regularly end to end |
| DigitalOcean and GCP | Live-verified | Full bring-up and day-1 workflows have been executed on real cloud resources |
| AWS, Azure, Civo | Render-verified | Config generation and manifests are validated; treat first runs as guided bring-up |
| On-prem (custom hosts) | Render-verified | Uses the same kubeadm-over-SSH flow, but should be piloted in a non-production environment first |
| Fleet upgrades, compliance export, identity federation | Implemented, maturing | Available for early adopters; more large-scale production evidence is still being collected |

### 100+ integrations, one operating model

The platform ships with 100+ curated open-source packages already integrated into one control model:

- Git as the source of truth (Gitea + ArgoCD reconciliation)
- Shared identity (Keycloak/OIDC across UIs and APIs)
- Shared platform APIs (`platform.adhar.io/v1alpha1`) for apps and infrastructure
- Shared telemetry (metrics, logs, traces, network visibility)

This is important because you do not have to integrate each tool yourself before teams can use it. Teams consume a consistent platform contract from day one.

### Security hardened by default

Adhar's default path is security-oriented rather than "open by default":

- CI build + scan + sign flow (Buildpacks/Tekton + Trivy + Cosign)
- Policy enforcement before deployment (Kyverno admission controls)
- Secrets lifecycle built in (OpenBao + External Secrets; no secrets in Git)
- RBAC + SSO at the platform edge (Keycloak identity model)
- GitOps drift correction (manual in-cluster edits get reconciled back to policy)

If a cloud you care about is render-verified only, start with `adhar up --dry-run`. It validates the config and shows the full plan before any infrastructure is created.

## Try it

You can get a working local platform in minutes with a short path:

1. Install and verify the CLI.
2. Bootstrap the local platform.
3. Check health and get initial credentials.
4. Create your first real platform resource with YAML.

```bash
# 1) Install and verify
curl -fsSL https://raw.githubusercontent.com/adhar-io/adhar/main/install.sh | bash
adhar version

# 2) Bootstrap local platform
adhar up

# 3) Check health and access
adhar get status
adhar get secrets -p argocd
```

Then create your first database the GitOps way:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Database
metadata:
  name: orders
  namespace: team-payments
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local
        engine: postgresql
  parameters:
    engine: postgresql
    engineVersion: "16"
    storageSize: 20Gi
```

```bash
# 4) Apply declarative resource
kubectl apply -f orders-database.yaml
```

From there, these pages take you further:

- [Quick Start](/docs/getting-started/quick-start) explains each phase of `adhar up` while you wait.
- [Your First Service](/docs/getting-started/first-service) takes a golden-path template all the way to a URL.
- [The 6 D's Framework](/docs/core-concepts/ds-framework) covers the lifecycle model in depth.
- [Roadmap](/docs/reference/roadmap) shows what is verified and what comes next.

Adhar is built in the open. Issues, discussions and design proposals are welcome on [GitHub](https://github.com/adhar-io/adhar).
