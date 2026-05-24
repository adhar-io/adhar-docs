import { useState, useEffect } from "react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import {
  Bot,
  Code,
  GitBranch,
  Monitor,
  Shield,
  Users,
  Gauge,
  Zap,
  Cloud,
  Database,
  Workflow,
  Boxes,
  Terminal,
  Settings,
  ArrowRight,
  Check,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ADHAR_CONSOLE_LOGIN_URL } from "@/lib/config";

interface Capability {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  metrics: { value: string; label: string }[];
}

const capabilities: Capability[] = [
  {
    icon: Bot,
    title: "AI-powered code generation",
    description: "Generate, refactor, and explain code with context-aware models trained on production stacks.",
    features: [
      "Natural language to working code",
      "Context-aware suggestions across files",
      "Automated refactoring and optimization",
      "50+ languages and frameworks supported",
      "Smart error detection and one-click fixes",
    ],
    metrics: [
      { value: "70%", label: "faster development" },
      { value: "90%", label: "code accuracy" },
      { value: "50+", label: "languages" },
    ],
  },
  {
    icon: Code,
    title: "Automated testing & QA",
    description: "Auto-generated unit, integration, and end-to-end tests with continuous quality monitoring.",
    features: [
      "Auto-generated unit and integration tests",
      "Continuous quality monitoring",
      "Code coverage analysis",
      "Performance benchmarking",
      "Security vulnerability scanning",
    ],
    metrics: [
      { value: "95%", label: "test coverage" },
      { value: "80%", label: "fewer bugs" },
      { value: "60%", label: "faster QA cycles" },
    ],
  },
  {
    icon: GitBranch,
    title: "Intelligent deployment",
    description: "Zero-downtime CI/CD with canary, blue/green, and automatic rollback on regression.",
    features: [
      "Zero-downtime deployments",
      "Automated rollback mechanisms",
      "Multi-environment management",
      "Canary and blue-green strategies",
      "Infrastructure as Code integration",
    ],
    metrics: [
      { value: "99.9%", label: "uptime" },
      { value: "5×", label: "faster deploys" },
      { value: "0", label: "failed deploys" },
    ],
  },
  {
    icon: Monitor,
    title: "Real-time observability",
    description: "Metrics, traces, and logs unified — with AI-driven correlation and incident detection.",
    features: [
      "Real-time performance metrics",
      "Distributed tracing",
      "Log aggregation and analysis",
      "Alerting and incident management",
      "Predictive failure detection",
    ],
    metrics: [
      { value: "100%", label: "visibility" },
      { value: "90%", label: "faster MTTR" },
      { value: "24/7", label: "monitoring" },
    ],
  },
  {
    icon: Shield,
    title: "Security & compliance",
    description: "Built-in scanning, secrets management, and audit-ready reporting for SOC 2, GDPR, and HIPAA.",
    features: [
      "Automated security scanning",
      "Compliance reporting (SOC 2, GDPR, HIPAA)",
      "Secrets and credentials management",
      "Access control and audit trails",
      "Threat detection and response",
    ],
    metrics: [
      { value: "100%", label: "compliance" },
      { value: "0", label: "incidents" },
      { value: "24/7", label: "threat monitoring" },
    ],
  },
  {
    icon: Users,
    title: "Team collaboration",
    description: "Role-based access, automated reviews, and productivity analytics for engineering at scale.",
    features: [
      "Role-based access control",
      "Automated code reviews",
      "Team productivity analytics",
      "Knowledge sharing platforms",
      "Workflow automation",
    ],
    metrics: [
      { value: "3×", label: "productivity" },
      { value: "50%", label: "faster onboarding" },
      { value: "100%", label: "review coverage" },
    ],
  },
];

const useCases = [
  {
    icon: Cloud,
    title: "Platform engineering",
    description: "Replace months of platform work with a single command. Self-service guardrails for every team.",
    audience: "Platform teams",
  },
  {
    icon: Workflow,
    title: "Application teams",
    description: "Ship features with confidence. CI/CD, environments, and observability already wired up.",
    audience: "Product engineers",
  },
  {
    icon: Database,
    title: "Data & ML teams",
    description: "Reproducible pipelines, dataset versioning, and managed inference — without a separate stack.",
    audience: "Data & ML engineers",
  },
  {
    icon: Shield,
    title: "Security teams",
    description: "Policy as code, audit trails, and continuous scanning. Approve frameworks, not tickets.",
    audience: "Security & compliance",
  },
];

const builders = [
  { icon: Terminal, title: "CLI-first", description: "Everything scriptable from your terminal — no clicking through wizards." },
  { icon: Boxes, title: "Composable", description: "Mix services to fit your architecture. Sensible defaults, swappable parts." },
  { icon: Settings, title: "Policy as code", description: "Governance lives in version control alongside your application." },
  { icon: Zap, title: "Fast feedback", description: "Sub-second hot reload locally, fast PR previews in CI." },
];

