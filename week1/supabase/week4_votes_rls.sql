-- Week 4: photo uploads, AI captions (with their prompts), votes, and RLS on every table.
-- Run in Supabase Dashboard -> SQL Editor. Safe to run more than once.
-- The last statement prints every public table with its RLS status.

-- ---------------------------------------------------------------------------
-- 0. Set the Week 2 `captions` table aside.
--    It only has id + content (no image, no prompt), so it can't hold AI captions.
--    It is renamed to captions_week2, not deleted, and locked down below.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.captions') is not null
     and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'captions' and column_name = 'image_id'
     )
  then
    if to_regclass('public.captions_week2') is not null then
      raise exception 'Both an old-style public.captions and public.captions_week2 exist. Rename or drop one, then run this again.';
    end if;
    alter table public.captions rename to captions_week2;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- A photo a user uploaded. The file lives in Storage; this row stores where.
create table if not exists public.images (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique,          -- "<user id>/<file name>" inside the caption-images bucket
  url          text not null,                 -- public URL of that file
  created_at   timestamptz not null default now()
);

-- One AI-generated caption for an image, plus the exact prompt and model that produced it.
create table if not exists public.captions (
  id         bigint generated always as identity primary key,
  image_id   uuid not null references public.images (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 300),
  prompt     text not null,
  model      text not null,
  upvotes    integer not null default 0,      -- kept in sync by the trigger in section 2
  downvotes  integer not null default 0,
  score      integer generated always as (upvotes - downvotes) stored,
  created_at timestamptz not null default now()
);

-- One row per vote. A user can vote on a caption once, and votes are final.
create table if not exists public.votes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  caption_id bigint not null references public.captions (id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (user_id, caption_id)
);

create index if not exists images_user_created_idx on public.images (user_id, created_at desc);
create index if not exists captions_image_idx      on public.captions (image_id);
create index if not exists captions_created_idx    on public.captions (created_at desc);
create index if not exists captions_score_idx      on public.captions (score desc);
create index if not exists votes_caption_idx       on public.votes (caption_id);

-- ---------------------------------------------------------------------------
-- 2. Vote totals
--    Users can only read their own votes, so totals are kept on the caption row.
--    This trigger is the only thing that can change upvotes/downvotes.
-- ---------------------------------------------------------------------------
create or replace function public.apply_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.captions
     set upvotes   = upvotes   + (new.value = 1)::int,
         downvotes = downvotes + (new.value = -1)::int
   where id = new.caption_id;
  return new;
end;
$$;

drop trigger if exists on_vote_cast on public.votes;
create trigger on_vote_cast
  after insert on public.votes
  for each row execute function public.apply_vote();

-- A trigger function is never meant to be called through the API.
revoke execute on function public.apply_vote() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row level security
--    Nothing is readable or writable by logged-out visitors (anon).
--    Logged-in users get the minimum each screen needs; nobody can update or delete
--    images, captions, or votes.
-- ---------------------------------------------------------------------------

-- Any public table without RLS gets it turned on (no policies = no API access).
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.images   enable row level security;
alter table public.captions enable row level security;
alter table public.votes    enable row level security;

-- Table privileges: start from nothing, grant back only what is used.
revoke all on public.profiles, public.images, public.captions, public.votes from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;

grant select on public.images, public.captions, public.votes to authenticated;
-- Insert is limited to these columns, so user_id always comes from auth.uid()
-- and vote totals can't be set by hand.
grant insert (storage_path, url)               on public.images   to authenticated;
grant insert (image_id, content, prompt, model) on public.captions to authenticated;
grant insert (caption_id, value)               on public.votes    to authenticated;

do $$
begin
  if to_regclass('public.captions_week2') is not null then
    revoke all on public.captions_week2 from anon, authenticated;
  end if;
end $$;

-- profiles: you can read and edit only your own row.
drop policy if exists "Read own profile"   on public.profiles;
drop policy if exists "Create own profile" on public.profiles;
drop policy if exists "Update own profile" on public.profiles;

