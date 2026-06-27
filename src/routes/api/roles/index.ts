import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { userRoles, users, profiles } from "@/server/db/schema";
import { getAuth, json, err, readJson } from "@/server/http";

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["user", "moderator"]),
});

async function requireModerator(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return { error: err("Authentication required", 401) };
  if (!auth.roles.includes("moderator")) return { error: err("Moderator role required", 403) };
  return { auth };
}

export const Route = createFileRoute("/api/roles/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireModerator(request);
        if (gate.error) return gate.error;

        const rows = await db
          .select({
            userId: users.id,
            email: users.email,
            displayName: profiles.displayName,
            role: userRoles.role,
          })
          .from(users)
          .leftJoin(profiles, eq(profiles.id, users.id))
          .leftJoin(userRoles, eq(userRoles.userId, users.id));

        const byUser = new Map<
          string,
          { userId: string; email: string; displayName: string | null; roles: string[] }
        >();
        for (const r of rows) {
          const entry = byUser.get(r.userId) ?? {
            userId: r.userId,
            email: r.email,
            displayName: r.displayName,
            roles: [],
          };
          if (r.role) entry.roles.push(r.role);
          byUser.set(r.userId, entry);
        }
        return json({ users: Array.from(byUser.values()) });
      },

      POST: async ({ request }) => {
        const gate = await requireModerator(request);
        if (gate.error) return gate.error;
        const parsed = roleSchema.safeParse(await readJson(request));
        if (!parsed.success) return err("Invalid input", 400);
        await db.insert(userRoles).values(parsed.data).onConflictDoNothing();
        return json({ ok: true }, 201);
      },

      DELETE: async ({ request }) => {
        const gate = await requireModerator(request);
        if (gate.error) return gate.error;
        const parsed = roleSchema.safeParse(await readJson(request));
        if (!parsed.success) return err("Invalid input", 400);
        await db
          .delete(userRoles)
          .where(
            and(eq(userRoles.userId, parsed.data.userId), eq(userRoles.role, parsed.data.role))
          );
        return json({ ok: true });
      },
    },
  },
});
