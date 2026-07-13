# Mode "Je m'exprime" — planche de communication expressive — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à RituActif un mode expressif où l'élève compose lui-même une courte phrase en pictogrammes (2-4 mots), dite par synthèse vocale — planche de communication persistante par élève, catégories fixes façon clé Fitzgerald.

**Architecture:** Deux nouveaux ensembles de composants miroirs de l'existant (`CommunicationEditor/` miroir de `RoutineEditor/`, `CommunicationView/` miroir de `PlancheView/`), un nouveau module `lib/communication.ts` (CRUD Supabase), un module pur `lib/phrase.ts` (concaténation ordonnée, testé), 3 nouvelles tables Supabase avec RLS, purge RGPD automatique implémentée en SQL pur (pg_cron) plutôt qu'en edge function pour éviter toute clé de service dans le code versionné (déviation documentée du libellé exact de la spec, comportement identique).

**Tech Stack:** React 18 + Vite 5 + Tailwind (styles via classes `plai-*` existantes), Supabase (Postgres + RLS + pg_cron), Web Speech API (`tts.ts` existant, inchangé), Vitest pour les tests unitaires de fonctions pures.

**Spec source :** `docs/superpowers/specs/2026-07-13-communication-expressive-design.md`

---

## Note de déviation par rapport à la spec (à valider avant exécution)

