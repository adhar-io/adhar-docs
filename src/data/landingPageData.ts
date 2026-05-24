import { 
  Target, 
  Palette, 
  Code, 
  Rocket, 
  Sparkles, 
  Hexagon,
  Globe,
  Zap,
  Cloud,
  Shield,
  Network,
  TrendingUp,
  Users,
  Building,
  Server,
  Clock,
  BarChart3,
  Brain,
  Bot
} from "lucide-react";

export const features = [
  {
    icon: Target,
    title: "Define",
    description: "Comprehensive requirement gathering, user story definition, and project scoping with built-in templates and best practices.",
    gradient: "from-blue-500 to-cyan-500",
    delay: "0ms",
    details: ["Requirements Analysis", "User Story Mapping", "Project Scoping", "Stakeholder Alignment"]
  },
  {
    icon: Palette,
    title: "Design", 
    description: "Cloud-native architecture design with governance frameworks, security policies, and scalability patterns.",
    gradient: "from-purple-500 to-pink-500",
    delay: "100ms",
    details: ["Architecture Design", "Security Patterns", "Governance Framework", "Scalability Planning"]
  },
  {
    icon: Code,
    title: "Develop",
    description: "Accelerated development with paved roads, pre-configured environments, and integrated developer tools.",
    gradient: "from-green-500 to-emerald-500",
    delay: "200ms",
    details: ["Code Generation", "Dev Environments", "Testing Tools", "Quality Gates"]
  },
  {
    icon: Rocket,
    title: "Deliver",
    description: "Seamless deployments with automated CI/CD workflows, progressive delivery, and rollback capabilities.",
    gradient: "from-orange-500 to-red-500",
    delay: "300ms",
    details: ["CI/CD Automation", "Progressive Delivery", "Rollback Systems", "Release Management"]
  },
  {
    icon: Sparkles,
    title: "Discover",
    description: "Advanced analytics, component discovery, performance monitoring, and continuous improvement insights.",
    gradient: "from-teal-500 to-blue-500",
    delay: "400ms",
    details: ["Performance Analytics", "Component Discovery", "Usage Insights", "Optimization Recommendations"]
  },
  {
    icon: BarChart3,
    title: "Decide",
    description: "Transform business insights from the Discover stage into strategic decisions with data-driven roadmap planning and growth strategies.",
    gradient: "from-indigo-500 to-purple-500",
    delay: "500ms",
    details: ["Business Intelligence", "Strategic Planning", "Growth Analytics", "Data-Driven Decisions"]
  }
];

export const capabilities = [
  {
    icon: Hexagon,
    title: "Kubernetes-Native Foundation",
    description: "Built on Kubernetes, ADHAR provides enterprise-grade orchestration, auto-scaling, self-healing, and seamless workload management across any cloud or on-premises infrastructure.",
    color: "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-700/50",
    stats: "K8s Native",
    highlight: true
  },
  {
    icon: Globe,
    title: "Multi-Language & Framework Support",
    description: "Support for 15+ languages including Angular, Spring Boot, Quarkus, Go, Java, JavaScript, Python, Node.js, React, TypeScript, and more with intelligent project scaffolding.",
    color: "bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-700/50",
    stats: "15+ Languages"
  },
  {
    icon: Zap,
    title: "Enhanced Developer Experience",
    description: "Fast feedback loops, self-service capabilities, intelligent code completion, and automated testing reduce development time by up to 60%.",
    color: "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-700/50",
    stats: "60% Faster Development"
  },
  {
    icon: Cloud,
    title: "Multi-Cloud & Hybrid Ready",
    description: "Deploy seamlessly across AWS, Azure, GCP, and hybrid environments. Automatic scaling, load balancing, disaster recovery, and vendor lock-in prevention.",
    color: "bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-700/50",
    stats: "Zero Lock-in"
  },
  {
    icon: Shield,
    title: "Enterprise Security & Compliance",
    description: "SOC 2, GDPR, HIPAA compliant with zero-trust architecture, automated security scanning, vulnerability management, and comprehensive audit trails.",
    color: "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-700/50",
    stats: "Enterprise Grade"
  },
  {
    icon: Network,
    title: "Service Mesh & Observability",
    description: "Built-in service mesh capabilities with distributed tracing, metrics collection, and advanced observability for microservices architectures.",
    color: "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-700/50",
    stats: "Full Observability"
  },
  {
    icon: Brain,
    title: "Intelligent Business Decisions",
    description: "Transform Discover stage insights into strategic decisions with AI-powered analytics, data-driven roadmap planning, and growth optimization recommendations.",
    color: "bg-teal-50 border-teal-200 dark:bg-teal-900/10 dark:border-teal-700/50",
    stats: "Data-Driven Decisions"
  },
  {
    icon: Bot,
    title: "AI Assisted Workflows",
    description: "Every platform user gets personalized AI assistance tailored to their role and tasks. From developers to architects to business analysts, our AI provides contextual guidance, automates repetitive tasks, and accelerates decision-making.",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-900/10 dark:border-violet-700/50",
    stats: "Universal AI Assistant"
  }
];

