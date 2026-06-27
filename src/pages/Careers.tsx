import React from 'react';
import { Link } from "@tanstack/react-router";
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Clock,
  Users,
  Briefcase,
  Heart,
  Globe,
  Star,
  TrendingUp,
  Code,
  Zap,
  Building,
} from 'lucide-react';

const Careers = () => {
  const jobOpenings = [
    {
      title: "Senior Software Engineer — Platform",
      department: "Engineering",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      level: "Senior",
      description: "Join our platform team to build the next generation of cloud-native development tools."
    },
    {
      title: "DevOps Engineer — Kubernetes",
      department: "Infrastructure",
      location: "New York, NY / Remote",
      type: "Full-time",
      level: "Mid-Senior",
      description: "Help scale our Kubernetes infrastructure and improve developer experience."
    },
    {
      title: "Product Manager — Developer Experience",
      department: "Product",
      location: "Remote",
      type: "Full-time",
      level: "Senior",
      description: "Drive product strategy for developer tools and platform capabilities."
    },
    {
      title: "UI/UX Designer",
      department: "Design",
      location: "San Francisco, CA",
      type: "Full-time",
      level: "Mid-Level",
      description: "Design intuitive interfaces for complex cloud-native development workflows."
    },
    {
      title: "Sales Engineer",
      department: "Sales",
      location: "Multiple Locations",
      type: "Full-time",
      level: "Senior",
      description: "Help enterprise customers succeed with ADHAR Platform implementation."
    },
    {
      title: "Technical Writer",
      department: "Developer Relations",
      location: "Remote",
      type: "Full-time",
      level: "Mid-Level",
      description: "Create world-class documentation and educational content for developers."
    }
  ];

  const benefits = [
    { icon: Heart, title: "Health & wellness", description: "Comprehensive health insurance, mental health support, and wellness programs." },
    { icon: Globe, title: "Remote-first culture", description: "Work from anywhere with flexible hours and async-first collaboration." },
    { icon: TrendingUp, title: "Growth & learning", description: "Professional development budget, conference attendance, and mentorship." },
    { icon: Users, title: "Inclusive team", description: "Diverse, welcoming team that values different perspectives and backgrounds." },
    { icon: Zap, title: "Impact & innovation", description: "Work on technology that impacts millions of developers worldwide." },
    { icon: Building, title: "Competitive package", description: "Competitive salary, equity, unlimited PTO, and generous parental leave." },
  ];

  const values = [
    { title: "Innovation first", description: "We push boundaries and embrace new technologies to solve complex problems." },
    { title: "Developer-centric", description: "Everything we build is designed with the developer experience in mind." },
    { title: "Open source", description: "We believe in the power of open source and contribute back to the community." },
    { title: "Global impact", description: "Our work enables developers worldwide to build better software faster." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Back link */}
        <div className="container-padding pt-6">
          <div className="max-width-content">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to home
            </Link>
          </div>
        </div>

        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5"><Briefcase className="w-3 h-3 mr-1" />Careers</span>
            <h1 className="section-heading mt-5 text-foreground">
              Build the future of
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">cloud-native.</span>
            </h1>
            <p className="section-subheading mt-6">
              Join a team of passionate engineers, designers, and innovators making
              Kubernetes and cloud-native development accessible to everyone.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#openings"
                className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
              >
                <Star className="w-4 h-4" />
                <span>View open positions</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>
              <button
                type="button"
                className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
              >
                <span>Learn about our culture</span>
              </button>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-12">
              <span className="eyebrow mb-5">Values</span>
              <h2 className="section-heading mt-5 text-foreground">What we stand for.</h2>
              <p className="section-subheading mt-5">
                The principles that guide everything we do and shape our culture.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {values.map((value, index) => (
                <article key={index} className="bg-card p-6 text-center transition-colors hover:bg-muted/30">
                  <h3 className="text-base font-semibold text-foreground tracking-tight">{value.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-12">
              <span className="eyebrow mb-5">Benefits</span>
              <h2 className="section-heading mt-5 text-foreground">Why work with us.</h2>
              <p className="section-subheading mt-5">
                More than a job — an environment where you can grow, innovate, and make impact.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <article key={index} className="bg-card p-7 sm:p-8 transition-colors hover:bg-muted/30">
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">{benefit.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Openings */}
        <section id="openings" className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-12">
              <span className="eyebrow mb-5">Open roles</span>
              <h2 className="section-heading mt-5 text-foreground">Open positions.</h2>
              <p className="section-subheading mt-5">
                Find your next opportunity in the cloud-native ecosystem.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card divide-y divide-border/60">
              {jobOpenings.map((job, index) => (
                <article key={index} className="group flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 transition-colors hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {job.department}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border/70 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {job.level}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">{job.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{job.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {job.type}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary-modern group/btn shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-5 h-10 text-sm font-medium"
                  >
                    <span>Apply</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                  </button>
                </article>
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
                <span className="eyebrow mb-6">Open application</span>
                <h2 className="section-heading mt-4 text-foreground">Don't see the right role?</h2>
                <p className="section-subheading mt-5">
                  We're always looking for talent. Send us your resume and tell us how you'd like to contribute.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/contact" className="w-full sm:w-auto">
                    <button
                      type="button"
                      className="btn-primary-modern group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                    >
                      <Users className="w-4 h-4" />
                      <span>Get in touch</span>
                    </button>
                  </Link>
                  <button
                    type="button"
                    className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <Code className="w-4 h-4 text-muted-foreground" />
                    <span>View our culture</span>
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

export default Careers;
