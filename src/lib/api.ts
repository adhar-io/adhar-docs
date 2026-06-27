/**
 * Typed client for the Start server-route API (src/routes/api/*).
 * Auth uses a JWT bearer token kept in localStorage (browser only).
 */

const API_BASE = "/api";
const TOKEN_KEY = "adhar.auth.token.v1";

export type AppRole = "user" | "moderator";

export interface ApiUser {
  id: string;
  email: string;
}

export interface ApiProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface ApiPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  authorId: string;
  date: string;
  readTime: string;
  image: string;
  featured: boolean;
  status: "draft" | "pending" | "approved" | "rejected" | "published";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/* ----------------------------- token storage ----------------------------- */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------- core fetch ------------------------------ */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (body && (body.error as string)) || res.statusText || "Request failed";
    throw new ApiError(message, res.status);
  }
  return body as T;
}

/* --------------------------------- API ----------------------------------- */
export const api = {
  auth: {
    signup: (input: { email: string; password: string; displayName?: string }) =>
      request<{ token: string; user: ApiUser; roles: AppRole[] }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    login: (input: { email: string; password: string }) =>
      request<{ token: string; user: ApiUser; roles: AppRole[] }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    me: () =>
      request<{ user: ApiUser; profile: ApiProfile | null; roles: AppRole[] }>("/auth/me"),
  },
  posts: {
    list: (params?: { mine?: boolean; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.mine) qs.set("mine", "true");
      if (params?.status) qs.set("status", params.status);
      const q = qs.toString();
      return request<{ posts: ApiPost[] }>(`/posts${q ? `?${q}` : ""}`);
    },
    get: (slug: string) => request<{ post: ApiPost }>(`/posts/${encodeURIComponent(slug)}`),
    create: (input: Partial<ApiPost>) =>
      request<{ post: ApiPost }>("/posts", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, input: Partial<ApiPost>) =>
      request<{ post: ApiPost }>(`/posts/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: string) => request<{ ok: boolean }>(`/posts/${id}`, { method: "DELETE" }),
    moderate: (id: string, action: "approve" | "reject" | "publish", rejectionReason?: string) =>
      request<{ post: ApiPost }>(`/posts/${id}/moderate`, {
        method: "POST",
        body: JSON.stringify({ action, rejectionReason }),
      }),
  },
  profiles: {
    me: () => request<{ profile: ApiProfile }>("/profiles/me"),
    update: (input: Partial<ApiProfile>) =>
      request<{ profile: ApiProfile }>("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    get: (id: string) => request<{ profile: ApiProfile }>(`/profiles/${id}`),
  },
};
