import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { posts, profiles, type Post } from "./db/schema";
import { serializePost } from "./lib/serialize";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "post";
  let candidate = root;
  let n = 1;
  while (true) {
    const existing = await db.query.posts.findFirst({ where: eq(posts.slug, candidate) });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${root}-${++n}`;
  }
}

export async function authorName(authorId: string): Promise<string | null> {
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, authorId) });
  return profile?.displayName ?? null;
}

export async function serializeMany(rows: Post[]) {
  const names = new Map<string, string | null>();
  for (const row of rows) {
    if (!names.has(row.authorId)) names.set(row.authorId, await authorName(row.authorId));
  }
  return rows.map((row) => serializePost(row, names.get(row.authorId)));
}
