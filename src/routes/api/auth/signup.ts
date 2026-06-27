import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { users, profiles, userRoles } from "@/server/db/schema";
import { hashPassword, signToken } from "@/server/lib/auth";
import { env } from "@/server/lib/env";
import { json, err, readJson } from "@/server/http";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(60).optional(),
});

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) {
          return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
        }
        const email = parsed.data.email.toLowerCase();

        const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (existing) return err("An account with this email already exists", 409);

        const passwordHash = await hashPassword(parsed.data.password);
        const created = await db.transaction(async (tx) => {
          const [user] = await tx.insert(users).values({ email, passwordHash }).returning();
          await tx.insert(profiles).values({
            id: user.id,
            email,
            displayName: parsed.data.displayName ?? email.split("@")[0],
          });
          await tx.insert(userRoles).values({ userId: user.id, role: "user" });
          if (env.MODERATOR_EMAILS.includes(email)) {
            await tx.insert(userRoles).values({ userId: user.id, role: "moderator" });
          }
          return user;
        });

        const token = await signToken({ sub: created.id, email });
        const roleRows = await db
          .select({ role: userRoles.role })
          .from(userRoles)
          .where(eq(userRoles.userId, created.id));
        return json(
          { token, user: { id: created.id, email }, roles: roleRows.map((r) => r.role) },
          201
        );
      },
    },
  },
});
