---
title: "What is Platform Engineering?"
section: "Platform Engineering"
order: 1
path: "/docs/platform-engineering/what-is-platform-engineering"
---

# What is Platform Engineering?

**Platform engineering is the discipline of building and operating an internal product whose users are your own engineers.** That product — an internal developer platform, or IDP — turns the work every team repeats on the way to production (building, deploying, provisioning infrastructure, wiring observability, satisfying security controls) into a self-service capability, so product teams can own their services without each of them separately re-solving the delivery problem.

This page defines the discipline and the problem it answers. It is the entry point to this section; the reading order for the rest is at the end.

## At a glance

| | |
|---|---|
| **What it is** | An internal product that makes the common route to production self-service |
| **Who it serves** | Your own engineers — the teams building customer-facing software |
| **Central idea** | Reduce the *extraneous* cognitive load carried by product teams |
| **Unit of work** | Platform capabilities, with users, a roadmap, and measured adoption |
| **How it spreads** | By being the fastest route, not by being mandated |
| **When you need it** | When the same delivery problem is being solved privately by several teams |
| **Main failure modes** | A platform nobody adopts; a platform team that becomes a gate |

## The problem it answers

*Team Topologies* (Matthew Skelton and Manuel Pais) calls a team aligned to a single stream of work — one product, one customer journey, one slice of the domain — a **stream-aligned team**. That is the team you want doing most of your engineering, and you want it to own its service end to end.

The moment such a team owns a service end to end, it inherits a second job with nothing to do with its domain: how the service is built and into what, where the artifact is stored and how it is signed, how a deployment is expressed and promoted between environments, how secrets reach the running process, how TLS and ingress are configured, how the service gets a database and who backs it up, what the dashboards and alerts look like, and how any of it survives an audit.

Every one of those questions is answerable. The problem is not difficulty — it is multiplication. The cost scales with the number of teams multiplied by the number of concerns, and each answer is a decision that must then be maintained for as long as the service lives.

What that looks like with several teams:

| Symptom | What caused it |
|---|---|
| Seven services, seven differently-shaped CI pipelines | Each team solved building privately, at a different time |
| A base-image CVE takes weeks to clear | No single place to change it; someone must find every copy |
| Nobody can answer "which services run as root?" | The answer lives in seven repositories, in seven formats |
| Moving between teams means relearning delivery | Delivery knowledge is team-local, not organisational |
| Incident response depends on who is awake | Operational knowledge did not transfer with the pattern |

None of this is caused by weak engineers. It is caused by asking every team to solve the same problem in private, and then being surprised that the answers differ.

## Cognitive load is the central idea

*Team Topologies* makes **cognitive load** a first-class constraint on how you draw team boundaries: a team has a finite capacity for what it can hold in its head, and a team asked to hold more than that capacity does not fail loudly — it slows down, defers maintenance, and stops doing the thinking you hired it for. Skelton and Pais borrow the three-way split from cognitive load theory, originally research on learning by John Sweller, and apply it to teams.

Applied to a developer's day:

| Kind of load | In the original theory | In a developer's day |
|---|---|---|
| **Intrinsic** | Complexity inherent to the material | The domain, the data model, the language, the algorithm — the actual work |
| **Extraneous** | Load imposed by how the material is presented | Recalling which secrets path to use, hand-editing manifests, chasing a flaky shared build step, decoding another team's dashboard conventions |
| **Germane** | Effort that builds durable understanding | Designing a service boundary, learning the failure modes of your datastore, improving the domain model |

The objective is not to drive total load to zero. Intrinsic load *is* the work, and germane load is where the compounding value sits. Platform engineering targets **extraneous load specifically**, and converts part of the intrinsic infrastructure load into something a team consumes through an interface rather than operates.

```diagram
pv-pe-cognitive-load
```

This also gives you the test for whether a platform feature is worth building: **does it remove extraneous load from a team, or does it only move the load and add one more thing to learn?** An abstraction a team has to debug through is extraneous load with extra steps.

## What an internal developer platform actually is

"Platform" here means a **product**, not an artifact and not a directory of tools. Three things are routinely called a platform and are not one:

- **A wiki page of conventions.** Writing the path down is not building it. The team still does all the work, now with a reading assignment attached. Documentation describes a path; a platform *is* one.
- **A shared Jenkins, a shared cluster, a shared Terraform repository.** Shared infrastructure is a prerequisite, not a platform. Without a product shape it becomes a shared queue with a shared owner who is permanently behind.
- **A collection of tools the platform team likes.** A toolchain becomes a platform when there is a supported, composed, documented route through it and someone is accountable for that route working.

What makes something a platform:

