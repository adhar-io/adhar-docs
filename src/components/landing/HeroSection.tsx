
import React, { useState, useEffect } from "react";
import BackgroundElements from "./BackgroundElements";
import HeroContent from "./HeroContent";
import ScrollIndicator from "./ScrollIndicator";
import FloatingParticles from "./FloatingParticles";

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    
    const handleMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <section className="relative min-h-screen pt-16 pb-16 container-padding bg-background overflow-hidden w-full">
      {/* Cohesive mesh + grid backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-mesh"></div>
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-50 dark:opacity-30"></div>
        {/* Subtle top spotlight */}
        <div
          className="absolute -top-24 sm:-top-32 left-1/2 -translate-x-1/2 w-[min(1100px,100vw)] h-[400px] sm:h-[500px] lg:h-[600px] rounded-full blur-3xl opacity-30 dark:opacity-40"
          style={{ background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.5), transparent)' }}
        ></div>
        {/* Soft bottom fade into next section */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background"></div>
      </div>

      {/* Background elements (kept, mouse-reactive) */}
      <div className="hw-accelerate">
        <BackgroundElements mousePosition={mousePosition} />
      </div>

      {/* Main content */}
      <div className="max-width-content relative z-10 py-12 lg:py-20 w-full">
        <HeroContent isVisible={isVisible} />
      </div>

      {/* Scroll indicator */}
      <ScrollIndicator isVisible={isVisible} />
    </section>
  );
};

export default HeroSection;
