import type { ReactNode } from "react";

/**
 * Auto-layout primitives for docs diagrams.
 *
 * Diagrams are described as DATA — a list of nodes, stages or layers — and the
 * geometry is computed here. Hand-placing SVG coordinates does not survive
 * forty-odd diagrams: boxes drift, labels collide, and the errors are invisible
 * until something is rendered. Everything below sizes itself from its content,
 * so a diagram cannot be mis-measured by hand.
 *
 * Colours come from the site's CSS custom properties, so diagrams follow the
 * light/dark theme instead of baking one in.
 */

export type Tone = "plain" | "primary" | "accent" | "muted";

export const C = {
  line: "hsl(var(--border))",
  strong: "hsl(var(--muted-foreground) / 0.45)",
  text: "hsl(var(--foreground))",
  dim: "hsl(var(--muted-foreground))",
  fill: "hsl(var(--muted) / 0.5)",
  primary: "hsl(var(--primary))",
  primarySoft: "hsl(var(--primary) / 0.1)",
  accent: "hsl(var(--accent))",
  accentSoft: "hsl(var(--accent) / 0.1)",
};

export const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
export const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Approximate advance width. Monospace is exact enough; sans is a safe over-estimate. */
export const textW = (t: string, size: number, mono = true) =>
  t.length * size * (mono ? 0.605 : 0.55);

export function toneOf(tone: Tone = "plain") {
  switch (tone) {
    case "primary":
      return { stroke: C.primary, fill: C.primarySoft };
    case "accent":
      return { stroke: C.accent, fill: C.accentSoft };
    case "muted":
      return { stroke: C.line, fill: "transparent" };
    default:
      return { stroke: C.line, fill: C.fill };
  }
}

export function Frame({
  width,
  height,
  label,
  children,
  minWidth = 520,
}: {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <figure className="my-7 overflow-x-auto rounded-xl border border-border/60 bg-card/40 px-4 py-5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "auto", display: "block", minWidth }}
      >
        <defs>
          <marker id="dk-arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.strong} />
          </marker>
          <marker id="dk-arrow-primary" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.primary} />
          </marker>
        </defs>
        {children}
      </svg>
    </figure>
  );
}

export function Box({
  x, y, w, h, title, lines = [], tone = "plain", titleSize = 13,
}: {
  x: number; y: number; w: number; h: number;
  title?: string; lines?: string[]; tone?: Tone; titleSize?: number;
}) {
  const { stroke, fill } = toneOf(tone);
  const blockH = (title ? titleSize + 2 : 0) + lines.length * 14;
  let cy = y + (h - blockH) / 2 + titleSize;
  const titleY = cy;
  if (title) cy += 4;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10}
        fill={fill} stroke={stroke} strokeWidth={1.25} />
      {title && (
        <text x={x + w / 2} y={titleY} textAnchor="middle" fontFamily={MONO}
          fontSize={titleSize} fontWeight={600} fill={C.text}>
          {title}
        </text>
      )}
      {lines.map((l, i) => (
        <text key={i} x={x + w / 2} y={cy + 14 + i * 14} textAnchor="middle"
          fontFamily={MONO} fontSize={11} fill={C.dim}>
          {l}
        </text>
      ))}
    </g>
  );
}

export function Caption({
  x, y, children, anchor = "start", size = 10.5, color = C.dim, weight = 400,
}: {
  x: number; y: number; children: string;
  anchor?: "start" | "middle" | "end"; size?: number; color?: string; weight?: number;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={SANS} fontSize={size}
      fontWeight={weight} fill={color}>
      {children}
    </text>
  );
}

