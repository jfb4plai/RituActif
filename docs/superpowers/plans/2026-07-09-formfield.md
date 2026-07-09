# Composant FormField partagé Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un composant `FormField` partagé qui rend structurellement impossible d'oublier l'association label/champ, et retoucher les 5 fichiers concernés (7 audités, 2 laissés inchangés) pour l'utiliser.

**Architecture:** Un seul composant `src/components/FormField.tsx` qui enveloppe un enfant unique (`input`/`select`/`textarea`) et lui injecte `id` (via `React.useId()`), `aria-describedby`, `aria-invalid` et `required` par `React.cloneElement`. Aucun changement de logique métier — uniquement le balisage des champs dans les fichiers consommateurs.

**Tech Stack:** React 18 + TypeScript, Vite 5. **Note sur les tests :** ce projet n'a aucune dépendance de test de rendu React (`@testing-library/react`, `jsdom`) — tous les tests existants (`vitest`) portent sur de la logique pure (mappers, parsers), jamais sur des composants. Ajouter cette dépendance uniquement pour ce composant serait disproportionné (YAGNI) et non discuté dans le design. La vérification se fait donc par build TypeScript (`npx vite build`, qui type-check les props JSX y compris le `cloneElement` typé) + vérification visuelle/clavier via `preview_*` — cohérent avec la checklist de la spec (section 8).

**Spec de référence :** `docs/superpowers/specs/2026-07-09-formfield-design.md`

---

### Task 1: Créer le composant FormField

**Files:**
- Create: `src/components/FormField.tsx`

- [ ] **Step 1: Créer le fichier avec le composant complet**

```tsx
import { useId, cloneElement, type ReactElement, type CSSProperties } from 'react';

type FieldChildProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  required?: boolean;
};

interface FormFieldProps {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  style?: CSSProperties;
  children: ReactElement<FieldChildProps>;
}

export function FormField({ label, help, error, required, style, children }: FormFieldProps) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  const field = cloneElement(children, {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    required: required || children.props.required,
  });

  return (
    <div className="plai-field" style={style}>
      <label className="plai-label" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {field}
      {help && (
        <p id={helpId} className="text-xs text-[var(--text3)] mt-1">
          {help}
        </p>
      )}
      {error && (
        <div id={errorId} className="plai-error mt-1" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Vérifier le build**

Run (from `C:\Users\jfbeg\OneDrive\claude-workspace\rituactif`): `npx vite build`
Expected: build réussi, aucune erreur TypeScript (fichier non encore importé nulle part, donc aucun impact sur le reste — le build doit passer comme avant).

- [ ] **Step 3: Commit**

```bash
git add src/components/FormField.tsx
git commit -m "$(cat <<'EOF'
Ajoute le composant FormField partagé

Wrapper label+champ qui génère l'id via useId() et l'injecte dans
l'enfant par cloneElement : l'association label/champ ne peut plus
être oubliée structurellement.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Retoucher Auth.tsx

**Files:**
- Modify: `src/components/Auth.tsx`

- [ ] **Step 1: Ajouter l'import**

`Auth.tsx` est dans `src/components/`, `FormField.tsx` aussi (Task 1) — import relatif `./FormField` :

```tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { FormField } from './FormField';
```

- [ ] **Step 2: Remplacer les deux champs**

Remplacer :

```tsx
          <div className="plai-field">
            <label className="plai-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="plai-input"
              type="email"
              placeholder="votre.email@ecole.be"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="plai-field">
            <label className="plai-label" htmlFor="password">Mot de passe</label>
            <input
              id="password"
              className="plai-input"
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
```

Par :

```tsx
          <FormField label="Email" required>
            <input
              className="plai-input"
              type="email"
              placeholder="votre.email@ecole.be"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Mot de passe" required>
            <input
              className="plai-input"
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </FormField>
```

- [ ] **Step 3: Vérifier le build**

Run: `npx vite build`
Expected: build réussi.

- [ ] **Step 4: Commit**

