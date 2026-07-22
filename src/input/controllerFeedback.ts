export type ControllerFeedbackKind =
  | 'navigate'
  | 'confirm'
  | 'cancel'
  | 'reward'
  | 'impact'
  | 'error'
  | 'death';

interface GamepadHapticEffectParametersLike {
  duration: number;
  startDelay?: number;
  strongMagnitude: number;
  weakMagnitude: number;
}

interface GamepadHapticActuatorLike {
  playEffect?: (
    type: 'dual-rumble',
    parameters: GamepadHapticEffectParametersLike,
  ) => Promise<unknown>;
  pulse?: (value: number, duration: number) => Promise<boolean>;
}

interface FeedbackPattern extends GamepadHapticEffectParametersLike {
  minimumIntervalMs: number;
}

const PATTERNS: Record<ControllerFeedbackKind, FeedbackPattern> = {
  navigate: {
    duration: 24,
    weakMagnitude: 0.16,
    strongMagnitude: 0,
    minimumIntervalMs: 45,
  },
  confirm: {
    duration: 55,
    weakMagnitude: 0.32,
    strongMagnitude: 0.12,
    minimumIntervalMs: 70,
  },
  cancel: {
    duration: 38,
    weakMagnitude: 0.2,
    strongMagnitude: 0.05,
    minimumIntervalMs: 60,
  },
  reward: {
    duration: 110,
    weakMagnitude: 0.48,
    strongMagnitude: 0.22,
    minimumIntervalMs: 100,
  },
  impact: {
    duration: 125,
    weakMagnitude: 0.28,
    strongMagnitude: 0.72,
    minimumIntervalMs: 90,
  },
  error: {
    duration: 150,
    weakMagnitude: 0.62,
    strongMagnitude: 0.42,
    minimumIntervalMs: 110,
  },
  death: {
    duration: 360,
    weakMagnitude: 0.45,
    strongMagnitude: 0.95,
    minimumIntervalMs: 300,
  },
};

export class ControllerFeedback {
  private lastPlayedAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly getGamepads: () => readonly (Gamepad | null)[] = () =>
      typeof navigator === 'undefined' ? [] : navigator.getGamepads(),
    private readonly now: () => number = () =>
      typeof performance === 'undefined' ? Date.now() : performance.now(),
  ) {}

  play(kind: ControllerFeedbackKind): boolean {
    const pattern = PATTERNS[kind];
    const now = this.now();
    if (now - this.lastPlayedAt < pattern.minimumIntervalMs) {
      return false;
    }
    const gamepad = this.getGamepads().find((pad): pad is Gamepad => Boolean(pad?.connected));
    const actuator = this.getActuator(gamepad);
    if (!actuator) {
      return false;
    }

    this.lastPlayedAt = now;
    const { ...parameters } = pattern;
    try {
      if (actuator.playEffect) {
        void actuator.playEffect('dual-rumble', parameters).catch(() => undefined);
        return true;
      }
      if (actuator.pulse) {
        void actuator
          .pulse(
            Math.max(parameters.weakMagnitude, parameters.strongMagnitude),
            parameters.duration,
          )
          .catch(() => undefined);
        return true;
      }
    } catch {
      // Haptics are optional and browser/gamepad support varies.
    }
    return false;
  }

  private getActuator(gamepad?: Gamepad): GamepadHapticActuatorLike | null {
    if (!gamepad) return null;
    const candidate = gamepad as Gamepad & {
      vibrationActuator?: GamepadHapticActuatorLike | null;
      hapticActuators?: GamepadHapticActuatorLike[];
    };
    return candidate.vibrationActuator ?? candidate.hapticActuators?.[0] ?? null;
  }
}
