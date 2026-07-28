import React from 'react';
import { Link } from "@tanstack/react-router";
import adharSymbol from '@/assets/branding/symbol-color.svg';

interface HeroTitleProps {
  isVisible: boolean;
}

const HeroTitle = ({ isVisible }: HeroTitleProps) => {
  return (
    <div className={`mb-10 transition-all duration-1000 ease-out will-change-transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* Refined status pill — links to the v1.0 announcement */}
      <div className={`flex justify-center mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <Link
          to="/blog/introducing-adhar-1-0"
          className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 backdrop-blur-md px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-status-blink" />
            New
          </span>
          <span>Introducing ADHAR 1.0 — Internal Developer Platform</span>
          <span aria-hidden className="ml-1 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>

      {/* Unified hero stack — logo, wordmark, tagline share the same width */}
      <div className="mx-auto w-full max-w-[920px] flex flex-col items-stretch">
        {/* Hero symbol — clean, no orbital rings */}
        <div className={`relative flex justify-center mb-6 transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/25 via-accent/15 to-transparent blur-2xl animate-float-slow" />
            <img
              src={adharSymbol}
              alt="ADHAR symbol"
              className="relative w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_8px_24px_hsl(var(--primary)/0.4)]"
            />
          </div>
        </div>

        {/* Wordmark */}
        <div className="relative w-full mb-4">
          <h1 className="w-full text-center font-bold leading-[0.9] tracking-[0.08em] text-[clamp(2.75rem,8vw,5.25rem)]">
            <span className="inline-block bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              ADHAR
            </span>
          </h1>
        </div>

        {/* Foundation label */}
        <div className="flex items-center justify-center mb-8">
          <span className="text-xs sm:text-sm font-semibold uppercase text-foreground/70 tracking-[0.28em]">
            Open Cloud-Native Foundation
          </span>
        </div>
      </div>

      {/* Supporting copy */}
      <div className={`text-center max-w-3xl mx-auto space-y-6 mt-4 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        {/* Primary value proposition */}
        <p className="text-balance text-2xl sm:text-3xl md:text-[2.5rem] font-semibold text-foreground leading-[1.15] tracking-[-0.02em]">
          Eliminate the trade-off between{' '}
          <span className="text-primary">developer freedom</span>{' '}
          and{' '}
          <span className="text-accent">organizational governance</span>.
        </p>

        {/* Secondary description */}
        <p className="text-pretty text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          <span className="font-medium text-foreground">50+ production-grade services</span>, security-hardened and pre-configured.
          Deploy complete platforms across any cloud in{' '}
          <span className="font-medium text-foreground">under 10 minutes</span> with a single command.
        </p>
      </div>

      {/* Modern stats row — clean, restrained */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-px sm:gap-2 mt-12 max-w-3xl mx-auto rounded-2xl border border-border/70 bg-card/40 backdrop-blur-sm p-2 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {[
          { value: '50+', label: 'Services' },
          { value: '<10min', label: 'Time to deploy' },
          { value: '100%', label: 'Open source' },
          { value: '0%', label: 'Vendor lock-in' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="group rounded-xl px-3 sm:px-4 py-3.5 sm:py-5 hover:bg-muted/40 transition-colors"
          >
            <div className="text-xl sm:text-2xl md:text-[1.75rem] font-semibold text-foreground tracking-tight tabular">
              {stat.value}
            </div>
            <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-muted-foreground tracking-tight">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroTitle;
