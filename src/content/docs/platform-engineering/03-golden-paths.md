---
title: "Golden Paths"
section: "Platform Engineering"
order: 3
path: "/docs/platform-engineering/golden-paths"
---

# Golden Paths

A golden path is **the supported, opinionated, fastest route through a task your organisation does over and over**. Examples are standing up a new service, attaching a database, or getting a change to production. A golden path is a route, not a rule. Other routes are still allowed. This is the one the platform team has walked, paved, instrumented, and promised to keep working.

The problem it solves is repeated work that nobody brings together. Ten teams solve the same wiring problem — auth, ingress, CI, secrets, dashboards, alerts — in ten slightly different ways. Each is wrong in a different place, and each is now a permanent maintenance burden. A golden path does that work once, so the eleventh team inherits it instead of working it out again.

## At a glance

| | |
|---|---|
| **What it is** | The default, supported route through a recurring task |
| **What it is not** | A mandate, or a template you are left to own alone afterwards |
| **Who offers it** | The platform team, as a versioned product with a support promise |
| **Who chooses it** | The stream-aligned team, freely — adoption is the evidence |
| **Core trade-off** | Fewer choices, in exchange for someone else handling the wiring |
| **Main failure mode** | The gilded cage: mandatory, unmaintained, or impossible to leave |
| **Relation to the paved road** | The path is the route chosen; the [paved road](/docs/platform-engineering/paved-road) is the pipeline it runs on |

## Where the term comes from

The idea is older than the name. "Golden path" was popularised by Spotify's engineering writing, where it meant a curated, supported, opinionated route through their tooling. The idea then carried into Backstage, whose software templates made it something you could click.

That scaffolder (a tool that generates a new project from a template) is the most copied implementation. That is why people use "golden path" and "a template in a developer portal" as if they mean the same thing. They do not, and the difference is what this page is about.

*Team Topologies* (Skelton and Pais) adds a related idea: a platform exists to reduce the cognitive load, or mental burden, on stream-aligned teams. A golden path is the most direct form of that. It is a decision a team no longer has to make, because someone made it well and keeps it current.

## "Golden" means supported, not compulsory

Three words carry the definition:

- **Supported.** Someone owns it, answers questions about it, fixes it when it breaks, and upgrades it for you. This word does the real work, and it is the one most often dropped.
- **Opinionated.** It picks one database, one build system, one deployment shape. Its value is in the choices it removes, not the options it offers. A path with a setting for every decision is a framework — the very thing you were trying to stop each team from building.
- **Fastest.** Not just approved, but quicker to the same result than doing it yourself. If the approved route is slower, teams will go around it, and they will be right to.

```diagram
gd-golden-path-escape-hatch
```

## Four properties that separate a path from an unused template

**1. It is truly faster than building your own.** Compare it with a competent engineer doing the job by hand. A path that saves an afternoon and then costs nothing will spread. A path that saves an hour but adds a weekly cost in workarounds will not.

**2. It stays supported and upgraded.** A template creates a copy and walks away. The copy starts to rot right away, and in two years there are dozens of drifting copies of one mistake. A path stays connected to the services it created. Base images change, library versions change, and policies tighten. Those changes reach existing users without each team copying them over by hand.

**3. It covers the whole lifecycle, not only day 0.** Scaffolding is the cheapest part of a service's life. The expensive parts come later: the second deploy, the first incident, the dependency upgrade, the compliance question eighteen months on.

**4. It leaves an escape hatch.** Some service will have a real reason to differ — a latency budget, a vendor SDK, or a regulatory constraint. The path needs a documented way off. Leaving should need no permission, only acceptance that the support promise gets smaller. A path with no exit is not a path.

## Golden path vs gilded cage

A golden path turns into a gilded cage in three ways. All three are failures of the platform team, not of the teams complaining.

| Failure | Symptom | Cause | Fix |
|---|---|---|---|
| **Made mandatory** | Teams comply on paper, then build a shadow stack beside it | The path was losing on merit, so adoption was ordered instead of earned | Drop the mandate. Treat non-adoption as a product defect, and find the part that is slower than doing it by hand |
| **Stops being maintained** | Generated services pin versions nobody dares change; "don't regenerate, it breaks" | It was funded as a project, not staffed as a product | Give it an owner and a published support commitment, or retire it honestly |
| **Cannot be stepped off** | A team needs one exception and the answer is no | Path and policy were mixed up — the route became the only allowed route | Separate them: policy belongs to the [paved road](/docs/platform-engineering/paved-road); the path is one supported way to meet it |

> You can spot a cage when people say "we have to use the platform." You can spot a path when they say "we used the platform because writing it ourselves would have taken a week."

Making a path mandatory also destroys your only honest feedback. When teams are free to leave, adoption measures quality. When they cannot leave, adoption measures nothing. You can no longer tell a good path from one people merely put up with. See [Platform as a Product](/docs/platform-engineering/platform-as-a-product).

