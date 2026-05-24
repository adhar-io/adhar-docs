import React from "react";
import { ExternalLink, GitBranch, Download, Star, ArrowRight } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

const Examples = () => {
  const templates = [
    {
      title: "Microservices starter",
      description: "Complete microservices architecture with API Gateway, service discovery, and monitoring.",
      category: "Architecture",
      language: "Java",
      stars: 245,
      tags: ["Spring Boot", "Docker", "Kubernetes", "Prometheus"],
      difficulty: "Intermediate",
    },
    {
      title: "React frontend template",
      description: "Modern React application with TypeScript, Tailwind CSS, and a component library.",
      category: "Frontend",
      language: "TypeScript",
      stars: 189,
      tags: ["React", "TypeScript", "Tailwind", "Vite"],
      difficulty: "Beginner",
    },
    {
      title: "Node.js API backend",
      description: "RESTful API with authentication, database integration, and comprehensive testing.",
      category: "Backend",
      language: "JavaScript",
      stars: 156,
      tags: ["Node.js", "Express", "PostgreSQL", "JWT"],
      difficulty: "Intermediate",
    },
    {
      title: "Machine learning pipeline",
      description: "End-to-end ML pipeline with data processing, model training, and deployment.",
      category: "AI/ML",
      language: "Python",
      stars: 298,
      tags: ["Python", "TensorFlow", "Airflow", "MLflow"],
      difficulty: "Advanced",
    },
    {
      title: "Cloud-native app",
      description: "Kubernetes-native application with Helm charts and GitOps deployment.",
      category: "DevOps",
      language: "Go",
      stars: 203,
      tags: ["Go", "Kubernetes", "Helm", "ArgoCD"],
      difficulty: "Advanced",
    },
    {
      title: "E-commerce platform",
      description: "Full-stack e-commerce solution with payment integration and admin dashboard.",
      category: "Full-Stack",
      language: "TypeScript",
      stars: 412,
      tags: ["Next.js", "Prisma", "Stripe", "Tailwind"],
      difficulty: "Intermediate",
    },
  ];

  const getLanguageDot = (language: string) => {
    switch (language) {
      case "JavaScript": return "bg-yellow-500";
      case "TypeScript": return "bg-blue-500";
      case "Python": return "bg-emerald-500";
      case "Java": return "bg-orange-500";
      case "Go": return "bg-cyan-500";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5">Examples</span>
            <h1 className="section-heading mt-5 text-foreground">
              Templates to
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">accelerate your work.</span>
            </h1>
            <p className="section-subheading mt-6">
              Ready-to-use project templates and examples to accelerate your development with ADHAR.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium ring-1 ring-inset ring-primary/20">
                {templates.length} templates
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                Production ready
              </span>
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="container-padding pb-12">
          <div className="max-width-content">
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
              <div className="px-6 py-5 border-b border-border/60">
                <h2 className="text-base font-semibold text-foreground tracking-tight">Quick start</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Get started with any template using the ADHAR CLI.
                </p>
              </div>
              <pre className="px-6 py-5 text-[13px] leading-6 font-mono text-foreground/90 bg-muted/40 overflow-x-auto">{`# Install ADHAR CLI
npm install -g @adhar/cli

# Create a new project from template
adhar create my-project --template microservices-starter

# Navigate to your project
cd my-project

# Start development
adhar dev`}</pre>
            </div>
          </div>
        </section>

        {/* Templates */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {templates.map((template, index) => (
                <article
                  key={index}
                  className="group flex flex-col bg-card p-6 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getLanguageDot(template.language)}`} />
                      <span className="text-xs text-muted-foreground">{template.language}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground tabular">
                      <Star className="w-3.5 h-3.5" />
                      {template.stars}
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {template.title}
                  </h3>

                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border/70 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {template.category}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {template.difficulty}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {template.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {template.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto pt-5 flex gap-2">
                    <button
                      type="button"
                      className="btn-primary-modern flex-1 inline-flex items-center justify-center gap-1.5 rounded-full h-9 text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Use template</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary-modern inline-flex items-center justify-center gap-1.5 rounded-full px-4 h-9 text-xs font-medium"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>Code</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Contribute CTA */}
        <section className="section-padding container-padding">
          <div className="max-width-content">
            <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
              <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
              <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
              <div className="relative px-6 py-14 sm:px-12 sm:py-16 text-center">
                <span className="eyebrow mb-6">Contribute</span>
                <h2 className="section-heading mt-4 text-foreground">Share your templates.</h2>
                <p className="section-subheading mt-5">
                  Submit your project templates and help the ADHAR community get started faster.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Submit template</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <span>Template guidelines</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Examples;
