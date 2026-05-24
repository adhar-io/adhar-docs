
# Create Your First Project

This guide walks you through creating your first cloud-native project with ADHAR, from initialization to deployment.

## Project Overview

We'll build a simple microservices application consisting of:
- A REST API backend service
- A React frontend application  
- A PostgreSQL database
- Redis for caching
- Full CI/CD pipeline with GitOps

## Prerequisites

- ADHAR CLI installed ([Quick Start Guide](/docs/quick-start-guide))
- Kubernetes cluster running
- Git repository for your project

## Step 1: Initialize the Project

Create a new ADHAR project:

```bash
# Create and navigate to project directory
mkdir my-first-project
cd my-first-project

# Initialize ADHAR project
adhar init --interactive
```

The interactive setup will prompt you for:

```
? Project name: my-first-project
? Description: My first cloud-native application
? Cloud provider: Local Kubernetes
? Enable GitOps: Yes
? Git repository URL: https://github.com/yourusername/my-first-project
? Default namespace: default
? Enable security policies: Yes
```

## Step 2: Project Structure

After initialization, your project structure will look like:

```
my-first-project/
├── adhar.yaml                 # Main platform configuration
├── apps/                      # Application definitions
├── infrastructure/            # Infrastructure as code
│   ├── base/                 # Base Kubernetes manifests
│   └── overlays/             # Environment-specific configs
├── policies/                  # Kyverno security policies
├── scripts/                   # Automation scripts
└── docs/                     # Project documentation
```

## Step 3: Create Backend Service

Generate a REST API service:

```bash
# Generate backend service
adhar generate service api \
  --type rest \
  --language java \
  --framework spring-boot \
  --database postgresql \
  --cache redis
```

This creates the backend service structure:

```
apps/api/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/example/api/
│       │       ├── ApiApplication.java
│       │       ├── controller/
│       │       ├── service/
│       │       └── repository/
│       └── resources/
│           └── application.yml
├── Dockerfile
├── deployment.yaml
└── service.yaml
```

### Backend Configuration

Update `apps/api/src/main/resources/application.yml`:

```yaml
server:
  port: 8080
  
spring:
  application:
    name: api-service
  datasource:
    url: jdbc:postgresql://postgres:5432/myapp
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:password}
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
  redis:
    host: redis
    port: 6379
    
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
```

## Step 4: Create Frontend Application

Generate a React frontend:

```bash
# Generate frontend service
adhar generate service frontend \
  --type spa \
  --framework react \
  --build-tool vite
```

This creates:

```
apps/frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── App.tsx
├── package.json
├── Dockerfile
└── deployment.yaml
```

### Frontend API Integration

Create API service client in `apps/frontend/src/services/api.ts`:

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}

export const apiService = new ApiService();
```

## Step 5: Add Database and Cache

Create database and cache services:

```bash
# Add PostgreSQL database
adhar generate database postgres \
  --version 15 \
  --storage 10Gi \
  --backup-enabled true

# Add Redis cache
adhar generate cache redis \
  --version 7 \
  --memory 512Mi
```

## Step 6: Configure Security Policies

ADHAR automatically generates security policies. Review them in `policies/`:

```yaml
# policies/network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

## Step 7: Set Up CI/CD Pipeline

Configure GitOps workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to ADHAR
on:
  push:
    branches: [main]
    
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup ADHAR CLI
      run: |
        curl -sSL https://get.adhar.dev | bash
        
    - name: Build and Deploy
      run: |
        adhar build --all
        adhar deploy --environment production
      env:
        ADHAR_TOKEN: ${{ secrets.ADHAR_TOKEN }}
        KUBECONFIG_DATA: ${{ secrets.KUBECONFIG_DATA }}
```

## Step 8: Deploy Your Application

Deploy everything to your cluster:

```bash
# Build all services
adhar build --all

# Deploy to development environment
adhar deploy --environment development

# Check deployment status
adhar status
```

Monitor the deployment:

```bash
# Watch pods starting up
kubectl get pods -w

# Check service endpoints
adhar endpoints

# View application logs
adhar logs api-service
adhar logs frontend
```

## Step 9: Access Your Application

Once deployed, access your application:

```bash
# Get application URLs
adhar urls

# Port-forward for local access (if needed)
kubectl port-forward service/frontend 3000:80
kubectl port-forward service/api-service 8080:8080
```

Visit:
- Frontend: http://localhost:3000
- API: http://localhost:8080
- API Health: http://localhost:8080/actuator/health

## Step 10: Monitor and Observe

Access the monitoring dashboards:

```bash
# Open Backstage developer portal
adhar portal open

# View ArgoCD for GitOps
adhar argocd open

# Access Grafana for metrics
adhar grafana open
```

## Next Steps

🎉 **Congratulations!** You've successfully created and deployed your first ADHAR project.

### Enhance Your Application

- **Add Authentication**: [Keycloak Integration](/docs/keycloak-integration)
- **Implement Monitoring**: [Monitoring & Observability](/docs/monitoring-observability)  
- **Scale Services**: [Auto-scaling Configuration](/docs/scaling)
- **Add Tests**: [Testing Strategies](/docs/testing)

### Learn More

- [Developer Workflows](/docs/developer-workflows) - Optimize your development process
- [Security Best Practices](/docs/security-best-practices) - Secure your applications
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions

💡 **Tip**: Use `adhar --help` to explore all available commands and options.
