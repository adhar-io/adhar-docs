/* Tiny frontmatter + docs registry helpers. Zero deps. */

export interface DocMeta {
  title: string;
  section: string;
  order: number;
  badge?: string;
  icon?: string;
  category?: string;
  [k: string]: unknown;
}

export interface DocEntry {
  /** route path, e.g. "/adhar-kit/modules/web" */
  path: string;
  /** raw markdown body (no frontmatter) */
  body: string;
  meta: DocMeta;
  /** ordered list of breadcrumb segments after base */
  segments: string[];
}

export interface DocSection {
  title: string;
  order: number;
  items: DocEntry[];
}

/* ─────────────── frontmatter ─────────────── */

const FM_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const m = raw.match(FM_RE);
  if (!m) return { data: {}, body: raw };
  const body = raw.slice(m[0].length);
  const data: Record<string, unknown> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (!key) continue;
    try {
      data[key] = JSON.parse(val);
    } catch {
      data[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return { data, body };
}

function deriveTitle(body: string, fallback: string): string {
  const h1 = body.match(/^\s*#\s+(.+)$/m);
  return h1 ? h1[1].trim() : fallback;
}

function humanize(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─────────────── registry builder ─────────────── */

export interface RegistryConfig {
  /** Base URL, e.g. "/adhar-kit" */
  base: string;
  /** Folder prefix in /src, e.g. "/src/content/adhar-kit" */
  contentRoot: string;
  /** Mapping from file path → raw markdown string (from import.meta.glob({eager:true,query:"?raw",import:"default"})) */
  modules: Record<string, string>;
}

export interface Registry {
  base: string;
  entries: DocEntry[];
  byPath: Map<string, DocEntry>;
  sections: DocSection[];
  /** Default landing entry (lowest order in first section, or first entry) */
  defaultEntry: DocEntry | null;
}

export function buildRegistry(cfg: RegistryConfig): Registry {
  const entries: DocEntry[] = [];

  for (const [file, raw] of Object.entries(cfg.modules)) {
    const rel = file.replace(cfg.contentRoot + "/", "").replace(/\.md$/, "");
    // segments: e.g. ["modules", "web"] or ["00-overview"]
    const segments = rel.split("/").map(seg =>
      // Strip numeric prefix like "00-" used for ordering
      seg.replace(/^\d+[-_]/, "")
    );

    const { data, body } = parseFrontmatter(raw);
    const filePath =
      typeof data.path === "string"
        ? (data.path as string)
        : `${cfg.base}/${segments.join("/")}`.replace(/\/+$/g, "") || cfg.base;

    const sectionFromFolder =
      segments.length > 1 ? humanize(segments[0]) : "Get Started";

    const meta: DocMeta = {
      title: (data.title as string) || deriveTitle(body, humanize(segments[segments.length - 1])),
      section: (data.section as string) || sectionFromFolder,
      order: typeof data.order === "number" ? data.order : 99,
      badge: data.badge as string | undefined,
      icon: data.icon as string | undefined,
      category: data.category as string | undefined,
    };

    entries.push({
      path: normalizePath(filePath),
      body,
      meta,
      segments,
    });
  }

  entries.sort(
    (a, b) =>
      a.meta.section.localeCompare(b.meta.section) ||
      a.meta.order - b.meta.order ||
      a.meta.title.localeCompare(b.meta.title),
  );

  const byPath = new Map(entries.map((e) => [e.path, e]));

  const SECTION_ORDER = [
    "Get Started",
    "Frameworks",
    "Modules",
    "Guides",
    "API Reference",
    "Getting Started",
    "Core Concepts",
    "Security",
    "Operations",
  ];
  const sectionRank = (s: string) => {
    const i = SECTION_ORDER.indexOf(s);
    return i === -1 ? 99 : i;
  };

  const groups = new Map<string, DocEntry[]>();
  for (const e of entries) {
    if (!groups.has(e.meta.section)) groups.set(e.meta.section, []);
    groups.get(e.meta.section)!.push(e);
  }

  const sections: DocSection[] = Array.from(groups.entries())
    .map(([title, items]) => ({
      title,
      order: sectionRank(title),
      items: items.sort((a, b) => a.meta.order - b.meta.order || a.meta.title.localeCompare(b.meta.title)),
    }))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  const defaultEntry =
    byPath.get(cfg.base) ||
    sections[0]?.items[0] ||
    entries[0] ||
    null;

  return { base: cfg.base, entries, byPath, sections, defaultEntry };
}

function normalizePath(p: string): string {
  const cleaned = p.replace(/\/+$/g, "") || "/";
  return cleaned.startsWith("/") ? cleaned : "/" + cleaned;
}
