
import React from 'react';

interface ProgressIndicatorProps {
  phases: any[];
  activePhase: number;
  onPhaseClick: (index: number) => void;
}

const ProgressIndicator = ({ phases, activePhase, onPhaseClick }: ProgressIndicatorProps) => {
  return (
    <div className="absolute bottom-36 left-1/2 transform -translate-x-1/2">
      <div className="flex space-x-3 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md border border-gray-200">
        {phases.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-500 cursor-pointer ${
              index === activePhase 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 scale-125 shadow-sm' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            onClick={() => onPhaseClick(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;
