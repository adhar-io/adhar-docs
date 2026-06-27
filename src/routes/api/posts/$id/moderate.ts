import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { posts, type Post } from "@/server/db/schema";
import { serializePost } from "@/server/lib/serialize";
import { getAuth, json, err, readJson } from "@/server/http";
import { authorName } from "@/server/posts-helpers";

const schema = z.object({
  action: z.enum(["approve", "reject", "publish"]),
  rejectionReason: z.string().max(1000).optional(),
});

export const Route = createFileRoute("/api/posts/$id/moderate")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await getAuth(request);
        if (!auth) return err("Authentication required", 401);
        if (!auth.roles.includes("moderator")) return err("Moderator role required", 403);

        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return err("Invalid moderation action", 400);

        const existing = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
        if (!existing) return err("Post not found", 404);

        const now = new Date();
        const patch: Partial<Post> = {
          moderatedBy: auth.userId,
          moderatedAt: now,
          updatedAt: now,
        };
        if (parsed.data.action === "approve") patch.status = "approved";
        if (parsed.data.action === "reject") {
          patch.status = "rejected";
          patch.rejectionReason = parsed.data.rejectionReason ?? null;
        }
        if (parsed.data.action === "publish") {
          patch.status = "published";
          patch.publishedAt = existing.publishedAt ?? now;
        }

        const [updated] = await db
          .update(posts)
          .set(patch)
          .where(eq(posts.id, params.id))
          .returning();
        return json({ post: serializePost(updated, await authorName(updated.authorId)) });
      },
    },
  },
});
