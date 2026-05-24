import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Quote, TrendingUp, Clock, Zap } from 'lucide-react';
import { testimonials } from '@/data/landingPageData';

const TestimonialsCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setActiveIndex(index);
    setIsAutoPlaying(false);
  };

  const currentTestimonial = testimonials[activeIndex];

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
          <Quote className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Customer Success Stories</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Trusted by Industry Leaders
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          See how teams are saving time and boosting productivity with ADHAR
        </p>
      </div>

      {/* Main Carousel Card */}
      <div className="relative group">
        {/* Animated background glow */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur"></div>
        
        <div className="relative bg-card/80 backdrop-blur-xl border border-primary/20 rounded-2xl p-8 md:p-12 shadow-2xl overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent/5 to-transparent rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            {/* Company Logo */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative group/logo">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl blur opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500"></div>
                <img 
                  src={currentTestimonial.logo} 
                  alt={`${currentTestimonial.company} logo`}
                  className="relative w-20 h-20 rounded-xl object-cover border-2 border-primary/20 shadow-lg"
                />
              </div>
            </div>

            {/* Quote */}
            <div className="mb-8">
              <Quote className="w-12 h-12 text-primary/20 mb-4 mx-auto" />
              <p className="text-xl md:text-2xl text-foreground leading-relaxed text-center font-light">
                "{currentTestimonial.quote}"
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
              <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-400">{currentTestimonial.metrics.timeSaved}</div>
                <div className="text-xs text-muted-foreground">Time Saved</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-400">{currentTestimonial.metrics.deployTime}</div>
                <div className="text-xs text-muted-foreground">Deploy Time</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-400">{currentTestimonial.metrics.productivity}</div>
                <div className="text-xs text-muted-foreground">Productivity</div>
              </div>
            </div>

            {/* Author */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center font-bold text-primary border border-primary/30">
                {currentTestimonial.avatar}
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg text-foreground">{currentTestimonial.author}</div>
                <div className="text-sm text-muted-foreground">{currentTestimonial.role}</div>
                <div className="text-sm font-medium text-primary">{currentTestimonial.company}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-background/80 backdrop-blur-sm border border-primary/20 rounded-full flex items-center justify-center text-foreground hover:bg-primary/10 hover:border-primary/40 transition-all duration-300 hover:scale-110 shadow-lg z-10"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-background/80 backdrop-blur-sm border border-primary/20 rounded-full flex items-center justify-center text-foreground hover:bg-primary/10 hover:border-primary/40 transition-all duration-300 hover:scale-110 shadow-lg z-10"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Dots Navigation */}
      <div className="flex justify-center gap-2 mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`relative transition-all duration-300 ${
              index === activeIndex 
                ? 'w-12 h-3' 
                : 'w-3 h-3 hover:w-4'
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
          >
            <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
              index === activeIndex 
                ? 'bg-gradient-to-r from-primary to-accent' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}></div>
          </button>
        ))}
      </div>

      {/* Company Logos Strip */}
      <div className="mt-12 pt-8 border-t border-border/50">
        <p className="text-center text-sm text-muted-foreground mb-6">
          Trusted by forward-thinking companies worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="relative group/logo-strip cursor-pointer"
              onClick={() => goToSlide(index)}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-0 group-hover/logo-strip:opacity-100 transition-opacity duration-300"></div>
              <img 
                src={testimonial.logo} 
                alt={`${testimonial.company} logo`}
                className={`relative w-12 h-12 rounded-lg object-cover grayscale hover:grayscale-0 transition-all duration-300 border ${
                  index === activeIndex 
                    ? 'border-primary/50 grayscale-0 scale-110' 
                    : 'border-border/30'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestimonialsCarousel;
