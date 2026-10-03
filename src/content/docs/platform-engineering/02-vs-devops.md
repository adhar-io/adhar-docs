---
title: "Platform Engineering vs DevOps"
section: "Platform Engineering"
order: 2
path: "/docs/platform-engineering/vs-devops"
---

# Platform Engineering vs DevOps

**Platform engineering is how DevOps principles survive scale — not a repudiation of them.** DevOps was a correct response to a real and serious dysfunction. What it did not come with was an answer for what happens when you ask fifty product teams to each independently own the full operational surface of a cloud-native stack. That gap is the one platform engineering fills.

This page represents DevOps at its strongest, says precisely where it strained, places SRE accurately, and then shows how all three work in one organisation at the same time.

## At a glance

| | |
|---|---|
| **The honest claim** | Platform engineering is a response to how DevOps played out at scale |
| **What stays true** | Shared ownership, automation, fast feedback, no hand-off wall |
| **What changed** | The operational surface a product team must own grew without bound |
| **What platform engineering adds** | A product that makes end-to-end ownership affordable to sustain |
| **Where SRE sits** | A distinct discipline: reliability as an engineering problem |
| **Common misreading** | "Platform engineering means going back to a central ops team" — it does not |

## What DevOps got right

Before DevOps, a great many organisations ran a structural conflict of interest. Development was measured on change and operations on stability, so the two groups were paid to want opposite things. Between them sat a hand-off: a release went over a wall as an artifact plus a runbook, and the people who wrote the code were not the people woken when it failed.

The consequences were severe. Feedback took months to reach the people who could act on it. Deployments were large, rare, and dangerous, which made them more dangerous still. Operational knowledge never flowed back into design, so the same failure modes were rebuilt release after release. Incidents became attribution exercises between two groups with different managers.

The DevOps movement — which coalesced around the first devopsdays organised by Patrick Debois in 2009 — attacked that wall directly, and it was right to. Its durable contributions:

- **Shared ownership.** The team that writes a service is accountable for its behaviour in production. The phrase "you build it, you run it" was popularised by Amazon's Werner Vogels and became the movement's clearest statement of intent.
- **Automation of the release path.** Manual, ceremonial deployment is treated as a defect, not as prudence.
- **Fast feedback.** Small, frequent changes, with production signal reaching the author quickly.
- **Blameless response.** Incidents as information about the system, not about the person.
- **Measurement.** The DORA research programme gave the industry a shared vocabulary for delivery performance: deployment frequency, lead time for changes, change failure rate, and failed-deployment recovery time.

Every one of those holds today. None of them is contested by platform engineering. A platform that undermines any of them is a bad platform.

## Where it strained

"You build it, you run it" assigns ownership. It does not bound the surface area being owned, and that surface grew enormously.

A team running a service on a modern cloud-native stack is implicitly on the hook for container builds and base images, an image registry, vulnerability scanning and artifact signing, Kubernetes manifests or charts, a deployment and promotion mechanism, ingress and TLS, service-to-service authentication, secrets distribution and rotation, autoscaling and resource requests, metrics, logs, traces and dashboards, alert routing and on-call, database provisioning with backup and restore, cost attribution, and whatever an auditor asks for.

Three things compound here:

- **The cost scales with teams multiplied by tools.** Twelve teams across fifteen concerns is a hundred and eighty decisions, each maintained for the life of a service. Nothing in the DevOps literature says those decisions should be made independently — but nothing prevented it either, and team autonomy made it the default.
- **Depth, not only breadth.** Doing any one of those well requires real expertise. Expecting every stream-aligned team to hold deep knowledge of Kubernetes networking, supply-chain security, and database operations is a staffing assumption most organisations cannot satisfy.
- **It is extraneous load.** In the terms of [What is Platform Engineering?](/docs/platform-engineering/what-is-platform-engineering), almost none of that list is the team's domain. It crowds out the thinking the team was actually hired to do.

The result in practice is not teams refusing to own their services. It is teams owning them badly and slowly, with divergent conventions, stale base images, and operational knowledge that evaporates when one person leaves.

## The degenerate outcome: the "DevOps team"

The most common organisational response to that strain is to create a DevOps team. Done without care, it reconstructs the exact dysfunction DevOps existed to abolish.

The mechanism is always the same. The new team is the only group that understands the pipeline and the clusters, so work routes to it. Routing work requires a queue, and a queue requires tickets. Because the team is accountable when something breaks, it starts reviewing what others want to deploy. Within a year you have a central operations group with a hand-off wall, a backlog, and a modern name.

Two reliable tells:

- **The unit of work is a ticket.** A product engineer who needs a database files a request and waits for a person. Self-service was never the arrangement.
- **The team's authority is the veto.** Its influence comes from being able to say no at the end, rather than from having built something people choose at the start.

Platform engineering is, in large part, a named discipline that exists to stop this specific failure — by insisting that the output is a self-service product with users, not a service desk with a queue. See [Platform as a Product](/docs/platform-engineering/platform-as-a-product).

## Where SRE fits

