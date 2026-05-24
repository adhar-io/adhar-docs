import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Moon,
  Sun,
  ExternalLink,
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
  Building
} from 'lucide-react';

const Careers = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const jobOpenings = [
    {
      title: "Senior Software Engineer - Platform",
      department: "Engineering",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      level: "Senior",
      description: "Join our platform team to build the next generation of cloud-native development tools."
    },
    {
      title: "DevOps Engineer - Kubernetes",
      department: "Infrastructure",
      location: "New York, NY / Remote",
      type: "Full-time",
      level: "Mid-Senior",
      description: "Help scale our Kubernetes infrastructure and improve developer experience."
    },
    {
      title: "Product Manager - Developer Experience",
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
    {
      icon: Heart,
      title: "Health & Wellness",
      description: "Comprehensive health insurance, mental health support, and wellness programs"
    },
    {
      icon: Globe,
      title: "Remote-First Culture",
      description: "Work from anywhere with flexible hours and async-first collaboration"
    },
    {
      icon: TrendingUp,
      title: "Growth & Learning",
      description: "Professional development budget, conference attendance, and mentorship programs"
    },
    {
      icon: Users,
      title: "Inclusive Team",
      description: "Diverse, welcoming team that values different perspectives and backgrounds"
    },
    {
      icon: Zap,
      title: "Impact & Innovation",
      description: "Work on cutting-edge technology that impacts millions of developers worldwide"
    },
    {
      icon: Building,
      title: "Competitive Package",
      description: "Competitive salary, equity, unlimited PTO, and generous parental leave"
    }
  ];

  const values = [
    {
      title: "Innovation First",
      description: "We push boundaries and embrace new technologies to solve complex problems."
    },
    {
      title: "Developer-Centric",
      description: "Everything we build is designed with the developer experience in mind."
    },
    {
      title: "Open Source",
      description: "We believe in the power of open source and contribute back to the community."
    },
    {
      title: "Global Impact",
      description: "Our work enables developers worldwide to build better software faster."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      {/* Sticky Header */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/c2bbb6a6-c383-4f93-953e-1a233d76654b.png" 
                alt="ADHAR Logo" 
                className="w-8 h-8"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ADHAR
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Home
              </Link>
              <Link to="/about" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                About
              </Link>
              <span className="text-gray-900 dark:text-white font-medium">Careers</span>
              <Link to="/contact" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Contact
              </Link>
              <Link to="/docs" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Documentation
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleDarkMode}
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 p-2"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="mb-6">
            <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-0 dark:from-blue-900 dark:to-purple-900 dark:text-blue-300">
              <Briefcase className="w-4 h-4 mr-2" />
              Join Our Team
            </Badge>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Build the Future of <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Cloud-Native</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
            Join a team of passionate engineers, designers, and innovators who are revolutionizing how developers build and deploy applications. Help us make Kubernetes and cloud-native development accessible to everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Star className="w-4 h-4 mr-2" />
              View Open Positions
            </Button>
            <Button variant="outline">
              Learn About Our Culture
            </Button>
          </div>
        </div>

        {/* Company Values */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Our Values
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              The principles that guide everything we do and shape our company culture.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="text-center border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-gray-900 dark:text-white">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Work With Us
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              We offer more than just a job – we provide an environment where you can grow, innovate, and make a real impact.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-3 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-900 dark:text-white">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Job Openings */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Open Positions
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Find your next opportunity to make an impact in the cloud-native ecosystem.
            </p>
          </div>

          <div className="space-y-4">
            {jobOpenings.map((job, index) => (
              <Card key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {job.title}
                        </h3>
                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {job.department}
                        </Badge>
                        <Badge variant="outline">
                          {job.level}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        {job.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {job.location}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {job.type}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 lg:mt-0 lg:ml-6">
                      <Button className="w-full lg:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white border-0">
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">Don't See the Right Role?</h3>
              <p className="text-blue-100 dark:text-blue-200 mb-6 max-w-2xl mx-auto">
                We're always looking for talented people to join our team. Send us your resume and tell us how you'd like to contribute to the future of cloud-native development.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/contact">
                  <Button variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                    <Users className="w-4 h-4 mr-2" />
                    Get in Touch
                  </Button>
                </Link>
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  <Code className="w-4 h-4 mr-2" />
                  View Our Culture
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Careers;
