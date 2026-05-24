import React from 'react';
import adharLogo from '@/assets/adhar-logo.png';

const ArchitectureHeader = () => {
  return (
    <div className="relative border-b border-border/70 bg-muted/30 px-6 sm:px-10 py-10 overflow-hidden">
      {/* Subtle mesh + grid backdrop */}
      <div className="absolute inset-0 bg-mesh opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />

      {/* Main content */}
      <div className="relative flex flex-col items-center justify-center gap-3">
        <img
          src={adharLogo}
          alt="ADHAR — The Open Cloud-Native Foundation"
          className="h-12 sm:h-14 w-auto"
        />
        <div className="text-[11px] font-medium tracking-[0.28em] text-muted-foreground uppercase">
          Platform Architecture
        </div>
      </div>
    </div>
  );
};

export default ArchitectureHeader;
