import type { ComponentType, ReactNode } from "react";
import {
  Box, Caption, C, Frame, GroupBox, Ladder, Pipeline, Stack, textW, SANS,
  type Tone,
} from "@/components/docs/diagram-kit";

/** Diagrams for the core-concepts pages. Registered in `diagrams/index.tsx`. */

/* ------------------------------------------------------------------ *
 * 6 D's lifecycle — a genuine cycle, so the coordinates are placed by
 * hand: five stages across the top, Decide beneath, and a return edge
 * from Decide back into Define.
 * ------------------------------------------------------------------ */

const DS_STAGES: { title: string; note: string; tone?: Tone }[] = [
  { title: "Define", note: "(what)", tone: "primary" },
  { title: "Design", note: "(how)" },
  { title: "Develop", note: "(build)" },
  { title: "Deliver", note: "(ship)" },
  { title: "Discover", note: "(observe)" },
];

function LifecycleLoop() {
  const w = 112;
  const gap = 38;
  const top = 44;
  const h = 54;
  const xs = DS_STAGES.map((_, i) => 16 + i * (w + gap));
  const last = xs[xs.length - 1];
  const decideY = 170;
  const returnY = decideY + 27;

  return (
    <Frame width={744} height={240}
      label="The 6 D's lifecycle: Define, Design, Develop, Deliver and Discover run in sequence, Discover feeds Decide, and Decide feeds the next Define — closing the loop.">
      {DS_STAGES.map((s, i) => (
        <Box key={s.title} x={xs[i]} y={top} w={w} h={h}
          title={s.title} lines={[s.note]} tone={s.tone} />
      ))}
      {DS_STAGES.slice(1).map((_, i) => (
        <line key={`e${i}`} x1={xs[i] + w + 6} y1={top + h / 2} x2={xs[i + 1] - 6}
          y2={top + h / 2} stroke={C.strong} strokeWidth={1.5}
          markerEnd="url(#dk-arrow)" />
      ))}

      <Box x={272} y={decideY} w={200} h={54} title="Decide"
        lines={["(learn & steer)"]} tone="accent" />

      {/* Discover ─▶ Decide */}
      <path d={`M ${last + w / 2} ${top + h} L ${last + w / 2} ${returnY} L 478 ${returnY}`}
        fill="none" stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />

      {/* Decide ─▶ Define: the edge that makes this a loop, not a pipeline */}
      <path d={`M 272 ${returnY} L 72 ${returnY} L 72 ${top + h + 6}`}
        fill="none" stroke={C.primary} strokeWidth={1.5}
        markerEnd="url(#dk-arrow-primary)" />
      <Caption x={172} y={returnY - 8} anchor="middle" color={C.primary} weight={600}>
        feeds the next Define
      </Caption>
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * The handoff artifact each phase produces.
 * ------------------------------------------------------------------ */

const HandoffArtifacts = () => (
  <Pipeline
    label="Each of the six phases hands the next one an artifact: a catalog entry and CompositeProject, an XRD and policy guardrail, source and tests in Git, a signed image and Argo CD Application, metrics logs traces and cost, then budgets scorecards and roadmap change."
    caption="Every arrow is an artifact you can review and revert."
    stages={[
      { name: "Define", guarantee: "catalog entry +\nCompositeProject", tone: "primary" },
      { name: "Design", guarantee: "XRD +\npolicy guardrail" },
      { name: "Develop", guarantee: "source + tests\nin Git" },
      { name: "Deliver", guarantee: "signed image +\nArgo CD Application" },
      { name: "Discover", guarantee: "metrics, logs,\ntraces, cost" },
      { name: "Decide", guarantee: "budgets, scorecards,\nroadmap change", tone: "accent" },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Deliver: git push through to promotion. Eight steps, so vertical.
 * ------------------------------------------------------------------ */

const DeliverChain = () => (
  <Ladder
    label="The Deliver chain: a git push drives Tekton and buildpacks, Cosign signs, Harbor stores, Kyverno admits only signed images, then ArgoCD syncs, Argo Rollouts does canary or blue-green, and Kargo promotes dev to test to prod."
    boxW={196}
    rungs={[
      { name: "git push", adds: [], tone: "primary" },
      { name: "Tekton + buildpacks", adds: [] },
      { name: "Cosign sign", adds: [] },
      { name: "Harbor", adds: [] },
      { name: "Kyverno admits", adds: ["only signed images"], tone: "accent" },
      { name: "ArgoCD", adds: ["sync"] },
      { name: "Argo Rollouts", adds: ["canary / blue-green"] },
      { name: "Kargo promotion", adds: ["dev → test → prod"] },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * The four layers.
 * ------------------------------------------------------------------ */

const LayerStack = () => (
  <Stack
    label="The four layers: Layer 0 infrastructure providers, Layer 1 cluster foundation, Layer 2 platform services, Layer 3 developer experience. Each layer depends only on the one below it."
    sideLabel="depends on"
    layers={[
      {
        id: "L3", name: "Developer Experience", tone: "accent",
        items: "Adhar Console (Backstage) · Adhar CLI · Headlamp · Hubble UI · Grafana",
      },
      {
        id: "L2", name: "Platform Services — 91 GitOps packages", tone: "primary",
        items: "Security · Observability · Delivery · Data · AI (opt-in)",
      },
      {
        id: "L1", name: "Cluster Foundation — bootstrap, embedded manifests",
        items: "Cilium CNI + Gateway API · ArgoCD · Gitea · Crossplane control plane",
      },
      {
        id: "L0", name: "Infrastructure Providers",
        items: "Kind (local) · AWS · Azure · GCP · DigitalOcean · Civo · Custom",
      },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Two-phase bootstrap — a wrapped chain inside a phase container, a
 * handoff gate, then the continuous phase. Nested, so placed by hand.
 * ------------------------------------------------------------------ */

const BOOT_ROWS: { title: string; tone?: Tone }[][] = [
  [
    { title: "create cluster", tone: "primary" },
    { title: "CRDs + controller" },
    { title: "Gateway API CRDs" },
  ],
  [
    { title: "Cilium" },
    { title: "Cilium Gateway" },
    { title: "ArgoCD" },
    { title: "Gitea" },
    { title: "Crossplane" },
  ],
  [{ title: "seed Git repos (packages · environments · templates)" }],
  [{ title: "apply the ApplicationSet + repo credentials" }],
];

const BOOT_LEFT = 30;
const BOOT_TOP = 42;
const BOOT_H = 38;
const BOOT_ROW_GAP = 28;
const BOOT_GAP = 26;
const bootW = (title: string) => Math.max(88, Math.ceil(textW(title, 12)) + 24);

function BootstrapPhases() {
  const els: ReactNode[] = [];

  BOOT_ROWS.forEach((row, r) => {
    const y = BOOT_TOP + r * (BOOT_H + BOOT_ROW_GAP);
    const widths = row.map((n) => bootW(n.title));
    const xs: number[] = [];
    let x = BOOT_LEFT;
    row.forEach((_, i) => {
      xs.push(x);
      x += widths[i] + BOOT_GAP;
    });

    row.forEach((n, i) => {
      els.push(
        <Box key={`b${r}-${i}`} x={xs[i]} y={y} w={widths[i]} h={BOOT_H}
          title={n.title} titleSize={12} tone={n.tone} />,
      );
      if (i < row.length - 1) {
        els.push(
          <line key={`a${r}-${i}`} x1={xs[i] + widths[i] + 5} y1={y + BOOT_H / 2}
            x2={xs[i + 1] - 5} y2={y + BOOT_H / 2} stroke={C.strong}
            strokeWidth={1.5} markerEnd="url(#dk-arrow)" />,
        );
      }
    });

    if (r < BOOT_ROWS.length - 1) {
      const fromX = xs[row.length - 1] + widths[row.length - 1] / 2;
      const toX = BOOT_LEFT + bootW(BOOT_ROWS[r + 1][0].title) / 2;
      const midY = y + BOOT_H + BOOT_ROW_GAP / 2;
      els.push(
        <path key={`w${r}`} fill="none" stroke={C.strong} strokeWidth={1.5}
          markerEnd="url(#dk-arrow)"
          d={`M ${fromX} ${y + BOOT_H + 3} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${y + BOOT_H + BOOT_ROW_GAP - 3}`} />,
      );
    }
  });

  return (
    <Frame width={720} height={490}
      label="The two-phase bootstrap: phase 1 imperatively creates the cluster, CRDs and controller, Gateway API CRDs, Cilium, the Cilium Gateway, ArgoCD, Gitea and Crossplane, seeds the Git repos and applies the ApplicationSet; the RepositoriesCreated gate then hands off to phase 2, where ArgoCD syncs every enabled package from Git forever.">
      <GroupBox x={10} y={12} w={700} h={280}
        label="PHASE 1 — Imperative (deterministic, embedded manifests)" />
      {els}

      <line x1={360} y1={292} x2={360} y2={302} stroke={C.strong} strokeWidth={1.5} />
      <rect x={170} y={306} width={380} height={28} rx={14} fill={C.fill}
        stroke={C.strong} strokeWidth={1.25} />
      <text x={360} y={324} textAnchor="middle" fontFamily={SANS} fontSize={11.5}
        fontWeight={700} fill={C.text}>
        handoff gate: RepositoriesCreated
      </text>
      <line x1={360} y1={334} x2={360} y2={348} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      <GroupBox x={10} y={350} w={700} h={120}
        label="PHASE 2 — Declarative (GitOps, continuous)" />
      <Box x={40} y={382} w={560} h={52} tone="accent"
        title="ArgoCD syncs every enabled package from Git"
        lines={["self-heal on; drift is reverted within ~1 minute"]} />
      <path d="M 600 408 L 628 408 L 628 452 L 24 452 L 24 408 L 34 408"
        fill="none" stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
      <Caption x={326} y={446} anchor="middle">forever</Caption>
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Control plane vs data planes — nested containment, placed by hand.
 * ------------------------------------------------------------------ */

const DP_LINES = [
  "Your apps + thin agent profile:",
  "Cilium · Kyverno · Alloy · ESO · SPIRE",
];

function FleetTopology() {
  return (
    <Frame width={760} height={360}
      label="The control plane is the management cluster — GitOps, IaC, identity, the secrets root, the observability hub, the registry and the fleet controllers — and it runs no application workloads; it deploys to, collects telemetry from, and provisions the dev and prod data planes, which run your apps on a thin agent profile.">
      <Box x={90} y={30} w={580} h={110} title="CONTROL PLANE · management cluster"
        tone="primary"
        lines={[
          "GitOps: ArgoCD · Gitea | IaC: Crossplane | Identity: Keycloak (global OIDC)",
          "Secrets root: OpenBao + ESO | Observability hub: Grafana · Mimir · Loki · Tempo",
          "Registry/catalog: Harbor | Fleet controllers: AdharPlatform · DataPlane · Kargo",
          "runs NO application workloads",
        ]} />

      <line x1={120} y1={140} x2={120} y2={246} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Caption x={128} y={182}>deploys via</Caption>
      <Caption x={128} y={196}>ArgoCD</Caption>

      <line x1={300} y1={246} x2={300} y2={140} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Caption x={308} y={182}>ships telemetry</Caption>
      <Caption x={308} y={196}>(Alloy)</Caption>

      <line x1={560} y1={140} x2={560} y2={246} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Caption x={568} y={182}>provisions via</Caption>
      <Caption x={568} y={196}>Crossplane</Caption>

      <Box x={40} y={250} w={300} h={80} title="DATA PLANE (dev)" lines={DP_LINES} />
      <Caption x={380} y={295} anchor="middle" size={13}>…</Caption>
      <Box x={420} y={250} w={300} h={80} title="DATA PLANE (prod)" lines={DP_LINES} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * A request's life — four lanes with feedback edges, placed by hand.
 * ------------------------------------------------------------------ */

const LANES: [string, number][] = [
  ["developer", 16],
  ["Kubernetes API", 206],
  ["Crossplane", 396],
  ["provider", 636],
];

function RequestLife() {
  return (
    <Frame width={840} height={290}
      label="A request's life: the developer applies a CompositeDatabase in the team namespace, the Kubernetes API admits it against RBAC and schema, Crossplane selects a Composition by labels and runs the function pipeline to produce managed resources and a connection Secret, the provider creates and continuously reconciles RDS, Cloud SQL or CNPG, and the developer mounts the connection Secret.">
      {LANES.map(([name, x]) => (
        <text key={name} x={x} y={16} fontFamily={SANS} fontSize={10} fontWeight={700}
          fill={C.dim} letterSpacing="0.08em">
          {name.toUpperCase()}
        </text>
      ))}
      <line x1={16} y1={24} x2={824} y2={24} stroke={C.line} strokeWidth={1} />

      <Box x={16} y={36} w={160} h={58} title="kubectl apply" tone="primary"
        lines={["CompositeDatabase", "(team namespace)"]} />
      <line x1={182} y1={65} x2={200} y2={65} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      <Box x={206} y={36} w={160} h={58} title="admit" lines={["RBAC + schema"]} />
      <line x1={372} y1={65} x2={390} y2={65} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      <Box x={396} y={36} w={210} h={58} title="select Composition" lines={["by labels"]} />
      <line x1={612} y1={65} x2={630} y2={65} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      <Box x={636} y={36} w={180} h={58} title="create/converge"
        lines={["RDS / CloudSQL / CNPG"]} />

      <line x1={501} y1={94} x2={501} y2={128} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={396} y={132} w={210} h={62} title="run function pipeline" tone="accent"
        lines={["managed resources +", "connection Secret"]} />

      {/* provider keeps reconciling, and publishes the connection Secret back */}
      <path d="M 726 94 L 726 163 L 612 163" fill="none" stroke={C.strong}
        strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
      <Caption x={718} y={112} anchor="end">continuous</Caption>
      <Caption x={718} y={126} anchor="end">reconcile</Caption>

      <path d="M 440 194 L 440 240 L 222 240" fill="none" stroke={C.strong}
        strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
      <line x1={286} y1={94} x2={286} y2={240} stroke={C.line} strokeWidth={1.25} />
      <Box x={16} y={212} w={200} h={56} title="developer mounts"
        lines={["the connection Secret"]} />
      <Caption x={246} y={232}>(Secret in the team namespace)</Caption>
    </Frame>
  );
}

export const core_concepts = {
  "cc-lifecycle-loop": LifecycleLoop,
  "cc-handoff-artifacts": HandoffArtifacts,
  "cc-deliver-chain": DeliverChain,
  "cc-layer-stack": LayerStack,
  "cc-bootstrap-phases": BootstrapPhases,
  "cc-fleet-topology": FleetTopology,
  "cc-request-life": RequestLife,
} as Record<string, ComponentType>;
