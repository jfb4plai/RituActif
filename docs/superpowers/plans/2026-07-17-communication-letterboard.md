# Communication : mode Letterboard + défaut classe/élève — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un mode Letterboard à la fonctionnalité Communication existante de RituActif, avec un défaut de mode/réglages au niveau "classe" (par enseignant), une bascule 1 clic par élève, un mécanisme de maintien prolongé partagé entre les deux modes, et le réordonnancement des pictos.

**Architecture:** Extension de l'existant, pas de reconstruction. Nouvelle table `ritu_communication_defaults` (1 ligne par enseignant) + 3 colonnes optionnelles sur `ritu_communication_boards` (override par élève). Logique pure (résolution mode/réglages, contrôleur de maintien prolongé, opérations Letterboard, réordonnancement) dans des modules `src/lib/*.ts` testés en isolation (vitest, pas de DOM). Les composants React consomment cette logique mais ne sont pas testés unitairement — cohérent avec le reste du projet (`gridLayout.ts`/`phrase.ts` testés, composants non testés).

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (Postgres + RLS), vitest, Web Speech API (`speak()` existant), Pointer Events pour le maintien prolongé.

Référence : [docs/superpowers/specs/2026-07-17-communication-letterboard-design.md](../specs/2026-07-17-communication-letterboard-design.md)

---

## Task 1: Migration Supabase — table des défauts + colonnes de bascule

**Files:**
- Create: `supabase/migrations/20260717000000_add_communication_letterboard_defaults.sql`

- [ ] **Step 1: Écrire la migration**

```sql
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
```

- [ ] **Step 2: Appliquer la migration en local et vérifier**

Run: `npx supabase db push`
Expected: la migration s'applique sans erreur ; `npx supabase db diff` ne montre plus d'écart pour ces objets.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260717000000_add_communication_letterboard_defaults.sql
git commit -m "feat(db): table ritu_communication_defaults + colonnes mode/hold sur les planches"
```

---

## Task 2: Types TypeScript

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Ajouter `CommunicationMode`, `CommunicationDefaults`, étendre `CommunicationBoard`**

Remplacer le contenu de `src/lib/types.ts` à partir de la ligne 36 (bloc Communication) par :

```typescript
export type CommunicationCategory = 'personnes' | 'actions' | 'descriptifs' | 'social' | 'objets' | 'sentiments';
export type CommunicationMode = 'pictogrammes' | 'letterboard';

export interface CommunicationBoard {
  id: string;
  user_id: string;
  rattachement_code_eleve: string;
  consentement_valide_at: string | null;
  created_at: string;
  mode: CommunicationMode | null;
  hold_ms: number | null;
  select_on_release: boolean | null;
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

export interface CommunicationDefaults {
  user_id: string;
  mode_defaut: CommunicationMode;
  hold_ms: number;
  select_on_release: boolean;
  updated_at: string;
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npm run typecheck`
Expected: erreurs dans `src/lib/communication.ts` et les composants Communication (types manquants sur les objets retournés) — normal, corrigé dans les tâches suivantes. Vérifier qu'il n'y a **pas** d'erreur de syntaxe dans `types.ts` lui-même (`npx tsc --noEmit -p tsconfig.app.json src/lib/types.ts` si besoin d'isoler).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): CommunicationMode, CommunicationDefaults, bascule par planche"
```

---

## Task 3: Réordonnancement des pictos (logique pure)

**Files:**
- Create: `src/lib/reorder.ts`
- Test: `src/lib/reorder.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// src/lib/reorder.test.ts
import { describe, it, expect } from 'vitest';
import { moveItem } from './reorder';
import type { CommunicationItem } from './types';

function item(id: string, ordre: number): CommunicationItem {
  return {
    id,
    board_id: 'board-1',
    categorie: 'personnes',
    libelle: id,
    picto_url: `https://example.com/${id}.png`,
    picto_source: 'arasaac',
    ordre,
  };
}

