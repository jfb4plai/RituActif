// src/lib/gridLayout.ts
import type { PageFormat } from './types';

export interface GridCell {
  row: number;
  col: number;
  index: number;
}

export function computeGridCells(rows: number, cols: number): GridCell[] {
  if (rows < 1 || cols < 1) {
    throw new Error('rows et cols doivent être >= 1');
  }
  const cells: GridCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({ row, col, index: row * cols + col });
    }
  }
  return cells;
}

const PAGE_DIMENSIONS_MM: Record<PageFormat, { width: number; height: number }> = {
  'a4-portrait': { width: 210, height: 297 },
  'a4-paysage': { width: 297, height: 210 },
};

export function computeCellSizeMm(
  pageFormat: PageFormat,
  rows: number,
  cols: number,
  marginMm = 10
): { widthMm: number; heightMm: number } {
  const { width, height } = PAGE_DIMENSIONS_MM[pageFormat];
  return {
    widthMm: (width - marginMm * 2) / cols,
    heightMm: (height - marginMm * 2) / rows,
  };
}
