
import { Link } from "react-router-dom";
import { 
  NavigationMenuContent, 
  NavigationMenuLink, 
  NavigationMenuItem, 
  NavigationMenuTrigger 
} from "@/components/ui/navigation-menu";

const CompanyDropdown = () => {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="bg-transparent hover:bg-primary/10 hover:text-primary text-foreground font-medium transition-all duration-300 data-[state=open]:bg-primary/15 hover:shadow-md hover:shadow-primary/5 rounded-lg px-4 py-2">
        Company
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="grid gap-3 p-6 md:w-[450px] lg:w-[550px] lg:grid-cols-[.75fr_1fr] bg-background/98 backdrop-blur-xl border border-border/50 shadow-2xl rounded-xl animate-slide-down">
          <div className="row-span-4 opacity-0 animate-slide-down" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
            <NavigationMenuLink asChild>
              <div className="flex h-full w-full select-none flex-col justify-end rounded-xl bg-gradient-to-br from-primary/15 via-accent/15 to-primary/10 p-6 no-underline outline-none focus:shadow-md relative overflow-hidden border border-primary/20 hover:border-primary/40 transition-all duration-500 group cursor-pointer">
                <img 
                  src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=600&q=80" 
                  alt="Team collaboration and innovation" 
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-all duration-700 group-hover:scale-110 transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="mb-3 mt-4 text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                    Company
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    Learn more about ADHAR and join our mission.
                  </p>
                </div>
              </div>
            </NavigationMenuLink>
          </div>
          <div className="grid gap-2">
            <NavigationMenuLink asChild>
              <Link
                to="/about"
                className="group block select-none space-y-2 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10 border border-transparent hover:border-primary/30 hover:scale-[1.02] opacity-0 animate-slide-down"
                style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}
              >
                <div className="text-base font-semibold leading-none text-foreground group-hover:text-primary transition-colors duration-300">About Us</div>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                  Our story and mission to build the future of development.
                </p>
              </Link>
            </NavigationMenuLink>
            <NavigationMenuLink asChild>
              <Link
                to="/contributors"
                className="group block select-none space-y-2 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10 border border-transparent hover:border-primary/30 hover:scale-[1.02] opacity-0 animate-slide-down"
                style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
              >
                <div className="text-base font-semibold leading-none text-foreground group-hover:text-primary transition-colors duration-300">Contributors</div>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                  Meet the amazing people building ADHAR together.
                </p>
              </Link>
            </NavigationMenuLink>
            <NavigationMenuLink asChild>
              <Link
                to="/contact"
                className="group block select-none space-y-2 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10 border border-transparent hover:border-primary/30 hover:scale-[1.02] opacity-0 animate-slide-down"
                style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
              >
                <div className="text-base font-semibold leading-none text-foreground group-hover:text-primary transition-colors duration-300">Contact</div>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                  Get in touch with our team for support or inquiries.
                </p>
              </Link>
            </NavigationMenuLink>
            <NavigationMenuLink asChild>
              <Link
                to="/pricing"
                className="group block select-none space-y-2 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10 border border-transparent hover:border-primary/30 hover:scale-[1.02] opacity-0 animate-slide-down"
                style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
              >
                <div className="text-base font-semibold leading-none text-foreground group-hover:text-primary transition-colors duration-300">Pricing</div>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                  Choose the perfect plan for your development needs.
                </p>
              </Link>
            </NavigationMenuLink>
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export default CompanyDropdown;
