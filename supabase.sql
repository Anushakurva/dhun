-- Run once in Supabase: SQL Editor, paste, Run.
-- Chat and listen-together use Realtime Broadcast + Presence, which need no tables.
-- This table only stores reports so you can review them in the dashboard.
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  reporter text not null,
  reported text not null,
  reported_name text,
  messages jsonb
);
alter table public.reports enable row level security;
create policy "anyone can file a report" on public.reports for insert to anon with check (true);
-- no select policy: only you can read reports (Table Editor in the dashboard)
