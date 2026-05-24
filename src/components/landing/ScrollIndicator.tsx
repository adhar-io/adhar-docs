
import React from 'react';
import { ArrowDown } from 'lucide-react';

interface ScrollIndicatorProps {
  isVisible: boolean;
}

const ScrollIndicator = ({ isVisible }: ScrollIndicatorProps) => {
  const scrollToNext = () => {
    const nextSection = document.getElementById('features') || document.querySelector('section:nth-of-type(2)');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div 
      className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center transition-all duration-1000 delay-1100 cursor-pointer group hover:scale-110 will-change-transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      onClick={scrollToNext}
    >
      <div className="flex flex-col items-center space-y-2 relative">
        <div className="relative z-10 px-4 py-2 rounded-full">
          <span className="text-xs sm:text-sm text-muted-foreground font-medium group-hover:text-primary transition-colors duration-300">
            Explore More
          </span>
          
          {/* Animated arrow */}
          <div className="mt-2 relative">
            <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-primary transition-all duration-300 animate-bounce mx-auto" />
          </div>
        </div>

        {/* Subtle pulse ring */}
        <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </div>
    </div>
  );
};

export default ScrollIndicator;