- **An interface.** A stable, defined way to ask for something — an API, a CLI, a template, a portal. The interface is the product; the implementation behind it should be replaceable without users noticing.
- **Self-service.** The common case is served with no human in the loop. A request that needs a person to approve it is a ticket with better branding.
- **Opinionated defaults.** A well-supported default route — see [Golden Paths](/docs/platform-engineering/golden-paths) — rather than a configuration surface to learn before first use.
- **Operation.** It has a version, an upgrade story, a changelog, and someone on call for it.
- **An exit.** A team can go off-road, paying more for it visibly and by its own choice rather than being blocked.

## What a platform team does

- Builds and runs the capabilities: build and release, runtime, infrastructure provisioning, identity, secrets, telemetry.
- Designs and maintains the golden paths through those capabilities.
- Makes compliance and security a property of the road, not a review at the end — see [The Paved Road to Production](/docs/platform-engineering/paved-road).
- Treats its users as users: interviews them, measures adoption, runs a roadmap, publishes what it will not build. See [Platform as a Product](/docs/platform-engineering/platform-as-a-product).
- Absorbs the upgrade and migration work that would otherwise be duplicated by every team.

## What a platform team must not do

> **Become a ticket queue.** If the standard way to get a database is to ask a person, you have the old operations team with a new name. The honest check is what fraction of common requests complete with no human in the loop.

> **Become a gatekeeper.** A platform team with veto power over releases makes itself a bottleneck and gives every team a motive to route around it. Enforcement belongs in the pipeline as a property, not in a board as a meeting.

> **Become an ivory tower.** A platform designed from assumptions about what teams need, rather than from what they actually complain about, produces elegant capabilities with no users.

> **Take over ownership of the services.** If the platform team is paged for a product team's bad query, ownership has moved back to the centre — the arrangement platform engineering exists to avoid.

## When you are ready — and when you are not

**A three-person startup does not need this.** With one team there is no duplicated work to remove, and a platform team would be most of your engineering capacity building for a single customer. Do what a platform would do — pick one way to build, deploy, and get a database — and write it down. A convention is the right amount of platform at that size.

| Ready | Not ready |
|---|---|
| Several stream-aligned teams solving the same delivery problem separately | One or two teams, where a convention is enough |
| You can name the duplicated work concretely, not only as "friction" | The real problem is one unreliable service — that is a reliability problem |
| A named owner will be accountable for the platform as a product | You plan to rename the operations team and change nothing else |
| Leadership accepts a standing product investment, not a project with an end date | The goal is primarily to enforce controls — a platform built as a control gets routed around |

## Honest failure modes

| Failure | Why it happens | What to do instead |
|---|---|---|
| Nobody adopts it | Built from assumption; adoption mandated instead of earned | Start with one real team and one real pain; make the paved route the fastest route |
| The abstraction leaks | Hid the complexity instead of owning it; users must debug through it | Make the underlying objects visible and inspectable; abstract the work, not the truth |
| The platform team is the bottleneck | Self-service was promised but the common case still needs a human | Automate the common case first; keep the long tail as an explicit, documented exception |
| The golden path becomes a gilded cage | The default became mandatory, with no supported way off | Keep the exit open and priced honestly |
| It never ships | Built for every case before serving any case | Ship narrow and real; widen from use |

## How Adhar does this

Adhar is an opinionated, open-source internal developer platform that ships the positions above as defaults.

- **Self-service infrastructure, not tickets.** Crossplane v2 exposes databases, caches, buckets, and clusters as *namespaced* Kubernetes resources, so a team requests infrastructure in its own namespace under ordinary RBAC. See [Control Plane](/docs/core-concepts/control-plane).
- **Golden paths that ship as code.** CLI templates (`basic`, `microservice`, `frontend`, `data-pipeline`, `ml`, `argo-workflows`, `app-with-bucket`) via `adhar application deploy --template`, plus Backstage scaffolder templates in the Adhar Console.
- **Guardrails as properties of the road.** Tekton with buildpacks builds, Trivy scans, Cosign signs, Harbor stores, and Kyverno admits only signed images.
- **One way in.** ArgoCD reconciles the cluster from an in-cluster Gitea with self-heal enabled, so a commit is the only durable way to change the platform.

## Where to go next

Read this section in order; it is one argument across six pages.

1. [Platform Engineering vs DevOps](/docs/platform-engineering/vs-devops) — what DevOps got right, where it strained at scale, and where SRE fits.
2. [Golden Paths](/docs/platform-engineering/golden-paths) — the well-supported default route, and how to keep it from becoming a cage.
3. [The Paved Road to Production](/docs/platform-engineering/paved-road) — commit to production, with the guardrails built into the road.
4. [Platform as a Product](/docs/platform-engineering/platform-as-a-product) — users, adoption, feedback loops, and the anti-patterns.
5. [Measuring Platform Success](/docs/platform-engineering/measuring-success) — DORA, developer experience, and what not to measure.

If you would rather see the mechanics first, start with [Architecture](/docs/core-concepts/architecture), then [Your First Service](/docs/getting-started/first-service).