export const integrations = [
  { 
    name: "Kubernetes", 
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg", 
    color: "bg-blue-100 border-blue-300", 
    description: "Container Orchestration",
    isFoundation: true
  },
  { 
    name: "ArgoCD", 
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/argo.svg", 
    color: "bg-orange-100 border-orange-300", 
    description: "GitOps Delivery" 
  },
  { 
    name: "Keycloak", 
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/keycloak.svg", 
    color: "bg-green-100 border-green-300", 
    description: "Identity Management" 
  },
  { 
    name: "Kyverno", 
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/kyverno.svg", 
    color: "bg-purple-100 border-purple-300", 
    description: "Policy Engine" 
  },
  { 
    name: "Harbor", 
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/harbor.svg", 
    color: "bg-cyan-100 border-cyan-300", 
    description: "Container Registry" 
  },
  { 
    name: "Backstage", 
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/backstage.svg", 
    color: "bg-pink-100 border-pink-300", 
    description: "Developer Portal" 
  },
  { 
    name: "Prometheus", 
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prometheus/prometheus-original.svg", 
    color: "bg-red-100 border-red-300", 
    description: "Monitoring & Metrics" 
  },
  { 
    name: "Grafana", 
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/grafana/grafana-original.svg", 
    color: "bg-yellow-100 border-yellow-300", 
    description: "Visualization" 
  },
  { 
    name: "Istio", 
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/istio.svg", 
    color: "bg-indigo-100 border-indigo-300", 
    description: "Service Mesh" 
  },
  { 
    name: "PostgreSQL", 
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg", 
    color: "bg-blue-100 border-blue-300", 
    description: "Database" 
  },
  { 
    name: "Tekton", 
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tekton.svg", 
    color: "bg-green-100 border-green-300", 
    description: "CI/CD Pipelines" 
  },
  { 
    name: "Helm", 
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/helm/helm-original.svg", 
    color: "bg-teal-100 border-teal-300", 
    description: "Package Manager" 
  }
];

export const enterpriseBenefits = [
  {
    icon: TrendingUp,
    title: "70% Faster Time-to-Market",
    description: "Accelerate your delivery cycles with automated workflows and pre-built components"
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description: "Built-in compliance frameworks and zero-trust architecture from day one"
  },
  {
    icon: Cloud,
    title: "Multi-Cloud Freedom",
    description: "Deploy anywhere without vendor lock-in - AWS, Azure, GCP, or hybrid"
  },
  {
    icon: Users,
    title: "Developer Productivity",
    description: "Self-service capabilities that empower developers and reduce operational overhead"
  }
];

export const testimonials = [
  {
    quote: "ADHAR eliminated weeks of infrastructure setup. Our team deployed a production-grade platform in 9 minutes with 50+ services pre-configured. We've reclaimed 80% of our engineering time to focus on product features.",
    author: "Sarah Chen",
    role: "VP Engineering",
    company: "TechCorp Global",
    avatar: "SC",
    logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=120&h=120&fit=crop",
    metrics: { timeSaved: "80%", deployTime: "9 min", productivity: "3x" }
  },
  {
    quote: "Before ADHAR, it took us 2-3 weeks to provision infrastructure and configure security. Now it's a single command. Our deployment frequency increased from monthly to daily, and our developers are 4x more productive.",
    author: "Michael Rodriguez",
    role: "Chief Architect",
    company: "SecureFinance",
    avatar: "MR",
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=120&h=120&fit=crop",
    metrics: { timeSaved: "95%", deployTime: "8 min", productivity: "4x" }
  },
  {
    quote: "ADHAR transformed our platform engineering. Zero infrastructure tickets, zero security reviews, zero integration projects. Our 15-person team can now manage infrastructure that previously required 50+ engineers.",
    author: "Emily Johnson",
    role: "Head of Platform Engineering",
    company: "GlobalScale",
    avatar: "EJ",
    logo: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&h=120&fit=crop",
    metrics: { timeSaved: "90%", deployTime: "7 min", productivity: "5x" }
  },
  {
    quote: "We went from 3-week deployment cycles to same-day deployments. ADHAR's battle-tested patterns and automated security gave us confidence to move fast without breaking compliance requirements.",
    author: "David Park",
    role: "CTO",
    company: "CloudNative Systems",
    avatar: "DP",
    logo: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=120&h=120&fit=crop",
    metrics: { timeSaved: "85%", deployTime: "10 min", productivity: "3.5x" }
  },
  {
    quote: "ADHAR's open-source approach with enterprise-grade defaults saved us months of research and integration work. Our developers get self-service access to everything they need, instantly.",
    author: "Rachel Martinez",
    role: "Director of Engineering",
    company: "InnovateLabs",
    avatar: "RM",
    logo: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&h=120&fit=crop",
    metrics: { timeSaved: "92%", deployTime: "8 min", productivity: "4.5x" }
  }
];

