import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import BlogMarkdown from "@/components/blog/BlogMarkdown";
import { ArrowLeft, ArrowRight, Share2 } from "lucide-react";
import { blogPosts } from "@/data/blogData";
import { getDraftBySlug, listDrafts } from "@/lib/blogDrafts";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

function extractToc(body: string): TocItem[] {
  const out: TocItem[] = [];
  const lines = body.split("\n");
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^(##|###)\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[`*]/g, "");
    out.push({ id: slugify(text), text, level: m[1].length });
  }
  return out;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const post = useMemo(() => {
    if (!slug) return null;
    const draft = getDraftBySlug(slug);
    if (draft && draft.status === "published") {
      return {
        id: draft.id,
        title: draft.title || "Untitled",
        slug: draft.slug!,
        excerpt: draft.excerpt || "",
        content: draft.content || "",
        category: draft.category || "Platform Updates",
        author: draft.author || "ADHAR Team",
        date: draft.date || new Date(draft.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        readTime: draft.readTime || "5 min read",
        image: draft.image || "",
        featured: draft.featured || false,
      };
    }
    return blogPosts.find((p) => p.slug === slug) || null;
  }, [slug]);

  const toc = useMemo(() => (post ? extractToc(post.content) : []), [post]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (!toc.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px", threshold: [0, 1] },
    );
    toc.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [toc]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [slug]);

  // Reading progress
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(1, scrolled / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!post) {
    return (
      <div className="min-h-screen bg-[hsl(var(--blog-bg))] text-[hsl(var(--blog-muted))]">
        <Navigation />
        <div className="pt-40 px-6 text-center max-w-md mx-auto">
          <h1 className="font-semibold text-5xl text-[hsl(var(--blog-heading))] mb-6">Story not found.</h1>
          <p className="text-[hsl(var(--blog-subtle))] mb-10">The article you're looking for doesn't exist or was moved.</p>
          <button
            onClick={() => navigate("/blog")}
            className="px-8 py-3 bg-[hsl(var(--blog-accent))] text-[hsl(var(--blog-heading))] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[hsl(var(--blog-accent-soft))] transition-colors"
          >
            Back to Journal
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const related = [...blogPosts, ...listDrafts().filter((d) => d.status === "published")]
    .filter((p: any) => p.id !== post.id && p.category === post.category && p.slug)
    .slice(0, 3) as typeof blogPosts;

  return (
    <div className="min-h-screen bg-[hsl(var(--blog-bg))] text-[hsl(var(--blog-muted))] selection:bg-[hsl(var(--blog-accent)/0.3)]">
      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-transparent z-50">
        <div
          className="h-full bg-gradient-to-r from-[hsl(var(--blog-accent))] to-[hsl(var(--blog-accent-soft))] transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <Navigation />

      <main className="pt-20">
        <article className="border-t border-[hsl(var(--blog-border)/0.5)] pt-8 sm:pt-16 pb-16 sm:pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Back */}
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-[10px] font-mono-display uppercase tracking-[0.3em] text-[hsl(var(--blog-subtle))] hover:text-[hsl(var(--blog-accent-soft))] mb-8 sm:mb-16 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> The Journal
            </Link>

            {/* Header */}
            <header className="max-w-4xl mx-auto text-center mb-10 sm:mb-16 lg:mb-20">
              <div className="inline-flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10 flex-wrap justify-center">
                <span className="px-2 py-0.5 bg-[hsl(var(--blog-accent)/0.1)] text-[hsl(var(--blog-accent-soft))] text-[10px] font-mono-display uppercase tracking-[0.2em] border border-[hsl(var(--blog-accent)/0.25)]">
                  {post.category}
                </span>
                <span className="text-[hsl(var(--blog-subtle))] text-[10px] font-mono-display uppercase tracking-[0.3em] tabular">
                  {post.date}
                </span>
                <span className="w-1 h-1 rounded-full bg-[hsl(var(--blog-border))]" />
                <span className="text-[hsl(var(--blog-subtle))] text-[10px] font-mono-display uppercase tracking-[0.3em] tabular">
                  {post.readTime}
                </span>
              </div>
              <h1 className="font-semibold text-[hsl(var(--blog-heading))] text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight mb-6 sm:mb-10 break-words">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="text-[hsl(var(--blog-muted))] text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-12 font-light italic">
                  {post.excerpt}
                </p>
              )}
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--blog-accent))] to-[hsl(var(--blog-border))] grid place-items-center text-[10px] font-mono-display text-white font-semibold tracking-wider">
                  {post.author.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-[hsl(var(--blog-heading))] font-semibold text-xs uppercase tracking-widest">{post.author}</p>
                  <p className="text-[hsl(var(--blog-subtle))] text-[10px] font-mono-display uppercase tracking-tighter">Contributor</p>
                </div>
              </div>
            </header>

            {/* Hero image */}
            {post.image && (
              <div className="w-full aspect-[16/10] sm:aspect-[21/9] bg-[hsl(var(--blog-surface))] ring-1 ring-[hsl(var(--blog-border))] mb-12 sm:mb-20 lg:mb-24 overflow-hidden max-w-6xl mx-auto">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover dark:grayscale dark:hover:grayscale-0 transition-all duration-1000"
                />
              </div>
            )}

            {/* Body grid */}
            <div className="grid grid-cols-12 gap-8 lg:gap-16 max-w-6xl mx-auto">
              {/* TOC */}
              {toc.length > 0 && (
                <aside className="hidden lg:block col-span-3">
                  <div className="sticky top-32">
                    <p className="text-[10px] font-mono-display uppercase text-[hsl(var(--blog-accent-soft))] mb-8 tracking-[0.3em]">
                      On This Page
                    </p>
                    <nav className="space-y-4 text-[11px] font-mono-display uppercase tracking-[0.15em]">
                      {toc.map((h) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          style={{ paddingLeft: h.level === 3 ? 24 : 14 }}
                          className={`block border-l transition-all leading-snug ${
                            activeId === h.id
                              ? "text-[hsl(var(--blog-heading))] border-[hsl(var(--blog-accent))]"
                              : "text-[hsl(var(--blog-subtle))] hover:text-[hsl(var(--blog-heading))] border-[hsl(var(--blog-border)/0.4)]"
                          }`}
                        >
                          {h.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                </aside>
              )}

              {/* Content */}
              <div className={toc.length > 0 ? "col-span-12 lg:col-span-9" : "col-span-12 lg:col-span-10 lg:col-start-2"}>
                <BlogMarkdown content={post.content} />

                {/* Footer actions */}
                <div className="mt-20 pt-10 border-t border-[hsl(var(--blog-border)/0.7)] flex items-center justify-between flex-wrap gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--blog-accent))] to-[hsl(var(--blog-border))] grid place-items-center text-xs font-mono-display text-white font-semibold tracking-wider">
                      {post.author.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[hsl(var(--blog-heading))] font-semibold text-sm">{post.author}</p>
                      <p className="text-[hsl(var(--blog-subtle))] text-[10px] font-mono-display uppercase tracking-wider">Writer · ADHAR</p>
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 border border-[hsl(var(--blog-border))] hover:border-[hsl(var(--blog-accent))] text-[10px] font-mono-display uppercase tracking-[0.25em] text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-heading))] transition-colors">
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Related */}
        {related.length > 0 && (
          <section className="border-t border-[hsl(var(--blog-border))] py-14 sm:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-10 sm:mb-16 flex-wrap gap-4">
                <div>
                  <span className="text-[hsl(var(--blog-accent-soft))] text-[10px] font-mono-display uppercase tracking-[0.4em]">
                    Continue Reading
                  </span>
                  <h2 className="font-semibold text-[hsl(var(--blog-heading))] text-3xl sm:text-4xl md:text-5xl mt-3">
                    More from {post.category}
                  </h2>
                </div>
                <Link
                  to="/blog"
                  className="hidden md:inline-flex items-center gap-2 text-[10px] font-mono-display uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] hover:text-[hsl(var(--blog-accent-soft))] transition-colors"
                >
                  All Stories <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                {related.map((p: any) => (
                  <Link key={p.id} to={`/blog/${p.slug}`} className="group editorial-card">
                    <div className="aspect-[4/3] bg-[hsl(var(--blog-surface))] mb-6 ring-1 ring-[hsl(var(--blog-border)/0.6)] overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="editorial-thumb w-full h-full object-cover dark:grayscale dark:group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                    <p className="text-[hsl(var(--blog-accent-soft))] text-[10px] font-mono-display uppercase mb-3 tracking-[0.3em]">
                      {p.category}
                    </p>
                    <h3 className="font-semibold text-2xl text-[hsl(var(--blog-heading))] leading-tight group-hover:text-[hsl(var(--blog-accent-soft))] transition-colors">
                      {p.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
