import React from 'react';
import HeroTitle, { HeroStats } from './HeroTitle';
import { delay, rise } from './styles';
import HeroCTA from './HeroCTA';
import TerminalDemo from './TerminalDemo';
import CloudProvidersGrid from './CloudProvidersGrid';

interface HeroContentProps {
  isVisible: boolean;
}

const HeroContent = ({ isVisible }: HeroContentProps) => (
  <div className="text-center">
    <HeroTitle isVisible={isVisible} />

    <HeroCTA isVisible={isVisible} />

    <div className="mt-14">
      <HeroStats isVisible={isVisible} />
    </div>

    {/* Product preview */}
    <div style={delay(420)} className={`${rise(isVisible)} relative isolate mx-auto mt-16 max-w-4xl`}>
      <div className="hero-halo" aria-hidden />
      <TerminalDemo />
    </div>

    <div style={delay(520)} className={`${rise(isVisible)} mt-20`}>
      <CloudProvidersGrid />
    </div>
  </div>
);

export default HeroContent;
