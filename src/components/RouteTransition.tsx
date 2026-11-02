import { ReactNode, useRef } from 'react';
import { useLocation } from "@tanstack/react-router";
import { useAutoReveal } from "@/hooks/useAutoReveal";

interface RouteTransitionProps {
  children: ReactNode;
}

/**
 * Plays a subtle fade+rise whenever the route (pathname) changes. Keying the
 * wrapper on pathname remounts the subtree so the CSS animation retriggers.
 * Hash-only changes (in-page anchors) don't retrigger it. Sections below then
 * reveal as they scroll into view (see useAutoReveal).
 */
const RouteTransition = ({ children }: RouteTransitionProps) => {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  useAutoReveal(ref, pathname);

  return (
    <div ref={ref} key={pathname} id="main-content" tabIndex={-1} className="route-fade-in outline-none">
      {children}
    </div>
  );
};

export default RouteTransition;
