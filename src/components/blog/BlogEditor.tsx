import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Eye, FileText, Image, Clock, Send, Sparkles, Hash } from 'lucide-react';
import EnhancedMarkdownRenderer from '@/components/EnhancedMarkdownRenderer';
import ImageUploader from './ImageUploader';
import { BlogPost } from '@/data/blogData';
import { useToast } from '@/hooks/use-toast';

interface BlogEditorProps {
  post?: BlogPost;
  onSave: (post: Partial<BlogPost>) => void;
  onPublish: (post: Partial<BlogPost>) => void;
}

const CATEGORIES = [
  'Platform Updates',
  'Security',
  'DevOps',
  'AI/ML',
  'Community',
  'Tutorial',
  'Case Study',
  'News',
];

const slugifyTitle = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const BlogEditor = ({ post, onSave, onPublish }: BlogEditorProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: post?.title || '',
    slug: post?.slug || '',
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    category: post?.category || CATEGORIES[0],
    author: post?.author || '',
    image: post?.image || '',
    featured: post?.featured || false,
  });

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const wordCount = useMemo(() => {
    return formData.content.split(/\s+/).filter((w) => w.length > 0).length;
  }, [formData.content]);

  const readTime = useMemo(() => `${Math.max(1, Math.ceil(wordCount / 200))} min read`, [wordCount]);

  useEffect(() => {
    if (formData.title && !post) {
      setFormData((prev) => ({ ...prev, slug: slugifyTitle(formData.title) }));
    }
  }, [formData.title, post]);

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const buildPayload = (): Partial<BlogPost> => ({
    ...formData,
    readTime,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  });

  const handleSave = () => {
    onSave(buildPayload());
    toast({ title: 'Draft saved', description: 'Your post has been saved as a draft.' });
  };

  const handlePublish = () => {
    if (!formData.title || !formData.content || !formData.excerpt) {
      toast({
        title: 'Missing required fields',
        description: 'Title, excerpt, and content are required.',
        variant: 'destructive',
      });
      return;
    }
    onPublish(buildPayload());
    toast({ title: 'Published', description: 'Your post is live.' });
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <span className="eyebrow mb-3">{post ? 'Edit' : 'Compose'}</span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {post ? 'Edit post' : 'Create new post'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Write in Markdown · Auto-calculated read time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-4 h-10 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            <span>Save draft</span>
          </button>
          <button
            onClick={handlePublish}
            className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-5 h-10 text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            <span>Publish</span>
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Main column */}
        <div className="space-y-5">
          {/* Details */}
          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">Post details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Your captivating title…"
                  className="mt-1.5 text-base"
                />
              </div>
              <div>
                <Label htmlFor="slug" className="text-xs uppercase tracking-wider text-muted-foreground">URL slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', slugifyTitle(e.target.value))}
                  placeholder="url-friendly-slug"
                  className="mt-1.5 font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="excerpt" className="text-xs uppercase tracking-wider text-muted-foreground">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => handleInputChange('excerpt', e.target.value)}
                  placeholder="A one-or-two-sentence lede that earns the click."
                  rows={2}
                  className="mt-1.5 resize-none"
                />
              </div>
            </div>
          </section>

          {/* Content */}
          <section className="rounded-2xl border border-border/70 bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">Content</h2>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="inline-flex items-center gap-1.5 tabular">
                  <Hash className="w-3.5 h-3.5" />
                  {wordCount.toLocaleString()} words
                </div>
                <div className="inline-flex items-center gap-1.5 tabular">
                  <Clock className="w-3.5 h-3.5" />
                  {readTime}
                </div>
              </div>
            </div>

            {/* Mode tabs */}
            <div className="px-5 sm:px-6 pt-4 flex items-center gap-1.5">
              {(['edit', 'preview'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveTab(m)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium capitalize transition-colors ${
                    activeTab === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground border border-border/70 hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {m === 'edit' ? <FileText className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {m === 'edit' ? 'Write' : 'Preview'}
                </button>
              ))}
            </div>

            <div className="p-5 sm:p-6">
              {activeTab === 'edit' ? (
                <>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Start writing your post in Markdown…"
                    className="min-h-[500px] font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Supports Markdown — **bold**, *italic*, `code`, lists, tables, and fenced code blocks.
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-border/60 bg-background p-6 min-h-[500px]">
                  {formData.content ? (
                    <EnhancedMarkdownRenderer content={formData.content} />
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-16">
                      Start writing to see your preview
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Publishing */}
          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground mb-5">Publishing</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category" className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="author" className="text-xs uppercase tracking-wider text-muted-foreground">Author</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  placeholder="Your name"
                  className="mt-1.5"
                />
              </div>

              <label className="inline-flex items-center gap-3 cursor-pointer select-none pt-2">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => handleInputChange('featured', e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Feature on Journal hero
                </span>
              </label>
            </div>
          </section>

          {/* Cover image */}
          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Image className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">Cover image</h2>
            </div>
            <ImageUploader
              currentImage={formData.image}
              onImageChange={(url) => handleInputChange('image', url)}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
