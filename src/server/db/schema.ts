import {
  pgEnum,
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';

/* ============ ENUMS ============ */
export const appRole = pgEnum('app_role', ['user', 'moderator']);
export const postStatus = pgEnum('post_status', [
  'draft',
  'pending',
  'approved',
  'rejected',
  'published',
]);

/* ============ USERS ============
   Replaces Supabase's `auth.users`. Holds credentials. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ============ PROFILES ============ */
export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: text('email'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ============ USER ROLES ============ */
export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: appRole('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userRoleUnique: unique('user_roles_user_id_role_key').on(t.userId, t.role),
  })
);

/* ============ POSTS ============ */
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    excerpt: text('excerpt').notNull().default(''),
    content: text('content').notNull().default(''),
    category: text('category').notNull().default('Platform Updates'),
    coverImage: text('cover_image'),
    featured: boolean('featured').notNull().default(false),
    readTime: text('read_time'),
    status: postStatus('status').notNull().default('draft'),
    rejectionReason: text('rejection_reason'),
    moderatedBy: uuid('moderated_by').references(() => users.id),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index('posts_status_idx').on(t.status),
    authorIdx: index('posts_author_idx').on(t.authorId),
  })
);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
