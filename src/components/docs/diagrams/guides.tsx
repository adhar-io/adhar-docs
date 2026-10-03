import type { ComponentType } from "react";
import {
  Box, Caption, C, Flow, Frame, GroupBox, Ladder,
} from "@/components/docs/diagram-kit";

/** Diagrams for the guides pages. Registered in `diagrams/index.tsx`. */

/* ------------------------------------------------------------------ *
 * Getting Started — Your First Service
 * ------------------------------------------------------------------ */

const CompositeApplicationChain = () => (
  <Flow
    label="What you declare becomes a CompositeApplication, which Crossplane expands into an ArgoCD Application, which reconciles your workload — a Deployment, a Service and an HTTPRoute."
    caption="reconciled from Git, self-healing"
    nodes={[
      { title: "you", tone: "primary" },
      {
        title: "CompositeApplication",
        lines: ["platform.adhar.io/", "v1alpha1", "(what you declare)"],
      },
      { title: "ArgoCD Application", lines: ["GitOps sync"] },
      {
        title: "your workload",
        lines: ["Deployment", "Service", "HTTPRoute"],
        tone: "accent",
      },
    ]}
  />
);

/* The sync loop has a feedback edge, so it places its own coordinates. */
function SyncStates() {
  return (
    <Frame
      width={770}
      height={290}
      label="The GitOps loop: a push lands in Gitea, ArgoCD polls and compares desired against live, and the application moves OutOfSync, apply, Progressing, Healthy — with self-heal reverting a manual kubectl edit."
    >
      <Box x={14} y={26} w={240} h={46} title="git push / scaffold commit" tone="primary" />
      <line x1={134} y1={74} x2={134} y2={94} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      <Box x={14} y={96} w={240} h={46} title="Gitea" />
      <line x1={256} y1={119} x2={336} y2={119} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Caption x={296} y={110} anchor="middle">ArgoCD polls</Caption>

      <Box x={340} y={90} w={240} h={58} title="ArgoCD"
        lines={["compares desired vs live"]} />

      <path d="M 460 150 L 460 166 L 292 166 L 292 178" fill="none" stroke={C.strong}
        strokeWidth={1.5} markerEnd="url(#dk-arrow)" />

      <Box x={238} y={180} w={108} h={46} title="OutOfSync" />
      <line x1={348} y1={203} x2={374} y2={203} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={376} y={180} w={92} h={46} title="apply" />
      <line x1={470} y1={203} x2={496} y2={203} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={498} y={180} w={124} h={46} title="Progressing" />
      <line x1={624} y1={203} x2={650} y2={203} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={652} y={180} w={92} h={46} title="Healthy" tone="accent" />

      <path d="M 292 228 L 292 250 L 134 250 L 134 146" fill="none" stroke={C.line}
        strokeWidth={1.5} strokeDasharray="4 4" markerEnd="url(#dk-arrow)" />
      <Caption x={213} y={244} anchor="middle" size={11} weight={600}>self-heal</Caption>
      <Caption x={213} y={270} anchor="middle">
        (a manual kubectl edit is reverted)
      </Caption>
    </Frame>
  );
}

