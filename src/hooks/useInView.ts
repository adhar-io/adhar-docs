import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Fraction of the element that must be visible to trigger. */
  threshold?: number;
  /** Margin around the root, e.g. "0px 0px -10% 0px" to trigger slightly early. */
  rootMargin?: string;
  /** Keep observing and toggle off when the element leaves the viewport. */
  once?: boolean;
}

/**
 * Observes an element and reports whether it has entered the viewport.
 * Defaults to firing once (good for scroll-reveal animations).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -8% 0px',
  once = true,
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  // Show immediately when we can't (or shouldn't) animate, so content is never
  // stuck hidden. Computed lazily to avoid a synchronous setState in the effect.
  const [inView, setInView] = useState(() => {
    if (typeof IntersectionObserver === 'undefined') return true;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || inView || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once, inView]);

  return { ref, inView };
}
