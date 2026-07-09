# RituActif Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build RituActif — a React/Vite/Supabase app that lets an enseignant compose an ordered list of pictogram items (validated one-by-one against ARASAAC, or uploaded), then render that same list as a short sequential routine, a timetable, or a configurable picto grid (TLA / mémo-consigne), with an optional upstream "inspired by FALC" step-splitting assist.

**Architecture:** One shared data model (`ritu_routines` + `ritu_steps`) feeds three renderers. The app reuses Picto-lecture's existing Supabase project (`otiorljbujqzruulmqrs.supabase.co`) — its `search-pictograms` edge function is called as-is; a new `simplify-consigne-falc` edge function is added on the same project, following the same security pattern as Picto-lecture's `falc-simplify` (`ANTHROPIC_API_KEY` read via `Deno.env`, never exposed to the client).

**Tech Stack:** React 18 + Vite 5 + TypeScript + Tailwind CSS v3, `@supabase/supabase-js`, `html2pdf.js` for export, Web Speech API for audio, Vitest for pure-logic unit tests, Deno's built-in test runner for edge function logic.

**Testing approach for this codebase family:** Picto-lecture and the other PLAI apps ship with zero test tooling — verification is `npx vite build` + manual browser check (per the project's own CLAUDE.md). This plan adds Vitest only for the handful of pure functions where TDD pays for itself (grid math, text-visibility resolution, response parsing) and `deno test` for the edge function's request/response logic. Supabase-client CRUD wrappers and React components are verified manually against the running dev server and the Supabase dashboard — that matches how this app family is actually built and avoids introducing test infrastructure (React Testing Library, mocked Supabase clients) nobody else in this codebase uses.

---

## Milestone 0 — Project scaffolding

### Task 0.1: Bootstrap the Vite React TypeScript project

**Files:**
- Create: `rituactif/package.json`
- Create: `rituactif/vite.config.ts`
- Create: `rituactif/tsconfig.json`
- Create: `rituactif/tsconfig.app.json`
- Create: `rituactif/tsconfig.node.json`
- Create: `rituactif/tailwind.config.js`
- Create: `rituactif/postcss.config.js`
- Create: `rituactif/index.html`
- Create: `rituactif/src/main.tsx`
- Create: `rituactif/src/index.css`
- Create: `rituactif/src/vite-env.d.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "rituactif",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit -p tsconfig.app.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4",
    "html2pdf.js": "^0.12.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/html2pdf.js": "^0.10.0",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 4: Create `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 7: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: Create `index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/jpeg" href="/plai-logo.jpg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RituActif</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 11: Create `src/main.tsx`** (App.tsx is created in Task 8.1 — this file will fail to resolve until then, that's expected at this point)

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './plai-style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 12: Install dependencies**

Run: `cd rituactif && npm install`
Expected: installs without error (the app won't build yet — `App.tsx` and `plai-style.css` don't exist until Tasks 0.2 and 8.1).

- [ ] **Step 13: Initialize git and commit**

```bash
cd rituactif
git init
git add package.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.js postcss.config.js index.html src/index.css src/vite-env.d.ts src/main.tsx
git commit -m "chore: scaffold RituActif Vite/React/TS project"
```

---

### Task 0.2: Copy shared PLAI assets and set up the Supabase client

**Files:**
- Create: `rituactif/src/plai-style.css` (copy)
- Create: `rituactif/public/plai-logo.jpg` (copy)
- Create: `rituactif/.env.example`
- Create: `rituactif/.gitignore`
- Create: `rituactif/src/lib/supabase.ts`

- [ ] **Step 1: Copy the shared CSS and logo**

```bash
mkdir -p rituactif/public
cp "../shared/css/plai-style.css" "rituactif/src/plai-style.css"
cp "../shared/css/plai-logo.jpg" "rituactif/public/plai-logo.jpg"
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules
dist
.env
.env.local
.superpowers
```

- [ ] **Step 3: Create `.env.example`**

```
VITE_SUPABASE_URL=https://otiorljbujqzruulmqrs.supabase.co
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 4: Create `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 5: Create a local `.env` from the anon key**

Get the anon key from the Supabase dashboard for project `otiorljbujqzruulmqrs` (Project Settings → API → anon public key — the same key already used by Picto-lecture, check Picto-lecture's Vercel env vars if you don't have it handy). Create `rituactif/.env`:

```
VITE_SUPABASE_URL=https://otiorljbujqzruulmqrs.supabase.co
VITE_SUPABASE_ANON_KEY=<paste the anon key here>
```

Expected: `.env` is listed in `.gitignore`, so `git status` after this step must NOT show it as untracked-to-add.

- [ ] **Step 6: Commit**

```bash
git add src/plai-style.css public/plai-logo.jpg .gitignore .env.example src/lib/supabase.ts
git commit -m "chore: add PLAI shared assets and Supabase client"
```

---

## Milestone 1 — Pure logic modules (TDD)

### Task 1.1: Shared types

**Files:**
- Create: `rituactif/src/lib/types.ts`

- [ ] **Step 1: Create `src/lib/types.ts`**

```ts
export type RenduType = 'sequentiel' | 'emploi_du_temps' | 'grille';
export type RattachementType = 'classe' | 'eleve';
export type PictoSource = 'arasaac' | 'perso';
export type PageFormat = 'a4-portrait' | 'a4-paysage';

export interface GridConfig {
  rows: number;
  cols: number;
  pageFormat: PageFormat;
}

export interface Routine {
  id: string;
  user_id: string;
  nom: string;
  type_rendu: RenduType;
  rattachement_type: RattachementType;
  rattachement_code_eleve: string | null;
  config_grille: GridConfig | null;
  afficher_texte_global: boolean;
  created_at: string;
}

export interface RoutineStep {
  id: string;
  routine_id: string;
  ordre: number;
  libelle: string;
  picto_url: string;
  picto_source: PictoSource;
  horaire: string | null;
  afficher_texte_override: boolean | null;
  position_grille: number | null;
}
```

This file has no logic to test — it only defines shapes used by every later task. No test step needed.

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared domain types"
```

---

### Task 1.2: Text visibility resolution

**Files:**
- Create: `rituactif/src/lib/textVisibility.ts`
- Test: `rituactif/src/lib/textVisibility.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/textVisibility.test.ts
import { describe, it, expect } from 'vitest';
import { resolveTextVisible } from './textVisibility';

describe('resolveTextVisible', () => {
  it('uses the global setting when override is null', () => {
    expect(resolveTextVisible(true, null)).toBe(true);
    expect(resolveTextVisible(false, null)).toBe(false);
  });

  it('uses the override when set, regardless of global', () => {
    expect(resolveTextVisible(false, true)).toBe(true);
    expect(resolveTextVisible(true, false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/textVisibility.test.ts`
Expected: FAIL — `Cannot find module './textVisibility'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/textVisibility.ts
export function resolveTextVisible(globalSetting: boolean, override: boolean | null): boolean {
  return override === null ? globalSetting : override;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/textVisibility.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/textVisibility.ts src/lib/textVisibility.test.ts
git commit -m "feat: add text-visibility resolution (global + per-item override)"
```

---

### Task 1.3: Grid layout math

**Files:**
- Create: `rituactif/src/lib/gridLayout.ts`
- Test: `rituactif/src/lib/gridLayout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/gridLayout.test.ts
import { describe, it, expect } from 'vitest';
import { computeGridCells, computeCellSizeMm } from './gridLayout';

describe('computeGridCells', () => {
  it('produces rows*cols cells in row-major order', () => {
    const cells = computeGridCells(2, 3);
    expect(cells).toHaveLength(6);
    expect(cells[0]).toEqual({ row: 0, col: 0, index: 0 });
    expect(cells[5]).toEqual({ row: 1, col: 2, index: 5 });
  });

  it('throws when rows or cols is less than 1', () => {
    expect(() => computeGridCells(0, 3)).toThrow();
    expect(() => computeGridCells(3, 0)).toThrow();
  });
});

describe('computeCellSizeMm', () => {
  it('divides the usable A4 portrait area by rows and cols', () => {
    const size = computeCellSizeMm('a4-portrait', 5, 3, 10);
    expect(size.widthMm).toBeCloseTo((210 - 20) / 3);
    expect(size.heightMm).toBeCloseTo((297 - 20) / 5);
  });

  it('swaps width/height for paysage', () => {
    const size = computeCellSizeMm('a4-paysage', 3, 5, 10);
    expect(size.widthMm).toBeCloseTo((297 - 20) / 5);
    expect(size.heightMm).toBeCloseTo((210 - 20) / 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/gridLayout.test.ts`
Expected: FAIL — `Cannot find module './gridLayout'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/gridLayout.ts
import type { PageFormat } from './types';

export interface GridCell {
  row: number;
  col: number;
  index: number;
}

export function computeGridCells(rows: number, cols: number): GridCell[] {
  if (rows < 1 || cols < 1) {
    throw new Error('rows et cols doivent être >= 1');
  }
  const cells: GridCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({ row, col, index: row * cols + col });
    }
  }
  return cells;
}

const PAGE_DIMENSIONS_MM: Record<PageFormat, { width: number; height: number }> = {
  'a4-portrait': { width: 210, height: 297 },
  'a4-paysage': { width: 297, height: 210 },
};

export function computeCellSizeMm(
  pageFormat: PageFormat,
  rows: number,
  cols: number,
  marginMm = 10
): { widthMm: number; heightMm: number } {
  const { width, height } = PAGE_DIMENSIONS_MM[pageFormat];
  return {
    widthMm: (width - marginMm * 2) / cols,
    heightMm: (height - marginMm * 2) / rows,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/gridLayout.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/gridLayout.ts src/lib/gridLayout.test.ts
git commit -m "feat: add grid layout math for the TLA/mémo-consigne render"
```

---

### Task 1.4: ARASAAC response mapper

**Files:**
- Create: `rituactif/src/lib/arasaacMapper.ts`
- Test: `rituactif/src/lib/arasaacMapper.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/arasaacMapper.test.ts
import { describe, it, expect } from 'vitest';
import { mapArasaacResponse } from './arasaacMapper';

describe('mapArasaacResponse', () => {
  it('maps a well-formed response to Pictogram[]', () => {
    const result = mapArasaacResponse({
      pictograms: [{ id: 5122, url: 'https://api.arasaac.org/api/pictograms/5122', keywords: ['main', 'mains'] }],
    });
    expect(result).toEqual([
      { id: 5122, url: 'https://api.arasaac.org/api/pictograms/5122', keywords: ['main', 'mains'] },
    ]);
  });

  it('returns an empty array when the response has no pictograms field', () => {
    expect(mapArasaacResponse({})).toEqual([]);
    expect(mapArasaacResponse(null)).toEqual([]);
  });

  it('drops entries missing an id or url', () => {
    const result = mapArasaacResponse({ pictograms: [{ keywords: ['x'] }] });
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/arasaacMapper.test.ts`
Expected: FAIL — `Cannot find module './arasaacMapper'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/arasaacMapper.ts
export interface Pictogram {
  id: number;
  url: string;
  keywords: string[];
}

interface RawPictogram {
  id?: number;
  url?: string;
  keywords?: string[];
}

export function mapArasaacResponse(json: unknown): Pictogram[] {
  if (!json || typeof json !== 'object' || !('pictograms' in json)) {
    return [];
  }
  const pictograms = (json as { pictograms: unknown }).pictograms;
  if (!Array.isArray(pictograms)) return [];

  return pictograms
    .filter((p): p is RawPictogram => typeof p === 'object' && p !== null)
    .map((p) => ({
      id: Number(p.id ?? 0),
      url: String(p.url ?? ''),
      keywords: Array.isArray(p.keywords) ? p.keywords : [],
    }))
    .filter((p) => p.id !== 0 && p.url !== '');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/arasaacMapper.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/arasaacMapper.ts src/lib/arasaacMapper.test.ts
git commit -m "feat: add defensive ARASAAC response mapper"
```

---

### Task 1.5: FALC step-list parser

**Files:**
- Create: `rituactif/src/lib/falcParser.ts`
- Test: `rituactif/src/lib/falcParser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/falcParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseFalcSteps } from './falcParser';

describe('parseFalcSteps', () => {
  it('splits on newlines and trims each step', () => {
    expect(parseFalcSteps('se laver les mains\n s\'asseoir \nouvrir le cahier')).toEqual([
      'se laver les mains',
      "s'asseoir",
      'ouvrir le cahier',
    ]);
  });

  it('strips leading bullets or numbering if the model adds them anyway', () => {
    expect(parseFalcSteps('1. se laver les mains\n- s\'asseoir')).toEqual([
      'se laver les mains',
      "s'asseoir",
    ]);
  });

  it('drops empty lines', () => {
    expect(parseFalcSteps('se laver les mains\n\n\ns\'asseoir')).toEqual([
      'se laver les mains',
      "s'asseoir",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/falcParser.test.ts`
Expected: FAIL — `Cannot find module './falcParser'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/falcParser.ts
export function parseFalcSteps(simplifiedText: string): string[] {
  return simplifiedText
    .split('\n')
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((line) => line.length > 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/falcParser.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/falcParser.ts src/lib/falcParser.test.ts
git commit -m "feat: add FALC-assisted step-list parser"
```

---

## Milestone 2 — Database schema and RLS

### Task 2.1: Create `ritu_routines` / `ritu_steps` tables, RLS policies, and the storage bucket

**Files:**
- Create: `rituactif/supabase/migrations/20260708000000_create_ritu_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply the migration**

Open the Supabase SQL editor for project `otiorljbujqzruulmqrs` (dashboard → SQL Editor) and run the file's contents, or if the Supabase CLI is linked to this project: `supabase db push`.
Expected: no errors; `ritu_routines`, `ritu_steps`, and the `ritu-pictos` bucket now exist.

- [ ] **Step 3: Verify the tables and policies exist**

Run in the SQL editor:

```sql
select tablename, policyname from pg_policies where tablename in ('ritu_routines', 'ritu_steps');
select id, name, public from storage.buckets where id = 'ritu-pictos';
```

Expected: 2 policy rows for `ritu_routines`... wait, one `for all` policy counts as one row per table (2 rows total: `ritu_routines_owner_all`, `ritu_steps_owner_all`), plus the `ritu-pictos` bucket row with `public = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260708000000_create_ritu_tables.sql
git commit -m "feat: add ritu_routines/ritu_steps schema, RLS, and storage bucket"
```

---

## Milestone 3 — `simplify-consigne-falc` edge function

### Task 3.1: Extract and test the pure request/response logic

**Files:**
- Create: `rituactif/supabase/functions/simplify-consigne-falc/logic.ts`
- Test: `rituactif/supabase/functions/simplify-consigne-falc/logic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// rituactif/supabase/functions/simplify-consigne-falc/logic.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildAnthropicRequestBody, extractSimplifiedText } from "./logic.ts";

Deno.test("buildAnthropicRequestBody uses claude-sonnet-5 and includes the user text", () => {
  const body = buildAnthropicRequestBody("Va te laver les mains puis reviens t'asseoir.");
  assertEquals(body.model, "claude-sonnet-5");
  assertEquals(body.messages, [
    { role: "user", content: "Va te laver les mains puis reviens t'asseoir." },
  ]);
});

Deno.test("extractSimplifiedText reads the first content block", () => {
  const result = extractSimplifiedText({ content: [{ text: "se laver les mains\ns'asseoir" }] });
  assertEquals(result, "se laver les mains\ns'asseoir");
});

Deno.test("extractSimplifiedText returns empty string when content is missing", () => {
  assertEquals(extractSimplifiedText({}), "");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rituactif/supabase/functions/simplify-consigne-falc && deno test`
Expected: FAIL — `Module not found "./logic.ts"`

- [ ] **Step 3: Write minimal implementation**

```ts
// rituactif/supabase/functions/simplify-consigne-falc/logic.ts
export const SYSTEM_PROMPT = `Tu découpes une consigne scolaire en étapes courtes et ordonnées, pour un enseignant qui va ensuite associer un pictogramme à chaque étape.

RÈGLES OBLIGATOIRES (sous-ensemble FALC adapté à une consigne d'action — pas le FALC administratif complet) :
1. Une étape par ligne, aucune numérotation ni puce.
2. Chaque étape : maximum 6 mots, un seul verbe d'action à l'infinitif ou à l'impératif ("se laver les mains", "range ton cahier").
3. Ordre chronologique strict de la consigne d'origine.
4. Vocabulaire courant : remplacer les mots rares ou abstraits par des équivalents simples, sans perdre le sens.
5. Pas de mots entièrement en majuscules.

NE PAS FAIRE :
- Ne pas fusionner deux actions différentes dans la même étape.
- Ne pas ajouter d'étape absente de la consigne d'origine.
- Ne pas ajouter de commentaire, de titre, ni de conclusion.

RÈGLES D'ÉCRITURE :
- Retourne UNIQUEMENT les étapes, une par ligne, rien d'autre.
- Jamais de "Voici", "Bien sûr", préambule ou commentaire sur ta démarche.

Fondement : Balssa (2024), « FALC et école inclusive » (RISS tel-04807443).`;

export function buildAnthropicRequestBody(text: string) {
  return {
    model: "claude-sonnet-5",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  };
}

// deno-lint-ignore no-explicit-any
export function extractSimplifiedText(anthropicResponseJson: any): string {
  return anthropicResponseJson?.content?.[0]?.text ?? "";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rituactif/supabase/functions/simplify-consigne-falc && deno test`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/simplify-consigne-falc/logic.ts supabase/functions/simplify-consigne-falc/logic.test.ts
git commit -m "feat: add testable request/response logic for the FALC step-splitting function"
```

---

### Task 3.2: Wire the Deno HTTP handler and deploy

**Files:**
- Create: `rituactif/supabase/functions/simplify-consigne-falc/index.ts`

- [ ] **Step 1: Write `index.ts`**

```ts
// rituactif/supabase/functions/simplify-consigne-falc/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildAnthropicRequestBody, extractSimplifiedText } from "./logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SimplifyRequest {
  text: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text }: SimplifyRequest = await req.json();

    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({ error: "Texte manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Clé API manquante côté serveur" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(buildAnthropicRequestBody(text)),
    });

    if (!response.ok) {
      const err = await response.json();
      if (response.status === 529 || err.error?.type === "overloaded_error") {
        return new Response(
          JSON.stringify({ error: "API surchargée — réessayez dans quelques secondes." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: err.error?.message ?? "Erreur API Anthropic" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const simplifiedText = extractSimplifiedText(data);

    return new Response(
      JSON.stringify({ simplifiedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error simplifying consigne:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

- [ ] **Step 2: Deploy the function**

Run: `supabase functions deploy simplify-consigne-falc --project-ref otiorljbujqzruulmqrs`
Expected: deployment succeeds. If `ANTHROPIC_API_KEY` isn't already set as a secret on this project (it should already exist for `falc-simplify`), set it: `supabase secrets set ANTHROPIC_API_KEY=<key> --project-ref otiorljbujqzruulmqrs`.

- [ ] **Step 3: Verify manually with curl**

```bash
curl -X POST "https://otiorljbujqzruulmqrs.supabase.co/functions/v1/simplify-consigne-falc" \
  -H "Authorization: Bearer <VITE_SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Range ton banc, prends ton cartable et mets-toi en rang devant la porte."}'
```

Expected: `200` response with `{"simplifiedText": "ranger le banc\nprendre le cartable\nse mettre en rang devant la porte"}` (exact wording will vary, but should be 3 short imperative/infinitive lines in the original order).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/simplify-consigne-falc/index.ts
git commit -m "feat: deploy simplify-consigne-falc edge function"
```

---

## Milestone 4 — Data access layer

### Task 4.1: ARASAAC and FALC client wrappers

**Files:**
- Create: `rituactif/src/lib/arasaac.ts`
- Create: `rituactif/src/lib/falc.ts`
- Create: `rituactif/src/lib/tts.ts`

- [ ] **Step 1: Create `src/lib/arasaac.ts`**

```ts
import { supabase } from './supabase';
import { mapArasaacResponse, type Pictogram } from './arasaacMapper';

export async function searchPictograms(word: string, language = 'fr'): Promise<Pictogram[]> {
  const { data, error } = await supabase.functions.invoke('search-pictograms', {
    body: { word, language },
  });
  if (error) throw error;
  return mapArasaacResponse(data);
}
```

- [ ] **Step 2: Create `src/lib/falc.ts`**

```ts
import { supabase } from './supabase';
import { parseFalcSteps } from './falcParser';

export async function simplifyConsigne(text: string): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('simplify-consigne-falc', {
    body: { text },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return parseFalcSteps(data?.simplifiedText ?? '');
}
```

- [ ] **Step 3: Create `src/lib/tts.ts`**

```ts
export function speak(text: string, lang = 'fr-FR'): void {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run typecheck`
Expected: no errors (these files only reference already-created modules and the `supabase` client).

- [ ] **Step 5: Commit**

```bash
git add src/lib/arasaac.ts src/lib/falc.ts src/lib/tts.ts
git commit -m "feat: add ARASAAC, FALC, and text-to-speech client wrappers"
```

---

### Task 4.2: Routine/step CRUD and storage upload

**Files:**
- Create: `rituactif/src/lib/routines.ts`
- Create: `rituactif/src/lib/storage.ts`

- [ ] **Step 1: Create `src/lib/routines.ts`**

```ts
import { supabase } from './supabase';
import type { Routine, RoutineStep, RenduType, RattachementType, GridConfig, PictoSource } from './types';

export async function createRoutine(params: {
  nom: string;
  typeRendu: RenduType;
  rattachementType: RattachementType;
  rattachementCodeEleve?: string;
  configGrille?: GridConfig;
}): Promise<Routine> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Utilisateur non authentifié');

  const { data, error } = await supabase
    .from('ritu_routines')
    .insert({
      user_id: userData.user.id,
      nom: params.nom,
      type_rendu: params.typeRendu,
      rattachement_type: params.rattachementType,
      rattachement_code_eleve: params.rattachementCodeEleve ?? null,
      config_grille: params.configGrille ?? null,
      afficher_texte_global: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Routine;
}

export async function listRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('ritu_routines')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Routine[];
}

export async function getRoutineWithSteps(
  routineId: string
): Promise<{ routine: Routine; steps: RoutineStep[] }> {
  const { data: routine, error: routineError } = await supabase
    .from('ritu_routines')
    .select('*')
    .eq('id', routineId)
    .single();
  if (routineError) throw routineError;

  const { data: steps, error: stepsError } = await supabase
    .from('ritu_steps')
    .select('*')
    .eq('routine_id', routineId)
    .order('ordre', { ascending: true });
  if (stepsError) throw stepsError;

  return { routine: routine as Routine, steps: (steps ?? []) as RoutineStep[] };
}

export async function addStep(params: {
  routineId: string;
  ordre: number;
  libelle: string;
  pictoUrl: string;
  pictoSource: PictoSource;
  horaire?: string;
  afficherTexteOverride?: boolean | null;
  positionGrille?: number;
}): Promise<RoutineStep> {
  const { data, error } = await supabase
    .from('ritu_steps')
    .insert({
      routine_id: params.routineId,
      ordre: params.ordre,
      libelle: params.libelle,
      picto_url: params.pictoUrl,
      picto_source: params.pictoSource,
      horaire: params.horaire ?? null,
      afficher_texte_override: params.afficherTexteOverride ?? null,
      position_grille: params.positionGrille ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as RoutineStep;
}
```

- [ ] **Step 2: Create `src/lib/storage.ts`**

```ts
import { supabase } from './supabase';

export async function uploadPersoPicto(file: File): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Utilisateur non authentifié');

  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('ritu-pictos')
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('ritu-pictos').getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/routines.ts src/lib/storage.ts
git commit -m "feat: add ritu_routines/ritu_steps CRUD and perso picto upload"
```

---

## Milestone 5 — Auth and Dashboard

### Task 5.1: Auth screen

**Files:**
- Create: `rituactif/src/components/Auth.tsx`

- [ ] **Step 1: Create `src/components/Auth.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div className="plai-section" style={{ maxWidth: 400, margin: '80px auto' }}>
      <div className="plai-card">
        <h1 className="font-serif text-xl mb-4">RituActif</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            className="plai-input"
            type="email"
            placeholder="votre.email@ecole.be"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="plai-input"
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <div className="plai-error">{error}</div>}
          <button className="plai-btn" type="submit" disabled={loading}>
            {loading ? 'Chargement...' : mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>
        <button
          type="button"
          className="text-sm text-[var(--text3)] mt-3"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Auth.tsx
git commit -m "feat: add sign in / sign up screen"
```

---

### Task 5.2: Dashboard

**Files:**
- Create: `rituactif/src/components/Dashboard.tsx`

- [ ] **Step 1: Create `src/components/Dashboard.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { listRoutines } from '../lib/routines';
import type { Routine } from '../lib/types';

interface DashboardProps {
  onCreateNew: () => void;
  onOpenRoutine: (routineId: string) => void;
}

const RENDU_LABELS: Record<Routine['type_rendu'], string> = {
  sequentiel: 'Séquentiel',
  emploi_du_temps: 'Emploi du temps',
  grille: 'Grille (TLA / mémo-consigne)',
};

export function Dashboard({ onCreateNew, onOpenRoutine }: DashboardProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRoutines()
      .then(setRoutines)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="plai-section">
      <nav className="plai-nav">
        <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 32 }} />
        <span className="font-serif text-lg">RituActif</span>
      </nav>

      <button className="plai-btn" type="button" onClick={onCreateNew}>
        + Nouvelle planche
      </button>

      {loading && <p>Chargement...</p>}
      {!loading && routines.length === 0 && (
        <div className="plai-empty">Aucune planche pour l'instant. Créez la première.</div>
      )}

      <ul className="flex flex-col gap-2 mt-4">
        {routines.map((r) => (
          <li
            key={r.id}
            className="plai-card"
            onClick={() => onOpenRoutine(r.id)}
            style={{ cursor: 'pointer' }}
          >
            <strong>{r.nom}</strong>
            <span className="text-sm text-[var(--text3)] ml-2">{RENDU_LABELS[r.type_rendu]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: add routines dashboard"
```

---

## Milestone 6 — Routine creation flow

### Task 6.1: Grid config panel

**Files:**
- Create: `rituactif/src/components/RoutineEditor/GridConfigPanel.tsx`

- [ ] **Step 1: Create `src/components/RoutineEditor/GridConfigPanel.tsx`**

```tsx
import type { GridConfig } from '../../lib/types';

interface GridConfigPanelProps {
  value: GridConfig;
  onChange: (config: GridConfig) => void;
}

export function GridConfigPanel({ value, onChange }: GridConfigPanelProps) {
  return (
    <div className="mt-4">
      <label className="block mb-1 font-medium">Grille (TLA / mémo-consigne)</label>
      <div className="flex gap-2 items-center">
        <input
          className="plai-input"
          type="number"
          min={1}
          max={10}
          value={value.rows}
          onChange={(e) => onChange({ ...value, rows: Number(e.target.value) })}
        />
        <span>lignes ×</span>
        <input
          className="plai-input"
          type="number"
          min={1}
          max={10}
          value={value.cols}
          onChange={(e) => onChange({ ...value, cols: Number(e.target.value) })}
        />
        <span>colonnes</span>
      </div>
      <select
        className="plai-input mt-2"
        value={value.pageFormat}
        onChange={(e) => onChange({ ...value, pageFormat: e.target.value as GridConfig['pageFormat'] })}
      >
        <option value="a4-portrait">A4 portrait</option>
        <option value="a4-paysage">A4 paysage</option>
      </select>
      <p className="text-xs text-[var(--text3)] mt-1">
        ex: 5 lignes × 3 colonnes pour un mémo-consigne A4 portrait.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RoutineEditor/GridConfigPanel.tsx
git commit -m "feat: add grid configuration panel for the TLA/mémo-consigne render"
```

---

### Task 6.2: Pictogram picker (ARASAAC search + validation + perso upload)

**Files:**
- Create: `rituactif/src/components/RoutineEditor/PictogramPicker.tsx`

- [ ] **Step 1: Create `src/components/RoutineEditor/PictogramPicker.tsx`**

```tsx
import { useState } from 'react';
import { searchPictograms } from '../../lib/arasaac';
import { uploadPersoPicto } from '../../lib/storage';
import type { Pictogram } from '../../lib/arasaacMapper';
import type { PictoSource } from '../../lib/types';

interface PictogramPickerProps {
  libelle: string;
  pictoUrl: string;
  onSelect: (url: string, source: PictoSource) => void;
}

export function PictogramPicker({ libelle, pictoUrl, onSelect }: PictogramPickerProps) {
  const [candidates, setCandidates] = useState<Pictogram[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!libelle.trim()) return;
    setError(null);
    setLoading(true);
    try {
      setCandidates(await searchPictograms(libelle));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setError(null);
    try {
      const url = await uploadPersoPicto(file);
      onSelect(url, 'perso');
      setCandidates([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'upload");
    }
  };

  if (pictoUrl) {
    return (
      <div className="flex items-center gap-2">
        <img src={pictoUrl} alt={libelle} style={{ width: 48, height: 48, objectFit: 'contain' }} />
        <button type="button" onClick={() => onSelect('', 'arasaac')}>
          Changer
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="plai-btn"
        onClick={handleSearch}
        disabled={loading || !libelle.trim()}
      >
        {loading ? 'Recherche...' : 'Chercher un picto'}
      </button>
      {error && <div className="plai-error">{error}</div>}
      {candidates.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {candidates.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.url, 'arasaac')}
              style={{ border: '2px solid var(--border)', borderRadius: 8, padding: 4 }}
              title={p.keywords.join(', ')}
            >
              <img src={p.url} alt={p.keywords[0] ?? libelle} style={{ width: 48, height: 48 }} />
            </button>
          ))}
        </div>
      )}
      <label className="text-sm text-[var(--text3)] mt-2 block" style={{ cursor: 'pointer' }}>
        ou importer une image perso / composite
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RoutineEditor/PictogramPicker.tsx
git commit -m "feat: add pictogram picker with mandatory human validation and perso upload"
```

---

### Task 6.3: Single-step editor

**Files:**
- Create: `rituactif/src/components/RoutineEditor/StepEditor.tsx`

- [ ] **Step 1: Create `src/components/RoutineEditor/StepEditor.tsx`**

```tsx
import type { RenduType, PictoSource } from '../../lib/types';
import { PictogramPicker } from './PictogramPicker';

export interface DraftStep {
  libelle: string;
  pictoUrl: string;
  pictoSource: PictoSource;
  horaire: string;
  afficherTexteOverride: boolean | null;
}

interface StepEditorProps {
  step: DraftStep;
  typeRendu: RenduType;
  afficherTexteGlobal: boolean;
  onChange: (patch: Partial<DraftStep>) => void;
  onRemove: () => void;
}

export function StepEditor({ step, typeRendu, afficherTexteGlobal, onChange, onRemove }: StepEditorProps) {
  return (
    <div className="flex gap-3 items-start border rounded-lg p-2" style={{ borderColor: 'var(--border)' }}>
      <input
        className="plai-input"
        placeholder='ex: "se laver les mains"'
        value={step.libelle}
        onChange={(e) => onChange({ libelle: e.target.value })}
      />

      <PictogramPicker
        libelle={step.libelle}
        pictoUrl={step.pictoUrl}
        onSelect={(url, source) => onChange({ pictoUrl: url, pictoSource: source })}
      />

      {typeRendu === 'emploi_du_temps' && (
        <input
          className="plai-input"
          type="time"
          value={step.horaire}
          onChange={(e) => onChange({ horaire: e.target.value })}
        />
      )}

      <select
        className="plai-input"
        value={step.afficherTexteOverride === null ? 'herite' : step.afficherTexteOverride ? 'oui' : 'non'}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ afficherTexteOverride: v === 'herite' ? null : v === 'oui' });
        }}
      >
        <option value="herite">
          Texte : suit le réglage global ({afficherTexteGlobal ? 'affiché' : 'masqué'})
        </option>
        <option value="oui">Texte : toujours affiché (travail lexical ciblé)</option>
        <option value="non">Texte : toujours masqué</option>
      </select>

      <button type="button" onClick={onRemove} aria-label="Supprimer cette étape">
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RoutineEditor/StepEditor.tsx
git commit -m "feat: add single-step editor (libellé, picto, horaire, texte override)"
```

---

### Task 6.4: FALC simplification panel

**Files:**
- Create: `rituactif/src/components/RoutineEditor/FalcSimplifyPanel.tsx`

- [ ] **Step 1: Create `src/components/RoutineEditor/FalcSimplifyPanel.tsx`**

```tsx
import { useState } from 'react';
import { simplifyConsigne } from '../../lib/falc';

interface FalcSimplifyPanelProps {
  onStepsReady: (libelles: string[]) => void;
}

export function FalcSimplifyPanel({ onStepsReady }: FalcSimplifyPanelProps) {
  const [text, setText] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimplify = async () => {
    if (!text.trim()) return;
    setError(null);
    setLoading(true);
    try {
      setCandidates(await simplifyConsigne(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la simplification');
    } finally {
      setLoading(false);
    }
  };

  const updateCandidate = (index: number, value: string) => {
    setCandidates((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const removeCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAccept = () => {
    onStepsReady(candidates.filter((c) => c.trim().length > 0));
    setCandidates([]);
    setText('');
  };

  return (
    <div className="plai-card mt-4">
      <h3 className="font-medium mb-1">Simplifier une consigne longue (optionnel)</h3>
      <p className="text-xs text-[var(--text3)] mb-2">
        Collez une consigne écrite normalement, elle sera proposée découpée en étapes courtes — à
        valider ou corriger avant de continuer.
      </p>
      <textarea
        className="plai-input"
        rows={3}
        placeholder='ex: "Range ton banc, prends ton cartable et mets-toi en rang devant la porte."'
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="plai-btn mt-2"
        type="button"
        onClick={handleSimplify}
        disabled={loading || !text.trim()}
      >
        {loading ? 'Simplification...' : 'Simplifier (inspiré du FALC)'}
      </button>
      {error && <div className="plai-error mt-2">{error}</div>}

      {candidates.length > 0 && (
        <div className="mt-3">
          <div
            className="text-xs p-2 rounded border"
            style={{ borderColor: '#e8d5a3', background: '#fdf8ec', color: '#6b5216' }}
          >
            <strong>Ceci n'est pas du FALC certifié</strong> : le FALC officiel exige une validation
            par un relecteur porteur de déficience intellectuelle. Cet outil s'inspire de règles
            propres au FALC, sans remplacer cette validation.
          </div>
          <ul className="flex flex-col gap-2 mt-2">
            {candidates.map((c, index) => (
              <li key={index} className="flex gap-2 items-center">
                <input className="plai-input" value={c} onChange={(e) => updateCandidate(index, e.target.value)} />
                <button type="button" onClick={() => removeCandidate(index)} aria-label="Retirer cette étape">
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button className="plai-btn mt-2" type="button" onClick={handleAccept}>
            Ajouter ces étapes
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RoutineEditor/FalcSimplifyPanel.tsx
git commit -m "feat: add FALC-inspired consigne simplification panel"
```

---

### Task 6.5: Routine editor orchestrator

**Files:**
- Create: `rituactif/src/components/RoutineEditor/RoutineEditor.tsx`

- [ ] **Step 1: Create `src/components/RoutineEditor/RoutineEditor.tsx`**

```tsx
import { useState } from 'react';
import { createRoutine, addStep } from '../../lib/routines';
import type { RenduType, RattachementType, GridConfig } from '../../lib/types';
import { FalcSimplifyPanel } from './FalcSimplifyPanel';
import { StepEditor, type DraftStep } from './StepEditor';
import { GridConfigPanel } from './GridConfigPanel';

interface RoutineEditorProps {
  onDone: (routineId: string) => void;
  onCancel: () => void;
}

export function RoutineEditor({ onDone, onCancel }: RoutineEditorProps) {
  const [nom, setNom] = useState('');
  const [typeRendu, setTypeRendu] = useState<RenduType>('sequentiel');
  const [rattachementType, setRattachementType] = useState<RattachementType>('classe');
  const [rattachementCodeEleve, setRattachementCodeEleve] = useState('');
  const [gridConfig, setGridConfig] = useState<GridConfig>({ rows: 3, cols: 3, pageFormat: 'a4-portrait' });
  const [afficherTexteGlobal, setAfficherTexteGlobal] = useState(true);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addDraftSteps = (libelles: string[]) => {
    setSteps((prev) => [
      ...prev,
      ...libelles.map((libelle) => ({
        libelle,
        pictoUrl: '',
        pictoSource: 'arasaac' as const,
        horaire: '',
        afficherTexteOverride: null,
      })),
    ]);
  };

  const updateStep = (index: number, patch: Partial<DraftStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const canGenerate = nom.trim().length > 0 && steps.length > 0 && steps.every((s) => s.pictoUrl);

  const handleGenerate = async () => {
    setError(null);
    setSaving(true);
    try {
      const routine = await createRoutine({
        nom,
        typeRendu,
        rattachementType,
        rattachementCodeEleve: rattachementType === 'eleve' ? rattachementCodeEleve : undefined,
        configGrille: typeRendu === 'grille' ? gridConfig : undefined,
      });
      await Promise.all(
        steps.map((s, index) =>
          addStep({
            routineId: routine.id,
            ordre: index,
            libelle: s.libelle,
            pictoUrl: s.pictoUrl,
            pictoSource: s.pictoSource,
            horaire: s.horaire || undefined,
            afficherTexteOverride: s.afficherTexteOverride,
            positionGrille: typeRendu === 'grille' ? index : undefined,
          })
        )
      );
      onDone(routine.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="plai-section">
      <button type="button" onClick={onCancel} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>

      <div className="plai-card">
        <label className="block mb-1 font-medium">Nom de la planche</label>
        <input
          className="plai-input"
          placeholder='ex: "Retour de récré"'
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <p className="text-xs text-[var(--text3)] mt-1">
          Sert à retrouver cette planche dans votre tableau de bord.
        </p>

        <label className="block mt-4 mb-1 font-medium">Type de rendu</label>
        <select
          className="plai-input"
          value={typeRendu}
          onChange={(e) => setTypeRendu(e.target.value as RenduType)}
        >
          <option value="sequentiel">Séquentiel court (routine ponctuelle)</option>
          <option value="emploi_du_temps">Emploi du temps (avec horaires)</option>
          <option value="grille">Grille (TLA / mémo-consigne)</option>
        </select>

        <label className="block mt-4 mb-1 font-medium">Rattachement</label>
        <select
          className="plai-input"
          value={rattachementType}
          onChange={(e) => setRattachementType(e.target.value as RattachementType)}
        >
          <option value="classe">Générique classe</option>
          <option value="eleve">Élève (code anonyme)</option>
        </select>
        {rattachementType === 'eleve' && (
          <>
            <input
              className="plai-input mt-2"
              placeholder="ex: Élève-7"
              value={rattachementCodeEleve}
              onChange={(e) => setRattachementCodeEleve(e.target.value)}
            />
            <p className="text-xs text-[var(--text3)] mt-1">
              Jamais de nom réel — un code anonyme suffit à retrouver la planche.
            </p>
          </>
        )}

        {typeRendu === 'grille' && <GridConfigPanel value={gridConfig} onChange={setGridConfig} />}

        <label className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={afficherTexteGlobal}
            onChange={(e) => setAfficherTexteGlobal(e.target.checked)}
          />
          Afficher le mot sous chaque pictogramme
        </label>
      </div>

      <FalcSimplifyPanel onStepsReady={addDraftSteps} />

      <div className="plai-card mt-4">
        <h3 className="font-medium mb-2">Étapes ({steps.length})</h3>
        <p className="text-xs text-[var(--text3)] mb-2">
          {typeRendu === 'grille'
            ? "L'ordre ci-dessous détermine la position dans la grille (de gauche à droite, ligne par ligne)."
            : "L'ordre ci-dessous détermine l'ordre affiché dans la planche."}
        </p>
        <div className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0}
                  aria-label="Déplacer vers le haut"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === steps.length - 1}
                  aria-label="Déplacer vers le bas"
                >
                  ↓
                </button>
              </div>
              <StepEditor
                step={step}
                typeRendu={typeRendu}
                afficherTexteGlobal={afficherTexteGlobal}
                onChange={(patch) => updateStep(index, patch)}
                onRemove={() => removeStep(index)}
              />
            </div>
          ))}
        </div>
        <button className="plai-btn mt-3" type="button" onClick={() => addDraftSteps([''])}>
          + Ajouter une étape
        </button>
      </div>

      {error && <div className="plai-error mt-3">{error}</div>}

      <button className="plai-btn mt-4" type="button" disabled={!canGenerate || saving} onClick={handleGenerate}>
        {saving ? 'Génération...' : 'Générer la planche'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RoutineEditor/RoutineEditor.tsx
git commit -m "feat: add routine editor orchestrator wiring FALC panel, steps, and grid config"
```

---

## Milestone 7 — Planche rendering and export

### Task 7.1: Sequence view (rendus A/B, shared gabarit)

**Files:**
- Create: `rituactif/src/components/PlancheView/SequenceView.tsx`

- [ ] **Step 1: Create `src/components/PlancheView/SequenceView.tsx`**

```tsx
import { useState } from 'react';
import type { Routine, RoutineStep } from '../../lib/types';
import { resolveTextVisible } from '../../lib/textVisibility';
import { speak } from '../../lib/tts';

interface SequenceViewProps {
  routine: Routine;
  steps: RoutineStep[];
}

export function SequenceView({ routine, steps }: SequenceViewProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step) => {
        const showText = resolveTextVisible(routine.afficher_texte_global, step.afficher_texte_override);
        return (
          <div key={step.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!!checked[step.id]}
              onChange={(e) => setChecked((prev) => ({ ...prev, [step.id]: e.target.checked }))}
            />
            {step.horaire && (
              <span className="text-sm font-medium" style={{ color: 'var(--teal)' }}>
                {step.horaire}
              </span>
            )}
            <img src={step.picto_url} alt={step.libelle} style={{ width: 56, height: 56 }} />
            {showText && <span>{step.libelle}</span>}
            <button type="button" onClick={() => speak(step.libelle)} aria-label={`Écouter : ${step.libelle}`}>
              🔊
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlancheView/SequenceView.tsx
git commit -m "feat: add sequence/timetable render (shared gabarit)"
```

---

### Task 7.2: Grid view (TLA / mémo-consigne)

**Files:**
- Create: `rituactif/src/components/PlancheView/GridView.tsx`

- [ ] **Step 1: Create `src/components/PlancheView/GridView.tsx`**

```tsx
import type { Routine, RoutineStep } from '../../lib/types';
import { resolveTextVisible } from '../../lib/textVisibility';
import { computeGridCells } from '../../lib/gridLayout';
import { speak } from '../../lib/tts';

interface GridViewProps {
  routine: Routine;
  steps: RoutineStep[];
}

export function GridView({ routine, steps }: GridViewProps) {
  const config = routine.config_grille;
  if (!config) return <p>Configuration de grille manquante.</p>;

  const cells = computeGridCells(config.rows, config.cols);
  const stepsByPosition = new Map(steps.map((s) => [s.position_grille, s]));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
        gap: 12,
      }}
    >
      {cells.map((cell) => {
        const step = stepsByPosition.get(cell.index);
        if (!step) return <div key={cell.index} />;
        const showText = resolveTextVisible(routine.afficher_texte_global, step.afficher_texte_override);
        return (
          <button
            key={cell.index}
            type="button"
            onClick={() => speak(step.libelle)}
            className="flex flex-col items-center gap-1 p-2"
            style={{ border: '1px solid var(--border)', borderRadius: 8 }}
          >
            <img src={step.picto_url} alt={step.libelle} style={{ width: 64, height: 64 }} />
            {showText && <span className="text-sm">{step.libelle}</span>}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlancheView/GridView.tsx
git commit -m "feat: add configurable grid render for TLA/mémo-consigne"
```

---

### Task 7.3: Export button and PlancheView assembly

**Files:**
- Create: `rituactif/src/components/PlancheView/ExportButton.tsx`
- Create: `rituactif/src/components/PlancheView/PlancheView.tsx`

- [ ] **Step 1: Create `src/components/PlancheView/ExportButton.tsx`**

```tsx
import html2pdf from 'html2pdf.js';

interface ExportButtonProps {
  targetId: string;
  fileName: string;
}

export function ExportButton({ targetId, fileName }: ExportButtonProps) {
  const handleExport = () => {
    const element = document.getElementById(targetId);
    if (!element) return;
    html2pdf()
      .set({
        margin: 10,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
  };

  return (
    <button className="plai-btn mt-4" type="button" onClick={handleExport}>
      Exporter en PDF
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/PlancheView/PlancheView.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { getRoutineWithSteps } from '../../lib/routines';
import type { Routine, RoutineStep } from '../../lib/types';
import { SequenceView } from './SequenceView';
import { GridView } from './GridView';
import { ExportButton } from './ExportButton';

interface PlancheViewProps {
  routineId: string;
  onBack: () => void;
}

export function PlancheView({ routineId, onBack }: PlancheViewProps) {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoutineWithSteps(routineId)
      .then(({ routine, steps }) => {
        setRoutine(routine);
        setSteps(steps);
      })
      .finally(() => setLoading(false));
  }, [routineId]);

  if (loading) return <p>Chargement...</p>;
  if (!routine) return <p>Planche introuvable.</p>;

  return (
    <div className="plai-section">
      <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>
      <div id="planche-export-root" className="plai-card">
        <h1 className="font-serif text-xl mb-4">{routine.nom}</h1>
        {routine.type_rendu === 'grille' ? (
          <GridView routine={routine} steps={steps} />
        ) : (
          <SequenceView routine={routine} steps={steps} />
        )}
        <footer className="mt-6 flex items-center gap-2">
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 24 }} />
          <span className="text-xs text-[var(--text3)]">{new Date().toLocaleDateString('fr-BE')}</span>
        </footer>
      </div>
      <ExportButton targetId="planche-export-root" fileName={routine.nom} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PlancheView/ExportButton.tsx src/components/PlancheView/PlancheView.tsx
git commit -m "feat: assemble planche view with PDF export and PLAI footer"
```

---

## Milestone 8 — App wiring, deployment, and QA

### Task 8.1: App.tsx routing

**Files:**
- Create: `rituactif/src/App.tsx`

- [ ] **Step 1: Create `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { RoutineEditor } from './components/RoutineEditor/RoutineEditor';
import { PlancheView } from './components/PlancheView/PlancheView';

type View = { name: 'dashboard' } | { name: 'editor' } | { name: 'viewer'; routineId: string };

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

  if (loading) return null;
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

  return (
    <Dashboard
      onCreateNew={() => setView({ name: 'editor' })}
      onOpenRoutine={(routineId) => setView({ name: 'viewer', routineId })}
    />
  );
}

export default App;
```

- [ ] **Step 2: Run the full build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors (per the project's absolute rule — this must pass before any push).

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`, open the printed local URL, and walk the golden path:
1. Sign up with a test email → lands on an empty Dashboard.
2. Click "+ Nouvelle planche", name it, pick "Séquentiel court", add 3 steps, search and validate a picto for each, use the ↑/↓ buttons to reorder them, confirm the order sticks, then click "Générer la planche".
3. Confirm the viewer shows the picto sequence with checkboxes and a working 🔊 button per step.
4. Go back, create a second planche with "Grille (TLA / mémo-consigne)", set a 2×2 grid, add 4 steps, generate, confirm the grid renders and "Exporter en PDF" downloads a file.
5. Try the FALC panel: paste a 2-clause sentence, click "Simplifier", confirm the reservation banner shows and the candidate list is editable before "Ajouter ces étapes".

Expected: all five checks pass without console errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire dashboard/editor/viewer routing in App.tsx"
```

---

### Task 8.2: Deployment configuration

**Files:**
- Create: `rituactif/vercel.json`
- Create: `rituactif/README.md`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Create `README.md`**

```markdown
# RituActif

Générateur de séquentiels visuels, emplois du temps visuels et grilles de pictogrammes
(TLA / mémo-consigne) pour enseignants FWB.

## Développement local

1. `npm install`
2. Copier `.env.example` vers `.env` et renseigner `VITE_SUPABASE_ANON_KEY`
   (projet Supabase partagé avec Picto-lecture : `otiorljbujqzruulmqrs.supabase.co`)
3. `npm run dev`

## Déploiement

GitHub `jfb4plai/RituActif` (branche `main`) → Vercel → `rituactif.jfb4plai.com`.
Variables d'environnement à définir dans Vercel : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Voir `docs/superpowers/specs/2026-07-08-rituactif-design.md` pour le design complet.
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json README.md
git commit -m "chore: add deployment config and README"
```

---

### Task 8.3: Create the GitHub repo and push

This step involves creating a new repository on a shared account — do it explicitly rather than automating it silently.

- [ ] **Step 1: Create the empty repo**

On github.com (account `jfb4plai`), create a new empty repository named `RituActif` (no README/gitignore template, since this project already has both).

- [ ] **Step 2: Push**

```bash
git branch -M main
git remote add origin https://github.com/jfb4plai/RituActif.git
git push -u origin main
```

Expected: push succeeds (per project memory, `gh` CLI isn't available here — this relies on cached Git Credential Manager credentials for `jfb4plai`, same as other PLAI repos).

- [ ] **Step 3: Connect to Vercel**

On vercel.com, import the `jfb4plai/RituActif` GitHub repo, set the project's root directory to `rituactif/` if the workspace root isn't the repo root, add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and set the domain to `rituactif.jfb4plai.com`.

---

### Task 8.4: Final security and RISS checklist

Run through the checklist from the design doc (`docs/superpowers/specs/2026-07-08-rituactif-design.md`, section 9) before calling this done:

- [ ] **Step 1: Confirm RLS blocks cross-user access**

Sign up two different test accounts in the deployed (or local) app. Create a planche as account A. Log out, log in as account B, and confirm account B's Dashboard does NOT list account A's planche.

- [ ] **Step 2: Confirm no key exposure**

Run: `grep -r "ANTHROPIC_API_KEY" rituactif/src`
Expected: no matches — the key must only ever appear in `supabase/functions/simplify-consigne-falc/index.ts` (Deno server-side code, not shipped to the browser).

- [ ] **Step 3: Confirm the FALC banner is not a one-time dismissal**

Reload the app, use the FALC panel twice in the same session, and confirm the reservation banner appears both times (it should re-render with the candidate list, not be dismissible/persisted away).

- [ ] **Step 4: Re-verify RISS references are still valid**

Spot-check 2-3 of the RISS ids cited in the design doc (e.g. `dumas-03348111`, `tel-04807443`) via `mcp__RISS__get_article` to confirm they still resolve before this ships to teachers.

- [ ] **Step 5: Final build check**

Run: `npx vite build`
Expected: succeeds with zero errors — this is the absolute gate before any push, per project rules.
