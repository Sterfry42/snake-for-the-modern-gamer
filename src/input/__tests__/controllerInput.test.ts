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
    expect(snapshot.modeActivity).toBe(false);
    expect(snapshot.events).toEqual([]);
  });

  it('emits controller commands for button presses', () => {
    const input = new ControllerInput(() => [gamepad({ buttons: [{ pressed: true, value: 1 }] })]);

    const first = input.poll();
    expect(first.events.map((event) => event.command)).toEqual(['confirm']);
    expect(first.modeActivity).toBe(true);
    expect(input.poll().modeActivity).toBe(false);
  });

  it('emits movement commands for meaningful axes', () => {
    const input = new ControllerInput(() => [gamepad({ axes: [0.8, 0] })]);

    expect(input.poll().events.map((event) => event.command)).toEqual(['right']);
  });

  it('uses the right stick for independent scrolling', () => {
    const input = new ControllerInput(() => [gamepad({ axes: [0, 0, 0, 0.8] })]);

    expect(input.poll().events.map((event) => event.command)).toEqual(['scrollDown']);
    expect(input.poll().events).toEqual([]);
  });

  it('maps the default left bumper to quick save outside menu routing', () => {
    const buttons = Array.from({ length: 5 }, () => ({}));
    buttons[4] = { pressed: true, value: 1 };
    const input = new ControllerInput(() => [gamepad({ buttons })]);

    expect(input.poll().events[0]).toMatchObject({
      command: 'primaryTabPrevious',
      bindingLabel: 'Left Bumper',
      actionId: 'save.quick',
    });
  });
});
