---
title: "Platform as a Product"
section: "Platform Engineering"
order: 5
path: "/docs/platform-engineering/platform-as-a-product"
---

# Platform as a Product

"Platform as a product" means an internal platform should be built, funded and judged the way a commercial product is: **with users who choose it, a roadmap you can be held to, and voluntary adoption as the measure of whether it works.** Almost all platform engineering writing uses the phrase. Far fewer teams make the commitments behind it, and that gap is where most internal platforms fail.

Treating the platform as a product is not a tone of voice. It is a set of duties:

- research with users before you build
- a published roadmap
- honest versioning and deprecation
- staffed support
- accepting that users who go elsewhere are telling you something true

## At a glance

| | |
|---|---|
| **The core claim** | An internal platform competes for adoption and must earn it |
| **Your users** | Engineers in your own organisation, not external customers |
| **Their alternative** | Build it themselves — always possible, often believable |
| **Primary success signal** | Voluntary adoption, not mandated usage |
| **What it is not** | A ticket queue, an approval gate, or a list of tools |
| **Hardest discipline** | Saying no to internal requests that do not serve the roadmap |
| **Usual failure mode** | Building what the platform team finds interesting |

## Your users are engineers, and they have alternatives

This is the basic fact that makes an internal platform a product rather than a shared service: your users can build it themselves. A team that finds your deployment abstraction confusing can write its own Helm chart. A team that dislikes your database provisioning API can open a cloud console. Leaving costs a sprint of effort, and these people are fully capable of paying it.

That competition is healthy. The mistake is to treat it as disobedience. When a team works around the platform, it has run an experiment and got a result. For its workload, at its level of skill, the platform was worse than the alternative. That is the most valuable product feedback you will get, and it costs you nothing.

Treat it as your main signal. A team that responds to defection by escalating turns a useful clue into a political fight and learns nothing. A team that asks "what did they need that we did not have?" gets a roadmap item.

The competition also keeps scope in check. Engineers will not adopt an abstraction that costs more to learn than the thing it hides. If your Kubernetes abstraction has as many concepts as Kubernetes, people who already know Kubernetes have no reason to use it. And they are the people whose opinion the rest of the organisation watches.

## Know who your users are, and that they conflict

"Developers" is too broad. An internal platform serves at least four groups, and their needs really do pull against each other.

| User | What they want | What they will accept |
|---|---|---|
| **Application developers** | A short path from commit to production; few concepts to learn; fast feedback | Constraints whose reason they can see |
| **SREs and operators** | Consistency, standard telemetry, predictable failure modes, the ability to debug | Some developer flexibility, if it has limits |
| **Security and compliance** | Verifiable controls, provable provenance, auditable change history | Automated instead of manual controls, if coverage holds |
| **Engineering leadership** | Throughput, cost visibility, less duplication, risk they can report on | Investment in platform work, if the return is clear |

These are not variations on one requirement. Developer speed and operational consistency trade off directly. Security wants a gate; developers want no gate. Leadership wants standardisation; teams with truly unusual workloads want an exception.

Product thinking does not resolve these conflicts. It makes you own them openly. The platform decides, in public, where each trade-off lands and why. It does not leave the answer to whoever shouts loudest that quarter.

The [paved road](/docs/platform-engineering/paved-road) is one example. It meets security requirements as built-in properties of the path, not as approval steps. That serves both groups without pretending the tension was imaginary.

## Adoption over mandate

This is the central discipline, and the one most often dropped under schedule pressure. **A platform that must be made compulsory has already failed its product test.** If the platform were the best route to production, teams would take it without being told. A mandate admits that it is not. People reach for the mandate because the alternative — fixing the platform — is slower.

The deeper cost is that a mandate destroys the signal that would have told you what was wrong. Before the mandate, usage measures value. After it, usage measures compliance. The number goes up, the dashboard looks healthy, and you have lost the instrument you needed most.

```diagram
pv-pe-adoption-vs-mandate
```

Mandates are not always wrong. Some controls are non-negotiable: signed images, no plaintext secrets, audit retention. The honest approach separates two things. Mandate the *outcome* that regulation or risk actually requires. Then compete for adoption of the *path* that delivers it. A team that meets the control some other way is complying, not defecting.

## Product discipline in practice

