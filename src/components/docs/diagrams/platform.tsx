import type { ComponentType } from "react";
import {
  Box, Caption, C, Frame, GroupBox, Ladder, Stack,
} from "@/components/docs/diagram-kit";

/**
 * The docs diagram registry.
 *
 * Markdown embeds one with a fenced block whose body is the diagram key:
 *
 *     ```diagram
 *     write-path
 *     ```
 *
 * Most diagrams are described as data and laid out by the primitives in
 * `diagram-kit`. Only genuinely irregular pictures (loops, nested topology)
 * place their own coordinates.
 */

/* ---------------- write path: a loop, so laid out by hand ---------------- */

function WritePath() {
  return (
    <Frame width={720} height={268}
      label="The write path: a commit goes to in-cluster Gitea, ArgoCD reconciles it onto the cluster, and you observe the result through the Console, CLI, Grafana and Hubble.">
      <Box x={16} y={40} w={116} h={52} title="you" tone="primary" />
      <Box x={238} y={40} w={132} h={52} title="Gitea" lines={["in-cluster Git"]} />
      <Box x={476} y={32} w={228} h={68} title="ArgoCD" lines={["ApplicationSet"]} tone="accent" />

      <line x1={132} y1={66} x2={230} y2={66} stroke={C.primary} strokeWidth={1.5}
        markerEnd="url(#dk-arrow-primary)" />
      <Caption x={181} y={56} anchor="middle" color={C.primary} weight={600}>commit</Caption>

      <line x1={370} y1={66} x2={468} y2={66} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Caption x={419} y={56} anchor="middle">reads</Caption>
      <Caption x={304} y={112} anchor="middle" size={10.5}>the only write path</Caption>

      <line x1={590} y1={100} x2={590} y2={160} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Caption x={600} y={124} size={10.5}>apply</Caption>
      <Caption x={600} y={138} size={10.5}>self-heal ~60s</Caption>

      <Box x={476} y={160} w={228} h={52} title="cluster" />

      <path d="M 476 186 L 74 186 L 74 100" fill="none" stroke={C.line}
        strokeWidth={1.5} strokeDasharray="4 4" markerEnd="url(#dk-arrow)" />
      <Caption x={275} y={178} anchor="middle" size={11} weight={600}>observe</Caption>
      <Caption x={275} y={206} anchor="middle" size={10.5}>
        Console · CLI · Grafana · Hubble
      </Caption>
      <Caption x={16} y={244}>
        A commit is the only thing that can change the cluster — ArgoCD reverts anything else.
      </Caption>
    </Frame>
  );
}

/* ---------------- data-driven diagrams ---------------- */

const LayerStack = () => (
  <Stack
    label="The layer stack: L0 infrastructure, L1 cluster foundation, L2 platform services, L3 developer experience. Each layer depends only on the one below it."
    sideLabel="depends on"
    caption="Swap a cloud at L0 without touching packages at L2."
    layers={[
      { id: "L3", name: "Developer Experience", items: "Console · CLI · Headlamp · Grafana", tone: "accent" },
      { id: "L2", name: "Platform Services", items: "100+ GitOps packages — data, security, delivery, AI", tone: "primary" },
      { id: "L1", name: "Cluster Foundation", items: "Cilium · ArgoCD · Gitea · Crossplane · Keycloak" },
      { id: "L0", name: "Infrastructure", items: "Kind · AWS · Azure · GCP · DigitalOcean · Civo" },
    ]}
  />
);

const ConfigLayers = () => (
  <Stack
    label="Configuration resolves in four layers: globalSettings, then providers, then environmentTemplates, then environments. Each layer overrides the one above it."
    sideLabel="overrides"
    caption="Only the bottom two overlap, so precedence is really one question: template or environment?"
    layers={[
      { id: "1", name: "globalSettings", items: "What is true for the whole platform — host, ports, HA, ACME email" },
      { id: "2", name: "providers", items: "Which cloud, and how to authenticate to it" },
      { id: "3", name: "environmentTemplates", items: "What several environments have in common", tone: "primary" },
      { id: "4", name: "environments", items: "What is specific to THIS one — the thing --env names", tone: "accent" },
    ]}
  />
);

