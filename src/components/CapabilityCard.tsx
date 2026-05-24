
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CapabilityCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  feature: string;
  gradientFrom: string;
  gradientTo: string;
  featureIcon: LucideIcon;
  useSolidBackground?: boolean;
}

const CapabilityCard = ({ 
  icon: Icon, 
  title, 
  description, 
  feature, 
  gradientFrom, 
  gradientTo, 
  featureIcon: FeatureIcon,
  useSolidBackground = false
}: CapabilityCardProps) => {
  // Get text color based on background
  const getTextColor = (bgClass: string) => {
    if (bgClass.includes('blue')) return 'text-blue-100';
    if (bgClass.includes('purple')) return 'text-purple-100';
    if (bgClass.includes('green')) return 'text-green-100';
    if (bgClass.includes('orange')) return 'text-orange-100';
    return 'text-white';
  };

  // Get feature text color
  const getFeatureTextColor = (bgClass: string) => {
    if (bgClass.includes('blue')) return 'text-blue-200';
    if (bgClass.includes('purple')) return 'text-purple-200';
    if (bgClass.includes('green')) return 'text-green-200';
    if (bgClass.includes('orange')) return 'text-orange-200';
    return 'text-gray-200';
  };

  const backgroundClass = useSolidBackground ? gradientFrom : `bg-gradient-to-br ${gradientFrom} ${gradientTo}`;
  const textColor = getTextColor(gradientFrom);
  const featureTextColor = getFeatureTextColor(gradientFrom);

  return (
    <div className={`group relative ${backgroundClass} rounded-3xl p-8 transition-all duration-500 hover:-translate-y-3 cursor-pointer overflow-hidden shadow-lg hover:shadow-2xl`}>
      <div className="relative">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className={`${textColor} leading-relaxed text-sm mb-6`}>{description}</p>
        <div className="flex items-center text-sm font-medium">
          <div className="w-4 h-4 rounded-full bg-white/30 mr-2 flex items-center justify-center">
            <FeatureIcon className="w-2.5 h-2.5 text-white" />
          </div>
          <span className={`${featureTextColor} font-semibold`}>
            {feature}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CapabilityCard;
