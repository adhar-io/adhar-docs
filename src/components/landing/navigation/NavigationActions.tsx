import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { Github } from "@/components/brand-icons";
import { ADHAR_CONSOLE_LOGIN_URL } from "@/lib/config";

interface NavigationActionsProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const NavigationActions = ({ isDarkMode, toggleDarkMode }: NavigationActionsProps) => {
  return (
    <div className="hidden md:flex items-center space-x-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="text-muted-foreground hover:text-primary hover:bg-accent/50 p-2 rounded-lg transition-all duration-300"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </Button>

      <a href={ADHAR_CONSOLE_LOGIN_URL}>
        <Button variant="ghost" className="text-foreground hover:text-primary hover:bg-accent/50 font-medium rounded-lg transition-all duration-300">
          Sign In
        </Button>
      </a>

      <a href="https://github.com/adhar-io/adhar" target="_blank" rel="noopener noreferrer">
        <Button className="bg-gradient-to-r from-primary via-primary/90 to-accent hover:from-primary/90 hover:via-accent hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105 rounded-lg font-semibold">
          <Github className="w-4 h-4 mr-2" />
          GitHub
        </Button>
      </a>
    </div>
  );
};

export default NavigationActions;

