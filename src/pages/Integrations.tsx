import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { Search, Filter, ExternalLink, ChevronDown } from "lucide-react";

const Integrations = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAll, setShowAll] = useState(false);

  const categories = ["All", "Application", "Monitoring", "Security", "Infrastructure", "CI/CD", "Storage"];

  const integrations = [
    // Application
    {
      name: "Kubernetes",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg",
      description: "Container orchestration platform for automated deployment, scaling, and management",
      category: "Application",
      color: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
      isFoundation: true,
      features: ["Auto-scaling", "Self-healing", "Load balancing", "Rolling updates"]
    },
    {
      name: "Docker",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg",
      description: "Containerization platform for packaging applications and dependencies",
      category: "Application",
      color: "bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-800/20",
      features: ["Container packaging", "Image management", "Multi-platform", "Lightweight"]
    },
    {
      name: "Jenkins",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg",
      description: "Open source automation server for CI/CD pipelines",
      category: "CI/CD",
      color: "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20",
      features: ["Pipeline automation", "Plugin ecosystem", "Distributed builds", "Integration"]
    },
    {
      name: "GitLab",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg",
      description: "Complete DevOps platform with Git repository management",
      category: "CI/CD",
      color: "bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-800/20",
      features: ["Git hosting", "CI/CD pipelines", "Issue tracking", "Code review"]
    },
    // Monitoring
    {
      name: "Prometheus",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prometheus/prometheus-original.svg",
      description: "Open-source monitoring and alerting toolkit",
      category: "Monitoring",
      color: "bg-gradient-to-br from-orange-50 to-yellow-100 dark:from-orange-900/20 dark:to-yellow-800/20",
      features: ["Time-series DB", "Powerful queries", "Alerting", "Service discovery"]
    },
    {
      name: "Grafana",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/grafana/grafana-original.svg",
      description: "Analytics and interactive visualization web application",
      category: "Monitoring",
      color: "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-800/20",
      features: ["Dashboards", "Alerts", "Data sources", "Visualization"]
    },
    {
      name: "Jaeger",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/jaeger.svg",
      description: "End-to-end distributed tracing for microservices",
      category: "Monitoring",
      color: "bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/20 dark:to-purple-800/20",
      features: ["Distributed tracing", "Performance monitoring", "Root cause analysis", "Service dependencies"]
    },
    {
      name: "Fluentd",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/fluentd.svg",
      description: "Unified logging layer for collecting and processing log data",
      category: "Monitoring",
      color: "bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-800/20",
      features: ["Log aggregation", "Data processing", "Multiple outputs", "Flexible routing"]
    },
    // Security
    {
      name: "Falco",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/falco.svg",
      description: "Cloud native runtime security for threat detection",
      category: "Security",
      color: "bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/20 dark:to-pink-800/20",
      features: ["Runtime security", "Threat detection", "Anomaly detection", "Compliance"]
    },
    {
      name: "Vault",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/vault.svg",
      description: "Secrets management and data protection platform",
      category: "Security",
      color: "bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/20 dark:to-slate-800/20",
      features: ["Secret storage", "Dynamic secrets", "Encryption", "Access control"]
    },
    // Infrastructure
    {
      name: "Terraform",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg",
      description: "Infrastructure as code for provisioning and managing resources",
      category: "Infrastructure",
      color: "bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-800/20",
      features: ["Infrastructure as code", "Multi-cloud", "State management", "Resource graph"]
    },
    {
      name: "Helm",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/helm/helm-original.svg",
      description: "Package manager for Kubernetes applications",
      category: "Infrastructure",
      color: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
      features: ["Package management", "Templating", "Release management", "Rollbacks"]
    },
    {
      name: "Istio",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/istio.svg",
      description: "Service mesh platform for microservices communication",
      category: "Infrastructure",
      color: "bg-gradient-to-br from-blue-50 to-teal-100 dark:from-blue-900/20 dark:to-teal-800/20",
      features: ["Traffic management", "Security policies", "Observability", "Service discovery"]
    },
    {
      name: "Linkerd",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkerd.svg",
      description: "Ultralight service mesh for Kubernetes",
      category: "Infrastructure",
      color: "bg-gradient-to-br from-green-50 to-teal-100 dark:from-green-900/20 dark:to-teal-800/20",
      features: ["Service mesh", "mTLS", "Load balancing", "Observability"]
    },
    {
      name: "Envoy",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/envoyproxy.svg",
      description: "Cloud-native high-performance edge and service proxy",
      category: "Infrastructure",
      color: "bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/20 dark:to-cyan-800/20",
      features: ["Load balancing", "HTTP/2 & gRPC", "Observability", "Advanced routing"]
    },
    {
      name: "Consul",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/consul.svg",
      description: "Service networking solution for service discovery and configuration",
      category: "Infrastructure",
      color: "bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-800/20",
      features: ["Service discovery", "Health checking", "KV store", "Service mesh"]
    },
    {
      name: "NATS",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/nats.svg",
      description: "Cloud native messaging system for microservices",
      category: "Infrastructure",
      color: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20",
      features: ["Messaging", "Streaming", "Request-reply", "Clustering"]
    },
    // CI/CD
    {
      name: "ArgoCD",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/argo.svg",
      description: "Declarative GitOps continuous delivery tool for Kubernetes",
      category: "CI/CD",
      color: "bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-800/20",
      features: ["GitOps", "Declarative deployments", "Multi-cluster", "Rollbacks"]
    }
  ];

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Show only first 9 items (3 rows) by default, all if showAll is true
  const displayedIntegrations = showAll ? filteredIntegrations : filteredIntegrations.slice(0, 9);
  const hasMoreItems = filteredIntegrations.length > 9;

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "Application": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "Monitoring": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "Security": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "Infrastructure": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "CI/CD": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "Storage": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      <Navigation />
      
      <main className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              All Integrations
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Explore our comprehensive collection of open-source integrations that power the ADHAR platform.
            </p>
          </div>

          {/* Search and Filter */}
          <div className="mb-8 space-y-4">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search integrations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            
            <div className="flex justify-center">
              <div className="flex flex-wrap gap-2 p-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={`${
                      selectedCategory === category
                        ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                    } transition-all`}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-center mb-8">
            <p className="text-gray-600 dark:text-gray-400">
              Showing {displayedIntegrations.length} of {filteredIntegrations.length} integrations
            </p>
          </div>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {displayedIntegrations.map((integration, index) => (
              <Card key={index} className={`${integration.color} border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden ${integration.isFoundation ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="group-hover:scale-110 transition-transform duration-300">
                      {integration.icon.startsWith('http') ? (
                        <img 
                          src={integration.icon} 
                          alt={`${integration.name} logo`}
                          className="w-12 h-12 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLSpanElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : (
                        <span className="text-4xl">{integration.icon}</span>
                      )}
                      <span 
                        className="hidden w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300"
                        style={{ display: 'none' }}
                      >
                        {integration.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className={getCategoryBadgeColor(integration.category)} variant="outline">
                        {integration.category}
                      </Badge>
                      {integration.isFoundation && (
                        <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs border-0">
                          Core
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-3">
                    {integration.name}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    {integration.description}
                  </p>
                  
                  {integration.features && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Key Features:</h4>
                      <div className="flex flex-wrap gap-1">
                        {integration.features.slice(0, 3).map((feature, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600">
                            {feature}
                          </Badge>
                        ))}
                        {integration.features.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600">
                            +{integration.features.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <Button variant="outline" className="w-full border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-700 transition-all">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Show More/Less Button */}
          {hasMoreItems && (
            <div className="text-center mb-8">
              <Button
                onClick={() => setShowAll(!showAll)}
                variant="outline"
                className="border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 px-8 py-3 transition-all"
              >
                {showAll ? (
                  <>
                    Show Less
                    <ChevronDown className="w-4 h-4 ml-2 rotate-180" />
                  </>
                ) : (
                  <>
                    View All {filteredIntegrations.length} Integrations
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* No Results */}
          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No integrations found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Try adjusting your search terms or selected category
              </p>
              <Button 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("All");
                }}
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Integrations;
