/**
 * Apple Registry
 *
 * Central factory for creating apple instances.
 * Simple apples (those that only differ in rewards) use the
 * data-driven factory in simpleAppleFactory.ts.
 * Complex apples (skittish, shielded, archaeological) use
 * their dedicated classes.
 */
import type { Vector2Like } from '../core/math.js';
import type { AppleSystemConfig, AppleTypeConfig } from '../config/gameConfig.js';
import { ShieldedApple } from './behaviors/shieldedApple.js';
import { SkittishApple } from './behaviors/skittishApple.js';
import { FrostApple } from './behaviors/frostApple.js';
import { AmberApple } from './behaviors/amberApple.js';
import { FossilApple } from './behaviors/fossilApple.js';
import { RelicApple } from './behaviors/relicApple.js';
import { createSimpleApple, getSimpleAppleConfig } from './behaviors/simpleAppleFactory.js';
import type { AppleInstance } from './types.js';

export class AppleRegistry {
  constructor(private readonly config: AppleSystemConfig) {}

  getTypes(): AppleTypeConfig[] {
    return this.config.types;
  }

  createInstance(type: AppleTypeConfig, roomId: string, position: Vector2Like): AppleInstance {
    switch (type.behavior) {
      case 'shielded':
        return new ShieldedApple(roomId, position, type.id, type.color);

      case 'skittish':
        return new SkittishApple(
          roomId,
          position,
          type.id,
          type.color,
          this.config.skittishMoveChance,
        );

      case 'frost':
        return new FrostApple(roomId, position, type.id, type.color);

      case 'amber':
        return new AmberApple(roomId, position, type.id, type.color);
      case 'fossil':
        return new FossilApple(roomId, position, type.id, type.color);
      case 'relic':
        return new RelicApple(roomId, position, type.id, type.color);

      default: {
        const config = getSimpleAppleConfig(type.behavior);
        if (!config) {
          throw new Error(`Unknown apple behavior: ${type.behavior}`);
        }
        return createSimpleApple(config, roomId, position, type.color);
      }
    }
  }
}
