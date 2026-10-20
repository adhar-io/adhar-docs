---
title: "The 6 D's Framework"
section: "Core Concepts"
order: 3
path: "/docs/core-concepts/ds-framework"
---

# The 6 D's Framework

The 6 D's are Adhar's model for the full cloud-native lifecycle. It has **six named stages. Each stage has an owner, an artifact it hands to the next stage, and platform capabilities that make that handoff automatic.**

The model exists because platform engineering fails when tools are adopted one at a time and nobody can see the whole path. That path runs from an idea to production and back again.

The six stages are **Define, Design, Develop, Deliver, Discover, Decide**. The last feeds the first, which makes it a loop rather than a pipeline.

```diagram
cc-lifecycle-loop
```

## Why the framework earns its place

A framework that only renames familiar activities adds work without value. This one does two jobs.

**It gives the catalogue an organising principle.** Adhar ships over a hundred packages. "Which of these do I need?" cannot be answered from a list of technologies. It can be answered from a list of outcomes. Every package serves at least one D. A D with no packages behind it is a gap in the platform, not a gap in your process.

**It names the handoffs.** Most delivery pain is not inside a stage. It is at the boundary between two stages: a design nobody encoded, a deployment nobody can trace to a commit, a dashboard nobody reads. Adhar's position is that **every handoff should be a reviewable artifact in Git**, not a document or a conversation.

```diagram
cc-handoff-artifacts
```

## At a glance

| Phase | The question it answers | Typically owned by | Artifact it produces |
|---|---|---|---|
| **Define** | What are we building, and who owns it? | Product owner and tech lead | Catalog entry, `Project`, API contract |
| **Design** | How will it be built, and within which limits? | Architects with platform engineering | XRDs, Compositions, Kyverno policies, quotas |
| **Develop** | Does the code work against the real platform? | The application team | Source, tests, and a preview environment |
| **Deliver** | How does a commit become production, safely? | Shared — team owns the commit, platform owns the path | Signed image, ArgoCD Application, promotion |
| **Discover** | What is it actually doing in production? | The team on call, with SRE | Metrics, logs, traces, cost, scorecards |
| **Decide** | What should we do next, and why? | Engineering and product leadership | Budgets, roadmap changes, new Define inputs |

## The six phases

### 1. Define — what are we building, and who owns it

Define fixes scope and ownership before any code exists. It covers:

- service boundaries and responsibilities
- the data model
- API contracts
- the non-functional requirements (latency, availability, data residency) that later constrain Design

In Adhar, Define is not a document. The unit of ownership is a **project**, and a project is a real object:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Project                     # platform.adhar.io — formerly CompositeProject
metadata:
  name: payments-api
  namespace: team-payments
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local             # selects the project-local Composition
  parameters:
    organisation: acme
    team: payments
    name: payments-api
    description: Payment capture and settlement service
    tier: dev
    cpuQuota: "4"                   # becomes the namespace's ResourceQuota
    memoryQuota: 8Gi
    podQuota: 30
    createRepository: true          # a Gitea repo for the project
