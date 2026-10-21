import React from 'react';
import { Link } from '@tanstack/react-router';
import { Mail, Cloud, Building2, MessageSquare, Bug, ArrowRight, ArrowUpRight } from 'lucide-react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Github } from '@/components/brand-icons';
import { btnSecondary, focusRing } from '@/components/landing/styles';

// The site is static, so contact is by email: each card opens a pre-addressed
// message in the visitor's mail client with a subject that says what it's about.
const EMAIL = 'support@adhar.io';
const GITHUB = 'https://github.com/adhar-io/adhar';

const mailto = (subject: string, body = '') =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;

const topics = [
  {
    icon: Cloud,
    title: 'Join the Adhar Cloud waitlist',
    description: 'Hear when the hosted version opens. Tell us a little about your team.',
    href: mailto('Adhar Cloud waitlist', 'Team / company:\nRoughly how many developers:\nAnything else:\n'),
    cta: 'Email to join',
  },
  {
    icon: Building2,
    title: 'Adopting Adhar',
    description: 'Rolling Adhar out across a larger organisation, on-prem or in your own cloud accounts.',
    href: mailto('Adopting Adhar', 'What we are planning:\n'),
    cta: 'Email us',
  },
  {
    icon: MessageSquare,
    title: 'Anything else',
    description: 'Partnerships, press or a question that does not fit anywhere else.',
    href: mailto('Hello from adhar.io'),
    cta: 'Email us',
  },
];

const Contact = () => (
  <div className="min-h-screen bg-background">
    <Navigation />

    <main className="pt-16">
      {/* Hero */}
      <section className="relative section-padding container-padding overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
        <div className="max-width-content relative text-center">
          <span className="eyebrow mb-5">Contact</span>
          <h1 className="section-heading mt-5 text-foreground">Get in touch.</h1>
          <p className="section-subheading mt-6">
            Email us at{' '}
            <a href={`mailto:${EMAIL}`} className={`rounded-sm text-foreground underline underline-offset-4 ${focusRing}`}>
              {EMAIL}
            </a>
            . Bugs and feature requests go to GitHub, where everyone can follow them.
          </p>
        </div>
      </section>

      {/* Email topics */}
      <section className="container-padding pb-16">
        <div className="max-width-content">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 md:grid-cols-3">
            {topics.map(({ icon: Icon, title, description, href, cta }) => (
              <article key={title} className="flex flex-col bg-card p-6 sm:p-7">
                <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
                <a href={href} className={`${btnSecondary} mt-6 self-start`}>
                  <Mail className="h-4 w-4" aria-hidden />
                  <span>{cta}</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GitHub */}
      <section className="relative section-padding container-padding bg-muted/30">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="max-width-content grid gap-5 md:grid-cols-2">
          {[
            {
              icon: Bug,
              title: 'Found a bug?',
              body: 'Open an issue with what you ran, what you expected and what happened instead.',
              href: `${GITHUB}/issues`,
              cta: 'Open an issue',
            },
            {
              icon: Github,
              title: 'Questions and ideas',
              body: 'Start a discussion, browse the source and follow releases on GitHub.',
              href: GITHUB,
              cta: 'Adhar on GitHub',
            },
          ].map(({ icon: Icon, title, body, href, cta }) => (
            <a
              key={title}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-start gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-xs)] transition-colors hover:border-border hover:bg-muted/30 ${focusRing}`}
            >
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {cta}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Docs pointer */}
      <section className="section-padding container-padding">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="section-heading text-foreground">Looking for quick answers?</h2>
          <p className="section-subheading mt-5">Most questions are answered in the docs, from installation to troubleshooting.</p>
          <div className="mt-8">
            <Link to="/docs/$" params={{ _splat: "reference/troubleshooting" }} className={btnSecondary}>
              <span>Troubleshooting guide</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default Contact;
