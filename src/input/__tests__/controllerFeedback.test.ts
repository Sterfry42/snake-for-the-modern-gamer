import { describe, expect, it, vi } from 'vitest';
import { ControllerFeedback } from '../controllerFeedback.js';

function gamepad(actuator: object | null): Gamepad {
  return {
    connected: true,
    vibrationActuator: actuator,
    hapticActuators: actuator ? [actuator] : [],
  } as unknown as Gamepad;
}

describe('ControllerFeedback', () => {
  it('uses dual-rumble when the connected controller supports it', () => {
    const playEffect = vi.fn().mockResolvedValue(undefined);
    const feedback = new ControllerFeedback(
      () => [gamepad({ playEffect })],
      () => 1000,
    );

    expect(feedback.play('confirm')).toBe(true);
    expect(playEffect).toHaveBeenCalledWith(
      'dual-rumble',
      expect.objectContaining({ duration: 55, weakMagnitude: 0.32 }),
    );
  });

  it('falls back to pulse and safely reports unsupported controllers', () => {
    const pulse = vi.fn().mockResolvedValue(true);
    expect(
      new ControllerFeedback(
        () => [gamepad({ pulse })],
        () => 1000,
      ).play('impact'),
    ).toBe(true);
    expect(
      new ControllerFeedback(
        () => [gamepad(null)],
        () => 1000,
      ).play('impact'),
    ).toBe(false);
  });

  it('rate limits rapid navigation feedback', () => {
    const playEffect = vi.fn().mockResolvedValue(undefined);
    let now = 1000;
    const feedback = new ControllerFeedback(
      () => [gamepad({ playEffect })],
      () => now,
    );

    expect(feedback.play('navigate')).toBe(true);
    now += 10;
    expect(feedback.play('navigate')).toBe(false);
    now += 50;
    expect(feedback.play('navigate')).toBe(true);
  });
});
