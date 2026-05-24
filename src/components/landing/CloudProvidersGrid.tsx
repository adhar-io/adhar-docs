
import React from 'react';
import { Server } from 'lucide-react';

const cloudProviders = [
  { 
    name: "AWS", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
    alt: "Amazon Web Services",
    color: "hover:bg-orange-50 dark:hover:bg-orange-900/20"
  },
  { 
    name: "Azure", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg",
    alt: "Microsoft Azure",
    color: "hover:bg-blue-50 dark:hover:bg-blue-900/20"
  },
  { 
    name: "Google Cloud", 
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg",
    alt: "Google Cloud Platform",
    color: "hover:bg-red-50 dark:hover:bg-red-900/20"
  },
  { 
    name: "DigitalOcean", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/ff/DigitalOcean_logo.svg",
    alt: "DigitalOcean",
    color: "hover:bg-blue-50 dark:hover:bg-blue-900/20"
  },
  { 
    name: "Civo", 
    logo: "/lovable-uploads/42ab2d91-bce2-42b9-9c8d-7eb167d49ba8.png",
    alt: "Civo Cloud",
    color: "hover:bg-blue-50 dark:hover:bg-blue-900/20"
  },
  { 
    name: "On-Premises", 
    logo: null,
    alt: "On-Premises Infrastructure",
    isText: true,
    color: "hover:bg-gray-50 dark:hover:bg-gray-800/50"
  }
];

const CloudProvidersGrid = () => {
  return (
    <div className="bg-gradient-to-br from-background/80 to-muted/80 backdrop-blur-sm rounded-3xl py-16 px-8 border border-border/50 shadow-xl">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
          <Server className="w-4 h-4" />
          Multi-Cloud Ready
        </div>
        <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Deploy <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Anywhere</span>
        </h3>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Run ADHAR seamlessly across all major cloud providers and on-premises infrastructure with consistent performance and reliability
        </p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 items-center">
        {cloudProviders.map((provider, index) => (
          <div 
            key={index} 
            className={`group relative bg-background/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-primary/5`}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto flex items-center justify-center mb-2 sm:mb-3">
              {provider.isText ? (
                <div className="text-center">
                  <Server className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors duration-300 mx-auto mb-2" />
                </div>
              ) : (
                <img 
                  src={provider.logo} 
                  alt={provider.alt}
                  className="max-w-full max-h-full object-contain filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-12 h-12 bg-gradient-to-br from-muted to-muted-foreground/20 rounded-xl flex items-center justify-center shadow-inner"><span class="text-sm font-bold text-muted-foreground">${provider.name.substring(0, 2)}</span></div>`;
                    }
                  }}
                />
              )}
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                {provider.name === "On-Premises" ? "On-Prem" : provider.name}
              </span>
            </div>
            
            {/* Hover glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
        ))}
      </div>
      
      {/* Additional features section */}
      <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
        <div className="bg-background/40 backdrop-blur-sm rounded-xl p-6 border border-border/30">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="font-semibold text-foreground mb-2">Zero Lock-in</h4>
          <p className="text-sm text-muted-foreground">Move freely between cloud providers without vendor lock-in</p>
        </div>
        
        <div className="bg-background/40 backdrop-blur-sm rounded-xl p-6 border border-border/30">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h4 className="font-semibold text-foreground mb-2">Auto-Scaling</h4>
          <p className="text-sm text-muted-foreground">Intelligent scaling based on demand across all platforms</p>
        </div>
        
        <div className="bg-background/40 backdrop-blur-sm rounded-xl p-6 border border-border/30">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h4 className="font-semibold text-foreground mb-2">Secure by Default</h4>
          <p className="text-sm text-muted-foreground">Enterprise-grade security across all cloud environments</p>
        </div>
      </div>
    </div>
  );
};

export default CloudProvidersGrid;
