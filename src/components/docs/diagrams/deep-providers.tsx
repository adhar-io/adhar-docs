import type { ComponentType } from "react";
import { Box, C, Caption, Frame, GroupBox, Ladder } from "@/components/docs/diagram-kit";

/** Diagrams owned by the deep-providers pages. Every key is prefixed "dp-". */

/* ------------------------------------------------------------------ *
 * Resource topology — one parameterised layout used by every provider
 * page: who reaches the platform, which DNS zone answers, what fronts
 * the nodes, and the network the nodes live in. Only the labels change
 * per cloud, so the pages can be compared side by side.
 * ------------------------------------------------------------------ */

type Node = { title: string; lines?: string[] };

type Topology = {
  label: string;
  client: Node;
  dns: Node;
  edge: Node;
  /** Label on the arrow from the client to the edge (default "HTTPS :443"). */
  clientLink?: string;
  /** Label on the arrow from the DNS zone to the edge. */
  dnsLink: string;
  /** Label on the arrow from the edge into the network. */
  edgeLink: string;
  network: string;
  left: Node;
  right: Node;
  /** Label on the link between the two boxes inside the network. */
  innerLink: string;
  /** Which box inside the network the edge forwards to. */
  edgeTarget?: "left" | "right";
  /** Short lines printed along the bottom of the network group. */
  networkNotes?: string[];
  /** Optional boxes in a row underneath the network group. */
  below?: Node[];
  belowLabel?: string;
  caption?: string;
};

const W = 880;

const arrow = (x1: number, y1: number, x2: number, y2: number, dashed = false) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={C.strong}
    strokeWidth={1.5}
    strokeDasharray={dashed ? "5 4" : undefined}
    markerEnd="url(#dk-arrow)"
  />
);

const topology = (t: Topology): ComponentType =>
  function TopologyDiagram() {
    const boxH = 72;
    const topY = 12;
    const edgeY = 132;
    const netY = 252;
    const innerY = netY + 44;
    const notes = t.networkNotes ?? [];
    const netH = 44 + boxH + 26 + notes.length * 15 + 10;
    const belowTop = netY + netH + 34;
    const belowBoxH = 64;
    const below = t.below ?? [];
    const height =
      (below.length ? belowTop + belowBoxH + 12 : netY + netH + 12) + (t.caption ? 24 : 0);

    const leftX = 48;
    const leftW = 340;
    const rightX = 492;
    const rightW = 340;
    const target = t.edgeTarget ?? "right";
    const targetCx = target === "right" ? rightX + rightW / 2 : leftX + leftW / 2;

    const belowGap = 20;
    const belowW = below.length
      ? (W - 40 - belowGap * (below.length - 1)) / below.length
      : 0;

    return (
      <Frame width={W} height={height} label={t.label} minWidth={640}>
        {/* client and DNS zone */}
        <Box x={40} y={topY} w={320} h={boxH} title={t.client.title} lines={t.client.lines} tone="primary" />
        <Box x={520} y={topY} w={320} h={boxH} title={t.dns.title} lines={t.dns.lines} tone="muted" />

        {/* edge */}
        <Box x={270} y={edgeY} w={340} h={boxH} title={t.edge.title} lines={t.edge.lines} tone="accent" />
        {arrow(200, topY + boxH + 4, 330, edgeY - 6)}
        <Caption x={170} y={edgeY - 22} anchor="middle">{t.clientLink ?? "HTTPS :443"}</Caption>
        {arrow(680, topY + boxH + 4, 550, edgeY - 6, true)}
        <Caption x={720} y={edgeY - 22} anchor="middle">{t.dnsLink}</Caption>

        {/* network */}
        <GroupBox x={20} y={netY} w={W - 40} h={netH} label={t.network} />
        {arrow(440, edgeY + boxH + 4, targetCx, innerY - 8)}
        <Caption x={target === "right" ? 556 : 300} y={edgeY + boxH + 30} anchor="middle">
          {t.edgeLink}
        </Caption>

        <Box x={leftX} y={innerY} w={leftW} h={boxH} title={t.left.title} lines={t.left.lines} />
        {/* the right box is drawn as a small stack: it stands for several machines */}
        <rect x={rightX + 10} y={innerY - 10} width={rightW} height={boxH} rx={10}
          fill="none" stroke={C.line} strokeWidth={1} />
        <rect x={rightX + 5} y={innerY - 5} width={rightW} height={boxH} rx={10}
          fill="hsl(var(--card))" stroke={C.line} strokeWidth={1} />
        <Box x={rightX} y={innerY} w={rightW} h={boxH} title={t.right.title} lines={t.right.lines} />
        <line x1={leftX + leftW + 6} y1={innerY + boxH / 2} x2={rightX - 6} y2={innerY + boxH / 2}
          stroke={C.strong} strokeWidth={1.5} markerStart="url(#dk-arrow)" markerEnd="url(#dk-arrow)" />
        <Caption x={(leftX + leftW + rightX) / 2} y={innerY + boxH / 2 - 8} anchor="middle" size={10}>
          {t.innerLink}
        </Caption>

        {notes.map((n, i) => (
          <Caption key={i} x={40} y={innerY + boxH + 30 + i * 15} size={10.5}>
            {n}
          </Caption>
        ))}

        {/* things that live outside the node network */}
        {below.length > 0 && t.belowLabel && (
          <Caption x={20} y={belowTop - 10} size={10.5} weight={600}>
            {t.belowLabel}
          </Caption>
        )}
        {below.map((b, i) => (
          <Box key={i} x={20 + i * (belowW + belowGap)} y={belowTop} w={belowW} h={belowBoxH}
            title={b.title} lines={b.lines} tone="muted" titleSize={12} />
        ))}

        {t.caption && <Caption x={20} y={height - 6}>{t.caption}</Caption>}
      </Frame>
    );
  };

