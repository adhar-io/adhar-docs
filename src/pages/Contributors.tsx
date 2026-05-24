import React, { useState } from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Globe,
  Star,
  GitCommit,
  Users,
  Search,
  Code,
  MapPin,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Github, Twitter, Linkedin } from '@/components/brand-icons';

const contributors = [
  {
    id: 1,
    name: "Alex Chen",
    role: "Core Maintainer",
    avatar: "/avatars/professional-man-1.jpg",
    bio: "Full-stack developer passionate about cloud-native technologies and open source.",
    location: "San Francisco, CA",
    joinDate: "2022-01",
    contributions: 1247,
    pullRequests: 89,
    issues: 23,
    expertise: ["TypeScript", "React", "Docker", "Kubernetes"],
    featured: true,
    social: { github: "alexchen", twitter: "alex_codes", linkedin: "alexchen-dev", website: "alexchen.dev" }
  },
  {
    id: 2,
    name: "Sarah Mitchell",
    role: "DevOps Engineer",
    avatar: "/avatars/professional-woman-1.jpg",
    bio: "Infrastructure automation specialist with expertise in CI/CD and cloud platforms.",
    location: "London, UK",
    joinDate: "2022-03",
    contributions: 892,
    pullRequests: 67,
    issues: 15,
    expertise: ["AWS", "Terraform", "Jenkins", "Python"],
    featured: true,
    social: { github: "sarahmitchell", twitter: "sarah_devops", linkedin: "sarah-mitchell-devops" }
  },
  {
    id: 3,
    name: "Marcus Rodriguez",
    role: "Security Specialist",
    avatar: "/avatars/professional-man-2.jpg",
    bio: "Security-first developer focused on building secure, scalable applications.",
    location: "Austin, TX",
    joinDate: "2022-06",
    contributions: 634,
    pullRequests: 45,
    issues: 31,
    expertise: ["Security", "Go", "OAuth", "RBAC"],
    featured: false,
    social: { github: "marcusrod", linkedin: "marcus-rodriguez-sec" }
  },
  {
    id: 4,
    name: "Emily Zhang",
    role: "UI/UX Designer",
    avatar: "/avatars/professional-woman-2.jpg",
    bio: "Designer and frontend developer creating beautiful, accessible user experiences.",
    location: "Toronto, Canada",
    joinDate: "2022-08",
    contributions: 421,
    pullRequests: 38,
    issues: 12,
    expertise: ["Design Systems", "React", "Tailwind", "Figma"],
    featured: false,
    social: { github: "emilyzhang", twitter: "emily_designs", linkedin: "emilyzhang-design", website: "emilyzhang.design" }
  },
  {
    id: 5,
    name: "David Kumar",
    role: "Backend Engineer",
    avatar: "/avatars/professional-man-3.jpg",
    bio: "Backend systems architect with deep expertise in microservices and databases.",
    location: "Bangalore, India",
    joinDate: "2022-11",
    contributions: 756,
    pullRequests: 52,
    issues: 8,
    expertise: ["Node.js", "PostgreSQL", "Redis", "GraphQL"],
    featured: false,
    social: { github: "davidkumar", linkedin: "david-kumar-backend" }
  },
  {
    id: 6,
    name: "Lisa Thompson",
    role: "Documentation Lead",
    avatar: "/avatars/professional-woman-3.jpg",
    bio: "Technical writer making complex concepts accessible to developers worldwide.",
    location: "Berlin, Germany",
    joinDate: "2023-01",
    contributions: 512,
    pullRequests: 34,
    issues: 19,
    expertise: ["Documentation", "Markdown", "API Design", "UX Writing"],
    featured: false,
    social: { github: "lisathompson", twitter: "lisa_docs", linkedin: "lisa-thompson-writer" }
  }
];

const initialsFor = (name: string) => name.split(' ').map(n => n[0]).join('');

const SocialButtons: React.FC<{ social: typeof contributors[number]['social']; size?: 'sm' | 'md' }> = ({ social, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex gap-1">
      {social.github && (
        <a className={`inline-flex ${sizeClass} items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors`} aria-label="GitHub" href="#">
          <Github className={iconClass} />
        </a>
      )}
      {social.twitter && (
        <a className={`inline-flex ${sizeClass} items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors`} aria-label="Twitter" href="#">
          <Twitter className={iconClass} />
        </a>
      )}
      {social.linkedin && (
        <a className={`inline-flex ${sizeClass} items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors`} aria-label="LinkedIn" href="#">
          <Linkedin className={iconClass} />
        </a>
      )}
      {social.website && (
        <a className={`inline-flex ${sizeClass} items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors`} aria-label="Website" href="#">
          <Globe className={iconClass} />
        </a>
      )}
    </div>
  );
};

