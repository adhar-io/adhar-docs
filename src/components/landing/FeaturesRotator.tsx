import React, { useState, useEffect } from 'react';
import {
  Zap,
  Shield,
  Globe,
  Cpu,
  Cloud,
  Rocket,
  Database,
  Lock,
} from 'lucide-react';

const features = [
  { icon: Zap, title: "Lightning fast", description: "Deploy in under 2 minutes with zero-config setup." },
  { icon: Shield, title: "Enterprise security", description: "SOC2 Type II compliant with end-to-end encryption." },
  { icon: Globe, title: "Multi-cloud ready", description: "Works seamlessly across AWS, GCP, Azure, and more." },
  { icon: Cpu, title: "AI-powered", description: "Intelligent resource optimization and auto-scaling." },
  { icon: Cloud, title: "Cloud native", description: "Built on Kubernetes with GitOps workflows." },
  { icon: Rocket, title: "DevOps automation", description: "Automated CI/CD pipelines with zero-downtime deployments." },
  { icon: Database, title: "Data management", description: "Integrated backup, monitoring, and disaster recovery." },
  { icon: Lock, title: "Compliance ready", description: "GDPR, HIPAA, and PCI DSS compliance built-in." },
];

const FeaturesRotator = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentFeature((prev) => (prev + 1) % features.length);
        setIsTransitioning(false);
      }, 200);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const Icon = features[currentFeature].icon;

  return (
    <div className="mb-12 flex items-center justify-center container-padding">
      <div className="w-full max-w-2xl rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="flex items-center gap-5 p-6 sm:p-7">
          <div
            className={`shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] transition-all duration-300 ${
              isTransitioning ? 'scale-95 opacity-60' : 'scale-100 opacity-100'
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div
            className={`flex-1 min-w-0 transition-all duration-300 ${
              isTransitioning ? 'opacity-60 translate-x-1' : 'opacity-100 translate-x-0'
            }`}
          >
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              {features[currentFeature].title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {features[currentFeature].description}
            </p>
          </div>

          <div className="shrink-0 flex flex-col gap-1.5 ml-2">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentFeature(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentFeature
                    ? 'w-4 bg-primary'
                    : 'w-1.5 bg-border hover:bg-muted-foreground/40'
                }`}
                aria-label={`Switch to feature ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesRotator;
