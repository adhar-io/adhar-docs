import React from 'react';
import adharLogo from '@/assets/adhar-logo.png';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center animate-fade-in">
        <div className="mb-8 animate-pulse">
          <img 
            src={adharLogo} 
            alt="ADHAR - The Open Cloud-Native Foundation" 
            className="h-24 w-auto mx-auto drop-shadow-2xl"
          />
        </div>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="mt-6 text-sm text-muted-foreground animate-fade-in">
          Loading...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
