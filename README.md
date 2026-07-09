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
