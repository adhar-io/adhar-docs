---
title: "The Paved Road to Production"
section: "Platform Engineering"
order: 4
path: "/docs/platform-engineering/paved-road"
---

# The Paved Road to Production

The paved road is the path from a commit to a running production workload, built so that **the safety properties are features of the road itself rather than gates staffed by people**. A review checklist that depends on someone remembering to apply it is not a control; it is a hope with a document attached.

This page is about machinery. Its neighbour, [Golden Paths](/docs/platform-engineering/golden-paths), is about the offer a platform team makes to a product team — the supported, opinionated route they choose. The road is what that route runs on. A team can be on a golden path or off it; either way, if their code reaches production it travels the road, and the road's guarantees hold regardless of which path brought the commit.

## At a glance

| | |
|---|---|
| **What it is** | The commit-to-production pipeline, with guarantees built into each stage |
| **Core principle** | Guardrails are properties of the road, not checkpoints with humans at them |
| **What it guarantees** | Provenance, scanning, signing, admission, reversible rollout, telemetry |
| **What it does not do** | Decide what you build, or forbid leaving the road |
| **Progression** | Audit first, enforce once the audit data is clean — never enforce on day one |
| **Relation to golden paths** | The [path](/docs/platform-engineering/golden-paths) is the route offered; the road is the pipeline it runs on |

## Where the metaphor comes from

"Paved road" has been used at Netflix for years to describe the supported, well-trodden route through internal tooling, and appears in Thoughtworks writing about delivery platforms in the same sense. The metaphor is honest about choice: a paved road does not forbid driving across the field. It makes the road faster, smoother and better lit, so most traffic chooses it — and so that when someone does go off-road, everyone including them knows it.

The important part is the second half. A road is not a fence.

## Guardrails are properties, not gates

There are two ways to make a policy hold. You can put a person in the path of the change, or you can build the property into the system so that violating it is not an available action.

| | Gate | Property of the road |
|---|---|---|
| **Mechanism** | A human reviews and approves | The pipeline or the cluster refuses |
| **Fails** | Open — under deadline pressure, the check is skipped | Closed — the deploy does not happen |
| **Scales** | With headcount | With CPU |
| **Evidence** | A ticket saying someone looked | A signature, a digest, an admission record |
| **Cost to developer** | Waiting, usually unpredictably | Nothing, until the rule is actually violated |
| **Honest about drift** | No — the artifact can change after approval | Yes — the check runs on the artifact being deployed |

Gates are not useless. Human review is the right mechanism for judgement — is this the right change, is this design sound. It is the wrong mechanism for anything mechanically checkable. "Did someone remember to scan the image" is mechanically checkable, so a person asked to confirm it adds latency and subtracts reliability.

The practical test: if the control still holds when everyone involved is tired, distracted and shipping a hotfix at 23:00, it is a property. If it does not, it is a gate wearing a policy's clothes.

## The road, stage by stage

Each stage exists because it adds a guarantee the next stage can rely on. The value is cumulative: by the time a workload is admitted, the cluster can state where the image came from, what was in it, who built it, and that nothing has altered it since.

```diagram
paved-road
```

Two details are often missed.

**The unit that moves along the road is a digest, not a tag.** Tags are mutable; `app:v1.4.2` can point at a different image tomorrow. Signing and admitting by digest makes a statement about a specific set of bytes; admitting by tag makes a statement about a label.

**Promotion should move the artifact, not rebuild it.** If staging and production each build from source, they test different bytes, and every guarantee earned in staging is a guess about production. Build once, promote the digest, change only configuration.

## Why "shift left" fails, and when it works

Shift left is a good idea with a bad implementation record. The failure mode is turning a platform responsibility into developer homework: seven new scanners, a policy language to learn, a compliance spreadsheet, and a linter that fails the build on Friday afternoon with an error nobody can act on. Security moved left, the work moved left with it, and nothing got safer — because the people now holding the work have less context and no time.

It works when shifting left means **the safe thing is the default thing** — what happens when a developer does nothing special:

- Base images are chosen and patched by the platform, so the default container is already current.
- Secrets are injected from a secrets manager by the standard deployment shape, so writing a secret into a manifest is the awkward route rather than the convenient one.
- Network policy, resource limits and non-root execution come from the template and the admission layer, so the default workload is already constrained.
- Telemetry is on by default, so instrumenting subtracts work rather than adding it.

The distinguishing question: did your shift-left programme add steps to a developer's day, or remove them while improving the outcome? The first erodes. The second holds.

