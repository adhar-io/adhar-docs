
import React, { useState, useEffect } from 'react';
import { enterpriseBenefits } from '@/data/landingPageData';

const BenefitsRotator = () => {
  const [currentBenefit, setCurrentBenefit] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const benefitInterval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentBenefit((prev) => (prev + 1) % enterpriseBenefits.length);
        setIsTransitioning(false);
      }, 250);
    }, 4000);
    
    return () => clearInterval(benefitInterval);
  }, []);

  return (
    <div className="mb-16 h-32 flex items-center justify-center container-padding">
      <div className={`transition-all duration-700 ease-out transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="relative group hw-accelerate">
          {/* Enhanced multi-layer background */}
          <div className="absolute inset-0 glass-effect rounded-3xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 animate-pulse-glow"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-white/80 to-purple-50/50 dark:from-gray-800/50 dark:via-gray-700/80 dark:to-gray-800/50 rounded-3xl"></div>
          
          <div className="relative flex items-center justify-center space-x-8 px-10 py-8 group-hover:scale-[1.02] transition-all duration-500 hw-accelerate">
            {/* Enhanced icon with improved styling */}
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-2xl blur-lg transition-all duration-500 group-hover:from-blue-500/30 group-hover:to-purple-500/30"></div>
              <div className={`relative w-20 h-20 glass-effect rounded-2xl flex items-center justify-center shadow-xl transition-all duration-400 ${isTransitioning ? 'scale-90 opacity-70' : 'scale-100 opacity-100'} group-hover:scale-110`}>
                {React.createElement(enterpriseBenefits[currentBenefit].icon, { 
                  className: "w-10 h-10 gradient-text transition-all duration-500" 
                })}
              </div>
            </div>
            
            {/* Enhanced content with improved typography */}
            <div className={`text-left max-w-md transition-all duration-300 ease-out ${isTransitioning ? 'opacity-70 translate-x-2' : 'opacity-100 translate-x-0'}`}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight heading-gradient">
                {enterpriseBenefits[currentBenefit].title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {enterpriseBenefits[currentBenefit].description}
              </p>
            </div>

            {/* Enhanced progress indicators */}
            <div className="flex flex-col space-y-2 ml-8">
              {enterpriseBenefits.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBenefit(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-500 hover:scale-125 transform hw-accelerate ${
                    index === currentBenefit 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg scale-125 animate-pulse-glow' 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 scale-100'
                  }`}
                  aria-label={`Switch to benefit ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Enhanced floating accents */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 opacity-50 rounded-full blur-sm animate-pulse"></div>
          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 opacity-40 rounded-full blur-sm animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default BenefitsRotator;
