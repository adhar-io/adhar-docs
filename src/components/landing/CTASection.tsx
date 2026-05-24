
import React from "react";
import { Button } from "@/components/ui/button";
import { Play, BookOpen } from "lucide-react";

const CTASection = () => {
  return (
    <section className="section-padding bg-gradient-to-br from-primary via-accent to-primary/80 dark:from-primary/90 dark:via-accent/90 dark:to-primary/70 relative overflow-hidden">
      {/* Enhanced background pattern */}
      <div className="absolute inset-0 opacity-10 dark:opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(-45deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      </div>
      
      {/* Animated background elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-background/5 rounded-full blur-2xl animate-gentle-float"></div>
      <div className="absolute bottom-10 right-10 w-24 h-24 bg-background/5 rounded-full blur-2xl animate-gentle-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="max-width-content container-padding relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground mb-8 leading-tight text-balance animate-fade-in-up">
            Ready to Scale with{' '}
            <span className="bg-gradient-to-r from-background/90 to-background/70 bg-clip-text text-transparent">
              ADHAR Platform?
            </span>
          </h2>
          
          <p className="text-lg sm:text-xl text-primary-foreground/90 max-w-4xl mx-auto mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Join thousands of enterprises who have accelerated their cloud-native journey with ADHAR. 
            Start with our free plan and experience the power of Kubernetes-native development.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Button 
              size="lg" 
              className="bg-background text-foreground hover:bg-background/90 px-10 py-4 text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 interactive-lift font-semibold"
            >
              <div className="w-5 h-5 mr-3 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
                <Play className="w-3 h-3 text-primary-foreground" />
              </div>
              Start Free Trial
            </Button>
            
            <Button 
              size="lg" 
              variant="ghost" 
              className="text-primary-foreground hover:bg-background/10 border-2 border-primary-foreground/20 hover:border-primary-foreground/30 px-10 py-4 text-lg transition-all duration-300 hover:-translate-y-1 interactive-lift font-semibold"
            >
              <div className="w-5 h-5 mr-3 bg-gradient-to-r from-accent/80 to-primary/80 rounded-full flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-primary-foreground" />
              </div>
              View Documentation
            </Button>
          </div>
        </div>
        
        {/* Enhanced stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {[
            { number: "500+", label: "Enterprise Customers" },
            { number: "10K+", label: "K8s Clusters Managed" },
            { number: "100K+", label: "Apps Deployed" },
            { number: "99.9%", label: "Platform Uptime" }
          ].map((stat, index) => (
            <div 
              key={stat.label}
              className="glass-effect rounded-2xl p-6 lg:p-8 bg-background/15 hover:bg-background/20 transition-all duration-300 interactive-lift animate-scale-in"
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-2 bg-gradient-to-r from-background/90 to-background/70 bg-clip-text text-transparent">
                {stat.number}
              </div>
              <div className="text-primary-foreground/80 text-sm sm:text-base lg:text-lg font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CTASection;
