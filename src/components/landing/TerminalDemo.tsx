
import React, { useState, useEffect, useRef } from 'react';
import TerminalHeader from './terminal/TerminalHeader';
import TerminalContent, { type Block } from './terminal/TerminalContent';

// A real session, replayed: the stage labels, details, glyphs and layout are
// what the CLI's own renderers print at v0.1.65 (stage tracker, ready panel,
// status box, credentials table), with the wordmark banner and some panel rows
// left out. The timings, host and passwords are illustrative — GCP has not
// been timed, and no password here was ever real.

const TYPE_MS = 45; // per character
const ENTER_MS = 350; // between the command and its first output
const LINE_MS = 110; // printed lines stream at this pace
const HOLD_MS = 3400; // a finished command stays on screen this long
const FRAME_MS = 80; // spinner frame
const SPINNER = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

/** The CLI's elapsed format: 4s, 5m52s. */
const fmt = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`);

/** A rounded panel the way lipgloss draws it. */
const panel = (rows: string[], width = Math.max(...rows.map((r) => r.length)) + 3) => [
  `  ╭${'─'.repeat(width)}╮`,
  ...rows.map((r) => `  │${r.padEnd(width)}│`),
  `  ╰${'─'.repeat(width)}╯`,
];

// `adhar up -f gcp.yaml`: each stage's live detail, its reported time, and how
// long the replay spends on it.
const STAGES = [
  { label: 'Preflight', detail: 'credentials, quota and API access', secs: 4, ms: 600 },
  { label: 'Cloud cluster', detail: 'adhar · gcp · us-central1 — creating machines, this takes a few minutes', secs: 352, ms: 2400 },
  { label: 'Kubeconfig & TLS', detail: 'context, certificates, edge DNS', secs: 47, ms: 700 },
  { label: 'Cilium & Gateway', detail: 'eBPF data path', secs: 78, ms: 900 },
  { label: 'ArgoCD', detail: 'GitOps engine', secs: 65, ms: 800 },
  { label: 'Gitea', detail: 'adhar-controlplane Git server', secs: 58, ms: 700 },
  { label: 'GitOps repos', detail: 'packages, environments', secs: 21, ms: 500 },
  { label: 'Crossplane', detail: 'control plane + providers', secs: 94, ms: 900 },
  // The last stage counts apps up instead of a fixed detail.
  { label: 'GitOps sync - platform stack', detail: '', secs: 171, ms: 2600 },
];
const APPS = 75;
const TRACK_MS = STAGES.reduce((n, s) => n + s.ms, 0);
const TOTAL_SECS = STAGES.reduce((n, s) => n + s.secs, 0) + 3;

const READY = [
  '  ✓  Platform ready',
  '',
  ...panel([
    '  Console    https://console.cloud.example.com',
    '  ArgoCD     https://argocd.cloud.example.com',
    '  Grafana    https://grafana.cloud.example.com',
  ]),
];

function upOutput(t: number): string[] {
  let start = 0;
  let secs = 0;
  const stages = STAGES.map((s) => {
    const begin = start;
    start += s.ms;
    if (t >= start) {
      secs += s.secs;
      return `  ✓  ${s.label}  ${fmt(s.secs)}`;
    }
    if (t >= begin) {
      const f = (t - begin) / s.ms;
      secs += f * s.secs;
      const detail = s.detail || `${Math.round(9 + f * (APPS - 9))}/${APPS} apps Synced + Healthy`;
      return `  ${SPINNER[Math.floor(t / FRAME_MS) % SPINNER.length]}  ${s.label}  ${detail}`;
    }
    return `  ○  ${s.label}`;
  });
  const done = t >= TRACK_MS;
  const elapsed = done ? TOTAL_SECS : Math.floor(secs + (3 * t) / TRACK_MS);
  const lines = [`  Provisioning Adhar Platform  ${fmt(elapsed)}`, ...stages];
  if (done) lines.push(...READY.slice(0, Math.floor((t - TRACK_MS) / LINE_MS) + 1));
  return lines;
}

const STATUS = [
  '  [2026-11-03T10:42:17.904Z] INFO: ▣ Retrieving platform status...',
  '  [2026-11-03T10:42:19.311Z] INFO: ▣ Platform Status Overview',
  '',
  ...panel([
    ' ⎔ Overall Status: ● Healthy',
    ' ● Health Score: 100/100',
    ' ◌ Platform Uptime: 17m',
    ' ▸ Last Updated: 10:42:18 UTC',
  ], 80),
];

// `adhar get secrets`: the essential providers' credentials in the shared
// table (header, full-width rule, two spaces between columns), nested in the
// CLI's bordered panel (one cell of padding all round).
const credentialsTable = () => {
  const head = ['SERVICE', 'USERNAME', 'PASSWORD'];
  const rows = [
    ['⛨ ArgoCD', 'admin', 'Xk2vR9pLmQ4tN7wE'],
    ['⛨ Gitea', 'gitea_admin', 'c7Hq2mW9zR4vKp8T'],
    ['⛨ Keycloak (admin)', 'adhar-admin', 'Rb4nV8sQ2kLw7Zx3'],
    ['⛨ Keycloak user1 (admin)', 'user1@noreply.com', 'Tm6pE2vN9qYc4Hs8'],
    ['⛨ Keycloak user2 (developer)', 'user2@noreply.com', 'Jw3kD8rF5xLz2Bn7'],
  ];
  const widths = head.map((_, c) => Math.max(...[head, ...rows].map((r) => r[c].length)));
  const total = widths.reduce((n, w) => n + w, 0) + 2 * (widths.length - 1);
  const line = (r: string[]) => r.map((cell, c) => (c < r.length - 1 ? cell.padEnd(widths[c]) : cell)).join('  ');
  const body = [line(head), '─'.repeat(total), ...rows.map(line)];
  return panel(['', ...body.map((l) => ` ${l}`), ''], total + 4);
};

const SECRETS = [
  '  [2026-11-03T10:43:05.218Z] INFO: Retrieving platform secrets...',
  '',
  '  [2026-11-03T10:43:05.734Z] INFO: Found 5 credential(s) for platform',
  '',
  '',
  ...credentialsTable(),
];

const streamed = (lines: string[]) => (t: number) => lines.slice(0, Math.max(0, Math.floor(t / LINE_MS) + 1));

const SCRIPT = [
  { command: 'adhar up -f gcp-config.yaml', runMs: TRACK_MS + READY.length * LINE_MS, output: upOutput },
  { command: 'adhar get status', runMs: STATUS.length * LINE_MS, output: streamed(STATUS) },
  { command: 'adhar get secrets', runMs: SECRETS.length * LINE_MS, output: streamed(SECRETS) },
].map((s) => ({ ...s, typeMs: s.command.length * TYPE_MS + ENTER_MS }));

const SESSION_MS = SCRIPT.reduce((n, s) => n + s.typeMs + s.runMs + HOLD_MS, 0);

/** Everything on screen at time `t` into the session. */
function frame(t: number): { blocks: Block[]; idle: boolean } {
  const blocks: Block[] = [];
  let start = 0;
  let idle = false;
  for (const s of SCRIPT) {
    if (t < start) break;
    const since = t - start;
    const typed = Math.min(s.command.length, Math.floor(since / TYPE_MS));
    const running = since - s.typeMs;
    blocks.push({
      command: s.command,
      typed,
      lines: running >= 0 ? s.output(Math.min(running, s.runMs)) : [],
    });
    idle = running > s.runMs; // finished: a fresh prompt waits
    start += s.typeMs + s.runMs + HOLD_MS;
  }
  return { blocks, idle };
}

const TerminalDemo = () => {
  const [clock, setClock] = useState(0);
  // Without IntersectionObserver, just animate.
  const [onScreen, setOnScreen] = useState(() => typeof IntersectionObserver === 'undefined');
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
  );
  const ref = useRef<HTMLDivElement>(null);

  // Only animate while the terminal is visible.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || !onScreen) return;
    const id = setInterval(() => setClock((c) => (c + FRAME_MS) % SESSION_MS), FRAME_MS);
    return () => clearInterval(id);
  }, [onScreen, reducedMotion]);

  // Reduced motion: the finished session, still.
  const { blocks, idle } = frame(reducedMotion ? SESSION_MS - 1 : clock);

  return (
    <div ref={ref} className="max-w-4xl mx-auto" role="img" aria-label="Terminal demo: adhar up -f gcp-config.yaml works through its provisioning checklist on Google Cloud, from preflight to the GitOps sync of 75 platform apps, and prints the platform URLs; adhar get status then reports the platform healthy, and adhar get secrets lists the admin credentials for ArgoCD, Gitea and Keycloak.">
      <div className="bg-zinc-950 rounded-2xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.35)]">
        <TerminalHeader />
        <TerminalContent blocks={blocks} idle={idle} />
      </div>
    </div>
  );
};

export default TerminalDemo;
