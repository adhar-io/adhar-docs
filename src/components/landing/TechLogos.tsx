import React, { useEffect, useState } from 'react';
import { 
  Box,
  GitBranch,
  Lock,
  Activity,
  Server,
  Shield,
  Database,
  Workflow,
  Container,
  Network,
  Eye,
  Gauge
} from 'lucide-react';

interface TechLogosProps {
  mousePosition: { x: number; y: number };
}

const TechLogos = ({ mousePosition }: TechLogosProps) => {
  const [animationOffsets, setAnimationOffsets] = useState<number[]>([]);

  useEffect(() => {
    const offsets = Array.from({ length: 12 }, () => Math.random() * 360);
    setAnimationOffsets(offsets);
  }, []);

  const technologies = [
    { name: 'Kubernetes', Icon: Box, color: 'from-blue-500 to-blue-600', sensitivity: 0.02 },
    { name: 'ArgoCD', Icon: GitBranch, color: 'from-orange-500 to-orange-600', sensitivity: 0.025 },
    { name: 'Vault', Icon: Lock, color: 'from-yellow-500 to-yellow-600', sensitivity: 0.03 },
    { name: 'Prometheus', Icon: Activity, color: 'from-red-500 to-red-600', sensitivity: 0.022 },
    { name: 'Cilium', Icon: Network, color: 'from-emerald-500 to-emerald-600', sensitivity: 0.028 },
    { name: 'Istio', Icon: Workflow, color: 'from-indigo-500 to-indigo-600', sensitivity: 0.024 },
    { name: 'PostgreSQL', Icon: Database, color: 'from-sky-500 to-sky-600', sensitivity: 0.026 },
    { name: 'Grafana', Icon: Gauge, color: 'from-amber-500 to-amber-600', sensitivity: 0.023 },
    { name: 'Consul', Icon: Server, color: 'from-pink-500 to-pink-600', sensitivity: 0.029 },
    { name: 'Keycloak', Icon: Shield, color: 'from-purple-500 to-purple-600', sensitivity: 0.021 },
    { name: 'Loki', Icon: Eye, color: 'from-cyan-500 to-cyan-600', sensitivity: 0.027 },
    { name: 'Docker', Icon: Container, color: 'from-blue-400 to-blue-500', sensitivity: 0.025 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {technologies.map(({ name, Icon, color, sensitivity }, index) => {
        const delay = index * 0.5;
        const offset = animationOffsets[index] || 0;
        
        // Parallax mouse influence
        const mouseInfluenceX = (mousePosition.x - window.innerWidth / 2) * sensitivity;
        const mouseInfluenceY = (mousePosition.y - window.innerHeight / 2) * sensitivity;
        
        const time = Date.now() / 1000;
        const floatX = Math.sin(time * 0.4 + offset) * 40;
        const floatY = Math.cos(time * 0.5 + offset) * 35;
        const rotation = Math.sin(time * 0.25 + offset) * 10;
        const scale = 1 + Math.sin(time * 0.3 + offset) * 0.08;
        
        return (
          <div
            key={`tech-${index}`}
            className="absolute group will-change-transform"
            style={{
              left: `${5 + (index * 7.5)}%`,
              top: `${10 + ((index * 13) % 70)}%`,
              animationDelay: `${delay}s`,
              transform: `
                translate3d(
                  ${floatX + mouseInfluenceX}px,
                  ${floatY + mouseInfluenceY}px,
                  0
                ) 
                rotate(${rotation}deg)
                scale(${scale})
              `,
              transition: 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
          >
            <div className={`
              relative backdrop-blur-md bg-background/10 dark:bg-background/5
              border border-primary/20 rounded-lg px-3 py-2
              shadow-lg shadow-primary/5
              group-hover:border-primary/40 group-hover:bg-background/20
              transition-all duration-500
            `}>
              {/* Gradient glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-500`}></div>
              
              {/* Content */}
              <div className="relative flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors duration-300" />
                <span className="text-xs font-medium text-foreground/70 group-hover:text-foreground transition-colors duration-300 whitespace-nowrap">
                  {name}
                </span>
              </div>
              
              {/* Subtle shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 rounded-lg"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TechLogos;
