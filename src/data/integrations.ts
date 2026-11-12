/**
 * The /integrations catalogue: every open-source project Adhar runs.
 *
 * The packages come from the platform repository through
 * adharPackages.generated.ts (regenerate with `node scripts/generate-integrations.mjs`).
 * This file adds what the contracts do not carry — a display name, a one-line
 * tagline and a colour logo — plus the foundation `adhar up` installs before any
 * package exists. Logos are each project's own colour mark, checked to load:
 * the CNCF/CDF artwork repos and devicon first, then Simple Icons'
 * brand-coloured CDN, then the project's GitHub avatar.
 */
import { ADHAR_PACKAGES, ADHAR_PACKAGES_SOURCE, type AdharPackage } from "./adharPackages.generated";

export type IntegrationCategory =
  | "Foundation"
  | "Core"
  | "Infrastructure"
  | "Security"
  | "Observability"
  | "Delivery"
  | "Data"
  | "AI";

export interface Integration {
  id: string;
  name: string;
  tagline: string;
  logo: string;
  category: IntegrationCategory;
  /** The package contract, or null for the foundation installed by `adhar up`. */
  pkg: AdharPackage | null;
  /** How Adhar uses it: the contract's description, or the foundation's role. */
  usage: string;
  homepage: string | null;
}

const J = "https://cdn.jsdelivr.net/gh";
const CNCF = `${J}/cncf/artwork@main/projects`;
const DEV = `${J}/devicons/devicon/icons`;
const SI = "https://cdn.simpleicons.org";
const gh = (org: string) => `https://github.com/${org}.png?size=128`;

const ARGO = `${CNCF}/argo/icon/color/argo-icon-color.svg`;
const CILIUM = `${CNCF}/cilium/icon/color/cilium_icon-color.svg`;
const GRAFANA = `${DEV}/grafana/grafana-original.svg`;
const KUBERNETES = `${DEV}/kubernetes/kubernetes-original.svg`;

