
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.stamp_post_moderation()
returns trigger
language plpgsql
security invoker
set search_path = public
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

revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.stamp_post_moderation() from public, anon, authenticated;
