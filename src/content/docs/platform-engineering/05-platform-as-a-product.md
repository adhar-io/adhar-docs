---
title: "Platform as a Product"
section: "Platform Engineering"
order: 5
path: "/docs/platform-engineering/platform-as-a-product"
---

# Platform as a Product

"Platform as a product" means you build, fund and judge an internal platform the way you would a commercial product: **with users who choose it, a roadmap you can be held to, and voluntary adoption as the measure of whether it works.**

This page lists the duties behind the phrase and the anti-patterns that follow from skipping them. Then it shows which parts Adhar supplies and which stay with you.

## How it works

```diagram
npe-product-loop
```

The loop has four duties:

1. **Discover.** Research with your users before you build.
2. **Decide.** Publish a roadmap, including what you will not build.
3. **Ship.** Version it, document it, support it.
4. **Measure.** Read voluntary adoption and churn, and feed them back into discovery.

## Your users have alternatives

Your users can build it themselves. A team that finds your deployment abstraction confusing can write its own Helm chart. A team that dislikes your database API can open a cloud console.

Treat that as your main signal, not as disobedience. A team that works around the platform ran an experiment: for its workload, the platform was worse than the alternative. Ask "what did they need that we did not have?" and you get a roadmap item. Escalate, and you learn nothing.

The competition also limits scope. If your Kubernetes abstraction has as many concepts as Kubernetes, the people who already know Kubernetes have no reason to use it.

## Know who your users are

"Developers" is too broad. A platform serves at least four groups, and their needs conflict.

| User | Wants | Will accept |
|---|---|---|
| **Application developers** | A short path from commit to production; few concepts; fast feedback | Constraints whose reason they can see |
| **SREs and operators** | Consistency, standard telemetry, predictable failure modes | Developer flexibility, if it has limits |
| **Security and compliance** | Verifiable controls, provenance, an auditable change history | Automated controls instead of manual ones, if coverage holds |
| **Engineering leadership** | Throughput, cost visibility, less duplication | Platform investment, if the return is clear |

Product thinking does not resolve these conflicts. It makes you decide them in public and say why. The [paved road](/docs/platform-engineering/paved-road) is one such decision: it meets security requirements as built-in properties, not approval steps.

## Adoption over mandate

**A platform that must be made compulsory has failed its product test.** If it were the best route to production, teams would take it without being told.

A mandate also destroys the signal that would tell you what is wrong. Before it, usage measures value. After it, usage measures compliance.

```diagram
pv-pe-adoption-vs-mandate
```

Some controls are non-negotiable: signed images, no plaintext secrets, audit retention. Separate the two:

- **Mandate the outcome** that regulation or risk requires.
- **Compete for adoption of the path** that delivers it. A team that meets the control another way is complying, not defecting.

## Product discipline in practice

| Practice | What it means |
|---|---|
| **Discovery** | Interviews, shadowing and usage data before you build. Ask what their last bad week looked like, not which features they want |
| **Roadmap** | A published view of what is coming and what is not. A roadmap nobody outside the team can see is a backlog |
| **Versioning** | Interfaces have versions. Breaking changes get a new one |
| **Deprecation policy** | A written notice period, a migration path, and tooling to carry it out |
| **Release notes** | Every change users can notice, written for users |
| **Documentation** | A capability with no docs does not exist. Docs ship with the change |
| **Support and on-call** | A staffed channel with an expected response time, and a pager for the platform itself |
| **An SLO for the platform** | Published availability targets for the control plane, the registry and the build system |

Two are often skipped and should not be. **On-call** makes the platform safe to depend on. **A deprecation policy** makes it safe to adopt early.

## The platform product manager

A platform product manager decides what *not* to build. That covers user research, the roadmap, arbitration between the groups above, the deprecation calendar, and saying no to the one-off request that would split the abstraction.

Without the role, the platform becomes the sum of every request anyone made. The role needs both technical depth and product skill: someone who can tell a real constraint from a preference.

## Anti-patterns

| Anti-pattern | What happens | What to do instead |
|---|---|---|
| **Built from the platform team's preferences** | Coherent, well engineered, aimed at nobody. No user research came before the architecture | Start from how a user works today |
| **"If we build it, they will come"** | A long build in isolation, a launch announcement, then silence | Run adoption alongside development. A few real users early beat none at launch |
| **The abstraction that leaks on a bad day** | The happy path hides Kubernetes; then a pod will not schedule and the developer debugs generated YAML they have never seen | Give readable generated output, errors in the user's terms, and a documented escape hatch |
| **The platform you cannot exit** | Leaving means rewriting every service, so teams resist joining | Use standard artifacts and portable configuration. Exit cost is adoption cost |
| **The gatekeeper team** | A policy becomes a review, a review becomes a queue | Treat every recurring approval as a defect with a deadline |

## How Adhar does this

Adhar is a product you run, not a service you buy. It supplies the foundation and the tooling. The product work — research with your developers, your deprecation notices, your pager — stays with your platform team.

| Duty | What Adhar gives you | Read more |
|---|---|---|
| **No lock-in** | Apache 2.0 end to end, with no proprietary tier. No paid edition holds back a feature you will need | [Roadmap](/docs/reference/roadmap) |
| **Incremental adoption** | Packages are opt-in. The local profile enables a small curated core; the production profile enables most of the catalogue. `adhar stack list` shows what your profile enables next to each package's live state; `adhar stack enable <pkg>` turns one on | [Customization](/docs/operations/customization) |
| **A cheap exit** | Workloads stay Kubernetes resources, images stay OCI images in [Harbor](/docs/core-concepts/platform-services), and configuration stays Git-managed YAML that Argo CD reconciles | [Architecture](/docs/core-concepts/architecture) |
| **Survivable abstractions** | When an abstraction misbehaves, you can inspect the generated objects with `kubectl` | [Control Plane](/docs/core-concepts/control-plane) |
| **A published roadmap** | Every capability is listed with a status of complete, in progress, blocked or planned | [Roadmap](/docs/reference/roadmap) |
| **Adoption signal** | Scorecards grade every service from live signals; see what they measure and what they do not | [Measuring Platform Success](/docs/platform-engineering/measuring-success) |

## Next steps

- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — the adoption funnel, DORA, and what not to measure.
- [Golden Paths](/docs/platform-engineering/golden-paths) — the route you are asking teams to choose.
- [The Paved Road to Production](/docs/platform-engineering/paved-road) — enforcement as a property, not a gate.
