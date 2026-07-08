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
              aria-label={`Étape effectuée : ${step.libelle}`}
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
