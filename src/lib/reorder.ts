import type { CommunicationItem } from './types';

export function moveItem(
  itemsInCategory: CommunicationItem[],
  itemId: string,
  direction: 'up' | 'down'
): CommunicationItem[] {
  const sorted = [...itemsInCategory].sort((a, b) => a.ordre - b.ordre);
  const index = sorted.findIndex((i) => i.id === itemId);
  if (index === -1) return itemsInCategory;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return itemsInCategory;

  const current = sorted[index];
  const target = sorted[targetIndex];
  const currentOrdre = current.ordre;
  const targetOrdre = target.ordre;

  return sorted.map((item) => {
    if (item.id === current.id) return { ...item, ordre: targetOrdre };
    if (item.id === target.id) return { ...item, ordre: currentOrdre };
    return item;
  });
}
