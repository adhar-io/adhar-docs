import { Link } from "@tanstack/react-router";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Boxes,
  Zap,
  Plug,
  Shield,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import CompanyDropdown from './CompanyDropdown';
import { ADHAR_CONSOLE_LOGIN_URL, ADHAR_UI_URL } from '@/lib/config';

interface PlatformItem {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const platformItems: PlatformItem[] = [
  {
    to: "/architecture",
    icon: Boxes,
    title: "Architecture",
    description: "Layered, cloud-native architecture with request flow and specs.",
  },
  {
    to: "/capabilities",
    icon: Zap,
    title: "Capabilities",
    description: "AI-powered automation, deployment, observability, and collaboration.",
  },
  {
    to: "/integrations",
    icon: Plug,
    title: "Integrations",
    description: "Kubernetes, GitOps, observability — pre-configured and hardened.",
  },
  {
    to: "/security",
    icon: Shield,
    title: "Security",
    description: "Zero trust, defense in depth, and audit-grade compliance.",
  },
];

const linkClasses = "group inline-flex h-9 w-max items-center justify-center rounded-full bg-transparent px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground focus:outline-none";

const DesktopNavigationMenu = () => {
  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList className="space-x-0.5">
        <NavigationMenuItem>
          <NavigationMenuTrigger className="h-9 rounded-full bg-transparent px-3.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground transition-colors">
            Platform
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[640px] p-3 bg-card/95 backdrop-blur-xl border border-border/70 shadow-[var(--shadow-lg)] rounded-2xl">
              {/* Header strip */}
              <div className="flex items-center justify-between px-3 pt-2 pb-3">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Explore the platform
                </div>
                <Link
                  to="/architecture"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Overview
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Grid */}
              <ul className="grid grid-cols-2 gap-1">
                {platformItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavigationMenuLink asChild>
                        <Link
                          to={item.to}
                          className="group flex items-start gap-3 rounded-xl p-3 outline-none transition-colors hover:bg-muted/60 focus:bg-muted/60"
                        >
                          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground transition-colors group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/5">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                              {item.title}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  );
                })}
              </ul>

              {/* Footer CTA */}
              <div className="mt-2 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground tracking-tight">Ship platforms in minutes</div>
                  <div className="text-[11px] text-muted-foreground">Free to start · open source · no lock-in</div>
                </div>
                <a
                  href={ADHAR_CONSOLE_LOGIN_URL}
                  className="btn-primary-modern shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 h-8 text-xs font-medium"
                >
                  Get started
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <Link to="/docs">
            <NavigationMenuLink className={linkClasses}>Documentation</NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <a href={ADHAR_UI_URL} target="_blank" rel="noopener noreferrer">
            <NavigationMenuLink className={linkClasses}>Adhar UI</NavigationMenuLink>
          </a>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <Link to="/adhar-kit">
            <NavigationMenuLink className={linkClasses}>Adhar Kit</NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <Link to="/blog">
            <NavigationMenuLink className={linkClasses}>Blog</NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        <CompanyDropdown />
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default DesktopNavigationMenu;