/* The CI pipeline fans out and back in, so it places its own coordinates. */
function CiPipeline() {
  const fanY = [10, 62, 114, 166, 218];
  const fan: { title: string; lines?: string[] }[] = [
    { title: "tests" },
    { title: "gitleaks", lines: ["secret scan"] },
    { title: "source scan" },
    { title: "Trivy", lines: ["image vulnerabilities"] },
    { title: "Syft", lines: ["SBOM"] },
  ];
  return (
    <Frame
      width={800}
      height={540}
      label="The CI pipeline a repo runs on every push: clone, buildpacks build, then tests, gitleaks, source scan, Trivy and Syft in parallel; all must pass before Cosign signs, the SBOM is attested and verified, the image is pushed to Harbor, and a GitOps write-back pins the digest so ArgoCD deploys it."
    >
      <Box x={14} y={114} w={96} h={44} title="clone" tone="primary" />
      <line x1={112} y1={136} x2={134} y2={136} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={138} y={114} w={176} h={44} title="buildpacks build" />

      {/* fan out */}
      <line x1={316} y1={136} x2={348} y2={136} stroke={C.strong} strokeWidth={1.5} />
      <line x1={348} y1={32} x2={348} y2={240} stroke={C.strong} strokeWidth={1.5} />
      {fanY.map((cy) => (
        <line key={`o${cy}`} x1={348} y1={cy + 22} x2={386} y2={cy + 22}
          stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
      ))}
      {fan.map((f, i) => (
        <Box key={i} x={392} y={fanY[i]} w={200} h={44} title={f.title} lines={f.lines} />
      ))}

      {/* fan in */}
      {fanY.map((cy) => (
        <line key={`i${cy}`} x1={594} y1={cy + 22} x2={636} y2={cy + 22}
          stroke={C.line} strokeWidth={1.5} />
      ))}
      <line x1={636} y1={32} x2={636} y2={240} stroke={C.line} strokeWidth={1.5} />
      <line x1={636} y1={136} x2={654} y2={136} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={658} y={114} w={132} h={44} title="all must pass" tone="muted" />

      <path d="M 724 160 L 724 282 L 79 282 L 79 308" fill="none" stroke={C.strong}
        strokeWidth={1.5} markerEnd="url(#dk-arrow)" />

      <Box x={14} y={310} w={130} h={44} title="Cosign sign" />
      <line x1={146} y1={332} x2={196} y2={332} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={200} y={310} w={140} h={44} title="attest SBOM" />
      <line x1={342} y1={332} x2={392} y2={332} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={396} y={310} w={100} h={44} title="verify" />

      <line x1={446} y1={356} x2={446} y2={384} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={330} y={386} w={232} h={52} title="push to Harbor"
        lines={[":latest and :<commit sha>"]} />

      <line x1={446} y1={440} x2={446} y2={464} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={296} y={466} w={300} h={52} title="GitOps write-back"
        lines={["pin the image to :<sha>, commit, push"]} />
      <line x1={598} y1={492} x2={624} y2={492} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={628} y={470} w={172} h={44} title="ArgoCD deploys it" tone="accent" />
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Getting Started — Quick Start
 * ------------------------------------------------------------------ */

const AdharUpStages = () => (
  <Ladder
    width={760}
    label="What adhar up does, in order: create the Kind node, install the CRDs and controller, apply the embedded foundation manifests, seed Git, apply the ApplicationSet, reconcile Crossplane, then hand off to ArgoCD."
    heading={["adhar up", "what it does"]}
    rungs={[
      {
        name: "1. Kind node",
        tone: "primary",
        adds: [
          "Create the Kind node `adhar`",
          "default CNI off · kube-proxy off · host 8443/8080 → 30443/30080",
        ],
      },
      {
        name: "2. CRDs + controller",
        adds: ["Install the Adhar CRDs and start the controller"],
      },
      {
        name: "3. Foundation",
        adds: [
          "From manifests embedded in the binary (no network fetch):",
          "Gateway API CRDs → Cilium → Gateway → [CNPG, if --ha] → ArgoCD → Gitea",
        ],
      },
      {
        name: "4. Seed Git",
        adds: [
          "Create and fill two repos in the `adhar` Gitea org",
          "`packages` (every package's manifests, ~62 MB)",
          "`environments` (which packages each environment enables)",
        ],
      },
      {
        name: "5. ApplicationSet",
        adds: ["Apply the ArgoCD ApplicationSet (101 entries; 17 enabled locally)"],
      },
      {
        name: "6. Crossplane",
        adds: [
          "Reconcile Crossplane — deliberately AFTER the ApplicationSet, so",
          "its slow convergence can never block app delivery",
        ],
      },
      {
        name: "7. GitOps sync",
        tone: "accent",
        adds: [
          "ArgoCD syncs every enabled package from Git",
          "◀ GitOps owns it now",
        ],
      },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Operations — Accessing the Platform
 * ------------------------------------------------------------------ */

const RequestPath = () => (
  <Ladder
    width={790}
    boxW={240}
    label="The request path: a client resolves the service hostname, reaches the edge address, hits the Cilium-generated Gateway Service, terminates TLS at the Gateway, matches an HTTPRoute, and lands on the backing Service and its pods."
    heading={["layer", "what happens there"]}
    rungs={[
      {
        name: "client",
        detail: "browser, curl, kubectl",
        tone: "primary",
        adds: [
          "1. resolve console.<defaultHost>",
          "cloud: external-dns published an A record → Gateway LB IP",
          "local: *.localtest.me is public DNS → 127.0.0.1",
        ],
      },
      {
        name: "edge address",
        adds: [
          "2. cloud: cloud LoadBalancer on :443",
          "local: Docker host port :8443 → node port 30443",
        ],
      },
      {
        name: "Service",
        detail: "cilium-gateway-adhar-gateway",
        adds: [
          "3. generated by Cilium for Gateway/adhar-gateway, in adhar-system",
          "cloud: type LoadBalancer   ·   local: type NodePort",
        ],
      },
      {
        name: "Gateway/adhar-gateway",
        detail: "TLS terminates here",
        tone: "accent",
        adds: [
          "4. HTTPS listener presents Secret/adhar-cert",
          "cloud: cert-manager wildcard *.<defaultHost> (DNS-01)",
          "local: self-signed platform certificate",
        ],
      },
      {
        name: "HTTPRoute",
        detail: "parentRefs → adhar-gateway",
        adds: [
          '5. hostnames: ["console.<defaultHost>"]',
          "shipped by the package itself",
        ],
      },
      {
        name: "Service/adhar-console",
        adds: ["pods"],
      },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Operations — Customization
 * ------------------------------------------------------------------ */

const SourceOfTruth = () => (
  <Flow
    label="The source of truth: you edit the Adhar checkout, adhar upgrade pushes it to the in-cluster Gitea that holds ArgoCD's desired state, and ArgoCD syncs it onto the cluster objects in adhar-system."
    nodes={[
      {
        title: "your Adhar checkout",
        lines: ["platform/stack/packages/", "<cat>/<pkg>/", "(you edit here)"],
        tone: "primary",
      },
      {
        title: "Gitea adhar/packages",
        lines: ["in-cluster git", "ArgoCD's desired state"],
      },
      {
        title: "cluster objects",
        lines: ["in adhar-system", "(never edit here)"],
        tone: "accent",
      },
    ]}
    edges={[
      { label: "adhar upgrade", tone: "primary" },
      { label: "ArgoCD sync" },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Core Concepts — Platform Services
 * ------------------------------------------------------------------ */

/* An annotated loop back onto itself, so it places its own coordinates. */
function ApplicationSetFlow() {
  return (
    <Frame
      width={700}
      height={230}
      label="One ApplicationSet reads adhar/packages from Git and, filtering on the selector enabled=true, produces an Application per package whose workloads land in adhar-system; self-heal reverts drift within about a minute and prune removes what you disabled."
    >
      <Box x={14} y={30} w={180} h={52} title="adhar/packages" lines={["Git"]} tone="primary" />
      <line x1={196} y1={56} x2={236} y2={56} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      <Box x={240} y={30} w={180} h={52} title="ApplicationSet" />
      <line x1={330} y1={84} x2={330} y2={98} stroke={C.line} strokeWidth={1} />
      <Caption x={330} y={112} anchor="middle">selector: enabled=&quot;true&quot;</Caption>

      <line x1={422} y1={56} x2={466} y2={56} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={470} y={30} w={170} h={52} title="Application" lines={["per package"]} />

      <line x1={555} y1={84} x2={555} y2={116} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={430} y={118} w={250} h={48} title="workloads in adhar-system" tone="accent" />

      <path d="M 555 168 L 555 196 L 324 196" fill="none" stroke={C.line}
        strokeWidth={1.5} strokeDasharray="4 4" markerEnd="url(#dk-arrow)" />
      <Caption x={316} y={192} anchor="end" weight={600}>
        self-heal reverts drift  (~1 min)
      </Caption>
      <Caption x={316} y={210} anchor="end">
        prune removes what you disabled
      </Caption>
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Operations — Observability
 * ------------------------------------------------------------------ */

/* A fan-in into Alloy then a fan-out into the stores, so it places its
 * own coordinates. */
function ObservabilitySignals() {
  const stores: { x: number; cx: number; title: string; line: string }[] = [
    { x: 20, cx: 102, title: "Prometheus", line: "10d · local" },
    { x: 215, cx: 297, title: "Loki", line: "logs" },
    { x: 410, cx: 492, title: "Tempo", line: "traces" },
    { x: 645, cx: 727, title: "Mimir", line: "long-term metrics" },
  ];
  return (
    <Frame
      width={850}
      height={540}
      minWidth={680}
      label="The observability signal flow: your service sends OTLP on :4317 grpc and :4318 http while platform components expose /metrics through a ServiceMonitor or PodMonitor; Grafana Alloy receives, scrapes and tails on every node of every cluster, relabels each stream and stamps the cluster label, then ships to Loki, Tempo and Mimir at the HUB_LOKI_URL, HUB_TEMPO_URL and HUB_MIMIR_URL endpoints, alongside a local 10-day Prometheus, with span-metrics and service-graphs remote-written from Tempo into Mimir and Grafana querying all four."
    >
      {/* fan in — the two ways signal reaches Alloy */}
      <Box x={40} y={14} w={330} h={58} titleSize={12} title="YOUR SERVICE"
        lines={["OTLP :4317 grpc / :4318 http", "(traces + metrics + logs)"]}
        tone="primary" />
      <Box x={440} y={14} w={330} h={58} titleSize={12} title="PLATFORM COMPONENT"
        lines={["/metrics", "(ServiceMonitor / PodMonitor)"]} />
      <line x1={205} y1={74} x2={205} y2={96} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <line x1={605} y1={74} x2={605} y2={96} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      <Box
        x={20} y={100} w={790} h={130} title="Grafana Alloy" tone="accent"
        lines={[
          "agent on every node, every cluster",
          "otelcol.receiver.otlp → 0.0.0.0:4317 / 0.0.0.0:4318",
          "prometheus.scrape → pods with prometheus.io/scrape=true",
          "loki.source.kubernetes → container stdout/stderr",
          "relabels every stream with namespace/pod/container/node/app",
          "and stamps external_labels { cluster = HUB_CLUSTER_NAME }",
        ]}
      />

      {/* fan out — one labelled push per store */}
      {[
        { cx: 297, url: "HUB_LOKI_URL", target: "(loki:3100)" },
        { cx: 492, url: "HUB_TEMPO_URL", target: "(tempo:4318)" },
        { cx: 727, url: "HUB_MIMIR_URL", target: "(mimir-gateway)" },
      ].map((p) => (
        <g key={p.url}>
          <line x1={p.cx} y1={232} x2={p.cx} y2={296} stroke={C.strong}
            strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
          <Caption x={p.cx + 8} y={254}>{p.url}</Caption>
          <Caption x={p.cx + 8} y={268}>{p.target}</Caption>
        </g>
      ))}

      {stores.map((s) => (
        <Box key={s.title} x={s.x} y={300} w={165} h={52}
          title={s.title} lines={[s.line]} />
      ))}

      {/* Tempo's metrics generator remote-writes into Mimir */}
      <line x1={577} y1={326} x2={641} y2={326} stroke={C.line} strokeWidth={1.5}
        strokeDasharray="4 4" markerEnd="url(#dk-arrow)" />
      <line x1={609} y1={330} x2={609} y2={360} stroke={C.line} strokeWidth={1} />
      <Caption x={609} y={374} anchor="middle">span-metrics and service-graphs</Caption>
      <Caption x={609} y={388} anchor="middle">remote-written Tempo → Mimir</Caption>

      {/* fan in to the single pane */}
      {stores.map((s) => (
        <line key={`q${s.cx}`} x1={s.cx} y1={354} x2={s.cx} y2={416}
          stroke={C.line} strokeWidth={1.5} />
      ))}
      <line x1={102} y1={416} x2={727} y2={416} stroke={C.line} strokeWidth={1.5} />
      <line x1={420} y1={416} x2={420} y2={438} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      <Box x={320} y={440} w={200} h={52} title="Grafana"
        lines={["fixed datasource UIDs"]} tone="accent" />
      <Caption x={540} y={460}>prometheus | mimir | loki</Caption>
      <Caption x={540} y={476}>tempo | pyroscope</Caption>

      <Caption x={20} y={520}>
        Spokes run Alloy only; the four HUB_* values come from the observability-hub ConfigMap.
      </Caption>
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Platform Engineering — Golden Paths
 * ------------------------------------------------------------------ */

/* The path branches at the escape hatch, so it places its own coordinates. */
function GoldenPathEscapeHatch() {
  const row = [
    { x: 262, title: "scaffold" },
    { x: 394, title: "build" },
    { x: 526, title: "deploy" },
  ];
  const row2 = [
    { x: 262, title: "observe" },
    { x: 394, title: "operate" },
    { x: 526, title: "upgrade" },
  ];
  return (
    <Frame
      width={840}
      height={300}
      label='A golden path takes "I need a new service" through scaffold, build, deploy, observe, operate and upgrade to production as one supported, versioned route — and has a documented escape hatch off it, still legal and needing no permission, where you own the wiring and the upgrades instead.'
    >
      <Box x={12} y={78} w={200} h={46} titleSize={12}
        title={'"I need a new service"'} tone="primary" />
      <line x1={214} y1={101} x2={240} y2={101} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      <GroupBox x={244} y={30} w={450} h={136}
        label="GOLDEN PATH — supported, versioned" />

      {row.map((b, i) => (
        <g key={b.title}>
          <Box x={b.x} y={58} w={114} h={32} titleSize={12} title={b.title} />
          {i < row.length - 1 && (
            <line x1={b.x + 116} y1={74} x2={b.x + 130} y2={74}
              stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
          )}
        </g>
      ))}

      <path d="M 642 74 L 664 74 L 664 102 L 250 102 L 250 130 L 260 130"
        fill="none" stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />

      {row2.map((b, i) => (
        <g key={b.title}>
          <Box x={b.x} y={114} w={114} h={32} titleSize={12} title={b.title} />
          {i < row2.length - 1 && (
            <line x1={b.x + 116} y1={130} x2={b.x + 130} y2={130}
              stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
          )}
        </g>
      ))}

      <line x1={642} y1={130} x2={708} y2={130} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={714} y={108} w={110} h={44} title="prod" tone="accent" />

      {/* the escape hatch — the whole argument */}
      <line x1={469} y1={168} x2={469} y2={196} stroke={C.line} strokeWidth={1.5}
        strokeDasharray="4 4" markerEnd="url(#dk-arrow)" />
      <Caption x={461} y={182} anchor="end" weight={600}>
        escape hatch (still legal)
      </Caption>
      <Caption x={477} y={176}>documented, visible</Caption>
      <Caption x={477} y={190}>no support promise</Caption>

      <Box x={330} y={198} w={280} h={58} tone="muted" title="off-path"
        lines={["you own the wiring", "and the upgrades"]} />

      <Caption x={12} y={282}>
        A route you cannot step off is a gilded cage — leaving needs no permission, only the
        acceptance that the support promise narrows.
      </Caption>
    </Frame>
  );
}

export const guides = {
  "gd-composite-application": CompositeApplicationChain,
  "gd-sync-states": SyncStates,
  "gd-ci-pipeline": CiPipeline,
  "gd-adhar-up-stages": AdharUpStages,
  "gd-request-path": RequestPath,
  "gd-source-of-truth": SourceOfTruth,
  "gd-applicationset-flow": ApplicationSetFlow,
  "gd-observability-signals": ObservabilitySignals,
  "gd-golden-path-escape-hatch": GoldenPathEscapeHatch,
} as Record<string, ComponentType>;
