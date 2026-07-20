/**
 * Dream Apple Types
 *
 * The wise old snake's dream apples:
 * - The wise old snake's dream apple floated in mid-air (literally)
 * - The wise old snake's dream apple tasted like "what if apples could think"
 * - The wise old snake's dream apple gave 99999 dream shards
 * - The wise old snake's dream apple whispered secrets in a language only dreams understand
 * - The wise old snake's lucid apple was both real and not real simultaneously
 * - The wise old snake's nightmare apple chased the snake for 3 days
 * - The wise old snake's dream apple garden was shaped like a giant snake
 * - The wise old snake's dream apples could phase through walls
 * - The wise old snake's lucid dream apple was the only apple that knew the snake's name
 * - The wise old snake considers dream apples "a bit trippy but educational"
 */
import type { Vector2Like } from '../../core/math.js';
import { AppleInstance, type AppleMoveContext, type AppleRewards } from '../../apples/types.js';
import type { DreamAppleMetadata, DreamBuff, DreamBuffType } from './types.js';

// ─── Base Dream Apple ──────────────────────────────────────────────────────────

export abstract class DreamAppleBase extends AppleInstance {
  public readonly metadata: DreamAppleMetadata;
  protected activeBuffs: DreamBuff[] = [];

  constructor(
    roomId: string,
    position: Vector2Like,
    typeId: string,
    color: number,
    metadata: DreamAppleMetadata,
  ) {
    super(roomId, position, typeId, color);
    this.metadata = metadata;
  }

  override getMetadata(): Record<string, unknown> | undefined {
    return {
      floatingOffset: this.metadata.floatingOffset,
      floatSpeed: this.metadata.floatSpeed,
      phaseOffset: this.metadata.phaseOffset,
      loreFragment: this.metadata.loreFragment,
      buffType: this.metadata.buffType,
      buffDuration: this.metadata.buffDuration,
    };
  }

  getActiveBuffs(): DreamBuff[] {
    return [...this.activeBuffs];
  }

  addBuff(buff: DreamBuff): void {
    this.activeBuffs.push(buff);
  }

  removeBuff(type: DreamBuffType): void {
    this.activeBuffs = this.activeBuffs.filter((b) => b.type !== type);
  }

  updateFloatingPosition(tick: number): Vector2Like {
    const floatY = Math.sin(tick * this.metadata.floatSpeed + this.metadata.phaseOffset) * 3;
    return {
      x: this.position.x,
      y: this.position.y + floatY,
    };
  }
}

// ─── Dream Apple ───────────────────────────────────────────────────────────────

export class DreamApple extends DreamAppleBase {
  constructor(
    roomId: string,
    position: Vector2Like,
    typeId: string,
    color: number,
    metadata: DreamAppleMetadata,
  ) {
    super(roomId, position, typeId, color, metadata);
  }

  override onConsume(): AppleRewards {
    // Dream apples grant lore fragments and small shard rewards
    return { growth: 1, bonusScore: 5 };
  }

  override shouldAttemptMove(__context: AppleMoveContext): boolean {
    // Dream apples float randomly
    return Math.random() < 0.02;
  }

  override getMoveDirections(_context: AppleMoveContext): Vector2Like[] {
    // Dream apples drift in random directions
    const directions: Vector2Like[] = [];
    if (Math.random() < 0.5) {
      directions.push({ x: Math.random() < 0.5 ? 1 : -1, y: 0 });
    }
    if (Math.random() < 0.5) {
      directions.push({ x: 0, y: Math.random() < 0.5 ? 1 : -1 });
    }
    return directions;
  }
}

// ─── Nightmare Apple ───────────────────────────────────────────────────────────

export class NightmareApple extends DreamAppleBase {
  private readonly chaseSpeed: number;

  constructor(
    roomId: string,
    position: Vector2Like,
    typeId: string,
    color: number,
    metadata: DreamAppleMetadata,
    chaseSpeed: number = 0.1,
  ) {
    super(roomId, position, typeId, color, metadata);
    super(roomId, position, typeId, color, metadata);
    this.chaseSpeed = chaseSpeed;
  }

  override onConsume(): AppleRewards {
    // Nightmare apples are dangerous but rewarding
    return { growth: 2, bonusScore: 15 };
  }

  override shouldAttemptMove(_context: AppleMoveContext): boolean {
    // Nightmare apples chase the snake more aggressively
    return Math.random() < 0.08;
  }

  override getMoveDirections(_context: AppleMoveContext): Vector2Like[] {
    const head = _context.snake[0];
    if (!head) {
      return [];
    }

    const directions: Vector2Like[] = [];
    const dx = head.x - this.position.x;
    const dy = head.y - this.position.y;

    // Move toward the snake
    if (Math.abs(dx) > Math.abs(dy)) {
      directions.push({ x: dx > 0 ? 1 : -1, y: 0 });
    } else {
      directions.push({ x: 0, y: dy > 0 ? 1 : -1 });
    }

    // Occasionally add a perpendicular move for unpredictability
    if (Math.random() < 0.3) {
      const perpX = -dy > 0 ? 1 : -1;
      const perpY = dx > 0 ? 1 : -1;
      directions.push({ x: perpX, y: 0 });
      directions.push({ x: 0, y: perpY });
    }

    return directions;
  }
}

// ─── Lucid Apple ───────────────────────────────────────────────────────────────