/** Display name, tagline and logo per package name. */
const META: Record<string, { name: string; tagline: string; logo: string }> = {
  // AI
  agentgateway: { name: "agentgateway", tagline: "Governed AI gateway for models and MCP tools", logo: gh("agentgateway") },
  k8sgpt: { name: "K8sGPT", tagline: "AI explanations of unhealthy cluster objects", logo: `${CNCF}/k8sgpt/icon/color/k8sgpt-icon-color.svg` },
  "llm-d": { name: "llm-d", tagline: "Distributed LLM inference routing", logo: gh("llm-d") },
  "pr-agent": { name: "PR-Agent", tagline: "Automated pull-request review", logo: gh("qodo-ai") },
  vllm: { name: "vLLM", tagline: "Self-hosted LLM inference server", logo: `${SI}/vllm` },
  // Delivery and applications
  "argo-events": { name: "Argo Events", tagline: "Event-driven automation", logo: ARGO },
  "argo-rollout": { name: "Argo Rollouts", tagline: "Canary and blue-green delivery", logo: ARGO },
  "argo-workflows": { name: "Argo Workflows", tagline: "Container-native workflow engine", logo: ARGO },
  baserow: { name: "Baserow", tagline: "No-code database", logo: `${SI}/baserow` },
  buildpack: { name: "Cloud Native Buildpacks", tagline: "Source-to-image builds without Dockerfiles", logo: `${CNCF}/buildpacks/icon/color/buildpacks-icon-color.svg` },
  coder: { name: "Coder", tagline: "Cloud development environments", logo: gh("coder") },
  dapr: { name: "Dapr", tagline: "Distributed application runtime", logo: `${CNCF}/dapr/icon/color/dapr-icon-color.svg` },
  "external-dns": { name: "ExternalDNS", tagline: "DNS records for every platform hostname", logo: `${J}/kubernetes-sigs/external-dns@master/docs/img/external-dns.png` },
  harbor: { name: "Harbor", tagline: "Container registry with scanning", logo: `${CNCF}/harbor/icon/color/harbor-icon-color.svg` },
  k6: { name: "k6", tagline: "Distributed load testing", logo: `${SI}/k6` },
  kargo: { name: "Kargo", tagline: "GitOps promotion across environments", logo: `${J}/akuity/kargo/ui/public/kargo-logo.png` },
  keda: { name: "KEDA", tagline: "Event-driven autoscaling", logo: `${CNCF}/keda/icon/color/keda-icon-color.svg` },
  knative: { name: "Knative", tagline: "Serverless runtime behind Functions", logo: `${J}/cncf/artwork/projects/knative/icon/color/knative-icon-color.svg` },
  litmus: { name: "LitmusChaos", tagline: "Chaos engineering", logo: `${CNCF}/litmus/icon/color/litmus-icon-color.svg` },
  n8n: { name: "n8n", tagline: "Workflow automation", logo: `${SI}/n8n` },
  nexus: { name: "Nexus Repository", tagline: "Maven, npm and PyPI artefacts", logo: gh("sonatype") },
  penpot: { name: "Penpot", tagline: "Design and prototyping", logo: gh("penpot") },
  plane: { name: "Plane", tagline: "Project and issue tracking", logo: gh("makeplane") },
  posthog: { name: "PostHog", tagline: "Product analytics", logo: gh("PostHog") },
  strapi: { name: "Strapi", tagline: "Headless CMS", logo: `${SI}/strapi` },
  tekton: { name: "Tekton", tagline: "Kubernetes-native CI pipelines", logo: `${J}/cdfoundation/artwork/former_project_logos/tekton/icon/color/tekton-icon-color.svg` },
  tolgee: { name: "Tolgee", tagline: "Localisation and translation", logo: gh("tolgee") },
  tooljet: { name: "ToolJet", tagline: "Low-code internal tools", logo: gh("ToolJet") },
  // Core
  kamaji: { name: "Kamaji", tagline: "Hosted Kubernetes control planes", logo: gh("clastix") },
  karmada: { name: "Karmada", tagline: "Multi-cluster workload placement", logo: `${CNCF}/karmada/icon/color/karmada-icon-color.svg` },
  vcluster: { name: "vCluster", tagline: "Virtual Kubernetes clusters", logo: gh("loft-sh") },
  velero: { name: "Velero", tagline: "Backup and restore", logo: `${CNCF}/velero/icon/color/velero-icon-color.svg` },
  volcano: { name: "Volcano", tagline: "Batch scheduler with queues and gangs", logo: `${J}/cncf/artwork/projects/volcano/icon/color/volcano-icon-color.svg` },
  // Data
  airbyte: { name: "Airbyte", tagline: "Data integration (ELT)", logo: `${SI}/airbyte` },
  cnpg: { name: "CloudNativePG", tagline: "The platform's PostgreSQL", logo: `${CNCF}/cloudnativepg/icon/color/cloudnativepg-icon-color.svg` },
  dagster: { name: "Dagster", tagline: "Data asset orchestration", logo: gh("dagster-io") },
  jupyterhub: { name: "JupyterHub", tagline: "Multi-user notebooks", logo: `${DEV}/jupyter/jupyter-original.svg` },
  "kafka-operator": { name: "Strimzi Kafka", tagline: "Apache Kafka on Kubernetes", logo: `${CNCF}/strimzi/icon/color/strimzi-icon-color.svg` },
  "kafka-ui": { name: "Kafka UI", tagline: "Web console for Kafka", logo: gh("kafbat") },
  kubeflow: { name: "Kubeflow Pipelines", tagline: "Machine-learning workflows", logo: `${CNCF}/kubeflow/icon/color/kubeflow-icon.svg` },
  "libredb-studio": { name: "LibreDB Studio", tagline: "Browser SQL IDE", logo: gh("libredb") },
  "mariadb-operator": { name: "MariaDB", tagline: "MySQL-protocol database", logo: `${DEV}/mariadb/mariadb-original.svg` },
  metabase: { name: "Metabase", tagline: "Business intelligence", logo: `${SI}/metabase` },
  minio: { name: "MinIO", tagline: "S3-compatible object store", logo: `${SI}/minio` },
  mlflow: { name: "MLflow", tagline: "Experiment tracking and model registry", logo: `${SI}/mlflow` },
  mongodb: { name: "MongoDB", tagline: "Document database", logo: `${DEV}/mongodb/mongodb-original.svg` },
  "mysql-operator": { name: "MySQL", tagline: "InnoDB clusters on Kubernetes", logo: `${DEV}/mysql/mysql-original.svg` },
  neo4j: { name: "Neo4j", tagline: "Graph database", logo: `${DEV}/neo4j/neo4j-original.svg` },
  "open-metadata": { name: "OpenMetadata", tagline: "Data catalog and lineage", logo: gh("open-metadata") },
  opensearch: { name: "OpenSearch", tagline: "Search and analytics", logo: `${SI}/opensearch` },
  prefect: { name: "Prefect", tagline: "Python workflow orchestration", logo: gh("PrefectHQ") },
  rabbitmq: { name: "RabbitMQ", tagline: "Message broker", logo: `${DEV}/rabbitmq/rabbitmq-original.svg` },
  redis: { name: "Redis", tagline: "In-memory data store", logo: `${DEV}/redis/redis-original.svg` },
  rustfs: { name: "RustFS", tagline: "The platform's S3 store and lakehouse", logo: gh("rustfs") },
  "spark-operator": { name: "Apache Spark", tagline: "Large-scale data processing", logo: `${DEV}/apachespark/apachespark-original.svg` },
  trino: { name: "Trino", tagline: "Distributed SQL", logo: `${SI}/trino` },
  "valkey-admin": { name: "Valkey Admin", tagline: "Management UI for Valkey", logo: gh("valkey-io") },
  valkey: { name: "Valkey", tagline: "Redis-compatible cache", logo: gh("valkey-io") },
  // Infrastructure
  crossplane: { name: "Crossplane", tagline: "The control plane behind self-service APIs", logo: `${CNCF}/crossplane/icon/color/crossplane-icon-color.svg` },
  "gpu-operator": { name: "NVIDIA GPU Operator", tagline: "GPU drivers and sharing", logo: `${SI}/nvidia` },
  "kata-containers": { name: "Kata Containers", tagline: "MicroVM isolation for workloads", logo: gh("kata-containers") },
  terraform: { name: "Terraform", tagline: "Terraform and OpenTofu as Kubernetes resources", logo: `${DEV}/terraform/terraform-original.svg` },
  // Observability
  alloy: { name: "Grafana Alloy", tagline: "Telemetry collector", logo: `${J}/grafana/alloy@main/docs/sources/assets/alloy_icon_orange.svg` },
  beyla: { name: "Grafana Beyla", tagline: "eBPF auto-instrumentation", logo: GRAFANA },
  faro: { name: "Grafana Faro", tagline: "Browser real-user monitoring", logo: GRAFANA },
  "fluent-bit": { name: "Fluent Bit", tagline: "Log processor and forwarder", logo: `${SI}/fluentbit` },
  headlamp: { name: "Headlamp", tagline: "Kubernetes web UI", logo: `${CNCF}/headlamp/icon/color/headlamp-icon-color.png` },
  hubble: { name: "Hubble", tagline: "Network flow visibility", logo: `${J}/cilium/hubble@main/Documentation/images/hubble_logo.png` },
  "kube-prometheus": { name: "Prometheus", tagline: "Metrics, alerting and Grafana", logo: `${DEV}/prometheus/prometheus-original.svg` },
  "loki-stack": { name: "Grafana Loki", tagline: "Log store", logo: "https://grafana.com/static/img/logos/logo-loki.svg" },
  "metrics-server": { name: "metrics-server", tagline: "Resource metrics for autoscaling", logo: KUBERNETES },
  mimir: { name: "Grafana Mimir", tagline: "Long-term metrics storage", logo: "https://grafana.com/static/img/logos/logo-mimir.svg" },
  oncall: { name: "Grafana OnCall", tagline: "On-call scheduling and escalation", logo: GRAFANA },
  opencost: { name: "OpenCost", tagline: "Cost monitoring", logo: `${CNCF}/opencost/icon/color/Opencost_Icon_Color.svg` },
  pixie: { name: "Pixie", tagline: "eBPF observability", logo: `${CNCF}/pixie/icon/color/pixie-icon-color.svg` },
  pyroscope: { name: "Grafana Pyroscope", tagline: "Continuous profiling", logo: GRAFANA },
  tempo: { name: "Grafana Tempo", tagline: "Distributed tracing", logo: "https://grafana.com/static/assets/img/logos/grafana-tempo.svg" },
  "victoria-metrics": { name: "VictoriaMetrics", tagline: "Time-series database", logo: gh("VictoriaMetrics") },
  // Security
  "cert-manager": { name: "cert-manager", tagline: "TLS certificate automation", logo: `${CNCF}/cert-manager/icon/color/cert-manager-icon-color.svg` },
  cosign: { name: "Sigstore policy-controller", tagline: "Image signature verification", logo: gh("sigstore") },
  "external-secrets": { name: "External Secrets", tagline: "Secrets synced into workloads", logo: `${J}/external-secrets/external-secrets/assets/eso-logo-large.png` },
  falco: { name: "Falco", tagline: "Runtime threat detection", logo: `${CNCF}/falco/icon/color/falco-icon-color.svg` },
  keycloak: { name: "Keycloak", tagline: "Identity and single sign-on", logo: `${J}/cncf/artwork/projects/keycloak/icon/color/keycloak-icon-color.svg` },
  kyverno: { name: "Kyverno", tagline: "Policy engine", logo: `${CNCF}/kyverno/icon/color/kyverno-icon-color.svg` },
  openbao: { name: "OpenBao", tagline: "Secrets management", logo: `${SI}/openbao` },
  // Tetragon's own mark is a wide wordmark; it is a Cilium project, so it takes Cilium's icon.
  tetragon: { name: "Tetragon", tagline: "eBPF runtime security", logo: CILIUM },
  trivy: { name: "Trivy", tagline: "Vulnerability scanning", logo: `${SI}/trivy` },
  vault: { name: "HashiCorp Vault", tagline: "Secrets management", logo: `${SI}/vault` },
};

