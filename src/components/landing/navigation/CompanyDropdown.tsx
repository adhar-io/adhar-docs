import { Link } from "@tanstack/react-router";
import {
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuItem,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Building2,
  Users,
  MessageCircle,
  Tag,
  Briefcase,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface Item {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const items: Item[] = [
  { to: "/about", icon: Building2, title: "About us", description: "Our story and mission to build the future of development." },
  { to: "/contributors", icon: Users, title: "Contributors", description: "The people building ADHAR together." },
  { to: "/careers", icon: Briefcase, title: "Careers", description: "Open roles and what it's like to work here." },
  { to: "/contact", icon: MessageCircle, title: "Contact", description: "Get in touch with our team for support or inquiries." },
  { to: "/pricing", icon: Tag, title: "Pricing", description: "Choose the plan that fits your development needs." },
];

const CompanyDropdown = () => {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="h-9 rounded-full bg-transparent px-3.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground transition-colors">
        Company
      </NavigationMenuTrigger>
      <NavigationMenuContent className="right-0">
        <div className="w-[420px] p-3 bg-card/95 backdrop-blur-xl border border-border/70 shadow-[var(--shadow-lg)] rounded-2xl">
          <div className="px-3 pt-2 pb-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Company</div>
          </div>

          <ul className="grid gap-1">
            {items.map((item) => {
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
                      <ArrowRight className="mt-2 h-3.5 w-3.5 text-muted-foreground/0 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5" />
                    </Link>
                  </NavigationMenuLink>
                </li>
              );
            })}
          </ul>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export default CompanyDropdown;
