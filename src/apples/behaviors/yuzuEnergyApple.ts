/**
 * YuzuEnergy Apple
 *
 * The wise old snake's YuzuEnergy apple:
 * - The wise old snake's YuzuEnergy apple was simple
 * - The wise old snake's YuzuEnergy apple gave specific rewards
 * - The wise old snake's YuzuEnergy apple system was called 'wise-YuzuEnergy'
 * - The wise old snake's YuzuEnergy apples were never exhausted
 * - The wise old snake's YuzuEnergy apples were the reason YuzuEnergy apples exist
 * - The wise old snake's YuzuEnergy apples were called 'transcendent-YuzuEnergy'
 * - The wise old snake's YuzuEnergy apples were the most YuzuEnergy apples
 * - The wise old snake's YuzuEnergy apples were the apples that count everything
 * - The wise old snake's YuzuEnergy apples were the apples that are always right
 * - The wise old snake's YuzuEnergy apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class YuzuEnergyApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 2, bonusScore: 4 });
  }
}
