
import React from 'react';
import { Provider } from './types';

interface OrchestrationLayerProps {
  orchestrationTools: Provider[];
}

const OrchestrationLayer = ({ orchestrationTools }: OrchestrationLayerProps) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-blue-900/30 dark:via-indigo-900/20 dark:to-purple-900/20 p-8 rounded-2xl border border-blue-200 dark:border-blue-700 mb-8 shadow-xl backdrop-blur-sm">
      <h3 className="text-xl font-bold text-center mb-8 text-blue-800 dark:text-blue-200 relative">
        Orchestration & Infrastructure
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
      </h3>
      
      {/* Single-line layout with enhanced styling */}
      <div className="flex justify-center items-center space-x-3 overflow-x-auto scrollbar-hide pb-2">
        <div className="flex space-x-3 min-w-max">
          {orchestrationTools.map((tool, index) => (
            <div 
              key={tool.name} 
              className={`${tool.color} relative group px-5 py-4 rounded-xl flex items-center space-x-3 border border-white/60 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-110 hover:-translate-y-1 cursor-pointer backdrop-blur-sm`}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out both'
              }}
            >
              {/* Enhanced logo presentation */}
              <div className="relative flex-shrink-0">
                {tool.icon.startsWith('http') ? (
                  <img 
                    src={tool.icon} 
                    alt={tool.name}
                    className="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-110 filter drop-shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const span = document.createElement('span');
                        span.className = 'w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md';
                        span.textContent = tool.name.substring(0, 2).toUpperCase();
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className="text-2xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">{tool.icon}</span>
                )}
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10"></div>
              </div>
              
              {/* Enhanced text styling */}
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">
                {tool.name}
              </span>
              
              {/* Subtle border highlight on hover */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-white/40 transition-all duration-300"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Scroll indicators for mobile */}
      <div className="flex justify-center mt-4 space-x-1 md:hidden">
        {orchestrationTools.map((_, index) => (
          <div key={index} className="w-2 h-2 bg-blue-300 dark:bg-blue-600 rounded-full opacity-50"></div>
        ))}
      </div>
    </div>
  );
};

export default OrchestrationLayer;
