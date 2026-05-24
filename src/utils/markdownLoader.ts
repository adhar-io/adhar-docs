
// Utility for loading markdown content
export interface MarkdownContent {
  content: string;
  frontmatter?: Record<string, any>;
}

export interface DocPage {
  title: string;
  description: string;
  badge?: string;
  slug: string;
  category: string;
  path: string;
}

// Map of documentation pages to their markdown files
export const docPages: Record<string, DocPage> = {
  "quick-start-guide": {
    title: "Quick Start Guide",
    description: "Get up and running with ADHAR in 5 minutes",
    badge: "New",
    slug: "quick-start-guide",
    category: "getting-started",
    path: "/src/content/docs/getting-started/quick-start.md"
  },
  "installation": {
    title: "Installation",
    description: "Step-by-step installation instructions",
    slug: "installation",
    category: "getting-started",
    path: "/src/content/docs/getting-started/installation.md"
  },
  "5-ds-framework": {
    title: "The 5 D's Framework",
    description: "Define, Design, Develop, Deploy, Discover",
    slug: "5-ds-framework",
    category: "core-concepts",
    path: "/src/content/docs/core-concepts/5-ds-framework.md"
  },
  "platform-architecture": {
    title: "Platform Architecture",
    description: "Understanding ADHAR's architecture",
    slug: "platform-architecture",
    category: "core-concepts",
    path: "/src/content/docs/core-concepts/platform-architecture.md"
  },
  "integration-patterns": {
    title: "Integration Patterns",
    description: "How ADHAR integrates with open source tools",
    slug: "integration-patterns",
    category: "core-concepts",
    path: "/src/content/docs/core-concepts/integration-patterns.md"
  },
  "argo-cd-setup": {
    title: "ArgoCD Setup",
    description: "GitOps continuous delivery configuration",
    slug: "argo-cd-setup",
    category: "integrations",
    path: "/src/content/docs/integrations/argo-cd-setup.md"
  }
};

