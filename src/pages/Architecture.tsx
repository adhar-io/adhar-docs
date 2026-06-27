import React from 'react';
import { Link } from "@tanstack/react-router";
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import ModernArchitectureDiagram from '@/components/ModernArchitectureDiagram';
import {
  Database,
  Cloud,
  Shield,
  Zap,
  Network,
  Code,
  Layers,
  Monitor,
  Lock,
  Activity,
  Server,
  GitBranch,
  ArrowRight,
  Cpu,
  Workflow,
} from 'lucide-react';

const layers = [
  {
    title: "Interface layer",
    icon: Monitor,
    description: "Web consoles, CLIs, and APIs that the rest of the platform exposes to developers and operators.",
    technologies: ["React", "TypeScript", "Tailwind CSS", "REST APIs", "GraphQL"],
    stats: { latency: "<150ms", surfaces: "Web · CLI · API" },
  },
  {
    title: "Application layer",
    icon: Code,
    description: "Stateless microservices and event-driven workers that implement product logic and orchestration.",
    technologies: ["Node.js", "Python", "Go", "Microservices", "Event streaming"],
    stats: { latency: "<100ms", surfaces: "Stateless · Sharded" },
  },
  {
    title: "Integration layer",
    icon: Network,
    description: "Gateway, message queues, and identity bridges that connect ADHAR to your existing tooling and SaaS.",
    technologies: ["API Gateway", "Message queues", "Webhooks", "OAuth", "SAML"],
    stats: { latency: "<50ms", surfaces: "API · MQ · Webhooks" },
  },
  {
    title: "Data layer",
    icon: Database,
    description: "Polyglot persistence with strong defaults — relational, key-value, search, and analytics-ready storage.",
    technologies: ["PostgreSQL", "Redis", "Elasticsearch", "Data lakes", "ETL pipelines"],
    stats: { latency: "<10ms", surfaces: "OLTP · Cache · Search" },
  },
  {
    title: "Infrastructure layer",
    icon: Cloud,
    description: "Cloud-native runtime with auto-scaling, multi-zone deployment, and consistent runtime across providers.",
    technologies: ["Kubernetes", "Docker", "AWS · GCP · Azure", "Terraform", "CI/CD"],
    stats: { latency: "Elastic", surfaces: "Multi-cloud · Multi-region" },
  },
  {
    title: "Security layer",
    icon: Shield,
    description: "Zero-trust networking, fine-grained policies, encryption everywhere, and audit-grade traceability.",
    technologies: ["Zero trust", "RBAC", "Encryption", "Audit logs", "Compliance"],
    stats: { latency: "Always-on", surfaces: "mTLS · RBAC · OPA" },
  },
];

const principles = [
  { title: "Cloud native", description: "Built for the cloud with containerization and orchestration.", icon: Cloud },
  { title: "Microservices", description: "Modular architecture enabling independent scaling and deployment.", icon: Layers },
  { title: "Event-driven", description: "Asynchronous communication for better performance and reliability.", icon: Zap },
  { title: "API-first", description: "Everything accessible through well-designed APIs.", icon: Network },
  { title: "Security by design", description: "Security integrated at every layer, not bolted on.", icon: Lock },
  { title: "Observable", description: "Comprehensive monitoring, logging, and tracing built in.", icon: Activity },
];

const requestFlow = [
  { icon: Monitor, title: "Edge", description: "TLS termination, WAF, and global routing at the edge." },
  { icon: Network, title: "Gateway", description: "Authn/authz, rate limiting, and request shaping." },
  { icon: Workflow, title: "Service mesh", description: "mTLS, retries, circuit breakers, and traffic splitting." },
  { icon: Cpu, title: "Workload", description: "Stateless service handles the request; emits events." },
  { icon: Database, title: "Data plane", description: "Reads/writes with caching, indexes, and per-tenant isolation." },
  { icon: Activity, title: "Observability", description: "Metrics, traces, and logs are correlated and retained." },
];

const specGroups = [
  {
    title: "Infrastructure",
    icon: Server,
    items: [
      { label: "Compute", value: "Kubernetes · auto-scale · multi-zone · container-native" },
      { label: "Storage", value: "Distributed FS · automated backups · encryption at rest · multi-region" },
      { label: "Networking", value: "Service mesh · mTLS · global LB · private peering" },
      { label: "Runtime", value: "AWS · GCP · Azure · on-prem · air-gapped" },
    ],
  },
  {
    title: "Security",
    icon: Shield,
    items: [
      { label: "Authn", value: "MFA · SSO · OAuth 2.0 · SAML" },
      { label: "Authz", value: "RBAC · ABAC · OPA policies" },
      { label: "Data", value: "End-to-end encryption · KMS-backed · DLP" },
      { label: "Audit", value: "Append-only logs · 7yr retention · SIEM-ready" },
    ],
  },
  {
    title: "Performance",
    icon: Zap,
    items: [
      { label: "API", value: "<100ms p95 · 10k RPS per service" },
      { label: "Page load", value: "<2s p95 globally · CDN-edge cached" },
      { label: "Build", value: "<5 min full pipeline · incremental caching" },
      { label: "Deploy", value: "<10 min canary · <60s rollback" },
    ],
  },
  {
    title: "Compliance",
    icon: Lock,
    items: [
      { label: "Standards", value: "SOC 2 Type II · ISO 27001 · GDPR · HIPAA-ready" },
      { label: "Data residency", value: "US · EU · APAC regions · per-tenant choice" },
      { label: "Governance", value: "DPA · subprocessor list · DSAR · right to be forgotten" },
      { label: "Continuous", value: "Annual pen-tests · quarterly audits · daily scans" },
    ],
  },
];

