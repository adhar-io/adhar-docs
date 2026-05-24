
import React from 'react';
import { Phase } from './types';

interface DevelopmentPhasesProps {
  phases: Phase[];
}

const DevelopmentPhases = ({ phases }: DevelopmentPhasesProps) => {
  return (
    <div className="relative mb-16">
      {/* Section header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-blue-500"></div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Development Lifecycle</h3>
          <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-blue-500"></div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Comprehensive development phases from planning to deployment</p>
      </div>

      {/* Phases grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {phases.map((phase, index) => {
          const PhaseIcon = phase.icon;
          return (
            <div 
              key={phase.id} 
              className="group animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`${phase.color} px-6 py-4 rounded-2xl flex flex-col items-center space-y-3 transition-all duration-500 hover:shadow-2xl hover:scale-105 cursor-pointer backdrop-blur-sm relative overflow-hidden`}>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Icon container */}
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30 group-hover:bg-white/30 transition-all duration-300">
                  <PhaseIcon className="w-6 h-6 flex-shrink-0" />
                </div>
                
                {/* Phase label */}
                <span className="font-semibold text-sm text-center leading-tight">{phase.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DevelopmentPhases;