export const pricingPlans = [
  {
    name: "Open Source",
    subtitle: "Self-Hosted",
    price: "Free",
    period: "/forever",
    description: "Fully functional platform for self-hosting on your infrastructure. All features included, all development happens in open source.",
    features: [
      "Complete source code access",
      "All platform features included",
      "Self-host on any infrastructure",
      "Active open source development",
      "Community support & forums",
      "Unlimited projects & workspaces",
      "Full GitOps automation",
      "Multi-cloud & hybrid support",
      "No vendor lock-in"
    ],
    cta: "Download & Deploy",
    popular: false,
    highlight: "FREE FOREVER"
  },
  {
    name: "Adhar Cloud",
    subtitle: "Managed SaaS",
    price: "$99",
    period: "/month per team",
    description: "Fully managed service for teams who don't want infrastructure hassle. Premium UI, AI features, support, and training included.",
    features: [
      "Everything in Open Source",
      "Fully managed cloud platform",
      "Premium UI with advanced features",
      "AI-powered automation & insights",
      "Priority support (24/7)",
      "Training & certification programs",
      "Automated updates & maintenance",
      "Advanced monitoring & analytics",
      "99.9% SLA guarantee"
    ],
    cta: "Start Free Trial",
    popular: true,
    highlight: "MOST POPULAR"
  },
  {
    name: "Enterprise",
    subtitle: "Custom Solutions",
    price: "Custom",
    description: "Tailored for large organizations requiring customization, dedicated integrations, and on-premise or cloud deployment with custom pricing.",
    features: [
      "Everything in Adhar Cloud",
      "Custom integrations & workflows",
      "Dedicated cloud or on-prem setup",
      "White-label options available",
      "Custom feature development",
      "Dedicated success manager",
      "Advanced security & compliance",
      "Private support channels",
      "Custom SLA agreements"
    ],
    cta: "Contact Sales",
    popular: false,
    highlight: "CUSTOM PRICING"
  }
];

export const faqs = [
  {
    question: "How does ADHAR leverage Kubernetes for enterprise workloads?",
    answer: "ADHAR is built on Kubernetes as its core foundation, providing enterprise-grade container orchestration, automatic scaling, self-healing capabilities, and seamless workload management. This enables consistent deployment across any cloud or on-premises infrastructure while maintaining high availability and performance standards."
  },
  {
    question: "What makes ADHAR suitable for multi-cloud and hybrid deployments?",
    answer: "ADHAR's Kubernetes-native architecture ensures consistent behavior across AWS, Azure, GCP, DigitalOcean, CIVO and on-premises environments. Our platform abstracts cloud-specific complexities while providing unified management, monitoring, and security policies across all deployment targets."
  },
  {
    question: "Which programming languages and frameworks are supported?",
    answer: "ADHAR supports 15+ languages including Angular, Spring Boot, Quarkus, Go, Java, JavaScript, Python, Node.js, React, TypeScript, .NET, Ruby, PHP, and more. We provide intelligent project scaffolding and deployment templates optimized for Kubernetes environments."
  },
  {
    question: "How does ADHAR ensure enterprise security and compliance?",
    answer: "ADHAR implements zero-trust architecture with SOC 2, GDPR, and HIPAA compliance built-in. We provide automated security scanning, vulnerability management, policy enforcement through Kyverno, and comprehensive audit trails for all platform activities."
  },
  {
    question: "What open-source tools power the ADHAR platform?",
    answer: "ADHAR is built on proven open-source technologies including Kubernetes, ArgoCD for GitOps, Kargo for software supply chain management, Keycloak for identity and access management, Harbor for container registry, Grafana and Prometheus for monitoring, Cilium for networking and service mesh, and many others, ensuring transparency and avoiding vendor lock-in."
  },
  {
    question: "How does ADHAR support DevOps and GitOps workflows?",
    answer: "ADHAR provides native GitOps capabilities through ArgoCD integration, automated CI/CD pipelines with Argo Workflows, infrastructure as code, and progressive delivery strategies. This enables teams to implement best practices for continuous deployment and infrastructure management."
  }
];

export const stats = [
  { label: "Enterprise Customers", value: "500+", icon: Building },
  { label: "Kubernetes Clusters", value: "10,000+", icon: Server },
  { label: "Applications Deployed", value: "100,000+", icon: Rocket },
  { label: "Developer Hours Saved", value: "1M+", icon: Clock }
];

export const cloudProviders = [
  { name: "AWS", supported: true },
  { name: "Azure", supported: true },
  { name: "Google Cloud", supported: true },
  { name: "DigitalOcean", supported: true },
  { name: "CIVO", supported: true },
  { name: "On-Premises", supported: true }
];
