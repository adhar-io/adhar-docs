import type { CSSProperties } from "react";
import { Avatar, Box, Check, Flow, Float, Hex, Node, Scene, TextLines } from "./kit";

/* Every scene is 480×220 and decorative: the page's own heading says what it means. */

const orbitAround = (cx: number, cy: number, seconds: number, reverse?: boolean): CSSProperties => ({
  transformBox: "view-box",
  transformOrigin: `${cx}px ${cy}px`,
  animationDuration: `${seconds}s`,
  animationDirection: reverse ? "reverse" : undefined,
});

/** Teams on top, the control plane in the middle, Kubernetes underneath. */
const Platform = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        {[132, 240, 348].map((x) => <Flow key={x} d={`M${x} 58 V92`} grad={grad} />)}
        {[150, 240, 330].map((x) => <Flow key={x} d={`M${x} 136 V166`} grad={grad} />)}

        <Float>
          <Box x={84} y={14} w={96} h={44} />
          <rect x={98} y={25} width={26} height={22} rx={4} className="ln" />
          <path d="M98 31 h26" className="ln" />
          <TextLines x={132} y={30} widths={[34, 22]} />
        </Float>
        <Float at={0.8}>
          <Box x={192} y={14} w={96} h={44} />
          <path d="M206 29 l6 5 -6 5 M216 41 h10" className="ln" />
          <TextLines x={238} y={30} widths={[34, 22]} />
        </Float>
        <Float at={1.6}>
          <Box x={300} y={14} w={96} h={44} accent={grad} />
          <path d="M318 25 Q319 35 329 36 Q319 37 318 47 Q317 37 307 36 Q317 35 318 25Z" fill={grad} className="pulse" />
          <TextLines x={338} y={30} widths={[34, 22]} />
        </Float>

        <Box x={60} y={92} w={360} h={44} r={12} accent={grad} />
        {[108, 152, 196, 240, 284, 328, 372].map((x) =>
          x === 240 ? (
            <Hex key={x} cx={x} cy={114} r={10} className="ln-accent" stroke={grad} fill={wash} />
          ) : (
            <Hex key={x} cx={x} cy={114} r={8} />
          ),
        )}

        <Box x={36} y={166} w={408} h={40} r={12} />
        {Array.from({ length: 9 }, (_, i) => (
          <Node key={i} cx={76 + i * 41} cy={186} r={5} grad={grad} at={i * 0.25} />
        ))}
      </>
    )}
  </Scene>
);

/** Git → Argo CD sync → cluster, with drift flowing back to be reconciled. */
const GitOps = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        <Flow d="M156 110 H198" grad={grad} />
        <Flow d="M282 110 H324" grad={grad} />
        <path d="M388 176 C388 210 240 210 240 154" className="ln-soft dashed" />
        <path d="M235 160 l5 -6 5 6" className="ln-soft" />

        <Float>
          <Box x={28} y={56} w={128} h={108} />
          <circle cx={46} cy={72} r={4} className="ln" />
          <circle cx={46} cy={96} r={4} className="ln" />
          <circle cx={64} cy={84} r={4} className="ln-accent" stroke={grad} />
          <path d="M46 76 V92 M46 90 C46 85 52 84 60 84" className="ln" />
          <TextLines x={78} y={74} widths={[56, 40]} gap={12} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              {i === 0 ? <Node cx={46} cy={122 + i * 14} r={3} grad={grad} /> : <circle cx={46} cy={122 + i * 14} r={3} className="ln" />}
              <path d={`M58 ${122 + i * 14} h${[78, 60, 70][i]}`} className="ln-soft" />
            </g>
          ))}
        </Float>

        <circle cx={240} cy={110} r={40} className="ping" stroke={grad} />
        <g className="lift">
          <circle cx={240} cy={110} r={40} className="card" />
          <circle cx={240} cy={110} r={40} className="ln-accent" stroke={grad} style={{ fill: wash }} />
        </g>
        <g className="spin">
          <path d="M240 84 A26 26 0 0 1 266 110 M260 105 l6 5 5 -6" className="ln-accent" stroke={grad} />
          <path d="M240 136 A26 26 0 0 1 214 110 M220 115 l-6 -5 -5 6" className="ln-accent" stroke={grad} />
        </g>
        <Node cx={240} cy={110} r={5} grad={grad} />

        <Box x={324} y={46} w={128} h={128} />
        {[0, 1, 2].flatMap((row) =>
          [0, 1, 2].map((col) => (
            <g key={`${row}${col}`}>
              <circle cx={356 + col * 32} cy={78 + row * 32} r={9} className="ln" />
              <Node cx={356 + col * 32} cy={78 + row * 32} r={3.5} grad={grad} at={(row * 3 + col) * 0.3} />
            </g>
          )),
        )}
      </>
    )}
  </Scene>
);

