
import React from 'react';
import { PlatformCategory } from './types';

interface PlatformStackProps {
  platformCategories: PlatformCategory[];
}

const PlatformStack = ({ platformCategories }: PlatformStackProps) => {
  // Two more categories complete the 12-category Adhar stack grid.
  const TILE = "bg-white shadow-sm ring-1 ring-black/5";
  const additionalCategories: PlatformCategory[] = [
    {
      name: "Automation & Chaos",
      color: "bg-gradient-to-br from-orange-50 to-amber-50",
      tools: [
        { name: "n8n", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/n8n.svg", color: TILE, description: "Workflow automation" },
        { name: "Chaos Mesh", icon: "https://cdn.jsdelivr.net/gh/chaos-mesh/chaos-mesh/static/logo.svg", color: TILE, description: "Chaos engineering" },
        { name: "k6", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/k6.svg", color: TILE, description: "Load & performance testing" },
        { name: "Baserow", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/baserow.svg", color: TILE, description: "No-code database" }
      ]
    },
    {
      name: "Observability",
      color: "bg-gradient-to-br from-blue-50 to-indigo-50",
      tools: [
        { name: "Prometheus", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prometheus/prometheus-original.svg", color: TILE, description: "Metrics & alerting" },
        { name: "Grafana", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/grafana/grafana-original.svg", color: TILE, description: "Dashboards & visualization" },
        { name: "Pixie", icon: "https://cdn.jsdelivr.net/gh/cncf/artwork/projects/pixie/icon/color/pixie-icon-color.svg", color: TILE, description: "eBPF observability" },
        { name: "Headlamp", icon: "https://cdn.jsdelivr.net/gh/cncf/artwork/projects/headlamp/icon/color/headlamp-icon-color.svg", color: TILE, description: "Kubernetes web UI" }
      ]
    }
  ];

  // Combine original categories with additional ones
  const allCategories = [...platformCategories, ...additionalCategories];

  return (
    <div className="relative mb-12">
      {/* Main Platform Stack Container */}
      <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:bg-gradient-to-br dark:from-emerald-900/30 dark:via-green-900/20 dark:to-teal-900/30 p-8 rounded-3xl shadow-2xl backdrop-blur-sm relative overflow-hidden">
        
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="absolute top-4 left-4 w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 right-4 w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-gradient-to-br from-teal-300 to-green-300 rounded-full blur-3xl opacity-30"></div>
        </div>

        {/* Header Section */}
        <div className="relative z-10 text-center mb-10">
          <h3 className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 mb-4 relative">
            🚀 Adhar Platform Stack
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-full"></div>
          </h3>
          <p className="text-emerald-700 dark:text-emerald-300 text-lg max-w-2xl mx-auto leading-relaxed">
            A comprehensive suite of tools and technologies powering modern cloud-native applications
          </p>
        </div>

        {/* Platform Categories Grid - Now with better spacing for 12 categories */}
        <div className="relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6 auto-rows-fr">
            {allCategories.map((category, categoryIndex) => (
              <div 
                key={categoryIndex} 
                className={`${category.color} relative group p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 backdrop-blur-sm h-full flex flex-col justify-between`}
                style={{
                  animationDelay: `${categoryIndex * 150}ms`,
                  animation: 'fadeInUp 0.8s ease-out both'
                }}
              >
                {/* Category Header */}
                <div className="text-center mb-6">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide leading-tight">
                    {category.name}
                  </h4>
                  <div className="w-8 h-0.5 bg-gradient-to-r from-gray-400 to-gray-600 mx-auto mt-2 rounded-full"></div>
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-2 gap-4 flex-grow">
                  {category.tools.map((tool, toolIndex) => (
                    <div
                      key={`${categoryIndex}-${toolIndex}`}
                      className={`${tool.color} relative group/tool w-full h-16 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer`}
                      title={`${tool.name} - ${tool.description}`}
                    >
                      {/* Tool Icon */}
                      <div className="relative">
                        {(tool.icon.startsWith('http') || tool.icon.startsWith('/')) ? (
                          <img 
                            src={tool.icon} 
                            alt={tool.name}
                            className="w-8 h-8 object-contain group-hover/tool:scale-125 transition-transform duration-300 filter drop-shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const span = document.createElement('span');
                                span.className = 'w-8 h-8 flex items-center justify-center bg-gradient-to-br from-gray-500 to-slate-500 text-white text-xs font-bold rounded-lg shadow-md';
                                span.textContent = tool.name.substring(0, 2).toUpperCase();
                                parent.appendChild(span);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xl group-hover/tool:scale-125 transition-transform duration-300 filter drop-shadow-sm">
                            {tool.icon}
                          </span>
                        )}
                      </div>

                      {/* Enhanced Tooltip */}
                      <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/tool:opacity-100 transition-all duration-300 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-3 py-2 rounded-lg whitespace-nowrap z-30 shadow-xl border border-gray-700 dark:border-gray-300">
                        <div className="font-semibold">{tool.name}</div>
                        <div className="text-gray-300 dark:text-gray-600 text-xs mt-1">{tool.description}</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                      </div>

                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover/tool:opacity-100 transition-opacity duration-300 blur-sm -z-10"></div>
                    </div>
                  ))}
                </div>

                {/* Inner glow effect */}
                <div className="absolute inset-2 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            ))}
          </div>
          
          {/* Enhanced layout hint for better visual balance */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 bg-white/20 dark:bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                {allCategories.length} Platform Categories • {allCategories.reduce((total, cat) => total + cat.tools.length, 0)} Tools & Technologies
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformStack;
