
# Quick Start Guide

Get up and running with ADHAR in 5 minutes.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- Docker Desktop running
- kubectl configured
- Helm 3+ installed

## Installation

### 1. Install ADHAR CLI

```bash
npm install -g @adhar/cli
```

### 2. Initialize Your Project

```bash
adhar init my-project
cd my-project
```

### 3. Configure Your Environment

```bash
# Set up your cloud provider credentials
adhar config set --provider aws
adhar config set --region us-west-2
```

### 4. Deploy Your First Application

```bash
# Create a new service
adhar generate service user-api

# Deploy to development
adhar deploy --env dev
```

## Next Steps

- [Configure integrations](../integrations/argocd-setup)
- [Set up monitoring](../operations/monitoring-observability)
- [Learn about the 6 D's framework](/docs/core-concepts/ds-framework)

## Troubleshooting

If you encounter issues:

1. Check your cluster connectivity: `kubectl cluster-info`
2. Verify ADHAR installation: `adhar version`
3. Review logs: `adhar logs --tail 50`

For more help, visit our [troubleshooting guide](../operations/troubleshooting).
