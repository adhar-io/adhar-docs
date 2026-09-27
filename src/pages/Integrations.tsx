import React, { useMemo, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ArrowRight, ArrowUpRight, X, BookOpen, Layers, Boxes } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import Reveal from "@/components/Reveal";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/* ------------------------------------------------------------------ */
/* Data — every open-source project the Adhar platform runs on          */
/* ------------------------------------------------------------------ */

type Category =
  | "Core"
  | "Security"
  | "Observability"
  | "Delivery"
  | "Data"
  | "AI"
  | "Developer Experience";

interface Tool {
  name: string;
  category: Category;
  logo: string | null;
  url: string;
  what: string;
  usage: string;
}

const DEV = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";
const SI = "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons";
/** Official CNCF project logos (color icon variant). */
const cncf = (p: string) => `https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/${p}/icon/color/${p}-icon-color.svg`;

const TOOLS: Tool[] = [
  // ---- Core & infrastructure ----
  { name: "Kubernetes", category: "Core", logo: `${DEV}/kubernetes/kubernetes-original.svg`, url: "https://kubernetes.io", what: "Container orchestration", usage: "The substrate every Adhar cluster runs on — local Kind or any cloud." },
  { name: "Cilium", category: "Core", logo: `${SI}/cilium.svg`, url: "https://cilium.io", what: "eBPF networking & Gateway API", usage: "CNI, kube-proxy replacement, ingress (Gateway API), network policy, and Hubble flow visibility — the whole network layer." },
  { name: "Crossplane", category: "Core", logo: cncf("crossplane"), url: "https://crossplane.io", what: "Control plane / infrastructure as code", usage: "Powers namespaced, self-service infrastructure APIs — databases, caches, buckets, clusters." },
  { name: "Gitea", category: "Core", logo: `${SI}/gitea.svg`, url: "https://gitea.io", what: "Self-hosted Git server", usage: "The in-cluster source of truth — holds the packages, environments, and templates repos." },
  { name: "Helm", category: "Core", logo: `${DEV}/helm/helm-original.svg`, url: "https://helm.sh", what: "Kubernetes package manager", usage: "Renders every platform package to the manifests ArgoCD reconciles." },
  { name: "vCluster", category: "Core", logo: null, url: "https://www.vcluster.com", what: "Virtual Kubernetes clusters", usage: "Runs the local data plane and provides lightweight tenancy." },
  { name: "Kamaji", category: "Core", logo: null, url: "https://kamaji.clastix.io", what: "Hosted control planes", usage: "Multi-tenant Kubernetes control planes for fleet scenarios." },
  { name: "Velero", category: "Core", logo: cncf("velero"), url: "https://velero.io", what: "Backup & disaster recovery", usage: "Scheduled platform and cluster backups to object storage." },
  { name: "External DNS", category: "Core", logo: null, url: "https://kubernetes-sigs.github.io/external-dns/", what: "Automated DNS", usage: "Publishes a DNS record per platform hostname to your cloud's zone." },
  { name: "Sveltos", category: "Core", logo: null, url: "https://projectsveltos.github.io/sveltos/", what: "Add-on management", usage: "Places and manages add-ons across the cluster fleet." },
  { name: "Armada", category: "Core", logo: cncf("armada"), url: "https://armadaproject.io", what: "Multi-cluster batch scheduling", usage: "Schedules large batch workloads across clusters." },

  // ---- Security & compliance ----
  { name: "Keycloak", category: "Security", logo: `${SI}/keycloak.svg`, url: "https://www.keycloak.org", what: "Identity & single sign-on", usage: "OIDC provider for every UI and the Kubernetes API; groups map to platform RBAC." },
  { name: "OpenBao", category: "Security", logo: `${SI}/openbao.svg`, url: "https://openbao.org", what: "Secrets management", usage: "The Vault-compatible secrets backend and source of truth (production)." },
  { name: "External Secrets", category: "Security", logo: null, url: "https://external-secrets.io", what: "Secret synchronization", usage: "Syncs secrets from OpenBao into workloads at runtime — nothing sensitive in Git." },
  { name: "Kyverno", category: "Security", logo: cncf("kyverno"), url: "https://kyverno.io", what: "Kubernetes policy engine", usage: "Admission policy — Pod Security, image provenance, and resource-request rules." },
  { name: "Falco", category: "Security", logo: `${SI}/falco.svg`, url: "https://falco.org", what: "Runtime threat detection", usage: "eBPF-based runtime security monitoring." },
  { name: "Tetragon", category: "Security", logo: `${SI}/cilium.svg`, url: "https://tetragon.io", what: "eBPF security observability", usage: "Deep runtime security event visibility (Cilium)." },
  { name: "Trivy", category: "Security", logo: `${SI}/trivy.svg`, url: "https://trivy.dev", what: "Vulnerability scanning", usage: "Scans every image in the supply chain before it can run." },
  { name: "cert-manager", category: "Security", logo: cncf("cert-manager"), url: "https://cert-manager.io", what: "TLS certificate automation", usage: "Issues and renews the platform's certificates via Let's Encrypt." },
  { name: "Cosign", category: "Security", logo: null, url: "https://www.sigstore.dev", what: "Container image signing", usage: "Signs and verifies images; Kyverno gates what runs." },
  { name: "SealedSecrets", category: "Security", logo: null, url: "https://sealed-secrets.netlify.app", what: "Encrypted secrets for GitOps", usage: "Lets you store encrypted secrets safely in Git when needed." },
  { name: "SPIFFE / SPIRE", category: "Security", logo: cncf("spiffe"), url: "https://spiffe.io", what: "Workload identity", usage: "Cryptographic workload identity across the fleet." },

  // ---- Observability ----
  { name: "Prometheus", category: "Observability", logo: `${DEV}/prometheus/prometheus-original.svg`, url: "https://prometheus.io", what: "Metrics collection", usage: "Cluster-local metrics for every platform component and your apps." },
  { name: "Grafana", category: "Observability", logo: `${DEV}/grafana/grafana-original.svg`, url: "https://grafana.com", what: "Dashboards & visualization", usage: "The single pane of glass for metrics, logs, traces, and cost." },
  { name: "Loki", category: "Observability", logo: `${DEV}/grafana/grafana-original.svg`, url: "https://grafana.com/oss/loki/", what: "Log aggregation", usage: "The logs backend behind Grafana." },
  { name: "Tempo", category: "Observability", logo: `${DEV}/grafana/grafana-original.svg`, url: "https://grafana.com/oss/tempo/", what: "Distributed tracing", usage: "The traces backend behind Grafana." },
  { name: "Mimir", category: "Observability", logo: `${DEV}/grafana/grafana-original.svg`, url: "https://grafana.com/oss/mimir/", what: "Long-term metrics", usage: "Scalable, multi-cluster metric storage — the observability hub." },
  { name: "Grafana Alloy", category: "Observability", logo: `${DEV}/grafana/grafana-original.svg`, url: "https://grafana.com/oss/alloy/", what: "OpenTelemetry collector", usage: "The single agent shipping metrics, logs, and traces to the hub." },
  { name: "OpenTelemetry", category: "Observability", logo: `${SI}/opentelemetry.svg`, url: "https://opentelemetry.io", what: "Instrumentation standard", usage: "The vendor-neutral collection contract across the platform." },
  { name: "Jaeger", category: "Observability", logo: `${SI}/jaeger.svg`, url: "https://www.jaegertracing.io", what: "Distributed tracing", usage: "Trace analysis and visualization." },
  { name: "Hubble", category: "Observability", logo: `${SI}/cilium.svg`, url: "https://github.com/cilium/hubble", what: "Network observability", usage: "Live flow-level visibility into every network connection (Cilium)." },
  { name: "Pyroscope", category: "Observability", logo: `${DEV}/grafana/grafana-original.svg`, url: "https://grafana.com/oss/pyroscope/", what: "Continuous profiling", usage: "Always-on performance profiling." },
  { name: "Pixie", category: "Observability", logo: cncf("pixie"), url: "https://px.dev", what: "eBPF auto-instrumentation", usage: "Instant, code-free Kubernetes observability." },
  { name: "AlertManager", category: "Observability", logo: `${DEV}/prometheus/prometheus-original.svg`, url: "https://prometheus.io/docs/alerting/latest/alertmanager/", what: "Alert routing", usage: "Routes and deduplicates alerts from Prometheus." },
  { name: "FluentBit", category: "Observability", logo: `${SI}/fluentbit.svg`, url: "https://fluentbit.io", what: "Log forwarding", usage: "Lightweight log processor and forwarder." },
  { name: "OpenCost", category: "Observability", logo: "https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/opencost/icon/color/Opencost_Icon_Color.svg", url: "https://www.opencost.io", what: "Cost monitoring", usage: "Attributes cloud and cluster spend by workload." },

  // ---- Delivery & CI/CD ----
  { name: "ArgoCD", category: "Delivery", logo: `${SI}/argo.svg`, url: "https://argo-cd.readthedocs.io", what: "GitOps continuous delivery", usage: "Reconciles every platform package and your applications from Git." },
  { name: "Tekton", category: "Delivery", logo: `${SI}/tekton.svg`, url: "https://tekton.dev", what: "Cloud-native CI pipelines", usage: "Builds, scans, and signs images in the paved-road supply chain." },
  { name: "Harbor", category: "Delivery", logo: `${SI}/harbor.svg`, url: "https://goharbor.io", what: "Container registry", usage: "Stores signed, scanned images — the only registry workloads pull from." },
  { name: "Argo Workflows", category: "Delivery", logo: `${SI}/argo.svg`, url: "https://argoproj.github.io/workflows/", what: "Workflow engine", usage: "Container-native workflow and job orchestration." },
  { name: "Argo Rollouts", category: "Delivery", logo: `${SI}/argo.svg`, url: "https://argoproj.github.io/rollouts/", what: "Progressive delivery", usage: "Canary and blue-green releases for your apps." },
  { name: "Argo Events", category: "Delivery", logo: `${SI}/argo.svg`, url: "https://argoproj.github.io/events/", what: "Event-driven automation", usage: "Triggers workflows and pipelines from events." },
  { name: "FluxCD", category: "Delivery", logo: cncf("flux"), url: "https://fluxcd.io", what: "GitOps toolkit", usage: "Complementary GitOps reconciliation primitives." },
  { name: "Kargo", category: "Delivery", logo: null, url: "https://kargo.io", what: "GitOps promotion", usage: "Promotes changes across environments (dev → staging → prod)." },
  { name: "Buildpacks", category: "Delivery", logo: cncf("buildpacks"), url: "https://buildpacks.io", what: "Source-to-image builds", usage: "Builds container images from source with no Dockerfile (kpack)." },
  { name: "Knative", category: "Delivery", logo: `${SI}/knative.svg`, url: "https://knative.dev", what: "Serverless runtime", usage: "Kubernetes-based serverless for scale-to-zero workloads." },
  { name: "OpenFaaS", category: "Delivery", logo: `${SI}/openfaas.svg`, url: "https://www.openfaas.com", what: "Functions as a Service", usage: "Deploy event-driven functions on the platform." },
  { name: "DAPR", category: "Delivery", logo: `${SI}/dapr.svg`, url: "https://dapr.io", what: "Distributed app runtime", usage: "Sidecar building blocks: state, pub/sub, service invocation." },
  { name: "KEDA", category: "Delivery", logo: cncf("keda"), url: "https://keda.sh", what: "Event-driven autoscaling", usage: "Scales workloads on external event sources." },
  { name: "K6", category: "Delivery", logo: `${SI}/k6.svg`, url: "https://k6.io", what: "Load testing", usage: "Modern load and performance testing." },
  { name: "ChaosMesh", category: "Delivery", logo: cncf("chaosmesh"), url: "https://chaos-mesh.org", what: "Chaos engineering", usage: "Injects controlled failures to test resilience." },

  // ---- Data & analytics ----
  { name: "CloudNativePG", category: "Data", logo: cncf("cloudnativepg"), url: "https://cloudnative-pg.io", what: "PostgreSQL operator", usage: "Runs platform and self-service Postgres with replication and backups." },
  { name: "PostgreSQL", category: "Data", logo: `${DEV}/postgresql/postgresql-original.svg`, url: "https://www.postgresql.org", what: "Relational database", usage: "The default relational engine for platform and app data." },
  { name: "MinIO", category: "Data", logo: `${SI}/minio.svg`, url: "https://min.io", what: "Object storage", usage: "S3-compatible object storage for backups and app buckets." },
  { name: "Apache Kafka", category: "Data", logo: `${SI}/apachekafka.svg`, url: "https://kafka.apache.org", what: "Event streaming", usage: "Distributed event streaming for services and pipelines." },
  { name: "Valkey", category: "Data", logo: null, url: "https://valkey.io", what: "In-memory data store", usage: "Redis-compatible caching — the default cache engine." },
  { name: "Trino", category: "Data", logo: `${SI}/trino.svg`, url: "https://trino.io", what: "Distributed SQL", usage: "Federated SQL queries across data sources and the lakehouse." },
  { name: "Apache Iceberg", category: "Data", logo: null, url: "https://iceberg.apache.org", what: "Lakehouse table format", usage: "Open table format over platform object storage." },
  { name: "Apache Spark", category: "Data", logo: `${SI}/apachespark.svg`, url: "https://spark.apache.org", what: "Big-data processing", usage: "Large-scale batch and stream data processing." },
  { name: "ClickHouse", category: "Data", logo: `${SI}/clickhouse.svg`, url: "https://clickhouse.com", what: "Analytical database", usage: "Column-store analytics (powers PostHog and more)." },
  { name: "Airbyte", category: "Data", logo: `${SI}/airbyte.svg`, url: "https://airbyte.com", what: "Data integration (ELT)", usage: "Moves data between sources and the lakehouse." },
  { name: "Metabase", category: "Data", logo: `${SI}/metabase.svg`, url: "https://www.metabase.com", what: "Business intelligence", usage: "Self-serve dashboards and analytics." },
  { name: "PostHog", category: "Data", logo: `${SI}/posthog.svg`, url: "https://posthog.com", what: "Product analytics", usage: "Events, feature flags, and A/B testing." },
  { name: "Kubeflow", category: "Data", logo: "https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/kubeflow/icon/color/kubeflow-icon.svg", url: "https://www.kubeflow.org", what: "ML workflows", usage: "Machine-learning pipelines on Kubernetes." },

  // ---- AI ----
  { name: "vLLM", category: "AI", logo: `${SI}/vllm.svg`, url: "https://docs.vllm.ai", what: "LLM inference server", usage: "High-throughput model serving behind the AI gateway." },
  { name: "agentgateway", category: "AI", logo: null, url: "https://github.com/adhar-io/adhar", what: "AI data plane", usage: "OpenAI-compatible LLM routing, federated MCP tools, and guardrails." },

  // ---- Developer experience ----
  { name: "Backstage", category: "Developer Experience", logo: `${SI}/backstage.svg`, url: "https://backstage.io", what: "Developer portal", usage: "Powers the Adhar Console — catalog, golden paths, and scorecards." },
  { name: "Headlamp", category: "Developer Experience", logo: cncf("headlamp"), url: "https://headlamp.dev", what: "Kubernetes web UI", usage: "A friendly UI over cluster resources." },
  { name: "Coder", category: "Developer Experience", logo: `${SI}/coder.svg`, url: "https://coder.com", what: "Cloud development environments", usage: "Browser-based, reproducible dev workspaces." },
  { name: "DevSpace", category: "Developer Experience", logo: null, url: "https://www.devspace.sh", what: "Inner-loop dev tooling", usage: "Fast develop-in-cluster workflows." },
  { name: "Plane", category: "Developer Experience", logo: `${SI}/plane.svg`, url: "https://plane.so", what: "Project management", usage: "Issue tracking and planning on the platform." },
  { name: "Penpot", category: "Developer Experience", logo: `${SI}/penpot.svg`, url: "https://penpot.app", what: "Design & prototyping", usage: "Open-source design and prototyping." },
];

