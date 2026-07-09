import { useEffect, useState } from 'react';
import { getRoutineWithSteps } from '../../lib/routines';
import type { Routine, RoutineStep } from '../../lib/types';
import { SequenceView } from './SequenceView';
import { GridView } from './GridView';
import { ExportButton } from './ExportButton';

interface PlancheViewProps {
  routineId: string;
  onBack: () => void;
}

export function PlancheView({ routineId, onBack }: PlancheViewProps) {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoutineWithSteps(routineId)
      .then(({ routine, steps }) => {
        setRoutine(routine);
        setSteps(steps);
      })
      .catch(() => setRoutine(null))
      .finally(() => setLoading(false));
  }, [routineId]);

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (!routine) return <p aria-live="polite">Planche introuvable.</p>;

  return (
    <div className="plai-section">
      <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>
      <div id="planche-export-root" className="plai-card">
        <h1 className="font-serif text-xl mb-4">{routine.nom}</h1>
        {routine.type_rendu === 'grille' ? (
          <GridView routine={routine} steps={steps} />
        ) : (
          <SequenceView routine={routine} steps={steps} />
        )}
        <footer className="mt-6 flex items-center gap-2">
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 24 }} />
          <span className="text-xs text-[var(--text3)]">{new Date().toLocaleDateString('fr-BE')}</span>
        </footer>
      </div>
      <ExportButton targetId="planche-export-root" fileName={routine.nom} />
    </div>
  );
}
