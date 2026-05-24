
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PhaseNodeProps {
  phase: {
    id: string;
    title: string;
    icon: LucideIcon;
    color: string;
    position: { x: number; y: number };
    description: string;
    tools: string[];
  };
  index: number;
  isActive: boolean;
  onClick: () => void;
}

const PhaseNode = ({ phase, index, isActive, onClick }: PhaseNodeProps) => {
  const PhaseIcon = phase.icon;

  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
        isActive ? 'scale-110 z-10' : 'scale-100 z-5'
      }`}
      style={{ 
        left: `${phase.position.x}%`, 
        top: `${phase.position.y}%` 
      }}
    >
      <div className="relative">
        {/* Enhanced Glow Effect */}
        {isActive && (
          <div className={`absolute inset-0 bg-gradient-to-r ${phase.color} rounded-2xl blur-xl opacity-30 scale-150`}></div>
        )}
        
        {/* Professional Node Design */}
        <div 
          className={`relative w-24 h-24 bg-gradient-to-r ${phase.color} rounded-2xl shadow-lg flex items-center justify-center border-4 ${
            isActive ? 'border-white shadow-lg' : 'border-white/70'
          } transition-all duration-300 hover:scale-105 cursor-pointer group`}
          onClick={onClick}
        >
          <PhaseIcon className="w-10 h-10 text-white drop-shadow-lg" />
          
          {/* Phase Number Badge */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-800 shadow-md">
            {index + 1}
          </div>
        </div>
        
        {/* Enhanced Label */}
        <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 text-center">
          <div className={`bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 border shadow-lg ${
            isActive ? 'border-blue-300 shadow-blue-100/50' : 'border-gray-200'
          } transition-all duration-300 min-w-48`}>
            <h4 className="font-bold text-gray-900 text-sm mb-1">{phase.title}</h4>
            <p className="text-xs text-gray-600 leading-tight">{phase.description}</p>
          </div>
        </div>

        {/* Professional Tools Popup */}
        {isActive && (
          <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 min-w-64 animate-fade-in z-20">
            <div className="grid grid-cols-1 gap-2">
              {phase.tools.map((tool, toolIndex) => (
                <div key={toolIndex} className="flex items-center space-x-3 text-xs">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">{tool}</span>
                </div>
              ))}
            </div>
            {/* Enhanced Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhaseNode;
