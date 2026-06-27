import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { json, err } from "@/server/http";

export const Route = createFileRoute("/api/profiles/$id")({
  server: {
    handlers: {
      // Public subset for author pages.
      GET: async ({ params }) => {
        const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, params.id) });
        if (!profile) return err("Profile not found", 404);
        return json({
          profile: {
            id: profile.id,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio,
          },
        });
      },
    },
  },
});
