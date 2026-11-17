---
title: "Measuring Platform Success"
section: "Platform Engineering"
order: 6
path: "/docs/platform-engineering/measuring-success"
---

# Measuring Platform Success

Most of a platform's value lies in things that did not happen: **the incident that never occurred, the wiring nobody had to do, the misconfiguration that was never deployed.** None of those produces a number by itself, so platform teams tend to measure whatever is cheapest to collect.

This page covers four families of measurement that work together, what to leave alone, and the instrumentation Adhar supplies.

## How it works

```diagram
npe-measurement-families
```

| Family | Signal | Unit |
|---|---|---|
| **Delivery** | The four DORA metrics | The delivery system |
| **Developer experience** | SPACE dimensions; flow and waiting | The team |
| **Adoption** | A funnel ending in production services on the paved road | The service |
| **Qualitative** | Surveys, office hours, support themes | The theme |

Two rules apply to all four:

- **Capture baselines before you ship.** You cannot reconstruct them afterwards.
- **Measure the system over time.** Do not try to credit a specific win to a specific feature. The trend is what matters.

The unit is always the system, the team or the service. It is never the individual.

## The four DORA delivery metrics

The DORA research programme, reported in *Accelerate* and the State of DevOps reports, found four metrics that together describe how fast and how stable a delivery system is.

| Metric | Definition | What it exposes |
|---|---|---|
| **Deployment frequency** | How often the organisation successfully releases to production | Batch size and friction in the release path |
| **Lead time for changes** | Time from code committed to that code running in production | Pipeline delay, including waits and approvals |
| **Change failure rate** | Share of production deployments that cause a problem needing a fix — rollback, hotfix or fix-forward | Whether speed is bought with instability |
| **Failed deployment recovery time** (formerly *time to restore service*) | How long it takes to recover after a deployment causes a production failure | Detection, diagnosis, and the cost of reversing a change |

Read them in pairs. Throughput (frequency, lead time) and stability (failure rate, recovery time) limit each other. A change that improves one and wrecks the other is not an improvement.

Three cautions:

- **They measure the delivery system, not people.** Lead time is driven by queues, approvals, environment availability and test duration.
- **They are gamed once tied to performance reviews.** Frequency rises when one change is split into five commits. Failure rate falls when failures are relabelled as planned maintenance.
- **Do not combine them into one score.** A composite hides the trade-off between throughput and stability.

Use the definitions. Be sceptical of anyone who attaches a universal target to them.

## Developer experience

Delivery metrics show how fast changes move. They do not show what the journey costs the people making them. The SPACE framework (Forsgren et al.) says productivity has several dimensions, and any one read alone misleads.

| Dimension | What it covers |
|---|---|
| **Satisfaction and wellbeing** | Fulfilment, how the tooling feels, burnout risk |
| **Performance** | Outcomes of the work: reliability, quality, impact |
| **Activity** | Counts of actions: commits, builds, deploys, reviews |
| **Communication and collaboration** | How easy things are to find, review flow, how knowledge moves |
| **Efficiency and flow** | Uninterrupted work, handoffs, waiting |

Pick metrics from several dimensions, with at least one based on how people feel.

Activity is the cheapest to collect and the most misleading. Build counts rise when builds are flaky. Deploy counts rise when deploys are split. High activity fits productive flow and a broken toolchain equally well.

For a platform team, the most useful measures are about flow, and improving them is clearly the platform's job:

- how long a new engineer takes to get a first change into production
- how long people wait for a build or an environment
- how many separate systems someone must touch to ship

## Adoption as a funnel

A single "teams onboarded" count hides every interesting detail. A funnel does not.

```diagram
pv-pe-adoption-funnel
```

| Pattern | What it points to |
|---|---|
| Strong awareness, weak first use | An onboarding or documentation problem |
| Strong first use, weak repeat use | People tried it, understood it, and chose not to come back. Internal marketing does not fix that |
| Strong repeat use, low production share | Pilots and side projects. If no production workload depends on a capability, it has been sampled, not adopted |

