
import React from 'react';
import { Play, Pause } from "lucide-react";
import adharLogo from '@/assets/adhar-logo.png';

interface DiagramHeaderProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const DiagramHeader = ({ isPlaying, onTogglePlay }: DiagramHeaderProps) => {
  return (
    <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-6 py-3 shadow-md">
        <img 
          src={adharLogo} 
          alt="ADHAR - The Open Cloud-Native Foundation" 
          className="h-10 w-auto"
        />
        <p className="text-sm text-gray-600 mt-2">Enterprise Development Lifecycle - Kubernetes-Native Platform</p>
      </div>
      <button
        onClick={onTogglePlay}
        className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 flex items-center space-x-2 hover:bg-white transition-all duration-300 shadow-md group"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-red-500" />
        ) : (
          <Play className="w-5 h-5 text-green-500" />
        )}
        <span className="text-sm font-medium text-gray-700">
          {isPlaying ? 'Pause Flow' : 'Start Demo'}
        </span>
      </button>
    </div>
  );
};

export default DiagramHeader;