/** Code → build → signed → registry → admitted into the cluster. */
const SupplyChain = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        <Flow d="M100 110 H132" grad={grad} />
        <Flow d="M176 110 H214" grad={grad} />
        <Flow d="M266 110 H298" grad={grad} />
        <Flow d="M358 110 H388" grad={grad} />

        <Float>
          <Box x={16} y={72} w={84} h={76} />
          <path d="M48 90 l-8 8 8 8 M68 90 l8 8 -8 8 M62 86 l-8 24" className="ln" />
          <TextLines x={32} y={126} widths={[52, 34]} gap={9} />
        </Float>

        <circle cx={154} cy={110} r={18} className="spin teeth" />
        <g className="lift">
          <circle cx={154} cy={110} r={12} className="card" />
          <circle cx={154} cy={110} r={12} className="ln" />
        </g>
        <Node cx={154} cy={110} r={3.5} grad={grad} />

        <circle cx={240} cy={111} r={30} className="ping" stroke={grad} />
        <path
          d="M240 80 L264 89 V108 C264 125 253 136 240 142 C227 136 216 125 216 108 V89 Z"
          className="ln-accent lift"
          stroke={grad}
          style={{ fill: "hsl(var(--card))" }}
        />
        <path d="M240 80 L264 89 V108 C264 125 253 136 240 142 C227 136 216 125 216 108 V89 Z" style={{ fill: wash }} />
        <Check d="M229 111 l8 8 14 -16" grad={grad} />

        {[86, 104, 122].map((y, i) => (
          <Float key={y} at={i * 0.5}>
            <Box x={300} y={y} w={56} h={16} r={5} />
            <Node cx={310} cy={y + 8} r={2.5} grad={grad} at={i * 0.4} />
            <path d={`M318 ${y + 8} h28`} className="ln-soft" />
          </Float>
        ))}

        <Box x={388} y={70} w={76} h={80} />
        {[[410, 98], [442, 98], [410, 126], [442, 126]].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={8} className="ln" />
            <Node cx={cx} cy={cy} r={3} grad={grad} at={i * 0.35} />
          </g>
        ))}
        <circle cx={460} cy={72} r={10} fill={grad} />
        <path d="M455 72 l3.5 3.5 6.5 -7" className="ink-on-accent" />
      </>
    )}
  </Scene>
);

/** One platform at the centre, every package wired into it. */
const Hub = () => {
  const sats = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const a = (Math.PI / 180) * deg;
    return [240 + 190 * Math.cos(a), 110 + 80 * Math.sin(a)] as const;
  });
  return (
    <Scene>
      {({ grad, wash }) => (
        <>
          {sats.map(([x, y], i) => (
            <Flow key={i} d={`M240 110 L${x.toFixed(1)} ${y.toFixed(1)}`} grad={grad} />
          ))}
          {sats.map(([x, y], i) => (
            <Float key={i} at={i * 0.4}>
              <Box x={x - 17} y={y - 17} w={34} h={34} r={9} />
              {i % 3 === 0 && <Node cx={x} cy={y} r={4} grad={grad} at={i * 0.3} />}
              {i % 3 === 1 && <path d={`M${x - 8} ${y - 4} h16 M${x - 8} ${y + 4} h10`} className="ln" />}
              {i % 3 === 2 && <Hex cx={x} cy={y} r={7} />}
            </Float>
          ))}
          <circle cx={240} cy={110} r={34} className="ping" stroke={grad} />
          <g className="lift">
            <Hex cx={240} cy={110} r={32} className="card" />
            <Hex cx={240} cy={110} r={32} className="ln-accent" stroke={grad} fill={wash} />
          </g>
          <Hex cx={240} cy={110} r={14} className="ln-accent" stroke={grad} />
          <Node cx={240} cy={110} r={4} grad={grad} />
        </>
      )}
    </Scene>
  );
};

