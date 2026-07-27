import React from 'react';
import { Link } from "@tanstack/react-router";
import adharSymbol from '@/assets/branding/symbol-color.svg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  linkTo?: string | null;
  variant?: 'default' | 'console' | 'sidebar';
}

const sizeMap = {
  sm: { symbol: 'h-7 w-7', wordmark: 'text-lg', tagline: 'text-[9px]' },
  md: { symbol: 'h-9 w-9', wordmark: 'text-xl', tagline: 'text-[10px]' },
  lg: { symbol: 'h-12 w-12', wordmark: 'text-3xl', tagline: 'text-xs' },
};

const Logo = ({ size = 'md', showTagline = true, className = '', linkTo = '/', variant = 'default' }: LogoProps) => {
  const s = sizeMap[size];

  const content = (
    <div className={`flex items-center gap-2.5 group ${className}`}>
      <div className="relative shrink-0">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
        <img
          src={adharSymbol}
          alt="ADHAR"
          className={`relative ${s.symbol} object-contain drop-shadow-[0_4px_12px_hsl(var(--primary)/0.35)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-4deg]`}
        />
      </div>
      <div className={`flex flex-col leading-none ${showTagline ? 'items-stretch' : 'items-start'}`}>
        {showTagline ? (
          <span className={`${s.wordmark} font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] group-hover:bg-[position:100%_0] transition-[background-position] duration-700 flex justify-between w-full`}>
            {'ADHAR'.split('').map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </span>
        ) : (
          <span className={`${s.wordmark} font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] group-hover:bg-[position:100%_0] transition-[background-position] duration-700 tracking-[0.12em]`}>
            ADHAR
          </span>
        )}
        {showTagline && (
          <span className={`${s.tagline} font-medium uppercase tracking-[0.18em] text-muted-foreground mt-1.5 whitespace-nowrap`}>
            Open Cloud-Native Foundation
          </span>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex items-center hover:opacity-95 transition-opacity duration-300">
        {content}
      </Link>
    );
  }
  return content;
};

export default Logo;
