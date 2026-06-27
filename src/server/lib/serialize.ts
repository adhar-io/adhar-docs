import type { Post } from '../db/schema';

/**
 * The post shape the frontend consumes (mirrors src/data/blogData.ts BlogPost,
 * plus the moderation fields the admin/compose screens need).
 */
export interface SerializedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  authorId: string;
  date: string;
  readTime: string;
  image: string;
  featured: boolean;
  status: Post['status'];
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export function serializePost(
  post: Post,
  authorName?: string | null
): SerializedPost {
  const date = post.publishedAt ?? post.createdAt;
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category,
    author: authorName || 'ADHAR Team',
    authorId: post.authorId,
    date: date.toISOString(),
    readTime: post.readTime || estimateReadTime(post.content),
    image: post.coverImage || '',
    featured: post.featured,
    status: post.status,
    rejectionReason: post.rejectionReason,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
  };
}

export function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}
