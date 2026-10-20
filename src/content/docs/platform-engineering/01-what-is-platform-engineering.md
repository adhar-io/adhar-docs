---
title: "What is Platform Engineering?"
section: "Platform Engineering"
order: 1
path: "/docs/platform-engineering/what-is-platform-engineering"
---

# What is Platform Engineering?

**Platform engineering is the practice of building and running an internal product whose users are your own engineers.** That product is called an internal developer platform, or IDP. Every team repeats the same work on the way to production: building, deploying, setting up infrastructure, wiring up monitoring, and meeting security controls. An IDP turns that work into self-service. Product teams can then own their services without each one solving the delivery problem again on its own.

This page defines the practice and the problem it solves. It is the starting point for this section. The reading order for the other pages is at the end.

## At a glance

| | |
|---|---|
| **What it is** | An internal product that makes the common route to production self-service |
| **Who it serves** | Your own engineers — the teams building customer-facing software |
| **Central idea** | Reduce the *extraneous* (unnecessary) mental load on product teams |
| **Unit of work** | Platform capabilities, with users, a roadmap, and measured adoption |
| **How it spreads** | By being the fastest route, not by being mandated |
| **When you need it** | When several teams are each solving the same delivery problem on their own |
| **Main failure modes** | A platform nobody adopts; a platform team that becomes a gate |

## The problem it solves

*Team Topologies*, by Matthew Skelton and Manuel Pais, describes the **stream-aligned team**. This is a team aligned to a single stream of work: one product, one customer journey, or one slice of the business domain. You want teams like this doing most of your engineering. You also want each one to own its service end to end.

But once a team owns a service end to end, it takes on a second job that has nothing to do with its domain. It has to answer questions like these:

- How is the service built, and into what?
- Where is the artifact stored, and how is it signed?
- How is a deployment described, and how is it promoted between environments?
- How do secrets reach the running process?
- How are TLS and ingress configured?
- How does the service get a database, and who backs it up?
- What do the dashboards and alerts look like?
- How does any of this pass an audit?

Every one of those questions has an answer. The problem is not that they are hard. The problem is that they multiply. The cost grows with the number of teams times the number of concerns. And each answer is a decision that someone must maintain for as long as the service lives.

Here is what that looks like with several teams:

| Symptom | What caused it |
|---|---|
| Seven services, seven differently-shaped CI pipelines | Each team solved building on its own, at a different time |
| A base-image CVE takes weeks to clear | No single place to change it; someone must find every copy |
| Nobody can answer "which services run as root?" | The answer lives in seven repositories, in seven formats |
| Moving between teams means relearning delivery | Delivery knowledge belongs to each team, not the organisation |
| Incident response depends on who is awake | Operational knowledge did not travel with the pattern |

Weak engineers do not cause any of this. It comes from asking every team to solve the same problem alone, and then being surprised that the answers differ.

## Cognitive load is the central idea

**Cognitive load** is the amount a person or team has to hold in their head. *Team Topologies* treats it as a key limit when you decide where team boundaries go. A team can only hold so much. When you ask it to hold more, it does not fail loudly. Instead it slows down, puts off maintenance, and stops doing the thinking you hired it for.

Skelton and Pais borrow a three-way split from cognitive load theory and apply it to teams. The theory came from John Sweller's research on learning.

Here is how the split maps to a developer's day:

| Kind of load | In the original theory | In a developer's day |
|---|---|---|
| **Intrinsic** | Complexity that is part of the material itself | The domain, the data model, the language, the algorithm — the actual work |
| **Extraneous** | Load added by how the material is presented | Remembering which secrets path to use, hand-editing manifests, chasing a flaky shared build step, decoding another team's dashboard conventions |
| **Germane** | Effort that builds lasting understanding | Designing a service boundary, learning how your datastore fails, improving the domain model |

The goal is not to cut total load to zero. Intrinsic load *is* the work, and germane load is where value builds up over time. Platform engineering goes after **extraneous load specifically**. It also takes part of the intrinsic infrastructure load and turns it into something a team uses through an interface, instead of something it runs.

```diagram
pv-pe-cognitive-load
```

This gives you a test for whether a platform feature is worth building: **does it remove extraneous load from a team, or does it only move the load and add one more thing to learn?** If a team has to debug through an abstraction, that abstraction is extraneous load with extra steps.

## What an internal developer platform actually is

Here, "platform" means a **product**. It is not a single artifact, and it is not a list of tools. Three things often get called a platform but are not one:

- **A wiki page of conventions.** Writing the path down is not building it. The team still does all the work, and now has reading to do as well. Documentation describes a path; a platform *is* one.
- **A shared Jenkins, a shared cluster, a shared Terraform repository.** Shared infrastructure is a starting requirement, not a platform. Without the shape of a product, it becomes a shared queue with one owner who is always behind.
- **A collection of tools the platform team likes.** A set of tools becomes a platform only when there is a supported, documented route through it that fits the pieces together, and someone is accountable for that route working.

What makes something a platform:

- **An interface.** A stable, defined way to ask for something: an API, a CLI, a template, or a portal. The interface is the product. You should be able to replace what sits behind it without users noticing.
- **Self-service.** The common case needs no human in the loop. A request that needs a person to approve it is just a ticket with better branding.
- **Opinionated defaults.** A well-supported default route — see [Golden Paths](/docs/platform-engineering/golden-paths). Not a set of settings you must learn before you can start.
- **Operation.** It has a version, a way to upgrade, a changelog, and someone on call for it.
- **An exit.** A team can go off-road by its own choice instead of being blocked. It pays more for doing so, and that cost is visible.

## What a platform team does

- Builds and runs the capabilities: build and release, runtime, infrastructure provisioning, identity, secrets, and telemetry.
- Designs and maintains the golden paths through those capabilities.
- Makes compliance and security part of the road itself, not a review at the end — see [The Paved Road to Production](/docs/platform-engineering/paved-road).
- Treats its users as real users. It interviews them, measures adoption, runs a roadmap, and publishes what it will not build. See [Platform as a Product](/docs/platform-engineering/platform-as-a-product).
- Takes on the upgrade and migration work that every team would otherwise repeat.

## What a platform team must not do

> **Become a ticket queue.** If the standard way to get a database is to ask a person, you have the old operations team with a new name. The honest check is this: what fraction of common requests finish with no human in the loop?

> **Become a gatekeeper.** A platform team that can veto releases turns itself into a bottleneck. It also gives every team a reason to work around it. Enforcement belongs in the pipeline as a built-in property, not in a review board as a meeting.

> **Become an ivory tower.** If you design a platform from guesses about what teams need, instead of from what they actually complain about, you get elegant capabilities with no users.

> **Take over ownership of the services.** If the platform team gets paged for a product team's bad query, ownership has moved back to the centre. That is exactly the arrangement platform engineering exists to avoid.

## When you are ready — and when you are not

**A three-person startup does not need this.** With one team there is no repeated work to remove. A platform team would take most of your engineering capacity to build for a single customer. Instead, do what a platform would do: pick one way to build, one way to deploy, and one way to get a database, and write it down. At that size, a convention is the right amount of platform.

| Ready | Not ready |
|---|---|
| Several stream-aligned teams solving the same delivery problem separately | One or two teams, where a convention is enough |
| You can name the repeated work concretely, not only as "friction" | The real problem is one unreliable service — that is a reliability problem |
| A named owner will be accountable for the platform as a product | You plan to rename the operations team and change nothing else |
| Leadership accepts an ongoing product investment, not a project with an end date | The main goal is to enforce controls — a platform built as a control gets routed around |

## Honest failure modes

| Failure | Why it happens | What to do instead |
|---|---|---|
| Nobody adopts it | Built from guesses; adoption mandated instead of earned | Start with one real team and one real pain; make the paved route the fastest route |
| The abstraction leaks | It hid the complexity instead of owning it; users must debug through it | Make the underlying objects visible and inspectable; abstract the work, not the truth |
| The platform team is the bottleneck | Self-service was promised, but the common case still needs a human | Automate the common case first; keep the rare cases as an explicit, documented exception |
| The golden path becomes a gilded cage | The default became mandatory, with no supported way off | Keep the exit open, and be honest about what it costs |
| It never ships | Built for every case before serving any case | Ship narrow and real; widen based on use |

## How Adhar does this

Adhar is an opinionated, open-source internal developer platform. It ships the positions above as defaults.

- **Self-service infrastructure, not tickets.** Crossplane v2 exposes databases, caches, buckets, and clusters as *namespaced* Kubernetes resources. A team requests infrastructure in its own namespace, under ordinary RBAC. See [Control Plane](/docs/core-concepts/control-plane).
- **Golden paths that ship as code.** CLI templates (`basic`, `microservice`, `frontend`, `data-pipeline`, `ml`, `argo-workflows`, `app-with-bucket`) run through `adhar application deploy --template`. There are also Backstage scaffolder templates in the Adhar Console.
- **Guardrails built into the road.** Tekton with buildpacks builds the image, Trivy scans it, Cosign signs it, and Harbor stores it. Kyverno admits only signed images.
- **One way in.** ArgoCD keeps the cluster in sync with an in-cluster Gitea, with self-heal turned on. So a commit is the only lasting way to change the platform.

## Where to go next

Read this section in order. It is one argument spread across six pages.

1. [Platform Engineering vs DevOps](/docs/platform-engineering/vs-devops) — what DevOps got right, where it struggled at scale, and where SRE fits.
2. [Golden Paths](/docs/platform-engineering/golden-paths) — the well-supported default route, and how to keep it from becoming a cage.
3. [The Paved Road to Production](/docs/platform-engineering/paved-road) — from commit to production, with the guardrails built into the road.
4. [Platform as a Product](/docs/platform-engineering/platform-as-a-product) — users, adoption, feedback loops, and the anti-patterns.
5. [Measuring Platform Success](/docs/platform-engineering/measuring-success) — DORA, developer experience, and what not to measure.

If you would rather see the mechanics first, start with [Architecture](/docs/core-concepts/architecture), then [Your First Service](/docs/getting-started/first-service).
