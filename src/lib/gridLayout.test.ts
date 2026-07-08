// src/lib/gridLayout.test.ts
import { describe, it, expect } from 'vitest';
import { computeGridCells, computeCellSizeMm } from './gridLayout';

describe('computeGridCells', () => {
  it('produces rows*cols cells in row-major order', () => {
    const cells = computeGridCells(2, 3);
    expect(cells).toHaveLength(6);
    expect(cells[0]).toEqual({ row: 0, col: 0, index: 0 });
    expect(cells[5]).toEqual({ row: 1, col: 2, index: 5 });
  });

  it('throws when rows or cols is less than 1', () => {
    expect(() => computeGridCells(0, 3)).toThrow();
    expect(() => computeGridCells(3, 0)).toThrow();
  });
});

describe('computeCellSizeMm', () => {
  it('divides the usable A4 portrait area by rows and cols', () => {
    const size = computeCellSizeMm('a4-portrait', 5, 3, 10);
    expect(size.widthMm).toBeCloseTo((210 - 20) / 3);
    expect(size.heightMm).toBeCloseTo((297 - 20) / 5);
  });

  it('swaps width/height for paysage', () => {
    const size = computeCellSizeMm('a4-paysage', 3, 5, 10);
    expect(size.widthMm).toBeCloseTo((297 - 20) / 5);
    expect(size.heightMm).toBeCloseTo((210 - 20) / 3);
  });
});
