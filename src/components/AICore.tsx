import React from 'react';
import adharLogo from '@/assets/adhar-logo.png';

const AICore = () => {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <div className="w-64 h-64 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-600/80 rounded-full shadow-xl overflow-hidden flex items-center justify-center">
        <div className="text-center p-6">
          <div className="mb-4">
            <img 
              src={adharLogo} 
              alt="ADHAR Platform" 
              className="h-20 w-auto mx-auto drop-shadow-lg"
            />
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Fully Opensource Platform</p>
        </div>
      </div>
    </div>
  );
};

export default AICore;
