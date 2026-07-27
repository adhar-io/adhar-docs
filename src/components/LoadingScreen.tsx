import React from 'react';
import adharSymbol from '@/assets/branding/symbol-color.svg';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div
        className="relative w-24 h-24 flex items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        {/* Static track */}
        <div className="absolute inset-0 rounded-full border-2 border-muted/70" />
        {/* Rotating arc */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/40 animate-spin [animation-duration:1.2s]" />
        {/* Logo */}
        <img
          src={adharSymbol}
          alt="ADHAR"
          className="relative h-12 w-12 object-contain"
        />
      </div>
    </div>
  );
};

export default LoadingScreen;
