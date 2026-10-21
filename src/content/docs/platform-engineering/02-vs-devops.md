---
title: "Platform Engineering vs DevOps"
section: "Platform Engineering"
order: 2
path: "/docs/platform-engineering/vs-devops"
---

# Platform Engineering vs DevOps

**Platform engineering is how DevOps principles survive at scale. It does not reject them.** DevOps was the right response to a real and serious problem. But it did not say what happens when you ask fifty product teams to each own, on their own, everything it takes to run a cloud-native stack. Platform engineering fills that gap.

This page presents DevOps at its strongest and shows exactly where it struggled. It explains where SRE fits. Then it shows how all three work together in one organisation.

## At a glance

| | |
|---|---|
| **The honest claim** | Platform engineering is a response to how DevOps played out at scale |
| **What stays true** | Shared ownership, automation, fast feedback, no hand-off wall |
| **What changed** | The amount of operations work a product team must own grew without limit |
| **What platform engineering adds** | A product that makes end-to-end ownership affordable to keep up |
| **Where SRE sits** | A separate discipline: reliability as an engineering problem |
| **Common misreading** | "Platform engineering means going back to a central ops team" — it does not |

## What DevOps got right

Before DevOps, many organisations had a built-in conflict of interest. Development was measured on change, and operations was measured on stability. So the two groups were paid to want opposite things.

Between them sat a hand-off. A release went "over the wall" as an artifact plus a runbook. The people who wrote the code were not the people woken up when it failed.

The results were severe:

- Feedback took months to reach the people who could act on it.
- Deployments were large, rare, and dangerous, and being rare made them more dangerous still.
- Operational knowledge never flowed back into design, so teams rebuilt the same failure modes release after release.
- Incidents turned into arguments about blame between two groups with different managers.

The DevOps movement took shape around the first devopsdays, organised by Patrick Debois in 2009. It attacked that wall directly, and it was right to. Its lasting contributions:

- **Shared ownership.** The team that writes a service is accountable for how it behaves in production. Amazon's Werner Vogels popularised the phrase "you build it, you run it", and it became the movement's clearest statement of intent.
- **Automation of the release path.** Manual, ceremonial deployment counts as a defect, not as caution.
- **Fast feedback.** Small, frequent changes, with signal from production reaching the author quickly.
- **Blameless response.** An incident is information about the system, not about a person.
- **Measurement.** The DORA research programme gave the industry shared terms for delivery performance: deployment frequency, lead time for changes, change failure rate, and failed-deployment recovery time.

Every one of those still holds. Platform engineering disputes none of them. A platform that undermines any of them is a bad platform.

## Where it struggled

"You build it, you run it" says who owns the service. It does not limit how much they own, and that amount grew enormously.

A team running a service on a modern cloud-native stack is, without anyone saying so, responsible for all of this:

- container builds and base images
- an image registry
- vulnerability scanning and artifact signing
- Kubernetes manifests or charts
- a way to deploy and promote releases
- ingress and TLS
- service-to-service authentication
- distributing and rotating secrets
- autoscaling and resource requests
- metrics, logs, traces and dashboards
- alert routing and on-call
- database provisioning, with backup and restore
- cost attribution
- whatever an auditor asks for

Three things make this worse:

- **The cost grows with teams times tools.** Twelve teams across fifteen concerns is a hundred and eighty decisions. Each one must be maintained for the life of a service. Nothing in the DevOps writing says teams should make those decisions separately. But nothing stopped it either, and team autonomy made it the default.
- **Depth, not only breadth.** Doing any one of those well takes real expertise. Expecting every stream-aligned team to know Kubernetes networking, supply-chain security, and database operations in depth is a staffing assumption most organisations cannot meet.
- **It is extraneous load.** In the terms used in [What is Platform Engineering?](/docs/platform-engineering/what-is-platform-engineering), almost none of that list is the team's domain. It crowds out the thinking the team was actually hired to do.

In practice, teams do not refuse to own their services. They own them badly and slowly. Conventions drift apart, base images go stale, and operational knowledge disappears when one person leaves.

## The bad outcome: the "DevOps team"

The most common response to that strain is to create a DevOps team. Done carelessly, it rebuilds the exact problem DevOps set out to remove.

It always happens the same way:

1. The new team is the only group that understands the pipeline and the clusters, so work flows to it.
2. Routing work needs a queue, and a queue needs tickets.
3. Because the team is blamed when something breaks, it starts reviewing what others want to deploy.

Within a year you have a central operations group with a hand-off wall, a backlog, and a modern name.

Two reliable warning signs:

- **The unit of work is a ticket.** A product engineer who needs a database files a request and waits for a person. Self-service was never on offer.
- **The team's power is the veto.** Its influence comes from being able to say no at the end, not from having built something people choose at the start.

Platform engineering is, in large part, a named discipline that exists to stop this specific failure. It insists that the output is a self-service product with users, not a service desk with a queue. See [Platform as a Product](/docs/platform-engineering/platform-as-a-product).

## Where SRE fits

