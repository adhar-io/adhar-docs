
# Configuration Guide

Learn how to configure ADHAR for your specific environment and requirements.

## Configuration Overview

ADHAR uses a hierarchical configuration system that allows you to customize every aspect of your platform deployment.

## Main Configuration File

The primary configuration file is `adhar.yaml` located in your project root:

```yaml
apiVersion: v1
kind: Platform
metadata:
  name: my-platform
  namespace: adhar-system
  labels:
    environment: production
    team: platform
spec:
  # Cloud provider configuration
  cloudProvider:
    type: aws  # aws, azure, gcp, local
    region: us-west-2
    
  # Core components
  components:
    argocd:
      enabled: true
      version: "2.8.0"
      replicas: 2
      
    keycloak:
      enabled: true
      version: "22.0.0"
      database:
        type: postgresql
        
    kyverno:
      enabled: true
      version: "1.10.0"
      
    harbor:
      enabled: true
      version: "2.9.0"
      
    backstage:
      enabled: true
      version: "1.17.0"
      
  # Security configuration
  security:
    rbac:
      enabled: true
      strictMode: true
    networkPolicies:
      enabled: true
      defaultDeny: true
    podSecurityStandards:
      enforce: restricted
      
  # Observability
  observability:
    metrics:
      enabled: true
      retention: 30d
    logging:
      enabled: true
      level: info
    tracing:
      enabled: true
      
  # Resource limits
  resources:
    limits:
      cpu: "4"
      memory: "8Gi"
    requests:
      cpu: "2"
      memory: "4Gi"
```

## Environment-Specific Configuration

Create separate configuration files for different environments:

### Development Environment
```yaml
# adhar-dev.yaml
apiVersion: v1
kind: Platform
metadata:
  name: my-platform-dev
spec:
  cloudProvider:
    type: local
  components:
    argocd:
      replicas: 1
  resources:
    limits:
      cpu: "2"
      memory: "4Gi"
```

### Production Environment
```yaml
# adhar-prod.yaml
apiVersion: v1
kind: Platform
metadata:
  name: my-platform-prod
spec:
  cloudProvider:
    type: aws
    region: us-east-1
  components:
    argocd:
      replicas: 3
      highAvailability: true
  security:
    rbac:
      strictMode: true
    networkPolicies:
      defaultDeny: true
```

## Component-Specific Configuration

### ArgoCD Configuration
```yaml
components:
  argocd:
    enabled: true
    config:
      server:
        insecure: false
        grpc:
          web: true
      repositories:
        - url: https://github.com/your-org/app-configs
          type: git
          name: app-configs
      applications:
        - name: platform-apps
          source:
            repoURL: https://github.com/your-org/platform-apps
            path: overlays/production
            targetRevision: main
          destination:
            server: https://kubernetes.default.svc
            namespace: default
```

### Keycloak Configuration
```yaml
components:
  keycloak:
    enabled: true
    config:
      database:
        vendor: postgresql
        hostname: keycloak-db
        database: keycloak
        username: keycloak
      admin:
        username: admin
        # password should be set via secret
      themes:
        - name: custom-theme
          enabled: true
      realms:
        - name: adhar
          enabled: true
          clients:
            - clientId: backstage
              enabled: true
              redirectUris:
                - "http://localhost:3000/*"
```

### Kyverno Policies
```yaml
components:
  kyverno:
    enabled: true
    policies:
      - name: require-labels
        enabled: true
        spec: |
          apiVersion: kyverno.io/v1
          kind: ClusterPolicy
          metadata:
            name: require-labels
          spec:
            validationFailureAction: enforce
            background: true
            rules:
              - name: check-team-label
                match:
                  any:
                  - resources:
                      kinds:
                      - Pod
                validate:
                  message: "label 'team' is required"
                  pattern:
                    metadata:
                      labels:
                        team: "?*"
```

## Secrets Management

ADHAR integrates with various secret management solutions:

### Using Kubernetes Secrets
```yaml
secrets:
  - name: database-credentials
    type: Opaque
    data:
      username: <base64-encoded-username>
      password: <base64-encoded-password>
```

### Using External Secret Operators
```yaml
externalSecrets:
  enabled: true
  provider: aws-secrets-manager
  secrets:
    - name: keycloak-admin
      remoteRef:
        key: /adhar/keycloak/admin
        property: password
```

## Advanced Configuration

### Custom Resource Definitions
```yaml
customResources:
  - apiVersion: platform.adhar.dev/v1
    kind: Application
    metadata:
      name: my-app
    spec:
      framework: spring-boot
      database: postgresql
      monitoring: prometheus
```

### Networking Configuration
```yaml
networking:
  ingress:
    enabled: true
    className: nginx
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
  service:
    type: ClusterIP
    ports:
      - name: http
        port: 80
        targetPort: 8080
```

## Validation and Testing

Validate your configuration before deployment:

```bash
# Validate configuration
adhar config validate

# Test configuration in dry-run mode
adhar deploy --dry-run

# Preview changes
adhar diff
```

## Configuration Best Practices

1. **Version Control**: Always store configurations in Git
2. **Environment Separation**: Use separate configs for dev/staging/prod
3. **Secret Management**: Never store secrets in plain text
4. **Validation**: Always validate before deployment
5. **Documentation**: Document custom configurations

## Environment Variables

Override configuration values using environment variables:

```bash
export ADHAR_CLOUD_PROVIDER=aws
export ADHAR_REGION=us-west-2
export ADHAR_NAMESPACE=production
```

## Configuration Precedence

ADHAR follows this configuration precedence order:

1. Command-line flags
2. Environment variables
3. Configuration files (adhar.yaml)
4. Default values

💡 **Tip**: Use `adhar config show` to see the final resolved configuration.
