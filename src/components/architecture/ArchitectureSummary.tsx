import React from 'react';
import { CheckCircle, Sparkles, Layers, Zap } from 'lucide-react';

const ArchitectureSummary = () => {
  const enhancements = [
    {
      title: 'Enhanced Visual Hierarchy',
      description: 'Redesigned all components with consistent premium styling, better spacing, and professional layouts',
      icon: Layers,
      color: 'bg-gradient-to-br from-blue-500 to-indigo-600'
    },
    {
      title: 'Advanced Animations',
      description: 'Added staggered fade-in animations, hover effects, and smooth transitions throughout',
      icon: Zap,
      color: 'bg-gradient-to-br from-purple-500 to-pink-600'
    },
    {
      title: 'Modern Design System',
      description: 'Implemented glass morphism, gradient borders, enhanced tooltips, and premium visual effects',
      icon: Sparkles,
      color: 'bg-gradient-to-br from-green-500 to-emerald-600'
    },
    {
      title: 'Comprehensive Platform Stack',
      description: 'Added 10 platform categories with 40+ tools, responsive grid, and integrated Project Management tools',
      icon: CheckCircle,
      color: 'bg-gradient-to-br from-orange-500 to-red-600'
    }
  ];

  const sections = [
    { name: 'Architecture Header', status: 'Enhanced', improvements: ['Premium gradient backgrounds', 'Decorative elements', 'Better typography'] },
    { name: 'Development Phases', status: 'Enhanced', improvements: ['Responsive grid layout', 'Staggered animations', 'Connection indicators'] },
    { name: 'Teams Section', status: 'Enhanced', improvements: ['Larger icons', 'Hover effects', 'Background patterns'] },
    { name: 'Interface Layer', status: 'Enhanced', improvements: ['Section headers', 'Floating accents', 'Better spacing'] },
    { name: 'Control Plane', status: 'Enhanced', improvements: ['Comprehensive redesign', 'Feature badges', 'Visual depth'] },
    { name: 'Platform Stack', status: 'Completely Redesigned', improvements: ['10 categories', '40+ tools', 'Responsive design'] },
    { name: 'Orchestration Layer', status: 'Enhanced', improvements: ['Single-line layout', 'Premium styling', 'Tool descriptions'] },
    { name: 'Cloud Providers', status: 'Enhanced', improvements: ['Larger icons', 'Enhanced tooltips', 'Professional layout'] }
  ];

  return (
    <div className="relative p-8 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 mb-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
              Architecture Enhancement Summary
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Complete visual overhaul with modern design patterns and premium styling
            </p>
          </div>
        </div>
      </div>

      {/* Key Enhancements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {enhancements.map((enhancement, index) => {
          const Icon = enhancement.icon;
          return (
            <div 
              key={enhancement.title}
              className="group bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-500 animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start space-x-4">
                <div className={`${enhancement.color} p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    {enhancement.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {enhancement.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section Status */}
      <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
          Component Enhancement Status
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sections.map((section, index) => (
            <div 
              key={section.name}
              className="bg-white/50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 animate-fadeInUp"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 dark:text-white">
                  {section.name}
                </h4>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  section.status === 'Completely Redesigned' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {section.status}
                </span>
              </div>
              <ul className="space-y-1">
                {section.improvements.map((improvement, idx) => (
                  <li key={idx} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-8 text-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl p-6 border border-blue-200/50">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">8</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Components Enhanced</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-200/50">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">10</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Platform Categories</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-green-200/50">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">40+</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Tools & Technologies</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl p-6 border border-orange-200/50">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">100%</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Mobile Responsive</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureSummary;
