import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import BlogMarkdown from "@/components/blog/BlogMarkdown";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Hand,
  Hash,
  Link as LinkIcon,
  Mail,
  Share2,
} from "lucide-react";
import { Linkedin, Twitter } from "@/components/brand-icons";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiPost } from "@/lib/api";
import { blogPosts, type BlogPost as Post } from "@/data/blogData";

function formatPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function toPost(p: ApiPost): Post {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    category: p.category,
    author: p.author,
    authorRole: (p as { authorRole?: string }).authorRole,
    authorBio: (p as { authorBio?: string }).authorBio,
    date: formatPostDate(p.date),
    readTime: p.readTime,
    image: p.image,
    featured: p.featured,
  };
}
import {
  addClap,
  buildShareUrl,
  copyToClipboard,
  getClapCount,
  getUserClaps,
  initials,
  isBookmarked,
  nativeShare,
  parsePostDate,
  prevNextInList,
  readingTimeMinutes,
  shareLinks,
  tagsForPost,
  toggleBookmark,
  wordCount,
} from "@/lib/blogExtras";
import { useToast } from "@/hooks/use-toast";

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
  const { slug } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Single post + the full published list come from the Postgres-backed API,
  // with static blogData as a fallback for first paint / API outage.
  const { data: postData } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => api.posts.get(slug as string),
    enabled: !!slug,
    retry: false,
  });
  const { data: listData } = useQuery({
    queryKey: ["posts", "published"],
    queryFn: () => api.posts.list(),
  });

  const post = useMemo<Post | null>(() => {
    if (postData?.post) return toPost(postData.post);
    if (!slug) return null;
    return blogPosts.find((p) => p.slug === slug) || null;
  }, [postData, slug]);

  const allPosts = useMemo<Post[]>(() => {
    const source = listData?.posts?.length ? listData.posts.map(toPost) : blogPosts;
    return [...source].sort(
      (a, b) => parsePostDate(a.date).getTime() - parsePostDate(b.date).getTime(),
    );
  }, [listData]);

  const toc = useMemo(() => (post ? extractToc(post.content) : []), [post]);
  const tags = useMemo(() => (post ? tagsForPost(post) : []), [post]);
  const meta = useMemo(() => {
    if (!post) return null;
    return {
      words: wordCount(post.content),
      minutes: readingTimeMinutes(post.content),
    };
  }, [post]);

  const { prev, next } = useMemo(
    () => (post ? prevNextInList(allPosts, post.id) : { prev: undefined, next: undefined }),
    [post, allPosts],
  );

  // TOC scroll tracking
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

  // Claps
  const [clapState, setClapState] = useState({ total: 0, user: 0 });
  const [clapBurst, setClapBurst] = useState(0);
  useEffect(() => {
    if (!post) return;
    setClapState({ total: getClapCount(post.slug), user: getUserClaps(post.slug) });
  }, [post]);

  const onClap = () => {
    if (!post) return;
    const r = addClap(post.slug);
    setClapState({ total: r.total, user: r.user });
    setClapBurst((n) => n + 1);
    if (r.capped) {
      toast({ title: "Thanks for the love", description: "You've reached the clap limit on this story." });
    }
  };

  // Bookmark
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!post) return;
    setSaved(isBookmarked(post.slug));
  }, [post]);

  const onBookmark = () => {
    if (!post) return;
    const nextState = toggleBookmark(post.slug);
    setSaved(nextState);
    toast({
      title: nextState ? "Saved to reading list" : "Removed from reading list",
      description: nextState ? "Find it on the blog home." : undefined,
    });
  };

  // Share
  const onCopyLink = async () => {
    if (!post) return;
    const ok = await copyToClipboard(buildShareUrl(post.slug));
    toast({
      title: ok ? "Link copied" : "Copy failed",
      description: ok ? buildShareUrl(post.slug) : "Try again or copy from the address bar.",
      variant: ok ? "default" : "destructive",
    });
  };

  const onShare = async () => {
    if (!post) return;
    const res = await nativeShare(post);
    if (res === "shared") {
      toast({ title: "Shared", description: "Thanks for spreading the word." });
    } else if (res === "unsupported") {
      onCopyLink();
    }
  };

  // 404
  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-40 px-6 text-center max-w-md mx-auto">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-4">
            Story not found
          </h1>
          <p className="text-muted-foreground mb-8">
            The article you're looking for doesn't exist or was moved.
          </p>
          <button
            onClick={() => navigate({ to: "/blog" })}
            className="btn-primary-modern inline-flex items-center justify-center gap-2 rounded-full px-5 h-10 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to blog
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const related = allPosts
    .filter((p) => p.id !== post.id && p.category === post.category)
    .slice(0, 3);

  const links = shareLinks(post);

  return (
    <div className="min-h-screen bg-background">
      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-transparent z-50">
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <Navigation />

      {/* Floating action rail (desktop) */}
      <aside className="hidden xl:flex flex-col items-center gap-2 fixed left-6 top-1/2 -translate-y-1/2 z-40">
        <button
          onClick={onClap}
          aria-label="Clap"
          className="relative w-11 h-11 rounded-full bg-card border border-border/70 hover:border-primary/50 text-muted-foreground hover:text-primary grid place-items-center transition-colors shadow-[var(--shadow-xs)]"
        >
          <Hand className="w-4 h-4" />
          {clapBurst > 0 && (
            <span
              key={clapBurst}
              className="absolute -top-1 -right-1 text-[10px] font-medium text-primary tabular animate-status-blink pointer-events-none"
            >
              +1
            </span>
          )}
        </button>
        <span className="text-[11px] font-medium text-muted-foreground tabular mb-2">
          {clapState.total}
        </span>

        <button
          onClick={onBookmark}
          aria-label={saved ? "Remove bookmark" : "Bookmark"}
          className={`w-11 h-11 rounded-full border grid place-items-center transition-colors shadow-[var(--shadow-xs)] ${
            saved
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/70 bg-card text-muted-foreground hover:border-primary/50 hover:text-primary"
          }`}
        >
          {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>

        <button
          onClick={onShare}
          aria-label="Share"
          className="w-11 h-11 rounded-full bg-card border border-border/70 hover:border-primary/50 text-muted-foreground hover:text-primary grid place-items-center transition-colors shadow-[var(--shadow-xs)]"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </aside>

      <main className="pt-16">
        <article className="pt-8 sm:pt-12 pb-16 sm:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Back link */}
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 sm:mb-12 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to blog
            </Link>

            {/* Article header */}
            <header className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2.5 mb-6 flex-wrap justify-center">
                <Link
                  to={`/blog?category=${encodeURIComponent(post.category)}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium ring-1 ring-inset ring-primary/20 hover:ring-primary/40 transition-colors"
                >
                  {post.category}
                </Link>
                <span className="text-xs text-muted-foreground tabular">{post.date}</span>
                <span className="w-1 h-1 rounded-full bg-border" aria-hidden />
                <span className="text-xs text-muted-foreground tabular">{post.readTime}</span>
                {meta && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border" aria-hidden />
                    <span className="text-xs text-muted-foreground tabular">
                      {meta.words.toLocaleString()} words
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-balance text-foreground font-semibold text-3xl sm:text-4xl md:text-5xl leading-[1.1] tracking-[-0.02em] mb-5 sm:mb-7">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="text-pretty text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
                  {post.excerpt}
                </p>
              )}
              <div className="flex items-center justify-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-muted ring-1 ring-border grid place-items-center text-xs font-semibold text-foreground">
                  {initials(post.author)}
                </div>
                <div className="text-left">
                  <p className="text-foreground font-semibold text-sm tracking-tight">{post.author}</p>
                  <p className="text-muted-foreground text-xs">{post.authorRole || "Contributor"}</p>
                </div>
              </div>
            </header>

            {/* Hero image */}
            {post.image && (
              <div className="w-full aspect-[16/10] sm:aspect-[21/9] bg-muted rounded-2xl ring-1 ring-border mb-12 sm:mb-16 overflow-hidden max-w-5xl mx-auto">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Body grid */}
            <div className="grid grid-cols-12 gap-8 lg:gap-14 max-w-6xl mx-auto">
              {/* TOC */}
              {toc.length > 0 && (
                <aside className="hidden lg:block col-span-3">
                  <div className="sticky top-28">
                    <p className="text-xs font-semibold text-muted-foreground mb-4">
                      On this page
                    </p>
                    <nav className="space-y-1 text-sm">
                      {toc.map((h) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          style={{ paddingLeft: h.level === 3 ? 20 : 10 }}
                          className={`block border-l py-1.5 transition-colors leading-snug ${
                            activeId === h.id
                              ? "text-foreground border-primary font-medium"
                              : "text-muted-foreground hover:text-foreground border-border/60"
                          }`}
                        >
                          {h.text}
                        </a>
                      ))}
                    </nav>

                    {/* Mini meta */}
                    <dl className="mt-8 pt-6 border-t border-border/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Read time</dt>
                        <dd className="text-foreground tabular font-medium">{meta?.minutes ?? 5} min</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Word count</dt>
                        <dd className="text-foreground tabular font-medium">{meta?.words.toLocaleString() ?? "—"}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Claps</dt>
                        <dd className="text-foreground tabular font-medium">{clapState.total}</dd>
                      </div>
                    </dl>
                  </div>
                </aside>
              )}

              {/* Content */}
              <div className={toc.length > 0 ? "col-span-12 lg:col-span-9" : "col-span-12 lg:col-span-10 lg:col-start-2"}>
                <BlogMarkdown content={post.content} />

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="mt-12 pt-6 border-t border-border/60 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <Link
                        key={t}
                        to={`/blog?tag=${encodeURIComponent(t)}`}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-muted text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-colors"
                      >
                        <Hash className="w-3 h-3" />
                        {t}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Article action bar */}
                <div className="mt-10 p-5 rounded-2xl border border-border/70 bg-card">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Claps */}
                    <button
                      onClick={onClap}
                      className="group inline-flex items-center gap-2.5"
                      aria-label="Clap"
                    >
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border/70 group-hover:border-primary/50 text-muted-foreground group-hover:text-primary transition-colors">
                        <Hand className="w-4 h-4" />
                      </span>
                      <div className="text-left">
                        <div className="text-xs text-muted-foreground">Claps</div>
                        <div className="text-sm font-semibold text-foreground tabular">{clapState.total}</div>
                      </div>
                    </button>

                    {/* Bookmark */}
                    <button
                      onClick={onBookmark}
                      className={`inline-flex items-center gap-2 px-3.5 h-10 rounded-full border text-xs font-medium transition-colors ${
                        saved
                          ? "border-primary/50 text-primary bg-primary/10"
                          : "border-border/70 text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                    >
                      {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      {saved ? "Saved" : "Save"}
                    </button>

                    {/* Share */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={links.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Share on Twitter"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border/70 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                      >
                        <Twitter className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={links.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Share on LinkedIn"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border/70 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={links.mailto}
                        aria-label="Share via email"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border/70 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={onCopyLink}
                        aria-label="Copy link"
                        className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-full border border-border/70 text-muted-foreground hover:text-foreground hover:border-border transition-colors text-xs font-medium"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Copy link
                      </button>
                    </div>
                  </div>
                </div>

                {/* Author bio */}
                <div className="mt-8 p-6 rounded-2xl border border-border/70 bg-card">
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="w-12 h-12 rounded-full bg-muted ring-1 ring-border grid place-items-center text-sm font-semibold text-foreground shrink-0">
                      {initials(post.author)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Written by</p>
                      <h3 className="font-semibold text-lg sm:text-xl tracking-tight text-foreground mt-0.5">
                        {post.author}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                        {post.authorBio || "Writes about cloud-native platforms, developer experience, and the craft of platform engineering."}
                      </p>
                      <Link
                        to={`/blog?q=${encodeURIComponent(post.author)}`}
                        className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        More from {post.author.split(" ")[0]}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Prev / Next */}
                {(prev || next) && (
                  <nav className="mt-8 grid sm:grid-cols-2 gap-3">
                    {prev ? (
                      <Link
                        to={`/blog/${prev.slug}`}
                        className="group block p-5 rounded-2xl border border-border/70 bg-card hover:border-border hover:shadow-[var(--shadow-xs)] transition-all"
                      >
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Previous
                        </div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug tracking-tight line-clamp-2">
                          {prev.title}
                        </p>
                      </Link>
                    ) : <span />}
                    {next ? (
                      <Link
                        to={`/blog/${next.slug}`}
                        className="group block p-5 rounded-2xl border border-border/70 bg-card hover:border-border hover:shadow-[var(--shadow-xs)] transition-all sm:text-right"
                      >
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 sm:justify-end">
                          Next
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug tracking-tight line-clamp-2">
                          {next.title}
                        </p>
                      </Link>
                    ) : <span />}
                  </nav>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Related */}
        {related.length > 0 && (
          <section className="border-t border-border/70 py-14 sm:py-20 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-10 sm:mb-12 flex-wrap gap-4">
                <div>
                  <span className="eyebrow mb-3">Continue reading</span>
                  <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    More from {post.category}
                  </h2>
                </div>
                <Link
                  to="/blog"
                  className="hidden md:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  All stories <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    to={`/blog/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:border-border hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
                  >
                    <div className="aspect-[16/10] bg-muted overflow-hidden">
                      <img
                        src={p.image}
                        loading="lazy"
                        decoding="async"
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex-1 flex flex-col p-5">
                      <p className="text-primary text-xs font-medium mb-2">
                        {p.category}
                      </p>
                      <h3 className="font-semibold text-base sm:text-lg text-foreground leading-snug tracking-tight text-balance group-hover:text-primary transition-colors line-clamp-2">
                        {p.title}
                      </h3>
                    </div>
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
