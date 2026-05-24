
import React from 'react';
import { 
  Brain,
  Zap,
  Sparkles,
  Bot,
  Activity,
  Users,
  Rocket
} from "lucide-react";
import CapabilityCard from './CapabilityCard';
import InteractiveArchitecture from './InteractiveArchitecture';

const ModernArchitectureDiagram = () => {
  const capabilities = [
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Comprehensive AI assistance across every phase of development lifecycle',
      feature: 'Smart Automation',
      gradientFrom: 'bg-blue-600',
      gradientTo: '',
      featureIcon: Sparkles,
      useSolidBackground: true
    },
    {
      icon: Zap,
      title: 'Accelerated Development',
      description: '10x faster development with automated workflows and intelligent code generation',
      feature: 'Rapid Deployment',
      gradientFrom: 'bg-purple-600',
      gradientTo: '',
      featureIcon: Rocket,
      useSolidBackground: true
    },
    {
      icon: Sparkles,
      title: 'Intelligent Automation',
      description: 'Self-healing systems with proactive monitoring and automatic optimization',
      feature: 'Self-Healing',
      gradientFrom: 'bg-green-600',
      gradientTo: '',
      featureIcon: Activity,
      useSolidBackground: true
    },
    {
      icon: Bot,
      title: 'Universal AI Assistant',
      description: 'Every platform user gets personalized AI guidance for their specific role and tasks',
      feature: 'Personalized',
      gradientFrom: 'bg-orange-600',
      gradientTo: '',
      featureIcon: Users,
      useSolidBackground: true
    }
  ];

  return (
    <div className="space-y-16">
      {/* Enhanced Featured Capabilities with Solid Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-4">
        {capabilities.map((capability, index) => (
          <CapabilityCard
            key={index}
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
