import React from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Shield, Eye, Users, Database, Lock, FileText, ArrowRight } from "lucide-react";

const Privacy = () => {
  const sections = [
    {
      icon: Database,
      title: "Information we collect",
      content: [
        "Account information (name, email, company details)",
        "Usage data and analytics",
        "Device and browser information",
        "Log files and performance metrics",
        "Cookies and similar tracking technologies",
      ],
    },
    {
      icon: Eye,
      title: "How we use your information",
      content: [
        "Provide and maintain our services",
        "Process transactions and billing",
        "Send important notifications and updates",
        "Improve our platform and develop new features",
        "Ensure security and prevent fraud",
      ],
    },
    {
      icon: Users,
      title: "Information sharing",
      content: [
        "We do not sell your personal information",
        "Share with service providers under strict agreements",
        "Comply with legal requirements when necessary",
        "Transfer data in case of business transactions",
        "Aggregate, anonymized data for research purposes",
      ],
    },
    {
      icon: Lock,
      title: "Data security",
      content: [
        "End-to-end encryption for sensitive data",
        "Regular security audits and assessments",
        "Access controls and authentication measures",
        "Secure data centers with 24/7 monitoring",
        "Employee training on data protection",
      ],
    },
    {
      icon: Shield,
      title: "Your rights",
      content: [
        "Access your personal data",
        "Correct inaccurate information",
        "Delete your account and data",
        "Data portability and export",
        "Opt-out of marketing communications",
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
            <span className="eyebrow mb-5"><Shield className="w-3 h-3 mr-1" />Privacy</span>
            <h1 className="section-heading mt-5 text-foreground">
              How we protect
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">your data.</span>
            </h1>
            <p className="section-subheading mt-6">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
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

        {/* Compliance */}
        <section className="section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-w-4xl mx-auto">
            <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
              <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
              <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
              <div className="relative px-6 py-14 sm:px-12 sm:py-16 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] mb-6 mx-auto">
                  <FileText className="h-6 w-6" />
                </div>
                <h2 className="section-heading mt-2 text-foreground">Data protection compliance.</h2>
                <p className="section-subheading mt-5">
                  ADHAR complies with GDPR, CCPA, and other data protection regulations.
                  We implement privacy-by-design principles in all our systems.
                </p>
                <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50 max-w-md mx-auto">
                  {[
                    { value: "GDPR", label: "Compliant" },
                    { value: "CCPA", label: "Compliant" },
                    { value: "SOC 2", label: "Type II" },
                  ].map((m) => (
                    <div key={m.value} className="bg-card/80 backdrop-blur-sm px-3 py-5">
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
            <h2 className="section-heading mt-5 text-foreground">Questions about privacy?</h2>
            <p className="section-subheading mt-5">
              If you have questions about this Privacy Policy or our data practices, our privacy team is here to help.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:privacy@adhar.dev"
                className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
              >
                <span>privacy@adhar.dev</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="tel:+15551234567"
                className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
              >
                <span>+1 (555) 123-4567</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
