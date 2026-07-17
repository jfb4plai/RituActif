import { describe, it, expect } from 'vitest';
import { resolveMode, resolveHoldConfig } from './communicationSettings';

describe('resolveMode', () => {
  it('uses the board override when set', () => {
    expect(resolveMode({ mode: 'letterboard' }, { mode_defaut: 'pictogrammes' })).toBe('letterboard');
  });

  it('falls back to the classe default when the board has no override', () => {
    expect(resolveMode({ mode: null }, { mode_defaut: 'letterboard' })).toBe('letterboard');
  });

  it('falls back to pictogrammes when there is no classe default row', () => {
    expect(resolveMode({ mode: null }, null)).toBe('pictogrammes');
  });
});

describe('resolveHoldConfig', () => {
  it('uses the board override when set', () => {
    const result = resolveHoldConfig(
      { hold_ms: 800, select_on_release: true },
      { hold_ms: 500, select_on_release: false }
    );
    expect(result).toEqual({ holdMs: 800, selectOnRelease: true });
  });

  it('falls back to the classe default per field independently', () => {
    const result = resolveHoldConfig(
      { hold_ms: null, select_on_release: true },
      { hold_ms: 700, select_on_release: false }
    );
    expect(result).toEqual({ holdMs: 700, selectOnRelease: true });
  });

  it('falls back to 500ms / faux when there is no classe default row', () => {
    const result = resolveHoldConfig({ hold_ms: null, select_on_release: null }, null);
    expect(result).toEqual({ holdMs: 500, selectOnRelease: false });
  });

  it('preserves an explicit false board override over a truthy classe default', () => {
    const result = resolveHoldConfig(
      { hold_ms: null, select_on_release: false },
      { hold_ms: 700, select_on_release: true }
    );
    expect(result).toEqual({ holdMs: 700, selectOnRelease: false });
  });
});
