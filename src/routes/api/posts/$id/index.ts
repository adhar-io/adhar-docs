import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { posts, type Post } from "@/server/db/schema";
import { serializePost, estimateReadTime } from "@/server/lib/serialize";
import { getAuth, json, err, readJson } from "@/server/http";
import { authorName, uniqueSlug } from "@/server/posts-helpers";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().max(200).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().optional(),
  category: z.string().max(80).optional(),
  image: z.string().max(2000).optional(),
  coverImage: z.string().max(2000).optional(),
  featured: z.boolean().optional(),
  readTime: z.string().max(40).optional(),
  status: z.enum(["draft", "pending", "approved", "rejected", "published"]).optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve the :id param as either a slug or an id (UUID). */
async function findPost(idOrSlug: string) {
  const where = UUID_RE.test(idOrSlug) ? eq(posts.id, idOrSlug) : eq(posts.slug, idOrSlug);
  return db.query.posts.findFirst({ where });
}

export const Route = createFileRoute("/api/posts/$id/")({
  server: {
    handlers: {
      // Fetch a post by slug (or id). Published is public; otherwise author/moderator only.
      GET: async ({ request, params }) => {
        const auth = await getAuth(request);
        const post = await findPost(params.id);
        if (!post) return err("Post not found", 404);
        const visible =
          post.status === "published" ||
          post.authorId === auth?.userId ||
          auth?.roles.includes("moderator");
        if (!visible) return err("Post not found", 404);
        return json({ post: serializePost(post, await authorName(post.authorId)) });
      },

      // Update: author edits own draft/rejected; moderators edit any.
      PATCH: async ({ request, params }) => {
        const auth = await getAuth(request);
        if (!auth) return err("Authentication required", 401);
        const existing = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
        if (!existing) return err("Post not found", 404);

        const isModerator = auth.roles.includes("moderator");
        const isOwner = existing.authorId === auth.userId;
        if (!isModerator && !isOwner) return err("You can only edit your own posts", 403);
        if (!isModerator && !["draft", "rejected"].includes(existing.status)) {
          return err("This post can no longer be edited", 403);
        }

        const parsed = updateSchema.safeParse(await readJson(request));
        if (!parsed.success) {
          return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
        }
        const data = parsed.data;
        const patch: Partial<Post> = { updatedAt: new Date() };
        if (data.title !== undefined) patch.title = data.title;
        if (data.slug !== undefined) patch.slug = await uniqueSlug(data.slug, params.id);
        if (data.excerpt !== undefined) patch.excerpt = data.excerpt;
        if (data.content !== undefined) {
          patch.content = data.content;
          if (data.readTime === undefined) patch.readTime = estimateReadTime(data.content);
        }
        if (data.category !== undefined) patch.category = data.category;
        if (data.coverImage !== undefined || data.image !== undefined) {
          patch.coverImage = data.coverImage ?? data.image ?? null;
        }
        if (data.readTime !== undefined) patch.readTime = data.readTime;
        if (isModerator && data.featured !== undefined) patch.featured = data.featured;

        if (data.status !== undefined) {
          if (!isModerator && !["draft", "pending"].includes(data.status)) {
            return err("You cannot set that status", 403);
          }
          patch.status = data.status;
          // Stamp publish metadata on transition to published (mirrors the old DB trigger).
          if (data.status === "published" && existing.status !== "published") {
            patch.publishedAt = existing.publishedAt ?? new Date();
            patch.moderatedBy = auth.userId;
            patch.moderatedAt = new Date();
          }
        }

        const [updated] = await db
          .update(posts)
          .set(patch)
          .where(eq(posts.id, params.id))
          .returning();
        return json({ post: serializePost(updated, await authorName(updated.authorId)) });
      },

      // Delete: author deletes own non-published; moderators delete any.
      DELETE: async ({ request, params }) => {
        const auth = await getAuth(request);
        if (!auth) return err("Authentication required", 401);
        const existing = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
        if (!existing) return err("Post not found", 404);
        const isModerator = auth.roles.includes("moderator");
        if (!isModerator) {
          if (existing.authorId !== auth.userId) {
            return err("You can only delete your own posts", 403);
          }
          if (existing.status === "published") {
            return err("Published posts cannot be deleted", 403);
          }
        }
        await db.delete(posts).where(eq(posts.id, params.id));
        return json({ ok: true });
      },
    },
  },
});