export class LucidApple extends DreamAppleBase {
  private readonly lucidityGain: number;

  constructor(
    roomId: string,
    position: Vector2Like,
    typeId: string,
    color: number,
    metadata: DreamAppleMetadata,
    lucidityGain: number = 1,
  ) {
    super(roomId, position, typeId, color, metadata);
    this.lucidityGain = lucidityGain;
  }

  override onConsume(): AppleRewards {
    // Lucid apples grant significant rewards and lucidity
    return { growth: 1, bonusScore: 25 };
  }

  getLucidityGain(): number {
    return this.lucidityGain;
  }

  override shouldAttemptMove(_context: AppleMoveContext): boolean {
    // Lucid apples appear and disappear
    return Math.random() < 0.01;
  }

  override getMoveDirections(_context: AppleMoveContext): Vector2Like[] {
    // Lucid apples teleport to new positions
    return []; // handled by special teleport logic
  }

  teleport(_context: AppleMoveContext): Vector2Like {
    const newX = Math.floor(_context.rng() * _context.grid.cols);
    const newY = Math.floor(_context.rng() * _context.grid.rows);
    return { x: newX, y: newY };
  }
}

// ─── Dream Apple Type Registry ─────────────────────────────────────────────────

export type DreamAppleBehavior = 'dream' | 'nightmare' | 'lucid';

export interface DreamAppleTypeConfig {
  id: string;
  label: string;
  color: number;
  behavior: DreamAppleBehavior;
  metadata: DreamAppleMetadata;
  extraConfig?: Record<string, unknown>;
}

export function createDreamAppleInstance(
  config: DreamAppleTypeConfig,
  roomId: string,
  position: Vector2Like,
): DreamAppleBase {
  switch (config.behavior) {
    case 'dream':
      return new DreamApple(roomId, position, config.id, config.color, config.metadata);
    case 'nightmare':
      return new NightmareApple(
        roomId,
        position,
        config.id,
        config.color,
        config.metadata,
        (config.extraConfig as { chaseSpeed?: number })?.chaseSpeed ?? 0.1,
      );
    case 'lucid':
      return new LucidApple(
        roomId,
        position,
        config.id,
        config.color,
        config.metadata,
        (config.extraConfig as { lucidityGain?: number })?.lucidityGain ?? 1,
      );
    default:
      throw new Error(`Unknown dream apple behavior: ${config.behavior}`);
  }
}

// ─── Dream Apple Type Definitions ──────────────────────────────────────────────

export const DREAM_APPLE_TYPES: DreamAppleTypeConfig[] = [
  {
    id: 'dream',
    label: 'Dream Apple',
    color: 0xb19cd9,
    behavior: 'dream',
    metadata: {
      floatingOffset: 0,
      floatSpeed: 0.05,
      phaseOffset: 0,
      buffType: 'doubleShards',
      buffDuration: 300,
    },
  },
  {
    id: 'dream-gravity',
    label: 'Gravity Apple',
    color: 0x87ceeb,
    behavior: 'dream',
    metadata: {
      floatingOffset: 0,
      floatSpeed: 0.03,
      phaseOffset: 1.5,
      buffType: 'gravityReverse',
      buffDuration: 180,
    },
  },
  {
    id: 'dream-phase',
    label: 'Phase Apple',
    color: 0xe6e6fa,
    behavior: 'dream',
    metadata: {
      floatingOffset: 0,
      floatSpeed: 0.07,
      phaseOffset: 3.0,
      buffType: 'phaseShift',
      buffDuration: 240,
    },
  },
  {
    id: 'dream-speed',
    label: 'Swift Dream Apple',
    color: 0x98fb98,
    behavior: 'dream',
    metadata: {
      floatingOffset: 0,
      floatSpeed: 0.04,
      phaseOffset: 0.5,
      buffType: 'speedBoost',
      buffDuration: 200,
    },
  },
  {
    id: 'nightmare',
    label: 'Nightmare Apple',
    color: 0x8b0000,
    behavior: 'nightmare',
    metadata: {
      floatingOffset: 0,
      floatSpeed: 0.02,
      phaseOffset: 0,
      buffType: 'shield',
      buffDuration: 120,
    },
    extraConfig: { chaseSpeed: 0.1 },
  },
  {
    id: 'nightmare-hunter',
    label: 'Hunter Apple',
    color: 0x4a0000,
    behavior: 'nightmare',
    metadata: {
      floatingOffset: 0,
      floatSpeed: 0.01,
      phaseOffset: 2.0,
      buffType: 'lucidityBoost',
      buffDuration: 60,
    },
    extraConfig: { chaseSpeed: 0.15 },
  },
  {
    id: 'lucid',
    label: 'Lucid Apple',
    color: 0xffd700,
    behavior: 'lucid',
    metadata: {
      floatingOffset: 0,
      floatSpeed: 0.06,
      phaseOffset: 1.0,
      buffType: 'timeSlow',
      buffDuration: 150,
    },
    extraConfig: { lucidityGain: 1 },
  },
  {
    id: 'lucid-master',
    label: 'Master Lucid Apple',
    color: 0xffaa00,
    behavior: 'lucid',
    metadata: {
      floatingOffset: 0,
      floatSpeed: 0.08,
      phaseOffset: 2.5,
      buffType: 'sizeShrink',
      buffDuration: 100,
    },
    extraConfig: { lucidityGain: 2 },
  },
];