## Audit before enforce

Every policy engine has at least two modes: report violations, or reject them. The sequencing matters more than the policy.

| Mode | What it does | What it is for |
|---|---|---|
| **Audit** | Records violations, allows the resource | Discovering what your fleet actually looks like, and sizing the migration |
| **Enforce** | Rejects the resource | Making the guarantee real, once the violation count is near zero |

Starting at enforce is the most common way to lose the organisation's consent. The first enforced policy on a brownfield estate blocks a deploy nobody expected it to block, usually during an incident, and the lasting result is not a safer fleet — it is a culture that treats the platform as an obstacle, plus a standing exemption that never expires.

The sequence that works:

1. **Ship the policy in audit mode** and leave it there long enough to see a representative sample of deploys.
2. **Publish the violation list per team**, with the fix, not as a scoreboard.
3. **Fix the common cases in the golden path**, so most teams become compliant by upgrading rather than by editing.
4. **Enforce for new workloads first**, grandfathering existing ones with a deadline, so nothing running breaks on the day of the switch.
5. **Enforce everywhere**, with the exception process already built and documented — not invented during the first outage.

The audit period is also your evidence that the policy is correct: a rule that would have blocked a long list of legitimate deploys is a bad rule, and you would rather learn that from a report than from a sev-1.

## Exceptions, or people route around the road

Some workload will have a legitimate reason to violate a rule — a vendor image you cannot rebuild, a legacy service needing a privileged mount, a latency path that cannot take the sidecar. With no sanctioned way to handle that, one of two things happens, and both are worse than an exception: the team gets a blanket waiver that quietly covers everything they ever deploy, or they build a parallel environment outside the road, where none of your guarantees apply and you cannot see them.

A workable exception process has four properties:

- **Scoped.** To a namespace, a workload, a specific rule — never "this team is exempt."
- **Expiring.** An exception with no date is a policy change made by whoever asked loudest.
- **Visible.** Readable by a security engineer without filing a request. The exception register describes your real risk more accurately than the policy set does.
- **Cheap to request, expensive to renew.** The friction belongs at renewal, where the conversation about fixing the underlying problem can happen.

> An exception register that is empty does not mean you have no exceptions. It means they are happening somewhere you cannot see.

## How Adhar does this

Adhar implements the road as an in-cluster supply chain, with the enforcement point at admission rather than at a review step.

**Build and sign.** Tekton pipelines build source with Cloud Native Buildpacks, making the base image and its patching a platform concern rather than a per-repository `Dockerfile`. Trivy scans the result, Cosign signs it, Harbor stores it. The signature is produced by the pipeline, which is what makes the later admission check meaningful — it attests that this digest came out of that build, not that a person vouched for it.

**Admit.** Kyverno is the policy engine, and the cluster admits only signed images. An image built on a laptop and pushed by hand does not run — not because someone noticed, but because the admission webhook rejected it.

**Policy as a package.** Supply-chain rules ship as the `security/adhar-supply-chain-policies` package, audit-enabled by default and enforce-enabled in the production profile. That is the audit-before-enforce progression expressed as configuration: a local or evaluation cluster reports what would have been blocked, and the production profile turns the same rules into refusals. You see the violation list before it becomes an outage.

**Reconciliation, so the road reasserts itself.** ArgoCD reconciles continuously from the in-cluster Gitea with self-heal enabled, so a `kubectl edit` against a managed object is reverted within about a minute. This is the strongest available form of property-not-gate: the cluster is neither asking anyone to refrain from manual changes nor detecting them afterwards for a report — it is continuously restoring the declared state. Drift is not an incident to investigate; it is a condition the system removes.

The consequence is that there is no supported way to put something into a managed Adhar cluster that the road has not seen. Changing what runs means changing what is in Git, which means travelling the pipeline, which means the guarantees above apply by construction.

One thing Adhar does not claim: there is no SPIFFE/SPIRE workload identity. Identity comes from Keycloak (OIDC) at the application layer and secrets from OpenBao with External Secrets. If your threat model requires cryptographic workload attestation between services, that is a gap to close yourself, not a property to assume.

## See also

- [Golden Paths](/docs/platform-engineering/golden-paths) — the supported route this road carries
- [Security Best Practices](/docs/security/security-best-practices) — the concrete policy and hardening surface
- [Production](/docs/operations/production) — the production profile and what it enables
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — DORA metrics and service scorecards
