---
title: "Platform as a Product"
section: "Platform Engineering"
order: 5
path: "/docs/platform-engineering/platform-as-a-product"
---

# Platform as a Product

"Platform as a product" is the claim that an internal platform should be built, funded and judged the way a commercial product is: **with users who choose it, a roadmap you can be held to, and voluntary adoption as the measure of whether it works.** The phrase is close to universal in platform engineering writing. The commitments behind it are not, and that gap is where most internal platforms fail.

Treating the platform as a product is not a tone of voice. It is a set of obligations: discovery before building, a published roadmap, honest versioning and deprecation, staffed support, and accepting that users who go elsewhere are telling you something true.

## At a glance

| | |
|---|---|
| **The core claim** | An internal platform competes for adoption and must earn it |
| **Your users** | Engineers in your own organisation, not external customers |
| **Their alternative** | Build it themselves — always available, often credible |
| **Primary success signal** | Voluntary adoption, not mandated usage |
| **What it is not** | A ticket queue, an approval gate, or a tooling inventory |
| **Hardest discipline** | Saying no to internal requests that do not serve the roadmap |
| **Usual failure mode** | Building what the platform team finds interesting |

## Your users are engineers, and they have alternatives

This is the structural fact that makes an internal platform a product rather than a shared service. Your users can build it themselves. A team that finds your deployment abstraction confusing can write their own Helm chart; a team that dislikes your database provisioning API can open a cloud console. The bar for defection is a sprint of effort by people entirely capable of clearing it.

That competitive pressure is healthy, and the mistake is treating it as insubordination. When a team routes around the platform, they have run an experiment and produced a result: for their workload, at their level of skill, the platform was worse than the alternative. That is the most valuable product feedback you will get, and it arrives free.

Treat it as the primary signal. A team that reacts to defection by escalating has converted a diagnostic into a political problem and learned nothing; a team that asks "what did they need that we did not have?" gets a roadmap item.

The pressure also disciplines scope. Engineers will not adopt an abstraction that costs more to learn than the thing it hides. If your Kubernetes abstraction has as many concepts as Kubernetes, the people who already know Kubernetes have no reason to use it — and they are the people whose endorsement the rest of the organisation watches.

## Know who your users are, and that they conflict

"Developers" is too coarse. An internal platform serves at least four constituencies whose needs genuinely pull against each other.

| User | What they want | What they will tolerate |
|---|---|---|
| **Application developers** | A short path from commit to production; few concepts to learn; fast feedback | Constraints they can see the reason for |
| **SREs and operators** | Consistency, standard telemetry, predictable failure modes, the ability to debug | Some developer flexibility, if it is bounded |
| **Security and compliance** | Verifiable controls, provable provenance, auditable change history | Controls that are automated rather than manual, if coverage holds |
| **Engineering leadership** | Throughput, cost visibility, reduced duplication, risk they can report on | Investment in platform work, if the return is legible |

These are not variations on one requirement. Developer velocity and operational consistency trade against each other directly. Security wants a gate; developers want no gate. Leadership wants standardisation; teams with genuinely unusual workloads want an exception.

Product thinking does not resolve these conflicts — it makes you own them explicitly. The platform decides, publicly, where each trade-off lands and why, instead of leaving the resolution to whoever shouts loudest in a given quarter. The [paved road](/docs/platform-engineering/paved-road) is one such resolution: security requirements are satisfied as properties of the path rather than as approval steps, which serves both constituencies without pretending the tension was imaginary.

## Adoption over mandate

This is the central discipline, and the one most often abandoned under schedule pressure. **A platform that must be made compulsory has already failed its product test.** If the platform were the best available route to production, teams would take it without being told. The mandate is an admission that it is not, and it is applied precisely because the alternative — fixing the platform — is slower.

The deeper cost is that mandating adoption destroys the signal that would have told you what was wrong. Before the mandate, usage measures value. After it, usage measures compliance. The number goes up, the dashboard looks healthy, and you have lost the instrument you needed most.

```diagram
pv-pe-adoption-vs-mandate
```

Mandates are not always wrong. Some controls are non-negotiable — signed images, no plaintext secrets, audit retention. The honest version separates the two: mandate the *outcome* that regulation or risk actually requires, and compete for adoption of the *path* that delivers it. A team that meets the control some other way is complying, not defecting.

## Product discipline in practice

