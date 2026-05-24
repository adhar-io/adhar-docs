import React from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { FileText, Scale, AlertTriangle, Users, Zap, Shield, ArrowRight } from "lucide-react";

const Terms = () => {
  const sections = [
    {
      icon: Users,
      title: "Acceptance of terms",
      content: [
        "By accessing ADHAR services, you agree to these terms",
        "These terms apply to all users and visitors",
        "Continued use constitutes acceptance of any updates",
        "You must be at least 18 years old to use our services",
        "Corporate users must have authority to bind their organization",
      ],
    },
    {
      icon: Zap,
      title: "Service usage & license",
      content: [
        "Subject to compliance with these terms",
        "Non-exclusive, non-transferable license to use ADHAR",
        "Intended for legitimate business purposes only",
        "Prohibited uses include illegal activities and security violations",
        "We reserve the right to monitor usage for compliance",
      ],
    },
    {
      icon: Shield,
      title: "User responsibilities",
      content: [
        "Maintain confidentiality of account credentials",
        "Provide accurate and current information",
        "Comply with applicable laws and regulations",
        "Respect intellectual property rights",
        "Report security vulnerabilities responsibly",
      ],
    },
    {
      icon: AlertTriangle,
      title: "Service availability",
      content: [
        "Services provided 'as is' without warranties",
        "We strive for 99.9% uptime but cannot guarantee it",
        "Scheduled maintenance may cause temporary interruptions",
        "We may modify or discontinue features with notice",
        "Critical security updates may be applied immediately",
      ],
    },
    {
      icon: Scale,
      title: "Limitation of liability",
      content: [
        "Our liability is limited to the amount paid for services",
        "No liability for indirect, consequential, or punitive damages",
        "Force majeure events excuse performance delays",
        "You agree to indemnify us against third-party claims",
        "Some jurisdictions may not allow these limitations",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5"><FileText className="w-3 h-3 mr-1" />Legal</span>
            <h1 className="section-heading mt-5 text-foreground">
              Terms of
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">service.</span>
            </h1>
            <p className="section-subheading mt-6">
              These terms govern your use of ADHAR services. Please read them carefully before using our platform.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">Last updated: January 15, 2026</p>
          </div>
        </section>

        {/* Sections */}
        <section className="container-padding pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card divide-y divide-border/60">
              {sections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <article key={index} className="p-7 sm:p-8 transition-colors hover:bg-muted/30">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                        {section.title}
                      </h2>
                    </div>
                    <ul className="space-y-2.5 pl-0 sm:pl-14">
                      {section.content.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/70 mt-2 shrink-0" />
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

        {/* SLA */}
        <section className="section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-w-4xl mx-auto">
            <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
              <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
              <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
              <div className="relative px-6 py-14 sm:px-12 sm:py-16 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] mb-6 mx-auto">
                  <Scale className="h-6 w-6" />
                </div>
                <h2 className="section-heading mt-2 text-foreground">Service level agreement.</h2>
                <p className="section-subheading mt-5">
                  We're committed to providing reliable, high-performance services with transparent SLAs and support commitments.
                </p>
                <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50 max-w-md mx-auto">
                  {[
                    { value: "99.9%", label: "Uptime SLA" },
                    { value: "<1h", label: "Response" },
                    { value: "24/7", label: "Support" },
                  ].map((m) => (
                    <div key={m.label} className="bg-card/80 backdrop-blur-sm px-3 py-5">
                      <div className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight tabular">{m.value}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="section-padding container-padding">
          <div className="max-w-3xl mx-auto text-center">
            <span className="eyebrow mb-5">Get in touch</span>
            <h2 className="section-heading mt-5 text-foreground">Legal questions?</h2>
            <p className="section-subheading mt-5">
              For questions about these terms or legal matters, please contact our legal team.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:legal@adhar.dev"
                className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
              >
                <span>legal@adhar.dev</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <span className="inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-sm text-muted-foreground border border-border/70">
                San Francisco, CA
              </span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
