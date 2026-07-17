# Design — Mode Letterboard + défaut classe/élève dans Communication

Date : 2026-07-17
Statut : validé par JF, en attente de plan d'implémentation

## Contexte

RituActif a déjà une fonctionnalité "Communication" livrée le 2026-07-14 : planche de
pictogrammes ARASAAC par élève (code anonyme), phrase composée dans une bande, lue en
synthèse vocale, avec persistance des phrases (`ritu_phrases_log`) derrière un écran de
consentement explicite, et purge RGPD automatique en fin d'année scolaire FWB.

Un prompt de départ demandait de construire ce mode "Communication" comme s'il n'existait
pas encore, avec des décisions différentes (aucune persistance, catégories librement
créées, pas de maintien prolongé). L'inspection du code réel (`src/components/Communication*`,
`src/lib/communication.ts`, `supabase/migrations/20260713000000_create_ritu_communication_tables.sql`)
a montré le conflit. Les décisions ci-dessous sont celles validées avec JF après confrontation
au code existant — cette itération **étend** l'existant, elle ne le reconstruit pas.

## Décisions validées

1. **Persistance** : on garde le comportement existant (persistance + consentement). La
   clause "aucune persistance v1" du prompt de départ est abandonnée.
2. **Défaut classe** : on ajoute un vrai niveau classe (nouvelle table), avec bascule par
   élève en 1 clic, sans champ de justification.
3. **Catégories Pictogrammes** : le CRUD add/remove existait déjà (recherche ARASAAC via
   `NewItemForm`). Seul ajout : le réordonnancement. Pas de catégories libres — les 6
   catégories fixes actuelles (`personnes`, `actions`, `descriptifs`, `social`, `objets`,
   `sentiments`) restent inchangées.
4. **Maintien prolongé (GAIA G10)** : appliqué aux deux modes (Pictogrammes existant compris),
   réglable par planche avec repli sur un défaut classe.

## Référence scientifique — vérification RISS

GAIA (Britto & Pizzolato, UFSCar, thèse 2016 / article RBIE 2018) est la source du
mécanisme de maintien prolongé (G10) qui structure cette itération. **Recherche effectuée
dans le corpus RISS (`mcp__RISS__search_articles`) avant rédaction du code : GAIA/Britto/
Pizzolato absent du corpus.** Conformément à la règle absolue PLAI : GAIA est réel, mais
**hors corpus RISS** — à mentionner explicitement comme tel dans toute documentation ou
justification exposée, jamais présenté comme une source validée RISS.

Références RISS validées trouvées en appui de la logique CAA/TSA du design (canaux
redondants, environnement hypostimulant, pertinence du vocabulaire contextuel) :

- Fouré, L. (2023). *Influence des Tableaux de Langage Assisté sur les compétences
  pronominales : étude de cas auprès d'enfants présentant un trouble du spectre
  autistique.* (dumas-04390420)
- Lesain, L. (2020). *Effets de l'introduction des tableaux de langage assisté sur les
  particularités comportementales et communicationnelles d'enfants porteurs de troubles du
  spectre autistique.* (dumas-02901714)
- Prudhon, E. & Duboisdindien, G. (2016). *Ressources et potentialités linguistiques des
  Communications alternatives et améliorées pour les personnes avec TSA.* (halshs-01721781)

## Modèle de données

```sql
-- nouvelle table : un défaut par enseignant (niveau "classe")
create table ritu_communication_defaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode_defaut text not null default 'pictogrammes' check (mode_defaut in ('pictogrammes','letterboard')),
  hold_ms integer not null default 500,
  select_on_release boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table ritu_communication_defaults enable row level security;
create policy "ritu_communication_defaults_owner_all" on ritu_communication_defaults
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- planche existante : bascule optionnelle par élève
alter table ritu_communication_boards
  add column mode text check (mode in ('pictogrammes','letterboard')),
  add column hold_ms integer,
  add column select_on_release boolean;
```

Résolution en lecture : `board.mode ?? defaults.mode_defaut ?? 'pictogrammes'` (et pareil
pour `hold_ms` / `select_on_release`). `null` sur la planche signifie explicitement "suit le
défaut classe" — c'est l'état par défaut d'une planche nouvellement créée.

