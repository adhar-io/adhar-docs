
import { Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { features } from "@/data/landingPageData";
import { textLink } from "./styles";
import SectionHeader from "./SectionHeader";

const FeaturesSection = () => {
  return (
    <section id="features" aria-labelledby="features-heading" className="relative section-padding container-padding bg-background">
      {/* Subtle topline divider */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-width-content">
        <SectionHeader id="features-heading" eyebrow="The 6 D's" title="One platform for the" titleMuted="whole software lifecycle.">
          Adhar follows software from idea to production and back again. Each stage answers one question and hands something concrete to the next.
        </SectionHeader>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group relative flex flex-col bg-card p-7 sm:p-8 transition-colors duration-300 hover:bg-muted/30"
            >
              {/* Icon */}
              <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] transition-transform duration-300 group-hover:-translate-y-0.5">
                <feature.icon className="h-5 w-5" aria-hidden />
              </div>

              <h3 className="flex items-baseline gap-2 text-lg font-semibold text-foreground tracking-tight">
                <span className="font-mono text-xs font-medium text-muted-foreground tabular">0{index + 1}</span>
                {feature.title}
              </h3>
              <p className="mt-1 text-sm font-medium text-foreground/80">{feature.question}</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              <ul className="mt-5 space-y-2 border-t border-border/60 pt-5">
                {feature.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary/80" strokeWidth={2.5} aria-hidden />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/docs/$" params={{ _splat: "core-concepts/ds-framework" }}
            className={textLink}
          >
            How the 6 D's work in practice
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
