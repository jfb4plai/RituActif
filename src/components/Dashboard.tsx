// src/components/Dashboard.tsx
import { useEffect, useState } from 'react';
import { listRoutines } from '../lib/routines';
import { listCommunicationBoards, getOrCreateBoard } from '../lib/communication';
import type { Routine, CommunicationBoard } from '../lib/types';
import { FormField } from './FormField';

interface DashboardProps {
  onCreateNew: () => void;
  onOpenRoutine: (routineId: string) => void;
  onOpenCommunication: (boardId: string) => void;
}

const RENDU_LABELS: Record<Routine['type_rendu'], string> = {
  sequentiel: 'Séquentiel',
  emploi_du_temps: 'Emploi du temps',
  grille: 'Grille (TLA / mémo-consigne)',
};

export function Dashboard({ onCreateNew, onOpenRoutine, onOpenCommunication }: DashboardProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [boards, setBoards] = useState<CommunicationBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBoardCode, setNewBoardCode] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listRoutines(), listCommunicationBoards()])
      .then(([routinesData, boardsData]) => {
        setRoutines(routinesData);
        setBoards(boardsData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateBoard = async () => {
    if (!newBoardCode.trim()) return;
    setCreateError(null);
    setCreatingBoard(true);
    try {
      const board = await getOrCreateBoard(newBoardCode.trim());
      setBoards((prev) => (prev.some((b) => b.id === board.id) ? prev : [board, ...prev]));
      setNewBoardCode('');
      onOpenCommunication(board.id);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Erreur lors de la création de la planche');
    } finally {
      setCreatingBoard(false);
    }
  };

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

      <h2 className="font-serif text-lg mt-8 mb-2">Communication</h2>
      <p className="text-xs text-[var(--text3)] mb-3">
        Une planche par élève, pour qu'il compose lui-même des phrases courtes en pictogrammes.
      </p>

      {!loading && boards.length === 0 && (
        <div className="plai-empty">Aucune planche de communication pour l'instant.</div>
      )}

      {boards.length > 0 && (
        <ul className="flex flex-col gap-2 mb-4">
          {boards.map((b) => (
            <li key={b.id} className="plai-card">
              <button
                type="button"
                onClick={() => onOpenCommunication(b.id)}
                style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                <strong>{b.rattachement_code_eleve}</strong>
              </button>
            </li>
          ))}
        </ul>
      )}

      {createError && <div className="plai-error">{createError}</div>}
      <form
        className="flex gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          handleCreateBoard();
        }}
      >
        <FormField
          label="Code élève anonyme"
          help="Jamais de nom réel — un code anonyme suffit à retrouver la planche."
          style={{ marginBottom: 0, flex: 1 }}
        >
          <input
            className="plai-input"
            placeholder="ex: Élève-7"
            value={newBoardCode}
            onChange={(e) => setNewBoardCode(e.target.value)}
          />
        </FormField>
        <button className="plai-btn" type="submit" disabled={!newBoardCode.trim() || creatingBoard}>
          {creatingBoard ? 'Création...' : '+ Nouvelle planche de communication'}
        </button>
      </form>
    </div>
  );
}
