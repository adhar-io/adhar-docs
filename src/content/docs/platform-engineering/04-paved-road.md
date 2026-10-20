---
title: "The Paved Road to Production"
section: "Platform Engineering"
order: 4
path: "/docs/platform-engineering/paved-road"
---

# The Paved Road to Production

The paved road is the path from a commit to a running production workload. It is built so that **the safety checks are part of the road itself, not gates staffed by people**. A review checklist that relies on someone remembering to use it is not a control. It is a hope with a document attached.

This page is about the machinery. Its neighbour, [Golden Paths](/docs/platform-engineering/golden-paths), is about the offer a platform team makes to a product team: the supported, opinionated route they choose. The road is what that route runs on. A team can be on a golden path or off it. Either way, if its code reaches production, it travels the road. The road's guarantees hold no matter which path brought the commit.

## At a glance

| | |
|---|---|
| **What it is** | The commit-to-production pipeline, with guarantees built into each stage |
| **Core principle** | Guardrails are properties of the road, not checkpoints with humans at them |
| **What it guarantees** | Provenance (where an image came from), scanning, signing, admission, reversible rollout, telemetry |
| **What it does not do** | Decide what you build, or forbid leaving the road |
| **Progression** | Audit first, enforce once the audit data is clean — never enforce on day one |
| **Relation to golden paths** | The [path](/docs/platform-engineering/golden-paths) is the route offered; the road is the pipeline it runs on |

## Where the metaphor comes from

Netflix has used "paved road" for years to describe the supported, well-used route through its internal tooling. Thoughtworks writing about delivery platforms uses it in the same sense.

The metaphor is honest about choice. A paved road does not forbid driving across the field. It makes the road faster, smoother and better lit, so most traffic chooses it. And when someone does go off-road, everyone knows it, including them.

The second half is the important part. A road is not a fence.

## Guardrails are properties, not gates

There are two ways to make a policy hold. You can put a person in the path of the change. Or you can build the rule into the system, so that breaking it is not an available action.

| | Gate | Property of the road |
|---|---|---|
| **Mechanism** | A human reviews and approves | The pipeline or the cluster refuses |
| **Fails** | Open — under deadline pressure, the check is skipped | Closed — the deploy does not happen |
| **Scales** | With headcount | With CPU |
| **Evidence** | A ticket saying someone looked | A signature, a digest, an admission record |
| **Cost to developer** | Waiting, usually for an unpredictable time | Nothing, until the rule is actually broken |
| **Honest about drift** | No — the artifact can change after approval | Yes — the check runs on the artifact being deployed |

Gates are not useless. Human review is the right tool for judgement: is this the right change, is this design sound? It is the wrong tool for anything a machine can check. "Did someone remember to scan the image?" is something a machine can check. Asking a person to confirm it adds delay and makes the result less reliable.

Here is a practical test. Imagine everyone involved is tired, distracted, and shipping a hotfix at 23:00. If the control still holds, it is a property. If not, it is a gate dressed up as a policy.

## The road, stage by stage

Each stage exists because it adds a guarantee the next stage can rely on. The value builds up. By the time a workload is admitted, the cluster can say where the image came from, what was in it, who built it, and that nothing has changed it since.

```diagram
paved-road
```

Two details are often missed.

**The thing that moves along the road is a digest, not a tag.** A digest is a hash that identifies exact image contents. Tags can change: `app:v1.4.2` can point at a different image tomorrow. Signing and admitting by digest makes a statement about a specific set of bytes. Admitting by tag makes a statement about a label.

**Promotion should move the artifact, not rebuild it.** If staging and production each build from source, they test different bytes. Then every guarantee earned in staging is only a guess about production. Build once, promote the digest, and change only the configuration.

## Why "shift left" fails, and when it works

"Shift left" means moving checks earlier in the delivery process. It is a good idea with a poor track record.

It fails when a platform responsibility becomes developer homework. Picture seven new scanners, a policy language to learn, a compliance spreadsheet, and a linter that fails the build on Friday afternoon with an error nobody can act on. Security moved left, and the work moved left with it. Nothing got safer, because the people now holding the work have less context and no time.

It works when shifting left means **the safe thing is the default thing** — what happens when a developer does nothing special:

- The platform chooses and patches base images, so the default container is already up to date.
- The standard deployment shape injects secrets from a secrets manager. Writing a secret into a manifest becomes the awkward route, not the easy one.
- Network policy, resource limits and non-root execution come from the template and the admission layer, so the default workload is already constrained.
- Telemetry is on by default, so instrumenting takes work away instead of adding it.

