---
title: "AWS"
section: "Cloud Providers"
order: 4
path: "/docs/providers/aws"
---

# AWS

Run Adhar on AWS with EC2 instances + kubeadm (default) or managed **EKS** (opt-in). Understand one thing first: **an Adhar cluster on AWS uses three separate AWS identities, not one.** Most first-run failures are one of the three being absent while the other two work.

## At a glance

| | |
|---|---|
| **Provider key** | `aws` |
| **Default model** | EC2 + kubeadm (Ubuntu 24.04, containerd, Cilium from the bootstrap) |
| **Managed option** | EKS (`useManagedK8s: true` / `clusterMode: eks`) |
| **Kubernetes** | `v1.37.0` unless pinned with `--kube-version` or `clusterConfig.kubeVersion` |
| **Provisioning credentials** | 5 methods; prefer `useInstanceProfile: true` (instance profile / IRSA) |
| **DNS / trusted TLS** | Route 53 DNS-01 wildcard, and it needs **static** keys |
| **Key quota** | EC2 vCPU `L-1216C47A`, sized for `maxWorkers` (18 vCPU for the shipped config) |
| **Default StorageClass** | `adhar-local` (node-local); `adhar-block` gp3 is installed but not default |
| **Verification** | Render-verified — the kubeadm path is shared with the live-verified DigitalOcean provider |
| **Best for** | Teams standardized on AWS |

## The three identities

```diagram
pv-aws-ownership
```

Identity 1 never calls Route 53 — DNS is entirely an in-cluster concern. Identity 2 is what turns nodes usable: until the cloud-controller-manager runs, every node keeps the `node.cloudprovider.kubernetes.io/uninitialized:NoSchedule` taint and nothing schedules.

**Prefer an instance profile or IRSA for identity 1.** `useInstanceProfile: true` takes short-lived credentials from the instance metadata service (or the IRSA web-identity token) instead of a key pair you have to store and rotate, and it suppresses writing `kube-system/aws-secret`, so no long-lived key lands inside the cluster. The trade-off is explicit: Adhar does **not** attach an instance profile to the worker instances it creates on the kubeadm path, so with the flag on you must attach a node role yourself or identity 2 has nothing to authenticate with. EKS mode closes that gap — Adhar creates `adhar-<cluster>-eks-node` and the managed node group carries it.

Identity 3 has no workload-identity option today: the cert-manager Route 53 solver reads `accessKeyId` and `secretAccessKey` from a Secret, so an instance profile or SSO session is not enough even though provisioning works fine from one.

## Prerequisites (in order)

Ordered so that a failure invalidates everything after it.

| # | Prerequisite | Who fixes it | Fails as |
|---|---|---|---|
| 1 | No Service Control Policy denying EC2 | The organization's **management** account | `explicit deny in a service control policy` |
| 2 | Provisioning permissions on the identity | This account's IAM admin | `no identity-based policy allows …` |
| 3 | EC2 vCPU quota `L-1216C47A` at full cluster size | A support-case quota increase | A create that stops partway with `VcpuLimitExceeded` |
| 4 | A delegated Route 53 zone for `defaultHost` | You plus your registrar | Self-signed certificates; the platform still runs |

**Why the SCP is first.** An identity policy is a ceiling, not a guarantee. An SCP on the organization or OU can deny an action that `AdministratorAccess` allows, and nothing inside the member account can grant it back — so it reads as an IAM problem, especially as the distinguishing phrase sits at the very end of a long error line. Re-test with a repeated sample rather than one call: while a policy is being edited, calls pass briefly and then go back to denied.

**Permissions.** The provisioning identity needs EC2 (VPC, subnets, gateways, route tables, security groups, key pairs, instances, volumes, tags, addresses, network interfaces, NAT gateway describe/delete), `elasticloadbalancing` describe + delete for load balancers and target groups, `servicequotas:GetServiceQuota`, and `sts:GetCallerIdentity`. `AmazonEC2FullAccess` plus the ELB and quota entries also works. EKS mode adds `eks:*` plus `iam:CreateRole`, `GetRole`, `DeleteRole`, `AttachRolePolicy`, `DetachRolePolicy`, `ListAttachedRolePolicies` and `PassRole`.

> **A thin policy misreads as a missing image.** The first call it denies is usually `ec2:DescribeImages`, which surfaces as "no AMI found" rather than as a permissions error.

**Quota.** `L-1216C47A` is *Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances* and it counts **vCPUs, not instances**. Size it for `maxWorkers`: the shipped `config.aws.yaml` runs one `r6i.large` control plane plus up to four `r6i.xlarge` workers — 2 + (4 × 4) = **18 vCPU**. An 8-vCPU-per-worker shape with six workers needs 56. New accounts often start at 5, and raising it is a support case, not instant.

