import { Moon, Sun } from "lucide-react";
import { Github } from "@/components/brand-icons";
import { focusRing } from "../styles";

interface NavigationActionsProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const NavigationActions = ({ isDarkMode, toggleDarkMode }: NavigationActionsProps) => {
  return (
    <div className="hidden md:flex items-center gap-2">
      <button
        type="button"
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
      >
        {isDarkMode ? <Sun className="w-[18px] h-[18px]" aria-hidden /> : <Moon className="w-[18px] h-[18px]" aria-hidden />}
      </button>


      <a
        href="https://github.com/adhar-io/adhar"
        target="_blank"
        rel="noopener noreferrer"
        className={`ml-2 inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/25 transition-all duration-300 hover:shadow-lg hover:shadow-primary/40 hover:brightness-110 ${focusRing}`}
      >
        <Github className="w-4 h-4" />
        GitHub
      </a>
    </div>
  );
};

export default NavigationActions;