Site Reliability Engineering (SRE) is a third, separate thing. It is not another word for DevOps, and it is not an older name for platform engineering. It started at Google under Ben Treynor Sloss. It treats **reliability as an engineering problem with an explicit target**.

Its main tools:

- **SLIs and SLOs.** A service level indicator (SLI) measures what users actually experience. A service level objective (SLO) sets a target for it, as a negotiated commitment rather than a hope.
- **Error budgets.** The gap between the objective and one hundred percent is a budget you can spend on change. Spend it all, and you slow releases to recover reliability. Leave it unspent, and you are shipping too cautiously. This turns the old dev-versus-ops argument into arithmetic.
- **Toil reduction.** Toil is repetitive manual operations work. SRE tracks it and engineers it away as a core duty.
- **Blameless postmortems and production readiness review** as standing practices.

The clearest way to tell the three apart is by the question each one answers:

- **DevOps** asks *how do we stop throwing software over a wall?*
- **SRE** asks *how reliable should this be, and what are we willing to spend to get there?*
- **Platform engineering** asks *how do we make end-to-end ownership affordable for every team at once?*

These fit together. An organisation can practise all three honestly, and a large one usually must.

## The ownership boundary, before and after

```diagram
pv-pe-ownership-boundary
```

The boundary moved, but the ownership did not. Teams A, B, and C still carry the pager for their own services. What changed is that the route to production is built once and used many times, instead of being rebuilt in each team.

## Compared directly

| | DevOps | SRE | Platform engineering |
|---|---|---|---|
| **Scope** | A culture and set of practices for the whole delivery organisation | Reliability of services in production | The internal product that delivery runs on |
| **Ownership model** | The team that builds a service runs it | Reliability owned jointly, governed by an explicit objective | Product teams own services; the platform team owns the capabilities they use |
| **Primary unit of work** | A practice or a pipeline improvement | An SLO, an error budget, a class of toil removed | A platform capability or golden path, shipped to users |
| **Success measure** | Delivery performance — the four DORA metrics | Objectives met while change keeps flowing; toil trending down | Adoption of the paved route, and time-to-production for a new service |
| **Failure mode** | A "DevOps team" that becomes the silo it replaced | Reliability theatre: objectives nobody enforces, or a veto by another name | A platform nobody adopts, or a gatekeeper with a backlog |

## How the three work together

In one organisation, at the same time:

1. **DevOps supplies the principles.** No hand-off wall, shared ownership, automation, fast feedback. Every other decision must respect these. A platform design that brings back a wall has failed on DevOps grounds before anyone judges it on its own.
2. **Platform engineering supplies the foundation.** One well-supported route from commit to production. Security and monitoring are built into the road, not inspected at the end — see [The Paved Road to Production](/docs/platform-engineering/paved-road).
3. **SRE supplies the reliability discipline.** Objectives and error budgets for the services that need them, and for the platform itself. A platform without its own SLOs asks teams to depend on something with no stated reliability.

A healthy split between the last two: the platform ships the dashboards and sensible defaults. SRE decides what "good enough" means for each service and holds the organisation to that number.

## Misreadings to drop

> **"Platform engineering means going back to a central ops team."** The design goal is the opposite. A central ops team takes ownership away from product teams. A platform leaves ownership where it is and makes it cheaper. The test is the unit of work: for a central ops team it is a ticket; for a platform team it is a capability teams use without asking.

> **"DevOps is dead."** The principles are not in dispute, and nothing replaces them. What has aged is the idea that each team should build its own delivery stack from scratch. Platform engineering keeps the principles and changes the economics.

> **"We need a platform team, so we'll rename the ops team."** Renaming changes nothing. The change is in how the team operates: a product with users, adoption measured rather than mandated, and no human in the loop for the common case.

> **"SRE and platform engineering are the same job."** They share skills but differ in purpose. One is accountable for reliability targets. The other is accountable for a product that engineers choose to use.

## How Adhar does this

Adhar takes the position argued above. Ownership stays with the product team, and the platform makes that ownership sustainable.

- **No ticket for infrastructure.** Crossplane v2 exposes databases, caches, buckets, and clusters as namespaced Kubernetes resources. Ordinary RBAC in the team's own namespace governs them — see [Control Plane](/docs/core-concepts/control-plane).
- **No gate for compliance.** A Tekton pipeline builds with Cloud Native Buildpacks, scans, signs with Cosign and pushes to Harbor. Kyverno rejects unsigned images from Harbor's `library/*` project in workload namespaces. The control is part of the pipeline and the cluster, not a review meeting.
- **No console drift.** ArgoCD keeps the platform in sync with an in-cluster Gitea, with self-heal on. If someone runs an out-of-band `kubectl edit` against a managed object, ArgoCD puts it back. A commit is the only lasting way to change what ArgoCD manages.
- **Reliability signal by default.** Observability is part of the platform, not homework for each team — see [Observability](/docs/operations/observability).

## Next steps

- [Golden Paths](/docs/platform-engineering/golden-paths) — the well-supported default route, and how it avoids becoming mandatory.
- [The Paved Road to Production](/docs/platform-engineering/paved-road) — enforcement built into the road rather than a gate at the end.
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — DORA, developer experience, and what not to measure.
