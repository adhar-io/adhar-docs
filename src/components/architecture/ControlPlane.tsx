
import React from 'react';

const ControlPlane = () => {
  return (
    <div className="relative mb-16">
      {/* Main control plane container */}
      <div className="relative bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:bg-gradient-to-br dark:from-orange-900/20 dark:via-amber-900/20 dark:to-yellow-900/20 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden animate-fadeInUp">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-16 h-16 bg-orange-400 rounded-full"></div>
          <div className="absolute top-8 right-8 w-12 h-12 bg-amber-400 rounded-full"></div>
          <div className="absolute bottom-4 left-1/3 w-8 h-8 bg-yellow-400 rounded-full"></div>
          <div className="absolute bottom-8 right-1/4 w-6 h-6 bg-orange-300 rounded-full"></div>
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-amber-500/5"></div>
        
        {/* Content */}
        <div className="relative text-center py-12 px-8">
          {/* Icon container */}
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          
          {/* Title */}
          <div className="mb-4">
            <h3 className="text-3xl font-bold text-orange-800 dark:text-orange-200 mb-2">
              Adhar Control Plane
            </h3>
            <div className="flex items-center justify-center space-x-3">
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-orange-400"></div>
              <span className="text-orange-600 dark:text-orange-300 font-semibold text-lg">(api-server)</span>
              <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-orange-400"></div>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-orange-700 dark:text-orange-300 text-base max-w-2xl mx-auto leading-relaxed">
            Centralized orchestration and management layer providing unified API access, resource coordination, and policy enforcement across the entire platform ecosystem.
          </p>
          
          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {['API Gateway', 'Resource Management', 'Policy Engine', 'Service Mesh'].map((feature, index) => (
              <div 
                key={feature}
                className="px-4 py-2 bg-orange-200/50 dark:bg-orange-800/30 text-orange-800 dark:text-orange-200 rounded-full text-sm font-medium backdrop-blur-sm animate-fadeInUp"
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                {feature}
              </div>
            ))}
          </div>
        </div>
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-orange-400/20 to-transparent rounded-br-3xl"></div>
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-bl-3xl"></div>
      </div>
    </div>
  );
};

export default ControlPlane;
