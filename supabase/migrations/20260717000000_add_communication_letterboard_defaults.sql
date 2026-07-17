-- supabase/migrations/20260717000000_add_communication_letterboard_defaults.sql

create table if not exists public.ritu_communication_defaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode_defaut text not null default 'pictogrammes' check (mode_defaut in ('pictogrammes', 'letterboard')),
  hold_ms integer not null default 500,
  select_on_release boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.ritu_communication_defaults enable row level security;

create policy "ritu_communication_defaults_owner_all" on public.ritu_communication_defaults
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.ritu_communication_boards
  add column if not exists mode text check (mode in ('pictogrammes', 'letterboard')),
  add column if not exists hold_ms integer,
  add column if not exists select_on_release boolean;
