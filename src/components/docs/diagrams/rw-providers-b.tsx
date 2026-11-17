import type { ComponentType } from "react";
import { Flow, Ladder, Split, Stack } from "@/components/docs/diagram-kit";

/** New diagrams from the docs rewrite. Every key is prefixed "npb-". */

/* ------------------------------------------------------------------ *
 * AWS
 * ------------------------------------------------------------------ */

/* AWS: the request path from a browser to the EC2 nodes. */
const AwsTopology = () => (
  <Flow
    label="AWS topology in compute mode: a browser resolves console.<defaultHost> in the Route 53 public hosted zone, whose records external-dns writes. The record points at an ELB or NLB created by the in-cluster aws-cloud-controller-manager, which forwards to the Gateway node ports on the EC2 workers. The control plane and workers sit in the public subnet 10.0.1.0/24 of one VPC, 10.0.0.0/16, behind one security group, with an internet gateway and no NAT gateway."
    caption="One VPC (10.0.0.0/16), one public subnet, one security group. Nodes take a public IP on launch: no NAT gateway, no Elastic IP."
    nodes={[
      { title: "browser", lines: ["https://console.", "<defaultHost>"] },
      { title: "Route 53 zone", lines: ["you create and delegate it", "records by external-dns"] },
      { title: "ELB or NLB", lines: ["created by the in-cluster", "cloud-controller-manager"], tone: "accent" },
      { title: "EC2 workers", lines: ["Gateway node ports", "minWorkers…maxWorkers"], tone: "primary" },
      { title: "EC2 control plane", lines: ["kubeadm · Ubuntu 24.04", "256 GiB gp3 root"] },
    ]}
    edges={[{ label: "DNS" }, { label: "record → LB" }, { label: "80 / 443" }, { label: "kubeadm join", dashed: true }]}
  />
);

