import { ReactNode } from 'react';
import { useLocation } from "@tanstack/react-router";

interface RouteTransitionProps {
  children: ReactNode;
}

/**
 * Plays a subtle fade+rise whenever the route (pathname) changes. Keying the
 * wrapper on pathname remounts the subtree so the CSS animation retriggers.
 * Hash-only changes (in-page anchors) don't retrigger it.
 */
const RouteTransition = ({ children }: RouteTransitionProps) => {
  const { pathname } = useLocation();

  return (
    <div key={pathname} id="main-content" tabIndex={-1} className="route-fade-in outline-none">
      {children}
    </div>
  );
};

export default RouteTransition;
