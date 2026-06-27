import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { userRoles } from "./db/schema";
import { verifyToken } from "./lib/auth";

export type AppRole = "user" | "moderator";

export interface AuthInfo {
  userId: string;
  email: string;
  roles: AppRole[];
}

/** Extracts and verifies the bearer token, returning the user + roles, or null. */
export async function getAuth(request: Request): Promise<AuthInfo | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const rows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, payload.sub));
  return {
    userId: payload.sub,
    email: payload.email,
    roles: rows.map((r) => r.role as AppRole),
  };
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function err(message: string, status: number): Response {
  return json({ error: message }, status);
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
