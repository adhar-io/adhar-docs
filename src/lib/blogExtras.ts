/* Lightweight client-side helpers for blog features: claps, bookmarks,
   tags, share, word-count, prev/next, etc. All localStorage-backed so
   the blog works without a backend. */

import type { BlogPost } from "@/data/blogData";

const CLAPS_KEY = "adhar.blog.claps.v1";
const BOOKMARKS_KEY = "adhar.blog.bookmarks.v1";
const USER_CLAPS_KEY = "adhar.blog.user-claps.v1";

const MAX_CLAPS_PER_USER = 50;

/* ------------------------------ STORAGE ------------------------------ */

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

/* -------------------------------- CLAPS ------------------------------ */

/** Aggregate claps for a slug, seeded with a stable pseudo-random baseline so
   even fresh visitors see meaningful numbers. */
function seedFor(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0;
  return Math.abs(hash) % 320 + 40; // 40-360
}

export function getClapCount(slug: string): number {
  const map = readJSON<Record<string, number>>(CLAPS_KEY, {});
  const seeded = seedFor(slug);
  const stored = map[slug] || 0;
  return seeded + stored;
}

export function getUserClaps(slug: string): number {
  const map = readJSON<Record<string, number>>(USER_CLAPS_KEY, {});
  return map[slug] || 0;
}

export function addClap(slug: string): { total: number; user: number; capped: boolean } {
  const userMap = readJSON<Record<string, number>>(USER_CLAPS_KEY, {});
  const userClaps = userMap[slug] || 0;
  if (userClaps >= MAX_CLAPS_PER_USER) {
    return { total: getClapCount(slug), user: userClaps, capped: true };
  }
  userMap[slug] = userClaps + 1;
  writeJSON(USER_CLAPS_KEY, userMap);

  const totalMap = readJSON<Record<string, number>>(CLAPS_KEY, {});
  totalMap[slug] = (totalMap[slug] || 0) + 1;
  writeJSON(CLAPS_KEY, totalMap);

  return { total: getClapCount(slug), user: userMap[slug], capped: false };
}

/* ----------------------------- BOOKMARKS ----------------------------- */

export function listBookmarks(): string[] {
  return readJSON<string[]>(BOOKMARKS_KEY, []);
}

export function isBookmarked(slug: string): boolean {
  return listBookmarks().includes(slug);
}

export function toggleBookmark(slug: string): boolean {
  const list = listBookmarks();
  const i = list.indexOf(slug);
  if (i >= 0) {
    list.splice(i, 1);
    writeJSON(BOOKMARKS_KEY, list);
    return false;
  }
  list.unshift(slug);
  writeJSON(BOOKMARKS_KEY, list);
  return true;
}

/* -------------------------------- TAGS -------------------------------- */

/** Extract lightweight tags from the post: category + capitalized headings
   words. Tags are derived so we don't need a schema migration. */
export function tagsForPost(post: Pick<BlogPost, "category" | "content" | "title">): string[] {
  const out = new Set<string>();
  if (post.category) out.add(post.category);

  // Pull useful keywords from h2/h3 headings
  const headingRe = /^#{2,3}\s+(.+?)\s*#*\s*$/gm;
  const stopwords = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "your", "you", "are", "but", "what", "when", "where", "how", "why", "our", "their"]);
  const body = post.content || "";
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(body))) {
    const words = m[1].split(/\s+/);
    for (const w of words) {
      const clean = w.replace(/[^a-zA-Z0-9-]/g, "");
      if (clean.length > 3 && /^[A-Z]/.test(clean) && !stopwords.has(clean.toLowerCase())) {
        out.add(clean);
        if (out.size > 8) break;
      }
    }
    if (out.size > 8) break;
  }
  return [...out];
}

/* --------------------------- POST META HELPERS ------------------------ */

export function wordCount(content: string): number {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}

export function readingTimeMinutes(content: string): number {
  return Math.max(1, Math.ceil(wordCount(content) / 220));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/* ------------------------------- DATES -------------------------------- */

/** Parse "December 14, 2024" or ISO date into a sortable Date. Returns
   Date(0) if unparseable so it sinks to the bottom. */
export function parsePostDate(raw: string | undefined): Date {
  if (!raw) return new Date(0);
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/* ------------------------- PREV / NEXT IN SERIES ---------------------- */

export function prevNextInList<T extends { id: string }>(list: T[], currentId: string): {
  prev?: T;
  next?: T;
} {
  const i = list.findIndex((p) => p.id === currentId);
  if (i < 0) return {};
  return {
    prev: i > 0 ? list[i - 1] : undefined,
    next: i < list.length - 1 ? list[i + 1] : undefined,
  };
}

/* ------------------------------- SHARING ------------------------------ */

export function buildShareUrl(slug: string): string {
  if (typeof window === "undefined") return `/blog/${slug}`;
  return `${window.location.origin}/blog/${slug}`;
}

export function shareLinks(post: Pick<BlogPost, "title" | "slug">) {
  const url = encodeURIComponent(buildShareUrl(post.slug));
  const text = encodeURIComponent(post.title);
  return {
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    hn: `https://news.ycombinator.com/submitlink?u=${url}&t=${text}`,
    mailto: `mailto:?subject=${text}&body=${url}`,
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function nativeShare(post: Pick<BlogPost, "title" | "slug" | "excerpt">): Promise<"shared" | "unsupported" | "cancelled"> {
  if (typeof navigator === "undefined" || !("share" in navigator)) return "unsupported";
  try {
    await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
      title: post.title,
      text: post.excerpt,
      url: buildShareUrl(post.slug),
    });
    return "shared";
  } catch {
    return "cancelled";
  }
}
