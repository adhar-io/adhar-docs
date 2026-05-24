import React, { useState } from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Github, 
  Twitter, 
  Linkedin, 
  Globe, 
  Star, 
  GitCommit, 
  Users, 
  Search,
  Heart,
  Code,
  MapPin,
  TrendingUp,
  Medal
} from 'lucide-react';

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
    social: {
      github: "alexchen",
      twitter: "alex_codes",
      linkedin: "alexchen-dev",
      website: "alexchen.dev"
    }
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
    social: {
      github: "sarahmitchell",
      twitter: "sarah_devops",
      linkedin: "sarah-mitchell-devops"
    }
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
    social: {
      github: "marcusrod",
      linkedin: "marcus-rodriguez-sec"
    }
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
    social: {
      github: "emilyzhang",
      twitter: "emily_designs",
      linkedin: "emilyzhang-design",
      website: "emilyzhang.design"
    }
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
    social: {
      github: "davidkumar",
      linkedin: "david-kumar-backend"
    }
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
    social: {
      github: "lisathompson",
      twitter: "lisa_docs",
      linkedin: "lisa-thompson-writer"
    }
  }
];

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="max-w-4xl mx-auto text-center relative">
            <Badge className="mb-4 px-4 py-1 bg-primary/10 text-primary border-primary/20 animate-fade-in-up">
              <Users className="w-3 h-3 mr-1" />
              Open Source Community
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Our Amazing Contributors
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up">
              Meet the incredible developers, designers, and engineers who are building ADHAR together. 
              Every contribution makes a difference.
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/20 hover:shadow-lg transition-all">
                <Users className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                <div className="text-4xl font-bold text-foreground mb-2">{contributors.length}</div>
                <div className="text-sm text-muted-foreground">Active Contributors</div>
              </Card>
              <Card className="text-center p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/20 hover:shadow-lg transition-all">
                <GitCommit className="w-8 h-8 mx-auto mb-3 text-purple-600" />
                <div className="text-4xl font-bold text-foreground mb-2">{totalContributions.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Contributions</div>
              </Card>
              <Card className="text-center p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/20 hover:shadow-lg transition-all">
                <Code className="w-8 h-8 mx-auto mb-3 text-green-600" />
                <div className="text-4xl font-bold text-foreground mb-2">{totalPRs}</div>
                <div className="text-sm text-muted-foreground">Pull Requests</div>
              </Card>
              <Card className="text-center p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 border-orange-500/20 hover:shadow-lg transition-all">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-orange-600" />
                <div className="text-4xl font-bold text-foreground mb-2">12+</div>
                <div className="text-sm text-muted-foreground">Countries</div>
              </Card>
            </div>
          </div>
        </section>

        {/* Featured Contributors */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 px-4 py-1 bg-primary/10 text-primary border-primary/20">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Featured Contributors
              </Badge>
              <h2 className="text-4xl font-bold mb-4 text-foreground">Top Contributors</h2>
              <p className="text-xl text-muted-foreground">
                Recognizing our most active community members
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {featuredContributors.map((contributor) => (
                <Card key={contributor.id} className="group hover:shadow-2xl transition-all duration-500 border-2 hover:border-primary/30 bg-card/80 backdrop-blur-sm overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"></div>
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <div className="relative">
                      <Avatar className="w-20 h-20 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
                        <AvatarImage src={contributor.avatar} alt={contributor.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {contributor.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-2 -right-2">
                        <Medal className="w-6 h-6 text-yellow-500 fill-current" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{contributor.name}</CardTitle>
                      <Badge variant="secondary" className="mb-2">{contributor.role}</Badge>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-3 h-3" />
                        <span>{contributor.location}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{contributor.bio}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{contributor.contributions}</div>
                        <div className="text-xs text-muted-foreground">Contributions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{contributor.pullRequests}</div>
                        <div className="text-xs text-muted-foreground">Pull Requests</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{contributor.issues}</div>
                        <div className="text-xs text-muted-foreground">Issues</div>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex flex-wrap gap-2 mb-4">
                      {contributor.expertise.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {contributor.social.github && (
                        <Button variant="ghost" size="icon" className="hover:text-primary">
                          <Github className="w-4 h-4" />
                        </Button>
                      )}
                      {contributor.social.twitter && (
                        <Button variant="ghost" size="icon" className="hover:text-primary">
                          <Twitter className="w-4 h-4" />
                        </Button>
                      )}
                      {contributor.social.linkedin && (
                        <Button variant="ghost" size="icon" className="hover:text-primary">
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      )}
                      {contributor.social.website && (
                        <Button variant="ghost" size="icon" className="hover:text-primary">
                          <Globe className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* All Contributors */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-6 text-foreground">All Contributors</h2>
              
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search contributors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Button
                      key={role}
                      variant={selectedRole === role ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRole(role)}
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Contributors Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContributors.map((contributor) => (
                  <Card key={contributor.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/30 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="text-center">
                      <Avatar className="w-24 h-24 mx-auto mb-4 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                        <AvatarImage src={contributor.avatar} alt={contributor.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl">
                          {contributor.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-lg mb-1">{contributor.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">{contributor.role}</Badge>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mt-2">
                        <MapPin className="w-3 h-3" />
                        <span>{contributor.location}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2">
                        {contributor.bio}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center mb-4">
                        <div>
                          <div className="text-lg font-bold text-primary">{contributor.contributions}</div>
                          <div className="text-xs text-muted-foreground">Commits</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-primary">{contributor.pullRequests}</div>
                          <div className="text-xs text-muted-foreground">PRs</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-primary">{contributor.issues}</div>
                          <div className="text-xs text-muted-foreground">Issues</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-4 justify-center">
                        {contributor.expertise.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex justify-center gap-2">
                        {contributor.social.github && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                            <Github className="w-3 h-3" />
                          </Button>
                        )}
                        {contributor.social.twitter && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                            <Twitter className="w-3 h-3" />
                          </Button>
                        )}
                        {contributor.social.linkedin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                            <Linkedin className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
          <div className="max-w-4xl mx-auto text-center">
            <Heart className="w-16 h-16 mx-auto mb-6 text-white fill-current" />
            <h2 className="text-4xl font-bold text-white mb-6">Become a Contributor</h2>
            <p className="text-xl text-white/90 mb-8">
              Join our community of developers and help shape the future of cloud-native development
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="group">
                <Github className="w-4 h-4 mr-2" />
                Start Contributing
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                View Contributor Guide
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contributors;
