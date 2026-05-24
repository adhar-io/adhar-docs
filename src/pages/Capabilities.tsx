import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { Bot, Code, Zap, Shield, GitBranch, Monitor, Gauge, Users, Cloud, Database, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const Capabilities = () => {
  const [activeCapability, setActiveCapability] = useState(0);

  const capabilities = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "AI-Powered Code Generation",
      description: "Intelligent code generation and completion powered by advanced AI models",
      features: [
        "Natural language to code conversion",
        "Context-aware code suggestions",
        "Automated refactoring and optimization",
        "Multi-language support (Python, JavaScript, Go, Java, etc.)",
        "Smart error detection and fixes"
      ],
      metrics: ["70% faster development", "90% code accuracy", "50+ languages supported"]
    },
    {
      icon: <Code className="w-8 h-8" />,
      title: "Automated Testing & Quality Assurance",
      description: "Comprehensive testing automation with intelligent test generation",
      features: [
        "Auto-generated unit and integration tests",
        "Continuous quality monitoring",
        "Code coverage analysis",
        "Performance benchmarking",
        "Security vulnerability scanning"
      ],
      metrics: ["95% test coverage", "80% fewer bugs", "60% faster QA cycles"]
    },
    {
      icon: <GitBranch className="w-8 h-8" />,
      title: "Intelligent Deployment Pipelines",
      description: "Smart CI/CD pipelines with automated deployment strategies",
      features: [
        "Zero-downtime deployments",
        "Automated rollback mechanisms",
        "Multi-environment management",
        "Canary and blue-green deployments",
        "Infrastructure as Code integration"
      ],
      metrics: ["99.9% uptime", "5x faster deployments", "Zero failed deployments"]
    },
    {
      icon: <Monitor className="w-8 h-8" />,
      title: "Real-time Monitoring & Observability",
      description: "Comprehensive platform monitoring with AI-driven insights",
      features: [
        "Real-time performance metrics",
        "Distributed tracing",
        "Log aggregation and analysis",
        "Alerting and incident management",
        "Predictive failure detection"
      ],
      metrics: ["100% system visibility", "90% faster issue resolution", "Proactive alerting"]
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Security & Compliance Automation",
      description: "Built-in security controls with automated compliance monitoring",
      features: [
        "Automated security scanning",
        "Compliance reporting (SOC 2, GDPR, HIPAA)",
        "Secrets management",
        "Access control and audit trails",
        "Threat detection and response"
      ],
      metrics: ["100% compliance coverage", "Zero security incidents", "24/7 threat monitoring"]
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Team Collaboration & Governance",
      description: "Advanced collaboration tools with intelligent workflow management",
      features: [
        "Role-based access control",
        "Automated code reviews",
        "Team productivity analytics",
        "Knowledge sharing platforms",
        "Workflow automation"
      ],
      metrics: ["300% team productivity", "50% faster onboarding", "100% code review coverage"]
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCapability((prev) => (prev + 1) % capabilities.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
          <div className="max-w-7xl mx-auto relative">
            {/* Header */}
            <div className="text-center mb-16">
              <Badge className="mb-6 px-5 py-2 bg-primary/10 text-primary border-primary/20">
                <Zap className="w-4 h-4 mr-2" />
                Core Platform Capabilities
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                <span className="block mb-2">Intelligent Development</span>
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Platform Capabilities
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                ADHAR combines cutting-edge AI technology with proven DevOps practices to deliver 
                unprecedented development velocity, quality, and security for modern engineering teams.
              </p>
            </div>

            {/* Interactive Capabilities Showcase */}
            <div className="mb-16">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-8">
                    Explore Our Core Capabilities
                  </h2>
                  <div className="space-y-4">
                    {capabilities.map((capability, index) => (
                      <Card 
                        key={index}
                        className={`cursor-pointer transition-all duration-300 ${
                          activeCapability === index 
                            ? 'ring-2 ring-primary shadow-lg' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setActiveCapability(index)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-lg ${
                              activeCapability === index 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {capability.icon}
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {capability.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {capability.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="lg:pl-8">
                  <Card className="shadow-xl">
                    <CardHeader>
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 bg-primary rounded-lg text-primary-foreground">
                          {capabilities[activeCapability].icon}
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {capabilities[activeCapability].title}
                          </CardTitle>
                          <CardDescription>
                            {capabilities[activeCapability].description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold mb-3">Key Features:</h4>
                          <ul className="space-y-2">
                            {capabilities[activeCapability].features.map((feature, idx) => (
                              <li key={idx} className="flex items-center text-muted-foreground">
                                <Zap className="w-4 h-4 mr-2 text-primary" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-3">Performance Metrics:</h4>
                          <div className="flex flex-wrap gap-2">
                            {capabilities[activeCapability].metrics.map((metric, idx) => (
                              <Badge key={idx} variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Architecture Integration */}
            <div className="mb-16">
              <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardContent className="p-12 text-center">
                  <Cloud className="w-16 h-16 mx-auto mb-6 opacity-90" />
                  <h2 className="text-3xl font-bold mb-4">
                    Seamlessly Integrated Architecture
                  </h2>
                  <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
                    All capabilities work together through our unified platform architecture, 
                    providing a cohesive development experience from code to production.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/architecture">
                      <Button variant="secondary" size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                        <Database className="w-5 h-5 mr-2" />
                        View Architecture
                      </Button>
                    </Link>
                    <Link to="/integrations">
                      <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                        <Lock className="w-5 h-5 mr-2" />
                        Explore Integrations
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Technical Specifications */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold mb-8 text-center">
                Technical Specifications
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Gauge className="w-6 h-6 mr-2 text-blue-600" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Sub-second response times</li>
                      <li>• 99.99% availability SLA</li>
                      <li>• Auto-scaling capabilities</li>
                      <li>• Global CDN distribution</li>
                      <li>• Real-time collaboration</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="w-6 h-6 mr-2 text-green-600" />
                      Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• SOC 2 Type II compliant</li>
                      <li>• End-to-end encryption</li>
                      <li>• Role-based access control</li>
                      <li>• Audit logging</li>
                      <li>• Penetration testing</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-6 h-6 mr-2 text-purple-600" />
                      Scalability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Unlimited team members</li>
                      <li>• Multi-tenancy support</li>
                      <li>• Horizontal scaling</li>
                      <li>• Global deployment</li>
                      <li>• Enterprise-grade infrastructure</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Capabilities;
