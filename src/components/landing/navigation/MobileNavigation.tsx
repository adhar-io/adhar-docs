
import { Button } from "@/components/ui/button";
import { Menu, X, Moon, Sun, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface MobileNavigationProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  closeMenu: () => void;
}

const MobileNavigation = ({ 
  mobileMenuOpen, 
  setMobileMenuOpen, 
  isDarkMode, 
  toggleDarkMode, 
  closeMenu 
}: MobileNavigationProps) => {
  return (
    <div className="md:hidden flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="h-9 w-9 p-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
        aria-expanded={mobileMenuOpen}
        className="h-9 w-9 p-0 rounded-full bg-muted/70 text-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>
    </div>
  );
};

export default MobileNavigation;
