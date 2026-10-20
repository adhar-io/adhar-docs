---
title: "Measuring Platform Success"
section: "Platform Engineering"
order: 6
path: "/docs/platform-engineering/measuring-success"
---

# Measuring Platform Success

Most of a platform's value lies in things that did not happen: **the incidents that never occurred, the week nobody spent wiring up observability, the misconfiguration that was never deployed.** None of those produce a number on their own. That is why platform teams are both under-measured and badly measured. It is also why the metrics they pick are so often the cheapest to collect rather than the most accurate.

This page covers four families of measurement that work together: delivery throughput, developer experience, adoption, and qualitative signal. It ends with a firm list of what to leave alone.

## At a glance

| | |
|---|---|
| **Core difficulty** | Value lies in what did not happen; prevented cost leaves no trace |
| **Delivery signal** | The four DORA metrics, measured on the system |
| **Experience signal** | SPACE dimensions; surveys and support themes |
| **Adoption signal** | A funnel ending in production services on the paved road |
| **Single best number** | Voluntary adoption rate |
| **Unit of measurement** | The system and the service — never the individual |
| **Guaranteed to backfire** | Any per-developer metric, for any purpose |

## Why this is genuinely hard

Platform work removes cost instead of adding output. Say a team ships a service in two days instead of three weeks. The two-and-a-half weeks that did not happen are invisible. There is no ticket, no commit, no line item.

Worse, the platform's biggest wins are things that do not happen. A supply-chain policy that blocks an unsigned image prevents an incident with no name, no postmortem and no cost attached. People only notice the control when it blocks something legitimate. So the platform's successes are silent, and its false alarms are loud.

Two lessons follow:

- **Capture baselines *before* you ship.** Afterwards you cannot reconstruct them.
- **Measure the system over time.** Do not try to credit specific wins to specific features. You cannot win that argument, and the trend is what matters.

## The four DORA delivery metrics

The DORA research programme, reported in *Accelerate* and the annual State of DevOps reports, found four metrics that together describe how fast and how stable a delivery system is. Use the definitions. Be sceptical of anyone who attaches a universal target to them.

| Metric | Definition | What it exposes |
|---|---|---|
| **Deployment frequency** | How often the organisation successfully releases to production | Batch size and friction in the release path |
| **Lead time for changes** | Time from code committed to that code running in production | Pipeline delay, including waits and approvals |
| **Change failure rate** | Share of production deployments that cause a problem needing a fix — rollback, hotfix or fix-forward | Whether speed is bought with instability |
| **Time to restore service** | How long it takes to recover service after a production failure | Detection, diagnosis, cost of reversing a change |

Read them in pairs. Throughput (frequency, lead time) and stability (change failure rate, restore time) limit each other. A change that improves one while wrecking the other is not an improvement. The research supports the claim that the two are not fundamentally opposed. It does not say that any particular number is achievable in your context.

Two caveats matter more than the definitions.

**They measure the delivery system, not people.** Lead time is driven mostly by queues, approvals, environment availability and test duration. Those are properties of the system a developer works inside, not of the developer. If you pin these metrics on individuals, you measure the system and blame the person.

**They get gamed once they are tied to performance reviews.** Deployment frequency rises when one change is split into five commits. Change failure rate falls when failures get relabelled as planned maintenance. Restore time improves when the clock starts at diagnosis instead of detection. None of this needs dishonesty. It is the normal response to being measured, and it starts the moment the metric affects someone's rating.

Do not combine the four into one composite score. Squeezing them into a single number hides the trade-off between throughput and stability.

## Developer experience: the necessary counterweight

Delivery metrics show how fast changes move. They do not show what the journey costs the people making the changes. A system can show respectable throughput while burning out the teams inside it.

The SPACE framework (Forsgren et al.) is the standard correction. It says productivity has many dimensions, and any single one read alone will mislead:

| Dimension | What it covers |
|---|---|
| **Satisfaction and wellbeing** | Fulfilment, how good the tooling feels, burnout risk |
| **Performance** | Outcomes of the work — reliability, quality, impact |
| **Activity** | Counts of actions: commits, builds, deploys, reviews |
| **Communication and collaboration** | How easy things are to find, review flow, how knowledge moves |
| **Efficiency and flow** | Uninterrupted work, handoffs, waiting time |

SPACE's own guidance is to pick metrics from several dimensions, including at least one based on how people feel (a perceptual measure). Do not just instrument whichever dimension is cheapest.

Activity is the cheapest, which is why it dominates. It is also the most reliably misleading:

- Commit counts measure how finely people split their commits.
- Build counts rise when builds are flaky.
- Deploy counts rise when deploys are split.

High activity fits equally well with productive flow and with struggling against a broken toolchain. The raw count cannot tell them apart.

For a platform team, the most useful measures are about *flow*:

- time from a new engineer's first day to their first merged change in production
- time spent waiting for a build or an environment
- the number of separate systems someone must touch to ship

These are system properties. You can collect them. And improving them is clearly the platform's job.

## Adoption as an honest funnel

