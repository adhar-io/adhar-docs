/* Tiny localStorage-backed drafts store for blog authoring */
import type { BlogPost } from "@/data/blogData";

const KEY = "adhar.blog.drafts.v1";

export type DraftStatus = "draft" | "published";

export interface BlogDraft extends Partial<BlogPost> {
  id: string;
  status: DraftStatus;
  updatedAt: string;
}

function read(): BlogDraft[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(items: BlogDraft[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

export function listDrafts(): BlogDraft[] {
  return read().sort((a, b) =>
    (b.updatedAt || "").localeCompare(a.updatedAt || ""),
  );
}

export function getDraft(id: string): BlogDraft | undefined {
  return read().find((d) => d.id === id);
}

export function getDraftBySlug(slug: string): BlogDraft | undefined {
  return read().find((d) => d.slug === slug);
}

export function saveDraft(input: Partial<BlogPost> & { id?: string; status?: DraftStatus }): BlogDraft {
  const all = read();
  const id = input.id || crypto.randomUUID();
  const existing = all.find((d) => d.id === id);
  const next: BlogDraft = {
    ...existing,
    ...input,
    id,
    status: input.status || existing?.status || "draft",
    updatedAt: new Date().toISOString(),
  };
  const others = all.filter((d) => d.id !== id);
  write([next, ...others]);
  return next;
}

export function deleteDraft(id: string) {
  write(read().filter((d) => d.id !== id));
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
