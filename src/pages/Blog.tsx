import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { ArrowRight, PenSquare, X } from "lucide-react";
import { blogPosts } from "@/data/blogData";
import { listDrafts } from "@/lib/blogDrafts";
import blogBanner from "@/assets/blog-banner-adhar.jpg";
import BlogSearch from "@/components/blog/BlogSearch";

const CATEGORIES = ["All Stories", "Platform Updates", "DevOps", "Security", "AI/ML", "Community"];
const DEFAULT_CAT = "All Stories";

const Blog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cat = searchParams.get("category") || DEFAULT_CAT;
  const q = searchParams.get("q") || "";

  const updateParam = (key: string, value: string, defaultValue = "") => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const setCat = (c: string) => updateParam("category", c, DEFAULT_CAT);
  const setQ = (v: string) => updateParam("q", v);
  const resetFilters = () => setSearchParams({}, { replace: true });
  const hasActiveFilters = cat !== DEFAULT_CAT || q.trim() !== "";

  const allPosts = useMemo(() => {
    const drafts = listDrafts()
      .filter((d) => d.status === "published" && d.title && d.slug && d.content)
      .map((d) => ({
        id: d.id,
        title: d.title!,
        slug: d.slug!,
        excerpt: d.excerpt || "",
        content: d.content!,
        category: d.category || "Platform Updates",
        author: d.author || "ADHAR Team",
        date: d.date || new Date(d.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        readTime: d.readTime || "5 min read",
        image: d.image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
        featured: d.featured || false,
      }));
    return [...drafts, ...blogPosts];
  }, []);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return allPosts.filter((p) => {
      const matchQ = !needle || p.title.toLowerCase().includes(needle) || p.excerpt.toLowerCase().includes(needle);
      const matchC = cat === "All Stories" || p.category === cat;
      return matchQ && matchC;
    });
  }, [allPosts, q, cat]);

  const featured = filtered.find((p) => p.featured) || filtered[0];
  const bulletin = filtered.filter((p) => p.id !== featured?.id).slice(0, 3);
  const grid = filtered.filter((p) => p.id !== featured?.id);

  // Initials for author monograms
  const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[hsl(var(--blog-bg))] text-[hsl(var(--blog-muted))] selection:bg-[hsl(var(--blog-accent)/0.3)]">
      <Navigation />

      <main className="pt-20">
        {/* Adhar branded social banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
          <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--blog-border)/0.6)] shadow-lg shadow-primary/10">
            <img
              src={blogBanner}
              alt="Adhar Platform Updates — Engineering Notes & Cloud-Native Insights"
              className="w-full h-auto object-cover aspect-[21/9]"
              width={1920}
              height={822}
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Masthead */}
          <header className="pt-8 sm:pt-12 pb-8 sm:pb-12 border-b border-[hsl(var(--blog-border)/0.5)]">
            <div className="flex justify-between items-baseline gap-8 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-6">
                  <span className="h-px w-8 bg-[hsl(var(--blog-accent)/0.6)]" />
                  <span className="font-mono-display text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--blog-accent-soft))]">
                    The Adhar Journal
                  </span>
                </div>
                <h1 className="font-semibold text-[hsl(var(--blog-heading))] leading-[1.05] tracking-tight text-4xl sm:text-6xl md:text-7xl break-words">
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Adhar</span> Platform Updates
                </h1>
                <p className="mt-6 sm:mt-8 max-w-xl text-base sm:text-lg text-[hsl(var(--blog-muted))] font-light leading-relaxed">
                  Field notes on internal developer platforms, cloud-native architecture, and the craft of platform engineering.
                </p>
                <div className="mt-8 max-w-xl">
                  <BlogSearch posts={allPosts} />
                </div>
              </div>
              <Link
                to="/blog/admin"
                className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 border border-[hsl(var(--blog-border))] text-[10px] font-mono-display uppercase tracking-widest hover:bg-[hsl(var(--blog-accent)/0.08)] hover:border-[hsl(var(--blog-accent))] hover:text-[hsl(var(--blog-heading))] transition-all"
              >
                <PenSquare className="w-3.5 h-3.5" />
                Write a story
              </Link>
            </div>
          </header>

          {/* Featured Hero + Bulletin */}
          {featured && (
            <section className="grid grid-cols-12 gap-8 lg:gap-16 py-10 sm:py-16 lg:py-20">
              <Link
                to={`/blog/${featured.slug}`}
                className="col-span-12 lg:col-span-8 group cursor-pointer block"
              >
                <div className="mb-10 overflow-hidden rounded-sm border border-[hsl(var(--blog-border)/0.6)] bg-[hsl(var(--blog-surface))]">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="w-full aspect-[16/9] object-cover dark:grayscale dark:group-hover:grayscale-0 transition-all duration-700 group-hover:scale-[1.01]"
                  />
                </div>
                <div className="flex items-center gap-4 mb-6 flex-wrap">
                  <span className="px-2 py-0.5 bg-[hsl(var(--blog-accent)/0.1)] text-[hsl(var(--blog-accent-soft))] text-[10px] font-mono-display uppercase tracking-[0.2em] border border-[hsl(var(--blog-accent)/0.25)]">
                    {featured.category}
                  </span>
                  <span className="text-[10px] font-mono-display text-[hsl(var(--blog-subtle))] uppercase tracking-widest tabular">
                    {featured.readTime}
                  </span>
                  <span className="text-[10px] font-mono-display text-[hsl(var(--blog-subtle))] uppercase tracking-widest tabular">
                    {featured.date}
                  </span>
                </div>
                <h2 className="font-semibold text-[hsl(var(--blog-heading))] text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 sm:mb-6 group-hover:text-[hsl(var(--blog-accent-soft))] transition-colors leading-[1.1] max-w-3xl">
                  {featured.title}
                </h2>
                <p className="text-[hsl(var(--blog-muted))] text-base sm:text-lg leading-relaxed max-w-2xl">
                  <span className="float-left text-6xl leading-[0.7] mr-3 mt-2 font-semibold text-[hsl(var(--blog-accent-soft))]">
                    {featured.excerpt.charAt(0)}
                  </span>
                  {featured.excerpt.slice(1)}
                </p>
                <div className="mt-8 flex items-center gap-2 text-[hsl(var(--blog-accent-soft))] font-mono-display text-[11px] uppercase tracking-widest border-b border-[hsl(var(--blog-accent)/0.3)] w-fit pb-1 group-hover:border-[hsl(var(--blog-accent))] transition-all">
                  Read Full Story
                  <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <aside className="col-span-12 lg:col-span-4 lg:border-l border-[hsl(var(--blog-border)/0.5)] lg:pl-12">
                <h3 className="font-mono-display text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--blog-subtle))] mb-8 border-b border-[hsl(var(--blog-border)/0.5)] pb-4 flex justify-between items-center">
                  The Bulletin
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--blog-accent))] animate-pulse" />
                </h3>
                <div className="space-y-12">
                  {bulletin.map((p) => (
                    <Link key={p.id} to={`/blog/${p.slug}`} className="block group cursor-pointer">
                      <span className="text-[9px] font-mono-display text-[hsl(var(--blog-accent-soft)/0.85)] uppercase tracking-[0.3em] block mb-2">
                        {p.category}
                      </span>
                      <h4 className="font-semibold text-2xl text-[hsl(var(--blog-heading))] group-hover:text-[hsl(var(--blog-accent-soft))] transition-colors leading-tight mb-3">
                        {p.title}
                      </h4>
                      <div className="flex items-center gap-3 text-[10px] font-mono-display text-[hsl(var(--blog-subtle))] uppercase tabular">
                        <span>{p.author.split(" ").slice(0, 2).map((w, i) => i === 0 ? `${w[0]}.` : w).join(" ")}</span>
                        <span className="text-[hsl(var(--blog-border))]">/</span>
                        <span>{p.readTime.replace(" read", "")}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </aside>
            </section>
          )}

          {/* Filter Nav */}
          <nav className="mt-10 lg:mt-20 border-t border-b border-[hsl(var(--blog-border)/0.5)] py-5 sm:py-7 flex flex-wrap items-center justify-between gap-4 sm:gap-8">
            <ul className="flex flex-wrap gap-x-5 sm:gap-x-10 gap-y-3 text-[10px] font-mono-display uppercase tracking-[0.25em]">
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <button
                    onClick={() => setCat(c)}
                    className={`pb-1 transition-colors ${
                      cat === c
                        ? "text-[hsl(var(--blog-heading))] border-b border-[hsl(var(--blog-accent))]"
                        : "text-[hsl(var(--blog-subtle))] hover:text-[hsl(var(--blog-accent-soft))]"
                    }`}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-4">
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-[10px] font-mono-display uppercase tracking-[0.2em] text-[hsl(var(--blog-subtle))] hover:text-[hsl(var(--blog-accent-soft))] transition-colors"
                  aria-label="Reset filters"
                >
                  <X className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </nav>


          {/* Article Grid */}
          {grid.length > 0 ? (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-12 sm:gap-y-20 lg:gap-y-24 mt-12 sm:mt-20 lg:mt-24">
              {grid.map((p) => (
                <Link key={p.id} to={`/blog/${p.slug}`} className="group editorial-card">
                  <article>
                    <div className="mb-8 aspect-[4/3] border border-[hsl(var(--blog-border)/0.6)] overflow-hidden bg-[hsl(var(--blog-surface))]">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="editorial-thumb w-full h-full object-cover dark:grayscale dark:group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                    <span className="text-[9px] font-mono-display text-[hsl(var(--blog-accent-soft))] uppercase tracking-[0.3em] mb-4 block">
                      {p.category}
                    </span>
                    <h3 className="font-semibold text-2xl md:text-[1.7rem] text-[hsl(var(--blog-heading))] mb-4 leading-tight group-hover:text-[hsl(var(--blog-accent-soft))] transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-[hsl(var(--blog-muted))] text-sm leading-relaxed line-clamp-2 mb-6 font-light italic opacity-80 group-hover:opacity-100 transition-opacity">
                      {p.excerpt}
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-[hsl(var(--blog-border)/0.5)]">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(var(--blog-accent))] to-[hsl(var(--blog-border))] grid place-items-center text-[8px] font-mono-display text-white font-semibold tracking-wider">
                        {initials(p.author)}
                      </div>
                      <span className="text-[9px] font-mono-display text-[hsl(var(--blog-subtle))] uppercase tracking-tighter tabular">
                        {p.author}
                        <span className="text-[hsl(var(--blog-border))] mx-2">/</span>
                        {p.readTime}
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </section>
          ) : (
            <div className="py-32 text-center border-y border-[hsl(var(--blog-border)/0.5)] mt-20">
              <p className="font-semibold text-2xl text-[hsl(var(--blog-subtle))]">
                No stories match your filter.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-6 inline-flex items-center gap-1.5 text-[10px] font-mono-display uppercase tracking-[0.25em] text-[hsl(var(--blog-accent-soft))] border-b border-[hsl(var(--blog-accent)/0.3)] pb-1 hover:border-[hsl(var(--blog-accent))] hover:text-[hsl(var(--blog-heading))] transition-all"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </div>

          )}

          {/* Newsletter */}
          <section className="mt-16 sm:mt-32 lg:mt-48 mb-12 sm:mb-24 border border-[hsl(var(--blog-border)/0.5)] p-6 sm:p-12 md:p-20 bg-[hsl(var(--blog-surface))] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[hsl(var(--blog-accent)/0.1)] blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-[hsl(var(--blog-accent-soft)/0.06)] blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="max-w-2xl mx-auto text-center space-y-8 relative z-10">
              <div className="flex items-center justify-center gap-3">
                <span className="h-px w-8 bg-[hsl(var(--blog-accent)/0.6)]" />
                <span className="font-mono-display text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--blog-accent-soft))]">
                  Dispatch No. 24
                </span>
                <span className="h-px w-8 bg-[hsl(var(--blog-accent)/0.6)]" />
              </div>
              <h2 className="font-semibold text-3xl sm:text-5xl md:text-6xl text-[hsl(var(--blog-heading))] tracking-tight leading-[1.1]">
                Stay at the frontier.
              </h2>
              <p className="text-[hsl(var(--blog-muted))] font-light leading-relaxed text-lg max-w-lg mx-auto">
                Monthly deep-dives on cloud-native architecture, security patches, and platform-engineering trends. Direct to your inbox.
              </p>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2"
              >
                <input
                  type="email"
                  required
                  placeholder="email@organization.com"
                  className="flex-1 bg-[hsl(var(--blog-bg)/0.6)] border border-[hsl(var(--blog-border))] px-5 py-4 text-sm focus:outline-none focus:border-[hsl(var(--blog-accent))] transition-colors text-[hsl(var(--blog-heading))] placeholder:text-[hsl(var(--blog-subtle)/0.7)]"
                />
                <button
                  type="submit"
                  className="bg-[hsl(var(--blog-accent))] hover:bg-[hsl(var(--blog-accent-soft))] text-white px-8 py-4 text-[11px] font-mono-display uppercase tracking-[0.2em] transition-all active:scale-[0.98]"
                >
                  Subscribe
                </button>
              </form>
              <p className="text-[9px] font-mono-display text-[hsl(var(--blog-subtle))] uppercase tracking-widest tabular pt-2">
                12,400+ engineers · No spam · Unsubscribe anytime
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
