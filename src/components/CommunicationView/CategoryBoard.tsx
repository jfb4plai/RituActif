import { useState } from 'react';
import { speak } from '../../lib/tts';
import { CATEGORY_ORDER, CATEGORY_META } from '../../lib/categories';
import { useHoldToSelect } from '../../hooks/useHoldToSelect';
import type { CommunicationItem, CommunicationCategory } from '../../lib/types';
import type { HoldConfig } from '../../lib/communicationSettings';

interface CategoryBoardProps {
  items: CommunicationItem[];
  hold: HoldConfig;
  onPick: (item: CommunicationItem) => void;
}

interface PictoButtonProps {
  item: CommunicationItem;
  color: string;
  hold: HoldConfig;
  onPick: (item: CommunicationItem) => void;
}

function PictoButton({ item, color, hold, onPick }: PictoButtonProps) {
  const { pressing, onPointerDown, onPointerUp, onPointerLeave } = useHoldToSelect(hold, () => {
    speak(item.libelle);
    onPick(item);
  });

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      aria-label={`Dire : ${item.libelle}`}
      style={{
        border: `2px solid ${color}`,
        borderRadius: 12,
        padding: 8,
        background: pressing ? color : 'var(--surface)',
        cursor: 'pointer',
        transform: pressing ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 100ms, background 100ms',
      }}
    >
      <img src={item.picto_url} alt="" style={{ width: 96, height: 96, objectFit: 'contain' }} />
      <div className="text-sm mt-1">{item.libelle}</div>
    </button>
  );
}

export function CategoryBoard({ items, hold, onPick }: CategoryBoardProps) {
  const [activeCategory, setActiveCategory] = useState<CommunicationCategory>('personnes');
  const itemsInCategory = items.filter((i) => i.categorie === activeCategory);

  return (
    <div className="plai-card mt-3">
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '10px 16px',
              borderRadius: 20,
              border: `2px solid ${CATEGORY_META[cat].color}`,
              background: activeCategory === cat ? CATEGORY_META[cat].color : 'transparent',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            {CATEGORY_META[cat].label}
          </button>
        ))}
      </div>

      {itemsInCategory.length === 0 ? (
        <div className="plai-empty">Pas encore de pictos ici.</div>
      ) : (
        <div className="flex gap-3 flex-wrap">
          {itemsInCategory.map((item) => (
            <PictoButton
              key={item.id}
              item={item}
              color={CATEGORY_META[activeCategory].color}
              hold={hold}
              onPick={onPick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