## Choosing which paths to build

Start from what teams already do repeatedly and badly — not from what would be interesting to build. Useful signals, roughly from most to least reliable:

1. **Copy-paste archaeology.** The same `Dockerfile`, CI config, and ingress block, copied across many repositories and drifting apart.
2. **The ticket queue.** Any request a person fulfils by following a runbook is a path waiting to be written. Repeated requests there are a free specification.
3. **Repeated incidents with one root cause.** For example, three teams missed the same timeout setting because nothing set a default for it.
4. **The questions in chat.** Asked once, it is support. Asked every week, it is a design gap.

Build a few paths and make them good. Two paths that cover most new work beat nine that each cover a slice, none of them maintained.

## Designing one

1. **Name the task, not the technology.** "Ship an HTTP service that talks to Postgres" — not "a Spring Boot template."
2. **Start from the best implementation already running in your organisation.** Teams trust a path built from production code. They are rightly sceptical of one invented in a platform team's sandbox.
3. **Remove choices on purpose.** Write down what the path decides for the team and what it leaves open. Both lists should be short.
4. **Decide what is generated and owned versus generated and managed.** Teams edit generated-and-owned code freely, such as business logic and the service's config. Generated-and-managed material includes pipeline wiring, policy bindings, and base manifests. It must be upgradable without a merge conflict in every repository. So keep it behind a reference — a shared workflow, a chart version, a base image — instead of copying it inline.
5. **Write the escape hatch before you ship.** Track both adoption and abandonment: who started, who is still on it ninety days later, and who left. The people who left are your roadmap.

## What a path actually delivers: day 0, day 30, day 180

You cannot see a path's worth when it first creates a service. Most of the value comes later. That is also why most templates get mistaken for paths.

| | Day 0 | Day 30 | Day 180 |
|---|---|---|---|
| **Team experiences** | A running service with a URL, a pipeline, and a dashboard | First feature shipped; first page handled with alerts that already existed | A dependency CVE is already patched; the base image moved under them |
| **Path supplies** | Repository, build, deployment, identity, routing, telemetry wiring | A second deploy that needed no edits, and a rollback that works | Upgrades delivered by reference, not by hand-editing every repository |
| **Without a path** | A day or a week of wiring, plus the parts you forgot | Finding out what you forgot, usually during an incident | A fork of an old mistake that nobody is funded to fix |

## Versioning without stranding anyone

A path that cannot change is dead. A path that changes carelessly costs its users more than it saved them. The working rules:

- **Version the path, and record which version each service came from.** Without that record you cannot reason about the fleet or write a migration.
- **Separate additive changes from breaking ones.** Additive changes, such as a new default alert or a patch release, flow to existing users automatically. Breaking changes, such as a new runtime major version or a different deployment shape, get a new path version and a migration note.
- **Do the migration for people where you can.** A team that ships a bot PR against every service on version 2 gets fleet-wide upgrades. A team that only publishes a migration guide gets a long tail of services stuck on version 2 forever.
- **Deprecate with a date and a named successor.** Keep the old version supported until you can measure that the fleet has moved.

## How Adhar does this

Adhar ships golden paths in two ways. Both produce the same shape of service.

**CLI templates.** `adhar application deploy --template <name>` scaffolds and deploys from a built-in set: `basic`, `microservice`, `frontend`, `data-pipeline`, `ml`, `argo-workflows`, and `app-with-bucket`. The last one shows the model best: it provisions the application and its object storage together. This works because Crossplane v2 exposes infrastructure as namespaced Kubernetes resources. So you request a bucket in the same place, and the same way, as a Deployment.

**Backstage scaffolder templates** in the Adhar Console, for teams who prefer a portal to a terminal. Same result, different entry point.

Scaffolding is only day 0. On its own it would be a snippet generator. What makes these real paths is where the generated service lands:

- registered with Keycloak for OIDC identity
- routable through the Cilium-backed Gateway API
- in scope for the cluster's Kyverno policies
- sending telemetry into the shared observability stack

None of it needs per-service setup.

The lifecycle half belongs to the platform, not the template. ArgoCD keeps services in sync with the in-cluster Gitea, with self-heal on. If someone runs an out-of-band `kubectl edit` against a managed object, ArgoCD reverts it within about a minute. Upgrades arrive as changes to packages in `platform/stack/packages`, not as pull requests against every repository.

The escape hatch is the foundation itself. Everything a template generates is ordinary Kubernetes and ordinary Git. A team can stop using the template, keep the cluster, and own the manifests. It loses the upgrade stream and nothing else.

## See also

- [The Paved Road to Production](/docs/platform-engineering/paved-road) — the pipeline and guardrails a path runs on
- [Platform as a Product](/docs/platform-engineering/platform-as-a-product) — why adoption beats mandate, and how to run the feedback loop
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — adoption funnels and service scorecards
- [Your First Service](/docs/getting-started/first-service) — walking an Adhar golden path end to end