| Practice | What it means in practice |
|---|---|
| **Discovery** | Interviews, shadowing and usage data from your own colleagues before you build. Ask what their last bad week looked like, not which features they want |
| **Roadmap** | A published, dated view of what is coming and what is not. A roadmap nobody outside the team can see is a backlog |
| **Versioning** | Interfaces have versions. Breaking changes get a new one |
| **Deprecation policy** | A written notice period, a migration path, and tooling to carry it out. "We announced it in Slack" is not a policy |
| **Release notes** | Every change users can notice, written for users — not a commit log |
| **Documentation as a feature** | A capability with no docs does not exist. Docs ship with the change, not after it |
| **Support and on-call** | A staffed channel with an expected response time, and a pager for the platform itself |
| **An SLO for the platform** | The platform is production infrastructure. Publish availability targets for the control plane, the registry and the build system, and report against them |

Two of these are often skipped, and they should not be:

- **On-call for the platform** turns "shared responsibility" from a slogan into something users can rely on. If nobody owns the platform's outages, teams are right to fear depending on it.
- **A deprecation policy** is what makes it safe to adopt early. Teams will not build on an interface that might vanish without warning.

## The platform product manager

A platform product manager (PM) is a real role, not a title handed to the most senior engineer. The job is the part engineers are least suited to: deciding what *not* to build.

The work includes:

- research with internal users
- maintaining the roadmap
- deciding between the groups above when they conflict
- running the deprecation calendar
- saying no — to the one-off request that would split the abstraction, to the feature that serves one loud team, and to the integration nobody will maintain

Without a PM, the failure is predictable. The platform becomes the sum of every request anyone ever made, which is the opposite of a product. With the wrong PM, the failure is someone who cannot tell a real technical constraint from a preference. The role needs both technical depth and product skill, which is why it is hard to fill.

## Anti-patterns

**The platform built from the platform team's preferences.** The team builds what it would want, with the technology it finds interesting, solving the problem it last had. The result is coherent, well-engineered, and aimed at nobody. The warning sign: no user research came before the architecture. The team can describe the design in detail, but not how a user works today.

**"If we build it, they will come."** Twelve months of building alone, a launch announcement, then silence. Adoption is not an event that follows completion. It runs alongside development. A platform with three real users at month three is in better shape than one with none at month twelve, however much more the second one does.

**The abstraction that leaks the moment anything goes wrong.** The happy path hides Kubernetes entirely. Then a pod will not schedule. The developer lands in a layer they were never taught, debugging generated YAML they have never seen. The abstraction saved them learning on a good day and cost them double on a bad one. Anything that hides the underlying layer must also help users debug it when it misbehaves. That means readable generated output, errors in the user's own terms, and a documented escape hatch.

**The platform that cannot be exited.** If leaving means rewriting every service, teams will sensibly resist joining. A platform confident in its value lets you walk away. It uses standard artifacts, portable configuration, and no proprietary format that holds your deployment definitions hostage. Exit cost is really adoption cost, and any sensible team counts it before joining.

**The gatekeeper team.** Approval is easier to build than automation. A policy becomes a review, a review becomes a queue, and the team that set out to speed up delivery is now the thing delivery waits on. The cause is usually a hard automation problem put off once under pressure. After that, the manual step became permanent. The fix is to treat every recurring approval as a defect with a deadline.

## How Adhar does this

Adhar is a product you run, not a service you buy. So the discipline above passes to the team that adopts it. Nobody outside your organisation is researching your developers' needs, writing your deprecation notices or carrying your pager. Adhar supplies the foundation; the product work is still yours. Three properties of the project matter for the argument on this page.

**Apache 2.0 end to end, with no proprietary tier.** No paid edition holds back the feature you eventually need. So there is no commercial lever that could stand in for the platform being truly useful. This speaks directly to the exit-cost anti-pattern: the licence is not what keeps you.

**Opt-in packages.** The catalogue holds over a hundred packages. The local profile turns on only a small curated fraction of them, and the production profile turns on most. `adhar stack list` prints what your current profile turns on, next to each package's live state. Teams adopt features bit by bit, in the order they actually need them, instead of facing the whole platform on day one. That is how adoption works in practice.

**Standard artifacts underneath.** Workloads stay Kubernetes resources. Images stay OCI images in [Harbor](/docs/core-concepts/platform-services). Configuration stays Git-managed YAML that ArgoCD reconciles. When an abstraction misbehaves, teams can inspect the generated output, so a leaky abstraction stays survivable.

## See also

- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — the adoption funnel, DORA, and what not to measure
- [Golden Paths](/docs/platform-engineering/golden-paths) — the route you are asking teams to choose
- [The Paved Road to Production](/docs/platform-engineering/paved-road) — enforcement as a property rather than a gate
- [What is Platform Engineering?](/docs/platform-engineering/what-is-platform-engineering) — the discipline and the cognitive-load argument
