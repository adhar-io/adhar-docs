import React from "react";
import { Brain, Lightbulb, BarChart3, Zap, Database, MessageCircle, ArrowRight } from "lucide-react";

const FluentAISection = () => {
  const aiCapabilities = [
    {
      icon: Brain,
      title: "Intelligent data analysis",
      description: "Automatically identifies patterns and anomalies in your infrastructure data.",
    },
    {
      icon: Lightbulb,
      title: "Predictive insights",
      description: "Forecasts potential issues before they impact your operations.",
    },
    {
      icon: BarChart3,
      title: "Smart recommendations",
      description: "Provides actionable suggestions for optimization and scaling.",
    },
    {
      icon: Zap,
      title: "Automated responses",
      description: "Executes intelligent remediation actions based on learned patterns.",
    },
  ];

  const platformIntegration = [
    {
      icon: Database,
      title: "Data discovery",
      description: "AI-powered data cataloging and classification across all your sources.",
    },
    {
      icon: BarChart3,
      title: "Analytics engine",
      description: "Machine learning algorithms that understand your business context.",
    },
    {
      icon: MessageCircle,
      title: "Natural language queries",
      description: "Ask questions in plain English and get instant, accurate answers.",
    },
  ];

  const metrics = [
    { value: "99.2%", label: "Accuracy rate" },
    { value: "<100ms", label: "Response time" },
    { value: "24/7", label: "Monitoring" },
    { value: "Auto", label: "Learning" },
  ];

  return (
    <section id="fluent-ai" className="relative section-padding container-padding bg-muted/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-width-content">
        <div className="text-center mb-14 lg:mb-16">
          <span className="eyebrow mb-5"><Brain className="w-3 h-3 mr-1" />Fluent AI</span>
          <h2 className="section-heading mt-5 text-foreground">
            Integrated data &amp;
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">AI platform.</span>
          </h2>
          <p className="section-subheading mt-6">
            Transform raw data into strategic decisions with AI that understands context, not just numbers.
            Fluent AI changes how you discover, understand, and act on intelligence.
          </p>
        </div>

        {/* Feature card */}
        <div className="mb-12">
          <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
            <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
            <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
            <div className="relative px-6 py-12 sm:px-10 sm:py-14">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] shrink-0">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    Understands your data
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    Context-aware intelligence for better decisions.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50">
                {platformIntegration.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="bg-card/80 backdrop-blur-sm p-5">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] mb-3">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground tracking-tight">{item.title}</h4>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50">
                {metrics.map((m) => (
                  <div key={m.label} className="bg-card/80 backdrop-blur-sm px-5 py-5">
                    <div className="text-2xl font-semibold text-foreground tracking-tight tabular">{m.value}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities grid */}
        <div className="grid sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 mb-10">
          {aiCapabilities.map((capability, index) => {
            const Icon = capability.icon;
            return (
              <article key={index} className="bg-card p-7 sm:p-8 transition-colors hover:bg-muted/30">
                <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground tracking-tight">{capability.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{capability.description}</p>
              </article>
            );
          })}
        </div>

        {/* Interactive demo CTA */}
        <div className="rounded-2xl border border-border/70 bg-card p-8 sm:p-10 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] mx-auto mb-5">
            <Brain className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            Experience Fluent AI in action.
          </h3>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            See how Fluent AI transforms complex data queries into simple conversations.
            Try our interactive demo to experience the future of data intelligence.
          </p>
          <div className="mt-7">
            <button
              type="button"
              className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Try interactive demo</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FluentAISection;
