
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, GitBranch } from "lucide-react";
import { Link } from "@tanstack/react-router";
import Logo from "@/components/ui/Logo";

const Footer = () => {
  const footerSections = [
    {
      title: "Platform",
      links: [
        { label: "Features", href: "#features" },
        { label: "Capabilities", href: "#capabilities", to: "/capabilities" },
        { label: "Integrations", to: "/integrations" },
        { label: "Pricing", to: "/pricing" },
        { label: "Security", to: "/security" }
      ]
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", to: "/docs" },
        { label: "API Reference", to: "/docs/api-reference" },
        { label: "Examples", to: "/examples" },
        { label: "Blog", to: "/blog" },
        { label: "Support", to: "/support" }
      ]
    },
    {
      title: "Company",
      links: [
        { label: "About Us", to: "/about" },
        { label: "Careers", to: "/careers" },
        { label: "Contributors", to: "/contributors" },
        { label: "Contact", to: "/contact" },
        { label: "Partners", to: "/partners" }
      ]
    }
  ];

  const legalLinks = [
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
    { label: "Security", to: "/security" },
    { label: "Compliance", to: "/compliance" }
  ];

  return (
    <footer className="bg-gray-950 dark:bg-gray-950 text-foreground border-t border-border">
      <div className="section-padding">
        <div className="max-width-content container-padding">
          <div className="grid md:grid-cols-5 gap-12 mb-16">
            {/* Company info section */}
            <div className="md:col-span-2">
              <div className="mb-8">
                <Logo size="lg" showTagline={false} linkTo="/" />
              </div>
              
              <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
                Empowering enterprises to build, deploy, and scale cloud-native applications 
                with confidence. Built on Kubernetes, designed for the future.
              </p>
              
              <div className="flex space-x-4">
                <a href="https://github.com/adhar-io/adhar" target="_blank" rel="noopener noreferrer">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-lg transition-all duration-300"
                    aria-label="GitHub"
                  >
                    <GitBranch className="w-5 h-5" />
                  </Button>
                </a>
                <a href="https://github.com/adhar-io/adhar" target="_blank" rel="noopener noreferrer">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-lg transition-all duration-300"
                    aria-label="External Links"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </Button>
                </a>
              </div>
            </div>
            
            {/* Navigation sections */}
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="font-bold mb-6 text-lg text-foreground">{section.title}</h3>
                <ul className="space-y-4">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {link.to ? (
                        <Link 
                          to={link.to} 
                          className="text-muted-foreground hover:text-foreground transition-colors duration-300 hover:underline underline-offset-4"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a 
                          href={link.href} 
                          className="text-muted-foreground hover:text-foreground transition-colors duration-300 hover:underline underline-offset-4"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <Separator className="my-12 bg-border" />
          
          {/* Bottom section with improved layout */}
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            <p className="text-muted-foreground text-center lg:text-left">
              &copy; 2026 Anvita Systems Pvt Ltd. All rights reserved.
            </p>
            
            <div className="flex flex-wrap justify-center lg:justify-end gap-6">
              {legalLinks.map((link) => (
                <Link 
                  key={link.label}
                  to={link.to} 
                  className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm hover:underline underline-offset-4"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
