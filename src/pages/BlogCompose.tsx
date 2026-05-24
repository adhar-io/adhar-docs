import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import BlogMarkdown from "@/components/blog/BlogMarkdown";
import MarkdownToolbar from "@/components/blog/MarkdownToolbar";
import {
  ArrowLeft, Save, Send, Eye, Columns2, FileText, Sparkles, Check,
} from "lucide-react";
import {
  saveDraft, getDraft, type BlogDraft, slugify,
} from "@/lib/blogDrafts";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Platform Updates", "Security", "DevOps", "AI/ML", "Community", "Tutorial", "Case Study"];

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
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const initial = useMemo<BlogDraft | undefined>(() => (id ? getDraft(id) : undefined), [id]);

  const [draftId, setDraftId] = useState<string | undefined>(initial?.id);
  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt || "");
  const [author, setAuthor] = useState(initial?.author || "ADHAR Team");
  const [category, setCategory] = useState(initial?.category || "Platform Updates");
  const [image, setImage] = useState(initial?.image || "");
  const [featured, setFeatured] = useState(initial?.featured || false);
  const [content, setContent] = useState(initial?.content || SAMPLE);
  const [mode, setMode] = useState<Mode>("split");
  const [savedAt, setSavedAt] = useState<string | null>(initial?.updatedAt || null);

  // Auto-slug
  useEffect(() => {
    if (!initial && title && !slug) setSlug(slugify(title));
  }, [title, slug, initial]);

  // Auto-save every 8s when content changes
  useEffect(() => {
    if (!title && !content) return;
    const t = setTimeout(() => {
      const next = saveDraft({
        id: draftId,
        title, slug: slug || slugify(title || "untitled"),
        excerpt, author, category, image, featured, content,
        status: "draft",
      });
      setDraftId(next.id);
      setSavedAt(next.updatedAt);
    }, 8000);
    return () => clearTimeout(t);
  }, [title, slug, excerpt, author, category, image, featured, content, draftId]);

  const persist = (status: "draft" | "published") => {
    if (!title.trim()) {
      toast({ title: "Add a title", description: "Your story needs a title before saving.", variant: "destructive" });
      return null;
    }
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const readTime = `${Math.max(1, Math.ceil(words / 200))} min read`;
    const next = saveDraft({
      id: draftId,
      title,
      slug: slug || slugify(title),
      excerpt,
      author,
      category,
      image,
      featured,
      content,
      readTime,
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      status,
    });
    setDraftId(next.id);
    setSavedAt(next.updatedAt);
    return next;
  };

  const onSave = () => {
    const r = persist("draft");
    if (r) toast({ title: "Draft saved", description: "Your story is saved locally." });
  };

  const onPublish = () => {
    if (!content.trim()) {
      toast({ title: "Add some content", description: "Write something before publishing.", variant: "destructive" });
      return;
    }
    const r = persist("published");
    if (r) {
      toast({ title: "Published", description: "Your story is now live on the Journal." });
      navigate(`/blog/${r.slug}`);
    }
  };

  const lastSavedLabel = savedAt
    ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Not saved";

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
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-[hsl(var(--blog-border))] hover:border-[hsl(var(--blog-accent))] text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-heading))] transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
              <button
                onClick={onPublish}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--blog-accent))] hover:bg-[hsl(var(--blog-accent-soft))] text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Publish
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
            <div className="lg:col-span-3 space-y-2">
              <label className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))] font-bold">Author</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-[hsl(var(--blog-surface))] ring-1 ring-[hsl(var(--blog-border))] focus:ring-[hsl(var(--blog-accent))] outline-none text-sm text-[hsl(var(--blog-muted))] px-3 py-2.5 transition-colors"
              />
            </div>
            <div className="lg:col-span-3 space-y-2">
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
