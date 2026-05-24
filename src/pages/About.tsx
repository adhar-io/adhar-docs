import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Target, 
  Users, 
  Globe, 
  Shield,
  Award,
  Building,
  MapPin,
  Github,
  Linkedin,
  Twitter,
  Sparkles,
  Rocket,
  Heart
} from 'lucide-react';

const About = () => {
  const values = [
    {
      icon: Target,
      title: "Innovation First",
      description: "We push the boundaries of what's possible in cloud-native development, constantly exploring new technologies and methodologies.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Our platform is built by developers, for developers. We listen to our community and evolve based on real needs.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Globe,
      title: "Global Impact",
      description: "We're building tools that empower developers worldwide to create solutions that matter.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Shield,
      title: "Security by Design",
      description: "Every feature is built with security as a foundation, not an afterthought.",
      gradient: "from-orange-500 to-red-500"
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
      
      <main className="pt-20">
        {/* Hero Section with Animated Gradient */}
        <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="max-w-4xl mx-auto text-center relative">
            <Badge className="mb-4 px-4 py-1 bg-primary/10 text-primary border-primary/20 animate-fade-in-up">
              <Building className="w-3 h-3 mr-1" />
              About ADHAR
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Building the Future of
              </span>
              <br />
              <span className="text-foreground">Cloud-Native Development</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up">
              We're on a mission to transform how software is built, deployed, and scaled. 
              ADHAR is the open cloud-native foundation that empowers teams to innovate faster.
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card 
                    key={index} 
                    className="text-center p-6 border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card/50 backdrop-blur-sm"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex justify-center mb-3">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-foreground mb-2">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-foreground">Our Core Values</h2>
              <p className="text-xl text-muted-foreground">
                The principles that guide everything we build
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <Card 
                    key={index} 
                    className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-2 hover:border-primary/30 bg-card/80 backdrop-blur-sm overflow-hidden"
                  >
                    <div className={`h-1 w-full bg-gradient-to-r ${value.gradient}`}></div>
                    <CardHeader>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`p-4 rounded-xl bg-gradient-to-r ${value.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl">{value.title}</CardTitle>
                      </div>
                      <CardDescription className="text-base leading-relaxed">
                        {value.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4 px-4 py-1 bg-primary/10 text-primary border-primary/20">
                <Heart className="w-3 h-3 mr-1 fill-current" />
                Meet the Team
              </Badge>
              <h2 className="text-4xl font-bold mb-4 text-foreground">Leadership Team</h2>
              <p className="text-xl text-muted-foreground">
                The passionate people behind ADHAR
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <Card 
                  key={index} 
                  className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-2 hover:border-primary/30 overflow-hidden bg-card/80 backdrop-blur-sm"
                >
                  <CardHeader className="text-center">
                    <div className="relative inline-block mb-4">
                      <Avatar className="w-32 h-32 mx-auto ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground shadow-lg">
                          {member.role.split(' ')[0]}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-xl mb-1">{member.name}</CardTitle>
                    <CardDescription className="text-sm mb-2">{member.role}</CardDescription>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-4">
                      <MapPin className="w-3 h-3" />
                      <span>{member.location}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm text-center mb-4 leading-relaxed">
                      {member.bio}
                    </p>
                    <div className="flex justify-center gap-3">
                      {member.social.github && (
                        <Button variant="ghost" size="icon" className="hover:text-primary">
                          <Github className="w-4 h-4" />
                        </Button>
                      )}
                      {member.social.linkedin && (
                        <Button variant="ghost" size="icon" className="hover:text-primary">
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      )}
                      {member.social.twitter && (
                        <Button variant="ghost" size="icon" className="hover:text-primary">
                          <Twitter className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Join Us on Our Mission</h2>
            <p className="text-xl text-white/90 mb-8">
              We're always looking for talented individuals who share our passion for innovation
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="group">
                View Open Positions
                <Award className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                Learn More About Us
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