/** Self-hosted on your hardware, or hosted on Adhar Cloud — the same platform. */
const TwoPaths = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        <Flow d="M144 110 H212" grad={grad} />
        <Flow d="M346 124 C312 124 300 110 268 110" grad={grad} />

        <Float>
          <Box x={40} y={48} w={104} h={124} r={12} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={54} y={60 + i * 36} width={76} height={28} rx={6} className="ln" />
              <Node cx={66} cy={74 + i * 36} r={3} grad={grad} at={i * 0.5} />
              <path d={`M78 ${74 + i * 36} h38`} className="ln-soft" />
            </g>
          ))}
        </Float>

        <circle cx={240} cy={110} r={34} className="ping" stroke={grad} />
        <g className="lift">
          <Hex cx={240} cy={110} r={32} className="card" />
          <Hex cx={240} cy={110} r={32} className="ln-accent" stroke={grad} fill={wash} />
        </g>
        <Hex cx={240} cy={110} r={14} className="ln-accent" stroke={grad} />

        <Float at={1}>
          <path
            d="M346 146 H436 A22 22 0 0 0 436 102 A28 28 0 0 0 384 88 A22 22 0 0 0 346 114 A16 16 0 0 0 346 146 Z"
            className="ln-accent lift"
            stroke={grad}
            style={{ fill: "hsl(var(--card))" }}
          />
          <path d="M346 146 H436 A22 22 0 0 0 436 102 A28 28 0 0 0 384 88 A22 22 0 0 0 346 114 A16 16 0 0 0 346 146 Z" style={{ fill: wash }} />
          <Hex cx={394} cy={122} r={11} className="ln-accent" stroke={grad} />
          <Node cx={394} cy={122} r={3} grad={grad} />
        </Float>
      </>
    )}
  </Scene>
);

/** People connected through the project. */
const Network = () => {
  const people: [number, number][] = [[84, 96], [156, 44], [150, 174], [326, 44], [332, 174], [400, 104]];
  return (
    <Scene>
      {({ grad }) => (
        <>
          <path d="M84 96 L156 44 M326 44 L400 104 L332 174" className="ln-soft dashed" />
          {people.map(([x, y], i) => <Flow key={i} d={`M240 110 L${x} ${y}`} grad={grad} />)}
          {people.map(([x, y], i) => (
            <Float key={i} at={i * 0.6}>
              <Avatar cx={x} cy={y} r={20} />
            </Float>
          ))}
          <circle cx={240} cy={110} r={30} className="ping" stroke={grad} />
          <Avatar cx={240} cy={110} r={30} accent={grad} />
        </>
      )}
    </Scene>
  );
};

/** A question, an answer being typed, a message on its way. */
const Conversation = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        <path d="M268 70 C310 76 336 46 372 54" className="ln-soft dashed" />

        <Float>
          <rect x={60} y={36} width={200} height={74} rx={16} className="card lift" />
          <rect x={60} y={36} width={200} height={74} rx={16} className="ln" />
          <path d="M84 108 L78 128 L106 109" className="card" />
          <path d="M84 110 L78 128 L106 110" className="ln" />
          <TextLines x={80} y={60} widths={[150, 118, 80]} gap={14} />
        </Float>

        <Float at={1.2}>
          <rect x={236} y={124} width={184} height={60} rx={16} className="card lift" />
          <rect x={236} y={124} width={184} height={60} rx={16} className="ln-accent" stroke={grad} style={{ fill: wash }} />
          <path d="M392 182 L402 200 L376 183" className="card" />
          <path d="M392 184 L402 200 L376 184" className="ln-accent" stroke={grad} />
          {[0, 1, 2].map((i) => <Node key={i} cx={304 + i * 22} cy={154} r={5} grad={grad} at={i * 0.25} />)}
        </Float>

        <Float at={0.6}>
          <path d="M372 54 L428 30 L410 76 L400 60 Z" className="ln-accent lift" stroke={grad} style={{ fill: "hsl(var(--card))" }} />
          <path d="M372 54 L428 30 L410 76 L400 60 Z" style={{ fill: wash }} />
          <path d="M400 60 L428 30" className="ln-accent" stroke={grad} />
        </Float>
      </>
    )}
  </Scene>
);

