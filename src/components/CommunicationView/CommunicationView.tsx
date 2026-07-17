// src/components/CommunicationView/CommunicationView.tsx
import { useEffect, useState } from 'react';
import { getBoardWithItems, markConsentValidated, getDefaults } from '../../lib/communication';
import { resolveMode, resolveHoldConfig } from '../../lib/communicationSettings';
import { MAX_PHRASE_LENGTH } from '../../lib/phrase';
import type { CommunicationBoard, CommunicationItem, CommunicationDefaults } from '../../lib/types';
import { CategoryBoard } from './CategoryBoard';
import { PhraseStrip } from './PhraseStrip';
import { LetterboardView } from './LetterboardView';

interface CommunicationViewProps {
  boardId: string;
  onBack: () => void;
}

export function CommunicationView({ boardId, onBack }: CommunicationViewProps) {
  const [board, setBoard] = useState<CommunicationBoard | null>(null);
  const [items, setItems] = useState<CommunicationItem[]>([]);
  const [defaults, setDefaults] = useState<CommunicationDefaults | null>(null);
  const [strip, setStrip] = useState<CommunicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [consenting, setConsenting] = useState(false);

  useEffect(() => {
    setStrip([]);
    Promise.all([getBoardWithItems(boardId), getDefaults()])
      .then(([{ board, items }, defaults]) => {
        setBoard(board);
        setItems(items);
        setDefaults(defaults);
      })
      .catch((e) => {
        console.error('Échec de chargement de la planche de communication', e);
        setBoard(null);
      })
      .finally(() => setLoading(false));
  }, [boardId]);

  const handleConsent = async () => {
    if (!board) return;
    setConsenting(true);
    try {
      const updated = await markConsentValidated(board.id);
      setBoard(updated);
    } finally {
      setConsenting(false);
    }
  };

  const handlePick = (item: CommunicationItem) => {
    setStrip((prev) => (prev.length >= MAX_PHRASE_LENGTH ? prev : [...prev, item]));
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
  if (!board) {
    return (
      <div className="plai-section">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
          ← Retour
        </button>
        <p aria-live="polite">Planche introuvable.</p>
      </div>
    );
  }

  if (!board.consentement_valide_at) {
    return (
      <div className="plai-section">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
          ← Retour
        </button>
        <div role="note" className="plai-card" style={{ borderColor: '#e8d5a3', background: '#fdf8ec', color: '#6b5216' }}>
          <strong>Avant de continuer</strong>
          <p className="mt-2">
            Cette planche peut faire dire à l'élève des informations sensibles (santé, famille). Les
            phrases sont conservées jusqu'à la fin de l'année scolaire, visibles uniquement par vous.
            Vérifiez que le cadre (PIA, consentement parental) l'autorise.
          </p>
          <button className="plai-btn mt-3" type="button" disabled={consenting} onClick={handleConsent}>
            {consenting ? '...' : "J'ai compris, continuer"}
          </button>
        </div>
      </div>
    );
  }

  const mode = resolveMode(board, defaults);
  const hold = resolveHoldConfig(board, defaults);

  return (
    <div className="plai-section">
      <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>
      {mode === 'pictogrammes' ? (
        <>
          <PhraseStrip boardId={board.id} strip={strip} onClear={() => setStrip([])} />
          <CategoryBoard items={items} hold={hold} onPick={handlePick} />
        </>
      ) : (
        <LetterboardView boardId={board.id} hold={hold} />
      )}
    </div>
  );
}
