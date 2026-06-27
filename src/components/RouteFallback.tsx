/**
 * Minimal, unobtrusive fallback shown while a lazily-loaded route chunk loads.
 * Sized to fill the viewport so layout doesn't jump when the page mounts.
 */
const RouteFallback = () => (
  <div
    className="min-h-screen flex items-center justify-center bg-background"
    role="status"
    aria-label="Loading page"
  >
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-2 border-muted/70" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/40 animate-spin [animation-duration:0.9s]" />
    </div>
    <span className="sr-only">Loading…</span>
  </div>
);

export default RouteFallback;
