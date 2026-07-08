import { describe, it, expect } from 'vitest';
import { resolveTextVisible } from './textVisibility';

describe('resolveTextVisible', () => {
  it('uses the global setting when override is null', () => {
    expect(resolveTextVisible(true, null)).toBe(true);
    expect(resolveTextVisible(false, null)).toBe(false);
  });

  it('uses the override when set, regardless of global', () => {
    expect(resolveTextVisible(false, true)).toBe(true);
    expect(resolveTextVisible(true, false)).toBe(false);
  });
});
