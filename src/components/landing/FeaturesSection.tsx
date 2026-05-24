
import { Check } from "lucide-react";
import { features } from "@/data/landingPageData";

const FeaturesSection = () => {
  return (
    <section id="features" className="relative section-padding container-padding bg-background">
      {/* Subtle topline divider */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-width-content">
        <div className="text-center mb-16 lg:mb-20">
          <span className="eyebrow mb-5">Platform</span>
          <h2 className="section-heading mt-5 text-foreground">
            Enterprise capabilities,
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">without enterprise drag.</span>
          </h2>
          <p className="section-subheading mt-6">
            Composable tools designed for modern, cloud-native applications. Ship faster with
            sensible defaults, governance built in.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
          {features.map((feature, index) => (
            <article
              key={index}
              className="group relative flex flex-col bg-card p-7 sm:p-8 transition-colors duration-300 hover:bg-muted/30"
            >
              {/* Icon */}
              <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)] transition-transform duration-300 group-hover:-translate-y-0.5">
                <feature.icon className="h-5 w-5" />
              </div>

              <h3 className="text-lg font-semibold text-foreground tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              <ul className="mt-5 space-y-2 border-t border-border/60 pt-5">
                {feature.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary/80" strokeWidth={2.5} />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