| Practice | What it concretely means |
|---|---|
| **Discovery** | Interviews, shadowing and usage data from your own colleagues before you build. Ask what their last bad week looked like, not which features they want |
| **Roadmap** | A published, dated view of what is coming and what is not. A roadmap nobody outside the team can see is a backlog |
| **Versioning** | Interfaces have versions. Breaking changes get a new one |
| **Deprecation policy** | A written notice period, a migration path, and tooling to execute it. "We announced it in Slack" is not a policy |
| **Release notes** | Every change that users can observe, written for users, not a commit log |
| **Documentation as a feature** | Undocumented capability does not exist. Docs ship with the change, not after it |
| **Support and on-call** | A staffed channel with a response expectation, and a pager for the platform itself |
| **An SLO for the platform** | The platform is production infrastructure. Publish availability targets for the control plane, the registry and the build system, and report against them |

Two of these are routinely skipped and should not be. **On-call for the platform** converts "shared responsibility" from a slogan into something users can rely on; a platform whose outage has no owner is a dependency teams are right to fear. **Deprecation policy** is what makes it safe to adopt early — teams will not build on an interface that might vanish without warning.

## The platform product manager

A platform product manager is a real role, not a title given to the most senior engineer. The job is the part engineers are worst placed to do: deciding what *not* to build. The work is discovery with internal users, maintaining the roadmap, arbitrating between the constituencies above, running the deprecation calendar, and saying no — to the one-off request that would fork the abstraction, to the feature that serves a single loud team, to the integration nobody will maintain.

The failure mode without one is predictable: the platform becomes the union of every request anyone made, which is the opposite of a product. The failure mode with the wrong one is a PM who cannot tell a real technical constraint from a preference. The role needs both technical depth and product skill, which is why it is hard to fill.

## Anti-patterns

**The platform built from the platform team's preferences.** The team builds what they would want, using the technology they find interesting, solving the problem they last had. It is coherent, well-engineered and aimed at nobody. The tell: no user research preceded the architecture, and the team can describe the design in detail but not a user's current workflow.

**"If we build it, they will come."** Twelve months of building in isolation, a launch announcement, then silence. Adoption is not an event that follows completion; it runs alongside development. A platform with three real users at month three is in better shape than one with none at month twelve, however much more it does.

**The abstraction that leaks the moment anything goes wrong.** The happy path hides Kubernetes entirely. Then a pod will not schedule, and the developer is dropped into a layer they were never taught, debugging generated YAML they have never seen. The abstraction saved them learning on a good day and cost them double on a bad one. Anything that hides the substrate must also supply the debugging surface for when the substrate misbehaves — readable generated output, errors in the user's vocabulary, and a documented escape hatch.

**The platform that cannot be exited.** If leaving means rewriting every service, teams will resist entering — rationally. A platform confident in its value lets you walk: standard artifacts, portable configuration, no proprietary format holding your deployment definitions hostage. Exit cost is adoption cost, paid in advance by anyone sensible.

**The gatekeeper team.** Approval is simpler to implement than automation. A policy becomes a review, a review becomes a queue, and the team that set out to accelerate delivery is now the thing delivery waits on. The cause is usually a hard automation problem deferred once under pressure, after which the manual step became permanent. The fix is to treat every recurring approval as a defect with a deadline.

## How Adhar does this

Adhar is a product you run, not a service you buy, so the discipline above transfers to the team that adopts it. Nobody outside your organisation is doing discovery with your developers, writing your deprecation notices or carrying your pager. Adhar supplies the substrate; the product work remains yours. Three properties of the project bear on the argument here.

**Apache 2.0 end to end, with no proprietary tier.** There is no paid edition withholding the feature you eventually need, and so no commercial lever that could substitute for the platform being genuinely useful. This speaks to the exit-cost anti-pattern directly: the licence is not the thing keeping you.

**Opt-in packages.** The catalogue holds over a hundred packages, but the local profile enables only a curated fraction of them and production rather more — `adhar stack list` prints what each profile turns on. Teams adopt surface area incrementally, in the order they actually need it, rather than meeting the whole platform on day one — which is how adoption works in practice.

**Standard artifacts underneath.** Workloads remain Kubernetes resources, images remain OCI images in [Harbor](/docs/core-concepts/platform-services), and configuration remains Git-managed YAML reconciled by ArgoCD. Teams can inspect the generated output when an abstraction misbehaves, which keeps the leaky-abstraction failure survivable.

## See also

- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — the adoption funnel, DORA, and what not to measure
- [Golden Paths](/docs/platform-engineering/golden-paths) — the route you are asking teams to choose
- [The Paved Road to Production](/docs/platform-engineering/paved-road) — enforcement as a property rather than a gate
- [What is Platform Engineering?](/docs/platform-engineering/what-is-platform-engineering) — the discipline and the cognitive-load argument