/* ------------------------------------------------------------------ *
 * Per-provider topologies
 * ------------------------------------------------------------------ */

const KindTopology = topology({
  label:
    "Local Kind topology: the browser resolves *.adhar.localtest.me to 127.0.0.1 through public DNS, host ports 8443 and 8080 are mapped into the single Kind node container, and nine pull-through registry caches sit beside it on the kind network.",
  client: { title: "your browser", lines: ["https://console.adhar.localtest.me:8443"] },
  dns: { title: "public DNS", lines: ["*.adhar.localtest.me → 127.0.0.1", "nothing to configure"] },
  dnsLink: "loopback answer",
  clientLink: "HTTPS :8443",
  edge: { title: "host ports 8443 / 8080", lines: ["mapped into the node container", "→ Gateway node ports 30443 / 30080"] },
  edgeLink: "port mapping",
  edgeTarget: "left",
  network: "your machine — docker / podman / nerdctl / finch · engine network \"kind\"",
  left: { title: "Kind node (cluster adhar)", lines: ["control plane + workloads", "Cilium (no kindnet, no kube-proxy)"] },
  right: { title: "registry caches ×9", lines: ["adhar-registry-cache-<host>", "registry:3.0.0, volume adhar-registry-cache"] },
  innerLink: "certs.d mirrors",
  networkNotes: [
    "TLS: the platform's own self-signed certificate — localtest.me is not yours to delegate, so no ACME challenge is possible.",
  ],
  caption: "adhar down stops the caches and keeps the volume; --purge-image-cache removes both.",
});

