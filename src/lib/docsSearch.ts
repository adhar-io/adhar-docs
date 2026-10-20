import GithubSlugger from "github-slugger";
import type { DocEntry } from "@/lib/docsRegistry";

/**
 * Client-side full-text search over a docs registry.
 *
 * Each page is split into chunks at its h2/h3 headings so a result can deep
 * link to the exact section. Anchors are produced with github-slugger — the
 * same slugger rehype-slug uses to render heading ids — so a link always
 * lands on a real element (including duplicate headings, which get -1, -2).
 *
 * Ranking: every query term must appear somewhere in the chunk. Matches in
 * the page title outrank matches in the section heading, which outrank
 * matches in body text; an exact phrase earns a bonus.
 */

export interface SearchChunk {
  path: string;
  pageTitle: string;
  section: string;
  /** Section heading; undefined for the page's intro */
  heading?: string;
  /** Element id of the heading, for #hash navigation */
  anchor?: string;
  /** Plain text: prose plus code, markdown syntax stripped */
  text: string;
  lc: { title: string; heading: string; text: string };
}

export interface SearchHit {
  chunk: SearchChunk;
  score: number;
  /** Snippet split into plain/highlighted parts */
  snippet: { text: string; hit: boolean }[];
}

/** Heading text as rehype-slug sees it: inline markdown removed. */
export function headingText(raw: string): string {
  return raw
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

function plain(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/[`*_>#|]/g, " ") // inline markup, tables, quotes
    .replace(/^\s*[-+]\s+/gm, " ")
    .replace(/-{3,}/g, " ") // table rules
    .replace(/\s+/g, " ")
    .trim();
}

export function buildIndex(entries: DocEntry[]): SearchChunk[] {
  const chunks: SearchChunk[] = [];
  for (const e of entries) {
    const slugger = new GithubSlugger();
    let current: { heading?: string; anchor?: string; lines: string[] } = { lines: [] };
    let fence: string | null = null;
    const flush = () => {
      const text = plain(current.lines.join("\n"));
      if (!text && !current.heading) return;
      const c: SearchChunk = {
        path: e.path,
        pageTitle: e.meta.title,
        section: e.meta.section,
        heading: current.heading,
        anchor: current.anchor,
        text,
        lc: {
          title: e.meta.title.toLowerCase(),
          heading: (current.heading ?? "").toLowerCase(),
          text: text.toLowerCase(),
        },
      };
      chunks.push(c);
    };

    for (const line of e.body.split("\n")) {
      const f = /^```(\S*)/.exec(line);
      if (f) {
        // Open/close a fence. Diagram fences hold registry keys, not content.
        fence = fence === null ? f[1] || "text" : null;
        continue;
      }
      if (fence !== null) {
        if (fence !== "diagram") current.lines.push(line);
        continue;
      }
      const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (h) {
        const text = headingText(h[2]);
        const id = slugger.slug(text); // advance the slugger for EVERY heading, as rehype-slug does
        if (h[1].length === 2 || h[1].length === 3) {
          flush();
          current = { heading: text, anchor: id, lines: [] };
        }
        continue;
      }
      current.lines.push(line);
    }
    flush();
  }
  return chunks;
}

function snippetFor(text: string, terms: string[], radius = 80): { text: string; hit: boolean }[] {
  if (!text) return [];
  const lc = text.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = lc.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  const start = at <= radius ? 0 : at - radius;
  const end = Math.min(text.length, (at === -1 ? 0 : at) + radius * 2);
  let s = text.slice(start, end);
  if (start > 0) s = "…" + s.replace(/^\S*\s/, "");
  if (end < text.length) s = s.replace(/\s\S*$/, "") + "…";

  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return s
    .split(re)
    .filter(Boolean)
    .map((part) => ({ text: part, hit: terms.includes(part.toLowerCase()) }));
}

export function search(index: SearchChunk[], query: string, limit = 24): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = Array.from(new Set(q.split(/\s+/).filter(Boolean)));
  const hits: SearchHit[] = [];

  for (const c of index) {
    const hay = `${c.lc.title} ${c.lc.heading} ${c.lc.text}`;
    if (!terms.every((t) => hay.includes(t))) continue;
    let score = 0;
    for (const t of terms) {
      if (c.lc.title.includes(t)) score += 12;
      if (c.lc.heading.includes(t)) score += 7;
      let n = 0;
      for (let i = c.lc.text.indexOf(t); i !== -1 && n < 5; i = c.lc.text.indexOf(t, i + t.length)) n++;
      score += n;
    }
    if (terms.length > 1) {
      if (c.lc.title.includes(q)) score += 15;
      if (c.lc.heading.includes(q)) score += 10;
      if (c.lc.text.includes(q)) score += 4;
    }
    if (c.lc.title.startsWith(q)) score += 6;
    if (!c.heading && c.lc.title.includes(q)) score += 4; // the page itself, not a subsection
    hits.push({ chunk: c, score, snippet: snippetFor(c.text, terms) });
  }

  hits.sort((a, b) => b.score - a.score);
  // At most three hits per page, so one long page cannot crowd out the rest.
  const perPage = new Map<string, number>();
  const out: SearchHit[] = [];
  for (const h of hits) {
    const n = perPage.get(h.chunk.path) ?? 0;
    if (n >= 3) continue;
    perPage.set(h.chunk.path, n + 1);
    out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}
