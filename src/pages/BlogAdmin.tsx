import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import {
  ArrowLeft, ArrowRight, FileText, Globe, PenSquare, Plus, Trash2, Edit3,
  CheckCircle2, XCircle, Clock, Loader2,
} from "lucide-react";
import { api, type ApiPost } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Tab = "all" | "draft" | "pending" | "published";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-[hsl(var(--blog-accent))] text-white",
  pending: "bg-amber-500/15 text-amber-500",
  approved: "bg-sky-500/15 text-sky-500",
  rejected: "bg-red-500/15 text-red-400",
  draft: "bg-[hsl(var(--blog-border))] text-[hsl(var(--blog-accent-soft))]",
};

const BlogAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isModerator } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["posts", "mine"],
    queryFn: () => api.posts.list({ mine: true }),
  });
  const posts = useMemo(() => data?.posts ?? [], [data]);

  // Moderators get a review queue of everyone's pending submissions.
  const { data: reviewData } = useQuery({
    queryKey: ["posts", "pending"],
    queryFn: () => api.posts.list({ status: "pending" }),
    enabled: isModerator,
  });
  const pendingPosts = useMemo(() => reviewData?.posts ?? [], [reviewData]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.posts.remove(id),
    onSuccess: () => {
      toast({ title: "Deleted", description: "Story removed." });
      invalidate();
    },
    onError: (e: unknown) =>
      toast({ title: "Couldn't delete", description: msg(e), variant: "destructive" }),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "publish" | "reject" }) =>
      api.posts.moderate(id, action),
    onSuccess: (_res, vars) => {
      toast({
        title: vars.action === "publish" ? "Published" : "Rejected",
        description:
          vars.action === "publish" ? "The story is now live." : "Sent back to the author.",
      });
      invalidate();
    },
    onError: (e: unknown) =>
      toast({ title: "Action failed", description: msg(e), variant: "destructive" }),
  });

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((p) => p.status === "published").length,
      draft: posts.filter((p) => p.status === "draft" || p.status === "rejected").length,
      pending: posts.filter((p) => p.status === "pending" || p.status === "approved").length,
    }),
    [posts]
  );

  const filtered = useMemo(() => {
    if (tab === "all") return posts;
    if (tab === "draft") return posts.filter((p) => p.status === "draft" || p.status === "rejected");
    if (tab === "pending")
      return posts.filter((p) => p.status === "pending" || p.status === "approved");
    return posts.filter((p) => p.status === "published");
  }, [posts, tab]);

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
                {isModerator
                  ? "Manage your stories and review submissions from the community."
                  : "Save drafts and submit stories for review. A moderator publishes them to the Journal."}
              </p>
            </div>
            <button
              onClick={() => navigate({ to: "/blog/compose" })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--blog-accent))] hover:bg-[hsl(var(--blog-accent-soft))] text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Story
            </button>
          </header>

          {/* Moderator review queue */}
          {isModerator && pendingPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-500 mb-5">
                <Clock className="w-3.5 h-3.5" /> Awaiting review ({pendingPosts.length})
              </h2>
              <ul className="divide-y divide-[hsl(var(--blog-border)/0.5)] border-y border-[hsl(var(--blog-border)/0.5)]">
                {pendingPosts.map((p) => (
                  <li key={p.id} className="py-5 flex items-center justify-between gap-6">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-xl text-[hsl(var(--blog-heading))] truncate">
                        {p.title}
                      </h3>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] font-bold mt-1">
                        {p.author} · {p.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => moderateMutation.mutate({ id: p.id, action: "publish" })}
                        disabled={moderateMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--blog-accent))] hover:bg-[hsl(var(--blog-accent-soft))] text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Publish
                      </button>
                      <button
                        onClick={() => moderateMutation.mutate({ id: p.id, action: "reject" })}
                        disabled={moderateMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--blog-border))] hover:border-red-500/60 hover:text-red-400 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--blog-muted))] transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[hsl(var(--blog-border)/0.5)] mb-16">
            {[
              { label: "Total", value: stats.total, icon: FileText },
              { label: "Published", value: stats.published, icon: Globe },
              { label: "Pending", value: stats.pending, icon: Clock },
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
            <div className="flex gap-6 md:gap-8 text-xs font-bold uppercase tracking-[0.2em] flex-wrap">
              {([
                { v: "all", label: `All (${stats.total})` },
                { v: "published", label: `Published (${stats.published})` },
                { v: "pending", label: `Pending (${stats.pending})` },
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
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-[hsl(var(--blog-subtle))]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-[hsl(var(--blog-border))]">
              <p className="font-semibold text-3xl text-[hsl(var(--blog-subtle))] mb-6">
                {tab === "all" ? "No stories yet." : `No ${tab} stories.`}
              </p>
              <button
                onClick={() => navigate({ to: "/blog/compose" })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--blog-accent))] hover:bg-[hsl(var(--blog-accent-soft))] text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Start writing
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[hsl(var(--blog-border)/0.5)]">
              {filtered.map((p: ApiPost) => (
                <li key={p.id} className="py-8 flex items-start justify-between gap-6 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-3 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.25em] px-2 py-0.5 ${
                          STATUS_STYLES[p.status] ?? STATUS_STYLES.draft
                        }`}
                      >
                        {p.status}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] font-bold">
                        {p.category || "Uncategorized"}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle)/0.7)] font-bold">
                        {fmtDate(p.updatedAt)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-3xl text-[hsl(var(--blog-heading))] leading-tight mb-2 group-hover:italic transition-all">
                      {p.title || "Untitled story"}
                    </h3>
                    {p.excerpt && (
                      <p className="text-[hsl(var(--blog-muted))] line-clamp-2 max-w-3xl">{p.excerpt}</p>
                    )}
                    {p.status === "rejected" && p.rejectionReason && (
                      <p className="text-red-400 text-sm mt-2">Rejected: {p.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === "published" && p.slug && (
                      <Link
                        to={`/blog/${p.slug}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--blog-border))] hover:border-[hsl(var(--blog-accent))] text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-heading))] transition-colors"
                      >
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    <button
                      onClick={() => navigate({ to: `/blog/compose/${p.id}` })}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--blog-border))] hover:border-[hsl(var(--blog-accent))] text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-heading))] transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(p.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center justify-center w-9 h-9 border border-[hsl(var(--blog-border))] hover:border-red-500/60 hover:text-red-400 text-[hsl(var(--blog-subtle))] transition-colors disabled:opacity-50"
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

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}

export default BlogAdmin;
