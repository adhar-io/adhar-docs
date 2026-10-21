---
title: "AI agents on your platform, without a back door"
excerpt: "How Adhar lets AI agents investigate and propose changes through one governed endpoint and Git pull requests, with a staged-autonomy ceiling that lives in Git."
category: "AI/ML"
author: "Adhar Team"
date: "2026-10-16"
featured: false
tags: ["AI", "Agents", "MCP", "GitOps", "Governance"]
---

Most teams now have someone who wants to point an AI agent at a cluster. The agent reads logs, spots the crash loop and suggests a fix. That part is genuinely useful. The trouble starts with how the agent gets in.

The quick route is a kubeconfig with broad rights, a vendor API key on someone's laptop, and a tool that can run `kubectl apply`. That route works. It is also a back door. It bypasses the review, policy and audit trail that every human change goes through.

Adhar takes a different route. An agent on the platform is a contributor and an investigator, not a root shell. It reads through RBAC-scoped tools, it reaches models through one governed endpoint, and its changes arrive as pull requests that a person merges. This post explains how that works, and why each piece is there.

## Why ungoverned agents are risky

An agent is a program that chooses its next action based on text. Some of that text comes from places you do not control: log lines, issue descriptions, documentation, tool output. If the agent holds write access, any of that text can steer it towards a write.

The risks are concrete:

- **Unreviewed change.** A direct `apply` skips code review, CI and the GitOps record. Nobody can say later why the cluster looks the way it does.
- **Scattered credentials.** Each developer's tool holds its own provider key. You cannot rotate them centrally or see what they cost.
- **No attribution.** When something changes, the audit log shows a service account, not the person who asked.
- **No budget.** A loop that retries a large prompt can spend real money before anyone notices.

None of these is specific to AI. They are the same problems you would have if you handed a new hire cluster-admin on day one. The fix is also the same: give the agent the access a contributor has, and no more.

## One governed endpoint: agentgateway

Every model call and every tool call on Adhar goes through `agentgateway`, the platform's AI data plane. It is one endpoint for three kinds of traffic:

- **LLM completions.** Callers send an OpenAI-shaped request. The gateway picks a provider by model name: `claude-*` goes to Anthropic, `gpt-*` to OpenAI, and `local/*` to in-cluster inference.
- **Federated MCP tools.** The platform's per-domain MCP servers (cluster, GitOps, provisioning, observability, security, cost, catalogue and delivery) are exposed outwards as one endpoint, `https://mcp.<host>/mcp`. External agents such as IDE assistants use the same governed tools with one URL and one token.
- **A2A.** Agent-to-agent traffic goes through the same gateway.

The gateway applies the same controls to all of it:

| Control | What it does |
|---|---|
| JWT and RBAC | Validates the Keycloak token once, then authorises per tool. Read tools need `platform-developer`; tools that open pull requests need `platform-admin` |
| Prompt guardrails | Checks requests for secrets and personal data. The shipped posture is permissive: secrets are masked and PII is audited, so you see the behaviour before you enforce it |
| Token budgets | Rejects requests over the token and request budgets with a 429 |
| OpenTelemetry traces | Every LLM call and MCP tool call becomes a span in the platform's Tempo, with model, provider and token counts as attributes |

The provider key lives in one place. It sits in OpenBao and External Secrets projects it to the gateway. The gateway reads it server-side and never returns it to a caller. So a laptop running `adhar ai` never holds a credential. OpenBao's developer and viewer policies also carry an explicit deny on the `adhar-ai/*` path, so people cannot read or overwrite the key either.

## Changes arrive as pull requests

The `adhar-ai` package runs the agent runtime and the MCP servers. Its service account has a read-only ClusterRole: get, list and watch. With its own identity, the agent cannot change cluster state at all.

When the agent decides a change is warranted, it uses a write tool. Write tools open Gitea pull requests, and nothing else. There is no `kubectl apply`, Argo CD sync or cloud-mutation tool anywhere. The pull request is authored by a commit-only bot identity, `adhar-ai-bot`, and then follows the normal path: review, CI, a human merge, and ArgoCD reconciliation.

Two more controls sit behind that:

- **A write allow-list.** The runtime's `writePolicy` limits which repositories and path prefixes a proposal may touch. The shipped values are the `packages` and `environments` repositories.
- **A policy backstop.** The `adhar-ai-guardrails` Kyverno ClusterPolicy, in Audit mode, flags any AI-originated resource that skips the pull-request path.

The result is that the agent's authority is exactly a contributor's. If you would not merge a change from a colleague without reading it, you do not have to merge one from the agent either.

## The autonomy ladder

Not every task needs the same freedom. Adhar defines a staged-autonomy ladder with four rungs. Each rung differs from the one below in a way you can observe.

| Rung | What the agent may do |
|---|---|
| `read-only` | Write tools are not offered at all, and are refused if called anyway |
| `suggest` | Write tools are allowed, but the first proposal ends the run. A human reads one proposal, not a chain |
| `approve-to-apply` | The run continues after a proposal, so the agent can check its own work. A human still merges every change |
| `scoped` | Runs unattended, so it is confined to the narrower `writePolicy.scoped` allow-list. That list is empty by default, so this rung permits no write until an operator fills it in |

