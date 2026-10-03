---
title: "Golden Paths"
section: "Platform Engineering"
order: 3
path: "/docs/platform-engineering/golden-paths"
---

# Golden Paths

A golden path is **the supported, opinionated, fastest route through a task your organisation performs over and over** — standing up a new service, attaching a database, getting a change to production. It is a route, not a rule. Other routes stay legal; this is the one the platform team has walked, paved, instrumented, and promised to keep working.

The problem it answers is repetition without consolidation. Ten teams solve the same wiring problem — auth, ingress, CI, secrets, dashboards, alerts — ten slightly different ways, each wrong in a different place, each now a permanent maintenance burden. A golden path does that work once so the eleventh team inherits it instead of rediscovering it.

## At a glance

| | |
|---|---|
| **What it is** | The default, supported route through a recurring task |
| **What it is not** | A mandate, or a template you own alone afterwards |
| **Who offers it** | The platform team, as a versioned product with a support promise |
| **Who chooses it** | The stream-aligned team, freely — adoption is the evidence |
| **Core trade-off** | Fewer choices, in exchange for someone else carrying the wiring |
| **Main failure mode** | The gilded cage: mandatory, unmaintained, or impossible to leave |
| **Relation to the paved road** | The path is the route chosen; the [paved road](/docs/platform-engineering/paved-road) is the pipeline it runs on |

## Where the term comes from

The idea is older than the name, but "golden path" was popularised by Spotify's engineering writing — a curated, supported, opinionated route through their tooling — and carried into Backstage, whose software templates made it something you could click. That scaffolder being the most copied implementation is why "golden path" and "a template in a developer portal" get used interchangeably. They are not the same thing, and the difference is the subject of this page.

*Team Topologies* (Skelton and Pais) supplies the complementary framing: a platform exists to reduce the cognitive load on stream-aligned teams. A golden path is the most direct expression of that — a decision a team no longer has to make, because someone made it well and keeps it current.

## "Golden" means supported, not compulsory

Three words carry the definition:

- **Supported.** Someone owns it, answers questions about it, fixes it when it breaks, and upgrades it under you. This is the word that does the real work, and the one most often dropped.
- **Opinionated.** It picks one database, one build system, one deployment shape. The value is in the choices it removes, not the options it offers. A path with a configuration flag for every decision is a framework — the thing you were trying to stop each team from building.
- **Fastest.** Not merely sanctioned, but quicker to the same outcome than doing it yourself. If the blessed route is slower, teams will route around it and be right to.

```diagram
gd-golden-path-escape-hatch
```

## Four properties that separate a path from an unused template

**1. It is genuinely faster than rolling your own.** Measure that against a competent engineer doing it by hand. A path that saves an afternoon and then costs nothing will spread; one that saves an hour and imposes a weekly tax in workarounds will not.

**2. It stays supported and upgraded.** A template generates a copy and walks away; the copy starts rotting immediately, and in two years there are dozens of divergent copies of one mistake. A path keeps a relationship with the services it created — base images move, library versions move, policies tighten, and those changes reach existing users without each team hand-porting them.

**3. It covers the lifecycle, not only day 0.** Scaffolding is the cheapest part of a service's life. The expensive parts are the second deploy, the first incident, the dependency upgrade, the compliance question eighteen months later.

**4. It leaves an escape hatch.** Some service will have a real reason to deviate — a latency budget, a vendor SDK, a regulatory constraint. The path needs a documented way off that requires no permission, only acceptance that the support promise narrows. Paths without exits are not paths.

## Golden path vs gilded cage

A golden path becomes a gilded cage in three ways. All three are failures of the platform team, not of the teams complaining.

| Failure | Symptom | Cause | Fix |
|---|---|---|---|
| **Made mandatory** | Teams comply on paper, then build a shadow stack beside it | The path was losing on merit, so adoption was legislated instead of earned | Drop the mandate; treat non-adoption as a product defect and find the part that is slower than hand-rolling |
| **Stops being maintained** | Generated services pin versions nobody dares move; "don't regenerate, it breaks" | It was funded as a project, not staffed as a product | Give it an owner and a published support commitment, or retire it honestly |
| **Cannot be stepped off** | A team needs one deviation and the answer is no | Path and policy were conflated — the route became the only legal route | Separate them: policy belongs to the [paved road](/docs/platform-engineering/paved-road); the path is one supported way of satisfying it |

> The tell for a cage is "we have to use the platform." The tell for a path is "we used the platform because writing it ourselves would have taken a week."

Mandating a path also destroys your only honest feedback signal. When teams are free to leave, adoption measures quality; when they cannot, it measures nothing, and you can no longer tell a good path from a tolerated one. See [Platform as a Product](/docs/platform-engineering/platform-as-a-product).

## Choosing which paths to build

