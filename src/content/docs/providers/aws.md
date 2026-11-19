---
title: "AWS"
section: "Cloud Providers"
order: 4
path: "/docs/providers/aws"
---

# AWS

Take an AWS account to a working Adhar platform on EC2. This page is for platform engineers on an AWS estate. You clear the organization and IAM prerequisites, raise one quota, delegate a Route 53 zone, write one config file and run `adhar up`. Then you learn how to check, scale, upgrade and tear the cluster down.

> **Status:** `status:in-progress` — the AWS provider is built and passes config validation and `adhar up --dry-run`, and it shares its kubeadm path with the other clouds, but it has not yet been proven end to end. Treat a first run as a bring-up exercise.

## At a glance

| | |
|---|---|
| **Provider key** | `aws` |
| **Status** | `status:in-progress` |
| **Default model** | EC2 + kubeadm (`clusterMode: compute`; Ubuntu 24.04, containerd, Cilium from the bootstrap) |
| **Other modes** | `managed` = EKS · `provided` = an existing cluster |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **Credentials** | `useEnvironment: true` (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`), or the default AWS credential chain (`AWS_PROFILE`, `~/.aws`, SSO, instance role) |
| **DNS / trusted TLS** | Route 53 DNS-01 wildcard; needs **static** keys |
| **Key quota** | EC2 vCPU `L-1216C47A`, sized for `maxWorkers` (44 vCPU for the shipped config) |
| **Default StorageClass** | `adhar-local` (node-local); `adhar-block` (gp3) is installed but not default |
| **Best for** | Teams standardized on AWS |

## Topology

```diagram
npb-aws-topology
```

The provider creates:

- one VPC, with a public subnet for the nodes and a private subnet tagged for internal load balancers (created, currently unused)
- an internet gateway with a `0.0.0.0/0` route through it
- one security group and one key pair
- the EC2 instances

Nodes take a public IP on launch, so there is no NAT gateway and no Elastic IP to pay for. The ELB or NLB in front of the Gateway is created later, by the cloud-controller-manager (CCM) inside the cluster. That is why teardown sweeps load balancers separately.

### The three identities

An Adhar cluster on AWS uses three AWS identities, not one. Most first-run failures happen when one is missing while the other two work.

```diagram
pv-aws-ownership
```

| # | Identity | Used by | Needs |
|---|---|---|---|
| 1 | Provisioning | `adhar up` on your machine | EC2, ELB, quota and STS calls. Never Route 53 |
| 2 | Node | The cloud-controller-manager and the EBS CSI driver | Reads `kube-system/aws-secret` |
| 3 | DNS | external-dns and the cert-manager DNS-01 solver | Route 53 record changes, from the `adhar-dns-provider` Secret |

**By default, identities 2 and 3 are copies of identity 1.** Adhar resolves the credential it provisioned with and writes it into both Secrets. On the kubeadm path it attaches no instance profile to the workers, so that Secret is the only credential identity 2 has. Until the cloud-controller-manager runs with it, every node keeps the `node.cloudprovider.kubernetes.io/uninitialized:NoSchedule` taint and nothing schedules.

> **Warning:** Use static access keys. If identity 1 is temporary (an SSO session or an instance role), Adhar copies the temporary credentials with a warning. They stop working when they expire, and the cert-manager Route 53 solver cannot use a session token at all, so trusted TLS never issues. A long-lived key pair for a dedicated IAM user, supplied through the environment, is the path that works end to end.

In managed mode, identity 2 is the `adhar-<cluster>-eks-node` role that Adhar creates and the managed node group carries.

## Prerequisites

Work through these in order. Each failure blocks everything after it.

| # | Prerequisite | Who fixes it | Fails as |
|---|---|---|---|
| 1 | No Service Control Policy denying EC2 | The organization's **management** account | `explicit deny in a service control policy` |
| 2 | Provisioning permissions on identity 1 | This account's IAM admin | `no identity-based policy allows …` |
| 3 | EC2 vCPU quota `L-1216C47A` at full cluster size | A support-case quota increase | `adhar up` refuses in preflight, naming the shortfall |
| 4 | A delegated Route 53 zone for `defaultHost` | You and your registrar | Self-signed certificates; the platform still runs |

You also need `adhar`, `kubectl`, `dig` and the `aws` CLI on your PATH. The platform stack is built into the binary, so `adhar up` works from any directory; there is no repository to clone. See [Installation](/docs/getting-started/installation) to install the CLI.

### Service Control Policies

A Service Control Policy (SCP) on the organization or OU can deny an action that `AdministratorAccess` allows. Nothing inside the member account can grant it back. The end of the error line tells the two cases apart:

| Phrase in the error | Means | Fixed by |
|---|---|---|
| `explicit deny in a service control policy` | An org-level block above IAM | The management account |
| `no identity-based policy allows` | A missing grant | This account's IAM admin |

While an SCP is being edited, calls can pass and then go back to denied. Check with a repeated sample, not one call:

```bash
for i in $(seq 1 30); do
  aws ec2 describe-availability-zones >/dev/null 2>&1 && printf . || printf D
  sleep 5
done; echo
```

**Check:** 30 dots. Any `D` means the policy is not stable yet.

### Provisioning permissions

This policy lists the API calls the provider makes. `AmazonEC2FullAccess` plus the ELB, quota and STS entries also works.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "NetworkAndCompute",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeRegions", "ec2:DescribeAvailabilityZones",
        "ec2:DescribeImages", "ec2:DescribeInstanceTypes", "ec2:DescribeInstanceTypeOfferings",
        "ec2:CreateVpc", "ec2:DeleteVpc", "ec2:DescribeVpcs", "ec2:ModifyVpcAttribute",
        "ec2:CreateSubnet", "ec2:DeleteSubnet", "ec2:DescribeSubnets", "ec2:ModifySubnetAttribute",
        "ec2:CreateInternetGateway", "ec2:DeleteInternetGateway", "ec2:DescribeInternetGateways",
        "ec2:AttachInternetGateway", "ec2:DetachInternetGateway",
        "ec2:CreateRoute", "ec2:DescribeRouteTables", "ec2:DeleteRouteTable",
        "ec2:CreateSecurityGroup", "ec2:DeleteSecurityGroup", "ec2:DescribeSecurityGroups",
        "ec2:AuthorizeSecurityGroupIngress", "ec2:RevokeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupEgress",
        "ec2:ImportKeyPair", "ec2:DeleteKeyPair", "ec2:DescribeKeyPairs",
        "ec2:RunInstances", "ec2:TerminateInstances", "ec2:DescribeInstances",
        "ec2:CreateVolume", "ec2:DeleteVolume", "ec2:DescribeVolumes",
        "ec2:CreateTags",
        "ec2:DescribeAddresses", "ec2:DisassociateAddress", "ec2:ReleaseAddress",
        "ec2:DescribeNetworkInterfaces", "ec2:DeleteNetworkInterface",
        "ec2:DescribeNatGateways", "ec2:DeleteNatGateway"
      ],
      "Resource": "*"
    },
    {
      "Sid": "LoadBalancerCleanup",
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:DescribeLoadBalancers", "elasticloadbalancing:DescribeTags",
        "elasticloadbalancing:DeleteLoadBalancer",
        "elasticloadbalancing:DescribeTargetGroups", "elasticloadbalancing:DeleteTargetGroup"
      ],
      "Resource": "*"
    },
    { "Sid": "QuotaPreflight", "Effect": "Allow", "Action": ["servicequotas:GetServiceQuota"], "Resource": "*" },
    { "Sid": "WhoAmI", "Effect": "Allow", "Action": ["sts:GetCallerIdentity"], "Resource": "*" }
  ]
}
```

The NAT and address entries exist only so teardown can remove resources that an in-cluster controller created. Managed mode (`clusterMode: managed`) also needs `eks:*` on the cluster and node groups, plus `iam:CreateRole`, `TagRole`, `GetRole`, `DeleteRole`, `AttachRolePolicy`, `DetachRolePolicy`, `ListAttachedRolePolicies` and `PassRole`.

> **Note:** A thin policy looks like a missing image. The first call it denies is usually `ec2:DescribeImages`, which surfaces as "no AMI found", not as a permissions error.

**Check:**

```bash
aws sts get-caller-identity          # the identity you expect
aws ec2 run-instances --image-id <ami-id> --instance-type r6i.xlarge --dry-run
```

The second command must fail with `DryRunOperation` (allowed), not `UnauthorizedOperation`. Use a real AMI ID from your region; a made-up one fails on the ID before the permission check.

### vCPU quota

`L-1216C47A` is *Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances*. It counts **vCPUs, not instances**, and a new account often starts at 5. Size it for `maxWorkers`. The shipped `examples/aws-config.yaml` runs one `m6i.xlarge` control plane plus up to ten `r6i.xlarge` workers: 4 + (10 × 4) = **44 vCPU**. A lower `maxWorkers` needs less. Raising the quota takes a support case.

```bash
aws service-quotas get-service-quota --service-code ec2 --quota-code L-1216C47A \
  --query 'Quota.Value' --output text --region ap-southeast-1
```

**Check:** the value is at least 44 for the shipped config.

Elastic IP, NAT gateway and load balancer quotas are not pre-checked. If the identity cannot call `servicequotas:GetServiceQuota`, the vCPU check only warns and the run continues, so grant it.

### Route 53 zone

`globalSettings.defaultHost` drives every URL and the wildcard certificate. It must be a subdomain delegated to a Route 53 **public** hosted zone. Adhar never creates the zone.

```bash
aws route53 create-hosted-zone --name platform.example.com \
  --caller-reference "adhar-$(date +%s)" --query 'HostedZone.Id' --output text
aws route53 get-hosted-zone --id <zone-id> \
  --query 'DelegationSet.NameServers' --output text
```

At your registrar, add four NS records named `platform` in the `example.com` zone, with those values. The apex stays where it is.

Identity 3 needs `route53:ChangeResourceRecordSets`, `route53:ListHostedZonesByName` and `route53:GetChange` on that zone, as static keys.

**Check:**

```bash
dig +short NS platform.example.com      # the four Route 53 nameservers
dig +short NS example.com               # your registrar's, unchanged
dig +noall +comment CAA example.com     # status: NOERROR — an empty answer is correct
```

> **Warning:** Delegate the subdomain, not the whole domain, unless you also host the apex zone in Route 53. Let's Encrypt reads CAA records up the tree, so issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers holding no zone for it, the order fails with a message naming CAA, while every app still resolves.

You can skip DNS. The platform comes up self-signed, and cert-manager issues a trusted certificate once the delegation is fixed.

## Configure

Export static keys. The same keys then serve all three identities:

```bash
export AWS_ACCESS_KEY_ID="<access-key-id>" AWS_SECRET_ACCESS_KEY="<secret-access-key>"
aws sts get-caller-identity     # prints the IAM user you expect
```

Without `useEnvironment`, Adhar falls back to the default AWS credential chain: environment variables, `AWS_PROFILE` and `~/.aws`, SSO, then an instance role. That works for provisioning, but see the warning about temporary credentials above. Do not put keys in the config file (`accessKeyId` / `secretAccessKey` are accepted): the file gets committed.

Start from the shipped example, then change `defaultHost`, `email` and `region`:

```bash
cp examples/aws-config.yaml config.yaml
```

```yaml
apiVersion: v1alpha1
kind: Config

globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com    # your delegated Route 53 zone
  defaultHttpPort: 80
  defaultHttpsPort: 443                # a real load balancer fronts the cloud path
  enableHAMode: false                  # platform HA (ArgoCD, redis, CNPG replicas), not control-plane HA
  email: admin@example.com             # Let's Encrypt expiry notices
  dnsProvider: aws                     # Route 53 for external-dns + DNS-01; `none` = self-signed

providers:
  aws:
    type: aws
    region: ap-southeast-1
    primary: true                      # only AWS's Crossplane providers install
    useEnvironment: true               # AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (+ AWS_SESSION_TOKEN)
    clusterMode: compute               # EC2 + kubeadm; `managed` = EKS; `provided` = existing cluster
    vpcConfig:                         # recorded only: these are the fixed CIDRs the provider uses
      cidr: 10.0.0.0/16
      subnetCidrs:
        - 10.0.1.0/24                  # public subnet: the nodes
        - 10.0.2.0/24                  # private subnet: tagged, unused by nodes

environmentTemplates:
  dev-defaults:
    clusterConfig:
      - { key: autoScale, value: "true" }
    coreServices:                      # may not be empty; the chart pin is recorded, otherwise inert
      cilium:
        chart: { repoURL: https://helm.cilium.io/, name: cilium, version: 1.15.7 }

environments:                          # dev, test and prod as namespaces on ONE cluster
  dev:
    isolation: namespace
    type: non-production
    provider: aws
    region: ap-southeast-1
    template: dev-defaults
    clusterConfig:
      - { key: name,                    value: adhar-dev }
      - { key: machineType,             value: r6i.xlarge }   # workers: 4 vCPU / 32 GiB
      - { key: controlPlaneMachineType, value: m6i.xlarge }   # 4 vCPU / 16 GiB
      - { key: nodeCount,               value: "2" }          # workers at creation
      - { key: diskSizeGb,              value: "256" }        # root volume of every node
      - { key: diskType,                value: gp3 }
      # - { key: ami,               value: <ami-id> }            # pin exactly; skips AMI discovery
      # - { key: imageNameFilter,   value: "my/hardened-*" }     # a private or hardened base image
      # - { key: imageOwner,        value: "<account-id>" }      # whose images to search
      # - { key: imageArchitecture, value: arm64 }               # pair with a Graviton machineType
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 10 }
  # test: identical to dev except name: adhar-test
  # prod: identical to dev except name: adhar-prod and type: production
```

The example spells out `test` and `prod` in full.

### Key fields

| Field | Meaning |
|---|---|
| `clusterMode` | `compute`, `managed` or `provided`. `clusterMode: eks` and the removed `useManagedK8s` are **rejected** with a message naming `managed`. |
| `machineType`, `nodeCount`, `kubeVersion` | Matched ignoring case and separators, so `machineType` and `machine_type` are one key. `controlPlaneMachineType` and `name` must be spelled exactly as shown. |
| `diskSizeGb`, `diskType`, `ami`, `imageNameFilter`, `imageOwner`, `imageArchitecture` | Node overrides. They are read from the environment's `clusterConfig` only; the loader drops them at provider level. The root volume defaults to 256 GiB gp3. |
| `ami` | Pin it for anything reproducible. The default is the newest Ubuntu 24.04 LTS AMI that Canonical publishes for x86_64 in the region, so two runs can boot different images. |
| `vpcConfig` | Recorded but not read. The VPC is always `10.0.0.0/16` with subnets `10.0.1.0/24` and `10.0.2.0/24`, so two AWS clusters cannot be meshed on different ranges. |
| `useInstanceProfile`, `roleArn` / `externalId`, `profile`, `credentialsFile` | Not read from `config.yaml` (assume-role is not implemented). For a named profile, `export AWS_PROFILE=<name>`. |

### Node sizing

| Node | Size | Why |
|---|---|---|
| Control plane | 4 vCPU / 16 GiB (`m6i.xlarge`) | The platform's CRD count makes a smaller API server unstable. Burstable types (`t3.*`) throttle etcd in ways that look like a network fault. |
| Workers | 4 vCPU / 32 GiB (`r6i.xlarge`), at least two | With node-local storage as the default, memory per worker is the binding limit, and vCPU is the unit the quota counts. Two is the floor; the autoscaler adds more during the first sync. |
| Root volume | 256 GiB gp3 | The containerd image cache and every node-local PersistentVolume share this disk. Too small, and the kubelet takes a `disk-pressure:NoSchedule` taint that looks like a CPU shortage. |

### Dry run

```bash
adhar up -f config.yaml --env dev --dry-run
```

`--dry-run` resolves the configuration and prints the environment, provider, region, type and merged `clusterConfig`. It creates nothing and **checks no permissions, quota or DNS**, so it passes on an account that cannot create a single resource. Use it to catch schema mistakes.

## Deploy

```bash
adhar up -f config.yaml --env dev
```

```diagram
npb-aws-sequence
```

The preflight runs before any create call. A `✖` line stops the run and names the limit and the remedy. Passing checks fold into the `Preflight ✓` stage; `--verbose` prints them:

```text
preflight ● EC2 permissions: all 13 required actions permitted
            (reads and dry-run writes)
preflight ● EC2 vCPU quota: 64 vCPU limit, 44 needed at full size
preflight ● instance type r6i.xlarge: offered in 3 zone(s):
            ap-southeast-1a, ap-southeast-1b, ap-southeast-1c
preflight ● ELB access (needed by teardown): load balancers are listable
```

Then the CLI draws the same checklist as on every cloud:

```terminal
$ adhar up -f config.yaml --env dev

  Provisioning Adhar Platform
  ✓  Preflight
  ⠋  Cloud cluster  adhar · aws · ap-southeast-1 — creating machines
  ○  Kubeconfig & TLS
  ○  Cilium & Gateway
  ○  ArgoCD
  ○  Gitea
  ○  GitOps repos
  ○  Crossplane
  ○  GitOps sync - platform stack
```

After the first nodes join, compute mode installs these over SSH on the control plane:

- the `aws-cloud-controller-manager` chart
- the `aws-ebs-csi-driver` chart, reading `kube-system/aws-secret`
- the `adhar-block` gp3 StorageClass (the chart also adds a non-default `gp3` class)
- the CSI startup-taint toleration

The CLI finishes with a panel of platform URLs and warns if TLS is still self-signed. **The catalogue keeps converging after the CLI returns**, and the autoscaler adds workers while it does. `--apps-timeout` (default 45m on a cloud) limits only how long the CLI waits; ArgoCD keeps going either way.

> **Note:** Without `--env`, `adhar up -f config.yaml` builds **one** cluster for every `isolation: namespace` environment, sized from the production-type environment, and creates the `dev`, `test` and `prod` namespaces on it. Each `isolation: cluster` environment gets a cluster of its own.

## Verify

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig     # or: kubectl config use-context adhar
kubectl get nodes                                        # all Ready, none tainted uninitialized
kubectl -n kube-system get pods | grep -E 'cloud-controller|ebs-csi'
kubectl -n adhar-system get gateway adhar-gateway        # ADDRESS = the ELB/NLB hostname
kubectl -n adhar-system get certificate adhar-cert       # READY True once DNS-01 completes
adhar get status                                       # platform + per-package health
```

If a node still carries `node.cloudprovider.kubernetes.io/uninitialized`, identity 2 has no working credential. See [Troubleshooting](#troubleshooting).

## Access

Log in at `https://console.<defaultHost>`. Get credentials with:

```bash
adhar get secrets              # all platform credentials
adhar get secrets -p argocd    # one package
```

Your username is your email address, not a short name. For SSO, kubeconfig access and group-to-role mapping, see [Accessing the Platform](/docs/operations/accessing-the-platform).

## Operate

Always pass `--file` to `adhar cluster` commands. The cluster is named `adhar` unless you passed `--name` to `adhar up`; `clusterConfig.name` is not the cluster name.

```bash
adhar cluster list --file config.yaml
```

### Scale

```bash
adhar cluster scale adhar --workers 4 -p aws -f config.yaml
```

With autoscaling on, the worker count moves between `minWorkers` and `maxWorkers` on its own. Raise `autoscaling.maxWorkers`, and the vCPU quota with it, before you enable more of the catalogue.

### Upgrade

```bash
adhar upgrade --name dev --diff-only                               # preview the stack diff
adhar upgrade --name dev --yes                                     # converge foundation + stack
adhar cluster upgrade adhar --version 1.37.2 -p aws -f config.yaml # Kubernetes itself
```

On a cloud cluster the `AdharPlatform` resource is named after the environment you provisioned (`dev` here). `adhar upgrade` looks for one named `adhar` unless you pass `--name`. Find the name with `kubectl -n adhar-system get adharplatform`.

### Managed EKS

```yaml
providers:
  aws:
    type: aws
    clusterMode: managed     # EKS instead of EC2 + kubeadm
```

Managed mode creates the same VPC, subnets and security group, then:

- two IAM roles, `adhar-<cluster>-eks-cluster` and `adhar-<cluster>-eks-node`
- the EKS control plane
- one managed node group per node group
- the `aws-ebs-csi-driver` addon

The kubeconfig authenticates through `aws eks get-token`, so the `aws` CLI must be on PATH wherever the kubeconfig is used. EKS adds a control-plane charge, and the Adhar node autoscaler cannot add workers to a managed node group.

### Tear down

```bash
adhar down -f config.yaml --env dev
adhar down -f config.yaml --env dev --purge-orphaned-volumes
```

`adhar down` shows what it will delete and asks you to type `yes` (skip with `--force`). Point it at the same config file you used for `up`. With any other file it prints `Nothing was deleted.` and names the providers it searched.

> **Warning:** `--env dev` removes the whole cluster. With `isolation: namespace`, `dev`, `test` and `prod` share the one cluster `adhar`, so tearing down any of them deletes all three. If you passed `--name` to `adhar up`, pass the same `--name` to `adhar down`.

| Created by | Resource | Removed by teardown |
|---|---|---|
| Provider | Instances, ENIs, EIPs, NAT gateways, route tables, security groups, subnets, IGW, VPC, key pair | Yes, in dependency order |
| Cloud-controller-manager | One load balancer per `LoadBalancer` Service: classic ELB or NLB | Yes |
| Load-balancer controller | Target groups, the `k8s-elb-*` security group | Yes |
| Anything | Unattached volumes tagged for this cluster | Yes |
| EBS CSI driver | Unattached volumes with **no** cluster tag | Only with `--purge-orphaned-volumes` |
| Anything | A resource tagged for two clusters (`shared`) | Never |

The EBS CSI driver is installed without a cluster tag, so its `adhar-block` volumes normally fall in the fifth row. Pass `--purge-orphaned-volumes` if you used `adhar-block`, or check for leftovers afterwards.

The load-balancer sweep runs before the security-group, subnet and VPC steps. An ELB holds a reference to the VPC; if one is left behind, the VPC delete fails with `DependencyViolation`.

**Check** that nothing is still billing:

```bash
R=ap-southeast-1
aws ec2 describe-instances --region $R --filters Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].InstanceId' --output text
aws elbv2 describe-load-balancers --region $R --query 'LoadBalancers[].LoadBalancerName' --output text
aws elb describe-load-balancers --region $R --query 'LoadBalancerDescriptions[].LoadBalancerName' --output text
aws ec2 describe-volumes --region $R --filters Name=status,Values=available \
  --query 'Volumes[].VolumeId' --output text
```

### Cost

While the cluster runs you pay for:

- node hours: `maxWorkers` is your spend ceiling as much as your quota ceiling
- one load balancer per `LoadBalancer` Service
- each node's root volume, plus one EBS volume per `adhar-block` PersistentVolume

Node-local volumes cost nothing extra. Adhar creates no NAT gateway, so there are no NAT hours. EKS adds a control-plane charge.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `explicit deny in a service control policy` | An org-level SCP above IAM | Amend it from the **management** account; IAM changes in this account do nothing |
| "no AMI found" | `ec2:DescribeImages` is denied | Add the read permissions; it is not an image problem |
| Preflight `✖ EC2 vCPU quota` | The quota is sized for the starting node count | Raise `L-1216C47A` to cover `maxWorkers` (44 for the example) |
| `clusterMode "eks" names a cloud service` | An old config spelling | `clusterMode: managed` |
| Every pod `Pending`; nodes keep `…/uninitialized` | The cloud-controller-manager has no working credential (identity 2), often expired temporary credentials | Provision with static keys (`useEnvironment: true`); check `kube-system/aws-secret` |
| A setting on the provider block has no effect | The loader drops provider-level keys it does not know (`ami`, `diskSizeGb`, `useInstanceProfile`, `roleArn`, …) | Put node overrides in the environment's `clusterConfig`; use `AWS_PROFILE` for profiles |
| Order fails with `SERVFAIL looking up CAA` | The apex is delegated to nameservers holding no zone | Delegate only the platform label |
| Trusted TLS never issues although provisioning works | Adhar provisioned with an instance role or SSO session, so DNS-01 got temporary credentials | Use static keys; Route 53 DNS-01 needs them |
| Pods `Pending` with `exceed max volume count` | More `adhar-block` claims than the instances' EBS attach budget | Add workers, or move the workload to `adhar-local` |
| Node tainted `disk-pressure` soon after boot | The root volume is too small for the image cache plus node-local volumes | `diskSizeGb: "256"` in the environment's `clusterConfig` |
| `down` says `Nothing was deleted.` | The config file does not define the provider that built the cluster | Use the file you ran `up` with |

## Next steps

- [Providers Overview](/docs/providers/overview) — the shared model, storage classes and the comparison table
- [Accessing the Platform](/docs/operations/accessing-the-platform) — SSO, kubeconfig and platform identity
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Troubleshooting](/docs/reference/troubleshooting) — autoscaler and volume failures
