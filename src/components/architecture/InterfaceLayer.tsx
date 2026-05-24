
import React from 'react';
import { InterfaceItem } from './types';

interface InterfaceLayerProps {
  interfaceItems: InterfaceItem[];
}

const InterfaceLayer = ({ interfaceItems }: InterfaceLayerProps) => {
  return (
    <div className="relative mb-16">
      {/* Section header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-green-500"></div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Interface Layer</h3>
          <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-green-500"></div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">User interfaces and interaction points</p>
      </div>

      {/* Interface items */}
      <div className="flex flex-wrap justify-center gap-6">
        {interfaceItems.map((interfaceItem, index) => (
          <div 
            key={interfaceItem.id}
            className="group relative animate-fadeInUp"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className={`${interfaceItem.color} px-10 py-5 rounded-3xl text-base font-bold cursor-pointer transition-all duration-500 hover:scale-110 hover:shadow-2xl border-2 border-white/30 backdrop-blur-sm relative overflow-hidden`}>
              {/* Background glow */}
              <div className="absolute inset-0 bg-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Content */}
              <span className="relative z-10">{interfaceItem.name}</span>
              
              {/* Floating accent dots */}
              <div className="absolute top-2 right-3 w-2 h-2 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:translate-x-1"></div>
              <div className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:-translate-x-1"></div>
              
              {/* Bottom highlight */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            {/* Connection indicator */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        ))}
      </div>
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-px h-full bg-gradient-to-b from-transparent via-gray-400 to-transparent"></div>
      </div>
    </div>
  );
};

export default InterfaceLayer;
