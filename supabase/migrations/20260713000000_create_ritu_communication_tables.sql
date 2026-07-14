-- supabase/migrations/20260713000000_create_ritu_communication_tables.sql

create table if not exists public.ritu_communication_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rattachement_code_eleve text not null,
  consentement_valide_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, rattachement_code_eleve)
);

create table if not exists public.ritu_communication_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.ritu_communication_boards(id) on delete cascade,
  categorie text not null check (categorie in ('personnes', 'actions', 'descriptifs', 'social', 'objets', 'sentiments')),
  libelle text not null,
  picto_url text not null,
  picto_source text not null check (picto_source in ('arasaac', 'perso')),
  ordre integer not null default 0
);

create table if not exists public.ritu_phrases_log (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.ritu_communication_boards(id) on delete cascade,
  phrase_texte text not null,
  created_at timestamptz not null default now()
);

alter table public.ritu_communication_boards enable row level security;
alter table public.ritu_communication_items enable row level security;
alter table public.ritu_phrases_log enable row level security;

create policy "ritu_communication_boards_owner_all" on public.ritu_communication_boards
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ritu_communication_items_owner_all" on public.ritu_communication_items
  for all
  using (
    exists (
      select 1 from public.ritu_communication_boards b
      where b.id = ritu_communication_items.board_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ritu_communication_boards b
      where b.id = ritu_communication_items.board_id and b.user_id = auth.uid()
    )
  );

create policy "ritu_phrases_log_owner_all" on public.ritu_phrases_log
  for all
  using (
    exists (
      select 1 from public.ritu_communication_boards b
      where b.id = ritu_phrases_log.board_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ritu_communication_boards b
      where b.id = ritu_phrases_log.board_id and b.user_id = auth.uid()
    )
  );

-- Purge automatique (RGPD) : les phrases sont conservées jusqu'à la fin de
-- l'année scolaire FWB (1er septembre), puis purgées. SQL pur (pg_cron +
-- fonction security definer) plutôt qu'edge function : aucune clé de
-- service à embarquer dans le code versionné (cf. note de déviation).
create or replace function public.ritu_current_school_year_start() returns timestamptz
language sql
stable
as $$
  select case
    when extract(month from (now() at time zone 'Europe/Brussels')) >= 9
      then make_timestamptz(extract(year from (now() at time zone 'Europe/Brussels'))::int, 9, 1, 0, 0, 0, 'Europe/Brussels')
    else make_timestamptz(extract(year from (now() at time zone 'Europe/Brussels'))::int - 1, 9, 1, 0, 0, 0, 'Europe/Brussels')
  end;
$$;

create or replace function public.ritu_purge_phrases_log() returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ritu_phrases_log
  where created_at < public.ritu_current_school_year_start();
$$;

revoke all on function public.ritu_purge_phrases_log() from public;
revoke all on function public.ritu_purge_phrases_log() from anon, authenticated;

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'ritu-purge-phrases-log-daily') then
    perform cron.unschedule('ritu-purge-phrases-log-daily');
  end if;
end $$;

select cron.schedule(
  'ritu-purge-phrases-log-daily',
  '0 3 * * *',
  $$select public.ritu_purge_phrases_log();$$
);
