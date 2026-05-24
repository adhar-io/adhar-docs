import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Check, MessageSquare, ArrowRight } from "lucide-react";
import { pricingPlans } from "@/data/landingPageData";

const PricingSection = () => {
  return (
    <section id="pricing" className="relative section-padding container-padding bg-muted/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-width-content">
        <div className="text-center mb-14 lg:mb-16">
          <span className="eyebrow mb-5">Pricing</span>
          <h2 className="section-heading mt-5 text-foreground">
            Transparent,
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">scalable pricing.</span>
          </h2>
          <p className="section-subheading mt-6">
            Start free and scale with confidence. No hidden fees, no vendor lock-in.
            Enterprise features available from day one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pricingPlans.map((plan, index) => {
            const isPopular = plan.popular;
            return (
              <Card
                key={index}
                className={`relative flex flex-col rounded-2xl border bg-card transition-colors ${
                  isPopular
                    ? 'border-primary/60 ring-1 ring-primary/30 shadow-[var(--shadow-md)]'
                    : 'border-border/70 hover:border-border shadow-[var(--shadow-xs)]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider shadow-[var(--shadow-xs)]">
                      <Star className="w-3 h-3" />
                      Most popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pt-10 pb-6 px-7">
                  <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">{plan.name}</CardTitle>
                  <div className="mt-5 text-4xl font-semibold tracking-tight tabular text-foreground">
                    {plan.price}
                    {plan.period && (
                      <span className="text-base text-muted-foreground font-normal ml-1">{plan.period}</span>
                    )}
                  </div>
                  <CardDescription className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col px-7 pb-7">
                  <ul className="space-y-3 mb-7 border-t border-border/60 pt-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary/80" strokeWidth={2.5} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full h-11 text-[15px] font-medium ${
                      isPopular ? 'btn-primary-modern' : 'btn-secondary-modern'
                    }`}
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-14">
          <p className="text-sm text-muted-foreground mb-5">Need a custom solution? We're here to help.</p>
          <button
            type="button"
            className="btn-secondary-modern group inline-flex items-center justify-center gap-2 rounded-full px-5 h-11 text-sm font-medium"
          >
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span>Contact enterprise sales</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
