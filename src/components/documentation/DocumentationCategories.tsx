
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Code2, Zap, Shield, GitBranch, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface DocumentationCategoriesProps {
  searchQuery: string;
}

const DocumentationCategories = ({ searchQuery }: DocumentationCategoriesProps) => {
  const docCategories = [
    {
      title: "Getting Started",
      icon: BookOpen,
      color: "bg-blue-500",
      docs: [
        { title: "Quick Start Guide", description: "Get up and running with ADHAR in 5 minutes", badge: "New", slug: "quick-start-guide" },
        { title: "Installation", description: "Step-by-step installation instructions", slug: "installation" },
        { title: "Configuration", description: "Configure ADHAR for your environment", slug: "configuration" },
        { title: "First Project", description: "Create your first cloud-native project", slug: "first-project" }
      ]
    },
    {
      title: "Core Concepts",
      icon: Code2,
      color: "bg-purple-500",
      docs: [
        { title: "Platform Architecture", description: "Understanding ADHAR's architecture", slug: "platform-architecture" },
        { title: "The 5 D's Framework", description: "Define, Design, Develop, Deploy, Discover", slug: "5-ds-framework" },
        { title: "Integration Patterns", description: "How ADHAR integrates with open source tools", slug: "integration-patterns" },
        { title: "Developer Workflows", description: "Streamlined development processes", slug: "developer-workflows" }
      ]
    },
    {
      title: "Integrations",
      icon: Zap,
      color: "bg-green-500",
      docs: [
        { title: "ArgoCD Setup", description: "GitOps continuous delivery configuration", slug: "argo-cd-setup" },
        { title: "Keycloak Integration", description: "Identity and access management", slug: "keycloak-integration" },
        { title: "Kyverno Policies", description: "Policy management and enforcement", slug: "kyverno-policies" },
        { title: "Harbor Registry", description: "Container registry configuration", slug: "harbor-registry" },
        { title: "Backstage Portal", description: "Developer portal customization", slug: "backstage-portal" },
        { title: "CloudnativePG", description: "PostgreSQL operator setup", slug: "cloudnativepg" }
      ]
    },
    {
      title: "Security & Compliance",
      icon: Shield,
      color: "bg-red-500",
      docs: [
        { title: "Security Best Practices", description: "Secure your ADHAR deployment", slug: "security-best-practices" },
        { title: "RBAC Configuration", description: "Role-based access control", slug: "rbac-configuration" },
        { title: "Policy Management", description: "Governance and compliance policies", slug: "policy-management" },
        { title: "Audit & Monitoring", description: "Security monitoring and auditing", slug: "audit-monitoring" }
      ]
    },
    {
      title: "Development",
      icon: GitBranch,
      color: "bg-orange-500",
      docs: [
        { title: "API Reference", description: "Complete API documentation", badge: "Updated", slug: "api-reference" },
        { title: "CLI Usage", description: "Command-line interface guide", slug: "cli-usage" },
        { title: "Templates", description: "Project and component templates", slug: "templates" },
        { title: "Custom Plugins", description: "Extend ADHAR with custom plugins", slug: "custom-plugins" }
      ]
    },
    {
      title: "Operations",
      icon: FileText,
      color: "bg-teal-500",
      docs: [
        { title: "Deployment Guide", description: "Production deployment strategies", slug: "deployment-guide" },
        { title: "Monitoring & Observability", description: "Platform monitoring setup", slug: "monitoring-observability" },
        { title: "Backup & Recovery", description: "Data protection strategies", slug: "backup-recovery" },
        { title: "Troubleshooting", description: "Common issues and solutions", slug: "troubleshooting" }
      ]
    }
  ];

  const filteredCategories = docCategories.map(category => ({
    ...category,
    docs: category.docs.filter(doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.docs.length > 0);

  return (
    <section className="pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredCategories.length > 0 ? (
          <div className="space-y-12">
            {filteredCategories.map((category, index) => (
              <div key={index}>
                <div className="flex items-center mb-6">
                  <div className={`w-10 h-10 rounded-lg ${category.color} flex items-center justify-center mr-4`}>
                    <category.icon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{category.title}</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.docs.map((doc, docIndex) => (
                    <Link 
                      key={docIndex} 
                      to={doc.slug ? `/docs/${doc.slug}` : '#'}
                      className="block"
                    >
                      <Card className="group hover:shadow-lg transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 cursor-pointer hover:bg-white dark:hover:bg-gray-800">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-gray-900 dark:text-white">
                              {doc.title}
                            </CardTitle>
                            {doc.badge && (
                              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                {doc.badge}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-gray-600 dark:text-gray-300">
                            {doc.description}
                          </CardDescription>
                          <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:underline">
                            Read more <ArrowRight className="w-4 h-4 ml-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No documentation found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search query</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DocumentationCategories;
