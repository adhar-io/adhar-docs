import React from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Shield, CheckCircle, FileText, Lock, Award, Users, Globe, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Compliance = () => {
  const certifications = [
    { name: "SOC 2 Type II", status: "Certified", icon: Shield, description: "Comprehensive security, availability, and confidentiality controls." },
    { name: "ISO 27001", status: "Certified", icon: Award, description: "International standard for information security management." },
    { name: "GDPR", status: "Compliant", icon: Globe, description: "European Union data protection and privacy regulation." },
    { name: "HIPAA", status: "Ready", icon: Users, description: "Healthcare information privacy and security standards." },
    { name: "PCI DSS", status: "Level 1", icon: Lock, description: "Payment card industry data security standards." },
    { name: "FedRAMP", status: "In Progress", icon: AlertCircle, description: "Federal risk and authorization management program." },
  ];

  const auditReports = [
    { name: "SOC 2 Type II Report", year: "2024" },
    { name: "Penetration Test Report", year: "2024" },
    { name: "ISO 27001 Certificate", year: "2024" },
    { name: "GDPR Compliance Assessment", year: "2024" },
  ];

  const complianceMetrics = [
    { label: "Security incidents", value: "0", period: "Last 12 months" },
    { label: "Audit findings", value: "0", period: "2024 audits" },
    { label: "Compliance score", value: "98%", period: "Overall rating" },
    { label: "Certifications", value: "4", period: "Active" },
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
            <span className="eyebrow mb-5"><Shield className="w-3 h-3 mr-1" />Compliance</span>
            <h1 className="section-heading mt-5 text-foreground">
              Compliance &amp;
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">certifications.</span>
            </h1>
            <p className="section-subheading mt-6">
              ADHAR maintains the highest standards of security and compliance to protect your data and meet
              regulatory requirements across industries.
            </p>
          </div>
        </section>

        {/* Metrics */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {complianceMetrics.map((metric, index) => (
                <div key={index} className="bg-card px-5 py-6 text-center">
                  <div className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight tabular">
                    {metric.value}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{metric.label}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground/80">{metric.period}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Certifications */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Certifications</span>
              <h2 className="section-heading mt-5 text-foreground">
                Security standards
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">we meet.</span>
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {certifications.map((cert, index) => {
                const Icon = cert.icon;
                return (
                  <article key={index} className="bg-card p-7 sm:p-8 transition-colors hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ring-primary/20">
                        {cert.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">{cert.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{cert.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Audit reports */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-12">
              <span className="eyebrow mb-5">Documentation</span>
              <h2 className="section-heading mt-5 text-foreground">Audit reports.</h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card divide-y divide-border/60 max-w-3xl mx-auto">
              {auditReports.map((report, index) => (
                <article key={index} className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-muted/30">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground tracking-tight truncate">{report.name}</h3>
                      <p className="text-xs text-muted-foreground">{report.year}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary-modern shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full px-4 h-9 text-xs font-medium"
                  >
                    Request access
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Framework */}
        <section className="section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
              <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
              <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
              <div className="relative px-6 py-14 sm:px-12 sm:py-16 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] mb-6 mx-auto">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="section-heading mt-2 text-foreground">
                  A comprehensive
                  <br className="hidden sm:block" />
                  <span className="text-muted-foreground">compliance framework.</span>
                </h2>
                <p className="section-subheading mt-5">
                  Built on industry best practices, continuous monitoring, and regular third-party assessments
                  to ensure we meet the highest security and privacy standards.
                </p>
                <div className="mt-10 grid sm:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50 max-w-3xl mx-auto">
                  {[
                    { icon: CheckCircle, title: "Continuous monitoring", description: "24/7 security monitoring and automated compliance checks." },
                    { icon: Award, title: "Regular audits", description: "Annual third-party security audits and assessments." },
                    { icon: Users, title: "Expert team", description: "Dedicated compliance and security professionals." },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="bg-card/80 backdrop-blur-sm p-6 text-left">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] mb-3">
                          <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground tracking-tight">{item.title}</h3>
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="section-padding container-padding">
          <div className="max-w-3xl mx-auto text-center">
            <span className="eyebrow mb-5">Get in touch</span>
            <h2 className="section-heading mt-5 text-foreground">Need compliance docs?</h2>
            <p className="section-subheading mt-5">
              Our compliance team is ready to help with specific certification requirements,
              audit documentation, or custom assessments for your organization.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/contact" className="w-full sm:w-auto">
                <button
                  type="button"
                  className="btn-primary-modern group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                >
                  <FileText className="w-4 h-4" />
                  <span>Request documentation</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </button>
              </Link>
              <button
                type="button"
                className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
              >
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>Schedule a call</span>
              </button>
            </div>
            <p className="mt-6 pt-6 border-t border-border/60 text-xs text-muted-foreground">
              compliance@adhar.dev · +1 (555) 123-COMP
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Compliance;
