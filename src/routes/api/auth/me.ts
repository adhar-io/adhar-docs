import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { getAuth, json, err } from "@/server/http";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await getAuth(request);
        if (!auth) return err("Authentication required", 401);
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, auth.userId),
        });
        return json({
          user: { id: auth.userId, email: auth.email },
          profile: profile ?? null,
          roles: auth.roles,
        });
      },
    },
  },
});