**Voluntary adoption rate is the most informative single number a platform team has.** It is the fraction of eligible teams using the platform when a believable alternative existed and nobody was forced. A mandate destroys it: once usage is compulsory, it measures compliance. See [Platform as a Product](/docs/platform-engineering/platform-as-a-product).

Pair it with churn: how many teams started and then left, and what they moved to.

## Qualitative signal

Numbers tell you that something changed. They rarely tell you why.

| Source | How to use it |
|---|---|
| **Surveys** | Short, regular, comparable. One open question earns its place: "What is the most frustrating part of shipping a change here?" Group the answers into themes; do not score them |
| **Office hours** | People raise in conversation what they never write up. The questions show where your abstractions confuse |
| **Support requests** | Each one is a user showing exactly where the platform failed them. Tag by root cause, review the tags regularly, and treat a recurring theme as a platform defect |

The question is never "why did they not read the docs?" It is "why did the system make this the natural mistake?"

## What not to measure

Each of these makes behaviour worse once people know it is counted.

| Do not measure | Why it fails |
|---|---|
| **Lines of code** | Rewards wordiness and punishes deletion |
| **Ticket counts** | Rewards splitting work and closing issues over fixing causes |
| **Story points** | A planning aid. Used as a target, points inflate |
| **Packages or features shipped** | Measures surface area, not value |
| **Any per-developer metric** | Measures the system a person works in and pins it on the person. It guarantees gaming and damages collaboration |

The ban on per-developer metrics applies to DORA as much as to commit counts, whatever the intent. "We only use it for coaching" does not survive the first promotion cycle.

> **Tip:** Before adopting a metric, ask what the laziest way to improve it would be. If you would not want that outcome, the metric is unsafe as a target.

## How Adhar does this

Adhar supplies instrumentation. The judgement above stays with you. Adhar does not compute DORA metrics or per-person metrics.

| What you need | What Adhar provides | Profile | Read more |
|---|---|---|---|
| A production-readiness grade per service | **Scorecards** (`application/adhar-scorecards`) | Production | [Observability](/docs/operations/observability) |
| Runtime signal from the first deploy | Prometheus and Grafana | Local and production | [Observability](/docs/operations/observability) |
| Logs, traces and long-term metrics | Loki, Tempo and Mimir | Production | [Observability](/docs/operations/observability) |
| Spend per workload and namespace | OpenCost; `adhar cost` and `adhar cost breakdown` | Production | [CLI Reference](/docs/reference/cli) |
| What is enabled and converged | `adhar stack list`, `adhar stack status` | Local and production | [CLI Reference](/docs/reference/cli) |
| Policy posture | `adhar compliance`, from Kyverno PolicyReports | Wherever Kyverno runs | [Security Best Practices](/docs/security/security-best-practices) |

### Scorecards

The scorecards package grades every service from 0 to 100, mapped to an A–F letter grade. It reads signals inside the cluster:

- Argo CD health and sync
- probes, and resource requests and limits
- no `:latest` image tags
- Kyverno policy results
- `HTTPRoute` exposure
- backups

A CronJob refreshes the grades every 30 minutes, and the Console shows them. Weights and grade thresholds are tunable.

The grade describes **the production-readiness of a service**, never the performance of the people who wrote it. Read the spread across all services as a measure of platform health: a criterion that scores weakly everywhere is a platform gap, not a collection of careless teams.

### Why default observability matters here

You can only capture a baseline if collection starts before the thing you want to measure. Per-service instrumentation is the step teams skip under deadline, so the platform provisions the stack instead.

### Building the DORA view

The events the four metrics need already exist on the [paved road](/docs/platform-engineering/paved-road): pipeline runs in Tekton, syncs in Argo CD, and promotions in Kargo, each tied to a Git commit. Build the dashboard from those, to your own definitions.

## Next steps

- [Platform as a Product](/docs/platform-engineering/platform-as-a-product) — why voluntary adoption is the signal to protect.
- [The Paved Road to Production](/docs/platform-engineering/paved-road) — what the production-adoption number measures adoption of.
- [Observability](/docs/operations/observability) — the metrics, logging and tracing stack.
- [The 6 D's Framework](/docs/core-concepts/ds-framework) — where Discover and Decide sit in the lifecycle.
