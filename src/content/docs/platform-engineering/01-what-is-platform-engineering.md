---
title: "What is Platform Engineering?"
section: "Platform Engineering"
order: 1
path: "/docs/platform-engineering/what-is-platform-engineering"
---

# What is Platform Engineering?

**Platform engineering is the practice of building and running an internal product whose users are your own engineers.** That product is an *internal developer platform* (IDP). It turns the work every team repeats on the way to production — building, deploying, provisioning infrastructure, monitoring, meeting security controls — into self-service.

This page defines the practice, the problem it solves, and how Adhar implements it. It is the first of six pages; the reading order is at the end.

## The problem it solves

You want each product team to own its service end to end. *Team Topologies* (Skelton and Pais) calls such a team **stream-aligned**: aligned to one product or one slice of the business.

Ownership brings a second job that has nothing to do with the team's domain: how the service is built, signed, deployed, promoted, given secrets, TLS and a database, monitored, and audited. Each question has an answer. The problem is that the answers multiply — teams times concerns — and each one must be maintained for the life of the service.

| Symptom | Cause |
|---|---|
| Seven services, seven differently shaped CI pipelines | Each team solved building on its own |
| A base-image CVE is slow to clear | No single place to change it; someone must find every copy |
| Nobody can answer "which services run as root?" | The answer lives in seven repositories, in seven formats |
| Moving between teams means relearning delivery | Delivery knowledge belongs to each team, not the organisation |
| Incident response depends on who is awake | Operational knowledge did not travel with the pattern |

None of this comes from weak engineers. It comes from asking every team to solve the same problem alone.

## Cognitive load is the central idea

**Cognitive load** is how much a team has to hold in its head. A team that is asked to hold too much does not fail loudly. It slows down, defers maintenance, and stops doing the thinking you hired it for.

*Team Topologies* splits the load three ways:

| Kind of load | In a developer's day | What a platform does with it |
|---|---|---|
| **Intrinsic** | The domain, the data model, the language — the actual work | Leaves it with the team |
| **Extraneous** | Which secrets path to use, hand-edited manifests, a flaky shared build step | Removes it |
| **Germane** | Designing a service boundary, learning how your datastore fails | Makes room for it |

```diagram
pv-pe-cognitive-load
```

Use this as the test for any platform feature: **does it remove extraneous load, or does it move the load and add one more thing to learn?** An abstraction a team has to debug through is extraneous load with extra steps.

## What makes something a platform

A platform is a product, not a list of tools. A wiki page of conventions, a shared cluster, or a set of tools the platform team likes is not one. Five properties make the difference:

```diagram
npe-platform-properties
```

| Property | What it means |
|---|---|
| **Interface** | A stable way to ask for something: an API, a CLI, a template, a portal. You can replace what sits behind it without users noticing |
| **Self-service** | The common case needs no human. A request a person must approve is a ticket with better branding |
| **Opinionated defaults** | One well-supported route — a [golden path](/docs/platform-engineering/golden-paths) — not a set of settings to learn first |
| **Operation** | A version, an upgrade path, a changelog, and someone on call |
| **Exit** | A team can leave the default route by choice. It costs more, and that cost is visible |

## What a platform team does, and must not do

| Does | Must not become |
|---|---|
| Builds and runs the shared capabilities: build and release, runtime, infrastructure, identity, secrets, telemetry | **A ticket queue.** If getting a database means asking a person, you have the old operations team with a new name |
| Maintains the golden paths through those capabilities | **A gatekeeper.** Enforcement belongs in the pipeline, not in a review board — see [The Paved Road to Production](/docs/platform-engineering/paved-road) |
| Treats teams as users: interviews them, measures adoption, publishes a roadmap — see [Platform as a Product](/docs/platform-engineering/platform-as-a-product) | **An ivory tower.** A platform designed from guesses has elegant capabilities and no users |
| Absorbs the upgrade and migration work every team would otherwise repeat | **The owner of the services.** If the platform team is paged for a product team's bad query, ownership has moved back to the centre |

## When you need one

| Ready | Not ready |
|---|---|
| Several teams solve the same delivery problem separately | One or two teams — a written convention is enough |
| You can name the repeated work concretely | The real problem is one unreliable service |
| A named owner is accountable for the platform as a product | You plan to rename the operations team and change nothing else |
| Leadership accepts an ongoing investment, not a project with an end date | The main goal is to enforce controls — a platform built as a control gets routed around |

With a single team there is no repeated work to remove. Pick one way to build, one way to deploy, one way to get a database, and write it down.

## Failure modes

| Failure | Why it happens | What to do instead |
|---|---|---|
| Nobody adopts it | Built from guesses; adoption mandated, not earned | Start with one real team and one real pain; make the paved route the fastest route |
| The abstraction leaks | It hid the complexity instead of owning it | Keep the underlying objects visible and inspectable |
| The platform team is the bottleneck | The common case still needs a human | Automate the common case first; make rare cases an explicit exception |
| The golden path becomes a cage | The default became mandatory | Keep the exit open, and be honest about its cost |
| It never ships | Built for every case before serving any | Ship narrow and real; widen based on use |

## How Adhar does this

Adhar is an open-source internal developer platform. It ships the five properties as defaults.

| Property | In Adhar | Read more |
|---|---|---|
| Interface | The `adhar` CLI, the Adhar Console, and namespaced Kubernetes APIs such as `Database`, `Cache`, `Bucket` and `Cluster` | [CLI Reference](/docs/reference/cli) |
| Self-service | Crossplane composes each request in the team's own namespace, under ordinary RBAC. No ticket | [Control Plane](/docs/core-concepts/control-plane) |
| Opinionated defaults | Golden-path templates in the `adhar/adhar-templates` repository. `adhar application templates` lists them; `adhar application deploy <app> --template <name>` and the Console's create flow use the same collection | [Golden Paths](/docs/platform-engineering/golden-paths) |
| Guardrails in the road | A Tekton pipeline builds with Cloud Native Buildpacks, scans, signs with Cosign and pushes to Harbor. Kyverno rejects unsigned images from Harbor's `library/*` project in workload namespaces | [The Paved Road](/docs/platform-engineering/paved-road) |
| Operation | The platform is a set of packages that Argo CD reconciles from an in-cluster Gitea with self-heal on. A commit is the only lasting way to change what Argo CD manages; `adhar upgrade` rolls the platform forward | [Upgrade the Platform](/docs/guides/upgrade-the-platform) |
| Exit | Everything generated is ordinary Kubernetes and Git. A team can stop using a template and keep the cluster | [Customization](/docs/operations/customization) |

## Next steps

Read this section in order. It is one argument across six pages.

1. [Platform Engineering vs DevOps](/docs/platform-engineering/vs-devops) — what DevOps got right, where it struggled, and where SRE fits.
2. [Golden Paths](/docs/platform-engineering/golden-paths) — the supported default route, and how to keep it from becoming a cage.
3. [The Paved Road to Production](/docs/platform-engineering/paved-road) — commit to production, with the guardrails built in.
4. [Platform as a Product](/docs/platform-engineering/platform-as-a-product) — users, adoption and feedback loops.
5. [Measuring Platform Success](/docs/platform-engineering/measuring-success) — DORA, developer experience, and what not to measure.

To see the mechanics first, start with [Architecture](/docs/core-concepts/architecture), then [Your First Service](/docs/getting-started/first-service).
