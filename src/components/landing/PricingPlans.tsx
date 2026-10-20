import React from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { pricingPlans } from "@/data/landingPageData";
import { btnPrimary, btnSecondary } from "./styles";

interface PricingPlansProps {
  /** Show each plan's icon above its name (the /pricing page does). */
  showIcons?: boolean;
}

/** The plan cards, shared by the landing page and /pricing. */
const PricingPlans = ({ showIcons = false }: PricingPlansProps) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
    {pricingPlans.map((plan) => {
      const Icon = plan.icon;
      return (
        <Card
          key={plan.name}
          className={`relative flex flex-col rounded-2xl border bg-card transition-colors ${
            plan.popular
              ? "border-primary/60 ring-1 ring-primary/30 shadow-[var(--shadow-md)]"
              : "border-border/70 hover:border-border shadow-[var(--shadow-xs)]"
          }`}
        >
          {plan.highlight && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider shadow-[var(--shadow-xs)]">
                {plan.highlight}
              </span>
            </div>
          )}

          <CardHeader className="text-center pt-10 pb-6 px-7">
            {showIcons && (
              <div className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
            )}
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{plan.subtitle}</p>
            <CardTitle className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{plan.name}</CardTitle>
            <div className="mt-5 text-4xl font-semibold tracking-tight tabular text-foreground">{plan.price}</div>
            <CardDescription className="mt-3 text-sm text-muted-foreground leading-relaxed">{plan.description}</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col px-7 pb-7">
            <ul className="space-y-3 mb-7 border-t border-border/60 pt-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" strokeWidth={2.5} aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link to={plan.to} className={`${plan.popular ? btnPrimary : btnSecondary} mt-auto w-full`}>
              <span>{plan.cta}</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default PricingPlans;
