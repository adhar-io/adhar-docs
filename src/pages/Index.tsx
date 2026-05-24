
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
      
      {/* Enhanced Architecture Section */}
      <section className="section-padding container-padding bg-gradient-to-br from-slate-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 overflow-hidden w-full">
        <div className="max-width-content">
          <div className="text-center mb-16 lg:mb-20">
            {/* Enhanced badge */}
            <div className="inline-flex items-center px-4 py-2 glass-effect rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 animate-scale-in">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
              Cloud-Native Excellence
            </div>
            
            {/* Improved heading */}
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold heading-gradient mb-8 leading-tight text-balance animate-fade-in-up">
              Modern Architecture
            </h2>
            
            {/* Enhanced description */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed font-light animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Experience our enterprise-grade platform designed for{' '}
              <span className="font-semibold gradient-text">scalability</span>,{' '}
              <span className="font-semibold gradient-text">security</span>, and{' '}
              <span className="font-semibold gradient-text">performance</span> across multi-cloud environments
            </p>
          </div>
          
          {/* Architecture diagram with improved container */}
          <div className="w-full overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="hw-accelerate">
              <ModernArchitectureDiagram />
            </div>
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
