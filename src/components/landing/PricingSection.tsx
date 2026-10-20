import React from "react";
import { ArrowRight } from "lucide-react";
import { Github } from "@/components/brand-icons";
import PricingPlans from "./PricingPlans";
import { btnSecondary } from "./styles";
import SectionHeader from "./SectionHeader";

const PricingSection = () => {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="relative section-padding container-padding bg-muted/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-width-content">
        <SectionHeader id="pricing-heading" eyebrow="Pricing" title="Free to run." titleMuted="Or let us host it.">
          Every feature ships in the Apache 2.0 open-source release. Run it yourself for free, or let Adhar Cloud run the same platform for you.
        </SectionHeader>

        <PricingPlans />

        <div className="text-center mt-14">
          <p className="text-sm text-muted-foreground mb-5">Found a bug or want a feature? It all happens in the open.</p>
          <a
            href="https://github.com/adhar-io/adhar/issues"
            target="_blank"
            rel="noopener noreferrer"
            className={btnSecondary}
          >
            <Github className="w-4 h-4" />
            <span>Open an issue on GitHub</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
