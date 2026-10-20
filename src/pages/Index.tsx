import React from 'react';
import Navigation from '@/components/landing/Navigation';
import HeroSection from '@/components/landing/HeroSection';
import DemoVideoSection from '@/components/landing/DemoVideoSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ArchitectureSection from '@/components/landing/ArchitectureSection';
import CapabilitiesSection from '@/components/landing/CapabilitiesSection';
import FluentAISection from '@/components/landing/FluentAISection';
import IntegrationsSection from '@/components/landing/IntegrationsSection';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';
import Reveal from '@/components/Reveal';

/**
 * Landing page. Below the hero, sections alternate between the plain and the
 * muted background, and each one fades in as it scrolls into view.
 */
// Explicit keys: component names are not stable once the bundle is minified.
const sections = [
  ['demo', DemoVideoSection],
  ['features', FeaturesSection],
  ['architecture', ArchitectureSection],
  ['capabilities', CapabilitiesSection],
  ['adhar-ai', FluentAISection],
  ['integrations', IntegrationsSection],
  ['pricing', PricingSection],
  ['faq', FAQSection],
  ['cta', CTASection],
] as const;

const Index = () => (
  <div className="min-h-screen bg-background text-foreground overflow-x-hidden w-full antialiased">
    <Navigation />

    <main>
      {/* Above the fold — keeps its own entrance animation */}
      <HeroSection />

      {sections.map(([key, Section]) => (
        <Reveal key={key}>
          <Section />
        </Reveal>
      ))}
    </main>

    <Footer />
  </div>
);

export default Index;
