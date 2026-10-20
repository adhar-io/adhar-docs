import React from 'react';
import { CheckCircle2, Sparkles, Zap } from 'lucide-react';
import SectionHeader from "./SectionHeader";

const DemoVideoSection = () => {
  const features = [{
    icon: Zap,
    text: 'One command, any supported cloud',
    color: 'text-primary'
  }, {
    icon: CheckCircle2,
    text: 'SSO, secrets and signing on day one',
    color: 'text-accent'
  }, {
    icon: Sparkles,
    text: 'Self-service, no ticket queue',
    color: 'text-primary'
  }];
  
  return (
    <section id="demo" aria-labelledby="demo-heading" className="relative section-padding container-padding bg-gradient-to-b from-background to-primary/5 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-width-content relative z-10">
        {/* Section Header */}
        <SectionHeader id="demo-heading" eyebrow="Platform demo" title="See Adhar" titleMuted="in action.">
          Watch one command take an empty machine to a running platform — GitOps, SSO, secrets, a signed supply chain and the developer console, all wired together.
        </SectionHeader>

        {/* YouTube Video Container */}
        <div className="relative max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border transition-all duration-500 hover:shadow-primary/20">
            <div className="aspect-video relative">
              <iframe
                className="w-full h-full"
                src="https://www.youtube-nocookie.com/embed/gmAfYEPBYr0"
                title="Adhar platform demo"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {features.map((feature) => (
              <div
                key={feature.text}
                className="flex items-center gap-2 px-5 py-2.5 bg-background/80 backdrop-blur-sm border border-border/70 rounded-full shadow-[var(--shadow-xs)]"
              >
                <feature.icon className={`w-4 h-4 ${feature.color}`} aria-hidden />
                <span className="text-sm font-medium text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
export default DemoVideoSection;