---
title: "The Paved Road to Production"
section: "Platform Engineering"
order: 4
path: "/docs/platform-engineering/paved-road"
---

# The Paved Road to Production

The *paved road* is the path from a commit to a running production workload, built so that **the safety checks are part of the road, not gates staffed by people**. A checklist that relies on someone remembering it is not a control.

This page explains the principle, the stages, and how to introduce policy without breaking teams. Then it shows the road Adhar builds.

A [golden path](/docs/platform-engineering/golden-paths) is the route a team chooses. The road is the pipeline every route runs on. A team can leave a golden path; if its code reaches production, it still travels the road.

## How it works

Each stage adds a guarantee the next stage relies on. By the time a workload is admitted, the cluster can say where the image came from, what is in it, who built it, and that nothing has changed it since.

```diagram
paved-road
```

Two details are often missed:

- **A digest moves along the road, not a tag.** A *digest* is a hash of exact image contents. A tag such as `app:v1.4.2` can point at a different image tomorrow. Sign and admit by digest.
- **Promotion moves the artifact; it does not rebuild it.** If staging and production each build from source, they test different bytes. Build once, promote the digest, and change only configuration.

A road is not a fence. It does not forbid driving across the field. It makes the road faster and better lit, so most traffic chooses it — and when someone goes off-road, everyone knows.

## Guardrails are properties, not gates

You can make a policy hold in two ways: put a person in the path of the change, or build the rule into the system so that breaking it is not an available action.

| | Gate | Property of the road |
|---|---|---|
| **Mechanism** | A human reviews and approves | The pipeline or the cluster refuses |
| **Fails** | Open — under deadline pressure the check is skipped | Closed — the deploy does not happen |
| **Scales with** | Headcount | CPU |
| **Evidence** | A ticket saying someone looked | A signature, a digest, an admission record |
| **Cost to the developer** | Waiting | Nothing, until the rule is broken |
| **Honest about drift** | No — the artifact can change after approval | Yes — the check runs on the artifact being deployed |

Human review is the right tool for judgement: is this the right change, is this design sound? It is the wrong tool for anything a machine can check.

> **Tip:** Imagine everyone involved is tired and shipping a hotfix late at night. If the control still holds, it is a property. If not, it is a gate dressed up as a policy.

## Shift left by changing the default

"Shift left" means moving checks earlier. It fails when a platform responsibility becomes developer homework: new scanners, a policy language to learn, a linter failing the build with an error nobody can act on.

It works when **the safe thing is what happens when a developer does nothing special**:

- The platform chooses and patches base images.
- The standard deployment shape injects secrets from a secrets manager, so writing a secret into a manifest is the awkward route.
- Network policy, resource limits and non-root execution come from the template and the admission layer.
- Telemetry is on by default.

The test: did the programme add steps to a developer's day, or remove them?

## Audit before enforce

A policy engine can report violations or reject them. The order matters more than the policy.

| Mode | What it does | What it is for |
|---|---|---|
| **Audit** | Records violations, allows the resource | Learning what your fleet looks like and sizing the migration |
| **Enforce** | Rejects the resource | Making the guarantee real, once violations are near zero |

Enforcing first blocks a deploy nobody expected, usually during an incident. The lasting result is a team that sees the platform as an obstacle, plus a standing exemption.

Roll a policy out in this order:

1. **Ship it in audit mode** and leave it until you have seen a representative sample of deploys.
2. **Publish the violations per team**, with the fix. Not as a scoreboard.
3. **Fix the common cases in the golden path**, so most teams comply by upgrading.
4. **Enforce for new workloads first.** Give existing ones a deadline.
5. **Enforce everywhere**, with the exception process already documented.

The audit period also tests the rule. One that would have blocked a long list of legitimate deploys is a bad rule, and a report is the cheap place to learn that.

## Exceptions

Some workload will have a legitimate reason to break a rule: a vendor image you cannot rebuild, a legacy service that needs a privileged mount. Without an approved route, the team gets a blanket waiver or builds a parallel environment you cannot see.

