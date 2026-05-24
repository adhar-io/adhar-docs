
import React from "react";
import TestimonialsCarousel from "./TestimonialsCarousel";

const TestimonialsSection = () => {
  return (
    <section className="py-24 container-padding bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,hsl(var(--primary)/0.1),transparent)]"></div>
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]" style={{
          backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>
      
      <div className="max-width-content relative z-10">
        <TestimonialsCarousel />
      </div>
    </section>
  );
};

export default TestimonialsSection;
