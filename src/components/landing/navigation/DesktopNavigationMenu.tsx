
import { Link } from 'react-router-dom';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import CompanyDropdown from './CompanyDropdown';

const DesktopNavigationMenu = () => {
  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList className="space-x-1">
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent hover:bg-primary/10 hover:text-primary text-foreground font-medium transition-all duration-300 data-[state=open]:bg-primary/15 hover:shadow-md hover:shadow-primary/5 rounded-lg px-4 py-2">
            Platform
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-3 p-6 md:w-[450px] lg:w-[550px] lg:grid-cols-[.75fr_1fr] bg-background/98 backdrop-blur-xl border border-border/50 shadow-2xl rounded-xl animate-slide-down">
              <div className="row-span-4 opacity-0 animate-slide-down" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
                <NavigationMenuLink asChild>
                  <div className="flex h-full w-full select-none flex-col justify-end rounded-xl bg-gradient-to-br from-primary/15 via-accent/15 to-primary/10 p-6 no-underline outline-none focus:shadow-md relative overflow-hidden border border-primary/20 hover:border-primary/40 transition-all duration-500 group cursor-pointer">
                    <img 
                      src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80" 
                      alt="Modern cloud architecture and global connectivity" 
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-all duration-700 group-hover:scale-110 transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <div className="mb-3 mt-4 text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                        Platform
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                        Enterprise-grade development platform with AI-powered automation.
                      </p>
                    </div>
                  </div>
                </NavigationMenuLink>
              </div>
              <div className="grid gap-2">
                <NavigationMenuLink asChild>
                  <Link
                    to="/architecture"
                    className="group block select-none space-y-2 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10 border border-transparent hover:border-primary/30 hover:scale-[1.02] opacity-0 animate-slide-down"
                    style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}
                  >
                    <div className="text-base font-semibold leading-none text-foreground group-hover:text-primary transition-colors duration-300">Architecture</div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                      Scalable platform architecture with integrated AI and cloud-native design.
                    </p>
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    to="/capabilities"
                    className="group block select-none space-y-2 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10 border border-transparent hover:border-primary/30 hover:scale-[1.02] opacity-0 animate-slide-down"
                    style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
                  >
                    <div className="text-base font-semibold leading-none text-foreground group-hover:text-primary transition-colors duration-300">Capabilities</div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                      AI-powered development tools with automation and intelligent workflows.
                    </p>
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    to="/integrations"
                    className="group block select-none space-y-2 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10 border border-transparent hover:border-primary/30 hover:scale-[1.02] opacity-0 animate-slide-down"
                    style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
                  >
                    <div className="text-base font-semibold leading-none text-foreground group-hover:text-primary transition-colors duration-300">Integrations</div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                      Connect with popular tools including GitHub, AWS, Docker, and Kubernetes.
                    </p>
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    to="/security"
                    className="group block select-none space-y-2 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10 border border-transparent hover:border-primary/30 hover:scale-[1.02] opacity-0 animate-slide-down"
                    style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
                  >
                    <div className="text-base font-semibold leading-none text-foreground group-hover:text-primary transition-colors duration-300">Security</div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                      Enterprise security standards with comprehensive compliance features.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <Link to="/docs">
            <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:shadow-md hover:shadow-primary/5 focus:bg-primary/15 focus:text-primary focus:outline-none">
              Documentation
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <a href="https://ui.adhar.io" target="_blank" rel="noopener noreferrer">
            <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:shadow-md hover:shadow-primary/5 focus:bg-primary/15 focus:text-primary focus:outline-none">
              Adhar UI
            </NavigationMenuLink>
          </a>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <Link to="/adhar-kit">
            <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:shadow-md hover:shadow-primary/5 focus:bg-primary/15 focus:text-primary focus:outline-none">
              Adhar Kit
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <Link to="/blog">
            <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:shadow-md hover:shadow-primary/5 focus:bg-primary/15 focus:text-primary focus:outline-none">
              Blog
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        <CompanyDropdown />
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default DesktopNavigationMenu;
