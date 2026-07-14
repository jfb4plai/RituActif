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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getRoutineWithSteps(routineId)
      .then(({ routine, steps }) => {
        setRoutine(routine);
        setSteps(steps);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [routineId]);

  const backButton = (
    <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
      ← Retour
    </button>
  );

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (loadError) {
    return (
      <div className="plai-section">
        {backButton}
        <p role="alert">{loadError}</p>
      </div>
    );
  }
  if (!routine) {
    return (
      <div className="plai-section">
        {backButton}
        <p aria-live="polite">Planche introuvable.</p>
      </div>
    );
  }

  return (
    <div className="plai-section">
      {backButton}
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
