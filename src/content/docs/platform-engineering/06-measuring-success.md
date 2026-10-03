---
title: "Measuring Platform Success"
section: "Platform Engineering"
order: 6
path: "/docs/platform-engineering/measuring-success"
---

# Measuring Platform Success

A platform's value is mostly counterfactual: **the incidents that did not happen, the week nobody spent wiring up observability, the misconfiguration that was never deployed.** None of those produce a number on their own, which is why platform teams are both under-measured and badly measured — and why the metrics they adopt are so often the cheapest to collect rather than the truest.

This page covers four families of measurement that work together — delivery throughput, developer experience, adoption, and qualitative signal — and a firm list of what to leave alone.

## At a glance

| | |
|---|---|
| **Core difficulty** | Value is counterfactual; prevented cost leaves no trace |
| **Delivery signal** | The four DORA metrics, measured on the system |
| **Experience signal** | SPACE dimensions; surveys and support themes |
| **Adoption signal** | A funnel ending in production services on the paved road |
| **Single best number** | Voluntary adoption rate |
| **Unit of measurement** | The system and the service — never the individual |
| **Guaranteed to backfire** | Any per-developer metric, for any purpose |

## Why this is genuinely hard

Platform work removes cost rather than adding output. When a team ships a service in two days instead of three weeks, the two-and-a-half weeks that did not happen are invisible — no ticket, no commit, no line item.

Worse, the platform's biggest wins are negative events. A supply-chain policy that blocks an unsigned image prevents an incident with no name, no postmortem and no cost attached. The only time anyone notices the control is when it blocks something legitimate — so the platform's successes are silent and its false positives are loud.

Two consequences follow. Capture baselines *before* you ship, because afterwards you cannot reconstruct them. And measure the system over time rather than attributing specific wins to specific features; the attribution argument is unwinnable, and the trend is what matters.

## The four DORA delivery metrics

The DORA research programme, reported in *Accelerate* and the annual State of DevOps reports, identified four metrics that together describe a delivery system's throughput and stability. Use the definitions; be sceptical of anyone attaching a universal threshold.

| Metric | Definition | What it exposes |
|---|---|---|
| **Deployment frequency** | How often the organisation successfully releases to production | Batch size and friction in the release path |
| **Lead time for changes** | Time from code committed to that code running in production | Pipeline latency, including waits and approvals |
| **Change failure rate** | Share of production deployments causing a degradation that needs remediation — rollback, hotfix or fix-forward | Whether speed is bought with instability |
| **Time to restore service** | How long it takes to recover service after a production failure | Detection, diagnosis, cost of reversing a change |

They are designed to be read in pairs. Throughput (frequency, lead time) and stability (change failure rate, restore time) constrain each other, and a change improving one while wrecking the other is not an improvement. The research supports the claim that the two are not fundamentally opposed — not that any particular number is achievable in your context.

Two caveats matter more than the definitions.

**They measure the delivery system, not people.** Lead time is dominated by queues, approvals, environment availability and test duration — properties of the system a developer works inside, not of the developer. Attributing them to individuals measures the system and blames the person.

**They collapse into gaming when attached to performance review.** Deployment frequency rises when one change is split into five commits. Change failure rate falls when failures get reclassified as planned maintenance. Restore time improves when the clock starts at diagnosis rather than detection. None of this requires dishonesty — it is the ordinary response to being measured, and it arrives the moment the metric affects someone's rating.

Resist deriving a composite score from the four: compressing them into one number is what hides the throughput-stability trade-off.

## Developer experience: the necessary counterweight

Delivery metrics describe how fast changes move, not what the trip costs the people making it — and a system can post respectable throughput while burning out the teams inside it.

The SPACE framework (Forsgren et al.) is the standard corrective. It holds that productivity is multidimensional and that any single dimension read alone will mislead:

| Dimension | What it covers |
|---|---|
| **Satisfaction and wellbeing** | Fulfilment, perceived tooling quality, burnout risk |
| **Performance** | Outcomes of the work — reliability, quality, impact |
| **Activity** | Counts of actions: commits, builds, deploys, reviews |
| **Communication and collaboration** | Discoverability, review flow, how knowledge moves |
| **Efficiency and flow** | Uninterrupted work, handoffs, waiting time |

SPACE's own guidance is to pick metrics from several dimensions, including at least one perceptual measure, rather than instrumenting whichever dimension is cheapest.

Activity is cheapest, which is why it dominates, and it misleads most reliably. Commit counts measure commit granularity. Build counts rise when builds are flaky. Deploy counts rise when deploys are split. High activity is equally consistent with productive flow and with thrashing against a broken toolchain, and the raw count cannot tell them apart.

For a platform team, the most informative measures concern *flow*: time from a new engineer's first day to their first merged change in production, time waiting for a build or an environment, and the number of distinct systems someone must touch to ship. These are system properties, they are collectable, and improving them is unambiguously the platform's job.

## Adoption as an honest funnel

