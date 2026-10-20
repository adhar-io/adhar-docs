---
title: "AWS"
section: "Cloud Providers"
order: 4
path: "/docs/providers/aws"
---

# AWS

This page takes you from an AWS account to a working Adhar platform on EC2. It covers organization policies, IAM, quota, Route 53, a complete config file, `adhar up`, verification and a clean teardown. It is for platform engineers on an AWS estate.

Know one thing before you start: **an Adhar cluster on AWS uses three separate AWS identities, not one.** Most first-run failures happen when one of the three is missing while the other two work.

> **Status: render-verified, not live-verified.** Provider registration, config validation and `adhar up --dry-run` pass. The kubeadm path (node prep, join, drain, scale, CCM, CSI, upgrade) is shared with the live-verified DigitalOcean provider. **No full run on AWS has been completed.** Treat a first run as a bring-up exercise. The repository's runbook plans for **~25–40 minutes** on a first run. That is an estimate, not a measurement.

## At a glance

| | |
|---|---|
| **Provider key** | `aws` |
| **Default model** | EC2 + kubeadm (`clusterMode: compute`; Ubuntu 24.04, containerd, Cilium from the bootstrap) |
| **Other modes** | `managed` = EKS · `provided` = an existing cluster |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **Provisioning credentials** | 5 methods; prefer `useInstanceProfile: true` (instance profile / IRSA) where Adhar runs on AWS |
| **DNS / trusted TLS** | Route 53 DNS-01 wildcard, and it needs **static** keys |
| **Key quota** | EC2 vCPU `L-1216C47A`, sized for `maxWorkers` (22 vCPU for the shipped config) |
| **Default StorageClass** | `adhar-local` (node-local); `adhar-block` gp3 is installed but not default |
| **Verification** | Render-verified |
| **Time to usable** | Unmeasured; ~25–40 min first-run estimate |
| **Best for** | Teams standardized on AWS |

## What gets built

```diagram
dp-aws-topology
```

The provider creates:

- one VPC, with a public subnet for the nodes and a private subnet tagged for internal load balancers (created, currently unused)
- an internet gateway **with a `0.0.0.0/0` route through it**
- one security group
- a key pair
- the instances

Nodes take a public IP on launch, so there is **no NAT gateway and no Elastic IP** to pay for. The ELB or NLB in front of the Gateway comes later. The cloud-controller-manager inside the cluster creates it. That is why teardown sweeps load balancers separately.

## The three identities

```diagram
pv-aws-ownership
```

Identity 1 never calls Route 53. DNS is entirely an in-cluster concern.

Identity 2 is what makes nodes usable. Until the cloud-controller-manager runs, every node keeps the `node.cloudprovider.kubernetes.io/uninitialized:NoSchedule` taint, and nothing schedules.

**Prefer an instance profile or IRSA for identity 1** when `adhar` itself runs on AWS. With `useInstanceProfile: true`, Adhar takes short-lived credentials from the instance metadata service (or the IRSA web-identity token). You no longer store and rotate a key pair. The flag also stops Adhar writing `kube-system/aws-secret`, so no long-lived key lands inside the cluster.

The trade-off is explicit. On the kubeadm path, Adhar does **not** attach an instance profile to the workers it creates. So with the flag on, you must attach a node role yourself, or identity 2 has nothing to authenticate with. Managed mode closes that gap: Adhar creates `adhar-<cluster>-eks-node`, and the managed node group carries it.

Identity 3 has no workload-identity option today. The cert-manager Route 53 solver reads `accessKeyId` and `secretAccessKey` from a Secret. So an instance profile or SSO session is not enough here, even though provisioning works fine with one.

## Step 1 — Prerequisites, in order

Work through these in order. Each failure blocks everything after it. If you check DNS first and the organization last, a bring-up can get abandoned twice before anyone looks at the real blocker.

| # | Prerequisite | Who fixes it | Fails as |
|---|---|---|---|
| 1 | No Service Control Policy denying EC2 | The organization's **management** account | `explicit deny in a service control policy` |
| 2 | Provisioning permissions on identity 1 | This account's IAM admin | `no identity-based policy allows …` |
| 3 | EC2 vCPU quota `L-1216C47A` at full cluster size | A support-case quota increase | `adhar up` refuses in preflight, naming the shortfall |
| 4 | A delegated Route 53 zone for `defaultHost` | You plus your registrar | Self-signed certificates; the platform still runs |