const Article = ({ x, y, grad, wash }: { x: number; y: number; grad: string; wash: string }) => (
  <g>
    <Box x={x} y={y} w={132} h={150} r={12} />
    <rect x={x + 12} y={y + 12} width={108} height={58} rx={8} style={{ fill: wash }} />
    <circle cx={x + 34} cy={y + 32} r={7} className="ln-accent" stroke={grad} />
    <path d={`M${x + 12} ${y + 64} l30 -20 20 12 26 -18 32 24`} className="ln-accent" stroke={grad} />
    <TextLines x={x + 14} y={y + 88} widths={[96, 104, 78, 60]} gap={13} />
  </g>
);

/** Articles, fanned out. */
const Reading = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        <g transform="rotate(-9 176 121)"><Article x={110} y={46} grad={grad} wash={wash} /></g>
        <g transform="rotate(9 304 121)"><Article x={238} y={46} grad={grad} wash={wash} /></g>
        <Float><Article x={174} y={30} grad={grad} wash={wash} /></Float>
        <Node cx={110} cy={36} r={3} grad={grad} at={0.4} />
        <Node cx={382} cy={196} r={3} grad={grad} at={1.1} />
      </>
    )}
  </Scene>
);

/** A document under lock (privacy, terms) or a checklist under a shield (compliance). */
const Document = ({ variant }: { variant: "lock" | "checks" }) => (
  <Scene>
    {({ grad, wash }) => (
      <>
        <Node cx={128} cy={66} r={3} grad={grad} at={0.5} />
        <Node cx={140} cy={172} r={2.5} grad={grad} at={1.3} />
        <Node cx={352} cy={52} r={2.5} grad={grad} at={0.9} />

        <Float>
          <path d="M170 24 H272 L304 56 V196 H170 Z" className="card lift" />
          <path d="M170 24 H272 L304 56 V196 H170 Z M272 24 V56 H304" className="ln" />
          {variant === "lock" ? (
            <TextLines x={188} y={78} widths={[92, 80, 98, 66, 88, 56]} gap={16} />
          ) : (
            [0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <rect x={188} y={68 + i * 24} width={12} height={12} rx={3} className="ln" />
                <Check d={`M190.5 ${74.5 + i * 24} l3 3 5 -6`} grad={grad} at={0.3 + i * 0.25} />
                <path d={`M210 ${74 + i * 24} h${[78, 64, 82, 56, 70][i]}`} className="ln-soft" />
              </g>
            ))
          )}
        </Float>

        <circle cx={306} cy={168} r={30} className="ping" stroke={grad} />
        <circle cx={306} cy={168} r={30} className="card lift" />
        <circle cx={306} cy={168} r={30} className="ln-accent" stroke={grad} style={{ fill: wash }} />
        {variant === "lock" ? (
          <>
            <path d="M298 164 V158 A8 8 0 0 1 314 158 V164" className="ln-accent" stroke={grad} />
            <rect x={293} y={164} width={26} height={20} rx={5} fill={grad} />
            <circle cx={306} cy={173} r={2.5} className="ink-on-accent-fill" />
          </>
        ) : (
          <>
            <path d="M306 148 L322 154 V167 C322 178 315 185 306 189 C297 185 290 178 290 167 V154 Z" className="ln-accent" stroke={grad} />
            <Check d="M299 168 l5 5 9 -10" grad={grad} at={1.5} />
          </>
        )}
      </>
    )}
  </Scene>
);

/** A cluster with one node missing, drifting off on its own. */
const Lost = () => (
  <Scene>
    {({ grad }) => (
      <>
        <Box x={60} y={40} w={220} h={140} r={14} />
        {[0, 1, 2].flatMap((row) =>
          [0, 1, 2, 3].map((col) => {
            const cx = 100 + col * 48;
            const cy = 76 + row * 34;
            if (row === 1 && col === 3) return <circle key="gap" cx={cx} cy={cy} r={10} className="ln-soft dashed" />;
            return (
              <g key={`${row}${col}`}>
                <circle cx={cx} cy={cy} r={10} className="ln" />
                <Node cx={cx} cy={cy} r={3.5} grad={grad} at={(row * 4 + col) * 0.2} />
              </g>
            );
          }),
        )}
        <path d="M254 110 C300 112 322 150 364 104" className="ln-soft dashed" />
        <Float>
          <circle cx={382} cy={94} r={22} className="ping" stroke={grad} />
          <circle cx={382} cy={94} r={22} className="card lift" />
          <circle cx={382} cy={94} r={22} className="ln-accent" stroke={grad} />
          <path d="M375 87 Q375 79 382 79 Q390 79 390 86 Q390 92 382 94 V99" className="ln-accent" stroke={grad} />
          <circle cx={382} cy={106} r={1.8} fill={grad} />
          <path d="M424 56 v8 M420 60 h8 M412 140 v6 M409 143 h6" className="ln-soft" />
        </Float>
      </>
    )}
  </Scene>
);

