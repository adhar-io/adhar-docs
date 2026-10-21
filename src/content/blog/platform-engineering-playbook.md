---
title: "The Platform Engineering Playbook"
excerpt: "Platform as a product, golden paths, the paved road and honest measurement: the practices that make an internal platform worth using, and how Adhar maps to each."
category: "Platform Updates"
author: "Adhar Team"
date: "2026-09-04"
featured: false
tags: ["Platform Engineering", "Golden Paths", "DORA", "Developer Experience", "IDP"]
---

Platform engineering is the practice of building and running an internal product whose users are your own engineers. That product is an Internal Developer Platform (IDP). Every product team repeats the same work on the way to production: builds, deployments, infrastructure, monitoring and security controls. An IDP turns that work into self-service, so each team can own its service without solving the delivery problem again on its own.

This playbook covers four practices that decide whether a platform succeeds, why each matters, and how Adhar supports it. We are also clear about where the tooling stops and your organisation's own work begins.

## Why platforms fail

Most internal platforms fail in one of two ways. Either nobody adopts them, or the platform team becomes a gate.

The second failure is easy to miss. A team that owns the pipeline starts receiving requests. Requests need a queue, and the queue needs tickets. Within a year you have a central operations group with a modern name.

The test is the unit of work. For a gatekeeper team it is a ticket. For a platform team it is a capability other teams use without asking. Every practice below is a way of keeping the platform on the right side of that line.

## 1. Treat the platform as a product

"Platform as a product" means your platform is built, funded and judged like a commercial product. It has users who choose it, a roadmap you can be held to, and voluntary adoption as the measure of success.

The key fact is that your users have alternatives. A team that finds your deployment abstraction confusing can write its own Helm chart. When a team works around the platform, it has told you something true: for its workload, the platform was worse than the alternative. That is product feedback, not disobedience.

Product discipline comes down to a few concrete duties:

- **Discovery.** Talk to the engineers who will use the platform before you build. Ask what their last bad week looked like.
- **A public roadmap.** A roadmap nobody outside the team can see is just a backlog.
- **Versioning and deprecation.** Interfaces have versions. Breaking changes come with a notice period and a migration path.
- **Support and an SLO.** The platform is production infrastructure. It needs on-call cover and published reliability targets.

The hardest part is saying no. A platform that accepts every request becomes the sum of everyone's wishes, which is the opposite of a product.

### How Adhar supports product thinking

Adhar supplies the foundation; the product work is still yours. Three properties of the project help:

- **Apache 2.0 throughout, with no proprietary tier.** No paid edition holds back a feature you need later. The licence is not what keeps you on the platform.
- **Opt-in packages.** The catalogue holds 100+ packages. The local profile turns on a curated core; the production profile turns on more. Teams adopt features in the order they need them.
- **Standard artifacts underneath.** Workloads stay Kubernetes resources. Images stay OCI images in Harbor. Configuration stays YAML in Git. When an abstraction misbehaves, you can read what it generated.

```bash
adhar stack list --enabled        # what this profile turns on
adhar stack describe harbor       # contract, dependencies, live state
adhar stack enable harbor         # a Git change you review, then converge
adhar upgrade --diff-only
```

## 2. Offer golden paths

A golden path is the supported, opinionated, fastest route through a task your organisation does over and over. Standing up a new service is the classic example. Attaching a database is another.

Three words define it:

- **Supported.** Someone owns it, fixes it and upgrades it. This is the word teams most often drop.
- **Opinionated.** It picks one database, one build system and one deployment shape. Its value is in the choices it removes.
- **Fastest.** If the approved route is slower than doing it by hand, teams will go around it, and they will be right to.

A golden path is a route, not a rule. It needs an escape hatch: a documented way off for the service with a real reason to differ. Leaving should need no permission, only acceptance that the support promise gets smaller.

The difference between a golden path and a template shows up later. Scaffolding is day 0, and it is the cheapest part of a service's life. The value of a path appears at day 30, when the second deploy needs no edits, and at day 180, when a base-image patch arrives without anyone editing the repository.

| | Template | Golden path |
|---|---|---|
| **Day 0** | A copy of a skeleton | A running service with a pipeline, a route and telemetry |
| **After day 0** | The copy starts to drift at once | Upgrades arrive by reference |
| **Ownership** | Yours, alone | Shared: the platform owns the wiring |
| **Leaving** | Nothing to leave | A documented escape hatch |

### How Adhar ships golden paths

Adhar ships golden-path templates from the `adhar/adhar-templates` repository in the platform's Gitea. The Console's create wizard offers the same collection, so a service scaffolded from the CLI and one scaffolded from the portal are the same service.

```bash
adhar application templates                   # the paths on your platform
adhar application templates microservice      # the parameters one accepts
kubectl create namespace hello
adhar application deploy hello --template microservice -n hello \
  --path manifests --project default --wait
```

(`--path manifests` points ArgoCD at the skeleton's manifests directory; `--project default` lets the app live outside the platform Project's namespaces.)

