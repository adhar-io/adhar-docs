import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import {
  ArrowLeft, ArrowRight, FileText, Globe, PenSquare, Plus, Trash2, Edit3,
} from "lucide-react";
import { deleteDraft, listDrafts, type BlogDraft } from "@/lib/blogDrafts";
import { useToast } from "@/hooks/use-toast";

type Tab = "all" | "draft" | "published";

const BlogAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("all");
  const [version, setVersion] = useState(0);

  const drafts = useMemo<BlogDraft[]>(() => listDrafts(), [version]);
  const filtered = useMemo(
    () => (tab === "all" ? drafts : drafts.filter((d) => d.status === tab)),
    [drafts, tab],
  );

  const stats = useMemo(
    () => ({
      total: drafts.length,
      published: drafts.filter((d) => d.status === "published").length,
      draft: drafts.filter((d) => d.status === "draft").length,
    }),
    [drafts],
  );

  const remove = (id: string) => {
    deleteDraft(id);
    setVersion((v) => v + 1);
    toast({ title: "Deleted", description: "Story removed from your library." });
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--blog-bg))] text-[hsl(var(--blog-muted))]">
      <Navigation />

      <main className="pt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 border-b border-[hsl(var(--blog-border)/0.5)] pb-10">
            <div className="space-y-4">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] hover:text-[hsl(var(--blog-accent-soft))] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> The Journal
              </Link>
              <h1 className="font-semibold text-[hsl(var(--blog-heading))] text-5xl md:text-6xl leading-tight">
                Your stories
              </h1>
              <p className="text-[hsl(var(--blog-muted))] max-w-xl">
                Drafts auto-save to this browser. Publish to add a story to the Journal.
              </p>
            </div>
            <button
              onClick={() => navigate("/blog/compose")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--blog-accent))] hover:bg-[hsl(var(--blog-accent-soft))] text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Story
            </button>
          </header>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-px bg-[hsl(var(--blog-border)/0.5)] mb-16">
            {[
              { label: "Total", value: stats.total, icon: FileText },
              { label: "Published", value: stats.published, icon: Globe },
              { label: "Drafts", value: stats.draft, icon: PenSquare },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-[hsl(var(--blog-bg))] p-8 md:p-10">
                <Icon className="w-4 h-4 text-[hsl(var(--blog-accent-soft))] mb-6" />
                <p className="font-semibold text-[hsl(var(--blog-heading))] text-5xl md:text-6xl leading-none">{value}</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--blog-subtle))] font-bold mt-3">{label}</p>
              </div>
            ))}
          </section>

          {/* Tabs */}
          <div className="flex items-center justify-between border-y border-[hsl(var(--blog-border)/0.5)] py-5 mb-12">
            <div className="flex gap-8 text-xs font-bold uppercase tracking-[0.2em]">
              {([
                { v: "all", label: `All (${stats.total})` },
                { v: "published", label: `Published (${stats.published})` },
                { v: "draft", label: `Drafts (${stats.draft})` },
              ] as { v: Tab; label: string }[]).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTab(t.v)}
                  className={`pb-1 border-b transition-colors ${
                    tab === t.v ? "text-[hsl(var(--blog-accent-soft))] border-[hsl(var(--blog-accent))]" : "text-[hsl(var(--blog-subtle))] hover:text-[hsl(var(--blog-heading))] border-transparent"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-[hsl(var(--blog-border))]">
              <p className="font-semibold text-3xl text-[hsl(var(--blog-subtle))] mb-6">
                {tab === "all" ? "No stories yet." : `No ${tab} stories.`}
              </p>
              <button
                onClick={() => navigate("/blog/compose")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--blog-accent))] hover:bg-[hsl(var(--blog-accent-soft))] text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Start writing
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[hsl(var(--blog-border)/0.5)]">
              {filtered.map((d) => (
                <li
                  key={d.id}
                  className="py-8 flex items-start justify-between gap-6 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.25em] px-2 py-0.5 ${
                          d.status === "published"
                            ? "bg-[hsl(var(--blog-accent))] text-white"
                            : "bg-[hsl(var(--blog-border))] text-[hsl(var(--blog-accent-soft))]"
                        }`}
                      >
                        {d.status}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] font-bold">
                        {d.category || "Uncategorized"}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle)/0.7)] font-bold">
                        {new Date(d.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-3xl text-[hsl(var(--blog-heading))] leading-tight mb-2 group-hover:italic transition-all">
                      {d.title || "Untitled story"}
                    </h3>
                    {d.excerpt && (
                      <p className="text-[hsl(var(--blog-muted))] line-clamp-2 max-w-3xl">{d.excerpt}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.status === "published" && d.slug && (
                      <Link
                        to={`/blog/${d.slug}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--blog-border))] hover:border-[hsl(var(--blog-accent))] text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-heading))] transition-colors"
                      >
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    <button
                      onClick={() => navigate(`/blog/compose/${d.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--blog-border))] hover:border-[hsl(var(--blog-accent))] text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-heading))] transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => remove(d.id)}
                      className="inline-flex items-center justify-center w-9 h-9 border border-[hsl(var(--blog-border))] hover:border-red-500/60 hover:text-red-400 text-[hsl(var(--blog-subtle))] transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogAdmin;