**Réordonnancement** des pictos : pas de nouvelle colonne, boutons ↑/↓ dans
`CommunicationEditor.tsx` qui réécrivent la colonne `ordre` déjà existante sur
`ritu_communication_items`.

Aucun changement sur `ritu_communication_items`, `ritu_phrases_log`, la fonction de purge
RGPD ou son cron — tout ça reste identique et s'applique aux deux modes.

## Mécanisme partagé : maintien prolongé

Hook `useHoldToSelect(itemId, { holdMs, selectOnRelease }, onConfirm)` dans
`src/lib/holdToSelect.ts`, utilisé par Pictogrammes et Letterboard :

- **Mode maintien** (défaut) : `onPointerDown` démarre un timer `holdMs` ; à expiration,
  feedback visuel immédiat (halo/scale) puis `onConfirm`. Relâchement avant expiration
  annule sans effet (tolérance à l'erreur).
- **Mode relâchement** (option motricité, GAIA G10) : feedback de "pression en cours" au
  `onPointerDown`, confirmation au `onPointerUp` quelle que soit la durée.
- Retour sonore léger à la confirmation (`AudioContext`, pas de fichier externe), distinct
  du son de la synthèse vocale de la phrase (GAIA G9 : confirmation de tap ≠ validation
  finale du message).

## Mode Pictogrammes — changements

- `CategoryBoard.tsx` : `onClick` → `useHoldToSelect`, avec `hold_ms`/`select_on_release`
  résolus comme ci-dessus.
- `CommunicationEditor.tsx` : ajoute ↑/↓ par item (écrit `ordre`) ; ajoute un sélecteur de
  mode (Pictogrammes/Letterboard) et les réglages hold en tête d'écran, avec l'affichage
  explicite "suit le défaut classe" vs "réglage propre à cet élève" — visible sans sous-menu
  (Bloc 8 du prompt de départ).
- Nouvel écran "Défaut classe" accessible depuis la section Communication du Dashboard : un
  formulaire (mode, hold_ms, select_on_release), upsert sur `ritu_communication_defaults`.

`NewItemForm.tsx`, la recherche ARASAAC, `tts.ts`, la persistance et le consentement
restent inchangés.

## Mode Letterboard — nouveau

- `src/components/CommunicationView/LetterboardView.tsx` : grille a-z + accents français
  (é è à ç ù â ê î ô û ï) + espace + effacement (dernier caractère / tout effacer), même
  hook `useHoldToSelect`.
- Zone de composition au-dessus de la grille, bouton "🔊 Parler" (réutilise `speak()` de
  `tts.ts`), toggle majuscules/minuscules (état local, non persisté).
- Persistance de la phrase parlée : réutilise `recordPhrase` / `ritu_phrases_log`, même
  écran de consentement déjà validé au niveau de la planche (pas redemandé par mode).
- Pas d'éditeur dédié : l'alphabet est fixe, rien à administrer côté enseignant pour ce mode
  au-delà du choix mode/réglages hold déjà couverts par `CommunicationEditor`.

## Hors périmètre (confirmé)

- Prédiction de mots, correction orthographique, suggestion de complétion (Letterboard).
- Suggestion automatique de pictogrammes par IA/contexte.
- Catégories de vocabulaire libres/créées par l'enseignant.
- Historique persistant au-delà de `ritu_phrases_log` existant (pas de nouvel historique
  "phrases fréquentes").
- Nouveau système de comptes/authentification.

## Tests

- `holdToSelect.test.ts` : timer expire → confirm ; relâchement avant expiration → pas de
  confirm ; mode relâchement → confirm immédiat au `pointerup`.
- `letterboard` : composition d'une phrase, effacement dernier caractère, effacement total,
  toggle maj/min affecte uniquement l'affichage (pas la valeur parlée/enregistrée).
- Résolution de mode/réglages : planche sans override → suit défaut classe ; planche avec
  override → prévaut ; absence de ligne `ritu_communication_defaults` → repli sur
  `'pictogrammes'`/500ms/faux.
