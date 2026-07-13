import { useState } from 'react';
import { speak } from '../../lib/tts';
import { CATEGORY_ORDER, CATEGORY_META } from '../../lib/categories';
import type { CommunicationItem, CommunicationCategory } from '../../lib/types';

interface CategoryBoardProps {
  items: CommunicationItem[];
  onPick: (item: CommunicationItem) => void;
}

export function CategoryBoard({ items, onPick }: CategoryBoardProps) {
  const [activeCategory, setActiveCategory] = useState<CommunicationCategory>('personnes');
  const itemsInCategory = items.filter((i) => i.categorie === activeCategory);

  const handlePick = (item: CommunicationItem) => {
    speak(item.libelle);
    onPick(item);
  };

  return (
    <div className="plai-card mt-3">
      <div className="flex gap-2 flex-wrap mb-4" role="tablist">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat}
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
            <button
              key={item.id}
              type="button"
              onClick={() => handlePick(item)}
              aria-label={`Dire : ${item.libelle}`}
              style={{
                border: `2px solid ${CATEGORY_META[activeCategory].color}`,
                borderRadius: 12,
                padding: 8,
                background: 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              <img src={item.picto_url} alt="" style={{ width: 96, height: 96, objectFit: 'contain' }} />
              <div className="text-sm mt-1">{item.libelle}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