You also need local tooling: `adhar` built from the repository (`make build`), `kubectl`, `dig`, and the `aws` CLI. The checks below use the `aws` CLI. It must also be on PATH wherever an EKS kubeconfig is used.

### 1. Clear the Service Control Policies

An identity policy is a ceiling, not a guarantee. A Service Control Policy (SCP) on the organization or OU can deny an action that `AdministratorAccess` allows. Nothing inside the member account can grant it back. The result looks like an IAM problem, especially because the phrase that tells them apart sits at the very end of a long error line:

| Phrase in the error | Means | Fixed by |
|---|---|---|
| `explicit deny in a service control policy` | An org-level block above IAM | The management account |
| `no identity-based policy allows` | A missing grant | This account's IAM admin |

**Verify with a repeated sample, never one call.** While an SCP is being edited, calls pass briefly and then go back to denied. One real attempt measured a clean batch, then 12 denials, then another clean batch, then 30:

```bash
for i in $(seq 1 30); do
  aws ec2 describe-availability-zones >/dev/null 2>&1 && printf . || printf D
  sleep 5
done; echo
# 30 dots = stable. Any D = not ready, whatever a single call just told you.
```

### 2. Grant the provisioning permissions

This policy comes from the API calls the provider actually makes. `AmazonEC2FullAccess` plus the ELB, quota and STS entries also works.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "NetworkAndCompute",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeRegions", "ec2:DescribeAvailabilityZones",
        "ec2:DescribeImages", "ec2:DescribeInstanceTypes",
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

The NAT and address entries exist only so teardown can remove one that an in-cluster controller created. Add these only for the modes you use:

| Mode | Extra permissions |
|---|---|
| `clusterMode: managed` (EKS) | `eks:*` on the cluster and node groups, plus `iam:CreateRole`, `GetRole`, `DeleteRole`, `AttachRolePolicy`, `DetachRolePolicy`, `ListAttachedRolePolicies`, `PassRole` |
| `roleArn` (assume-role) | `sts:AssumeRole` on that role |

> **A thin policy looks like a missing image.** The first call it denies is usually `ec2:DescribeImages`. That shows up as "no AMI found", not as a permissions error.

**Verify:**

- `aws sts get-caller-identity` prints the identity you expect.
- `aws ec2 run-instances --image-id ami-0abcdef1234567890 --instance-type r6i.xlarge --dry-run` fails with `DryRunOperation` (allowed), not `UnauthorizedOperation`.

### 3. Raise the vCPU quota to cover the whole cluster

`L-1216C47A` is *Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances*. It counts **vCPUs, not instances**. Size it for `maxWorkers`. The shipped `examples/aws-config.yaml` runs one `r6i.large` control plane plus up to five `r6i.xlarge` workers: 2 + (5 × 4) = **22 vCPU**. New accounts often start at 5, which is one node. Raising it takes a support case; it is not instant.

```bash
aws service-quotas get-service-quota --service-code ec2 --quota-code L-1216C47A \
  --query 'Quota.Value' --output text --region ap-southeast-1      # must be ≥ 22
```

Elastic IPs, NAT gateways and load balancers also have per-region quotas. These are **not** pre-checked.

### 4. Delegate a Route 53 zone

`globalSettings.defaultHost` drives every URL and the wildcard certificate. It must be a subdomain delegated to a Route 53 **public** hosted zone. Adhar never creates the zone.

```bash
aws route53 create-hosted-zone --name platform.example.com \
  --caller-reference "adhar-$(date +%s)" --query 'HostedZone.Id' --output text
aws route53 get-hosted-zone --id Z0123456789ABC \
  --query 'DelegationSet.NameServers' --output text
```

At your registrar, add **four NS records named `platform`** in the `example.com` zone, with those values. The apex stays where it is.

Identity 3 needs `route53:ChangeResourceRecordSets`, `route53:ListHostedZonesByName` and `route53:GetChange` on that zone, as **static** keys.

**Verify:**

