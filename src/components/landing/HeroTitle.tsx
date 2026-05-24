import React from 'react';
import adharSymbol from '@/assets/adhar-symbol.png';

interface HeroTitleProps {
  isVisible: boolean;
}

const HeroTitle = ({ isVisible }: HeroTitleProps) => {
  return (
    <div className={`mb-16 transition-all duration-1000 ease-out will-change-transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* Futuristic status pill */}
      <div className={`flex justify-center mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="group relative inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 backdrop-blur-xl">
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500 animate-status-blink" />
          <span className="relative text-[11px] font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            INTERNAL DEVELOPER PLATFORM
          </span>
        </div>
      </div>

      {/* Unified hero stack — logo, wordmark, tagline share the same width */}
      <div className="mx-auto w-full max-w-[860px] flex flex-col items-stretch">
        {/* Hero symbol with orbital rings */}
        <div className={`relative flex justify-center mb-8 transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-orbit">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
            </div>
            <div className="absolute inset-6 rounded-full border border-accent/25 animate-orbit-reverse">
              <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent))]" />
            </div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 blur-2xl animate-float-slow" />
            <img
              src={adharSymbol}
              alt="ADHAR symbol"
              className="relative w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-[0_8px_32px_hsl(var(--primary)/0.6)]"
            />
          </div>
        </div>

        {/* Wordmark — sized to fill the shared width */}
        <div className="relative w-full mb-5">
          <h1 className="w-full text-center font-black leading-[0.85] tracking-[0.04em] text-[clamp(3.5rem,10vw,6.5rem)]">
            <span className="inline-block bg-[linear-gradient(110deg,hsl(var(--primary))_0%,hsl(var(--accent))_30%,hsl(var(--primary)/0.9)_55%,hsl(var(--accent))_100%)] bg-clip-text text-transparent animate-shimmer-text">
              ADHAR
            </span>
            <div className="absolute inset-0 bg-primary/5 blur-[100px] -z-10 pointer-events-none" />
          </h1>
        </div>

        {/* Decorative bracket line */}
        <div className="flex items-center justify-center gap-4 mb-7">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/50" />
          <span className="text-[10px] sm:text-xs font-mono tracking-[0.4em] text-muted-foreground uppercase whitespace-nowrap">
            Open Cloud-Native Foundation
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-accent/50" />
        </div>
      </div>

      {/* Supporting copy */}
      <div className={`text-center max-w-5xl mx-auto space-y-10 mt-12 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        {/* Primary value proposition */}
        <div className="relative mx-auto max-w-4xl">
          <p className="text-[1.35rem] sm:text-2xl md:text-[2.25rem] font-['DM_Sans'] font-bold text-foreground/90 leading-[1.4] tracking-tight">
            Eliminate the trade-off between{' '}
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent font-['DM_Sans'] font-bold">developer freedom</span>
            {' '}and{' '}
            <span className="bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent font-['DM_Sans'] font-bold">organizational governance</span>
          </p>
        </div>

        {/* Secondary description */}
        <div className="relative mx-auto max-w-4xl px-4">
          <div className="absolute -left-4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-[1.7] text-left pl-4">
            <span className="font-semibold text-foreground">50+ production-grade services</span>, security-hardened and pre-configured.
            Deploy complete platforms across any cloud in{' '}
            <span className="font-semibold text-primary">under 10 minutes</span> with a single command.
          </p>
        </div>

        {/* Futuristic stats grid */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-8 max-w-4xl mx-auto transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {[
            { value: '50+', label: 'Services', accent: 'primary' },
            { value: '<10min', label: 'Deploy', accent: 'accent' },
            { value: '100%', label: 'Open Source', accent: 'primary' },
            { value: '0%', label: 'Lock-in', accent: 'accent' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-xl px-4 py-5 hover:border-primary/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_32px_hsl(var(--primary)/0.15)]"
            >
              <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${stat.accent === 'primary' ? 'bg-primary/30' : 'bg-accent/30'}`} />
              <div className="relative">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
              {/* Corner brackets */}
              <span className="absolute top-2 left-2 w-2 h-2 border-l border-t border-primary/40" />
              <span className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-accent/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroTitle;
