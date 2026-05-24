
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Box, Hexagon, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const IntegrationsSection = () => {
  const integrations = [
    {
      name: "Kubernetes",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg",
      description: "Container orchestration platform",
      color: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
      isFoundation: true
    },
    {
      name: "Docker",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg",
      description: "Containerization platform",
      color: "bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-800/20"
    },
    {
      name: "Jenkins",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg",
      description: "CI/CD automation server",
      color: "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20"
    },
    {
      name: "GitLab",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg",
      description: "DevOps platform",
      color: "bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-800/20"
    },
    {
      name: "Prometheus",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prometheus/prometheus-original.svg",
      description: "Monitoring & alerting",
      color: "bg-gradient-to-br from-orange-50 to-yellow-100 dark:from-orange-900/20 dark:to-yellow-800/20"
    },
    {
      name: "Grafana",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/grafana/grafana-original.svg",
      description: "Analytics & visualization",
      color: "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-800/20"
    },
    {
      name: "Terraform",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg",
      description: "Infrastructure as code",
      color: "bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-800/20"
    },
    {
      name: "Helm",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/helm/helm-original.svg",
      description: "Kubernetes package manager",
      color: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
    },
    {
      name: "ArgoCD",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/argo.svg",
      description: "GitOps continuous delivery",
      color: "bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-800/20"
    }
  ];

  return (
    <section id="integrations" className="py-24 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 dark:from-green-900/50 dark:to-emerald-900/50 dark:text-green-300">
            <Box className="w-4 h-4 mr-2" />
            Open Source Excellence
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Powered by Battle-Tested Open Source
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Built on the shoulders of giants. ADHAR leverages the most trusted open-source tools in the cloud-native ecosystem, 
            enhanced by our expert team for enterprise reliability and seamless integration.
          </p>
        </div>

        <div className="mb-16">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-0 shadow-2xl overflow-hidden">
            <CardContent className="p-12 text-center text-white relative">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Hexagon className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-4xl font-bold mb-2">Kubernetes Native</h3>
                    <p className="text-blue-100 text-lg">The Foundation of Modern Cloud Infrastructure</p>
                  </div>
                </div>
                <p className="text-xl leading-relaxed max-w-4xl mx-auto mb-8">
                  ADHAR is built from the ground up on Kubernetes, providing enterprise-grade container orchestration, 
                  automatic scaling, self-healing, and seamless multi-cloud deployments.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-3xl font-bold">99.9%</div>
                    <div className="text-blue-100">Uptime SLA</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-3xl font-bold">Auto</div>
                    <div className="text-blue-100">Scaling</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-3xl font-bold">Zero</div>
                    <div className="text-blue-100">Downtime</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-3xl font-bold">Multi</div>
                    <div className="text-blue-100">Cloud</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {integrations.map((integration, index) => (
            <Card key={index} className={`${integration.color} border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105 group relative overflow-hidden ${integration.isFoundation ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}`}>
              {integration.isFoundation && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs border-0">
                    Core
                  </Badge>
                </div>
              )}
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="mb-3 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 mx-auto">
                  {integration.icon.startsWith('http') ? (
                    <img 
                      src={integration.icon} 
                      alt={integration.name}
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-2xl font-bold text-gray-600 dark:text-gray-300">${integration.name.substring(0, 2)}</span>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="text-4xl">{integration.icon}</div>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm mb-2">{integration.name}</h3>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{integration.description}</p>
                {integration.isFoundation && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400 bg-white/50 dark:bg-gray-800/50">
                      Foundation
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/integrations">
            <Button variant="outline" className="border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 px-8 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300">
              <ExternalLink className="w-4 h-4 mr-2" />
              View All Integrations
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
