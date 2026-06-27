import React from "react";
import { Link } from "@tanstack/react-router";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import {
  Shield,
  Lock,
  Eye,
  Users,
  FileText,
  Zap,
  CheckCircle,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  Network,
  Workflow,
  ScrollText,
  Cpu,
  Database,
  Activity,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const securityMetrics = [
  { label: "Security incidents", value: "0", period: "Last 12 months" },
  { label: "Uptime SLA", value: "99.99%", period: "Guaranteed" },
  { label: "Critical response", value: "<1h", period: "P0 incidents" },
  { label: "Patch SLA", value: "<24h", period: "Critical vulnerabilities" },
];

interface Pillar {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
}

const pillars: Pillar[] = [
  {
    icon: Shield,
    title: "Enterprise-grade security",
    description: "Defense-in-depth controls and a hardened runtime — built for regulated environments.",
    features: [
      "Multi-factor authentication (MFA)",
      "Single Sign-On (SSO) via SAML & OIDC",
      "Role-based access control (RBAC)",
      "API security and rate limiting",
      "Secure development lifecycle",
    ],
  },
  {
    icon: Lock,
    title: "Data protection & encryption",
    description: "Advanced encryption and key management across every layer of the platform.",
    features: [
      "End-to-end encryption in transit and at rest",
      "KMS-backed key management",
      "Secure secrets management (Vault-compatible)",
      "Data loss prevention (DLP)",
      "Privacy-by-design architecture",
    ],
  },
  {
    icon: Eye,
    title: "Monitoring & threat detection",
    description: "Real-time security monitoring with intelligent correlation and automated response.",
    features: [
      "24/7 security monitoring",
      "Automated threat detection",
      "Incident response automation",
      "SIEM-ready audit pipelines",
      "Continuous vulnerability management",
    ],
  },
  {
    icon: Users,
    title: "Identity & access management",
    description: "Centralized identity governance and just-in-time access for every system.",
    features: [
      "Centralized identity management",
      "Just-in-time access provisioning",
      "Privileged access management (PAM)",
      "Access certification and reviews",
      "Zero-trust architecture",
    ],
  },
];

interface ZeroTrust {
  icon: LucideIcon;
  title: string;
  description: string;
}

const zeroTrust: ZeroTrust[] = [
  { icon: KeyRound, title: "Verify explicitly", description: "Every request authenticates and authorizes against the latest user, device, and risk signals." },
  { icon: ShieldCheck, title: "Least privilege", description: "Just-in-time roles, fine-grained scopes, and time-boxed elevation reduce blast radius." },
  { icon: Network, title: "Assume breach", description: "Service mesh enforces mTLS, microsegmentation, and continuous validation between workloads." },
  { icon: Activity, title: "Continuous monitoring", description: "Every action emits to immutable audit trails — correlated with metrics and traces." },
];

const threatModel = [
  { tier: "Edge", icon: Network, scope: "DDoS, WAF, geo-routing, TLS termination" },
  { tier: "Identity", icon: KeyRound, scope: "MFA, SSO, RBAC, session integrity" },
  { tier: "Application", icon: Cpu, scope: "OWASP coverage, input validation, sandboxing" },
  { tier: "Data", icon: Database, scope: "Encryption at rest, DLP, tokenization, masking" },
  { tier: "Network", icon: Workflow, scope: "mTLS, segmentation, egress policies" },
  { tier: "Audit", icon: ScrollText, scope: "Append-only logs, 7yr retention, SIEM export" },
];

const complianceStandards = [
  { name: "SOC 2 Type II", description: "Security, availability, and confidentiality controls.", status: "Certified" },
  { name: "ISO 27001", description: "Information security management standard.", status: "Certified" },
  { name: "GDPR", description: "European data protection and privacy regulation.", status: "Compliant" },
  { name: "HIPAA", description: "Healthcare information privacy and security.", status: "Ready" },
  { name: "PCI DSS", description: "Payment card industry data security.", status: "Compliant" },
  { name: "FedRAMP", description: "Federal risk and authorization management.", status: "In Progress" },
];

const bestPractices: { icon: LucideIcon; title: string; items: string[] }[] = [
  {
    icon: Zap,
    title: "Developer security",
    items: [
      "Secure coding practices and guidelines",
      "Automated security testing in CI/CD",
      "Dependency vulnerability scanning",
      "Code review security checklists",
      "Security training and awareness",
    ],
  },
  {
    icon: Shield,
    title: "Infrastructure security",
    items: [
      "Network segmentation and isolation",
      "Container and Kubernetes hardening",
      "Cloud security posture management",
      "Infrastructure as code security",
      "Continuous security monitoring",
    ],
  },
];

const Security = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5"><Shield className="w-3 h-3 mr-1" />Security</span>
            <h1 className="section-heading mt-5 text-foreground">
              Zero trust, defense in depth,
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">audit-grade by default.</span>
            </h1>
            <p className="section-subheading mt-6">
              Security isn't a feature — it's the foundation. Every layer of ADHAR is built
              to be verified, encrypted, observed, and proven.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/compliance" className="w-full sm:w-auto">
                <button type="button" className="btn-primary-modern group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium">
                  <span>View certifications</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>
              <button type="button" className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>Request pen-test report</span>
              </button>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {securityMetrics.map((m, idx) => (
                <div key={idx} className="bg-card px-5 py-6 text-center">
                  <div className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight tabular">{m.value}</div>
                  <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{m.label}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground/80">{m.period}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Pillars</span>
              <h2 className="section-heading mt-5 text-foreground">
                Four pillars,
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">one security model.</span>
              </h2>
              <p className="section-subheading mt-6">
                Identity, data, runtime, and observability — designed together, never bolted on after the fact.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {pillars.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <article key={idx} className="bg-card p-7 sm:p-8 transition-colors hover:bg-muted/30">
                    <div className="flex items-start gap-4">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground tracking-tight">{pillar.title}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                      </div>
                    </div>
                    <ul className="mt-5 space-y-2 border-t border-border/60 pt-5">
                      {pillar.features.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary/80" strokeWidth={2.5} />
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

        {/* Zero Trust */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Zero trust</span>
              <h2 className="section-heading mt-5 text-foreground">
                Trust nothing.
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">Verify everything.</span>
              </h2>
              <p className="section-subheading mt-6">
                Every request, every workload, every byte. Continuously verified, scoped, and logged.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {zeroTrust.map((z, idx) => {
                const Icon = z.icon;
                return (
                  <article key={idx} className="bg-card p-7 transition-colors hover:bg-muted/30">
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">{z.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{z.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Threat Model */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Threat model</span>
              <h2 className="section-heading mt-5 text-foreground">
                Six tiers
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">of protection.</span>
              </h2>
              <p className="section-subheading mt-6">
                We map controls to threats so your team knows exactly what's protecting what — and what to ask us.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card divide-y divide-border/60">
              {threatModel.map((tier, idx) => {
                const Icon = tier.icon;
                return (
                  <div key={idx} className="flex items-center gap-5 p-5 sm:p-6 transition-colors hover:bg-muted/30">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="w-24 sm:w-28 shrink-0">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Tier {idx + 1}</div>
                      <div className="text-sm font-semibold text-foreground tracking-tight">{tier.tier}</div>
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground">{tier.scope}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Compliance */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Compliance</span>
              <h2 className="section-heading mt-5 text-foreground">
                Standards we meet
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">and prove.</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {complianceStandards.map((std, idx) => {
                const StatusIcon = std.status === "In Progress" ? AlertTriangle : CheckCircle;
                return (
                  <article key={idx} className="bg-card p-6 transition-colors hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ring-primary/20">
                        {std.status}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">{std.name}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{std.description}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              <Link to="/compliance">
                <button type="button" className="btn-secondary-modern group inline-flex items-center justify-center gap-2 rounded-full px-5 h-10 text-sm font-medium">
                  <span>View all certifications &amp; reports</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Best practices */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Best practices</span>
              <h2 className="section-heading mt-5 text-foreground">Security guidance.</h2>
              <p className="section-subheading mt-5">
                Apply the same controls we run on our own infrastructure.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {bestPractices.map((bp, idx) => {
                const Icon = bp.icon;
                return (
                  <article key={idx} className="bg-card p-7 sm:p-8">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground tracking-tight">{bp.title}</h3>
                    </div>
                    <ul className="space-y-2 border-t border-border/60 pt-5">
                      {bp.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary/80" strokeWidth={2.5} />
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

        {/* Docs CTA */}
        <section className="section-padding container-padding">
          <div className="max-width-content">
            <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
              <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
              <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
              <div className="relative px-6 py-14 sm:px-12 sm:py-16 text-center">
                <span className="eyebrow mb-6">Security docs</span>
                <h2 className="section-heading mt-4 text-foreground">
                  Need to satisfy your CISO?
                </h2>
                <p className="section-subheading mt-5">
                  Comprehensive documentation, threat models, and audit reports — ready for your security review.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/docs" className="w-full sm:w-auto">
                    <button type="button" className="btn-primary-modern group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium">
                      <FileText className="w-4 h-4" />
                      <span>Security documentation</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </Link>
                  <Link to="/contact" className="w-full sm:w-auto">
                    <button type="button" className="btn-secondary-modern w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>Contact security team</span>
                    </button>
                  </Link>
                </div>
              </div>
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
                { to: "/architecture", icon: Workflow, title: "Architecture", description: "How security maps to every layer of the stack." },
                { to: "/capabilities", icon: Zap, title: "Capabilities", description: "Automated scanning, secrets, and compliance reporting." },
                { to: "/compliance", icon: ScrollText, title: "Compliance", description: "Certifications, audits, and downloadable documentation." },
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

export default Security;