Start from what teams are already doing repeatedly and badly — not from what would be interesting to build. Useful signals, in rough order of reliability:

1. **Copy-paste archaeology.** The same `Dockerfile`, CI config, and ingress block, forked across many repositories and drifting.
2. **The ticket queue.** Any request a human fulfils by following a runbook is a path waiting to be written; repetition there is a specification handed to you for free.
3. **Repeated incidents with one root cause.** Three teams missed the same timeout setting because nothing defaulted it.
4. **The questions in chat.** Asked once, it is support. Asked weekly, it is a design gap.

Build few paths and make them good. Two paths covering most new work beat nine that each cover a slice and none of which is maintained.

## Designing one

1. **Name the task, not the technology.** "Ship an HTTP service that talks to Postgres" — not "a Spring Boot template."
2. **Start from the best implementation already running in your organisation.** Teams trust a path assembled from production code and are rightly sceptical of one invented in a platform team's sandbox.
3. **Delete choices deliberately.** Write down what the path decides for the team and what it leaves open. Both lists should be short.
4. **Decide what is generated versus what is owned.** Generated-and-owned code (business logic, the service's config) is edited freely. Generated-and-managed material (pipeline wiring, policy bindings, base manifests) must be upgradable without a merge conflict in every repository, so it belongs behind a reference — a shared workflow, a chart version, a base image — not copied inline.
5. **Write the escape hatch before you ship**, and instrument both adoption and abandonment: who started, who is still on it ninety days later, who left. The leavers are the roadmap.

## What a path actually delivers: day 0, day 30, day 180

A path's worth is not visible at creation time. Most of it arrives later, which is also why most templates are mistaken for paths.

| | Day 0 | Day 30 | Day 180 |
|---|---|---|---|
| **Team experiences** | A running service with a URL, a pipeline, and a dashboard | First feature shipped; first page handled with alerts that already existed | A dependency CVE is already patched; the base image moved under them |
| **Path supplies** | Repository, build, deployment, identity, routing, telemetry wiring | A second deploy that needed no edits, and a rollback that works | Upgrades delivered by reference, not by hand-editing every repository |
| **Without a path** | A day or a week of wiring, plus the parts you forgot | Discovering what you forgot, usually during an incident | A fork of an old mistake that nobody is funded to fix |

## Versioning without stranding anyone

A path that cannot change is dead; a path that changes carelessly costs its users more than it saved them. The working rules:

- **Version the path, and record which version each service came from.** Without that record you cannot reason about the fleet or write a migration.
- **Separate additive from breaking.** Additive changes (a new default alert, a patch release) flow to existing users automatically. Breaking changes (a new runtime major, a different deployment shape) get a new path version and a migration note.
- **Migrate for people where you can.** A team that ships a bot PR against every service on version 2 gets fleet-wide upgrades; one that publishes a migration guide gets a long tail of version 2 forever.
- **Deprecate with a date and a named successor**, keeping the old version supported until the fleet has measurably moved.

## How Adhar does this

Adhar ships golden paths two ways, both producing the same shape of service.

**CLI templates.** `adhar application deploy --template <name>` scaffolds and deploys from a built-in set: `basic`, `microservice`, `frontend`, `data-pipeline`, `ml`, `argo-workflows`, and `app-with-bucket`. The last illustrates the model best — application and object storage are provisioned together, because Crossplane v2 exposes infrastructure as namespaced Kubernetes resources, so a bucket is requested in the same place and the same way as a Deployment.

**Backstage scaffolder templates** in the Adhar Console, for teams who prefer a portal to a terminal. Same outcome, different entry point.

Scaffolding is only day 0; on its own it would be a snippet generator. What makes these paths is where the generated service lands: registered with Keycloak for OIDC identity, routable through the Cilium-backed Gateway API, in scope for the cluster's Kyverno policies, and emitting telemetry into the shared observability stack — none of it per-service setup.

The lifecycle half belongs to the platform, not the template. ArgoCD reconciles services from the in-cluster Gitea with self-heal on, so an out-of-band `kubectl edit` against a managed object is reverted within about a minute, and upgrades arrive as changes to packages in `platform/stack/packages` rather than as pull requests against every repository.

The escape hatch is the substrate: everything a template generates is ordinary Kubernetes and ordinary Git, so a team can stop using the template, keep the cluster, and own the manifests — losing the upgrade stream and nothing else.

## See also

- [The Paved Road to Production](/docs/platform-engineering/paved-road) — the pipeline and guardrails a path runs on
- [Platform as a Product](/docs/platform-engineering/platform-as-a-product) — why adoption beats mandate, and how to run the feedback loop
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — adoption funnels and service scorecards
- [Your First Service](/docs/getting-started/first-service) — walking an Adhar golden path end to end
