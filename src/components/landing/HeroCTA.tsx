
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Play, BookOpen, Sparkles, ArrowRight } from 'lucide-react';

interface HeroCTAProps {
  isVisible: boolean;
}

const HeroCTA = ({ isVisible }: HeroCTAProps) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 sm:mb-20 transition-all duration-1000 delay-700 px-4 sm:px-0 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
      <Link to="/coming-soon">       
        <Button 
          size="lg" 
          className="group relative bg-primary hover:bg-primary/90 px-8 py-6 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 w-full sm:w-auto text-primary-foreground border-0 rounded-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </Button>
      </Link>

      <Link to="/docs"> 
        <Button 
          variant="outline" 
          size="lg" 
          className="group px-8 py-6 text-base font-semibold text-foreground border border-border hover:text-foreground hover:border-foreground/20 hover:bg-muted transition-all duration-300 hover:-translate-y-0.5 w-full sm:w-auto rounded-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Read the Docs</span>
          </div>
        </Button>
      </Link>
    </div>
  );
};

export default HeroCTA;
