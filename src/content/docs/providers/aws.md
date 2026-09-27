---
title: "AWS"
section: "Cloud Providers"
order: 4
path: "/docs/providers/aws"
---

# AWS

Run Adhar on AWS with EC2 instances + kubeadm (default) or managed **EKS** (opt-in).

## At a glance

| | |
|---|---|
| **Provider key** | `aws` |
| **Default model** | EC2 + kubeadm |
| **Managed option** | EKS (`useManagedK8s: true` / `clusterMode: eks`) |
| **Credentials** | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (5 auth methods) |
| **DNS / trusted TLS** | Route 53 + DNS-01 wildcard ✅ (needs static keys) |
| **Key quota** | EC2 vCPU `L-1216C47A` ≥ 56 for the shipped config |
| **Verification** | ⚙️ Render-verified |
| **Best for** | Teams standardized on AWS |

## Prerequisites (in order)

1. **No Service Control Policy denying EC2** (management-account concern).
2. **IAM permissions** on the key: EC2 (VPC/subnet/gateway/route-table/SG/keypair/instance/volume), ELB describe+delete, `servicequotas:GetServiceQuota`, `sts:GetCallerIdentity` — or `AmazonEC2FullAccess` + ELB + quota.
3. **EC2 vCPU quota** `L-1216C47A` ("Running On-Demand Standard instances", counts vCPUs) sized for `maxWorkers` — the shipped config needs **56 vCPU** (new accounts start at 5).
4. A delegated **Route 53 zone** for `defaultHost` (optional; runs on self-signed otherwise). Route 53 DNS-01 needs **static** `accessKeyId` + `secretAccessKey`.

```bash
export AWS_ACCESS_KEY_ID="…"
export AWS_SECRET_ACCESS_KEY="…"
export AWS_SESSION_TOKEN="…"     # only for temporary credentials
```

## Configuration

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: true
  email: admin@example.com

providers:
  aws:
    type: aws
    region: us-east-1
    primary: true
    useEnvironment: true
    config:
      cidr: 10.4.0.0/16                 # VPC range
      # ami: ami-0123456789abcdef0        # pin exactly; skips discovery
      # imageArchitecture: arm64

environmentTemplates:
  nonprod-defaults:
    clusterConfig:
      - key: autoScale
        value: "true"
    coreServices:
      cilium:
        chart:
          repoURL: https://helm.cilium.io/
          name: cilium
          version: 1.15.7

environments:
  dev:
    type: non-production
    provider: aws
    template: nonprod-defaults
    clusterConfig:
      - { key: name,      value: adhar-mgmt }
      - { key: nodeSize,  value: m6i.2xlarge }    # 8 vCPU / 32 GiB
      - { key: nodeCount, value: "3" }
    autoscaling:
      enabled: true
      minWorkers: 3
      maxWorkers: 10
```

Node image defaults to the newest Ubuntu 24.04 LTS x86_64 AMI, discovered per region. Pin `ami` for reproducibility.

### Managed EKS

```yaml
providers:
  aws:
    type: aws
    useManagedK8s: true      # or clusterMode: eks
```

EKS needs extra IAM (`eks:*` on clusters/node groups plus `iam:CreateRole/GetRole/DeleteRole/AttachRolePolicy/DetachRolePolicy/ListAttachedRolePolicies/PassRole`) and the `aws` CLI on your PATH (for `aws eks get-token`). It creates roles `adhar-<cluster>-eks-cluster` and `adhar-<cluster>-eks-node`.

## Provision

```bash
export AWS_ACCESS_KEY_ID="…" AWS_SECRET_ACCESS_KEY="…"
./adhar up -f config.aws.yaml --env dev --dry-run   # config only, no spend
./adhar up -f config.aws.yaml --env dev             # ~25–40 min on a first run
```

## Access

```bash
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
./adhar get status
```

## Tear down

```bash
./adhar down -f config.aws.yaml --env dev
./adhar down -f config.aws.yaml --env dev --purge-orphaned-volumes
```

Sweeps instances/ENIs/EIPs/NAT/route-tables/SGs/subnets/IGW/VPC/key pair, CCM load balancers (classic ELB **and** NLB), target groups + `k8s-elb-*` SG, and EBS volumes. The LB sweep runs before SG/subnet/VPC steps to avoid `DependencyViolation`.

## Notes & gotchas

- `--dry-run` does **not** check permissions, quota, or DNS.
- Distinguish `explicit deny in a service control policy` (management account) from `no identity-based policy allows` (this account's IAM).
- The first denied call is usually `ec2:DescribeImages`, surfacing as "no AMI found".
- NAT gateways/EIPs are never created (nodes sit in a public subnet); watch per-instance EBS attach limits.
- Point `down` at the same config file you used for `up`.