A workable exception is:

| Property | Meaning |
|---|---|
| **Scoped** | Limited to a namespace, a workload or one rule — never "this team is exempt" |
| **Expiring** | An exception with no end date is a policy change made by whoever asked loudest |
| **Visible** | A security engineer can read it without filing a request |
| **Cheap to request, expensive to renew** | Renewal is where you discuss fixing the underlying problem |

> **Note:** An empty exception register does not mean you have no exceptions. It means they are happening somewhere you cannot see.

## How Adhar does this

Adhar builds the road as a supply chain inside the cluster. The enforcement point is admission, not a review step.

```diagram
npe-adhar-road
```

| Stage | Adhar component | What it does |
|---|---|---|
| Build | Tekton `app-ci` with Cloud Native Buildpacks | A Gitea webhook starts the pipeline on every push. Buildpacks make the base image and its patching a platform concern |
| Scan | Tests, gitleaks, Trivy, Syft | Scans the source and the image and produces an SBOM |
| Sign and store | Cosign, Harbor | The pipeline signs the digest and pushes it to Harbor. The signature shows that this digest came out of that build, not that a person vouched for it |
| Admit | Kyverno | Verifies the signature at admission — see the two layers below |
| Roll out | Argo CD, Argo Rollouts | Argo CD syncs the change from Git; a rollout can shift traffic in steps |
| Promote | Kargo | Promotes the same artifact between environments. Production waits for approval, and every promotion is a Git commit — see [Promote Across Environments](/docs/guides/promote-across-environments) |
| Observe | Prometheus and Grafana; Loki, Tempo and Mimir in the production profile | Telemetry without per-service setup — see [Observability](/docs/operations/observability) |

### Admission in two layers

| Layer | Profile | Package | What it enforces |
|---|---|---|---|
| Signature check | Every profile | `adhar-supply-chain` (policy `verify-supply-chain-images`) | Enforce mode for images from Harbor's `library/*` project in workload namespaces. An unsigned image pushed there by hand does not run. Images from upstream registries are not matched |
| Supply-chain packs | Production only | `security/adhar-supply-chain-policies` | A registry allowlist, no `:latest` tags, and signature checks for workload namespaces. Both the audit pack and the enforce pack are on in production; both are off locally |

How tightly the road is closed depends on the layers you turn on. The registry allowlist, for example, is production-only.

### Audit before enforce, as configuration

The supply-chain rules ship twice: an audit pack and an enforce pack with identical policies.

```diagram
npe-audit-then-enforce
```

1. Turn on the audit pack.
2. Read its PolicyReports.
3. Fix what they show.
4. Turn on the enforce pack.

Adhar's Pod Security Standards policies (`adhar-kyverno-policies`) work the same way: they ship in Audit mode for you to promote. Opt-in CIS- and SOC2-oriented packs also ship in Audit mode.

```bash
adhar stack list                 # which packs your profile enables, and their live state
adhar compliance --failures-only # failing policy results across the cluster
```

### Reconciliation: the road reasserts itself

Argo CD continuously reconciles the platform from the in-cluster Gitea, with self-heal on. A `kubectl edit` on a managed object is put back.

The cluster does not ask anyone to avoid manual changes, and it does not report them later. It restores the declared state. So changing what Argo CD runs means changing Git, and that route goes through the pipeline.

### What Adhar does not provide

There is no SPIFFE/SPIRE workload identity. Identity comes from Keycloak (OIDC) at the application layer, and secrets from OpenBao with External Secrets. If your threat model needs cryptographic workload attestation between services, close that gap yourself.

## Next steps

- [Golden Paths](/docs/platform-engineering/golden-paths) — the supported route this road carries.
- [Security Best Practices](/docs/security/security-best-practices) — the policy and hardening surface.
- [Production](/docs/operations/production) — the production profile and what it enables.
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — DORA metrics and service scorecards.
