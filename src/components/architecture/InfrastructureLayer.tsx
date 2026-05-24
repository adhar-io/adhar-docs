
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InfrastructureComponent {
  icon: LucideIcon;
  label: string;
  position: { x: number; y: number };
  description: string;
}

interface InfrastructureLayerProps {
  infrastructureComponents: InfrastructureComponent[];
}

const InfrastructureLayer = ({ infrastructureComponents }: InfrastructureLayerProps) => {
  return (
    <div className="absolute bottom-24 left-0 right-0">
      <div className="max-w-6xl mx-auto px-8">
        <h4 className="text-center text-sm font-bold text-gray-800 mb-4">Enterprise Infrastructure & Platform Services</h4>
        <div className="relative bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 p-6 shadow-md">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
            {infrastructureComponents.map((component, index) => {
              const ComponentIcon = component.icon;
              return (
                <div key={index} className="text-center group cursor-pointer">
                  <div className="w-14 h-14 bg-gradient-to-r from-slate-600 to-slate-800 rounded-xl mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <ComponentIcon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-800 block mb-1">{component.label}</span>
                  <span className="text-xs text-gray-600">{component.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfrastructureLayer;