const techSpecs = [
  {
    icon: Gauge,
    title: "Performance",
    items: [
      "Sub-second API response times",
      "99.99% availability SLA",
      "Auto-scaling for any workload",
      "Global CDN distribution",
      "Real-time collaboration",
    ],
  },
  {
    icon: Shield,
    title: "Security",
    items: [
      "SOC 2 Type II compliant",
      "End-to-end encryption",
      "Role-based access control",
      "Audit logging with 7yr retention",
      "Continuous pen-testing",
    ],
  },
  {
    icon: Users,
    title: "Scale",
    items: [
      "Unlimited team members",
      "Multi-tenancy with isolation",
      "Horizontal scaling per service",
      "Multi-region deployment",
      "Enterprise-grade infra",
    ],
  },
];

const Capabilities = () => {
  const [activeCapability, setActiveCapability] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveCapability((prev) => (prev + 1) % capabilities.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const active = capabilities[activeCapability];
  const ActiveIcon = active.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5"><Zap className="w-3 h-3 mr-1" />Capabilities</span>
            <h1 className="section-heading mt-5 text-foreground">
              An intelligent platform
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">for every step of delivery.</span>
            </h1>
            <p className="section-subheading mt-6">
              ADHAR combines AI-assisted authoring with proven DevOps practices — so teams ship
              with unprecedented velocity, quality, and security.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a href={ADHAR_CONSOLE_LOGIN_URL} className="w-full sm:w-auto">
                <button type="button" className="btn-primary-modern group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium">
                  <span>Get started</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </a>
              <Link to="/architecture" className="w-full sm:w-auto">
                <button type="button" className="btn-secondary-modern w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span>See architecture</span>
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Interactive showcase */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-px overflow-hidden rounded-3xl border border-border/70 bg-border/60">
              {/* List */}
              <div className="bg-card p-4 sm:p-5">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Core capabilities
                </div>
                <ul className="mt-1 space-y-1">
                  {capabilities.map((capability, index) => {
                    const Icon = capability.icon;
                    const isActive = activeCapability === index;
                    return (
                      <li key={index}>
                        <button
                          onClick={() => setActiveCapability(index)}
                          className={`group w-full text-left rounded-xl p-3 transition-colors ${
                            isActive ? 'bg-muted/60' : 'hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                                isActive
                                  ? 'bg-primary/10 text-primary border-primary/30'
                                  : 'bg-background text-muted-foreground border-border/70'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-semibold tracking-tight ${isActive ? 'text-foreground' : 'text-foreground/90'}`}>
                                {capability.title}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                {capability.description}
                              </div>
                            </div>
                            <ArrowRight
                              className={`mt-1 h-4 w-4 transition-all ${
                                isActive ? 'opacity-100 translate-x-0 text-primary' : 'opacity-0 -translate-x-1 text-muted-foreground'
                              }`}
                            />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Detail */}
              <div className="bg-card p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-5">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                    <ActiveIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{active.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{active.description}</p>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50">
                  {active.metrics.map((m, idx) => (
                    <div key={idx} className="bg-card/80 backdrop-blur-sm px-4 py-4">
                      <div className="text-xl font-semibold text-foreground tracking-tight tabular">{m.value}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{m.label}</div>
                    </div>
                  ))}
                </div>

                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">What's included</h3>
                <ul className="space-y-2.5">
                  {active.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary/80" strokeWidth={2.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Built for */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Built for</span>
              <h2 className="section-heading mt-5 text-foreground">
                One platform,
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">every engineering role.</span>
              </h2>
              <p className="section-subheading mt-6">
                Whether you ship a single app or run a platform org of hundreds, ADHAR scales with the way you work.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {useCases.map((uc, idx) => {
                const Icon = uc.icon;
                return (
                  <article key={idx} className="bg-card p-7 sm:p-8 transition-colors hover:bg-muted/30">
                    <div className="flex items-start gap-4">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground tracking-tight">{uc.title}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {uc.audience}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Builder principles */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">How it feels</span>
              <h2 className="section-heading mt-5 text-foreground">
                Designed for
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">the way engineers work.</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {builders.map((b, idx) => {
                const Icon = b.icon;
                return (
                  <article key={idx} className="bg-card p-6 transition-colors hover:bg-muted/30">
                    <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">{b.title}</h3>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{b.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tech specs */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Technical specs</span>
              <h2 className="section-heading mt-5 text-foreground">The numbers.</h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {techSpecs.map((spec, idx) => {
                const Icon = spec.icon;
                return (
                  <article key={idx} className="bg-card p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground tracking-tight">{spec.title}</h3>
                    </div>
                    <ul className="space-y-2 border-t border-border/60 pt-5">
                      {spec.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary/80" strokeWidth={2.5} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Related */}
        <section className="section-padding container-padding">
          <div className="max-width-content">
            <div className="text-center mb-10">
              <span className="eyebrow mb-5">Continue exploring</span>
              <h2 className="section-heading mt-5 text-foreground">Related topics.</h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { to: "/architecture", icon: Boxes, title: "Architecture", description: "Layered, cloud-native architecture and request flow." },
                { to: "/integrations", icon: Workflow, title: "Integrations", description: "Plug into Kubernetes, GitOps, observability, and more." },
                { to: "/security", icon: Shield, title: "Security", description: "Zero-trust networking and audit-grade traceability." },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <Link key={idx} to={card.to} className="group block">
                    <article className="card-interactive p-6 h-full">
                      <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground tracking-tight">{card.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                      <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <span>Learn more</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Capabilities;
