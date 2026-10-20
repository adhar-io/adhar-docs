import React from "react";

/** Static hero backdrop: a soft top glow over a faint grid. Styles in hero.css. */
const HeroBackdrop = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    <div className="hero-grid" />
    <div className="hero-glow" />
    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
  </div>
);

export default HeroBackdrop;
