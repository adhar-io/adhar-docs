
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NavigationLogo from "./navigation/NavigationLogo";
import DesktopNavigationMenu from "./navigation/DesktopNavigationMenu";
import NavigationActions from "./navigation/NavigationActions";
import MobileNavigation from "./navigation/MobileNavigation";

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
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
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
          <div className="md:hidden py-3 border-t border-border/50 bg-background">
            <div className="flex flex-col space-y-2">
              <a href="#features" onClick={closeMenu} className="text-muted-foreground hover:text-primary transition-colors font-medium px-2 py-1">Platform</a>
              <Link to="/docs" onClick={closeMenu} className="text-muted-foreground hover:text-primary transition-colors font-medium px-2 py-1">Documentation</Link>
              <a href="https://ui.adhar.io" target="_blank" rel="noopener noreferrer" onClick={closeMenu} className="text-muted-foreground hover:text-primary transition-colors font-medium px-2 py-1">Adhar UI</a>
              <Link to="/adhar-kit" onClick={closeMenu} className="text-muted-foreground hover:text-primary transition-colors font-medium px-2 py-1">Adhar Kit</Link>
              <Link to="/blog" onClick={closeMenu} className="text-muted-foreground hover:text-primary transition-colors font-medium px-2 py-1">Blog</Link>
              <a href="#capabilities" onClick={closeMenu} className="text-muted-foreground hover:text-primary transition-colors font-medium px-2 py-1">Capabilities</a>
              <Link to="/integrations" onClick={closeMenu} className="text-muted-foreground hover:text-primary transition-colors font-medium px-2 py-1">Integrations</Link>
              
              <div className="px-2 py-1">
                <div className="text-muted-foreground text-sm font-medium mb-1.5">Company</div>
                <div className="pl-4 space-y-1.5">
                  <Link to="/about" onClick={closeMenu} className="block text-muted-foreground hover:text-primary transition-colors font-medium">About</Link>
                  <Link to="/contributors" onClick={closeMenu} className="block text-muted-foreground hover:text-primary transition-colors font-medium">Contributors</Link>
                  <Link to="/contact" onClick={closeMenu} className="block text-muted-foreground hover:text-primary transition-colors font-medium">Contact</Link>
                </div>
              </div>
              
              <a href="#pricing" onClick={closeMenu} className="text-muted-foreground hover:text-primary transition-colors font-medium px-2 py-1">Pricing</a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
