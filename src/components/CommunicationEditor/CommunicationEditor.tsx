import { useEffect, useState } from 'react';
import {
  getBoardWithItems,
  removeCommunicationItem,
  persistReorder,
  updateBoardSettings,
  getDefaults,
} from '../../lib/communication';
import { CATEGORY_ORDER, CATEGORY_META } from '../../lib/categories';
import type {
  CommunicationBoard,
  CommunicationItem,
  CommunicationCategory,
  CommunicationDefaults,
  CommunicationMode,
} from '../../lib/types';
import { NewItemForm } from './NewItemForm';
import { FormField } from '../FormField';

interface CommunicationEditorProps {
  boardId: string;
  onOpenViewer: (boardId: string) => void;
  onBack: () => void;
}

export function CommunicationEditor({ boardId, onOpenViewer, onBack }: CommunicationEditorProps) {
  const [board, setBoard] = useState<CommunicationBoard | null>(null);
  const [items, setItems] = useState<CommunicationItem[]>([]);
  const [defaults, setDefaults] = useState<CommunicationDefaults | null>(null);
  const [activeCategory, setActiveCategory] = useState<CommunicationCategory>('personnes');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    Promise.all([getBoardWithItems(boardId), getDefaults()])
      .then(([{ board, items }, defaults]) => {
        setBoard(board);
        setItems(items);
        setDefaults(defaults);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [boardId]);

  const handleRemove = async (itemId: string, libelle: string) => {
    if (!window.confirm(`Supprimer le mot "${libelle}" ?`)) return;
    setError(null);
    try {
      await removeCommunicationItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    }
  };

  const handleMove = async (itemId: string, direction: 'up' | 'down') => {
    const itemsInCategory = items.filter((i) => i.categorie === activeCategory);
    const reordered = await persistReorder(itemsInCategory, itemId, direction);
    setItems((prev) => [...prev.filter((i) => i.categorie !== activeCategory), ...reordered]);
  };

  const handleModeChange = async (mode: CommunicationMode | 'defaut') => {
    if (!board) return;
    setSavingSettings(true);
    try {
      const updated = await updateBoardSettings(board.id, {
        mode: mode === 'defaut' ? null : mode,
        holdMs: board.hold_ms,
        selectOnRelease: board.select_on_release,
      });
      setBoard(updated);
    } finally {
      setSavingSettings(false);
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
  if (loadError) {
    return (
      <div className="plai-section">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
          ← Retour
        </button>
        <p role="alert">{loadError}</p>
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

  const itemsInCategory = items
    .filter((i) => i.categorie === activeCategory)
    .sort((a, b) => a.ordre - b.ordre);
  const nextOrdre = itemsInCategory.length === 0 ? 0 : Math.max(...itemsInCategory.map((i) => i.ordre)) + 1;
  const modeDefautLabel = defaults?.mode_defaut === 'letterboard' ? 'Letterboard' : 'Pictogrammes';

  return (
    <div className="plai-section">
      <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>

      <div className="plai-card mb-4">
        <FormField
          label="Mode de communication pour cet élève"
          help={`Par défaut, cette planche suit le réglage classe (actuellement : ${modeDefautLabel}). Vous pouvez la basculer pour cet élève sans justification.`}
        >
          <select
            className="plai-input"
            value={board.mode ?? 'defaut'}
            disabled={savingSettings}
            onChange={(e) => handleModeChange(e.target.value as CommunicationMode | 'defaut')}
          >
            <option value="defaut">Suivre le défaut classe ({modeDefautLabel})</option>
            <option value="pictogrammes">Pictogrammes</option>
            <option value="letterboard">Letterboard</option>
          </select>
        </FormField>
      </div>

      <div className="plai-card">
        <h1 className="font-serif text-xl mb-1">Communication — {board.rattachement_code_eleve}</h1>
        <p className="text-xs text-[var(--text3)] mb-4">
          Ajoutez des pictos dans chaque catégorie. L'élève les utilisera pour composer des phrases courtes.
        </p>

        <div className="flex gap-2 flex-wrap mb-4">
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className="text-sm"
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: `2px solid ${CATEGORY_META[cat].color}`,
                background: activeCategory === cat ? CATEGORY_META[cat].color : 'transparent',
                cursor: 'pointer',
              }}
            >
              {CATEGORY_META[cat].label}
            </button>
          ))}
        </div>

        {error && <div className="plai-error">{error}</div>}

        {itemsInCategory.length === 0 ? (
          <div className="plai-empty">Pas encore de pictos ici.</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {itemsInCategory.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2">
                <img src={item.picto_url} alt={item.libelle} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                <span>{item.libelle}</span>
                <button
                  type="button"
                  onClick={() => handleMove(item.id, 'up')}
                  disabled={index === 0}
                  aria-label={`Déplacer "${item.libelle}" vers le haut`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(item.id, 'down')}
                  disabled={index === itemsInCategory.length - 1}
                  aria-label={`Déplacer "${item.libelle}" vers le bas`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id, item.libelle)}
                  aria-label={`Supprimer le mot : ${item.libelle}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <NewItemForm
          boardId={board.id}
          categorie={activeCategory}
          nextOrdre={nextOrdre}
          onAdded={(item) => setItems((prev) => [...prev, item])}
        />
      </div>

      <button className="plai-btn mt-4" type="button" onClick={() => onOpenViewer(board.id)}>
        👁 Vue élève
      </button>
    </div>
  );
}
