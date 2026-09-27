import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

const DEV = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";
const SI = "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons";
const cncf = (p: string) =>
  `https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/${p}/icon/color/${p}-icon-color.svg`;

// The foundational, most-recognisable tools ADHAR is built on — the ones we
// spotlight. Logos mirror the /integrations catalogue exactly.
const highlights = [
  { name: "Kubernetes", role: "Orchestration", icon: `${DEV}/kubernetes/kubernetes-original.svg`, isFoundation: true },
  { name: "Cilium", role: "eBPF networking", icon: `${SI}/cilium.svg` },
  { name: "Crossplane", role: "Control plane", icon: cncf("crossplane") },
  { name: "ArgoCD", role: "GitOps delivery", icon: `${SI}/argo.svg` },
  { name: "Gitea", role: "Git server", icon: `${SI}/gitea.svg` },
  { name: "Keycloak", role: "SSO & identity", icon: `${SI}/keycloak.svg` },
  { name: "Backstage", role: "Developer portal", icon: `${SI}/backstage.svg` },
  { name: "Harbor", role: "Container registry", icon: `${SI}/harbor.svg` },
  { name: "Grafana", role: "Observability", icon: `${DEV}/grafana/grafana-original.svg` },
  { name: "Prometheus", role: "Metrics", icon: `${DEV}/prometheus/prometheus-original.svg` },
  { name: "Kyverno", role: "Policy engine", icon: cncf("kyverno") },
  { name: "OpenBao", role: "Secrets", icon: `${SI}/openbao.svg` },
];

// The wider stack — scrolled as a marquee below the spotlight grid.
const marquee = [
  { name: "Helm", icon: `${DEV}/helm/helm-original.svg` },
  { name: "Trivy", icon: `${SI}/trivy.svg` },
  { name: "cert-manager", icon: cncf("cert-manager") },
  { name: "Falco", icon: `${SI}/falco.svg` },
  { name: "OpenTelemetry", icon: `${SI}/opentelemetry.svg` },
  { name: "Loki", icon: `${DEV}/grafana/grafana-original.svg` },
  { name: "Tempo", icon: `${DEV}/grafana/grafana-original.svg` },
  { name: "Tekton", icon: `${SI}/tekton.svg` },
  { name: "Knative", icon: `${SI}/knative.svg` },
  { name: "KEDA", icon: cncf("keda") },
  { name: "DAPR", icon: `${SI}/dapr.svg` },
  { name: "CloudNativePG", icon: cncf("cloudnativepg") },
  { name: "PostgreSQL", icon: `${DEV}/postgresql/postgresql-original.svg` },
  { name: "MinIO", icon: `${SI}/minio.svg` },
  { name: "Apache Kafka", icon: `${SI}/apachekafka.svg` },
  { name: "Trino", icon: `${SI}/trino.svg` },
  { name: "ClickHouse", icon: `${SI}/clickhouse.svg` },
  { name: "Velero", icon: cncf("velero") },
  { name: "Buildpacks", icon: cncf("buildpacks") },
  { name: "Coder", icon: `${SI}/coder.svg` },
  { name: "Penpot", icon: `${SI}/penpot.svg` },
  { name: "Headlamp", icon: cncf("headlamp") },
  { name: "FluxCD", icon: cncf("flux") },
  { name: "vLLM", icon: `${SI}/vllm.svg` },
];

const kubeMetrics = [
  { value: "90+", label: "Integrations" },
  { value: "7", label: "Categories" },
  { value: "100%", label: "Open source" },
  { value: "Multi", label: "Cloud" },
];

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const chip = (e.target as HTMLImageElement).closest("[data-logo-chip]") as HTMLElement | null;
  if (chip) chip.style.display = "none";
  else (e.target as HTMLImageElement).style.display = "none";
};

const IntegrationsSection = () => {
  return (
    <section id="integrations" className="relative section-padding container-padding bg-background">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <style>{`
        @keyframes adhar-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .adhar-marquee-track {
          display: flex;
          width: max-content;
          animation: adhar-marquee 46s linear infinite;
        }
        .adhar-marquee:hover .adhar-marquee-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .adhar-marquee-track { animation: none; }
        }
      `}</style>

      <div className="max-width-content">
        <div className="text-center mb-14 lg:mb-16">
          <span className="eyebrow mb-5">Open source</span>
          <h2 className="section-heading mt-5 text-foreground">
            Powered by battle-tested
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">open source.</span>
          </h2>
          <p className="section-subheading mt-6">
            Built on the shoulders of giants. ADHAR unifies 90+ of the most trusted cloud-native
            projects — wired together, hardened, and upgraded as one platform.
          </p>
        </div>

        {/* Kubernetes feature card */}
        <div className="mb-12">
          <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
            <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
            <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
            <div className="relative px-6 py-12 sm:px-10 sm:py-14">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-white shadow-[var(--shadow-xs)] shrink-0">
                  <img
                    src={`${DEV}/kubernetes/kubernetes-plain.svg`}
                    alt="Kubernetes"
                    loading="lazy"
                    decoding="async"
                    className="w-7 h-7 object-contain"
                  />
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
                ADHAR is built from the ground up on Kubernetes — enterprise-grade orchestration,
                automatic scaling, self-healing, and seamless multi-cloud deployments, with every
                component reconciled through GitOps.
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

        {/* Spotlight grid — the foundational stack */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
          {highlights.map((tool) => (
            <article
              key={tool.name}
              className={`group relative flex items-center gap-3.5 bg-card p-5 transition-all duration-300 hover:bg-muted/40 hover:-translate-y-0.5 ${
                tool.isFoundation ? "ring-1 ring-inset ring-primary/30" : ""
              }`}
            >
              {tool.isFoundation && (
                <span className="absolute top-2.5 right-2.5 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ring-primary/20">
                  Core
                </span>
              )}
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-white shadow-[var(--shadow-xs)] transition-transform duration-300 group-hover:scale-105">
                <img
                  src={tool.icon}
                  loading="lazy"
                  decoding="async"
                  alt={tool.name}
                  className="w-6 h-6 object-contain"
                  onError={hideOnError}
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground tracking-tight truncate">{tool.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">{tool.role}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Marquee — the wider stack */}
        <div className="mt-10">
          <div className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-5">
            …and 60+ more across security, delivery, data &amp; AI
          </div>
          <div className="adhar-marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <div className="adhar-marquee-track gap-3 pr-3">
              {[...marquee, ...marquee].map((tool, i) => (
                <div
                  key={`${tool.name}-${i}`}
                  data-logo-chip
                  title={tool.name}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3.5 py-2.5 shadow-[var(--shadow-xs)] shrink-0"
                >
                  <img
                    src={tool.icon}
                    alt={tool.name}
                    loading="lazy"
                    decoding="async"
                    className="w-5 h-5 object-contain"
                    onError={hideOnError}
                  />
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{tool.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <Link to="/integrations">
            <button
              type="button"
              className="btn-secondary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
            >
              <span>Explore all integrations</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
