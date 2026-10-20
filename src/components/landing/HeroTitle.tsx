import React from 'react';
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { delay, focusRing, rise } from "./styles";

interface HeroTitleProps {
  isVisible: boolean;
}

const HeroTitle = ({ isVisible }: HeroTitleProps) => (
  <div className="mx-auto max-w-4xl">
    {/* Announcement pill — links to the launch post */}
    <div className={rise(isVisible)}>
      <Link
        to="/blog/$slug"
        params={{ slug: "adhar-platform" }}
        className={`group inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 backdrop-blur py-1 pl-1 pr-3 text-xs font-medium text-muted-foreground shadow-[var(--shadow-xs)] transition-colors hover:border-border hover:text-foreground ${focusRing}`}
      >
        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
          New
        </span>
        <span>Introducing Adhar — the open-source Internal Developer Platform</span>
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>

    {/* Value proposition */}
    <h1
      style={delay(80)}
      className={`${rise(isVisible)} mt-8 text-balance font-semibold tracking-[-0.035em] text-foreground leading-[1.08] text-[clamp(2.25rem,4.4vw,3.5rem)]`}
    >
      Eliminate the trade-off between{' '}
      <span className="hero-gradient-text sm:whitespace-nowrap">developer freedom</span> and{' '}
      <span className="hero-gradient-text sm:whitespace-nowrap">organisational governance</span>.
    </h1>

    <p
      style={delay(160)}
      className={`${rise(isVisible)} mx-auto mt-6 max-w-2xl text-pretty text-base sm:text-lg leading-relaxed text-muted-foreground`}
    >
      <span className="text-foreground">100+ curated open-source packages</span>, wired together and secure by default.
      Run <code className="font-mono text-[0.95em] text-foreground">adhar up</code> and, in about ten minutes, the
      whole platform is live on your laptop. The same command works on any supported cloud.
    </p>
  </div>
);

const stats = [
  { value: '100+', label: 'Curated packages' },
  { value: '~10 min', label: 'To a platform on your laptop' },
  { value: '1', label: 'Command to bring it all up' },
  { value: 'Apache 2.0', label: 'Open source, every feature' },
];

/** The four headline facts, in a clean divided row. */
export const HeroStats = ({ isVisible }: HeroTitleProps) => (
  <dl
    style={delay(320)}
    className={`${rise(isVisible)} mx-auto grid max-w-3xl grid-cols-2 gap-y-6 md:grid-cols-4 md:divide-x md:divide-border/70`}
  >
    {stats.map((stat) => (
      <div key={stat.label} className="px-4">
        <dt className="sr-only">{stat.label}</dt>
        <dd className="text-2xl sm:text-[1.75rem] font-semibold tracking-tight text-foreground tabular">{stat.value}</dd>
        <dd className="mt-1 text-xs text-muted-foreground">{stat.label}</dd>
      </div>
    ))}
  </dl>
);

export default HeroTitle;