The global default is `suggest`.

### The ceiling lives in Git

The ladder is configured in the `adhar-ai-config` ConfigMap in `adhar-system`. That ConfigMap ships with the package, so ArgoCD reconciles it from the platform's Git repository. Raising the ceiling is a reviewed commit, not a runtime toggle.

```yaml
autonomy:
  default: suggest
limits:
  maxSteps: 12
  maxToolCallsPerOp: 40
writePolicy:
  allowedRepos: [packages, environments]
  allowedPathPrefixes:
    - "packages/"
    - "environments/"
  scoped:
    allowedRepos: []        # empty on purpose: `scoped` may write nothing yet
    allowedPathPrefixes: []
```

Authority only ever narrows. The ConfigMap sets the ceiling. A request may ask for less. The `--autonomy` flag on the CLI can lower the level for one run but cannot raise it:

```bash
adhar ai autonomy                       # show the ceiling and where it came from
adhar ai agent "is anything about to run out of disk?" --autonomy read-only
```

The event-driven operators follow the same rule. Each one declares its own tools and autonomy level in the same ConfigMap, and the shipped operators never go above `suggest`. `drift-explain`, for example, is read-only.

## K8sGPT: explanations for unhealthy objects

The `k8sgpt` package runs the k8sgpt-operator. It scans the cluster on an interval and explains each unhealthy object it finds: pods, Services that select nothing, PVCs stuck in Pending, unattached HTTPRoutes and more. It writes one `Result` object per finding.

Its model calls go through agentgateway like everyone else's. It authenticates with its own service account token, so every explanation is governed, budgeted and attributed. Adhar AI reads the Results and attributes k8sgpt's explanations to k8sgpt, never to itself. You can read them directly too:

```bash
kubectl -n adhar-system get results.core.k8sgpt.ai
```

## The `adhar ai` commands

The `adhar ai` command group is the developer's way in. It talks to the cluster's AI data plane, so it uses the platform's key, budget and audit trail.

```bash
adhar auth login alice                    # the data plane needs a platform token
adhar ai key set --provider anthropic     # prompted, never echoed
adhar ai status                           # what is installed, keyed and reachable
adhar ai models                           # what --model may be set to
adhar ai ask "why is keycloak not ready?"
adhar ai chat                             # interactive
adhar ai diagnose keycloak                # agentic triage: pods, logs, events
adhar ai explain deployment/adhar-console
adhar ai tools && adhar ai budget
adhar ai mcp list
```

`adhar ai agent` runs a tool-calling loop locally, over read-only platform tools, using your own kubeconfig. The agent can never see more than you can, and Secret values are redacted. Every tool call is printed as it happens, so you can follow the reasoning. Where a fix is warranted, its one write tool, `propose_change`, records a proposal for you to read. Nothing is pushed and nothing is applied.

Agentic commands also take `--max-steps`, `--quiet`, `--mcp` and `--yes`. The step budget cannot exceed the platform's limit.

## Bring your own model, or run one

You choose where completions go. `adhar ai key set` accepts `anthropic` (the default), `openai`, `openrouter`, or `local`, which needs no key at all.

For self-hosted inference, two packages serve `local/*` models behind the gateway:

- **`vllm`** serves an OpenAI-compatible endpoint, with a CPU profile for development and a GPU profile for real serving.
- **`llm-d`** puts an endpoint-picker router in front of vLLM model servers. Both its CPU and GPU profiles answer to `local/default`.

When a hosted provider is the primary, `adhar-ai` names `local/default` as its secondary model. If the primary fails, the agent can fall back to in-cluster inference. Because model names route at the gateway, switching is a matter of naming a different model:

```bash
adhar ai ask "summarise the platform" --model local/default
```

## Where it runs, and how mature it is

The AI layer is on in the production profile and off in the local profile. On a laptop the platform runs without it. The packages are not marked safe for a single Kind node by default, and vLLM in particular needs headroom you have to free first. To try it locally, enable the gateway and the agent together, since each depends on the other:

```bash
adhar stack enable adhar-ai agentgateway
```

The platform also degrades gracefully. If `adhar-ai` is installed but has no key, the agent stays read-only and nothing else is affected. No other package depends on it.

Be clear-eyed about maturity. Adhar is v0.1.x and in active development, and the AI packages carry their own stability labels:

| Package | Stability |
|---|---|
| `adhar-ai` | alpha |
| `agentgateway` | alpha |
| `k8sgpt` | beta |
| `llm-d` | beta |
| `vllm` | alpha |

Treat alpha as "works, and will change". Start at `read-only` or `suggest`, read the traces, and raise the ceiling in Git only when you trust what you see.

## Try it

- Run `adhar stack describe adhar-ai` to see the package's contract, dependencies and live state.
- Read the AI layer commands and flags in the [CLI Reference](/docs/reference/cli).
- See how packages, profiles and dependencies fit together in [Platform Services](/docs/core-concepts/platform-services) and [Customization](/docs/operations/customization).
- Learn where the provider key lives in [Manage Secrets](/docs/guides/manage-secrets).
- New to Adhar? Start with the [Quick Start](/docs/getting-started/quick-start).
