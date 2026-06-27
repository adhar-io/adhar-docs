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

  const metrics = [
    { icon: TrendingUp, value: currentTestimonial.metrics.timeSaved, label: "Time saved" },
    { icon: Clock, value: currentTestimonial.metrics.deployTime, label: "Deploy time" },
    { icon: Zap, value: currentTestimonial.metrics.productivity, label: "Productivity" },
  ];

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="eyebrow mb-5"><Quote className="w-3 h-3 mr-1" />Customer stories</span>
        <h2 className="section-heading mt-5 text-foreground">
          Trusted by
          <br className="hidden sm:block" />
          <span className="text-muted-foreground">industry leaders.</span>
        </h2>
        <p className="section-subheading mt-5">
          See how teams are saving time and boosting productivity with ADHAR.
        </p>
      </div>

      {/* Main card */}
      <div className="relative">
        <div className="relative rounded-3xl border border-border/70 bg-card shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-6 py-12 sm:px-12 sm:py-14">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img
                src={currentTestimonial.logo}
                loading="lazy"
                decoding="async"
                alt={`${currentTestimonial.company} logo`}
                className="w-16 h-16 rounded-2xl object-cover border border-border/70 shadow-[var(--shadow-xs)]"
              />
            </div>

            {/* Quote */}
            <div className="mb-10 text-center">
              <Quote className="w-8 h-8 text-muted-foreground/40 mb-4 mx-auto" />
              <blockquote className="text-xl sm:text-2xl text-foreground leading-relaxed font-medium tracking-tight max-w-3xl mx-auto text-balance">
                "{currentTestimonial.quote}"
              </blockquote>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50 max-w-2xl mx-auto">
              {metrics.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="bg-card text-center px-3 py-5">
                    <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-2" strokeWidth={2} />
                    <div className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight tabular">{m.value}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{m.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Author */}
            <div className="mt-10 flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center font-medium text-sm border border-border/70">
                {currentTestimonial.avatar}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-foreground tracking-tight">{currentTestimonial.author}</div>
                <div className="text-xs text-muted-foreground">
                  {currentTestimonial.role} · <span className="text-foreground/80">{currentTestimonial.company}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nav arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-3 sm:-left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-[var(--shadow-xs)]"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-4 h-4 mx-auto" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-3 sm:-right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-[var(--shadow-xs)]"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-4 h-4 mx-auto" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === activeIndex ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-muted-foreground/40'
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>

      {/* Logo strip */}
      <div className="mt-14 pt-10 border-t border-border/60">
        <p className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground mb-6">
          Trusted by forward-thinking companies
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {testimonials.map((testimonial, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={`p-1 rounded-lg transition-all ${
                index === activeIndex ? 'opacity-100' : 'opacity-50 hover:opacity-100'
              }`}
              aria-label={`Show ${testimonial.company}`}
            >
              <img
                src={testimonial.logo}
                loading="lazy"
                decoding="async"
                alt={`${testimonial.company} logo`}
                className={`w-10 h-10 rounded-lg object-cover border transition-all ${
                  index === activeIndex
                    ? 'border-primary/40'
                    : 'border-border/60 grayscale hover:grayscale-0'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestimonialsCarousel;