```bash
dig +short NS platform.example.com      # the four Route 53 nameservers
dig +short NS example.com               # your registrar's, unchanged
dig +noall +comment CAA example.com     # status: NOERROR — an empty answer is correct
```

> **Do not delegate the whole registered domain unless you also host its apex zone in Route 53.** Let's Encrypt reads CAA records up the tree. So issuing `*.platform.example.com` also queries CAA for `example.com`. If the apex is delegated to nameservers that hold no zone, every lookup SERVFAILs. The order then fails with a message that names CAA, not delegation. You can skip DNS entirely. The platform comes up self-signed, and cert-manager issues a trusted certificate once the delegation is fixed.

## Step 2 — Credentials

Pick one of the five methods on the provider block. The shipped example uses environment variables:

```yaml
providers:
  aws:
    useEnvironment: true        # AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (+ AWS_SESSION_TOKEN)
    # profile: my-profile       # a named profile from ~/.aws/credentials
    # credentialsFile: /path/to/credentials
    # roleArn: arn:aws:iam::123456789012:role/AdharProvisioner
    # externalId: …             # paired with roleArn
    # useInstanceProfile: true  # EC2 instance profile / IRSA — no key stored
```

```bash
export AWS_ACCESS_KEY_ID="…" AWS_SECRET_ACCESS_KEY="…"
```

Never put keys in the config file. It gets committed, and a key in Git is a key you have to rotate.

## Step 3 — Write the configuration

```bash
cp examples/aws-config.yaml config.yaml    # then change defaultHost, email, region
```

The shipped file, annotated:

```yaml
apiVersion: v1alpha1
kind: Config

globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com    # YOUR delegated Route 53 zone
  defaultHttpPort: 80
  defaultHttpsPort: 443                # a real LB fronts the cloud path; no :8443
  enableHAMode: false                  # platform HA (ArgoCD/redis/CNPG replicas), not control-plane HA
  email: admin@example.com             # Let's Encrypt expiry notices
  dnsProvider: aws                     # Route 53 for external-dns + DNS-01; `none` = self-signed

providers:
  aws:
    type: aws
    region: ap-southeast-1
    primary: true                      # only AWS's Crossplane providers install
    useEnvironment: true               # Step 2
    clusterMode: compute               # EC2 + kubeadm; `managed` = EKS; `provided` = existing cluster
    # ami: ami-0123456789abcdef0       # pin exactly; skips AMI discovery
    # imageNameFilter: "my/hardened-*" # a private or hardened base image
    # imageOwner: "111122223333"       # whose images to search
    # imageArchitecture: arm64         # pair with a Graviton machineType
    # diskSizeGb: 256                  # root volume; 256 GiB gp3 is the default
    vpcConfig:
      cidr: 10.0.0.0/16                # must not overlap the pod CIDR (10.244.0.0/16)
      subnetCidrs:
        - 10.0.1.0/24                  # public subnet — the nodes
        - 10.0.2.0/24                  # private subnet — tagged, unused by nodes

environmentTemplates:
  dev-defaults:
    clusterConfig:
      - { key: autoScale, value: "true" }
    coreServices:                      # may not be empty; chart pin is recorded, otherwise inert
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
      - { key: controlPlaneMachineType, value: r6i.large }    # 2 vCPU / 16 GiB
      - { key: nodeCount,               value: "2" }          # workers at creation
      - { key: diskSizeGb,              value: "256" }
      - { key: diskType,                value: gp3 }
    autoscaling: { enabled: true, minWorkers: 2, maxWorkers: 5 }
  # test: identical to dev except name: adhar-test
  # prod: identical to dev except name: adhar-prod and type: production
```

The example spells out `test` and `prod` in full. They differ from `dev` only as noted. Worth knowing:

- `clusterConfig` keys match ignoring case and separators. So `machineType`, `machine_type` and `MACHINE_TYPE` are one key.
- **Root volume size comes from the provider block** (`diskSizeGb`, `diskType`). It defaults to 256 GiB gp3, the same values the example also records in `clusterConfig`.
- **Pin `ami` for anything reproducible.** The default is the newest Ubuntu 24.04 LTS (noble) AMI that Canonical publishes for x86_64, looked up per region. So two runs a week apart can boot different images.
- `clusterMode: eks` and `useManagedK8s: true` are **rejected** with a message naming the replacement.

