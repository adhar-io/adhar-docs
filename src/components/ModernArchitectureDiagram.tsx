
import React from 'react';
import {
  Rocket,
  Boxes,
  GitBranch,
  Bot,
  Route,
  Ticket,
  RefreshCw,
  UserCheck
} from "lucide-react";
import CapabilityCard from './CapabilityCard';
import InteractiveArchitecture from './InteractiveArchitecture';

const ModernArchitectureDiagram = () => {
  const capabilities = [
    {
      icon: Rocket,
      title: 'Golden paths',
      description: 'Templates give every new service CI, image signing, GitOps delivery and observability from its first commit.',
      feature: 'Paved road',
      gradientFrom: 'bg-blue-600',
      gradientTo: '',
      featureIcon: Route,
      useSolidBackground: true
    },
    {
      icon: Boxes,
      title: 'Self-service infrastructure',
      description: 'Request a database, cache or bucket as a Kubernetes resource. Crossplane provisions it within your quota.',
      feature: 'No tickets',
      gradientFrom: 'bg-purple-600',
      gradientTo: '',
      featureIcon: Ticket,
      useSolidBackground: true
    },
    {
      icon: GitBranch,
      title: 'Reconciled from Git',
      description: 'ArgoCD keeps the cluster in step with Git. Manual drift is reverted, and every change has a reviewable history.',
      feature: 'Self-healing',
      gradientFrom: 'bg-green-600',
      gradientTo: '',
      featureIcon: RefreshCw,
      useSolidBackground: true
    },
    {
      icon: Bot,
      title: 'Governed AI',
      description: 'Agents work through one gateway and propose changes as pull requests. A person reviews and merges each one.',
      feature: 'Human in the loop',
      gradientFrom: 'bg-orange-600',
      gradientTo: '',
      featureIcon: UserCheck,
      useSolidBackground: true
    }
  ];

  return (
    <div className="space-y-14 lg:space-y-16">
      {/* Capability cards — clean neutral surfaces */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {capabilities.map((capability) => (
          <CapabilityCard
            key={capability.title}
            icon={capability.icon}
            title={capability.title}
            description={capability.description}
            feature={capability.feature}
            gradientFrom={capability.gradientFrom}
            gradientTo={capability.gradientTo}
            featureIcon={capability.featureIcon}
            useSolidBackground={capability.useSolidBackground}
          />
        ))}
      </div>

      {/* Interactive Architecture Diagram */}
      <div className="w-full">
        <InteractiveArchitecture />
      </div>
    </div>
  );
};

export default ModernArchitectureDiagram;
