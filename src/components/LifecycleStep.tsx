
import React from 'react';
import { LucideIcon, Bot, Sparkles } from 'lucide-react';

interface LifecycleStepProps {
  step: {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    position: { x: number; y: number };
    color: string;
    bgColor: string;
    aiFeature: string;
  };
  isActive: boolean;
  onClick: () => void;
}

const LifecycleStep = ({ step, isActive, onClick }: LifecycleStepProps) => {
  const StepIcon = step.icon;
  
  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 cursor-pointer ${
        isActive ? 'scale-110 z-10' : 'scale-100 z-5'
      }`}
      style={{ 
        left: `${step.position.x}%`, 
        top: `${step.position.y}%` 
      }}
      onClick={onClick}
    >
      <div className={`relative ${isActive ? 'animate-pulse' : ''}`}>
        {/* Enhanced Glow Effect for Dark Mode */}
        {isActive && (
          <div className={`absolute inset-0 bg-gradient-to-r ${step.color} rounded-3xl blur-2xl opacity-30 dark:opacity-40 scale-150`}></div>
        )}
        
        {/* Enhanced Step Card with Better Dark Mode Support */}
        <div className={`relative w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl border ${
          isActive ? 'border-blue-200 dark:border-blue-500 shadow-2xl shadow-blue-100/50 dark:shadow-blue-900/50' : 'border-gray-200/70 dark:border-gray-600/70 shadow-lg'
        } transition-all duration-700 hover:scale-105 group overflow-hidden`}>
          
          {/* AI Assistant Badge with Dark Mode */}
          <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 rounded-full p-1.5 shadow-lg">
            <Bot className="w-3 h-3 text-white" />
          </div>
          
          {/* Content with Enhanced Dark Mode Text */}
          <div className="p-6 text-center">
            <div className={`w-14 h-14 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
              <StepIcon className="w-7 h-7 text-white" />
            </div>
            
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{step.title}</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">{step.description}</p>
            
            {/* AI Feature Highlight with Better Dark Mode */}
            <div className={`bg-gradient-to-r ${step.bgColor} rounded-xl p-3 border border-gray-100 dark:border-gray-600`}>
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{step.aiFeature}</span>
              </div>
            </div>
          </div>
          
          {/* Active Indicator */}
          {isActive && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></div>
          )}
          
          {/* Gradient Border */}
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color} rounded-b-3xl`}></div>
        </div>
      </div>
    </div>
  );
};

export default LifecycleStep;
