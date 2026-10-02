import type { ComponentType, ReactNode } from "react";

/**
 * Architecture diagrams for the docs, authored as SVG so they stay crisp and
 * follow the active theme. Colours come from the site's CSS custom properties,
 * so a diagram repaints with the light/dark toggle rather than being baked in.
 *
 * Markdown embeds one with a fenced block whose body is the diagram key:
 *
 *     ```diagram
 *     write-path
 *     ```
 */

const C = {
  line: "hsl(var(--border))",
  strongLine: "hsl(var(--muted-foreground) / 0.45)",
  text: "hsl(var(--foreground))",
  dim: "hsl(var(--muted-foreground))",
  surface: "hsl(var(--card))",
  fill: "hsl(var(--muted) / 0.5)",
  primary: "hsl(var(--primary))",
  primarySoft: "hsl(var(--primary) / 0.1)",
  accent: "hsl(var(--accent))",
  accentSoft: "hsl(var(--accent) / 0.1)",
};

const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function Frame({
  viewBox,
  label,
  children,
}: {
  viewBox: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <figure className="my-7 overflow-x-auto rounded-xl border border-border/60 bg-card/40 px-4 py-5">
      <svg
        viewBox={viewBox}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "auto", display: "block", minWidth: 520 }}
      >
        <defs>
          <marker
            id="dg-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.strongLine} />
          </marker>
          <marker
            id="dg-arrow-primary"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.primary} />
          </marker>
        </defs>
        {children}
      </svg>
    </figure>
  );
}

function Node({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  lines,
  tone = "plain",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle?: string;
  /** Extra body lines, stacked under the title. */
  lines?: string[];
  tone?: "plain" | "primary" | "accent";
}) {
  const stroke =
    tone === "primary" ? C.primary : tone === "accent" ? C.accent : C.line;
  const fill =
    tone === "primary" ? C.primarySoft : tone === "accent" ? C.accentSoft : C.fill;
  const body = lines ?? (subtitle ? [subtitle] : []);
  // Centre the title + body block vertically inside the box.
  const blockH = 15 + body.length * 14;
  const titleY = body.length ? y + (h - blockH) / 2 + 13 : y + h / 2 + 4;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.25}
      />
      <text
        x={x + w / 2}
        y={titleY}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={13}
        fontWeight={600}
        fill={C.text}
      >
        {title}
      </text>
      {body.map((l, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={titleY + 16 + i * 14}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={11}
          fill={C.dim}
        >
          {l}
        </text>
      ))}
    </g>
  );
}

/** A dashed grouping box with a label tucked into its top-left corner. */
function Group({
  x,
  y,
  w,
  h,
  label,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill="none"
        stroke={C.line}
        strokeWidth={1.25}
        strokeDasharray="5 4"
      />
      <text
        x={x + 14}
        y={y + 19}
        fontFamily={SANS}
        fontSize={11}
        fontWeight={600}
        fill={C.dim}
      >
        {label}
      </text>
    </g>
  );
}

function Label({
  x,
  y,
  children,
  anchor = "middle",
  size = 11,
  color = C.dim,
  weight = 400,
}: {
  x: number;
  y: number;
  children: string;
  anchor?: "start" | "middle" | "end";
  size?: number;
  color?: string;
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={SANS}
      fontSize={size}
      fontWeight={weight}
      fill={color}
    >
      {children}
    </text>
  );
}

