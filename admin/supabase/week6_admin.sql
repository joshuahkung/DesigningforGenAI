-- Week 6: admin access for the shared database.
-- Run once in Supabase Dashboard -> SQL Editor. Safe to run more than once.
-- The caption app keeps working exactly as before; this only adds what admins can do.

-- ---------------------------------------------------------------------------
-- 1. The flag
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_superadmin boolean not null default false;

-- Nobody can give themselves admin through the app. Until now, logged-in users could
-- update any column of their own profile row, which would have included this flag.
-- From now on they can write only the columns the caption app actually uses.
revoke insert, update on public.profiles from authenticated;
grant insert (id, email, first_name, last_name, avatar_url, updated_at)
  on public.profiles to authenticated;
grant update (id, email, first_name, last_name, avatar_url, updated_at, activity_seen_at)
  on public.profiles to authenticated;

-- Second lock: even if a grant is ever loosened, a change to the flag from the app is rejected.
-- Only the SQL Editor (postgres) or the service role can change it.
create or replace function public.guard_superadmin_flag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.is_superadmin then
      raise exception 'is_superadmin can only be set from the database dashboard';
    elsif tg_op = 'UPDATE' and new.is_superadmin is distinct from old.is_superadmin then
      raise exception 'is_superadmin can only be set from the database dashboard';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_superadmin_flag on public.profiles;
create trigger guard_superadmin_flag
  before insert or update on public.profiles
  for each row execute function public.guard_superadmin_flag();

-- ---------------------------------------------------------------------------
-- 2. "Is the current user an admin?"
--    security definer so policies on profiles can call it without looping on themselves.
-- ---------------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_superadmin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

revoke execute on function public.is_superadmin() from public, anon;
grant  execute on function public.is_superadmin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. What admins can do (on top of what every user can already do)
--    READ profiles, CREATE/READ/UPDATE/DELETE captions and images, READ votes.
-- ---------------------------------------------------------------------------

-- profiles: read everyone
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles
  for select to authenticated
  using ((select public.is_superadmin()));

-- votes: read everyone's
drop policy if exists "Admins read all votes" on public.votes;
create policy "Admins read all votes" on public.votes
  for select to authenticated
  using ((select public.is_superadmin()));

-- captions: create, edit text, delete
grant update (content) on public.captions to authenticated;
grant delete           on public.captions to authenticated;

drop policy if exists "Admins add captions"    on public.captions;
drop policy if exists "Admins edit captions"   on public.captions;
drop policy if exists "Admins delete captions" on public.captions;

create policy "Admins add captions" on public.captions
  for insert to authenticated
  with check ((select public.is_superadmin()));

create policy "Admins edit captions" on public.captions
  for update to authenticated
  using ((select public.is_superadmin()))
  with check ((select public.is_superadmin()));

create policy "Admins delete captions" on public.captions
  for delete to authenticated
  using ((select public.is_superadmin()));

-- images: delete anyone's (captions and votes go with it)
drop policy if exists "Admins delete images" on public.images;
create policy "Admins delete images" on public.images
  for delete to authenticated
  using ((select public.is_superadmin()));

-- the photo files themselves (Storage looks a file up before deleting it, so admins need both)
drop policy if exists "Admins read caption images" on storage.objects;
create policy "Admins read caption images"
  on storage.objects for select to authenticated
  using (bucket_id = 'caption-images' and (select public.is_superadmin()));

drop policy if exists "Admins delete caption images" on storage.objects;
create policy "Admins delete caption images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'caption-images' and (select public.is_superadmin()));

-- ---------------------------------------------------------------------------
-- 4. Make Josh (jhkung1@gmail.com) the admin.
--    This runs as postgres in the SQL Editor, which is how you avoid locking yourself out.
-- ---------------------------------------------------------------------------
update public.profiles
   set is_superadmin = true
 where id = '1d299914-3049-4617-b98c-696d0b649461';

-- Check: exactly one admin, and it should be you.
select p.id, u.email, p.is_superadmin
from public.profiles p join auth.users u on u.id = p.id
order by p.is_superadmin desc, u.email;
