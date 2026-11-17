---
title: "Platform Engineering vs DevOps"
section: "Platform Engineering"
order: 2
path: "/docs/platform-engineering/vs-devops"
---

# Platform Engineering vs DevOps

**Platform engineering is how DevOps principles survive at scale. It does not replace them.** DevOps said the team that builds a service should run it. It did not say what happens when fifty teams each own a full cloud-native stack on their own. Platform engineering fills that gap.

This page shows what DevOps got right, where it struggled, where SRE fits, and how Adhar keeps ownership with the product team.

## Three disciplines, three questions

```diagram
npe-three-disciplines
```

| | DevOps | SRE | Platform engineering |
|---|---|---|---|
| **Scope** | A culture and set of practices for the whole delivery organisation | Reliability of services in production | The internal product that delivery runs on |
| **Ownership model** | The team that builds a service runs it | Reliability owned jointly, governed by an explicit objective | Product teams own services; the platform team owns the capabilities they use |
| **Unit of work** | A practice or pipeline improvement | An SLO, an error budget, a class of toil removed | A capability or golden path, shipped to users |
| **Success measure** | Delivery performance — the four DORA metrics | Objectives met while change keeps flowing | Adoption of the paved route |
| **Failure mode** | A "DevOps team" that becomes the silo it replaced | Objectives nobody enforces, or a veto by another name | A platform nobody adopts, or a gatekeeper with a backlog |

## What DevOps got right

Before DevOps, development was measured on change and operations on stability. A release went "over the wall" as an artifact and a runbook. The people who wrote the code were not the people woken when it failed.

DevOps attacked that wall. Its lasting contributions:

- **Shared ownership.** "You build it, you run it": the team that writes a service answers for it in production.
- **An automated release path.** Manual, ceremonial deployment is a defect, not caution.
- **Fast feedback.** Small, frequent changes, with production signal reaching the author.
- **Blameless response.** An incident is information about the system, not about a person.
- **Measurement.** The DORA metrics gave the industry shared terms for delivery performance — see [Measuring Platform Success](/docs/platform-engineering/measuring-success).

Platform engineering disputes none of these. A platform that undermines one of them is a bad platform.

## Where it struggled

"You build it, you run it" says who owns the service. It does not limit how much they own. On a cloud-native stack, a team is quietly responsible for:

| Area | What the team carries |
|---|---|
| Build and supply chain | Container builds, base images, a registry, scanning, signing |
| Deploy | Manifests or charts, promotion between environments, autoscaling, resource requests |
| Network and identity | Ingress, TLS, service-to-service authentication, secrets distribution and rotation |
| Operate | Metrics, logs, traces, dashboards, alert routing, on-call |
| Data and governance | Database provisioning, backup and restore, cost attribution, audit evidence |

Three things make this worse:

- **The cost grows with teams times concerns.** Twelve teams across fifteen concerns is 180 decisions, each maintained for the life of a service.
- **Each concern needs depth.** Expecting every team to know Kubernetes networking, supply-chain security and database operations is a staffing assumption most organisations cannot meet.
- **It is extraneous load.** Almost none of it is the team's domain — see [What is Platform Engineering?](/docs/platform-engineering/what-is-platform-engineering).

Teams do not refuse to own their services. They own them slowly: conventions drift, base images go stale, and knowledge leaves with one person.

## The trap: the "DevOps team"

The common response is to create a DevOps team. Done carelessly, it rebuilds the wall:

1. The new team is the only group that understands the pipeline and the clusters, so work flows to it.
2. Routing work needs a queue, and a queue needs tickets.
3. The team is blamed when something breaks, so it starts reviewing what others deploy.

Two warning signs tell you it has happened:

- **The unit of work is a ticket.** An engineer who needs a database files a request and waits for a person.
- **The team's power is the veto.** It can say no at the end, instead of having built something people choose at the start.

Platform engineering exists largely to prevent this. Its output is a self-service product with users, not a service desk — see [Platform as a Product](/docs/platform-engineering/platform-as-a-product).

## Where SRE fits

Site Reliability Engineering (SRE) treats **reliability as an engineering problem with an explicit target**. It is neither another word for DevOps nor an older name for platform engineering. Its main tools:

- **SLIs and SLOs.** A *service level indicator* measures what users experience. A *service level objective* sets a negotiated target for it.
- **Error budgets.** The gap between the objective and 100% is a budget to spend on change. Spend it all and you slow releases. Leave it unspent and you are shipping too cautiously.
- **Toil reduction.** Repetitive manual operations work is tracked and engineered away.

A healthy split with the platform: the platform ships the dashboards and sensible defaults. SRE decides what "good enough" means for each service, and for the platform itself.

## The boundary moves, the ownership does not

```diagram
pv-pe-ownership-boundary
```

Teams still carry the pager for their own services. What changes is that the route to production is built once and reused, not rebuilt in each team.

## Misreadings to drop

| Claim | Why it is wrong |
|---|---|
| "Platform engineering means going back to a central ops team." | A central ops team takes ownership away from product teams. A platform leaves it where it is and makes it cheaper. The test: is the unit of work a ticket, or a capability teams use without asking? |
| "DevOps is dead." | The principles stand. What aged is the idea that each team builds its own delivery stack |
| "We'll rename the ops team." | Renaming changes nothing. The change is a product with users, measured adoption, and no human in the common case |
| "SRE and platform engineering are the same job." | One is accountable for reliability targets. The other for a product engineers choose to use |

## How Adhar does this

Adhar keeps ownership with the product team and removes the reasons to hand it back.

| Instead of | Adhar gives you | Read more |
|---|---|---|
| A ticket for infrastructure | Crossplane exposes databases, caches, buckets and clusters as namespaced Kubernetes resources, governed by ordinary RBAC in the team's namespace | [Control Plane](/docs/core-concepts/control-plane) |
| A review gate for compliance | A Tekton pipeline builds with Cloud Native Buildpacks, scans, signs with Cosign and pushes to Harbor. Kyverno rejects unsigned images from Harbor's `library/*` project in workload namespaces | [The Paved Road](/docs/platform-engineering/paved-road) |
| Console drift | Argo CD keeps the platform in sync with an in-cluster Gitea, with self-heal on. An out-of-band `kubectl edit` on a managed object is put back. A commit is the only lasting change | [Architecture](/docs/core-concepts/architecture) |
| Per-team monitoring homework | The platform provisions the monitoring stack, so SRE practice has data to work with | [Observability](/docs/operations/observability) |
| A hand-off to onboard a team | A team gets its own namespace, RBAC and default-deny ingress | [Onboard a Team](/docs/guides/onboard-a-team) |

## Next steps

- [Golden Paths](/docs/platform-engineering/golden-paths) — the supported default route, and how it avoids becoming mandatory.
- [The Paved Road to Production](/docs/platform-engineering/paved-road) — enforcement built into the road, not a gate at the end.
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — DORA, developer experience, and what not to measure.