The key question: did your shift-left programme add steps to a developer's day? Or did it remove steps while improving the result? The first kind wears away. The second kind holds.

## Audit before enforce

Every policy engine has at least two modes: report violations, or reject them. The order you use them in matters more than the policy itself.

| Mode | What it does | What it is for |
|---|---|---|
| **Audit** | Records violations, allows the resource | Finding out what your fleet actually looks like, and sizing the migration |
| **Enforce** | Rejects the resource | Making the guarantee real, once the violation count is near zero |

Starting with enforce is the most common way to lose the organisation's support. On an existing (brownfield) estate, the first enforced policy blocks a deploy nobody expected it to block, usually during an incident. The lasting result is not a safer fleet. It is a culture that sees the platform as an obstacle, plus a standing exemption that never expires.

The sequence that works:

1. **Ship the policy in audit mode.** Leave it there long enough to see a representative sample of deploys.
2. **Publish the violation list per team**, with the fix included. Do not present it as a scoreboard.
3. **Fix the common cases in the golden path**, so most teams become compliant by upgrading rather than by editing.
4. **Enforce for new workloads first.** Let existing ones continue until a deadline, so nothing running breaks on the day of the switch.
5. **Enforce everywhere**, with the exception process already built and documented — not invented during the first outage.

The audit period is also your evidence that the policy is correct. A rule that would have blocked a long list of legitimate deploys is a bad rule. You would rather learn that from a report than from a sev-1 (a top-severity incident).

## Exceptions, or people route around the road

Some workload will have a legitimate reason to break a rule. It might be a vendor image you cannot rebuild, a legacy service that needs a privileged mount, or a latency-sensitive path that cannot take the sidecar.

With no approved way to handle that, one of two things happens. Both are worse than an exception:

- The team gets a blanket waiver that quietly covers everything it ever deploys.
- The team builds a parallel environment outside the road, where none of your guarantees apply and you cannot see it.

A workable exception process has four properties:

- **Scoped.** Limited to a namespace, a workload, or a specific rule — never "this team is exempt."
- **Expiring.** An exception with no end date is a policy change made by whoever asked loudest.
- **Visible.** A security engineer can read it without filing a request. The exception register describes your real risk more accurately than the policy set does.
- **Cheap to request, expensive to renew.** Put the friction at renewal. That is where the conversation about fixing the underlying problem can happen.

> An empty exception register does not mean you have no exceptions. It means they are happening somewhere you cannot see.

## How Adhar does this

Adhar builds the road as a supply chain inside the cluster. The enforcement point is admission to the cluster, not a review step.

**Build and sign.** Tekton pipelines build source code with Cloud Native Buildpacks. That makes the base image and its patching a platform concern, not a `Dockerfile` in each repository. Trivy scans the result, Cosign signs it, and Harbor stores it. The pipeline produces the signature, which is what makes the later admission check meaningful. The signature shows that this digest came out of that build, not that a person vouched for it.

**Admit.** Kyverno is the policy engine, and the cluster admits only signed images. An image built on a laptop and pushed by hand does not run. That is not because someone noticed. It is because the admission webhook rejected it.

**Policy as a package.** Supply-chain rules ship as the `security/adhar-supply-chain-policies` package. It runs in audit mode by default and in enforce mode in the production profile. That is the audit-before-enforce sequence written as configuration. A local or evaluation cluster reports what would have been blocked. The production profile turns the same rules into refusals. You see the violation list before it becomes an outage.

**Reconciliation, so the road reasserts itself.** ArgoCD continuously reconciles the cluster from the in-cluster Gitea, with self-heal enabled. Reconciling means it keeps restoring what Git declares. So a `kubectl edit` against a managed object is reverted within about a minute.

This is the strongest form of property-not-gate. The cluster does not ask anyone to avoid manual changes. It does not detect them later for a report. It keeps restoring the declared state. Drift is not an incident to investigate; it is a condition the system removes.

As a result, there is no supported way to put something into a managed Adhar cluster that the road has not seen. Changing what runs means changing what is in Git. That means going through the pipeline, so the guarantees above apply by design.

One thing Adhar does not claim: there is no SPIFFE/SPIRE workload identity. Identity comes from Keycloak (OIDC) at the application layer. Secrets come from OpenBao with External Secrets. If your threat model needs cryptographic workload attestation between services, that is a gap you must close yourself, not a property to assume.

## See also

- [Golden Paths](/docs/platform-engineering/golden-paths) — the supported route this road carries
- [Security Best Practices](/docs/security/security-best-practices) — the concrete policy and hardening surface
- [Production](/docs/operations/production) — the production profile and what it enables
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — DORA metrics and service scorecards
