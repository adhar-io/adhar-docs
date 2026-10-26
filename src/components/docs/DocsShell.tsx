import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
  Search, ChevronRight, BookOpen, Rocket, Package, Coffee, Layers,
  GraduationCap, Code2, Shield, Settings, Sparkles, ArrowRight, Hash, Compass,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import type { Registry, DocEntry } from "@/lib/docsRegistry";
import DocsVersionSelector from "./DocsVersionSelector";
import DocsSearch, { useSearchHotkey } from "./DocsSearch";
import type { VersionSource } from "@/lib/docsVersions";
import { headingText } from "@/lib/docsSearch";
import GithubSlugger from "github-slugger";

interface DocsShellProps {
  registry: Registry;
  brand: {
    title: string;
    subtitle: string;
    homeHref: string;
  };
  /** Where releases come from, for the version selector */
  versionSource?: VersionSource;
  /** Short portal name used in the search placeholder */
  searchLabel?: string;
}

const SECTION_ICON: Record<string, typeof BookOpen> = {
  "Get Started": Rocket,
  "Getting Started": Rocket,
  "Frameworks": Coffee,
  "Modules": Layers,
  "Guides": GraduationCap,
  "API Reference": Code2,
  "Core Concepts": Sparkles,
  "Platform Engineering": Compass,
  "Security": Shield,
  "Operations": Settings,
};

function findEntry(registry: Registry, pathname: string): DocEntry | null {
  if (registry.byPath.has(pathname)) return registry.byPath.get(pathname)!;
  const trimmed = pathname.replace(/\/+$/, "");
  if (registry.byPath.has(trimmed)) return registry.byPath.get(trimmed)!;
  if (pathname === registry.base || pathname === registry.base + "/") {
    return registry.defaultEntry;
  }
  return null;
}

function extractToc(body: string) {
  // Ids come from github-slugger — the slugger rehype-slug uses to render the
  // heading ids — advanced for every heading level, so duplicates (-1, -2) and
  // punctuation ("Step 1 — Configure" → "step-1--configure") match exactly.
  const out: { id: string; text: string; level: number }[] = [];
  const slugger = new GithubSlugger();
  const lines = body.split("\n");
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = headingText(m[2]);
    const id = slugger.slug(text);
    if (m[1].length === 2 || m[1].length === 3) out.push({ id, text, level: m[1].length });
  }
  return out;
}

function readTime(body: string): string {
  const words = body.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 220));
  return `${mins} min read`;
}

