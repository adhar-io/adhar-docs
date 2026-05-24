
import React, { useState } from 'react';
import { 
  Target, 
  Palette, 
  Code, 
  Rocket, 
  Sparkles,
  Users,
  GitBranch,
  Shield,
  Monitor,
  Database,
  Cloud,
  BarChart3,
  Server,
  Network
} from "lucide-react";
import PhaseNode from './architecture/PhaseNode';
import ConnectionLines from './architecture/ConnectionLines';
import InfrastructureLayer from './architecture/InfrastructureLayer';
import IntegrationLayer from './architecture/IntegrationLayer';
import ProgressIndicator from './architecture/ProgressIndicator';
import FloatingMetrics from './architecture/FloatingMetrics';
import DiagramHeader from './architecture/DiagramHeader';

const ArchitectureDiagram = () => {
  const [activePhase, setActivePhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const phases = [
    {
      id: 'define',
      title: 'Define',
      icon: Target,
      color: 'from-blue-500 to-cyan-500',
      position: { x: 10, y: 20 },
      description: 'Requirements & Architecture Planning',
      tools: ['Business Requirements', 'Technical Specifications', 'Architecture Design', 'Security Policies']
    },
    {
      id: 'design',
      title: 'Design',
      icon: Palette,
      color: 'from-purple-500 to-pink-500',
      position: { x: 30, y: 10 },
      description: 'System Architecture & API Design',
      tools: ['Microservices Design', 'API Specifications', 'Database Schema', 'Security Framework']
    },
    {
      id: 'develop',
      title: 'Develop',
      icon: Code,
      color: 'from-green-500 to-emerald-500',
      position: { x: 50, y: 20 },
      description: 'Development & Testing',
      tools: ['Code Development', 'Unit Testing', 'Integration Testing', 'Code Reviews']
    },
    {
      id: 'deliver',
      title: 'Deliver',
      icon: Rocket,
      color: 'from-orange-500 to-red-500',
      position: { x: 70, y: 10 },
      description: 'CI/CD & Production Deployment',
      tools: ['Automated Pipelines', 'Container Deployment', 'Load Balancing', 'Health Monitoring']
    },
    {
      id: 'discover',
      title: 'Discover',
      icon: Sparkles,
      color: 'from-teal-500 to-blue-500',
      position: { x: 90, y: 20 },
      description: 'Analytics & Continuous Optimization',
      tools: ['Performance Metrics', 'User Analytics', 'Cost Optimization', 'Feedback Loops']
    }
  ];

  const connections = [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
    { from: 4, to: 0 } // Continuous improvement loop
  ];

  const infrastructureComponents = [
    { icon: Cloud, label: 'Multi-Cloud Infrastructure', position: { x: 15, y: 60 }, description: 'AWS, Azure, GCP' },
    { icon: Shield, label: 'Enterprise Security', position: { x: 35, y: 65 }, description: 'Zero-Trust Architecture' },
    { icon: Database, label: 'Data Management', position: { x: 55, y: 60 }, description: 'Distributed Databases' },
    { icon: Monitor, label: 'Observability Stack', position: { x: 75, y: 65 }, description: 'Monitoring & Alerting' }
  ];

  const integrations = [
    { icon: GitBranch, label: 'Git Providers', position: { x: 10, y: 85 }, description: 'GitHub, GitLab, Bitbucket' },
    { icon: Server, label: 'Container Registry', position: { x: 30, y: 90 }, description: 'Harbor, ECR, ACR' },
    { icon: Network, label: 'Service Mesh', position: { x: 70, y: 90 }, description: 'Istio, Linkerd' },
    { icon: BarChart3, label: 'Analytics Platform', position: { x: 90, y: 85 }, description: 'Grafana, Prometheus' }
  ];

  const startAnimation = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative w-full h-[700px] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1e40af" strokeWidth="1"/>
              <circle cx="30" cy="30" r="1" fill="#1e40af"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <DiagramHeader isPlaying={isPlaying} onTogglePlay={startAnimation} />

      <ConnectionLines 
        phases={phases} 
        connections={connections} 
        activePhase={activePhase} 
      />

      {/* Enhanced Phase Nodes */}
      {phases.map((phase, index) => (
        <PhaseNode
          key={phase.id}
          phase={phase}
          index={index}
          isActive={activePhase === index}
          onClick={() => setActivePhase(index)}
        />
      ))}

      <InfrastructureLayer infrastructureComponents={infrastructureComponents} />
      <IntegrationLayer integrations={integrations} />
      <ProgressIndicator 
        phases={phases} 
        activePhase={activePhase} 
        onPhaseClick={setActivePhase} 
      />
      <FloatingMetrics />
    </div>
  );
};

export default ArchitectureDiagram;