```

Apply it, then check what Define produced: first the request, then the namespace and guardrails it composed.

```bash
kubectl create namespace team-payments    # the Project XR is namespaced; nothing creates this for you
kubectl apply -f project.yaml
kubectl get projects.platform.adhar.io -n team-payments       # READY True
kubectl get resourcequota,limitrange,networkpolicy -A | grep payments-api
```

The CLI makes the same object with `adhar project create`. `Project` shares its short name with Kargo's `Project`, so qualify it as `projects.platform.adhar.io` on the command line.

Applying it creates:

- a guard-railed namespace (ResourceQuota, LimitRange, default-deny NetworkPolicy)
- RBAC bound to the team's Keycloak group
- a Gitea repository

Ownership, limits and the source of truth are decided once and expressed in one place.

**What Adhar provides:**

- the Adhar Console software catalog (Backstage) for discovery and ownership
- the `Organisation → Team → Project → Application` hierarchy behind `adhar project create`
- golden-path templates (`adhar application templates`), so "which shape of service is this?" becomes a choice from a curated list
- OpenMetadata for data-asset catalog and lineage

**Done when** the service has an owner, a namespace with limits, a repository, and a catalog entry.

### 2. Design — how it will be built, and within which limits

Design turns requirements into a shape you can build. It covers:

- component architecture
- the security model (authentication, authorization, data classification)
- deployment topology and promotion strategy
- integration patterns with everything outside the service

Here, Adhar makes **guardrails executable**. Instead of a design review that a service passes or fails, the platform encodes the decision:

- A self-service infrastructure contract is a Crossplane **XRD** (an API definition). Each implementation of it is a **Composition**. The control plane ships about forty XRDs and sixty-odd Compositions (`kubectl get xrd` lists them). See [Control Plane](/docs/core-concepts/control-plane).
- An architectural rule is a **Kyverno** policy. `adhar-kyverno-policies` and `adhar-policy-packs` carry the baseline. A denial names the policy that rejected the workload.
- A tenancy boundary is a quota. `adhar-tenant-quotas` caps a team's total across its projects.

A guardrail written this way is an ordinary manifest. The `CompliancePolicy` API puts Kyverno guardrails, in audit or enforce mode, behind the same self-service contract as a database. Its default Composition is `compliancepolicy-local`. `examples/compliance-policy.yaml` in the platform repo is a working request. Explore the API before you write one:

```bash
kubectl explain compliancepolicies.platform.adhar.io.spec.parameters   # the fields you can set
kubectl get compositions -l feature=compliance --show-labels          # the engines behind it
```

**Done when** every constraint a reviewer would check by hand is either a Composition, a policy, or a quota.

### 3. Develop — does the code work against the real platform

Develop is the inner loop: scaffolding, local iteration, testing and code quality. It targets the gap between a developer's laptop and the environment the code will actually run in.

`adhar dev` closes that gap by moving the inner loop onto the cluster:

1. It creates a dev namespace for each developer.
2. It runs your working tree there.
3. It re-syncs on every save, typically in about a second. There is no image build, registry push or commit in the loop.

Your code runs beside the platform's own Postgres, Kafka, object store and identity. It runs under the same service DNS, NetworkPolicies and admission rules as production.

```bash
adhar dev api --port 8080      # working tree on the cluster, re-synced on save
adhar push api                 # the full build → sign → deploy path, on demand
```

**What Adhar provides:**

- `adhar dev` and `adhar push`
- Coder for hosted development environments
- the Adhar Kit Java modules and `adhar-libraries` pipelines, which release shared Maven and npm artifacts into Nexus
- short-lived preview environments, with quotas and limits stamped on by Kyverno (`adhar-preview-environments`)
- k6 for load tests expressed as Kubernetes resources

**Done when** a pull request exists and the change has run against real platform dependencies.

### 4. Deliver — how a commit becomes production, safely

Deliver is the outer loop. It is the stage Adhar automates most completely. The chain is: build, scan, sign, store, admit, deploy, promote.

```diagram
cc-deliver-chain
```

Deployment itself is declarative. `adhar application deploy --repo …` creates an `Application` (`platform.adhar.io/v1alpha1`). So does the Console's create wizard — it is the same object either way. Dev auto-syncs, and later environments are promoted through Kargo:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Application                   # formerly CompositeApplication
metadata:
  name: payments-api
  namespace: team-payments
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local
  parameters:
    project: default
    source:
      repoURL: https://gitea.cloud.adhar.io/adhar/payments-api.git
      path: deploy
      targetRevision: main
    destination:
      namespace: team-payments
    # omit `environments` for the platform default: dev auto-syncs,
    # test and prod are promoted through Kargo
```

A promotion is itself an object: a `Release` moves one piece of freight (a versioned set of artifacts) into one environment. So the answer to "what is in production, and how did it get there?" is a list of commits and `Release` objects, not a chat log.

> **Nothing is deployed by a person.** ArgoCD self-heals, so a change applied directly to the cluster is reverted. If a deployment did not come from a commit, it does not survive.

**Done when** production state is derivable from Git alone, and a rollback is a revert.

### 5. Discover — what it is actually doing in production

Discover is observation. It covers service and dependency discovery, metrics, logs, traces, profiles, network flows and cost. It also covers the alerting that turns any of these into action. Adhar collects all of it by construction. Once a package is enabled, Grafana already sees it, with no per-service instrumentation work.

**What Adhar provides:**