```bash
aws service-quotas get-service-quota --service-code ec2 --quota-code L-1216C47A \
  --query 'Quota.Value' --output text --region ap-southeast-1
```

**DNS.** `globalSettings.defaultHost` drives every URL and the wildcard certificate, so it must be a subdomain you delegate to a Route 53 public hosted zone. Adhar never creates the zone. Create it, read its nameservers, then add **four NS records named `platform`** in the `example.com` zone at your registrar; the apex stays where it is. The in-cluster Route 53 policy needs `route53:ChangeResourceRecordSets`, `route53:ListHostedZonesByName` and `route53:GetChange` on that zone.

```bash
aws route53 create-hosted-zone --name platform.example.com \
  --caller-reference "adhar-$(date +%s)" --query 'HostedZone.Id' --output text
aws route53 get-hosted-zone --id Z0123456789ABC \
  --query 'DelegationSet.NameServers' --output text

dig +short NS platform.example.com      # the nameservers above
dig +short NS example.com               # your registrar's, unchanged
dig +noall +comment CAA example.com     # status: NOERROR — an empty answer is correct
```

> **Do not delegate the whole registered domain unless you also host its apex zone in Route 53.** Let's Encrypt reads CAA up the tree, so issuing `*.platform.example.com` also queries CAA for `example.com`. Delegated to nameservers holding no zone, every lookup SERVFAILs and the order fails with a message naming CAA rather than delegation. Skipping DNS entirely is supported: the platform comes up self-signed and cert-manager issues a trusted certificate on its own once the delegation is fixed.

## Configuration

```yaml
globalSettings:
  adharContext: adhar-mgmt
  defaultHost: platform.example.com
  defaultHttpPort: 80
  defaultHttpsPort: 443
  enableHAMode: false
  email: admin@example.com
  dnsProvider: aws                     # selects Route 53 for external-dns + DNS-01

providers:
  aws:
    type: aws
    region: ap-southeast-1
    primary: true
    useInstanceProfile: true           # preferred; or useEnvironment / profile / credentialsFile
    vpcConfig:
      cidr: 10.0.0.0/16                # must not overlap podCIDR
      subnetCidrs: [10.0.1.0/24, 10.0.2.0/24]
    config:
      # ami: ami-0123456789abcdef0     # pin exactly; skips AMI discovery
      # imageNameFilter: "my/hardened-*"
      # imageArchitecture: arm64       # pair with a Graviton machineType

environmentTemplates:
  dev-defaults:
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
    region: ap-southeast-1
    template: dev-defaults
    clusterConfig:
      - { key: name,                    value: adhar-mgmt }
      - { key: machineType,             value: r6i.xlarge }   # workers: 4 vCPU / 32 GiB
      - { key: controlPlaneMachineType, value: r6i.large }    # 2 vCPU / 16 GiB
      - { key: nodeCount,               value: "2" }
      - { key: diskSizeGb,              value: "256" }
      - { key: diskType,                value: gp3 }
    autoscaling:
      enabled: true
      minWorkers: 2
      maxWorkers: 4
```

`clusterConfig` keys are matched ignoring case and separators, so `machineType`, `machine_type` and `MACHINE_TYPE` are one key. `coreServices` may not be empty — the schema rejects `{}`. The node image defaults to the newest Ubuntu 24.04 LTS (noble) AMI published by Canonical for x86_64, discovered per region at provision time; **pin `ami` for anything reproducible**, or two runs a week apart boot different images.

### Node sizing, from measurement

- **Workers: memory first, vCPU second.** With `adhar-local` as the default StorageClass the binding constraint is memory per worker, not disk-attach slots — so 4 vCPU / 32 GiB (`r6i.xlarge`) beats 8 vCPU / 32 GiB at the same memory, and vCPU is the unit the quota counts. Two workers is the floor, not a working size; expect the autoscaler to add nodes during the first sync.
- **Control plane: 2 vCPU / 16 GiB.** Burstable types (`t3.medium`) throttle etcd in ways that present as a network fault. `m6i.large` has the CPU but not the memory: during the first sync of 75 applications the API server began failing TLS handshakes.
- **Root volumes: 256 GiB gp3.** The containerd image cache (~35 GiB) and every node-local PersistentVolume share this disk. Too small and the kubelet takes a `disk-pressure:NoSchedule` taint, which reads exactly like a CPU shortage.

### Managed EKS

```yaml
providers:
  aws:
    type: aws
    useManagedK8s: true      # or clusterMode: eks
```

Creates the same VPC, subnets and security group as compute mode, two IAM roles (`adhar-<cluster>-eks-cluster`, `adhar-<cluster>-eks-node`), the EKS control plane, one managed node group per `nodeGroups` entry, and the `aws-ebs-csi-driver` addon. The kubeconfig authenticates through `aws eks get-token`, so the **`aws` CLI must be on PATH** wherever it is used.

