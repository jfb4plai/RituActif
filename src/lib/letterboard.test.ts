// src/lib/letterboard.test.ts
import { describe, it, expect } from 'vitest';
import { ALPHABET_FR, appendChar, backspace, applyCase } from './letterboard';

describe('ALPHABET_FR', () => {
  it('contains the 26 base letters plus the French accented characters', () => {
    expect(ALPHABET_FR).toHaveLength(37);
    expect(ALPHABET_FR).toContain('a');
    expect(ALPHABET_FR).toContain('z');
    expect(ALPHABET_FR).toContain('é');
    expect(ALPHABET_FR).toContain('ï');
  });
});

describe('appendChar', () => {
  it('appends a character to the current message', () => {
    expect(appendChar('bonjou', 'r')).toBe('bonjour');
  });

  it('appends to an empty message', () => {
    expect(appendChar('', 'a')).toBe('a');
  });
});

describe('backspace', () => {
  it('removes the last character', () => {
    expect(backspace('bonjour')).toBe('bonjou');
  });

  it('is a no-op on an empty message', () => {
    expect(backspace('')).toBe('');
  });
});

describe('applyCase', () => {
  it('uppercases including accented characters', () => {
    expect(applyCase('élève', true)).toBe('ÉLÈVE');
  });

  it('lowercases including accented characters', () => {
    expect(applyCase('ÉLÈVE', false)).toBe('élève');
  });
});