```bash
git add src/components/Auth.tsx
git commit -m "$(cat <<'EOF'
Migre Auth.tsx vers FormField

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Retoucher RoutineEditor.tsx

**Files:**
- Modify: `src/components/RoutineEditor/RoutineEditor.tsx`

- [ ] **Step 1: Ajouter l'import**

```tsx
import { useState } from 'react';
import { createRoutine, addStep } from '../../lib/routines';
import type { RenduType, RattachementType, GridConfig } from '../../lib/types';
import { FalcSimplifyPanel } from './FalcSimplifyPanel';
import { StepEditor, type DraftStep } from './StepEditor';
import { GridConfigPanel } from './GridConfigPanel';
import { FormField } from '../FormField';
```

- [ ] **Step 2: Remplacer les 3 champs "nom / type de rendu / rattachement + code élève"**

Remplacer :

```tsx
        <label htmlFor="routine-nom" className="block mb-1 font-medium">Nom de la planche</label>
        <input
          id="routine-nom"
          className="plai-input"
          placeholder='ex: "Retour de récré"'
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <p className="text-xs text-[var(--text3)] mt-1">
          Sert à retrouver cette planche dans votre tableau de bord.
        </p>

        <label htmlFor="routine-type-rendu" className="block mt-4 mb-1 font-medium">Type de rendu</label>
        <select
          id="routine-type-rendu"
          className="plai-input"
          value={typeRendu}
          onChange={(e) => setTypeRendu(e.target.value as RenduType)}
        >
          <option value="sequentiel">Séquentiel court (routine ponctuelle)</option>
          <option value="emploi_du_temps">Emploi du temps (avec horaires)</option>
          <option value="grille">Grille (TLA / mémo-consigne)</option>
        </select>

        <label htmlFor="routine-rattachement" className="block mt-4 mb-1 font-medium">Rattachement</label>
        <select
          id="routine-rattachement"
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
              id="routine-code-eleve"
              className="plai-input mt-2"
              placeholder="ex: Élève-7"
              value={rattachementCodeEleve}
              onChange={(e) => setRattachementCodeEleve(e.target.value)}
              aria-label="Code élève anonyme"
            />
            <p className="text-xs text-[var(--text3)] mt-1">
              Jamais de nom réel — un code anonyme suffit à retrouver la planche.
            </p>
          </>
        )}
```

Par :

```tsx
        <FormField label="Nom de la planche" help="Sert à retrouver cette planche dans votre tableau de bord.">
          <input
            className="plai-input"
            placeholder='ex: "Retour de récré"'
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </FormField>

        <FormField label="Type de rendu">
          <select
            className="plai-input"
            value={typeRendu}
            onChange={(e) => setTypeRendu(e.target.value as RenduType)}
          >
            <option value="sequentiel">Séquentiel court (routine ponctuelle)</option>
            <option value="emploi_du_temps">Emploi du temps (avec horaires)</option>
            <option value="grille">Grille (TLA / mémo-consigne)</option>
          </select>
        </FormField>

        <FormField label="Rattachement">
          <select
            className="plai-input"
            value={rattachementType}
            onChange={(e) => setRattachementType(e.target.value as RattachementType)}
          >
            <option value="classe">Générique classe</option>
            <option value="eleve">Élève (code anonyme)</option>
          </select>
        </FormField>
        {rattachementType === 'eleve' && (
          <FormField
            label="Code élève anonyme"
            help="Jamais de nom réel — un code anonyme suffit à retrouver la planche."
          >
            <input
              className="plai-input"
              placeholder="ex: Élève-7"
              value={rattachementCodeEleve}
              onChange={(e) => setRattachementCodeEleve(e.target.value)}
            />
          </FormField>
        )}
```

Note : la checkbox "Afficher le mot sous chaque pictogramme" (lignes 150-157 actuelles) **reste inchangée** — hors périmètre (pattern déjà accessible).

- [ ] **Step 3: Vérifier le build**

Run: `npx vite build`
Expected: build réussi.

- [ ] **Step 4: Commit**

```bash
git add src/components/RoutineEditor/RoutineEditor.tsx
git commit -m "$(cat <<'EOF'
Migre RoutineEditor.tsx vers FormField

Corrige le vrai bug d'accessibilité : le champ code élève n'avait
qu'un aria-label, aucun label visible.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Retoucher GridConfigPanel.tsx

**Files:**
- Modify: `src/components/RoutineEditor/GridConfigPanel.tsx`

- [ ] **Step 1: Remplacer tout le corps du composant**

Remplacer le fichier entier :

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
          aria-label="nombre de lignes"
        />
        <span>lignes ×</span>
        <input
          className="plai-input"
          type="number"
          min={1}
          max={10}
          value={value.cols}
          onChange={(e) => onChange({ ...value, cols: Number(e.target.value) })}
          aria-label="nombre de colonnes"
        />
        <span>colonnes</span>
      </div>
      <select
        className="plai-input mt-2"
        value={value.pageFormat}
        onChange={(e) => onChange({ ...value, pageFormat: e.target.value as GridConfig['pageFormat'] })}
        aria-label="format de page"
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

