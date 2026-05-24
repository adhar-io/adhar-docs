
-- ============ ENUMS ============
create type public.app_role as enum ('user', 'moderator');
create type public.post_status as enum ('draft', 'pending', 'approved', 'rejected', 'published');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view own roles"
  on public.user_roles for select using (auth.uid() = user_id);
create policy "Moderators can view all roles"
  on public.user_roles for select using (public.has_role(auth.uid(), 'moderator'));

-- ============ POSTS ============
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  category text not null default 'Platform Updates',
  cover_image text,
  featured boolean not null default false,
  read_time text,
  status post_status not null default 'draft',
  rejection_reason text,
  moderated_by uuid references auth.users(id),
  moderated_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.posts enable row level security;

create index posts_status_idx on public.posts (status);
create index posts_author_idx on public.posts (author_id);

-- Public can read published posts
create policy "Published posts are public"
  on public.posts for select
  using (status = 'published');

-- Authors can read their own posts in any state
create policy "Authors can view their own posts"
  on public.posts for select
  using (auth.uid() = author_id);

-- Moderators can read all posts
create policy "Moderators can view all posts"
  on public.posts for select
  using (public.has_role(auth.uid(), 'moderator'));

-- Authors can insert posts they own; cannot create as published or approved
create policy "Authors can create their own posts"
  on public.posts for insert
  with check (
    auth.uid() = author_id
    and status in ('draft', 'pending')
  );

-- Authors can edit their own posts only when draft or rejected, and may only
-- keep status in draft or move to pending (not self-approve/publish)
create policy "Authors can update their own draft/rejected posts"
  on public.posts for update
  using (
    auth.uid() = author_id
    and status in ('draft', 'rejected')
  )
  with check (
    auth.uid() = author_id
    and status in ('draft', 'pending')
  );

-- Moderators can update any post (approve / reject / publish)
create policy "Moderators can update any post"
  on public.posts for update
  using (public.has_role(auth.uid(), 'moderator'));

-- Authors can delete their own non-published posts
create policy "Authors can delete own non-published posts"
  on public.posts for delete
  using (auth.uid() = author_id and status <> 'published');

-- Moderators can delete any post
create policy "Moderators can delete any post"
  on public.posts for delete
  using (public.has_role(auth.uid(), 'moderator'));

-- ============ TRIGGERS ============

-- updated_at touch
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger posts_touch
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- Auto-create profile + assign role on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _allow_list text[] := array['tapas.friends@gmail.com'];
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- Everyone gets the 'user' role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  -- Allow-listed emails get 'moderator' too
  if lower(new.email) = any(_allow_list) then
    insert into public.user_roles (user_id, role)
    values (new.id, 'moderator')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- When a moderator sets status to 'published', stamp published_at
create or replace function public.stamp_post_moderation()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('approved', 'rejected', 'published') then
      new.moderated_at = now();
      new.moderated_by = coalesce(new.moderated_by, auth.uid());
    end if;
    if new.status = 'published' and old.status <> 'published' then
      new.published_at = coalesce(new.published_at, now());
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_moderation_stamp
  before update on public.posts
  for each row execute function public.stamp_post_moderation();
