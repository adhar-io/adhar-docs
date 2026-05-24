import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  Clock,
  TrendingUp,
  FileText,
  Globe,
  PenSquare,
} from 'lucide-react';
import { BlogPost, blogPosts } from '@/data/blogData';
import { deleteDraft, listDrafts } from '@/lib/blogDrafts';
import { useToast } from '@/hooks/use-toast';

interface BlogDashboardProps {
  onCreateNew: () => void;
  onEditPost: (post: BlogPost) => void;
}

const CATEGORIES = ['all', 'Platform Updates', 'Security', 'DevOps', 'AI/ML', 'Community'];
type StatusFilter = 'all' | 'published' | 'draft';

interface ListEntry extends BlogPost {
  status: 'published' | 'draft';
  source: 'static' | 'draft';
  updatedAt?: string;
  draftId?: string;
}

const BlogDashboard = ({ onCreateNew, onEditPost }: BlogDashboardProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [version, setVersion] = useState(0);

  // Combined post list (static + drafts)
  const allPosts = useMemo<ListEntry[]>(() => {
    const drafts = listDrafts().map<ListEntry>((d) => ({
      id: d.id,
      draftId: d.id,
      title: d.title || 'Untitled',
      slug: d.slug || '',
      excerpt: d.excerpt || '',
      content: d.content || '',
      category: d.category || 'Platform Updates',
      author: d.author || 'ADHAR Team',
      date: d.date || new Date(d.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      readTime: d.readTime || '5 min read',
      image: d.image || '',
      featured: d.featured || false,
      status: d.status,
      source: 'draft',
      updatedAt: d.updatedAt,
    }));
    const staticPosts: ListEntry[] = blogPosts.map((p) => ({
      ...p,
      status: 'published',
      source: 'static',
    }));
    return [...drafts, ...staticPosts];
  }, [version]);

  const filtered = useMemo(() => {
    const needle = searchTerm.toLowerCase();
    return allPosts.filter((p) => {
      const matchSearch =
        !needle ||
        p.title.toLowerCase().includes(needle) ||
        p.author.toLowerCase().includes(needle) ||
        p.excerpt.toLowerCase().includes(needle);
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchStatus = selectedStatus === 'all' || p.status === selectedStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [allPosts, searchTerm, selectedCategory, selectedStatus]);

  const stats = useMemo(() => ({
    total: allPosts.length,
    published: allPosts.filter((p) => p.status === 'published').length,
    drafts: allPosts.filter((p) => p.status === 'draft').length,
    featured: allPosts.filter((p) => p.featured).length,
  }), [allPosts]);

  const onDelete = (entry: ListEntry) => {
    if (entry.source !== 'draft' || !entry.draftId) {
      toast({
        title: 'Cannot delete',
        description: 'Static posts are managed via code. Delete drafts only.',
        variant: 'destructive',
      });
      return;
    }
    if (!window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    deleteDraft(entry.draftId);
    setVersion((v) => v + 1);
    toast({ title: 'Deleted', description: 'Draft removed from your library.' });
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <span className="eyebrow mb-3">Authoring</span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Blog management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafts, published posts, and performance — all in one place.
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="btn-primary-modern group inline-flex items-center justify-center gap-2 rounded-full px-5 h-10 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>New post</span>
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
        {[
          { icon: FileText, label: 'Total posts', value: stats.total.toString() },
          { icon: Globe, label: 'Published', value: stats.published.toString() },
          { icon: PenSquare, label: 'Drafts', value: stats.drafts.toString() },
          { icon: TrendingUp, label: 'Featured', value: stats.featured.toString() },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card px-5 py-6">
              <Icon className="w-4 h-4 text-muted-foreground mb-3" />
              <div className="text-2xl sm:text-3xl font-semibold tracking-tight tabular text-foreground">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search posts, authors, content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mr-1">Status</span>
            {(['all', 'published', 'draft'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`inline-flex items-center h-8 px-3 rounded-full text-xs font-medium transition-colors capitalize ${
                  selectedStatus === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground border border-border/70 hover:text-foreground hover:bg-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mr-1">Category</span>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`inline-flex items-center h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === c
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground border border-border/70 hover:text-foreground hover:bg-muted'
              }`}
            >
              {c === 'all' ? 'All categories' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Posts list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-border/70 bg-card">
          <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground tracking-tight">No posts match your filters</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or status.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card divide-y divide-border/60">
          {filtered.map((post) => (
            <article key={post.id} className="group flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 sm:p-6 transition-colors hover:bg-muted/30">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      post.status === 'published'
                        ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {post.status}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {post.category}
                  </span>
                  {post.featured && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border/70 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Featured
                    </span>
                  )}
                  {post.source === 'static' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                      In code
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {post.author}
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {post.date}
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readTime}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
                {post.slug && (
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="View post"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => onEditPost(post as BlogPost)}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Edit post"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(post)}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border/70 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-colors"
                  aria-label="Delete post"
                  disabled={post.source !== 'draft'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogDashboard;
