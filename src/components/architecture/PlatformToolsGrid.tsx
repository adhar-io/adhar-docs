
import React from 'react';
import { PlatformCategory } from './types';

interface PlatformToolsGridProps {
  platformCategories: PlatformCategory[];
}

const PlatformToolsGrid = ({ platformCategories }: PlatformToolsGridProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 sm:gap-4 lg:gap-6 mb-12">
      {platformCategories.map((category, categoryIndex) => (
        <div key={categoryIndex} className={`${category.color} p-4 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm`}>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center mb-4 uppercase tracking-wide">
            {category.name}
          </h4>
          <div className="space-y-3">
            {category.tools.map((tool, toolIndex) => (
              <div
                key={`${categoryIndex}-${toolIndex}`}
                className={`${tool.color} w-14 h-14 rounded-xl flex items-center justify-center text-lg transition-all duration-300 hover:scale-110 hover:shadow-lg border border-gray-200 dark:border-gray-600 mx-auto group relative`}
                title={tool.name}
              >
                {tool.icon.startsWith('http') ? (
                  <img 
                    src={tool.icon} 
                    loading="lazy"
                    decoding="async"
                    alt={tool.name}
                    className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<span class="text-xs font-bold text-gray-600 dark:text-gray-300">${tool.name.substring(0, 2)}</span>`;
                      }
                    }}
                  />
                ) : (
                  <span className="group-hover:scale-110 transition-transform duration-200">{tool.icon}</span>
                )}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {tool.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlatformToolsGrid;
