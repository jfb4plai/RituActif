import type { HoldConfig } from './communicationSettings';

export interface HoldSelectController {
  onPointerDown(): void;
  onPointerUp(): void;
  onPointerLeave(): void;
  dispose(): void;
}

export function createHoldSelectController(
  config: HoldConfig,
  onConfirm: () => void
): HoldSelectController {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pressed = false;

  const cancelTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    onPointerDown() {
      if (pressed) return;
      pressed = true;
      if (config.selectOnRelease) return;
      timer = setTimeout(() => {
        if (pressed) onConfirm();
        timer = null;
      }, config.holdMs);
    },
    onPointerUp() {
      if (config.selectOnRelease && pressed) onConfirm();
      pressed = false;
      cancelTimer();
    },
    onPointerLeave() {
      pressed = false;
      cancelTimer();
    },
    dispose() {
      pressed = false;
      cancelTimer();
    },
  };
}
