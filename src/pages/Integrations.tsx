import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import {
  Search,
  ExternalLink,
  Hexagon,
  Boxes,
  GitBranch,
  Activity,
  Shield,
  Cpu,
  ArrowRight,
  Plug,
  type LucideIcon,
} from "lucide-react";

type Category = "Application" | "Monitoring" | "Security" | "Infrastructure" | "CI/CD" | "Storage";

interface Integration {
  name: string;
  icon: string;
  description: string;
  category: Category;
  isFoundation?: boolean;
  features: string[];
}

const integrations: Integration[] = [
  {
    name: "Kubernetes",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg",
    description: "Container orchestration for automated deployment, scaling, and management.",
    category: "Application",
    isFoundation: true,
    features: ["Auto-scaling", "Self-healing", "Load balancing", "Rolling updates"],
  },
  {
    name: "Docker",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg",
    description: "Containerization platform for packaging applications and dependencies.",
    category: "Application",
    features: ["Container packaging", "Image management", "Multi-platform", "Lightweight"],
  },
  {
    name: "Jenkins",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg",
    description: "Open-source automation server for CI/CD pipelines.",
    category: "CI/CD",
    features: ["Pipeline automation", "Plugin ecosystem", "Distributed builds", "Integration"],
  },
  {
    name: "GitLab",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg",
    description: "Complete DevOps platform with Git repository management.",
    category: "CI/CD",
    features: ["Git hosting", "CI/CD pipelines", "Issue tracking", "Code review"],
  },
  {
    name: "Prometheus",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prometheus/prometheus-original.svg",
    description: "Open-source monitoring and alerting toolkit.",
    category: "Monitoring",
    features: ["Time-series DB", "Powerful queries", "Alerting", "Service discovery"],
  },
  {
    name: "Grafana",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/grafana/grafana-original.svg",
    description: "Analytics and interactive visualization for any data source.",
    category: "Monitoring",
    features: ["Dashboards", "Alerts", "Data sources", "Visualization"],
  },
  {
    name: "Jaeger",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/jaeger.svg",
    description: "End-to-end distributed tracing for microservices.",
    category: "Monitoring",
    features: ["Distributed tracing", "Performance monitoring", "Root cause analysis", "Service deps"],
  },
  {
    name: "Fluentd",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/fluentd.svg",
    description: "Unified logging layer for collecting and processing log data.",
    category: "Monitoring",
    features: ["Log aggregation", "Data processing", "Multiple outputs", "Flexible routing"],
  },
  {
    name: "Falco",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/falco.svg",
    description: "Cloud-native runtime security for threat detection.",
    category: "Security",
    features: ["Runtime security", "Threat detection", "Anomaly detection", "Compliance"],
  },
  {
    name: "Vault",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/vault.svg",
    description: "Secrets management and data protection platform.",
    category: "Security",
    features: ["Secret storage", "Dynamic secrets", "Encryption", "Access control"],
  },
  {
    name: "Terraform",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg",
    description: "Infrastructure as code for provisioning and managing resources.",
    category: "Infrastructure",
    features: ["IaC", "Multi-cloud", "State management", "Resource graph"],
  },
  {
    name: "Helm",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/helm/helm-original.svg",
    description: "Package manager for Kubernetes applications.",
    category: "Infrastructure",
    features: ["Package management", "Templating", "Release management", "Rollbacks"],
  },
  {
    name: "Istio",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/istio.svg",
    description: "Service mesh for microservices communication.",
    category: "Infrastructure",
    features: ["Traffic management", "Security policies", "Observability", "Service discovery"],
  },
  {
    name: "Linkerd",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkerd.svg",
    description: "Ultralight service mesh for Kubernetes.",
    category: "Infrastructure",
    features: ["Service mesh", "mTLS", "Load balancing", "Observability"],
  },
  {
    name: "Envoy",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/envoyproxy.svg",
    description: "Cloud-native, high-performance edge and service proxy.",
    category: "Infrastructure",
    features: ["Load balancing", "HTTP/2 & gRPC", "Observability", "Advanced routing"],
  },
  {
    name: "Consul",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/consul.svg",
    description: "Service networking for discovery and configuration.",
    category: "Infrastructure",
    features: ["Service discovery", "Health checks", "KV store", "Service mesh"],
  },
  {
    name: "NATS",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/nats.svg",
    description: "Cloud-native messaging for microservices.",
    category: "Infrastructure",
    features: ["Messaging", "Streaming", "Request-reply", "Clustering"],
  },
  {
    name: "ArgoCD",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/argo.svg",
    description: "Declarative GitOps continuous delivery for Kubernetes.",
    category: "CI/CD",
    features: ["GitOps", "Declarative deploys", "Multi-cluster", "Rollbacks"],
  },
];

const categories: { key: Category | "All"; icon: LucideIcon }[] = [
  { key: "All", icon: Plug },
  { key: "Application", icon: Boxes },
  { key: "Monitoring", icon: Activity },
  { key: "Security", icon: Shield },
  { key: "Infrastructure", icon: Cpu },
  { key: "CI/CD", icon: GitBranch },
];

