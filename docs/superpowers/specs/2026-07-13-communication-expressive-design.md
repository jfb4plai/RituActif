# Mode "Je m'exprime" — planche de communication expressive — Design

## 1. Objectif

RituActif ne génère aujourd'hui que des planches **réceptives** (l'enseignant construit une séquence/emploi du temps/grille, l'élève la consulte en lecture seule via `PlancheView`). Ce chantier ajoute un mode **expressif** : l'élève compose lui-même une courte phrase en pictogrammes, dite à voix haute par synthèse vocale — pour élèves non ou peu verbaux (TSA notamment).

Origine : demande de s'inspirer de `cboard-org/cboard` (système CAA web mature, 740★). Vérification faite en session : **licence GPL-3.0 (copyleft)**, incompatible avec la réutilisation de code dans RituActif (fermé). Décision validée : réimplémentation native, inspirée de l'architecture et du format OBF (spec ouverte, indépendante de la licence cboard), aucun code cboard copié.

## 2. Ancrage scientifique (RISS, vérifié le 2026-07-13)

- `dumas-03696073` (TLA préélémentaire, pictos ARASAAC) — utilise le **code couleur Fitzgerald** pour catégoriser les mots par fonction grammaticale. Base retenue pour les catégories fixes (section 4), plutôt qu'une taxonomie inventée.
- `dumas-04390420` (TLA et compétences pronominales, TSA) — les tableaux de langage assisté organisés pour respecter **l'ordre naturel de la phrase** favorisent le développement syntaxique. Justifie que la bande de phrase concatène dans l'ordre de composition, sans réordonnancement automatique.
- `hal-04544863` (langage et communication dans les TSA) — confirme le motif standard CAA : grille de pictogrammes + bande-phrase au-dessus, cohérent avec le design retenu.

## 3. Décisions validées avec l'utilisateur

