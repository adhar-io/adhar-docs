import type { ComponentType } from "react";
import {
  Box, Caption, C, Flow, Frame, Funnel, Ladder, Split,
} from "@/components/docs/diagram-kit";
import type { Side } from "@/components/docs/diagram-kit";

/** Diagrams for the providers pages. Registered in `diagrams/index.tsx`. */

/* ------------------------------------------------------------------ *
 * Cloud ownership — the same two-column shape on every cloud page:
 * what runs on your machine, and what lives in the cloud account.
 * One component, parameterised, registered under four keys.
 * ------------------------------------------------------------------ */

type Ownership = { label: string; left: Side; right: Side; caption?: string };

const ownership = (spec: Ownership): ComponentType =>
  function OwnershipSplit() {
    return (
      <Split
        width={880}
        label={spec.label}
        caption={spec.caption}
        left={spec.left}
        right={spec.right}
      />
    );
  };

const AwsOwnership = ownership({
  label:
    "The three AWS identities: adhar up on your machine provisions the account, and two further credentials live inside the cluster it builds — one for the cloud-controller-manager and EBS CSI, one for external-dns and cert-manager.",
  caption:
    "Between the two columns: kubeadm over SSH, then Helm on the control plane.",
  left: {
    heading: "your machine",
    tone: "primary",
    items: ["adhar up — identity 1", "calls EC2 / ELB / quota / STS"],
  },
  right: {
    heading: "AWS account",
    tone: "accent",
    items: [
      "VPC, subnets, IGW, SG, key pair, EC2",
      "cluster: cloud-controller-manager + EBS CSI — identity 2",
      "← kube-system/aws-secret, or the node instance profile",
      "cluster: external-dns + cert-manager DNS-01 — identity 3",
      "← STATIC Route 53 keys, read from a Secret",
    ],
  },
});

const AzureOwnership = ownership({
  label:
    "Two halves, two credentials on Azure: an az login session creates the subscription's infrastructure, while the in-cluster controllers read their own service principal or managed identity.",
  caption:
    "ARM creates the resource group, VNet, NSG, public IPs, NICs, VMs and LB; then kubeadm over SSH, then Helm on the control plane.",
  left: {
    heading: "your machine",
    tone: "primary",
    items: ["adhar up", "az login OK"],
  },
  right: {
    heading: "Azure subscription",
    tone: "accent",
    items: [
      "cluster infrastructure",
      "cluster: cloud-provider-azure CCM + Azure Disk CSI",
      "← kube-system/azure-cloud-provider (azure.json)",
      "← AND /etc/kubernetes/azure.json on the control plane",
      "a service principal, or useManagedIdentityExtension",
      "cluster: external-dns + cert-manager DNS-01",
      "← a service principal with DNS Zone Contributor ON THE ZONE,",
      "plus subscriptionId and dnsResourceGroup",
    ],
  },
});

const GcpOwnership = ownership({
  label:
    "Which Google Cloud credential does what: adhar up provisions with ADC, a key file or compute metadata, while the cluster's controllers use the nodes' own service account and a mounted key.",
  caption:
    "adhar up calls compute / serviceusage / resourcemanager; then kubeadm over SSH, then Helm/kustomize on the control plane.",
  left: {
    heading: "your machine",
    tone: "primary",
    items: ["adhar up", "ADC, key, or metadata"],
  },
  right: {
    heading: "Google Cloud project",
    tone: "accent",
    items: [
      "VPC, subnet, firewall, GCE",
      "cluster: cloud-provider-gcp CCM",
      "← the NODES' own service account (cloud-platform scope)",
      "cluster: PD CSI driver",
      "← gce-pd-csi-driver/cloud-sa, from the key file, else ADC",
      "cluster: external-dns + cert-manager DNS-01",
      "← a MOUNTED service-account key",
    ],
  },
});

const CustomOwnership = ownership({
  label:
    "Ownership on the custom provider: you own the machines, the network and firewall, DNS, certificates, load balancing and real replicated storage; Adhar owns everything it installs over SSH.",
  caption: "Adhar reaches your hosts over SSH.",
  left: {
    heading: "you own",
    tone: "primary",
    items: [
      "the machines",
      "the network & firewall",
      "DNS, certificates",
      "load balancing",
      "real (replicated) storage",
    ],
  },
  right: {
    heading: "adhar owns",
    tone: "accent",
    items: [
      "containerd + kubeadm on each",
      "kubeadm init / join / reset",
      "Cilium (CNI + Gateway)",
      "local-path StorageClass",
      "the whole platform stack",
    ],
  },
});