/** How any change reaches the cluster, and how you watch it land. */
function WritePath() {
  return (
    <Frame
      viewBox="0 0 720 268"
      label="The write path: a commit goes to in-cluster Gitea, ArgoCD reconciles it onto the cluster, and you observe the result through the Console, CLI, Grafana and Hubble."
    >
      {/* flow: you -> gitea -> argocd */}
      <Node x={16} y={40} w={116} h={52} title="you" tone="primary" />
      <Node x={238} y={40} w={132} h={52} title="Gitea" subtitle="in-cluster Git" />
      <Node
        x={476}
        y={32}
        w={228}
        h={68}
        title="ArgoCD"
        subtitle="ApplicationSet"
        tone="accent"
      />

      <line
        x1={132}
        y1={66}
        x2={230}
        y2={66}
        stroke={C.primary}
        strokeWidth={1.5}
        markerEnd="url(#dg-arrow-primary)"
      />
      <Label x={181} y={56} color={C.primary} weight={600}>
        commit
      </Label>

      <line
        x1={370}
        y1={66}
        x2={468}
        y2={66}
        stroke={C.strongLine}
        strokeWidth={1.5}
        markerEnd="url(#dg-arrow)"
      />
      <Label x={419} y={56}>
        reads
      </Label>

      <Label x={304} y={112} size={10.5}>
        the only write path
      </Label>

      {/* argocd -> cluster */}
      <line
        x1={590}
        y1={100}
        x2={590}
        y2={160}
        stroke={C.strongLine}
        strokeWidth={1.5}
        markerEnd="url(#dg-arrow)"
      />
      <Label x={600} y={124} anchor="start" size={10.5}>
        apply
      </Label>
      <Label x={600} y={138} anchor="start" size={10.5}>
        self-heal ~60s
      </Label>

      <Node x={476} y={160} w={228} h={52} title="cluster" />

      {/* observe loop back to you */}
      <path
        d="M 476 186 L 74 186 L 74 100"
        fill="none"
        stroke={C.line}
        strokeWidth={1.5}
        strokeDasharray="4 4"
        markerEnd="url(#dg-arrow)"
      />
      <Label x={275} y={178} size={11} weight={600}>
        observe
      </Label>
      <Label x={275} y={206} size={10.5}>
        Console · CLI · Grafana · Hubble
      </Label>

      <Label x={16} y={244} anchor="start" size={10.5}>
        A commit is the only thing that can change the cluster — ArgoCD reverts anything else.
      </Label>
    </Frame>
  );
}

const LAYERS = [
  {
    id: "L3",
    name: "Developer Experience",
    items: "Console · CLI · Headlamp · Grafana",
    tone: "accent" as const,
  },
  {
    id: "L2",
    name: "Platform Services",
    items: "102 GitOps packages — data, security, delivery, AI",
    tone: "primary" as const,
  },
  {
    id: "L1",
    name: "Cluster Foundation",
    items: "Cilium · ArgoCD · Gitea · Crossplane · Keycloak",
    tone: "plain" as const,
  },
  {
    id: "L0",
    name: "Infrastructure",
    items: "Kind · AWS · Azure · GCP · DigitalOcean · Civo",
    tone: "plain" as const,
  },
];

/** How the pieces sit on top of each other. */
function LayerStack() {
  const rowH = 54;
  const gap = 8;
  const top = 14;
  const x = 58;
  const w = 648;
  const height = top + LAYERS.length * (rowH + gap) + 18;

  return (
    <Frame
      viewBox={`0 0 720 ${height}`}
      label="The layer stack: L0 infrastructure, L1 cluster foundation, L2 platform services, L3 developer experience. Each layer depends only on the one below it."
    >
      {LAYERS.map((l, i) => {
        const y = top + i * (rowH + gap);
        const stroke =
          l.tone === "primary" ? C.primary : l.tone === "accent" ? C.accent : C.line;
        const fill =
          l.tone === "primary"
            ? C.primarySoft
            : l.tone === "accent"
              ? C.accentSoft
              : C.fill;
        return (
          <g key={l.id}>
            <rect
              x={x}
              y={y}
              width={w}
              height={rowH}
              rx={10}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.25}
            />
            <text
              x={x + 18}
              y={y + 23}
              fontFamily={MONO}
              fontSize={12}
              fontWeight={700}
              fill={stroke === C.line ? C.dim : stroke}
            >
              {l.id}
            </text>
            <text
              x={x + 56}
              y={y + 23}
              fontFamily={SANS}
              fontSize={13}
              fontWeight={600}
              fill={C.text}
            >
              {l.name}
            </text>
            <text
              x={x + 56}
              y={y + 41}
              fontFamily={MONO}
              fontSize={11}
              fill={C.dim}
            >
              {l.items}
            </text>
          </g>
        );
      })}

      {/* dependency arrow: each layer rests on the one below */}
      <line
        x1={34}
        y1={top + 6}
        x2={34}
        y2={top + LAYERS.length * (rowH + gap) - gap - 6}
        stroke={C.strongLine}
        strokeWidth={1.5}
        markerEnd="url(#dg-arrow)"
      />
      <text
        x={20}
        y={top + (LAYERS.length * (rowH + gap)) / 2}
        fontFamily={SANS}
        fontSize={10.5}
        fill={C.dim}
        transform={`rotate(-90 20 ${top + (LAYERS.length * (rowH + gap)) / 2})`}
        textAnchor="middle"
      >
        depends on
      </text>

      <Label x={x} y={height - 4} anchor="start" size={10.5}>
        Swap a cloud at L0 without touching packages at L2.
      </Label>
    </Frame>
  );
}

