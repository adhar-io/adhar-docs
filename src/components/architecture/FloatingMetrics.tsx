
import React from 'react';

const FloatingMetrics = () => {
  return (
    <>
      {/* Floating Metrics */}
      <div className="absolute top-24 right-8 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 p-4 shadow-md">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">99.9%</div>
          <div className="text-xs text-gray-600">Uptime SLA</div>
        </div>
      </div>

      <div className="absolute top-24 left-8 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 p-4 shadow-md">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">70%</div>
          <div className="text-xs text-gray-600">Faster Delivery</div>
        </div>
      </div>
    </>
  );
};

export default FloatingMetrics;
