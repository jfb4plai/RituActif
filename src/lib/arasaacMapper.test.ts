import { describe, it, expect } from 'vitest';
import { mapArasaacResponse } from './arasaacMapper';

describe('mapArasaacResponse', () => {
  it('maps a well-formed response to Pictogram[]', () => {
    const result = mapArasaacResponse({
      pictograms: [{ id: 5122, url: 'https://api.arasaac.org/api/pictograms/5122', keywords: ['main', 'mains'] }],
    });
    expect(result).toEqual([
      { id: 5122, url: 'https://api.arasaac.org/api/pictograms/5122', keywords: ['main', 'mains'] },
    ]);
  });

  it('returns an empty array when the response has no pictograms field', () => {
    expect(mapArasaacResponse({})).toEqual([]);
    expect(mapArasaacResponse(null)).toEqual([]);
  });

  it('drops entries missing an id or url', () => {
    const result = mapArasaacResponse({ pictograms: [{ keywords: ['x'] }] });
    expect(result).toEqual([]);
  });
});
