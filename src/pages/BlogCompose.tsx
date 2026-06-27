import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import BlogMarkdown from "@/components/blog/BlogMarkdown";
import MarkdownToolbar from "@/components/blog/MarkdownToolbar";
import {
  ArrowLeft, Save, Send, Eye, Columns2, FileText, Sparkles, Check, Loader2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Platform Updates", "Security", "DevOps", "AI/ML", "Community", "Tutorial", "Case Study"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

type Mode = "split" | "write" | "preview";

const SAMPLE = `# Your captivating title

Open with a single bold idea — one sentence that earns the reader's next minute.

## The shape of the problem

Explain what's broken or unsolved today. Set the stakes. Cite a number if you can.

> "Quote something memorable here — it will render in elegant serif italic."

## Walk through your approach

Use **bold** for emphasis, *italic* for nuance, and \`inline code\` for identifiers.

\`\`\`yaml
apiVersion: adhar.io/v2
kind: Service
metadata:
  name: my-service
spec:
  replicas: 3
\`\`\`

### Three things to remember

- One clear principle
- A pattern to apply
- A trap to avoid

---

Close with a call to action: where should the reader go next?
`;

const BlogCompose = () => {
  const navigate = useNavigate();
  const { id } = useParams({ strict: false });
  const { toast } = useToast();
  const { isModerator } = useAuth();

  // Load an existing post when editing (id is the post's UUID).
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["post-edit", id],
    queryFn: () => api.posts.get(id as string),
    enabled: !!id,
    retry: false,
  });

  const [draftId, setDraftId] = useState<string | undefined>(id);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("Platform Updates");
  const [image, setImage] = useState("");
  const [featured, setFeatured] = useState(false);
  const [content, setContent] = useState(id ? "" : SAMPLE);
  const [mode, setMode] = useState<Mode>("split");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<"idle" | "saving" | "publishing">("idle");
  const hydrated = useRef(false);

  // Populate the form once the existing post arrives.
  useEffect(() => {
    if (existing?.post && !hydrated.current) {
      const p = existing.post;
      hydrated.current = true;
      setDraftId(p.id);
      setTitle(p.title);
      setSlug(p.slug);
      setExcerpt(p.excerpt);
      setCategory(p.category);
      setImage(p.image);
      setFeatured(p.featured);
      setContent(p.content);
      setSavedAt(p.updatedAt);
    }
  }, [existing]);

  // Auto-slug for new posts.
  useEffect(() => {
    if (!id && title && !slug) setSlug(slugify(title));
  }, [title, slug, id]);

  const payload = () => ({
    title,
    slug: slug || slugify(title || "untitled"),
    excerpt,
    category,
    image,
    featured,
    content,
  });

  /** Create (if new) or update the post on the server. Never changes status
   *  unless `publish` is requested. */
  const saveServer = async (publish: boolean): Promise<{ slug: string; status: string } | null> => {
    let post;
    if (!draftId) {
      const res = await api.posts.create({ ...payload(), status: "draft" });
      post = res.post;
      setDraftId(post.id);
    } else {
      const res = await api.posts.update(draftId, payload());
      post = res.post;
    }
    if (publish) {
      // Authors submit for review (pending); moderators publish directly.
      const nextStatus = isModerator ? "published" : "pending";
      const res = await api.posts.update(post.id, { status: nextStatus });
      post = res.post;
    }
    setSavedAt(new Date().toISOString());
    return { slug: post.slug, status: post.status };
  };

  const onSave = async () => {
    if (!title.trim()) {
      toast({ title: "Add a title", description: "Your story needs a title before saving.", variant: "destructive" });
      return;
    }
    setBusy("saving");
    try {
      await saveServer(false);
      toast({ title: "Draft saved", description: "Your story is saved to the server." });
    } catch (err) {
      toast({ title: "Couldn't save", description: errMsg(err), variant: "destructive" });
    } finally {
      setBusy("idle");
    }
  };

  const onPublish = async () => {
    if (!title.trim()) {
      toast({ title: "Add a title", description: "Your story needs a title before publishing.", variant: "destructive" });
      return;
    }
    if (!content.trim()) {
      toast({ title: "Add some content", description: "Write something before publishing.", variant: "destructive" });
      return;
    }
    setBusy("publishing");
    try {
      const result = await saveServer(true);
      if (!result) return;
      if (result.status === "published") {
        toast({ title: "Published", description: "Your story is now live on the Journal." });
        navigate({ to: `/blog/${result.slug}` });
      } else {
        toast({ title: "Submitted for review", description: "A moderator will review your story before it goes live." });
        navigate({ to: "/blog/admin" });
      }
    } catch (err) {
      toast({ title: "Couldn't publish", description: errMsg(err), variant: "destructive" });
    } finally {
      setBusy("idle");
    }
  };

  const lastSavedLabel = loadingExisting
    ? "Loading…"
    : savedAt
      ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : "Not saved yet";

  return (
    <div className="min-h-screen bg-[hsl(var(--blog-bg))] text-[hsl(var(--blog-muted))]">
      <Navigation />

      <main className="pt-20">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-10 space-y-8">
          {/* Action bar */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[hsl(var(--blog-border)/0.5)] pb-6">
            <div className="flex items-center gap-4">
              <Link
                to="/blog/admin"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--blog-subtle))] hover:text-[hsl(var(--blog-accent-soft))] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Stories
              </Link>
              <span className="w-px h-5 bg-[hsl(var(--blog-border))]" />
              <div>
                <h1 className="font-semibold text-3xl text-[hsl(var(--blog-heading))] leading-none">
                  {initial ? "Edit story" : "New story"}
                </h1>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] mt-1.5 flex items-center gap-2">
                  <Check className="w-3 h-3 text-emerald-400" /> {lastSavedLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[hsl(var(--blog-surface))] ring-1 ring-[hsl(var(--blog-border))] p-1">
                {([
                  { v: "write", icon: <FileText className="w-3.5 h-3.5" />, label: "Write" },
                  { v: "split", icon: <Columns2 className="w-3.5 h-3.5" />, label: "Split" },
                  { v: "preview", icon: <Eye className="w-3.5 h-3.5" />, label: "Preview" },
                ] as const).map((b) => (
                  <button
                    key={b.v}
                    onClick={() => setMode(b.v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                      mode === b.v ? "bg-[hsl(var(--blog-accent))] text-white" : "text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-heading))]"
                    }`}
                  >
                    {b.icon} {b.label}
                  </button>
                ))}
              </div>
              <button
                onClick={onSave}
                disabled={busy !== "idle"}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-[hsl(var(--blog-border))] hover:border-[hsl(var(--blog-accent))] text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-heading))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === "saving" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Draft
              </button>
              <button
                onClick={onPublish}
                disabled={busy !== "idle"}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--blog-accent))] hover:bg-[hsl(var(--blog-accent-soft))] text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === "publishing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {isModerator ? "Publish" : "Submit for review"}
              </button>
            </div>
          </header>

          {/* Metadata strip */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            <div className="lg:col-span-6 space-y-2">
              <label className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] font-bold">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your story title…"
                className="w-full bg-transparent border-b border-[hsl(var(--blog-border))] focus:border-[hsl(var(--blog-accent))] outline-none font-semibold text-3xl md:text-4xl text-[hsl(var(--blog-heading))] placeholder:text-[hsl(var(--blog-subtle)/0.5)] py-2 transition-colors"
              />
            </div>
            <div className="lg:col-span-3 space-y-2">
              <label className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] font-bold">Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="your-story-slug"
                className="w-full bg-[hsl(var(--blog-surface))] ring-1 ring-[hsl(var(--blog-border))] focus:ring-[hsl(var(--blog-accent))] outline-none font-mono text-sm text-[hsl(var(--blog-muted))] px-3 py-2.5 transition-colors"
              />
            </div>
            <div className="lg:col-span-3 space-y-2">
              <label className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] font-bold">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[hsl(var(--blog-surface))] ring-1 ring-[hsl(var(--blog-border))] focus:ring-[hsl(var(--blog-accent))] outline-none text-sm text-[hsl(var(--blog-muted))] px-3 py-2.5 transition-colors"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="lg:col-span-6 space-y-2">
              <label className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] font-bold">Excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A one-or-two-sentence lede that earns the click."
                rows={2}
                className="w-full bg-[hsl(var(--blog-surface))] ring-1 ring-[hsl(var(--blog-border))] focus:ring-[hsl(var(--blog-accent))] outline-none text-sm text-[hsl(var(--blog-muted))] px-4 py-3 transition-colors resize-none"
              />
            </div>
            <div className="lg:col-span-6 space-y-2">
              <label className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] font-bold">Cover Image URL</label>
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://…"
                className="w-full bg-[hsl(var(--blog-surface))] ring-1 ring-[hsl(var(--blog-border))] focus:ring-[hsl(var(--blog-accent))] outline-none text-sm text-[hsl(var(--blog-muted))] px-3 py-2.5 transition-colors font-mono"
              />
            </div>

            <div className="lg:col-span-12">
              <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 accent-[hsl(var(--blog-accent))]"
                />
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-bold text-[hsl(var(--blog-muted))]">
                  <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--blog-accent-soft))]" /> Feature on Journal hero
                </span>
              </label>
            </div>
          </section>

          {/* Editor / Preview */}
          <section
            className={
              mode === "split"
                ? "grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[70vh]"
                : "grid grid-cols-1 gap-6 min-h-[70vh]"
            }
          >
            {(mode === "write" || mode === "split") && (
              <MarkdownToolbar value={content} onChange={setContent} minHeight={mode === "split" ? 700 : 720} />
            )}
            {(mode === "preview" || mode === "split") && (
              <div className="bg-[hsl(var(--blog-bg))] ring-1 ring-[hsl(var(--blog-border))] overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-surface))]">
                  <Eye className="w-3.5 h-3.5 text-[hsl(var(--blog-accent-soft))]" />
                  <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[hsl(var(--blog-muted))]">Live preview</span>
                </div>
                <div className="flex-1 overflow-y-auto px-8 py-10">
                  {image && (
                    <div className="aspect-[21/9] mb-10 ring-1 ring-[hsl(var(--blog-border))] overflow-hidden bg-[hsl(var(--blog-surface))]">
                      <img src={image} alt={title} className="w-full h-full object-cover grayscale" />
                    </div>
                  )}
                  {title && (
                    <>
                      <p className="text-[hsl(var(--blog-accent-soft))] text-[10px] font-bold uppercase tracking-[0.3em] mb-4">
                        {category}
                      </p>
                      <h1 className="font-semibold text-[hsl(var(--blog-heading))] text-4xl md:text-5xl leading-[1.05] mb-6">
                        {title}
                      </h1>
                      {excerpt && (
                        <p className="text-[hsl(var(--blog-muted))] text-lg leading-relaxed mb-10 max-w-2xl">{excerpt}</p>
                      )}
                    </>
                  )}
                  {content ? (
                    <BlogMarkdown content={content} />
                  ) : (
                    <p className="text-[hsl(var(--blog-subtle)/0.7)] italic font-semibold text-2xl">
                      Start writing to see your preview…
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogCompose;
