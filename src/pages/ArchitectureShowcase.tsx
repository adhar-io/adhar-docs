import React from 'react';
import InteractiveArchitecture from '../components/InteractiveArchitecture';
import ArchitectureSummary from '../components/architecture/ArchitectureSummary';

const ArchitectureShowcase = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container-padding py-12 sm:py-16">
        <div className="max-width-content">
          {/* Header */}
          <div className="text-center mb-12 lg:mb-16">
            <span className="eyebrow mb-5">Architecture showcase</span>
            <h1 className="section-heading mt-5 text-foreground">
              The ADHAR platform,
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">visualized.</span>
            </h1>
            <p className="section-subheading mt-6">
              A comprehensive visual representation of the Internal Developer Platform —
              modern design patterns, premium styling, and refined user experience.
            </p>
          </div>

          <ArchitectureSummary />

          <div className="mt-10 lg:mt-12">
            <InteractiveArchitecture />
          </div>

          <p className="mt-10 pt-8 border-t border-border/60 text-center text-xs text-muted-foreground">
            Enhanced with modern design patterns, advanced animations, and comprehensive platform coverage.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ArchitectureShowcase;
