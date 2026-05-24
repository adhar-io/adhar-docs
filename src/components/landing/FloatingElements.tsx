
import React, { useEffect, useState } from 'react';
import { 
  Star, 
  Sparkles, 
  Zap,
  Diamond,
  Heart,
  Cpu,
  Cloud,
  Rocket
} from 'lucide-react';

interface FloatingElementsProps {
  mousePosition: { x: number; y: number };
}

const FloatingElements = ({ mousePosition }: FloatingElementsProps) => {
  const [animationOffsets, setAnimationOffsets] = useState<number[]>([]);

  useEffect(() => {
    const offsets = Array.from({ length: 8 }, () => Math.random() * 360);
    setAnimationOffsets(offsets);
  }, []);

  const prominentIcons = [
    { Icon: Star, color: 'text-yellow-400', size: 'w-16 h-16', category: 'star', sensitivity: 0.03 },
    { Icon: Sparkles, color: 'text-purple-400', size: 'w-14 h-14', category: 'sparkle', sensitivity: 0.025 },
    { Icon: Zap, color: 'text-blue-400', size: 'w-14 h-14', category: 'tech', sensitivity: 0.035 },
    { Icon: Diamond, color: 'text-emerald-400', size: 'w-12 h-12', category: 'gem', sensitivity: 0.03 },
    { Icon: Heart, color: 'text-red-400', size: 'w-12 h-12', category: 'heart', sensitivity: 0.025 },
    { Icon: Cpu, color: 'text-cyan-400', size: 'w-14 h-14', category: 'tech', sensitivity: 0.04 },
    { Icon: Cloud, color: 'text-indigo-400', size: 'w-16 h-16', category: 'cloud', sensitivity: 0.02 },
    { Icon: Rocket, color: 'text-pink-400', size: 'w-12 h-12', category: 'rocket', sensitivity: 0.035 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {prominentIcons.map(({ Icon, color, size, category, sensitivity }, index) => {
        const delay = index * 0.8;
        const offset = animationOffsets[index] || 0;
        
        // Smoother mouse influence calculation
        const mouseInfluenceX = (mousePosition.x - window.innerWidth / 2) * sensitivity;
        const mouseInfluenceY = (mousePosition.y - window.innerHeight / 2) * sensitivity;
        
        const time = Date.now() / 1000;
        const floatX = Math.sin(time * 0.5 + offset) * 30;
        const floatY = Math.cos(time * 0.7 + offset) * 25;
        const rotation = Math.sin(time * 0.3 + offset) * 15;
        const scale = 1 + Math.sin(time * 0.4 + offset) * 0.1;
        
        return (
          <div
            key={`prominent-${index}`}
            className="absolute group cursor-none z-10 will-change-transform"
            style={{
              left: `${10 + (index * 11)}%`,
              top: `${8 + (index % 3) * 15}%`,
              animationDelay: `${delay}s`,
              transform: `
                translate3d(
                  ${floatX + mouseInfluenceX}px,
                  ${floatY + mouseInfluenceY}px,
                  0
                ) 
                rotate(${rotation + mouseInfluenceX * 0.05}deg)
                scale(${scale})
              `,
              transition: 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
          >
            <div className={`${color} opacity-80 hover:opacity-100 transition-all duration-700 relative`}>
              {/* Main icon without background glow effects */}
              <div className="relative group-hover:scale-110 transition-transform duration-500 ease-out">
                <Icon className={`${size} transition-all duration-500 ${
                  category === 'star' 
                    ? 'animate-pulse' 
                    : category === 'sparkle' 
                    ? 'animate-bounce' 
                    : category === 'tech'
                    ? 'animate-pulse'
                    : category === 'gem'
                    ? 'animate-spin-slow'
                    : category === 'heart'
                    ? 'animate-pulse'
                    : category === 'cloud'
                    ? 'animate-float-slow'
                    : category === 'rocket'
                    ? 'animate-bounce-slow'
                    : 'animate-pulse'
                }`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FloatingElements;