- **Réimplémentation, pas d'intégration cboard** (contrainte GPL-3.0, section 1).
- **Portée V1 = intermédiaire** : planche à plat (catégories fixes, pas de dossiers/navigation profonde) + bande de phrase courte (2 à 4 mots). Pas de grammaire/conjugaison, pas de moteur de dossiers imbriqués façon cboard complet.
- **Une planche par élève**, catégories fixes (liste section 4) — pas de planches multiples par contexte.
- **Historique des phrases persisté** (`ritu_phrases_log`), avec purge automatique en fin de période scolaire — pas d'option "éphémère" ni "purge manuelle uniquement" (risque de non-conformité RGPD si personne ne purge).
- **Validation humaine obligatoire de chaque picto** ajouté à une planche de communication — même règle que les routines (jamais d'auto-sélection/auto-remplissage), y compris pour les catégories "standard" Fitzgerald.

## 4. Catégories fixes (code couleur Fitzgerald)

| Catégorie | Couleur | Exemples |
|---|---|---|
| Personnes | 🟡 jaune | je, toi, maman, papa, maîtresse |
| Actions | 🟢 vert | vouloir, aller, manger, arrêter |
| Descriptifs | 🔵 bleu | grand, content, fatigué |
| Petits mots sociaux | 🩷 rose | oui, non, encore, stop, s'il te plaît |
| Objets/lieux | 🟠 orange | toilettes, cour, livre |
| Sentiments | 🟣 violet | triste, en colère, content |

Planche créée vide (6 catégories sans picto) au premier accès pour un code élève donné — l'enseignant remplit chaque catégorie via l'éditeur (section 5).

## 5. Modèle de données

Nouvelles tables, préfixe `ritu_` obligatoire (projet Supabase partagé, cf. collision déjà rencontrée sur un autre projet) :

```sql
ritu_communication_boards
  id, user_id, rattachement_code_eleve, created_at, consentement_valide_at (nullable)

ritu_communication_items
  id, board_id (fk), categorie (enum: personnes|actions|descriptifs|social|objets|sentiments),
  libelle, picto_url, picto_source (arasaac|perso), ordre

ritu_phrases_log
  id, board_id (fk), phrase_texte, created_at
```

RLS sur les 3 tables : `auth.uid() = user_id` (directement sur `ritu_communication_boards`, via jointure sur `board_id` pour les deux autres) — pattern identique à `ritu_routines`/`ritu_steps`.

Une planche par (`user_id`, `rattachement_code_eleve`) — créée à la volée si elle n'existe pas encore au moment où l'enseignant ouvre ce code depuis le Dashboard.

## 6. Architecture composants

**Navigation** — deux nouvelles entrées dans le type `View` de `App.tsx` :
- `{ name: 'communication-editor', boardId }`
- `{ name: 'communication-viewer', boardId }`

Nouveau bouton "Communication" sur `Dashboard.tsx`, à côté de "Nouvelle routine" — liste les planches existantes par code élève + création d'une nouvelle.

**Côté enseignant** — `src/components/CommunicationEditor/` (miroir de `RoutineEditor/`) :
- `CommunicationEditor.tsx` — orchestration, un onglet par catégorie
- Réutilise `PictogramPicker.tsx` et `FormField.tsx` tels quels pour l'ajout/retrait d'items

**Côté élève** — `src/components/CommunicationView/` (miroir de `PlancheView/`), plein écran, cibles tactiles larges :
- `CommunicationView.tsx` — charge la planche + items, orchestration
- `PhraseStrip.tsx` — bande de phrase (2-4 emplacements), boutons "🔊 Dire la phrase" et "✕ Effacer"
- `CategoryBoard.tsx` — 6 onglets colorés à plat, grille de pictos par catégorie

**lib** :
- `src/lib/communication.ts` — CRUD board/items/log, miroir de `routines.ts`
- Réutilise `tts.ts` (Web Speech API, déjà en prod) et `arasaac.ts` sans modification

## 7. Flux d'interaction élève

1. Tap sur un picto → ajouté à la bande **et** lu immédiatement seul (retour sonore instantané par mot, pratique standard en CAA).
2. Bande pleine (4 mots) → tap suivant ignoré, feedback visuel léger, pas d'erreur bloquante.
3. Bouton "🔊 Dire la phrase" → concatène et lit la bande entière dans l'ordre de composition (section 2, `dumas-04390420`) → écrit une ligne dans `ritu_phrases_log` → bande vidée. **Seule la validation finale est journalisée**, pas chaque tap individuel.
4. Bouton "✕ Effacer" → vide la bande sans dire ni journaliser.
5. Catégorie sans item → message façon `plai-empty` ("Pas encore de pictos ici").

## 8. RGPD — rétention et consentement

**Risque identifié** (indépendant de l'hébergement UE de Supabase) : les phrases composées peuvent constituer une donnée de santé ou de vie familiale (art. 9 RGPD — catégorie particulière), et le contenu textuel peut réidentifier l'élève ou un tiers même si `rattachement_code_eleve` reste anonyme.

**Mitigations retenues** :
- Purge automatique : nouvelle Supabase Edge Function `purge-phrases-log` (même pattern que `search-pictograms`/`simplify-consigne-falc`), déclenchée par un cron quotidien. Supprime les lignes de `ritu_phrases_log` antérieures au 1er septembre de l'année scolaire FWB en cours. Échec du job → sans impact sur l'usage de l'app, retenté au run suivant.
- Bandeau de consentement obligatoire avant le premier accès à une planche de communication (même mécanisme que la réserve FALC déjà en prod), à valider explicitement par l'enseignant : *"Cette planche peut faire dire à l'élève des informations sensibles (santé, famille). Les phrases sont conservées jusqu'à la fin de l'année scolaire, visibles uniquement par vous. Vérifiez que le cadre (PIA, consentement parental) l'autorise."* — validation stockée dans `consentement_valide_at` sur `ritu_communication_boards` : demandé **une seule fois par planche** (pas à chaque session), redemandé uniquement si jamais validé.

## 9. Edge cases

- Web Speech API absente : `tts.ts` échoue silencieusement (comportement existant, inchangé) — acceptable ici car la bande affiche déjà le texte/picto à l'écran, la communication reste visible sans son.
- Écriture du log échoue (réseau coupé) : la lecture vocale n'est **pas bloquée** par l'écriture du log — best-effort, échec silencieux (l'expression de l'élève prime sur la traçabilité).
- Premier accès à un code élève sans planche existante : création à la volée, 6 catégories vides.

## 10. Tests

- Fonctions pures uniquement (pattern déjà en place — `textVisibility.test.ts`, `gridLayout.test.ts`) : concaténation ordonnée de la bande, calcul de la date de purge (1er septembre de l'année scolaire en cours).
- Pas de test unitaire sur le CRUD Supabase (cohérent avec `routines.ts`, non testé).
- Smoke test manuel avant déploiement : création planche → ajout pictos par catégorie → composition phrase 3 mots → lecture → vérification `ritu_phrases_log` → RLS cross-utilisateur → vérification que le bandeau de consentement bloque bien l'accès tant qu'il n'est pas validé.

## 11. Ce que ce chantier ne fait pas

- Pas de code cboard réutilisé (licence GPL-3.0, section 1)
- Pas de navigation par dossiers/sous-catégories imbriquées (portée "intermédiaire", section 3)
- Pas de grammaire/conjugaison automatique — concaténation brute des libellés
- Pas de planches multiples par contexte (une seule planche par élève)
- Pas d'auto-remplissage des catégories standard — chaque picto reste validé humainement

## 12. Checklist avant commit

- `npx vite build` sans erreur
- RLS testée cross-utilisateur sur les 3 nouvelles tables
- Bandeau de consentement RGPD affiché et bloquant au premier accès
- Purge automatique testée manuellement (déclenchement de l'edge function en dehors du cron)
- Aucune clé exposée côté frontend, aucun `console.log` avec données élève