Adoption is where a platform's product claim is tested. The usual measure — a single "teams onboarded" count — hides every interesting detail. A funnel does not.

```diagram
pv-pe-adoption-funnel
```

Each stage points to a different failure, which is why you split them:

- **Strong awareness, weak first use** points to an onboarding or documentation problem.
- **Strong first use, weak repeat use** is the most damning result on the page. People tried the platform, understood it, and chose not to come back. No amount of internal marketing fixes that.

The bottom line is the share of **production** services on the paved road. Pilots and side projects inflate every other number. If no production workload depends on a capability, it has not been adopted. It has only been sampled.

**Voluntary adoption rate is the most informative single number a platform team has.** It is the fraction of eligible teams using the platform when a believable alternative existed and nobody was forced. It captures every other quality. If the platform is faster, safer and better documented than building your own, this number rises by itself.

It is also the number a mandate destroys, as [Platform as a Product](/docs/platform-engineering/platform-as-a-product) argues. Once usage is compulsory, it measures compliance, and the instrument is gone.

Pair it with its shadow: how many teams started and then left, and what they moved to. Churn is reported far less often than growth, and it tells you more.

## Qualitative signal

Numbers tell you that something changed. They rarely tell you why. Platform teams that measure only what they can instrument end up optimising a dashboard.

**Surveys** work when they are short, regular and comparable over time. One question that earns its place: "What is the most frustrating part of shipping a change here?" Keep it open-ended, repeat it quarterly, and group the answers into themes rather than scoring them. A long survey run once gives a snapshot. Four short ones give a trend.

**Office hours** bring out the problems nobody files a ticket for. People raise things in conversation far more readily than they write them up. The questions people ask out loud show you exactly where your abstractions confuse.

**Support-channel themes** are the most accurate product feedback you have, and the most often wasted. Every support request is a user telling you exactly where the platform failed them, with a reproduction case attached. If you treat these as interruptions to clear, measured by response time and closure rate, you optimise for getting rid of them rather than learning from them.

Read them as product input instead:

1. Tag each request by root cause.
2. Review the tags on a regular schedule.
3. Treat any recurring theme as a platform defect, not a failing of the user.

The question is never "why did they not read the docs?" It is "why did the system make this the natural mistake?"

## What not to measure

These are not just weak stand-ins. Each one actively makes behaviour worse once people know it is counted.

| Do not measure | Why it fails |
|---|---|
| **Lines of code** | Rewards wordiness and punishes deletion, which is usually the better engineering |
| **Ticket counts** | Rewards splitting work up and closing issues rather than fixing causes |
| **Story points** | A planning aid, not an output measure. Used as a target, points inflate and the estimate loses its only purpose |
| **Packages or features shipped** | Measures surface area, not value. On this metric, and only this one, a team shipping ten unused capabilities beats one that made the existing path reliable |
| **Any per-developer metric** | Measures the system a person works in and pins it on the person; guarantees gaming; damages collaboration |

The ban on per-developer metrics deserves extra emphasis. It applies to DORA metrics as much as to commit counts, whatever the intent. "We only use it for coaching" does not survive the first promotion cycle in which someone suspects otherwise. Measure teams, services and systems. The moment a metric carries a person's name, you are measuring something other than what you wanted.

A useful test before adopting any metric: ask what the laziest way to improve it would be. If you would not want that outcome, the metric is unsafe as a target.

## How Adhar does this

Adhar supplies the instrumentation. The judgement described above stays with you.

**Scorecards.** The `application/adhar-scorecards` package grades every service from 0 to 100, mapped to an A–F letter grade. It reads signals inside the cluster, and a CronJob refreshes them every 30 minutes. The grade describes **the production-readiness of a service** — never the performance of the people who wrote it.

Its value is that it turns "is this service ready?" from an opinion argued in a review meeting into a visible, comparable number with a stated basis. It is recomputed continuously, not at a checkpoint everyone games. Read the spread of grades across all your services as a measure of platform health. A criterion that scores weakly everywhere is a platform gap, not a collection of careless teams.

**Observability without per-service setup.** The platform provisions the monitoring stack, so delivery and runtime signal exists for a service from its first deploy:

- Prometheus for metrics
- Loki for logs
- Tempo for traces
- Mimir for long-term metric storage
- Grafana for queries and dashboards

This matters here for a specific reason. You can only capture a baseline if collection starts before the thing you want to measure. And per-service instrumentation is exactly the step teams skip under deadline. See [Observability](/docs/operations/observability) for detail.

**Cost attribution.** OpenCost assigns spend to workloads and namespaces. That puts the cost side of a trade-off next to the delivery side. Without it, arguments about efficiency run on anecdote.

## See also

- [Platform as a Product](/docs/platform-engineering/platform-as-a-product) — why voluntary adoption is the signal to protect
- [The Paved Road to Production](/docs/platform-engineering/paved-road) — what the production-adoption number measures adoption of
- [Observability](/docs/operations/observability) — the metrics, logging and tracing stack
- [The 6 D's Framework](/docs/core-concepts/ds-framework) — where Discover and Decide sit in the lifecycle
