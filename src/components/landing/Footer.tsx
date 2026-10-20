
import { Separator } from "@/components/ui/separator";
import { Github } from "@/components/brand-icons";
import { Link } from "@tanstack/react-router";
import Logo from "@/components/ui/Logo";
import { focusRing } from "./styles";

const linkClass = `rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-300 hover:underline underline-offset-4 ${focusRing}`;

const Footer = () => {
  const footerSections = [
    {
      title: "Platform",
      links: [
        { label: "The 6 D's", href: "/#features" },
        { label: "Capabilities", to: "/capabilities" },
        { label: "Adhar AI", href: "/#adhar-ai" },
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
    <footer className="dark bg-gray-950 text-foreground border-t border-border">
      <div className="section-padding">
        <div className="max-width-content container-padding">
          <div className="grid md:grid-cols-5 gap-12 mb-16">
            {/* Company info section */}
            <div className="md:col-span-2">
              <div className="mb-8">
                <Logo size="lg" showTagline={false} linkTo="/" />
              </div>
              
              <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
                The open-source Internal Developer Platform. 100+ curated cloud-native packages, wired together and
                brought up with a single <code className="font-mono text-foreground text-base">adhar up</code>.
              </p>
              
              <div className="flex space-x-4">
                <a
                  href="https://github.com/adhar-io/adhar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Adhar on GitHub"
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${focusRing}`}
                >
                  <Github className="w-5 h-5" />
                  <span>Star on GitHub</span>
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
                          className={linkClass}
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a 
                          href={link.href} 
                          className={linkClass}
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
                  className={`${linkClass} text-sm`}
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