const DigitalOceanTopology = topology({
  label:
    "DigitalOcean topology: DigitalOcean DNS answers for the delegated platform zone with the load balancer's IP, the cloud-controller-manager's load balancer forwards 80 and 443 to the Gateway node ports, and the control-plane and worker droplets share one VPC behind a cluster firewall.",
  client: { title: "you / your users", lines: ["https://console.<defaultHost>"] },
  dns: { title: "DigitalOcean DNS zone", lines: ["<defaultHost> (you create it)", "A records written by external-dns"] },
  dnsLink: "A → LB IP",
  edge: { title: "DigitalOcean load balancer", lines: ["created by the in-cluster CCM", "for the Gateway Service, 80 / 443"] },
  edgeLink: "node ports",
  network: "VPC vpc_cidr 10.3.0.0/16 · cluster firewall",
  left: { title: "adhar-<cluster>-master-1", lines: ["droplet, kubeadm control plane", "etcd · API server :6443"] },
  right: { title: "adhar-<cluster>-worker-N", lines: ["droplets, s-8vcpu-16gb", "autoscaled minWorkers…maxWorkers"] },
  innerLink: "kubeadm join",
  networkNotes: [
    "Firewall in: 22, 6443, 80, 443, 30000-32767 tcp/udp from anywhere; all tcp/udp inside the cluster.",
    "Storage: adhar-local (node disk) is the default; adhar-block = DO volumes, max 7 per droplet.",
  ],
  below: [
    { title: "per-cluster SSH key", lines: ["ed25519, ~/.adhar/clusters/<cluster>/"] },
    { title: "block volumes", lines: ["only for adhar-block claims", "tagged adhar-cluster-<cluster>"] },
    { title: "Let's Encrypt", lines: ["DNS-01 via the DO solver", "*.<defaultHost> wildcard"] },
  ],
  belowLabel: "Also in the account",
});

const AwsTopology = topology({
  label:
    "AWS topology: Route 53 answers for the delegated zone, a classic ELB or NLB created by the in-cluster cloud-controller-manager forwards to the Gateway node ports, and the EC2 control plane and workers sit in the public subnet of one VPC with an internet gateway and a default route.",
  client: { title: "you / your users", lines: ["https://console.<defaultHost>"] },
  dns: { title: "Route 53 public hosted zone", lines: ["<defaultHost> (you create it)", "records by external-dns (static keys)"] },
  dnsLink: "records → ELB",
  edge: { title: "ELB or NLB", lines: ["created by aws-cloud-controller-manager", "one per LoadBalancer Service"] },
  edgeLink: "node ports",
  network: "VPC 10.0.0.0/16 · public subnet 10.0.1.0/24 · IGW + 0.0.0.0/0 route",
  left: { title: "control plane (EC2)", lines: ["r6i.large · Ubuntu 24.04 AMI", "256 GiB gp3 root volume"] },
  right: { title: "workers (EC2)", lines: ["r6i.xlarge · public IP on launch", "autoscaled minWorkers…maxWorkers"] },
  innerLink: "kubeadm join",
  networkNotes: [
    "Security group in: 22, 6443, 30000-32767 tcp/udp; all traffic between members. No NAT gateway, no Elastic IPs.",
    "Private subnet 10.0.2.0/24 is created and tagged for internal load balancers but holds no nodes.",
  ],
  below: [
    { title: "key pair", lines: ["per-cluster ed25519 key"] },
    { title: "EBS volumes", lines: ["only for adhar-block (gp3)", "tagged kubernetes.io/cluster/<n>"] },
    { title: "IAM (managed mode)", lines: ["adhar-<cluster>-eks-cluster", "adhar-<cluster>-eks-node"] },
  ],
  belowLabel: "Also in the account",
});

