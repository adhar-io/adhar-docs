
import React from 'react';
import { Link } from "@tanstack/react-router";
import { BookOpen, ArrowRight } from 'lucide-react';
import { btnPrimary, btnSecondary, delay, rise } from './styles';

interface HeroCTAProps {
  isVisible: boolean;
}

const HeroCTA = ({ isVisible }: HeroCTAProps) => {
  return (
    <div
      style={delay(240)}
      className={`${rise(isVisible)} mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center px-4 sm:px-0`}
    >
      <Link
        to="/docs/$" params={{ _splat: "getting-started/quick-start" }}
        className={`${btnPrimary} hero-cta w-full sm:w-auto`}
      >
        <span>Get started free</span>
        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
      </Link>

      <Link
        to="/docs"
        className={`${btnSecondary} w-full sm:w-auto`}
      >
        <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden />
        <span>Read the docs</span>
      </Link>
    </div>
  );
};

export default HeroCTA;
