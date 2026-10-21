import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import BlogMarkdown from "@/components/blog/BlogMarkdown";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Hand,
  Hash,
  Link as LinkIcon,
  Mail,
  Share2,
} from "lucide-react";
import { Linkedin, Twitter } from "@/components/brand-icons";
import { blogPosts, type BlogPost as Post } from "@/data/blogData";

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
import BlogCover from "@/components/blog/BlogCover";

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

  // Posts are static content (src/data/blogData.ts).
  const post = useMemo<Post | null>(() => (slug ? blogPosts.find((p) => p.slug === slug) ?? null : null), [slug]);
  const allPosts = useMemo<Post[]>(
    () => [...blogPosts].sort((a, b) => parsePostDate(a.date).getTime() - parsePostDate(b.date).getTime()),
    [],
  );

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

  // TOC scroll tracking: the active section is the last heading that has
  // scrolled above the reading line, so the highlight follows every scroll —
  // including jumps — rather than only when a heading crosses a narrow band.
  const [activeId, setActiveId] = useState<string>("");
  useEffect(() => {
    if (!toc.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = 140;
      let current = "";
      for (const h of toc) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top <= line) current = h.id;
      }
      // At the very bottom, the last section is the one being read.
      const doc = document.documentElement;
      if (doc.scrollTop + doc.clientHeight >= doc.scrollHeight - 4) current = toc[toc.length - 1].id;
      setActiveId(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [toc]);

  // Keep the active entry visible inside the TOC's own scroll area.
  const tocNavRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = tocNavRef.current;
    const item = nav?.querySelector<HTMLElement>(`[data-toc="${CSS.escape(activeId)}"]`);
    if (!nav || !item) return;
    const top = item.offsetTop - nav.offsetTop;
    if (top < nav.scrollTop + 24 || top > nav.scrollTop + nav.clientHeight - 48) {
      nav.scrollTo({ top: top - nav.clientHeight / 3, behavior: "smooth" });
    }
  }, [activeId]);

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
  const [saved, setSaved] = useState(false);

  // Load this story's claps and bookmark (kept in localStorage) once per story.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (post && loadedFor !== post.slug) {
    setLoadedFor(post.slug);
    setClapState({ total: getClapCount(post.slug), user: getUserClaps(post.slug) });
    setSaved(isBookmarked(post.slug));
  }

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

      <main className="pt-16">
        <article className="pt-8 sm:pt-12 pb-16 sm:pb-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-14 xl:gap-20">
              <div className="min-w-0">
                <div className="max-w-[700px] mx-auto">
                  {/* Back link */}
                  <Link
                    to="/blog"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 sm:mb-10 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to blog
                  </Link>

                  {/* Article header */}
                  <header>
                    <Link
                      to="/blog" search={{ category: post.category }}
                      className="inline-flex items-center px-2.5 py-0.5 mb-5 rounded-full bg-primary/10 text-primary text-xs font-medium ring-1 ring-inset ring-primary/20 hover:ring-primary/40 transition-colors"
                    >
                      {post.category}
                    </Link>
                    <h1 className="[hyphens:manual] text-balance text-foreground font-bold text-[32px] sm:text-[42px] leading-[1.15] tracking-[-0.02em] mb-4">
                      {post.title}
                    </h1>
                    {post.excerpt && (
                      <p className="text-pretty text-muted-foreground text-lg sm:text-[21px] leading-snug mb-8">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-muted ring-1 ring-border grid place-items-center text-sm font-semibold text-foreground shrink-0">
                        {initials(post.author)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-foreground font-medium text-[15px] tracking-tight">
                          {post.author}
                          {post.authorRole && <span className="text-muted-foreground font-normal"> · {post.authorRole}</span>}
                        </p>
                        <p className="text-muted-foreground text-sm tabular">
                          {post.readTime}
                          <span aria-hidden> · </span>
                          {post.date}
                        </p>
                      </div>
                    </div>
                  </header>

                  {/* Action bar */}
                  <div className="mt-8 flex items-center justify-between border-y border-border/70 py-2.5">
                    <button onClick={onClap} aria-label="Clap" className="group relative inline-flex items-center gap-2 h-9 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Hand className="w-[18px] h-[18px]" />
                      <span className="tabular">{clapState.total}</span>
                      {clapBurst > 0 && (
                        <span key={clapBurst} className="absolute -top-2 left-3 text-[10px] font-medium text-primary tabular animate-status-blink pointer-events-none">
                          +1
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={onBookmark}
                        aria-label={saved ? "Remove bookmark" : "Bookmark"}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${saved ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {saved ? <BookmarkCheck className="w-[18px] h-[18px]" /> : <Bookmark className="w-[18px] h-[18px]" />}
                      </button>
                      <button onClick={onShare} aria-label="Share" className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                        <Share2 className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </div>

                  {/* Cover — flat, full column width */}
                  <figure className="mt-10 mb-10 sm:mb-12">
                    <div className="aspect-[16/10] overflow-hidden rounded-md bg-muted">
                      <BlogCover slug={post.slug} category={post.category} title={post.title} size="lg" />
                    </div>
                  </figure>

                <BlogMarkdown content={post.content} />

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="mt-12 pt-6 border-t border-border/60 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <Link
                        key={t}
                        to="/blog" search={{ tag: t }}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-muted text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-colors"
                      >
                        <Hash className="w-3 h-3" />
                        {t}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Article action bar */}
                <div className="mt-10 py-3 border-y border-border/70">
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
                <div className="mt-10 pb-10 border-b border-border/70">
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
                        to="/blog" search={{ q: post.author }}
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
                        to="/blog/$slug" params={{ slug: prev.slug }}
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
                        to="/blog/$slug" params={{ slug: next.slug }}
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

              {/* TOC */}
              {toc.length > 0 && (
                <aside className="hidden lg:block" aria-label="On this page">
                  <div className="sticky top-28 flex max-h-[calc(100vh-8.5rem)] flex-col">
                    {/* Progress */}
                    <div className="mb-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">On this page</p>
                        <p className="text-xs text-muted-foreground tabular">
                          {progress >= 0.99 ? "Finished" : `${Math.max(1, Math.ceil((meta?.minutes ?? 5) * (1 - progress)))} min left`}
                        </p>
                      </div>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
                      </div>
                    </div>

                    {/* Sections */}
                    <nav ref={tocNavRef} className="-mr-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin]">
                      <ol className="relative border-l border-border/70">
                        {(() => {
                          const activeIndex = toc.findIndex((h) => h.id === activeId);
                          let n = 0;
                          return toc.map((h, i) => {
                            const active = h.id === activeId;
                            const read = activeIndex > -1 && i < activeIndex;
                            const sub = h.level === 3;
                            if (!sub) n += 1;
                            return (
                              <li key={h.id}>
                                <a
                                  href={`#${h.id}`}
                                  data-toc={h.id}
                                  aria-current={active ? "location" : undefined}
                                  className={`group -ml-px flex gap-2.5 border-l-2 py-1.5 leading-snug transition-colors ${
                                    sub ? "pl-7 text-[13px]" : "pl-3.5 text-sm"
                                  } ${
                                    active
                                      ? "border-primary font-medium text-foreground"
                                      : read
                                        ? "border-transparent text-foreground/70 hover:text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {!sub && (
                                    <span
                                      className={`mt-px w-5 shrink-0 text-[11px] font-semibold tabular ${active ? "text-primary" : "text-muted-foreground/70"}`}
                                      aria-hidden
                                    >
                                      {read ? <Check className="h-3.5 w-3.5 text-primary/70" /> : String(n).padStart(2, "0")}
                                    </span>
                                  )}
                                  <span className="min-w-0">{h.text}</span>
                                </a>
                              </li>
                            );
                          });
                        })()}
                      </ol>
                    </nav>

                    {/* Actions */}
                    <div className="mt-5 flex items-center gap-1 border-t border-border/70 pt-4 text-xs">
                      <button
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ArrowUp className="h-3.5 w-3.5" /> Back to top
                      </button>
                      <button
                        onClick={onCopyLink}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <LinkIcon className="h-3.5 w-3.5" /> Copy link
                      </button>
                    </div>
                    <p className="mt-3 px-2.5 text-[11px] text-muted-foreground tabular">
                      {meta?.minutes ?? 5} min read · {meta?.words.toLocaleString() ?? "—"} words
                    </p>
                  </div>
                </aside>
              )}
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
                    to="/blog/$slug" params={{ slug: p.slug }}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:border-border hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
                  >
                    <div className="aspect-[16/10] bg-muted overflow-hidden">
                      <BlogCover
                        slug={p.slug}
                        category={p.category}
                        title={p.title}
                        className="transition-transform duration-500 group-hover:scale-[1.03]"
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
