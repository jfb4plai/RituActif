import type { CommunicationBoard, CommunicationDefaults, CommunicationMode } from './types';

export interface HoldConfig {
  holdMs: number;
  selectOnRelease: boolean;
}

export function resolveMode(
  board: Pick<CommunicationBoard, 'mode'>,
  defaults: Pick<CommunicationDefaults, 'mode_defaut'> | null
): CommunicationMode {
  return board.mode ?? defaults?.mode_defaut ?? 'pictogrammes';
}

export function resolveHoldConfig(
  board: Pick<CommunicationBoard, 'hold_ms' | 'select_on_release'>,
  defaults: Pick<CommunicationDefaults, 'hold_ms' | 'select_on_release'> | null
): HoldConfig {
  return {
    holdMs: board.hold_ms ?? defaults?.hold_ms ?? 500,
    selectOnRelease: board.select_on_release ?? defaults?.select_on_release ?? false,
  };
}
