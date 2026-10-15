-- Week 5: feedback round.
--   1. Daily limit counts photos the AI captioned (posted or not), so deleting or discarding can't reset it.
--   2. You can delete your own posts (captions and votes go with them) and your own uploaded files.
--   3. "Since you were last here": new votes on your captions since you last opened the Mine page.
-- Run in Supabase Dashboard -> SQL Editor after week4_votes_rls.sql. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Caption drafts: one row per photo the AI wrote captions for.
-- ---------------------------------------------------------------------------
create table if not exists public.caption_drafts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique,
  generations  integer not null default 1,   -- 1 + times "New captions" was pressed
  created_at   timestamptz not null default now()
);
create index if not exists caption_drafts_user_created_idx on public.caption_drafts (user_id, created_at desc);

alter table public.caption_drafts enable row level security;
revoke all on public.caption_drafts from anon, authenticated;
grant select on public.caption_drafts to authenticated;

drop policy if exists "Read own drafts" on public.caption_drafts;
create policy "Read own drafts" on public.caption_drafts
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Called by the server before every AI call. Returns 'ok', 'daily_limit', 'redo_limit', or 'bad_path'.
-- A new photo uses one of the 10 daily slots; "New captions" on the same photo doesn't, up to 3 times.
create or replace function public.claim_caption_generation(p_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me   uuid := auth.uid();
  gens integer;
begin
  if me is null or p_path is null or p_path not like me::text || '/%' then
    return 'bad_path';
  end if;

  -- One claim at a time per user, so two tabs can't both slip under the limit.
  perform pg_advisory_xact_lock(hashtext(me::text));

  select generations into gens from public.caption_drafts where storage_path = p_path and user_id = me;
  if found then
    if gens >= 4 then return 'redo_limit'; end if;
    update public.caption_drafts set generations = generations + 1 where storage_path = p_path;
    return 'ok';
  end if;

  if (select count(*) from public.caption_drafts
      where user_id = me and created_at > now() - interval '24 hours') >= 10 then
    return 'daily_limit';
  end if;

  insert into public.caption_drafts (user_id, storage_path) values (me, p_path);
  return 'ok';
end;
$$;

revoke execute on function public.claim_caption_generation(text) from public, anon;
grant  execute on function public.claim_caption_generation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Deleting your own posts and files.
--    Deleting an image row also deletes its captions and their votes (on delete cascade).
-- ---------------------------------------------------------------------------
grant delete on public.images to authenticated;

drop policy if exists "Delete own image" on public.images;
create policy "Delete own image" on public.images
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Storage needs select + delete on your own files to remove them.
drop policy if exists "Users read own caption image" on storage.objects;
create policy "Users read own caption image"
  on storage.objects for select to authenticated
  using (bucket_id = 'caption-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete own caption image" on storage.objects;
create policy "Users delete own caption image"
  on storage.objects for delete to authenticated
  using (bucket_id = 'caption-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- 3. Activity: when you last looked, and what's new since then.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists activity_seen_at timestamptz;

-- New votes from other people on your captions since activity_seen_at (or the last 7 days if never).
-- security definer because votes are otherwise readable only by the person who cast them;
-- it returns only totals, only for the caller's own captions.
create or replace function public.my_activity()
returns table (
  caption_id bigint, content text, image_url text,
  new_up integer, new_down integer,
  upvotes integer, downvotes integer, score integer,
  latest timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with seen as (
    select coalesce(
      (select p.activity_seen_at from public.profiles p where p.id = (select auth.uid())),
      now() - interval '7 days'
    ) as at
  )
  select c.id, c.content, i.url,
         (count(*) filter (where v.value = 1))::int,
         (count(*) filter (where v.value = -1))::int,
         c.upvotes, c.downvotes, c.score,
         max(v.created_at)
  from public.captions c
  join public.images i on i.id = c.image_id
  join public.votes v  on v.caption_id = c.id
  cross join seen
  where c.user_id = (select auth.uid())
    and v.user_id <> (select auth.uid())
    and v.created_at > seen.at
  group by c.id, i.url
  order by max(v.created_at) desc
  limit 30;
$$;

revoke execute on function public.my_activity() from public, anon;
grant  execute on function public.my_activity() to authenticated;

-- Check
select 'caption_drafts' as table_name, relrowsecurity as rls_enabled from pg_class where oid = 'public.caption_drafts'::regclass;
