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
      name: "Sarah Chen",
      role: "CEO & Co-founder",
      avatar: "/avatars/professional-woman-1.jpg",
      bio: "Former engineering leader at major tech companies, passionate about developer productivity.",
      location: "San Francisco, CA",
      social: {
        github: "sarahchen",
        linkedin: "sarah-chen-ceo",
        twitter: "sarah_builds"
      }
    },
    {
      name: "Marcus Rodriguez",
      role: "CTO & Co-founder",
      avatar: "/avatars/professional-man-2.jpg",
      bio: "Systems architect with 15+ years experience building scalable platforms.",
      location: "Austin, TX",
      social: {
        github: "marcusrod",
        linkedin: "marcus-rodriguez-cto"
      }
    },
    {
      name: "Emily Zhang",
      role: "Head of Product",
      avatar: "/avatars/professional-woman-2.jpg",
      bio: "Product strategist focused on creating intuitive developer experiences.",
      location: "Seattle, WA",
      social: {
        github: "emilyzhang",
        linkedin: "emily-zhang-product",
        twitter: "emily_products"
      }
    }
  ];

  const stats = [
    { label: "Founded", value: "2022", icon: Sparkles },
    { label: "Team Members", value: "50+", icon: Users },
    { label: "Countries", value: "12", icon: Globe },
    { label: "Funding Raised", value: "$25M", icon: Rocket }
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

        {/* Values */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">Values</span>
              <h2 className="section-heading mt-5 text-foreground">
                The principles that guide
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
              <h2 className="section-heading mt-5 text-foreground">Leadership team.</h2>
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
                        <a className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="GitHub" href="#">
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                      {member.social.linkedin && (
                        <a className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="LinkedIn" href="#">
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
                <span className="eyebrow mb-6">Join us</span>
                <h2 className="section-heading mt-4 text-foreground">Build the future with us.</h2>
                <p className="section-subheading mt-5">
                  We're always looking for talented individuals who share our passion for innovation.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <span>View open positions</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <Award className="w-4 h-4 text-muted-foreground" />
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

export default About;
