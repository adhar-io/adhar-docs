import { useLayoutEffect, type RefObject } from "react";

/** Routes that are read rather than browsed get no entrance motion. */
const SKIP_ROUTES = [/^\/docs(\/|$)/, /^\/adhar-kit(\/|$)/, /^\/blog\/.+/];

/** Siblings past this index share the last delay step, so long lists never lag. */
const MAX_STAGGER = 6;
const STEP_MS = 70;
const DURATION_MS = 700;

function isDecoration(el: Element): boolean {
  const cs = getComputedStyle(el);
  return cs.position === "absolute" || cs.position === "fixed" || cs.display === "none";
}

/** Descend through single-child wrappers (container → max-width → …) to the content. */
function contentRoot(section: Element): Element {
  let root = section;
  for (let depth = 0; depth < 3; depth++) {
    const kids = [...root.children].filter((c) => !isDecoration(c));
    if (kids.length !== 1 || kids[0].tagName !== "DIV") break;
    root = kids[0];
  }
  return root;
}

/**
 * A grid or wrapping row of cards reveals card by card. One that paints its own
 * background (a gap-px grid whose gaps are the dividers) reveals as a whole,
 * or the bare background would show while its cards are hidden.
 */
function isCardGroup(el: Element): boolean {
  const cs = getComputedStyle(el);
  const laidOut = cs.display.includes("grid") || (cs.display.includes("flex") && cs.flexWrap === "wrap");
  const painted = !/rgba\(.*,\s*0\)|transparent/.test(cs.backgroundColor);
  return laidOut && !painted && el.children.length >= 2;
}

function canReveal(el: Element): boolean {
  if (isDecoration(el) || el.closest(".reveal, [data-no-reveal]")) return false;
  // An element that animates itself (a float, a spin) keeps its own motion.
  return getComputedStyle(el).animationName === "none";
}

/**
 * Staggered scroll reveals for every section of a marketing page, with no
 * per-page markup. Each section's content blocks, and the cards inside a card
 * grid, rise into place as they enter the viewport.
 *
 * Elements are marked with data attributes, which React leaves alone, and
 * unmarked once revealed so their own transitions and opacity apply again.
 * Sections mounted later (lazy landing sections) are picked up as they appear.
 * Reduced motion turns the whole thing off.
 */
export function useAutoReveal(ref: RefObject<HTMLElement | null>, pathname: string) {
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host || typeof IntersectionObserver === "undefined") return;
    if (SKIP_ROUTES.some((r) => r.test(pathname))) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers = new Set<number>();
    const seen = new WeakSet<Element>();
    const onEnter = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        observer.unobserve(el);
        el.dataset.reveal = "in";
        const i = Number(el.dataset.revealI ?? 0);
        const t = window.setTimeout(() => {
          el.removeAttribute("data-reveal");
          el.removeAttribute("data-reveal-i");
          timers.delete(t);
        }, DURATION_MS + i * STEP_MS + 100);
        timers.add(t);
      }
    };
    const io = new IntersectionObserver(onEnter, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    // 12% of a block several screens tall is more than a screen: it would sit
    // blank while in view, or never reveal on a short phone. Tall blocks reveal
    // as soon as their top clears the bottom edge instead.
    const tallIo = new IntersectionObserver(onEnter, { threshold: 0, rootMargin: "0px 0px -12% 0px" });

    const mark = (el: Element, i: number) => {
      if (!canReveal(el)) return;
      el.setAttribute("data-reveal", "");
      el.setAttribute("data-reveal-i", String(Math.min(i, MAX_STAGGER)));
      (el.getBoundingClientRect().height > window.innerHeight * 0.8 ? tallIo : io).observe(el);
    };

    // A block taller than the screen that is only a wrapper reveals child by
    // child, so its first part is not held back by the rest.
    const markBlock = (block: Element, i: number, depth = 0) => {
      if (isCardGroup(block)) {
        [...block.children].forEach((card, j) => mark(card, j));
        return;
      }
      const kids = [...block.children].filter((c) => !isDecoration(c));
      if (depth < 2 && kids.length > 1 && block.getBoundingClientRect().height > window.innerHeight) {
        kids.forEach((kid, j) => markBlock(kid, j, depth + 1));
        return;
      }
      mark(block, i);
    };

    const scan = () => {
      for (const section of host.querySelectorAll("main section")) {
        if (seen.has(section) || section.closest("[data-reveal]")) continue;
        seen.add(section);
        const blocks = [...contentRoot(section).children].filter((c) => !isDecoration(c));
        blocks.forEach((block, i) => markBlock(block, i));
      }
    };

    scan();
    // Lazy sections mount after the route does; catch them as they arrive.
    const mo = new MutationObserver((records) => {
      const added = records.some((r) =>
        [...r.addedNodes].some((n) => n instanceof Element && (n.matches("section") || n.querySelector("section"))),
      );
      if (added) scan();
    });
    mo.observe(host, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      tallIo.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [ref, pathname]);
}
