import React, { useState, useEffect } from "react";
import HeroContent from "./HeroContent";
import HeroBackdrop from "./HeroBackdrop";
import "./hero.css";

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative pt-16 pb-16 container-padding bg-background overflow-hidden w-full">
      <HeroBackdrop />

      <div className="max-width-content relative z-10 pt-16 sm:pt-24 lg:pt-28 pb-8 w-full">
        <HeroContent isVisible={isVisible} />
      </div>
    </section>
  );
};

export default HeroSection;
