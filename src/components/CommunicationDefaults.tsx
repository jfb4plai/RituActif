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
    const clampedHoldMs = Math.min(2000, Math.max(100, holdMs || 500));
    try {
      await upsertDefaults({ modeDefaut, holdMs: clampedHoldMs, selectOnRelease });
      setHoldMs(clampedHoldMs);
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
            onChange={(e) => {
              setModeDefaut(e.target.value as CommunicationMode);
              setSaved(false);
            }}
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
            onChange={(e) => {
              setHoldMs(Number(e.target.value));
              setSaved(false);
            }}
          />
        </FormField>

        <FormField
          label="Valider au relâchement plutôt qu'au maintien"
          help="À cocher pour les élèves ayant des difficultés motrices à maintenir une pression : la validation se fait dès qu'ils relâchent, quelle que soit la durée."
        >
          <input
            type="checkbox"
            checked={selectOnRelease}
            onChange={(e) => {
              setSelectOnRelease(e.target.checked);
              setSaved(false);
            }}
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
