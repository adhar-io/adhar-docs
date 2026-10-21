/**
 * Blog posts, loaded at build time from markdown files in src/content/blog/.
 *
 * Each file is one post. The file name is the URL slug, and the front matter
 * holds the metadata:
 *
 *   ---
 *   title: "Post title"
 *   excerpt: "One or two sentences for cards and previews."
 *   category: "DevOps"            # Platform Updates · DevOps · Security · AI/ML
 *   author: "Adhar Team"
 *   date: "2026-09-18"            # ISO date
 *   featured: false               # true pins it as the featured post
 *   tags: ["GitOps", "ArgoCD"]    # optional
 *   authorRole: "…"               # optional
 *   authorBio: "…"                # optional
 *   ---
 *
 * Cover art is drawn by <BlogCover>: each post has its own isometric scene
 * (SCENES in BlogCover.tsx, keyed by slug); a post without one uses its
 * category's scene. Posts need no image files. Reading time is worked out
 * from the text.
 */
import { parseFrontmatter } from "@/lib/docsRegistry";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  /** Optional byline role, e.g. "Creator of Adhar". Falls back to "Contributor". */
  authorRole?: string;
  /** Optional author bio blurb shown in the post footer. */
  authorBio?: string;
  /** Display date, e.g. "September 18, 2026". */
  date: string;
  /** ISO date from the front matter, e.g. "2026-09-18". */
  isoDate: string;
  readTime: string;
  featured: boolean;
  tags?: string[];
}

const files = import.meta.glob("/src/content/blog/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

function displayDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  // UTC, so the date never shifts a day in timezones west of Greenwich.
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function readTime(body: string): string {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

export const blogPosts: BlogPost[] = Object.entries(files)
  .map(([path, raw]) => {
    const slug = path.split("/").pop()!.replace(/\.md$/, "");
    const { data, body } = parseFrontmatter(raw);
    const iso = str(data.date);
    return {
      id: slug,
      slug,
      title: str(data.title, slug),
      excerpt: str(data.excerpt),
      content: body.trim(),
      category: str(data.category, "Platform Updates"),
      author: str(data.author, "Adhar Team"),
      authorRole: str(data.authorRole) || undefined,
      authorBio: str(data.authorBio) || undefined,
      date: displayDate(iso),
      isoDate: iso,
      readTime: readTime(body),
      featured: data.featured === true,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    };
  })
  // Newest first.
  .sort((a, b) => b.isoDate.localeCompare(a.isoDate));