const CATEGORIES: Category[] = ["Core", "Security", "Observability", "Delivery", "Data", "AI", "Developer Experience"];

const CATEGORY_STYLE: Record<Category, { dot: string; chip: string; grad: string; layer: string }> = {
  Core: { dot: "bg-blue-500", chip: "text-blue-600 dark:text-blue-400 bg-blue-500/10 ring-blue-500/20", grad: "from-blue-500 to-cyan-500", layer: "Cluster Foundation" },
  Security: { dot: "bg-rose-500", chip: "text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-rose-500/20", grad: "from-rose-500 to-orange-500", layer: "Platform Services" },
  Observability: { dot: "bg-amber-500", chip: "text-amber-600 dark:text-amber-400 bg-amber-500/10 ring-amber-500/20", grad: "from-amber-500 to-yellow-500", layer: "Platform Services" },
  Delivery: { dot: "bg-violet-500", chip: "text-violet-600 dark:text-violet-400 bg-violet-500/10 ring-violet-500/20", grad: "from-violet-500 to-purple-500", layer: "Platform Services" },
  Data: { dot: "bg-emerald-500", chip: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 ring-emerald-500/20", grad: "from-emerald-500 to-teal-500", layer: "Platform Services" },
  AI: { dot: "bg-indigo-500", chip: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 ring-indigo-500/20", grad: "from-indigo-500 to-fuchsia-500", layer: "Platform Services" },
  "Developer Experience": { dot: "bg-cyan-500", chip: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 ring-cyan-500/20", grad: "from-cyan-500 to-sky-500", layer: "Developer Experience" },
};

/* ------------------------------------------------------------------ */
/* Logo with graceful monogram fallback                                */
/* ------------------------------------------------------------------ */

function ToolLogo({ tool, size = 44 }: { tool: Tool; size?: number }) {
  const [failed, setFailed] = useState(false);
  const monogram = tool.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  if (!tool.logo || failed) {
    return (
      <div
        className={`grid place-items-center rounded-xl bg-gradient-to-br ${CATEGORY_STYLE[tool.category].grad} text-white font-bold shrink-0`}
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        aria-hidden
      >
        {monogram}
      </div>
    );
  }
  return (
    <div className="grid place-items-center rounded-xl bg-white ring-1 ring-black/5 shadow-sm shrink-0" style={{ width: size, height: size }}>
      <img src={tool.logo} alt={`${tool.name} logo`} loading="lazy" decoding="async"
        style={{ width: size * 0.62, height: size * 0.62 }} className="object-contain"
        onError={() => setFailed(true)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const Integrations = () => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Category | "All">("All");
  const [selected, setSelected] = useState<Tool | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: TOOLS.length };
    for (const cat of CATEGORIES) c[cat] = TOOLS.filter((t) => t.category === cat).length;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      const matchesCat = active === "All" || t.category === active;
      const matchesQ = !q || t.name.toLowerCase().includes(q) || t.what.toLowerCase().includes(q) || t.usage.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [query, active]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navigation />

      {/* Hero */}
      <section className="relative section-padding container-padding overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-70 pointer-events-none" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
        <div className="max-width-content relative">
          <Reveal className="text-center">
            <span className="eyebrow mb-5"><Boxes className="w-3 h-3 mr-1" />Integrations & ecosystem</span>
            <h1 className="section-heading mt-5 text-foreground">
              Every tool Adhar runs
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">under the hood.</span>
            </h1>
            <p className="section-subheading mt-6">
              Adhar curates and pre-integrates {TOOLS.length}+ of the most trusted open-source projects into one
              coherent, secure, observable platform. Search, filter, and open any tool to see exactly how it's used.
            </p>
          </Reveal>

          <Reveal className="mt-10 flex flex-wrap justify-center gap-3" delay={80}>
            {[
              { value: "91", label: "packages" },
              { value: `${TOOLS.length}+`, label: "tools" },
              { value: "7", label: "categories" },
              { value: "100%", label: "open source" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur px-5 py-3 text-center">
                <div className="text-2xl font-semibold tracking-tight tabular">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Sticky controls */}
      <div className="sticky top-16 z-30 border-y border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-width-content container-padding py-4">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools — try 'gitops', 'secrets', 'kafka'…"
              className="w-full rounded-full border border-border bg-card/70 backdrop-blur pl-11 pr-11 h-11 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
              aria-label="Search tools"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 scrollbar-hide">
            {(["All", ...CATEGORIES] as const).map((cat) => {
              const isActive = active === cat;
              return (
                <button key={cat} type="button" onClick={() => setActive(cat)}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 h-8 text-[13px] font-medium transition-all duration-300 ring-1 ${
                    isActive ? "bg-primary text-primary-foreground ring-primary shadow-[var(--shadow-sm)]"
                    : "bg-card/60 text-muted-foreground ring-border hover:text-foreground hover:ring-foreground/20"}`}>
                  {cat !== "All" && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-primary-foreground" : CATEGORY_STYLE[cat as Category].dot}`} />}
                  {cat}
                  <span className={`text-[11px] tabular ${isActive ? "text-primary-foreground/80" : "text-muted-foreground/70"}`}>{counts[cat]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="container-padding py-12">
        <div className="max-width-content">
          <p className="text-center text-xs text-muted-foreground">
            Showing <span className="text-foreground font-medium">{filtered.length}</span> of {TOOLS.length} tools
          </p>

          {filtered.length === 0 ? (
            <div className="mt-16 text-center text-muted-foreground">
              No tools match “{query}”. <button className="text-primary hover:underline" onClick={() => { setQuery(""); setActive("All"); }}>Reset</button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((tool, i) => {
                const s = CATEGORY_STYLE[tool.category];
                return (
                  <button key={tool.name} type="button" onClick={() => setSelected(tool)}
                    style={{ animationDelay: `${Math.min(i, 14) * 30}ms` }}
                    className="animate-fade-in-up group relative text-left rounded-2xl border border-border/70 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                    <div className="flex items-start gap-4">
                      <div className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                        <ToolLogo tool={tool} size={44} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground tracking-tight truncate">{tool.name}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">{tool.what}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed line-clamp-2">{tool.usage}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${s.chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{tool.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                        Details <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <div className="flex flex-col h-full">
              <div className={`-mx-6 -mt-6 px-6 pt-10 pb-6 bg-gradient-to-br ${CATEGORY_STYLE[selected.category].grad} bg-opacity-10`}>
                <div className="flex items-center gap-4">
                  <ToolLogo tool={selected} size={60} />
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold tracking-tight text-white drop-shadow">{selected.name}</h2>
                    <p className="text-sm text-white/85 mt-0.5">{selected.what}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-6 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${CATEGORY_STYLE[selected.category].chip}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_STYLE[selected.category].dot}`} />{selected.category}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ring-border text-muted-foreground">
                    <Layers className="w-3 h-3" />{CATEGORY_STYLE[selected.category].layer}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">How Adhar uses it</div>
                  <p className="text-[15px] text-foreground leading-relaxed">{selected.usage}</p>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                  Ships as a GitOps package — enabled with a one-line change and reconciled by ArgoCD. See{" "}
                  <Link to="/docs/core-concepts/platform-services" className="text-primary hover:underline">Platform Services</Link>.
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <a href={selected.url} target="_blank" rel="noopener noreferrer"
                  className="btn-primary-modern inline-flex items-center justify-center gap-2 rounded-full h-11 px-5 text-sm font-medium">
                  Visit {selected.name} <ArrowUpRight className="w-4 h-4" />
                </a>
                <Link to="/docs/core-concepts/architecture" className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full h-11 px-5 text-sm font-medium">
                  <BookOpen className="w-4 h-4" /> How it all fits together
                </Link>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* CTA */}
      <section className="container-padding pb-24">
        <div className="max-width-content">
          <div className="surface-modern p-8 sm:p-12 text-center">
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">One command wires them all together</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Every tool here ships pre-integrated, secured, and observable. <code className="px-1.5 py-0.5 rounded bg-muted text-sm">adhar up</code> stands the whole stack up in under 10 minutes.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/docs/getting-started/quick-start" className="btn-primary-modern inline-flex items-center gap-2 rounded-full h-11 px-6 text-sm font-medium">
                  Get started <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/docs" className="btn-secondary-modern inline-flex items-center gap-2 rounded-full h-11 px-6 text-sm font-medium">
                  <BookOpen className="w-4 h-4" /> Read the docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Integrations;
