import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { getAuth, json, err, readJson } from "@/server/http";

const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  avatarUrl: z.string().max(2000).nullable().optional(),
  bio: z.string().max(1000).nullable().optional(),
});

export const Route = createFileRoute("/api/profiles/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await getAuth(request);
        if (!auth) return err("Authentication required", 401);
        const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, auth.userId) });
        if (!profile) return err("Profile not found", 404);
        return json({ profile });
      },
      PATCH: async ({ request }) => {
        const auth = await getAuth(request);
        if (!auth) return err("Authentication required", 401);
        const parsed = updateSchema.safeParse(await readJson(request));
        if (!parsed.success) {
          return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
        }
        const [updated] = await db
          .update(profiles)
          .set({ ...parsed.data, updatedAt: new Date() })
          .where(eq(profiles.id, auth.userId))
          .returning();
        return json({ profile: updated });
      },
    },
  },
});