/* ------------------------------------------------------------------ *
 * Provisioning sequences — conceptual orderings, not verbatim CLI
 * output, so they are ladders rather than terminal transcripts.
 * ------------------------------------------------------------------ */

const CivoSequence = () => (
  <Ladder
    width={880}
    boxW={250}
    heading={["stage", "what happens"]}
    label="The Civo provisioning sequence: preflight, then network, firewall and SSH key, instances prepared in parallel, kubeadm init and join, Civo CCM and CSI over SSH, the platform bootstrap, and finally the GitOps sync."
    rungs={[
      {
        name: "preflight",
        detail: "credentials, API",
        tone: "primary",
        adds: [
          "credentials and API access; quota: 4 × g3.xlarge fits within",
          "the account limits — ✖ any fail → STOP, nothing was created",
        ],
      },
      { name: "network", detail: "firewall · SSH key", adds: [] },
      {
        name: "instances",
        detail: "created in parallel",
        adds: ["containerd, pinned kubeadm stream, Cilium images pre-pulled"],
      },
      {
        name: "kubeadm init / join",
        detail: "kube-proxy SKIPPED",
        adds: [
          "Cilium replaces kube-proxy; nodes NotReady until Cilium arrives",
        ],
      },
      {
        name: "cloud integration",
        detail: "over SSH",
        adds: [
          "Civo CCM + Civo CSI; kube-system/civo-api-access holds the API key;",
          "the CSI DaemonSet tolerates node.adhar.io/csi-not-ready",
        ],
      },
      {
        name: "platform bootstrap",
        adds: [
          "Gateway API CRDs → Cilium → Gateway → ArgoCD → Gitea → Crossplane →",
          "seed platform/stack into Gitea",
        ],
      },
      {
        name: "GitOps sync",
        detail: "ArgoCD",
        tone: "accent",
        adds: ["every package Synced + Healthy"],
      },
    ]}
  />
);

const DigitalOceanSequence = () => (
  <Ladder
    width={880}
    boxW={250}
    heading={["stage", "what happens"]}
    label="The DigitalOcean provisioning sequence: preflight, VPC, firewall and SSH key, four droplets prepared in parallel, kubeadm init and join, the DigitalOcean cloud-controller-manager and CSI over SSH, the platform bootstrap, and provisioning complete at about thirteen minutes."
    rungs={[
      {
        name: "preflight",
        detail: "credentials, API",
        tone: "primary",
        adds: ["credentials and API access"],
      },
      { name: "VPC", detail: "firewall · SSH key", adds: [] },
      {
        name: "4 droplets",
        detail: "PREPARED IN PARALLEL",
        adds: [
          "containerd, pinned kubeadm stream, swap off, Cilium data-path",
          "images pre-pulled in the background",
        ],
      },
      {
        name: "kubeadm init / join",
        detail: "kube-proxy SKIPPED",
        adds: [
          "Cilium replaces kube-proxy; nodes stay NotReady — no CNI yet, by design",
        ],
      },
      {
        name: "DO CCM + CSI",
        detail: "installed over SSH",
        adds: ["~5 min: cluster serving, kubeconfig fetched over SSH"],
      },
      {
        name: "platform bootstrap",
        adds: [
          "Gateway API CRDs → Cilium → Gateway → ArgoCD → Gitea → Crossplane →",
          "seed platform/stack into Gitea",
        ],
      },
      {
        name: "provisioning done",
        detail: "~13 min",
        tone: "accent",
        adds: ["Completed Environment Provisioning"],
      },
    ]}
  />
);

