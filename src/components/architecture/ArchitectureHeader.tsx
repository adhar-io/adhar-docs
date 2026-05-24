
import React from 'react';
import adharLogo from '@/assets/adhar-logo.png';

const ArchitectureHeader = () => {
  return (
    <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-8 py-10 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 left-1/3 w-16 h-16 bg-white rounded-full translate-y-8"></div>
      </div>
      
      {/* Main content */}
      <div className="relative flex items-center justify-center animate-fadeInUp">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/20 shadow-xl">
          <img 
            src={adharLogo} 
            alt="ADHAR - The Open Cloud-Native Foundation" 
            className="h-16 w-auto filter brightness-110 drop-shadow-2xl"
          />
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
    </div>
  );
};

export default ArchitectureHeader;
