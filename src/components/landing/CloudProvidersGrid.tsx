import React from "react";
import { Server, ShieldCheck, Terminal, Unlock } from "lucide-react";
import SectionHeader from "./SectionHeader";

// `logo: null` renders a generic server icon (on-prem has no brand mark).
const cloudProviders = [
  { name: "AWS", logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" },
  { name: "Azure", logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg" },
  { name: "Google Cloud", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg" },
  { name: "DigitalOcean", logo: "https://upload.wikimedia.org/wikipedia/commons/f/ff/DigitalOcean_logo.svg" },
  { name: "Civo", logo: "/lovable-uploads/42ab2d91-bce2-42b9-9c8d-7eb167d49ba8.png" },
  { name: "On-prem", logo: null },
];

const promises = [
  {
    icon: Unlock,
    title: "No lock-in",
    body: "Standard open-source projects and plain Kubernetes resources, all in your own Git.",
  },
  {
    icon: Terminal,
    title: "One command",
    body: "One command creates the cluster and installs the whole platform.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    body: "SSO, secrets management and signed-image admission from the first install.",
  },
];

const CloudProvidersGrid = () => (
  <section
    aria-labelledby="clouds-heading"
    className="bg-gradient-to-br from-background/80 to-muted/80 backdrop-blur-sm rounded-3xl py-14 sm:py-16 px-5 sm:px-8 border border-border/50 shadow-xl"
  >
    <SectionHeader size="sm" id="clouds-heading" eyebrow="Runs anywhere" title="Deploy anywhere," titleMuted="change only the sizing.">
      One platform, one GitOps flow, one <code className="font-mono text-foreground">adhar up</code> — on a laptop, on
      five public clouds or on your own hosts.
    </SectionHeader>

    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 items-center">
      {cloudProviders.map((provider) => (
        <li
          key={provider.name}
          className="group relative bg-background/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-primary/5"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto flex items-center justify-center mb-2 sm:mb-3">
            {provider.logo ? (
              <img
                src={provider.logo}
                loading="lazy"
                decoding="async"
                alt=""
                className="max-w-full max-h-full object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = "hidden";
                }}
              />
            ) : (
              <Server className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors duration-300" aria-hidden />
            )}
          </div>
          <p className="text-center text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors duration-300">
            {provider.name}
          </p>
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            aria-hidden
          />
        </li>
      ))}
    </ul>

    <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
      {promises.map(({ icon: Icon, title, body }) => (
        <div key={title} className="bg-background/40 backdrop-blur-sm rounded-xl p-6 border border-border/30">
          <div className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <h3 className="font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
      ))}
    </div>
  </section>
);

export default CloudProvidersGrid;
