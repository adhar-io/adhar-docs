
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
      
      {/* Responsive wrapping grid — cards wrap instead of being clipped, and the
          extra padding gives the hover lift room so it never gets cut off. */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 px-1 pt-3 pb-2">
        {cloudProviders.map((provider, index) => (
          <div
            key={provider.name}
            className={`${provider.color} relative group flex-1 basis-40 min-w-40 px-4 py-4 rounded-xl flex items-center justify-center gap-3 border border-white/60 dark:border-white/20 hover:scale-105 hover:-translate-y-1 transition-all duration-500 cursor-pointer shadow-lg hover:shadow-2xl backdrop-blur-sm`}
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
                  decoding="async"
                  alt={provider.name}
                  className={`${provider.hideName ? 'h-9 w-24' : 'w-9 h-9'} object-contain transition-all duration-300 group-hover:scale-110 filter drop-shadow-lg`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const span = document.createElement('span');
                      span.className = 'w-9 h-9 flex items-center justify-center bg-gradient-to-br from-gray-500 to-slate-500 text-white text-sm font-bold rounded-xl shadow-lg';
                      span.textContent = provider.name.substring(0, 2).toUpperCase();
                      parent.appendChild(span);
                    }
                  }}
                />
              ) : (
                <span className="text-2xl filter drop-shadow-lg group-hover:scale-110 transition-all duration-300">{provider.icon}</span>
              )}
              {/* Premium glow effect */}
              <div className="absolute inset-0 bg-white/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 blur-md -z-10"></div>
            </div>

            {/* Enhanced text styling — hidden when the logo is a wordmark */}
            {!provider.hideName && (
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap group-hover:text-gray-900 transition-colors duration-300">
                {provider.name}
              </span>
            )}

            {/* Premium border highlight on hover */}
            <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-white/50 dark:group-hover:border-white/30 transition-all duration-400 pointer-events-none"></div>

            {/* Subtle inner glow */}
            <div className="absolute inset-1 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CloudProviders;