const Contributors = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');

  const roles = ['All', 'Core Maintainer', 'DevOps Engineer', 'Security Specialist', 'UI/UX Designer', 'Backend Engineer', 'Documentation Lead'];

  const filteredContributors = contributors.filter(contributor => {
    const matchesSearch = contributor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contributor.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'All' || contributor.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const featuredContributors = contributors.filter(c => c.featured);
  const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
  const totalPRs = contributors.reduce((sum, c) => sum + c.pullRequests, 0);

  const stats = [
    { icon: Users, value: contributors.length.toString(), label: 'Active contributors' },
    { icon: GitCommit, value: totalContributions.toLocaleString(), label: 'Total contributions' },
    { icon: Code, value: totalPRs.toString(), label: 'Pull requests' },
    { icon: TrendingUp, value: '12+', label: 'Countries' },
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
            <span className="eyebrow mb-5">Community</span>
            <h1 className="section-heading mt-5 text-foreground">
              Our amazing
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">contributors.</span>
            </h1>
            <p className="section-subheading mt-6">
              Meet the developers, designers, and engineers building ADHAR together.
              Every contribution makes a difference.
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

        {/* Featured */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-12">
              <span className="eyebrow mb-5"><Star className="w-3 h-3 mr-1 fill-current" />Featured</span>
              <h2 className="section-heading mt-5 text-foreground">Top contributors.</h2>
              <p className="section-subheading mt-5">
                Recognizing our most active community members.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {featuredContributors.map((contributor) => (
                <article key={contributor.id} className="card-elevated p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 ring-1 ring-border flex-shrink-0">
                      <AvatarImage src={contributor.avatar} alt={contributor.name} />
                      <AvatarFallback className="bg-muted text-foreground font-medium">
                        {initialsFor(contributor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground tracking-tight">{contributor.name}</h3>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5">{contributor.role}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{contributor.location}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{contributor.bio}</p>

                  <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/50">
                    <div className="bg-card text-center px-3 py-3">
                      <div className="text-base font-semibold text-foreground tabular">{contributor.contributions}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Commits</div>
                    </div>
                    <div className="bg-card text-center px-3 py-3">
                      <div className="text-base font-semibold text-foreground tabular">{contributor.pullRequests}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">PRs</div>
                    </div>
                    <div className="bg-card text-center px-3 py-3">
                      <div className="text-base font-semibold text-foreground tabular">{contributor.issues}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Issues</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {contributor.expertise.map((skill, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/60">
                    <SocialButtons social={contributor.social} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* All */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="mb-10">
              <span className="eyebrow mb-5">Everyone</span>
              <h2 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">All contributors.</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search contributors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`inline-flex items-center h-9 px-3 rounded-full text-xs font-medium transition-colors ${
                      selectedRole === role
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground border border-border/70 hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContributors.map((contributor) => (
                <article key={contributor.id} className="card-elevated p-6 text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-4 ring-1 ring-border">
                    <AvatarImage src={contributor.avatar} alt={contributor.name} />
                    <AvatarFallback className="bg-muted text-foreground font-medium">
                      {initialsFor(contributor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-base font-semibold text-foreground tracking-tight">{contributor.name}</h3>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5">{contributor.role}</div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{contributor.location}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-2">{contributor.bio}</p>

                  <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/50">
                    <div className="bg-card text-center px-2 py-2">
                      <div className="text-sm font-semibold text-foreground tabular">{contributor.contributions}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Commits</div>
                    </div>
                    <div className="bg-card text-center px-2 py-2">
                      <div className="text-sm font-semibold text-foreground tabular">{contributor.pullRequests}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">PRs</div>
                    </div>
                    <div className="bg-card text-center px-2 py-2">
                      <div className="text-sm font-semibold text-foreground tabular">{contributor.issues}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Issues</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                    {contributor.expertise.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/60 flex justify-center">
                    <SocialButtons social={contributor.social} size="sm" />
                  </div>
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
                <span className="eyebrow mb-6">Get involved</span>
                <h2 className="section-heading mt-4 text-foreground">Become a contributor.</h2>
                <p className="section-subheading mt-5">
                  Join our community and help shape the future of cloud-native development.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <Github className="w-4 h-4" />
                    <span>Start contributing</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <span>View contributor guide</span>
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

export default Contributors;
