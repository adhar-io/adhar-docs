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
        title="One platform, in layers,"
        titleMuted="from team to cloud."
      >
        Teams work through the console, the CLI or Adhar AI. Underneath, a control plane and 100+ curated packages run
        on Kubernetes — the same layers on a laptop or on any supported cloud.
      </SectionHeader>

      <ModernArchitectureDiagram />
    </div>
  </section>
);

export default ArchitectureSection;
