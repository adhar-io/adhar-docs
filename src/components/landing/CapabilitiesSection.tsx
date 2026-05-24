import React from "react";
import { Star } from "lucide-react";
import { capabilities } from "@/data/landingPageData";

const CapabilitiesSection = () => {
  return (
    <section id="capabilities" className="relative section-padding container-padding bg-background">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-width-content">
        <div className="text-center mb-14 lg:mb-16">
          <span className="eyebrow mb-5">Capabilities</span>
          <h2 className="section-heading mt-5 text-foreground">
            Built for
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">enterprise scale.</span>
          </h2>
          <p className="section-subheading mt-6">
            Harness Kubernetes with enterprise-grade capabilities designed for modern,
            cloud-native applications that scale globally.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;
            return (
              <article
                key={index}
                className={`group relative flex bg-card p-6 sm:p-7 transition-colors duration-300 hover:bg-muted/30 ${
                  capability.highlight ? 'ring-1 ring-inset ring-primary/30' : ''
                }`}
              >
                {capability.highlight && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ring-primary/20">
                    <Star className="w-2.5 h-2.5" />
                    Foundation
                  </span>
                )}

                <div className="flex items-start gap-5 w-full">
                  <div
                    className={`shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 shadow-[var(--shadow-xs)] transition-transform duration-300 group-hover:-translate-y-0.5 ${
                      capability.highlight ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 justify-between mb-1.5 pr-24">
                      <h3 className="text-lg font-semibold text-foreground tracking-tight">{capability.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{capability.description}</p>

                    <div className="mt-4 inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium tabular text-muted-foreground">
                      {capability.stats}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CapabilitiesSection;