/* AWS: what one `adhar up` does, in order. */
const AwsSequence = () => (
  <Ladder
    width={880}
    boxW={250}
    heading={["stage", "what happens"]}
    label="The AWS provisioning sequence in compute mode: a preflight of EC2 permissions, vCPU quota, instance-type availability and ELB access; the VPC, subnets, internet gateway, security group and key pair; EC2 instances joined with kubeadm; the AWS cloud-controller-manager, EBS CSI driver and adhar-block StorageClass installed over SSH; the platform bootstrap; and the GitOps sync of the package catalogue."
    caption="A failed preflight stops the run before the first create call."
    rungs={[
      {
        name: "preflight",
        detail: "before any create call",
        tone: "primary",
        adds: ["EC2 permissions · vCPU quota L-1216C47A · instance type offered · ELB access", "✖ any fail → stop; nothing was created"],
      },
      { name: "network", detail: "VPC · subnets · IGW", adds: ["VPC 10.0.0.0/16, public + private subnet, 0.0.0.0/0 route,", "one security group, one key pair"] },
      { name: "EC2 instances", detail: "kubeadm init / join", adds: ["Ubuntu 24.04, containerd; nodes stay NotReady until Cilium arrives"] },
      {
        name: "cloud integration",
        detail: "installed over SSH",
        adds: ["aws-cloud-controller-manager + aws-ebs-csi-driver (kube-system/aws-secret),", "adhar-block gp3 StorageClass"],
      },
      { name: "platform bootstrap", adds: ["Gateway API CRDs → Cilium → Gateway → ArgoCD → Gitea → Crossplane"] },
      { name: "GitOps sync", detail: "ArgoCD", tone: "accent", adds: ["packages converge to Synced + Healthy; the autoscaler adds workers"] },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Azure
 * ------------------------------------------------------------------ */

/* Azure: the request path from a browser to the VMs. */
const AzureTopology = () => (
  <Flow
    label="Azure topology in compute mode: a browser resolves console.<defaultHost> in the Azure DNS zone, whose records external-dns writes. The record points at a Standard load balancer created by the in-cluster cloud-provider-azure, which forwards to the Gateway node ports on the worker VMs. The control-plane VM and the worker VMs each have a NIC, a public IP and a 256 GiB OS disk, and share one VNet, subnet and network security group inside one resource group."
    caption="Everything the cluster owns lives in one resource group: VNet 10.30.0.0/16, subnet 10.30.1.0/24, one NSG, a NIC and public IP per VM."
    nodes={[
      { title: "browser", lines: ["https://console.", "<defaultHost>"] },
      { title: "Azure DNS zone", lines: ["in config.dnsResourceGroup", "records by external-dns"] },
      { title: "Standard load balancer", lines: ["created by the in-cluster", "cloud-provider-azure"], tone: "accent" },
      { title: "worker VMs", lines: ["clusterConfig.machineType", "Gateway node ports"], tone: "primary" },
      { title: "control-plane VM", lines: ["config.vmSize", "kubeadm · 256 GiB OS disk"] },
    ]}
    edges={[{ label: "DNS" }, { label: "A → LB IP" }, { label: "80 / 443" }, { label: "kubeadm join", dashed: true }]}
  />
);

/* Azure: one service principal, used on both sides. */
const AzureCredentials = () => (
  <Split
    width={820}
    label="How Azure credentials are used. On your machine, adhar up provisions as the service principal when clientId, tenantId and a client secret are all set, and falls back to the az login session otherwise. Inside the cluster, cloud-provider-azure and the Azure Disk CSI driver read the same principal from azure.json, and external-dns and the cert-manager DNS-01 solver use it to write records in the Azure DNS zone. The az login session never reaches the cluster."
    caption="One service principal does both jobs. Give it Contributor on the cluster's resource group and access to the DNS zone."
    left={{
      heading: "your machine — adhar up",
      tone: "primary",
      items: [
        "complete service principal → provisions with it",
        "otherwise → the az login session",
        "creates VNet, NSG, NICs, public IPs, VMs",
        "needs Contributor on the resource group",
      ],
      note: "compute mode refuses to start without a principal",
    }}
    right={{
      heading: "inside the cluster",
      tone: "accent",
      items: [
        "cloud-provider-azure → the load balancer",
        "Azure Disk CSI → adhar-block disks",
        "  both read azure.json (the principal)",
        "external-dns + cert-manager DNS-01 → the zone",
      ],
      note: "the az login session never reaches the cluster",
    }}
  />
);

/* Azure: what one `adhar up` does, in order. */
const AzureSequence = () => (
  <Ladder
    width={880}
    boxW={250}
    heading={["stage", "what happens"]}
    label="The Azure provisioning sequence in compute mode: a preflight of the resource group, the service-principal credential, resource-provider registration, VM size availability and the regional vCPU quota; a VM-family quota check at the start of the create; the VNet, subnet, network security group, NICs, public IPs and VMs; kubeadm init and join; cloud-provider-azure, the Azure Disk CSI driver and the storage classes; the platform bootstrap; and the GitOps sync of the package catalogue."
    caption="Every check runs before the first resource exists."
    rungs={[
      {
        name: "preflight",
        detail: "before any create call",
        tone: "primary",
        adds: ["resource group · service principal · resource providers · VM size · regional vCPU", "✖ any fail → stop; nothing was created"],
      },
      { name: "family quota", detail: "start of the create", adds: ["the VM family's vCPU quota, still before any resource exists"] },
      { name: "network + VMs", detail: "one resource group", adds: ["VNet, subnet, NSG; a NIC, public IP and 256 GiB OS disk per VM"] },
      { name: "kubeadm init / join", adds: ["Ubuntu, containerd; nodes stay NotReady until Cilium arrives"] },
      {
        name: "cloud integration",
        adds: ["cloud-provider-azure (azure.json) + Azure Disk CSI,", "adhar-block StorageClass, adhar-local as the default"],
      },
      { name: "platform bootstrap", adds: ["Gateway API CRDs → Cilium → Gateway → ArgoCD → Gitea → Crossplane"] },
      { name: "GitOps sync", detail: "ArgoCD", tone: "accent", adds: ["packages converge to Synced + Healthy; the autoscaler adds workers"] },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Google Cloud
 * ------------------------------------------------------------------ */

/* GCP: what one `adhar up` does, in order. */
const GcpSequence = () => (
  <Ladder
    width={880}
    boxW={250}
    heading={["stage", "what happens"]}
    label="The Google Cloud provisioning sequence in compute mode: a credentials and API-access preflight; the provider's quota check of CPUS, CPUS_ALL_REGIONS and the disk quota against the starting node count; the VPC, subnet and firewall rules; Compute Engine instances joined with kubeadm; cloud-provider-gcp, the Persistent Disk CSI driver and the adhar-block StorageClass; the platform bootstrap; and the GitOps sync of the package catalogue."
    caption="The quota check counts the starting nodes, not maxWorkers. Size quotas for the full cluster yourself."
    rungs={[
      {
        name: "preflight",
        detail: "credentials, API access",
        tone: "primary",
        adds: ["the project is set and the provider answers", "✖ fail → stop; nothing was created"],
      },
      {
        name: "quota check",
        detail: "starting nodes only",
        adds: ["CPUS · CPUS_ALL_REGIONS · SSD_TOTAL_GB or DISKS_TOTAL_GB", "a shortfall stops the run and names the metric"],
      },
      { name: "network", detail: "VPC · subnet · firewall", adds: ["rules built from subnet_cidr, including Google's health-check ranges"] },
      { name: "GCE instances", detail: "kubeadm init / join", adds: ["ephemeral external IP each; nodes stay NotReady until Cilium arrives"] },
      {
        name: "cloud integration",
        adds: ["cloud-provider-gcp + Persistent Disk CSI (gce-pd-csi-driver/cloud-sa),", "adhar-block StorageClass"],
      },
      { name: "platform bootstrap", adds: ["Gateway API CRDs → Cilium → Gateway → ArgoCD → Gitea → Crossplane"] },
      { name: "GitOps sync", detail: "ArgoCD", tone: "accent", adds: ["packages converge to Synced + Healthy; the autoscaler adds workers"] },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * CLI reference
 * ------------------------------------------------------------------ */

/* CLI: the command groups, exactly as `adhar --help` prints them. */
const CliMap = () => (
  <Stack
    width={900}
    label="The adhar command map, grouped as adhar --help groups it. Develop: ai, application, batch, bucket, cache, database, environment, function, gitops, pipeline, project, routes, storage. Observe: events, get, health, logs, metrics, network, traces. Operate: backup, cluster, restore, scale, upgrade. Administer: auth, compliance, config, controller, cost, down, fleet, policy, secrets, security, stack, up, webhook. Utilities: completion, dev, help, push, version."
    caption="adhar <command> --help is authoritative for flags. The binary also answers to a and ad."
    layers={[
      {
        name: "Develop — build, ship, self-serve",
        items: "ai · application · batch · bucket · cache · database · environment · function · gitops · pipeline · project · routes · storage",
        tone: "primary",
      },
      { name: "Observe — health, logs, metrics, traces", items: "events · get · health · logs · metrics · network · traces" },
      { name: "Operate — day-2 operations", items: "backup · cluster · restore · scale · upgrade", tone: "accent" },
      {
        name: "Administer — lifecycle and governance",
        items: "auth · compliance · config · controller · cost · down · fleet · policy · secrets · security · stack · up · webhook",
      },
      { name: "Utilities — tooling", items: "completion · dev · help · push · version", tone: "muted" },
    ]}
  />
);

/* CLI: how a package change travels from an edit to the cluster. */
const StackChangeFlow = () => (
  <Flow
    label="How a platform package change reaches the cluster: adhar stack enable or disable edits the ApplicationSet and environment config in the platform stack directory; adhar upgrade --diff-only shows what would change; adhar upgrade --yes converges the foundation and force-pushes the stack to the Gitea packages repository; ArgoCD then syncs the change into the cluster."
    caption="adhar stack only edits files. Nothing reaches the cluster until adhar upgrade pushes."
    nodes={[
      { title: "adhar stack enable", lines: ["edits files in", "platform/stack"], tone: "primary" },
      { title: "adhar upgrade --diff-only", lines: ["shows the stack diff", "changes nothing"] },
      { title: "adhar upgrade --yes", lines: ["converges the foundation", "pushes the stack"], tone: "primary" },
      { title: "Gitea", lines: ["adhar/packages"] },
      { title: "ArgoCD", lines: ["syncs the cluster"], tone: "accent" },
    ]}
    edges={[{ label: "review" }, { label: "apply" }, { label: "force-push" }, { label: "sync" }]}
  />
);

export const rw_providers_b: Record<string, ComponentType> = {
  "npb-aws-topology": AwsTopology,
  "npb-aws-sequence": AwsSequence,
  "npb-azure-topology": AzureTopology,
  "npb-azure-credentials": AzureCredentials,
  "npb-azure-sequence": AzureSequence,
  "npb-gcp-sequence": GcpSequence,
  "npb-cli-map": CliMap,
  "npb-stack-change-flow": StackChangeFlow,
};
