import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    // Jump straight to the top (or the restored position) on navigation;
    // html's `scroll-behavior: smooth` would otherwise animate through the
    // new page. In-page #anchor links still scroll smoothly.
    scrollRestorationBehavior: "instant",
    defaultPreload: "intent",
  });
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
