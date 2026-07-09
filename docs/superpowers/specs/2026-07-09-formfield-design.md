# Composant FormField partagé — Design

## 1. Objectif

Éliminer la récurrence du bug "champ de formulaire sans label accessible" — trouvé et corrigé individuellement 5 fois en revue de code sur `Auth.tsx`, `Dashboard.tsx` (finalement sans champ), `GridConfigPanel.tsx`, `PictogramPicker.tsx`, `StepEditor.tsx`, `FalcSimplifyPanel.tsx`, `RoutineEditor.tsx`. Une tentative parallèle a été démarrée par l'utilisateur en session séparée puis annulée pour éviter un conflit avec l'exécution du plan RituActif ; ce document la refait proprement, seul, sur le repo maintenant stable.

## 2. Constat (audit du code existant au 2026-07-09)

Quatre patterns coexistent aujourd'hui, un seul est un vrai bug d'accessibilité :

| Pattern | Fichiers | Statut |
|---|---|---|
| `<div class="plai-field"><label class="plai-label" for>...<input id>` | Auth.tsx (email, password) | Accessible, mais classe `.plai-field`/`.plai-label` non reprise ailleurs |
| `<label for class="block mt-4 mb-1 font-medium">...<input id>` | RoutineEditor.tsx (nom, type de rendu, rattachement) | Accessible, mais classes ad hoc différentes d'Auth.tsx |
| `<input aria-label="...">`, **aucun label visible** | GridConfigPanel.tsx (3 champs), StepEditor.tsx (3 champs), FalcSimplifyPanel.tsx (2 champs), RoutineEditor.tsx (code élève) | **Bug réel** — 8 occurrences au total, pas 5 comme initialement compté (le "5" de la revue de code sous-comptait FalcSimplifyPanel et un champ de RoutineEditor) |
| `<label>texte<input/></label>` (input imbriqué, sans `for`/`id`) | PictogramPicker.tsx (file), RoutineEditor.tsx (checkbox) | Accessible nativement (technique W3C valide) — **hors périmètre**, volontairement laissé tel quel |

Aucune classe CSS n'existe aujourd'hui pour le texte d'aide (aide utilise des classes Tailwind arbitraires `text-xs text-[var(--text3)]` directement, positionnées tantôt avant tantôt après le champ) ni pour l'indicateur "requis".

## 3. Décisions validées avec l'utilisateur

