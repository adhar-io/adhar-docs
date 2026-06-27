import React from "react";
import { Hexagon, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

const IntegrationsSection = () => {
  const integrations = [
    { name: "Kubernetes", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg", description: "Container orchestration platform", isFoundation: true },
    { name: "Docker", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg", description: "Containerization platform" },
    { name: "Jenkins", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg", description: "CI/CD automation server" },
    { name: "GitLab", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg", description: "DevOps platform" },
    { name: "Prometheus", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prometheus/prometheus-original.svg", description: "Monitoring & alerting" },
    { name: "Grafana", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/grafana/grafana-original.svg", description: "Analytics & visualization" },
    { name: "Terraform", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg", description: "Infrastructure as code" },
    { name: "Helm", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/helm/helm-original.svg", description: "Kubernetes package manager" },
    { name: "ArgoCD", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/argo.svg", description: "GitOps continuous delivery" },
  ];

  const kubeMetrics = [
    { value: "99.9%", label: "Uptime SLA" },
    { value: "Auto", label: "Scaling" },
    { value: "Zero", label: "Downtime" },
    { value: "Multi", label: "Cloud" },
  ];

  return (
    <section id="integrations" className="relative section-padding container-padding bg-background">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-width-content">
        <div className="text-center mb-14 lg:mb-16">
          <span className="eyebrow mb-5">Open source</span>
          <h2 className="section-heading mt-5 text-foreground">
            Powered by battle-tested
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">open source.</span>
          </h2>
          <p className="section-subheading mt-6">
            Built on the shoulders of giants. ADHAR leverages the most trusted open-source tools in the
            cloud-native ecosystem, enhanced for enterprise reliability and seamless integration.
          </p>
        </div>

        {/* Kubernetes feature card */}
        <div className="mb-12">
          <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
            <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
            <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
            <div className="relative px-6 py-12 sm:px-10 sm:py-14">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] shrink-0">
                  <Hexagon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    Kubernetes native
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    The foundation of modern cloud infrastructure.
                  </p>
                </div>
              </div>

              <p className="mt-6 max-w-3xl text-base text-muted-foreground leading-relaxed">
                ADHAR is built from the ground up on Kubernetes, providing enterprise-grade container
                orchestration, automatic scaling, self-healing, and seamless multi-cloud deployments.
              </p>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50">
                {kubeMetrics.map((m) => (
                  <div key={m.label} className="bg-card/80 backdrop-blur-sm px-5 py-5">
                    <div className="text-2xl font-semibold text-foreground tracking-tight tabular">{m.value}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Integration grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
          {integrations.map((integration, index) => (
            <article
              key={index}
              className={`group relative flex flex-col items-center text-center bg-card p-6 transition-colors hover:bg-muted/30 ${
                integration.isFoundation ? 'ring-1 ring-inset ring-primary/30' : ''
              }`}
            >
              {integration.isFoundation && (
                <span className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ring-primary/20">
                  Core
                </span>
              )}
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-[var(--shadow-xs)] mb-4">
                <img
                  src={integration.icon}
                  loading="lazy"
                  decoding="async"
                  alt={integration.name}
                  className="w-7 h-7 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">{integration.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{integration.description}</p>
            </article>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/integrations">
            <button
              type="button"
              className="btn-secondary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
            >
              <span>View all integrations</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
