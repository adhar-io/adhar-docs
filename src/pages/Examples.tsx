
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ArrowLeft, GitBranch, Download, Star } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

const Examples = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const templates = [
    {
      title: "Microservices Starter",
      description: "Complete microservices architecture with API Gateway, service discovery, and monitoring",
      category: "Architecture",
      language: "Java",
      stars: 245,
      tags: ["Spring Boot", "Docker", "Kubernetes", "Prometheus"],
      difficulty: "Intermediate"
    },
    {
      title: "React Frontend Template",
      description: "Modern React application with TypeScript, Tailwind CSS, and component library",
      category: "Frontend",
      language: "TypeScript",
      stars: 189,
      tags: ["React", "TypeScript", "Tailwind", "Vite"],
      difficulty: "Beginner"
    },
    {
      title: "Node.js API Backend",
      description: "RESTful API with authentication, database integration, and comprehensive testing",
      category: "Backend",
      language: "JavaScript",
      stars: 156,
      tags: ["Node.js", "Express", "PostgreSQL", "JWT"],
      difficulty: "Intermediate"
    },
    {
      title: "Machine Learning Pipeline",
      description: "End-to-end ML pipeline with data processing, model training, and deployment",
      category: "AI/ML",
      language: "Python",
      stars: 298,
      tags: ["Python", "TensorFlow", "Airflow", "MLflow"],
      difficulty: "Advanced"
    },
    {
      title: "Cloud Native App",
      description: "Kubernetes-native application with Helm charts and GitOps deployment",
      category: "DevOps",
      language: "Go",
      stars: 203,
      tags: ["Go", "Kubernetes", "Helm", "ArgoCD"],
      difficulty: "Advanced"
    },
    {
      title: "E-commerce Platform",
      description: "Full-stack e-commerce solution with payment integration and admin dashboard",
      category: "Full-Stack",
      language: "TypeScript",
      stars: 412,
      tags: ["Next.js", "Prisma", "Stripe", "Tailwind"],
      difficulty: "Intermediate"
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "Intermediate": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "Advanced": return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getLanguageColor = (language: string) => {
    switch (language) {
      case "JavaScript": return "bg-yellow-500";
      case "TypeScript": return "bg-blue-500";
      case "Python": return "bg-green-500";
      case "Java": return "bg-orange-500";
      case "Go": return "bg-cyan-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      <Navigation />

      <main className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                Examples & Templates
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Ready-to-use project templates and examples to accelerate your development with ADHAR.
            </p>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                {templates.length} Templates
              </Badge>
              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                Production Ready
              </Badge>
            </div>
          </div>

          {/* Quick Start Section */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 mb-8">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Quick Start</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Get started with any template using the ADHAR CLI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <pre>{`# Install ADHAR CLI
npm install -g @adhar/cli

# Create a new project from template
adhar create my-project --template microservices-starter

# Navigate to your project
cd my-project

# Start development
adhar dev`}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getLanguageColor(template.language)}`}></div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{template.language}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Star className="w-4 h-4 fill-current" />
                      {template.stars}
                    </div>
                  </div>
                  <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-gray-900 dark:text-white">
                    {template.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    <Badge className={`text-xs ${getDifficultyColor(template.difficulty)}`}>
                      {template.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 dark:text-gray-300 mb-4">
                    {template.description}
                  </CardDescription>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Download className="w-4 h-4 mr-2" />
                      Use Template
                    </Button>
                    <Button size="sm" variant="outline">
                      <GitBranch className="w-4 h-4 mr-2" />
                      View Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contributing Section */}
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white mt-12">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Contribute Your Templates</h3>
              <p className="text-blue-100 dark:text-blue-200 mb-6">
                Share your project templates with the ADHAR community and help others get started faster.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Submit Template
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white/10 dark:hover:bg-white/20">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Template Guidelines
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Examples;