- **Périmètre** : `FormField` unifie tous les champs texte/select/textarea/number/time (y compris ceux déjà accessibles d'Auth.tsx et RoutineEditor.tsx), pas seulement les 8 buggés. Objectif : un seul pattern pour tout futur champ, pour que le bug ne puisse pas repartir sur une nouvelle variante ad hoc.
- **Association label/champ** : génération automatique d'un `id` stable via `React.useId()`, injecté dans l'enfant par `React.cloneElement` (avec `aria-describedby` vers l'aide/erreur et `aria-invalid`/`required` si fournis). L'appelant ne gère jamais d'`id` lui-même — rend le bug structurellement impossible à reproduire.
- **Checkbox et file input** : laissés tels quels (pattern `<label>texte<input/></label>` déjà valide). Pas de nouveau `CheckboxField`.
- **Position du texte d'aide** : toujours après le champ (cohérent avec la règle CLAUDE.md du projet : "texte d'aide sous le champ"). FalcSimplifyPanel passe de "avant" à "après" — seul changement visuel du chantier.

## 4. API du composant

Nouveau fichier : `src/components/FormField.tsx`

```tsx
import { useId, cloneElement, type ReactElement } from 'react';

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
  children: ReactElement<FieldChildProps>;
}

export function FormField({ label, help, error, required, children }: FormFieldProps) {
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
    <div className="plai-field">
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

Usage type :

```tsx
<FormField label="Email" required>
  <input type="email" className="plai-input" placeholder="votre.email@ecole.be" value={email} onChange={...} />
</FormField>
```

## 5. Plan de retouche par fichier

Aucun changement de comportement, de props exportées ou de logique métier — uniquement le balisage des champs. Détail exact par fichier :

### `Auth.tsx`
- Email : `label="Email"`, garde `placeholder`, `required`
- Password : `label="Mot de passe"`, garde `placeholder`, `required`, `minLength={6}`
- L'erreur de formulaire (`plai-error` global sous les deux champs) reste inchangée — ce n'est pas une erreur par champ, pas de prop `error` sur ces deux `FormField`.

### `RoutineEditor.tsx`
- Nom : `label="Nom de la planche"`, `help="Sert à retrouver cette planche dans votre tableau de bord."` (déplacé après, inchangé en position — déjà après)
- Type de rendu : `label="Type de rendu"`, pas d'aide
- Rattachement : `label="Rattachement"`, pas d'aide
- Code élève (conditionnel `rattachementType === 'eleve'`) : `label="Code élève anonyme"`, `help="Jamais de nom réel — un code anonyme suffit à retrouver la planche."`, `placeholder="ex: Élève-7"` conservé — **c'est ici le vrai bug corrigé** (avant : `aria-label` seul)
- Checkbox "Afficher le mot sous chaque pictogramme" : **inchangée**, hors périmètre

### `GridConfigPanel.tsx`
- Regroupement dans un `<fieldset><legend>Grille (TLA / mémo-consigne)</legend>` (reprend le texte actuel du titre du panneau)
- Lignes : `label="Lignes"`, input `type="number" min={1} max={10}`
- Colonnes : `label="Colonnes"`, input `type="number" min={1} max={10}`
- Format de page : `label="Format de page"`, select inchangé (2 options)
- Le texte d'exemple actuel ("ex: 5 lignes × 3 colonnes pour un mémo-consigne A4 portrait.") décrit la combinaison des 3 champs, pas un seul — reste un `<p>` sous le `fieldset`, hors `FormField` (pas de faux rattachement à un champ précis)

### `PictogramPicker.tsx`
- **Inchangé** — hors périmètre (pattern label-enveloppant déjà valide)

### `StepEditor.tsx`
- Libellé de l'étape : `label="Libellé de l'étape"`, garde le `placeholder` et le style flex existant (`style={{ minWidth: 0, flex: '1 1 200px' }}` reste sur l'input, pas sur le wrapper — voir note technique section 6)
- Horaire (conditionnel `typeRendu === 'emploi_du_temps'`) : `label="Heure de cette étape"`, `type="time"`
- Affichage du texte : `label="Affichage du texte pour cette étape"`, select à 3 options inchangé

### `FalcSimplifyPanel.tsx`
- Textarea consigne longue : `label="Consigne longue à simplifier"`, `help="Collez une consigne écrite normalement, elle sera proposée découpée en étapes courtes — à valider ou corriger avant de continuer."` (déplacé de avant → après le textarea), `error={error}` si présent
- Items de la liste dynamique (`candidates.map`) : `label={`Étape ${index + 1} sur ${candidates.length}`}` (identique à l'`aria-label` dynamique actuel, juste rendu visible)

## 6. Note technique — layout flex existant

`StepEditor.tsx` utilise aujourd'hui `style={{ minWidth: 0, flex: '1 1 200px' }}` directement sur l'`<input>` pour un layout flex horizontal (libellé + horaire + select sur une ligne). `FormField` enveloppe l'input dans un `<div class="plai-field">` (`margin-bottom: 1rem` par défaut) : si ce wrapper casse le layout flex horizontal de `StepEditor`, il faudra soit passer le style flex sur le `FormField` lui-même (ajouter une prop `style`/`className` optionnelle sur le wrapper), soit ajuster le CSS de `.plai-field` localement. À vérifier visuellement (preview) à l'implémentation — pas un problème d'accessibilité, un problème de mise en page à corriger sur place si constaté.

## 7. Ce que ce chantier ne fait pas

- Pas de nouveau composant `CheckboxField` (section 3)
- Pas de nouvelle classe CSS globale — réutilise `.plai-field`, `.plai-label`, `.plai-error` existantes, garde les classes Tailwind arbitraires pour le texte d'aide (cohérent avec l'usage actuel)
- Pas de modification du fichier CSS partagé canonique (`shared/css/plai-style.css`) — uniquement la copie locale de RituActif si un ajustement CSS s'avère nécessaire (section 6)
- Pas de gestion de validation en temps réel ni de nouvelle logique métier — `error`/`help`/`required` sont des props passives, la logique de validation existante (ex. `canGenerate` dans RoutineEditor) est inchangée

## 8. Checklist avant commit

- `npx vite build` sans erreur
- Chaque champ retouché testé au clavier (Tab, label lisible par un lecteur d'écran via `aria-describedby`)
- Layout de `StepEditor.tsx` vérifié visuellement (section 6)
- Aucune régression de comportement (valeurs, placeholders, contraintes `min`/`max`/`minLength` toutes conservées)
