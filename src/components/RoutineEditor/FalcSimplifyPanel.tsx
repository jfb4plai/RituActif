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
