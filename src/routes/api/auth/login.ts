import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { users, userRoles } from "@/server/db/schema";
import { verifyPassword, signToken } from "@/server/lib/auth";
import { json, err, readJson } from "@/server/http";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return err("Invalid email or password", 400);
        const email = parsed.data.email.toLowerCase();

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
        if (!user || !ok) return err("Invalid email or password", 401);

        const token = await signToken({ sub: user.id, email: user.email });
        const roleRows = await db
          .select({ role: userRoles.role })
          .from(userRoles)
          .where(eq(userRoles.userId, user.id));
        return json({
          token,
          user: { id: user.id, email: user.email },
          roles: roleRows.map((r) => r.role),
        });
      },
    },
  },
});