### Node sizing, from measurement

- **Workers: memory first, vCPU second.** With `adhar-local` as the default StorageClass, the binding limit is memory per worker, not attach slots. So 4 vCPU / 32 GiB (`r6i.xlarge`) beats 8 vCPU / 32 GiB at the same memory, and vCPU is the unit the quota counts. Two workers is the floor, not a working size. Expect the autoscaler to add nodes during the first sync.
- **Control plane: 2 vCPU / 16 GiB.** Burstable types (`t3.medium`) throttle etcd in ways that look like a network fault. `m6i.large` has the CPU but not the memory: during the first sync of 75 applications, the API server began failing TLS handshakes.
- **Root volumes: 256 GiB gp3.** The containerd image cache (~35 GiB) and every node-local PersistentVolume share this disk. If it is too small, the kubelet takes a `disk-pressure:NoSchedule` taint, which looks exactly like a CPU shortage.

## Step 4 — Dry run

```bash
./adhar up -f config.yaml --env dev --dry-run
```

This resolves the configuration. It prints the environment, provider, region, type and the merged `clusterConfig`. It checks **no** permissions, quota or DNS, so it passes cleanly even on an account that cannot create a single resource. Its job is to catch schema mistakes for free.

## Step 5 — Provision

```bash
./adhar up -f config.yaml --env dev
```

The first stage is a real preflight. It runs before any create call. A `✖` line stops the run there and names the limit and the remedy. Passing checks are folded into the `Preflight ✓` stage. `--verbose` prints them:

```text
preflight ● EC2 permissions: all 13 required actions permitted
            (reads and dry-run writes)
preflight ● EC2 vCPU quota: 64 vCPU available, 22 needed at full size
preflight ● instance type r6i.xlarge: offered in 3 zone(s):
            ap-southeast-1a, ap-southeast-1b, ap-southeast-1c
preflight ● ELB access (needed by teardown): load balancers are listable
```

Then the same checklist every cloud draws:

```terminal
$ ./adhar up -f config.yaml --env dev

Provisioning Adhar Platform

  ✓ Preflight                      credentials, quota and API access
  ✓ Cloud cluster                  adhar · aws · ap-southeast-1
  ✓ Kubeconfig & TLS               context adhar
  ✓ Cilium & Gateway               eBPF data path
  ✓ ArgoCD                         GitOps engine
  ✓ Gitea                          in-cluster Git server
  ✓ GitOps repos                   packages, environments
  ✓ Crossplane                     control plane + providers
  ◌ GitOps sync - platform stack   platform apps via ArgoCD
```

After the first joins, compute mode installs these over SSH on the control plane:

- the `aws-cloud-controller-manager` chart
- the `aws-ebs-csi-driver` chart, with `kube-system/aws-secret` when static keys are configured (nothing when `useInstanceProfile: true`)
- the `adhar-block` gp3 StorageClass
- the CSI startup-taint toleration

The CLI finishes with a panel of platform URLs. It warns explicitly if TLS is still self-signed. The catalogue keeps converging for another 30–45 minutes while the autoscaler adds workers. That is expected.

## Step 6 — Verify

```bash
export KUBECONFIG=~/.adhar/clusters/adhar/kubeconfig     # context `adhar`
kubectl get nodes                                        # all Ready, none tainted uninitialized
kubectl -n kube-system get pods | grep -E 'cloud-controller|ebs-csi'
kubectl -n adhar-system get gateway adhar-gateway        # ADDRESS = the ELB/NLB hostname
kubectl -n adhar-system get certificate adhar-cert       # READY True once DNS-01 completes
./adhar get status
./adhar get secrets -p argocd
```

If a node still carries `node.cloudprovider.kubernetes.io/uninitialized`, identity 2 has no credentials. See the pitfalls table.

## Day-2 operations

```bash
./adhar cluster list --file config.yaml
./adhar cluster scale adhar --workers 4 -p aws -f config.yaml
./adhar cluster upgrade adhar --version 1.37.2 -p aws -f config.yaml
./adhar upgrade --diff-only && ./adhar upgrade --yes
```

The cluster is named `adhar` unless you passed `--name` to `adhar up`. `clusterConfig.name` is not the cluster name.

### Managed EKS instead

