
import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import { btnPrimary, btnSecondary } from "./styles";


const CTASection = () => {
  return (
    <section aria-labelledby="cta-heading" className="section-padding container-padding relative overflow-hidden bg-muted/30">
      <div className="max-width-content">
        <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
          {/* Mesh + grid backdrop */}
          <div className="absolute inset-0 bg-mesh opacity-90" aria-hidden />
          <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25" aria-hidden />
          <div
            className="absolute -top-32 sm:-top-40 left-1/2 -translate-x-1/2 w-[min(800px,100vw)] h-[300px] sm:h-[350px] lg:h-[400px] rounded-full blur-3xl opacity-50"
            style={{ background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.35), transparent)' }}
          />

          <div className="relative px-6 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24 text-center">
            <span className="eyebrow mb-6">Get started</span>

            <h2 id="cta-heading" className="section-heading mt-4 text-foreground">
              Ship a platform today, not next quarter.
            </h2>

            <p className="section-subheading mt-5">
              Go from an empty laptop to a working platform — GitOps, single sign-on, secrets and a developer console —
              with one command: <code className="font-mono text-foreground">adhar up</code>.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/docs/$" params={{ _splat: "getting-started/quick-start" }}
                className={btnPrimary}
              >
                <span>Start the quick start</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                to="/docs"
                className={btnSecondary}
              >
                <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden />
                <span>Read the docs</span>
              </Link>
            </div>

            {/* Three steps to a running platform */}
            <ol className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50 text-left">
              {[
                { step: "1", title: "Install the CLI", body: "One binary for macOS, Linux or Windows." },
                { step: "2", title: "Run adhar up", body: "About ten minutes later, the platform is running." },
                { step: "3", title: "Open the console", body: "Sign in once, then create your first project." },
              ].map((s) => (
                <li key={s.step} className="bg-card/80 backdrop-blur-sm px-5 py-6 flex gap-4">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary tabular" aria-hidden>
                    {s.step}
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground tracking-tight">{s.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{s.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