const CATEGORY: Record<string, IntegrationCategory> = {
  ai: "AI",
  application: "Delivery",
  core: "Core",
  data: "Data",
  infrastructure: "Infrastructure",
  observability: "Observability",
  security: "Security",
};

/** Installed by `adhar up` itself, in this order, before any package. */
const FOUNDATION: Integration[] = [
  {
    id: "kind", name: "Kind", tagline: "Local Kubernetes clusters", logo: `${J}/kubernetes-sigs/kind@main/logo/logo.png`,
    category: "Foundation", pkg: null, homepage: "https://kind.sigs.k8s.io",
    usage: "Runs the local platform: on a laptop, `adhar up` creates a Kind cluster first and builds everything else on it.",
  },
  {
    id: "kubernetes", name: "Kubernetes", tagline: "Container orchestration", logo: KUBERNETES,
    category: "Foundation", pkg: null, homepage: "https://kubernetes.io",
    usage: "The substrate of every Adhar cluster: Kind on a laptop, a managed or self-managed cluster on a cloud or on-prem.",
  },
  {
    id: "cilium", name: "Cilium", tagline: "eBPF networking and Gateway API", logo: CILIUM,
    category: "Foundation", pkg: null, homepage: "https://cilium.io",
    usage: "The whole network layer: CNI, kube-proxy replacement, the platform Gateway, network policy and the Hubble relay.",
  },
  {
    id: "argocd", name: "Argo CD", tagline: "GitOps continuous delivery", logo: ARGO,
    category: "Foundation", pkg: null, homepage: "https://argo-cd.readthedocs.io",
    usage: "Reconciles every platform package and every application from Git, and reports their health.",
  },
  {
    id: "gitea", name: "Gitea", tagline: "In-cluster Git server", logo: `${DEV}/gitea/gitea-original.svg`,
    category: "Foundation", pkg: null, homepage: "https://about.gitea.com",
    usage: "The source of truth inside the cluster: the packages, environments and templates repositories Argo CD syncs from.",
  },
];

export const INTEGRATIONS: Integration[] = [
  ...FOUNDATION,
  ...ADHAR_PACKAGES.map((pkg): Integration => {
    const meta = META[pkg.name];
    return {
      id: pkg.name,
      name: meta?.name ?? pkg.name,
      tagline: meta?.tagline ?? pkg.keywords.slice(0, 3).join(", "),
      logo: meta?.logo ?? "",
      category: CATEGORY[pkg.category] ?? "Core",
      pkg,
      usage: pkg.description,
      homepage: pkg.homepage,
    };
  }).sort((a, b) => a.name.localeCompare(b.name)),
];

export const INTEGRATIONS_SOURCE = ADHAR_PACKAGES_SOURCE;
