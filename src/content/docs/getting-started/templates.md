
# Templates and Examples

ADHAR provides a comprehensive collection of templates and examples to help you get started quickly with different types of applications and use cases.

## Template Categories

### Web Applications
- **React SPA**: Modern single-page applications with TypeScript
- **Vue.js**: Progressive web applications with Vue 3
- **Angular**: Enterprise-grade Angular applications
- **Next.js**: Full-stack React applications with SSR

### Backend Services
- **Spring Boot**: Java microservices with Spring framework
- **Node.js Express**: JavaScript/TypeScript REST APIs
- **Python Flask**: Lightweight Python web services
- **Go Gin**: High-performance Go web services

### Full-Stack Applications
- **MERN Stack**: MongoDB, Express, React, Node.js
- **MEAN Stack**: MongoDB, Express, Angular, Node.js
- **Django + React**: Python Django with React frontend
- **Laravel + Vue**: PHP Laravel with Vue.js frontend

## Using Templates

### List Available Templates

\`\`\`bash
# List all available templates
adhar templates list

# Filter by technology
adhar templates list --tech react
adhar templates list --tech spring-boot

# Filter by category
adhar templates list --category web
adhar templates list --category microservice
\`\`\`

### Create from Template

\`\`\`bash
# Create application from template
adhar create my-app --template react-typescript

# Create with custom parameters
adhar create my-api \\
  --template spring-boot \\
  --database postgresql \\
  --cache redis \\
  --monitoring prometheus
\`\`\`

### Template Customization

\`\`\`bash
# Interactive template creation
adhar create my-app --template react-typescript --interactive

# This will prompt for:
# - Application name
# - Description
# - Port configuration
# - Database selection
# - Authentication setup
# - Monitoring preferences
\`\`\`

## Featured Templates

### 1. React TypeScript SPA

**Description**: Modern React application with TypeScript, Tailwind CSS, and testing setup.

**Features**:
- TypeScript configuration
- Tailwind CSS for styling
- Jest and React Testing Library
- ESLint and Prettier
- Vite build system
- Docker containerization

**Usage**:
\`\`\`bash
adhar create my-react-app --template react-typescript
\`\`\`

**Generated Structure**:
\`\`\`
my-react-app/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── utils/
│   └── App.tsx
├── public/
├── tests/
├── Dockerfile
├── package.json
└── k8s/
    ├── deployment.yaml
    └── service.yaml
\`\`\`

### 2. Spring Boot Microservice

**Description**: Production-ready Spring Boot microservice with database integration.

**Features**:
- Spring Boot 3.x
- Spring Data JPA
- Spring Security
- OpenAPI documentation
- Actuator health checks
- Docker multi-stage build

**Usage**:
\`\`\`bash
adhar create my-api --template spring-boot --database postgresql
\`\`\`

**Generated Structure**:
\`\`\`
my-api/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/example/api/
│       │       ├── controller/
│       │       ├── service/
│       │       ├── repository/
│       │       └── ApiApplication.java
│       └── resources/
│           └── application.yml
├── Dockerfile
├── pom.xml
└── k8s/
    ├── deployment.yaml
    ├── service.yaml
    └── configmap.yaml
\`\`\`

## Custom Templates

### Creating Custom Templates

You can create your own templates for your organization:

\`\`\`bash
# Initialize template structure
mkdir my-custom-template
cd my-custom-template

# Create template configuration
cat > template.yaml << EOF
apiVersion: template.adhar.dev/v1
kind: Template
metadata:
  name: my-custom-template
  displayName: "My Custom Template"
  description: "Custom template for my organization"
  tags: ["custom", "web", "api"]
spec:
  type: application
  language: typescript
  framework: express
  parameters:
    - name: appName
      displayName: "Application Name"
      type: string
      required: true
    - name: database
      displayName: "Database Type"
      type: select
      options: ["postgresql", "mongodb", "none"]
      default: "postgresql"
  files:
    - src: "src/**/*"
      dest: "src/"
    - src: "package.json.tmpl"
      dest: "package.json"
    - src: "Dockerfile.tmpl"
      dest: "Dockerfile"
EOF
\`\`\`

### Template File Structure

\`\`\`
my-custom-template/
├── template.yaml          # Template configuration
├── src/                   # Source code templates
│   ├── app.ts.tmpl
│   ├── routes/
│   └── models/
├── package.json.tmpl      # Package.json template
├── Dockerfile.tmpl        # Dockerfile template
├── k8s/                   # Kubernetes manifests
│   ├── deployment.yaml.tmpl
│   └── service.yaml.tmpl
└── docs/                  # Template documentation
    └── README.md
\`\`\`

### Template Variables

Use template variables for customization:

\`\`\`json
{
  "name": "{{.appName}}",
  "version": "1.0.0",
  "description": "{{.description}}",
  "main": "dist/app.js",
  "scripts": {
    "start": "node dist/app.js",
    "dev": "ts-node-dev src/app.ts",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.0",
    {{#if (eq database "postgresql")}}
    "pg": "^8.8.0",
    "typeorm": "^0.3.0",
    {{/if}}
    {{#if (eq database "mongodb")}}
    "mongoose": "^6.6.0",
    {{/if}}
    "typescript": "^4.8.0"
  }
}
\`\`\`

### Register Custom Template

\`\`\`bash
# Add template to ADHAR
adhar templates add ./my-custom-template

# Verify template is available
adhar templates list --custom

# Use custom template
adhar create my-app --template my-custom-template
\`\`\`

## Example Applications

### E-commerce Application

Complete e-commerce platform with microservices architecture:

\`\`\`bash
# Create e-commerce platform
adhar create ecommerce-platform --template ecommerce-microservices

# This creates:
# - Frontend (React)
# - User Service (Node.js)
# - Product Service (Java)
# - Order Service (Python)
# - Payment Service (Go)
# - Gateway (NGINX)
# - Databases (PostgreSQL, Redis)
\`\`\`

### Blog Platform

Full-featured blog platform:

\`\`\`bash
adhar create my-blog --template blog-platform

# Features:
# - Admin dashboard
# - Content management
# - User authentication
# - Comment system
# - SEO optimization
\`\`\`

### Real-time Chat Application

WebSocket-based chat application:

\`\`\`bash
adhar create chat-app --template realtime-chat

# Includes:
# - WebSocket server
# - React frontend
# - Redis for pub/sub
# - User presence
# - Message history
\`\`\`

## Template Best Practices

### Template Structure

1. **Clear Documentation**: Include comprehensive README
2. **Parameterization**: Use variables for customization
3. **Production Ready**: Include deployment configurations
4. **Testing**: Include test setup and examples
5. **Security**: Follow security best practices

### Configuration Management

\`\`\`yaml
# template.yaml best practices
apiVersion: template.adhar.dev/v1
kind: Template
metadata:
  name: my-template
  displayName: "My Template"
  description: "Detailed template description"
  version: "1.0.0"
  author: "Your Name <email@example.com>"
  homepage: "https://github.com/org/my-template"
  tags: ["web", "api", "microservice"]
spec:
  type: application
  language: typescript
  framework: express
  requirements:
    kubernetes: ">=1.20"
    memory: "512Mi"
    cpu: "250m"
  parameters:
    - name: appName
      displayName: "Application Name"
      description: "Name of the application"
      type: string
      required: true
      pattern: "^[a-z][a-z0-9-]*$"
    - name: port
      displayName: "Port Number"
      type: integer
      default: 3000
      min: 1024
      max: 65535
\`\`\`

### File Templates

Use Handlebars syntax for file templates:

\`\`\`dockerfile
# Dockerfile.tmpl
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

{{#if healthCheck}}
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:{{port}}/health || exit 1
{{/if}}

EXPOSE {{port}}

USER node

CMD ["node", "dist/app.js"]
\`\`\`

## Sharing Templates

### Template Registry

Share templates with your team or community:

\`\`\`bash
# Publish template to registry
adhar templates publish ./my-template

# Install from registry
adhar templates install @myorg/my-template

# Update template
adhar templates update @myorg/my-template
\`\`\`

### Version Management

\`\`\`bash
# List template versions
adhar templates versions @myorg/my-template

# Use specific version
adhar create my-app --template @myorg/my-template@1.2.0

# Update to latest
adhar templates update @myorg/my-template@latest
\`\`\`

## Integration with CI/CD

### Template Validation

\`\`\`yaml
# .github/workflows/template-validation.yml
name: Validate Template
on:
  push:
    paths: ['templates/**']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Validate Template
      run: |
        adhar templates validate ./templates/my-template
        
    - name: Test Template
      run: |
        adhar create test-app --template ./templates/my-template
        adhar build test-app
        adhar test test-app
\`\`\`

### Automated Template Updates

\`\`\`yaml
# Update templates automatically
name: Update Templates
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
    - name: Update All Templates
      run: |
        adhar templates update --all
        
    - name: Test Updated Templates
      run: |
        for template in $(adhar templates list --names); do
          adhar create "test-$template" --template "$template"
          adhar test "test-$template"
        done
\`\`\`

## Next Steps

- **[First Project Guide](/docs/first-project)** - Create your first application
- **[Developer Workflows](/docs/developer-workflows)** - Optimize your development process
- **[Custom Plugins](/docs/custom-plugins)** - Extend ADHAR functionality
- **[API Reference](/docs/api-reference)** - Integrate with ADHAR programmatically

💡 **Tip**: Browse the [Template Gallery](https://templates.adhar.dev) for more examples and community-contributed templates.
