import React from "react";
import ModernArchitectureDiagram from "@/components/ModernArchitectureDiagram";
import SectionHeader from "./SectionHeader";

const ArchitectureSection = () => (
  <section
    id="architecture"
    aria-labelledby="architecture-heading"
    className="relative section-padding container-padding bg-muted/30 overflow-hidden"
  >
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

    <div className="max-width-content">
      <SectionHeader
        id="architecture-heading"
        eyebrow="Architecture"
        title="Startup or enterprise,"
        titleMuted="the architecture scales with you."
      >
        Start with dev, test and prod on one cluster and one bill. As you grow, give prod its own cluster and switch on
        HA. Either way, teams use the console, the CLI or Adhar AI, on the same control plane and 100+ curated packages
        on Kubernetes — on a laptop or any supported cloud.
      </SectionHeader>

      <ModernArchitectureDiagram />
    </div>
  </section>
);

export default ArchitectureSection;
