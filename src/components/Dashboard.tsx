import { useEffect, useState } from 'react';
import { listRoutines } from '../lib/routines';
import type { Routine } from '../lib/types';

interface DashboardProps {
  onCreateNew: () => void;
  onOpenRoutine: (routineId: string) => void;
}

const RENDU_LABELS: Record<Routine['type_rendu'], string> = {
  sequentiel: 'Séquentiel',
  emploi_du_temps: 'Emploi du temps',
  grille: 'Grille (TLA / mémo-consigne)',
};

export function Dashboard({ onCreateNew, onOpenRoutine }: DashboardProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRoutines()
      .then(setRoutines)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="plai-section">
      <nav className="plai-nav">
        <div className="plai-nav-logo">
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 32 }} />
          <span className="font-serif text-lg">RituActif</span>
        </div>
      </nav>

      <button className="plai-btn" type="button" onClick={onCreateNew}>
        + Nouvelle planche
      </button>

      {error && <div className="plai-error">{error}</div>}
      {loading && <p>Chargement...</p>}
      {!loading && routines.length === 0 && (
        <div className="plai-empty">Aucune planche pour l'instant. Créez la première.</div>
      )}

      {routines.length > 0 && (
        <ul className="flex flex-col gap-2 mt-4">
          {routines.map((r) => (
            <li key={r.id} className="plai-card">
              <button
                type="button"
                onClick={() => onOpenRoutine(r.id)}
                style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                <strong>{r.nom}</strong>
                <span className="text-sm text-[var(--text3)] ml-2">{RENDU_LABELS[r.type_rendu]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