const ProviderUpSequence = () => (
  <Ladder
    width={880}
    boxW={250}
    heading={["step", "what it does"]}
    caption="Steps 1-5 are shared, step 6 is provider-specific, and steps 7-8 are identical everywhere."
    label="How adhar up flows through a provider in eight steps: resolve config, CreateProvider, Authenticate, Preflight, reuse-or-create, CreateCluster, platform bootstrap, and GitOps sync."
    rungs={[
      {
        name: "1. Resolve config",
        adds: [
          "globalSettings → providers → environmentTemplates → environments[dev]",
          "(the environment block wins)",
        ],
      },
      {
        name: "2. CreateProvider()",
        adds: [
          "factory.go instantiates ONE Provider from the resolved type:",
          "— an unknown type is an error",
        ],
      },
      {
        name: "3. Authenticate()",
        adds: ["token from env var / workload identity"],
      },
      {
        name: "4. Preflight",
        tone: "primary",
        adds: [
          "credentials, quota, size availability",
          "✖ any fail → STOP. Nothing was created.",
        ],
      },
      {
        name: "5. Reuse-or-create",
        adds: [
          "a cluster of this name already there? reuse it",
          "(--recreate asks for a fresh one)",
        ],
      },
      {
        name: "6. CreateCluster()",
        detail: "PROVIDER-SPECIFIC",
        adds: [
          "network · firewall · SSH key · instances",
          "kubeadm init/join · CCM + CSI · kubeconfig fetched over SSH",
        ],
      },
      {
        name: "7. Platform bootstrap",
        detail: "IDENTICAL EVERYWHERE",
        tone: "accent",
        adds: [
          "Gateway API CRDs → Cilium → Gateway → ArgoCD → Gitea →",
          "Crossplane → seed stack",
        ],
      },
      {
        name: "8. GitOps sync",
        adds: ["ArgoCD drives every package Synced+Healthy"],
      },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Platform engineering
 * ------------------------------------------------------------------ */

const CognitiveLoadSplit = () => (
  <Split
    width={780}
    label="Cognitive load with and without a platform: the same stream-aligned team carries six rows of extraneous load without one, and spends that capacity on germane work when a platform serves the route instead."
    caption="Both columns are the same stream-aligned team."
    left={{
      heading: "without a platform",
      items: [
        "intrinsic: domain, data model",
        "extraneous: CI wiring",
        "extraneous: base images",
        "extraneous: manifests, promotion",
        "extraneous: TLS, secrets, RBAC",
        "extraneous: dashboards, alerts",
        "extraneous: database provisioning",
        "germane: squeezed",
      ],
    }}
    right={{
      heading: "with a platform",
      tone: "primary",
      items: [
        "intrinsic: domain, data model",
        "germane: design, modelling, failure modes",
        "↓ the team consumes",
        "platform: one route, N teams reuse it",
      ],
    }}
  />
);

const OwnershipBoundary = () => (
  <>
    <Split
      width={780}
      label="Two earlier answers to the ownership question: the classic dev-and-ops split with a hand-off wall, and you-build-it-you-run-it, where ownership is correct but the surface each team carries is unbounded."
      left={{
        heading: "classic split",
        items: [
          "dev │ ops",
          "hand-off wall",
          "(the dysfunction DevOps attacked)",
        ],
      }}
      right={{
        heading: "“you build it, you run it”",
        items: [
          "team A │ app + all of it",
          "team B │ app + all of it",
          "team C │ app + all of it",
          "(ownership correct, surface unbounded)",
        ],
      }}
    />
    <Flow
      label="Platform engineering moves the boundary without moving the ownership: teams A, B and C still own the service, its SLOs, its on-call, its data model and its cost, and consume the platform through self-service with no ticket and no gate."
      caption="The boundary moved, and the ownership did not."
      nodes={[
        {
          title: "team A · B · C",
          tone: "primary",
          lines: [
            "own: the service, its SLOs,",
            "its on-call, its data model,",
            "its cost",
          ],
        },
        {
          title: "platform",
          tone: "accent",
          lines: [
            "a product, with users",
            "build · deploy · runtime · identity",
            "secrets · infrastructure · telemetry",
          ],
        },
      ]}
      edges={[{ label: "self-service, no ticket, no gate", tone: "primary" }]}
    />
  </>
);

/* Adoption vs mandate: two feedback loops, so the coordinates are placed
   by hand — a bulleted split would lose the branch-and-merge that is the
   whole point of the picture. */

function AdoptionVsMandate() {
  return (
    <Frame
      width={780}
      height={330}
      label="Adoption versus mandate: a team that evaluates the platform either adopts it or walks away, and either outcome teaches you what works and what does not, which feeds the next iteration; a team that is told to use it complies, then either uses it or works around it, and usage rises while telling you nothing."
    >
      {/* ---- ADOPTION ---- */}
      <Caption x={24} y={18} size={11} weight={700} color={C.primary}>
        ADOPTION
      </Caption>
      <line x1={24} y1={25} x2={330} y2={25} stroke={C.line} strokeWidth={1} />

      <Box x={64} y={38} w={232} h={44} title="team evaluates" lines={["the platform"]} tone="primary" />
      <line x1={180} y1={82} x2={180} y2={98} stroke={C.strong} strokeWidth={1.5} />
      <line x1={112} y1={98} x2={248} y2={98} stroke={C.strong} strokeWidth={1.5} />
      <line x1={112} y1={98} x2={112} y2={110} stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
      <line x1={248} y1={98} x2={248} y2={110} stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />

      <Box x={66} y={114} w={92} h={36} title="adopts" />
      <Box x={192} y={114} w={112} h={36} title="walks away" />

      <line x1={112} y1={150} x2={112} y2={166} stroke={C.strong} strokeWidth={1.5} />
      <line x1={248} y1={150} x2={248} y2={166} stroke={C.strong} strokeWidth={1.5} />
      <line x1={112} y1={166} x2={248} y2={166} stroke={C.strong} strokeWidth={1.5} />
      <line x1={180} y1={166} x2={180} y2={176} stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />

      <Box x={52} y={180} w={256} h={52} title="you learn" lines={["what works and what does not"]} />
      <line x1={180} y1={232} x2={180} y2={246} stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
      <Box x={86} y={250} w={188} h={38} title="next iteration" tone="primary" />

      <path d="M 274 269 L 330 269 L 330 60 L 302 60" fill="none"
        stroke={C.primary} strokeWidth={1.5} markerEnd="url(#dk-arrow-primary)" />

      {/* ---- MANDATE ---- */}
      <Caption x={456} y={18} size={11} weight={700}>
        MANDATE
      </Caption>
      <line x1={456} y1={25} x2={740} y2={25} stroke={C.line} strokeWidth={1} />

      <Box x={480} y={38} w={200} h={44} title="team is told" lines={["to use it"]} tone="muted" />
      <line x1={580} y1={82} x2={580} y2={94} stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />

      <Box x={536} y={98} w={88} h={36} title="complies" tone="muted" />
      <line x1={580} y1={134} x2={580} y2={150} stroke={C.strong} strokeWidth={1.5} />
      <line x1={516} y1={150} x2={661} y2={150} stroke={C.strong} strokeWidth={1.5} />
      <line x1={516} y1={150} x2={516} y2={160} stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
      <line x1={661} y1={150} x2={661} y2={160} stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />

      <Box x={476} y={164} w={80} h={36} title="uses it" tone="muted" />
      <Box x={596} y={164} w={130} h={36} title="works around it" tone="muted" />

      <line x1={516} y1={200} x2={516} y2={216} stroke={C.strong} strokeWidth={1.5} />
      <line x1={661} y1={200} x2={661} y2={216} stroke={C.strong} strokeWidth={1.5} />
      <line x1={516} y1={216} x2={661} y2={216} stroke={C.strong} strokeWidth={1.5} />
      <line x1={580} y1={216} x2={580} y2={226} stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />

      <Box x={468} y={230} w={224} h={52} title="usage rises" lines={["and tells you nothing"]} tone="muted" />

      <Caption x={24} y={316}>
        Adoption closes a loop that teaches you something; a mandate closes none.
      </Caption>
    </Frame>
  );
}

const AdoptionFunnel = () => (
  <Funnel
    width={820}
    label="The adoption funnel: awareness, first use, repeat use and production share, with the drop-off between each pair of stages naming a different failure."
    caption="Production means services whose real traffic runs on the paved road."
    steps={[
      {
        name: "Awareness",
        detail: "engineers who know the capability exists",
        dropoff: "drop-off here = a communication problem",
      },
      {
        name: "First use",
        detail: "teams that tried it at least once",
        dropoff: "drop-off here = onboarding friction, bad docs",
      },
      {
        name: "Repeat use",
        detail: "teams that came back without prompting",
        dropoff: "drop-off here = the product is not good enough",
      },
      {
        name: "Production",
        detail: "as a share of all services",
      },
    ]}
  />
);

export const providers = {
  "pv-aws-ownership": AwsOwnership,
  "pv-azure-ownership": AzureOwnership,
  "pv-gcp-ownership": GcpOwnership,
  "pv-custom-ownership": CustomOwnership,
  "pv-civo-sequence": CivoSequence,
  "pv-digitalocean-sequence": DigitalOceanSequence,
  "pv-provider-up-sequence": ProviderUpSequence,
  "pv-pe-cognitive-load": CognitiveLoadSplit,
  "pv-pe-ownership-boundary": OwnershipBoundary,
  "pv-pe-adoption-vs-mandate": AdoptionVsMandate,
  "pv-pe-adoption-funnel": AdoptionFunnel,
} as Record<string, ComponentType>;
