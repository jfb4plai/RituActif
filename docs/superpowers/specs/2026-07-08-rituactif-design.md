# RituActif — Design

## 1. Objectif et positionnement

Générateur de séquentiels visuels, emplois du temps visuels et planches de pictogrammes pour enseignants FWB. Cadrage neutre et non-déficitaire : pas d'étiquette "outil TSA" affichée à l'élève. Trois publics bénéficiaires directs sans distinction d'interface :

- élèves TSA (ritualisation, anticipation, structuration temporelle)
- élèves allophones ou en difficulté langagière (double entrée lexicale image/mot)
- tous les élèves lisant des consignes écrites, y compris DYS (décodage des verbes de consigne)

Nomenclature PLAI : suffixe `-Actif`, sous-domaine `rituactif.jfb4plai.com`, repo GitHub `RituActif`.

## 2. Ancrage RISS (corpus RISS, 522 627 articles francophones)

| Thème | Références |
|---|---|
| Ritualisation / TEACCH | `dumas-01927713`, `dumas-05216680`, `hal-01804536` |
| Outils numériques validés (TSA) | `tel-01384613`, `hal-01611303` |
| Double codage mot/image (mémoire lexicale) | `dumas-05150932`, `dumas-01138103`, `dumas-03351379` |
| Pictogrammes pour élèves allophones | `dumas-04966434`, `dumas-04903827` |
| CAA — communication alternative et améliorée (légitime l'audio) | `tel-05223298` |
| FALC appliqué aux supports imagés | `dumas-03998674`, `tel-04807443`, `dumas-04508495` |
| TLA — Tableau de Langage Assisté (grille thématique) | `dumas-03348111`, `hal-04544863` |
| Mémo-consigne (légende de verbes, référent annuel) | `dumas-00840651`, `dumas-03127811`, `dumas-04122459` |
| TSA — primauté de l'apprentissage visuel (justifie le picto seul, sans texte, par défaut) | `dumas-01521287` |

Aucune référence internationale hors-corpus mobilisée dans cette conception ; toute référence future devra être vérifiée avant d'être écrite dans le code (règle PLAI absolue).

## 3. Moteur commun

Une **planche** = nom + rattachement + liste ordonnée d'items.

- **Rattachement**, au choix à la création : générique classe (ex. "Retour de récré") ou élève à code anonyme (ex. "Élève-7", cohérent avec la règle PLAI codes anonymes et avec l'usage TEACCH d'emploi du temps individualisé).
- **Item** : libellé texte, pictogramme (ARASAAC validé ou image perso), horaire optionnel, réglage d'affichage du texte (hérite du réglage global de la planche, ou override individuel), audio (synthèse vocale).

Un seul moteur de données sert trois rendus (section 4). Pas de sous-système séparé par usage.

## 4. Rendus

| Rendu | Horaires | Ordre | Usage type |
|---|---|---|---|
| A. Séquentiel court | non | oui (liste verticale) | routine ponctuelle, transition |
| B. Emploi du temps | oui, si renseignés | oui (liste verticale, même gabarit que A) | journée / semaine |
| C. Grille (TLA / mémo-consigne) | non pertinent | non — items non ordonnés dans le temps | planche de communication thématique (CAA/PECS) ou légende permanente des verbes de consigne |

A et B partagent un gabarit unique (liste verticale, horaire affiché seulement s'il est renseigné pour l'item) — pas deux gabarits distincts.

C est une grille configurable : l'enseignant choisit le nombre de lignes × colonnes, le format de page (A4 portrait ou paysage). Deux usages pédagogiques du même rendu :
- **TLA** : planche de communication thématique, vocabulaire d'une activité
- **mémo-consigne** : légende réutilisable des verbes d'action d'une feuille d'exercice (écris, colorie, souligne...), affichée toute l'année

## 5. Flux de création

1. Enseignant nomme la planche, choisit le rendu cible (A/B/C) et le rattachement
2. **Simplification en amont, optionnelle** (« inspirée du FALC », dans le MVP) : l'enseignant colle une consigne longue → clic « Simplifier » → edge function `simplify-consigne-falc` (Claude Sonnet 5) propose un découpage en étapes courtes, une idée par phrase, verbe à l'impératif/infinitif → affiché dans une **zone éditable** → l'enseignant valide, corrige ou réordonne avant de continuer (split 80/20 standard PLAI, jamais sauvegardé sans validation). Étape sautée si l'enseignant tape déjà ses étapes directement en clair. Bandeau de réserve obligatoire dans l'UI, identique à celui déjà en production sur Picto-lecture : *« Ceci n'est pas du FALC certifié : le FALC officiel exige une validation par un relecteur porteur de déficience intellectuelle. Cet outil s'inspire de règles propres au FALC, sans remplacer cette validation. »*
3. Pour chaque item (pré-rempli si l'étape 2 a été utilisée, sinon saisi directement) :
   - tape le libellé
   - l'app interroge ARASAAC (edge function réutilisée de Picto-lecture) → 3-6 pictogrammes candidats
   - **validation obligatoire par clic** — jamais d'auto-sélection, cohérent avec le principe de singularité enseignant même hors IA (deux enseignants avec le même mot peuvent valider des pictos différents selon leur contexte de classe)
   - alternative : upload d'une image perso, y compris un pictogramme composite construit par l'enseignant à partir d'éléments ARASAAC quand le stock ne couvre pas le concept exact (ex. "souligne", "barre", "relie" : geste + marque)
   - horaire optionnel (rendu B)
   - réglage texte visible : hérite du global, ou override pour cibler un item précis (travail lexical ciblé — double codage, cf. section 2)
4. Réordonnancement par glisser-déposer (rendus A/B) ou positionnement dans la grille (rendu C)
5. Génération :
   - export PDF/PNG pour impression, avec pied de page PLAI (logo, date de génération) — cohérent avec l'exemple de mémo-consigne existant
   - la même page reste utilisable à l'écran : cases à cocher de progression (A/B), pictos cliquables avec audio sans progression (C)
6. Sauvegarde automatique dans le compte enseignant

## 6. Audio

Synthèse vocale navigateur (Web Speech API) — aucune infrastructure ni stockage audio. Bouton haut-parleur par item, déclenché au clic (pas d'autoplay, pour éviter un bruit surprise en classe). Fonctionne uniquement en vue écran ; le PDF/PNG imprimé reste muet par nature.

## 7. Données et architecture

- **Frontend** : React 18 + Vite 5 + Tailwind CSS v3, CSS partagé PLAI (`plai-style.css`, logo `/plai-logo.jpg`)
- **Backend** : projet Supabase de Picto-lecture, réutilisé tel quel — `https://otiorljbujqzruulmqrs.supabase.co` (confirmé, distinct du projet partagé `dfoaumjleqtxjeaplnna`)
  - table `profiles` réutilisée telle quelle (auth)
  - `ritu_routines` (id, user_id, nom, type_rendu, rattachement_type, rattachement_code_eleve, config_grille, afficher_texte_global, created_at)
  - `ritu_steps` (id, routine_id, ordre, libelle, picto_url, picto_source [arasaac|perso], horaire, afficher_texte_override, position_grille)
  - RLS : `auth.uid() = user_id` sur `ritu_routines`, héritée via jointure sur `ritu_steps`
  - Invariants côté application, non contraints en SQL (pas de trigger, disproportionné pour une app mono-utilisateur) : `ordre` doit être réindexé 0..N-1 à chaque sauvegarde de planche ; `position_grille` n'a de sens que si `type_rendu = 'grille'` sur la planche parente — le rendu grille ignore les valeurs orphelines plutôt que de les rejeter
  - Supabase Storage : bucket pour les images perso / pictos composites uploadés, chemin `{user_id}/{filename}` (contrainte imposée par les policies RLS du bucket)
  - Edge function `search-pictograms` : **réutilisée directement**, aucun redéploiement — RituActif appelle l'edge function déjà déployée sur ce projet (proxy vers `api.arasaac.org`, sans clé)
  - Edge function `simplify-consigne-falc` (**nouvelle**, MVP) : déployée sur le même projet Supabase, même pattern que `falc-simplify` de Picto-lecture (`ANTHROPIC_API_KEY` lue côté Deno via `Deno.env.get`, jamais exposée au frontend). Prompt système distinct de celui de Picto-lecture : découpage d'une consigne en étapes courtes ordonnées (impératif/infinitif, une idée par phrase), pas de préservation de style narratif. Modèle `claude-sonnet-5`, cohérent avec le choix déjà en production sur Picto-lecture. Cite `tel-04807443` (Balssa, FALC et école inclusive) dans le prompt, comme `falc-simplify`.
- **Déploiement** : GitHub `jfb4plai/RituActif` (branche `main`) → Vercel → `rituactif.jfb4plai.com`

## 8. Ce que l'app ne fait pas

L'IA n'intervient qu'à une seule étape, optionnelle et en amont (section 5, étape 2) : proposer un découpage d'une consigne longue en étapes courtes, toujours dans une zone éditable, jamais sauvegardé sans validation enseignant. **Le choix du pictogramme reste une validation 100 % humaine** — l'IA ne sélectionne et ne valide jamais un picto à la place de l'enseignant, à aucune étape.

## 9. Checklist post-build (à vérifier avant mise en production)

- Toutes les références RISS de ce document restées valides au moment de l'implémentation
- RLS actif sur `ritu_routines` et `ritu_steps`
- Aucune clé exposée côté frontend : `ANTHROPIC_API_KEY` lue uniquement dans l'edge function `simplify-consigne-falc` (`Deno.env`), jamais dans le code React ni un `console.log`
- Bandeau de réserve FALC affiché à chaque usage de la simplification (texte exact section 5, étape 2), pas seulement au premier lancement
- Codes élèves anonymes, jamais de nom réel dans `ritu_routines.rattachement_code_eleve`
- `npx vite build` sans erreur avant tout push sur `main`
