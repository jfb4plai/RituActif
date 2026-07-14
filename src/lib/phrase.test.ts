import { describe, it, expect } from 'vitest';
import { joinPhrase, MAX_PHRASE_LENGTH } from './phrase';

describe('joinPhrase', () => {
  it('concatenates labels in composition order, space-separated', () => {
    expect(joinPhrase(['je', 'veux', 'boire'])).toBe('je veux boire');
  });

  it('returns an empty string for an empty phrase', () => {
    expect(joinPhrase([])).toBe('');
  });
});

describe('MAX_PHRASE_LENGTH', () => {
  it('is 4 (bande courte, décision de portée V1)', () => {
    expect(MAX_PHRASE_LENGTH).toBe(4);
  });
});