Par :

```tsx
import type { GridConfig } from '../../lib/types';
import { FormField } from '../FormField';

interface GridConfigPanelProps {
  value: GridConfig;
  onChange: (config: GridConfig) => void;
}

export function GridConfigPanel({ value, onChange }: GridConfigPanelProps) {
  return (
    <fieldset className="mt-4" style={{ border: 'none', padding: 0, margin: '1rem 0 0' }}>
      <legend className="block mb-1 font-medium">Grille (TLA / mémo-consigne)</legend>
      <div className="flex gap-2 items-end">
        <FormField label="Lignes" style={{ marginBottom: 0 }}>
          <input
            className="plai-input"
            type="number"
            min={1}
            max={10}
            value={value.rows}
            onChange={(e) => onChange({ ...value, rows: Number(e.target.value) })}
          />
        </FormField>
        <span className="pb-2">×</span>
        <FormField label="Colonnes" style={{ marginBottom: 0 }}>
          <input
            className="plai-input"
            type="number"
            min={1}
            max={10}
            value={value.cols}
            onChange={(e) => onChange({ ...value, cols: Number(e.target.value) })}
          />
        </FormField>
      </div>
      <FormField label="Format de page">
        <select
          className="plai-input mt-2"
          value={value.pageFormat}
          onChange={(e) => onChange({ ...value, pageFormat: e.target.value as GridConfig['pageFormat'] })}
        >
          <option value="a4-portrait">A4 portrait</option>
          <option value="a4-paysage">A4 paysage</option>
        </select>
      </FormField>
      <p className="text-xs text-[var(--text3)] mt-1">
        ex: 5 lignes × 3 colonnes pour un mémo-consigne A4 portrait.
      </p>
    </fieldset>
  );
}
```

