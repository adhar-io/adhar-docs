
import React from 'react';
import HeroTitle from './HeroTitle';
import HeroCTA from './HeroCTA';
import TerminalDemo from './TerminalDemo';
import MetricsDashboard from './MetricsDashboard';
import CloudProvidersGrid from './CloudProvidersGrid';

interface HeroContentProps {
  isVisible: boolean;
}

const HeroContent = ({ isVisible }: HeroContentProps) => {
  return (
    <div className={`text-center transition-all duration-800 ease-out hw-accelerate ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <HeroTitle isVisible={isVisible} />

      {/* Primary actions sit right under the value proposition, above the fold */}
      <HeroCTA isVisible={isVisible} />

      {/* Enhanced Terminal Demo with smoother container animations */}
      <div className={`mb-12 transition-all duration-1000 delay-800 ease-out hw-accelerate ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
        <TerminalDemo />
      </div>

      {/* Real-time Metrics Dashboard */}
      <div className={`mb-12 transition-all duration-1000 delay-900 ease-out hw-accelerate ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
        <MetricsDashboard />
      </div>

      {/* Enhanced Cloud Providers Section */}
      <div className={`transition-all duration-1000 delay-1000 ease-out hw-accelerate ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
        <CloudProvidersGrid />
      </div>
    </div>
  );
};

export default HeroContent;
