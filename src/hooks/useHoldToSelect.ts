import { useEffect, useMemo, useRef, useState } from 'react';
import { createHoldSelectController } from '../lib/holdToSelect';
import type { HoldConfig } from '../lib/communicationSettings';

export function useHoldToSelect(config: HoldConfig, onConfirm: () => void) {
  const [pressing, setPressing] = useState(false);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const controller = useMemo(
    () =>
      createHoldSelectController(config, () => {
        setPressing(false);
        onConfirmRef.current();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.holdMs, config.selectOnRelease]
  );

  useEffect(() => () => controller.dispose(), [controller]);

  return {
    pressing,
    onPointerDown: () => {
      setPressing(true);
      controller.onPointerDown();
    },
    onPointerUp: () => {
      controller.onPointerUp();
      setPressing(false);
    },
    onPointerLeave: () => {
      controller.onPointerLeave();
      setPressing(false);
    },
  };
}