```yaml
providers:
  aws:
    type: aws
    clusterMode: managed     # EKS instead of EC2 + kubeadm
```

This creates:

- the same VPC, subnets and security group
- two IAM roles (`adhar-<cluster>-eks-cluster`, `adhar-<cluster>-eks-node`)
- the EKS control plane
- one managed node group per node group
- the `aws-ebs-csi-driver` addon

The kubeconfig authenticates through `aws eks get-token`. So the **`aws` CLI must be on PATH** wherever the kubeconfig is used. EKS adds a control-plane charge. The Adhar node autoscaler cannot add workers to a managed node group.

## Tear down, then check the bill

```bash
./adhar down -f config.yaml --env dev
./adhar down -f config.yaml --env dev --purge-orphaned-volumes
```

| Created by | Resource | Removed by teardown |
|---|---|---|
| provider | instances, ENIs, EIPs, NAT gateways, route tables, security groups, subnets, IGW, VPC, key pair | yes, in dependency order |
| cloud-controller-manager | one load balancer per `LoadBalancer` Service — classic ELB **or** NLB | yes |
| load-balancer controller | target groups, the `k8s-elb-*` security group | yes |
| EBS CSI driver | volumes tagged for this cluster | yes |
| EBS CSI driver | unattached volumes with **no** cluster tag | only with `--purge-orphaned-volumes` |
| anything | a resource tagged for two clusters (`shared`) | never |

The load-balancer sweep runs **before** the security-group, subnet and VPC steps. An ELB holds a reference to the VPC. If one is left behind, the VPC delete fails with `DependencyViolation`.

**Point `down` at the same config file you used for `up`.** With any other file, it prints `Nothing was deleted.` and names the providers it searched.

**Check nothing is billing:**

```bash
R=ap-southeast-1
aws ec2 describe-instances --region $R --filters Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].InstanceId' --output text
aws elbv2 describe-load-balancers --region $R --query 'LoadBalancers[].LoadBalancerName' --output text
aws elb describe-load-balancers --region $R --query 'LoadBalancerDescriptions[].LoadBalancerName' --output text
aws ec2 describe-volumes --region $R --filters Name=status,Values=available \
  --query 'Volumes[].VolumeId' --output text
```

**What you pay for while it runs:**

- Node hours. `maxWorkers` is your spend ceiling as much as your quota ceiling.
- One load balancer per `LoadBalancer` Service.
- One EBS volume per `adhar-block` PersistentVolume, plus each node's root volume.

Node-local volumes cost nothing extra. There are no NAT gateway hours. EKS adds a control-plane charge.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `explicit deny in a service control policy` | An org-level SCP above IAM | Amend it from the **management** account; IAM changes here do nothing |
| "no AMI found" | `ec2:DescribeImages` denied | Add the read permissions; it is not an image problem |
| Preflight `✖ EC2 vCPU quota` | Quota sized to the starting node count | Raise `L-1216C47A` to cover `maxWorkers` (22 for the example) |
| `useManagedK8s has been removed` | An old config spelling | `clusterMode: managed` |
| Every pod Pending, nodes keep `…/uninitialized` | The cloud-controller-manager has no credentials (identity 2) | Supply static keys or a node instance profile; check `kube-system/aws-secret` |
| Order fails `SERVFAIL looking up CAA` | The apex is delegated to nameservers holding no zone | Delegate only the platform label |
| Trusted TLS never issues although provisioning works | DNS-01 given an instance profile or SSO session | Route 53 DNS-01 needs **static** keys |
| Pods Pending with `exceed max volume count` | More `adhar-block` claims than the instances' EBS attach budget | Add workers, or move the workload to `adhar-local` |
| Node tainted `disk-pressure` soon after boot | Root volume too small for the image cache plus node-local volumes | `diskSizeGb: 256` on the provider block |
| `down` says `Nothing was deleted.` | The config file does not define the provider that built the cluster | Use the file you ran `up` with |

## Next steps

- [Providers Overview](/docs/providers/overview) — the shared model, storage classes and the comparison table
- [DigitalOcean](/docs/providers/digitalocean) — the live-verified reference for everything not AWS-specific
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Troubleshooting](/docs/reference/troubleshooting) — decoding autoscaler and volume failures
