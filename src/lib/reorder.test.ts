import { describe, it, expect } from 'vitest';
import { moveItem } from './reorder';
import type { CommunicationItem } from './types';

function item(id: string, ordre: number): CommunicationItem {
  return {
    id,
    board_id: 'board-1',
    categorie: 'personnes',
    libelle: id,
    picto_url: `https://example.com/${id}.png`,
    picto_source: 'arasaac',
    ordre,
  };
}

describe('moveItem', () => {
  it('swaps ordre with the previous item when moving up', () => {
    const items = [item('a', 0), item('b', 1), item('c', 2)];
    const result = moveItem(items, 'b', 'up');
    expect(result.find((i) => i.id === 'a')?.ordre).toBe(1);
    expect(result.find((i) => i.id === 'b')?.ordre).toBe(0);
    expect(result.find((i) => i.id === 'c')?.ordre).toBe(2);
  });

  it('swaps ordre with the next item when moving down', () => {
    const items = [item('a', 0), item('b', 1), item('c', 2)];
    const result = moveItem(items, 'b', 'down');
    expect(result.find((i) => i.id === 'b')?.ordre).toBe(2);
    expect(result.find((i) => i.id === 'c')?.ordre).toBe(1);
  });

  it('is a no-op when moving the first item up', () => {
    const items = [item('a', 0), item('b', 1)];
    const result = moveItem(items, 'a', 'up');
    expect(result.find((i) => i.id === 'a')?.ordre).toBe(0);
    expect(result.find((i) => i.id === 'b')?.ordre).toBe(1);
  });

  it('is a no-op when moving the last item down', () => {
    const items = [item('a', 0), item('b', 1)];
    const result = moveItem(items, 'b', 'down');
    expect(result.find((i) => i.id === 'a')?.ordre).toBe(0);
    expect(result.find((i) => i.id === 'b')?.ordre).toBe(1);
  });

  it('is a no-op for an unknown item id', () => {
    const items = [item('a', 0), item('b', 1)];
    const result = moveItem(items, 'missing', 'up');
    expect(result).toEqual(items);
  });
});