export function GroupBox({
  x, y, w, h, label,
}: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill="none"
        stroke={C.line} strokeWidth={1.25} strokeDasharray="5 4" />
      <text x={x + 14} y={y + 19} fontFamily={SANS} fontSize={11}
        fontWeight={600} fill={C.dim}>
        {label}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * Flow — a horizontal chain of boxes joined by labelled arrows.
 * Widths are derived from content, so nothing collides.
 * ------------------------------------------------------------------ */

export type FlowNode = { title: string; lines?: string[]; tone?: Tone };
export type FlowEdge = { label?: string; dashed?: boolean; tone?: "plain" | "primary" };

export function Flow({
  nodes, edges = [], label, caption, gap = 56, padX = 18, minNodeW = 92,
}: {
  nodes: FlowNode[];
  edges?: FlowEdge[];
  label: string;
  caption?: string;
  gap?: number;
  padX?: number;
  minNodeW?: number;
}) {
  const widths = nodes.map((n) => {
    const t = textW(n.title, 13);
    const l = Math.max(0, ...(n.lines ?? []).map((s) => textW(s, 11)));
    return Math.max(minNodeW, Math.ceil(Math.max(t, l)) + padX * 2);
  });
  const maxLines = Math.max(...nodes.map((n) => (n.lines ?? []).length));
  const h = 42 + maxLines * 14;

  // Edge gaps widen to fit their label.
  const gaps = nodes.slice(1).map((_, i) => {
    const lbl = edges[i]?.label ? textW(edges[i].label!, 10.5, false) + 22 : 0;
    return Math.max(gap, Math.ceil(lbl));
  });

  const top = 26;
  const xs: number[] = [];
  let x = 0;
  nodes.forEach((_, i) => {
    xs.push(x);
    x += widths[i] + (gaps[i] ?? 0);
  });
  const width = x;
  const height = top + h + (caption ? 30 : 12);

  return (
    <Frame width={width} height={height} label={label} minWidth={Math.min(width, 560)}>
      {nodes.map((n, i) => (
        <Box key={i} x={xs[i]} y={top} w={widths[i]} h={h}
          title={n.title} lines={n.lines} tone={n.tone} />
      ))}
      {nodes.slice(1).map((_, i) => {
        const e = edges[i] ?? {};
        const x1 = xs[i] + widths[i] + 6;
        const x2 = xs[i + 1] - 6;
        const my = top + h / 2;
        const primary = e.tone === "primary";
        return (
          <g key={`e${i}`}>
            <line x1={x1} y1={my} x2={x2} y2={my}
              stroke={primary ? C.primary : C.strong} strokeWidth={1.5}
              strokeDasharray={e.dashed ? "4 4" : undefined}
              markerEnd={primary ? "url(#dk-arrow-primary)" : "url(#dk-arrow)"} />
            {e.label && (
              <Caption x={(x1 + x2) / 2} y={my - 9} anchor="middle"
                color={primary ? C.primary : C.dim} weight={primary ? 600 : 400}>
                {e.label}
              </Caption>
            )}
          </g>
        );
      })}
      {caption && <Caption x={0} y={height - 8}>{caption}</Caption>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Pipeline — ordered stages, each with the guarantee it adds beneath.
 * ------------------------------------------------------------------ */

export type Stage = { name: string; detail?: string; guarantee?: string; tone?: Tone };

export function Pipeline({
  stages, label, caption, colW,
}: { stages: Stage[]; label: string; caption?: string; colW?: number }) {
  const w =
    colW ??
    Math.max(
      118,
      ...stages.map((s) =>
        Math.ceil(
          Math.max(
            textW(s.name, 12.5),
            textW(s.detail ?? "", 10.5),
            textW(s.guarantee ?? "", 10, false),
          ),
        ) + 20,
      ),
    );
  const gap = 26;
  const top = 24;
  const boxH = stages.some((s) => s.detail) ? 56 : 42;
  const width = stages.length * w + (stages.length - 1) * gap;
  const gLines = stages.some((s) => s.guarantee);
  const height = top + boxH + (gLines ? 46 : 10) + (caption ? 22 : 0);

  return (
    <Frame width={width} height={height} label={label} minWidth={Math.min(width, 600)}>
      {stages.map((s, i) => {
        const x = i * (w + gap);
        return (
          <g key={i}>
            <Box x={x} y={top} w={w} h={boxH} title={s.name}
              lines={s.detail ? [s.detail] : []} tone={s.tone ?? "plain"} titleSize={12.5} />
            {i < stages.length - 1 && (
              <line x1={x + w + 5} y1={top + boxH / 2} x2={x + w + gap - 5}
                y2={top + boxH / 2} stroke={C.strong} strokeWidth={1.5}
                markerEnd="url(#dk-arrow)" />
            )}
            {s.guarantee && (
              <>
                <line x1={x + w / 2} y1={top + boxH + 4} x2={x + w / 2}
                  y2={top + boxH + 14} stroke={C.line} strokeWidth={1} />
                {s.guarantee.split("\n").map((g, k) => (
                  <Caption key={k} x={x + w / 2} y={top + boxH + 26 + k * 12}
                    anchor="middle" size={10}>
                    {g}
                  </Caption>
                ))}
              </>
            )}
          </g>
        );
      })}
      {caption && <Caption x={0} y={height - 6}>{caption}</Caption>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Split — two labelled columns side by side. For before/after and
 * this-way vs that-way comparisons.
 * ------------------------------------------------------------------ */

export type Side = { heading: string; items: string[]; tone?: Tone; note?: string };

export function Split({
  left, right, label, caption, width = 720,
}: { left: Side; right: Side; label: string; caption?: string; width?: number }) {
  const gap = 28;
  const colW = (width - gap - 16) / 2;
  const rows = Math.max(left.items.length, right.items.length);
  const top = 42;
  const rowH = 26;
  const bodyH = rows * rowH + 18;
  const height = top + bodyH + (left.note || right.note ? 24 : 6) + (caption ? 20 : 0);

  const col = (s: Side, x: number) => {
    const { stroke, fill } = toneOf(s.tone);
    return (
      <g>
        <text x={x} y={22} fontFamily={SANS} fontSize={11} fontWeight={700}
          fill={s.tone === "primary" ? C.primary : s.tone === "accent" ? C.accent : C.dim}
          letterSpacing="0.06em">
          {s.heading.toUpperCase()}
        </text>
        <rect x={x} y={top - 10} width={colW} height={bodyH} rx={10}
          fill={fill} stroke={stroke} strokeWidth={1.25} />
        {s.items.map((it, i) => (
          <g key={i}>
            <circle cx={x + 16} cy={top + 5 + i * rowH} r={2.5}
              fill={s.tone === "primary" ? C.primary : s.tone === "accent" ? C.accent : C.strong} />
            <text x={x + 28} y={top + 9 + i * rowH} fontFamily={SANS} fontSize={11.5} fill={C.text}>
              {it}
            </text>
          </g>
        ))}
        {s.note && (
          <text x={x} y={top + bodyH + 12} fontFamily={SANS} fontSize={10.5} fill={C.dim}>
            {s.note}
          </text>
        )}
      </g>
    );
  };

  return (
    <Frame width={width} height={height} label={label}>
      {col(left, 8)}
      {col(right, 8 + colW + gap)}
      {caption && <Caption x={8} y={height - 4}>{caption}</Caption>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Funnel — narrowing stages with the drop-off between them named.
 * ------------------------------------------------------------------ */

export type Step = { name: string; detail?: string; dropoff?: string };

export function Funnel({
  steps, label, caption, width = 700,
}: { steps: Step[]; label: string; caption?: string; width?: number }) {
  const top = 14;
  const barH = 44;
  const gapY = 30;
  const maxW = width * 0.52;
  const minW = width * 0.26;
  const height = top + steps.length * (barH + gapY) - gapY + (caption ? 26 : 10);
  const cx = width * 0.33;

  return (
    <Frame width={width} height={height} label={label}>
      {steps.map((s, i) => {
        const w = maxW - ((maxW - minW) * i) / Math.max(1, steps.length - 1);
        const x = cx - w / 2;
        const y = top + i * (barH + gapY);
        const tone: Tone = i === steps.length - 1 ? "accent" : i === 0 ? "primary" : "plain";
        const { stroke, fill } = toneOf(tone);
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={barH} rx={9}
              fill={fill} stroke={stroke} strokeWidth={1.25} />
            <text x={cx} y={s.detail ? y + 19 : y + barH / 2 + 4} textAnchor="middle"
              fontFamily={SANS} fontSize={12.5} fontWeight={600} fill={C.text}>
              {s.name}
            </text>
            {s.detail && (
              <text x={cx} y={y + 34} textAnchor="middle" fontFamily={MONO}
                fontSize={10.5} fill={C.dim}>
                {s.detail}
              </text>
            )}
            {i < steps.length - 1 && (
              <>
                <line x1={cx} y1={y + barH + 4} x2={cx} y2={y + barH + gapY - 4}
                  stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
                {s.dropoff && (
                  <text x={cx + 16} y={y + barH + 18} fontFamily={SANS} fontSize={10.5} fill={C.dim}>
                    {s.dropoff}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
      {caption && <Caption x={8} y={height - 6}>{caption}</Caption>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Ladder — a vertical sequence of stages, each with what it adds on the
 * right. Use when a flow has too many steps to read horizontally.
 * ------------------------------------------------------------------ */

export type Rung = { name: string; detail?: string; adds: string[]; tone?: Tone };

export function Ladder({
  rungs, label, caption, heading, width = 720, boxW = 212,
}: {
  rungs: Rung[]; label: string; caption?: string;
  heading?: [string, string]; width?: number; boxW?: number;
}) {
  const rowH = 46;
  const gapY = 16;
  const left = 8;
  const top = heading ? 34 : 14;
  const textX = left + boxW + 34;
  const height = top + rungs.length * (rowH + gapY) - gapY + (caption ? 26 : 10);

  return (
    <Frame width={width} height={height} label={label}>
      {heading && (
        <>
          <text x={left} y={16} fontFamily={SANS} fontSize={10}
            fontWeight={700} fill={C.dim} letterSpacing="0.08em">
            {heading[0].toUpperCase()}
          </text>
          <text x={textX} y={16} fontFamily={SANS} fontSize={10}
            fontWeight={700} fill={C.dim} letterSpacing="0.08em">
            {heading[1].toUpperCase()}
          </text>
          <line x1={left} y1={23} x2={width - 8} y2={23} stroke={C.line} strokeWidth={1} />
        </>
      )}
      {rungs.map((r, i) => {
        const y = top + i * (rowH + gapY);
        const { stroke, fill } = toneOf(r.tone);
        return (
          <g key={i}>
            <rect x={left} y={y} width={boxW} height={rowH} rx={9}
              fill={fill} stroke={stroke} strokeWidth={1.25} />
            <text x={left + 14} y={r.detail ? y + 20 : y + rowH / 2 + 4}
              fontFamily={MONO} fontSize={12.5} fontWeight={600} fill={C.text}>
              {r.name}
            </text>
            {r.detail && (
              <text x={left + 14} y={y + 35} fontFamily={MONO} fontSize={10.5} fill={C.dim}>
                {r.detail}
              </text>
            )}
            {i < rungs.length - 1 && (
              <line x1={left + boxW / 2} y1={y + rowH + 3} x2={left + boxW / 2}
                y2={y + rowH + gapY - 3} stroke={C.strong} strokeWidth={1.5}
                markerEnd="url(#dk-arrow)" />
            )}
            {r.adds.map((a, k) => (
              <text key={k} x={textX} y={y + (r.adds.length === 1 ? rowH / 2 + 4 : 19 + k * 15)}
                fontFamily={SANS} fontSize={11.5} fill={C.dim}>
                {a}
              </text>
            ))}
          </g>
        );
      })}
      {caption && <Caption x={left} y={height - 6}>{caption}</Caption>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * Stack — vertical layers, bottom-up dependency.
 * ------------------------------------------------------------------ */

export type Layer = { id?: string; name: string; items?: string; tone?: Tone };

export function Stack({
  layers, label, caption, sideLabel, width = 700,
}: {
  layers: Layer[]; label: string; caption?: string; sideLabel?: string; width?: number;
}) {
  const rowH = layers.some((l) => l.items) ? 54 : 40;
  const gap = 8;
  const top = 14;
  const left = sideLabel ? 58 : 8;
  const boxW = width - left - 8;
  const height = top + layers.length * (rowH + gap) + (caption ? 20 : 6);

  return (
    <Frame width={width} height={height} label={label}>
      {layers.map((l, i) => {
        const y = top + i * (rowH + gap);
        const { stroke, fill } = toneOf(l.tone);
        return (
          <g key={i}>
            <rect x={left} y={y} width={boxW} height={rowH} rx={10}
              fill={fill} stroke={stroke} strokeWidth={1.25} />
            {l.id && (
              <text x={left + 18} y={y + 23} fontFamily={MONO} fontSize={12}
                fontWeight={700} fill={l.tone && l.tone !== "plain" ? stroke : C.dim}>
                {l.id}
              </text>
            )}
            <text x={left + (l.id ? 56 : 18)} y={y + (l.items ? 23 : rowH / 2 + 4)}
              fontFamily={SANS} fontSize={13} fontWeight={600} fill={C.text}>
              {l.name}
            </text>
            {l.items && (
              <text x={left + (l.id ? 56 : 18)} y={y + 41} fontFamily={MONO}
                fontSize={11} fill={C.dim}>
                {l.items}
              </text>
            )}
          </g>
        );
      })}
      {sideLabel && (
        <>
          <line x1={34} y1={top + 6} x2={34}
            y2={top + layers.length * (rowH + gap) - gap - 6}
            stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
          <text x={20} y={top + (layers.length * (rowH + gap)) / 2} fontFamily={SANS}
            fontSize={10.5} fill={C.dim} textAnchor="middle"
            transform={`rotate(-90 20 ${top + (layers.length * (rowH + gap)) / 2})`}>
            {sideLabel}
          </text>
        </>
      )}
      {caption && <Caption x={left} y={height - 5}>{caption}</Caption>}
    </Frame>
  );
}
