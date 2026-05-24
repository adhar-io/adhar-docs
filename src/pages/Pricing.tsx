import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Download, Cloud, Building2, Zap, Shield, HeartHandshake, GraduationCap, ArrowRight } from "lucide-react";
import { Github } from "@/components/brand-icons";
import { pricingPlans } from '@/data/landingPageData';

const Pricing = () => {
  const benefits = [
    {
      icon: Github,
      title: "100% Open Source",
      description: "All code is open source. Contribute, customize, and deploy anywhere without restrictions."
    },
    {
      icon: Shield,
      title: "No Vendor Lock-in",
      description: "Own your infrastructure. Migrate freely between self-hosted and cloud options anytime."
    },
    {
      icon: HeartHandshake,
      title: "Community Driven",
      description: "Active community support, regular updates, and transparent roadmap development."
    },
    {
      icon: GraduationCap,
      title: "Enterprise Ready",
      description: "Production-grade platform trusted by enterprises. Scale from startup to global deployment."
    }
  ];

  const getIcon = (name: string) => {
    if (name === "Open Source") return Download;
    if (name === "Adhar Cloud") return Cloud;
    return Building2;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5">Pricing</span>
            <h1 className="section-heading mt-5 text-foreground">
              Choose your path.
            </h1>
            <p className="section-subheading mt-6">
              Start with our free forever open-source platform, or upgrade to managed cloud with premium features.
              Scale to enterprise when you're ready.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              All development happens in open source. No hidden features.
            </p>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {pricingPlans.map((plan, index) => {
                const Icon = getIcon(plan.name);
                const isPopular = plan.popular;

                return (
                  <Card
                    key={index}
                    className={`relative flex flex-col rounded-2xl border bg-card p-0 transition-all duration-300 ${
                      isPopular
                        ? 'border-primary/60 ring-1 ring-primary/30 shadow-[var(--shadow-md)]'
                        : 'border-border/70 hover:border-border shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)]'
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <span className={`eyebrow ${isPopular ? '!bg-primary/10 !text-primary !border-primary/30' : '!bg-card !text-foreground'}`}>
                          {plan.highlight}
                        </span>
                      </div>
                    )}

                    <CardHeader className="text-center pb-6 pt-10 px-7">
                      <div className="inline-flex h-11 w-11 mx-auto items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <CardTitle className="mt-5 text-2xl font-semibold tracking-tight">{plan.name}</CardTitle>
                      <CardDescription className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground mt-1">
                        {plan.subtitle}
                      </CardDescription>
                      <div className="mt-5 text-4xl font-semibold tracking-tight tabular text-foreground">
                        {plan.price}
                        {plan.period && <span className="text-base text-muted-foreground font-normal ml-1">{plan.period}</span>}
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col px-7 pb-7">
                      <ul className="space-y-3 mb-7 border-t border-border/60 pt-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary/80" strokeWidth={2.5} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full h-11 text-[15px] font-medium ${
                          isPopular ? 'btn-primary-modern' : 'btn-secondary-modern'
                        }`}
                      >
                        <span>{plan.cta}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Why ADHAR</span>
              <h2 className="section-heading mt-5 text-foreground">
                Open source principles,
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">enterprise scale.</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <article key={index} className="bg-card p-6 transition-colors hover:bg-muted/30">
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">{benefit.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="eyebrow mb-5">FAQ</span>
              <h2 className="section-heading mt-5 text-foreground">
                Frequently asked.
              </h2>
            </div>

            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
              {[
                {
                  q: "Is the Open Source version really free forever?",
                  a: "Yes. The open source version is 100% free forever with no restrictions. All features are included, and all development happens in the open. You can self-host on any infrastructure without limitations."
                },
                {
                  q: "What's the difference between Open Source and Adhar Cloud?",
                  a: "Both have the same core features. Adhar Cloud adds a premium UI, AI-powered automation, fully managed infrastructure, priority support, training, and automatic updates."
                },
                {
                  q: "Can I migrate from Open Source to Cloud later?",
                  a: "Absolutely. There's no vendor lock-in. Migrate between self-hosted and cloud at any time — we provide migration tools and support."
                },
                {
                  q: "What does Enterprise include?",
                  a: "Custom integrations, dedicated setup (cloud or on-premise), white-labeling, custom feature development, a dedicated support manager, and flexible SLA agreements. Pricing is tailored."
                },
                {
                  q: "Do you offer training and certification?",
                  a: "Yes. Adhar Cloud and Enterprise plans include comprehensive training and certification with hands-on workshops and documentation."
                }
              ].map((faq, index) => (
                <details key={index} className="group p-6 open:bg-muted/30 transition-colors">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-base font-medium text-foreground">
                    <span>{faq.q}</span>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-muted-foreground text-lg leading-none transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </details>
              ))}
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
                <h2 className="section-heading mt-4 text-foreground">Ready to get started?</h2>
                <p className="section-subheading mt-5">
                  Download the open source version, start a cloud trial, or talk to sales about enterprise needs.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download open source</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span>Start cloud trial</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>Contact sales</span>
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

export default Pricing;
