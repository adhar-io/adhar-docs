import React from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Building, Handshake, Users, Globe, ArrowRight } from "lucide-react";

const Partners = () => {
  const partnerTypes = [
    {
      title: "Technology partners",
      icon: Building,
      description: "Leading technology companies that integrate with ADHAR.",
      partners: ["AWS", "Google Cloud", "Microsoft Azure", "Docker", "Kubernetes"],
    },
    {
      title: "Solution partners",
      icon: Handshake,
      description: "Certified partners who implement ADHAR solutions.",
      partners: ["Acme Consulting", "TechFlow Solutions", "CloudFirst", "DevOps Pro"],
    },
    {
      title: "Channel partners",
      icon: Users,
      description: "Partners who resell and distribute ADHAR.",
      partners: ["Global Tech", "Enterprise Solutions", "Cloud Resellers", "TechDistro"],
    },
    {
      title: "Regional partners",
      icon: Globe,
      description: "Local partners providing regional support.",
      partners: ["APAC Solutions", "EU Tech Partners", "Americas Cloud", "EMEA Partners"],
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
            <span className="eyebrow mb-5"><Handshake className="w-3 h-3 mr-1" />Partners</span>
            <h1 className="section-heading mt-5 text-foreground">
              We work with
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">the best in the field.</span>
            </h1>
            <p className="section-subheading mt-6">
              Together with leading organizations worldwide, we deliver exceptional cloud-native solutions to teams of every size.
            </p>
          </div>
        </section>

        {/* Partner types */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <div className="grid sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {partnerTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <article key={type.title} className="bg-card p-7 sm:p-8 transition-colors hover:bg-muted/30">
                    <div className="flex items-start gap-4">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground tracking-tight">{type.title}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{type.description}</p>
                      </div>
                    </div>
                    <div className="mt-5 pt-5 border-t border-border/60 flex flex-wrap gap-1.5">
                      {type.partners.map((partner) => (
                        <span key={partner} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          {partner}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Become a partner CTA */}
        <section className="section-padding container-padding">
          <div className="max-width-content">
            <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
              <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
              <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
              <div className="relative px-6 py-14 sm:px-12 sm:py-16 text-center">
                <span className="eyebrow mb-6">Join us</span>
                <h2 className="section-heading mt-4 text-foreground">Become a partner.</h2>
                <p className="section-subheading mt-5">
                  Join our partner ecosystem and grow your business with ADHAR.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <span>Apply now</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <span>Learn more</span>
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

export default Partners;
