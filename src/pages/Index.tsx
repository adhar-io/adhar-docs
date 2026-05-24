
import React from 'react';
import Navigation from '@/components/landing/Navigation';
import HeroSection from '@/components/landing/HeroSection';
import DemoVideoSection from '@/components/landing/DemoVideoSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ModernArchitectureDiagram from '@/components/ModernArchitectureDiagram';
import CapabilitiesSection from '@/components/landing/CapabilitiesSection';
import FluentAISection from '@/components/landing/FluentAISection';
import IntegrationsSection from '@/components/landing/IntegrationsSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden w-full antialiased">
      {/* Navigation */}
      <Navigation />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Demo Video Section */}
      <DemoVideoSection />
      
      {/* Features Section */}
      <FeaturesSection />
      
      {/* Modern Architecture Section */}
      <section className="relative section-padding container-padding bg-muted/30 overflow-hidden w-full">
        {/* Topline divider */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="max-width-content">
          <div className="text-center mb-16 lg:mb-20">
            <span className="eyebrow mb-5">Architecture</span>
            <h2 className="section-heading mt-5 text-foreground">
              Built for scale,
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">designed for clarity.</span>
            </h2>
            <p className="section-subheading mt-6">
              An enterprise-grade platform tuned for scalability, security, and performance —
              consistent across any cloud you run on.
            </p>
          </div>

          {/* Architecture diagram */}
          <div className="w-full overflow-hidden hw-accelerate">
            <ModernArchitectureDiagram />
          </div>
        </div>
      </section>
      
      {/* Enhanced section spacing and animations */}
      <div className="space-y-section">
        <CapabilitiesSection />
        <FluentAISection />
        <IntegrationsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
