import React, { type ReactNode } from 'react';

export interface Block {
  command: string;
  /** How many characters of the command have been typed. */
  typed: number;
  lines: string[];
}

const SPINNER = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/;

// Symbols are drawn one cell wide, as in a real terminal: a fallback font
// renders ⎔ or ▣ wider than a column and would push the panel borders out.
const Cell = ({ ch, className }: { ch: string; className: string }) => (
  <span className={`inline-block w-[1ch] text-center ${className}`}>{ch}</span>
);

const TOKEN = /(✓|●|✖|○|◌|⎔|▣|▸|⛨|[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]|https?:\/\/[^\s│]+|[╭╮╰╯│─]+|\[[0-9T:.\-Z]+\]|INFO:)/;

/** Colour the CLI's tokens the way a dark terminal theme shows them. */
function paint(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return part;
    if (/^[╭╮╰╯│─]+$/.test(part)) return <span key={i} className="text-zinc-700">{part}</span>;
    if (part === '✓' || part === '●') return <Cell key={i} ch={part} className="text-emerald-400" />;
    if (part === '✖') return <Cell key={i} ch={part} className="text-rose-400" />;
    if (SPINNER.test(part)) return <Cell key={i} ch={part} className="text-amber-400" />;
    if (part === '○') return <Cell key={i} ch={part} className="text-zinc-600" />;
    if (part.length === 1) return <Cell key={i} ch={part} className="text-zinc-400" />;
    if (part.startsWith('http')) return <span key={i} className="text-sky-400">{part}</span>;
    if (part.startsWith('[')) return <span key={i} className="text-zinc-600">{part}</span>;
    return <span key={i} className="text-sky-500">{part}</span>; // INFO:
  });
}

/** A checklist line: glyph, label, then time (done) or detail (running). */
const STAGE = /^(\s*)(✓|○|✖|[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏])(\s\s)(.+?)(?:(\s\s)(.*))?$/;

const OutputLine = ({ line }: { line: string }) => {
  const title = line.match(/^(\s*)(Provisioning Adhar Platform)(\s\s)(\S+)$/);
  if (title) {
    return (
      <div className="whitespace-pre">
        {title[1]}<span className="font-semibold text-zinc-100">{title[2]}</span>{title[3]}<span className="text-zinc-500">{title[4]}</span>
      </div>
    );
  }
  const stage = line.match(STAGE);
  if (stage) {
    const [, indent, glyph, gap, label, gap2 = '', rest = ''] = stage;
    const state = glyph === '✓' ? 'done' : glyph === '○' ? 'pending' : glyph === '✖' ? 'failed' : 'active';
    return (
      <div className="whitespace-pre">
        {indent}{paint(glyph)}{gap}
        <span className={state === 'pending' ? 'text-zinc-600' : state === 'active' ? 'text-zinc-100' : 'text-zinc-300'}>{label}</span>
        {gap2}<span className="text-zinc-500">{rest}</span>
      </div>
    );
  }
  // A table header row is bold and muted, as the CLI's shared table draws it.
  const header = /\bSERVICE\s+USERNAME\s+PASSWORD\b/.test(line);
  // A blank line keeps its height: an empty div would collapse to nothing.
  return <div className={`whitespace-pre ${header ? 'font-semibold text-zinc-400' : 'text-zinc-300'}`}>{line ? paint(line) : ' '}</div>;
};

const Prompt = ({ children }: { children?: ReactNode }) => (
  <div className="whitespace-pre-wrap">
    <span className="text-emerald-400">$</span> <span className="text-zinc-100">{children}</span>
  </div>
);

const Cursor = () => <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-300 align-middle" />;

const TerminalContent = ({ blocks, idle }: { blocks: Block[]; idle: boolean }) => (
  <div className="flex h-90 flex-col justify-end overflow-hidden bg-zinc-950 p-4 text-left font-mono text-[11px] leading-[18px] sm:h-105 sm:p-6 sm:text-[13px] sm:leading-5 [mask-image:linear-gradient(to_bottom,transparent,black_18%)]">
    {blocks.map((b, i) => {
      const typing = b.typed < b.command.length;
      return (
        <div key={b.command} className={i < blocks.length - 1 || idle ? 'mb-4' : ''}>
          <Prompt>
            {b.command.slice(0, b.typed)}
            {typing && <Cursor />}
          </Prompt>
          {b.lines.length > 0 && <div className="mt-1.5">{b.lines.map((line, j) => <OutputLine key={j} line={line} />)}</div>}
        </div>
      );
    })}
    {idle && <Prompt><Cursor /></Prompt>}
  </div>
);

export default TerminalContent;
