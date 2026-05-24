
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, FileText, Lock, Award, Users, Globe, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Compliance = () => {
  const certifications = [
    { 
      name: "SOC 2 Type II", 
      status: "Certified", 
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      description: "Comprehensive security, availability, and confidentiality controls",
      icon: <Shield className="w-8 h-8 text-green-600" />
    },
    { 
      name: "ISO 27001", 
      status: "Certified", 
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      description: "International standard for information security management",
      icon: <Award className="w-8 h-8 text-green-600" />
    },
    { 
      name: "GDPR", 
      status: "Compliant", 
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      description: "European Union data protection and privacy regulation",
      icon: <Globe className="w-8 h-8 text-blue-600" />
    },
    { 
      name: "HIPAA", 
      status: "Ready", 
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      description: "Healthcare information privacy and security standards",
      icon: <Users className="w-8 h-8 text-purple-600" />
    },
    { 
      name: "PCI DSS", 
      status: "Level 1", 
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      description: "Payment card industry data security standards",
      icon: <Lock className="w-8 h-8 text-orange-600" />
    },
    { 
      name: "FedRAMP", 
      status: "In Progress", 
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      description: "Federal risk and authorization management program",
      icon: <AlertCircle className="w-8 h-8 text-yellow-600" />
    }
  ];

  const auditReports = [
    { name: "SOC 2 Type II Report", year: "2024", status: "Available" },
    { name: "Penetration Test Report", year: "2024", status: "Available" },
    { name: "ISO 27001 Certificate", year: "2024", status: "Available" },
    { name: "GDPR Compliance Assessment", year: "2024", status: "Available" }
  ];

  const complianceMetrics = [
    { label: "Security Incidents", value: "0", period: "Last 12 months", color: "text-green-600" },
    { label: "Audit Findings", value: "0 Critical", period: "2024 Audits", color: "text-green-600" },
    { label: "Compliance Score", value: "98%", period: "Overall Rating", color: "text-blue-600" },
    { label: "Certifications", value: "4 Active", period: "Current Status", color: "text-purple-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      <Navigation />
      
      <main className="pt-20">
        {/* Header */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                Compliance & Certifications
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto">
              ADHAR maintains the highest standards of security and compliance to protect your data and meet regulatory requirements across industries.
            </p>
          </div>
        </section>

        {/* Compliance Metrics */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {complianceMetrics.map((metric, index) => (
                <Card key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-center">
                  <CardContent className="p-6">
                    <div className={`text-3xl font-bold mb-2 ${metric.color}`}>
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
        </section>

        {/* Certifications Grid */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
              Security Certifications & Standards
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {certifications.map((cert, index) => (
                <Card key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        {cert.icon}
                      </div>
                      <Badge className={cert.color}>{cert.status}</Badge>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {cert.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {cert.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Audit Reports */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
              Audit Reports & Documentation
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {auditReports.map((report, index) => (
                <Card key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="w-8 h-8 text-blue-600 mr-4" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {report.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {report.year}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mr-3">
                          {report.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Request Access
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance Framework */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 mx-auto mb-6 opacity-90" />
                <h2 className="text-3xl font-bold mb-6">
                  Comprehensive Compliance Framework
                </h2>
                <p className="text-xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
                  Our compliance program is built on industry best practices, continuous monitoring, 
                  and regular third-party assessments to ensure we meet the highest security and privacy standards.
                </p>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="bg-white/10 rounded-lg p-6">
                    <CheckCircle className="w-8 h-8 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Continuous Monitoring</h3>
                    <p className="text-sm text-blue-200">
                      24/7 security monitoring and automated compliance checks
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-6">
                    <Award className="w-8 h-8 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Regular Audits</h3>
                    <p className="text-sm text-blue-200">
                      Annual third-party security audits and assessments
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-6">
                    <Users className="w-8 h-8 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Expert Team</h3>
                    <p className="text-sm text-blue-200">
                      Dedicated compliance and security professionals
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                  Need Compliance Documentation?
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  Our compliance team is ready to help with specific certification requirements, 
                  audit documentation, or custom compliance assessments for your organization.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/contact">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                      <FileText className="w-5 h-5 mr-2" />
                      Request Documentation
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg">
                    <Users className="w-5 h-5 mr-2" />
                    Schedule Compliance Call
                  </Button>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    📧 compliance@adhar.dev | 📞 +1 (555) 123-COMP
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Compliance;