Adoption is where a platform's product claim is tested, and the usual version of it — a single "teams onboarded" count — hides every interesting detail. A funnel does not.

```diagram
pv-pe-adoption-funnel
```

Each stage diagnoses a different failure, which is the point of splitting them. Strong awareness and weak first use is an onboarding or documentation defect. Strong first use and weak repeat use is the most damning result on the page: people tried the platform, understood it, and chose not to return. No amount of internal marketing fixes that one.

The bottom line is the share of **production** services on the paved road. Pilots and side projects inflate every other number; a capability no production workload depends on has not been adopted, it has been sampled.

**Voluntary adoption rate is the single most informative number a platform team has** — the fraction of eligible teams using the platform where a credible alternative existed and nobody was compelled. It integrates every other quality: if the platform is faster, safer and better documented than rolling your own, this number rises on its own. It is also the number a mandate destroys, as [Platform as a Product](/docs/platform-engineering/platform-as-a-product) argues — once usage is compulsory it measures compliance, and the instrument is gone.

Pair it with its shadow: how many teams started and left, and what they moved to. Churn is reported far less often than growth and carries more information.

## Qualitative signal

Numbers tell you that something changed, rarely why. Platform teams that measure only what is instrumentable end up optimising a dashboard.

**Surveys** work when they are short, regular and comparable over time. One question that earns its place: "What is the most frustrating part of shipping a change here?" — open-ended, repeated quarterly, themed rather than scored. A long survey run once gives a snapshot; four short ones give a trend.

**Office hours** surface the problems nobody files a ticket for: the threshold for raising something in conversation is far lower than for writing it up, and the questions people ask out loud read directly onto where your abstractions confuse.

**Support-channel themes** are the highest-fidelity product feedback available, and the most commonly wasted. Every support request is a user telling you precisely where the platform failed them, with a reproduction case attached. Treating these as interruptions to be cleared — measured by response time and closure rate — optimises for disposal rather than learning.

Read them as product input instead. Tag each request by root cause, review the tags on a cadence, and treat any recurring theme as a platform defect rather than a gap in the user. The question is never "why did they not read the docs" but "why did the system make this the natural mistake".

## What not to measure

These are not merely weak proxies. Each one actively degrades behaviour once people know it is counted.

| Do not measure | Why it fails |
|---|---|
| **Lines of code** | Rewards verbosity, punishes deletion — usually the better engineering |
| **Ticket counts** | Rewards fragmenting work and closing issues rather than resolving causes |
| **Story points** | A planning aid, not an output measure. Used as a target, points inflate and the estimate loses its only function |
| **Packages or features shipped** | Measures surface area, not value. A team shipping ten unused capabilities beats one that made the existing path reliable — on this metric, and only this one |
| **Any per-developer metric** | Measures the system a person works in and attributes it to the person; guarantees gaming; damages collaboration |

The per-developer prohibition deserves its own emphasis. It applies to DORA metrics as much as to commit counts, and regardless of intent — "we only use it for coaching" does not survive the first promotion cycle in which someone suspects otherwise. Measure teams, services and systems. The moment a metric carries a person's name, you are measuring something other than what you wanted.

A useful test before adopting any metric: ask what the laziest way to improve it would be. If that answer is not something you want, the metric is unsafe as a target.

## How Adhar does this

Adhar supplies the instrumentation; the judgement above stays with you.

**Scorecards.** The `application/adhar-scorecards` package grades every service from 0 to 100, mapped to an A–F letter grade, from signals read in-cluster and refreshed by a CronJob every 30 minutes. The grade describes **the production-readiness of a service** — never the performance of the people who wrote it. Its value is that it turns "is this service ready?" from an opinion argued in a review meeting into a visible, comparable number with a stated basis, recomputed continuously rather than at a checkpoint everyone games. Read the distribution of grades across the estate as a platform-health instrument: a criterion that is weak everywhere is a platform gap, not a collection of careless teams.

**Observability without per-service setup.** Prometheus for metrics, Loki for logs, Tempo for traces, Mimir for long-term metric storage and Grafana for query and dashboards are provisioned by the platform, so delivery and runtime signal exists for a service from its first deploy. That matters here specifically: baselines are only capturable if collection predates the thing you want to measure, and per-service instrumentation is exactly the step teams skip under deadline. See [Observability](/docs/operations/observability) for detail.

**Cost attribution.** OpenCost attributes spend to workloads and namespaces, putting the cost side of a trade-off next to the delivery side. Without it, efficiency arguments run on anecdote.

## See also

- [Platform as a Product](/docs/platform-engineering/platform-as-a-product) — why voluntary adoption is the signal to protect
- [The Paved Road to Production](/docs/platform-engineering/paved-road) — what the production-adoption number measures adoption of
- [Observability](/docs/operations/observability) — the metrics, logging and tracing stack
- [The 6 D's Framework](/docs/core-concepts/ds-framework) — where Discover and Decide sit in the lifecycle
