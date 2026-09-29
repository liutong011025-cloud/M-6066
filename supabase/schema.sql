-- Run once in the Supabase SQL Editor for the M+6066 app.
create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 48),
  poster_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  mission text not null check (mission in ('form', 'material', 'light', 'place')),
  slot smallint not null check (slot between 0 and 2),
  filename text not null,
  photographer text not null check (char_length(photographer) between 1 and 60),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  constraint photos_group_mission_slot_unique unique (group_id, mission, slot),
  constraint photos_valid_mission_slot check (
    (mission = 'form' and slot between 0 and 2) or
    (mission in ('material', 'light', 'place') and slot between 0 and 1)
  )
);

-- Keep an existing database compatible with optional second photos.
alter table public.photos drop constraint if exists photos_valid_mission_slot;
alter table public.photos add constraint photos_valid_mission_slot check (
  (mission = 'form' and slot between 0 and 2) or
  (mission in ('material', 'light', 'place') and slot between 0 and 1)
);

create index if not exists photos_group_id_idx on public.photos(group_id);
alter table public.groups enable row level security;
alter table public.photos enable row level security;

-- Photos stay private. The server uses SUPABASE_SERVICE_ROLE_KEY to create
-- one-hour signed read URLs after checking each group's records.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mplus-6066', 'mplus-6066', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 4194304, allowed_mime_types = excluded.allowed_mime_types;

-- Course groups. Re-running this script keeps existing photos and group records.
insert into public.groups (name) values
  ('TonyTest'),
  ('wonderland'),
  ('SevenFade'),
  ('eat what'),
  ('SHOEGAZERS'),
  ('Star Lab'),
  ('The Foundry'),
  ('The Six'),
  ('Nova'),
  ('Spark'),
  ('Septastar'),
  ('ultraman&woman'),
  ('Six gods'),
  ('The Professionals'),
  ('Hello World'),
  ('EduVengers'),
  ('studio 6.0'),
  ('High-Five'),
  ('Six Wonders'),
  ('DreamTeam'),
  ('Bugless'),
  ('7-eleva'),
  ('TUFF')
on conflict (name) do nothing;
