
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";
import NavigationLogo from "./navigation/NavigationLogo";
import DesktopNavigationMenu from "./navigation/DesktopNavigationMenu";
import NavigationActions from "./navigation/NavigationActions";
import MobileNavigation from "./navigation/MobileNavigation";
import { Github } from "@/components/brand-icons";
import { ADHAR_CONSOLE_LOGIN_URL, ADHAR_UI_URL } from "@/lib/config";

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             localStorage.getItem('theme') === 'dark' ||
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const closeMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl backdrop-saturate-150 border-b border-border/60 supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <NavigationLogo />
          <DesktopNavigationMenu />
          <NavigationActions isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
          <MobileNavigation 
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            closeMenu={closeMenu}
          />
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 border-t border-border/60 bg-background max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain">
            <nav className="flex flex-col">
              {[
                { to: "/docs", label: "Documentation" },
                { to: "/architecture", label: "Architecture" },
                { to: "/capabilities", label: "Capabilities" },
                { to: "/integrations", label: "Integrations" },
                { to: "/security", label: "Security" },
                { to: "/adhar-kit", label: "Adhar Kit" },
                { to: "/blog", label: "Blog" },
                { to: "/pricing", label: "Pricing" },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeMenu}
                  className="text-foreground hover:text-primary hover:bg-muted/60 rounded-lg px-3 min-h-11 flex items-center text-sm font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={ADHAR_UI_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="text-foreground hover:text-primary hover:bg-muted/60 rounded-lg px-3 min-h-11 flex items-center text-sm font-medium transition-colors"
              >
                Adhar UI
              </a>

              <div className="mt-3 pt-3 border-t border-border/60">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground px-3 mb-1">
                  Company
                </div>
                {[
                  { to: "/about", label: "About" },
                  { to: "/contributors", label: "Contributors" },
                  { to: "/careers", label: "Careers" },
                  { to: "/contact", label: "Contact" },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMenu}
                    className="text-foreground hover:text-primary hover:bg-muted/60 rounded-lg px-3 min-h-11 flex items-center text-sm font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Auth + GitHub CTAs */}
              <div className="mt-4 pt-4 border-t border-border/60 flex flex-col gap-2">
                <a
                  href={ADHAR_CONSOLE_LOGIN_URL}
                  onClick={closeMenu}
                  className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full h-11 text-sm font-medium"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in
                </a>
                <a
                  href="https://github.com/adhar-io/adhar"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="btn-primary-modern inline-flex items-center justify-center gap-2 rounded-full h-11 text-sm font-medium"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