What makes these more than snippets is where the service lands. It is routable through the Gateway API, in scope for Kyverno policy and sending telemetry into the shared stack, with no per-service setup. The escape hatch is the foundation itself. Everything a template generates is ordinary Kubernetes and ordinary Git. A team can stop using the template and keep its manifests.

## 3. Build the paved road

The golden path is the route a team chooses. The paved road is the pipeline every route runs on, from commit to production. Its core principle is that safety checks are properties of the road, not gates staffed by people.

| | Gate | Property of the road |
|---|---|---|
| **Mechanism** | A human reviews and approves | The pipeline or the cluster refuses |
| **Under pressure** | Fails open: the check is skipped | Fails closed: the deploy does not happen |
| **Scales with** | Headcount | CPU |
| **Evidence** | A ticket saying someone looked | A signature, a digest, an admission record |

Human review is the right tool for judgement, and the wrong tool for anything a machine can check.

Two rules make the road work. First, move a digest, not a tag. A tag can point at different bytes tomorrow; a digest cannot. Second, audit before you enforce. Run a new policy in audit mode, publish the violations with fixes, fix the common cases in the golden path, and only then enforce. Starting with enforce blocks a deploy nobody expected, usually during an incident.

### How Adhar builds the road

Adhar builds the road as a supply chain inside the cluster. Tekton builds source with Cloud Native Buildpacks, Trivy scans the image, Cosign signs it and Harbor stores it. Kyverno admits only signed images. CI does not deploy directly. It commits, and ArgoCD applies the commit.

The audit-before-enforce sequence is written as configuration. Supply-chain policies ship in audit mode everywhere and in enforce mode in the production profile. What audit reports on an evaluation cluster is exactly what enforce would block.

```bash
adhar policy status                    # pass, fail and warn per PolicyReport
adhar compliance --failures-only       # what would be blocked today
adhar security vulnerabilities --severity high --limit 20
```

ArgoCD reconciles the cluster from Git with self-heal on, so drift is not an incident to investigate. It is a condition the system removes.

## 4. Measure what matters

Most of a platform's value lies in things that did not happen: the incident that never occurred, the week nobody spent wiring up dashboards. That makes measurement hard, and it is why teams often pick metrics that are cheap rather than accurate.

Use four families of measurement together.

**Delivery throughput and stability.** The four DORA metrics describe the delivery system:

| Metric | What it exposes |
|---|---|
| Deployment frequency | Batch size and friction in the release path |
| Lead time for changes | Waiting, approvals and pipeline delay |
| Change failure rate | Whether speed is bought with instability |
| Time to restore service | Detection, diagnosis and the cost of reversing a change |

Read them in pairs, because throughput and stability limit each other. Do not combine them into one score, and do not attach them to individuals.

**Developer experience.** Use surveys and flow measures: time from a new engineer's first day to their first change in production, time spent waiting for builds, and the number of systems someone touches to ship.

**Adoption.** Track a funnel from awareness to production services on the paved road. Voluntary adoption rate is the most informative single number you have. Track churn too: who started and then left.

**Qualitative signal.** Tag support requests by root cause and treat recurring themes as platform defects.

Avoid lines of code, ticket counts, story points and features shipped; each makes behaviour worse once counted. Any per-developer metric measures the system and blames the person.

Capture baselines before you ship. Afterwards you cannot reconstruct them.

### How Adhar supports measurement

Adhar supplies the instrumentation; the judgement stays with you.

- **Scorecards.** The `adhar-scorecards` package grades every service from 0 to 100 on production readiness, refreshed by a CronJob every 30 minutes. It grades services, never people.
- **Observability from the first deploy.** Prometheus, Loki, Tempo, Mimir and Grafana collect signal without per-service setup, so a baseline exists before you need it.
- **Cost attribution.** OpenCost assigns spend to namespaces and workloads, and `adhar cost` reads declared budgets.
- **An audit trail in Git.** Deployments arrive as commits and promotions as `Release` objects, so the answer to "what is in production, and how did it get there?" comes from the repository rather than from memory.

## Putting it together

| Practice | The question it answers | Adhar's part | Your part |
|---|---|---|---|
| Platform as a product | Will engineers choose it? | Open licence, opt-in packages, standard artifacts | Discovery, roadmap, support, saying no |
| Golden paths | Is the right way the fast way? | Templates, Console wizard, wiring by default | Choosing which paths to build and keeping them current |
| Paved road | Do controls hold under pressure? | Signed supply chain, Kyverno admission, GitOps | Deciding when to move from audit to enforce |
| Measurement | Is it working? | Scorecards, observability, cost data | Choosing honest metrics and acting on them |

## Next steps

- [What is Platform Engineering?](/docs/platform-engineering/what-is-platform-engineering) explains the practice and the cognitive-load argument.
- [Platform as a Product](/docs/platform-engineering/platform-as-a-product), [Golden Paths](/docs/platform-engineering/golden-paths) and [The Paved Road to Production](/docs/platform-engineering/paved-road) go deeper on each practice.
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) covers DORA, SPACE and the adoption funnel.
- [Quick Start](/docs/getting-started/quick-start) gets a platform running so you can try all of this yourself.
