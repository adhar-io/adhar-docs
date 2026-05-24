
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
    <section className="relative min-h-screen pt-20 pb-16 container-padding bg-gradient-to-b from-background via-background/95 to-background overflow-hidden w-full">
      {/* Clean modern gradient overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.06),transparent_50%)]"></div>
        {/* Refined dot pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}></div>
      </div>
      
      {/* Background elements */}
      <div className="hw-accelerate">
        <BackgroundElements mousePosition={mousePosition} />
        <FloatingParticles />
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