/** What a local install actually puts on your machine. */
function LocalTopology() {
  return (
    <Frame
      viewBox="0 0 720 366"
      label="A local install: the adhar CLI drives your container engine, which runs a single Kind node named adhar plus nine pull-through registry cache containers. Host ports 8443 and 8080 map to the platform Gateway, and cache misses fetch once from the upstream registries."
    >
      {/* host */}
      <Group x={12} y={26} w={512} h={252} label="your machine" />

      <Node x={34} y={58} w={130} h={44} title="adhar CLI" tone="primary" />
      <line
        x1={164}
        y1={80}
        x2={196}
        y2={80}
        stroke={C.primary}
        strokeWidth={1.5}
        markerEnd="url(#dg-arrow-primary)"
      />
      <Label x={180} y={70} color={C.primary} weight={600} size={10.5}>
        drives
      </Label>
      <Label x={34} y={124} anchor="start" size={10.5}>
        through Kind's Go library
      </Label>
      <Label x={34} y={138} anchor="start" size={10.5}>
        — no kind binary
      </Label>

      {/* container engine */}
      <Group x={200} y={48} w={312} h={208} label="container engine · Docker / Podman" />

      <Node
        x={216}
        y={74}
        w={280}
        h={84}
        title="Kind node · cluster adhar"
        lines={[
          "Cilium — CNI and kube-proxy",
          "Gateway · ArgoCD · Gitea · Crossplane",
        ]}
        tone="accent"
      />

      <Node
        x={216}
        y={180}
        w={280}
        h={58}
        title="registry cache × 9"
        lines={["registry:3.0.0 · one per upstream host"]}
      />

      <line
        x1={356}
        y1={158}
        x2={356}
        y2={178}
        stroke={C.strongLine}
        strokeWidth={1.5}
        markerEnd="url(#dg-arrow)"
      />
      <Label x={366} y={173} anchor="start" size={10}>
        containerd certs.d mirrors
      </Label>

      {/* upstream registries, outside the machine */}
      <Node
        x={556}
        y={170}
        w={150}
        h={74}
        title="upstream"
        lines={["docker.io · ghcr.io", "quay.io · +6 more"]}
      />
      <path
        d="M 496 207 L 550 207"
        fill="none"
        stroke={C.line}
        strokeWidth={1.5}
        strokeDasharray="4 4"
        markerEnd="url(#dg-arrow)"
      />
      <Label x={523} y={198} size={10}>
        miss
      </Label>

      {/* host port mapping into the Gateway, routed clear of the annotations */}
      <Node x={34} y={296} w={130} h={40} title="browser" />
      <path
        d="M 164 316 L 186 316 L 186 116 L 212 116"
        fill="none"
        stroke={C.primary}
        strokeWidth={1.5}
        markerEnd="url(#dg-arrow-primary)"
      />
      <Label x={34} y={356} anchor="start" size={10.5} color={C.primary} weight={600}>
        host :8443 / :8080 → the platform Gateway
      </Label>

      <Label x={216} y={300} anchor="start" size={10.5}>
        Every URL is *.adhar.localtest.me:8443 — it resolves to 127.0.0.1, so there is
      </Label>
      <Label x={216} y={316} anchor="start" size={10.5}>
        no hosts file to edit. The caches survive adhar down, so the next install pulls
      </Label>
      <Label x={216} y={332} anchor="start" size={10.5}>
        its ~90 images from local disk instead of the internet.
      </Label>
    </Frame>
  );
}

export const DIAGRAMS: Record<string, ComponentType> = {
  "write-path": WritePath,
  "layer-stack": LayerStack,
  "local-topology": LocalTopology,
};