La spec (section 8) décrit la purge RGPD comme "une nouvelle Supabase Edge Function `purge-phrases-log`". Ce plan l'implémente à la place en **SQL pur** (fonction Postgres `security definer` + `pg_cron`), sans edge function ni clé de service. Raison : un déclenchement cron→edge function nécessite d'embarquer soit la clé `service_role` soit l'URL du projet dans une migration SQL versionnée dans git — ce que la checklist sécurité du projet interdit explicitement ("Aucune clé exposée [...] jamais dans le code"). Le comportement observable (purge quotidienne, seuil 1er septembre, échec sans impact sur l'app) est strictement identique. Si vous préférez la edge function malgré la gestion de clé que ça implique (ex: clé stockée via Supabase Vault plutôt qu'en clair), le dire avant de lancer l'exécution.

---

### Task 1: Migration SQL — tables, RLS, purge automatique

**Files:**
- Create: `supabase/migrations/20260713000000_create_ritu_communication_tables.sql`

- [ ] **Step 1: Écrire la migration**

```sql
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
```

- [ ] **Step 2: Appliquer la migration sur le projet Supabase du projet (`otiorljbujqzruulmqrs`, réutilisé de Picto-lecture)**

Run: `npx supabase db push` (depuis `rituactif/`, après `npx supabase link --project-ref otiorljbujqzruulmqrs` si pas déjà lié)
Expected: migration appliquée sans erreur. Si `create extension if not exists pg_cron;` échoue pour manque de droit, l'activer manuellement via Dashboard Supabase → Database → Extensions → `pg_cron`, puis relancer `npx supabase db push`.

- [ ] **Step 3: Vérifier manuellement le mécanisme de purge**

Dans le SQL editor Supabase :
```sql
select cron.job.jobname, cron.job.schedule from cron.job where jobname = 'ritu-purge-phrases-log-daily';
select public.ritu_current_school_year_start();
select public.ritu_purge_phrases_log(); -- doit s'exécuter sans erreur, même table vide
```
Expected: le job apparaît avec le schedule `0 3 * * *`, la date retournée est le 1er septembre le plus récent, l'appel de purge ne lève pas d'erreur.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260713000000_create_ritu_communication_tables.sql
git commit -m "feat(db): tables planche de communication + purge RGPD automatique (pg_cron)"
```

---

### Task 2: Types TypeScript

**Files:**
- Modify: `src/lib/types.ts` (ajout en fin de fichier)

- [ ] **Step 1: Ajouter les types**

Ajouter à la fin de `src/lib/types.ts` :

```ts
export type CommunicationCategory = 'personnes' | 'actions' | 'descriptifs' | 'social' | 'objets' | 'sentiments';

export interface CommunicationBoard {
  id: string;
  user_id: string;
  rattachement_code_eleve: string;
  consentement_valide_at: string | null;
  created_at: string;
}

export interface CommunicationItem {
  id: string;
  board_id: string;
  categorie: CommunicationCategory;
  libelle: string;
  picto_url: string;
  picto_source: PictoSource;
  ordre: number;
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): CommunicationBoard, CommunicationItem, CommunicationCategory"
```

---

### Task 3: Métadonnées des catégories (clé Fitzgerald)

**Files:**
- Create: `src/lib/categories.ts`

- [ ] **Step 1: Écrire le fichier**

```ts
// src/lib/categories.ts
import type { CommunicationCategory } from './types';

export interface CategoryMeta {
  label: string;
  color: string;
}

export const CATEGORY_ORDER: CommunicationCategory[] = [
  'personnes',
  'actions',
  'descriptifs',
  'social',
  'objets',
  'sentiments',
];

export const CATEGORY_META: Record<CommunicationCategory, CategoryMeta> = {
  personnes: { label: 'Personnes', color: '#fbbf24' },
  actions: { label: 'Actions', color: '#34d399' },
  descriptifs: { label: 'Descriptifs', color: '#60a5fa' },
  social: { label: 'Petits mots sociaux', color: '#f472b6' },
  objets: { label: 'Objets / lieux', color: '#fb923c' },
  sentiments: { label: 'Sentiments', color: '#a78bfa' },
};
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/categories.ts
git commit -m "feat: métadonnées catégories communication (couleurs Fitzgerald)"
```

---

### Task 4: `lib/phrase.ts` — concaténation ordonnée (TDD)

**Files:**
- Create: `src/lib/phrase.ts`
- Test: `src/lib/phrase.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/phrase.test.ts
import { describe, it, expect } from 'vitest';
import { joinPhrase, MAX_PHRASE_LENGTH } from './phrase';

describe('joinPhrase', () => {
  it('concatenates labels in composition order, space-separated', () => {
    expect(joinPhrase(['je', 'veux', 'boire'])).toBe('je veux boire');
  });

  it('returns an empty string for an empty phrase', () => {
    expect(joinPhrase([])).toBe('');
  });
});

describe('MAX_PHRASE_LENGTH', () => {
  it('is 4 (bande courte, décision de portée V1)', () => {
    expect(MAX_PHRASE_LENGTH).toBe(4);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/lib/phrase.test.ts`
Expected: FAIL — `Cannot find module './phrase'`

- [ ] **Step 3: Implémenter**

```ts
// src/lib/phrase.ts
export const MAX_PHRASE_LENGTH = 4;

export function joinPhrase(libelles: string[]): string {
  return libelles.join(' ');
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run src/lib/phrase.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/phrase.ts src/lib/phrase.test.ts
git commit -m "feat: joinPhrase — concaténation ordonnée de la bande de phrase"
```

---

### Task 5: `lib/communication.ts` — CRUD Supabase

Pas de test unitaire sur ce fichier (cohérent avec `routines.ts`, wrapper CRUD Supabase non testé dans ce projet — décision spec section 10).

**Files:**
- Create: `src/lib/communication.ts`

- [ ] **Step 1: Écrire le fichier**

```ts
// src/lib/communication.ts
import { supabase } from './supabase';
import type { CommunicationBoard, CommunicationItem, CommunicationCategory, PictoSource } from './types';

export async function getOrCreateBoard(codeEleve: string): Promise<CommunicationBoard> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Utilisateur non authentifié');

  const { data, error } = await supabase
    .from('ritu_communication_boards')
    .upsert(
      { user_id: userData.user.id, rattachement_code_eleve: codeEleve },
      { onConflict: 'user_id,rattachement_code_eleve' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as CommunicationBoard;
}

export async function listCommunicationBoards(): Promise<CommunicationBoard[]> {
  const { data, error } = await supabase
    .from('ritu_communication_boards')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as CommunicationBoard[];
}

export async function getBoardWithItems(
  boardId: string
): Promise<{ board: CommunicationBoard; items: CommunicationItem[] }> {
  const { data: board, error: boardError } = await supabase
    .from('ritu_communication_boards')
    .select('*')
    .eq('id', boardId)
    .single();
  if (boardError) throw boardError;

  const { data: items, error: itemsError } = await supabase
    .from('ritu_communication_items')
    .select('*')
    .eq('board_id', boardId)
    .order('ordre', { ascending: true });
  if (itemsError) throw itemsError;

  return { board: board as CommunicationBoard, items: (items ?? []) as CommunicationItem[] };
}

export async function addCommunicationItem(params: {
  boardId: string;
  categorie: CommunicationCategory;
  libelle: string;
  pictoUrl: string;
  pictoSource: PictoSource;
  ordre: number;
}): Promise<CommunicationItem> {
  const { data, error } = await supabase
    .from('ritu_communication_items')
    .insert({
      board_id: params.boardId,
      categorie: params.categorie,
      libelle: params.libelle,
      picto_url: params.pictoUrl,
      picto_source: params.pictoSource,
      ordre: params.ordre,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CommunicationItem;
}

export async function removeCommunicationItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('ritu_communication_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function markConsentValidated(boardId: string): Promise<CommunicationBoard> {
  const { data, error } = await supabase
    .from('ritu_communication_boards')
    .update({ consentement_valide_at: new Date().toISOString() })
    .eq('id', boardId)
    .select()
    .single();
  if (error) throw error;
  return data as CommunicationBoard;
}

export async function recordPhrase(boardId: string, phraseTexte: string): Promise<void> {
  const { error } = await supabase
    .from('ritu_phrases_log')
    .insert({ board_id: boardId, phrase_texte: phraseTexte });
  if (error) throw error;
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/communication.ts
git commit -m "feat: CRUD Supabase planches/items/log de communication"
```

---

### Task 6: `CommunicationEditor/NewItemForm.tsx`

**Files:**
- Create: `src/components/CommunicationEditor/NewItemForm.tsx`

- [ ] **Step 1: Écrire le fichier**

```tsx
// src/components/CommunicationEditor/NewItemForm.tsx
import { useState } from 'react';
import { addCommunicationItem } from '../../lib/communication';
import { PictogramPicker } from '../RoutineEditor/PictogramPicker';
import { FormField } from '../FormField';
import type { CommunicationCategory, CommunicationItem, PictoSource } from '../../lib/types';

interface NewItemFormProps {
  boardId: string;
  categorie: CommunicationCategory;
  nextOrdre: number;
  onAdded: (item: CommunicationItem) => void;
}

export function NewItemForm({ boardId, categorie, nextOrdre, onAdded }: NewItemFormProps) {
  const [libelle, setLibelle] = useState('');
  const [pictoUrl, setPictoUrl] = useState('');
  const [pictoSource, setPictoSource] = useState<PictoSource>('arasaac');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = libelle.trim().length > 0 && pictoUrl.length > 0;

  const handleAdd = async () => {
    setError(null);
    setSaving(true);
    try {
      const item = await addCommunicationItem({
        boardId,
        categorie,
        libelle,
        pictoUrl,
        pictoSource,
        ordre: nextOrdre,
      });
      onAdded(item);
      setLibelle('');
      setPictoUrl('');
      setPictoSource('arasaac');
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-3 items-start flex-wrap border rounded-lg p-2 mt-2" style={{ borderColor: 'var(--border)' }}>
      <FormField label="Nouveau mot" style={{ minWidth: 0, flex: '1 1 160px', marginBottom: 0 }}>
        <input
          className="plai-input"
          placeholder='ex: "boire"'
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
        />
      </FormField>

      <PictogramPicker
        libelle={libelle}
        pictoUrl={pictoUrl}
        onSelect={(url, source) => {
          setPictoUrl(url);
          setPictoSource(source);
        }}
      />

      <button className="plai-btn" type="button" disabled={!canAdd || saving} onClick={handleAdd}>
        {saving ? 'Ajout...' : '+ Ajouter'}
      </button>
      {error && <div className="plai-error">{error}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommunicationEditor/NewItemForm.tsx
git commit -m "feat: formulaire d'ajout de mot à une planche de communication"
```

---

### Task 7: `CommunicationEditor/CommunicationEditor.tsx`

**Files:**
- Create: `src/components/CommunicationEditor/CommunicationEditor.tsx`

- [ ] **Step 1: Écrire le fichier**

```tsx
// src/components/CommunicationEditor/CommunicationEditor.tsx
import { useEffect, useState } from 'react';
import { getBoardWithItems, removeCommunicationItem } from '../../lib/communication';
import { CATEGORY_ORDER, CATEGORY_META } from '../../lib/categories';
import type { CommunicationBoard, CommunicationItem, CommunicationCategory } from '../../lib/types';
import { NewItemForm } from './NewItemForm';

interface CommunicationEditorProps {
  boardId: string;
  onOpenViewer: (boardId: string) => void;
  onBack: () => void;
}

export function CommunicationEditor({ boardId, onOpenViewer, onBack }: CommunicationEditorProps) {
  const [board, setBoard] = useState<CommunicationBoard | null>(null);
  const [items, setItems] = useState<CommunicationItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<CommunicationCategory>('personnes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBoardWithItems(boardId)
      .then(({ board, items }) => {
        setBoard(board);
        setItems(items);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [boardId]);

  const handleRemove = async (itemId: string) => {
    try {
      await removeCommunicationItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    }
  };

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (!board) return <p aria-live="polite">Planche introuvable.</p>;

  const itemsInCategory = items.filter((i) => i.categorie === activeCategory);
  const nextOrdre = itemsInCategory.length;

  return (
    <div className="plai-section">
      <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>

      <div className="plai-card">
        <h1 className="font-serif text-xl mb-1">Communication — {board.rattachement_code_eleve}</h1>
        <p className="text-xs text-[var(--text3)] mb-4">
          Ajoutez des pictos dans chaque catégorie. L'élève les utilisera pour composer des phrases courtes.
        </p>

        <div className="flex gap-2 flex-wrap mb-4" role="tablist">
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className="text-sm"
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: `2px solid ${CATEGORY_META[cat].color}`,
                background: activeCategory === cat ? CATEGORY_META[cat].color : 'transparent',
                cursor: 'pointer',
              }}
            >
              {CATEGORY_META[cat].label}
            </button>
          ))}
        </div>

        {error && <div className="plai-error">{error}</div>}

        {itemsInCategory.length === 0 ? (
          <div className="plai-empty">Pas encore de pictos ici.</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {itemsInCategory.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <img src={item.picto_url} alt={item.libelle} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                <span>{item.libelle}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  aria-label={`Supprimer le mot : ${item.libelle}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <NewItemForm
          boardId={board.id}
          categorie={activeCategory}
          nextOrdre={nextOrdre}
          onAdded={(item) => setItems((prev) => [...prev, item])}
        />
      </div>

      <button className="plai-btn mt-4" type="button" onClick={() => onOpenViewer(board.id)}>
        👁 Vue élève
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommunicationEditor/CommunicationEditor.tsx
git commit -m "feat: éditeur de planche de communication (catégories, ajout/suppression)"
```

---

### Task 8: `CommunicationView/PhraseStrip.tsx`

**Files:**
- Create: `src/components/CommunicationView/PhraseStrip.tsx`

- [ ] **Step 1: Écrire le fichier**

```tsx
// src/components/CommunicationView/PhraseStrip.tsx
import { speak } from '../../lib/tts';
import { joinPhrase, MAX_PHRASE_LENGTH } from '../../lib/phrase';
import { recordPhrase } from '../../lib/communication';
import type { CommunicationItem } from '../../lib/types';

interface PhraseStripProps {
  boardId: string;
  strip: CommunicationItem[];
  onClear: () => void;
}

export function PhraseStrip({ boardId, strip, onClear }: PhraseStripProps) {
  const handleSpeak = () => {
    const phrase = joinPhrase(strip.map((i) => i.libelle));
    if (!phrase) return;
    speak(phrase);
    recordPhrase(boardId, phrase).catch(() => {});
    onClear();
  };

  return (
    <div className="plai-card flex items-center gap-2 flex-wrap" style={{ minHeight: 88 }}>
      {strip.length === 0 && (
        <span className="text-sm text-[var(--text3)]">Touchez des pictos pour composer une phrase...</span>
      )}
      {strip.map((item, index) => (
        <img
          key={`${item.id}-${index}`}
          src={item.picto_url}
          alt={item.libelle}
          style={{ width: 64, height: 64, objectFit: 'contain' }}
        />
      ))}
      <div className="flex gap-2 ml-auto">
        <button
          type="button"
          className="plai-btn-ghost"
          onClick={onClear}
          disabled={strip.length === 0}
          aria-label="Effacer la phrase"
        >
          ✕ Effacer
        </button>
        <button
          type="button"
          className="plai-btn"
          onClick={handleSpeak}
          disabled={strip.length === 0}
          aria-label="Dire la phrase"
        >
          🔊 Dire la phrase
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {strip.length}/{MAX_PHRASE_LENGTH} mots dans la bande
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommunicationView/PhraseStrip.tsx
git commit -m "feat: bande de phrase élève (composition, dire, effacer)"
```

---

### Task 9: `CommunicationView/CategoryBoard.tsx`

**Files:**
- Create: `src/components/CommunicationView/CategoryBoard.tsx`

- [ ] **Step 1: Écrire le fichier**

```tsx
// src/components/CommunicationView/CategoryBoard.tsx
import { useState } from 'react';
import { speak } from '../../lib/tts';
import { CATEGORY_ORDER, CATEGORY_META } from '../../lib/categories';
import type { CommunicationItem, CommunicationCategory } from '../../lib/types';

interface CategoryBoardProps {
  items: CommunicationItem[];
  onPick: (item: CommunicationItem) => void;
}

export function CategoryBoard({ items, onPick }: CategoryBoardProps) {
  const [activeCategory, setActiveCategory] = useState<CommunicationCategory>('personnes');
  const itemsInCategory = items.filter((i) => i.categorie === activeCategory);

  const handlePick = (item: CommunicationItem) => {
    speak(item.libelle);
    onPick(item);
  };

  return (
    <div className="plai-card mt-3">
      <div className="flex gap-2 flex-wrap mb-4" role="tablist">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '10px 16px',
              borderRadius: 20,
              border: `2px solid ${CATEGORY_META[cat].color}`,
              background: activeCategory === cat ? CATEGORY_META[cat].color : 'transparent',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            {CATEGORY_META[cat].label}
          </button>
        ))}
      </div>

      {itemsInCategory.length === 0 ? (
        <div className="plai-empty">Pas encore de pictos ici.</div>
      ) : (
        <div className="flex gap-3 flex-wrap">
          {itemsInCategory.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handlePick(item)}
              aria-label={`Dire : ${item.libelle}`}
              style={{
                border: `2px solid ${CATEGORY_META[activeCategory].color}`,
                borderRadius: 12,
                padding: 8,
                background: 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              <img src={item.picto_url} alt="" style={{ width: 96, height: 96, objectFit: 'contain' }} />
              <div className="text-sm mt-1">{item.libelle}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommunicationView/CategoryBoard.tsx
git commit -m "feat: grille de pictogrammes élève par catégorie (cibles tactiles larges)"
```

---

### Task 10: `CommunicationView/CommunicationView.tsx` (orchestration + bandeau RGPD)

**Files:**
- Create: `src/components/CommunicationView/CommunicationView.tsx`

- [ ] **Step 1: Écrire le fichier**

```tsx
// src/components/CommunicationView/CommunicationView.tsx
import { useEffect, useState } from 'react';
import { getBoardWithItems, markConsentValidated } from '../../lib/communication';
import { MAX_PHRASE_LENGTH } from '../../lib/phrase';
import type { CommunicationBoard, CommunicationItem } from '../../lib/types';
import { CategoryBoard } from './CategoryBoard';
import { PhraseStrip } from './PhraseStrip';

interface CommunicationViewProps {
  boardId: string;
  onBack: () => void;
}

export function CommunicationView({ boardId, onBack }: CommunicationViewProps) {
  const [board, setBoard] = useState<CommunicationBoard | null>(null);
  const [items, setItems] = useState<CommunicationItem[]>([]);
  const [strip, setStrip] = useState<CommunicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [consenting, setConsenting] = useState(false);

  useEffect(() => {
    getBoardWithItems(boardId)
      .then(({ board, items }) => {
        setBoard(board);
        setItems(items);
      })
      .catch(() => setBoard(null))
      .finally(() => setLoading(false));
  }, [boardId]);

  const handleConsent = async () => {
    if (!board) return;
    setConsenting(true);
    try {
      const updated = await markConsentValidated(board.id);
      setBoard(updated);
    } finally {
      setConsenting(false);
    }
  };

  const handlePick = (item: CommunicationItem) => {
    setStrip((prev) => (prev.length >= MAX_PHRASE_LENGTH ? prev : [...prev, item]));
  };

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (!board) return <p aria-live="polite">Planche introuvable.</p>;

  if (!board.consentement_valide_at) {
    return (
      <div className="plai-section">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
          ← Retour
        </button>
        <div role="note" className="plai-card" style={{ borderColor: '#e8d5a3', background: '#fdf8ec', color: '#6b5216' }}>
          <strong>Avant de continuer</strong>
          <p className="mt-2">
            Cette planche peut faire dire à l'élève des informations sensibles (santé, famille). Les
            phrases sont conservées jusqu'à la fin de l'année scolaire, visibles uniquement par vous.
            Vérifiez que le cadre (PIA, consentement parental) l'autorise.
          </p>
          <button className="plai-btn mt-3" type="button" disabled={consenting} onClick={handleConsent}>
            {consenting ? '...' : "J'ai compris, continuer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="plai-section">
      <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>
      <PhraseStrip boardId={board.id} strip={strip} onClear={() => setStrip([])} />
      <CategoryBoard items={items} onPick={handlePick} />
    </div>
  );
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommunicationView/CommunicationView.tsx
git commit -m "feat: vue élève — bandeau consentement RGPD + composition de phrase"
```

---

### Task 11: Modifier `Dashboard.tsx`

**Files:**
- Modify: `src/components/Dashboard.tsx` (fichier entier remplacé ci-dessous)

- [ ] **Step 1: Remplacer le contenu du fichier**

```tsx
// src/components/Dashboard.tsx
import { useEffect, useState } from 'react';
import { listRoutines } from '../lib/routines';
import { listCommunicationBoards, getOrCreateBoard } from '../lib/communication';
import type { Routine, CommunicationBoard } from '../lib/types';
import { FormField } from './FormField';

interface DashboardProps {
  onCreateNew: () => void;
  onOpenRoutine: (routineId: string) => void;
  onOpenCommunication: (boardId: string) => void;
}

const RENDU_LABELS: Record<Routine['type_rendu'], string> = {
  sequentiel: 'Séquentiel',
  emploi_du_temps: 'Emploi du temps',
  grille: 'Grille (TLA / mémo-consigne)',
};

export function Dashboard({ onCreateNew, onOpenRoutine, onOpenCommunication }: DashboardProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [boards, setBoards] = useState<CommunicationBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBoardCode, setNewBoardCode] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);

  useEffect(() => {
    Promise.all([listRoutines(), listCommunicationBoards()])
      .then(([routinesData, boardsData]) => {
        setRoutines(routinesData);
        setBoards(boardsData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateBoard = async () => {
    if (!newBoardCode.trim()) return;
    setCreatingBoard(true);
    try {
      const board = await getOrCreateBoard(newBoardCode.trim());
      setBoards((prev) => (prev.some((b) => b.id === board.id) ? prev : [board, ...prev]));
      setNewBoardCode('');
      onOpenCommunication(board.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création de la planche');
    } finally {
      setCreatingBoard(false);
    }
  };

  return (
    <div className="plai-section">
      <nav className="plai-nav">
        <div className="plai-nav-logo">
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 32 }} />
          <span className="font-serif text-lg">RituActif</span>
        </div>
      </nav>

      <button className="plai-btn" type="button" onClick={onCreateNew}>
        + Nouvelle planche
      </button>

      {error && <div className="plai-error">{error}</div>}
      {loading && <p>Chargement...</p>}
      {!loading && routines.length === 0 && (
        <div className="plai-empty">Aucune planche pour l'instant. Créez la première.</div>
      )}

      {routines.length > 0 && (
        <ul className="flex flex-col gap-2 mt-4">
          {routines.map((r) => (
            <li key={r.id} className="plai-card">
              <button
                type="button"
                onClick={() => onOpenRoutine(r.id)}
                style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                <strong>{r.nom}</strong>
                <span className="text-sm text-[var(--text3)] ml-2">{RENDU_LABELS[r.type_rendu]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="font-serif text-lg mt-8 mb-2">Communication</h2>
      <p className="text-xs text-[var(--text3)] mb-3">
        Une planche par élève, pour qu'il compose lui-même des phrases courtes en pictogrammes.
      </p>

      {!loading && boards.length === 0 && (
        <div className="plai-empty">Aucune planche de communication pour l'instant.</div>
      )}

      {boards.length > 0 && (
        <ul className="flex flex-col gap-2 mb-4">
          {boards.map((b) => (
            <li key={b.id} className="plai-card">
              <button
                type="button"
                onClick={() => onOpenCommunication(b.id)}
                style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                <strong>{b.rattachement_code_eleve}</strong>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 items-end">
        <FormField
          label="Code élève anonyme"
          help="Jamais de nom réel — un code anonyme suffit à retrouver la planche."
          style={{ marginBottom: 0, flex: 1 }}
        >
          <input
            className="plai-input"
            placeholder="ex: Élève-7"
            value={newBoardCode}
            onChange={(e) => setNewBoardCode(e.target.value)}
          />
        </FormField>
        <button
          className="plai-btn"
          type="button"
          disabled={!newBoardCode.trim() || creatingBoard}
          onClick={handleCreateBoard}
        >
          {creatingBoard ? 'Création...' : '+ Nouvelle planche de communication'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: aucune erreur (le nouvel appelant `App.tsx` n'est pas encore mis à jour — Task 12 — donc une erreur de props manquantes sur `<Dashboard>` est attendue à ce stade et sera résolue par la tâche suivante).

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: section Communication sur le tableau de bord (liste + création)"
```

---

### Task 12: Modifier `App.tsx` — brancher les nouvelles vues

**Files:**
- Modify: `src/App.tsx` (fichier entier remplacé ci-dessous)

- [ ] **Step 1: Remplacer le contenu du fichier**

```tsx
// src/App.tsx
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { RoutineEditor } from './components/RoutineEditor/RoutineEditor';
import { PlancheView } from './components/PlancheView/PlancheView';
import { CommunicationEditor } from './components/CommunicationEditor/CommunicationEditor';
import { CommunicationView } from './components/CommunicationView/CommunicationView';

type View =
  | { name: 'dashboard' }
  | { name: 'editor' }
  | { name: 'viewer'; routineId: string }
  | { name: 'communication-editor'; boardId: string }
  | { name: 'communication-viewer'; boardId: string };

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ name: 'dashboard' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (!session) return <Auth />;

  if (view.name === 'editor') {
    return (
      <RoutineEditor
        onDone={(routineId) => setView({ name: 'viewer', routineId })}
        onCancel={() => setView({ name: 'dashboard' })}
      />
    );
  }

  if (view.name === 'viewer') {
    return <PlancheView routineId={view.routineId} onBack={() => setView({ name: 'dashboard' })} />;
  }

  if (view.name === 'communication-editor') {
    return (
      <CommunicationEditor
        boardId={view.boardId}
        onOpenViewer={(boardId) => setView({ name: 'communication-viewer', boardId })}
        onBack={() => setView({ name: 'dashboard' })}
      />
    );
  }

  if (view.name === 'communication-viewer') {
    return <CommunicationView boardId={view.boardId} onBack={() => setView({ name: 'dashboard' })} />;
  }

  return (
    <Dashboard
      onCreateNew={() => setView({ name: 'editor' })}
      onOpenRoutine={(routineId) => setView({ name: 'viewer', routineId })}
      onOpenCommunication={(boardId) => setView({ name: 'communication-editor', boardId })}
    />
  );
}

export default App;
```

- [ ] **Step 2: Vérifier le typecheck et le build**

Run: `npm run typecheck && npx vite build`
Expected: aucune erreur (règle absolue du projet — jamais de push sans build local qui passe).

- [ ] **Step 3: Lancer la suite de tests complète**

Run: `npm test`
Expected: PASS — tous les tests existants (`arasaacMapper`, `falcParser`, `gridLayout`, `textVisibility`) + les nouveaux (`phrase.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: brancher les vues éditeur/élève du mode communication dans App.tsx"
```

---

### Task 13: Smoke test manuel avant déploiement

**Files:** aucun (vérification manuelle, pas de code)

- [ ] **Step 1: Lancer le serveur de dev**

Run: `npm run dev`
Expected: serveur démarré sans erreur (pas besoin de `vercel dev` ici — cette fonctionnalité n'appelle aucune fonction serverless Vercel `/api/*`, uniquement des edge functions Supabase déjà en prod, appelées directement via `supabase.functions.invoke`).

- [ ] **Step 2: Parcours complet, à vérifier un par un**

1. Se connecter, aller sur le Dashboard → section "Communication" visible, vide.
2. Créer une planche avec le code `Élève-Test-Communication` → doit ouvrir l'éditeur.
3. Dans l'éditeur, ajouter au moins un mot dans 2 catégories différentes (ex: "je" en Personnes, "boire" en Actions) — vérifier que le picto est bien validé humainement avant ajout (bouton "+ Ajouter" désactivé tant qu'aucun picto n'est choisi).
4. Cliquer "👁 Vue élève" → bandeau RGPD doit s'afficher, bloquant (pas de planche visible derrière).
5. Valider "J'ai compris, continuer" → planche visible, bandeau ne doit plus réapparaître si on quitte et revient sur cette même planche (revenir au Dashboard puis rouvrir la planche communication).
6. Taper "je" puis "boire" → chaque tap doit être lu individuellement, les deux pictos apparaissent dans la bande.
7. Cliquer "🔊 Dire la phrase" → la phrase complète "je boire" doit être lue, la bande se vide ensuite.
8. Vérifier en base (SQL editor Supabase) qu'une ligne existe dans `ritu_phrases_log` avec `phrase_texte = 'je boire'`.
9. Cliquer "✕ Effacer" après avoir tapé un mot sans cliquer "Dire" → la bande se vide, vérifier qu'aucune nouvelle ligne n'a été ajoutée à `ritu_phrases_log`.
10. Se connecter avec un deuxième compte enseignant (ou vérifier via SQL avec un autre `user_id`) → confirmer que la planche de communication de `Élève-Test-Communication` n'est pas visible (RLS cross-utilisateur).

Expected: les 10 points passent sans erreur console.

- [ ] **Step 3: Nettoyer les données de test**

Dans le SQL editor Supabase :
```sql
delete from public.ritu_communication_boards where rattachement_code_eleve = 'Élève-Test-Communication';
```
Expected: la suppression cascade automatiquement vers `ritu_communication_items` et `ritu_phrases_log` (contraintes `on delete cascade`).

---

## Self-review du plan

**Couverture de la spec** : sections 4 (catégories) → Task 3 ; section 5 (modèle de données) → Task 1-2 ; section 6 (composants) → Tasks 6-12 ; section 7 (flux d'interaction) → Tasks 8-10 ; section 8 (RGPD) → Task 1 (purge) + Task 10 (bandeau) ; section 9 (edge cases) → gérés inline (TTS silencieux existant, log best-effort dans `PhraseStrip.tsx`, création à la volée dans `getOrCreateBoard`) ; section 10 (tests) → Task 4 (test pur) + Task 13 (smoke test manuel).

**Déviation notée** : purge en SQL pur plutôt qu'edge function (voir note en tête de plan) — comportement identique, à valider avant exécution.

**Cohérence des types** : `CommunicationCategory`, `CommunicationBoard`, `CommunicationItem` définis une seule fois (Task 2) et réutilisés tels quels dans toutes les tâches suivantes — vérifié.

---

**Plan complet et sauvegardé dans `docs/superpowers/plans/2026-07-13-communication-expressive.md`. Deux options d'exécution :**

**1. Subagent-Driven (recommandé)** — un subagent frais par tâche, revue entre chaque tâche, itération rapide

**2. Exécution inline** — exécution des tâches dans cette session avec executing-plans, par lots avec points de contrôle

**Quelle approche ?**
