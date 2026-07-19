/**
 * Archipelago Island Expeditions — Island Apple Types
 *
 * The wise old snake's island apples:
 * - The wise old snake's lava apple burned forever (the wise old snake ate it and didn't blink)
 * - The wise old snake's crystal apple split into infinite apples (the wise old snake ate them all)
 * - The wise old snake's koi apple made the wise old snake swim (the wise old snake has no fins)
 * - The wise old snake's lavender apple made the wise old snake fly (the wise old snake was surprised)
 * - The wise old snake's shadow apple made a shadow of the wise old snake (the shadow was smarter)
 */
import type { AppleRewards, AppleConsumptionContext, AppleMoveContext } from '../../apples/types.js';
import { AppleInstance } from '../../apples/types.js';
import type { Vector2Like } from '../../core/math.js';
import type { RandomGenerator } from '../../core/rng.js';
import type { GridConfig } from '../../config/gameConfig.js';
import type { RoomSnapshot } from '../../world/types.js';

// ─── Lava Apple ──────────────────────────────────────────────────────────────

export class LavaApple extends AppleInstance {
  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'lava-apple', color);
  }

  override onConsume(): AppleRewards {
    return { growth: 2, bonusScore: 5 };
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'lava-burn', duration: 10000 };
  }
}

// ─── Magma Apple ─────────────────────────────────────────────────────────────

export class MagmaApple extends AppleInstance {
  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'magma-apple', color);
  }

  override onConsume(): AppleRewards {
    return { growth: 3, bonusScore: 10 };
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'fire-resistance', duration: 30000 };
  }
}

// ─── Crystal Apple ───────────────────────────────────────────────────────────

export class CrystalApple extends AppleInstance {
  private splitCount: number = 3;

  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'crystal-apple', color);
  }

  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 3 };
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'split', count: this.splitCount };
  }
}

// ─── Prism Apple ─────────────────────────────────────────────────────────────

export class PrismApple extends AppleInstance {
  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'prism-apple', color);
  }

  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 8 };
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'light-refraction', puzzleSolve: true };
  }
}

// ─── Koi Apple ───────────────────────────────────────────────────────────────

export class KoiApple extends AppleInstance {
  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'koi-apple', color);
  }

  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 4 };
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'underwater-breathing', duration: 15000 };
  }
}

// ─── Breath Apple ────────────────────────────────────────────────────────────

export class BreathApple extends AppleInstance {
  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'breath-apple', color);
  }

  override onConsume(): AppleRewards {
    return { growth: 2, bonusScore: 6 };
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'extend-breathing', duration: 10000 };
  }
}

// ─── Lavender Apple ──────────────────────────────────────────────────────────

export class LavenderApple extends AppleInstance {
  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'lavender-apple', color);
  }

  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 7 };
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'flight', duration: 5000 };
  }
}

// ─── Glider Apple ────────────────────────────────────────────────────────────

export class GliderApple extends AppleInstance {
  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'glider-apple', color);
  }

  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 5 };
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'activate-glider', permanent: true };
  }
}

// ─── Gold Apple (Expedition variant) ─────────────────────────────────────────

export class GoldApple extends AppleInstance {
  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'gold-apple', color);
  }

  override onConsume(): AppleRewards {
    return { growth: 2, bonusScore: 15 };
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'unlock-secrets', permanent: true };
  }
}

// ─── Ancient Apple ───────────────────────────────────────────────────────────

export class AncientApple extends AppleInstance {
  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'ancient-apple', color);
  }

  override onConsume(): AppleRewards {
    return { growth: 3, bonusScore: 20 };
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'reveal-traps', permanent: true };
  }
}

// ─── Shadow Apple ────────────────────────────────────────────────────────────

export class ShadowApple extends AppleInstance {
  private cloneActive: boolean = false;

  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'shadow-apple', color);
  }

  override onConsume(): AppleRewards {
    this.cloneActive = true;
    return { growth: 1, bonusScore: 10 };
  }

  override shouldAttemptMove(context: AppleMoveContext): boolean {
    if (!this.cloneActive) return false;
    return context.rng() < 0.1;
  }

  override getMoveDirections(context: AppleMoveContext): Vector2Like[] {
    if (!this.cloneActive) return [];

    // Shadow apple moves toward snake head
    const snakeHead = context.snake[0];
    if (!snakeHead) return [];

    const dx = snakeHead.x - this.position.x;
    const dy = snakeHead.y - this.position.y;

    return [
      { x: Math.sign(dx), y: 0 },
      { x: 0, y: Math.sign(dy) },
    ].filter((d) => d.x !== 0 || d.y !== 0);
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'shadow-clone', active: this.cloneActive };
  }
}

// ─── Mirror Apple ────────────────────────────────────────────────────────────

export class MirrorApple extends AppleInstance {
  private inverted: boolean = false;

  constructor(roomId: string, position: Vector2Like, color: number) {
    super(roomId, position, 'mirror-apple', color);
  }

  override onConsume(): AppleRewards {
    this.inverted = true;
    return { growth: 2, bonusScore: 12 };
  }

  override isFatalApproach(context: AppleConsumptionContext): boolean {
    if (!this.inverted) return false;
    // Inverted controls: wrong direction is fatal
    return context.direction.x !== 0 || context.direction.y !== 0;
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return { special: 'inverted-controls', duration: 10000, inverted: this.inverted };
  }
}

// ─── Apple Type Registry ─────────────────────────────────────────────────────

export const EXPEDITION_APPLE_TYPES: Record<string, new (
  roomId: string,
  position: Vector2Like,
  color: number,
) => AppleInstance> = {
  'lava-apple': LavaApple,
  'magma-apple': MagmaApple,
  'crystal-apple': CrystalApple,
  'prism-apple': PrismApple,
  'koi-apple': KoiApple,
  'breath-apple': BreathApple,
  'lavender-apple': LavenderApple,
  'glider-apple': GliderApple,
  'gold-apple': GoldApple,
  'ancient-apple': AncientApple,
  'shadow-apple': ShadowApple,
  'mirror-apple': MirrorApple,
};

// ─── Apple Color Palette ─────────────────────────────────────────────────────

export const EXPEDITION_APPLE_COLORS: Record<string, number> = {
  'lava-apple': 0xff2200,
  'magma-apple': 0xff6600,
  'crystal-apple': 0xddaaff,
  'prism-apple': 0xffffff,
  'koi-apple': 0xff8844,
  'breath-apple': 0x44aaff,
  'lavender-apple': 0xaa88ff,
  'glider-apple': 0xccbbff,
  'gold-apple': 0xffd700,
  'ancient-apple': 0xb8860b,
  'shadow-apple': 0x444466,
  'mirror-apple': 0xcccccc,
};
