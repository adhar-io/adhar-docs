import GithubSlugger from "github-slugger";
import { headingText } from "@/lib/docsSearch";
import { parseStatus, type DocStatus } from "@/lib/docsStatus";

export interface StatusItem {
  name: string;
  status: DocStatus;
}

export interface StatusGroup {
  /** The h3 text, e.g. "Phase 3 — Developer experience & ecosystem". */
  title: string;
  /** The h3's rendered id, for linking. */
  anchor: string;
  items: StatusItem[];
}

/**
 * The status table rows of a docs page, grouped by their h3.
 *
 * A row counts when it is a table row under an h3 and carries a
 * `status:<key>` token; its first cell names the item. Tables that sit
 * directly under an h2 (a legend, an overview) belong to no group, so they
 * are not counted. Anchors come from github-slugger advanced over every
 * heading, as rehype-slug does, so they match the rendered ids.
 */
export function collectStatusGroups(md: string): StatusGroup[] {
  const slugger = new GithubSlugger();
  const groups: StatusGroup[] = [];
  let current: StatusGroup | null = null;
  let inFence = false;
  for (const line of md.split("\n")) {
    if (/^```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      const title = headingText(h[2]);
      const anchor = slugger.slug(title);
      if (h[1].length <= 2) current = null;
      else if (h[1].length === 3) groups.push((current = { title, anchor, items: [] }));
      continue;
    }
    if (!current || !line.trimStart().startsWith("|")) continue;
    const token = /`(status:[a-z-]+)`/.exec(line)?.[1];
    const status = token ? parseStatus(token) : null;
    if (!status) continue;
    const name = headingText(line.trim().replace(/^\|/, "").split("|")[0]);
    current.items.push({ name, status });
  }
  return groups.filter((g) => g.items.length > 0);
}

export function countByStatus(items: StatusItem[]): Record<DocStatus, number> {
  const counts: Record<DocStatus, number> = { complete: 0, "in-progress": 0, blocked: 0, planned: 0 };
  for (const i of items) counts[i.status]++;
  return counts;
}
