import 'dotenv/config';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, sql } from './client';
import { users, profiles, userRoles, posts } from './schema';
import { hashPassword } from '../lib/auth';
import { estimateReadTime } from '../lib/serialize';

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? 'tapas.friends@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'adharadmin123';

interface SeedPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  featured: boolean;
}

/**
 * blogData.ts lives in the frontend and imports an image asset via the `@/`
 * Vite alias, which Node can't resolve. We read its source, swap that import
 * for a plain path string, and import the transformed copy to get the data.
 */
async function loadBlogPosts(): Promise<SeedPost[]> {
  const srcUrl = new URL('../../data/blogData.ts', import.meta.url);
  const raw = await readFile(srcUrl, 'utf8');
  const transformed = raw.replace(
    /^import\s+blogHeroAdhar.*$/m,
    "const blogHeroAdhar = '/assets/blog-hero-adhar.jpg';"
  );
  const tmpUrl = new URL('./_seed-blogdata.ts', import.meta.url);
  await writeFile(tmpUrl, transformed);
  try {
    const mod = await import(`${tmpUrl.href}?t=${Date.now()}`);
    return mod.blogPosts as SeedPost[];
  } finally {
    await unlink(tmpUrl).catch(() => {});
  }
}

async function main() {
  // 1. Admin / author user (also moderator).
  let admin = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) });
  if (!admin) {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    [admin] = await db.insert(users).values({ email: ADMIN_EMAIL, passwordHash }).returning();
    await db.insert(profiles).values({
      id: admin.id,
      email: ADMIN_EMAIL,
      displayName: 'ADHAR Team',
      bio: 'The ADHAR core team — building the open foundation for cloud-native development.',
    });
    await db.insert(userRoles).values([
      { userId: admin.id, role: 'user' },
      { userId: admin.id, role: 'moderator' },
    ]);
    console.log(`Created admin user ${ADMIN_EMAIL} (password: ${ADMIN_PASSWORD})`);
  } else {
    console.log(`Admin user ${ADMIN_EMAIL} already exists — skipping.`);
  }

  // 2. Seed published blog posts from the frontend's blogData.ts.
  const blogPosts = await loadBlogPosts();
  let inserted = 0;
  for (const p of blogPosts) {
    const existing = await db.query.posts.findFirst({ where: eq(posts.slug, p.slug) });
    if (existing) continue;
    const parsedDate = new Date(p.date);
    const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    await db.insert(posts).values({
      authorId: admin.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      category: p.category,
      coverImage: p.image,
      featured: p.featured,
      readTime: p.readTime || estimateReadTime(p.content),
      status: 'published',
      publishedAt,
    });
    inserted++;
  }
  console.log(`Seeded ${inserted} new post(s) (${blogPosts.length} in source).`);

  await sql.end();
  console.log('Seed complete.');
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await sql.end().catch(() => {});
  process.exit(1);
});