## A full run

```bash
export AWS_ACCESS_KEY_ID="…" AWS_SECRET_ACCESS_KEY="…"   # or rely on the instance profile

./adhar up -f config.aws.yaml --env dev --dry-run   # config only, no spend
./adhar up -f config.aws.yaml --env dev             # ~25-40 min on a first run
```

`--dry-run` resolves the configuration and prints the cluster shape; it checks **no** permissions, quota or DNS, so it passes cleanly on an account that cannot create a single resource. The real check is the preflight inside `adhar up`, run before anything is created:

```text
preflight ● EC2 permissions: all 13 required actions permitted
            (reads and dry-run writes)
preflight ● EC2 vCPU quota: 64 vCPU available, 18 needed at full size
preflight ● instance type r6i.xlarge: offered in 3 zone(s):
            ap-southeast-1a, ap-southeast-1b, ap-southeast-1c
preflight ● ELB access (needed by teardown): load balancers are listable
```

A `✖` line stops the run before the first create call, naming the limit and the remedy. On success the CLI prints `Successfully Provisioned Production Cluster!` with the Console, ArgoCD and Gitea URLs, and warns explicitly if TLS is still self-signed. Then verify — the catalogue keeps converging for another 30–45 minutes while the autoscaler adds workers, which is expected:

```bash
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
kubectl get nodes
./adhar get status
./adhar get secrets -p argocd
```

Always pass `--env`. Without it, `adhar up -f` provisions **every** environment in the file.

## Cost

Node hours dominate, and `maxWorkers` is the spend ceiling as much as the quota ceiling. **No NAT gateways or elastic IPs are created** — nodes sit in a public subnet with `MapPublicIpOnLaunch`, so there is no per-hour and per-GB NAT charge; the NAT delete permissions exist only so teardown can remove one an in-cluster controller created. Beyond node hours you pay for **one load balancer per `LoadBalancer` Service** (created by the in-cluster cloud-controller-manager, invisible to Adhar's resource tracker until teardown sweeps it) and **one EBS volume per `adhar-block` PersistentVolume**. Node-local volumes cost nothing extra. EKS adds a control-plane charge.

## Tear down

```bash
./adhar down -f config.aws.yaml --env dev
./adhar down -f config.aws.yaml --env dev --purge-orphaned-volumes
```

Teardown sweeps instances, ENIs, EIPs, NAT gateways, route tables, security groups, subnets, the internet gateway, the VPC and the key pair; the CCM's load balancers (classic **ELB and** NLB are both handled), target groups and the `k8s-elb-*` security group; and EBS volumes tagged for this cluster. The load-balancer sweep runs **before** the security-group, subnet and VPC steps, because an ELB holds a reference to the VPC and leaving one behind makes the VPC delete fail with `DependencyViolation`. `--purge-orphaned-volumes` additionally removes unattached CSI volumes carrying no cluster tag; it is opt-in because such a volume looks identical whether its cluster was destroyed an hour ago or is being rebuilt now. A resource tagged for two clusters (`shared`) is never deleted.

**Point `down` at the same config file you used for `up`.** A teardown only sees the providers its config defines; aimed elsewhere it prints `Nothing was deleted.` and names the providers it searched.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `explicit deny in a service control policy` | An org-level SCP above IAM | Amend it from the **management** account; IAM changes here do nothing |
| "no AMI found" | `ec2:DescribeImages` denied | Add the read permissions; it is not an image problem |
| Create stops partway, `VcpuLimitExceeded` | Quota sized to the starting node count | Raise `L-1216C47A` to cover `maxWorkers` |
| Every pod Pending, nodes keep `…/uninitialized` | The cloud-controller-manager has no credentials (identity 2) | Supply static keys or a node instance profile; check `kube-system/aws-secret` |
| Order fails `SERVFAIL looking up CAA` | The apex is delegated to nameservers holding no zone | Delegate only the platform label |
| Trusted TLS never issues although provisioning works | DNS-01 given an instance profile or SSO session | Route 53 DNS-01 needs **static** keys |
| Pods Pending with `exceed max volume count` | More `adhar-block` claims than the instances' EBS attach budget | Add workers, or move the workload to `adhar-local` |
| Node tainted `disk-pressure` soon after boot | Root volume too small for the image cache plus node-local volumes | Set `diskSizeGb: "256"` |

## See also

- [Providers Overview](/docs/providers/overview) — the shared model, storage classes and commands
- [Configuration](/docs/getting-started/configuration) — the full config schema
- [Production](/docs/operations/production) — hardening, HA and backups
- [Troubleshooting](/docs/reference/troubleshooting) — decoding autoscaler and volume failures