const DocsShell = ({ registry, brand, versionSource, searchLabel }: DocsShellProps) => {
  const { pathname, hash } = useLocation();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  // Phones: the page list is collapsed so the article is not pushed
  // ~2,000px down by 40 links. Desktop always shows it.
  const [navOpen, setNavOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  useSearchHotkey(openSearch);
  // Before anything is typed: the first page of each section.
  const suggestions = useMemo(
    () => registry.sections.map((s) => s.items[0]).filter(Boolean).slice(0, 8),
    [registry.sections],
  );

  const entry = useMemo(() => findEntry(registry, pathname), [registry, pathname]);
  const toc = useMemo(() => entry ? extractToc(entry.body) : [], [entry]);
  // TOC scroll tracking: the active section is the last heading that has
  // scrolled above the reading line, so the highlight follows every scroll —
  // including jumps — rather than only when a heading crosses a narrow band.
  const [activeId, setActiveId] = useState<string>("");
  useEffect(() => {
    if (!toc.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = 120;
      let current = toc[0].id;
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
  const tocRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = tocRef.current;
    const item = box?.querySelector<HTMLElement>(`[data-toc="${CSS.escape(activeId)}"]`);
    if (!box || !item) return;
    const top = item.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    if (top < box.scrollTop + 24 || top > box.scrollTop + box.clientHeight - 48) {
      box.scrollTo({ top: top - box.clientHeight / 3, behavior: "smooth" });
    }
  }, [activeId]);

  // Keep the current page's link visible in the sidebar. The router carries
  // the sidebar's scroll offset across navigations, so this only moves it
  // when the link is out of view — e.g. a deep link or a search result.
  // The router re-applies that offset after each render, so check again then.
  const router = useRouter();
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const reveal = () => {
      const box = sidebarRef.current;
      const link = box?.querySelector<HTMLElement>('#docs-page-list a[data-status="active"]');
      if (!box || !link || box.scrollHeight <= box.clientHeight) return;
      const top = link.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 40) {
        box.scrollTo({ top: top - box.clientHeight / 3, behavior: "instant" });
      }
    };
    reveal();
    return router.subscribe("onRendered", reveal);
  }, [router]);

  // The router resets the page to the top (or restores it on back/forward).
  // A #section link from search or a shared URL is sought here once per page:
  // on first load the content mounts after the intro splash, so the router's
  // own hash scroll finds nothing. Same-page #anchors scroll natively.
  const seekedPath = useRef<string | null>(null);
  useEffect(() => {
    if (seekedPath.current === pathname) return;
    seekedPath.current = pathname;
    if (!hash) return;
    let tries = 0;
    let raf = 0;
    const seek = () => {
      const el = document.getElementById(decodeURIComponent(hash.replace(/^#/, "")));
      if (el) el.scrollIntoView({ block: "start", behavior: "instant" });
      else if (tries++ < 30) raf = requestAnimationFrame(seek);
    };
    raf = requestAnimationFrame(seek);
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);

  // Collapse the mobile page list whenever the page changes.
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    setNavOpen(false);
  }

  const filteredSections = useMemo(() => {
    if (!q.trim()) return registry.sections;
    const needle = q.toLowerCase();
    return registry.sections
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (i) =>
            i.meta.title.toLowerCase().includes(needle) ||
            i.path.toLowerCase().includes(needle) ||
            i.body.toLowerCase().includes(needle),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [registry.sections, q]);

  const crumbs = pathname.split("/").filter(Boolean).map((p, i, arr) => ({
    label: decodeURIComponent(p).replace(/-/g, " "),
    to: "/" + arr.slice(0, i + 1).join("/"),
  }));

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-primary/[0.07] via-accent/[0.04] to-transparent" />
      <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-primary/10 blur-[120px] rounded-full" />

      <Navigation />

      <main className="relative pt-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 flex-wrap">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            {crumbs.map((c, i) => (
              <span key={c.to} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3" />
                {i === crumbs.length - 1 ? (
                  <span className="capitalize text-foreground">{c.label}</span>
                ) : (
                  <Link to={c.to} className="capitalize hover:text-primary transition-colors">{c.label}</Link>
                )}
              </span>
            ))}
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_200px] gap-10">
            {/* ── Sidebar ── */}
            <aside ref={sidebarRef} className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-2 scrollbar-hide">
              <Link to={brand.homeHref} className="flex items-center gap-3 mb-6 group">
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
                  <Package className="w-5 h-5 text-white" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-0 group-hover:opacity-40 blur-md transition-opacity" />
                </div>
                <div>
                  <div className="font-bold leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {brand.title}
                  </div>
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    {brand.subtitle}
                  </div>
                </div>
              </Link>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    // Typing filters the page list; Enter searches inside every page.
                    if (e.key === "Enter") { e.preventDefault(); openSearch(); }
                    if (e.key === "Escape") setQ("");
                  }}
                  placeholder="Filter pages · Enter to search"
                  aria-label="Filter pages; press Enter to search all documentation"
                  className="pl-9 pr-12 h-9 text-sm bg-muted/30 border-border/60 focus-visible:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={openSearch}
                  title="Search all docs (⌘K, Ctrl+K or /)"
                  aria-label="Open documentation search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground border border-border/60 rounded px-1.5 py-0.5 hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <span className="hidden sm:inline">⌘K</span>
                  <span className="sm:hidden">Search</span>
                </button>
              </div>

              {versionSource && (
                <div className="mb-6">
                  <DocsVersionSelector source={versionSource} />
                </div>
              )}

              <button
                type="button"
                onClick={() => setNavOpen((v) => !v)}
                aria-expanded={navOpen || !!q}
                aria-controls="docs-page-list"
                className="lg:hidden mb-4 flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-left text-sm"
              >
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                    {navOpen ? "Hide pages" : "Browse pages"}
                  </span>
                  <span className="block truncate font-medium text-foreground">
                    {entry ? `${entry.meta.section} › ${entry.meta.title}` : brand.title}
                  </span>
                </span>
                <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${navOpen ? "rotate-90" : ""}`} />
              </button>

              <nav
                id="docs-page-list"
                aria-label={`${brand.title} pages`}
                className={`space-y-7 text-sm pb-12 ${navOpen || q ? "block" : "hidden"} lg:block`}
              >
                {filteredSections.map((sec) => {
                  const Icon = SECTION_ICON[sec.title] ?? BookOpen;
                  return (
                    <div key={sec.title}>
                      <div className="flex items-center gap-2 px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Icon className="w-3.5 h-3.5 text-primary/70" />
                        {sec.title}
                        <span className="ml-auto text-[10px] text-muted-foreground/60">
                          {sec.items.length}
                        </span>
                      </div>
                      <ul className="space-y-0.5">
                        {sec.items.map((item) => (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              activeOptions={{ exact: item.path === registry.base }}
                              className="flex items-center justify-between gap-2 pl-3 pr-2 py-1.5 rounded-md transition-all group border-l-2"
                              activeProps={{
                                className:
                                  "bg-gradient-to-r from-primary/10 to-accent/5 text-foreground font-medium border-primary",
                              }}
                              inactiveProps={{
                                className:
                                  "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent hover:border-primary/30",
                              }}
                            >
                              <span className="truncate text-[13px]">{item.meta.title}</span>
                              {item.meta.badge && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1.5 text-[9px] font-mono bg-primary/10 text-primary border-0"
                                >
                                  {item.meta.badge}
                                </Badge>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {filteredSections.length === 0 && (
                  <div className="px-2 text-xs text-muted-foreground space-y-2">
                    <p>No page titles match "{q}".</p>
                    <button type="button" onClick={openSearch} className="text-primary hover:underline">
                      Search inside every page for "{q}" →
                    </button>
                  </div>
                )}
              </nav>
            </aside>

            {/* ── Content ── */}
            <div className="min-w-0">
              {entry ? (
                <article className="max-w-3xl">
                  {/* Page meta header */}
                  <div className="flex items-center gap-3 mb-4 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {(() => {
                        const Icon = SECTION_ICON[entry.meta.section] ?? BookOpen;
                        return <Icon className="w-3 h-3" />;
                      })()}
                      {entry.meta.section}
                    </span>
                    <span className="text-muted-foreground/60">·</span>
                    <span>{readTime(entry.body)}</span>
                    {entry.meta.badge && (
                      <>
                        <span className="text-muted-foreground/60">·</span>
                        <span className="font-mono normal-case">{entry.meta.badge}</span>
                      </>
                    )}
                  </div>

                  <MarkdownRenderer content={entry.body} />
                  <DocFooter registry={registry} entry={entry} />
                </article>
              ) : (
                <div className="py-20 text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-6 flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Page not found</h1>
                  <p className="text-muted-foreground mb-6 text-sm">
                    No markdown file matches <code className="font-mono text-foreground">{pathname}</code>.
                  </p>
                  <Link
                    to={registry.base}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm font-medium"
                  >
                    Back to {brand.title} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* ── Right TOC ── */}
            <aside className="hidden lg:block">
              {toc.length > 0 && (
                <div ref={tocRef} className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 scrollbar-hide">
                  <div className="flex items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Hash className="w-3 h-3 text-primary/70" />
                    On this page
                  </div>
                  <ul className="space-y-1.5 text-xs border-l border-border/50">
                    {toc.map((h) => (
                      <li key={h.id} style={{ paddingLeft: h.level === 3 ? 16 : 0 }}>
                        <a
                          href={`#${h.id}`}
                          data-toc={h.id}
                          className={`block py-0.5 pl-3 -ml-px border-l-2 transition-colors ${
                            activeId === h.id
                              ? "border-primary text-foreground font-medium"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/40"
                          }`}
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <DocsSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        entries={registry.entries}
        initialQuery={q}
        suggestions={suggestions}
        label={searchLabel ?? brand.title}
      />
      <Footer />
    </div>
  );
};

const DocFooter = ({ registry, entry }: { registry: Registry; entry: DocEntry }) => {
  const flat = registry.sections.flatMap((s) => s.items);
  const idx = flat.findIndex((e) => e.path === entry.path);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
  if (!prev && !next) return null;
  return (
    <div className="mt-16 pt-8 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      {prev ? (
        <Link
          to={prev.path}
          className="group block p-5 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/[0.03] transition-all"
        >
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3 rotate-180" /> Previous
          </div>
          <div className="font-medium group-hover:text-primary transition-colors">{prev.meta.title}</div>
        </Link>
      ) : <span />}
      {next ? (
        <Link
          to={next.path}
          className="group block p-5 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/[0.03] transition-all text-right"
        >
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-end gap-1.5">
            Next <ArrowRight className="w-3 h-3" />
          </div>
          <div className="font-medium group-hover:text-primary transition-colors">{next.meta.title}</div>
        </Link>
      ) : <span />}
    </div>
  );
};

export default DocsShell;