const AzureTopology = topology({
  label:
    "Azure topology: Azure DNS answers for the delegated zone, a Standard load balancer created by cloud-provider-azure forwards to the Gateway node ports, and the control-plane and worker VMs, each with a NIC and public IP, live in one VNet inside one resource group.",
  client: { title: "you / your users", lines: ["https://console.<defaultHost>"] },
  dns: { title: "Azure DNS zone", lines: ["in config.dnsResourceGroup", "records by external-dns (SP)"] },
  dnsLink: "A → LB IP",
  edge: { title: "Standard load balancer", lines: ["created by cloud-provider-azure", "one per LoadBalancer Service"] },
  edgeLink: "node ports",
  network: "resource group adhar-rg · VNet 10.30.0.0/16 · subnet 10.30.1.0/24 · NSG",
  left: { title: "<cluster>-master-1 (VM)", lines: ["config.vmSize Standard_E4bds_v5", "NIC + public IP · 256 GiB OS disk"] },
  right: { title: "<cluster>-worker-N (VMs)", lines: ["clusterConfig.machineType", "NIC + public IP each"] },
  innerLink: "kubeadm join",
  networkNotes: [
    "NSG in: 22, 6443, 30000-32767 tcp/udp. Everything the cluster owns is in the resource group.",
    "azure.json (kube-system/azure-cloud-provider) carries the in-cluster credential.",
  ],
  below: [
    { title: "managed disks", lines: ["only for adhar-block", "StandardSSD, 4/8/16 per VM"] },
    { title: "DNS service principal", lines: ["DNS Zone Contributor", "scoped to the zone only"] },
    { title: "Let's Encrypt", lines: ["DNS-01 via Azure DNS", "*.<defaultHost> wildcard"] },
  ],
  belowLabel: "Also in the subscription",
});

const GcpTopology = topology({
  label:
    "Google Cloud topology: Cloud DNS answers for the delegated zone, a forwarding rule and target pool created by cloud-provider-gcp forward to the Gateway node ports, and the GCE control plane and workers, each with an ephemeral external IP, share one VPC subnet guarded by tag-scoped firewall rules.",
  client: { title: "you / your users", lines: ["https://console.<defaultHost>"] },
  dns: { title: "Cloud DNS managed zone", lines: ["<defaultHost> (you create it)", "records by external-dns (key file)"] },
  dnsLink: "A → forwarding rule",
  edge: { title: "forwarding rule + target pool", lines: ["created by cloud-provider-gcp", "health-checked from Google ranges"] },
  edgeLink: "node ports",
  network: "VPC adhar-vpc · subnet adhar-subnet 10.20.0.0/16 · per-cluster network tag",
  left: { title: "control plane (GCE)", lines: ["Ubuntu 24.04 LTS image family", "ephemeral external IP"] },
  right: { title: "workers (GCE)", lines: ["e2-standard-8 · pd-standard disk", "SA with cloud-platform scope"] },
  innerLink: "kubeadm join",
  networkNotes: [
    "Firewall: 22 and 6443 (admin_source_ranges, else open), internal from subnet_cidr, HTTP/HTTPS + node ports,",
    "and Google's load-balancer health-check ranges. No Cloud NAT.",
  ],
  below: [
    { title: "persistent disks", lines: ["only for adhar-block", "pvc-* names"] },
    { title: "k8s-* firewall rules", lines: ["created by the CCM", "swept on teardown"] },
    { title: "Let's Encrypt", lines: ["DNS-01 via Cloud DNS", "needs projectId + key"] },
  ],
  belowLabel: "Also in the project",
});

const CivoTopology = topology({
  label:
    "Civo topology in the shipped managed mode: Civo DNS answers for the delegated zone, a Civo load balancer created by Civo's own cloud-controller-manager fronts the Gateway, and the k3s node pool built with Cilium lives in one Civo network.",
  client: { title: "you / your users", lines: ["https://console.<defaultHost>"] },
  dns: { title: "Civo DNS zone", lines: ["<defaultHost> (you create it)", "records by external-dns"] },
  dnsLink: "A → LB IP",
  edge: { title: "Civo load balancer", lines: ["managed: Civo's CCM creates it", "compute: none — nodes serve :443"] },
  edgeLink: "Gateway",
  network: "Civo network adhar-network 10.7.0.0/16",
  left: { title: "control plane", lines: ["managed: run by Civo (k3s)", "compute: g3.large instance"] },
  right: { title: "node pool", lines: ["g4s.kube.large (managed)", "CNI: Cilium, no Traefik"] },
  innerLink: "cluster network",
  networkNotes: [
    "Compute mode instead opens 22, 6443, 80, 443 and node ports on the cluster firewall and runs a host-network Gateway.",
  ],
  below: [
    { title: "volumes", lines: ["managed only (Civo CSI)", "account limit e.g. 40"] },
    { title: "DNS-01 webhook", lines: ["okteto civo-webhook 0.5.4", "when dnsProvider: civo"] },
    { title: "quota preflight", lines: ["instances, CPU, RAM,", "disk, networks"] },
  ],
  belowLabel: "Also in the account",
});

