import { describe, it, expect } from 'vitest';
import { parseFalcSteps } from './falcParser';

describe('parseFalcSteps', () => {
  it('splits on newlines and trims each step', () => {
    expect(parseFalcSteps('se laver les mains\n s\'asseoir \nouvrir le cahier')).toEqual([
      'se laver les mains',
      "s'asseoir",
      'ouvrir le cahier',
    ]);
  });

  it('strips leading bullets or numbering if the model adds them anyway', () => {
    expect(parseFalcSteps('1. se laver les mains\n- s\'asseoir')).toEqual([
      'se laver les mains',
      "s'asseoir",
    ]);
  });

  it('drops empty lines', () => {
    expect(parseFalcSteps('se laver les mains\n\n\ns\'asseoir')).toEqual([
      'se laver les mains',
      "s'asseoir",
    ]);
  });
});
