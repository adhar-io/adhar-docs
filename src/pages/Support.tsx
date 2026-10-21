import React from 'react';
import { Link } from '@tanstack/react-router';
import { BookOpen, Bug, Mail, LifeBuoy, ArrowRight, ArrowUpRight } from 'lucide-react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Github } from '@/components/brand-icons';
import { focusRing } from '@/components/landing/styles';

const GITHUB = 'https://github.com/adhar-io/adhar';
const EMAIL = 'support@adhar.io';

const cardClass = `group flex flex-col bg-card p-6 sm:p-7 transition-colors hover:bg-muted/30 ${focusRing}`;
const iconClass =
  'mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]';

const external = [
  {
    icon: Bug,
    title: 'Report a bug',
    description: 'Open a GitHub issue with what you ran, what you expected and what happened.',
    href: `${GITHUB}/issues`,
    cta: 'Open an issue',
  },
  {
    icon: Github,
    title: 'Ask the community',
    description: 'Questions, ideas and release notes all live on GitHub, in the open.',
    href: GITHUB,
    cta: 'Adhar on GitHub',
  },
  {
    icon: Mail,
    title: 'Email us',
    description: `For anything you'd rather not post publicly, write to ${EMAIL}.`,
    href: `mailto:${EMAIL}?subject=${encodeURIComponent('Support request')}`,
    cta: 'Send an email',
  },
];

const Support = () => (
  <div className="min-h-screen bg-background">
    <Navigation />

    <main className="pt-16">
      {/* Hero */}
      <section className="relative section-padding container-padding overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
        <div className="max-width-content relative text-center">
          <span className="eyebrow mb-5">Support</span>
          <h1 className="section-heading mt-5 text-foreground">
            Get unstuck,
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">fast.</span>
          </h1>
          <p className="section-subheading mt-6">
            Start with the docs. If you're still stuck, GitHub is the quickest way to reach the people building Adhar.
          </p>
        </div>
      </section>

      {/* Channels */}
      <section className="container-padding pb-20">
        <div className="max-width-content">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/docs/$" params={{ _splat: "reference/troubleshooting" }} className={cardClass}>
              <div className={iconClass}>
                <LifeBuoy className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">Troubleshooting</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Common failures and their fixes, from pods stuck Pending to sync errors.
              </p>
              <span className="mt-auto pt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Read the guide
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>

            {external.map(({ icon: Icon, title, description, href, cta }) => {
              const isMail = href.startsWith('mailto:');
              return (
                <a
                  key={title}
                  href={href}
                  {...(isMail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                  className={cardClass}
                >
                  <div className={iconClass}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
                  <span className="mt-auto pt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {cta}
                    {isMail ? (
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    ) : (
                      <>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </>
                    )}
                  </span>
                </a>
              );
            })}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            New to Adhar?{' '}
            <Link
              to="/docs/$"
              params={{ _splat: "getting-started/quick-start" }}
              className={`inline-flex items-center gap-1 rounded-sm font-medium text-primary underline-offset-4 hover:underline ${focusRing}`}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              Start with the quick start
            </Link>
          </p>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default Support;
