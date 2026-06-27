import { useEffect } from 'react';
import { useLocation } from "@tanstack/react-router";

/**
 * Resets scroll position on navigation. When the URL has a hash, it scrolls to
 * that element instead (so in-page anchor links keep working). Renders nothing.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Defer so the target element exists after the route renders.
      const id = hash.replace('#', '');
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