Note : `fieldset`/`legend` remplacent le `div`/`label` de groupe existant (le "Grille (TLA / mémo-consigne)" n'est pas le label d'un champ précis, c'est un titre de groupe — `legend` est le bon élément sémantique). Les deux champs numériques passent `style={{ marginBottom: 0 }}` à `FormField` pour rester alignés horizontalement avec le `×` entre eux (`items-end` aligne les inputs sur leur base malgré les labels de hauteurs variables).

- [ ] **Step 2: Vérifier le build**

Run: `npx vite build`
Expected: build réussi.

- [ ] **Step 3: Commit**

```bash
git add src/components/RoutineEditor/GridConfigPanel.tsx
git commit -m "$(cat <<'EOF'
Migre GridConfigPanel.tsx vers FormField

Corrige 3 champs qui n'avaient qu'un aria-label, aucun label visible.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Retoucher StepEditor.tsx

**Files:**
- Modify: `src/components/RoutineEditor/StepEditor.tsx`

- [ ] **Step 1: Remplacer tout le corps du composant**

Remplacer le fichier entier :

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
    <div className="flex gap-3 items-start flex-wrap border rounded-lg p-2" style={{ borderColor: 'var(--border)' }}>
      <input
        className="plai-input"
        placeholder='ex: "se laver les mains"'
        value={step.libelle}
        onChange={(e) => onChange({ libelle: e.target.value })}
        aria-label="Libellé de l'étape"
        style={{ minWidth: 0, flex: '1 1 200px' }}
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
          aria-label="Heure de cette étape"
        />
      )}

      <select
        className="plai-input"
        value={step.afficherTexteOverride === null ? 'herite' : step.afficherTexteOverride ? 'oui' : 'non'}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ afficherTexteOverride: v === 'herite' ? null : v === 'oui' });
        }}
        aria-label="Affichage du texte pour cette étape"
      >
        <option value="herite">Texte : suit le réglage global ({afficherTexteGlobal ? 'affiché' : 'masqué'})</option>
        <option value="oui">Texte : toujours affiché (travail lexical ciblé)</option>
        <option value="non">Texte : toujours masqué</option>
      </select>

      <button
        type="button"
        onClick={onRemove}
        aria-label={step.libelle ? `Supprimer l'étape : ${step.libelle}` : 'Supprimer cette étape'}
      >
        ✕
      </button>
    </div>
  );
}
```

Par :

```tsx
import type { RenduType, PictoSource } from '../../lib/types';
import { PictogramPicker } from './PictogramPicker';
import { FormField } from '../FormField';

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
    <div className="flex gap-3 items-start flex-wrap border rounded-lg p-2" style={{ borderColor: 'var(--border)' }}>
      <FormField label="Libellé de l'étape" style={{ minWidth: 0, flex: '1 1 200px', marginBottom: 0 }}>
        <input
          className="plai-input"
          placeholder='ex: "se laver les mains"'
          value={step.libelle}
          onChange={(e) => onChange({ libelle: e.target.value })}
        />
      </FormField>

      <PictogramPicker
        libelle={step.libelle}
        pictoUrl={step.pictoUrl}
        onSelect={(url, source) => onChange({ pictoUrl: url, pictoSource: source })}
      />

      {typeRendu === 'emploi_du_temps' && (
        <FormField label="Heure de cette étape" style={{ marginBottom: 0 }}>
          <input
            className="plai-input"
            type="time"
            value={step.horaire}
            onChange={(e) => onChange({ horaire: e.target.value })}
          />
        </FormField>
      )}

      <FormField label="Affichage du texte pour cette étape" style={{ marginBottom: 0 }}>
        <select
          className="plai-input"
          value={step.afficherTexteOverride === null ? 'herite' : step.afficherTexteOverride ? 'oui' : 'non'}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ afficherTexteOverride: v === 'herite' ? null : v === 'oui' });
          }}
        >
          <option value="herite">Texte : suit le réglage global ({afficherTexteGlobal ? 'affiché' : 'masqué'})</option>
          <option value="oui">Texte : toujours affiché (travail lexical ciblé)</option>
          <option value="non">Texte : toujours masqué</option>
        </select>
      </FormField>

      <button
        type="button"
        onClick={onRemove}
        aria-label={step.libelle ? `Supprimer l'étape : ${step.libelle}` : 'Supprimer cette étape'}
      >
        ✕
      </button>
    </div>
  );
}
```

Note : tous les `FormField` de ce fichier passent `marginBottom: 0` car ils vivent dans une rangée flex horizontale (`flex gap-3 items-start flex-wrap`) où l'espacement vient de `gap-3` du parent, pas de la marge de chaque champ. Le libellé garde en plus `minWidth: 0, flex: '1 1 200px'` (déplacé de l'`<input>` vers le `<FormField>`, puisque c'est maintenant le wrapper qui doit se comporter comme l'item flexible dans la rangée — l'`<input>` interne, en `width: 100%` via `.plai-input`, remplit son wrapper).

- [ ] **Step 2: Vérifier le build**

Run: `npx vite build`
Expected: build réussi.

- [ ] **Step 3: Commit**

```bash
git add src/components/RoutineEditor/StepEditor.tsx
git commit -m "$(cat <<'EOF'
Migre StepEditor.tsx vers FormField

Corrige 3 champs qui n'avaient qu'un aria-label, aucun label visible.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Retoucher FalcSimplifyPanel.tsx

**Files:**
- Modify: `src/components/RoutineEditor/FalcSimplifyPanel.tsx`

- [ ] **Step 1: Remplacer tout le corps du composant**

Remplacer le fichier entier :

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
      const result = await simplifyConsigne(text);
      setCandidates(result);
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
        aria-label="Consigne longue à simplifier"
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
            role="note"
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
                <input
                  className="plai-input"
                  value={c}
                  onChange={(e) => updateCandidate(index, e.target.value)}
                  aria-label={`Étape ${index + 1} sur ${candidates.length}`}
                />
                <button
                  type="button"
                  onClick={() => removeCandidate(index)}
                  aria-label={c.trim() ? `Retirer l'étape : ${c}` : 'Retirer cette étape (vide)'}
                >
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

Par :

