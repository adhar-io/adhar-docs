import React from "react";
import { Link } from "@tanstack/react-router";
import { Brain, ShieldCheck, GitPullRequest, Stethoscope, MessageCircle, Cpu, Power, ArrowRight } from "lucide-react";
import { btnPrimary } from "./styles";
import SectionHeader from "./SectionHeader";

// Everything here reflects what ships in platform/stack/packages/ai/*.
// Keep the alpha/beta labels in step with each package's adhar-package.yaml.

const pillars = [
  {
    icon: ShieldCheck,
    title: "One governed endpoint",
    description:
      "agentgateway fronts every model call, MCP tool and agent-to-agent request — with JWT auth, RBAC, prompt guardrails, token budgets and OpenTelemetry traces.",
  },
  {
    icon: GitPullRequest,
    title: "Changes arrive as pull requests",
    description:
      "When an agent wants to change something, it opens a pull request in Gitea. A person reviews and merges it, and ArgoCD applies it like any other change.",
  },
  {
    icon: Stethoscope,
    title: "Explains what's broken",
    description:
      "K8sGPT scans the cluster on a schedule and writes a plain-English explanation for each unhealthy object, so you start from a cause instead of a stack trace.",
  },
];

// The autonomy ladder. The ceiling lives in Git (ConfigMap adhar-ai-config),
// so raising it is a reviewed change; --autonomy can only lower it.
const autonomy = [
  { value: "Read-only", label: "Looks, never touches" },
  { value: "Suggest", label: "Stops at a proposal" },
  { value: "Approve", label: "A person merges each change" },
  { value: "Scoped", label: "Unattended, allow-list only" },
];

const capabilities = [
  {
    icon: MessageCircle,
    title: "Ask about your platform",
    description:
      "`adhar ai ask` and `adhar ai chat` answer questions with live cluster context — \"why is Keycloak not ready?\" — from your terminal.",
  },
  {
    icon: Brain,
    title: "Diagnose a failing service",
    description:
      "`adhar ai diagnose` walks a package's pods, events and logs and tells you what it found. `adhar ai explain` does the same for a single object.",
  },
  {
    icon: Cpu,
    title: "Your model, or your own GPUs",
    description:
      "Bring a hosted model with your own API key, or serve open models in-cluster with vLLM or llm-d so prompts never leave your network.",
  },
  {
    icon: Power,
    title: "Enabled per profile",
    description:
      "The AI layer is on in the production profile and off locally. Each package is labelled alpha or beta, so you know how mature it is.",
  },
];

/** Render `backticked` spans as inline code. */
const withCode = (text: string) =>
  text.split(/`([^`]+)`/).map((part, i) =>
    i % 2 ? (
      <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
        {part}
      </code>
    ) : (
      part
    ),
  );

const FluentAISection = () => {
  return (
    <section id="adhar-ai" aria-labelledby="adhar-ai-heading" className="relative section-padding container-padding bg-muted/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-width-content">
        <SectionHeader id="adhar-ai-heading" eyebrow="Adhar AI" title="AI that works through" titleMuted="your existing guardrails.">
          Agents read your platform, explain failures and propose fixes. They don't get a back door: every call goes through one gateway, and every change goes through Git review.
        </SectionHeader>

        {/* Feature card */}
        <div className="mb-12">
          <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
            <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
            <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
            <div className="relative px-6 py-12 sm:px-10 sm:py-14">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] shrink-0">
                  <ShieldCheck className="w-6 h-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    Governed by design
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    The same identity, policy and review your team already uses.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50">
                {pillars.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="bg-card/80 backdrop-blur-sm p-5">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] mb-3">
                        <Icon className="w-4 h-4" aria-hidden />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground tracking-tight">{item.title}</h4>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Autonomy ladder */}
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Autonomy ladder — you choose the ceiling
                </p>
                <ol className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50">
                  {autonomy.map((m, i) => (
                    <li key={m.value} className="bg-card/80 backdrop-blur-sm px-5 py-5">
                      <div className="text-[11px] font-mono text-muted-foreground tabular">Level {i + 1}</div>
                      <div className="mt-1 text-xl font-semibold text-foreground tracking-tight">{m.value}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{m.label}</div>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  The ceiling is set in Git, so raising it is a reviewed change. A single run can lower it, never raise it.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities grid */}
        <div className="grid sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 mb-10">
          {capabilities.map((capability) => {
            const Icon = capability.icon;
            return (
              <article key={capability.title} className="bg-card p-7 sm:p-8 transition-colors hover:bg-muted/30">
                <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-foreground tracking-tight">{capability.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{withCode(capability.description)}</p>
              </article>
            );
          })}
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-border/70 bg-card p-8 sm:p-10 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] mx-auto mb-5">
            <Brain className="w-6 h-6" aria-hidden />
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            Try it from your terminal.
          </h3>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Set a model key with <code className="font-mono text-foreground">adhar ai key set</code>, check{" "}
            <code className="font-mono text-foreground">adhar ai status</code>, then ask your platform a question.
          </p>
          <div className="mt-7">
            <Link
              to="/docs/$" params={{ _splat: "reference/cli" }}
              className={btnPrimary}
            >
              <span>See the adhar ai commands</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FluentAISection;
