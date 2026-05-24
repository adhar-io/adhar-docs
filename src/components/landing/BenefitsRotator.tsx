import React, { useState, useEffect } from 'react';
import { enterpriseBenefits } from '@/data/landingPageData';

const BenefitsRotator = () => {
  const [currentBenefit, setCurrentBenefit] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const benefitInterval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentBenefit((prev) => (prev + 1) % enterpriseBenefits.length);
        setIsTransitioning(false);
      }, 200);
    }, 4000);

    return () => clearInterval(benefitInterval);
  }, []);

  const Icon = enterpriseBenefits[currentBenefit].icon;

  return (
    <div className="mb-16 flex items-center justify-center container-padding">
      <div className="w-full max-w-2xl rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="flex items-center gap-5 p-6 sm:p-7">
          {/* Icon */}
          <div
            className={`shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] transition-all duration-300 ${
              isTransitioning ? 'scale-95 opacity-60' : 'scale-100 opacity-100'
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div
            className={`flex-1 min-w-0 transition-all duration-300 ${
              isTransitioning ? 'opacity-60 translate-x-1' : 'opacity-100 translate-x-0'
            }`}
          >
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              {enterpriseBenefits[currentBenefit].title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {enterpriseBenefits[currentBenefit].description}
            </p>
          </div>

          {/* Progress dots */}
          <div className="shrink-0 flex flex-col gap-1.5 ml-2">
            {enterpriseBenefits.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBenefit(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentBenefit
                    ? 'w-4 bg-primary'
                    : 'w-1.5 bg-border hover:bg-muted-foreground/40'
                }`}
                aria-label={`Switch to benefit ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenefitsRotator;