const Integrations = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");

  const counts = useMemo(() => {
    const all = integrations.length;
    const byCat: Record<string, number> = { All: all };
    for (const i of integrations) byCat[i.category] = (byCat[i.category] || 0) + 1;
    return byCat;
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return integrations.filter((it) => {
      const matchSearch =
        !q || it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q);
      const matchCat = selectedCategory === "All" || it.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5"><Plug className="w-3 h-3 mr-1" />Integrations</span>
            <h1 className="section-heading mt-5 text-foreground">
              The tools you already use,
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">wired in by default.</span>
            </h1>
            <p className="section-subheading mt-6">
              ADHAR is built on the most trusted open-source tools in the cloud-native ecosystem —
              tuned, hardened, and pre-configured so you don't have to.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium ring-1 ring-inset ring-primary/20">
                {integrations.length} integrations
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {categories.length - 1} categories
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                100% open source
              </span>
            </div>
          </div>
        </section>

        {/* Featured / Foundation */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
              <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
              <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
              <div className="relative px-6 py-12 sm:px-10 sm:py-14">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] shrink-0">
                    <Hexagon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ring-primary/20 mb-2">
                      Foundation
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                      Kubernetes-native, by design
                    </h2>
                    <p className="mt-1 text-muted-foreground">
                      Every workload runs on Kubernetes — and every integration is built to amplify it.
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50">
                  {[
                    { value: "99.9%", label: "Uptime SLA" },
                    { value: "Auto", label: "Scaling" },
                    { value: "Zero", label: "Downtime deploys" },
                    { value: "Multi", label: "Cloud" },
                  ].map((m) => (
                    <div key={m.label} className="bg-card/80 backdrop-blur-sm px-5 py-5">
                      <div className="text-2xl font-semibold text-foreground tracking-tight tabular">{m.value}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search + filters */}
        <section className="container-padding">
          <div className="max-width-content">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search integrations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-card"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground tabular">{filtered.length}</span> of {integrations.length}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const Icon = c.icon;
                const isActive = selectedCategory === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setSelectedCategory(c.key)}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground border border-border/70 hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{c.key}</span>
                    <span className={`ml-0.5 inline-flex items-center px-1.5 rounded-full text-[10px] tabular ${
                      isActive ? 'bg-primary-foreground/15' : 'bg-muted'
                    }`}>
                      {counts[c.key] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="container-padding py-10">
          <div className="max-width-content">
            {filtered.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-border/70 bg-card">
                <Search className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground tracking-tight">No integrations found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setSelectedCategory("All"); }}
                  className="btn-secondary-modern mt-5 inline-flex items-center justify-center gap-1.5 rounded-full px-4 h-9 text-xs font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
                {filtered.map((integration, index) => (
                  <article
                    key={index}
                    className={`group flex flex-col bg-card p-6 transition-colors hover:bg-muted/30 ${
                      integration.isFoundation ? 'ring-1 ring-inset ring-primary/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-[var(--shadow-xs)]">
                        <img
                          src={integration.icon}
                          alt={integration.name}
                          className="w-7 h-7 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {integration.category}
                        </span>
                        {integration.isFoundation && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ring-primary/20">
                            Core
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-foreground tracking-tight">{integration.name}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{integration.description}</p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {integration.features.slice(0, 3).map((feature, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                          {feature}
                        </span>
                      ))}
                      {integration.features.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border/70 text-[11px] font-medium text-muted-foreground">
                          +{integration.features.length - 3}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-secondary-modern mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full h-9 text-xs font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Learn more</span>
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* How it fits */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="text-center mb-14">
              <span className="eyebrow mb-5">How it fits</span>
              <h2 className="section-heading mt-5 text-foreground">
                Integrations
                <br className="hidden sm:block" />
                <span className="text-muted-foreground">that compose, not collide.</span>
              </h2>
              <p className="section-subheading mt-6">
                Every integration ships with sensible defaults, secure-by-default networking, and observability baked in.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {[
                { icon: Boxes, title: "Pre-configured", description: "Hardened defaults, version-pinned, and tested in production." },
                { icon: Activity, title: "Observable", description: "Every component emits metrics, logs, and traces to a shared pipeline." },
                { icon: Shield, title: "Secured", description: "mTLS, RBAC, and policy enforcement applied uniformly." },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <article key={idx} className="bg-card p-7">
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Related */}
        <section className="section-padding container-padding">
          <div className="max-width-content">
            <div className="text-center mb-10">
              <span className="eyebrow mb-5">Continue exploring</span>
              <h2 className="section-heading mt-5 text-foreground">Related topics.</h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { to: "/architecture", icon: Boxes, title: "Architecture", description: "How these integrations fit into the layered platform." },
                { to: "/capabilities", icon: Cpu, title: "Capabilities", description: "What you can build on top of the integration stack." },
                { to: "/security", icon: Shield, title: "Security", description: "How we secure the data plane and the integrations." },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <Link key={idx} to={card.to} className="group block">
                    <article className="card-interactive p-6 h-full">
                      <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground tracking-tight">{card.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                      <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <span>Learn more</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Integrations;
