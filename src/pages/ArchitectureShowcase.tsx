import React from 'react';
import InteractiveArchitecture from '../components/InteractiveArchitecture';
import ArchitectureSummary from '../components/architecture/ArchitectureSummary';

const ArchitectureShowcase = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 dark:text-white mb-4">
            Enhanced Architecture Diagram
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            A comprehensive visual representation of the ADHAR Internal Developer Platform 
            with modern design patterns, premium styling, and enhanced user experience.
          </p>
        </div>

        {/* Enhancement Summary */}
        <ArchitectureSummary />

        {/* Main Architecture Diagram */}
        <InteractiveArchitecture />

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            Enhanced with modern design patterns, advanced animations, and comprehensive platform coverage
          </p>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureShowcase;
