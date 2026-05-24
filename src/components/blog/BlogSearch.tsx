import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X, Hash, FileText, Quote } from "lucide-react";

export type SearchablePost = {
  id: string | number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
};

type Match = {
  post: SearchablePost;
  kind: "title" | "heading" | "excerpt";
  snippet: string;
  anchor?: string;
  score: number;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

const extractHeadings = (md: string): { text: string; anchor: string }[] => {
  if (!md) return [];
  const lines = md.split("\n");
  const out: { text: string; anchor: string }[] = [];
  for (const line of lines) {
    const m = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const text = m[1].trim();
      out.push({ text, anchor: slugify(text) });
    }
  }
  return out;
};

const highlight = (text: string, needle: string) => {
  if (!needle) return text;
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-[hsl(var(--blog-accent)/0.25)] text-[hsl(var(--blog-heading))] rounded-sm px-0.5">
        {text.slice(i, i + needle.length)}
      </mark>
      {text.slice(i + needle.length)}
    </>
  );
};

const snippetAround = (text: string, needle: string, pad = 60) => {
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return text.slice(0, pad * 2);
  const start = Math.max(0, i - pad);
  const end = Math.min(text.length, i + needle.length + pad);
  return (start > 0 ? "… " : "") + text.slice(start, end).trim() + (end < text.length ? " …" : "");
};

interface Props {
  posts: SearchablePost[];
  className?: string;
}

const BlogSearch = ({ posts, className = "" }: Props) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => {
    return posts.map((p) => ({
      post: p,
      headings: extractHeadings(p.content),
    }));
  }, [posts]);

  const matches = useMemo<Match[]>(() => {
    const needle = q.trim();
    if (needle.length < 2) return [];
    const lc = needle.toLowerCase();
    const out: Match[] = [];
    const seen = new Set<string>();

    for (const { post, headings } of index) {
      if (post.title.toLowerCase().includes(lc)) {
        const key = `t:${post.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ post, kind: "title", snippet: post.title, score: 100 });
        }
      }
      for (const h of headings) {
        if (h.text.toLowerCase().includes(lc)) {
          const key = `h:${post.id}:${h.anchor}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push({
              post,
              kind: "heading",
              snippet: h.text,
              anchor: h.anchor,
              score: 60,
            });
          }
        }
      }
      if (post.excerpt.toLowerCase().includes(lc)) {
        const key = `e:${post.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            post,
            kind: "excerpt",
            snippet: snippetAround(post.excerpt, needle),
            score: 30,
          });
        }
      }
    }

    return out.sort((a, b) => b.score - a.score).slice(0, 12);
  }, [q, index]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && matches[activeIdx]) {
      e.preventDefault();
      const m = matches[activeIdx];
      const href = `/blog/${m.post.slug}${m.anchor ? `#${m.anchor}` : ""}`;
      window.location.href = href;
    }
  };

  const KindIcon = ({ kind }: { kind: Match["kind"] }) =>
    kind === "title" ? (
      <FileText className="w-3.5 h-3.5" />
    ) : kind === "heading" ? (
      <Hash className="w-3.5 h-3.5" />
    ) : (
      <Quote className="w-3.5 h-3.5" />
    );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blog-subtle))]" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKey}
          placeholder="Search titles, headings, excerpts…"
          aria-label="Search blog"
          className="w-full bg-[hsl(var(--blog-surface))] border border-[hsl(var(--blog-border))] rounded-md pl-9 pr-20 py-3 text-sm text-[hsl(var(--blog-heading))] placeholder:text-[hsl(var(--blog-subtle))] focus:outline-none focus:border-[hsl(var(--blog-accent))] transition-colors"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {q && (
            <button
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded text-[hsl(var(--blog-subtle))] hover:text-[hsl(var(--blog-heading))]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-[hsl(var(--blog-border))] text-[10px] font-mono-display text-[hsl(var(--blog-subtle))]">
            ⌘K
          </kbd>
        </div>
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-2 max-h-[28rem] overflow-y-auto rounded-md border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-bg))] shadow-xl shadow-black/30">
          {matches.length === 0 ? (
            <div className="p-6 text-center text-sm text-[hsl(var(--blog-subtle))]">
              No matches for <span className="text-[hsl(var(--blog-heading))]">"{q}"</span>
            </div>
          ) : (
            <ul className="py-2">
              {matches.map((m, idx) => {
                const href = `/blog/${m.post.slug}${m.anchor ? `#${m.anchor}` : ""}`;
                const active = idx === activeIdx;
                return (
                  <li key={`${m.kind}-${m.post.id}-${m.anchor || ""}`}>
                    <Link
                      to={href}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-3 px-4 py-3 border-l-2 transition-colors ${
                        active
                          ? "bg-[hsl(var(--blog-surface))] border-[hsl(var(--blog-accent))]"
                          : "border-transparent hover:bg-[hsl(var(--blog-surface)/0.6)]"
                      }`}
                    >
                      <span className="mt-0.5 text-[hsl(var(--blog-accent-soft))]">
                        <KindIcon kind={m.kind} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 mb-1">
                          <span className="font-mono-display text-[9px] uppercase tracking-[0.25em] text-[hsl(var(--blog-accent-soft))]">
                            {m.kind}
                          </span>
                          <span className="font-mono-display text-[9px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))]">
                            {m.post.category}
                          </span>
                        </span>
                        <span className="block text-sm text-[hsl(var(--blog-heading))] font-medium leading-snug">
                          {highlight(m.snippet, q.trim())}
                        </span>
                        {m.kind !== "title" && (
                          <span className="block text-xs text-[hsl(var(--blog-subtle))] mt-1 truncate">
                            in {m.post.title}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogSearch;
