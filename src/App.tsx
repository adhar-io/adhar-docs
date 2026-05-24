import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from 'react';
import LoadingScreen from './components/LoadingScreen';
import RouteTransition from './components/RouteTransition';
import { AuthProvider } from './hooks/useAuth';
import RequireAuth from './components/blog/RequireAuth';
import Index from './pages/Index';
import Documentation from './pages/Documentation';
import About from './pages/About';
import Careers from './pages/Careers';
import Contributors from './pages/Contributors';
import Contact from './pages/Contact';
import Integrations from './pages/Integrations';
import Capabilities from './pages/Capabilities';
import Architecture from './pages/Architecture';
import Security from './pages/Security';
import Examples from './pages/Examples';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import BlogAdmin from './pages/BlogAdmin';
import BlogCompose from './pages/BlogCompose';
import BlogAuth from './pages/BlogAuth';
import ApiReference from './pages/ApiReference';
import NotFound from './pages/NotFound';
import ArchitectureShowcase from './pages/ArchitectureShowcase';
import Pricing from './pages/Pricing';
import Support from './pages/Support';
import Partners from './pages/Partners';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Compliance from './pages/Compliance';
import AdharKit from './pages/AdharKit';

const queryClient = new QueryClient();


function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Router>
          <AuthProvider>
            <RouteTransition>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/docs/api-reference" element={<ApiReference />} />
                <Route path="/docs" element={<Documentation />} />
                <Route path="/docs/*" element={<Documentation />} />
                <Route path="/about" element={<About />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/contributors" element={<Contributors />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/capabilities" element={<Capabilities />} />
                <Route path="/architecture" element={<Architecture />} />
                <Route path="/architecture-showcase" element={<ArchitectureShowcase />} />
                <Route path="/security" element={<Security />} />
                <Route path="/examples" element={<Examples />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/auth" element={<BlogAuth />} />
                <Route path="/blog/admin" element={<RequireAuth><BlogAdmin /></RequireAuth>} />
                <Route path="/blog/compose" element={<RequireAuth><BlogCompose /></RequireAuth>} />
                <Route path="/blog/compose/:id" element={<RequireAuth><BlogCompose /></RequireAuth>} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/support" element={<Support />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/adhar-kit" element={<AdharKit />} />
                <Route path="/adhar-kit/*" element={<AdharKit />} />

                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RouteTransition>
            <Toaster />
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
