import { describe, expect, it } from 'vitest';
import {
  createCarHeldInputState,
  resetCarHeldInputState,
  updateCarHeldInputFromDirection,
  updateCarHeldInputFromKey,
} from './carInput.js';

describe('car held input', () => {
  it('switches from forward to reverse after key release', () => {
    let state = createCarHeldInputState();
    state = updateCarHeldInputFromKey(state, 'w', true).held;
    state = updateCarHeldInputFromKey(state, 'w', false).held;
    const update = updateCarHeldInputFromKey(state, 's', true);
    expect(update.held.forward).toBe(false);
    expect(update.held.backward).toBe(true);
    expect(update.throttle).toBe(-1);
  });

  it('switches from reverse to forward after key release', () => {
    let state = createCarHeldInputState();
    state = updateCarHeldInputFromKey(state, 's', true).held;
    state = updateCarHeldInputFromKey(state, 's', false).held;
    const update = updateCarHeldInputFromKey(state, 'w', true);
    expect(update.held.forward).toBe(true);
    expect(update.held.backward).toBe(false);
    expect(update.throttle).toBe(1);
  });

  it('keeps overlapping throttle neutral and restores the remaining held key', () => {
    let state = createCarHeldInputState();
    state = updateCarHeldInputFromKey(state, 'w', true).held;
    const overlapped = updateCarHeldInputFromKey(state, 's', true);
    expect(overlapped.throttle).toBe(0);
    const restored = updateCarHeldInputFromKey(overlapped.held, 's', false);
    expect(restored.throttle).toBe(1);
  });

  it('keeps overlapping steering neutral and restores the remaining held key', () => {
    let state = createCarHeldInputState();
    state = updateCarHeldInputFromKey(state, 'a', true).held;
    const overlapped = updateCarHeldInputFromKey(state, 'd', true);
    expect(overlapped.steering).toBe(0);
    const restored = updateCarHeldInputFromKey(overlapped.held, 'd', false);
    expect(restored.steering).toBe(-1);
  });

  it('resets stale vehicle controls on entry or exit', () => {
    const state = updateCarHeldInputFromDirection(
      createCarHeldInputState(),
      { x: 0, y: -1 },
      true,
    ).held;
    const reset = resetCarHeldInputState(state);
    expect(reset.held).toEqual(createCarHeldInputState());
    expect(reset.throttle).toBe(0);
    expect(reset.steering).toBe(0);
  });
});
