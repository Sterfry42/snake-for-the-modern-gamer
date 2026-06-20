import { describe, expect, it } from 'vitest';
import { ControllerInput } from '../controllerInput.js';

function gamepad(options: {
  buttons?: Array<{ pressed?: boolean; value?: number }>;
  axes?: number[];
}): Gamepad {
  const buttons = Array.from({ length: 16 }, (_, index) => ({
    pressed: options.buttons?.[index]?.pressed ?? false,
    touched: false,
    value: options.buttons?.[index]?.value ?? 0,
  }));
  return {
    axes: options.axes ?? [0, 0, 0, 0],
    buttons,
    connected: true,
    hapticActuators: [],
    id: 'test-pad',
    index: 0,
    mapping: 'standard',
    timestamp: 0,
    vibrationActuator: null,
  } as unknown as Gamepad;
}

describe('ControllerInput', () => {
  it('ignores tiny analog drift', () => {
    const input = new ControllerInput(() => [gamepad({ axes: [0.1, -0.2] })]);

    const snapshot = input.poll();

    expect(snapshot.active).toBe(false);
    expect(snapshot.events).toEqual([]);
  });

  it('emits controller commands for button presses', () => {
    const input = new ControllerInput(() => [
      gamepad({ buttons: [{ pressed: true, value: 1 }] }),
    ]);

    expect(input.poll().events.map((event) => event.command)).toEqual(['confirm']);
    expect(input.poll().events).toEqual([]);
  });

  it('emits movement commands for meaningful axes', () => {
    const input = new ControllerInput(() => [gamepad({ axes: [0.8, 0] })]);

    expect(input.poll().events.map((event) => event.command)).toEqual(['right']);
  });
});
