import { Link } from '@tanstack/react-router';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';

import { Shield, GitPullRequest, BookOpen, ArrowRight } from "lucide-react";
import { Github } from "@/components/brand-icons";
import PricingPlans from '@/components/landing/PricingPlans';
import { btnPrimary, btnSecondary } from '@/components/landing/styles';

const GITHUB = "https://github.com/adhar-io/adhar";

const benefits = [
  {
    icon: Github,
    title: "Apache 2.0 throughout",
    description: "Every package, controller and console screen is open source. Read it, change it, run it anywhere."
  },
  {
    icon: Shield,
    title: "No lock-in",
    description: "Adhar is built from standard CNCF projects and plain Kubernetes resources, all kept in your own Git repository."
  },
  {
    icon: GitPullRequest,
    title: "Developed in the open",
    description: "Issues, pull requests and releases all happen on GitHub, so you can see what changes and when."
  },
  {
    icon: BookOpen,
    title: "Documented, honestly",
    description: "The docs say what is verified on each cloud and what is still alpha, so you can judge it for yourself."
  }
];

const faqs = [
  {
    q: "Is Adhar really free?",
    a: "Yes. Adhar is Apache 2.0. Every feature is in the open-source release; nothing is held back for Adhar Cloud."
  },
  {
    q: "What is Adhar Cloud?",
    a: "A hosted version of Adhar for teams who don't want to operate it themselves. It is the same open-source platform, so you can move between Adhar Cloud and self-hosting at any time. It is coming soon — join the waitlist from the contact page."
  },
  {
    q: "Where do I get help?",
    a: "Start with the docs, then open an issue or a discussion on GitHub. If you are rolling Adhar out in a larger organisation and want to talk it through, use the contact page."
  },
  {
    q: "Is Adhar production-ready?",
    a: "Adhar is at v0.1.x and in active development. The local and single-cluster production paths are verified end to end; the provider pages in the docs say how far each cloud has been verified."
  }
];


const Pricing = () => {
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
              Run it yourself, or let us.
            </h1>
            <p className="section-subheading mt-6">
              Adhar is open source under Apache 2.0. Every feature ships in the open-source release — run it on your own infrastructure for free, or use Adhar Cloud and let us host it for you.
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <PricingPlans showIcons />
          </div>
        </section>

        {/* Why open source */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Why open source</span>
              <h2 className="section-heading mt-5 text-foreground">
                Your platform,
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">on your terms.</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <article key={benefit.title} className="bg-card p-6 transition-colors hover:bg-muted/30">
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
              {faqs.map((faq) => (
                <details key={faq.q} className="group p-6 open:bg-muted/30 transition-colors">
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
                <h2 className="section-heading mt-4 text-foreground">Run it in about ten minutes.</h2>
                <p className="section-subheading mt-5">
                  Install the CLI, run adhar up, and you have the whole platform on your laptop.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/docs/$" params={{ _splat: "getting-started/quick-start" }}
                    className={btnPrimary}
                  >
                    <span>Read the quick start</span>
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </Link>
                  <a
                    href={GITHUB}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={btnSecondary}
                  >
                    <Github className="w-4 h-4" />
                    <span>View on GitHub</span>
                  </a>
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
