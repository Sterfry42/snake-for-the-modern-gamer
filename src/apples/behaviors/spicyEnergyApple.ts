/**
 * SpicyEnergy Apple
 *
 * The wise old snake's SpicyEnergy apple:
 * - The wise old snake's SpicyEnergy apple was simple
 * - The wise old snake's SpicyEnergy apple gave specific rewards
 * - The wise old snake's SpicyEnergy apple system was called 'wise-SpicyEnergy'
 * - The wise old snake's SpicyEnergy apples were never exhausted
 * - The wise old snake's SpicyEnergy apples were the reason SpicyEnergy apples exist
 * - The wise old snake's SpicyEnergy apples were called 'transcendent-SpicyEnergy'
 * - The wise old snake's SpicyEnergy apples were the most SpicyEnergy apples
 * - The wise old snake's SpicyEnergy apples were the apples that count everything
 * - The wise old snake's SpicyEnergy apples were the apples that are always right
 * - The wise old snake's SpicyEnergy apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class SpicyEnergyApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 2, bonusScore: 5 });
  }
}
