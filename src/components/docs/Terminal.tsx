import type { ReactNode } from "react";

/**
 * Renders real CLI output inside terminal chrome.
 *
 * This exists because Adhar is a command-line tool: the honest equivalent of a
 * product screenshot is its actual output, which stays copy-pasteable,
 * searchable and diffable instead of going stale as a bitmap. Content must be
 * genuine output — never invented to look plausible.
 *
 * Markdown uses a ```terminal fence. The first `$ ` line becomes the window
 * title; glyphs the CLI already emits (✓ ✖ ◌ ●) are colourised.
 */

const GLYPH = /([✓✔●])|([✖✗✘])|([◌○⟳])/;

function colourise(line: string, key: number): ReactNode {
  // A shell prompt line.
  const prompt = line.match(/^(\s*)\$( .*)$/);
  if (prompt) {
    return (
      <div key={key}>
        <span>{prompt[1]}</span>
        <span className="text-emerald-400">$</span>
        <span className="text-slate-50 font-semibold">{prompt[2]}</span>
      </div>
    );
  }

  // A comment line.
  if (/^\s*#/.test(line)) {
    return (
      <div key={key} className="text-slate-500">
        {line || " "}
      </div>
    );
  }

  // Box-drawing only — the CLI's rounded info boxes.
  if (line.trim() && /^[\s╭╮╰╯─│┌┐└┘├┤┬┴┼]+$/.test(line)) {
    return (
      <div key={key} className="text-slate-600">
        {line}
      </div>
    );
  }

  // Otherwise split out the status glyphs and tint them.
  const parts = line.split(GLYPH).filter((p) => p !== undefined);
  return (
    <div key={key}>
      {parts.length === 1
        ? line || " "
        : parts.map((p, i) => {
            if (/^[✓✔●]$/.test(p))
              return (
                <span key={i} className="text-emerald-400">
                  {p}
                </span>
              );
            if (/^[✖✗✘]$/.test(p))
              return (
                <span key={i} className="text-rose-400">
                  {p}
                </span>
              );
            if (/^[◌○⟳]$/.test(p))
              return (
                <span key={i} className="text-amber-400">
                  {p}
                </span>
              );
            return <span key={i}>{p}</span>;
          })}
    </div>
  );
}

export default function Terminal({ content }: { content: string }) {
  const lines = content.replace(/\n+$/, "").split("\n");
  const firstCmd = lines.find((l) => /^\s*\$ /.test(l));
  const title = firstCmd ? firstCmd.replace(/^\s*\$\s*/, "") : "Terminal";

  return (
    <div className="my-7 overflow-hidden rounded-xl border border-slate-700/60 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 bg-slate-800 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate font-mono text-[11px] text-slate-400">
          {title}
        </span>
      </div>
      <div className="overflow-x-auto bg-[#0b1021] px-4 py-3.5">
        {/* `.docs-prose pre` sets line-height 1.65 and out-specifies a plain
            utility class; the box-drawing in CLI output only joins when rows
            sit flush, so this override has to win. */}
        <pre className="!m-0 !border-0 !bg-transparent !p-0 font-mono text-[12.5px] !leading-[1.25] text-slate-300">
          <code>{lines.map((l, i) => colourise(l, i))}</code>
        </pre>
      </div>
    </div>
  );
}
