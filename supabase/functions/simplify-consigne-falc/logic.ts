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
    // ~8-10 tokens par étape (≤6 mots + retour ligne, ~1.3-1.5 tokens/mot FR) → 500 tokens ≈ 50-60 étapes, large pour une consigne
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  };
}

// deno-lint-ignore no-explicit-any
export function extractSimplifiedText(anthropicResponseJson: any): string {
  return anthropicResponseJson?.content?.[0]?.text ?? "";
}
