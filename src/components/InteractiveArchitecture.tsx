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
    { id: 'decision', name: 'Decision Team', icon: Users, color: 'text-teal-600', phase: 'decide' }
  ];

  const interfaceItems: InterfaceItem[] = [
    { id: 'console', name: 'Adhar Console', color: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' },
    { id: 'cli', name: 'Adhar CLI', color: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg' },
    { id: 'ai', name: 'Adhar AI', color: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' }
  ];

  const platformCategories: PlatformCategory[] = [
    {
      name: 'Plan & Design',
      color: 'bg-gradient-to-br from-orange-50 to-pink-50',
      tools: [
        { name: 'Sketch', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sketch/sketch-original.svg', color: 'bg-gradient-to-br from-orange-100 to-orange-200', description: 'Design Tool' },
        { name: 'Figma', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg', color: 'bg-gradient-to-br from-purple-100 to-purple-200', description: 'Collaborative Design' },
        { name: 'Jupyter', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jupyter/jupyter-original-wordmark.svg', color: 'bg-gradient-to-br from-orange-100 to-yellow-200', description: 'Data Analysis' },
        { name: 'Storybook', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/storybook/storybook-original.svg', color: 'bg-gradient-to-br from-pink-100 to-rose-200', description: 'Component Library' }
      ]
    },
    {
      name: 'Machine Learning & AI',
      color: 'bg-gradient-to-br from-red-50 to-orange-50',
      tools: [
        { name: 'PyTorch', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg', color: 'bg-gradient-to-br from-red-100 to-orange-200', description: 'ML Framework' },
        { name: 'React', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg', color: 'bg-gradient-to-br from-blue-100 to-cyan-200', description: 'Frontend Library' },
        { name: 'Angular', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg', color: 'bg-gradient-to-br from-red-100 to-red-200', description: 'Frontend Framework' },
        { name: 'TensorFlow', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg', color: 'bg-gradient-to-br from-orange-100 to-yellow-200', description: 'ML Platform' }
      ]
    },
    {
      name: 'Frameworks & Libraries',
      color: 'bg-gradient-to-br from-green-50 to-emerald-50',
      tools: [
        { name: 'Spring', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg', color: 'bg-gradient-to-br from-green-100 to-emerald-200', description: 'Java Framework' },
        { name: 'Node.js', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg', color: 'bg-gradient-to-br from-green-100 to-green-200', description: 'Runtime Environment' },
        { name: 'Django', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg', color: 'bg-gradient-to-br from-green-100 to-teal-200', description: 'Python Framework' },
        { name: 'Vue.js', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg', color: 'bg-gradient-to-br from-emerald-100 to-green-200', description: 'Progressive Framework' }
      ]
    },
    {
      name: 'Code & DevTools',
      color: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      tools: [
        { name: 'VS Code', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-200', description: 'Code Editor' },
        { name: 'Git', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg', color: 'bg-gradient-to-br from-orange-100 to-red-200', description: 'Version Control' },
        { name: 'Docker', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg', color: 'bg-gradient-to-br from-blue-100 to-cyan-200', description: 'Containerization' },
        { name: 'Jest', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jest/jest-plain.svg', color: 'bg-gradient-to-br from-red-100 to-pink-200', description: 'Testing Framework' }
      ]
    },
    {
      name: 'Backing Services',
      color: 'bg-gradient-to-br from-gray-50 to-slate-50',
      tools: [
        { name: 'Redis', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg', color: 'bg-gradient-to-br from-red-100 to-red-200', description: 'In-Memory Database' },
        { name: 'MongoDB', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg', color: 'bg-gradient-to-br from-green-100 to-emerald-200', description: 'NoSQL Database' },
        { name: 'Kafka', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/apachekafka/apachekafka-original.svg', color: 'bg-gradient-to-br from-gray-100 to-slate-200', description: 'Event Streaming' },
        { name: 'Postgres', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-200', description: 'SQL Database' }
      ]
    },
    {
      name: 'Security & Policy',
      color: 'bg-gradient-to-br from-yellow-50 to-amber-50',
      tools: [
        { name: 'Vault', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/vault.svg', color: 'bg-gradient-to-br from-yellow-100 to-amber-200', description: 'Secrets Management' },
        { name: 'Istio', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/istio.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-200', description: 'Service Mesh' },
        { name: 'OPA', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openpolicyagent.svg', color: 'bg-gradient-to-br from-purple-100 to-violet-200', description: 'Policy Engine' },
        { name: 'Falco', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/falco.svg', color: 'bg-gradient-to-br from-orange-100 to-amber-200', description: 'Runtime Security' }
      ]
    },
    {
      name: 'CI / CD',
      color: 'bg-gradient-to-br from-cyan-50 to-blue-50',
      tools: [
        { name: 'Jenkins', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-200', description: 'Build Automation' },
        { name: 'ArgoCD', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/argo.svg', color: 'bg-gradient-to-br from-orange-100 to-red-200', description: 'GitOps CD' },
        { name: 'Tekton', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tekton.svg', color: 'bg-gradient-to-br from-blue-100 to-cyan-200', description: 'Cloud-Native CI/CD' },
        { name: 'Flux', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/fluxcd.svg', color: 'bg-gradient-to-br from-cyan-100 to-blue-200', description: 'GitOps Toolkit' }
      ]
    },
    {
      name: 'Observability',
      color: 'bg-gradient-to-br from-orange-50 to-yellow-50',
      tools: [
        { name: 'Prometheus', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prometheus/prometheus-original.svg', color: 'bg-gradient-to-br from-orange-100 to-amber-200', description: 'Monitoring System' },
        { name: 'Grafana', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/grafana/grafana-original.svg', color: 'bg-gradient-to-br from-orange-100 to-red-200', description: 'Visualization' },
        { name: 'Jaeger', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/jaeger.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-200', description: 'Distributed Tracing' },
        { name: 'Elastic', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/elasticsearch/elasticsearch-original.svg', color: 'bg-gradient-to-br from-yellow-100 to-amber-200', description: 'Search & Analytics' }
      ]
    },
    {
      name: 'Data & Analytics',
      color: 'bg-gradient-to-br from-purple-50 to-indigo-50',
      tools: [
        { name: 'Spark', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/apachespark/apachespark-original.svg', color: 'bg-gradient-to-br from-orange-100 to-yellow-200', description: 'Unified Analytics' },
        { name: 'Airflow', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/apacheairflow.svg', color: 'bg-gradient-to-br from-cyan-100 to-blue-200', description: 'Workflow Platform' },
        { name: 'Tableau', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tableau.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-200', description: 'Data Visualization' },
        { name: 'Snowflake', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/snowflake.svg', color: 'bg-gradient-to-br from-blue-100 to-cyan-200', description: 'Cloud Data Platform' }
      ]
    },
    {
      name: 'Project Management & Collaboration',
      color: 'bg-gradient-to-br from-rose-50 to-pink-50',
      tools: [
        { name: 'Jira', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/jira.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-200', description: 'Issue Tracking' },
        { name: 'Slack', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg', color: 'bg-gradient-to-br from-purple-100 to-pink-200', description: 'Team Communication' },
        { name: 'Trello', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/trello/trello-plain.svg', color: 'bg-gradient-to-br from-blue-100 to-cyan-200', description: 'Project Management' },
        { name: 'Confluence', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/confluence.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-200', description: 'Documentation' }
      ]
    }
  ];

  const cloudProviders: Provider[] = [
    { name: 'AWS', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg', color: 'bg-gradient-to-br from-orange-100 to-yellow-100' },
    { name: 'Google Cloud', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-100' },
    { name: 'CIVO', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/civo.svg', color: 'bg-gradient-to-br from-blue-100 to-cyan-100' },
    { name: 'DigitalOcean', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/digitalocean/digitalocean-original.svg', color: 'bg-gradient-to-br from-blue-100 to-teal-100' },
    { name: 'Azure', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-100' },
    { name: 'On-Premise', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/databricks.svg', color: 'bg-gradient-to-br from-gray-100 to-slate-100' }
  ];

  const orchestrationTools: Provider[] = [
    { name: 'Cilium', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/cilium.svg', color: 'bg-gradient-to-br from-yellow-100 to-amber-100' },
    { name: 'NGINX', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nginx/nginx-original.svg', color: 'bg-gradient-to-br from-green-100 to-emerald-100' },
    { name: 'ArgoCD', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/argo.svg', color: 'bg-gradient-to-br from-orange-100 to-red-100' },
    { name: 'Kubernetes', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-100' },
    { name: 'Crossplane', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/crossplane.svg', color: 'bg-gradient-to-br from-purple-100 to-violet-100' },
    { name: 'Knative', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/knative.svg', color: 'bg-gradient-to-br from-blue-100 to-cyan-100' },
    { name: 'Helm', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/helm/helm-original.svg', color: 'bg-gradient-to-br from-blue-100 to-indigo-100' }
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
