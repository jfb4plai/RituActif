-- rituactif/supabase/migrations/20260708000000_create_ritu_tables.sql

create table if not exists public.ritu_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  type_rendu text not null check (type_rendu in ('sequentiel', 'emploi_du_temps', 'grille')),
  rattachement_type text not null check (rattachement_type in ('classe', 'eleve')),
  rattachement_code_eleve text,
  config_grille jsonb,
  afficher_texte_global boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ritu_steps (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.ritu_routines(id) on delete cascade,
  ordre integer not null,
  libelle text not null,
  picto_url text not null,
  picto_source text not null check (picto_source in ('arasaac', 'perso')),
  horaire text,
  afficher_texte_override boolean,
  position_grille integer
);

alter table public.ritu_routines enable row level security;
alter table public.ritu_steps enable row level security;

create policy "ritu_routines_owner_all" on public.ritu_routines
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ritu_steps_owner_all" on public.ritu_steps
  for all
  using (
    exists (
      select 1 from public.ritu_routines r
      where r.id = ritu_steps.routine_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ritu_routines r
      where r.id = ritu_steps.routine_id and r.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('ritu-pictos', 'ritu-pictos', true)
on conflict (id) do nothing;

create policy "ritu_pictos_owner_insert" on storage.objects
  for insert
  with check (bucket_id = 'ritu-pictos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "ritu_pictos_public_read" on storage.objects
  for select
  using (bucket_id = 'ritu-pictos');

create policy "ritu_pictos_owner_delete" on storage.objects
  for delete
  using (bucket_id = 'ritu-pictos' and auth.uid()::text = (storage.foldername(name))[1]);