```tsx
import { useState } from 'react';
import { simplifyConsigne } from '../../lib/falc';
import { FormField } from '../FormField';

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
      const result = await simplifyConsigne(text);
      setCandidates(result);
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
      <FormField
        label="Consigne longue à simplifier"
        help="Collez une consigne écrite normalement, elle sera proposée découpée en étapes courtes — à valider ou corriger avant de continuer."
        error={error ?? undefined}
      >
        <textarea
          className="plai-input"
          rows={3}
          placeholder='ex: "Range ton banc, prends ton cartable et mets-toi en rang devant la porte."'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </FormField>
      <button
        className="plai-btn mt-2"
        type="button"
        onClick={handleSimplify}
        disabled={loading || !text.trim()}
      >
        {loading ? 'Simplification...' : 'Simplifier (inspiré du FALC)'}
      </button>

      {candidates.length > 0 && (
        <div className="mt-3">
          <div
            role="note"
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
                <FormField label={`Étape ${index + 1} sur ${candidates.length}`} style={{ marginBottom: 0, flex: 1 }}>
                  <input
                    className="plai-input"
                    value={c}
                    onChange={(e) => updateCandidate(index, e.target.value)}
                  />
                </FormField>
                <button
                  type="button"
                  onClick={() => removeCandidate(index)}
                  aria-label={c.trim() ? `Retirer l'étape : ${c}` : 'Retirer cette étape (vide)'}
                >
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

Note : l'erreur de simplification (`error` du composant) est maintenant rattachée au champ textarea via `FormField error={...}` (annoncée par `role="alert"` + `aria-describedby`) au lieu d'un `<div className="plai-error">` flottant après le bouton — cohérent avec la spec (section 4, prop `error` de `FormField`), et strictement équivalent visuellement (même classe `.plai-error`). Le texte d'aide passe d'avant à après le textarea (changement voulu, section 3 de la spec). Les items de la liste dynamique gardent leur `aria-label` dynamique — devenu le `label` visible de chaque `FormField`, avec `flex: 1` pour occuper l'espace disponible dans le `<li>` flex.

- [ ] **Step 2: Vérifier le build**

Run: `npx vite build`
Expected: build réussi.

- [ ] **Step 3: Commit**

```bash
git add src/components/RoutineEditor/FalcSimplifyPanel.tsx
git commit -m "$(cat <<'EOF'
Migre FalcSimplifyPanel.tsx vers FormField

Corrige 2 champs (textarea + liste dynamique) qui n'avaient qu'un
aria-label, aucun label visible. Aide déplacée après le champ pour
cohérence avec les autres FormField du projet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Vérification visuelle et au clavier

**Files:** aucun (vérification uniquement)

- [ ] **Step 1: Démarrer le serveur de preview**

Utiliser `preview_start` avec la configuration `rituactif` (`.claude/launch.json` racine du workspace, port 5177).

- [ ] **Step 2: Vérifier l'écran de connexion**

`preview_snapshot` sur la page d'accueil (écran `Auth`) : confirmer que "Email" et "Mot de passe" apparaissent comme labels visibles au-dessus de leurs champs respectifs (pas seulement dans l'accessibility tree).

- [ ] **Step 3: Se connecter et ouvrir l'éditeur de planche**

Se connecter avec un compte de test existant (ou en créer un via le formulaire), puis créer une nouvelle planche pour atteindre `RoutineEditor`.

- [ ] **Step 4: Vérifier RoutineEditor + GridConfigPanel**

`preview_snapshot` : confirmer "Nom de la planche", "Type de rendu", "Rattachement" visibles. Sélectionner "Élève (code anonyme)" dans Rattachement, confirmer que "Code élève anonyme" apparaît comme label visible (c'était le bug réel). Sélectionner le rendu "Grille", confirmer "Lignes", "Colonnes", "Format de page" visibles sous le titre de groupe "Grille (TLA / mémo-consigne)".

- [ ] **Step 5: Vérifier StepEditor**

Ajouter une étape, `preview_snapshot` : confirmer "Libellé de l'étape" et "Affichage du texte pour cette étape" visibles, layout horizontal toujours cohérent (pas de champs qui se chevauchent ou débordent). Avec le rendu "Emploi du temps" sélectionné, confirmer "Heure de cette étape" visible.

- [ ] **Step 6: Vérifier FalcSimplifyPanel**

`preview_fill` un texte dans le champ "Consigne longue à simplifier", confirmer via `preview_snapshot` que le label est visible et que le texte d'aide apparaît bien après le champ (pas avant).

- [ ] **Step 7: Test clavier**

Via `preview_eval`, vérifier qu'un `Tab` depuis le champ email atteint bien le champ mot de passe (ordre de tabulation naturel, aucun `tabindex` cassé par le wrapper).

- [ ] **Step 8: Capturer une preuve visuelle**

`preview_screenshot` de l'écran `RoutineEditor` avec une étape et le rendu grille sélectionné.

- [ ] **Step 9: Arrêter le serveur de preview**

`preview_stop`.
