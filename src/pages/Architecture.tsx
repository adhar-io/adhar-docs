
import React from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import ModernArchitectureDiagram from '@/components/ModernArchitectureDiagram';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Cloud, 
  Shield, 
  Zap, 
  Network, 
  Code, 
  Layers,
  GitBranch,
  Monitor,
  Lock,
  Activity,
  Server
} from 'lucide-react';

const Architecture = () => {
  const layers = [
    {
      title: "Interface Layer",
      icon: Monitor,
      description: "Modern web interfaces and APIs for seamless user interaction",
      technologies: ["React", "TypeScript", "Tailwind CSS", "REST APIs", "GraphQL"],
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Application Layer",
      icon: Code,
      description: "Core business logic and application orchestration",
      technologies: ["Node.js", "Python", "Go", "Microservices", "Event Streaming"],
      color: "from-green-500 to-green-600"
    },
    {
      title: "Integration Layer",
      icon: Network,
      description: "Seamless connections with external systems and services",
      technologies: ["API Gateway", "Message Queues", "Webhooks", "OAuth", "SAML"],
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Data Layer",
      icon: Database,
      description: "Scalable data storage and processing infrastructure",
      technologies: ["PostgreSQL", "Redis", "Elasticsearch", "Data Lakes", "ETL Pipelines"],
      color: "from-orange-500 to-orange-600"
    },
    {
      title: "Infrastructure Layer",
      icon: Cloud,
      description: "Cloud-native infrastructure with auto-scaling capabilities",
      technologies: ["Kubernetes", "Docker", "AWS/GCP/Azure", "Terraform", "CI/CD"],
      color: "from-red-500 to-red-600"
    },
    {
      title: "Security Layer",
      icon: Shield,
      description: "Enterprise-grade security across all layers",
      technologies: ["Zero Trust", "RBAC", "Encryption", "Audit Logs", "Compliance"],
      color: "from-gray-500 to-gray-600"
    }
  ];

  const principles = [
    {
      title: "Cloud Native",
      description: "Built for the cloud with containerization and orchestration",
      icon: Cloud
    },
    {
      title: "Microservices",
      description: "Modular architecture enabling independent scaling and deployment",
      icon: Layers
    },
    {
      title: "Event-Driven",
      description: "Asynchronous communication for better performance and reliability",
      icon: Zap
    },
    {
      title: "API-First",
      description: "Everything accessible through well-designed APIs",
      icon: Network
    },
    {
      title: "Security by Design",
      description: "Security integrated at every layer, not bolted on",
      icon: Lock
    },
    {
      title: "Observable",
      description: "Comprehensive monitoring, logging, and tracing",
      icon: Activity
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      <Navigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                Platform Architecture
              </Badge>
              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                Enterprise Ready
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Platform Architecture
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Discover how ADHAR's cloud-native, microservices architecture enables 
              scalable, secure, and intelligent development workflows.
            </p>
          </div>
        </section>

        {/* Architecture Diagram */}
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Card className="mb-12">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">System Overview</CardTitle>
                <CardDescription>
                  Interactive architecture diagram showing the complete ADHAR platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ModernArchitectureDiagram />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Architecture Layers */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Architecture Layers
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Our layered architecture ensures separation of concerns, scalability, and maintainability.
              </p>
            </div>
            
            <div className="space-y-6">
              {layers.map((layer, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className={`h-2 bg-gradient-to-r ${layer.color}`}></div>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${layer.color}`}>
                        <layer.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          {layer.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          {layer.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {layer.technologies.map((tech, techIndex) => (
                            <Badge key={techIndex} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Design Principles */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Design Principles
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Core principles that guide our architectural decisions and ensure platform reliability.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {principles.map((principle, index) => (
                <Card key={index} className="p-6 text-center hover:shadow-lg transition-all duration-300">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full">
                      <principle.icon className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {principle.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {principle.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Technical Specifications */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Technical Specifications
              </h2>
            </div>
            
            <Tabs defaultValue="infrastructure" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="infrastructure" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      Infrastructure Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Compute</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• Kubernetes orchestration</li>
                          <li>• Auto-scaling based on demand</li>
                          <li>• Multi-zone deployment</li>
                          <li>• Container-native architecture</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Storage</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• Distributed file systems</li>
                          <li>• Automated backups</li>
                          <li>• Data encryption at rest</li>
                          <li>• Multi-region replication</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="security" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Security Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Authentication</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• Multi-factor authentication</li>
                          <li>• SSO integration</li>
                          <li>• OAuth 2.0 / SAML</li>
                          <li>• Role-based access control</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Data Protection</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• End-to-end encryption</li>
                          <li>• API rate limiting</li>
                          <li>• Audit logging</li>
                          <li>• Vulnerability scanning</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="performance" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Response Times</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• API: &lt; 100ms average</li>
                          <li>• Page load: &lt; 2 seconds</li>
                          <li>• Build times: &lt; 5 minutes</li>
                          <li>• Deployment: &lt; 10 minutes</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Scalability</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• 99.9% uptime SLA</li>
                          <li>• Horizontal auto-scaling</li>
                          <li>• Global CDN distribution</li>
                          <li>• Load balancing</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="compliance" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Compliance & Standards
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Certifications</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• SOC 2 Type II</li>
                          <li>• ISO 27001</li>
                          <li>• GDPR compliant</li>
                          <li>• HIPAA ready</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Data Governance</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• Data retention policies</li>
                          <li>• Right to be forgotten</li>
                          <li>• Data portability</li>
                          <li>• Privacy by design</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Ready to Build on ADHAR?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Experience the power of our architecture firsthand. Start building with our 
                enterprise-grade platform today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Start Building
                </Button>
                <Button variant="outline">
                  <Monitor className="w-4 h-4 mr-2" />
                  View Demo
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Architecture;