create policy "Read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "Create own profile" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "Update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- images: any logged-in user can see them; you can add only your own,
-- only for a file in your own folder, and at most 10 per rolling 24 hours.
drop policy if exists "Logged-in users read images" on public.images;
drop policy if exists "Add own image, 10 a day"     on public.images;

create policy "Logged-in users read images" on public.images
  for select to authenticated
  using (true);

create policy "Add own image, 10 a day" on public.images
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and storage_path like (select auth.uid())::text || '/%'
    and (
      select count(*) from public.images mine
      where mine.user_id = (select auth.uid())
        and mine.created_at > now() - interval '24 hours'
    ) < 10
  );

-- captions: any logged-in user can read them; you can add captions only to an image you uploaded.
drop policy if exists "Logged-in users read captions" on public.captions;
drop policy if exists "Add captions to own image"     on public.captions;

create policy "Logged-in users read captions" on public.captions
  for select to authenticated
  using (true);

create policy "Add captions to own image" on public.captions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.images i
      where i.id = image_id and i.user_id = (select auth.uid())
    )
  );

-- votes: you can cast a vote as yourself and read back only your own votes.
drop policy if exists "Read own votes" on public.votes;
drop policy if exists "Cast own vote"  on public.votes;

create policy "Read own votes" on public.votes
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Cast own vote" on public.votes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. Queries the app calls (they run as the caller, so RLS still applies)
-- ---------------------------------------------------------------------------

-- Captions the current user has not voted on yet.
-- Ordered so the same photo never shows up twice in a row: every photo's first
-- unvoted caption (newest photos first), then every photo's second, and so on.
-- Vote totals are left out on purpose: you see the score only after you vote.
create or replace function public.unvoted_captions(max_rows integer default 40)
returns table (id bigint, content text, image_url text, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select q.id, q.content, q.image_url, q.created_at
  from (
    select c.id, c.content, i.url as image_url, c.created_at,
           row_number() over (partition by c.image_id order by c.id) as pass
    from public.captions c
    join public.images i on i.id = c.image_id
    where not exists (
      select 1 from public.votes v
      where v.caption_id = c.id and v.user_id = (select auth.uid())
    )
  ) q
  order by q.pass, q.created_at desc, q.id desc
  limit least(greatest(coalesce(max_rows, 40), 1), 100);
$$;

-- Highest-scoring captions created since a given time (null = all time),
-- with the current user's own vote on each, if any.
create or replace function public.top_captions(since timestamptz default null, max_rows integer default 24)
returns table (
  id bigint, content text, image_url text,
  upvotes integer, downvotes integer, score integer,
  my_vote smallint, created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.content, i.url, c.upvotes, c.downvotes, c.score, v.value, c.created_at
  from public.captions c
  join public.images i on i.id = c.image_id
  left join public.votes v on v.caption_id = c.id and v.user_id = (select auth.uid())
  where c.score > 0
    and (since is null or c.created_at >= since)
  order by c.score desc, c.upvotes desc, c.created_at desc
  limit least(greatest(coalesce(max_rows, 24), 1), 100);
$$;

revoke execute on function public.unvoted_captions(integer)            from public, anon;
revoke execute on function public.top_captions(timestamptz, integer)   from public, anon;
grant  execute on function public.unvoted_captions(integer)            to authenticated;
grant  execute on function public.top_captions(timestamptz, integer)   to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Storage
--    caption-images is a public-read bucket like avatars: files are served by URL,
--    and a logged-in user can upload only into a folder named after their own user id.
--    The bucket itself rejects anything that is not a JPG/PNG/WebP under 5 MB.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('caption-images', 'caption-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Same limits the profile form already enforces in the browser, now enforced by Storage too.
update storage.buckets
   set file_size_limit = 5242880, allowed_mime_types = array['image/*']
 where id = 'avatars';

drop policy if exists "Users upload own caption image" on storage.objects;
create policy "Users upload own caption image"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'caption-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- 6. Check: every public table should show rls_enabled = true.
-- ---------------------------------------------------------------------------
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