const PavedRoad = () => (
  <Ladder
    label="The paved road from commit to production: commit, build, scan, sign, store, admit, roll out, observe — each stage adding a guarantee the next one can rely on."
    heading={["stage", "guarantee it adds"]}
    caption="Each guarantee is a property of the road, not a gate someone has to remember to staff."
    rungs={[
      { name: "commit", detail: "reviewed", adds: ["who wrote this change, and who agreed to it"] },
      { name: "build", detail: "pipeline, not a laptop", tone: "primary", adds: ["provenance: this artifact came from that", "commit, reproducibly"] },
      { name: "scan", detail: "dependencies, image", adds: ["no known-critical vulnerability at build", "time; an SBOM exists"] },
      { name: "sign", detail: "pipeline identity", adds: ["the digest is attested by the build", "system, not by a person"] },
      { name: "store", detail: "registry", adds: ["an immutable digest and a retention", "and promotion model"] },
      { name: "admit", detail: "policy engine", tone: "accent", adds: ["only signed, scanned images from a", "known registry ever run"] },
      { name: "roll out", detail: "progressive", adds: ["a bad version reaches a fraction of", "traffic before it reaches all"] },
      { name: "observe", detail: "telemetry on by default", adds: ["you learn it is broken without a", "customer telling you"] },
    ]}
  />
);

function LocalTopology() {
  return (
    <Frame width={720} height={366}
      label="A local install: the adhar CLI drives your container engine, which runs a single Kind node named adhar plus nine pull-through registry cache containers. Host ports 8443 and 8080 map to the platform Gateway, and cache misses fetch once from the upstream registries.">
      <GroupBox x={12} y={26} w={512} h={252} label="your machine" />

      <Box x={34} y={58} w={130} h={44} title="adhar CLI" tone="primary" />
      <line x1={164} y1={80} x2={196} y2={80} stroke={C.primary} strokeWidth={1.5}
        markerEnd="url(#dk-arrow-primary)" />
      <Caption x={180} y={70} anchor="middle" color={C.primary} weight={600}>drives</Caption>
      <Caption x={34} y={124}>through Kind's Go library</Caption>
      <Caption x={34} y={138}>— no kind binary</Caption>

      <GroupBox x={200} y={48} w={312} h={208} label="container engine · Docker / Podman" />
      <Box x={216} y={74} w={280} h={84} title="Kind node · cluster adhar" tone="accent"
        lines={["Cilium — CNI and kube-proxy", "Gateway · ArgoCD · Gitea · Crossplane"]} />
      <Box x={216} y={180} w={280} h={58} title="registry cache × 9"
        lines={["registry:3.0.0 · one per upstream host"]} />

      <line x1={356} y1={158} x2={356} y2={178} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Caption x={366} y={173} size={10}>containerd certs.d mirrors</Caption>

      <Box x={556} y={170} w={150} h={74} title="upstream"
        lines={["docker.io · ghcr.io", "quay.io · +6 more"]} />
      <path d="M 496 207 L 550 207" fill="none" stroke={C.line} strokeWidth={1.5}
        strokeDasharray="4 4" markerEnd="url(#dk-arrow)" />
      <Caption x={523} y={198} anchor="middle" size={10}>miss</Caption>

      <Box x={34} y={296} w={130} h={40} title="browser" />
      <path d="M 164 316 L 186 316 L 186 116 L 212 116" fill="none" stroke={C.primary}
        strokeWidth={1.5} markerEnd="url(#dk-arrow-primary)" />
      <Caption x={34} y={356} color={C.primary} weight={600}>
        host :8443 / :8080 → the platform Gateway
      </Caption>

      <Caption x={216} y={300}>
        Every URL is *.adhar.localtest.me:8443 — it resolves to 127.0.0.1, so there is
      </Caption>
      <Caption x={216} y={316}>
        no hosts file to edit. The caches survive adhar down, so the next install pulls
      </Caption>
      <Caption x={216} y={332}>
        its ~90 images from local disk instead of the internet.
      </Caption>
    </Frame>
  );
}

export const PLATFORM_DIAGRAMS: Record<string, ComponentType> = {
  "write-path": WritePath,
  "layer-stack": LayerStack,
  "local-topology": LocalTopology,
  "paved-road": PavedRoad,
  "config-layers": ConfigLayers,
};