/** The hexagon mark on its construction grid. */
const Construct = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        <circle cx={240} cy={110} r={92} className="ln-soft" />
        <circle cx={240} cy={110} r={56} className="ln-soft dashed spin" style={{ animationDuration: "40s" }} />
        <path d="M240 14 V206 M157 62 L323 158 M157 158 L323 62" className="ln-soft" />
        <path d="M120 110 H360" className="ln-soft dashed" />
        <Hex cx={240} cy={110} r={40} fill={wash} className="ln-accent" stroke={grad} />
        <Hex cx={240} cy={110} r={84} className="thick" stroke={grad} draw />
        {Array.from({ length: 6 }, (_, k) => {
          const a = (Math.PI / 180) * (60 * k - 90);
          return <Node key={k} cx={240 + 84 * Math.cos(a)} cy={110 + 84 * Math.sin(a)} r={4} grad={grad} at={k * 0.3} />;
        })}
      </>
    )}
  </Scene>
);

/** The foundation at the centre, with everything built on it in orbit. */
const Orbit = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        <ellipse cx={240} cy={110} rx={226} ry={58} className="ln-soft dashed" />
        <circle cx={240} cy={110} r={62} className="ln-soft" />
        <circle cx={240} cy={110} r={96} className="ln-soft" />
        <g className="spin" style={orbitAround(240, 110, 22)}>
          <circle cx={302} cy={110} r={6} fill={grad} />
          <circle cx={178} cy={110} r={4} className="ln" style={{ fill: "hsl(var(--card))" }} />
        </g>
        <g className="spin" style={orbitAround(240, 110, 34, true)}>
          <rect x={326} y={100} width={20} height={20} rx={5} className="card" />
          <rect x={326} y={100} width={20} height={20} rx={5} className="ln-accent" stroke={grad} />
          <Hex cx={154} cy={110} r={9} className="ln" fill="hsl(var(--card))" />
          <circle cx={240} cy={14} r={4} fill={grad} />
        </g>
        <circle cx={240} cy={110} r={30} className="ping" stroke={grad} />
        <g className="lift">
          <Hex cx={240} cy={110} r={30} className="card" />
          <Hex cx={240} cy={110} r={30} className="ln-accent" stroke={grad} fill={wash} />
        </g>
        <Hex cx={240} cy={110} r={13} className="ln-accent" stroke={grad} />
        <Node cx={36} cy={96} r={2.5} grad={grad} at={0.6} />
        <Node cx={448} cy={128} r={2.5} grad={grad} at={1.4} />
      </>
    )}
  </Scene>
);

/** One golden-path template, stamped out into running services. */
const Scaffold = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        {[48, 110, 172].map((y) => <Flow key={y} d={`M162 110 C232 110 232 ${y} 298 ${y}`} grad={grad} />)}

        <Float>
          <rect x={40} y={56} width={122} height={108} rx={12} className="card lift" />
          <rect x={40} y={56} width={122} height={108} rx={12} className="ln-accent dashed" stroke={grad} style={{ fill: wash }} />
          <rect x={56} y={72} width={28} height={28} rx={7} className="ln-accent" stroke={grad} />
          <path d="M64 86 h12 M70 80 v12" className="ln-accent" stroke={grad} />
          <TextLines x={94} y={80} widths={[50, 34]} gap={12} />
          <TextLines x={56} y={120} widths={[90, 72, 82]} gap={11} />
        </Float>

        {[24, 86, 148].map((y, i) => (
          <Float key={y} at={0.5 + i * 0.5}>
            <Box x={298} y={y} w={144} h={48} r={11} />
            <rect x={310} y={y + 12} width={24} height={24} rx={6} style={{ fill: wash }} />
            <Hex cx={322} cy={y + 24} r={7} className="ln-accent" stroke={grad} />
            <TextLines x={344} y={y + 19} widths={[62, 44]} gap={11} />
            <Node cx={426} cy={y + 24} r={4} grad={grad} ring at={i * 0.6} />
          </Float>
        ))}
      </>
    )}
  </Scene>
);