- kube-prometheus and Mimir for metrics
- Loki for logs
- Tempo for traces (OTLP ingestion)
- Alloy as the collector that discovers pods, nodes and services
- Faro for browser real-user monitoring
- Hubble for live network flows
- OpenCost for per-namespace and per-workload spend
- Grafana OnCall for alert routing
- `adhar-scorecards`, which grades every service 0–100 from in-cluster signals
- Litmus and Chaos Mesh, to deliberately provoke the failures you would rather discover on purpose

**Done when** you can answer "is it healthy, how fast is it, what does it cost, and who is paged" without adding instrumentation.

### 6. Decide — what to do next, and why

Most lifecycle models leave out Decide, yet it is the stage that closes the loop. It turns the signals Discover produces into commitments:

- what to invest in
- what to deprecate
- what a team is allowed to spend
- which requirements go back into Define

**What Adhar provides:**

- Metabase for BI over the platform's databases
- PostHog for product analytics
- `adhar-cost-governance`, which turns OpenCost metrics into declared budgets with alerts at 80% and 100%. `adhar cost` reads these budgets, so showback (reporting spend back to teams) and alerting agree on one number.
- `adhar compliance export`, which writes control posture as a Markdown or JSON evidence artifact
- the scorecard summary, as a portfolio-level view of production readiness
- the lakehouse stack (Trino, MLflow, OpenMetadata), when decisions need more than dashboards

**Done when** a decision has changed a budget, a roadmap item, or a requirement — and that change is visible to the team that will implement it.

## Each phase, mapped to the platform

| Phase | Adhar capabilities | Packages and commands |
|---|---|---|
| **Define** | Catalog, ownership, tenancy, golden paths | `adhar-console`, `Project`, `open-metadata`, `adhar project create`, `adhar application templates` |
| **Design** | Self-service contracts, policy, quotas | `crossplane` (XRDs + Compositions), `kyverno`, `adhar-kyverno-policies`, `adhar-policy-packs`, `adhar-tenant-quotas`, `keycloak` |
| **Develop** | Inner loop, hosted IDEs, previews, shared libraries | `adhar dev`, `adhar push`, `coder`, `adhar-libraries`, `nexus`, `adhar-preview-environments`, `k6` |
| **Deliver** | Build, sign, admit, deploy, promote | `tekton`, `buildpack`, `adhar-supply-chain`, `cosign`, `harbor`, `adhar-supply-chain-policies`, ArgoCD, `argo-rollout`, `kargo`, `argo-events`, `keda` |
| **Discover** | Metrics, logs, traces, flows, cost, readiness | `kube-prometheus`, `mimir`, `loki`, `tempo`, `alloy`, `faro`, `hubble`, `opencost`, `oncall`, `adhar-scorecards`, `headlamp`, `litmus` |
| **Decide** | BI, product analytics, budgets, evidence | `metabase`, `posthog`, `adhar-cost-governance`, `adhar cost`, `adhar compliance export`, `trino`, `mlflow` |

Not every package is enabled in every profile. See [Platform Services](/docs/core-concepts/platform-services) for what the local and production profiles turn on, and how to enable the rest.


## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Design decisions keep getting re-litigated in review | The constraint lives in a document, not in the platform | Encode it as a Composition, a Kyverno policy, or a quota |
| Deployments that nobody can trace to a change | Someone applied to the cluster directly | Revert it (ArgoCD already has), then make the change in Git |
| Dashboards exist but no decision has ever come from them | Discover produced signals with no Decide stage consuming them | Attach a budget, a scorecard threshold, or a review to the signal |
| `no matches for kind "CompositeProject"` | The `Composite*` kinds were renamed on 2026-10-07 and are not aliased | Use `kind: Project` (likewise `Application`, `Database`) |
| A service reaches production with no owner | Define was skipped — the namespace predates the project | Create the `Project`; the namespace, quotas and repository follow |

## Next steps

- [Architecture](/docs/core-concepts/architecture) — the layers and bootstrap behind the framework
- [Your First Service](/docs/getting-started/first-service) — Develop and Deliver, end to end
- [Platform Services](/docs/core-concepts/platform-services) — the catalogue behind every phase
- [Observability](/docs/operations/observability) — the Discover stage in depth
