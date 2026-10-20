/**
 * Shared class strings for the landing page, so every button and link
 * gets the same size, shape and keyboard focus ring.
 */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const button =
  "group inline-flex items-center justify-center gap-2 rounded-full h-11 px-6 text-[15px] font-medium";

export const btnPrimary = `btn-primary-modern ${button} ${focusRing}`;
export const btnSecondary = `btn-secondary-modern ${button} ${focusRing}`;

/** Inline text link with an arrow, e.g. "How the 6 D's work in practice →". */
export const textLink = `group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline ${focusRing}`;

/** Fade-and-rise entrance used by the hero; pair with `delay()` to stagger. */
export const rise = (visible: boolean) =>
  `transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`;
export const delay = (ms: number) => ({ transitionDelay: `${ms}ms` });
