
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Eye, Users, Database, Lock, FileText } from "lucide-react";

const Privacy = () => {
  const sections = [
    {
      icon: <Database className="w-6 h-6" />,
      title: "Information We Collect",
      content: [
        "Account information (name, email, company details)",
        "Usage data and analytics",
        "Device and browser information",
        "Log files and performance metrics",
        "Cookies and similar tracking technologies"
      ]
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "How We Use Your Information",
      content: [
        "Provide and maintain our services",
        "Process transactions and billing",
        "Send important notifications and updates",
        "Improve our platform and develop new features",
        "Ensure security and prevent fraud"
      ]
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Information Sharing",
      content: [
        "We do not sell your personal information",
        "Share with service providers under strict agreements",
        "Comply with legal requirements when necessary",
        "Transfer data in case of business transactions",
        "Aggregate, anonymized data for research purposes"
      ]
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Data Security",
      content: [
        "End-to-end encryption for sensitive data",
        "Regular security audits and assessments",
        "Access controls and authentication measures",
        "Secure data centers with 24/7 monitoring",
        "Employee training on data protection"
      ]
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Your Rights",
      content: [
        "Access your personal data",
        "Correct inaccurate information",
        "Delete your account and data",
        "Data portability and export",
        "Opt-out of marketing communications"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      <Navigation />
      
      <main className="pt-20">
        {/* Header */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                Privacy Policy
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: January 15, 2026
            </p>
          </div>
        </section>

        {/* Privacy Sections */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8">
              {sections.map((section, index) => (
                <Card key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 mr-4">
                        {section.icon}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {section.title}
                      </h2>
                    </div>
                    <ul className="space-y-3">
                      {section.content.map((item, idx) => (
                        <li key={idx} className="flex items-start text-gray-600 dark:text-gray-300">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Information */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardContent className="p-8">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-90" />
                  <h2 className="text-2xl font-bold mb-4">Data Protection Compliance</h2>
                  <p className="text-blue-100 mb-6">
                    ADHAR is committed to compliance with GDPR, CCPA, and other data protection regulations. 
                    We implement privacy-by-design principles in all our systems.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">GDPR</div>
                      <div className="text-sm text-blue-200">Compliant</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">CCPA</div>
                      <div className="text-sm text-blue-200">Compliant</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">SOC 2</div>
                      <div className="text-sm text-blue-200">Type II</div>
                    </div>
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
                  Questions About Privacy?
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  If you have any questions about this Privacy Policy or our data practices, 
                  please don't hesitate to contact our privacy team.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="text-blue-600 dark:text-blue-400 font-medium">
                    📧 privacy@adhar.dev
                  </div>
                  <div className="text-gray-400 hidden sm:block">|</div>
                  <div className="text-blue-600 dark:text-blue-400 font-medium">
                    📞 +1 (555) 123-4567
                  </div>
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

export default Privacy;