Site Reliability Engineering is a third thing, and it is neither a synonym for DevOps nor an earlier name for platform engineering. It originated at Google under Ben Treynor Sloss and treats **reliability as an engineering problem with an explicit target**.

Its distinguishing machinery:

- **SLIs and SLOs.** Indicators that reflect user experience, with an objective set as a negotiated commitment rather than an aspiration.
- **Error budgets.** The gap between the objective and one hundred percent is a budget that may be spent on change. Spend it and you slow releases to recover reliability; leave it unspent and you are shipping too cautiously. This turns the old dev-versus-ops argument into arithmetic.
- **Toil reduction.** Repetitive manual operational work is tracked and engineered away as a first-class obligation.
- **Blameless postmortems and production readiness review** as standing practices.

The cleanest way to keep the three apart is by the question each answers:

- **DevOps** asks *how do we stop throwing software over a wall?*
- **SRE** asks *how reliable should this be, and what are we willing to spend to get there?*
- **Platform engineering** asks *how do we make end-to-end ownership affordable for every team at once?*

Those are complementary. An organisation can run all three honestly, and a large one usually must.

## The ownership boundary, before and after

```diagram
pv-pe-ownership-boundary
```

The boundary moved, and the ownership did not. Teams A, B, and C still carry the pager for their own services. What changed is that the route to production is built once and consumed many times, instead of being rebuilt in each team.

## Compared directly

| | DevOps | SRE | Platform engineering |
|---|---|---|---|
| **Scope** | A cultural and practice model for the whole delivery organisation | Reliability of services in production | The internal product that delivery runs on |
| **Ownership model** | The team that builds a service runs it | Reliability owned jointly, governed by an explicit objective | Product teams own services; the platform team owns the capabilities they consume |
| **Primary unit of work** | A practice or a pipeline improvement | An SLO, an error budget, a class of toil removed | A platform capability or golden path, shipped to users |
| **Success measure** | Delivery performance — the four DORA metrics | Objectives met while change keeps flowing; toil trending down | Adoption of the paved route, and time-to-production for a new service |
| **Failure mode** | A "DevOps team" that becomes the silo it replaced | Reliability theatre: objectives nobody enforces, or a veto by another name | A platform nobody adopts, or a gatekeeper with a backlog |

## How the three coexist

In one organisation, at the same time:

1. **DevOps supplies the principles.** No hand-off wall, shared ownership, automation, fast feedback — constraints every other decision must respect. A platform design that reintroduces a wall has failed on DevOps grounds before it is judged on its own.
2. **Platform engineering supplies the substrate.** One well-supported route from commit to production, with security and observability built into the road rather than inspected at the end — see [The Paved Road to Production](/docs/platform-engineering/paved-road).
3. **SRE supplies the reliability discipline.** Objectives and error budgets for the services that need them — and for the platform itself. A platform without its own SLOs asks teams to depend on something with no stated reliability.

A healthy division of labour between the last two: the platform ships the dashboards and sane defaults; SRE decides what "good enough" means for each service and holds the organisation to that number.

## Misreadings worth retiring

> **"Platform engineering means going back to a central ops team."** The opposite is the design goal. A central ops team takes ownership away from product teams; a platform leaves ownership where it is and lowers its cost. The diagnostic is the unit of work: a central ops team's is a ticket, a platform team's is a capability teams use without asking.

> **"DevOps is dead."** The principles are neither in dispute nor replaceable. What has aged is the assumption that each team should assemble its own delivery stack from first principles. Platform engineering keeps the principles and changes the economics.

> **"We need a platform team, so we'll rename the ops team."** Renaming changes nothing. The change is in the operating model — a product with users, adoption measured rather than mandated, no human in the loop for the common case.

> **"SRE and platform engineering are the same job."** They overlap in skills and diverge in purpose: one is accountable for reliability targets, the other for a product that engineers choose to use.

## How Adhar does this

Adhar takes the position argued above: ownership stays with the product team, and the platform makes that ownership sustainable.

- **No ticket for infrastructure.** Crossplane v2 exposes databases, caches, buckets, and clusters as namespaced Kubernetes resources, governed by ordinary RBAC in the team's own namespace — see [Control Plane](/docs/core-concepts/control-plane).
- **No gate for compliance.** Tekton with buildpacks builds, Trivy scans, Cosign signs, Harbor stores, Kyverno admits only signed images. The control is a property of the pipeline, not a review meeting.
- **No console drift.** ArgoCD reconciles from an in-cluster Gitea with self-heal on, so an out-of-band `kubectl edit` against a managed object is reverted within about a minute. A commit is the only durable way to change the platform.
- **Reliability signal by default.** Observability is part of the platform, not per-team homework — see [Observability](/docs/operations/observability).

## Next steps

- [Golden Paths](/docs/platform-engineering/golden-paths) — the well-supported default route, and how it avoids becoming mandatory.
- [The Paved Road to Production](/docs/platform-engineering/paved-road) — enforcement as a property of the road rather than a gate at the end.
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — DORA, developer experience, and what not to measure.
