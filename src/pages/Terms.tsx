
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Scale, AlertTriangle, Users, Zap, Shield } from "lucide-react";

const Terms = () => {
  const sections = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Acceptance of Terms",
      content: [
        "By accessing ADHAR services, you agree to these terms",
        "These terms apply to all users and visitors",
        "Continued use constitutes acceptance of any updates",
        "You must be at least 18 years old to use our services",
        "Corporate users must have authority to bind their organization"
      ]
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Service Usage & License",
      content: [
        "Subject to compliance with these terms",
        "Non-exclusive, non-transferable license to use ADHAR",
        "Intended for legitimate business purposes only",
        "Prohibited uses include illegal activities and security violations",
        "We reserve the right to monitor usage for compliance"
      ]
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "User Responsibilities",
      content: [
        "Maintain confidentiality of account credentials",
        "Provide accurate and current information",
        "Comply with applicable laws and regulations",
        "Respect intellectual property rights",
        "Report security vulnerabilities responsibly"
      ]
    },
    {
      icon: <AlertTriangle className="w-6 h-6" />,
      title: "Service Availability",
      content: [
        "Services provided 'as is' without warranties",
        "We strive for 99.9% uptime but cannot guarantee it",
        "Scheduled maintenance may cause temporary interruptions",
        "We may modify or discontinue features with notice",
        "Critical security updates may be applied immediately"
      ]
    },
    {
      icon: <Scale className="w-6 h-6" />,
      title: "Limitation of Liability",
      content: [
        "Our liability is limited to the amount paid for services",
        "No liability for indirect, consequential, or punitive damages",
        "Force majeure events excuse performance delays",
        "You agree to indemnify us against third-party claims",
        "Some jurisdictions may not allow these limitations"
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
                Terms of Service
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              These terms govern your use of ADHAR services. Please read them carefully before using our platform.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: January 15, 2026
            </p>
          </div>
        </section>

        {/* Terms Sections */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8">
              {sections.map((section, index) => (
                <Card key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 mr-4">
                        {section.icon}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {section.title}
                      </h2>
                    </div>
                    <ul className="space-y-3">
                      {section.content.map((item, idx) => (
                        <li key={idx} className="flex items-start text-gray-600 dark:text-gray-300">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
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

        {/* Service Level Agreement */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <CardContent className="p-8">
                <div className="text-center">
                  <Scale className="w-12 h-12 mx-auto mb-4 opacity-90" />
                  <h2 className="text-2xl font-bold mb-4">Service Level Agreement</h2>
                  <p className="text-purple-100 mb-6">
                    We're committed to providing reliable, high-performance services with transparent SLAs and support commitments.
                  </p>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-2xl font-bold">99.9%</div>
                      <div className="text-sm text-purple-200">Uptime SLA</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-2xl font-bold">&lt; 1hr</div>
                      <div className="text-sm text-purple-200">Response Time</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-2xl font-bold">24/7</div>
                      <div className="text-sm text-purple-200">Support</div>
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
                  Legal Questions?
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  For questions about these terms or legal matters, please contact our legal team.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="text-purple-600 dark:text-purple-400 font-medium">
                    📧 legal@adhar.dev
                  </div>
                  <div className="text-gray-400 hidden sm:block">|</div>
                  <div className="text-purple-600 dark:text-purple-400 font-medium">
                    📍 San Francisco, CA
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

export default Terms;
