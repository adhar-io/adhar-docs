
# Security Best Practices

This guide covers essential security practices for deploying and managing ADHAR in production environments.

## Security Overview

ADHAR implements security through multiple layers:
- **Identity and Access Management** (Keycloak)
- **Policy Enforcement** (Kyverno)
- **Network Security** (Network Policies)
- **Container Security** (Harbor, Pod Security Standards)
- **Secrets Management** (External Secrets Operator)

## Authentication and Authorization

### Multi-Factor Authentication

Enable MFA for all administrative accounts:

\`\`\`yaml
# Keycloak MFA configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: keycloak-realm-config
data:
  realm.json: |
    {
      "realm": "adhar",
      "requiredActions": ["CONFIGURE_TOTP"],
      "otpPolicy": {
        "type": "totp",
        "algorithm": "HmacSHA256",
        "digits": 6,
        "period": 30,
        "lookAheadWindow": 1
      },
      "browserSecurityHeaders": {
        "contentSecurityPolicy": "frame-src 'self'; frame-ancestors 'self'; object-src 'none';",
        "strictTransportSecurity": "max-age=31536000; includeSubDomains"
      }
    }
\`\`\`

### Role-Based Access Control (RBAC)

Implement least-privilege access:

\`\`\`yaml
# RBAC configuration
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: developer
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: default
subjects:
- kind: User
  name: developer@company.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
\`\`\`

### Service Account Security

Create dedicated service accounts with minimal permissions:

\`\`\`yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: default
automountServiceAccountToken: false

---
apiVersion: v1
kind: Secret
metadata:
  name: app-service-account-token
  namespace: default
  annotations:
    kubernetes.io/service-account.name: app-service-account
type: kubernetes.io/service-account-token
\`\`\`

## Container Security

### Image Security Scanning

Configure Harbor for comprehensive vulnerability scanning:

\`\`\`yaml
# Harbor security configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: harbor-config
data:
  config.yaml: |
    harbor:
      security:
        vulnerability:
          scanners:
            - name: trivy
              enabled: true
              config:
                severity: "CRITICAL,HIGH,MEDIUM"
                skip_update: false
        image_policy:
          allow_unsigned: false
          severity_threshold: "HIGH"
          require_scan: true
\`\`\`

### Pod Security Standards

Enforce Pod Security Standards across all namespaces:

\`\`\`yaml
# Pod Security Standards
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted

---
# Security context example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
          readOnly: false
      volumes:
      - name: tmp
        emptyDir: {}
\`\`\`

### Resource Limits and Quotas

Prevent resource exhaustion attacks:

\`\`\`yaml
# Resource quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: default
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "10"

---
# Limit range
apiVersion: v1
kind: LimitRange
metadata:
  name: mem-limit-range
  namespace: default
spec:
  limits:
  - default:
      memory: 512Mi
      cpu: 500m
    defaultRequest:
      memory: 256Mi
      cpu: 250m
    type: Container
\`\`\`

## Network Security

### Network Policies

Implement zero-trust networking:

\`\`\`yaml
# Default deny all network policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

---
# Allow specific communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-to-database
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: api-service
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
\`\`\`

### TLS Configuration

Enforce TLS everywhere:

\`\`\`yaml
# TLS ingress configuration
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - app.company.com
    secretName: app-tls
  rules:
  - host: app.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
\`\`\`

## Secrets Management

### External Secrets Operator

Use external secret management systems:

\`\`\`yaml
# External secret configuration
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: default
spec:
  provider:
    vault:
      server: "https://vault.company.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "adhar-role"

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: database/credentials
      property: username
  - secretKey: password
    remoteRef:
      key: database/credentials
      property: password
\`\`\`

### Secret Rotation

Implement automatic secret rotation:

\`\`\`yaml
# Secret rotation policy
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: rotate-secrets
spec:
  background: true
  rules:
  - name: check-secret-age
    match:
      any:
      - resources:
          kinds:
          - Secret
    validate:
      message: "Secret is older than 90 days and should be rotated"
      pattern:
        metadata:
          creationTimestamp: ">90d"
\`\`\`

## Policy Enforcement

### Kyverno Security Policies

Implement comprehensive security policies:

\`\`\`yaml
# Require security context
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-security-context
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: check-security-context
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Security context is required"
      pattern:
        spec:
          securityContext:
            runAsNonRoot: "true"
          containers:
          - securityContext:
              allowPrivilegeEscalation: "false"
              readOnlyRootFilesystem: "true"
              capabilities:
                drop:
                - "ALL"

---
# Disallow privileged containers
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged
spec:
  validationFailureAction: enforce
  rules:
  - name: check-privileged
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Privileged containers are not allowed"
      pattern:
        spec:
          =(securityContext):
            =(privileged): "false"
          containers:
          - =(securityContext):
              =(privileged): "false"
\`\`\`

### Image Policy

Enforce trusted container images:

\`\`\`yaml
# Allow only trusted registries
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: enforce
  rules:
  - name: check-image-registry
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Images must come from approved registries"
      pattern:
        spec:
          containers:
          - image: "harbor.company.com/* | gcr.io/company/* | company.azurecr.io/*"
\`\`\`

## Monitoring and Auditing

### Audit Logging

Enable comprehensive audit logging:

\`\`\`yaml
# Audit policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets", "configmaps"]
- level: RequestResponse
  resources:
  - group: ""
    resources: ["pods", "services"]
  namespaces: ["production"]
- level: Request
  users: ["admin", "root"]
  verbs: ["create", "update", "patch", "delete"]
\`\`\`

### Security Monitoring

Set up security-focused monitoring:

\`\`\`yaml
# Falco security monitoring
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-config
data:
  falco.yaml: |
    rules_file:
      - /etc/falco/falco_rules.yaml
      - /etc/falco/k8s_audit_rules.yaml
    json_output: true
    json_include_output_property: true
    log_stderr: true
    log_syslog: false
    priority: debug
    buffered_outputs: true
    outputs:
      rate: 1
      max_burst: 1000
\`\`\`

## Backup and Disaster Recovery

### Backup Strategy

Implement secure backup procedures:

\`\`\`bash
#!/bin/bash
# Secure backup script

# Backup etcd with encryption
ETCDCTL_API=3 etcdctl snapshot save backup.db \\
  --endpoints=https://127.0.0.1:2379 \\
  --cacert=/opt/kubernetes/ssl/ca.pem \\
  --cert=/opt/kubernetes/ssl/kubernetes.pem \\
  --key=/opt/kubernetes/ssl/kubernetes-key.pem

# Encrypt backup
gpg --cipher-algo AES256 --compress-algo 1 --s2k-cipher-algo AES256 \\
    --s2k-digest-algo SHA512 --s2k-mode 3 --s2k-count 65011712 \\
    --force-mdc --quiet --no-greeting \\
    -r backup@company.com --encrypt backup.db

# Upload to secure storage
aws s3 cp backup.db.gpg s3://company-backups/kubernetes/ \\
  --sse AES256 --storage-class STANDARD_IA
\`\`\`

### Disaster Recovery Testing

Regular DR testing procedures:

\`\`\`yaml
# DR test automation
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dr-test
spec:
  schedule: "0 2 * * 0"  # Weekly
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: dr-test
            image: company/dr-test:latest
            command:
            - /bin/bash
            - -c
            - |
              # Test backup restoration
              ./test-restore.sh
              
              # Verify application functionality
              ./test-applications.sh
              
              # Generate DR report
              ./generate-report.sh
          restartPolicy: OnFailure
\`\`\`

## Compliance and Governance

### Compliance Reporting

Automated compliance checking: 

\`\`\`yaml
# OPA Gatekeeper constraint template
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        properties:
          labels:
            type: array
            items:
              type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        
        violation[{"msg": msg}] {
          required := input.parameters.labels
          provided := input.review.object.metadata.labels
          missing := required[_]
          not provided[missing]
          msg := sprintf("Missing required label: %v", [missing])
        }

---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: must-have-owner
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    labels: ["owner", "environment", "cost-center"]
\`\`\`

## Security Checklist

### Pre-Production Checklist

- [ ] **Authentication**
  - [ ] MFA enabled for all admin accounts
  - [ ] Service accounts use minimal permissions
  - [ ] Token rotation configured

- [ ] **Authorization**
  - [ ] RBAC policies implemented
  - [ ] Network policies in place
  - [ ] Pod Security Standards enforced

- [ ] **Container Security**
  - [ ] Images scanned for vulnerabilities
  - [ ] Security contexts configured
  - [ ] Resource limits set

- [ ] **Secrets Management**
  - [ ] External secrets operator configured
  - [ ] No hardcoded secrets in code
  - [ ] Secret rotation enabled

- [ ] **Network Security**
  - [ ] TLS certificates configured
  - [ ] Network segmentation implemented
  - [ ] Default deny policies active

- [ ] **Monitoring**
  - [ ] Audit logging enabled
  - [ ] Security monitoring configured
  - [ ] Alerting rules set up

- [ ] **Backup & Recovery**
  - [ ] Backup procedures tested
  - [ ] Disaster recovery plan documented
  - [ ] Recovery testing scheduled

### Ongoing Security Tasks

- [ ] **Weekly**
  - [ ] Review security alerts
  - [ ] Update vulnerability scanners
  - [ ] Rotate service credentials

- [ ] **Monthly**
  - [ ] Security policy review
  - [ ] Access audit
  - [ ] Penetration testing

- [ ] **Quarterly**
  - [ ] Security architecture review
  - [ ] Compliance assessment
  - [ ] Disaster recovery testing

## Security Tools Integration

### Third-Party Security Tools

\`\`\`yaml
# Integrate with external security tools
apiVersion: v1
kind: ConfigMap
metadata:
  name: security-integrations
data:
  tools.yaml: |
    siem:
      splunk:
        endpoint: https://splunk.company.com:8088
        token: "{{ .Values.splunk.token }}"
    vulnerability:
      snyk:
        api_token: "{{ .Values.snyk.token }}"
        org_id: "company-org"
    compliance:
      prisma_cloud:
        api_url: https://api.prismacloud.io
        access_key: "{{ .Values.prisma.accessKey }}"
\`\`\`

## Incident Response

### Security Incident Playbook

\`\`\`yaml
# Incident response automation
apiVersion: v1
kind: ConfigMap
metadata:
  name: incident-response
data:
  playbook.yaml: |
    incident_types:
      - name: "Unauthorized Access"
        severity: "HIGH"
        actions:
          - disable_user_accounts
          - rotate_compromised_credentials
          - increase_monitoring
          - notify_security_team
      - name: "Malicious Container"
        severity: "CRITICAL"
        actions:
          - quarantine_workload
          - collect_forensics
          - update_policies
          - incident_report
\`\`\`

For more detailed security guidance, refer to the [ADHAR Security Documentation](https://security.adhar.dev) and follow the [Cloud Native Security Best Practices](https://www.cncf.io/blog/2020/11/18/cloud-native-security-best-practices/).
