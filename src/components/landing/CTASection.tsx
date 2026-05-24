
import React from "react";
import { ArrowRight, BookOpen } from "lucide-react";

const CTASection = () => {
  return (
    <section className="section-padding container-padding relative overflow-hidden">
      <div className="max-width-content">
        <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
          {/* Mesh + grid backdrop */}
          <div className="absolute inset-0 bg-mesh opacity-90" />
          <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25" />
          <div
            className="absolute -top-32 sm:-top-40 left-1/2 -translate-x-1/2 w-[min(800px,100vw)] h-[300px] sm:h-[350px] lg:h-[400px] rounded-full blur-3xl opacity-50"
            style={{ background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.35), transparent)' }}
          />

          <div className="relative px-6 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24 text-center">
            <span className="eyebrow mb-6">Get started</span>

            <h2 className="section-heading mt-4 text-foreground">
              Ship a platform today, not next quarter.
            </h2>

            <p className="section-subheading mt-5">
              Join teams who replaced months of platform work with a single command.
              Free to start, open source, no lock-in.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-12 text-[15px] font-medium"
              >
                <span>Start free</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                className="btn-secondary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-12 text-[15px] font-medium"
              >
                <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span>View documentation</span>
              </button>
            </div>

            {/* Refined stats row */}
            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50">
              {[
                { number: "500+", label: "Enterprise customers" },
                { number: "10K+", label: "K8s clusters managed" },
                { number: "100K+", label: "Apps deployed" },
                { number: "99.9%", label: "Platform uptime" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card/80 backdrop-blur-sm px-5 py-6"
                >
                  <div className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight tabular">
                    {stat.number}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
