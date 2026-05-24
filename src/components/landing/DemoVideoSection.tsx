import React from 'react';
import { Play, CheckCircle2, Sparkles, Zap } from 'lucide-react';

const DemoVideoSection = () => {
  const features = [{
    icon: Zap,
    text: 'Deploy in under 10 minutes',
    color: 'text-primary'
  }, {
    icon: CheckCircle2,
    text: '50+ pre-configured services',
    color: 'text-accent'
  }, {
    icon: Sparkles,
    text: 'Zero infrastructure tickets',
    color: 'text-primary'
  }];
  
  return (
    <section className="relative py-24 bg-gradient-to-b from-background to-primary/5 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
            <Play className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Platform Demo</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            See ADHAR in Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Watch a complete platform deployment from zero to production-ready infrastructure.
          </p>
        </div>

        {/* YouTube Video Container */}
        <div className="relative max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border transition-all duration-500 hover:shadow-primary/20 hover:scale-[1.01]">
            <div className="aspect-video relative">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/gmAfYEPBYr0"
                title="ADHAR Platform Demo - Platform Engineering"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 px-6 py-3 bg-background/80 backdrop-blur-sm border border-border rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
                <span className="font-medium text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
          <div className="text-center p-6 rounded-xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/50 hover:bg-background/70 transition-all duration-300 group">
            <div className="text-4xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">8:42</div>
            <div className="text-sm text-muted-foreground">Average Deployment Time</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-background/50 backdrop-blur-sm border border-border hover:border-accent/50 hover:bg-background/70 transition-all duration-300 group">
            <div className="text-4xl font-bold text-accent mb-2 group-hover:scale-110 transition-transform duration-300">50+</div>
            <div className="text-sm text-muted-foreground">Pre-configured Services</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/50 hover:bg-background/70 transition-all duration-300 group">
            <div className="text-4xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">100%</div>
            <div className="text-sm text-muted-foreground">Infrastructure Automation</div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default DemoVideoSection;