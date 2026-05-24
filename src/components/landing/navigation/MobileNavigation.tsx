
import { Button } from "@/components/ui/button";
import { Menu, X, Moon, Sun, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

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
        className="text-foreground hover:text-primary hover:bg-accent/50 p-2 rounded-lg transition-all duration-300"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
        className="bg-gradient-to-r from-muted/80 to-muted hover:from-muted hover:to-muted/80 border-0 text-foreground"
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>
    </div>
  );
};

export default MobileNavigation;
