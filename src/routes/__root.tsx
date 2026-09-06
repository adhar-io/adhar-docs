import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import RouteTransition from "@/components/RouteTransition";
import LoadingScreen from "@/components/LoadingScreen";
import NotFound from "@/pages/NotFound";
import appCss from "@/index.css?url";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "ADHAR - The Open Foundation for Cloud-Native Development" },
      {
        name: "description",
        content:
          "ADHAR streamlines cloud-native application development with integrated Define, Design, Develop, Deliver, Discover, and Decide workflows.",
      },
      { name: "author", content: "ADHAR Platform" },
      { property: "og:title", content: "ADHAR - The Open Foundation" },
      {
        property: "og:description",
        content:
          "Streamline cloud-native application development with the best open-source tools integrated into one platform.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/blog-social-banner.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@adhar_platform" },
      { name: "twitter:image", content: "/blog-social-banner.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&family=Sora:wght@200;300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppShell />
    </RootDocument>
  );
}

/** Hosts the global providers and the branded intro splash, wrapping the route Outlet. */
function AppShell() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Branded intro splash on first load.
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          {isLoading ? (
            <LoadingScreen />
          ) : (
            <>
              <a href="#main-content" className="skip-to-content">
                Skip to content
              </a>
              <RouteTransition>
                <Outlet />
              </RouteTransition>
              <Toaster />
              <SonnerToaster />
            </>
          )}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  // next-themes stamps the theme class on <html> before hydration, so the server
  // and client markup intentionally differ there — suppressHydrationWarning silences it.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
