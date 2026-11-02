import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The line-art illustration kit. Every scene is drawn from the same few
 * primitives — thin ink strokes, card surfaces, and the brand blue→violet
 * gradient for accents — so the illustrations read as one family with the
 * docs diagrams. Motion (flowing dashes, pulsing nodes, floating pieces) is
 * CSS in index.css under `.illus`, and stops under reduced motion.
 */

export interface Paint {
  /** The brand gradient, for accent strokes and fills. */
  grad: string;
  /** The same gradient as a faint wash, for accent surfaces. */
  wash: string;
}

export const Scene = ({
  children,
  className,
  w = 480,
  h = 220,
}: {
  children: (paint: Paint) => ReactNode;
  className?: string;
  w?: number;
  h?: number;
}) => {
  const id = `il${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // userSpaceOnUse: a straight line has a zero-height bounding box, which
  // would make a bounding-box gradient paint nothing at all.
  const stops = (opacity: number) => (
    <>
      <stop offset="0" style={{ stopColor: "hsl(var(--primary))", stopOpacity: opacity }} />
      <stop offset="1" style={{ stopColor: "hsl(var(--accent))", stopOpacity: opacity }} />
    </>
  );
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false" className={cn("illus block h-auto w-full", className)}>
      <defs>
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2={h}>
          {stops(1)}
        </linearGradient>
        <linearGradient id={`${id}w`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2={h}>
          {stops(0.14)}
        </linearGradient>
      </defs>
      {children({ grad: `url(#${id}g)`, wash: `url(#${id}w)` })}
    </svg>
  );
};

const delay = (s?: number): CSSProperties | undefined => (s ? { animationDelay: `${s}s` } : undefined);

/** A card surface with an ink outline, or a gradient one when `accent` is set. */
export const Box = ({
  x, y, w, h, r = 10, accent, fill,
}: { x: number; y: number; w: number; h: number; r?: number; accent?: string; fill?: string }) => (
  <g className="lift">
    <rect x={x} y={y} width={w} height={h} rx={r} className="card" style={fill ? { fill } : undefined} />
    <rect x={x} y={y} width={w} height={h} rx={r} className={accent ? "ln-accent" : "ln"} stroke={accent} />
  </g>
);

/** Placeholder text: short rounded lines. */
export const TextLines = ({ x, y, widths, gap = 10 }: { x: number; y: number; widths: number[]; gap?: number }) => (
  <g>
    {widths.map((w, i) => (
      <path key={i} d={`M${x} ${y + i * gap} h${w}`} className="ln-soft" />
    ))}
  </g>
);

/** A connection: a faint track with gradient dashes flowing along it. */
export const Flow = ({ d, grad, dashed }: { d: string; grad: string; dashed?: boolean }) => (
  <g>
    <path d={d} className={dashed ? "ln-soft dashed" : "ln-soft"} />
    <path d={d} className="flow" stroke={grad} />
  </g>
);

/** A gradient node that pulses; `ring` adds an expanding halo. */
export const Node = ({
  cx, cy, r = 4, grad, at, ring,
}: { cx: number; cy: number; r?: number; grad: string; at?: number; ring?: boolean }) => (
  <g>
    {ring && <circle cx={cx} cy={cy} r={r + 3} className="ping" stroke={grad} style={delay(at)} />}
    <circle cx={cx} cy={cy} r={r} fill={grad} className="pulse" style={delay(at)} />
  </g>
);

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 90);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

/** The Adhar hexagon, pointy side up. `draw` makes its outline draw itself in. */
export const Hex = ({
  cx, cy, r, stroke, fill, className = "ln", draw,
}: { cx: number; cy: number; r: number; stroke?: string; fill?: string; className?: string; draw?: boolean }) => (
  <polygon
    points={hexPoints(cx, cy, r)}
    pathLength={draw ? 1 : undefined}
    className={draw ? `draw ${className}` : className}
    stroke={stroke}
    style={fill ? { fill } : undefined}
  />
);

/** Bobs gently; wrap a group that is positioned by its own coordinates. */
export const Float = ({ children, at }: { children: ReactNode; at?: number }) => (
  <g className="float" style={delay(at)}>{children}</g>
);

/** A head-and-shoulders avatar inside a circle. */
export const Avatar = ({ cx, cy, r, accent }: { cx: number; cy: number; r: number; accent?: string }) => (
  <g className="lift">
    <circle cx={cx} cy={cy} r={r} className="card" />
    <circle cx={cx} cy={cy} r={r} className={accent ? "ln-accent" : "ln"} stroke={accent} />
    <circle cx={cx} cy={cy - r * 0.2} r={r * 0.28} className="ln" />
    <path d={`M${cx - r * 0.52} ${cy + r * 0.58} Q${cx} ${cy + r * 0.02} ${cx + r * 0.52} ${cy + r * 0.58}`} className="ln" />
  </g>
);

/** A tick that draws itself in. */
export const Check = ({ d, grad, at }: { d: string; grad: string; at?: number }) => (
  <path d={d} pathLength={1} className="draw" stroke={grad} style={delay(at)} />
);
