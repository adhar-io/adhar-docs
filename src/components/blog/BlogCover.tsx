import React, { useId, useMemo } from "react";
import {
  Activity,
  Archive,
  BadgeCheck,
  Bot,
  Coins,
  Database,
  FileCode2,
  Gauge,
  GitBranch,
  GitPullRequestArrow,
  Hammer,
  KeyRound,
  LayoutDashboard,
  Layers,
  LineChart,
  Lock,
  Network,
  PenTool,
  Radar,
  RefreshCw,
  Rocket,
  Route,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Generated cover art for a blog post — no image files, no network requests.
 *
 * Follows the Adhar brand artwork (src/assets/branding/adhar-banner-open-source.png
 * and adhar-poster-8-pillars.png): a light dotted canvas, a pale disc, a blue
 * wave along the bottom, and an isometric scene in the brand blues.
 *
 * Each post has its own scene (SCENES, keyed by slug) that illustrates what the
 * post is about; a new post without one falls back to its category's scene.
 * The category sets the accent colour; the slug seeds the background, so every
 * cover is stable. Drawn at 16:10 and cropped with `slice`, so it fills any
 * aspect ratio (cards, featured, 21:9 hero). Key content stays inside the band
 * a 21:9 crop keeps (y ≈ 160–840).
 */

/* ----------------------------- Isometric kit ----------------------------- */

const W = 1600;
const H = 1000;
const C = Math.cos(Math.PI / 6);
/** Isometric unit, in px. */
const S = 66;

type Pt = [number, number];
type P3 = [number, number, number];
type Face = "top" | "left" | "right";
type Tone = "white" | "blue" | "navy" | "sky" | "accent";

/** Isometric projection: +x runs right-down, +y left-down, +z up. */
const isoAt =
  (cx: number, cy: number) =>
  (x: number, y: number, z: number): Pt => [cx + (x - y) * C * S, cy + (x + y) * 0.5 * S - z * S];
type Iso = ReturnType<typeof isoAt>;

const pts = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

interface BoxDim {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
}

/** The three visible faces of a box: top, left (the y-max face) and right (the x-max face). */
function faces(iso: Iso, { x, y, z = 0, w, d, h }: BoxDim) {
  const x1 = x + w;
  const y1 = y + d;
  const zt = z + h;
  return {
    top: [iso(x, y, zt), iso(x1, y, zt), iso(x1, y1, zt), iso(x, y1, zt)],
    left: [iso(x, y1, zt), iso(x1, y1, zt), iso(x1, y1, z), iso(x, y1, z)],
    right: [iso(x1, y, zt), iso(x1, y1, zt), iso(x1, y1, z), iso(x1, y, z)],
  };
}

/**
 * A transform mapping a flat [0,unitU]×[0,unitV] drawing onto part of a box
 * face: `u0`,`v0` offset and `su`,`sv` size it, in isometric units.
 */
function faceMap(iso: Iso, b: BoxDim, face: Face, u0: number, v0: number, su: number, sv: number, unitU: number, unitV: number) {
  const zt = (b.z ?? 0) + b.h;
  const ku = (S * su) / unitU;
  const kv = (S * sv) / unitV;
  let o: Pt;
  let m: number[];
  if (face === "top") {
    o = iso(b.x + u0, b.y + v0, zt);
    m = [C * ku, 0.5 * ku, -C * kv, 0.5 * kv];
  } else if (face === "left") {
    o = iso(b.x + u0, b.y + b.d, zt - v0);
    m = [C * ku, 0.5 * ku, 0, kv];
  } else {
    o = iso(b.x + b.w, b.y + b.d - u0, zt - v0);
    m = [C * ku, -0.5 * ku, 0, kv];
  }
  return `matrix(${m.map((n) => n.toFixed(4)).join(" ")} ${o[0].toFixed(1)} ${o[1].toFixed(1)})`;
}

/** A centred square on a face, `frac` of its shorter side. */
function faceSquare(iso: Iso, b: BoxDim, face: Face, frac: number, unit: number) {
  const fw = face === "right" ? b.d : b.w;
  const fh = face === "top" ? b.d : b.h;
  const s = frac * Math.min(fw, fh);
  return faceMap(iso, b, face, (fw - s) / 2, (fh - s) / 2, s, s, unit, unit);
}

/* ------------------------------ Scene model ------------------------------ */

interface BlockEl extends BoxDim {
  t: "block";
  tone: Tone;
  icon?: LucideIcon;
  on?: Face[];
  frac?: number;
  /** The Adhar symbol on the left face */
  logo?: boolean;
  /** Container ribs on the side faces */
  ribs?: boolean;
  /** A line chart on the left face */
  chart?: boolean;
}
interface WireEl {
  t: "wire";
  a: P3;
  b: P3;
  dashed?: boolean;
  arrow?: boolean;
  color?: string;
}
interface RingEl {
  t: "ring";
  x: number;
  y: number;
  z?: number;
  r: number;
  dashed?: boolean;
  /** Arrowheads at these angles (radians), for a loop */
  arrows?: number[];
  color?: string;
}
interface FlagEl {
  t: "flag";
  x: number;
  y: number;
  z: number;
}
type El = BlockEl | WireEl | RingEl | FlagEl;

interface PillDef {
  label: string;
  name: string;
  icon: LucideIcon;
}
type Slot = "tl" | "tr" | "bl" | "br";

interface Scene {
  /** Drawn in order, back to front */
  els: El[];
  /** Real packages in the Adhar stack (platform/stack/packages) */
  pills: PillDef[];
  slots: Slot[];
  /** Nudge the scene from the canvas centre, in px */
  dx?: number;
  dy?: number;
}

type BlockOpts = Partial<Omit<BlockEl, "t" | keyof BoxDim | "tone">>;
const block = (x: number, y: number, z: number, w: number, d: number, h: number, tone: Tone, o: BlockOpts = {}): El => ({
  t: "block",
  x,
  y,
  z,
  w,
  d,
  h,
  tone,
  ...o,
});
/** A square block centred on (cx, cy) in plan. */
const cblock = (cx: number, cy: number, z: number, w: number, h: number, tone: Tone, o: BlockOpts = {}) =>
  block(cx - w / 2, cy - w / 2, z, w, w, h, tone, o);
const wire = (a: P3, b: P3, o: Partial<Omit<WireEl, "t" | "a" | "b">> = {}): El => ({ t: "wire", a, b, ...o });

/* -------------------------------- Scenes --------------------------------- */

/** The hub: platform slab, the Adhar cube, workloads wired to it. */
function platformScene(): Scene {
  const z = -1.35;
  const slots: Array<[number, number]> = [
    [-3.2, 2.7],
    [4.4, -0.5],
    [-0.5, 4.4],
    [3.5, 3.5],
  ];
  const els: El[] = [{ t: "ring", x: 0, y: 0, z: -0.2, r: 5.2, dashed: true }];
  for (const [x, y] of slots) {
    const clamp = (n: number) => Math.max(-2.3, Math.min(2.3, n * 0.45));
    els.push(wire([clamp(x), clamp(y), 0], [x + 0.55, y + 0.55, z + 1.1]));
  }
  els.push(block(-2.3, -2.3, 0, 4.6, 4.6, 0.45, "blue"));
  els.push(block(-1.2, -1.2, 0.45, 2.4, 2.4, 2.4, "white", { logo: true }));
  for (const [x, y] of slots) els.push(block(x, y, z, 1.1, 1.1, 1.1, "blue", { ribs: true }));
  return {
    els,
    pills: [
      { label: "GitOps", name: "ArgoCD", icon: RefreshCw },
      { label: "Infrastructure", name: "Crossplane", icon: Layers },
      { label: "Identity", name: "Keycloak", icon: KeyRound },
    ],
    slots: ["tl", "tr", "br"],
  };
}

/** GitOps: Git on one side, the cluster on the other, ArgoCD reconciling in the loop. */
function gitopsScene(): Scene {
  const els: El[] = [
    { t: "ring", x: 0, y: 0, r: 3.7, arrows: [0.35, 1.9, 3.5, 5.05] },
    cblock(-2.6, -2.6, 0, 1.2, 0.6, "sky", { icon: FileCode2, on: ["top"] }),
    cblock(-2.6, 2.6, 0, 1.7, 1.3, "white", { icon: GitBranch, on: ["top", "left"] }),
    cblock(0, 0, 0, 1.6, 2.5, "accent", { icon: RefreshCw, on: ["left"], frac: 0.55 }),
    block(1.3, -3.9, 0, 2.6, 2.6, 0.4, "blue"),
  ];
  const minis: Array<[number, number]> = [
    [1.55, -3.65],
    [2.75, -3.65],
    [1.55, -2.45],
    [2.75, -2.45],
  ];
  for (const [x, y] of minis) els.push(block(x, y, 0.4, 0.8, 0.8, 0.8, "white"));
  els.push(cblock(2.6, 2.6, 0, 1.2, 0.6, "sky", { icon: Activity, on: ["top"] }));
  return {
    els,
    pills: [
      { label: "Source", name: "Gitea", icon: GitBranch },
      { label: "GitOps", name: "ArgoCD", icon: RefreshCw },
      { label: "Delivery", name: "Kargo", icon: Rocket },
    ],
    slots: ["tl", "tr", "bl"],
  };
}

/** Golden path: one road from template to production, a stage at each step. */
function goldenPathScene(): Scene {
  const xs = [-4.8, -2.4, 0, 2.4, 4.8];
  const hs = [0.9, 1.2, 1.5, 1.8, 2.1];
  const icons = [FileCode2, Hammer, ScanSearch, PenTool, Rocket];
  const els: El[] = [block(-6.2, -0.9, 0, 12.4, 1.8, 0.3, "blue")];
  xs.forEach((x, i) => {
    if (i < xs.length - 1) els.push(wire([x + 0.8, 0, 0.3], [xs[i + 1] - 0.8, 0, 0.3], { arrow: true, color: "#FFFFFF" }));
    els.push(cblock(x, 0, 0.3, 1.4, hs[i], i === xs.length - 1 ? "accent" : "white", { icon: icons[i], on: ["top"] }));
  });
  return {
    els,
    pills: [
      { label: "Build", name: "Buildpacks", icon: Hammer },
      { label: "Scanning", name: "Trivy", icon: ScanSearch },
    ],
    slots: ["tr", "bl"],
    dy: 10,
  };
}

/** Self-service infrastructure: a claim becomes a composition, which becomes real resources. */
function crossplaneScene(): Scene {
  const res: Array<[number, number, LucideIcon]> = [
    [1.8, -5.4, Database],
    [3.6, -3.6, Zap],
    [5.4, -1.8, Archive],
  ];
  const els: El[] = [
    cblock(-3.8, 3.8, 0, 1.5, 1.8, "white", { icon: FileCode2, on: ["left", "top"] }),
    block(-1.4, -1.4, 0, 2.8, 2.8, 0.45, "navy"),
    block(-1.4, -1.4, 0.85, 2.8, 2.8, 0.45, "blue"),
    block(-1.4, -1.4, 1.7, 2.8, 2.8, 0.45, "white", { icon: Layers, on: ["top"], frac: 0.5 }),
  ];
  for (const [x, y, icon] of res) els.push(cblock(x, y, 0, 1.1, 1.0, "white", { icon, on: ["top"] }));
  els.push(wire([-3.05, 3.05, 0.9], [-1.4, 1.4, 1.1], { arrow: true, dashed: true }));
  for (const [x, y] of res) els.push(wire([1.4, -1.4, 1.1], [x - 0.6, y + 0.1, 0.5], { arrow: true, dashed: true }));
  return {
    els,
    pills: [
      { label: "Infrastructure", name: "Crossplane", icon: Layers },
      { label: "Database", name: "CloudNativePG", icon: Database },
    ],
    slots: ["bl", "br"],
    dx: -60,
  };
}

/** Observability: a live dashboard panel, the metrics rising in front of it, and cost. */
function observabilityScene(): Scene {
  const heights = [0.8, 1.3, 1.0, 1.8, 1.5, 2.3];
  const els: El[] = [
    block(-3.7, -2.5, 0, 7.4, 3.6, 0.3, "blue"),
    block(-3.4, -2.3, 0.3, 6.8, 0.25, 3.2, "white", { chart: true }),
  ];
  heights.forEach((h, i) => {
    const tone: Tone = i === heights.length - 1 ? "accent" : i % 2 ? "sky" : "navy";
    els.push(block(-3.2 + i * 1.1, -0.7, 0.3, 0.8, 0.9, h, tone));
  });
  els.push(cblock(5.3, -0.4, 0, 1.3, 0.9, "white", { icon: Coins, on: ["top"] }));
  return {
    els,
    pills: [
      { label: "Metrics", name: "Prometheus", icon: LineChart },
      { label: "Logs", name: "Loki", icon: Activity },
      { label: "Cost", name: "OpenCost", icon: Coins },
    ],
    slots: ["tl", "tr", "br"],
    dy: 20,
  };
}

/** Governed AI agents: the agent reaches the cluster only through one gateway, as a pull request. */
function agentsScene(): Scene {
  return {
    els: [
      { t: "ring", x: 0, y: 0, r: 2.0, dashed: true, color: "accent" },
      cblock(-3.6, 3.6, 0, 1.6, 1.6, "white", { icon: Sparkles, on: ["top"], frac: 0.55 }),
      cblock(-3.6, 3.6, 0, 1.6, 1.6, "white", { icon: Bot, on: ["left"], frac: 0.55 }),
      cblock(0, 0, 0, 1.3, 2.6, "accent", { icon: ShieldCheck, on: ["left"], frac: 0.6 }),
      cblock(3.6, -3.6, 0, 2.8, 0.4, "blue"),
      cblock(3.6, -3.6, 0.4, 1.4, 1.3, "white", { icon: GitPullRequestArrow, on: ["top", "left"] }),
      wire([-2.8, 2.8, 0.8], [-0.65, 0.65, 1.1], { arrow: true, dashed: true, color: "accent" }),
      wire([0.65, -0.65, 1.1], [2.9, -2.9, 1.0], { arrow: true }),
    ],
    pills: [
      { label: "Gateway", name: "agentgateway", icon: Network },
      { label: "Diagnostics", name: "K8sGPT", icon: Radar },
      { label: "Policy", name: "Kyverno", icon: ShieldCheck },
    ],
    slots: ["tl", "bl", "br"],
  };
}

/** The playbook: a staircase from the first team to a mature platform. */
function playbookScene(): Scene {
  const ts = [-3.9, -1.3, 1.3, 3.9];
  const hs = [0.7, 1.4, 2.1, 2.8];
  const icons = [Users, Route, Gauge, Trophy];
  const els: El[] = [{ t: "ring", x: 0, y: 0, r: 5.4, dashed: true }];
  ts.forEach((t, i) => {
    const last = i === ts.length - 1;
    const tone: Tone = last ? "accent" : i === 0 ? "sky" : "white";
    els.push(cblock(t, -t, 0, 1.8, hs[i], tone, { icon: icons[i], on: last ? ["left"] : ["top"], frac: last ? 0.5 : 0.6 }));
  });
  ts.slice(0, -1).forEach((t, i) =>
    els.push(wire([t + 0.6, -t - 0.6, hs[i]], [ts[i + 1] - 0.6, -ts[i + 1] + 0.6, hs[i + 1]], { dashed: true, arrow: true })),
  );
  els.push({ t: "flag", x: 3.9, y: -3.9, z: 2.8 });
  return {
    els,
    pills: [
      { label: "Portal", name: "Backstage", icon: LayoutDashboard },
      { label: "GitOps", name: "ArgoCD", icon: RefreshCw },
    ],
    slots: ["tl", "br"],
    dy: 30,
  };
}

/** Secure by default: a walled platform; images only enter, signed, through the gate. */
function secureScene(): Scene {
  const wall = 0.9;
  const z = 0.3;
  return {
    els: [
      block(-3.2, -3.2, 0, 6.4, 6.4, 0.3, "blue"),
      block(-3.2, -3.2, z, 6.4, 0.35, wall, "sky"),
      block(-3.2, -2.85, z, 0.35, 6.05, wall, "sky"),
      block(-2.4, -2.4, z, 0.9, 0.9, 0.9, "blue", { ribs: true }),
      block(1.5, -2.4, z, 0.9, 0.9, 0.9, "blue", { ribs: true }),
      block(-2.4, 1.5, z, 0.9, 0.9, 0.9, "blue", { ribs: true }),
      block(-0.9, -0.9, z, 1.8, 1.8, 2.3, "white", { icon: ShieldCheck, on: ["left"], frac: 0.6 }),
      block(-0.9, -0.9, z, 1.8, 1.8, 2.3, "white", { icon: Lock, on: ["right", "top"], frac: 0.45 }),
      block(1.5, 1.5, z, 0.9, 0.9, 0.9, "blue", { ribs: true }),
      block(-2.85, 2.85, z, 2.15, 0.35, wall, "sky"),
      block(0.7, 2.85, z, 2.15, 0.35, wall, "sky"),
      block(2.85, -2.85, z, 0.35, 6.05, wall, "sky"),
      block(-0.45, 4.6, 0, 0.9, 0.9, 0.9, "blue", { ribs: true }),
      cblock(1.9, 5.05, 0, 0.8, 0.5, "accent", { icon: BadgeCheck, on: ["top"], frac: 0.7 }),
      wire([0, 4.6, 0.75], [0, 3.0, 0.75], { arrow: true, dashed: true, color: "accent" }),
    ],
    pills: [
      { label: "Signing", name: "Cosign", icon: PenTool },
      { label: "Policy", name: "Kyverno", icon: ShieldCheck },
      { label: "Runtime", name: "Falco", icon: Radar },
    ],
    slots: ["tl", "tr", "bl"],
    dy: -10,
  };
}

/** One scene per post. A post without an entry uses its category's scene. */
const SCENES: Record<string, () => Scene> = {
  "adhar-platform": platformScene,
  "gitops-best-practices-argocd": gitopsScene,
  "golden-paths-to-production": goldenPathScene,
  "self-service-infrastructure-crossplane": crossplaneScene,
  "observability-that-pays-rent": observabilityScene,
  "governed-ai-agents": agentsScene,
  "platform-engineering-playbook": playbookScene,
  "secure-by-default-supply-chain": secureScene,
};

const CATEGORY_SCENE: Record<string, () => Scene> = {
  "Platform Updates": platformScene,
  DevOps: gitopsScene,
  Security: secureScene,
  "AI/ML": agentsScene,
};

const ACCENTS: Record<string, string> = {
  "Platform Updates": "#3B82F6",
  DevOps: "#0EA5E9",
  Security: "#10B981",
  "AI/ML": "#8B5CF6",
};

/* -------------------------------- Helpers -------------------------------- */

/** Small deterministic PRNG (mulberry32) seeded from a string. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Arrowhead triangle with its tip at `tip`, pointing along unit vector (ux, uy). */
const arrowHead = (tip: Pt, ux: number, uy: number, s: number): Pt[] => [
  tip,
  [tip[0] - ux * s - uy * s * 0.6, tip[1] - uy * s + ux * s * 0.6],
  [tip[0] - ux * s + uy * s * 0.6, tip[1] - uy * s - ux * s * 0.6],
];

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const RIBS = [0.2, 0.35, 0.5, 0.65, 0.8];

interface BlogCoverProps {
  slug: string;
  category: string;
  /** Accessible description; the visible title is rendered next to the cover. */
  title: string;
  className?: string;
  /** The featured card and the post hero: larger label, plus package pills. */
  size?: "default" | "lg";
}

const BlogCover = ({ slug, category, title, className, size = "default" }: BlogCoverProps) => {
  const uid = useId().replace(/:/g, "");
  const lg = size === "lg";
  const accent = ACCENTS[category] ?? "#6366F1";
  const scene = useMemo(() => (SCENES[slug] ?? CATEGORY_SCENE[category] ?? platformScene)(), [slug, category]);

  const bg = useMemo(() => {
    const r = rng(slug);
    return { discRight: r() > 0.5, waveLift: r() * 70 };
  }, [slug]);

  const cx = W / 2 + (scene.dx ?? 0);
  const cy = 430 + (scene.dy ?? 0);
  const iso = isoAt(cx, cy);
  const col = (c?: string) => (c === "accent" ? accent : (c ?? "#60A5FA"));

  const tones: Record<Tone, { top: string; left: string; right: string; stroke: string; ink: string; shade?: boolean }> = {
    white: { top: `url(#cubeTop-${uid})`, left: "#F8FAFF", right: `url(#cubeRight-${uid})`, stroke: "#E0E7FF", ink: accent },
    blue: { top: `url(#slabTop-${uid})`, left: "#2563EB", right: "#1D4ED8", stroke: "#BFDBFE", ink: "#FFFFFF" },
    navy: { top: "#3B82F6", left: "#1E40AF", right: "#1E3A8A", stroke: "#60A5FA", ink: "#FFFFFF" },
    sky: { top: "#EFF6FF", left: "#BFDBFE", right: "#93C5FD", stroke: "#DBEAFE", ink: "#2563EB" },
    accent: { top: accent, left: accent, right: accent, stroke: "#FFFFFF", ink: "#FFFFFF", shade: true },
  };

  const renderEl = (el: El, i: number) => {
    if (el.t === "ring") {
      const [ex, ey] = iso(el.x, el.y, el.z ?? 0);
      const rx = el.r * Math.SQRT2 * C * S;
      const ry = el.r * Math.SQRT1_2 * S;
      const c = col(el.color);
      return (
        <g key={i}>
          <ellipse
            cx={ex}
            cy={ey}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={c}
            strokeWidth={el.dashed ? 2 : 3}
            strokeOpacity="0.85"
            strokeDasharray={el.dashed ? "3 12" : undefined}
            strokeLinecap="round"
          />
          {el.arrows?.map((th) => {
            const tx = -rx * Math.sin(th);
            const ty = ry * Math.cos(th);
            const l = Math.hypot(tx, ty);
            const tip: Pt = [ex + rx * Math.cos(th) + (tx / l) * 8, ey + ry * Math.sin(th) + (ty / l) * 8];
            return <polygon key={th} points={pts(arrowHead(tip, tx / l, ty / l, 18))} fill={c} />;
          })}
        </g>
      );
    }

    if (el.t === "wire") {
      const a = iso(...el.a);
      const b = iso(...el.b);
      const c = col(el.color);
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const [ux, uy] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
      const end: Pt = el.arrow ? [b[0] - ux * 11, b[1] - uy * 11] : b;
      return (
        <g key={i}>
          <line
            x1={a[0]}
            y1={a[1]}
            x2={end[0]}
            y2={end[1]}
            stroke={c}
            strokeWidth="3"
            strokeOpacity="0.9"
            strokeDasharray={el.dashed ? "8 9" : undefined}
            strokeLinecap="round"
          />
          {el.arrow && <polygon points={pts(arrowHead(b, ux, uy, 14))} fill={c} />}
        </g>
      );
    }

    if (el.t === "flag") {
      const base = iso(el.x, el.y, el.z);
      const top = iso(el.x, el.y, el.z + 1.7);
      return (
        <g key={i}>
          <line x1={base[0]} y1={base[1]} x2={top[0]} y2={top[1]} stroke="#1E3A8A" strokeWidth="4" strokeLinecap="round" />
          <polygon points={pts([top, [top[0] + 70, top[1] + 22], [top[0], top[1] + 46]])} fill={accent} />
        </g>
      );
    }

    const f = faces(iso, el);
    const tone = tones[el.tone];
    const z = el.z ?? 0;
    return (
      <g key={i}>
        <polygon points={pts(f.left)} fill={tone.left} />
        <polygon points={pts(f.right)} fill={tone.right} />
        {tone.shade && (
          <>
            <polygon points={pts(f.left)} fill="#000000" fillOpacity="0.08" />
            <polygon points={pts(f.right)} fill="#000000" fillOpacity="0.26" />
          </>
        )}
        <polygon points={pts(f.top)} fill={tone.top} stroke={tone.stroke} strokeWidth="1.5" strokeLinejoin="round" />
        {tone.shade && <polygon points={pts(f.top)} fill="#FFFFFF" fillOpacity="0.3" />}

        {el.ribs &&
          RIBS.map((t) => {
            const a = iso(el.x + el.w * t, el.y + el.d, z + el.h * 0.85);
            const b = iso(el.x + el.w * t, el.y + el.d, z + el.h * 0.15);
            const c = iso(el.x + el.w, el.y + el.d * t, z + el.h * 0.85);
            const d = iso(el.x + el.w, el.y + el.d * t, z + el.h * 0.15);
            return (
              <g key={t} stroke="#93C5FD" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round">
                <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
                <line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} />
              </g>
            );
          })}

        {el.logo && (
          <g transform={`${faceSquare(iso, el, "left", 0.6, 260)} translate(-110 -40)`}>
            <g fill={`url(#symbol-${uid})`} stroke={`url(#symbol-${uid})`} strokeWidth="6" strokeLinejoin="round">
              <polygon points="240,50 297.16,83 297.16,149 240,182 182.84,149 182.84,83" />
              <polygon points="177.65,158 234.81,191 234.81,257 177.65,290 120.49,257 120.49,191" />
              <polygon points="302.35,158 359.51,191 359.51,257 302.35,290 245.19,257 245.19,191" />
            </g>
            <path d="M 240,102 L 281,219 L 240,192 L 199,219 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round" />
          </g>
        )}

        {el.chart && (
          <g transform={faceMap(iso, el, "left", 0.35, 0.4, el.w - 0.7, el.h - 0.8, 100, 60)}>
            {[15, 30, 45].map((y) => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#C7D2FE" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            ))}
            <polygon points="0,60 0,46 16,40 32,44 48,27 64,32 80,15 100,19 100,60" fill={accent} fillOpacity="0.14" />
            <polyline
              points="0,46 16,40 32,44 48,27 64,32 80,15 100,19"
              fill="none"
              stroke={accent}
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}

        {el.icon &&
          (el.on ?? ["top"]).map((face) => {
            const Icon = el.icon as LucideIcon;
            return (
              <g key={face} transform={faceSquare(iso, el, face, el.frac ?? 0.6, 24)}>
                <Icon width={24} height={24} color={tone.ink} strokeWidth={2} />
              </g>
            );
          })}
      </g>
    );
  };

  const pillBoxes = scene.pills.map((p, n) => {
    const slot = scene.slots[n] ?? "tl";
    const labelW = p.label.length * 15.5;
    const nameW = p.name.length * 18.5;
    const w = 24 + 52 + 18 + labelW + 14 + nameW + 30;
    const x = slot[1] === "l" ? 70 : W - 70 - w;
    const y = slot[0] === "t" ? 290 : 590;
    return { ...p, x, y, w, labelW };
  });

  const wave = (lift: number) =>
    `M0 ${830 - lift} C 420 ${780 - lift}, 980 ${700 - lift}, ${W} ${530 - lift} L${W} ${H} L0 ${H} Z`;
  const discX = bg.discRight ? 1400 : 180;

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)} role="img" aria-label={`Cover image: ${title}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBFCFF" />
            <stop offset="100%" stopColor="#EAF0FF" />
          </linearGradient>
          <pattern id={`dots-${uid}`} width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.7" fill="#94A3B8" fillOpacity="0.45" />
          </pattern>
          <linearGradient id={`dotfade-${uid}`} x1={bg.discRight ? 0 : 1} y1="0" x2={bg.discRight ? 1 : 0} y2="1">
            <stop offset="0%" stopColor="white" />
            <stop offset="55%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`dotmask-${uid}`}>
            <rect width={W} height={H} fill={`url(#dotfade-${uid})`} />
          </mask>
          <linearGradient id={`wave-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id={`slabTop-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id={`cubeTop-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EEF2FF" />
          </linearGradient>
          <linearGradient id={`cubeRight-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E0E7FF" />
            <stop offset="100%" stopColor="#C7D2FE" />
          </linearGradient>
          <linearGradient id={`symbol-${uid}`} x1="120" y1="40" x2="360" y2="290" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3B82F6" />
            <stop offset="0.5" stopColor="#6366F1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <radialGradient id={`glow-${uid}`}>
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`shadow-${uid}`}>
            <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
          </radialGradient>
          <filter id={`pill-${uid}`} x="-20%" y="-50%" width="140%" height="220%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#1E3A8A" floodOpacity="0.14" />
          </filter>
        </defs>

        {/* Canvas */}
        <rect width={W} height={H} fill={`url(#bg-${uid})`} />
        <rect width={W} height={H} fill={`url(#dots-${uid})`} mask={`url(#dotmask-${uid})`} />
        <circle cx={discX} cy="110" r="430" fill="#DBEAFE" fillOpacity="0.6" />
        {[560, 680, 800].map((rad) => (
          <circle key={rad} cx={discX} cy="110" r={rad} fill="none" stroke="#93C5FD" strokeOpacity="0.35" strokeWidth="1.5" />
        ))}

        {/* Wave — rises toward the disc side */}
        <g transform={bg.discRight ? undefined : `matrix(-1 0 0 1 ${W} 0)`}>
          <path d={wave(bg.waveLift + 34)} fill="#BFDBFE" fillOpacity="0.55" />
          <path d={wave(bg.waveLift)} fill={`url(#wave-${uid})`} />
        </g>

        {/* Scene */}
        <circle cx={cx} cy={cy - 30} r="360" fill={`url(#glow-${uid})`} />
        <ellipse cx={cx} cy={cy + 190} rx="420" ry="170" fill={`url(#shadow-${uid})`} />
        {scene.els.map(renderEl)}

        {/* Package pills — only where they're large enough to read */}
        {lg && (
          <g className="hidden sm:inline">
            {pillBoxes.map((p) => {
              const Icon = p.icon;
              return (
                <g key={p.name} filter={`url(#pill-${uid})`}>
                  <rect x={p.x} y={p.y} width={p.w} height="76" rx="38" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
                  <circle cx={p.x + 50} cy={p.y + 38} r="24" fill={accent} fillOpacity="0.1" />
                  <Icon x={p.x + 36} y={p.y + 24} width="28" height="28" color={accent} strokeWidth={2} />
                  <text x={p.x + 94} y={p.y + 46} fontFamily={FONT} fontSize="21" fontWeight="600" letterSpacing="2.5" fill="#2563EB">
                    {p.label.toUpperCase()}
                  </text>
                  <text x={p.x + 94 + p.labelW + 14} y={p.y + 48} fontFamily={FONT} fontSize="30" fontWeight="700" fill="#0F172A">
                    {p.name}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* Category chip, styled like the "Open source · Apache 2.0" badge */}
      <div
        className={cn(
          "absolute left-[5%] top-[7%] inline-flex items-center rounded-full bg-white/95 font-semibold uppercase text-blue-800 shadow-[0_6px_20px_-8px_rgb(30_58_138/0.35)] ring-1 ring-blue-100",
          lg
            ? "gap-2 px-3.5 py-1.5 text-[11px] tracking-[0.18em] sm:text-xs"
            : "gap-1.5 px-2.5 py-1 text-[9px] tracking-[0.16em] sm:text-[10px]",
        )}
      >
        <span className={cn("rounded-full", lg ? "h-2 w-2" : "h-1.5 w-1.5")} style={{ backgroundColor: accent }} aria-hidden />
        {category}
      </div>
    </div>
  );
};

export default BlogCover;
