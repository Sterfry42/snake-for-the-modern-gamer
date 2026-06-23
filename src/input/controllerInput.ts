import type { ControllerNavCommand } from './controllerNavigation.js';
import { CONTROL_ACTIONS, getBindingsForMode, type ControlActionId } from './controlActions.js';

export interface ControllerInputEvent {
  command?: ControllerNavCommand;
  bindingLabel?: string;
  actionId?: ControlActionId;
}

export interface ControllerInputSnapshot {
  active: boolean;
  modeActivity: boolean;
  move?: { x: number; y: number };
  events: ControllerInputEvent[];
}

interface ControllerButtonMap {
  confirm: number;
  cancel: number;
  primary: number;
  primaryTabPrevious: number;
  primaryTabNext: number;
  subTabPrevious: number;
  subTabNext: number;
  menu: number;
  map: number;
}

const DEFAULT_BUTTONS: ControllerButtonMap = {
  confirm: 0,
  cancel: 1,
  primary: 2,
  primaryTabPrevious: 4,
  primaryTabNext: 5,
  subTabPrevious: 6,
  subTabNext: 7,
  map: 8,
  menu: 9,
};

export class ControllerInput {
  private readonly previousButtons = new Set<number>();
  private previousAxisDirection = { x: 0, y: 0 };
  private previousScrollDirection = { x: 0, y: 0 };
  private scrollRepeatFrames = 0;

  constructor(
    private readonly getGamepads: () => readonly (Gamepad | null)[] = () =>
      typeof navigator === 'undefined' ? [] : navigator.getGamepads(),
    private readonly deadzone = 0.45,
    private readonly buttons = DEFAULT_BUTTONS,
  ) {}

  poll(): ControllerInputSnapshot {
    const gamepad = this.getGamepads().find((pad): pad is Gamepad => Boolean(pad?.connected));
    if (!gamepad) {
      this.previousButtons.clear();
      this.previousAxisDirection = { x: 0, y: 0 };
      this.previousScrollDirection = { x: 0, y: 0 };
      this.scrollRepeatFrames = 0;
      return { active: false, modeActivity: false, events: [] };
    }

    const events: ControllerInputEvent[] = [];
    const pressed = new Set<number>();
    gamepad.buttons.forEach((button, index) => {
      if (button.pressed || button.value > 0.65) {
        pressed.add(index);
        if (!this.previousButtons.has(index)) {
          const command = this.commandForButton(index);
          const bindingLabel = getControllerButtonLabel(index);
          const actionId = bindingLabel ? this.actionForBinding(bindingLabel) : undefined;
          if (command || bindingLabel || actionId) {
            events.push({ command: command ?? undefined, bindingLabel, actionId });
          }
        }
      }
    });

    const axisX = this.readAxis(gamepad.axes[0] ?? 0);
    const axisY = this.readAxis(gamepad.axes[1] ?? 0);
    const dpadX = this.buttonAxis(gamepad, 14, 15);
    const dpadY = this.buttonAxis(gamepad, 12, 13);
    const direction = { x: dpadX || axisX, y: dpadY || axisY };
    if (
      direction.x !== this.previousAxisDirection.x ||
      direction.y !== this.previousAxisDirection.y
    ) {
      if (direction.x < 0) events.push({ command: 'left' });
      if (direction.x > 0) events.push({ command: 'right' });
      if (direction.y < 0) events.push({ command: 'up' });
      if (direction.y > 0) events.push({ command: 'down' });
    }

    const scrollDirection = {
      x: this.readAxis(gamepad.axes[2] ?? 0),
      y: this.readAxis(gamepad.axes[3] ?? 0),
    };
    const scrollHeld = scrollDirection.x !== 0 || scrollDirection.y !== 0;
    const scrollChanged =
      scrollDirection.x !== this.previousScrollDirection.x ||
      scrollDirection.y !== this.previousScrollDirection.y;
    if (scrollHeld) {
      this.scrollRepeatFrames = scrollChanged ? 0 : this.scrollRepeatFrames + 1;
      if (scrollChanged || this.scrollRepeatFrames >= 8) {
        this.scrollRepeatFrames = 0;
        if (scrollDirection.x < 0) events.push({ command: 'scrollLeft' });
        if (scrollDirection.x > 0) events.push({ command: 'scrollRight' });
        if (scrollDirection.y < 0) events.push({ command: 'scrollUp' });
        if (scrollDirection.y > 0) events.push({ command: 'scrollDown' });
      }
    } else {
      this.scrollRepeatFrames = 0;
    }

    this.previousButtons.clear();
    for (const index of pressed) {
      this.previousButtons.add(index);
    }
    this.previousAxisDirection = direction;
    this.previousScrollDirection = scrollDirection;

    return {
      active:
        events.length > 0 ||
        pressed.size > 0 ||
        direction.x !== 0 ||
        direction.y !== 0 ||
        scrollHeld,
      modeActivity: events.length > 0 || scrollChanged,
      move: direction.x || direction.y ? direction : undefined,
      events,
    };
  }

  private readAxis(value: number): -1 | 0 | 1 {
    if (value <= -this.deadzone) return -1;
    if (value >= this.deadzone) return 1;
    return 0;
  }

  private buttonAxis(gamepad: Gamepad, negativeIndex: number, positiveIndex: number): -1 | 0 | 1 {
    if (gamepad.buttons[negativeIndex]?.pressed) return -1;
    if (gamepad.buttons[positiveIndex]?.pressed) return 1;
    return 0;
  }

  private commandForButton(index: number): ControllerNavCommand | null {
    if (index === this.buttons.confirm) return 'confirm';
    if (index === this.buttons.cancel) return 'cancel';
    if (index === this.buttons.primary) return 'primary';
    if (index === this.buttons.primaryTabPrevious) return 'primaryTabPrevious';
    if (index === this.buttons.primaryTabNext) return 'primaryTabNext';
    if (index === this.buttons.subTabPrevious) return 'subTabPrevious';
    if (index === this.buttons.subTabNext) return 'subTabNext';
    if (index === this.buttons.menu) return 'menu';
    if (index === this.buttons.map) return 'map';
    return null;
  }

  private actionForBinding(label: string): ControlActionId | undefined {
    const normalized = normalizeControllerBinding(label);
    return CONTROL_ACTIONS.find(
      (action) =>
        !action.id.startsWith('move.') &&
        getBindingsForMode(action.id, 'controller').some(
          (binding) => normalizeControllerBinding(binding.label) === normalized,
        ),
    )?.id;
  }
}

export function getControllerButtonLabel(index: number): string | undefined {
  return [
    'South Button',
    'East Button',
    'West Button',
    'North Button',
    'Left Bumper',
    'Right Bumper',
    'Left Trigger',
    'Right Trigger',
    'Select / View',
    'Start',
    'Left Stick Click',
    'Right Stick Click',
    'D-pad Up',
    'D-pad Down',
    'D-pad Left',
    'D-pad Right',
  ][index];
}

function normalizeControllerBinding(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '');
}
