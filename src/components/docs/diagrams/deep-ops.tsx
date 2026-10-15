import type { ComponentType } from "react";
import {
  Box, Caption, C, Flow, Frame, GroupBox, Ladder, MONO, Pipeline, SANS, Split, Stack,
  toneOf,
} from "@/components/docs/diagram-kit";
import type { Tone } from "@/components/docs/diagram-kit";

/** Diagrams owned by the deep-ops pages. Every key is prefixed "do-". */

/* ------------------------------------------------------------------ *
 * Production — the three topologies, side by side.
 * Irregular (nested clusters), so laid out by hand.
 * ------------------------------------------------------------------ */

function Topologies() {
  return (
    <Frame width={960} height={322}
      label="Three topologies. T1: one Kind node on a laptop, the manager runs inside the CLI. T2: one cloud cluster runs the platform and the workloads behind a cloud load balancer. T3: a management cluster provisions and deploys to separate workload clusters.">
      {/* T1 */}
      <GroupBox x={8} y={8} w={280} h={262} label="T1 · Local (Kind)" />
      <Box x={28} y={48} w={240} h={70} title="Kind node"
        lines={["foundation + local core", "self-signed TLS"]} />
      <line x1={148} y1={122} x2={148} y2={146} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={28} y={150} w={240} h={58} title="adhar up" tone="muted"
        lines={["manager runs in the CLI,", "exits when apps converge"]} />
      <Caption x={148} y={240} anchor="middle">evaluate · develop · CI</Caption>

      {/* arrow T1 -> T2 */}
      <line x1={292} y1={139} x2={330} y2={139} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      {/* T2 */}
      <GroupBox x={334} y={8} w={300} h={262} label="T2 · Single production cluster" />
      <Box x={354} y={46} w={260} h={56} title="cloud LB → Gateway"
        lines={["external-dns · wildcard TLS"]} />
      <line x1={484} y1={106} x2={484} y2={130} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Box x={354} y={134} w={260} h={84} title="one cluster" tone="primary"
        lines={["platform + workloads", "in-cluster controller manager", "enableHAMode: true"]} />
      <Caption x={484} y={246} anchor="middle">one failure domain, one upgrade window</Caption>

      {/* arrow T2 -> T3 */}
      <line x1={638} y1={139} x2={656} y2={139} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />

      {/* T3 */}
      <GroupBox x={660} y={8} w={292} h={262} label="T3 · Management + workload" />
      <Box x={680} y={44} w={252} h={74} title="management cluster" tone="primary"
        lines={["Gitea · ArgoCD · Crossplane", "Keycloak · telemetry hub"]} />
      <line x1={738} y1={122} x2={738} y2={166} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <line x1={874} y1={122} x2={874} y2={166} stroke={C.strong} strokeWidth={1.5}
        markerEnd="url(#dk-arrow)" />
      <Caption x={806} y={140} anchor="middle">Cluster XR</Caption>
      <Caption x={806} y={153} anchor="middle">+ ApplicationSets</Caption>
      <Box x={680} y={170} w={116} h={56} title="workload" lines={["apps + agents"]} />
      <Box x={816} y={170} w={116} h={56} title="workload" lines={["apps + agents"]} />
      <Caption x={806} y={250} anchor="middle">blast radius per cluster</Caption>

      <Caption x={8} y={300}>
        Promotion between topologies is configuration: the same config file, the same packages, all state in Git.
      </Caption>
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Production — exactly what enableHAMode changes.
 * ------------------------------------------------------------------ */

const HaMode = () => (
  <Split
    width={760}
    label="What enableHAMode changes. Off: single-replica ArgoCD, plain Redis, Gitea on its bundled PostgreSQL, one Crossplane replica, a one-instance Keycloak database. On: ArgoCD application controller times two, server and repo-server autoscaled from two with PodDisruptionBudgets, Redis HA, Gitea's database on a two-instance CNPG cluster, the CNPG operator added to the foundation, two Crossplane replicas, a two-instance Keycloak database."
    caption="Unchanged either way: Gitea runs one replica (behind a PDB in HA), and the control-plane node count."
    left={{
      heading: "enableHAMode: false",
      tone: "muted",
      items: [
        "ArgoCD application controller × 1",
        "ArgoCD server, repo-server × 1, no PDBs",
        "Redis: one pod",
        "Gitea DB: chart-bundled PostgreSQL",
        "CNPG operator: installed later, from the stack",
        "Crossplane × 1",
        "Keycloak DB: one CNPG instance",
      ],
    }}
    right={{
      heading: "enableHAMode: true",
      tone: "primary",
      items: [
        "ArgoCD application controller × 2 + PDB",
        "server, repo-server: HPA 2–5 each + PDBs",
        "redis-ha × 3 + haproxy × 3",
        "Gitea DB: CNPG cluster gitea-db, 2 instances",
        "CNPG operator joins the foundation, first",
        "Crossplane × 2 (install-ha.yaml)",
        "Keycloak DB: keycloak-db, 2 instances",
      ],
    }}
  />
);

/* ------------------------------------------------------------------ *
 * Security — defence in depth, outside in.
 * ------------------------------------------------------------------ */

const DefenceLayers = () => (
  <Stack
    width={780}
    sideLabel="attacker path, outside in"
    label="Defence in depth, outside in: the Gateway edge, identity, admission, network, secrets and runtime detection. Each layer lists what ships switched on and what you must enable."
    caption="Filled = on in the production profile. Outlined = ships, but you switch it on. Workload-to-workload mTLS is not provided."
    layers={[
      { id: "1", name: "Edge — the only public entry", tone: "primary",
        items: "Cilium Gateway · one LoadBalancer · cert-manager TLS · external-dns scoped to one zone" },
      { id: "2", name: "Identity — who is asking", tone: "primary",
        items: "Keycloak OIDC on every UI · rotation on in production · apiserver OIDC is day-2, yours" },
      { id: "3", name: "Admission — what may run", tone: "primary",
        items: "supply-chain Enforce in production · Pod Security policies ship in Audit" },
      { id: "4", name: "Network — who may talk", tone: "muted",
        items: "per-tenant ingress isolation ships · default-deny and WireGuard are yours" },
      { id: "5", name: "Secrets — what they can read", tone: "muted",
        items: "OpenBao + External Secrets ship · KMS auto-unseal, etcd encryption are yours" },
      { id: "6", name: "Runtime — what they did", tone: "plain",
        items: "Falco + Tetragon detect in production — they alert, they do not block" },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * CLI — the command map, grouped by persona as `adhar --help` groups it.
 * ------------------------------------------------------------------ */

type Persona = { name: string; blurb: string; cmds: string[]; key?: string[] };

const PERSONAS: Persona[] = [
  {
    name: "Develop", blurb: "build, ship, self-serve",
    cmds: ["ai", "application", "bucket", "cache", "database", "environment",
      "gitops", "pipeline", "project", "routes", "storage"],
    key: ["application", "database"],
  },
  {
    name: "Observe", blurb: "health, logs, metrics",
    cmds: ["events", "get", "health", "logs", "metrics", "network", "traces"],
    key: ["get"],
  },
  {
    name: "Operate", blurb: "day-2 operations",
    cmds: ["backup", "cluster", "restore", "scale", "upgrade"],
    key: ["upgrade", "cluster"],
  },
  {
    name: "Administer", blurb: "lifecycle, governance",
    cmds: ["auth", "compliance", "config", "controller", "cost", "down", "fleet",
      "policy", "secrets", "security", "stack", "up", "webhook"],
    key: ["up", "stack"],
  },
  {
    name: "Utilities", blurb: "tooling",
    cmds: ["completion", "dev", "help", "push", "version"],
    key: ["push", "dev"],
  },
];

function CliMap() {
  const colW = 148;
  const gap = 14;
  const chipH = 22;
  const chipGap = 6;
  const top = 50;
  const maxCmds = Math.max(...PERSONAS.map((p) => p.cmds.length));
  const width = PERSONAS.length * colW + (PERSONAS.length - 1) * gap;
  const height = top + maxCmds * (chipH + chipGap) + 34;
  return (
    <Frame width={width} height={height} minWidth={640}
      label="The adhar command map, grouped by persona exactly as adhar --help groups it: Develop, Observe, Operate, Administer and Utilities. Highlighted commands are the ones most people start with.">
      {PERSONAS.map((p, i) => {
        const x = i * (colW + gap);
        return (
          <g key={p.name}>
            <text x={x + colW / 2} y={16} textAnchor="middle" fontFamily={SANS}
              fontSize={12} fontWeight={700} fill={C.text} letterSpacing="0.06em">
              {p.name.toUpperCase()}
            </text>
            <text x={x + colW / 2} y={32} textAnchor="middle" fontFamily={SANS}
              fontSize={10.5} fill={C.dim}>
              {p.blurb}
            </text>
            <line x1={x} y1={40} x2={x + colW} y2={40} stroke={C.line} strokeWidth={1} />
            {p.cmds.map((c, k) => {
              const t: Tone = p.key?.includes(c) ? "primary" : "plain";
              const { stroke, fill } = toneOf(t);
              const y = top + k * (chipH + chipGap);
              return (
                <g key={c}>
                  <rect x={x + 8} y={y} width={colW - 16} height={chipH} rx={6}
                    fill={fill} stroke={stroke} strokeWidth={1.1} />
                  <text x={x + colW / 2} y={y + 15} textAnchor="middle" fontFamily={MONO}
                    fontSize={11.5} fontWeight={t === "primary" ? 600 : 400} fill={C.text}>
                    {c}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      <Caption x={0} y={height - 8}>
        {"adhar <command> --help is authoritative for flags. Aliases: a, ad."}
      </Caption>
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Troubleshooting — a triage decision chain.
 * Each check either passes (down) or names the section to read (right).
 * ------------------------------------------------------------------ */

type Check = { q: string; cmd: string; no: string; noDetail: string };

const CHECKS: Check[] = [
  { q: "Right cluster?", cmd: "kubectl config current-context",
    no: "Switch context", noDetail: "or pass --kubeconfig" },
  { q: "API server answers?", cmd: "kubectl cluster-info",
    no: "Management-cluster outage", noDetail: "restart the node, or recover" },
  { q: "Foundation Ready?", cmd: "adhar get status",
    no: "Install and provisioning", noDetail: "re-run adhar up (no --recreate)" },
  { q: "Gateway Programmed?", cmd: "kubectl get gateway adhar-gateway",
    no: "DNS, TLS and reachability", noDetail: "HTTP 000, TLS fails, no URL" },
  { q: "Apps Synced + Healthy?", cmd: "adhar get apps",
    no: "ArgoCD and GitOps", noDetail: "or resource exhaustion" },
  { q: "Crossplane can provision?", cmd: "kubectl get clusterproviderconfigs…",
    no: "Zero ProviderConfigs", noDetail: "get status does not check this" },
];

function Triage() {
  const left = 8;
  const qW = 300;
  const rowH = 50;
  const gapY = 22;
  const aX = 430;
  const aW = 318;
  const top = 30;
  const width = aX + aW + 8;
  const endY = top + CHECKS.length * (rowH + gapY);
  const height = endY + 46 + 30;
  return (
    <Frame width={width} height={height}
      label="Triage decision flow. Check in order: the right cluster, the API server, the foundation, the Gateway, the applications, then Crossplane. The first check that fails names the section to read; if all pass, the platform is healthy and the problem is one application, DNS or the browser.">
      <text x={left} y={16} fontFamily={SANS} fontSize={10} fontWeight={700}
        fill={C.dim} letterSpacing="0.08em">CHECK, IN ORDER</text>
      <text x={aX} y={16} fontFamily={SANS} fontSize={10} fontWeight={700}
        fill={C.dim} letterSpacing="0.08em">FIRST “NO” → READ</text>
      {CHECKS.map((c, i) => {
        const y = top + i * (rowH + gapY);
        return (
          <g key={c.q}>
            <Box x={left} y={y} w={qW} h={rowH} title={c.q} lines={[c.cmd]} titleSize={12.5} />
            <line x1={left + qW + 6} y1={y + rowH / 2} x2={aX - 6} y2={y + rowH / 2}
              stroke={C.primary} strokeWidth={1.5} markerEnd="url(#dk-arrow-primary)" />
            <Caption x={(left + qW + aX) / 2} y={y + rowH / 2 - 8} anchor="middle"
              color={C.primary} weight={600}>no</Caption>
            <Box x={aX} y={y} w={aW} h={rowH} title={c.no} lines={[c.noDetail]}
              tone="muted" titleSize={12.5} />
            <line x1={left + qW / 2} y1={y + rowH + 3} x2={left + qW / 2}
              y2={y + rowH + gapY - 3} stroke={C.strong} strokeWidth={1.5}
              markerEnd="url(#dk-arrow)" />
            <Caption x={left + qW / 2 + 8} y={y + rowH + 15}>yes</Caption>
          </g>
        );
      })}
      <Box x={left} y={endY} w={qW} h={46} title="Platform healthy" tone="primary"
        lines={["look at one app, DNS or the browser"]} titleSize={12.5} />
      <Caption x={left} y={height - 8}>
        Run the checks top to bottom; an early failure explains every later one.
      </Caption>
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Troubleshooting — where bootstrap can stop, and what that looks like.
 * ------------------------------------------------------------------ */

const BootstrapFailures = () => (
  <Ladder
    width={820}
    boxW={238}
    heading={["bootstrap step", "if it stops here, you see"]}
    label="Bootstrap order and its failure signatures: Gateway API CRDs, Cilium, Gateway, CNPG in HA mode only, ArgoCD, Gitea, Crossplane core, seeding the Gitea repositories, applying the ApplicationSet, then the Crossplane control-plane configuration. An early failure blocks every later step."
    caption="Re-running adhar up without --recreate resumes at the first unsatisfied step."
    rungs={[
      { name: "Gateway API CRDs", detail: "foundation", tone: "primary",
        adds: ["failed installing gateway-api-crds: …"] },
      { name: "Cilium", detail: "foundation", tone: "primary",
        adds: ["failed installing cilium: … — and no pod networking until it lands"] },
      { name: "Gateway", detail: "foundation", tone: "primary",
        adds: ["HTTP 000 everywhere; Gateway not Programmed", "CiliumGatewayClassConfig missing → Service fell back to LoadBalancer"] },
      { name: "CNPG", detail: "HA mode only", tone: "muted",
        adds: ["Gitea cannot start: its gitea-db cluster never comes up"] },
      { name: "ArgoCD → Gitea", detail: "foundation", tone: "primary",
        adds: ["failed installing <component>; Gitea not ready / API not responding"] },
      { name: "Crossplane core", detail: "installed early, non-blocking",
        adds: ["CrossplaneReady false, adhar up keeps requeuing"] },
      { name: "Seed Gitea repos", detail: "GitOps phase",
        adds: ["ArgoCD up but empty; the adhar org returns 404"] },
      { name: "ApplicationSet", detail: "GitOps phase",
        adds: ["no Applications; svc/gitea-argocd missing"] },
      { name: "Crossplane config", detail: "after the ApplicationSet",
        adds: ["platform healthy, but zero ClusterProviderConfigs"] },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Roadmap — the phases and their status, as docs/ROADMAP.md states it.
 * ------------------------------------------------------------------ */

const RoadmapPhases = () => (
  <Pipeline
    colW={150}
    label="Roadmap phases and status. Phase 0 local excellence: complete. Phase 1 single-cluster production: verified on DigitalOcean. Phase 2 multi-cluster platform: live-verified. Phase 3 developer experience and ecosystem: 11 of 11 verified on DigitalOcean. Phase 4 data and intelligence: 5 of 5 verified on DigitalOcean. Phase 5 enterprise readiness and scale: built, verifying."
    caption="Statuses as docs/ROADMAP.md states them. Each phase builds on the topology before it: T1 → T2 → T3."
    stages={[
      { name: "Phase 0", detail: "Local excellence", guarantee: "complete\nT1", tone: "primary" },
      { name: "Phase 1", detail: "Single-cluster prod", guarantee: "verified on\nDigitalOcean · T2", tone: "primary" },
      { name: "Phase 2", detail: "Multi-cluster", guarantee: "live-verified\nT3", tone: "primary" },
      { name: "Phase 3", detail: "DevEx & ecosystem", guarantee: "11 of 11 verified\non DigitalOcean", tone: "primary" },
      { name: "Phase 4", detail: "Data & intelligence", guarantee: "5 of 5 verified\non DigitalOcean", tone: "primary" },
      { name: "Phase 5", detail: "Enterprise & scale", guarantee: "built, verifying\n(two items designed)", tone: "accent" },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Accessing — the bootstrap credential lifecycle.
 * ------------------------------------------------------------------ */

const CredentialLifecycle = () => (
  <Flow
    label="The bootstrap credential lifecycle: day-0 local admin passwords for Gitea and ArgoCD, then a verified Keycloak SSO login, then the credential-rotation package replaces both passwords and stores break-glass copies in the secrets backend."
    caption="Rotate only after SSO works for a non-admin — otherwise you lock yourself out."
    nodes={[
      { title: "day-0 admins", lines: ["gitea_admin", "ArgoCD admin"], tone: "muted" },
      { title: "SSO verified", lines: ["Keycloak realm adhar", "non-admin sees apps"] },
      { title: "credential-rotation", lines: ["random passwords", "marker Secret"], tone: "primary" },
      { title: "break-glass", lines: ["secret/adhar/", "bootstrap-credentials"], tone: "accent" },
    ]}
    edges={[{ label: "sign in" }, { label: "enable" }, { label: "writes" }]}
  />
);

/* ------------------------------------------------------------------ *
 * Customization — the life of one package change.
 * ------------------------------------------------------------------ */

const PackageChange = () => (
  <Pipeline
    colW={126}
    label="The life of a package change: edit values.yaml, re-render with generate-manifests.sh, review the git diff, preview with adhar upgrade --diff-only, apply with adhar upgrade, and ArgoCD syncs it."
    caption="Every stage before adhar upgrade is local and reversible; the cluster changes only at the last two."
    stages={[
      { name: "values.yaml", detail: "edit", guarantee: "your config\nsurface" },
      { name: "generate", detail: "re-render", guarantee: "CHART_VERSION\npinned here" },
      { name: "git diff", detail: "review", guarantee: "Git diff =\ncluster diff" },
      { name: "--diff-only", detail: "preview", guarantee: "touches\nnothing", tone: "muted" },
      { name: "adhar upgrade", detail: "push + refresh", guarantee: "foundation,\nthen stack", tone: "primary" },
      { name: "ArgoCD", detail: "sync", guarantee: "self-heal\nkeeps it", tone: "accent" },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Observability — one investigation, metric to trace to logs.
 * ------------------------------------------------------------------ */

const Investigation = () => (
  <Flow
    label="One investigation across cross-linked datasources: a metric spike in Prometheus or Mimir, an exemplar trace_id opens the trace in Tempo, tracesToLogsV2 opens the matching Loki lines."
    caption="From a Loki line, the TraceID derived field links back to the trace."
    nodes={[
      { title: "metric spike", lines: ["Prometheus / Mimir"], tone: "primary" },
      { title: "trace", lines: ["Tempo", "service map"] },
      { title: "log lines", lines: ["Loki, ±5 min", "same trace ID"], tone: "accent" },
    ]}
    edges={[{ label: "exemplar trace_id" }, { label: "tracesToLogsV2" }]}
  />
);

export const deep_ops = {
  "do-topologies": Topologies,
  "do-ha-mode": HaMode,
  "do-defence-layers": DefenceLayers,
  "do-cli-map": CliMap,
  "do-triage": Triage,
  "do-bootstrap-failures": BootstrapFailures,
  "do-roadmap-phases": RoadmapPhases,
  "do-credential-lifecycle": CredentialLifecycle,
  "do-package-change": PackageChange,
  "do-investigation": Investigation,
} as Record<string, ComponentType>;
