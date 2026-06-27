import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { posts, type Post } from "@/server/db/schema";
import { serializePost, estimateReadTime } from "@/server/lib/serialize";
import { getAuth, json, err, readJson } from "@/server/http";
import { authorName, serializeMany, uniqueSlug } from "@/server/posts-helpers";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(200).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().optional(),
  category: z.string().max(80).optional(),
  image: z.string().max(2000).optional(),
  coverImage: z.string().max(2000).optional(),
  featured: z.boolean().optional(),
  readTime: z.string().max(40).optional(),
  status: z.enum(["draft", "pending"]).optional(),
});

export const Route = createFileRoute("/api/posts/")({
  server: {
    handlers: {
      // List posts. ?mine=true → own posts; ?status=… (moderator) → by status; default → published.
      GET: async ({ request }) => {
        const auth = await getAuth(request);
        const url = new URL(request.url);
        const mine = url.searchParams.get("mine") === "true";
        const status = url.searchParams.get("status");
        const isModerator = auth?.roles.includes("moderator");

        let where;
        if (mine && auth) where = eq(posts.authorId, auth.userId);
        else if (status === "all" && isModerator) where = undefined;
        else if (status && isModerator) where = eq(posts.status, status as Post["status"]);
        else where = eq(posts.status, "published");

        const rows = await db
          .select()
          .from(posts)
          .where(where)
          .orderBy(desc(posts.featured), desc(posts.publishedAt), desc(posts.createdAt));
        return json({ posts: await serializeMany(rows) });
      },

      // Create a post (author owns it; draft or pending only).
      POST: async ({ request }) => {
        const auth = await getAuth(request);
        if (!auth) return err("Authentication required", 401);
        const parsed = createSchema.safeParse(await readJson(request));
        if (!parsed.success) {
          return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
        }
        const data = parsed.data;
        const content = data.content ?? "";
        const slug = await uniqueSlug(data.slug || data.title);

        const [created] = await db
          .insert(posts)
          .values({
            authorId: auth.userId,
            title: data.title,
            slug,
            excerpt: data.excerpt ?? "",
            content,
            category: data.category ?? "Platform Updates",
            coverImage: data.coverImage ?? data.image ?? null,
            featured: data.featured ?? false,
            readTime: data.readTime ?? estimateReadTime(content),
            status: data.status ?? "draft",
          })
          .returning();

        return json({ post: serializePost(created, await authorName(auth.userId)) }, 201);
      },
    },
  },
});
