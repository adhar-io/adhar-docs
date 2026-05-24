
import React from 'react';
import { Phase } from './types';

interface DevelopmentPhasesProps {
  phases: Phase[];
}

const DevelopmentPhases = ({ phases }: DevelopmentPhasesProps) => {
  return (
    <div className="relative mb-12 lg:mb-14">
      {/* Section header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-border" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Development Lifecycle
          </h3>
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-border" />
        </div>
        <p className="text-sm text-muted-foreground">From planning to deployment, all phases in one platform.</p>
      </div>

      {/* Phases grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
        {phases.map((phase, index) => {
          const PhaseIcon = phase.icon;
          return (
            <div
              key={phase.id}
              className="group bg-card p-5 flex flex-col items-center text-center gap-3 transition-colors hover:bg-muted/40 animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] transition-transform duration-300 group-hover:-translate-y-0.5">
                <PhaseIcon className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-foreground tracking-tight">{phase.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DevelopmentPhases;
