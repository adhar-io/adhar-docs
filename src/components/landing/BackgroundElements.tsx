
import React from 'react';
import FloatingElements from './FloatingElements';
import TechLogos from './TechLogos';

interface BackgroundElementsProps {
  mousePosition: { x: number; y: number };
}

const BackgroundElements = ({ mousePosition }: BackgroundElementsProps) => {
  return (
    <div className="absolute inset-0 overflow-hidden hw-accelerate">
      {/* Enhanced grid patterns with better performance */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-30 dark:opacity-15"></div>
      
      {/* Secondary grid for depth */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f608_1px,transparent_1px),linear-gradient(to_bottom,#3b82f608_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_40%_30%_at_50%_0%,#000_50%,transparent_100%)] opacity-20"></div>
      
      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large sparkles */}
        <div 
          className="absolute top-1/4 left-1/4 w-4 h-4 opacity-60 animate-pulse"
          style={{
            transform: `translate3d(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.02}px, 0)`,
            transition: 'transform 0.8s ease-out',
            animationDelay: '0s'
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-blue-400">
            <path d="M12 2L13.09 8.26L19 7L14.74 12L21 13.09L14.74 18L19 23L13.09 21.74L12 28L10.91 21.74L5 23L9.26 18L3 13.09L9.26 12L5 7L10.91 8.26L12 2Z" fill="currentColor" />
          </svg>
        </div>
        
        <div 
          className="absolute top-2/3 right-1/4 w-3 h-3 opacity-50 animate-pulse"
          style={{
            transform: `translate3d(${mousePosition.x * -0.025}px, ${mousePosition.y * -0.015}px, 0)`,
            transition: 'transform 0.8s ease-out',
            animationDelay: '2s'
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-purple-400">
            <path d="M12 2L13.09 8.26L19 7L14.74 12L21 13.09L14.74 18L19 23L13.09 21.74L12 28L10.91 21.74L5 23L9.26 18L3 13.09L9.26 12L5 7L10.91 8.26L12 2Z" fill="currentColor" />
          </svg>
        </div>

        <div 
          className="absolute top-1/3 right-1/3 w-2 h-2 opacity-70 animate-pulse"
          style={{
            transform: `translate3d(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.03}px, 0)`,
            transition: 'transform 0.8s ease-out',
            animationDelay: '4s'
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-indigo-400">
            <path d="M12 2L13.09 8.26L19 7L14.74 12L21 13.09L14.74 18L19 23L13.09 21.74L12 28L10.91 21.74L5 23L9.26 18L3 13.09L9.26 12L5 7L10.91 8.26L12 2Z" fill="currentColor" />
          </svg>
        </div>

        {/* Stars */}
        <div 
          className="absolute top-1/6 left-2/3 w-3 h-3 opacity-60 animate-pulse"
          style={{
            transform: `translate3d(${mousePosition.x * 0.035}px, ${mousePosition.y * 0.025}px, 0) rotate(${mousePosition.x * 0.05}deg)`,
            transition: 'transform 0.8s ease-out',
            animationDelay: '1s'
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-yellow-400">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
          </svg>
        </div>

        <div 
          className="absolute bottom-1/4 left-1/6 w-4 h-4 opacity-50 animate-pulse"
          style={{
            transform: `translate3d(${mousePosition.x * -0.03}px, ${mousePosition.y * -0.02}px, 0) rotate(${mousePosition.x * -0.03}deg)`,
            transition: 'transform 0.8s ease-out',
            animationDelay: '3s'
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-pink-400">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
          </svg>
        </div>

        <div 
          className="absolute top-3/4 right-1/6 w-2.5 h-2.5 opacity-65 animate-pulse"
          style={{
            transform: `translate3d(${mousePosition.x * 0.04}px, ${mousePosition.y * 0.03}px, 0) rotate(${mousePosition.x * 0.04}deg)`,
            transition: 'transform 0.8s ease-out',
            animationDelay: '5s'
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-cyan-400">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
          </svg>
        </div>

        {/* Diamond shapes */}
        <div 
          className="absolute top-1/2 left-1/8 w-3 h-3 opacity-40 animate-pulse"
          style={{
            transform: `translate3d(${mousePosition.x * 0.025}px, ${mousePosition.y * 0.02}px, 0) rotate(45deg)`,
            transition: 'transform 0.8s ease-out',
            animationDelay: '1.5s'
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-400 rounded-sm transform rotate-45"></div>
        </div>

        <div 
          className="absolute top-1/5 right-1/8 w-2 h-2 opacity-55 animate-pulse"
          style={{
            transform: `translate3d(${mousePosition.x * -0.03}px, ${mousePosition.y * -0.025}px, 0) rotate(45deg)`,
            transition: 'transform 0.8s ease-out',
            animationDelay: '3.5s'
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-rose-400 to-orange-400 rounded-sm transform rotate-45"></div>
        </div>

        <div 
          className="absolute bottom-1/3 right-2/3 w-2.5 h-2.5 opacity-45 animate-pulse"
          style={{
            transform: `translate3d(${mousePosition.x * 0.028}px, ${mousePosition.y * 0.018}px, 0) rotate(45deg)`,
            transition: 'transform 0.8s ease-out',
            animationDelay: '2.5s'
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-violet-400 to-purple-400 rounded-sm transform rotate-45"></div>
        </div>
      </div>
      
      {/* Floating Elements with performance optimization */}
      <div className="hw-accelerate">
        <FloatingElements mousePosition={mousePosition} />
      </div>
      
      {/* Technology Logos with parallax */}
      <div className="hw-accelerate">
        <TechLogos mousePosition={mousePosition} />
      </div>
      
      {/* Enhanced floating orbs with smoother parallax */}
      <div 
        className="absolute top-32 left-4 sm:left-10 w-32 sm:w-40 h-32 sm:h-40 rounded-full blur-2xl animate-gentle-float"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.1) 50%, transparent 100%)',
          transform: `translate3d(${Math.min(mousePosition.x * 0.02, 20)}px, ${Math.min(mousePosition.y * 0.015, 15)}px, 0)`,
          transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      />
      
      <div 
        className="absolute top-40 right-4 sm:right-20 w-28 sm:w-32 h-28 sm:h-32 rounded-full blur-2xl animate-gentle-float"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(236,72,153,0.1) 50%, transparent 100%)',
          transform: `translate3d(${Math.max(mousePosition.x * -0.018, -18)}px, ${Math.max(mousePosition.y * -0.012, -12)}px, 0)`,
          transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          animationDelay: '2s'
        }}
      />
      
      <div 
        className="absolute bottom-40 left-4 sm:left-20 w-24 sm:w-28 h-24 sm:h-28 rounded-full blur-2xl animate-gentle-float"
        style={{
          background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(20,184,166,0.1) 50%, transparent 100%)',
          transform: `translate3d(${Math.min(mousePosition.x * 0.015, 12)}px, ${Math.min(mousePosition.y * 0.01, 8)}px, 0)`,
          transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          animationDelay: '4s'
        }}
      />
      
      {/* Enhanced ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/8 to-purple-500/8 rounded-full blur-3xl animate-gentle-float hw-accelerate"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/8 to-pink-500/8 rounded-full blur-3xl animate-gentle-float hw-accelerate" style={{ animationDelay: '3s' }}></div>
      
      {/* Additional depth layers */}
      <div className="absolute top-1/3 right-1/3 w-40 h-40 bg-gradient-to-r from-indigo-400/5 to-cyan-400/5 rounded-full blur-2xl animate-gentle-float hw-accelerate" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-1/3 left-1/3 w-36 h-36 bg-gradient-to-r from-rose-400/5 to-orange-400/5 rounded-full blur-2xl animate-gentle-float hw-accelerate" style={{ animationDelay: '5s' }}></div>
    </div>
  );
};

export default BackgroundElements;
