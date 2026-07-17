import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHoldSelectController } from './holdToSelect';

describe('createHoldSelectController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirms after holdMs when the pointer stays down (mode maintien)', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: false }, onConfirm);

    controller.onPointerDown();
    vi.advanceTimersByTime(499);
    expect(onConfirm).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not confirm if released before holdMs (mode maintien)', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: false }, onConfirm);

    controller.onPointerDown();
    vi.advanceTimersByTime(200);
    controller.onPointerUp();
    vi.advanceTimersByTime(1000);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels a pending hold when the pointer leaves', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: false }, onConfirm);

    controller.onPointerDown();
    vi.advanceTimersByTime(200);
    controller.onPointerLeave();
    vi.advanceTimersByTime(1000);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms immediately on release regardless of duration (mode relâchement)', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: true }, onConfirm);

    controller.onPointerDown();
    vi.advanceTimersByTime(10);
    controller.onPointerUp();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not confirm on release without a prior pointerdown', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: true }, onConfirm);

    controller.onPointerUp();

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('dispose cancels any pending timer', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: false }, onConfirm);

    controller.onPointerDown();
    controller.dispose();
    vi.advanceTimersByTime(1000);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ignores a second pointerdown while a hold is already pending (no duplicate confirm)', () => {
    const onConfirm = vi.fn();
    const controller = createHoldSelectController({ holdMs: 500, selectOnRelease: false }, onConfirm);

    controller.onPointerDown();
    vi.advanceTimersByTime(200);
    controller.onPointerDown(); // stray duplicate pointerdown, e.g. from a pointercancel quirk
    vi.advanceTimersByTime(500);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
