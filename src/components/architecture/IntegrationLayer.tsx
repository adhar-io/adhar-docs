
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Integration {
  icon: LucideIcon;
  label: string;
  position: { x: number; y: number };
  description: string;
}

interface IntegrationLayerProps {
  integrations: Integration[];
}

const IntegrationLayer = ({ integrations }: IntegrationLayerProps) => {
  return (
    <div className="absolute bottom-4 left-0 right-0">
      <div className="max-w-6xl mx-auto px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
          {integrations.map((integration, index) => {
            const IntegrationIcon = integration.icon;
            return (
              <div key={index} className="text-center group cursor-pointer">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mx-auto mb-2 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-all duration-300 shadow-sm">
                  <IntegrationIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 block mb-1">{integration.label}</span>
                <span className="text-xs text-gray-500">{integration.description}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IntegrationLayer;