export const loadMarkdownContent = async (slug: string): Promise<MarkdownContent | null> => {
  const docPage = docPages[slug];
  if (!docPage) {
    console.error(`Documentation page not found: ${slug}`);
    return null;
  }

  try {
    // For now, we'll return sample content based on the slug
    // In a real application, you would import the markdown files or fetch from a content source
    let content = "";
    
    switch (slug) {
      case "quick-start-guide":
        content = `# Quick Start Guide

Get up and running with ADHAR in 5 minutes.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- Docker Desktop running
- kubectl configured
- Helm 3+ installed

## Installation

### 1. Install ADHAR CLI

\`\`\`bash
npm install -g @adhar/cli
\`\`\`

### 2. Initialize Your Project

\`\`\`bash
adhar init my-project
cd my-project
\`\`\`

### 3. Configure Your Environment

\`\`\`bash
# Set up your cloud provider credentials
adhar config set --provider aws
adhar config set --region us-west-2
\`\`\`

### 4. Deploy Your First Application

\`\`\`bash
# Create a new service
adhar generate service user-api

# Deploy to development
adhar deploy --env dev
\`\`\`

## Next Steps

- [Configure integrations](../integrations/argocd-setup)
- [Set up monitoring](../operations/monitoring-observability)
- [Learn about the 5 D's framework](../core-concepts/5-ds-framework)

## Troubleshooting

If you encounter issues:

1. Check your cluster connectivity: \`kubectl cluster-info\`
2. Verify ADHAR installation: \`adhar version\`
3. Review logs: \`adhar logs --tail 50\`

For more help, visit our [troubleshooting guide](../operations/troubleshooting).`;
        break;
        
      case "installation":
        content = `# Installation Guide

Complete installation instructions for ADHAR platform.

## System Requirements

- **Operating System**: Linux, macOS, or Windows (with WSL2)
- **Memory**: Minimum 8GB RAM, recommended 16GB+
- **CPU**: 4+ cores recommended
- **Storage**: 50GB+ free space
- **Network**: Stable internet connection

## Prerequisites

### Docker Desktop
Install Docker Desktop for your platform:
- **macOS**: Download from [Docker Hub](https://hub.docker.com/editions/community/docker-ce-desktop-mac/)
- **Windows**: Download from [Docker Hub](https://hub.docker.com/editions/community/docker-ce-desktop-windows/)
- **Linux**: Use your distribution's package manager

### Kubernetes Cluster
You'll need access to a Kubernetes cluster. Options include:
- Local development: Docker Desktop, minikube, or kind
- Cloud providers: EKS, GKE, AKS
- On-premises: Self-managed Kubernetes

### CLI Tools
Install these essential tools:

\`\`\`bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
\`\`\`

## ADHAR CLI Installation

### Option 1: NPM (Recommended)
\`\`\`bash
npm install -g @adhar/cli
\`\`\`

### Option 2: Direct Download
\`\`\`bash
curl -fsSL https://get.adhar.dev | sh
\`\`\`

### Option 3: From Source
\`\`\`bash
git clone https://github.com/adhar-platform/cli.git
cd cli
make install
\`\`\`

## Verification

Verify your installation:
\`\`\`bash
adhar version
adhar doctor
\`\`\`

## Next Steps

Once installed, proceed to the [Quick Start Guide](./quick-start-guide) to create your first project.`;
        break;
        
      case "5-ds-framework":
        content = `# The 5 D's Framework

ADHAR is built around the 5 D's framework: **Define**, **Design**, **Develop**, **Deploy**, and **Discover**.

## Overview

The 5 D's represent the complete lifecycle of cloud-native application development, providing a structured approach to building modern applications.

## 1. Define 📋

**What**: Establish project requirements, architecture, and constraints.

### Key Activities:
- Requirements gathering
- Architecture decisions
- Technology selection
- Compliance requirements
- Security policies

### ADHAR Tools:
- Project templates
- Architecture blueprints
- Policy definitions
- Compliance frameworks

## 2. Design 🎨

**What**: Create the application architecture and user experience.

### Key Activities:
- System design
- API design
- Database schema
- User interface mockups
- Integration planning

### ADHAR Tools:
- Design templates
- Component libraries
- API specifications
- Database migrations
- Integration patterns

## 3. Develop 💻

**What**: Write, test, and validate application code.

### Key Activities:
- Code implementation
- Unit testing
- Integration testing
- Code review
- Documentation

### ADHAR Tools:
- Development environment
- Code generators
- Testing frameworks
- CI/CD pipelines
- Code quality tools

## 4. Deploy 🚀

**What**: Package, distribute, and run applications in production.

### Key Activities:
- Container building
- Environment provisioning
- Configuration management
- Release orchestration
- Monitoring setup

### ADHAR Tools:
- GitOps workflows
- Environment management
- Configuration templates
- Release automation
- Observability stack

## 5. Discover 🔍

**What**: Monitor, analyze, and optimize running applications.

### Key Activities:
- Performance monitoring
- Log analysis
- Error tracking
- User analytics
- Cost optimization

### ADHAR Tools:
- Monitoring dashboards
- Alerting rules
- Log aggregation
- Metrics collection
- Cost analysis

## Integration

The 5 D's work together as an integrated workflow:

\`\`\`mermaid
graph LR
    A[Define] --> B[Design]
    B --> C[Develop]
    C --> D[Deploy]
    D --> E[Discover]
    E --> A
\`\`\`

Each phase feeds into the next, creating a continuous improvement cycle.

## Benefits

- **Consistency**: Standardized approach across teams
- **Quality**: Built-in best practices and checks
- **Speed**: Automated workflows and templates
- **Visibility**: End-to-end observability
- **Scalability**: Cloud-native by design`;
        break;
        
      default:
        content = `# ${docPage.title}

${docPage.description}

This documentation page is under construction. Please check back soon for complete content.

## Coming Soon

- Detailed implementation guide
- Code examples
- Best practices
- Troubleshooting tips

## Need Help?

If you need immediate assistance, please:
- Check our [FAQ](../support/faq)
- Visit our [Discord community](https://discord.gg/adhar)
- Create an issue on [GitHub](https://github.com/adhar-platform/adhar)`;
    }
    
    return { content };
  } catch (error) {
    console.error(`Error loading markdown for ${slug}:`, error);
    return null;
  }
};

export const getDocumentationStructure = () => {
  const categories = new Map<string, DocPage[]>();
  
  Object.values(docPages).forEach(page => {
    if (!categories.has(page.category)) {
      categories.set(page.category, []);
    }
    categories.get(page.category)!.push(page);
  });
  
  return categories;
};
