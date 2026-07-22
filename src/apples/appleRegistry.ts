/**
 * Apple Registry
 *
 * Central factory for creating apple instances.
 * Simple apples (those that only differ in rewards) use the
 * data-driven factory in simpleAppleFactory.ts.
 * Complex apples (skittish, shielded, archaeological, dream) use
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
import { DreamApple, NightmareApple, LucidApple } from '../world/dream/dreamAppleTypes.js';
import { createSimpleApple, getSimpleAppleConfig } from './behaviors/simpleAppleFactory.js';
import type { AppleInstance } from './types.js';

export class AppleRegistry {
  constructor(private readonly config: AppleSystemConfig) {}

  getTypes(): AppleTypeConfig[] {
    return this.config.types;
  }

  createInstance(type: AppleTypeConfig, roomId: string, position: Vector2Like): AppleInstance {
    switch (type.behavior) {
      // Shielded: has special shield logic
      case 'shielded':
        return new ShieldedApple(roomId, position, type.id, type.color);

      // Skittish: has special movement logic
      case 'skittish':
        return new SkittishApple(
          roomId,
          position,
          type.id,
          type.color,
          this.config.skittishMoveChance,
        );

      // Frost: has seasonal reward logic
      case 'frost':
        return new FrostApple(roomId, position, type.id, type.color);

      // Archaeological: special apple types
      case 'amber':
        return new AmberApple(roomId, position, type.id, type.color);
      case 'fossil':
        return new FossilApple(roomId, position, type.id, type.color);
      case 'relic':
        return new RelicApple(roomId, position, type.id, type.color);

      // Dream World apples
      case 'dream':
        return new DreamApple(roomId, position, type.id, type.color, {
          floatingOffset: 0,
          floatSpeed: 0.05,
          phaseOffset: 0,
          buffType: 'doubleShards',
          buffDuration: 300,
        });
      case 'dream-gravity':
        return new DreamApple(roomId, position, type.id, type.color, {
          floatingOffset: 0,
          floatSpeed: 0.03,
          phaseOffset: 1.5,
          buffType: 'gravityReverse',
          buffDuration: 180,
        });
      case 'dream-phase':
        return new DreamApple(roomId, position, type.id, type.color, {
          floatingOffset: 0,
          floatSpeed: 0.07,
          phaseOffset: 3.0,
          buffType: 'phaseShift',
          buffDuration: 240,
        });
      case 'dream-speed':
        return new DreamApple(roomId, position, type.id, type.color, {
          floatingOffset: 0,
          floatSpeed: 0.04,
          phaseOffset: 0.5,
          buffType: 'speedBoost',
          buffDuration: 200,
        });
      case 'nightmare':
        return new NightmareApple(roomId, position, type.id, type.color, {
          floatingOffset: 0,
          floatSpeed: 0.02,
          phaseOffset: 0,
          buffType: 'shield',
          buffDuration: 120,
        });
      case 'nightmare-hunter':
        return new NightmareApple(roomId, position, type.id, type.color, {
          floatingOffset: 0,
          floatSpeed: 0.01,
          phaseOffset: 2.0,
          buffType: 'lucidityBoost',
          buffDuration: 60,
        });
      case 'lucid':
        return new LucidApple(
          roomId,
          position,
          type.id,
          type.color,
          {
            floatingOffset: 0,
            floatSpeed: 0.06,
            phaseOffset: 1.0,
            buffType: 'timeSlow',
            buffDuration: 150,
          },
          1,
        );
      case 'lucid-master':
        return new LucidApple(
          roomId,
          position,
          type.id,
          type.color,
          {
            floatingOffset: 0,
            floatSpeed: 0.08,
            phaseOffset: 2.5,
            buffType: 'sizeShrink',
            buffDuration: 100,
          },
          2,
        );

      // Simple apples: all others are data-driven
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