const Building = ({ x, accent }: { x: number; accent?: string }) => (
  <g>
    <Box x={x} y={52} w={120} h={116} r={14} accent={accent} />
    <path d={`M${x + 34} 152 V78 H${x + 86} V152`} className="ln" />
    {[0, 1, 2].flatMap((row) =>
      [0, 1].map((col) => (
        <rect key={`${row}${col}`} x={x + 44 + col * 22} y={88 + row * 18} width={10} height={9} rx={2} className="ln-soft" />
      )),
    )}
    <path d={`M${x + 22} 152 H${x + 98}`} className="ln" />
  </g>
);

/** Two organisations, joined through the platform. */
const Alliance = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        <Flow d="M160 110 H212" grad={grad} />
        <Flow d="M320 110 H268" grad={grad} />
        <Float><Building x={40} /></Float>
        <Float at={1.2}><Building x={320} accent={grad} /></Float>
        <circle cx={240} cy={110} r={30} className="ping" stroke={grad} />
        <g className="lift">
          <Hex cx={240} cy={110} r={28} className="card" />
          <Hex cx={240} cy={110} r={28} className="ln-accent" stroke={grad} fill={wash} />
        </g>
        <Check d="M230 111 l7 7 13 -15" grad={grad} at={0.6} />
        <Node cx={240} cy={34} r={3} grad={grad} at={0.4} />
        <Node cx={240} cy={190} r={3} grad={grad} at={1.2} />
      </>
    )}
  </Scene>
);

/** The docs under a magnifier, and a person ready to answer. */
const Help = () => (
  <Scene>
    {({ grad, wash }) => (
      <>
        <path d="M234 136 C256 136 256 90 272 90" className="ln-soft dashed" />
        <Float>
          <Box x={60} y={36} w={170} h={144} r={12} />
          <path d="M78 58 h70" className="ln" />
          <TextLines x={78} y={78} widths={[130, 116, 124, 92, 108, 70]} gap={14} />
        </Float>
        <g className="lift">
          <circle cx={206} cy={148} r={24} className="card" />
          <circle cx={206} cy={148} r={24} className="ln-accent" stroke={grad} style={{ fill: wash }} />
        </g>
        <path d="M223 165 L244 186" className="ln-accent thick" stroke={grad} />
        <TextLines x={194} y={143} widths={[22, 14]} gap={9} />

        <Float at={0.8}>
          <rect x={272} y={58} width={156} height={60} rx={14} className="card lift" />
          <rect x={272} y={58} width={156} height={60} rx={14} className="ln-accent" stroke={grad} style={{ fill: wash }} />
          {[0, 1, 2].map((i) => <Node key={i} cx={330 + i * 20} cy={88} r={4.5} grad={grad} at={i * 0.25} />)}
        </Float>
        <Float at={1.6}>
          <Box x={300} y={134} w={136} h={46} r={12} />
          <Avatar cx={322} cy={157} r={12} />
          <TextLines x={344} y={152} widths={[72, 50]} gap={10} />
        </Float>
      </>
    )}
  </Scene>
);

const SCENES = {
  alliance: Alliance,
  help: Help,
  platform: Platform,
  gitops: GitOps,
  "supply-chain": SupplyChain,
  hub: Hub,
  "two-paths": TwoPaths,
  network: Network,
  conversation: Conversation,
  reading: Reading,
  "doc-lock": () => <Document variant="lock" />,
  "doc-checks": () => <Document variant="checks" />,
  lost: Lost,
  construct: Construct,
  orbit: Orbit,
  scaffold: Scaffold,
} as const;

export type SceneName = keyof typeof SCENES;

/** A page-hero illustration, sized to sit above the eyebrow. */
const HeroArt = ({ name, className }: { name: SceneName; className?: string }) => {
  const Art = SCENES[name];
  return (
    <div className={className ?? "mx-auto -mt-4 mb-5 w-full max-w-100"}>
      <Art />
    </div>
  );
};

export default HeroArt;
