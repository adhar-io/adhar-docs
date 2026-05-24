import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Shield, Lock, Eye, Users, FileText, Zap, CheckCircle, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const Security = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const securityFeatures = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Enterprise-Grade Security",
      description: "Comprehensive security controls built for enterprise environments",
      features: [
        "Multi-factor authentication (MFA)",
        "Single Sign-On (SSO) integration",
        "Role-based access control (RBAC)",
        "API security and rate limiting",
        "Secure development lifecycle"
      ]
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "Data Protection & Encryption",
      description: "Advanced encryption and data protection mechanisms",
      features: [
        "End-to-end encryption in transit and at rest",
        "Advanced key management",
        "Secure secrets management",
        "Data loss prevention (DLP)",
        "Privacy-by-design architecture"
      ]
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: "Monitoring & Threat Detection",
      description: "Real-time security monitoring and threat intelligence",
      features: [
        "24/7 security monitoring",
        "Automated threat detection",
        "Incident response automation",
        "Security information and event management (SIEM)",
        "Vulnerability management"
      ]
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Identity & Access Management",
      description: "Comprehensive identity governance and access management",
      features: [
        "Centralized identity management",
        "Just-in-time access provisioning",
        "Privileged access management (PAM)",
        "Access certification and reviews",
        "Zero-trust architecture"
      ]
    }
  ];

  const complianceStandards = [
    {
      name: "SOC 2 Type II",
      description: "Comprehensive security, availability, and confidentiality controls",
      status: "Certified",
      icon: <CheckCircle className="w-6 h-6 text-green-600" />
    },
    {
      name: "ISO 27001",
      description: "International standard for information security management",
      status: "Certified",
      icon: <CheckCircle className="w-6 h-6 text-green-600" />
    },
    {
      name: "GDPR",
      description: "European Union data protection and privacy regulation",
      status: "Compliant",
      icon: <CheckCircle className="w-6 h-6 text-green-600" />
    },
    {
      name: "HIPAA",
      description: "Healthcare information privacy and security standards",
      status: "Ready",
      icon: <CheckCircle className="w-6 h-6 text-blue-600" />
    },
    {
      name: "PCI DSS",
      description: "Payment card industry data security standards",
      status: "Compliant",
      icon: <CheckCircle className="w-6 h-6 text-green-600" />
    },
    {
      name: "FedRAMP",
      description: "Federal risk and authorization management program",
      status: "In Progress",
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />
    }
  ];

  const securityMetrics = [
    { label: "Security Incidents", value: "0", period: "Last 12 months" },
    { label: "Uptime SLA", value: "99.99%", period: "Guaranteed" },
    { label: "Response Time", value: "<1 hour", period: "Critical incidents" },
    { label: "Vulnerability Remediation", value: "<24 hours", period: "Critical vulnerabilities" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      <Navigation />
      
      <main className="pt-20">
        {/* Security Metrics */}
        <div className="mb-16 px-4 sm:px-6 lg:px-8 pt-8">
          <div className="grid md:grid-cols-4 gap-6">
            {securityMetrics.map((metric, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800 text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {metric.value}
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">
                    {metric.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {metric.period}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Security Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Comprehensive Security Features
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {securityFeatures.map((feature, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                      {feature.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900 dark:text-white">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-center text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Compliance Standards */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Compliance & Certifications
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complianceStandards.map((standard, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {standard.icon}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {standard.name}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`mt-1 ${
                            standard.status === 'Certified' || standard.status === 'Compliant' 
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                              : standard.status === 'Ready'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
                          }`}
                        >
                          {standard.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {standard.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Security Documentation */}
        <div className="mb-16">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-6 opacity-90" />
              <h2 className="text-3xl font-bold mb-4">
                Security Documentation & Resources
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Access comprehensive security documentation, best practices, and compliance guides 
                to ensure your implementation meets your organization's security requirements.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/docs">
                  <Button variant="secondary" size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                    <FileText className="w-5 h-5 mr-2" />
                    Security Documentation
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    <Users className="w-5 h-5 mr-2" />
                    Contact Security Team
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Best Practices */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Security Best Practices
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <Zap className="w-6 h-6 mr-2 text-yellow-600" />
                  Developer Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li>• Secure coding practices and guidelines</li>
                  <li>• Automated security testing in CI/CD</li>
                  <li>• Dependency vulnerability scanning</li>
                  <li>• Code review security checklists</li>
                  <li>• Security training and awareness</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <Shield className="w-6 h-6 mr-2 text-green-600" />
                  Infrastructure Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li>• Network segmentation and isolation</li>
                  <li>• Container and Kubernetes security</li>
                  <li>• Cloud security posture management</li>
                  <li>• Infrastructure as code security</li>
                  <li>• Continuous security monitoring</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Security;
