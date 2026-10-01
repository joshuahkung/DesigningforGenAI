-- Week 3: profiles table + auth.users trigger + avatars storage bucket
-- Run once in Supabase Dashboard -> SQL Editor.

-- 1. Profiles table (one row per auth user). Names are nullable on purpose:
--    the app prompts for them after first login.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  first_name  text,
  last_name   text,
  avatar_url  text,           -- public URL of the image in Storage (no binary data in the DB)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS off for now, per the assignment.
alter table public.profiles disable row level security;
grant select, insert, update on public.profiles to anon, authenticated;

-- 2. Trigger: create a profile row the first time a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill any users who signed up before the trigger existed.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- 3. Avatars bucket (public read). Images live in Storage; profiles stores only the URL.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Logged-in users may upload only into a folder named after their own user id.
drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
