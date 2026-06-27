import { useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import {
  ArrowRight,
  Bookmark,
  Clock,
  Hash,
  PenSquare,
  Rss,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { blogPosts, type BlogPost } from "@/data/blogData";
import { initials, listBookmarks, parsePostDate, tagsForPost } from "@/lib/blogExtras";
import BlogSearch from "@/components/blog/BlogSearch";

const CATEGORIES = ["All Stories", "Platform Updates", "DevOps", "Security", "AI/ML", "Community"];
const DEFAULT_CAT = "All Stories";

/** Render an API ISO date as a friendly "Month DD, YYYY" string. */
function formatPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const Blog = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(
    typeof (location as { searchStr?: string }).searchStr === "string"
      ? (location as { searchStr?: string }).searchStr
      : ""
  );
  const cat = searchParams.get("category") || DEFAULT_CAT;
  const tag = searchParams.get("tag") || "";
  const q = searchParams.get("q") || "";

  const updateParam = (key: string, value: string, defaultValue = "") => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    navigate({ to: "/blog", search: Object.fromEntries(next), replace: true });
  };

  const setCat = (c: string) => updateParam("category", c, DEFAULT_CAT);
  const setTag = (t: string) => updateParam("tag", t);
  const resetFilters = () => navigate({ to: "/blog", search: {}, replace: true });
  const hasActiveFilters = cat !== DEFAULT_CAT || q.trim() !== "" || tag.trim() !== "";

  // Published posts now come from the Postgres-backed API. Static blogData is
  // kept only as a fallback for first paint / when the API is unreachable.
  const { data } = useQuery({
    queryKey: ["posts", "published"],
    queryFn: () => api.posts.list(),
  });

  const allPosts = useMemo<BlogPost[]>(() => {
    const fromApi = (data?.posts ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      category: p.category,
      author: p.author,
      date: formatPostDate(p.date),
      readTime: p.readTime,
      image: p.image,
      featured: p.featured,
    }));
    const source = fromApi.length ? fromApi : blogPosts;
    return [...source].sort(
      (a, b) => parsePostDate(b.date).getTime() - parsePostDate(a.date).getTime(),
    );
  }, [data]);

  const tagsByPost = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of allPosts) map.set(p.id, tagsForPost(p));
    return map;
  }, [allPosts]);

  const tagCloud = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tags of tagsByPost.values()) {
      for (const t of tags) counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [tagsByPost]);

  const topAuthors = useMemo(() => {
    const counts: Record<string, { posts: number; latest: string }> = {};
    for (const p of allPosts) {
      const c = (counts[p.author] ||= { posts: 0, latest: p.date });
      c.posts++;
      if (parsePostDate(p.date) > parsePostDate(c.latest)) c.latest = p.date;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1].posts - a[1].posts)
      .slice(0, 4)
      .map(([author, meta]) => ({ author, ...meta }));
  }, [allPosts]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return allPosts.filter((p) => {
      const matchQ = !needle || p.title.toLowerCase().includes(needle) || p.excerpt.toLowerCase().includes(needle);
      const matchC = cat === "All Stories" || p.category === cat;
      const matchT = !tag || (tagsByPost.get(p.id) || []).includes(tag);
      return matchQ && matchC && matchT;
    });
  }, [allPosts, q, cat, tag, tagsByPost]);

  const featured = filtered.find((p) => p.featured) || filtered[0];
  const rest = filtered.filter((p) => p.id !== featured?.id);

  const [bookmarkSlugs] = useState<string[]>(() => (typeof window !== "undefined" ? listBookmarks() : []));
  const bookmarked = useMemo(
    () => allPosts.filter((p) => bookmarkSlugs.includes(p.slug)).slice(0, 4),
    [allPosts, bookmarkSlugs],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero / masthead */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div className="max-w-2xl">
                <span className="eyebrow mb-5">Blog</span>
                <h1 className="section-heading mt-5 text-foreground">
                  Notes on the
                  <br className="hidden sm:block" />
                  <span className="text-muted-foreground">craft of platforms.</span>
                </h1>
                <p className="section-subheading mt-6 !mx-0 !text-left">
                  Field reports on internal developer platforms, cloud-native architecture,
                  and how to ship faster without breaking things.
                </p>
              </div>
              <div className="flex flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                <Link
                  to="/blog/admin"
                  className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-4 h-9 text-xs font-medium"
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  Write a story
                </Link>
                <a
                  href="/rss.xml"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Rss className="w-3.5 h-3.5" />
                  RSS feed
                </a>
              </div>
            </div>

            {/* Search */}
            <div className="mt-10 max-w-xl">
              <BlogSearch posts={allPosts} />
            </div>
          </div>
        </section>

        {/* Filter row */}
        <section className="container-padding">
          <div className="max-width-content">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-y border-border/70 py-4">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => {
                  const active = cat === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setCat(c)}
                      className={`inline-flex items-center h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground border border-border/70 hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="tabular">
                  <span className="text-foreground font-medium">{filtered.length}</span>{" "}
                  {filtered.length === 1 ? "story" : "stories"}
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Active filter chips */}
            {(tag || q) && (
              <div className="flex items-center gap-2 flex-wrap mt-4">
                {tag && (
                  <button
                    onClick={() => setTag("")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium ring-1 ring-inset ring-primary/20"
                  >
                    <Hash className="w-3 h-3" />
                    {tag}
                    <X className="w-3 h-3 ml-0.5" />
                  </button>
                )}
                {q && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    "{q}"
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Featured + grid */}
        <section className="container-padding py-12">
          <div className="max-width-content">
            {filtered.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border border-border/70 bg-card">
                <h3 className="text-base font-semibold text-foreground tracking-tight">No stories match your filter.</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="btn-secondary-modern mt-5 inline-flex items-center justify-center gap-1.5 rounded-full px-4 h-9 text-xs font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Featured */}
                {featured && (
                  <Link
                    to={`/blog/${featured.slug}`}
                    className="group block mb-12 overflow-hidden rounded-3xl border border-border/70 bg-card transition-all hover:border-border hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="grid lg:grid-cols-2 gap-0">
                      <div className="relative aspect-[16/10] lg:aspect-auto overflow-hidden bg-muted">
                        <img
                          src={featured.image}
                          alt={featured.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm border border-border/70 text-xs font-medium text-foreground shadow-[var(--shadow-xs)]">
                            <Sparkles className="w-3 h-3 text-primary" />
                            Featured
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium ring-1 ring-inset ring-primary/20">
                            {featured.category}
                          </span>
                          <span className="text-xs text-muted-foreground tabular">{featured.readTime}</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl lg:text-[2rem] font-semibold tracking-tight text-foreground leading-[1.15] text-balance group-hover:text-primary transition-colors">
                          {featured.title}
                        </h2>
                        <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-3">
                          {featured.excerpt}
                        </p>
                        <div className="mt-6 pt-6 border-t border-border/60 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-muted ring-1 ring-border grid place-items-center text-xs font-semibold text-foreground">
                              {initials(featured.author)}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">{featured.author}</p>
                              <p className="text-[11px] text-muted-foreground tabular">{featured.date}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Grid */}
                {rest.length > 0 && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {rest.map((p) => (
                      <Link
                        key={p.id}
                        to={`/blog/${p.slug}`}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:border-border hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                          <img
                            src={p.image}
                            loading="lazy"
                            decoding="async"
                            alt={p.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                        <div className="flex-1 flex flex-col p-5 sm:p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                              {p.category}
                            </span>
                            <span className="text-[11px] text-muted-foreground tabular">{p.readTime}</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground leading-snug text-balance group-hover:text-primary transition-colors">
                            {p.title}
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                            {p.excerpt}
                          </p>
                          <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-6 h-6 rounded-full bg-muted ring-1 ring-border grid place-items-center text-[10px] font-semibold text-foreground">
                              {initials(p.author)}
                            </div>
                            <span className="font-medium text-foreground">{p.author}</span>
                            <span aria-hidden>·</span>
                            <span className="tabular">{p.date}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Topics + Reading list + Authors */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="grid lg:grid-cols-3 gap-5 sm:gap-6">
              {/* Topics */}
              {tagCloud.length > 0 && (
                <article className="rounded-2xl border border-border/70 bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">Topics</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tagCloud.map(([t, n]) => {
                      const active = t === tag;
                      return (
                        <button
                          key={t}
                          onClick={() => setTag(active ? "" : t)}
                          className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground border border-border/70 hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {t}
                          <span className={`text-[10px] tabular ${active ? "opacity-80" : "opacity-60"}`}>{n}</span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              )}

              {/* Reading list */}
              <article className="rounded-2xl border border-border/70 bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bookmark className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">Your reading list</h3>
                </div>
                {bookmarked.length > 0 ? (
                  <ul className="space-y-3">
                    {bookmarked.map((p) => (
                      <li key={p.id}>
                        <Link
                          to={`/blog/${p.slug}`}
                          className="group block"
                        >
                          <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {p.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground tabular flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {p.readTime}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Save articles for later by bookmarking them. They'll show up here.
                  </p>
                )}
              </article>

              {/* Top authors */}
              {topAuthors.length > 0 && (
                <article className="rounded-2xl border border-border/70 bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">Top contributors</h3>
                  </div>
                  <ul className="space-y-3">
                    {topAuthors.map((a) => (
                      <li key={a.author} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted ring-1 ring-border grid place-items-center text-xs font-semibold text-foreground shrink-0">
                          {initials(a.author)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{a.author}</p>
                          <p className="text-xs text-muted-foreground tabular">
                            {a.posts} {a.posts === 1 ? "story" : "stories"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              )}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="section-padding container-padding">
          <div className="max-width-content">
            <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card">
              <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
              <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-25 pointer-events-none" />
              <div className="relative px-6 py-14 sm:px-12 sm:py-16 text-center max-w-2xl mx-auto">
                <span className="eyebrow mb-6">Newsletter</span>
                <h2 className="section-heading mt-4 text-foreground">Stay in the loop.</h2>
                <p className="section-subheading mt-5">
                  Monthly deep-dives on cloud-native architecture, security patches, and platform-engineering trends — straight to your inbox.
                </p>
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                >
                  <input
                    type="email"
                    required
                    placeholder="email@company.com"
                    className="flex-1 bg-background border border-border rounded-full px-4 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    className="btn-primary-modern inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-sm font-medium"
                  >
                    Subscribe
                  </button>
                </form>
                <p className="mt-4 text-xs text-muted-foreground tabular">
                  12,400+ engineers · No spam · Unsubscribe anytime
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
