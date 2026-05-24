
import React from 'react';

const MetricsDisplay = () => {
  return (
    <>
      {/* Enhanced Metrics with Dark Mode */}
      <div className="absolute bottom-16 right-6 space-y-2">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl p-3 shadow-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">95%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">AI Accuracy</div>
          </div>
        </div>
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl p-3 shadow-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">2min</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Deploy Time</div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 left-6 space-y-2">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl p-3 shadow-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">24/7</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">AI Support</div>
          </div>
        </div>
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl p-3 shadow-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">10x</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Faster</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MetricsDisplay;
