import React from 'react';
import { 
  Users, 
  Code, 
  Rocket, 
  Search, 
  PenTool,
  Target,
  Brain
} from 'lucide-react';

// Import all the components
import ArchitectureHeader from './architecture/ArchitectureHeader';
import DevelopmentPhases from './architecture/DevelopmentPhases';
import TeamsSection from './architecture/TeamsSection';
import InterfaceLayer from './architecture/InterfaceLayer';
import ControlPlane from './architecture/ControlPlane';
import PlatformStack from './architecture/PlatformStack';
import OrchestrationLayer from './architecture/OrchestrationLayer';
import CloudProviders from './architecture/CloudProviders';

// Import types
import { Phase, Team, InterfaceItem, PlatformCategory, Provider } from './architecture/types';

const InteractiveArchitecture = () => {
  const phases: Phase[] = [
    { id: 'define', label: 'Define', color: 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800', icon: Target },
    { id: 'design', label: 'Design', color: 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800', icon: PenTool },
    { id: 'develop', label: 'Develop', color: 'bg-gradient-to-r from-green-50 to-green-100 text-green-800', icon: Code },
    { id: 'deliver', label: 'Deliver', color: 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800', icon: Rocket },
    { id: 'discover', label: 'Discover', color: 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800', icon: Search },
    { id: 'decide', label: 'Decide', color: 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-800', icon: Brain }
  ];

  const teams: Team[] = [
    { id: 'design', name: 'Design Team', icon: Users, color: 'text-blue-600', phase: 'define' },
    { id: 'business', name: 'Business Team', icon: Users, color: 'text-orange-600', phase: 'design' },
    { id: 'application', name: 'Application Team', icon: Users, color: 'text-green-600', phase: 'develop' },
    { id: 'platform', name: 'Platform Team', icon: Users, color: 'text-purple-600', phase: 'deliver' },
    { id: 'management', name: 'Management Team', icon: Users, color: 'text-indigo-600', phase: 'discover' },
    { id: 'decision', name: 'Operations Team', icon: Users, color: 'text-teal-600', phase: 'decide' }
  ];

  const interfaceItems: InterfaceItem[] = [
    { id: 'console', name: 'Adhar Console', color: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' },
    { id: 'cli', name: 'Adhar CLI', color: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg' },
    { id: 'ai', name: 'Adhar AI', color: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' }
  ];

  // Tool tiles use a clean white chip so each brand logo reads clearly.
  const TILE = 'bg-white shadow-sm ring-1 ring-black/5';
  // Every tool below is part of the real ADHAR stack; logos use the same
  // reliable CDN patterns as the /integrations catalogue (devicon,
  // simple-icons, and the CNCF artwork repo). Unavailable icons fall back to a
  // monogram via each tile's onError handler.
  const platformCategories: PlatformCategory[] = [
    {
      name: 'Core Platform',
      color: 'bg-gradient-to-br from-slate-50 to-blue-50',
      tools: [
        { name: 'Adhar Console', icon: '/favicon.svg', color: TILE, description: 'Unified platform control plane' },
        { name: 'Crossplane', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/crossplane/icon/color/crossplane-icon-color.svg', color: TILE, description: 'Self-service infrastructure APIs' },
        { name: 'Cilium', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/cilium.svg', color: TILE, description: 'eBPF networking & Gateway API' },
        { name: 'Velero', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/velero/icon/color/velero-icon-color.svg', color: TILE, description: 'Backup & disaster recovery' }
      ]
    },
    {
      name: 'GitOps & CI/CD',
      color: 'bg-gradient-to-br from-sky-50 to-cyan-50',
      tools: [
        { name: 'Argo CD', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/argo.svg', color: TILE, description: 'GitOps continuous delivery' },
        { name: 'Tekton', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tekton.svg', color: TILE, description: 'Cloud-native CI/CD pipelines' },
        { name: 'Argo Workflows', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/argo.svg', color: TILE, description: 'Container-native workflows' },
        { name: 'Buildpacks', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/buildpacks/icon/color/buildpacks-icon-color.svg', color: TILE, description: 'Source-to-container builds' }
      ]
    },
    {
      name: 'Build & Delivery',
      color: 'bg-gradient-to-br from-indigo-50 to-blue-50',
      tools: [
        { name: 'Harbor', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/harbor.svg', color: TILE, description: 'Container & artifact registry' },
        { name: 'Backstage', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/backstage.svg', color: TILE, description: 'Developer portal & catalog' },
        { name: 'Kargo', icon: 'https://cdn.jsdelivr.net/gh/akuity/kargo/ui/public/kargo-logo.png', color: TILE, description: 'Multi-stage GitOps promotion' },
        { name: 'Coder', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/coder.svg', color: TILE, description: 'Self-hosted dev environments' }
      ]
    },
    {
      name: 'Serverless & Scaling',
      color: 'bg-gradient-to-br from-violet-50 to-purple-50',
      tools: [
        { name: 'Knative', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/knative.svg', color: TILE, description: 'Serverless containers' },
        { name: 'OpenFaaS', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openfaas.svg', color: TILE, description: 'Functions as a service' },
        { name: 'KEDA', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/keda/icon/color/keda-icon-color.svg', color: TILE, description: 'Event-driven autoscaling' },
        { name: 'Dapr', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/dapr.svg', color: TILE, description: 'Distributed application runtime' }
      ]
    },
    {
      name: 'Identity & Secrets',
      color: 'bg-gradient-to-br from-amber-50 to-yellow-50',
      tools: [
        { name: 'Keycloak', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/keycloak.svg', color: TILE, description: 'Identity & single sign-on' },
        { name: 'OpenBao', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openbao.svg', color: TILE, description: 'Secrets management' },
        { name: 'External Secrets', icon: 'https://cdn.jsdelivr.net/gh/external-secrets/external-secrets/assets/eso-logo-large.png', color: TILE, description: 'Sync secrets into workloads' },
        { name: 'cert-manager', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/cert-manager/icon/color/cert-manager-icon-color.svg', color: TILE, description: 'Automated TLS certificates' }
      ]
    },
    {
      name: 'Security & Compliance',
      color: 'bg-gradient-to-br from-red-50 to-orange-50',
      tools: [
        { name: 'Kyverno', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/kyverno/icon/color/kyverno-icon-color.svg', color: TILE, description: 'Policy as code' },
        { name: 'Falco', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/falco.svg', color: TILE, description: 'Runtime threat detection' },
        { name: 'Trivy', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/trivy.svg', color: TILE, description: 'Vulnerability scanning' },
        { name: 'Tetragon', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/cilium.svg', color: TILE, description: 'eBPF security observability' }
      ]
    },
    {
      name: 'Databases',
      color: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      tools: [
        { name: 'CloudNativePG', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/cloudnativepg/icon/color/cloudnativepg-icon-color.svg', color: TILE, description: 'PostgreSQL operator' },
        { name: 'PostgreSQL', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg', color: TILE, description: 'Relational database' },
        { name: 'Valkey', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/valkey.svg', color: TILE, description: 'Redis-compatible cache' },
        { name: 'ClickHouse', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/clickhouse.svg', color: TILE, description: 'Analytical database' }
      ]
    },
    {
      name: 'Streaming & Storage',
      color: 'bg-gradient-to-br from-cyan-50 to-sky-50',
      tools: [
        { name: 'Kafka', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/apachekafka.svg', color: TILE, description: 'Event streaming platform' },
        { name: 'MinIO', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/minio.svg', color: TILE, description: 'S3-compatible object storage' },
        { name: 'Trino', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/trino.svg', color: TILE, description: 'Distributed SQL query engine' },
        { name: 'Spark', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/apachespark.svg', color: TILE, description: 'Large-scale data processing' }
      ]
    },
    {
      name: 'Data & Analytics',
      color: 'bg-gradient-to-br from-purple-50 to-fuchsia-50',
      tools: [
        { name: 'Airbyte', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/airbyte.svg', color: TILE, description: 'Data integration / ELT' },
        { name: 'Kubeflow', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/kubeflow/icon/color/kubeflow-icon.svg', color: TILE, description: 'Machine-learning workflows' },
        { name: 'Metabase', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/metabase.svg', color: TILE, description: 'Business intelligence' },
        { name: 'PostHog', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/posthog.svg', color: TILE, description: 'Product analytics' }
      ]
    },
    {
      name: 'Developer Apps',
      color: 'bg-gradient-to-br from-rose-50 to-pink-50',
      tools: [
        { name: 'Headlamp', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/headlamp/icon/color/headlamp-icon-color.svg', color: TILE, description: 'Kubernetes web UI' },
        { name: 'Plane', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/plane.svg', color: TILE, description: 'Project management' },
        { name: 'Penpot', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/penpot.svg', color: TILE, description: 'Design & prototyping' },
        { name: 'DevSpace', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/devspace.svg', color: TILE, description: 'Inner-loop dev tooling' }
      ]
    }
  ];

  const cloudProviders: Provider[] = [
    { name: 'AWS', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg', color: 'bg-gradient-to-br from-orange-100 to-yellow-100', hideName: true },
    { name: 'Google Cloud', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-100' },
    { name: 'CIVO', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/civo.svg', color: 'bg-gradient-to-br from-blue-100 to-cyan-100', hideName: true },
    { name: 'DigitalOcean', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/digitalocean/digitalocean-original.svg', color: 'bg-gradient-to-br from-blue-100 to-teal-100' },
    { name: 'Azure', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-100' },
    { name: 'On-Premise', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/databricks.svg', color: 'bg-gradient-to-br from-gray-100 to-slate-100' }
  ];

  const orchestrationTools: Provider[] = [
    { name: 'Cilium', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/cilium.svg', color: 'bg-gradient-to-br from-yellow-100 to-amber-100' },
    { name: 'Kyverno', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/kyverno/icon/color/kyverno-icon-color.svg', color: 'bg-gradient-to-br from-sky-100 to-blue-100' },
    { name: 'ArgoCD', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/argo.svg', color: 'bg-gradient-to-br from-orange-100 to-red-100' },
    { name: 'Kubernetes', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-100' },
    { name: 'Crossplane', icon: 'https://cdn.jsdelivr.net/gh/cncf/artwork@main/projects/crossplane/icon/color/crossplane-icon-color.svg', color: 'bg-gradient-to-br from-purple-100 to-violet-100' },
    { name: 'Gitea', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/gitea.svg', color: 'bg-gradient-to-br from-green-100 to-teal-100' },
    { name: 'Keycloak', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/keycloak.svg', color: 'bg-gradient-to-br from-cyan-100 to-sky-100' }
  ];

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[var(--shadow-sm)]">
      <ArchitectureHeader />

      <div className="p-6 sm:p-8 lg:p-10 space-y-10 sm:space-y-12">
        <DevelopmentPhases phases={phases} />

        <div className="h-px bg-border/60" />

        <TeamsSection teams={teams} />

        <div className="h-px bg-border/60" />

        <InterfaceLayer interfaceItems={interfaceItems} />

        <div className="h-px bg-border/60" />

        <ControlPlane />

        <div className="h-px bg-border/60" />

        <PlatformStack platformCategories={platformCategories} />

        <div className="h-px bg-border/60" />

        <OrchestrationLayer orchestrationTools={orchestrationTools} />

        <div className="h-px bg-border/60" />

        <CloudProviders cloudProviders={cloudProviders} />
      </div>
    </div>
  );
};

export default InteractiveArchitecture;
