import type { ComponentType } from "react";
import {
  Box, Caption, C, Frame, Ladder, Pipeline, Stack,
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
    label="Each of the six phases hands the next one an artifact: a catalog entry and Project, an XRD and policy guardrail, source and tests in Git, a signed image and Argo CD Application, metrics logs traces and cost, then budgets scorecards and roadmap change."
    caption="Every arrow is an artifact you can review and revert."
    stages={[
      { name: "Define", guarantee: "catalog entry +\nProject", tone: "primary" },
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
        id: "L2", name: "Platform Services — GitOps packages", tone: "primary",
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

export const core_concepts = {
  "cc-lifecycle-loop": LifecycleLoop,
  "cc-handoff-artifacts": HandoffArtifacts,
  "cc-deliver-chain": DeliverChain,
  "cc-layer-stack": LayerStack,
} as Record<string, ComponentType>;