const CustomTopology = topology({
  label:
    "Custom provider topology: you own the DNS records, the load balancer and the hosts; the adhar CLI reaches every host over SSH on port 22, installs kubeadm on the one control-plane host and joins the workers, and the Gateway listens on node ports 30080 and 30443.",
  client: { title: "you / your users", lines: ["https://console.<defaultHost>"] },
  dns: { title: "your DNS", lines: ["*.<defaultHost> → your LB", "or a dnsProvider zone for DNS-01"] },
  dnsLink: "A → your LB",
  edge: { title: "your load balancer / MetalLB", lines: ["80 → node port 30080", "443 → node port 30443"] },
  edgeLink: "node ports",
  network: "your network — firewall and routing are yours",
  left: { title: "masterIPs[0]", lines: ["exactly one control-plane host", "Ubuntu 24.04, root or sudo -n"] },
  right: { title: "workerIPs[…]", lines: ["joined over SSH", "scale moves within this list"] },
  innerLink: "kubeadm join",
  networkNotes: [
    "The machine running adhar needs TCP 22 to every host and TCP 6443 to the control plane; nodes need each other unrestricted.",
  ],
  below: [
    { title: "adhar CLI", lines: ["SSH key, passphrase-less", "port 22 only"] },
    { title: "storage", lines: ["local-path provisioner (default)", "not replicated"] },
    { title: "not created", lines: ["no VMs, no LB, no volumes", "adhar down = kubeadm reset"] },
  ],
  belowLabel: "Outside the node network",
});

/* ------------------------------------------------------------------ *
 * Cluster modes — what Adhar creates, and what it may delete, in each
 * of the three `clusterMode` values.
 * ------------------------------------------------------------------ */

const ClusterModes = () => (
  <Ladder
    width={880}
    boxW={240}
    heading={["clusterMode", "who builds the cluster · what adhar down removes"]}
    label="The three cluster modes: compute, where Adhar builds the cluster with kubeadm on raw instances and adhar down deletes it; managed, where the cloud's hosted Kubernetes is created through its API and adhar down deletes it; and provided, where the cluster already exists and adhar down deletes nothing."
    caption="The same three words on every provider. eks / aks / gke / doks / k3s and useManagedK8s are rejected, not mapped."
    rungs={[
      {
        name: "compute",
        detail: "default",
        tone: "primary",
        adds: [
          "Adhar creates network, firewall, instances; kubeadm init/join over SSH",
          "adhar down deletes all of it · the node autoscaler can add machines",
        ],
      },
      {
        name: "managed",
        detail: "EKS / AKS / GKE / DOKS / k3s",
        adds: [
          "Adhar creates the network, then the cloud's control plane + node pools",
          "adhar down deletes all of it · no kubeadm, no node SSH",
        ],
      },
      {
        name: "provided",
        detail: "existing cluster",
        tone: "accent",
        adds: [
          "Adhar creates nothing; installs the platform through your kubeconfig",
          "adhar down deletes NOTHING · autoscaler refuses to act",
        ],
      },
    ]}
  />
);

export const deep_providers = {
  "dp-kind-topology": KindTopology,
  "dp-digitalocean-topology": DigitalOceanTopology,
  "dp-aws-topology": AwsTopology,
  "dp-azure-topology": AzureTopology,
  "dp-gcp-topology": GcpTopology,
  "dp-civo-topology": CivoTopology,
  "dp-custom-topology": CustomTopology,
  "dp-cluster-modes": ClusterModes,
} as Record<string, ComponentType>;
