import React, { useId, useMemo } from "react";
import { Boxes, GitBranch, ShieldCheck, Sparkles, Newspaper, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Generated cover art for a blog post — no image files, no network requests.
 *
 * The category picks the palette, icon and motif; the slug seeds the layout,
 * so every post gets its own stable cover. Drawn at 16:10 and cropped with
 * `slice`, so it fills any aspect ratio (cards, featured, 21:9 hero).
 */

type Motif = "hex" | "pipeline" | "rings" | "network";

interface Theme {
  from: string;
  to: string;
  glow: string;
  icon: LucideIcon;
  motif: Motif;
}

const THEMES: Record<string, Theme> = {
  "Platform Updates": { from: "#1d4ed8", to: "#7c3aed", glow: "#60a5fa", icon: Boxes, motif: "hex" },
  DevOps: { from: "#0f766e", to: "#2563eb", glow: "#2dd4bf", icon: GitBranch, motif: "pipeline" },
  Security: { from: "#065f46", to: "#0e7490", glow: "#34d399", icon: ShieldCheck, motif: "rings" },
  "AI/ML": { from: "#6d28d9", to: "#db2777", glow: "#c084fc", icon: Sparkles, motif: "network" },
};
const FALLBACK: Theme = { from: "#334155", to: "#4f46e5", glow: "#818cf8", icon: Newspaper, motif: "network" };

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

const W = 1600;
const H = 1000;

interface BlogCoverProps {
  slug: string;
  category: string;
  /** Accessible description; the visible title is rendered next to the cover. */
  title: string;
  className?: string;
  /** Larger icon and label for the featured card and the post hero. */
  size?: "default" | "lg";
}

const BlogCover = ({ slug, category, title, className, size = "default" }: BlogCoverProps) => {
  const uid = useId().replace(/:/g, "");
  const theme = THEMES[category] ?? FALLBACK;
  const Icon = theme.icon;

  const shapes = useMemo(() => {
    const r = rng(slug);
    const glows = Array.from({ length: 3 }, () => ({ x: r() * W, y: r() * H * 0.9, s: 300 + r() * 380 }));

    // Network / pipeline nodes, kept clear of the centre where the icon sits.
    const nodes: { x: number; y: number; s: number }[] = [];
    while (nodes.length < 16) {
      const x = 80 + r() * (W - 160);
      const y = 80 + r() * (H - 160);
      if (Math.hypot(x - W / 2, y - H / 2) < 230) continue;
      nodes.push({ x, y, s: 4 + r() * 7 });
    }
    const edges: [number, number][] = [];
    nodes.forEach((a, i) => {
      const near = nodes
        .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
        .filter(({ j }) => j !== i)
        .sort((p, q) => p.d - q.d)
        .slice(0, 2);
      near.forEach(({ j }) => i < j && edges.push([i, j]));
    });

    // Pipeline: a few horizontal lanes with stage dots.
    const lanes = Array.from({ length: 4 }, (_, i) => {
      const y = 170 + i * 220 + (r() - 0.5) * 40;
      const stages = Array.from({ length: 5 }, (_, k) => 160 + k * 320 + (r() - 0.5) * 60);
      return { y, stages };
    });

    const tilt = (r() - 0.5) * 16;
    return { glows, nodes, edges, lanes, tilt };
  }, [slug]);

  const iconBox = size === "lg" ? 220 : 180;

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)} role="img" aria-label={`Cover image: ${title}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.from} />
            <stop offset="100%" stopColor={theme.to} />
          </linearGradient>
          <radialGradient id={`glow-${uid}`}>
            <stop offset="0%" stopColor={theme.glow} stopOpacity="0.55" />
            <stop offset="100%" stopColor={theme.glow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`vignette-${uid}`} cx="50%" cy="50%" r="75%">
            <stop offset="55%" stopColor="#020617" stopOpacity="0" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.55" />
          </radialGradient>
          <pattern id={`hex-${uid}`} width="84" height="146" patternUnits="userSpaceOnUse" patternTransform={`rotate(${shapes.tilt})`}>
            <path d="M42 0 L84 24 L84 73 L42 97 L0 73 L0 24 Z M42 97 L42 146" fill="none" stroke="white" strokeOpacity="0.09" strokeWidth="1.5" />
          </pattern>
          <pattern id={`grid-${uid}`} width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M64 0 L0 0 0 64" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={W} height={H} fill={`url(#bg-${uid})`} />
        {shapes.glows.map((g, i) => (
          <circle key={i} cx={g.x} cy={g.y} r={g.s} fill={`url(#glow-${uid})`} />
        ))}
        <rect width={W} height={H} fill={`url(#grid-${uid})`} />

        {theme.motif === "hex" && <rect width={W} height={H} fill={`url(#hex-${uid})`} />}

        {theme.motif === "rings" &&
          [160, 260, 370, 490, 620].map((rad, i) => (
            <circle
              key={rad}
              cx={W / 2}
              cy={H / 2}
              r={rad}
              fill="none"
              stroke="white"
              strokeOpacity={0.16 - i * 0.025}
              strokeWidth={i === 0 ? 2.5 : 1.5}
              strokeDasharray={i % 2 ? "6 14" : undefined}
            />
          ))}

        {theme.motif === "pipeline" &&
          shapes.lanes.map((lane, i) => (
            <g key={i} stroke="white" strokeOpacity="0.18" fill="none">
              <path d={`M60 ${lane.y} H${W - 60}`} strokeWidth="2" />
              {lane.stages.map((x, k) => (
                <g key={k}>
                  <rect x={x - 26} y={lane.y - 16} width="52" height="32" rx="10" fill="white" fillOpacity="0.06" strokeOpacity="0.28" />
                  <circle cx={x} cy={lane.y} r="4" fill="white" fillOpacity="0.7" stroke="none" />
                </g>
              ))}
            </g>
          ))}

        {(theme.motif === "network" || theme.motif === "hex") && (
          <g>
            {shapes.edges.map(([a, b], i) => (
              <line
                key={i}
                x1={shapes.nodes[a].x}
                y1={shapes.nodes[a].y}
                x2={shapes.nodes[b].x}
                y2={shapes.nodes[b].y}
                stroke="white"
                strokeOpacity="0.16"
                strokeWidth="1.5"
              />
            ))}
            {shapes.nodes.map((n, i) => (
              <g key={i}>
                <circle cx={n.x} cy={n.y} r={n.s * 3} fill="white" fillOpacity="0.05" />
                <circle cx={n.x} cy={n.y} r={n.s} fill="white" fillOpacity="0.75" />
              </g>
            ))}
          </g>
        )}

        {/* Centre glow behind the icon tile */}
        <circle cx={W / 2} cy={H / 2} r="300" fill={`url(#glow-${uid})`} />
        <rect width={W} height={H} fill={`url(#vignette-${uid})`} />
      </svg>

      {/* Icon tile */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex items-center justify-center rounded-[28%] border border-white/25 bg-white/10 shadow-[0_20px_60px_-15px_rgb(0_0_0/0.5)] backdrop-blur-md"
          style={{ width: `${(iconBox / W) * 100}%`, aspectRatio: "1" }}
        >
          <Icon className="h-1/2 w-1/2 text-white drop-shadow" strokeWidth={1.5} aria-hidden />
        </div>
      </div>

      {/* Category label */}
      <div
        className={cn(
          "absolute bottom-[6%] left-[5%] font-semibold uppercase tracking-[0.2em] text-white/80",
          size === "lg" ? "text-xs sm:text-sm" : "text-[10px] sm:text-[11px]",
        )}
      >
        {category}
      </div>
    </div>
  );
};

export default BlogCover;
