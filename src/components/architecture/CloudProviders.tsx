
import React from 'react';
import { Provider } from './types';

interface CloudProvidersProps {
  cloudProviders: Provider[];
}

const CloudProviders = ({ cloudProviders }: CloudProvidersProps) => {
  return (
    <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50 dark:bg-gradient-to-br dark:from-gray-800/60 dark:via-slate-800/40 dark:to-zinc-800/60 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl backdrop-blur-sm">
      <h3 className="text-xl font-bold text-center mb-8 text-gray-800 dark:text-gray-200 relative">
        Cloud Infrastructure
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-gray-500 to-slate-500 rounded-full"></div>
      </h3>
      
      {/* Single-line layout with enhanced styling */}
      <div className="flex justify-center items-center space-x-4 overflow-x-auto scrollbar-hide pb-2">
        <div className="flex space-x-4 min-w-max">
          {cloudProviders.map((provider, index) => (
            <div 
              key={provider.name} 
              className={`${provider.color} relative group px-6 py-5 rounded-xl flex items-center space-x-4 border border-white/60 dark:border-white/20 hover:scale-110 hover:-translate-y-2 transition-all duration-500 cursor-pointer shadow-lg hover:shadow-2xl backdrop-blur-sm`}
              style={{
                animationDelay: `${index * 120}ms`,
                animation: 'fadeInUp 0.7s ease-out both'
              }}
            >
              {/* Enhanced logo presentation */}
              <div className="relative flex-shrink-0">
                {provider.icon.startsWith('http') ? (
                  <img 
                    src={provider.icon} 
                    loading="lazy"
                    decoding="async"
                    alt={provider.name}
                    className="w-10 h-10 object-contain transition-all duration-300 group-hover:scale-125 filter drop-shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const span = document.createElement('span');
                        span.className = 'w-10 h-10 flex items-center justify-center bg-gradient-to-br from-gray-500 to-slate-500 text-white text-sm font-bold rounded-xl shadow-lg';
                        span.textContent = provider.name.substring(0, 2).toUpperCase();
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className="text-3xl filter drop-shadow-lg group-hover:scale-125 transition-all duration-300">{provider.icon}</span>
                )}
                {/* Premium glow effect */}
                <div className="absolute inset-0 bg-white/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 blur-md -z-10"></div>
              </div>
              
              {/* Enhanced text styling */}
              <span className="text-base font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">
                {provider.name}
              </span>
              
              {/* Premium border highlight on hover */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-white/50 dark:group-hover:border-white/30 transition-all duration-400"></div>
              
              {/* Subtle inner glow */}
              <div className="absolute inset-1 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Scroll indicators for mobile */}
      <div className="flex justify-center mt-4 space-x-1 md:hidden">
        {cloudProviders.map((_, index) => (
          <div key={index} className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full opacity-50"></div>
        ))}
      </div>
    </div>
  );
};

export default CloudProviders;
