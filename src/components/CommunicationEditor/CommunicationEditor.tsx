import { useEffect, useState } from 'react';
import { getBoardWithItems, removeCommunicationItem } from '../../lib/communication';
import { CATEGORY_ORDER, CATEGORY_META } from '../../lib/categories';
import type { CommunicationBoard, CommunicationItem, CommunicationCategory } from '../../lib/types';
import { NewItemForm } from './NewItemForm';

interface CommunicationEditorProps {
  boardId: string;
  onOpenViewer: (boardId: string) => void;
  onBack: () => void;
}

export function CommunicationEditor({ boardId, onOpenViewer, onBack }: CommunicationEditorProps) {
  const [board, setBoard] = useState<CommunicationBoard | null>(null);
  const [items, setItems] = useState<CommunicationItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<CommunicationCategory>('personnes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBoardWithItems(boardId)
      .then(({ board, items }) => {
        setBoard(board);
        setItems(items);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [boardId]);

  const handleRemove = async (itemId: string) => {
    try {
      await removeCommunicationItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    }
  };

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (!board) return <p aria-live="polite">Planche introuvable.</p>;

  const itemsInCategory = items.filter((i) => i.categorie === activeCategory);
  const nextOrdre = itemsInCategory.length;

  return (
    <div className="plai-section">
      <button type="button" onClick={onBack} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>

      <div className="plai-card">
        <h1 className="font-serif text-xl mb-1">Communication — {board.rattachement_code_eleve}</h1>
        <p className="text-xs text-[var(--text3)] mb-4">
          Ajoutez des pictos dans chaque catégorie. L'élève les utilisera pour composer des phrases courtes.
        </p>

        <div className="flex gap-2 flex-wrap mb-4" role="tablist">
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat}
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
            {itemsInCategory.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <img src={item.picto_url} alt={item.libelle} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                <span>{item.libelle}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
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