const Architecture = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5">Architecture</span>
            <h1 className="section-heading mt-5 text-foreground">
              Cloud-native by design,
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">enterprise-ready by default.</span>
            </h1>
            <p className="section-subheading mt-6">
              ADHAR runs on a layered, microservices architecture. Every service is observable,
              every interface is API-first, and every byte is encrypted — from your laptop to production.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a href="#diagram" className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium">
                <span>Explore the diagram</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link to="/security" className="w-full sm:w-auto">
                <button type="button" className="btn-secondary-modern w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span>Security model</span>
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Diagram */}
        <section id="diagram" className="container-padding pb-16">
          <div className="max-width-content">
            <ModernArchitectureDiagram />
          </div>
        </section>

        {/* Layers */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Layers</span>
              <h2 className="section-heading mt-5 text-foreground">
                Six layers,
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">one coherent stack.</span>
              </h2>
              <p className="section-subheading mt-6">
                Each layer has a single responsibility, clean contracts upward and downward, and is independently
                scalable and replaceable.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {layers.map((layer, index) => {
                const Icon = layer.icon;
                return (
                  <article key={index} className="group flex flex-col bg-card p-6 sm:p-7 transition-colors hover:bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground tracking-tight">{layer.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{layer.description}</p>

                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {layer.technologies.map((tech) => (
                        <span key={tech} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                          {tech}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto pt-5 border-t border-border/60 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latency</div>
                        <div className="text-sm font-semibold text-foreground tracking-tight tabular">{layer.stats.latency}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Surfaces</div>
                        <div className="text-sm font-semibold text-foreground tracking-tight">{layer.stats.surfaces}</div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Request flow */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Data flow</span>
              <h2 className="section-heading mt-5 text-foreground">
                One request,
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">six observable hops.</span>
              </h2>
              <p className="section-subheading mt-6">
                Every request flows through the same well-known stages — making performance, security,
                and reliability properties easy to reason about.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {requestFlow.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="relative rounded-xl border border-border/60 bg-background p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground tabular">
                          Step {idx + 1}
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground tracking-tight">{step.title}</h3>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Principles</span>
              <h2 className="section-heading mt-5 text-foreground">
                Decisions we
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">refuse to compromise on.</span>
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {principles.map((p, index) => {
                const Icon = p.icon;
                return (
                  <article key={index} className="bg-card p-7 transition-colors hover:bg-muted/30">
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">{p.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Specs */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Specifications</span>
              <h2 className="section-heading mt-5 text-foreground">Technical specs.</h2>
              <p className="section-subheading mt-5">
                The numbers your security and platform teams want to see.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {specGroups.map((group, gi) => {
                const Icon = group.icon;
                return (
                  <article key={gi} className="bg-card p-6 sm:p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground tracking-tight">{group.title}</h3>
                    </div>
                    <dl className="divide-y divide-border/60 border-t border-border/60">
                      {group.items.map((item, ii) => (
                        <div key={ii} className="grid grid-cols-3 gap-3 py-3">
                          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</dt>
                          <dd className="col-span-2 text-sm text-foreground">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Related */}
        <section className="section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-10">
              <span className="eyebrow mb-5">Continue exploring</span>
              <h2 className="section-heading mt-5 text-foreground">Related topics.</h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { to: "/capabilities", icon: Zap, title: "Capabilities", description: "What you can build, ship, and observe on the platform." },
                { to: "/integrations", icon: Network, title: "Integrations", description: "Tools and services that plug in out of the box." },
                { to: "/security", icon: Shield, title: "Security", description: "Defense in depth, from edge to data plane." },
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

        {/* CTA */}
        <section className="section-padding container-padding">
          <div className="max-width-content">
            <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
              <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
              <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
              <div className="relative px-6 py-14 sm:px-12 sm:py-16 text-center">
                <span className="eyebrow mb-6">Get started</span>
                <h2 className="section-heading mt-4 text-foreground">Ready to build on ADHAR?</h2>
                <p className="section-subheading mt-5">
                  Start a platform from zero in under 10 minutes. No infrastructure work required.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button type="button" className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium">
                    <GitBranch className="w-4 h-4" />
                    <span>Start building</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <button type="button" className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    <span>View demo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Architecture;
