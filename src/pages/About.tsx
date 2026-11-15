import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Target,
  Users,
  Globe,
  Shield,
  Award,
  MapPin,
  Sparkles,
  Rocket,
  ArrowRight
} from 'lucide-react';
import { Github, Linkedin, Twitter } from '@/components/brand-icons';

const About = () => {
  const values = [
    {
      icon: Target,
      title: "Innovation First",
      description: "We push the boundaries of what's possible in cloud-native development, constantly exploring new technologies and methodologies.",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Our platform is built by developers, for developers. We listen to our community and evolve based on real needs.",
    },
    {
      icon: Globe,
      title: "Global Impact",
      description: "We're building tools that empower developers worldwide to create solutions that matter.",
    },
    {
      icon: Shield,
      title: "Security by Design",
      description: "Every feature is built with security as a foundation, not an afterthought.",
    }
  ];

  const team = [
    {
      name: "Sudhir Ranjan Pradhan",
      role: "Data & AI Platform",
      avatar: "/avatars/sudhir-ranjan-pradhan.jpeg",
      bio: "Leads data and AI platform strategy, helping teams move from experimentation to secure, governed, production-scale intelligence services.",
      location: "San Francisco, CA",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/sudhirranjan/"
      }
    },
    {
      name: "Tapas Jena",
      role: "Platform & Enterprise Architecture",
      avatar: "/avatars/tapas-jena.png",
      bio: "Architects enterprise platform foundations with a strong focus on modular design, GitOps automation, and multi-cloud operating consistency.",
      location: "Singapore",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/tapasjena/"
      }
    },
    {
      name: "Pavan Kumar Chakravartula",
      role: "Kubernetes Platform Engineering",
      avatar: "/avatars/pavan-kumar-chakravartula.jpeg",
      bio: "Builds Kubernetes delivery frameworks that standardize deployment, observability, and release reliability for product engineering teams.",
      location: "Singapore",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/pavan-kumar-chakravartula-464b8423/"
      }
    },
    {
      name: "Karthik Chinni",
      role: "Cloud & Infrastructure Engineering",
      avatar: "/avatars/karthik-chinni.jpeg",
      bio: "Leads cloud infrastructure engineering for resilient operations, policy-driven automation, and production-grade reliability across environments.",
      location: "Singapore",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/karthik-chinni-23a00915/"
      }
    },
    {
      name: "Arun Subbaram Chelakara",
      role: "Security & Compliance Engineering",
      avatar: "",
      bio: "Drives security and compliance engineering across identity, secrets, and software supply chain controls to make safe-by-default platform operations real.",
      location: "Singapore",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "priya-nair-security"
      }
    },
    {
      name: "Pavan Kumar Kurella",
      role: "Developer Relations & Community",
      avatar: "/avatars/pavan-kumar-kurella.jpeg",
      bio: "Champions developer relations through community programs, technical storytelling, and user feedback loops that directly influence the roadmap.",
      location: "Singapore",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/pavan-kumar-kurella-9031709/"
      }
    },
    {
      name: "Mahendra Sai Kiran",
      role: "Frontend Engineering & UX",
      avatar: "",
      bio: "Designs user-centered platform interfaces that simplify complex workflows and deliver consistent, accessible, high-confidence developer experiences.",
      location: "Singapore",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/pmskiran/"
      }
    },
    {
      name: "Seshu Devineni",
      role: "Platform & Enterprise Architecture",
      avatar: "/avatars/seshu-devineni.jpeg",
      bio: "Shapes enterprise platform architecture and operating models that scale internal developer platforms with clear governance and measurable outcomes.",
      location: "Florida, USA",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/s3shu/"
      }
    },
    {
      name: "Mukesh Chaudhary",
      role: "Performance & Resiliency Engineering",
      avatar: "/avatars/mukesh-chaudhary.jpeg",
      bio: "Owns performance and resiliency engineering, improving latency, capacity, and failure recovery characteristics across critical platform services.",
      location: "Singapore",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/chaudharymukesh/"
      }
    },
    {
      name: "Karthik Mamidala",
      role: "Platform & Enterprise Architecture",
      avatar: "/avatars/karthik-mamidala.jpeg",
      bio: "Defines platform architecture blueprints and engineering guardrails that balance developer autonomy with secure, repeatable enterprise operations.",
      location: "Singapore",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/karthik-mamidala-441a2422/"
      }
    },
    {
      name: "Muralidharan Ramanujam",
      role: "Marketing & Customer Success",
      avatar: "/avatars/muralidharan-ramanujam.png",
      bio: "Leads go-to-market and customer success strategy, translating customer outcomes into stronger adoption, retention, and product direction.",
      location: "Singapore",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/muralidharan-ramanujam-a1053010/"
      }
    },
    {
      name: "Srikanth Varipalli",
      role: "Developer Relations & Community",
      avatar: "/avatars/srikanth-varipalli.jpeg",
      bio: "Grows developer community and advocacy through practical enablement content, contributor engagement, and continuous field-to-product feedback.",
      location: "Singapore",
      social: {
        github: "https://github.com/adhar-io/",
        linkedin: "https://www.linkedin.com/in/varipallisrikanth/"
      }
    }
  ];

  const stats = [
    { label: "Founded", value: "2025", icon: Sparkles },
    { label: "Core Team Members", value: "10+", icon: Users },
    { label: "Countries", value: "12", icon: Globe },
    { label: "Funding Raised", value: "$0M", icon: Rocket }
  ];

  const milestones = [
    { year: "2025", title: "The beginning", text: "Adhar starts as an internal tool to tame cloud-native sprawl across teams and clouds." },
    { year: "2025", title: "Open sourced", text: "We release Adhar under Apache 2.0 and welcome our first community contributors." },
    { year: "2026", title: "50+ integrations", text: "GitOps, security, observability and data services ship as one curated, production-grade stack." },
    { year: "2027", title: "Adhar 1.0", text: "A complete internal developer platform, deployable to any cloud in a single command." },
  ];

  const openSource = [
    { label: "GitHub stars", value: "1k+" },
    { label: "Contributors", value: "200+" },
    { label: "Integrated services", value: "100+" },
    { label: "License", value: "Apache 2.0" },
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
            <span className="eyebrow mb-5">About ADHAR</span>
            <h1 className="section-heading mt-5 text-foreground">
              Building the future of
              {' '}
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">cloud-native development.</span>
            </h1>
            <p className="section-subheading mt-6">
              We're on a mission to transform how software is built, deployed, and scaled.
              ADHAR is the open cloud-native foundation that empowers teams to innovate faster.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="bg-card px-5 py-6 text-center">
                    <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-3" strokeWidth={2} />
                    <div className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight tabular">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Story + Milestones */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div>
              <span className="eyebrow mb-5">Our story</span>
              <h2 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground text-balance">
                From a shared frustration to an open foundation.
              </h2>
              <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Adhar began where most platforms do — with friction. Teams were stitching together dozens
                  of tools just to ship software safely, and every company kept rebuilding the same internal
                  platform from scratch.
                </p>
                <p>
                  We believed there was a better way: a single, opinionated foundation that bundles the best of
                  the cloud-native ecosystem — GitOps, security, observability, data and self-service
                  infrastructure — and provisions it in minutes, on any cloud.
                </p>
                <p>
                  Today Adhar is 100% open source under Apache 2.0, shaped in the open by a growing community of
                  engineers who believe developer freedom and organizational governance shouldn't be a trade-off.
                </p>
              </div>
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
                {openSource.map((s) => (
                  <div key={s.label} className="bg-card px-4 py-4 text-center">
                    <div className="text-lg font-semibold text-foreground tracking-tight tabular">{s.value}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones timeline */}
            <div className="relative rounded-3xl border border-border/70 bg-card p-7 sm:p-8 shadow-[var(--shadow-sm)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-6">Milestones</div>
              <ol className="relative ml-1.5 space-y-7 border-l border-border/70">
                {milestones.map((m) => (
                  <li key={m.year} className="relative pl-6">
                    <span className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background" />
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-primary tabular">{m.year}</span>
                      <span className="text-sm font-semibold text-foreground">{m.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{m.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Values</span>
              <h2 className="section-heading mt-5 text-foreground">
                The principles that guide
                {' '}
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">everything we build.</span>
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <article key={index} className="group bg-card p-7 sm:p-8 transition-colors hover:bg-muted/30">
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">{value.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Team</span>
              <h2 className="section-heading mt-5 text-foreground">Adhar steering committee</h2>
              <p className="section-subheading mt-6">The passionate people behind ADHAR.</p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {team.map((member, index) => (
                <Card key={index} className="card-elevated p-6 text-center">
                  <CardHeader className="p-0 mb-4">
                    <Avatar className="w-20 h-20 mx-auto ring-1 ring-border">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="text-base bg-muted text-foreground font-medium">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle className="mt-4 text-base font-semibold tracking-tight">{member.name}</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground">{member.role}</CardDescription>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{member.location}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{member.bio}</p>
                    <div className="flex justify-center gap-1 pt-4 border-t border-border/60">
                      {member.social.github && (
                        <a
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="GitHub"
                          href={member.social.github}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                      {member.social.linkedin && (
                        <a
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="LinkedIn"
                          href={member.social.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                      {member.social.twitter && (
                        <a className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Twitter" href="#">
                          <Twitter className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
                <span className="eyebrow mb-6">Get involved</span>
                <h2 className="section-heading mt-4 text-foreground">Become a contributor.</h2>
                <p className="section-subheading mt-5">
                  Join our community and help shape the future of cloud-native development.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href="https://github.com/adhar-io/adhar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <Github className="w-4 h-4" />
                    <span>Start contributing</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </a>
                  <a
                    href="/docs"
                    className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <span>View contributor guide</span>
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

export default About;