describe('moveItem', () => {
  it('swaps ordre with the previous item when moving up', () => {
    const items = [item('a', 0), item('b', 1), item('c', 2)];
    const result = moveItem(items, 'b', 'up');
    expect(result.find((i) => i.id === 'a')?.ordre).toBe(1);
    expect(result.find((i) => i.id === 'b')?.ordre).toBe(0);
    expect(result.find((i) => i.id === 'c')?.ordre).toBe(2);
  });

  it('swaps ordre with the next item when moving down', () => {
    const items = [item('a', 0), item('b', 1), item('c', 2)];
    const result = moveItem(items, 'b', 'down');
    expect(result.find((i) => i.id === 'b')?.ordre).toBe(2);
    expect(result.find((i) => i.id === 'c')?.ordre).toBe(1);
  });

  it('is a no-op when moving the first item up', () => {
    const items = [item('a', 0), item('b', 1)];
    const result = moveItem(items, 'a', 'up');
    expect(result.find((i) => i.id === 'a')?.ordre).toBe(0);
    expect(result.find((i) => i.id === 'b')?.ordre).toBe(1);
  });

  it('is a no-op when moving the last item down', () => {
    const items = [item('a', 0), item('b', 1)];
    const result = moveItem(items, 'b', 'down');
    expect(result.find((i) => i.id === 'a')?.ordre).toBe(0);
    expect(result.find((i) => i.id === 'b')?.ordre).toBe(1);
  });

  it('is a no-op for an unknown item id', () => {
    const items = [item('a', 0), item('b', 1)];
    const result = moveItem(items, 'missing', 'up');
    expect(result).toEqual(items);
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/lib/reorder.test.ts`
Expected: FAIL — `Cannot find module './reorder'`

- [ ] **Step 3: Implémenter `moveItem`**

```typescript
// src/lib/reorder.ts
import type { CommunicationItem } from './types';

export function moveItem(
  itemsInCategory: CommunicationItem[],
  itemId: string,
  direction: 'up' | 'down'
): CommunicationItem[] {
  const sorted = [...itemsInCategory].sort((a, b) => a.ordre - b.ordre);
  const index = sorted.findIndex((i) => i.id === itemId);
  if (index === -1) return itemsInCategory;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return itemsInCategory;

  const current = sorted[index];
  const target = sorted[targetIndex];
  const currentOrdre = current.ordre;
  const targetOrdre = target.ordre;

  return sorted.map((item) => {
    if (item.id === current.id) return { ...item, ordre: targetOrdre };
    if (item.id === target.id) return { ...item, ordre: currentOrdre };
    return item;
  });
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx vitest run src/lib/reorder.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/reorder.ts src/lib/reorder.test.ts
git commit -m "feat: logique pure de réordonnancement des pictos par catégorie"
```

---

## Task 4: Résolution mode/réglages (planche → défaut classe)

**Files:**
- Create: `src/lib/communicationSettings.ts`
- Test: `src/lib/communicationSettings.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// src/lib/communicationSettings.test.ts
import { describe, it, expect } from 'vitest';
import { resolveMode, resolveHoldConfig } from './communicationSettings';

describe('resolveMode', () => {
  it('uses the board override when set', () => {
    expect(resolveMode({ mode: 'letterboard' }, { mode_defaut: 'pictogrammes' })).toBe('letterboard');
  });

  it('falls back to the classe default when the board has no override', () => {
    expect(resolveMode({ mode: null }, { mode_defaut: 'letterboard' })).toBe('letterboard');
  });

  it('falls back to pictogrammes when there is no classe default row', () => {
    expect(resolveMode({ mode: null }, null)).toBe('pictogrammes');
  });
});

describe('resolveHoldConfig', () => {
  it('uses the board override when set', () => {
    const result = resolveHoldConfig(
      { hold_ms: 800, select_on_release: true },
      { hold_ms: 500, select_on_release: false }
    );
    expect(result).toEqual({ holdMs: 800, selectOnRelease: true });
  });

  it('falls back to the classe default per field independently', () => {
    const result = resolveHoldConfig(
      { hold_ms: null, select_on_release: true },
      { hold_ms: 700, select_on_release: false }
    );
    expect(result).toEqual({ holdMs: 700, selectOnRelease: true });
  });

  it('falls back to 500ms / faux when there is no classe default row', () => {
    const result = resolveHoldConfig({ hold_ms: null, select_on_release: null }, null);
    expect(result).toEqual({ holdMs: 500, selectOnRelease: false });
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/lib/communicationSettings.test.ts`
Expected: FAIL — `Cannot find module './communicationSettings'`

- [ ] **Step 3: Implémenter la résolution**

```typescript
// src/lib/communicationSettings.ts
import type { CommunicationBoard, CommunicationDefaults, CommunicationMode } from './types';

export interface HoldConfig {
  holdMs: number;
  selectOnRelease: boolean;
}

export function resolveMode(
  board: Pick<CommunicationBoard, 'mode'>,
  defaults: Pick<CommunicationDefaults, 'mode_defaut'> | null
): CommunicationMode {
  return board.mode ?? defaults?.mode_defaut ?? 'pictogrammes';
}

export function resolveHoldConfig(
  board: Pick<CommunicationBoard, 'hold_ms' | 'select_on_release'>,
  defaults: Pick<CommunicationDefaults, 'hold_ms' | 'select_on_release'> | null
): HoldConfig {
  return {
    holdMs: board.hold_ms ?? defaults?.hold_ms ?? 500,
    selectOnRelease: board.select_on_release ?? defaults?.select_on_release ?? false,
  };
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx vitest run src/lib/communicationSettings.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/communicationSettings.ts src/lib/communicationSettings.test.ts
git commit -m "feat: résolution mode/réglages de maintien (planche > défaut classe > défaut absolu)"
```

---

## Task 5: Contrôleur de maintien prolongé (logique pure)

**Files:**
- Create: `src/lib/holdToSelect.ts`
- Test: `src/lib/holdToSelect.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// src/lib/holdToSelect.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHoldSelectController } from './holdToSelect';

describe('createHoldSelectController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirms after holdMs when the pointer stays down (mode maintien)', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: false }, onConfirm);

    controller.onPointerDown();
    vi.advanceTimersByTime(499);
    expect(onConfirm).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not confirm if released before holdMs (mode maintien)', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: false }, onConfirm);

    controller.onPointerDown();
    vi.advanceTimersByTime(200);
    controller.onPointerUp();
    vi.advanceTimersByTime(1000);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels a pending hold when the pointer leaves', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: false }, onConfirm);

    controller.onPointerDown();
    vi.advanceTimersByTime(200);
    controller.onPointerLeave();
    vi.advanceTimersByTime(1000);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms immediately on release regardless of duration (mode relâchement)', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: true }, onConfirm);

    controller.onPointerDown();
    vi.advanceTimersByTime(10);
    controller.onPointerUp();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not confirm on release without a prior pointerdown', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: true }, onConfirm);

    controller.onPointerUp();

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('dispose cancels any pending timer', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: false }, onConfirm);

    controller.onPointerDown();
    controller.dispose();
    vi.advanceTimersByTime(1000);

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/lib/holdToSelect.test.ts`
Expected: FAIL — `Cannot find module './holdToSelect'`

- [ ] **Step 3: Implémenter le contrôleur**

```typescript
// src/lib/holdToSelect.ts
import type { HoldConfig } from './communicationSettings';

export interface HoldSelectController {
  onPointerDown(): void;
  onPointerUp(): void;
  onPointerLeave(): void;
  dispose(): void;
}

export function createHoldSelectController(
  config: HoldConfig,
  onConfirm: () => void
): HoldSelectController {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pressed = false;

  const cancelTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    onPointerDown() {
      pressed = true;
      if (config.selectOnRelease) return;
      timer = setTimeout(() => {
        if (pressed) onConfirm();
        timer = null;
      }, config.holdMs);
    },
    onPointerUp() {
      if (config.selectOnRelease && pressed) onConfirm();
      pressed = false;
      cancelTimer();
    },
    onPointerLeave() {
      pressed = false;
      cancelTimer();
    },
    dispose() {
      pressed = false;
      cancelTimer();
    },
  };
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx vitest run src/lib/holdToSelect.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/holdToSelect.ts src/lib/holdToSelect.test.ts
git commit -m "feat: contrôleur pur de maintien prolongé (GAIA G10)"
```

---

## Task 6: Alphabet et opérations texte du Letterboard (logique pure)

**Files:**
- Create: `src/lib/letterboard.ts`
- Test: `src/lib/letterboard.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// src/lib/letterboard.test.ts
import { describe, it, expect } from 'vitest';
import { ALPHABET_FR, appendChar, backspace, applyCase } from './letterboard';

describe('ALPHABET_FR', () => {
  it('contains the 26 base letters plus the French accented characters', () => {
    expect(ALPHABET_FR).toHaveLength(37);
    expect(ALPHABET_FR).toContain('a');
    expect(ALPHABET_FR).toContain('z');
    expect(ALPHABET_FR).toContain('é');
    expect(ALPHABET_FR).toContain('ï');
  });
});

describe('appendChar', () => {
  it('appends a character to the current message', () => {
    expect(appendChar('bonjou', 'r')).toBe('bonjour');
  });

  it('appends to an empty message', () => {
    expect(appendChar('', 'a')).toBe('a');
  });
});

describe('backspace', () => {
  it('removes the last character', () => {
    expect(backspace('bonjour')).toBe('bonjou');
  });

  it('is a no-op on an empty message', () => {
    expect(backspace('')).toBe('');
  });
});

describe('applyCase', () => {
  it('uppercases including accented characters', () => {
    expect(applyCase('élève', true)).toBe('ÉLÈVE');
  });

  it('lowercases including accented characters', () => {
    expect(applyCase('ÉLÈVE', false)).toBe('élève');
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/lib/letterboard.test.ts`
Expected: FAIL — `Cannot find module './letterboard'`

- [ ] **Step 3: Implémenter**

```typescript
// src/lib/letterboard.ts
export const ALPHABET_FR: string[] = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'é', 'è', 'à', 'ç', 'ù', 'â', 'ê', 'î', 'ô', 'û', 'ï',
];

export function appendChar(message: string, char: string): string {
  return message + char;
}

export function backspace(message: string): string {
  return message.slice(0, -1);
}

export function applyCase(message: string, uppercase: boolean): string {
  return uppercase ? message.toLocaleUpperCase('fr-FR') : message.toLocaleLowerCase('fr-FR');
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx vitest run src/lib/letterboard.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/letterboard.ts src/lib/letterboard.test.ts
git commit -m "feat: alphabet français et opérations texte pures du Letterboard"
```

---

## Task 7: Accès Supabase — défauts classe, bascule par planche, persistance du réordonnancement

**Files:**
- Modify: `src/lib/communication.ts`

- [ ] **Step 1: Ajouter les fonctions à la fin de `src/lib/communication.ts`**

```typescript
// à ajouter à la fin de src/lib/communication.ts
import { moveItem } from './reorder';
import type { CommunicationDefaults, CommunicationMode } from './types';

export async function getDefaults(): Promise<CommunicationDefaults | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Utilisateur non authentifié');

  const { data, error } = await supabase
    .from('ritu_communication_defaults')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as CommunicationDefaults | null;
}

export async function upsertDefaults(params: {
  modeDefaut: CommunicationMode;
  holdMs: number;
  selectOnRelease: boolean;
}): Promise<CommunicationDefaults> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Utilisateur non authentifié');

  const { data, error } = await supabase
    .from('ritu_communication_defaults')
    .upsert(
      {
        user_id: userData.user.id,
        mode_defaut: params.modeDefaut,
        hold_ms: params.holdMs,
        select_on_release: params.selectOnRelease,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as CommunicationDefaults;
}

export async function updateBoardSettings(
  boardId: string,
  params: { mode: CommunicationMode | null; holdMs: number | null; selectOnRelease: boolean | null }
): Promise<CommunicationBoard> {
  const { data, error } = await supabase
    .from('ritu_communication_boards')
    .update({ mode: params.mode, hold_ms: params.holdMs, select_on_release: params.selectOnRelease })
    .eq('id', boardId)
    .select()
    .single();
  if (error) throw error;
  return data as CommunicationBoard;
}

export async function persistReorder(
  itemsInCategory: CommunicationItem[],
  itemId: string,
  direction: 'up' | 'down'
): Promise<CommunicationItem[]> {
  const reordered = moveItem(itemsInCategory, itemId, direction);
  const changed = reordered.filter((item) => {
    const before = itemsInCategory.find((i) => i.id === item.id);
    return before && before.ordre !== item.ordre;
  });

  await Promise.all(
    changed.map((item) =>
      supabase.from('ritu_communication_items').update({ ordre: item.ordre }).eq('id', item.id)
    )
  );

  return reordered;
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run typecheck`
Expected: aucune erreur restante dans `src/lib/communication.ts`. Des erreurs peuvent subsister dans les composants — corrigées dans les tâches suivantes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/communication.ts
git commit -m "feat: accès Supabase pour défauts classe, bascule par planche et réordonnancement"
```

---

## Task 8: Hook React de maintien prolongé (wrapper fin, non testé)

**Files:**
- Create: `src/hooks/useHoldToSelect.ts`

- [ ] **Step 1: Implémenter le hook**

```typescript
// src/hooks/useHoldToSelect.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { createHoldSelectController } from '../lib/holdToSelect';
import type { HoldConfig } from '../lib/communicationSettings';

export function useHoldToSelect(config: HoldConfig, onConfirm: () => void) {
  const [pressing, setPressing] = useState(false);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const controller = useMemo(
    () =>
      createHoldSelectController(config, () => {
        setPressing(false);
        onConfirmRef.current();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.holdMs, config.selectOnRelease]
  );

  useEffect(() => () => controller.dispose(), [controller]);

  return {
    pressing,
    onPointerDown: () => {
      setPressing(true);
      controller.onPointerDown();
    },
    onPointerUp: () => {
      controller.onPointerUp();
      setPressing(false);
    },
    onPointerLeave: () => {
      controller.onPointerLeave();
      setPressing(false);
    },
  };
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run typecheck`
Expected: aucune erreur sur ce fichier.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHoldToSelect.ts
git commit -m "feat: hook React fin pour le maintien prolongé"
```

---

## Task 9: `CategoryBoard.tsx` — bascule vers le maintien prolongé

**Files:**
- Modify: `src/components/CommunicationView/CategoryBoard.tsx`

- [ ] **Step 1: Remplacer le fichier**

```typescript
// src/components/CommunicationView/CategoryBoard.tsx
import { useState } from 'react';
import { speak } from '../../lib/tts';
import { CATEGORY_ORDER, CATEGORY_META } from '../../lib/categories';
import { useHoldToSelect } from '../../hooks/useHoldToSelect';
import type { CommunicationItem, CommunicationCategory } from '../../lib/types';
import type { HoldConfig } from '../../lib/communicationSettings';

interface CategoryBoardProps {
  items: CommunicationItem[];
  hold: HoldConfig;
  onPick: (item: CommunicationItem) => void;
}

interface PictoButtonProps {
  item: CommunicationItem;
  color: string;
  hold: HoldConfig;
  onPick: (item: CommunicationItem) => void;
}

function PictoButton({ item, color, hold, onPick }: PictoButtonProps) {
  const { pressing, onPointerDown, onPointerUp, onPointerLeave } = useHoldToSelect(hold, () => {
    speak(item.libelle);
    onPick(item);
  });

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      aria-label={`Dire : ${item.libelle}`}
      style={{
        border: `2px solid ${color}`,
        borderRadius: 12,
        padding: 8,
        background: pressing ? color : 'var(--surface)',
        cursor: 'pointer',
        transform: pressing ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 100ms, background 100ms',
      }}
    >
      <img src={item.picto_url} alt="" style={{ width: 96, height: 96, objectFit: 'contain' }} />
      <div className="text-sm mt-1">{item.libelle}</div>
    </button>
  );
}

export function CategoryBoard({ items, hold, onPick }: CategoryBoardProps) {
  const [activeCategory, setActiveCategory] = useState<CommunicationCategory>('personnes');
  const itemsInCategory = items.filter((i) => i.categorie === activeCategory);

  return (
    <div className="plai-card mt-3">
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={activeCategory === cat}
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
            <PictoButton
              key={item.id}
              item={item}
              color={CATEGORY_META[activeCategory].color}
              hold={hold}
              onPick={onPick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run typecheck`
Expected: erreur attendue dans `CommunicationView.tsx` (le prop `hold` n'est pas encore passé) — corrigée à la Task 11.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommunicationView/CategoryBoard.tsx
git commit -m "feat: maintien prolongé sur le mode Pictogrammes"
```

---

## Task 10: `LetterboardView.tsx` — nouveau composant

**Files:**
- Create: `src/components/CommunicationView/LetterboardView.tsx`

- [ ] **Step 1: Implémenter le composant**

```typescript
// src/components/CommunicationView/LetterboardView.tsx
import { useState } from 'react';
import { speak } from '../../lib/tts';
import { recordPhrase } from '../../lib/communication';
import { ALPHABET_FR, appendChar, backspace, applyCase } from '../../lib/letterboard';
import { useHoldToSelect } from '../../hooks/useHoldToSelect';
import type { HoldConfig } from '../../lib/communicationSettings';

interface LetterboardViewProps {
  boardId: string;
  hold: HoldConfig;
}

interface LetterKeyProps {
  char: string;
  label: string;
  hold: HoldConfig;
  onConfirm: () => void;
}

function LetterKey({ char, label, hold, onConfirm }: LetterKeyProps) {
  const { pressing, onPointerDown, onPointerUp, onPointerLeave } = useHoldToSelect(hold, onConfirm);

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      aria-label={char === ' ' ? 'Espace' : `Lettre ${char}`}
      style={{
        border: '2px solid var(--border)',
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 44,
        fontSize: 20,
        background: pressing ? 'var(--teal)' : 'var(--surface)',
        color: pressing ? '#fff' : 'inherit',
        cursor: 'pointer',
        transform: pressing ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 100ms, background 100ms',
      }}
    >
      {label}
    </button>
  );
}

export function LetterboardView({ boardId, hold }: LetterboardViewProps) {
  const [message, setMessage] = useState('');
  const [uppercase, setUppercase] = useState(true);

  const handleKey = (char: string) => {
    setMessage((prev) => appendChar(prev, char));
  };

  const handleBackspace = () => {
    setMessage((prev) => backspace(prev));
  };

  const handleClearAll = () => {
    setMessage('');
  };

  const handleSpeak = () => {
    if (!message) return;
    if (!speak(message)) return;
    recordPhrase(boardId, message).catch((e) =>
      console.error("Échec de l'enregistrement de la phrase", e)
    );
    setMessage('');
  };

  const displayedMessage = applyCase(message, uppercase);

  return (
    <div className="plai-card mt-3">
      <div className="flex items-center gap-2 flex-wrap mb-3" style={{ minHeight: 60 }}>
        <span className="text-2xl flex-1" aria-live="polite">
          {displayedMessage || <span className="text-sm text-[var(--text3)]">Composez un mot...</span>}
        </span>
        <button
          type="button"
          className="plai-btn-ghost"
          onClick={() => setUppercase((v) => !v)}
          aria-label="Basculer majuscules/minuscules"
          style={{ padding: '8px 14px', fontSize: 14 }}
        >
          {uppercase ? 'AB → ab' : 'ab → AB'}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {ALPHABET_FR.map((char) => (
          <LetterKey
            key={char}
            char={char}
            label={applyCase(char, uppercase)}
            hold={hold}
            onConfirm={() => handleKey(char)}
          />
        ))}
        <LetterKey char=" " label="␣ Espace" hold={hold} onConfirm={() => handleKey(' ')} />
      </div>

      <div className="flex gap-2 ml-auto">
        <button
          type="button"
          className="plai-btn-ghost"
          onClick={handleBackspace}
          disabled={message.length === 0}
          aria-label="Effacer la dernière lettre"
          style={{ padding: '12px 20px', fontSize: 16 }}
        >
          ⌫ Effacer la lettre
        </button>
        <button
          type="button"
          className="plai-btn-ghost"
          onClick={handleClearAll}
          disabled={message.length === 0}
          aria-label="Effacer tout"
          style={{ padding: '12px 20px', fontSize: 16 }}
        >
          ✕ Tout effacer
        </button>
        <button
          type="button"
          className="plai-btn"
          onClick={handleSpeak}
          disabled={message.length === 0}
          aria-label="Dire le mot"
          style={{ padding: '12px 20px', fontSize: 16 }}
        >
          🔊 Dire
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run typecheck`
Expected: aucune erreur sur ce fichier.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommunicationView/LetterboardView.tsx
git commit -m "feat: mode Letterboard (alphabet français, maintien prolongé, TTS)"
```

---

## Task 11: `CommunicationView.tsx` — brancher selon le mode résolu

**Files:**
- Modify: `src/components/CommunicationView/CommunicationView.tsx`

- [ ] **Step 1: Remplacer le fichier**

```typescript
// src/components/CommunicationView/CommunicationView.tsx
import { useEffect, useState } from 'react';
import { getBoardWithItems, markConsentValidated, getDefaults } from '../../lib/communication';
import { resolveMode, resolveHoldConfig } from '../../lib/communicationSettings';
import { MAX_PHRASE_LENGTH } from '../../lib/phrase';
import type { CommunicationBoard, CommunicationItem, CommunicationDefaults } from '../../lib/types';
import { CategoryBoard } from './CategoryBoard';
import { PhraseStrip } from './PhraseStrip';
import { LetterboardView } from './LetterboardView';

interface CommunicationViewProps {
  boardId: string;
  onBack: () => void;
}

export function CommunicationView({ boardId, onBack }: CommunicationViewProps) {
  const [board, setBoard] = useState<CommunicationBoard | null>(null);
  const [items, setItems] = useState<CommunicationItem[]>([]);
  const [defaults, setDefaults] = useState<CommunicationDefaults | null>(null);
  const [strip, setStrip] = useState<CommunicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [consenting, setConsenting] = useState(false);

  useEffect(() => {
    setStrip([]);
    Promise.all([getBoardWithItems(boardId), getDefaults()])
      .then(([{ board, items }, defaults]) => {
        setBoard(board);
        setItems(items);
        setDefaults(defaults);
      })
      .catch((e) => {
        console.error('Échec de chargement de la planche de communication', e);
        setBoard(null);
      })
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

  if (loading) {
    return (
      <div className="plai-section">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
          ← Retour
        </button>
        <p aria-live="polite">Chargement...</p>
      </div>
    );
  }
  if (!board) {
    return (
      <div className="plai-section">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
          ← Retour
        </button>
        <p aria-live="polite">Planche introuvable.</p>
      </div>
    );
  }

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

  const mode = resolveMode(board, defaults);
  const hold = resolveHoldConfig(board, defaults);

  return (
    <div className="plai-section">
      <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>
      {mode === 'pictogrammes' ? (
        <>
          <PhraseStrip boardId={board.id} strip={strip} onClear={() => setStrip([])} />
          <CategoryBoard items={items} hold={hold} onPick={handlePick} />
        </>
      ) : (
        <LetterboardView boardId={board.id} hold={hold} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run typecheck`
Expected: PASS, aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommunicationView/CommunicationView.tsx
git commit -m "feat: CommunicationView bascule entre Pictogrammes et Letterboard selon le mode résolu"
```

---

## Task 12: `CommunicationEditor.tsx` — réordonnancement + réglages par élève

**Files:**
- Modify: `src/components/CommunicationEditor/CommunicationEditor.tsx`

- [ ] **Step 1: Remplacer le fichier**

```typescript
// src/components/CommunicationEditor/CommunicationEditor.tsx
import { useEffect, useState } from 'react';
import {
  getBoardWithItems,
  removeCommunicationItem,
  persistReorder,
  updateBoardSettings,
  getDefaults,
} from '../../lib/communication';
import { CATEGORY_ORDER, CATEGORY_META } from '../../lib/categories';
import type {
  CommunicationBoard,
  CommunicationItem,
  CommunicationCategory,
  CommunicationDefaults,
  CommunicationMode,
} from '../../lib/types';
import { NewItemForm } from './NewItemForm';
import { FormField } from '../FormField';

interface CommunicationEditorProps {
  boardId: string;
  onOpenViewer: (boardId: string) => void;
  onBack: () => void;
}

export function CommunicationEditor({ boardId, onOpenViewer, onBack }: CommunicationEditorProps) {
  const [board, setBoard] = useState<CommunicationBoard | null>(null);
  const [items, setItems] = useState<CommunicationItem[]>([]);
  const [defaults, setDefaults] = useState<CommunicationDefaults | null>(null);
  const [activeCategory, setActiveCategory] = useState<CommunicationCategory>('personnes');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    Promise.all([getBoardWithItems(boardId), getDefaults()])
      .then(([{ board, items }, defaults]) => {
        setBoard(board);
        setItems(items);
        setDefaults(defaults);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [boardId]);

  const handleRemove = async (itemId: string, libelle: string) => {
    if (!window.confirm(`Supprimer le mot "${libelle}" ?`)) return;
    setError(null);
    try {
      await removeCommunicationItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    }
  };

  const handleMove = async (itemId: string, direction: 'up' | 'down') => {
    const itemsInCategory = items.filter((i) => i.categorie === activeCategory);
    const reordered = await persistReorder(itemsInCategory, itemId, direction);
    setItems((prev) => [...prev.filter((i) => i.categorie !== activeCategory), ...reordered]);
  };

  const handleModeChange = async (mode: CommunicationMode | 'defaut') => {
    if (!board) return;
    setSavingSettings(true);
    try {
      const updated = await updateBoardSettings(board.id, {
        mode: mode === 'defaut' ? null : mode,
        holdMs: board.hold_ms,
        selectOnRelease: board.select_on_release,
      });
      setBoard(updated);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="plai-section">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
          ← Retour
        </button>
        <p aria-live="polite">Chargement...</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="plai-section">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
          ← Retour
        </button>
        <p role="alert">{loadError}</p>
      </div>
    );
  }
  if (!board) {
    return (
      <div className="plai-section">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
          ← Retour
        </button>
        <p aria-live="polite">Planche introuvable.</p>
      </div>
    );
  }

  const itemsInCategory = items
    .filter((i) => i.categorie === activeCategory)
    .sort((a, b) => a.ordre - b.ordre);
  const nextOrdre = itemsInCategory.length === 0 ? 0 : Math.max(...itemsInCategory.map((i) => i.ordre)) + 1;
  const modeDefautLabel = defaults?.mode_defaut === 'letterboard' ? 'Letterboard' : 'Pictogrammes';

  return (
    <div className="plai-section">
      <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>

      <div className="plai-card mb-4">
        <FormField
          label="Mode de communication pour cet élève"
          help={`Par défaut, cette planche suit le réglage classe (actuellement : ${modeDefautLabel}). Vous pouvez la basculer pour cet élève sans justification.`}
        >
          <select
            className="plai-input"
            value={board.mode ?? 'defaut'}
            disabled={savingSettings}
            onChange={(e) => handleModeChange(e.target.value as CommunicationMode | 'defaut')}
          >
            <option value="defaut">Suivre le défaut classe ({modeDefautLabel})</option>
            <option value="pictogrammes">Pictogrammes</option>
            <option value="letterboard">Letterboard</option>
          </select>
        </FormField>
      </div>

      <div className="plai-card">
        <h1 className="font-serif text-xl mb-1">Communication — {board.rattachement_code_eleve}</h1>
        <p className="text-xs text-[var(--text3)] mb-4">
          Ajoutez des pictos dans chaque catégorie. L'élève les utilisera pour composer des phrases courtes.
        </p>

        <div className="flex gap-2 flex-wrap mb-4">
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={activeCategory === cat}
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
            {itemsInCategory.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2">
                <img src={item.picto_url} alt={item.libelle} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                <span>{item.libelle}</span>
                <button
                  type="button"
                  onClick={() => handleMove(item.id, 'up')}
                  disabled={index === 0}
                  aria-label={`Déplacer "${item.libelle}" vers le haut`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(item.id, 'down')}
                  disabled={index === itemsInCategory.length - 1}
                  aria-label={`Déplacer "${item.libelle}" vers le bas`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id, item.libelle)}
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

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run typecheck`
Expected: PASS, aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommunicationEditor/CommunicationEditor.tsx
git commit -m "feat: réordonnancement des pictos et bascule de mode par élève dans l'éditeur"
```

---

## Task 13: Écran "Défaut classe" + intégration Dashboard/App

**Files:**
- Create: `src/components/CommunicationDefaults.tsx`
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Créer l'écran de réglage classe**

```typescript
// src/components/CommunicationDefaults.tsx
import { useEffect, useState } from 'react';
import { getDefaults, upsertDefaults } from '../lib/communication';
import { FormField } from './FormField';
import type { CommunicationMode } from '../lib/types';

interface CommunicationDefaultsProps {
  onBack: () => void;
}

export function CommunicationDefaults({ onBack }: CommunicationDefaultsProps) {
  const [modeDefaut, setModeDefaut] = useState<CommunicationMode>('pictogrammes');
  const [holdMs, setHoldMs] = useState(500);
  const [selectOnRelease, setSelectOnRelease] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDefaults()
      .then((defaults) => {
        if (defaults) {
          setModeDefaut(defaults.mode_defaut);
          setHoldMs(defaults.hold_ms);
          setSelectOnRelease(defaults.select_on_release);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      await upsertDefaults({ modeDefaut, holdMs, selectOnRelease });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="plai-section">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
          ← Retour
        </button>
        <p aria-live="polite">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="plai-section">
      <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>

      <div className="plai-card">
        <h1 className="font-serif text-xl mb-1">Défaut classe — Communication</h1>
        <p className="text-xs text-[var(--text3)] mb-4">
          Ce réglage s'applique à toutes vos planches de communication qui n'ont pas de réglage
          individuel. Une planche par élève peut toujours être basculée séparément, sans avoir à
          justifier pourquoi.
        </p>

        {error && <div className="plai-error">{error}</div>}

        <FormField
          label="Mode par défaut"
          help="Pictogrammes pour les élèves qui ne décodent pas encore l'écrit ; Letterboard pour ceux qui épellent déjà. Le choix se fait sur le profil de l'enfant, jamais sur son année scolaire."
        >
          <select
            className="plai-input"
            value={modeDefaut}
            onChange={(e) => setModeDefaut(e.target.value as CommunicationMode)}
          >
            <option value="pictogrammes">Pictogrammes</option>
            <option value="letterboard">Letterboard</option>
          </select>
        </FormField>

        <FormField
          label="Durée de maintien avant validation (ms)"
          help="Temps de pression nécessaire avant qu'un picto ou une lettre soit validé — évite les activations accidentelles. 500ms convient à la plupart des élèves ; augmentez pour un geste plus lent, diminuez pour un geste plus rapide."
        >
          <input
            className="plai-input"
            type="number"
            min={100}
            max={2000}
            step={50}
            value={holdMs}
            onChange={(e) => setHoldMs(Number(e.target.value))}
          />
        </FormField>

        <FormField
          label="Valider au relâchement plutôt qu'au maintien"
          help="À cocher pour les élèves ayant des difficultés motrices à maintenir une pression : la validation se fait dès qu'ils relâchent, quelle que soit la durée."
        >
          <input
            type="checkbox"
            checked={selectOnRelease}
            onChange={(e) => setSelectOnRelease(e.target.checked)}
          />
        </FormField>

        <button className="plai-btn mt-2" type="button" disabled={saving} onClick={handleSave}>
          {saving ? 'Enregistrement...' : 'Enregistrer le défaut classe'}
        </button>
        {saved && <span className="text-sm ml-3">Enregistré.</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ajouter le lien depuis le Dashboard**

Dans `src/components/Dashboard.tsx`, modifier l'interface de props et le titre de section :

```typescript
interface DashboardProps {
  onCreateNew: () => void;
  onOpenRoutine: (routineId: string) => void;
  onOpenCommunication: (boardId: string) => void;
  onOpenCommunicationDefaults: () => void;
}

export function Dashboard({
  onCreateNew,
  onOpenRoutine,
  onOpenCommunication,
  onOpenCommunicationDefaults,
}: DashboardProps) {
```

Remplacer le titre de section (ligne `<h2 className="font-serif text-lg mt-8 mb-2">Communication</h2>`) par :

```tsx
      <div className="flex items-center justify-between mt-8 mb-2">
        <h2 className="font-serif text-lg">Communication</h2>
        <button
          type="button"
          className="text-sm text-[var(--text3)]"
          onClick={onOpenCommunicationDefaults}
        >
          ⚙ Défaut classe
        </button>
      </div>
```

- [ ] **Step 3: Wire la nouvelle vue dans `App.tsx`**

```typescript
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
import { CommunicationDefaults } from './components/CommunicationDefaults';

type View =
  | { name: 'dashboard' }
  | { name: 'editor' }
  | { name: 'viewer'; routineId: string }
  | { name: 'communication-editor'; boardId: string }
  | { name: 'communication-viewer'; boardId: string }
  | { name: 'communication-defaults' };

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

  if (view.name === 'communication-defaults') {
    return <CommunicationDefaults onBack={() => setView({ name: 'dashboard' })} />;
  }

  return (
    <Dashboard
      onCreateNew={() => setView({ name: 'editor' })}
      onOpenRoutine={(routineId) => setView({ name: 'viewer', routineId })}
      onOpenCommunication={(boardId) => setView({ name: 'communication-editor', boardId })}
      onOpenCommunicationDefaults={() => setView({ name: 'communication-defaults' })}
    />
  );
}

export default App;
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npm run typecheck`
Expected: PASS, aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add src/components/CommunicationDefaults.tsx src/components/Dashboard.tsx src/App.tsx
git commit -m "feat: écran de défaut classe pour la Communication, accessible depuis le Dashboard"
```

---

## Task 14: Vérification finale

**Files:** aucun (vérification uniquement)

- [ ] **Step 1: Lancer toute la suite de tests**

Run: `npm run test`
Expected: PASS — tous les tests existants + les nouveaux (`reorder.test.ts`, `communicationSettings.test.ts`, `holdToSelect.test.ts`, `letterboard.test.ts`).

- [ ] **Step 2: Typecheck complet**

Run: `npm run typecheck`
Expected: PASS, aucune erreur.

- [ ] **Step 3: Build de production (obligatoire avant tout push, cf. CLAUDE.md)**

Run: `npx vite build`
Expected: PASS, build généré dans `dist/`.

- [ ] **Step 4: Vérification manuelle en local avec `vercel dev`**

Run: `vercel dev`
Vérifier dans le navigateur :
- Dashboard → "⚙ Défaut classe" → changer le mode par défaut vers Letterboard → enregistrer.
- Ouvrir une planche existante (ou en créer une) → l'éditeur affiche "Suit le défaut classe (Letterboard)".
- Vue élève de cette planche → le Letterboard s'affiche, le maintien prolongé fonctionne (le picto/la lettre ne se valide qu'après ~500ms de pression), le mot composé peut être effacé lettre par lettre ou entièrement, et lu à voix haute.
- Sur l'éditeur, basculer explicitement une planche sur "Pictogrammes" → la vue élève de cette planche reste en Pictogrammes malgré le défaut classe Letterboard.
- Dans l'éditeur, réordonner deux pictos d'une même catégorie avec ↑/↓ → l'ordre est conservé après rechargement de la page.

- [ ] **Step 5: Commit final si des ajustements ont été faits pendant la vérification manuelle**

```bash
git add -A
git commit -m "fix: ajustements suite à la vérification manuelle"
```

(Ne committer que si des changements ont réellement été nécessaires.)
