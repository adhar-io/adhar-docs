
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Phase {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  position: { x: number; y: number };
  description: string;
  tools: string[];
}

interface ConnectionLinesProps {
  phases: Phase[];
  connections: { from: number; to: number }[];
  activePhase: number;
}

const ConnectionLines = ({ phases, connections, activePhase }: ConnectionLinesProps) => {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
      <defs>
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="dataFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <marker id="arrowhead" markerWidth="12" markerHeight="8" 
                refX="11" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="url(#connectionGradient)" />
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {connections.map((connection, index) => {
        const fromPhase = phases[connection.from];
        const toPhase = phases[connection.to];
        const isActive = activePhase === connection.from;
        
        return (
          <line
            key={index}
            x1={`${fromPhase.position.x + 6}%`}
            y1={`${fromPhase.position.y + 4}%`}
            x2={`${toPhase.position.x - 4}%`}
            y2={`${toPhase.position.y + 4}%`}
            stroke={isActive ? "url(#connectionGradient)" : "#cbd5e1"}
            strokeWidth={isActive ? "4" : "2"}
            markerEnd="url(#arrowhead)"
            className={`transition-all duration-700 ${isActive ? 'opacity-100' : 'opacity-40'}`}
            filter={isActive ? "url(#glow)" : "none"}
            strokeDasharray={isActive ? "0" : "8,4"}
          />
        );
      })}

      {/* Enhanced Data Flow Visualization */}
      <path
        d="M 12% 50% Q 30% 40%, 50% 50% T 88% 50%"
        stroke="url(#dataFlowGradient)"
        strokeWidth="3"
        fill="none"
        strokeDasharray="12,6"
        className="opacity-70"
      >
        <animate attributeName="stroke-dashoffset" values="0;-18" dur="3s" repeatCount="indefinite" />
      </path>
    </svg>
  );
};

export default ConnectionLines;
