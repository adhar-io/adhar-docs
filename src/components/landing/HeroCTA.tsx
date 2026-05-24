
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { ADHAR_CONSOLE_LOGIN_URL } from '@/lib/config';

interface HeroCTAProps {
  isVisible: boolean;
}

const HeroCTA = ({ isVisible }: HeroCTAProps) => {
  return (
    <div
      className={`flex flex-col sm:flex-row gap-3 justify-center items-center mb-14 sm:mb-16 transition-all duration-700 delay-700 px-4 sm:px-0 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <a href={ADHAR_CONSOLE_LOGIN_URL} className="w-full sm:w-auto">
        <button
          type="button"
          className="btn-primary-modern group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-5 h-11 text-[15px] font-medium"
        >
          <span>Get Started Free</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </a>

      <Link to="/docs" className="w-full sm:w-auto">
        <button
          type="button"
          className="btn-secondary-modern group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-5 h-11 text-[15px] font-medium"
        >
          <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span>Read the docs</span>
        </button>
      </Link>
    </div>
  );
};

export default HeroCTA;
